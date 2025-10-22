"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useThoughts, Thought, ThoughtType } from "@/store/useThoughts";
import { useProcessQueue } from "@/store/useProcessQueue";
import { actionExecutor } from "@/lib/thoughtProcessor/actionExecutor";
import { cascadingDelete } from "@/lib/thoughtProcessor/cascadingDelete";
import { RevertProcessingDialog } from "./RevertProcessingDialog";
import { 
  X, 
  Trash2,
  Save,
  Brain,
  Tag,
  Heart,
  Calendar,
  Lightbulb,
  FileText,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface ThoughtDetailModalProps {
  thought: Thought;
  onClose: () => void;
}

export function ThoughtDetailModal({ thought, onClose }: ThoughtDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'cbt' | 'history'>(
    thought.type === 'feeling-bad' ? 'cbt' : 'details'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(thought.text);
  const [type, setType] = useState<ThoughtType>(thought.type);
  const [intensity, setIntensity] = useState(thought.intensity || 5);
  const [tagsInput, setTagsInput] = useState(() => {
    if (!thought.tags) return '';
    if (Array.isArray(thought.tags)) return thought.tags.join(', ');
    if (typeof thought.tags === 'string') return thought.tags;
    return '';
  });
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  // CBT Analysis fields
  const [situation, setSituation] = useState(thought.cbtAnalysis?.situation || '');
  const [automaticThought, setAutomaticThought] = useState(thought.cbtAnalysis?.automaticThought || '');
  const [emotion, setEmotion] = useState(thought.cbtAnalysis?.emotion || '');
  const [evidence, setEvidence] = useState(thought.cbtAnalysis?.evidence || '');
  const [alternativeThought, setAlternativeThought] = useState(thought.cbtAnalysis?.alternativeThought || '');
  const [outcome, setOutcome] = useState(thought.cbtAnalysis?.outcome || '');

  const updateThought = useThoughts((s) => s.updateThought);
  const deleteThought = useThoughts((s) => s.deleteThought);
  const toggleThought = useThoughts((s) => s.toggle);
  
  // Processing queue
  const queue = useProcessQueue((s) => s.queue);
  const isProcessed = Array.isArray(thought.tags) && thought.tags.includes('processed');
  
  // Find the queue item for this thought (most recent completed)
  const queueItem = queue
    .filter(q => q.thoughtId === thought.id && q.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await updateThought(thought.id, {
      text,
      type,
      intensity: type.includes('feeling') ? intensity : undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    setIsEditing(false);
  };

  const handleSaveCBT = async () => {
    await updateThought(thought.id, {
      cbtAnalysis: {
        situation,
        automaticThought,
        emotion,
        evidence,
        alternativeThought,
        outcome,
        analyzedAt: new Date().toISOString(),
      },
    });
  };

  const handleDelete = async () => {
    // Count related items
    const relatedItems = queue
      .filter(q => q.thoughtId === thought.id && (q.status === 'completed' || q.status === 'processing'))
      .reduce((acc, q) => {
        const taskIds = q.revertData?.createdItems?.taskIds || [];
        return acc + taskIds.length;
      }, 0);

    const message = relatedItems > 0
      ? `Are you sure you want to delete this thought?\n\nThis will also delete:\n• ${relatedItems} related task(s)\n• All processing history\n\nThis cannot be undone.`
      : 'Are you sure you want to delete this thought?\n\nThis cannot be undone.';

    if (confirm(message)) {
      const result = await cascadingDelete.deleteThoughtWithRelated(thought.id);
      if (result.success) {
        console.log(`Deleted: ${result.deleted.tasks} tasks, ${result.deleted.thoughts} thought(s)`);
      }
      onClose();
    }
  };

  const handleRevert = async () => {
    if (!queueItem) return;
    
    const result = await actionExecutor.revertProcessing(queueItem.id);
    if (result.success) {
      setShowRevertDialog(false);
      // Refresh to show updated state
      onClose();
    } else {
      alert(`Failed to revert: ${result.error}`);
    }
  };

  const getTypeColor = (t: ThoughtType) => {
    switch (t) {
      case 'task': return 'bg-blue-500';
      case 'feeling-good': return 'bg-green-500';
      case 'feeling-bad': return 'bg-red-500';
      case 'neutral': return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={thought.done}
                onChange={() => toggleThought(thought.id)}
                className="h-5 w-5 rounded"
              />
              <h2 className="text-xl font-bold">Thought Details</h2>
              {isProcessed && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Processed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isProcessed && queueItem && (
                <button
                  onClick={() => setShowRevertDialog(true)}
                  className="px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded flex items-center gap-2 text-sm font-medium"
                  title="Revert processing"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revert
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'details'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Details
            </button>
            {thought.type === 'feeling-bad' && (
              <button
                onClick={() => setActiveTab('cbt')}
                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                  activeTab === 'cbt'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Brain className="h-4 w-4 inline mr-2" />
                CBT Analysis
              </button>
            )}
            {isProcessed && queueItem && (
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                  activeTab === 'history'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-4 w-4 inline mr-2" />
                Processing History
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Thought Text */}
              <div>
                <label className="block text-sm font-medium mb-2">Thought</label>
                {isEditing ? (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input w-full min-h-[100px]"
                  />
                ) : (
                  <p className={`text-lg ${thought.done ? 'line-through text-muted-foreground' : ''}`}>
                    {thought.text}
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                {isEditing ? (
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ThoughtType)}
                    className="input w-full"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="task">Task</option>
                    <option value="feeling-good">Good Feeling</option>
                    <option value="feeling-bad">Bad Feeling</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getTypeColor(thought.type)}`} />
                    <span className="capitalize">{thought.type.replace('-', ' ')}</span>
                  </div>
                )}
              </div>

              {/* Intensity */}
              {(type.includes('feeling') || thought.intensity) && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Intensity
                  </label>
                  {isEditing && type.includes('feeling') ? (
                    <>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 (Low)</span>
                        <span className="font-medium">{intensity}/10</span>
                        <span>10 (High)</span>
                      </div>
                    </>
                  ) : thought.intensity ? (
                    <span>{thought.intensity}/10</span>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Enter tags separated by commas"
                    className="input w-full"
                  />
                ) : thought.tags && Array.isArray(thought.tags) && thought.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {thought.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-accent rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No tags</span>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created: {new Date(thought.createdAt).toLocaleString()}
                </div>
                {thought.cbtAnalysis?.analyzedAt && (
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    CBT Analyzed: {new Date(thought.cbtAnalysis.analyzedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm rounded hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm rounded hover:bg-accent"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'cbt' ? (
            // CBT Analysis Tab
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">CBT Thought Analysis</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Use this framework to challenge and reframe negative thoughts. Take your time and be honest with yourself.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  1. Situation
                  <span className="text-muted-foreground font-normal ml-2">
                    What triggered this feeling?
                  </span>
                </label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Describe the situation objectively (who, what, when, where)..."
                  className="input w-full min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  2. Automatic Thought
                  <span className="text-muted-foreground font-normal ml-2">
                    What went through your mind?
                  </span>
                </label>
                <textarea
                  value={automaticThought}
                  onChange={(e) => setAutomaticThought(e.target.value)}
                  placeholder="What thoughts came up automatically? What did you tell yourself?"
                  className="input w-full min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  3. Emotion
                  <span className="text-muted-foreground font-normal ml-2">
                    How did it make you feel?
                  </span>
                </label>
                <input
                  type="text"
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  placeholder="e.g., anxious, sad, angry, frustrated..."
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  4. Evidence
                  <span className="text-muted-foreground font-normal ml-2">
                    What supports or contradicts this thought?
                  </span>
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="List facts that support AND contradict your automatic thought..."
                  className="input w-full min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  5. Alternative Thought
                  <span className="text-muted-foreground font-normal ml-2">
                    What&apos;s a more balanced perspective?
                  </span>
                </label>
                <textarea
                  value={alternativeThought}
                  onChange={(e) => setAlternativeThought(e.target.value)}
                  placeholder="Based on the evidence, what is a more realistic and balanced way to think about this?"
                  className="input w-full min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  6. Outcome
                  <span className="text-muted-foreground font-normal ml-2">
                    How do you feel now?
                  </span>
                </label>
                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="After this analysis, how has your emotional intensity changed? What will you do differently?"
                  className="input w-full min-h-[80px]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleSaveCBT}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save CBT Analysis
                </button>
              </div>
            </div>
          ) : activeTab === 'history' && isProcessed && queueItem ? (
            <div className="space-y-6">
              {/* Processing Summary */}
              <div className="rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">✅ Processing Summary</h3>
                <div className="space-y-1 text-sm text-purple-700">
                  <div><strong>Processed:</strong> {new Date(queueItem.timestamp).toLocaleString()}</div>
                  <div><strong>Mode:</strong> {queueItem.mode}</div>
                  <div><strong>Status:</strong> {queueItem.status}</div>
                  {queueItem.aiResponse?.confidence && (
                    <div><strong>AI Confidence:</strong> {Math.round(queueItem.aiResponse.confidence * 100)}%</div>
                  )}
                  {queueItem.aiResponse?.suggestedTools && (
                    <div><strong>Tools Used:</strong> {queueItem.aiResponse.suggestedTools.join(', ')}</div>
                  )}
                </div>
              </div>

              {/* Actions Taken */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Actions Taken ({queueItem.executedActions.length}/{queueItem.actions.length})</h3>
                <div className="space-y-3">
                  {queueItem.actions.map((action) => {
                    const isExecuted = action.status === 'executed';
                    const isFailed = action.status === 'failed';
                    
                    return (
                      <div
                        key={action.id}
                        className={`rounded-lg p-4 border-2 ${
                          isExecuted ? 'bg-green-50 border-green-200' : 
                          isFailed ? 'bg-red-50 border-red-200' : 
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            isExecuted ? 'bg-green-500' : 
                            isFailed ? 'bg-red-500' : 
                            'bg-gray-500'
                          } text-white`}>
                            {isExecuted && <CheckCircle2 className="h-5 w-5" />}
                            {isFailed && <X className="h-5 w-5" />}
                            {!isExecuted && !isFailed && <TrendingUp className="h-5 w-5" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {action.type === 'createTask' && `Created Task: "${action.data.title}"`}
                              {action.type === 'addTag' && `Added Tag: "${action.data.tag}"`}
                              {action.type === 'enhanceThought' && 'Enhanced Thought Text'}
                              {action.type === 'changeType' && `Changed Type to: ${action.data.type}`}
                              {action.type === 'setIntensity' && `Set Intensity: ${action.data.intensity}/10`}
                            </div>
                            
                            {action.aiReasoning && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Why:</strong> {action.aiReasoning}
                              </p>
                            )}
                            
                            {/* Task Details */}
                            {action.type === 'createTask' && (
                              <div className="mt-2 text-sm text-gray-600">
                                <div>Category: {action.data.category}</div>
                                <div>Time: {action.data.estimatedTime} minutes</div>
                                <div>Priority: {action.data.priority}</div>
                                {action.data.recurrence && action.data.recurrence.type !== 'none' && (
                                  <div className="mt-1 text-blue-600 font-medium">
                                    🔄 Recurring: {action.data.recurrence.type}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Enhancement Details */}
                            {action.type === 'enhanceThought' && (
                              <div className="mt-2 text-sm">
                                <div className="text-gray-500">
                                  <strong>Before:</strong> {queueItem.revertData.originalThought.text}
                                </div>
                                <div className="text-emerald-600 mt-1">
                                  <strong>After:</strong> {action.data.improvedText}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Changes: {action.data.changes}
                                </div>
                              </div>
                            )}
                            
                            <div className={`text-xs mt-2 font-medium ${
                              isExecuted ? 'text-green-600' : 
                              isFailed ? 'text-red-600' : 
                              'text-gray-600'
                            }`}>
                              Status: {action.status}
                              {action.error && ` - ${action.error}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Created Items Links */}
              {queueItem.revertData.createdItems.taskIds.length > 0 && (
                <div className="rounded-lg p-4 bg-blue-50 border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">🔗 Created Items</h3>
                  <div className="text-sm text-blue-700">
                    <div>{queueItem.revertData.createdItems.taskIds.length} task(s) created from this thought</div>
                    <div className="text-xs text-blue-600 mt-1">
                      View these tasks in the Tasks tool
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Revert Dialog */}
      {showRevertDialog && queueItem && (
        <RevertProcessingDialog
          queueItem={queueItem}
          onConfirm={handleRevert}
          onCancel={() => setShowRevertDialog(false)}
        />
      )}
    </div>
  );
}
