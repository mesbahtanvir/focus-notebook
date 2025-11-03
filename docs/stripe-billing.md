# Stripe Billing Integration Notes

This project relies on Firebase Cloud Functions to talk to Stripe. Secrets never live in the frontend bundle or the repo—they live in GitHub Secrets and are written to a `.env` file right before tests or deploy.

## Secrets flow overview

1. **GitHub Secrets** – store sensitive values for CI/CD:
   - `STRIPE_SECRET`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
   - optionally `APP_BASE_URL` (e.g., `https://focus.yourthoughts.ca`)

2. **GitHub Actions deploy step** – the workflow creates `functions/.env` with those values (using the secrets) and deploys. Firebase CLI uploads the `.env` file alongside the function so `process.env.*` works at runtime.

3. **Cloud Functions runtime** – server code reads environment variables (`process.env.STRIPE_SECRET`, `process.env.STRIPE_PRICE_ID`, etc. – see `functions/src/stripeBilling.ts`).

4. **Stripe webhook** – deploy `stripeWebhook` and configure Stripe's dashboard to send relevant events (checkout session + subscription changes) to the Cloud Function URL.

## Local development

Create `functions/.env` locally with the same keys before running the emulator:

```bash
cat > functions/.env <<'EOF'
OPENAI_API_KEY=sk-test-mock-key-12345678901234567890
STRIPE_SECRET=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=http://localhost:3000
EOF

firebase emulators:start --only functions
```

## Frontend behaviour

- The settings page calls `createStripeCheckoutSession` or `createStripePortalSession` via Firebase callable functions. Responses include the Stripe-hosted session URL; the browser redirects there.
- Anonymous users or accounts without email are blocked before hitting Stripe.

Keep secrets flowing through CI→`.env` so nothing sensitive lands in the repo. If you add more Stripe values later, extend the secrets + env template here.
