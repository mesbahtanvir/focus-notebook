"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [isBackgroundProcessingEnabled, setIsBackgroundProcessingEnabled] = useState(false);
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

  // Load background processing setting from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setIsBackgroundProcessingEnabled(parsed.allowBackgroundProcessing === true);
      }
    } catch (error) {
      console.error('Failed to load background processing setting:', error);
    }
  }, []);

  // Listen for changes to background processing setting
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setIsBackgroundProcessingEnabled(parsed.allowBackgroundProcessing === true);
        }
      } catch (error) {
        console.error('Failed to reload background processing setting:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen to custom event for same-tab updates
    window.addEventListener('settingsChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsChanged', handleStorageChange);
    };
  }, []);

  // Get processing candidates (thoughts without 'processed' tag)
  const getProcessingCandidates = useCallback(() => {
    const queue = useProcessQueue.getState().queue;
    const thoughtsInQueue = new Set(queue.map(q => q.thoughtId));
    
    return thoughts.filter(t => {
      const notProcessed = !t.tags?.includes('processed');
      const notInQueue = !thoughtsInQueue.has(t.id);
      return notProcessed && notInQueue;
    });
  }, [thoughts]);

  // Process a single thought
  const processThought = useCallback(async (thoughtId: string) => {
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
            tags: thought.tags || [],
            intensity: thought.intensity
          },
          createdItems: {
            taskIds: [],
            noteIds: [],
            projectIds: []
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
      
      // Add thought enhancement if suggested (but don't auto-execute)
      if (result.thoughtEnhancement?.shouldApply && result.thoughtEnhancement.improvedText) {
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

      // Set status to awaiting approval (Safe Mode)
      updateQueueItem(queueId, {
        status: 'awaiting-approval'
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
  }, [thoughts, hasApiKey, addToLog, addToQueue, updateQueueItem, addAction, settings]);

  // Daemon loop
  useEffect(() => {
    const runDaemon = async () => {
      if (isProcessing) return;

      // Check if background processing is enabled
      if (!isBackgroundProcessingEnabled) {
        return;
      }

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
  }, [thoughts, isProcessing, isBackgroundProcessingEnabled, getProcessingCandidates, processThought]);

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
