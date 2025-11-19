"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePhotoFeedback, getOrCreateVoterId } from "@/store/usePhotoFeedback";
import Image from "next/image";
import { Heart, X, ChevronLeft, ChevronRight, Loader2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { toastError } from "@/lib/toast-presets";

export default function SessionVotingPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const { currentSession, loadSession, submitVote, isLoading, error } = usePhotoFeedback();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [voterId, setVoterId] = useState('');
  const [completedVotes, setCompletedVotes] = useState<Set<string>>(new Set());
  const [isVoting, setIsVoting] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [voteHistory, setVoteHistory] = useState<{ photoId: string; vote: 'yes' | 'no'; photoUrl: string; comment?: string }[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
      setVoterId(getOrCreateVoterId());
    }
  }, [sessionId, loadSession]);

  const handleVote = useCallback(async (vote: 'yes' | 'no') => {
    if (!currentSession || isVoting || completedVotes.has(currentSession.photos[currentPhotoIndex].id)) return;

    const currentPhoto = currentSession.photos[currentPhotoIndex];
    const comment = comments[currentPhoto.id]?.trim();
    setIsVoting(true);

    try {
      await submitVote(sessionId, currentPhoto.id, vote, voterId, comment);
      setCompletedVotes(prev => new Set([...prev, currentPhoto.id]));
      setVoteHistory(prev => [...prev, { photoId: currentPhoto.id, vote, photoUrl: currentPhoto.url, comment }]);
      if (comment) {
        setComments(prev => {
          const updated = { ...prev };
          delete updated[currentPhoto.id];
          return updated;
        });
      }

      // Move to next photo after a short delay
      setTimeout(() => {
        if (currentPhotoIndex < currentSession.photos.length - 1) {
          setCurrentPhotoIndex(prev => prev + 1);
        }
        setIsVoting(false);
      }, 300);
    } catch (error) {
      console.error('Error submitting vote:', error);
      toastError({
        title: "Vote not recorded",
        description: "Please try again.",
      });
      setIsVoting(false);
    }
  }, [comments, completedVotes, currentPhotoIndex, currentSession, isVoting, sessionId, submitVote, voterId]);

  // Keyboard arrows to vote (left = no, right = yes)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleVote('no');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleVote('yes');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleVote]);

  const goToPrevious = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentSession && currentPhotoIndex < currentSession.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const threshold = 50; // minimal swipe distance
    if (Math.abs(deltaX) < threshold) return;

    if (deltaX > 0) {
      void handleVote('yes'); // swipe right to like
    } else {
      void handleVote('no'); // swipe left to nope
    }
    setTouchStartX(null);
  };

  const handleCommentChange = (value: string) => {
    const current = currentSession?.photos[currentPhotoIndex];
    if (!current) return;
    setComments(prev => ({ ...prev, [current.id]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 dark:from-gray-900 dark:via-purple-800/40 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white/80">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 dark:from-gray-900 dark:via-purple-800/40 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center bg-white/90 dark:bg-gray-900/90 backdrop-blur">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {error || 'Session Not Found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This session may have expired or doesn&apos;t exist.
          </p>
          <Link
            href="/tools/photo-feedback"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
          >
            Create Your Own Session
          </Link>
        </Card>
      </div>
    );
  }

  const currentPhoto = currentSession.photos[currentPhotoIndex];
  const totalPhotos = currentSession.photos.length;
  const allVotesComplete = completedVotes.size === totalPhotos;
  const currentComment = comments[currentPhoto.id] || '';

  if (allVotesComplete) {
    const yesVotes = voteHistory.filter(v => v.vote === 'yes').length;
    const noVotes = voteHistory.filter(v => v.vote === 'no').length;
    const totalVotes = voteHistory.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              All Done!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Thanks for helping your friend pick their best photos. Here’s a recap of your choices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalVotes}</p>
            </div>
            <div className="rounded-lg border border-green-200 dark:border-green-800 p-4 text-center bg-green-50 dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-300">Swipe Right</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-200">{yesVotes}</p>
            </div>
            <div className="rounded-lg border border-red-200 dark:border-red-800 p-4 text-center bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-300">Swipe Left</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-200">{noVotes}</p>
            </div>
          </div>

          <div className="space-y-3">
            {voteHistory.map((vote, index) => (
              <div
                key={vote.photoId}
                className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <Image
                    src={vote.photoUrl}
                    alt={`Photo ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Photo {index + 1}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {vote.vote === 'yes' ? 'Loved it' : 'Not quite'}
                  </p>
                  {vote.comment && (
                    <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-300">
                      “{vote.comment}”
                    </p>
                  )}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    vote.vote === 'yes'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {vote.vote === 'yes' ? '❤️ Swipe Right' : '👎 Swipe Left'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You can close this page now. Feel free to vote on more sessions anytime!
            </p>
            <Link
              href="/tools/photo-feedback"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-pink-500 hover:bg-pink-600 rounded-full transition-colors"
            >
              Create your own feedback session
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const hasVotedOnCurrent = completedVotes.has(currentPhoto.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 dark:from-gray-900 dark:via-purple-800/40 dark:to-gray-900">
      <div className="max-w-xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/80">Photo Feedback</p>
            <h1 className="text-2xl font-bold">
              {currentSession.creatorName ? `${currentSession.creatorName}'s photos` : 'Rate these photos'}
            </h1>
          </div>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
            {currentPhotoIndex + 1}/{totalPhotos}
          </div>
        </div>

        <Card className="relative overflow-hidden border-none shadow-2xl">
          <div
            className="relative aspect-[3/4] bg-black"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={currentPhoto.url}
              alt={`Photo ${currentPhotoIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-contain"
              priority={currentPhotoIndex === 0}
            />

            <div className="absolute top-3 left-3 flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-white/80 text-gray-900">
              {completedVotes.size} voted
            </div>

            {hasVotedOnCurrent && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-gray-800/90 px-6 py-3 rounded-full shadow-lg">
                  <p className="text-green-700 dark:text-green-400 font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Voted
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between pointer-events-none">
            <button
              onClick={goToPrevious}
              disabled={currentPhotoIndex === 0}
              className="pointer-events-auto p-2 bg-black/50 text-white rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/70 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentPhotoIndex === totalPhotos - 1}
              className="pointer-events-auto p-2 bg-black/50 text-white rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/70 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleVote('no')}
            disabled={isVoting || hasVotedOnCurrent}
            className="flex items-center justify-center gap-2 px-8 py-5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur"
          >
            <X className="w-6 h-6" />
            Nope
          </button>
          <button
            onClick={() => handleVote('yes')}
            disabled={isVoting || hasVotedOnCurrent}
            className="flex items-center justify-center gap-2 px-8 py-5 bg-white text-pink-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Heart className="w-6 h-6" />
            Love it!
          </button>
        </div>

        <div className="mt-6">
          <label htmlFor="comment" className="text-sm font-semibold text-white/80 block mb-2">
            Leave a quick comment (optional)
          </label>
          <textarea
            id="comment"
            value={currentComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            disabled={hasVotedOnCurrent || isVoting}
            rows={3}
            className="w-full rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-white/60 focus:outline-none px-4 py-3"
            placeholder="Tell them why you swiped right or left..."
          />
        </div>
      </div>
    </div>
  );
}
