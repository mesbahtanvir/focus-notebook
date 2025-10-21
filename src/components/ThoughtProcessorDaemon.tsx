"use client";

import { useEffect, useRef, useState } from 'react';
import { useThoughts } from '@/store/useThoughts';
import { useProcessQueue, ProcessingMode } from '@/store/useProcessQueue';
import { useSettings } from '@/store/useSettings';
import { useRequestLog } from '@/store/useRequestLog';
import { ToolRegistry } from '@/lib/thoughtProcessor/toolRegistry';
import { actionExecutor } from '@/lib/thoughtProcessor/actionExecutor';
import { Loader2 } from 'lucide-react';

export function ThoughtProcessorDaemon() {
  const thoughts = useThoughts(s => s.thoughts);
  const updateThought = useThoughts(s => s.updateThought);
  const settings = useSettings(s => s.settings);
  const hasApiKey = useSettings(s => s.hasApiKey);
  const addToQueue = useProcessQueue(s => s.addToQueue);
  const updateQueueItem = useProcessQueue(s => s.updateQueueItem);
  const addAction = useProcessQueue(s => s.addAction);
  const updateAction = useProcessQueue(s => s.updateAction);
  const getQueueItem = useProcessQueue(s => s.getQueueItem);
  const addToLog = useRequestLog(s => s.addToQueue);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize logger for action executor
  useEffect(() => {
    actionExecutor.setLogger((log) => {
      addToLog(log);
    });
  }, [addToLog]);

  // Get processing candidates (thoughts without 'processed' tag)
  const getProcessingCandidates = () => {
    const queue = useProcessQueue.getState().queue;
    const thoughtsInQueue = new Set(queue.map(q => q.thoughtId));
    
    return thoughts.filter(t => {
      const notProcessed = !t.tags?.includes('processed');
      const notInQueue = !thoughtsInQueue.has(t.id);
      return notProcessed && notInQueue;
    });
  };

  // Process a single thought
  const processThought = async (thoughtId: string) => {
    const thought = thoughts.find(t => t.id === thoughtId);
    if (!thought) return;

    if (!hasApiKey()) {
      console.log('⚠️ No API key configured, skipping processing');
      return;
    }

    setIsProcessing(true);
    setStatus(`Processing: ${thought.text.substring(0, 50)}...`);

    // Add to request log
    const requestId = addToLog({
      type: 'api',
      method: 'POST /api/process-thought',
      url: 'Thought Processing',
      request: {
        thoughtId: thought.id,
        thoughtText: thought.text
      }
    });

    try {
      // Create queue item
      const queueId = addToQueue({
        thoughtId: thought.id,
        mode: 'auto', // Default to auto mode for now
        status: 'pending',
        actions: [],
        approvedActions: [],
        executedActions: [],
        revertible: true,
        revertData: {
          originalThought: {
            text: thought.text,
            type: thought.type,
            tags: thought.tags || [],
            intensity: thought.intensity
          },
          createdItems: {
            taskIds: [],
            noteIds: []
          },
          thoughtChanges: {
            textChanged: false,
            typeChanged: false,
            intensityChanged: false
          },
          addedTags: [],
          canRevert: true
        }
      });

      console.log('📋 Created queue item:', queueId);

      // Update status to processing
      updateQueueItem(queueId, { status: 'processing' });

      // Get tool descriptions
      const toolDescriptions = ToolRegistry.getToolDescriptions();

      // Call API to analyze thought
      const response = await fetch('/api/process-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thought: {
            id: thought.id,
            text: thought.text,
            type: thought.type,
            tags: thought.tags,
            createdAt: thought.createdAt
          },
          apiKey: settings.openaiApiKey,
          toolDescriptions
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('❌ Processing error:', data.error);
        updateQueueItem(queueId, {
          status: 'failed',
          error: data.error
        });
        const updateRequestStatus = useRequestLog.getState().updateRequestStatus;
        updateRequestStatus(requestId, 'failed', {
          error: data.error,
          status: 0
        });
        return;
      }

      const result = data.result;
      console.log('✅ Processing result:', result);

      // Store AI response
      updateQueueItem(queueId, { aiResponse: result });

      // Process actions
      const actions = result.actions || [];
      
      // Add thought enhancement if suggested
      if (result.thoughtEnhancement?.shouldApply) {
        actions.unshift({
          type: 'enhanceThought',
          tool: 'system',
          data: {
            improvedText: result.thoughtEnhancement.improvedText,
            changes: result.thoughtEnhancement.changes
          },
          reasoning: result.thoughtEnhancement.changes
        });
      }

      // Create action objects
      for (const actionData of actions) {
        const actionId = addAction(queueId, {
          type: actionData.type,
          thoughtId: thought.id,
          data: actionData.data,
          status: 'pending',
          aiReasoning: actionData.reasoning
        });

        console.log('➕ Added action:', actionId, actionData.type);
      }

      // Execute actions (auto mode)
      const queueItem = getQueueItem(queueId);
      if (!queueItem) return;

      for (const action of queueItem.actions) {
        const executionResult = await actionExecutor.executeAction(action, queueItem);
        
        if (executionResult.success) {
          updateAction(queueId, action.id, {
            status: 'executed'
          });
          updateQueueItem(queueId, {
            executedActions: [...queueItem.executedActions, action.id]
          });
        } else {
          updateAction(queueId, action.id, {
            status: 'failed',
            error: executionResult.error
          });
        }
      }

      // Mark thought as processed
      const processingNote = `[Processed: ${new Date().toISOString()} by daemon (auto mode) - Queue: ${queueId}]`;
      const existingNotes = thought.notes || '';
      
      updateThought(thought.id, {
        tags: [...(thought.tags || []), 'processed'],
        notes: existingNotes ? `${existingNotes}\n\n${processingNote}` : processingNote
      });

      // Mark queue item as completed
      updateQueueItem(queueId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      console.log('✅ Processing completed:', queueId);

      // Update request log
      const updateRequestStatus = useRequestLog.getState().updateRequestStatus;
      updateRequestStatus(requestId, 'completed', {
        response: {
          actions: actions.length,
          tools: result.suggestedTools
        },
        status: 200
      });

    } catch (error) {
      console.error('💥 Processing error:', error);
      const updateRequestStatus = useRequestLog.getState().updateRequestStatus;
      updateRequestStatus(requestId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0
      });
    } finally {
      setIsProcessing(false);
      setStatus('idle');
    }
  };

  // Daemon loop
  useEffect(() => {
    const runDaemon = async () => {
      if (isProcessing) return;

      const candidates = getProcessingCandidates();
      if (candidates.length > 0) {
        console.log(`🤖 Found ${candidates.length} thought(s) to process`);
        // Process one at a time
        await processThought(candidates[0].id);
      }
    };

    // Run every 2 minutes (120000ms)
    const interval = 120000;
    intervalRef.current = setInterval(runDaemon, interval);

    // Run once on mount after a short delay
    const initialTimeout = setTimeout(runDaemon, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(initialTimeout);
    };
  }, [thoughts, isProcessing]);

  // Show processing indicator
  if (isProcessing) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border-2 border-purple-200 rounded-lg shadow-lg p-3 flex items-center gap-2 z-50">
        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        <div className="text-sm">
          <div className="font-semibold text-purple-600">Processing thought...</div>
          <div className="text-gray-500 text-xs">{status}</div>
        </div>
      </div>
    );
  }

  return null;
}
