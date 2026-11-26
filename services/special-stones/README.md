# Special Stones: test-only backend foundation

This standalone service is separate from the static Astro site and the existing photo worker. It must not be deployed, used for live payments, or pointed at production services. No paid manuscript or images are included. Its API and database migration are an implementation for integration testing, not evidence of a working Supabase/Stripe deployment.

## Local verification

With Node 24, run `npm ci` and `npm test` in this directory. Tests use fake identity, database, Stripe API and storage adapters, and real Stripe SDK signature verification; they are not an integration test of Supabase, PostgreSQL or Stripe. Never put secrets in tracked files. Run the service only after creating an entirely separate test project and test credentials; copy `.env.example` locally outside version control and supply it to Node using `--env-file`. The example server binds to localhost and is not a production server.

## External test setup, not performed

1. Create a separate Supabase project and configure Auth signup, email confirmation, allowed redirect URLs and session expiry. Never reuse existing Manager or photo credentials. Apply the SQL migration only to that isolated test project; review and test RLS and the service-role-only RPC grants against real PostgreSQL first.
2. Create a **private** storage bucket in that project, deny anonymous/authenticated direct reads, verify direct object URLs return denial, and upload the separately supplied paid files only after the private setup is independently verified. The API checks the bucket is private before every read, but cannot protect objects already exposed by a misconfigured public bucket.
3. Add the chapter's `published` article record for the test environment and privately place `chapter-one/article.md` plus `chapter-one/{02_sapphire,03_ruby,04_emerald}.png`. The code contains no manuscript or images. Use only disposable test content until storage isolation is proven.
4. Configure test-mode Stripe prices: one-time JPY 150 and recurring monthly JPY 580, tax-inclusive, no live keys. Set test webhook delivery for `checkout.session.completed`, `invoice.paid`, `charge.refunded`, `invoice.payment_failed`, `customer.subscription.updated` and `customer.subscription.deleted`. Supply a test-only signing secret. Confirm all event payload shapes and behavior with Stripe CLI/test clocks before use.
5. Configure an HTTPS server, strict allowed origin and test-only success/cancel URLs; integrate a sign-up/login/logout interface and account management separately. The existing approved pages were not edited or connected to this service. No real authentication or checkout has been executed here.

## Access and events

The API verifies an access token through Supabase for each request and uses the server-only service role to check entitlements before each private-object read. A one-time grant belongs to one user and article. An active monthly period covers every published Special Stones article, including future articles, without per-article membership registration. Unpublished articles remain inaccessible. Each successfully paid monthly invoice grants its paid period; cancellation and a failed renewal do not terminate an already paid period. Refunds revoke the associated grant or period, including a refund received before its payment event. Event IDs and the database transaction address replay; a client return URL never grants access. Partial refunds currently revoke the full corresponding grant/period, deliberately failing closed; this needs a business decision before production.

Supabase logout revokes refresh sessions, but already issued access tokens may remain valid until their expiry. Configure short token lifetimes and add/test immediate session revocation if required; do not claim instantaneous logout on all devices. Operational recovery, webhook reconciliation, idempotence under actual concurrency, expired checkout cleanup, purchase/support policies, refunds/disputes and cancellation UX remain to be designed and tested before live use. Signed image URLs are not used; the API streams protected assets with no-store headers.

Future published articles use a server-validated lowercase ID and private object keys `<article-id>/article.md` and `<article-id>/assets/<asset-id>.png`. Chapter one retains its existing private image keys. Adding an article requires publishing its catalog record and preparing its private content; no individual member grants are created.

## Production Worker: disabled deployment preparation

The separate production entry point is `src/production-worker.mjs`, configured by `wrangler.production.jsonc`; the test-only setup above remains isolated. For the initial production Worker infrastructure deployment, keep sales, members, billing and tax-approval flags false, and keep workers.dev and preview URLs disabled. The production configuration rejects requests when both sales and members are disabled. A successful CI build is not evidence of working authentication, storage access or live payment processing. Verify the actual deployment, approved domain, independent production configuration, private-content access controls, and relevant end-to-end tests before enabling services. Store runtime credentials only as Worker secrets, not in this repository or build logs.
