"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { db, type TaskRow, type MoodRow } from '@/db'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useSettings } from '@/store/useSettings'
import { syncToCloud, syncFromCloud } from '@/lib/cloudSync'
import { useAuth } from '@/contexts/AuthContext'
import { Cloud, CloudOff, RefreshCw, Upload, Key, Eye, EyeOff, Check, X } from 'lucide-react'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'

type SettingsFormValues = {
  allowBackgroundProcessing: boolean;
  openaiApiKey: string;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { register, setValue, watch } = useForm<SettingsFormValues>({
    defaultValues: {
      allowBackgroundProcessing: false,
      openaiApiKey: '',
    },
  });
  const [syncing, setSyncing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // API Key management
  const { settings, updateSettings, clearApiKey } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  
  // Cloud sync settings
  const { 
    cloudSyncEnabled, 
    syncInterval, 
    lastSyncTime,
    setCloudSyncEnabled,
    setSyncInterval,
    updateLastSyncTime 
  } = useSettingsStore();

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

  const doExport = async () => {
    try {
      const tasks = await db.tasks.toArray();
      const moods = (db as any).moods ? await (db as any).moods.toArray() : [];
      const payload = { version: 1, exportedAt: new Date().toISOString(), tasks, moods };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focus-notebook-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: 'Your data has been exported as JSON.' });
    } catch (e) {
      toast({ title: 'Export failed', description: 'Could not export data.', variant: 'destructive' });
    } finally {
      setExportOpen(false);
    }
  };

  const startImport = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileChosen: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const tasks: TaskRow[] = Array.isArray(data?.tasks) ? data.tasks : [];
      const moods: MoodRow[] = Array.isArray(data?.moods) ? data.moods : [];
      await db.tasks.clear();
      if ((db as any).moods) await (db as any).moods.clear();
      if (tasks.length) await db.tasks.bulkPut(tasks as any);
      if ((db as any).moods && moods.length) await (db as any).moods.bulkPut(moods as any);
      toast({ title: 'Import complete', description: 'Your data has been restored.' });
    } catch (e) {
      toast({ title: 'Import failed', description: 'Invalid or unreadable JSON.', variant: 'destructive' });
    } finally {
      setImportOpen(false);
    }
  };

  const handleCloudSync = async () => {
    if (syncing) return;
    
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to sync your data.',
        variant: 'destructive',
      });
      return;
    }
    
    setSyncing(true);
    try {
      // Upload local data to Firebase
      const result = await syncToCloud();
      
      if (result.success) {
        updateLastSyncTime(result.timestamp);
        toast({
          title: 'Cloud sync complete',
          description: 'Your data has been uploaded to Firebase successfully.',
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (e) {
      toast({
        title: 'Cloud sync failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
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
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Configure your OpenAI API key to enable AI-powered brainstorming features. 
                  Your key is stored locally in your browser and never sent to our servers.
                </p>
                
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
                        API key is valid and saved!
                      </p>
                    )}
                  </div>

                  {/* Help Text */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      📝 How to get your API key:
                    </p>
                    <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">platform.openai.com/api-keys</a></li>
                      <li>Sign in or create an OpenAI account</li>
                      <li>Click &quot;Create new secret key&quot;</li>
                      <li>Copy the key and paste it above</li>
                    </ol>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                      💡 Your key is stored securely in your browser&apos;s local storage
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Sync Info */}
            <div className="pt-8 space-y-6 border-t-4 border-blue-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Cloud Sync</h3>
              </div>
              
              {/* Sync Status Indicator */}
              <SyncStatusIndicator />
              
              {!user ? (
                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-6 border-2 border-blue-200">
                  <p className="text-sm text-gray-700 font-medium">
                    🔐 Sign in to enable automatic cloud sync and access your data across multiple devices.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✨</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 font-bold mb-2">
                        Cloud Sync is Always Active
                      </p>
                      <p className="text-sm text-gray-700">
                        Your data automatically syncs to the cloud when you&apos;re signed in. You can access it from any device (iPhone, iPad, Mac, etc.) by signing in with the same account.
                      </p>
                      <div className="mt-3 p-3 bg-white rounded-lg border border-green-300">
                        <p className="text-xs text-gray-600">
                          💡 <strong>Troubleshooting:</strong> If data isn&apos;t syncing on mobile, check that you&apos;re signed in and have internet connection. Visit <code className="bg-gray-100 px-1 rounded">/admin</code> page to see sync status and force sync if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
      </Card>

      {exportOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setExportOpen(false)} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div className="card p-6 border w-full max-w-md">
              <div className="text-lg font-medium">Export Data</div>
              <div className="mt-2 text-sm text-muted-foreground">Export tasks (including backlog) and moods as a JSON file?</div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setExportOpen(false)}>Cancel</Button>
                <Button type="button" onClick={doExport}>Export</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setImportOpen(false)} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div className="card p-6 border w-full max-w-md">
              <div className="text-lg font-medium">Import Data</div>
              <div className="mt-2 text-sm text-muted-foreground">This will replace your current tasks and moods with the JSON file content. Continue?</div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button type="button" onClick={startImport}>Choose File</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChosen}
        className="hidden"
      />
    </div>
  );
}
