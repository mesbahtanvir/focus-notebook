"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { functionsClient, auth } from "@/lib/firebaseClient";
import { useSubscriptionStatus } from "@/store/useSubscriptionStatus";
import { UserIcon, LogOut, Mail, User, Edit, Shield, AlertTriangle, Crown, Loader2, ArrowUpRight } from "lucide-react";
import { signOut } from "firebase/auth";
import { motion } from "framer-motion";

type ProfileForm = {
  fullName: string;
  email: string;
  bio: string;
};

const ENTITLEMENT_MESSAGES: Record<string, string> = {
  allowed: "Focus Notebook Pro is active on your account.",
  "no-record": "No active subscription detected. Upgrade to Pro to unlock advanced automations.",
  "tier-mismatch": "Your current plan does not include Pro features.",
  inactive: "Your subscription is inactive. Renew to continue using Pro features.",
  disabled: "AI processing is currently disabled for your account.",
  exhausted: "You have used all available AI credits. Top up or wait for the next billing cycle.",
};

function ProfilePageContent() {
  const { user, loading: authLoading, isAnonymous } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingSessionIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<ProfileForm>({
    fullName: user?.displayName || "",
    email: user?.email || "",
    bio: "",
  });
  const [billingAction, setBillingAction] = useState<"upgrade" | "portal" | null>(null);

  const { subscription, hasProAccess, entitlement, isLoading: subscriptionLoading, lastUpdatedAt } =
    useSubscriptionStatus((state) => ({
      subscription: state.subscription,
      hasProAccess: state.hasProAccess,
      entitlement: state.entitlement,
      isLoading: state.isLoading,
      lastUpdatedAt: state.lastUpdatedAt,
    }));

  const entitlementMessage = useMemo(() => {
    if (subscriptionLoading) {
      return "Checking your membership status...";
    }
    return ENTITLEMENT_MESSAGES[entitlement.code] ?? ENTITLEMENT_MESSAGES["no-record"];
  }, [entitlement.code, subscriptionLoading]);

  const clearUpgradeQuery = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("upgrade");
    url.searchParams.delete("session_id");
    router.replace(`${url.pathname}${url.search ? url.search : ""}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const upgradeStatus = searchParams.get("upgrade");
    if (!upgradeStatus) {
      return;
    }

    if (upgradeStatus === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No changes were made to your plan.",
      });
      clearUpgradeQuery();
      return;
    }

    if (upgradeStatus === "success") {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        toast({
          title: "Verification pending",
          description: "We could not locate the Stripe session. Contact support if this persists.",
          variant: "destructive",
        });
        clearUpgradeQuery();
        return;
      }

      if (!user) {
        return;
      }

      if (pendingSessionIdRef.current === sessionId) {
        return;
      }

      pendingSessionIdRef.current = sessionId;

      const verifyCheckout = httpsCallable(functionsClient, "syncStripeSubscription");
      void verifyCheckout({ sessionId })
        .then(() => {
          toast({
            title: "Welcome to Focus Notebook Pro",
            description: "Your membership is active and ready to use.",
          });
        })
        .catch((error) => {
          let message = "We could not verify your subscription. Please try again or contact support.";
          if (error instanceof FirebaseError && typeof error.message === "string") {
            message = error.message.replace(/^FunctionsError:\s*/, "");
          }
          toast({
            title: "Verification failed",
            description: message,
            variant: "destructive",
          });
        })
        .finally(() => {
          pendingSessionIdRef.current = null;
          clearUpgradeQuery();
        });
      return;
    }

    clearUpgradeQuery();
  }, [searchParams, user, toast, clearUpgradeQuery]);

  const isUpgradeLoading = billingAction === "upgrade";
  const isPortalLoading = billingAction === "portal";
  const billingButtonDisabled = subscriptionLoading || (hasProAccess ? isPortalLoading : isUpgradeLoading);

  const handleBillingRedirect = useCallback(
    async (action: "upgrade" | "portal") => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to manage your membership.",
          variant: "destructive",
        });
        return;
      }

      if (action === "upgrade") {
        if (isAnonymous) {
          toast({
            title: "Create a permanent account",
            description: "Upgrade requires a permanent account. Link your email or continue with Google before upgrading.",
            variant: "destructive",
          });
          return;
        }

        if (!user.email) {
          toast({
            title: "Email required",
            description: "Please add an email address to your profile before upgrading.",
            variant: "destructive",
          });
          return;
        }
      }

      try {
        setBillingAction(action);
        const callableName = action === "upgrade" ? "createStripeCheckoutSession" : "createStripePortalSession";
        const callable = httpsCallable(functionsClient, callableName);
        const result = await callable({
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        const data = result.data as { url?: string; error?: string };
        if (!data?.url) {
          const fallbackMessage =
            data?.error ||
            (action === "upgrade"
              ? "Unable to start checkout. Please try again shortly."
              : "Unable to open the billing portal right now.");
          toast({
            title: "Billing unavailable",
            description: fallbackMessage,
            variant: "destructive",
          });
          return;
        }

        window.location.assign(data.url);
      } catch (error) {
        console.error("Billing redirect failed", error);
        let message = "Something went wrong while contacting Stripe. Please try again shortly.";
        if (error instanceof FirebaseError && typeof error.message === "string") {
          message = error.message.replace(/^FunctionsError:\s*/, "");
        }
        toast({
          title: "Billing unavailable",
          description: message,
          variant: "destructive",
        });
      } finally {
        setBillingAction(null);
      }
    },
    [user, toast, isAnonymous]
  );

  const formatDate = useCallback((value: unknown) => {
    if (!value) return null;
    const date =
      value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
          ? new Date(value)
          : null;
    if (!date || Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      try {
        // Always use the authenticated user's email and displayName
        const saved = localStorage.getItem("profile");
        let bio = "";
        
        if (saved) {
          try {
            const data = JSON.parse(saved) as ProfileForm;
            // Only use bio from saved data, always override name/email with current user
            bio = data.bio || "";
          } catch (parseError) {
            console.error("Failed to parse saved profile:", parseError);
          }
        }
        
        // Always set current user's data
        setUserData({
          email: user.email || "",
          fullName: user.displayName || "",
          bio: bio,
        });
      } catch (e) {
        console.error("Failed to load profile:", e);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, authLoading, toast]);

  const onSubmit = (data: ProfileForm) => {
    if (!user) return;
    
    try {
      localStorage.setItem("profile", JSON.stringify(data));
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (e) {
      console.error("Failed to save profile:", e);
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
        <Card className="border-2 md:border-4 border-purple-200 shadow-lg md:shadow-xl bg-gradient-to-br from-white to-purple-50">
          <CardHeader className="text-center bg-gradient-to-r from-purple-100 to-pink-100 border-b-2 md:border-b-4 border-purple-200 p-6 md:p-8">
            <div className="mx-auto w-20 h-20 md:w-24 md:h-24 mb-3 md:mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <UserIcon className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Welcome! 👋</CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600 font-medium">Sign in to access your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center p-6 md:p-8">
            <p className="text-sm md:text-base text-gray-600">Sign in to view and manage your profile information.</p>
            <div className="pt-2 md:pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-sm md:text-base"
              >
                <Shield className="h-4 w-4 md:h-5 md:w-5" />
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6 space-y-4 md:space-y-6">
      {/* Profile Header Card */}
      <Card className="border-2 md:border-4 border-purple-200 shadow-lg md:shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 border-b-2 md:border-b-4 border-purple-200 relative p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            {/* Avatar and User Info Container */}
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-full ring-2 md:ring-4 ring-purple-400 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 md:w-12 md:h-12 text-white" />
                  </div>
                )}
                <div
                  className={`absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 rounded-full p-1.5 md:p-2 shadow-lg ${
                    hasProAccess ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-green-400 to-emerald-500"
                  }`}
                >
                  {hasProAccess ? <Crown className="h-3 w-3 md:h-4 md:w-4 text-white" /> : <span className="text-white text-xs font-bold">✓</span>}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent truncate">
                    {userData.fullName || "User"}
                  </CardTitle>
                  <Badge
                    variant={hasProAccess ? "default" : "secondary"}
                    className={`flex items-center gap-1 text-xs ${hasProAccess ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : ""}`}
                  >
                    {hasProAccess ? (
                      <>
                        <Crown className="h-3 w-3 md:h-4 md:w-4" />
                        Pro
                      </>
                    ) : (
                      "Free"
                    )}
                  </Badge>
                </div>
                <CardDescription className="text-gray-600 font-medium mt-1 flex items-center gap-2 text-xs md:text-sm truncate">
                  <Mail className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="truncate">{userData.email || "No email provided"}</span>
                </CardDescription>
                <p className="mt-2 md:mt-3 text-xs md:text-sm text-gray-600 line-clamp-2">{entitlementMessage}</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                  toast({
                    title: "Signed out",
                    description: "You have been signed out successfully.",
                  });
                  window.location.href = '/login';
                } catch (error) {
                  console.error("Error signing out:", error);
                  toast({
                    title: "Error",
                    description: "Failed to sign out. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 w-full md:w-auto text-sm md:text-base"
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              Sign Out
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-8">
          {/* Anonymous Account Warning */}
          {isAnonymous && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg md:rounded-xl"
            >
              <div className="flex items-start gap-2 md:gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-xs md:text-sm font-semibold text-yellow-900 mb-1">
                    Temporary Account Active
                  </h3>
                  <p className="text-xs text-yellow-800">
                    Your data is saved locally but may be lost if you clear your browser or use a different device.
                    <Link href="/login" className="underline font-semibold hover:no-underline ml-1">
                      Create a permanent account
                    </Link> to keep your data forever.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Subscription Overview */}
          <div className="mb-4 md:mb-6 rounded-xl md:rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-6 shadow-inner">
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-purple-700 uppercase tracking-wide">
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  Membership
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">
                    {hasProAccess ? "Focus Notebook Pro" : "Free plan"}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">{entitlementMessage}</p>
                </div>
                {hasProAccess && subscription && (
                  <div className="flex flex-col gap-2 text-xs md:text-sm text-gray-700 bg-white/70 border border-purple-200 rounded-lg md:rounded-xl p-3 md:p-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="font-semibold text-gray-900">Status:</span>{" "}
                        {subscription.status ?? "active"}
                      </div>
                      {subscription.tier && (
                        <div>
                          <span className="font-semibold text-gray-900">Tier:</span>{" "}
                          {subscription.tier}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {formatDate(subscription.currentPeriodEnd) && (
                        <div>
                          <span className="font-semibold text-gray-900">Renews:</span>{" "}
                          {formatDate(subscription.currentPeriodEnd)}
                        </div>
                      )}
                      {formatDate(lastUpdatedAt) && (
                        <div>
                          <span className="font-semibold text-gray-900">Updated:</span>{" "}
                          {formatDate(lastUpdatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 md:gap-3">
                {hasProAccess ? (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      asChild
                      className="w-full text-sm md:text-base"
                    >
                      <Link href="/billing">
                        View Billing Dashboard
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      disabled={billingButtonDisabled}
                      variant="outline"
                      className="w-full inline-flex items-center justify-center gap-2 text-sm md:text-base"
                      onClick={() => {
                        void handleBillingRedirect("portal");
                      }}
                    >
                      Manage via Stripe Portal
                      {billingButtonDisabled ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      disabled={billingButtonDisabled}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400 disabled:cursor-not-allowed text-sm md:text-base"
                      onClick={() => {
                        void handleBillingRedirect("upgrade");
                      }}
                    >
                      Upgrade to Pro
                      {billingButtonDisabled ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" asChild className="w-full text-sm md:text-base">
                      <Link href="mailto:hello@focusnotebook.ai?subject=Focus%20Notebook%20Pro">
                        Talk to the team
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {userData.bio && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg md:rounded-xl p-4 md:p-6 border-2 border-purple-200">
              <Label className="text-base md:text-lg font-bold text-purple-600 flex items-center gap-2 mb-2 md:mb-3">
                <Edit className="h-4 w-4 md:h-5 md:w-5" />
                Bio
              </Label>
              <div className="text-sm md:text-base text-gray-700 whitespace-pre-line">{userData.bio}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
