"use client";

import { ProcessQueueItem, ProcessAction } from '@/store/useProcessQueue';
import { X, Check, CheckCircle2, Sparkles, Tag, FileEdit, RefreshCw, TrendingUp, Heart, Target, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';

interface ProcessingApprovalDialogProps {
  queueItem: ProcessQueueItem;
  onApprove: (approvedActionIds: string[]) => void;
  onReject: () => void;
}

export function ProcessingApprovalDialog({ queueItem, onApprove, onReject }: ProcessingApprovalDialogProps) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set(queueItem.actions.map(a => a.id))
  );

  const toggleAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const handleApprove = () => {
    onApprove(Array.from(selectedActions));
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'createTask': return <CheckCircle2 className="h-5 w-5" />;
      case 'addTag': return <Tag className="h-5 w-5" />;
      case 'enhanceThought': return <Sparkles className="h-5 w-5" />;
      case 'changeType': return <RefreshCw className="h-5 w-5" />;
      case 'setIntensity': return <TrendingUp className="h-5 w-5" />;
      case 'createMoodEntry': return <Heart className="h-5 w-5" />;
      case 'createProject': return <Target className="h-5 w-5" />;
      case 'linkToProject': return <LinkIcon className="h-5 w-5" />;
      default: return <FileEdit className="h-5 w-5" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'createTask': return 'from-blue-500 to-cyan-500';
      case 'addTag': return 'from-purple-500 to-pink-500';
      case 'enhanceThought': return 'from-amber-500 to-orange-500';
      case 'changeType': return 'from-green-500 to-emerald-500';
      case 'setIntensity': return 'from-red-500 to-rose-500';
      case 'createMoodEntry': return 'from-pink-500 to-rose-500';
      case 'createProject': return 'from-blue-500 to-cyan-500';
      case 'linkToProject': return 'from-teal-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getActionTitle = (action: ProcessAction) => {
    switch (action.type) {
      case 'createTask':
        return `Create Task: "${action.data.title}"`;
      case 'addTag':
        return `Add Tag: "${action.data.tag}"`;
      case 'enhanceThought':
        return 'Enhance Thought Text';
      case 'changeType':
        return `Change Type to: ${action.data.type}`;
      case 'setIntensity':
        return `Set Intensity: ${action.data.intensity}/10`;
      case 'createMoodEntry':
        return `Create Mood Entry: ${action.data.mood}`;
      case 'createProject':
        return `Create Project: "${action.data.title}"`;
      case 'linkToProject':
        return `Link to Project: "${action.data.projectTitle}"`;
      default:
        return action.type;
    }
  };

  const getActionDetails = (action: ProcessAction) => {
    switch (action.type) {
      case 'createTask':
        return (
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div><strong>Category:</strong> {action.data.category}</div>
            <div><strong>Estimated Time:</strong> {action.data.estimatedTime} minutes</div>
            <div><strong>Priority:</strong> {action.data.priority}</div>
            {action.data.recurrence && action.data.recurrence.type !== 'none' && (
              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <strong className="text-blue-700">🔄 Recurring Task:</strong>
                <div className="text-blue-600 mt-1">
                  {action.data.recurrence.type === 'daily' && '📅 Daily'}
                  {action.data.recurrence.type === 'weekly' && '📅 Weekly'}
                  {action.data.recurrence.type === 'workweek' && '📅 Workdays (Mon-Fri)'}
                  {action.data.recurrence.type === 'monthly' && '📅 Monthly'}
                </div>
                {action.data.recurrence.reasoning && (
                  <div className="text-xs text-blue-500 mt-1">
                    {action.data.recurrence.reasoning}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'createMoodEntry':
        return (
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div><strong>Mood:</strong> {action.data.mood}</div>
            <div><strong>Intensity:</strong> {action.data.intensity}/10</div>
            {action.data.notes && (
              <div className="mt-2 p-2 bg-pink-50 rounded border border-pink-200">
                <strong className="text-pink-700">💭 Notes:</strong>
                <div className="text-pink-600 text-xs mt-1">
                  {action.data.notes}
                </div>
              </div>
            )}
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-full rounded ${
                    i < action.data.intensity
                      ? action.data.intensity <= 3
                        ? 'bg-green-400'
                        : action.data.intensity <= 6
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        );
      case 'createProject':
        return (
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div><strong>Description:</strong> {action.data.description || 'N/A'}</div>
            <div><strong>Timeframe:</strong> {action.data.timeframe === 'short-term' ? '⏱️ Short-term (weeks-months)' : '🎯 Long-term (months-years)'}</div>
            <div><strong>Category:</strong> {action.data.category}</div>
            {action.data.targetDate && (
              <div><strong>Target Date:</strong> {new Date(action.data.targetDate).toLocaleDateString()}</div>
            )}
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <strong className="text-blue-700">📝 Note:</strong>
              <div className="text-blue-600 text-xs mt-1">
                This thought will be automatically linked to the new project
              </div>
            </div>
          </div>
        );
      case 'linkToProject':
        return (
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div><strong>Project:</strong> {action.data.projectTitle}</div>
            <div className="mt-2 p-2 bg-teal-50 rounded border border-teal-200">
              <strong className="text-teal-700">🔗 Link:</strong>
              <div className="text-teal-600 text-xs mt-1">
                This thought will be linked to the existing project for context and tracking
              </div>
            </div>
          </div>
        );
      case 'enhanceThought':
        return (
          <div className="mt-2 text-sm space-y-2">
            <div>
              <strong className="text-gray-700">Current:</strong>
              <p className="text-gray-600 italic mt-1">{queueItem.revertData.originalThought.text}</p>
            </div>
            <div>
              <strong className="text-emerald-700">Enhanced:</strong>
              <p className="text-emerald-600 font-medium mt-1">{action.data.improvedText}</p>
            </div>
            <div className="text-xs text-gray-500">
              <strong>Changes:</strong> {action.data.changes}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6" />
              <div>
                <h3 className="text-xl font-bold">Review AI Suggestions</h3>
                <p className="text-sm text-purple-100 mt-1">
                  {selectedActions.size} of {queueItem.actions.length} actions selected
                </p>
              </div>
            </div>
            <button onClick={onReject} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* AI Response Summary */}
        {queueItem.aiResponse && (
          <div className="p-6 bg-blue-50 border-b-2 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900">AI Analysis</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Confidence: {Math.round((queueItem.aiResponse.confidence || 0.5) * 100)}%
                </p>
                {queueItem.aiResponse.suggestedTools && (
                  <p className="text-sm text-blue-600 mt-1">
                    Suggested tools: {queueItem.aiResponse.suggestedTools.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions List */}
        <div className="p-6 space-y-4">
          <h4 className="font-semibold text-gray-700">Proposed Actions:</h4>
          
          {queueItem.actions.map((action) => {
            const isSelected = selectedActions.has(action.id);
            
            return (
              <div
                key={action.id}
                onClick={() => toggleAction(action.id)}
                className={`rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-300 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-0.5">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${getActionColor(action.type)} text-white`}>
                      {getActionIcon(action.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-gray-800">{getActionTitle(action)}</h5>
                      {action.aiReasoning && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Why:</strong> {action.aiReasoning}
                        </p>
                      )}
                      {getActionDetails(action)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold"
            >
              Reject All
            </button>
            <button
              onClick={handleApprove}
              disabled={selectedActions.size === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve Selected ({selectedActions.size})
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedActions(new Set(queueItem.actions.map(a => a.id)));
            }}
            className="w-full mt-2 px-4 py-2 text-sm text-purple-600 hover:text-purple-700 transition font-medium"
          >
            Select All
          </button>
        </div>
      </div>
    </div>
  );
}
