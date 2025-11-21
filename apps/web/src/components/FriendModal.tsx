import { useState } from "react";
import { motion } from "framer-motion";
import { Friend, RelationshipType, EnergyLevel, InteractionFrequency } from "@/store/useFriends";
import { Heart, X, Save } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

export function FriendModal({ friend, onClose, onSave }: {
  friend: Friend | null;
  onClose: () => void;
  onSave: (data: Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState<Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>>({
    name: friend?.name || '',
    relationshipType: friend?.relationshipType || 'friend',
    energyLevel: friend?.energyLevel || 'neutral',
    interactionFrequency: friend?.interactionFrequency || 'monthly',
    lastInteraction: friend?.lastInteraction || '',
    positiveTraits: friend?.positiveTraits || [],
    concerns: friend?.concerns || [],
    sharedValues: friend?.sharedValues || [],
    notes: friend?.notes || '',
    priority: friend?.priority || 'medium',
    growthAlignment: friend?.growthAlignment || 5,
    trustLevel: friend?.trustLevel || 5,
    tags: friend?.tags || [],
  });

  const [tempTrait, setTempTrait] = useState('');
  const [tempConcern, setTempConcern] = useState('');
  const [tempValue, setTempValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  const addItem = (field: 'positiveTraits' | 'concerns' | 'sharedValues', value: string, setter: (val: string) => void) => {
    if (value.trim()) {
      setFormData({ ...formData, [field]: [...formData[field], value.trim()] });
      setter('');
    }
  };

  const removeItem = (field: 'positiveTraits' | 'concerns' | 'sharedValues', index: number) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
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
          <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6" />
                {friend ? 'Edit Reflection' : 'New Reflection'}
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
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Their name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Relationship Type</label>
                <select
                  value={formData.relationshipType}
                  onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value as RelationshipType })}
                  className="input w-full"
                >
                  <option value="close-friend">Close Friend</option>
                  <option value="friend">Friend</option>
                  <option value="acquaintance">Acquaintance</option>
                  <option value="family">Family</option>
                  <option value="colleague">Colleague</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>
            </div>

            {/* Energy, Priority & Frequency */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Energy Level</label>
                <select
                  value={formData.energyLevel}
                  onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value as EnergyLevel })}
                  className="input w-full"
                >
                  <option value="energizing">✨ Energizing</option>
                  <option value="neutral">➖ Neutral</option>
                  <option value="draining">🔋 Draining</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Interaction</label>
                <select
                  value={formData.interactionFrequency}
                  onChange={(e) => setFormData({ ...formData, interactionFrequency: e.target.value as InteractionFrequency })}
                  className="input w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="rarely">Rarely</option>
                </select>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Growth Alignment: {formData.growthAlignment}/10
                </label>
                <p className="text-xs text-gray-500 mb-2">How much do they support your growth?</p>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.growthAlignment}
                  onChange={(e) => setFormData({ ...formData, growthAlignment: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Trust Level: {formData.trustLevel}/10
                </label>
                <p className="text-xs text-gray-500 mb-2">How much do you trust them?</p>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.trustLevel}
                  onChange={(e) => setFormData({ ...formData, trustLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Last Interaction */}
            <div>
              <label className="block text-sm font-medium mb-2">Last Interaction (Optional)</label>
              <input
                type="date"
                value={formData.lastInteraction?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, lastInteraction: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="input w-full"
              />
            </div>

            {/* Positive Traits */}
            <div>
              <label className="block text-sm font-medium mb-2">✨ What You Appreciate</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempTrait}
                  onChange={(e) => setTempTrait(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('positiveTraits', tempTrait, setTempTrait))}
                  className="input flex-1"
                  placeholder="Good listener, supportive, honest"
                />
                <button
                  type="button"
                  onClick={() => addItem('positiveTraits', tempTrait, setTempTrait)}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.positiveTraits.map((trait, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {trait}
                    <button type="button" onClick={() => removeItem('positiveTraits', idx)} className="hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Concerns */}
            <div>
              <label className="block text-sm font-medium mb-2">⚠️ Concerns or Red Flags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempConcern}
                  onChange={(e) => setTempConcern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('concerns', tempConcern, setTempConcern))}
                  className="input flex-1"
                  placeholder="Often cancels plans, dismissive"
                />
                <button
                  type="button"
                  onClick={() => addItem('concerns', tempConcern, setTempConcern)}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.concerns.map((concern, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {concern}
                    <button type="button" onClick={() => removeItem('concerns', idx)} className="hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Shared Values */}
            <div>
              <label className="block text-sm font-medium mb-2">🤝 Shared Values/Interests</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('sharedValues', tempValue, setTempValue))}
                  className="input flex-1"
                  placeholder="Personal growth, fitness, creativity"
                />
                <button
                  type="button"
                  onClick={() => addItem('sharedValues', tempValue, setTempValue)}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.sharedValues.map((value, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {value}
                    <button type="button" onClick={() => removeItem('sharedValues', idx)} className="hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">📝 Notes & Reflections</label>
              <RichTextEditor
                content={formData.notes || ''}
                onChange={(value) => setFormData({ ...formData, notes: value })}
                placeholder="Write your observations, feelings, and reflections about this relationship..."
                minHeight="min-h-[150px]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 p-6 rounded-b-2xl border-t flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Reflection
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
