import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LLMRequest {
  id: string;
  timestamp: string;
  type: 'thought-processing' | 'brainstorming' | 'cbt-analysis' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: {
    thoughtId?: string;
    text: string;
    context?: any;
  };
  output?: {
    result: any;
    tokens?: number;
    cost?: number;
  };
  error?: string;
  userId?: string;
}

export interface LLMQueueStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  totalTokens: number;
  totalCost: number;
}

type State = {
  requests: LLMRequest[];
  isLoading: boolean;
  
  // Queue management
  addRequest: (request: Omit<LLMRequest, 'id' | 'timestamp' | 'status'>) => string;
  updateRequest: (id: string, updates: Partial<LLMRequest>) => void;
  removeRequest: (id: string) => void;
  getRequest: (id: string) => LLMRequest | undefined;
  
  // Processing
  processNextRequest: () => Promise<void>;
  retryRequest: (id: string) => Promise<void>;
  
  // Stats
  getStats: () => LLMQueueStats;
  clearCompletedRequests: () => void;
  clearOldRequests: (daysToKeep: number) => void;
};

export const useLLMQueue = create<State>()(
  persist(
    (set, get) => ({
      requests: [],
      isLoading: false,

      addRequest: (request) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newRequest: LLMRequest = {
          ...request,
          id,
          timestamp: new Date().toISOString(),
          status: 'pending',
        };

        set((state) => ({
          requests: [newRequest, ...state.requests].slice(0, 1000), // Keep last 1000 requests
        }));

        // Auto-process if not already processing
        const { requests } = get();
        const processingCount = requests.filter(r => r.status === 'processing').length;
        if (processingCount === 0) {
          get().processNextRequest();
        }

        return id;
      },

      updateRequest: (id, updates) => {
        set((state) => ({
          requests: state.requests.map(request =>
            request.id === id ? { ...request, ...updates } : request
          ),
        }));
      },

      removeRequest: (id) => {
        set((state) => ({
          requests: state.requests.filter(request => request.id !== id),
        }));
      },

      getRequest: (id) => {
        return get().requests.find(request => request.id === id);
      },

      processNextRequest: async () => {
        const { requests, updateRequest } = get();
        const pendingRequest = requests.find(r => r.status === 'pending');
        
        if (!pendingRequest) return;

        updateRequest(pendingRequest.id, { status: 'processing' });

        try {
          let result;
          
          switch (pendingRequest.type) {
            case 'thought-processing':
              result = await processThoughtRequest(pendingRequest);
              break;
            case 'brainstorming':
              result = await processBrainstormingRequest(pendingRequest);
              break;
            case 'cbt-analysis':
              result = await processCBTRequest(pendingRequest);
              break;
            default:
              throw new Error(`Unknown request type: ${pendingRequest.type}`);
          }

          updateRequest(pendingRequest.id, {
            status: 'completed',
            output: result,
          });

          // Process next request if any
          setTimeout(() => get().processNextRequest(), 1000);

        } catch (error) {
          console.error('LLM request failed:', error);
          updateRequest(pendingRequest.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      retryRequest: async (id) => {
        const request = get().getRequest(id);
        if (!request) return;

        get().updateRequest(id, { 
          status: 'pending',
          error: undefined,
        });

        // Process immediately
        get().processNextRequest();
      },

      getStats: () => {
        const { requests } = get();
        const now = Date.now();
        
        const totalRequests = requests.length;
        const pendingRequests = requests.filter(r => r.status === 'pending').length;
        const completedRequests = requests.filter(r => r.status === 'completed').length;
        const failedRequests = requests.filter(r => r.status === 'failed').length;
        
        const completedWithTime = requests.filter(r => 
          r.status === 'completed' && r.timestamp
        );
        
        const averageProcessingTime = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, r) => {
              const processingTime = now - new Date(r.timestamp).getTime();
              return sum + processingTime;
            }, 0) / completedWithTime.length
          : 0;

        const totalTokens = requests
          .filter(r => r.output?.tokens)
          .reduce((sum, r) => sum + (r.output?.tokens || 0), 0);

        const totalCost = requests
          .filter(r => r.output?.cost)
          .reduce((sum, r) => sum + (r.output?.cost || 0), 0);

        return {
          totalRequests,
          pendingRequests,
          completedRequests,
          failedRequests,
          averageProcessingTime,
          totalTokens,
          totalCost,
        };
      },

      clearCompletedRequests: () => {
        set((state) => ({
          requests: state.requests.filter(r => r.status !== 'completed'),
        }));
      },

      clearOldRequests: (daysToKeep) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        set((state) => ({
          requests: state.requests.filter(
            r => new Date(r.timestamp) >= cutoffDate
          ),
        }));
      },
    }),
    {
      name: 'llm-queue-storage',
      version: 1,
    }
  )
);

// Helper functions for processing different request types
async function processThoughtRequest(request: LLMRequest) {
  // Import settings dynamically to get API key
  const { useSettings } = await import('./useSettings');
  const settings = useSettings.getState().settings;
  
  const response = await fetch('/api/process-thought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thought: {
        id: request.input.thoughtId,
        text: request.input.text,
        tags: [],
        createdAt: new Date().toISOString(),
      },
      context: request.input.context,
      apiKey: settings.openaiApiKey,
      model: settings.aiModel || 'gpt-3.5-turbo',
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    result: data.result,
    tokens: data.usage?.total_tokens,
    cost: data.usage ? calculateCost(data.usage) : 0,
  };
}

async function processBrainstormingRequest(request: LLMRequest) {
  // Import settings dynamically to get API key
  const { useSettings } = await import('./useSettings');
  const settings = useSettings.getState().settings;
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: request.input.context?.messages || [],
      context: request.input.context,
      apiKey: settings.openaiApiKey,
      model: settings.aiModel || 'gpt-3.5-turbo',
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    result: data.message,
    tokens: data.usage?.total_tokens,
    cost: data.usage ? calculateCost(data.usage) : 0,
  };
}

async function processCBTRequest(request: LLMRequest) {
  // CBT processing logic would go here
  // For now, return a placeholder
  return {
    result: { analysis: 'CBT analysis completed' },
    tokens: 0,
    cost: 0,
  };
}

function calculateCost(usage: any): number {
  // Simple cost calculation - would need to be more sophisticated
  return (usage.prompt_tokens * 0.0005 + usage.completion_tokens * 0.0015) / 1000;
}
