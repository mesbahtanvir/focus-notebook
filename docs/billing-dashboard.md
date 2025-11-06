# Billing Dashboard Documentation

## Overview

The billing dashboard provides a comprehensive interface for users to manage their Focus Notebook Pro subscription, view invoices, track AI usage, and manage payment methods.

**Access:** `/billing` (requires authentication)

---

## Features

### 1. Subscription Overview
- **Current Plan Display**: Free or Pro tier with crown icon
- **Status Badge**: Active, Trialing, Past Due, Canceled, etc.
- **Auto-Renewal Status**:
  - ✅ "Renews on [date]" with green indicator when active
  - ⚠️ "Ends on [date]" with yellow indicator when canceled
- **Current Period**: Shows billing period dates
- **Manage Billing Button**: Opens Stripe Portal for advanced management

**Location:** `src/components/billing/SubscriptionOverview.tsx`

---

### 2. Cancellation Banner
- **Visibility**: Only shown when `cancelAtPeriodEnd === true`
- **Warning Message**: Informs user of end date and feature loss
- **Reactivate Button**: Opens confirmation dialog to undo cancellation
- **Design**: Orange/yellow gradient with alert icon

**Location:** `src/components/billing/CancellationBanner.tsx`

---

### 3. Payment Method Card
- **Display**: Card brand (Visa, Mastercard, etc.) + last 4 digits
- **Expiration Date**: Shows expiry month/year
- **Expiration Warning**: Orange banner if expiring within 3 months
- **Update Button**: Opens Stripe Portal to update payment method
- **Empty State**: Shows when no payment method is on file

**Location:** `src/components/billing/PaymentMethodCard.tsx`

---

### 4. Invoice History
- **Desktop View**: Responsive table with columns:
  - Date
  - Amount
  - Status (Paid, Open, Void, etc. with colored badges)
  - Description
  - PDF/Invoice links
- **Mobile View**: Card-based layout for small screens
- **Pagination**: "Load More" button for additional invoices (20 per page)
- **Empty State**: "No billing history yet"

**Location:** `src/components/billing/InvoiceHistory.tsx`

---

### 5. Usage Statistics
- **Current Month Stats**: Thoughts processed this month with trend indicator
- **All-Time Total**: Total thoughts processed across all time
- **Monthly Trend**: Percentage change from previous month
- **Bar Chart**: Last 3 months of usage with purple/pink gradient
- **Real-time Updates**: Firestore listener for current month

**Location:** `src/components/billing/UsageStatsCard.tsx`

**Chart Library:** Recharts (mobile-friendly)

---

### 6. Reactivation Flow
1. User clicks "Reactivate Subscription" on banner
2. Confirmation dialog appears showing:
   - Next billing date
   - Monthly amount ($9.99/month)
3. User confirms
4. Backend calls Stripe API to set `cancel_at_period_end: false`
5. Success toast shown
6. Banner disappears automatically

**Location:** `src/components/billing/ReactivateConfirmDialog.tsx`

---

## Backend Cloud Functions

### 1. `getStripeInvoices`
**Purpose:** Fetch and cache invoice history

**Input:**
```typescript
{
  limit?: number;        // Default 20, max 100
  startingAfter?: string; // For pagination
  forceRefresh?: boolean; // Bypass cache
}
```

**Output:**
```typescript
{
  invoices: CachedInvoice[];
  hasMore: boolean;
  cachedAt: number;
}
```

**Caching:**
- 1-hour cache in Firestore at `users/{uid}/invoices/{invoiceId}`
- Updates `invoicesCachedAt` timestamp in subscription doc
- Returns cached data if fresh (< 1 hour old)

**Location:** `functions/src/stripeBilling.ts:582-705`

---

### 2. `getStripePaymentMethod`
**Purpose:** Fetch default payment method

**Output:**
```typescript
{
  brand: string;     // 'visa', 'mastercard', etc.
  last4: string;     // "4242"
  expMonth: number;  // 12
  expYear: number;   // 2025
} | null
```

**Fallback Logic:**
1. Check customer's default payment method
2. If not found, check subscription's default payment method
3. Cache result in `users/{uid}/paymentMethod/default`

**Location:** `functions/src/stripeBilling.ts:707-794`

---

### 3. `reactivateStripeSubscription`
**Purpose:** Undo subscription cancellation

**Validation:**
- Requires active subscription ID
- Requires `cancelAtPeriodEnd === true`

**Output:**
```typescript
{
  success: boolean;
  subscription: SubscriptionSnapshot;
}
```

