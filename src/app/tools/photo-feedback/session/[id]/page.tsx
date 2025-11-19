"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePhotoFeedback, getOrCreateVoterId } from "@/store/usePhotoFeedback";
import Image from "next/image";
import { Heart, X, ChevronLeft, ChevronRight, Loader2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function SessionVotingPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const { currentSession, loadSession, submitVote, isLoading, error } = usePhotoFeedback();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [voterId, setVoterId] = useState('');
  const [completedVotes, setCompletedVotes] = useState<Set<string>>(new Set());
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
      setVoterId(getOrCreateVoterId());
    }
  }, [sessionId, loadSession]);

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!currentSession || isVoting) return;

    const currentPhoto = currentSession.photos[currentPhotoIndex];
    setIsVoting(true);

    try {
      await submitVote(sessionId, currentPhoto.id, vote, voterId);
      setCompletedVotes(prev => new Set([...prev, currentPhoto.id]));

      // Move to next photo after a short delay
      setTimeout(() => {
        if (currentPhotoIndex < currentSession.photos.length - 1) {
          setCurrentPhotoIndex(prev => prev + 1);
        }
        setIsVoting(false);
      }, 300);
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast({
        title: "Vote not recorded",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsVoting(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
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

  if (allVotesComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            All Done!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your feedback! Your votes have been recorded.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            You can close this page now.
          </div>
        </Card>
      </div>
    );
  }

  const hasVotedOnCurrent = completedVotes.has(currentPhoto.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {currentSession.creatorName ? `${currentSession.creatorName}'s Photos` : 'Rate These Photos'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Swipe right if you like it, left if you don&apos;t
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Photo {currentPhotoIndex + 1} of {totalPhotos}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {completedVotes.size} voted
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentPhotoIndex + 1) / totalPhotos) * 100}%` }}
            />
          </div>
        </div>

        {/* Photo Card */}
        <Card className="relative overflow-hidden bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 mb-6">
          <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-900">
            <Image
              src={currentPhoto.url}
              alt={`Photo ${currentPhotoIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-contain"
              priority={currentPhotoIndex === 0}
            />

            {/* Vote Status Overlay */}
            {hasVotedOnCurrent && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-lg">
                  <p className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Already Voted
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Arrows */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between pointer-events-none">
            <button
              onClick={goToPrevious}
              disabled={currentPhotoIndex === 0}
              className="pointer-events-auto p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-700 transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentPhotoIndex === totalPhotos - 1}
              className="pointer-events-auto p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-700 transition-all"
            >
              <ChevronRight className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
          </div>
        </Card>

        {/* Voting Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleVote('no')}
            disabled={isVoting || hasVotedOnCurrent}
            className="flex items-center justify-center gap-2 px-8 py-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
            Nope
          </button>
          <button
            onClick={() => handleVote('yes')}
            disabled={isVoting || hasVotedOnCurrent}
            className="flex items-center justify-center gap-2 px-8 py-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Heart className="w-6 h-6" />
            Love it!
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Swipe through all photos to give your honest feedback</p>
        </div>
      </div>
    </div>
  );
}
