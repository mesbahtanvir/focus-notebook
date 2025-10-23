"use client";

import { useState, useMemo, useEffect } from "react";
import { useFriends, Friend, EnergyLevel } from "@/store/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import { FriendCard } from "@/components/FriendCard";
import { FriendModal } from "@/components/FriendModal";
import {
  Users,
  Plus,
  Zap,
  TrendingUp,
  Shield,
  Star,
  Search,
} from "lucide-react";

export default function FriendsPage() {
  const { user } = useAuth();
  const friends = useFriends((s) => s.friends);
  const subscribe = useFriends((s) => s.subscribe);
  const addFriend = useFriends((s) => s.add);
  const updateFriend = useFriends((s) => s.update);
  const deleteFriend = useFriends((s) => s.delete);

  const [showModal, setShowModal] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEnergy, setFilterEnergy] = useState<'all' | EnergyLevel>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Subscribe to Firebase
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const filteredFriends = useMemo(() => {
    return friends.filter(f => {
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterEnergy !== 'all' && f.energyLevel !== filterEnergy) return false;
      if (filterPriority !== 'all' && f.priority !== filterPriority) return false;
      return true;
    }).sort((a, b) => {
      // Sort by priority first, then by name
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [friends, searchQuery, filterEnergy, filterPriority]);

  const stats = useMemo(() => {
    return {
      total: friends.length,
      energizing: friends.filter(f => f.energyLevel === 'energizing').length,
      draining: friends.filter(f => f.energyLevel === 'draining').length,
      highPriority: friends.filter(f => f.priority === 'high').length,
      highGrowth: friends.filter(f => f.growthAlignment >= 7).length,
    };
  }, [friends]);

  const handleEdit = (friend: Friend) => {
    setEditingFriend(friend);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remove this person from your list? Your notes will not be deleted.')) {
      await deleteFriend(id);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-4 border-pink-200 dark:border-pink-800 shadow-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 dark:from-pink-400 dark:to-rose-400 bg-clip-text text-transparent flex items-center gap-2">
              <Users className="h-7 w-7 text-pink-600 dark:text-pink-400" />
              Relationship Reflections
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Understand your connections • Prioritize aligned relationships • Grow together
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs font-medium flex-wrap">
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300">
                <Zap className="h-3 w-3 inline mr-1" />
                {stats.energizing} energizing
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                <Star className="h-3 w-3 inline mr-1" />
                {stats.highPriority} high priority
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {stats.highGrowth} growth-aligned
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingFriend(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Add Person
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={filterEnergy}
          onChange={(e) => setFilterEnergy(e.target.value as any)}
          className="input"
        >
          <option value="all">All Energy Levels</option>
          <option value="energizing">✨ Energizing</option>
          <option value="neutral">➖ Neutral</option>
          <option value="draining">🔋 Draining</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as any)}
          className="input"
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High Priority</option>
          <option value="medium">🟡 Medium Priority</option>
          <option value="low">⚪ Low Priority</option>
        </select>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong className="text-blue-700 dark:text-blue-400">Private & Confidential:</strong> These reflections are for your personal growth and self-awareness. 
            Use this tool to understand your relationships better and make conscious decisions about who to invest your time and energy with. 
            This is not about judging others—it&apos;s about knowing yourself and choosing alignment.
          </div>
        </div>
      </div>

      {/* Friends List */}
      {filteredFriends.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No relationships tracked yet
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">
            Start reflecting on your relationships to make better decisions about who to prioritize
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Person
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onEdit={() => handleEdit(friend)}
                onDelete={() => handleDelete(friend.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <FriendModal
          friend={editingFriend}
          onClose={() => {
            setShowModal(false);
            setEditingFriend(null);
          }}
          onSave={async (data) => {
            if (editingFriend) {
              await updateFriend(editingFriend.id, data);
            } else {
              await addFriend(data);
            }
            setShowModal(false);
            setEditingFriend(null);
          }}
        />
      )}
    </div>
  );
}