**Actions:**
1. Calls Stripe: `subscriptions.update(id, { cancel_at_period_end: false })`
2. Updates Firestore subscription snapshot
3. Returns updated subscription

**Location:** `functions/src/stripeBilling.ts:796-856`

---

### 4. `getUsageStats`
**Purpose:** Fetch AI processing usage statistics

**Input:**
```typescript
{
  months?: number; // Default 3, max 12
}
```

**Output:**
```typescript
{
  stats: UsageStats[];
  totalAllTime: number;
  currentMonthTotal: number;
}
```

**Data Structure:**
```typescript
interface UsageStats {
  month: string;               // "2025-02" (YYYY-MM)
  thoughtsProcessed: number;
  lastProcessedAt: number;
  dailyBreakdown: {
    [day: string]: number;     // "2025-02-15": 5
  };
}
```

**Location:** `functions/src/stripeBilling.ts:859-924`

---

### 5. `incrementUsageStats`
**Purpose:** Track AI processing usage

**Trigger:** Called after successful thought processing in `processThought`

**Actions:**
1. Generates month key: `YYYY-MM`
2. Generates day key: `YYYY-MM-DD`
3. Uses Firestore transaction to increment counters:
   - `thoughtsProcessed` (monthly total)
   - `dailyBreakdown[dayKey]` (daily total)
   - `lastProcessedAt` (timestamp)

**Storage:** `users/{uid}/usageStats/{month}`

**Location:** `functions/src/stripeBilling.ts:926-963`

**Integration:** `functions/src/processThought.ts:725-727`

---

## Webhook Enhancements

