"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AdmiredPerson, Quote, Resource, TimelineEvent } from "@/store/useAdmiredPeople";
import { X, Save, Sparkles, Plus, Trash2 } from "lucide-react";

interface EnrichPersonModalProps {
  person: AdmiredPerson;
  onClose: () => void;
  onSave: (updates: Partial<AdmiredPerson>) => Promise<void>;
}

export function EnrichPersonModal({ person, onClose, onSave }: EnrichPersonModalProps) {
  const [activeSection, setActiveSection] = useState<'basic' | 'drive' | 'philosophy' | 'journey' | 'resources'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic info
    imageUrl: person.imageUrl || '',
    birthYear: person.birthYear,
    birthPlace: person.birthPlace || '',
    currentLocation: person.currentLocation || '',
    bio: person.bio || '',

    // Drive & motivation
    earlyLife: person.earlyLife || '',
    personalStory: person.personalStory || '',
    whatDrivesThem: person.whatDrivesThem || '',
    struggles: person.struggles || [],
    failures: person.failures || [],

    // Philosophy
    personalPhilosophy: person.personalPhilosophy || '',
    coreValues: person.coreValues || [],
    mentalModels: person.mentalModels || [],
    adviceTheyGive: person.adviceTheyGive || [],
    dailyHabits: person.dailyHabits || [],
    quotes: person.quotes || [],

    // Journey
    careerJourney: person.careerJourney || '',
    timeline: person.timeline || [],
    pivotalMoments: person.pivotalMoments || [],
    mentors: person.mentors || [],
    influences: person.influences || [],

    // Resources
    resources: person.resources || [],
  });

  // Temp inputs for arrays
  const [tempStruggle, setTempStruggle] = useState('');
  const [tempFailure, setTempFailure] = useState('');
  const [tempValue, setTempValue] = useState('');
  const [tempModel, setTempModel] = useState('');
  const [tempAdvice, setTempAdvice] = useState('');
  const [tempHabit, setTempHabit] = useState('');
  const [tempMoment, setTempMoment] = useState('');
  const [tempMentor, setTempMentor] = useState('');
  const [tempInfluence, setTempInfluence] = useState('');

  // Quote form
  const [quoteForm, setQuoteForm] = useState({ text: '', context: '', source: '', favorite: false });

  // Timeline form
  const [timelineForm, setTimelineForm] = useState<TimelineEvent>({
    date: '',
    event: '',
    type: 'milestone',
    description: ''
  });

  // Resource form
  const [resourceForm, setResourceForm] = useState<Resource>({
    type: 'book',
    title: '',
    url: '',
    notes: '',
    favorite: false
  });

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        aiEnriched: true,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save enrichment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'drive', label: 'Drive & Motivation' },
    { id: 'philosophy', label: 'Philosophy & Mindset' },
    { id: 'journey', label: 'Journey & Timeline' },
    { id: 'resources', label: 'Resources' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Enrich: {person.name}
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

        {/* Section Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex gap-1 overflow-x-auto px-6">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`px-4 py-3 border-b-2 transition whitespace-nowrap text-sm ${
                  activeSection === section.id
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-purple-600'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <FormField label="Image URL">
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="input w-full"
                  placeholder="https://..."
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Birth Year">
                  <input
                    type="number"
                    value={formData.birthYear || ''}
                    onChange={(e) => setFormData({ ...formData, birthYear: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="input w-full"
                    placeholder="1971"
                  />
                </FormField>
                <FormField label="Birth Place">
                  <input
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="input w-full"
                    placeholder="Pretoria, South Africa"
                  />
                </FormField>
              </div>

              <FormField label="Current Location">
                <input
                  type="text"
                  value={formData.currentLocation}
                  onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                  className="input w-full"
                  placeholder="Austin, Texas"
                />
              </FormField>

              <FormField label="Biography">
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Brief overview of who they are..."
                />
              </FormField>
            </div>
          )}

          {activeSection === 'drive' && (
            <div className="space-y-4">
              <FormField label="Early Life & Background">
                <textarea
                  value={formData.earlyLife}
                  onChange={(e) => setFormData({ ...formData, earlyLife: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Childhood, upbringing, family background..."
                />
              </FormField>

              <FormField label="Personal Story">
                <textarea
                  value={formData.personalStory}
                  onChange={(e) => setFormData({ ...formData, personalStory: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Their personal journey and key life experiences..."
                />
              </FormField>

              <FormField label="What Drives Them">
                <textarea
                  value={formData.whatDrivesThem}
                  onChange={(e) => setFormData({ ...formData, whatDrivesThem: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Core motivations, what pushes them forward..."
                />
              </FormField>

              <FormField label="Struggles & Challenges">
                <ArrayInput
                  items={formData.struggles}
                  tempValue={tempStruggle}
                  onTempChange={setTempStruggle}
                  onAdd={() => {
                    if (tempStruggle.trim()) {
                      setFormData({ ...formData, struggles: [...formData.struggles, tempStruggle.trim()] });
                      setTempStruggle('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, struggles: formData.struggles.filter((_, i) => i !== idx) })}
                  placeholder="Add a struggle or challenge they overcame..."
                />
              </FormField>

              <FormField label="Failures & Lessons">
                <ArrayInput
                  items={formData.failures}
                  tempValue={tempFailure}
                  onTempChange={setTempFailure}
                  onAdd={() => {
                    if (tempFailure.trim()) {
                      setFormData({ ...formData, failures: [...formData.failures, tempFailure.trim()] });
                      setTempFailure('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, failures: formData.failures.filter((_, i) => i !== idx) })}
                  placeholder="Add a failure and what they learned..."
                />
              </FormField>
            </div>
          )}

          {activeSection === 'philosophy' && (
            <div className="space-y-4">
              <FormField label="Life Philosophy">
                <textarea
                  value={formData.personalPhilosophy}
                  onChange={(e) => setFormData({ ...formData, personalPhilosophy: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Their overall life philosophy and worldview..."
                />
              </FormField>

              <FormField label="Core Values">
                <ArrayInput
                  items={formData.coreValues}
                  tempValue={tempValue}
                  onTempChange={setTempValue}
                  onAdd={() => {
                    if (tempValue.trim()) {
                      setFormData({ ...formData, coreValues: [...formData.coreValues, tempValue.trim()] });
                      setTempValue('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, coreValues: formData.coreValues.filter((_, i) => i !== idx) })}
                  placeholder="Add a core value..."
                />
              </FormField>

              <FormField label="Mental Models & Frameworks">
                <ArrayInput
                  items={formData.mentalModels}
                  tempValue={tempModel}
                  onTempChange={setTempModel}
                  onAdd={() => {
                    if (tempModel.trim()) {
                      setFormData({ ...formData, mentalModels: [...formData.mentalModels, tempModel.trim()] });
                      setTempModel('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, mentalModels: formData.mentalModels.filter((_, i) => i !== idx) })}
                  placeholder="Add a mental model or framework they use..."
                />
              </FormField>

              <FormField label="Advice They Give">
                <ArrayInput
                  items={formData.adviceTheyGive}
                  tempValue={tempAdvice}
                  onTempChange={setTempAdvice}
                  onAdd={() => {
                    if (tempAdvice.trim()) {
                      setFormData({ ...formData, adviceTheyGive: [...formData.adviceTheyGive, tempAdvice.trim()] });
                      setTempAdvice('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, adviceTheyGive: formData.adviceTheyGive.filter((_, i) => i !== idx) })}
                  placeholder="Add common advice they share..."
                />
              </FormField>

              <FormField label="Daily Habits">
                <ArrayInput
                  items={formData.dailyHabits}
                  tempValue={tempHabit}
                  onTempChange={setTempHabit}
                  onAdd={() => {
                    if (tempHabit.trim()) {
                      setFormData({ ...formData, dailyHabits: [...formData.dailyHabits, tempHabit.trim()] });
                      setTempHabit('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, dailyHabits: formData.dailyHabits.filter((_, i) => i !== idx) })}
                  placeholder="Add a daily habit or routine..."
                />
              </FormField>

              <FormField label="Quotes">
                <div className="space-y-3">
                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <textarea
                      value={quoteForm.text}
                      onChange={(e) => setQuoteForm({ ...quoteForm, text: e.target.value })}
                      className="input w-full"
                      rows={2}
                      placeholder="Quote text..."
                    />
                    <input
                      type="text"
                      value={quoteForm.context}
                      onChange={(e) => setQuoteForm({ ...quoteForm, context: e.target.value })}
                      className="input w-full"
                      placeholder="Context (optional)..."
                    />
                    <input
                      type="text"
                      value={quoteForm.source}
                      onChange={(e) => setQuoteForm({ ...quoteForm, source: e.target.value })}
                      className="input w-full"
                      placeholder="Source (optional)..."
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={quoteForm.favorite}
                          onChange={(e) => setQuoteForm({ ...quoteForm, favorite: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Mark as favorite</span>
                      </label>
                      <button
                        onClick={() => {
                          if (quoteForm.text.trim()) {
                            setFormData({ ...formData, quotes: [...formData.quotes, { ...quoteForm }] });
                            setQuoteForm({ text: '', context: '', source: '', favorite: false });
                          }
                        }}
                        className="btn-secondary"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Quote
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {formData.quotes.map((quote, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm italic">&ldquo;{quote.text}&rdquo;</p>
                          {quote.source && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">— {quote.source}</p>}
                        </div>
                        <button
                          onClick={() => setFormData({ ...formData, quotes: formData.quotes.filter((_, i) => i !== idx) })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </FormField>
            </div>
          )}

          {activeSection === 'journey' && (
            <div className="space-y-4">
              <FormField label="Career Journey">
                <textarea
                  value={formData.careerJourney}
                  onChange={(e) => setFormData({ ...formData, careerJourney: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Their professional path and career evolution..."
                />
              </FormField>

              <FormField label="Timeline">
                <div className="space-y-3">
                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={timelineForm.date}
                        onChange={(e) => setTimelineForm({ ...timelineForm, date: e.target.value })}
                        className="input w-full"
                        placeholder="Date (e.g., 1995, June 2010)"
                      />
                      <select
                        value={timelineForm.type}
                        onChange={(e) => setTimelineForm({ ...timelineForm, type: e.target.value as any })}
                        className="input w-full"
                      >
                        <option value="milestone">Milestone</option>
                        <option value="failure">Failure</option>
                        <option value="pivot">Pivot</option>
                        <option value="personal">Personal</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={timelineForm.event}
                      onChange={(e) => setTimelineForm({ ...timelineForm, event: e.target.value })}
                      className="input w-full"
                      placeholder="Event title..."
                    />
                    <textarea
                      value={timelineForm.description}
                      onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
                      className="input w-full"
                      rows={2}
                      placeholder="Description (optional)..."
                    />
                    <button
                      onClick={() => {
                        if (timelineForm.date && timelineForm.event) {
                          setFormData({ ...formData, timeline: [...formData.timeline, { ...timelineForm }] });
                          setTimelineForm({ date: '', event: '', type: 'milestone', description: '' });
                        }
                      }}
                      className="btn-secondary w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Timeline Event
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.timeline.map((event, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{event.date}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">{event.type}</span>
                          </div>
                          <p className="text-sm font-medium">{event.event}</p>
                          {event.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>}
                        </div>
                        <button
                          onClick={() => setFormData({ ...formData, timeline: formData.timeline.filter((_, i) => i !== idx) })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </FormField>

              <FormField label="Pivotal Moments">
                <ArrayInput
                  items={formData.pivotalMoments}
                  tempValue={tempMoment}
                  onTempChange={setTempMoment}
                  onAdd={() => {
                    if (tempMoment.trim()) {
                      setFormData({ ...formData, pivotalMoments: [...formData.pivotalMoments, tempMoment.trim()] });
                      setTempMoment('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, pivotalMoments: formData.pivotalMoments.filter((_, i) => i !== idx) })}
                  placeholder="Add a pivotal moment or turning point..."
                />
              </FormField>

              <FormField label="Mentors">
                <ArrayInput
                  items={formData.mentors}
                  tempValue={tempMentor}
                  onTempChange={setTempMentor}
                  onAdd={() => {
                    if (tempMentor.trim()) {
                      setFormData({ ...formData, mentors: [...formData.mentors, tempMentor.trim()] });
                      setTempMentor('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, mentors: formData.mentors.filter((_, i) => i !== idx) })}
                  placeholder="Add a mentor or person who influenced them..."
                />
              </FormField>

              <FormField label="Key Influences (People, Books, Ideas)">
                <ArrayInput
                  items={formData.influences}
                  tempValue={tempInfluence}
                  onTempChange={setTempInfluence}
                  onAdd={() => {
                    if (tempInfluence.trim()) {
                      setFormData({ ...formData, influences: [...formData.influences, tempInfluence.trim()] });
                      setTempInfluence('');
                    }
                  }}
                  onRemove={(idx) => setFormData({ ...formData, influences: formData.influences.filter((_, i) => i !== idx) })}
                  placeholder="Add an influence..."
                />
              </FormField>
            </div>
          )}

          {activeSection === 'resources' && (
            <div className="space-y-4">
              <FormField label="Books, Videos, Podcasts, Interviews">
                <div className="space-y-3">
                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <select
                      value={resourceForm.type}
                      onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as any })}
                      className="input w-full"
                    >
                      <option value="book">Book</option>
                      <option value="video">Video</option>
                      <option value="podcast">Podcast</option>
                      <option value="article">Article</option>
                      <option value="interview">Interview</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      className="input w-full"
                      placeholder="Title..."
                    />
                    <input
                      type="text"
                      value={resourceForm.url}
                      onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                      className="input w-full"
                      placeholder="URL..."
                    />
                    <textarea
                      value={resourceForm.notes}
                      onChange={(e) => setResourceForm({ ...resourceForm, notes: e.target.value })}
                      className="input w-full"
                      rows={2}
                      placeholder="Notes (optional)..."
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={resourceForm.favorite}
                          onChange={(e) => setResourceForm({ ...resourceForm, favorite: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Mark as favorite</span>
                      </label>
                      <button
                        onClick={() => {
                          if (resourceForm.title && resourceForm.url) {
                            setFormData({ ...formData, resources: [...formData.resources, { ...resourceForm }] });
                            setResourceForm({ type: 'book', title: '', url: '', notes: '', favorite: false });
                          }
                        }}
                        className="btn-secondary"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Resource
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {formData.resources.map((resource, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              {resource.type}
                            </span>
                            <p className="text-sm font-medium">{resource.title}</p>
                          </div>
                          {resource.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{resource.notes}</p>}
                        </div>
                        <button
                          onClick={() => setFormData({ ...formData, resources: formData.resources.filter((_, i) => i !== idx) })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </FormField>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 p-4 rounded-b-2xl flex gap-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Enrichment'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Helper Components
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}

function ArrayInput({ items, tempValue, onTempChange, onAdd, onRemove, placeholder }: {
  items: string[];
  tempValue: string;
  onTempChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={tempValue}
          onChange={(e) => onTempChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          className="input flex-1"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onAdd}
          className="btn-secondary"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-sm">{item}</span>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
