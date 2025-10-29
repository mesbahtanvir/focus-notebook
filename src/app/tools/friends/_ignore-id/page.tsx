"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFriends, Friend } from "@/store/useFriends";
import { useThoughts } from "@/store/useThoughts";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Zap,
  Calendar,
  Heart,
  AlertCircle,
  Star,
  TrendingUp,
  Shield,
  Edit3,
  Trash2,
  MessageSquarePlus,
  Brain
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function FriendDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const friendId = params.id as string;

  const friends = useFriends((s) => s.friends);
  const subscribe = useFriends((s) => s.subscribe);
  const deleteFriend = useFriends((s) => s.delete);

  const thoughts = useThoughts((s) => s.thoughts);
  const subscribeThoughts = useThoughts((s) => s.subscribe);
  const addThought = useThoughts((s) => s.add);

  const [newThoughtText, setNewThoughtText] = useState("");
  const [isAddingThought, setIsAddingThought] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
      subscribeThoughts(user.uid);
    }
  }, [user?.uid, subscribe, subscribeThoughts]);

  const friend = friends.find((f) => f.id === friendId);

  // Filter thoughts that mention this person's name
  const relatedThoughts = thoughts.filter((t) =>
    t.tags?.includes(friend?.name || '') ||
    t.text.toLowerCase().includes((friend?.name || '').toLowerCase())
  );

  const handleAddThought = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThoughtText.trim() || !friend) return;

    setIsAddingThought(true);
    try {
      await addThought({
        text: newThoughtText.trim(),
        tags: [friend.name],
      });
      setNewThoughtText("");
    } finally {
      setIsAddingThought(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Remove ${friend?.name} from your list? Your notes and thoughts will not be deleted.`)) {
      await deleteFriend(friendId);
      router.push("/tools/relationships");
    }
  };

  if (!friend) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Person Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The person you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/tools/relationships")}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            Back to People
          </button>
        </div>
      </div>
    );
  }

  const energyColors = {
    energizing: { bg: 'bg-green-100 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300', icon: '⚡' },
    neutral: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: '➖' },
    draining: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', icon: '🔋' }
  };

  const priorityColors = {
    high: { bg: 'bg-purple-100 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300' },
    medium: { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
    low: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 dark:from-pink-950/20 dark:via-rose-950/20 dark:to-purple-950/20 p-6 rounded-2xl border-4 border-pink-200 dark:border-pink-800 shadow-xl">
        <button
          onClick={() => router.push("/tools/relationships")}
          className="flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-200 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to People
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {friend.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${energyColors[friend.energyLevel].bg} ${energyColors[friend.energyLevel].text}`}>
                {energyColors[friend.energyLevel].icon} {friend.energyLevel}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${priorityColors[friend.priority].bg} ${priorityColors[friend.priority].text}`}>
                {friend.priority} priority
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                {friend.relationshipType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/tools/relationships?edit=${friendId}`)}
              className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 transition-colors"
              title="Edit"
            >
              <Edit3 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 text-center">
          <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{friend.growthAlignment}/10</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Growth Alignment</div>
        </div>

        <div className="card p-6 text-center">
          <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{friend.trustLevel}/10</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Trust Level</div>
        </div>

        <div className="card p-6 text-center">
          <Calendar className="h-8 w-8 text-pink-500 mx-auto mb-2" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {friend.lastInteraction ? new Date(friend.lastInteraction).toLocaleDateString() : 'No data'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Last Interaction</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Notes */}
          {friend.notes && (
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Brain className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                Notes
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{friend.notes}</p>
            </div>
          )}

          {/* Positive Traits */}
          {friend.positiveTraits && friend.positiveTraits.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                What I Appreciate
              </h3>
              <div className="flex flex-wrap gap-2">
                {friend.positiveTraits.map((trait, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 text-sm">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shared Values */}
          {friend.sharedValues && friend.sharedValues.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Shared Values
              </h3>
              <div className="flex flex-wrap gap-2">
                {friend.sharedValues.map((value, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-800 dark:text-pink-200 text-sm">
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {friend.concerns && friend.concerns.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Concerns
              </h3>
              <div className="flex flex-wrap gap-2">
                {friend.concerns.map((concern, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 text-sm">
                    {concern}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Thoughts */}
        <div className="space-y-6">
          {/* Add Thought Form */}
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-purple-600" />
              Add Thought
            </h3>
            <form onSubmit={handleAddThought} className="space-y-3">
              <textarea
                value={newThoughtText}
                onChange={(e) => setNewThoughtText(e.target.value)}
                placeholder={`Share a thought about ${friend.name}...`}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"
                disabled={isAddingThought}
              />
              <button
                type="submit"
                disabled={!newThoughtText.trim() || isAddingThought}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
              >
                {isAddingThought ? 'Adding...' : 'Add Thought'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This thought will be automatically tagged with {friend.name}
              </p>
            </form>
          </div>

          {/* Related Thoughts */}
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Related Thoughts ({relatedThoughts.length})
            </h3>
            {relatedThoughts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8">
                No thoughts yet. Add your first thought above.
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {relatedThoughts.map((thought) => (
                  <Link
                    key={thought.id}
                    href={`/tools/thoughts?id=${thought.id}`}
                    className="block p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <p className="text-gray-800 dark:text-gray-200 mb-2 line-clamp-3">
                      {thought.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(thought.createdAt).toLocaleDateString()}
                      {thought.tags && thought.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-1">
                            {thought.tags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
