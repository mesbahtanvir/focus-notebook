"use client";

import { useState } from "react";
import { Copy, Check, Download, RefreshCw } from "lucide-react";
import {
  buildThoughtProcessingPrompt,
  getTestPromptValues,
  exportPromptForGitHubModels,
  type PromptParams
} from "@/lib/llm/promptBuilder";
import { ToolPageLayout, ToolHeader, toolThemes } from "@/components/tools";

export default function LLMPlaygroundPage() {
  const [copied, setCopied] = useState(false);
  const [testParams] = useState<PromptParams>(getTestPromptValues());
  const [prompt, setPrompt] = useState(buildThoughtProcessingPrompt(testParams));
  const [fullExport, setFullExport] = useState(exportPromptForGitHubModels());

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFullExport = async () => {
    await navigator.clipboard.writeText(fullExport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullExport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thought-processing-prompt.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    const newParams = getTestPromptValues();
    setPrompt(buildThoughtProcessingPrompt(newParams));
    setFullExport(exportPromptForGitHubModels());
  };

  const theme = toolThemes.purple;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="LLM Playground"
        emoji="🤖"
        showBackButton
        theme={theme}
      />

      <div className="space-y-6">
        {/* Instructions Card */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📖</span>
            How to Use with GitHub Models
          </h2>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">1.</span>
              <span>Click &quot;Copy Prompt&quot; or &quot;Copy Full Export&quot; below</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">2.</span>
              <span>Go to <a href="https://github.com/marketplace/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub Models</a></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">3.</span>
              <span>Select a model (gpt-4o, gpt-4-turbo, etc.)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">4.</span>
              <span>Paste the prompt and run</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">5.</span>
              <span>The model will return JSON with suggested actions</span>
            </li>
          </ol>
        </div>

        {/* Test Parameters Card */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🧪</span>
            Test Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Thought Text:</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                {testParams.thought.text}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Context Summary:</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>📌 Goals: {testParams.context?.goals?.length || 0}</div>
                <div>🎯 Projects: {testParams.context?.projects?.length || 0}</div>
                <div>✓ Tasks: {testParams.context?.tasks?.length || 0}</div>
                <div>😊 Moods: {testParams.context?.moods?.length || 0}</div>
                <div>👥 Relationships: {testParams.context?.relationships?.length || 0}</div>
                <div>📝 Notes: {testParams.context?.notes?.length || 0}</div>
                <div>🏃 Errands: {testParams.context?.errands?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Display Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>📋</span>
              Generated Prompt
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {prompt}
            </pre>
          </div>
        </div>

        {/* Full Export Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>📦</span>
              Full Export (with Instructions)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Download .md
              </button>
              <button
                onClick={handleCopyFullExport}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Full Export'}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {fullExport}
            </pre>
          </div>
        </div>

        {/* Tips Card */}
        <div className="card p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <span>💡</span>
            Tips for Best Results
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex gap-2">
              <span>•</span>
              <span>Use gpt-4o or gpt-4-turbo for best results</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Set temperature to 0.7 for balanced creativity and consistency</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Ensure max_tokens is at least 1500 to avoid truncated responses</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>The model should return pure JSON without markdown code blocks</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Customize the test data by editing values in the prompt</span>
            </li>
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
}
