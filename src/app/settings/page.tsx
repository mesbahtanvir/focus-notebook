"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSettings, AIModel } from '@/store/useSettings'
import { Key, Eye, EyeOff, Check, X, ExternalLink, Brain, Download, Trash2, Database, AlertTriangle, Upload, FileJson } from 'lucide-react'
import Link from 'next/link'
import { exportAllData, exportData, downloadDataAsFile, deleteAllUserData, getDataStats, importDataFromFile, ExportOptions, ImportProgress } from '@/lib/utils/data-management'
import { DataMigration } from '@/components/DataMigration'
import { TokenUsageDashboard } from '@/components/TokenUsageDashboard'
import { useTasks } from '@/store/useTasks'
import { useGoals } from '@/store/useGoals'
import { useProjects } from '@/store/useProjects'
import { useThoughts } from '@/store/useThoughts'
import { useMoods } from '@/store/useMoods'
import { useFocus } from '@/store/useFocus'
import { useAuth } from '@/contexts/AuthContext'
import { EnhancedDataManagement } from '@/components/EnhancedDataManagement';

type SettingsFormValues = {
  allowBackgroundProcessing: boolean;
  openaiApiKey: string;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const { setValue, watch } = useForm<SettingsFormValues>({
    defaultValues: {
      allowBackgroundProcessing: false,
      openaiApiKey: '',
    },
  });

  // Store subscriptions for re-fetching data
  const tasksSubscribe = useTasks((s) => s.subscribe);
  const goalsSubscribe = useGoals((s) => s.subscribe);
  const projectsSubscribe = useProjects((s) => s.subscribe);
  const thoughtsSubscribe = useThoughts((s) => s.subscribe);
  const moodsSubscribe = useMoods((s) => s.subscribe);
  const focusSubscribe = useFocus((s) => s.subscribe);

  // Helper to refresh all stores without page reload
  const refreshAllStores = () => {
    if (user?.uid) {
      tasksSubscribe(user.uid);
      goalsSubscribe(user.uid);
      projectsSubscribe(user.uid);
      thoughtsSubscribe(user.uid);
      moodsSubscribe(user.uid);
      focusSubscribe(user.uid);
    }
  };

  // API Key management
  const { settings, updateSettings, clearApiKey } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  
  // Data management state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dataStats, setDataStats] = useState({ tasks: 0, goals: 0, projects: 0, thoughts: 0, moods: 0, focusSessions: 0, total: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    tasks: true,
    goals: true,
    projects: true,
    thoughts: true,
    moods: true,
    focusSessions: true,
  });
  

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        Object.entries(parsedSettings).forEach(([key, value]) => {
          setValue(key as keyof SettingsFormValues, value as any);
        });
      }
      
      // Load API key from settings store
      if (settings.openaiApiKey) {
        setApiKeyInput(settings.openaiApiKey);
        setIsApiKeyValid(true);
      }
      
      // Load data stats
      const stats = getDataStats();
      setDataStats(stats);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setValue, settings.openaiApiKey]);
  
  // Validate API key format
  const validateApiKey = (key: string): boolean => {
    if (!key || key.trim().length === 0) return false;
    return key.trim().startsWith('sk-');
  };
  
  // Save API key
  const handleSaveApiKey = () => {
    const isValid = validateApiKey(apiKeyInput);
    setIsApiKeyValid(isValid);
    
    if (isValid) {
      updateSettings({ openaiApiKey: apiKeyInput.trim() });
      toast({
        title: 'API Key Saved',
        description: 'Your OpenAI API key has been saved successfully.',
      });
    } else {
      toast({
        title: 'Invalid API Key',
        description: 'OpenAI API keys should start with "sk-". Please check and try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Clear API key
  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyInput('');
    setIsApiKeyValid(null);
    toast({
      title: 'API Key Removed',
      description: 'Your API key has been cleared from settings.',
    });
  };
  
  // Export data
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const data = await exportData(exportOptions);

      // Count selected items
      const selectedCount =
        (exportOptions.tasks ? dataStats.tasks : 0) +
        (exportOptions.goals ? dataStats.goals : 0) +
        (exportOptions.projects ? dataStats.projects : 0) +
        (exportOptions.thoughts ? dataStats.thoughts : 0) +
        (exportOptions.moods ? dataStats.moods : 0) +
        (exportOptions.focusSessions ? dataStats.focusSessions : 0);

      downloadDataAsFile(data);
      toast({
        title: 'Data Exported Successfully',
        description: `Exported ${selectedCount} items to JSON file.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a JSON file.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Import data
  const handleImportData = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a JSON file to import.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress({ currentCollection: 'Starting...', currentItem: 0, totalItems: 0, percentage: 0 });

      const result = await importDataFromFile(selectedFile, (progress) => {
        setImportProgress(progress);
      });

      if (result.success) {
        const importedItems = [
          result.stats.tasks > 0 && `${result.stats.tasks} tasks`,
          result.stats.goals > 0 && `${result.stats.goals} goals`,
          result.stats.projects > 0 && `${result.stats.projects} projects`,
          result.stats.thoughts > 0 && `${result.stats.thoughts} thoughts`,
          result.stats.moods > 0 && `${result.stats.moods} moods`,
          result.stats.focusSessions > 0 && `${result.stats.focusSessions} focus sessions`,
        ].filter(Boolean).join(', ');

        toast({
          title: 'Data Imported Successfully',
          description: `Imported ${importedItems}.`,
        });

        // Reset file input
        setSelectedFile(null);
        setImportProgress(null);

        // Refresh stores and stats after import
        setTimeout(() => {
          refreshAllStores();
          const newStats = getDataStats();
          setDataStats(newStats);
        }, 1000);
      } else {
        toast({
          title: 'Import Failed',
          description: result.error || 'Failed to import data. Please check the file format.',
          variant: 'destructive',
        });
        setImportProgress(null);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportProgress(null);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Delete all data
  const handleDeleteAllData = async () => {
    try {
      setIsDeleting(true);
      await deleteAllUserData();
      
      // Update stats after deletion
      setDataStats({ tasks: 0, goals: 0, projects: 0, thoughts: 0, moods: 0, focusSessions: 0, total: 0 });
      setShowDeleteConfirm(false);

      toast({
        title: 'All Data Deleted',
        description: 'All your data has been permanently deleted.',
      });

      // Refresh stores without page reload
      setTimeout(() => {
        refreshAllStores();
      }, 500);
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };


  const allowBackgroundProcessing = watch('allowBackgroundProcessing');

  useEffect(() => {
    const subscription = watch((value) => {
      try {
        localStorage.setItem('appSettings', JSON.stringify(value as SettingsFormValues));
      } catch (e) {
        console.error('Failed to auto-save settings:', e);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-4 border-purple-200">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ⚙️ Settings
          </CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Manage your application preferences • Settings auto-save
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
            {/* General Settings Section */}
            <div className="space-y-6">
              {/* Background Processing */}
              <div className="flex items-center justify-between py-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="allowBackgroundProcessing" className="text-base font-semibold text-gray-800">Background Processing</Label>
                  <p className="text-sm text-gray-600">
                    When enabled, the app will automatically analyze your thoughts using AI and suggest actions in the background. Requires an OpenAI API key.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Off by default.</strong> Toggle this on to enable automatic LLM-powered thought analysis every 2 minutes.
                  </p>
                </div>
                <Switch
                  id="allowBackgroundProcessing"
                  checked={allowBackgroundProcessing}
                  onCheckedChange={(checked) => {
                    setValue('allowBackgroundProcessing', checked);
                    // Dispatch custom event so daemon can react immediately
                    window.dispatchEvent(new Event('settingsChanged'));
                  }}
                />
              </div>

            </div>

            {/* AI Model Selection */}
            <div className="pt-8 space-y-4 border-t-4 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  AI Model Selection
                </h3>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-6 border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Choose which OpenAI model to use for AI-powered features. Better models provide higher quality but cost more.
                </p>
                
                <div className="space-y-3">
                  <Label htmlFor="aiModel" className="text-sm font-semibold">
                    Selected Model
                  </Label>
                  <select
                    id="aiModel"
                    value={settings.aiModel || 'gpt-3.5-turbo'}
                    onChange={(e) => updateSettings({ aiModel: e.target.value as AIModel })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo - Fastest & Cheapest (Default) 💰</option>
                    <option value="gpt-4o-mini">GPT-4o Mini - Good Balance ⚖️</option>
                    <option value="gpt-4o">GPT-4o - High Quality 🎯</option>
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo - Highest Quality 💎</option>
                  </select>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-300 dark:border-blue-700 mt-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <strong>💡 Pricing Guide:</strong><br/>
                      • <strong>GPT-3.5 Turbo</strong>: ~$0.002 per request (1000 tokens)<br/>
                      • <strong>GPT-4o Mini</strong>: ~$0.015 per request<br/>
                      • <strong>GPT-4o</strong>: ~$0.05 per request<br/>
                      • <strong>GPT-4 Turbo</strong>: ~$0.10 per request
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* OpenAI API Key Section */}
            <div className="pt-8 space-y-4 border-t-4 border-yellow-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <Key className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  OpenAI API Key
                </h3>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-6 border-2 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    Configure your OpenAI API key to enable AI-powered features. 
                    Your key is stored locally and never sent to our servers.
                  </p>
                  <Link
                    href="/learn/api-key"
                    className="ml-4 px-3 py-1.5 bg-white dark:bg-gray-800 border border-yellow-400 rounded-lg text-xs font-medium text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Learn How
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {/* API Key Input */}
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyInput" className="text-sm font-semibold">
                      API Key {settings.openaiApiKey && <span className="text-green-600 dark:text-green-400">(Configured ✓)</span>}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 max-w-md">
                        <Input
                          id="apiKeyInput"
                          type={showApiKey ? "text" : "password"}
                          value={apiKeyInput}
                          onChange={(e) => {
                            setApiKeyInput(e.target.value);
                            setIsApiKeyValid(null);
                          }}
                          placeholder="sk-..."
                          className={`pr-10 ${
                            isApiKeyValid === true 
                              ? 'border-green-500' 
                              : isApiKeyValid === false 
                              ? 'border-red-500' 
                              : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        type="button"
                        onClick={handleSaveApiKey}
                        disabled={!apiKeyInput.trim()}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      {settings.openaiApiKey && (
                        <Button
                          type="button"
                          onClick={handleClearApiKey}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {isApiKeyValid === false && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Invalid API key format. OpenAI keys should start with &quot;sk-&quot;
                      </p>
                    )}
                    {isApiKeyValid === true && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✓ API key saved successfully!
                      </p>
                    )}
                  </div>

                  {/* Quick Help */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Need help?</strong> Visit the{" "}
                      <Link 
                        href="/learn/api-key" 
                        className="text-purple-600 dark:text-purple-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        API Key Guide
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      {" "}for detailed instructions on getting your OpenAI API key, pricing info, and troubleshooting tips.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Management Section */}
            <div className="pt-8 space-y-4 border-t-4 border-red-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-red-400 to-pink-500 rounded-full">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  Data Management
                </h3>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 p-6 border-2 border-red-200 dark:border-red-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Export your data for backup or delete everything permanently.
                </p>
                
                {/* Data Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dataStats.tasks}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dataStats.goals}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dataStats.projects}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dataStats.thoughts}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Thoughts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{dataStats.moods}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Moods</div>
                  </div>
                  <div className="text-center border-l-2 border-gray-300 dark:border-gray-600">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dataStats.total}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Items</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Export Data */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Export Data</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Select which data to export as a JSON file
                        </div>
                      </div>
                    </div>

                    {/* Export Options Checkboxes */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.tasks}
                          onChange={(e) => setExportOptions({ ...exportOptions, tasks: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Tasks ({dataStats.tasks})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.goals}
                          onChange={(e) => setExportOptions({ ...exportOptions, goals: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Goals ({dataStats.goals})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.projects}
                          onChange={(e) => setExportOptions({ ...exportOptions, projects: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Projects ({dataStats.projects})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.thoughts}
                          onChange={(e) => setExportOptions({ ...exportOptions, thoughts: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Thoughts ({dataStats.thoughts})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.moods}
                          onChange={(e) => setExportOptions({ ...exportOptions, moods: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Moods ({dataStats.moods})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.focusSessions}
                          onChange={(e) => setExportOptions({ ...exportOptions, focusSessions: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Focus Sessions ({dataStats.focusSessions})</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {Object.values(exportOptions).filter(Boolean).length === 0
                          ? 'Please select at least one data type'
                          : `Selected: ${Object.entries(exportOptions).filter(([_, v]) => v).map(([k]) => k).join(', ')}`}
                      </div>
                      <Button
                        onClick={handleExportData}
                        disabled={isExporting || dataStats.total === 0 || Object.values(exportOptions).filter(Boolean).length === 0}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? 'Exporting...' : 'Export Selected'}
                      </Button>
                    </div>
                  </div>

                  {/* Import Data */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Import Data</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Restore data from a previously exported JSON file
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label htmlFor="import-file" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                          <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {selectedFile ? selectedFile.name : 'Choose JSON file...'}
                          </span>
                        </div>
                        <input
                          id="import-file"
                          type="file"
                          accept=".json,application/json"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                      
                      <Button
                        onClick={handleImportData}
                        disabled={!selectedFile || isImporting}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {isImporting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {selectedFile && !isImporting && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                        <strong>Ready to import:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}

                    {importProgress && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Importing {importProgress.currentCollection}...
                          </span>
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {importProgress.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-300 ease-out"
                            style={{ width: `${importProgress.percentage}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                          {importProgress.currentItem} of {importProgress.totalItems} items imported
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete All Data */}
                  {!showDeleteConfirm ? (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Delete All Data</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Permanently delete all your tasks, goals, projects, and more
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={dataStats.total === 0}
                        variant="outline"
                        className="ml-4 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-700">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-bold text-red-900 dark:text-red-100 mb-1">
                            Are you absolutely sure?
                          </div>
                          <div className="text-sm text-red-800 dark:text-red-200 mb-2">
                            This will permanently delete all your data including:
                          </div>
                          <ul className="text-sm text-red-800 dark:text-red-200 list-disc list-inside space-y-1 mb-4">
                            <li>{dataStats.tasks} tasks</li>
                            <li>{dataStats.goals} goals</li>
                            <li>{dataStats.projects} projects</li>
                            <li>{dataStats.thoughts} thoughts</li>
                            <li>{dataStats.moods} mood entries</li>
                          </ul>
                          <div className="text-sm font-bold text-red-900 dark:text-red-100">
                            This action cannot be undone!
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleDeleteAllData}
                          disabled={isDeleting}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeleting ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Yes, Delete Everything
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Warning Note */}
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>💡 Tip:</strong> Always export your data before deleting it. You can use the imported JSON file to restore your data later using the Import button.
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
      </Card>

      {/* Data Migration Component */}
      <EnhancedDataManagement />
    </div>
  );
}
