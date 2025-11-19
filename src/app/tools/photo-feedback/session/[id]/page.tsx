"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Award, Loader2, Shuffle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { usePhotoFeedback, type BattlePhoto } from "@/store/usePhotoFeedback";
import { toastError } from "@/lib/toast-presets";

interface Pair {
  left: BattlePhoto;
  right: BattlePhoto;
}

export default function PhotoBattleVotingPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { currentSession, loadSession, submitVote, isLoading, error } = usePhotoFeedback();
  const [pair, setPair] = useState<Pair | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentWinner, setRecentWinner] = useState<BattlePhoto | null>(null);

  useEffect(() => {
    if (sessionId) {
      void loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  const canVote = currentSession && currentSession.photos.length >= 2;

  const pickNextPair = useCallback(() => {
    if (!currentSession || currentSession.photos.length < 2) {
      setPair(null);
      return;
    }
    const pool = [...currentSession.photos];
    pool.sort(() => Math.random() - 0.5);
    const [left, rightCandidate] = pool;
    const right = rightCandidate?.id === left.id ? pool[1] : rightCandidate;
    if (!left || !right) {
      setPair(null);
      return;
    }
    setPair({ left, right });
  }, [currentSession]);

  useEffect(() => {
    pickNextPair();
  }, [pickNextPair]);

  const handleVote = async (winner: BattlePhoto, loser: BattlePhoto) => {
    if (!currentSession) return;
    setIsSubmitting(true);
    try {
      await submitVote(currentSession.id, winner.id, loser.id);
      setRecentWinner(winner);
      pickNextPair();
    } catch (err) {
      console.error(err);
      toastError({
        title: "Vote failed",
        description: "Unable to record your choice. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaderboard = useMemo(() => {
    if (!currentSession) return [];
    return [...currentSession.photos].sort((a, b) => b.rating - a.rating).slice(0, 3);
  }, [currentSession]);

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

  if (!canVote || !pair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xl font-semibold">Need at least two photos to start the battle.</p>
        <Link href="/tools/photo-feedback" className="text-purple-200 underline">
          Upload more photos
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <p className="text-sm uppercase tracking-widest text-purple-200">Photo Battle</p>
          <h1 className="text-3xl md:text-4xl font-bold">Pick the stronger photo</h1>
          <p className="text-sm text-purple-100">Tap the card that best represents {currentSession.creatorName || "this person"}.</p>
        </header>

        {recentWinner && (
          <div className="text-center bg-white/10 border border-white/20 rounded-2xl py-3 px-4 text-sm text-purple-100">
            <span className="font-semibold text-white">Nice! </span> You boosted one of the photos. Keep going to refine the ranking.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {[{ side: "left" as const, card: pair.left }, { side: "right" as const, card: pair.right }].map(({ side, card }) => (
            <Card
              key={card.id}
              className={`cursor-pointer overflow-hidden border-2 transition-all bg-white/5 border-white/10 hover:border-white/40 ${
                isSubmitting ? "pointer-events-none opacity-70" : ""
              }`}
              onClick={() => handleVote(card, side === "left" ? pair.right : pair.left)}
            >
              <div className="relative aspect-[3/4]">
                <Image src={card.url} alt="Photo option" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-purple-200">Pick this</p>
                  <p className="text-lg font-semibold text-white">Looks better</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white text-purple-600 text-sm font-semibold"
                >
                  Choose
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-purple-100">
          <button
            type="button"
            onClick={pickNextPair}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20"
          >
            <Shuffle className="w-4 h-4" />
            New pair
          </button>
          <Link href="/tools/photo-feedback" className="underline text-purple-200">
            Start your own battle
          </Link>
        </div>

        {leaderboard.length > 0 && (
          <Card className="bg-white/5 border-white/10 p-5">
            <div className="flex items-center gap-2 text-purple-100 mb-4">
              <Award className="w-5 h-5" />
              <p className="text-sm uppercase tracking-widest">Live leaderboard</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {leaderboard.map((photo, index) => (
                <div key={photo.id} className="rounded-2xl bg-white/10 border border-white/10 overflow-hidden">
                  <div className="relative h-32">
                    <Image src={photo.url} alt={`Rank ${index + 1}`} fill className="object-cover" sizes="200px" />
                  </div>
                  <div className="p-3 space-y-1 text-sm">
                    <p className="text-purple-200 font-semibold">#{index + 1} • {photo.rating} pts</p>
                    <p className="text-xs text-purple-100">
                      {photo.wins} wins • {photo.losses} losses
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
