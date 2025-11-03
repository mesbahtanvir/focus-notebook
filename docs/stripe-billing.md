# Stripe Billing Integration Notes

This project relies on Firebase Cloud Functions to talk to Stripe. Secrets never live in the frontend bundle or the repo—they come from GitHub Actions and land in Firebase's runtime config.

## Secrets flow overview

1. **GitHub Secrets** – store sensitive values for CI/CD:
   - `STRIPE_SECRET`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
   - optionally `APP_BASE_URL` (e.g., `https://focus.yourthoughts.ca`)

2. **GitHub Actions deploy step** – export those secrets into Firebase Functions config before deployment:

   ```bash
   firebase functions:config:set \
     stripe.secret="$STRIPE_SECRET" \
     stripe.price_id="$STRIPE_PRICE_ID" \
     stripe.webhook_secret="$STRIPE_WEBHOOK_SECRET" \
     app.base_url="${APP_BASE_URL:-https://focus.yourthoughts.ca}"
   firebase deploy --only functions
   ```

   > Tip: `firebase functions:config:get` shows the current values, `firebase functions:config:unset stripe` removes them.

3. **Cloud Functions runtime** – server code reads config values with `functions.config().stripe.secret`, etc. (see `functions/src/stripeBilling.ts`).

4. **Stripe webhook** – deploy `stripeWebhook` and configure Stripe's dashboard to send relevant events (checkout session + subscription changes) to the Cloud Function URL.

## Local development

Export config for the emulator once, then run the Functions emulator:

```bash
firebase functions:config:get > functions/.runtimeconfig.json
firebase emulators:start --only functions
```

.runtimeconfig.json is gitignored; it mirrors production config locally.

## Frontend behaviour

- The settings page calls `createStripeCheckoutSession` or `createStripePortalSession` via Firebase callable functions. Responses include the Stripe-hosted session URL; the browser redirects there.
- Anonymous users or accounts without email are blocked before hitting Stripe.

Keep secrets flowing through CI→Firebase config so nothing sensitive lands in the repo. If you add more Stripe values later, extend the config + docs here.
