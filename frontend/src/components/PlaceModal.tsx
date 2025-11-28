import { useState } from "react";
import { motion } from "framer-motion";
import { Place, PlaceType, PlaceScores } from "@/store/usePlaces";
import { MapPin, X, Save, Link as LinkIcon, Plus as PlusIcon } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

export function PlaceModal({ place, onClose, onSave }: {
  place: Place | null;
  onClose: () => void;
  onSave: (data: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState<Omit<Place, 'id' | 'createdAt' | 'updatedAt'>>({
    name: place?.name || '',
    type: place?.type || 'visit',
    country: place?.country || '',
    city: place?.city || '',
    description: place?.description || '',
    climate: place?.climate || '',
    costOfLiving: place?.costOfLiving || '',
    safety: place?.safety || '',
    culture: place?.culture || '',
    bestTimeToVisit: place?.bestTimeToVisit || '',
    averageStayDuration: place?.averageStayDuration || '',
    pros: place?.pros || [],
    cons: place?.cons || [],
    links: place?.links || [],
    notes: place?.notes || '',
    tags: place?.tags || [],
    comparisonScores: place?.comparisonScores || {},
    insights: place?.insights,
    insightScores: place?.insightScores || {},
    aiEnriched: place?.aiEnriched || false,
  });

  const [tempPro, setTempPro] = useState('');
  const [tempCon, setTempCon] = useState('');
  const [tempLink, setTempLink] = useState('');
  const [tempTag, setTempTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  const addPro = () => {
    if (tempPro.trim()) {
      setFormData({ ...formData, pros: [...(formData.pros || []), tempPro.trim()] });
      setTempPro('');
    }
  };

  const removePro = (index: number) => {
    setFormData({
      ...formData,
      pros: formData.pros?.filter((_, i) => i !== index)
    });
  };

  const addCon = () => {
    if (tempCon.trim()) {
      setFormData({ ...formData, cons: [...(formData.cons || []), tempCon.trim()] });
      setTempCon('');
    }
  };

  const removeCon = (index: number) => {
    setFormData({
      ...formData,
      cons: formData.cons?.filter((_, i) => i !== index)
    });
  };

  const addLink = () => {
    if (tempLink.trim()) {
      setFormData({ ...formData, links: [...(formData.links || []), tempLink.trim()] });
      setTempLink('');
    }
  };

  const removeLink = (index: number) => {
    setFormData({
      ...formData,
      links: formData.links?.filter((_, i) => i !== index)
    });
  };

  const addTag = () => {
    if (tempTag.trim()) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tempTag.trim()] });
      setTempTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                {place ? 'Edit Place' : 'Add Place'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Name & Type - PRIMARY FIELDS */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Place Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full text-lg"
                  placeholder="e.g., Bali, Tokyo, Barcelona"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PlaceType })}
                  className="input w-full"
                  required
                >
                  <option value="live">🏡 Want to Live</option>
                  <option value="visit">✈️ Want to Visit</option>
                  <option value="short-term">🏨 Short-term Stay</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 -mt-4">
              Just add a name and type - AI can help fill in the details later
            </p>

            {/* Location Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City (Optional)</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input w-full"
                  placeholder="City name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country (Optional)</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="input w-full"
                  placeholder="Country name"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <RichTextEditor
                content={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="What makes this place special..."
                minHeight="min-h-[120px]"
              />
            </div>

            {/* Quick Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Climate (Optional)</label>
                <input
                  type="text"
                  value={formData.climate}
                  onChange={(e) => setFormData({ ...formData, climate: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Tropical, Temperate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cost of Living (Optional)</label>
                <input
                  type="text"
                  value={formData.costOfLiving}
                  onChange={(e) => setFormData({ ...formData, costOfLiving: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., High, Medium, Low"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Safety (Optional)</label>
                <input
                  type="text"
                  value={formData.safety}
                  onChange={(e) => setFormData({ ...formData, safety: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Very Safe, Safe"
                />
              </div>
            </div>

            {/* Comparison Scores */}
            <div>
              <label className="block text-sm font-medium mb-2">Comparison Scores (Optional, 1-10)</label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Cost</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.comparisonScores?.cost || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      comparisonScores: { ...formData.comparisonScores, cost: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="input w-full text-sm"
                    placeholder="1-10"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Weather</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.comparisonScores?.weather || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      comparisonScores: { ...formData.comparisonScores, weather: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="input w-full text-sm"
                    placeholder="1-10"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Safety</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.comparisonScores?.safety || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      comparisonScores: { ...formData.comparisonScores, safety: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="input w-full text-sm"
                    placeholder="1-10"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Culture</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.comparisonScores?.culture || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      comparisonScores: { ...formData.comparisonScores, culture: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="input w-full text-sm"
                    placeholder="1-10"
                  />
                </div>
              </div>
            </div>

            {/* Overall + Dimension Scores */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold">Overall & Dimension Scores (Optional, 1-10)</label>
                <span className="text-xs text-gray-500">Used in ranking table</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(["overall", "dating", "cost", "safety", "weather", "culture", "logistics", "connectivity", "inclusivity"] as (keyof PlaceScores)[]).map((key) => (
                  <div key={key}>
                    <label className="text-xs text-gray-600 capitalize">{key}</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.insightScores?.[key] ?? ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        insightScores: {
                          ...formData.insightScores,
                          [key]: e.target.value ? Number(e.target.value) : undefined,
                        }
                      })}
                      className="input w-full text-sm"
                      placeholder="1-10"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pros */}
            <div>
              <label className="block text-sm font-medium mb-2">Pros (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempPro}
                  onChange={(e) => setTempPro(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())}
                  className="input flex-1"
                  placeholder="Add a positive aspect"
                />
                <button
                  type="button"
                  onClick={addPro}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {formData.pros?.map((pro, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded"
                  >
                    <span className="flex-1 text-sm">• {pro}</span>
                    <button
                      type="button"
                      onClick={() => removePro(idx)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cons */}
            <div>
              <label className="block text-sm font-medium mb-2">Cons (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempCon}
                  onChange={(e) => setTempCon(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())}
                  className="input flex-1"
                  placeholder="Add a negative aspect"
                />
                <button
                  type="button"
                  onClick={addCon}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {formData.cons?.map((con, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded"
                  >
                    <span className="flex-1 text-sm">• {con}</span>
                    <button
                      type="button"
                      onClick={() => removeCon(idx)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <label className="block text-sm font-medium mb-2">Links (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempLink}
                  onChange={(e) => setTempLink(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  className="input flex-1"
                  placeholder="Add link (travel guides, resources)"
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.links?.map((link, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-sm"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[150px]">
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLink(idx)}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempTag}
                  onChange={(e) => setTempTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="input flex-1"
                  placeholder="Add tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
              <RichTextEditor
                content={formData.notes || ''}
                onChange={(value) => setFormData({ ...formData, notes: value })}
                placeholder="Any additional notes..."
                minHeight="min-h-[120px]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 p-4 rounded-b-2xl flex gap-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {place ? 'Update' : 'Add Place'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
