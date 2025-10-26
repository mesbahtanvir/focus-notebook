"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTasks } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  BookOpen,
  Edit3,
  Save,
  Check,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { FormattedNotes, getNotesPreview } from "@/lib/formatNotes";
import Link from "next/link";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";

type FilterType = 'all';

export default function DocumentsPage() {
  useTrackToolUsage('notes');
  const tasks = useTasks((s) => s.tasks);
  const updateTask = useTasks((s) => s.updateTask);
  const thoughts = useThoughts((s) => s.thoughts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<{[key: string]: 'saved' | 'saving'}>({});
  const [expandedMetadata, setExpandedMetadata] = useState<{[key: string]: boolean}>({});
  const [expandedNotes, setExpandedNotes] = useState<{[key: string]: boolean}>({});
  const saveTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});

  // Get all tasks that have notes
  const tasksWithNotes = useMemo(() => {
    return tasks
      .filter(task => task.notes && task.notes.trim().length > 0)
      .map(task => ({
        id: task.id,
        title: task.title,
        notes: task.notes!,
        createdAt: task.createdAt,
        dueDate: task.dueDate,
        tags: task.tags,
        done: task.done,
        priority: task.priority,
      }));
  }, [tasks]);

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    let filtered = tasksWithNotes;

    // Category filtering removed

    // Search in title and notes
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.notes.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tasksWithNotes, searchQuery]);

  // Use infinite scroll
  const { displayedItems, hasMore, observerTarget } = useInfiniteScroll(filteredDocuments, {
    initialItemsPerPage: 15,
    threshold: 0.8
  });

  const stats = useMemo(() => {
    const total = tasksWithNotes.length;
    const totalWords = tasksWithNotes.reduce((sum, doc) => 
      sum + doc.notes.split(/\s+/).length, 0
    );

    return { total, totalWords };
  }, [tasksWithNotes]);

  // Auto-save handler with debouncing
  const handleAutoSave = useCallback((docId: string, newNotes: string) => {
    // Clear existing timeout for this document
    if (saveTimeoutRef.current[docId]) {
      clearTimeout(saveTimeoutRef.current[docId]);
    }

    // Set status to saving
    setAutoSaveStatus(prev => ({ ...prev, [docId]: 'saving' }));

    // Set new timeout for auto-save (1 second delay)
    saveTimeoutRef.current[docId] = setTimeout(async () => {
      try {
        await updateTask(docId, { notes: newNotes });
        setAutoSaveStatus(prev => ({ ...prev, [docId]: 'saved' }));
        
        // Clear 'saved' status after 2 seconds
        setTimeout(() => {
          setAutoSaveStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[docId];
            return newStatus;
          });
        }, 2000);
      } catch (error) {
        console.error('Failed to auto-save:', error);
        setAutoSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[docId];
          return newStatus;
        });
      }
    }, 1000);
  }, [updateTask]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = saveTimeoutRef.current;
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-4 border-indigo-200 dark:border-indigo-800 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">📝 Notes</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              All your notes and documentation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 border-2 border-indigo-300 dark:border-indigo-700">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</div>
              <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Notes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-2">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Notes</div>
          <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">{stats.total}</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-4 border-purple-200 dark:border-purple-800 shadow-xl p-6">
          <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Words</div>
          <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {stats.totalWords.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredDocuments.length} of {tasksWithNotes.length} notes
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-4 pt-4 border-t border-blue-200 dark:border-blue-700"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as FilterType)}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Categories</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 && (
          <div className="card p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-4">
              {stats.total === 0 
                ? "Start taking notes during focus sessions to create documents"
                : "Try adjusting your search or filters"
              }
            </p>
          </div>
        )}

        <AnimatePresence>
          {displayedItems.map((doc) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Document Header */}
              <div
                className="flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-6 p-6 rounded-t-xl transition-colors"
                onClick={() => setExpandedNotes(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                    <h3 className="text-lg font-bold truncate">{doc.title}</h3>
                    {doc.done && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                        Completed
                      </span>
                    )}
                  </div>
                  {!expandedNotes[doc.id] && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {doc.notes.slice(0, 200)}...
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.notes.split(/\s+/).length} words
                  </span>
                  {expandedNotes[doc.id] ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedNotes[doc.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden border-t pt-4"
                  >
                    {/* Metadata Section */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        doc.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                        doc.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                        doc.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                        'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                      }`}>
                        Priority: {doc.priority}
                      </span>
                      {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                          <Tag className="h-3 w-3" />
                          {doc.tags.join(', ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/tools/tasks?id=${doc.id}`}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Task
                      </Link>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</div>
                        <div className="flex items-center gap-2">
                          {autoSaveStatus[doc.id] === 'saving' && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          )}
                          {autoSaveStatus[doc.id] === 'saved' && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Saved
                            </span>
                          )}
                          {editingId !== doc.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(doc.id);
                                setEditingNotes(doc.notes);
                              }}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      {editingId === doc.id ? (
                        <DocumentNotepad
                          docId={doc.id}
                          initialNotes={doc.notes}
                          onSave={(newNotes: string) => {
                            handleAutoSave(doc.id, newNotes);
                          }}
                          onClose={() => setEditingId(null)}
                          autoSaveStatus={autoSaveStatus[doc.id]}
                        />
                      ) : (
                        <div
                          className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(doc.id);
                            setEditingNotes(doc.notes);
                          }}
                        >
                          <FormattedNotes notes={doc.notes} className="prose prose-sm dark:prose-invert max-w-none" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => {}}
        title="New Note"
        icon={<Edit3 className="h-6 w-6" />}
      />
    </div>
  );
}

// Notepad Component
function DocumentNotepad({ 
  docId, 
  initialNotes, 
  onSave, 
  onClose,
  autoSaveStatus
}: {
  docId: string;
  initialNotes: string;
  onSave: (notes: string) => void;
  onClose: () => void;
  autoSaveStatus?: 'saved' | 'saving';
}) {
  const [notes, setNotes] = useState(initialNotes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when mounted
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(notes.length, notes.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    onSave(newNotes);
  };

  const wordCount = notes.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = notes.length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={handleChange}
          placeholder="Start writing your notes here... (auto-saves as you type)"
          className="w-full min-h-[300px] p-4 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 resize-y bg-white dark:bg-gray-900 font-mono text-sm transition-all"
          style={{ lineHeight: '1.6' }}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded">
          {wordCount} words · {charCount} characters
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {autoSaveStatus === 'saving' && '💡 Saving...'}
          {autoSaveStatus === 'saved' && '✅ All changes saved'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
