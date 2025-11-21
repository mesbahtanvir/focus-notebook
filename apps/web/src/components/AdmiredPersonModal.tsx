import { useState } from "react";
import { motion } from "framer-motion";
import { AdmiredPerson } from "@/store/useAdmiredPeople";
import { Sparkles, X, Save, Link as LinkIcon } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

export function AdmiredPersonModal({ person, onClose, onSave }: {
  person: AdmiredPerson | null;
  onClose: () => void;
  onSave: (data: Omit<AdmiredPerson, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState<Omit<AdmiredPerson, 'id' | 'createdAt' | 'updatedAt'>>({
    name: person?.name || '',
    category: person?.category || '',
    bio: person?.bio || '',
    whyAdmire: person?.whyAdmire || '',
    keyLessons: person?.keyLessons || '',
    links: person?.links || [],
    notes: person?.notes || '',
    tags: person?.tags || [],
    aiEnriched: person?.aiEnriched || false,
  });

  const [tempLink, setTempLink] = useState('');
  const [tempTag, setTempTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                {person ? 'Edit Person' : 'Add Admired Person'}
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
            {/* Name - PRIMARY FIELD */}
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full text-lg"
                placeholder="e.g., Elon Musk, Naval Ravikant, etc."
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Just add a name - AI can help fill in the details later
              </p>
            </div>

            {/* Optional: Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category (Optional)</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input w-full"
                placeholder="e.g., entrepreneur, artist, scientist, athlete"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">Bio (Optional)</label>
              <RichTextEditor
                content={formData.bio || ''}
                onChange={(value) => setFormData({ ...formData, bio: value })}
                placeholder="Brief description of who they are..."
                minHeight="min-h-[100px]"
              />
            </div>

            {/* Why Admire */}
            <div>
              <label className="block text-sm font-medium mb-2">Why I Admire Them (Optional)</label>
              <RichTextEditor
                content={formData.whyAdmire || ''}
                onChange={(value) => setFormData({ ...formData, whyAdmire: value })}
                placeholder="What inspires you about this person..."
                minHeight="min-h-[120px]"
              />
            </div>

            {/* Key Lessons */}
            <div>
              <label className="block text-sm font-medium mb-2">Key Lessons (Optional)</label>
              <RichTextEditor
                content={formData.keyLessons || ''}
                onChange={(value) => setFormData({ ...formData, keyLessons: value })}
                placeholder="What have you learned from them..."
                minHeight="min-h-[120px]"
              />
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
                  placeholder="Add link (website, social media, book, interview)"
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
                    <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">
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
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded text-sm"
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
              {person ? 'Update' : 'Add Person'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
