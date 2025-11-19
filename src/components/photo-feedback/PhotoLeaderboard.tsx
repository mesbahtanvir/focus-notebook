"use client";

import { Card } from "@/components/ui/card";
import NextImage from "next/image";
import { PhotoLibraryItem } from "@/store/usePhotoFeedback";
import { AlertTriangle, Trophy } from "lucide-react";

interface PhotoLeaderboardProps {
  photos: PhotoLibraryItem[];
}

interface LeaderboardEntry {
  id: string;
  url: string;
  yesVotes: number;
  totalVotes: number;
  approval: number;
  sessionCount: number;
}

const MIN_VOTES_FOR_VERDICT = 5;

const verdictBadge = (entry: LeaderboardEntry) => {
  if (entry.totalVotes < MIN_VOTES_FOR_VERDICT) {
    return {
      label: "Need more votes",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300",
    };
  }
  if (entry.approval >= 70) {
    return {
      label: "Keep it",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    };
  }
  if (entry.approval >= 50) {
    return {
      label: "Worth testing",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    };
  }
  return {
    label: "Consider removing",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
};

const isUnderperformer = (entry: LeaderboardEntry) =>
  entry.totalVotes >= MIN_VOTES_FOR_VERDICT && entry.approval < 50;

export function PhotoLeaderboard({ photos }: PhotoLeaderboardProps) {
  const entries: LeaderboardEntry[] = photos
    .map(photo => {
      const yesVotes = photo.stats?.yesVotes ?? 0;
      const totalVotes = photo.stats?.totalVotes ?? 0;
      const sessionCount = photo.stats?.sessionCount ?? 0;
      return {
        id: photo.id,
        url: photo.url,
        yesVotes,
        totalVotes,
        approval: totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0,
        sessionCount,
      };
    })
    .filter(entry => entry.totalVotes > 0)
    .sort((a, b) => {
      if (b.approval === a.approval) {
        return b.totalVotes - a.totalVotes;
      }
      return b.approval - a.approval;
    });

  if (entries.length === 0) {
    return null;
  }

  const totalVotesCount = entries.reduce((sum, entry) => sum + entry.totalVotes, 0);
  const waitingForVotes = photos.filter(photo => (photo.stats?.totalVotes ?? 0) === 0).length;
  const topEntries = entries.slice(0, Math.min(entries.length, 3));
  const needsReview = entries
    .filter(isUnderperformer)
    .sort((a, b) => {
      if (a.approval === b.approval) {
        return b.totalVotes - a.totalVotes;
      }
      return a.approval - b.approval;
    })
    .slice(0, 3);

  return (
    <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
            Leaderboard
          </p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Photo performance</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ranked by approval rate so you know what to keep—or cut.
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalVotesCount} vote{totalVotesCount === 1 ? "" : "s"} recorded
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-300">
            <Trophy className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top picks</h3>
          </div>
          <div className="space-y-3">
            {topEntries.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                prefixLabel={`#${index + 1}`}
                prefixClassName="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-300">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Needs review</h3>
          </div>
          <div className="space-y-3">
            {needsReview.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No obvious cuts yet. Keep collecting votes.
              </p>
            ) : (
              needsReview.map(entry => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  prefixLabel="⚠︎"
                  prefixClassName="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {waitingForVotes > 0 && (
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          {waitingForVotes} photo{waitingForVotes === 1 ? "" : "s"} still waiting for first votes.
        </p>
      )}
    </Card>
  );
}

function LeaderboardRow({
  entry,
  prefixLabel,
  prefixClassName,
}: {
  entry: LeaderboardEntry;
  prefixLabel: string;
  prefixClassName: string;
}) {
  const verdict = verdictBadge(entry);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/40 p-3 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${prefixClassName}`}
      >
        {prefixLabel}
      </div>
      <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        <NextImage src={entry.url} alt="Leaderboard photo" fill sizes="64px" className="object-cover" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Approval</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{entry.approval}%</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          👍 {entry.yesVotes}/{entry.totalVotes} • {entry.sessionCount} session
          {entry.sessionCount === 1 ? "" : "s"}
        </p>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${verdict.className}`}>{verdict.label}</span>
    </div>
  );
}