### Invoice Caching
**Events Handled:**
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.finalized`

**Action:** Cache invoice to `users/{uid}/invoices/{invoiceId}`

**Location:** `functions/src/stripeBilling.ts:502-540`

---

### Payment Method Caching
**Event Handled:**
- `payment_method.attached`

**Action:** Cache card details to `users/{uid}/paymentMethod/default`

**Location:** `functions/src/stripeBilling.ts:541-569`

---

## Frontend Hooks

### 1. `useBillingData`
**Purpose:** Manage invoices, payment method, and reactivation

**Returns:**
```typescript
{
  invoices: CachedInvoice[];
  paymentMethod: CachedPaymentMethod | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reactivateSubscription: () => Promise<boolean>;
}
```

**Location:** `src/store/useBillingData.ts`

---

### 2. `useUsageStats`
**Purpose:** Real-time AI usage statistics

**Returns:**
```typescript
{
  stats: UsageStats[];
  currentMonthTotal: number;
  totalAllTime: number;
  isLoading: boolean;
  error: string | null;
}
```

**Real-time Updates:**
- Firestore listener on `users/{uid}/usageStats/{currentMonth}`
- Auto-updates current month total when new thoughts are processed

**Location:** `src/store/useUsageStats.ts`

---

## Database Schema

### Invoice Cache
**Path:** `users/{uid}/invoices/{invoiceId}`

```typescript
{
  id: string;
  amount: number;              // In cents
  currency: string;            // 'usd'
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  description: string | null;
  created: number;             // Timestamp in ms
  periodStart: number | null;
  periodEnd: number | null;
  invoicePdf: string | null;   // PDF URL
  hostedInvoiceUrl: string | null;
  cachedAt: number;            // Cache timestamp
}
```

---

### Payment Method Cache
**Path:** `users/{uid}/paymentMethod/default`

```typescript
{
  brand: string;      // 'visa', 'mastercard', etc.
  last4: string;      // "4242"
  expMonth: number;
  expYear: number;
  cachedAt: number;
}
```

---

### Usage Statistics
**Path:** `users/{uid}/usageStats/{month}`

```typescript
{
  month: string;                    // "2025-02"
  thoughtsProcessed: number;
  lastProcessedAt: number;
  dailyBreakdown: {
    "2025-02-01": 5,
    "2025-02-02": 3,
    // ...
  };
}
```

---

## User Flows

### Viewing Billing Dashboard
1. User navigates to `/billing` from profile page
2. Dashboard loads 3 data sources in parallel:
   - Subscription status (real-time Firestore)
   - Invoices + payment method (Cloud Functions with cache)
   - Usage stats (Cloud Function + real-time listener)
3. Components render with loading states
4. Data populates when ready

---

### Reactivating Subscription
1. User has canceled subscription (`cancelAtPeriodEnd: true`)
2. Orange cancellation banner appears
3. User clicks "Reactivate Subscription"
4. Confirmation dialog shows next billing date and amount
5. User clicks "Reactivate"
6. Frontend calls `reactivateStripeSubscription()`
7. Backend updates Stripe subscription
8. Real-time Firestore listener updates subscription status
9. Banner disappears automatically
10. Success toast shown

---

### Viewing Invoices
1. Dashboard loads last 20 invoices from cache (if fresh)
2. If cache is stale (> 1 hour), fetches from Stripe
3. User scrolls to bottom and clicks "Load More"
4. Next 20 invoices loaded using `startingAfter` pagination
5. User clicks PDF icon to download invoice
6. User clicks external link icon to view hosted invoice

---

## Profile Page Integration

**Changes:** `src/app/profile/page.tsx`

**For Pro Users:**
- "View Billing Dashboard" button (primary action)
- "Manage via Stripe Portal" button (secondary action)

**For Free Users:**
- "Upgrade to Pro" button (primary action)
- "Talk to the team" button (secondary action)

---

## Dependencies

### New Dependencies
- **recharts** (^3.3.0): Mobile-friendly charting library for usage statistics

### Existing Dependencies
- **framer-motion**: Animations for dialogs
- **lucide-react**: Icons
- **firebase/firestore**: Real-time listeners
- **firebase/functions**: Cloud Function calls

---

## Design System

All components follow the existing design system:
- **Tailwind CSS** for styling
- **shadcn/ui components** (Button, Card, Badge)
- **Purple/pink gradient** for primary actions
- **Framer Motion** spring animations for modals
- **44px minimum touch targets** for mobile accessibility
- **Responsive design** with mobile-first approach

---

## Security

### Authentication
- All Cloud Functions require authentication
- Anonymous users cannot access billing features
- User can only access their own data (UID validation)

### Data Isolation
- Firestore security rules enforce user-specific access
- Invoices, payment methods, and usage stats scoped to `users/{uid}`

### Sensitive Data
- Only last 4 digits of card shown
- No full card numbers stored
- Stripe API keys secured in environment variables
- Webhook signatures verified

---

## Performance Optimizations

### Caching Strategy
- **Invoices**: 1-hour cache to reduce Stripe API calls
- **Payment Method**: Cached on webhook and manual fetch
- **Usage Stats**: Real-time listener only for current month

### Parallel Loading
- All data sources load in parallel on dashboard mount
- Independent loading states for each section

### Pagination
- Invoices loaded in batches of 20
- "Load More" button only shown when `hasMore: true`

---

## Testing

### Manual Testing Checklist
- [ ] Pro user can view billing dashboard
- [ ] Free user cannot access `/billing` (redirected to profile)
- [ ] Cancellation banner shows when subscription is canceled
- [ ] Reactivate button successfully undoes cancellation
- [ ] Invoices load and display correctly
- [ ] "Load More" loads additional invoices
- [ ] Payment method displays with correct brand and last 4
- [ ] Expiration warning shows when card expires within 3 months
- [ ] Usage stats update in real-time when processing thoughts
- [ ] Chart displays correctly on mobile and desktop
- [ ] All buttons have 44px minimum height for touch targets

### Test Data
Use Stripe test mode with test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

---

## Future Enhancements

### Potential Features
1. **Credits System**: Implement `aiCreditsRemaining` tracking
2. **Teams Tier**: Add team subscription support
3. **Plan Switching**: Change between monthly/yearly in-app
4. **Proration Preview**: Show cost preview before plan changes
5. **Email Notifications**: Pre-expiration warnings
6. **Usage Alerts**: Notify when nearing usage limits
7. **Export Usage**: Download CSV of usage history
8. **Multiple Payment Methods**: Manage backup cards

---

## Troubleshooting

### Invoices Not Loading
**Check:**
1. Verify Stripe API key is set in environment
2. Check Firestore permissions for `users/{uid}/invoices`
3. Look for errors in Cloud Function logs
4. Verify customer ID exists in subscription snapshot

### Reactivation Fails
**Check:**
1. Verify `cancelAtPeriodEnd: true` before attempting
2. Check subscription ID is valid in Stripe
3. Verify user has permission to update subscription
4. Check Cloud Function logs for Stripe API errors

### Usage Stats Not Updating
**Check:**
1. Verify `incrementUsageStats` is called in `processThought`
2. Check Firestore permissions for `users/{uid}/usageStats`
3. Verify transaction isn't failing (check logs)
4. Confirm real-time listener is set up correctly

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/mesbahtanvir/focus-notebook/issues
- **Email**: hello@focusnotebook.ai
- **Documentation**: `/docs/stripe-billing.md`

---

**Last Updated:** 2025-11-06
**Version:** 1.0.0
