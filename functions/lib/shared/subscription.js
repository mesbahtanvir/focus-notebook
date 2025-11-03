"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAiEntitlement = evaluateAiEntitlement;
exports.hasActivePro = hasActivePro;
const ACTIVE_STATUSES = new Set([
    'active',
    'trialing',
    'past_due',
]);
function extractMillis(value) {
    if (value == null) {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    if (typeof value === 'object') {
        const candidate = value;
        if (typeof candidate.toMillis === 'function') {
            const millis = candidate.toMillis();
            return typeof millis === 'number' && Number.isFinite(millis) ? millis : null;
        }
        if (typeof candidate.toDate === 'function') {
            const date = candidate.toDate();
            return date instanceof Date ? date.getTime() : null;
        }
    }
    return null;
}
/**
 * Evaluate whether the supplied subscription snapshot grants AI processing access.
 */
function evaluateAiEntitlement(subscription) {
    if (!subscription) {
        return { allowed: false, code: 'no-record' };
    }
    const entitlements = subscription.entitlements || undefined;
    if ((entitlements === null || entitlements === void 0 ? void 0 : entitlements.aiProcessing) === true) {
        return { allowed: true, code: 'allowed' };
    }
    if ((entitlements === null || entitlements === void 0 ? void 0 : entitlements.aiProcessing) === false) {
        return { allowed: false, code: 'disabled' };
    }
    if (typeof (entitlements === null || entitlements === void 0 ? void 0 : entitlements.aiCreditsRemaining) === 'number' &&
        entitlements.aiCreditsRemaining > 0) {
        return { allowed: true, code: 'allowed' };
    }
    if ((entitlements === null || entitlements === void 0 ? void 0 : entitlements.aiCreditsRemaining) === 0) {
        return { allowed: false, code: 'exhausted' };
    }
    const tier = (subscription.tier || 'free');
    if (typeof tier !== 'string' || tier.toLowerCase() !== 'pro') {
        return { allowed: false, code: 'tier-mismatch' };
    }
    const lifecycle = (subscription.status || 'unknown');
    const normalizedStatus = typeof lifecycle === 'string' ? lifecycle.toLowerCase() : lifecycle;
    if (!ACTIVE_STATUSES.has(normalizedStatus)) {
        return { allowed: false, code: 'inactive' };
    }
    if (subscription.cancelAtPeriodEnd) {
        const periodEnd = extractMillis(subscription.currentPeriodEnd);
        if (periodEnd !== null && periodEnd <= Date.now()) {
            return { allowed: false, code: 'inactive' };
        }
    }
    return { allowed: true, code: 'allowed' };
}
function hasActivePro(subscription) {
    return evaluateAiEntitlement(subscription).allowed;
}
//# sourceMappingURL=subscription.js.map