const id = (value) => (typeof value === 'string' ? value : value?.id);
const uuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const check = (condition) => {
  if (!condition) throw new Error('Provider verification failed');
};
// All amounts and ownership are checked from Stripe's API and the server-created order.
export async function processStripeEvent(event, { stripe, db }, config) {
  check(
    event && event.livemode === false && /^evt_[A-Za-z0-9]+$/.test(event.id),
  );
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      { expand: ['line_items'] },
    );
    check(session.livemode === false);
    if (session.mode === 'subscription') return 'ignored';
    check(
      session.mode === 'payment' &&
        session.status === 'complete' &&
        session.payment_status === 'paid',
    );
    const orderId = session.client_reference_id;
    check(uuid(orderId));
    const order = await db.getOrder(orderId);
    check(
      order &&
        order.kind === 'single' &&
        order.stripe_session_id === session.id &&
        order.expected_price_id === config.singlePrice &&
        order.expected_amount === 150 &&
        order.currency === 'jpy',
    );
    check(
      session.currency === 'jpy' &&
        session.amount_total === 150 &&
        session.line_items?.data?.length === 1 &&
        session.line_items.data[0].quantity === 1 &&
        id(session.line_items.data[0].price) === config.singlePrice,
    );
    const pi = id(session.payment_intent);
    check(/^pi_[A-Za-z0-9]+$/.test(pi || ''));
    return db.applyEvent(event.id, 'single_paid', {
      order_id: orderId,
      payment_intent_id: pi,
    });
  }
  if (event.type === 'invoice.paid') {
    const invoice = await stripe.invoices.retrieve(event.data.object.id);
    const subId = id(
      invoice.parent?.subscription_details?.subscription ||
        invoice.subscription,
    );
    check(
      invoice.livemode === false &&
        invoice.status === 'paid' &&
        invoice.currency === 'jpy' &&
        invoice.amount_paid === 580 &&
        /^sub_[A-Za-z0-9]+$/.test(subId || ''),
    );
    const subscription = await stripe.subscriptions.retrieve(subId);
    const orderId = subscription.metadata?.order_id;
    check(subscription.livemode === false && uuid(orderId));
    const order = await db.getOrder(orderId);
    check(
      order &&
        order.kind === 'subscription' &&
        order.stripe_session_id &&
        order.expected_price_id === config.monthlyPrice &&
        order.expected_amount === 580 &&
        order.currency === 'jpy',
    );
    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_session_id,
      { expand: ['line_items'] },
    );
    check(
      session.livemode === false &&
        session.mode === 'subscription' &&
        session.status === 'complete' &&
        session.client_reference_id === orderId &&
        id(session.subscription) === subId &&
        session.line_items?.data?.length === 1 &&
        id(session.line_items.data[0].price) === config.monthlyPrice &&
        session.line_items.data[0].quantity === 1,
    );
    // The current Stripe API exposes invoice payments separately; ambiguous or
    // unsupported payment shapes fail closed until reconciled.
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      status: 'paid',
      limit: 10,
    });
    check(
      !payments.has_more &&
        payments.data?.length === 1 &&
        payments.data[0].livemode === false &&
        payments.data[0].status === 'paid' &&
        payments.data[0].amount_paid === 580 &&
        payments.data[0].currency === 'jpy' &&
        payments.data[0].payment?.type === 'payment_intent',
    );
    const pi = id(payments.data[0].payment.payment_intent);
    const line = invoice.lines?.data?.find(
      (x) =>
        id(x.price || x.pricing?.price_details?.price) === config.monthlyPrice,
    );
    const start = line?.period?.start,
      end = line?.period?.end;
    check(
      /^pi_[A-Za-z0-9]+$/.test(pi || '') &&
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        end > start &&
        /^in_[A-Za-z0-9]+$/.test(invoice.id),
    );
    return db.applyEvent(event.id, 'invoice_paid', {
      order_id: orderId,
      invoice_id: invoice.id,
      subscription_id: subId,
      payment_intent_id: pi,
      starts_at: start,
      ends_at: end,
    });
  }
  if (event.type === 'charge.refunded') {
    const charge = await stripe.charges.retrieve(event.data.object.id);
    const pi = id(charge.payment_intent);
    check(
      charge.livemode === false &&
        charge.amount_refunded > 0 &&
        /^pi_[A-Za-z0-9]+$/.test(pi || ''),
    );
    return db.applyEvent(event.id, 'refund', { payment_intent_id: pi });
  }
  // Cancellation and payment failure must not extend paid access. Existing verified
  // periods expire at their recorded end; retries do not create grants.
  return 'ignored';
}
