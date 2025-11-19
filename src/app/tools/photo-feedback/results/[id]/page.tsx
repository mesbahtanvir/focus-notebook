"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePhotoFeedback } from "@/store/usePhotoFeedback";
import { Trophy, TrendingUp, ThumbsUp, ThumbsDown, Users, Loader2, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

function ResultsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const secretKey = searchParams.get('key');

  const { loadResults, results, isLoading, error } = usePhotoFeedback();

  useEffect(() => {
    if (sessionId && secretKey) {
      loadResults(sessionId, secretKey);
    }
  }, [sessionId, secretKey, loadResults]);

  if (!secretKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Missing secret key</p>
          <p className="text-gray-600 dark:text-gray-400">
            You need the secret key to view results. Check your results link.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            href="/tools/photo-feedback"
            className="inline-block text-purple-600 hover:text-purple-700 font-semibold"
          >
            Create New Session
          </Link>
        </Card>
      </div>
    );
  }

  const totalVotes = results.reduce((sum, r) => sum + r.totalVotes, 0);
  const avgVotesPerPhoto = results.length > 0 ? Math.round(totalVotes / results.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Your Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Here&apos;s what your friends thought of your photos
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Votes</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{totalVotes}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Votes/Photo</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{avgVotesPerPhoto}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Top Photo</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {results[0]?.percentage || 0}% liked
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Results Grid */}
        {results.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-gray-800">
            <Share2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              No votes yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Share the voting link with your friends to start collecting feedback!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <Card
                key={result.photoId}
                className={`p-6 bg-white dark:bg-gray-800 border-2 transition-all ${
                  index === 0
                    ? 'border-yellow-400 dark:border-yellow-600 shadow-lg'
                    : 'border-purple-200 dark:border-purple-800'
                }`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    <div className="relative w-full md:w-48 h-64">
                      <Image
                        src={result.photoUrl}
                        alt={`Photo ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 192px"
                        className="object-cover rounded-lg"
                        priority={index === 0}
                      />
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-2">
                          <Trophy className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        #{index + 1}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        Photo {index + 1}
                      </h3>
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {result.percentage}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Approval Rating</span>
                        <span>{result.totalVotes} total votes</span>
                      </div>
                      <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Vote Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <ThumbsUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Love it</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {result.yesVotes}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="p-2 bg-red-500 rounded-lg">
                          <ThumbsDown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Not so much</p>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {result.noVotes}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation */}
                    {result.totalVotes >= 3 && (
                      <div className="mt-4">
                        {result.percentage >= 70 ? (
                          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                              Definitely use this one!
                            </span>
                          </div>
                        ) : result.percentage >= 50 ? (
                          <div className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                              Could work, but not your strongest
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <ThumbsDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                              Consider skipping this one
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/tools/photo-feedback"
            className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:shadow-lg text-white rounded-lg font-semibold transition-all"
          >
            Create New Session
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
}
