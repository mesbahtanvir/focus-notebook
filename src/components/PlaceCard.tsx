import { motion } from "framer-motion";
import { Place } from "@/store/usePlaces";
import { MapPin, Edit3, Trash2, Sparkles, ExternalLink, Tag, DollarSign, Cloud, Shield, Heart } from "lucide-react";

type ColorType = 'green' | 'blue' | 'orange';

export function PlaceCard({ place, onEdit, onDelete }: {
  place: Place;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeConfig: Record<string, { emoji: string; label: string; color: ColorType }> = {
    live: { emoji: '🏡', label: 'Want to Live', color: 'green' },
    visit: { emoji: '✈️', label: 'Want to Visit', color: 'blue' },
    'short-term': { emoji: '🏨', label: 'Short-term Stay', color: 'orange' }
  };

  const config = typeConfig[place.type];

  const typeColors: Record<ColorType, string> = {
    green: 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800',
    blue: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800',
    orange: 'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800',
  };

  const badgeColors: Record<ColorType, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`card p-5 border-2 ${typeColors[config.color]} hover:shadow-lg transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{place.name}</h3>
            {place.aiEnriched && (
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${badgeColors[config.color]}`}>
              {config.emoji} {config.label}
            </span>
          </div>
          {place.city && place.country && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {place.city}, {place.country}
            </p>
          )}
        </div>
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

      {/* Description */}
      {place.description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
          {place.description}
        </p>
      )}

      {/* Quick Info */}
      {(place.climate || place.costOfLiving || place.safety) && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {place.climate && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                <Cloud className="h-3 w-3" />
              </div>
              <div className="text-xs font-semibold truncate">{place.climate}</div>
            </div>
          )}
          {place.costOfLiving && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                <DollarSign className="h-3 w-3" />
              </div>
              <div className="text-xs font-semibold truncate">{place.costOfLiving}</div>
            </div>
          )}
          {place.safety && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                <Shield className="h-3 w-3" />
              </div>
              <div className="text-xs font-semibold truncate">{place.safety}</div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Scores */}
      {place.comparisonScores && Object.keys(place.comparisonScores).length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Comparison Scores:
          </div>
          <div className="grid grid-cols-4 gap-2">
            {place.comparisonScores.cost !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-500">Cost</div>
                <div className="text-sm font-bold text-blue-600">{place.comparisonScores.cost}/10</div>
              </div>
            )}
            {place.comparisonScores.weather !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-500">Weather</div>
                <div className="text-sm font-bold text-blue-600">{place.comparisonScores.weather}/10</div>
              </div>
            )}
            {place.comparisonScores.safety !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-500">Safety</div>
                <div className="text-sm font-bold text-blue-600">{place.comparisonScores.safety}/10</div>
              </div>
            )}
            {place.comparisonScores.culture !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-500">Culture</div>
                <div className="text-sm font-bold text-blue-600">{place.comparisonScores.culture}/10</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pros/Cons */}
      {(place.pros && place.pros.length > 0 || place.cons && place.cons.length > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          {place.pros && place.pros.length > 0 && (
            <div>
              <div className="font-semibold text-green-700 dark:text-green-400 mb-1">Pros:</div>
              <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                {place.pros.slice(0, 2).map((pro, idx) => (
                  <li key={idx} className="truncate">• {pro}</li>
                ))}
              </ul>
            </div>
          )}
          {place.cons && place.cons.length > 0 && (
            <div>
              <div className="font-semibold text-red-700 dark:text-red-400 mb-1">Cons:</div>
              <ul className="text-gray-600 dark:text-gray-400 space-y-0.5">
                {place.cons.slice(0, 2).map((con, idx) => (
                  <li key={idx} className="truncate">• {con}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {place.tags && place.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {place.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 text-xs rounded-full ${badgeColors[config.color]}`}
            >
              {tag}
            </span>
          ))}
          {place.tags.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              +{place.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* AI Enrichment Notice */}
      {!place.aiEnriched && !place.description && !place.climate && (
        <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Ask AI to enrich this entry with details
          </p>
        </div>
      )}
    </motion.div>
  );
}
