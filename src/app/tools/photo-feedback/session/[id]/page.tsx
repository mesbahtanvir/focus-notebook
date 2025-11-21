"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2, SkipForward } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePhotoFeedback, type BattlePhoto } from "@/store/usePhotoFeedback";
import { toastError } from "@/lib/toast-presets";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Pair {
  left: BattlePhoto;
  right: BattlePhoto;
}

const BATCH_SIZE = 10;
const REFETCH_THRESHOLD = 3;

export default function PhotoBattleVotingPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { currentSession, loadSession, submitVote, getNextPairs, isLoading, error } = usePhotoFeedback();
  const { user: authUser, loading: authLoading, signInAnonymously } = useAuth();
  const [pairBuffer, setPairBuffer] = useState<Pair[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, boolean>>({});
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [displayedPair, setDisplayedPair] = useState<Pair | null>(null);
  const [pairSequence, setPairSequence] = useState(0);
  const [initializedSessionId, setInitializedSessionId] = useState<string | null>(null);

  // Load session when sessionId changes
  useEffect(() => {
    if (sessionId) {
      // Only clear buffer when session actually changes (not on every render)
      if (initializedSessionId !== sessionId) {
        setPairBuffer([]);
        setDisplayedPair(null);
        setPairSequence(0);
        setLoadedPhotos({});
        setInitializedSessionId(null);
      }

      void loadSession(sessionId);
    }
  }, [sessionId, loadSession, initializedSessionId]);

  const lastSignInRef = useRef<number>(0);
  const ensureAnonymousSession = useCallback(async () => {
    if (authLoading) return;
    try {
      if (!authUser) {
        lastSignInRef.current = Date.now();
        await signInAnonymously();
        return;
      }
      if (authUser.isAnonymous) {
        const lastSignIn = authUser.metadata?.lastSignInTime
          ? new Date(authUser.metadata.lastSignInTime).getTime()
          : 0;
        const shouldRefresh =
          Date.now() - Math.max(lastSignIn, lastSignInRef.current) > 75 * 60 * 1000;
        if (shouldRefresh) {
          lastSignInRef.current = Date.now();
          await signInAnonymously();
        }
      }
    } catch (err) {
      console.error("Failed to ensure anonymous session:", err);
    }
  }, [authLoading, authUser, signInAnonymously]);

  useEffect(() => {
    if (!authLoading) {
      void ensureAnonymousSession();
    }
  }, [authLoading, ensureAnonymousSession]);

  const canVote = currentSession && currentSession.photos.length >= 2;
  const pair = pairBuffer[0] ?? null;

  // Update displayed pair when pair changes and not animating or voting
  useEffect(() => {
    if (pair && !isAnimating && !selectedPhotoId) {
      setDisplayedPair(pair);
      setPairSequence(prev => prev + 1);
    }
  }, [pair, isAnimating, selectedPhotoId]);

  // Fetch a batch of pairs (10 at a time)
  const fetchNextBatch = useCallback(async () => {
    if (!currentSession || currentSession.photos.length < 2 || isFetchingBatch) return;

    setIsFetchingBatch(true);
    try {
      const newPairs = await getNextPairs(currentSession.id, BATCH_SIZE);

      if (newPairs && newPairs.length > 0) {
        // Append new pairs to buffer (never replace existing pairs)
        setPairBuffer(prev => [...prev, ...newPairs]);
      }
    } catch (err) {
      console.error("Failed to fetch next batch of pairs:", err);
    } finally {
      setIsFetchingBatch(false);
    }
  }, [currentSession, getNextPairs, isFetchingBatch]);

  // Initialize buffer when session is ready and not yet initialized
  useEffect(() => {
    if (!currentSession || currentSession.photos.length < 2) {
      setPairBuffer([]);
      setInitializedSessionId(null);
      return;
    }

    // Only initialize once per session
    if (initializedSessionId === currentSession.id) return;

    // Load initial batch
    const initialize = async () => {
      try {
        const initialPairs = await getNextPairs(currentSession.id, BATCH_SIZE);
        setPairBuffer(initialPairs);
        setInitializedSessionId(currentSession.id);
      } catch (err) {
        console.error("Failed to initialize pair buffer:", err);
      }
    };

    void initialize();
  }, [currentSession, getNextPairs, initializedSessionId]);

  // Refetch when buffer runs low
  useEffect(() => {
    if (!currentSession || currentSession.photos.length < 2) return;

    // When buffer drops below threshold and we're not already fetching, get more
    if (pairBuffer.length < REFETCH_THRESHOLD && !isFetchingBatch && initializedSessionId === currentSession.id) {
      void fetchNextBatch();
    }
  }, [pairBuffer.length, fetchNextBatch, currentSession, isFetchingBatch, initializedSessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pairBuffer.slice(0, 3).forEach(selection => {
      if (!selection) return;
      [selection.left, selection.right].forEach(photo => {
        if (!photo) return;
        const img = new window.Image();
        img.src = photo.url;
      });
    });
  }, [pairBuffer]);

  const handleVote = useCallback(
    async (winner: BattlePhoto, loser: BattlePhoto) => {
      if (!currentSession || isAnimating || !pair) return;
      if (authLoading) {
        toastError({
          title: "Setting up voter",
          description: "Please wait a moment and try again.",
        });
        return;
      }
      if (!authUser) {
        try {
          await ensureAnonymousSession();
        } catch {
          toastError({
            title: "Unable to start session",
            description: "Refresh the page and try again.",
          });
          return;
        }
      }
      setSelectedPhotoId(winner.id);
      setIsAnimating(true);

      // Industry standard: 400ms for meaningful feedback animations
      const animationDelay = new Promise<void>(resolve => {
        window.setTimeout(resolve, 400);
      });

      let shouldAdvance = false;
      try {
        // Submit vote (skipReload=true to prevent unnecessary session reload)
        await Promise.all([submitVote(currentSession.id, winner.id, loser.id, true), animationDelay]);
        shouldAdvance = true;
      } catch (err) {
        console.error(err);
        toastError({
          title: "Vote failed",
          description: "Unable to record your choice. Please try again.",
        });
        await animationDelay;
      } finally {
        if (shouldAdvance) {
          // Advance to next pair (remove current from buffer)
          setPairBuffer(prev => {
            if (prev.length === 0) return prev;
            // Remove first pair, keep the rest
            return prev.slice(1);
          });
        }
        setSelectedPhotoId(null);
        setIsAnimating(false);
      }
    },
    [currentSession, submitVote, isAnimating, pair, authLoading, authUser, ensureAnonymousSession]
  );

  const handleSkip = useCallback(() => {
    if (!currentSession || isAnimating || !pair) return;

    setIsAnimating(true);

    // Industry standard: 200ms for quick, dismissive actions
    setTimeout(() => {
      // Simply advance to next pair without voting
      setPairBuffer(prev => {
        if (prev.length === 0) return prev;
        // Remove first pair, keep the rest
        return prev.slice(1);
      });

      setIsAnimating(false);
    }, 200);
  }, [currentSession, isAnimating, pair]);

  useEffect(() => {
    if (!displayedPair || isAnimating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void handleVote(displayedPair.left, displayedPair.right);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void handleVote(displayedPair.right, displayedPair.left);
      } else if (event.key === "Escape" || event.key === "ArrowDown") {
        event.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [displayedPair, isAnimating, handleVote, handleSkip]);

  useEffect(() => {
    setSelectedPhotoId(null);
    if (!pair) {
      setLoadedPhotos({});
      return;
    }
    setLoadedPhotos(prev => {
      const next = { ...prev };
      next[pair.left.id] = false;
      next[pair.right.id] = false;
      return next;
    });
  }, [pair]);

  if (isLoading || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6">
        {error ? (
          <Card className="p-8 bg-white/10 border border-white/20 text-center max-w-md">
            <p className="text-lg font-semibold mb-4">{error}</p>
            <Link href="/tools/photo-feedback" className="text-purple-200 underline">
              Go back
            </Link>
          </Card>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-purple-300" />
            <p className="text-sm text-purple-100">Loading showdown…</p>
          </>
        )}
      </div>
    );
  }

  if (!canVote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xl font-semibold">Need at least two photos to start the battle.</p>
        <Link href="/tools/photo-feedback" className="text-purple-200 underline">
          Upload more photos
        </Link>
      </div>
    );
  }

  if (!displayedPair && !pair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-200" />
        <p className="text-sm text-purple-100">Picking great photos to compare…</p>
      </div>
    );
  }

  const activePair = displayedPair || pair;
  if (!activePair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-200" />
        <p className="text-sm text-purple-100">Picking great photos to compare…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex h-full min-h-[70vh] flex-col gap-2 md:gap-4">
        <p className="text-center text-sm text-purple-100/80">
          Click a photo or press ← / → to choose which shot looks better.
        </p>
        <p className="text-center text-xs text-purple-200/70">
          Voting with {authUser?.email ? `account ${authUser.email}` : "a temporary account"}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${pairSequence}-${activePair.left.id}-${activePair.right.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2"
          >
            {[{ side: "left" as const, card: activePair.left }, { side: "right" as const, card: activePair.right }].map(({ side, card }, index) => {
              const isSelected = selectedPhotoId === card.id;
              const displayUrl = card.url;
              const previewUrl = card.thumbnailUrl || displayUrl;
              const isLoaded = loadedPhotos[card.id] !== false;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Card
                    className={`group relative flex h-full cursor-pointer overflow-hidden border-2 bg-white/5 transition-all ${
                      isSelected ? "border-white ring-2 ring-white/70" : "border-white/10 hover:border-white/40"
                    } ${isAnimating ? "pointer-events-none opacity-70" : ""}`}
                    onClick={() => handleVote(card, side === "left" ? activePair.right : activePair.left)}
                  >
                    <div className="relative w-full overflow-hidden rounded-lg aspect-[3/4] min-h-[280px]">
                      {!isLoaded && previewUrl && previewUrl !== displayUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-sm scale-105"
                          style={{ backgroundImage: `url(${previewUrl})` }}
                          aria-hidden
                        />
                      )}
                      <Image
                        src={displayUrl}
                        alt="Photo option"
                        fill
                        className="relative object-contain"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={true}
                        quality={85}
                        unoptimized={displayUrl.includes('googleusercontent.com') || displayUrl.includes('firebasestorage.googleapis.com')}
                        onLoad={() =>
                          setLoadedPhotos(prev => ({
                            ...prev,
                            [card.id]: true,
                          }))
                        }
                      />
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                            className="flex items-center gap-2 text-white font-semibold text-lg drop-shadow-lg"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                            Selected
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center mt-4">
          <Button
            onClick={handleSkip}
            disabled={isAnimating}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip this pair
            <span className="ml-2 text-xs text-white/60">(Esc or ↓)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
