import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyStripeSignature } from '../cloud/billing/stripe-signature.js';

const secret = 'whsec_testing';
const payload = '{"id":"evt_test","type":"checkout.session.completed"}';

async function sign(body, timestamp) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(timestamp + '.' + body),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

test('accepts a valid signed raw payload', async () => {
  const now = 1800000000;
  const signature = await sign(payload, now);
  assert.equal(
    await verifyStripeSignature(
      payload,
      't=' + now + ',v1=' + signature,
      secret,
      now,
    ),
    true,
  );
});

test('rejects modified payloads', async () => {
  const now = 1800000000;
  const signature = await sign(payload, now);
  assert.equal(
    await verifyStripeSignature(
      payload + ' ',
      't=' + now + ',v1=' + signature,
      secret,
      now,
    ),
    false,
  );
});

test('rejects stale and future timestamps', async () => {
  const now = 1800000000;
  const stale = now - 301;
  const signature = await sign(payload, stale);
  assert.equal(
    await verifyStripeSignature(
      payload,
      't=' + stale + ',v1=' + signature,
      secret,
      now,
    ),
    false,
  );
});

test('rejects missing or malformed signatures', async () => {
  assert.equal(await verifyStripeSignature(payload, '', secret), false);
  assert.equal(
    await verifyStripeSignature(payload, 't=123,v1=bad', secret),
    false,
  );
});
