"use client";

import { useState, useMemo, useEffect } from "react";
import { useFriends, Friend, EnergyLevel } from "@/store/useFriends";
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
  UserX
} from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";

export default function FriendsPage() {
  useTrackToolUsage('relationships');

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
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; id: string; name: string}>({show: false, id: '', name: ''});

  const theme = toolThemes.pink;

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

  const handleDelete = (friend: Friend) => {
    setDeleteConfirm({show: true, id: friend.id, name: friend.name});
  };

  const confirmDelete = async () => {
    await deleteFriend(deleteConfirm.id);
    setDeleteConfirm({show: false, id: '', name: ''});
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Relationships"
        emoji="👥"
        subtitle="Understand your connections • Prioritize aligned relationships • Grow together"
        showBackButton
        stats={[
          { label: 'energizing', value: stats.energizing, variant: 'success' },
          { label: 'high priority', value: stats.highPriority, variant: 'warning' },
          { label: 'growth-aligned', value: stats.highGrowth, variant: 'info' }
        ]}
        theme={theme}
        action={{
          label: 'Add Person',
          icon: Users,
          onClick: () => {
            setEditingFriend(null);
            setShowModal(true);
          }
        }}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name..."
        totalCount={friends.length}
        filteredCount={filteredFriends.length}
        theme={theme}
        showFilterToggle
        filterContent={
          <div className="flex flex-wrap gap-4">
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
          </div>
        }
      />

      {/* Privacy Notice */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
    </ToolPageLayout>
  );
}
