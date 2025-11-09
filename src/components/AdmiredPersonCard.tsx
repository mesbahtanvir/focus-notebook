import { motion } from "framer-motion";
import { AdmiredPerson } from "@/store/useAdmiredPeople";
import { Sparkles, Edit3, Trash2, ExternalLink, Tag } from "lucide-react";

export function AdmiredPersonCard({ person, onEdit, onDelete }: {
  person: AdmiredPerson;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="card p-5 border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 hover:shadow-lg transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{person.name}</h3>
          {person.category && (
            <p className="text-xs text-gray-600 dark:text-gray-400 capitalize mt-1">
              {person.category}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {person.aiEnriched && (
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          )}
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

      {/* Bio */}
      {person.bio && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
          {person.bio}
        </p>
      )}

      {/* Why Admire */}
      {person.whyAdmire && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
            Why I admire them:
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {person.whyAdmire}
          </p>
        </div>
      )}

      {/* Key Lessons */}
      {person.keyLessons && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
            Key lessons:
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {person.keyLessons}
          </p>
        </div>
      )}

      {/* Links */}
      {person.links && person.links.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {person.links.length} link{person.links.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Tags */}
      {person.tags && person.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {person.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
            >
              {tag}
            </span>
          ))}
          {person.tags.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              +{person.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* AI Enrichment Notice */}
      {!person.aiEnriched && !person.bio && !person.whyAdmire && (
        <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Ask AI to enrich this entry with insights and details
          </p>
        </div>
      )}
    </motion.div>
  );
}
