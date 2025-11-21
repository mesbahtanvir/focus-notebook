import { useState } from "react";
import { TaskStep } from "@/store/useTasks";
import { Check, Plus, X, GripVertical } from "lucide-react";

interface TaskStepsProps {
  steps: TaskStep[];
  onUpdate: (steps: TaskStep[]) => void;
  editable?: boolean;
}

export function TaskSteps({ steps, onUpdate, editable = true }: TaskStepsProps) {
  const [newStepText, setNewStepText] = useState("");

  const addStep = () => {
    if (!newStepText.trim()) return;
    
    const newStep: TaskStep = {
      id: Date.now().toString(),
      text: newStepText.trim(),
      completed: false,
    };
    
    onUpdate([...steps, newStep]);
    setNewStepText("");
  };

  const toggleStep = (stepId: string) => {
    onUpdate(
      steps.map(step =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const removeStep = (stepId: string) => {
    onUpdate(steps.filter(step => step.id !== stepId));
  };

  const updateStepText = (stepId: string, text: string) => {
    onUpdate(
      steps.map(step =>
        step.id === stepId ? { ...step, text } : step
      )
    );
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      {steps.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Progress</span>
            <span>{completedCount}/{steps.length} steps</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start gap-2 p-3 rounded-lg border-2 transition-all ${
              step.completed
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Step Number/Grip */}
            <div className="flex items-center gap-1 pt-0.5">
              {editable && (
                <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
              )}
              <span className={`text-sm font-bold min-w-[24px] ${
                step.completed
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {index + 1}.
              </span>
            </div>

            {/* Checkbox */}
            <button
              onClick={() => toggleStep(step.id)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${
                step.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
              }`}
            >
              {step.completed && <Check className="h-3 w-3 text-white" />}
            </button>

            {/* Step Text */}
            <div className="flex-1">
              {editable ? (
                <input
                  type="text"
                  value={step.text}
                  onChange={(e) => updateStepText(step.id, e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-sm ${
                    step.completed
                      ? 'line-through text-gray-500 dark:text-gray-500'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                  placeholder="Step description..."
                />
              ) : (
                <span className={`text-sm block ${
                  step.completed
                    ? 'line-through text-gray-500 dark:text-gray-500'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {step.text}
                </span>
              )}
            </div>

            {/* Remove Button */}
            {editable && (
              <button
                onClick={() => removeStep(step.id)}
                className="flex-shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition"
                title="Remove step"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Step Input */}
      {editable && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newStepText}
            onChange={(e) => setNewStepText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStep()}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder={`Step ${steps.length + 1}: Add next step...`}
          />
          <button
            onClick={addStep}
            disabled={!newStepText.trim()}
            className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:hover:bg-purple-950/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}

      {/* Empty State */}
      {steps.length === 0 && !editable && (
        <div className="text-center py-4 text-gray-400 dark:text-gray-600 text-sm">
          No steps defined for this task
        </div>
      )}
    </div>
  );
}
