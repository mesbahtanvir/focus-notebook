"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { usePhotoFeedback, type BattlePhoto } from "@/store/usePhotoFeedback";
import { toastError } from "@/lib/toast-presets";
import { useAuth } from "@/contexts/AuthContext";

interface Pair {
  left: BattlePhoto;
  right: BattlePhoto;
}

const PREFETCH_TARGET = 5;

export default function PhotoBattleVotingPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { currentSession, loadSession, submitVote, getNextPair, isLoading, error } = usePhotoFeedback();
  const { user: authUser, loading: authLoading, signInAnonymously } = useAuth();
  const [pairBuffer, setPairBuffer] = useState<Pair[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, boolean>>({});
  const [isFetchingPair, setIsFetchingPair] = useState(false);

  useEffect(() => {
    if (sessionId) {
      void loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

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

  const fetchNextPair = useCallback(async () => {
    if (!currentSession || currentSession.photos.length < 2 || isFetchingPair) return;
    setIsFetchingPair(true);
    try {
      const next = await getNextPair(currentSession.id);
      if (next?.left && next?.right) {
        setPairBuffer(prev => [...prev, next]);
      }
    } catch (err) {
      console.error("Failed to fetch next pair:", err);
    } finally {
      setIsFetchingPair(false);
    }
  }, [currentSession, getNextPair, isFetchingPair]);

  const advancePairs = useCallback(() => {
    setPairBuffer(prev => (prev.length > 0 ? prev.slice(1) : prev));
  }, []);

  useEffect(() => {
    if (!currentSession || currentSession.photos.length < 2) {
      setPairBuffer([]);
      return;
    }
    let cancelled = false;
    const loadInitial = async () => {
      const initial: Pair[] = [];
      for (let i = 0; i < PREFETCH_TARGET; i += 1) {
        try {
          const next = await getNextPair(currentSession.id);
          if (!next) break;
          initial.push(next);
        } catch (err) {
          console.error("Failed to seed pair buffer:", err);
          break;
        }
      }
      if (!cancelled) {
        setPairBuffer(initial);
      }
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [currentSession, getNextPair]);

  useEffect(() => {
    if (!currentSession || currentSession.photos.length < 2) return;
    if (pairBuffer.length < 3 && !isFetchingPair) {
      void fetchNextPair();
    }
    if (pairBuffer.length + (isFetchingPair ? 1 : 0) < PREFETCH_TARGET) {
      void fetchNextPair();
    }
  }, [pairBuffer.length, fetchNextPair, currentSession, isFetchingPair]);

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
      const animationDelay = new Promise<void>(resolve => {
        window.setTimeout(resolve, 1000);
      });
      let shouldAdvance = false;
      try {
        await Promise.all([submitVote(currentSession.id, winner.id, loser.id), animationDelay]);
        shouldAdvance = true;
      } catch (err) {
        console.error(err);
        toastError({
          title: "Vote failed",
          description: "Unable to record your choice. Please try again.",
        });
        await animationDelay;
      } finally {
        setSelectedPhotoId(null);
        if (shouldAdvance) {
          advancePairs();
        }
        setIsAnimating(false);
      }
    },
    [currentSession, submitVote, advancePairs, isAnimating, pair, authLoading, authUser, ensureAnonymousSession]
  );

  useEffect(() => {
    if (!pair || isAnimating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void handleVote(pair.left, pair.right);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void handleVote(pair.right, pair.left);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pair, isAnimating, handleVote]);

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

  if (!pair) {
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

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          {[{ side: "left" as const, card: pair.left }, { side: "right" as const, card: pair.right }].map(({ side, card }) => {
            const isSelected = selectedPhotoId === card.id;
            const previewUrl = card.thumbnailUrl ?? card.url;
            const isLoaded = loadedPhotos[card.id];
            return (
              <Card
                key={card.id}
                className={`group relative flex h-full cursor-pointer overflow-hidden border-2 bg-white/5 transition-all ${
                  isSelected ? "border-white ring-2 ring-white/70" : "border-white/10 hover:border-white/40"
                } ${isAnimating ? "pointer-events-none opacity-70" : ""}`}
                onClick={() => handleVote(card, side === "left" ? pair.right : pair.left)}
              >
                <div className="relative w-full overflow-hidden rounded-lg aspect-[3/4] min-h-[280px]">
                  <div
                    className={`absolute inset-0 bg-cover bg-center blur-xl scale-110 transition-opacity duration-200 ${
                      isLoaded ? "opacity-0" : "opacity-100"
                    }`}
                    style={{ backgroundImage: `url(${previewUrl})` }}
                    aria-hidden
                  />
                  <Image
                    src={card.url}
                    alt="Photo option"
                    fill
                    className={`relative object-contain transition-opacity duration-200 ${
                      isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onLoadingComplete={() =>
                      setLoadedPhotos(prev => ({
                        ...prev,
                        [card.id]: true,
                      }))
                    }
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-fade-in">
                      <div className="flex items-center gap-2 text-white font-semibold text-lg drop-shadow-lg">
                        <CheckCircle2 className="w-6 h-6" />
                        Selected
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
