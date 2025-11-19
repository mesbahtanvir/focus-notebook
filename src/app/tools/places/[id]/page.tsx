"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlaces } from "@/store/usePlaces";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Sparkles, MapPin, Cloud, DollarSign, Shield, Calendar, Clock, Heart, ExternalLink, Edit3, Trash2 } from "lucide-react";
import { PlaceModal } from "@/components/PlaceModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/hooks/use-toast";

export default function PlaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const placeId = params.id as string;
  const places = usePlaces((s) => s.places);
  const subscribe = usePlaces((s) => s.subscribe);
  const updatePlace = usePlaces((s) => s.update);
  const deletePlace = usePlaces((s) => s.delete);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const place = places.find(p => p.id === placeId);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            Place not found
          </h2>
          <button
            onClick={() => router.push('/tools/places')}
            className="mt-4 btn-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Places
          </button>
        </div>
      </div>
    );
  }

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      // TODO: Call enrichment API
      toast({
        title: "Enrichment started",
        description: "AI is gathering information about this place..."
      });

      // Simulate enrichment for now
      await new Promise(resolve => setTimeout(resolve, 2000));

      await updatePlace(place.id, {
        aiEnriched: true,
        description: `${place.name} is a fascinating destination known for its unique blend of culture and natural beauty.`,
        climate: "Temperate",
        costOfLiving: "Medium",
        safety: "High",
        culture: "Rich cultural heritage",
        bestTimeToVisit: "Spring and Fall",
        pros: ["Beautiful scenery", "Rich history", "Great food"],
        cons: ["Can be crowded", "Expensive in peak season"]
      });

      toast({
        title: "Place enriched!",
        description: "AI has added detailed information about this place."
      });
    } catch (error) {
      toast({
        title: "Enrichment failed",
        description: "Could not enrich place details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleDelete = async () => {
    await deletePlace(place.id);
    router.push('/tools/places');
  };

  const typeConfig: Record<string, { emoji: string; label: string; color: string }> = {
    live: { emoji: '🏡', label: 'Want to Live', color: 'green' },
    visit: { emoji: '✈️', label: 'Want to Visit', color: 'blue' },
    'short-term': { emoji: '🏨', label: 'Short-term Stay', color: 'orange' }
  };

  const config = typeConfig[place.type];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/tools/places')}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Places
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </button>
            </div>
          </div>

          {/* Title Section */}
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {place.name}
                  </h1>
                  {place.aiEnriched && (
                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                {place.city && place.country && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {place.city}, {place.country}
                  </p>
                )}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/40 dark:text-${config.color}-300 text-sm font-medium`}>
                    {config.emoji} {config.label}
                  </span>
                </div>
              </div>
            </div>

            {place.description && (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {place.description}
              </p>
            )}
          </div>

          {/* Enrich Button */}
          {!place.aiEnriched && (
            <button
              onClick={handleEnrich}
              disabled={isEnriching}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className={`h-5 w-5 ${isEnriching ? 'animate-spin' : ''}`} />
              {isEnriching ? 'Enriching with AI...' : 'Enrich with AI'}
            </button>
          )}

          {/* Quick Stats */}
          {(place.climate || place.costOfLiving || place.safety) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {place.climate && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Cloud className="h-5 w-5" />
                    <span className="text-sm font-medium">Climate</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{place.climate}</p>
                </div>
              )}
              {place.costOfLiving && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Cost of Living</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{place.costOfLiving}</p>
                </div>
              )}
              {place.safety && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-medium">Safety</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{place.safety}</p>
                </div>
              )}
            </div>
          )}

          {/* Additional Details */}
          {(place.culture || place.bestTimeToVisit || place.averageStayDuration) && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Details</h2>
              {place.culture && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Culture</h3>
                  <p className="text-gray-800 dark:text-gray-200">{place.culture}</p>
                </div>
              )}
              {place.bestTimeToVisit && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Best time to visit:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{place.bestTimeToVisit}</span>
                </div>
              )}
              {place.averageStayDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Average stay:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{place.averageStayDuration}</span>
                </div>
              )}
            </div>
          )}

          {/* Pros and Cons */}
          {(place.pros?.length || place.cons?.length) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {place.pros && place.pros.length > 0 && (
                <div className="bg-green-50/90 dark:bg-green-950/30 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-3">Pros</h3>
                  <ul className="space-y-2">
                    {place.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {place.cons && place.cons.length > 0 && (
                <div className="bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-red-200 dark:border-red-800">
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-3">Cons</h3>
                  <ul className="space-y-2">
                    {place.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">✗</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Comparison Scores */}
          {place.comparisonScores && Object.keys(place.comparisonScores).length > 0 && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Comparison Scores</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {place.comparisonScores.cost !== undefined && (
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cost</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{place.comparisonScores.cost}/10</div>
                  </div>
                )}
                {place.comparisonScores.weather !== undefined && (
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Weather</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{place.comparisonScores.weather}/10</div>
                  </div>
                )}
                {place.comparisonScores.safety !== undefined && (
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Safety</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{place.comparisonScores.safety}/10</div>
                  </div>
                )}
                {place.comparisonScores.culture !== undefined && (
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Culture</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{place.comparisonScores.culture}/10</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {place.notes && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Notes</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{place.notes}</p>
            </div>
          )}

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {place.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {place.links && place.links.length > 0 && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Resources</h2>
              <div className="space-y-2">
                {place.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PlaceModal
          place={place}
          onClose={() => setShowEditModal(false)}
          onSave={async (data) => {
            await updatePlace(place.id, data);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title={`Delete ${place.name}?`}
        message="This will permanently remove this place from your list."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-8 w-8" />}
      />
    </>
  );
}
