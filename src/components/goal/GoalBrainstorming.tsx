"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { useLLMQueue } from "@/store/useLLMQueue";
import type { Goal } from "@/store/useGoals";

interface GoalBrainstormingProps {
  goal: Goal;
  userId?: string;
}

/**
 * Component for AI-powered brainstorming related to a goal
 */
export function GoalBrainstorming({ goal, userId }: GoalBrainstormingProps) {
  const { addRequest } = useLLMQueue();
  const [brainstormingInput, setBrainstormingInput] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormingResults, setBrainstormingResults] = useState<string[]>([]);

  const handleBrainstorming = async () => {
    if (!brainstormingInput.trim()) return;

    setIsBrainstorming(true);
    try {
      const requestId = addRequest({
        type: 'brainstorming',
        input: {
          text: `Goal: ${goal.title}\nObjective: ${goal.objective}\n\nBrainstorming prompt: ${brainstormingInput}`,
        },
        userId,
      });

      const checkStatus = () => {
        const request = useLLMQueue.getState().getRequest(requestId);
        if (request?.status === 'completed' && request.output?.result) {
          const result = request.output.result as {
            actions?: unknown[];
            response?: string;
          };

          // Check if this is the new thought-processing structure
          if (result.actions && Array.isArray(result.actions)) {
            // This is thought-processing type - skip for brainstorming
            setIsBrainstorming(false);
            return;
          }

          // Handle brainstorming response
          let response: string;
          if (typeof result === 'string') {
            response = result;
          } else if (result.response) {
            response = result.response;
          } else {
            response = String(result);
          }

          const ideas = response
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.match(/^\d+\.?\s*$/))
            .map((line: string) => line.replace(/^\d+\.?\s*/, ''));

          setBrainstormingResults(ideas);
          setBrainstormingInput("");
          setIsBrainstorming(false);
        } else if (request?.status === 'failed') {
          setIsBrainstorming(false);
        } else {
          setTimeout(checkStatus, 1000);
        }
      };

      checkStatus();
    } catch (error) {
      setIsBrainstorming(false);
    }
  };

  return (
    <div className="rounded-xl p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">AI Brainstorming</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={brainstormingInput}
              onChange={(e) => setBrainstormingInput(e.target.value)}
              placeholder="What would you like to brainstorm?"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-800 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleBrainstorming()}
            />
            <button
              onClick={handleBrainstorming}
              disabled={!brainstormingInput.trim() || isBrainstorming}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
            >
              {isBrainstorming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              Brainstorm
            </button>
          </div>
        </div>

        {brainstormingResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-700 dark:text-orange-300 text-sm">Ideas:</h4>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {brainstormingResults.map((idea, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold text-sm mt-0.5">
                      {index + 1}.
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{idea}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
