"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlaces } from "@/store/usePlaces";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Cloud,
  DollarSign,
  Shield,
  Calendar,
  Clock,
  Heart,
  ExternalLink,
  Edit3,
  Trash2,
  BarChart3,
  Users,
  Sun,
  CloudRain,
  Wifi,
  Globe2,
  ListChecks,
} from "lucide-react";
import { PlaceModal } from "@/components/PlaceModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { httpsCallable } from "firebase/functions";
import { functionsClient } from "@/lib/firebaseClient";

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
      toast({
        title: "Enrichment started",
        description: "AI is gathering information about this place..."
      });

      const callable = httpsCallable<
        { destinationName: string; country?: string },
        { result: any }
      >(functionsClient, "runPlaceInsights");

      const response = await callable({
        destinationName: place.name,
        country: place.country,
      });

      const payload = (response.data as any)?.result ?? (response.data as any);

      if (!payload) {
        throw new Error("No enrichment data returned");
      }

      const { destination, scores, ...insights } = payload;
      const description =
        payload.dating?.datingCulture ||
        payload.culturalContext ||
        place.description ||
        "AI has added dating, safety, and weather insights.";

      await updatePlace(place.id, {
        aiEnriched: true,
        country: destination?.country || place.country,
        description,
        insightScores: scores,
        insights,
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

          {place.insightScores && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <BarChart3 className="h-5 w-5" />
                <h2 className="text-xl font-bold">Scores & ranking inputs</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(
                  [
                    ['Overall', place.insightScores.overall],
                    ['Dating', place.insightScores.dating],
                    ['Safety', place.insightScores.safety],
                    ['Cost', place.insightScores.cost],
                    ['Weather', place.insightScores.weather],
                    ['Culture', place.insightScores.culture],
                    ['Logistics', place.insightScores.logistics],
                    ['Connectivity', place.insightScores.connectivity],
                    ['Inclusivity', place.insightScores.inclusivity],
                  ] as [string, number | undefined][]
                ).map(([label, value]) => (
                  <div key={label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{value ?? '—'}</div>
                  </div>
                ))}
              </div>
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

          {place.insights?.dating && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 mb-1">
                <Heart className="h-5 w-5 text-pink-500" />
                <h2 className="text-xl font-bold">Dating & culture</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {place.insights.dating.sexPositivity && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sex positivity</h3>
                    <p className="text-gray-700 dark:text-gray-300">{place.insights.dating.sexPositivity}</p>
                  </div>
                )}
                {place.insights.dating.datingCulture && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dating culture</h3>
                    <p className="text-gray-700 dark:text-gray-300">{place.insights.dating.datingCulture}</p>
                  </div>
                )}
                {place.insights.dating.genderRatio && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gender ratio</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {place.insights.dating.genderRatio.male ?? '—'}% male • {place.insights.dating.genderRatio.female ?? '—'}% female
                    </p>
                    {place.insights.dating.genderRatio.notes && (
                      <p className="text-xs text-gray-500">{place.insights.dating.genderRatio.notes}</p>
                    )}
                  </div>
                )}
              </div>
              {place.insights.dating.safetyTips && place.insights.dating.safetyTips.length > 0 && (
                <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-pink-700 dark:text-pink-200 mb-2">Safety & consent reminders</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-200 space-y-1">
                    {place.insights.dating.safetyTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {(place.insights?.topEthnicities || place.insights?.demographicsLanguage) && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-bold">Demographics & language</h2>
              </div>
              {place.insights?.demographicsLanguage && (
                <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                  {place.insights.demographicsLanguage.ageDistribution && (
                    <div><span className="font-semibold">Age mix: </span>{place.insights.demographicsLanguage.ageDistribution}</div>
                  )}
                  {place.insights.demographicsLanguage.language && (
                    <div><span className="font-semibold">Language: </span>{place.insights.demographicsLanguage.language}</div>
                  )}
                  {place.insights.demographicsLanguage.expatDensity && (
                    <div><span className="font-semibold">Expat presence: </span>{place.insights.demographicsLanguage.expatDensity}</div>
                  )}
                  {place.insights.demographicsLanguage.touristVsLocal && (
                    <div><span className="font-semibold">Tourist vs local: </span>{place.insights.demographicsLanguage.touristVsLocal}</div>
                  )}
                </div>
              )}
              {place.insights?.topEthnicities && place.insights.topEthnicities.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Group</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {place.insights.topEthnicities.map((eth, idx) => (
                        <tr key={`${eth.group}-${idx}`} className="bg-white dark:bg-gray-900/60">
                          <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{eth.group}</td>
                          <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{eth.share}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {place.insights?.weatherByQuarter && place.insights.weatherByQuarter.length > 0 && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Sun className="h-5 w-5" />
                <h2 className="text-xl font-bold">Weather by quarter</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Quarter</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Temp (°C)</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Humidity (%)</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Rain (mm)</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Sun hrs</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {place.insights.weatherByQuarter.map((season) => (
                      <tr key={season.quarter} className="bg-white dark:bg-gray-900/60">
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{season.quarter}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{season.avgTempC ?? 'unknown'}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{season.avgHumidity ?? 'unknown'}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{season.avgRainfallMm ?? 'unknown'}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{season.avgSunshineHours ?? 'unknown'}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{season.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(place.insights?.safetyHealth || place.insights?.costAndLogistics) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {place.insights?.safetyHealth && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <Shield className="h-5 w-5" />
                    <h3 className="text-lg font-bold">Safety & health</h3>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    {place.insights.safetyHealth.personalSafety && <p><span className="font-semibold">Personal safety: </span>{place.insights.safetyHealth.personalSafety}</p>}
                    {place.insights.safetyHealth.commonScams && <p><span className="font-semibold">Watch for: </span>{place.insights.safetyHealth.commonScams}</p>}
                    {place.insights.safetyHealth.healthcareAccess && <p><span className="font-semibold">Healthcare: </span>{place.insights.safetyHealth.healthcareAccess}</p>}
                    {place.insights.safetyHealth.emergencyNumbers && <p><span className="font-semibold">Emergency #: </span>{place.insights.safetyHealth.emergencyNumbers}</p>}
                    {place.insights.safetyHealth.healthAdvisories && <p><span className="font-semibold">Health tips: </span>{place.insights.safetyHealth.healthAdvisories}</p>}
                  </div>
                </div>
              )}
              {place.insights?.costAndLogistics && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <DollarSign className="h-5 w-5" />
                    <h3 className="text-lg font-bold">Cost & logistics</h3>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    {place.insights.costAndLogistics.budgetTips && <p><span className="font-semibold">Budget: </span>{place.insights.costAndLogistics.budgetTips}</p>}
                    {place.insights.costAndLogistics.transport && <p><span className="font-semibold">Transit: </span>{place.insights.costAndLogistics.transport}</p>}
                    {place.insights.costAndLogistics.tipping && <p><span className="font-semibold">Tipping: </span>{place.insights.costAndLogistics.tipping}</p>}
                    {place.insights.costAndLogistics.lateNightOptions && <p><span className="font-semibold">Late night: </span>{place.insights.costAndLogistics.lateNightOptions}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {(place.insights?.socialScene || place.insights?.connectivity) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {place.insights?.socialScene && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <Globe2 className="h-5 w-5" />
                    <h3 className="text-lg font-bold">Social scene</h3>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    {place.insights.socialScene.nightlifeAreas && <p><span className="font-semibold">Nightlife zones: </span>{place.insights.socialScene.nightlifeAreas}</p>}
                    {place.insights.socialScene.events && <p><span className="font-semibold">Events: </span>{place.insights.socialScene.events}</p>}
                    {place.insights.socialScene.weeknights && <p><span className="font-semibold">Peak nights: </span>{place.insights.socialScene.weeknights}</p>}
                    {place.insights.socialScene.universityImpact && <p><span className="font-semibold">University impact: </span>{place.insights.socialScene.universityImpact}</p>}
                  </div>
                </div>
              )}
              {place.insights?.connectivity && (
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <Wifi className="h-5 w-5" />
                    <h3 className="text-lg font-bold">Connectivity & remote work</h3>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    {place.insights.connectivity.mobileData && <p><span className="font-semibold">Mobile data: </span>{place.insights.connectivity.mobileData}</p>}
                    {place.insights.connectivity.wifi && <p><span className="font-semibold">Wi‑Fi: </span>{place.insights.connectivity.wifi}</p>}
                    {place.insights.connectivity.coworking && <p><span className="font-semibold">Coworking: </span>{place.insights.connectivity.coworking}</p>}
                    {place.insights.connectivity.noiseLevels && <p><span className="font-semibold">Noise: </span>{place.insights.connectivity.noiseLevels}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {place.insights?.seasonalComfort && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-2">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <CloudRain className="h-5 w-5" />
                <h3 className="text-lg font-bold">Seasonal comfort & air quality</h3>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                {place.insights.seasonalComfort.aqi && <p><span className="font-semibold">AQI: </span>{place.insights.seasonalComfort.aqi}</p>}
                {place.insights.seasonalComfort.heatIndex && <p><span className="font-semibold">Heat index: </span>{place.insights.seasonalComfort.heatIndex}</p>}
                {place.insights.seasonalComfort.pollen && <p><span className="font-semibold">Pollen: </span>{place.insights.seasonalComfort.pollen}</p>}
                {place.insights.seasonalComfort.weatherImpact && <p><span className="font-semibold">Weather impact: </span>{place.insights.seasonalComfort.weatherImpact}</p>}
              </div>
            </div>
          )}

          {(place.insights?.legalNotes || place.insights?.culturalContext || place.insights?.sources?.length || place.insights?.freshnessNote) && (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <ListChecks className="h-5 w-5" />
                <h3 className="text-lg font-bold">Context & sources</h3>
              </div>
              {place.insights?.culturalContext && <p className="text-gray-700 dark:text-gray-300 text-sm">{place.insights.culturalContext}</p>}
              {place.insights?.legalNotes && <p className="text-gray-700 dark:text-gray-300 text-sm">Legal/courtesy: {place.insights.legalNotes}</p>}
              {place.insights?.sources && place.insights.sources.length > 0 && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Sources: </span>
                  {place.insights.sources.join(', ')}
                </div>
              )}
              {place.insights?.freshnessNote && (
                <p className="text-xs text-gray-500">{place.insights.freshnessNote}</p>
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
