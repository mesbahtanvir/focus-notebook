"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTasks } from "@/store/useTasks";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  Tag,
  ChevronDown,
  File,
  Folder,
  BookOpen,
  Edit3,
  Save,
  Check
} from "lucide-react";
type FilterType = 'all';

export default function DocumentsPage() {
  const tasks = useTasks((s) => s.tasks);
  const updateTask = useTasks((s) => s.updateTask);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<{[key: string]: 'saved' | 'saving'}>({});
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
  }, [tasksWithNotes, filterCategory, searchQuery]);

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
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-6 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            📚 Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            All your notes and documentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Documents</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-2">
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Total Documents</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Total Words</div>
          <div className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
            {stats.totalWords.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="input pl-10 w-full"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 pt-4 border-t"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as FilterType)}
                className="input py-1 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="mastery">Mastery</option>
                <option value="pleasure">Pleasure</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Showing {filteredDocuments.length} of {stats.total} documents
        </div>

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
          {filteredDocuments.map((doc) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Document Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-xl font-bold">{doc.title}</h3>
                    {doc.done && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                        Completed
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      doc.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      doc.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      doc.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {doc.priority}
                    </span>
                    {doc.tags && doc.tags.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {doc.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-1">
                    {doc.notes.split(/\s+/).length} words
                  </div>
                </div>
              </div>

              {/* Document Content */}
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
                        onClick={() => {
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
                    onSave={(newNotes) => {
                      handleAutoSave(doc.id, newNotes);
                    }}
                    onClose={() => setEditingId(null)}
                    autoSaveStatus={autoSaveStatus[doc.id]}
                  />
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                    {doc.notes}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    onSave(newNotes);
  };

  const wordCount = notes.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = notes.length;

  return (
    <div className="space-y-2">
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
          💡 Tip: Your changes are automatically saved as you type
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-950 transition-colors font-medium text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
