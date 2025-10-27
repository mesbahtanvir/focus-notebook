"use client";

import { useState, useMemo, useEffect } from "react";
import { useFriends, Friend, EnergyLevel, RelationshipType } from "@/store/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { FriendCard } from "@/components/FriendCard";
import { FriendModal } from "@/components/FriendModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  Users,
  Plus,
  Zap,
  TrendingUp,
  Shield,
  Star,
  Search,
  UserX,
  Filter,
  ChevronDown,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

export default function FriendsPage() {
  useTrackToolUsage('relationships');

  const router = useRouter();
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
  const [filterRelationshipType, setFilterRelationshipType] = useState<'all' | RelationshipType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; id: string; name: string}>({show: false, id: '', name: ''});

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
      if (filterRelationshipType !== 'all' && f.relationshipType !== filterRelationshipType) return false;
      return true;
    }).sort((a, b) => {
      // Sort by priority first, then by name
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [friends, searchQuery, filterEnergy, filterPriority, filterRelationshipType]);

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

  const handleDelete = (friend: Friend) => {
    setDeleteConfirm({show: true, id: friend.id, name: friend.name});
  };

  const confirmDelete = async () => {
    await deleteFriend(deleteConfirm.id);
    setDeleteConfirm({show: false, id: '', name: ''});
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-4 border-pink-200 dark:border-pink-800 shadow-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center justify-center p-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-pink-300 dark:border-pink-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300 transition-colors" />
          </button>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 dark:from-pink-400 dark:to-rose-400 bg-clip-text text-transparent flex items-center gap-2">
              <Users className="h-7 w-7 text-pink-600 dark:text-pink-400" />
              Relationships
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
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredFriends.length} of {friends.length} people
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-4 pt-4 border-t border-blue-200 dark:border-blue-700"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Energy Level</label>
              <select
                value={filterEnergy}
                onChange={(e) => setFilterEnergy(e.target.value as any)}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Energy Levels</option>
                <option value="energizing">✨ Energizing</option>
                <option value="neutral">➖ Neutral</option>
                <option value="draining">🔋 Draining</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Priorities</option>
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">⚪ Low Priority</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship Type</label>
              <select
                value={filterRelationshipType}
                onChange={(e) => setFilterRelationshipType(e.target.value as any)}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="close-friend">🤝 Close Friend</option>
                <option value="friend">👋 Friend</option>
                <option value="acquaintance">🤔 Acquaintance</option>
                <option value="family">👨‍👩‍👧 Family</option>
                <option value="colleague">💼 Colleague</option>
                <option value="mentor">🧙 Mentor</option>
              </select>
            </div>
          </motion.div>
        )}
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
                onDelete={() => handleDelete(friend)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Friend Modal */}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({show: false, id: '', name: ''})}
        title={`Remove ${deleteConfirm.name}?`}
        message="This will remove this person from your list. Your notes and thoughts will not be deleted."
        confirmText="Remove Person"
        cancelText="Keep"
        variant="warning"
        icon={<UserX className="h-8 w-8" />}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => {
          setEditingFriend(null);
          setShowModal(true);
        }}
        title="Add Person"
        icon={<Plus className="h-6 w-6" />}
      />
    </div>
  );
}
