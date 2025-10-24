import { motion } from "framer-motion";
import { Friend } from "@/store/useFriends";
import { Zap, Battery, AlertCircle, Edit3, Trash2, TrendingUp, Shield, Clock } from "lucide-react";
import Link from "next/link";

export function FriendCard({ friend, onEdit, onDelete }: {
  friend: Friend;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const energyColors = {
    energizing: 'from-green-500 to-emerald-500',
    neutral: 'from-gray-500 to-slate-500',
    draining: 'from-orange-500 to-red-500',
  };

  const priorityColors = {
    high: 'border-red-300 bg-red-50 dark:bg-red-950/20',
    medium: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20',
    low: 'border-gray-300 bg-gray-50 dark:bg-gray-950/20',
  };

  const energyIcons = {
    energizing: <Zap className="h-4 w-4" />,
    neutral: <Battery className="h-4 w-4" />,
    draining: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`card p-5 border-2 ${priorityColors[friend.priority]} hover:shadow-lg transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Link href={`/tools/friends/${friend.id}`} className="flex-1 hover:opacity-80 transition-opacity">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{friend.name}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {friend.relationshipType.replace('-', ' ')}
          </p>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <Edit3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Energy Level */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${energyColors[friend.energyLevel]} text-white`}>
          {energyIcons[friend.energyLevel]}
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-600 dark:text-gray-400">Energy</div>
          <div className="text-sm font-semibold capitalize">{friend.energyLevel}</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
            <TrendingUp className="h-3 w-3" />
            Growth
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {friend.growthAlignment}/10
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
            <Shield className="h-3 w-3" />
            Trust
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {friend.trustLevel}/10
          </div>
        </div>
      </div>

      {/* Shared Values */}
      {friend.sharedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {friend.sharedValues.slice(0, 3).map((value, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            >
              {value}
            </span>
          ))}
          {friend.sharedValues.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              +{friend.sharedValues.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Last Interaction */}
      {friend.lastInteraction && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
          <Clock className="h-3 w-3" />
          Last: {new Date(friend.lastInteraction).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
}
