"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdmiredPeople, AdmiredPerson, Quote, Resource, TimelineEvent, JournalEntry } from "@/store/useAdmiredPeople";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit3,
  Sparkles,
  Heart,
  Lightbulb,
  BookOpen,
  Calendar,
  Link as LinkIcon,
  Quote as QuoteIcon,
  Target,
  Users,
  Brain,
  Flame,
  Star,
  Plus,
  ExternalLink,
  MessageSquare,
  Clock
} from "lucide-react";
import { AdmiredPersonModal } from "@/components/AdmiredPersonModal";
import { EnrichPersonModal } from "@/components/EnrichPersonModal";

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const people = useAdmiredPeople((s) => s.people);
  const subscribe = useAdmiredPeople((s) => s.subscribe);
  const updatePerson = useAdmiredPeople((s) => s.update);

  const [person, setPerson] = useState<AdmiredPerson | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'drive' | 'philosophy' | 'journey' | 'resources' | 'journal'>('overview');

  // Subscribe to Firebase
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  // Find the person
  useEffect(() => {
    if (params.id && people.length > 0) {
      const foundPerson = people.find(p => p.id === params.id);
      if (foundPerson) {
        setPerson(foundPerson);
      } else {
        router.push('/tools/admired-people');
      }
    }
  }, [params.id, people, router]);

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'drive', label: 'Drive & Motivation', icon: Flame },
    { id: 'philosophy', label: 'Philosophy & Mindset', icon: Brain },
    { id: 'journey', label: 'Journey & Timeline', icon: Calendar },
    { id: 'resources', label: 'Resources', icon: Lightbulb },
    { id: 'journal', label: 'My Notes', icon: MessageSquare },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-purple-200 dark:border-purple-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/tools/admired-people')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to List</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEnrichModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
              >
                <Sparkles className="h-4 w-4" />
                Enrich
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-start gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {person.imageUrl ? (
                <img
                  src={person.imageUrl}
                  alt={person.name}
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-white/10 flex items-center justify-center border-4 border-white/20">
                  <Star className="h-16 w-16 text-white/50" />
                </div>
              )}
            </div>

            {/* Name & Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{person.name}</h1>
              {person.category && (
                <p className="text-purple-200 text-lg capitalize mb-3">{person.category}</p>
              )}
              {person.bio && (
                <p className="text-purple-100 text-lg max-w-3xl">{person.bio}</p>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mt-6">
                {person.birthYear && (
                  <div className="bg-white/10 rounded-lg px-4 py-2">
                    <div className="text-purple-200 text-xs">Birth Year</div>
                    <div className="text-white font-semibold">{person.birthYear}</div>
                  </div>
                )}
                {person.birthPlace && (
                  <div className="bg-white/10 rounded-lg px-4 py-2">
                    <div className="text-purple-200 text-xs">From</div>
                    <div className="text-white font-semibold">{person.birthPlace}</div>
                  </div>
                )}
                {person.aiEnriched && (
                  <div className="bg-white/10 rounded-lg px-4 py-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-300" />
                    <span className="text-white font-semibold">AI Enriched</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'overview' && <OverviewTab person={person} />}
        {activeTab === 'drive' && <DriveTab person={person} />}
        {activeTab === 'philosophy' && <PhilosophyTab person={person} />}
        {activeTab === 'journey' && <JourneyTab person={person} />}
        {activeTab === 'resources' && <ResourcesTab person={person} />}
        {activeTab === 'journal' && <JournalTab person={person} onUpdate={updatePerson} />}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <AdmiredPersonModal
          person={person}
          onClose={() => setShowEditModal(false)}
          onSave={async (data) => {
            await updatePerson(person.id, data);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Enrich Modal */}
      {showEnrichModal && (
        <EnrichPersonModal
          person={person}
          onClose={() => setShowEnrichModal(false)}
          onSave={async (updates) => {
            await updatePerson(person.id, updates);
            setShowEnrichModal(false);
          }}
        />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ person }: { person: AdmiredPerson }) {
  return (
    <div className="space-y-6">
      {/* Why I Admire Them */}
      {person.whyAdmire && (
        <Section icon={Heart} title="Why I Admire Them" color="rose">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{person.whyAdmire}</p>
        </Section>
      )}

      {/* Personal Connection */}
      {person.personalConnection && (
        <Section icon={Heart} title="Personal Connection" color="pink">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{person.personalConnection}</p>
        </Section>
      )}

      {/* Key Lessons */}
      {person.keyLessons && (
        <Section icon={Lightbulb} title="Key Lessons" color="yellow">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{person.keyLessons}</p>
        </Section>
      )}

      {/* Favorite Quotes */}
      {person.quotes && person.quotes.filter(q => q.favorite).length > 0 && (
        <Section icon={QuoteIcon} title="Favorite Quotes" color="purple">
          <div className="space-y-4">
            {person.quotes.filter(q => q.favorite).map((quote, idx) => (
              <QuoteCard key={idx} quote={quote} />
            ))}
          </div>
        </Section>
      )}

      {/* Tags */}
      {person.tags && person.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {person.tags.map((tag, idx) => (
            <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!person.whyAdmire && !person.keyLessons && !person.personalConnection && (
        <EmptyState
          icon={BookOpen}
          message="Start by editing this person to add why you admire them and key lessons learned."
        />
      )}
    </div>
  );
}

// Drive & Motivation Tab
function DriveTab({ person }: { person: AdmiredPerson }) {
  const hasContent = person.earlyLife || person.personalStory || person.whatDrivesThem ||
                     (person.struggles && person.struggles.length > 0) ||
                     (person.failures && person.failures.length > 0);

  if (!hasContent) {
    return <EmptyState icon={Flame} message="Add information about their personal drive, struggles, and what motivates them." />;
  }

  return (
    <div className="space-y-6">
      {/* Early Life */}
      {person.earlyLife && (
        <Section icon={Clock} title="Early Life & Background" color="blue">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{person.earlyLife}</p>
        </Section>
      )}

      {/* Personal Story */}
      {person.personalStory && (
        <Section icon={BookOpen} title="Personal Story" color="indigo">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{person.personalStory}</p>
        </Section>
      )}

      {/* What Drives Them */}
      {person.whatDrivesThem && (
        <Section icon={Flame} title="What Drives Them" color="orange">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{person.whatDrivesThem}</p>
        </Section>
      )}

      {/* Struggles & Challenges */}
      {person.struggles && person.struggles.length > 0 && (
        <Section icon={Target} title="Struggles & Challenges Overcome" color="red">
          <ul className="space-y-2">
            {person.struggles.map((struggle, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-2"></span>
                <span className="text-gray-700 dark:text-gray-300">{struggle}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Failures & Lessons */}
      {person.failures && person.failures.length > 0 && (
        <Section icon={Lightbulb} title="Failures & What They Learned" color="amber">
          <ul className="space-y-2">
            {person.failures.map((failure, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-2"></span>
                <span className="text-gray-700 dark:text-gray-300">{failure}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// Philosophy & Mindset Tab
function PhilosophyTab({ person }: { person: AdmiredPerson }) {
  const hasContent = person.personalPhilosophy ||
                     (person.coreValues && person.coreValues.length > 0) ||
                     (person.mentalModels && person.mentalModels.length > 0) ||
                     (person.adviceTheyGive && person.adviceTheyGive.length > 0) ||
                     (person.dailyHabits && person.dailyHabits.length > 0) ||
                     (person.quotes && person.quotes.length > 0);

  if (!hasContent) {
    return <EmptyState icon={Brain} message="Add their philosophy, mindset, mental models, and advice." />;
  }

  return (
    <div className="space-y-6">
      {/* Personal Philosophy */}
      {person.personalPhilosophy && (
        <Section icon={Brain} title="Life Philosophy" color="purple">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{person.personalPhilosophy}</p>
        </Section>
      )}

      {/* Core Values */}
      {person.coreValues && person.coreValues.length > 0 && (
        <Section icon={Heart} title="Core Values" color="rose">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {person.coreValues.map((value, idx) => (
              <div key={idx} className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                <p className="text-rose-900 dark:text-rose-200 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Mental Models */}
      {person.mentalModels && person.mentalModels.length > 0 && (
        <Section icon={Brain} title="Mental Models & Frameworks" color="indigo">
          <ul className="space-y-2">
            {person.mentalModels.map((model, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2"></span>
                <span className="text-gray-700 dark:text-gray-300">{model}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Advice They Give */}
      {person.adviceTheyGive && person.adviceTheyGive.length > 0 && (
        <Section icon={Lightbulb} title="Common Advice They Share" color="yellow">
          <ul className="space-y-3">
            {person.adviceTheyGive.map((advice, idx) => (
              <li key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 rounded">
                <p className="text-gray-700 dark:text-gray-300">{advice}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Daily Habits */}
      {person.dailyHabits && person.dailyHabits.length > 0 && (
        <Section icon={Target} title="Daily Habits & Routines" color="green">
          <ul className="space-y-2">
            {person.dailyHabits.map((habit, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2"></span>
                <span className="text-gray-700 dark:text-gray-300">{habit}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* All Quotes */}
      {person.quotes && person.quotes.length > 0 && (
        <Section icon={QuoteIcon} title="Quotes" color="purple">
          <div className="space-y-4">
            {person.quotes.map((quote, idx) => (
              <QuoteCard key={idx} quote={quote} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// Journey & Timeline Tab
function JourneyTab({ person }: { person: AdmiredPerson }) {
  const hasContent = person.careerJourney ||
                     (person.timeline && person.timeline.length > 0) ||
                     (person.pivotalMoments && person.pivotalMoments.length > 0) ||
                     (person.mentors && person.mentors.length > 0) ||
                     (person.influences && person.influences.length > 0);

  if (!hasContent) {
    return <EmptyState icon={Calendar} message="Add their career journey, timeline, and pivotal moments." />;
  }

  return (
    <div className="space-y-6">
      {/* Career Journey */}
      {person.careerJourney && (
        <Section icon={Target} title="Career Journey" color="blue">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{person.careerJourney}</p>
        </Section>
      )}

      {/* Timeline */}
      {person.timeline && person.timeline.length > 0 && (
        <Section icon={Calendar} title="Timeline" color="purple">
          <div className="space-y-4">
            {person.timeline.map((event, idx) => (
              <TimelineCard key={idx} event={event} />
            ))}
          </div>
        </Section>
      )}

      {/* Pivotal Moments */}
      {person.pivotalMoments && person.pivotalMoments.length > 0 && (
        <Section icon={Star} title="Pivotal Moments" color="yellow">
          <ul className="space-y-3">
            {person.pivotalMoments.map((moment, idx) => (
              <li key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 rounded">
                <p className="text-gray-700 dark:text-gray-300">{moment}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Mentors */}
      {person.mentors && person.mentors.length > 0 && (
        <Section icon={Users} title="Mentors & Who Influenced Them" color="green">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {person.mentors.map((mentor, idx) => (
              <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-900 dark:text-green-200 font-medium">{mentor}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Influences */}
      {person.influences && person.influences.length > 0 && (
        <Section icon={Lightbulb} title="Key Influences (People, Books, Ideas)" color="indigo">
          <ul className="space-y-2">
            {person.influences.map((influence, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2"></span>
                <span className="text-gray-700 dark:text-gray-300">{influence}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// Resources Tab
function ResourcesTab({ person }: { person: AdmiredPerson }) {
  const hasContent = (person.resources && person.resources.length > 0) ||
                     (person.links && person.links.length > 0);

  if (!hasContent) {
    return <EmptyState icon={BookOpen} message="Add books, videos, podcasts, interviews, and other resources." />;
  }

  const resourcesByType = person.resources ?
    person.resources.reduce((acc, resource) => {
      if (!acc[resource.type]) acc[resource.type] = [];
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<string, Resource[]>) : {};

  return (
    <div className="space-y-6">
      {/* Resources by Type */}
      {Object.entries(resourcesByType).map(([type, resources]) => (
        <Section key={type} icon={BookOpen} title={`${type.charAt(0).toUpperCase() + type.slice(1)}s`} color="blue">
          <div className="space-y-3">
            {resources.map((resource, idx) => (
              <ResourceCard key={idx} resource={resource} />
            ))}
          </div>
        </Section>
      ))}

      {/* Links */}
      {person.links && person.links.length > 0 && (
        <Section icon={LinkIcon} title="Links & Social Media" color="purple">
          <div className="grid gap-2">
            {person.links.map((link, idx) => (
              <a
                key={idx}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/30 transition group"
              >
                <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {link}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// Journal Tab
function JournalTab({ person, onUpdate }: { person: AdmiredPerson; onUpdate: (id: string, updates: Partial<AdmiredPerson>) => Promise<void> }) {
  const [entries, setEntries] = useState<JournalEntry[]>(person.journalEntries || []);
  const [newEntry, setNewEntry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;

    const entry: JournalEntry = {
      date: new Date().toISOString(),
      content: newEntry,
    };

    const updatedEntries = [entry, ...entries];
    setEntries(updatedEntries);
    setIsSaving(true);

    try {
      await onUpdate(person.id, { journalEntries: updatedEntries });
      setNewEntry('');
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Entry */}
      <Section icon={Plus} title="Add New Reflection" color="purple">
        <div className="space-y-3">
          <textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Write your thoughts, reflections, or new insights about this person..."
            className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={4}
          />
          <button
            onClick={handleAddEntry}
            disabled={!newEntry.trim() || isSaving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Add Entry'}
          </button>
        </div>
      </Section>

      {/* General Notes */}
      {person.notes && (
        <Section icon={MessageSquare} title="General Notes" color="gray">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{person.notes}</p>
        </Section>
      )}

      {/* Journal Entries */}
      {entries.length > 0 && (
        <Section icon={MessageSquare} title="Journal Entries" color="indigo">
          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div key={idx} className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-2">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {entries.length === 0 && !person.notes && (
        <EmptyState icon={MessageSquare} message="Start journaling your thoughts and reflections about this person." />
      )}
    </div>
  );
}

// Reusable Components
function Section({ icon: Icon, title, color, children }: {
  icon: any;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorClasses = {
    purple: 'text-purple-600 dark:text-purple-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    rose: 'text-rose-600 dark:text-rose-400',
    orange: 'text-orange-600 dark:text-orange-400',
    pink: 'text-pink-600 dark:text-pink-400',
    amber: 'text-amber-600 dark:text-amber-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }[color] || 'text-gray-600 dark:text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-5 w-5 ${colorClasses}`} />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border-l-4 border-purple-500 rounded-lg">
      <div className="flex items-start gap-3">
        <QuoteIcon className="h-5 w-5 text-purple-500 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <p className="text-gray-900 dark:text-gray-100 italic text-lg mb-2">&ldquo;{quote.text}&rdquo;</p>
          {quote.context && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{quote.context}</p>
          )}
          {quote.source && (
            <p className="text-xs text-purple-600 dark:text-purple-400">— {quote.source}</p>
          )}
        </div>
        {quote.favorite && (
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {resource.title}
            </h3>
            {resource.favorite && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          {resource.notes && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{resource.notes}</p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      </div>
    </a>
  );
}

function TimelineCard({ event }: { event: TimelineEvent }) {
  const typeColors = {
    milestone: 'bg-green-500',
    failure: 'bg-red-500',
    pivot: 'bg-yellow-500',
    personal: 'bg-blue-500',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${typeColors[event.type]} flex-shrink-0`}></div>
        <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-700 mt-2"></div>
      </div>
      <div className="flex-1 pb-6">
        <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">{event.date}</div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{event.event}</h3>
        {event.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
      <p className="text-gray-500 dark:text-gray-500">{message}</p>
    </div>
  );
}
