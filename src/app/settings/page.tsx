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
import { syncToCloud, syncFromCloud } from '@/lib/cloudSync'
import { useAuth } from '@/contexts/AuthContext'
import { Cloud, CloudOff, RefreshCw, Upload } from 'lucide-react'

type SettingsFormValues = {
  allowBackgroundProcessing: boolean;
  openaiApiKey: string;
  notificationEnabled: boolean;
  autoSave: boolean;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { register, handleSubmit, setValue, watch } = useForm<SettingsFormValues>({
    defaultValues: {
      allowBackgroundProcessing: false,
      openaiApiKey: '',
      notificationEnabled: true,
      autoSave: true,
    },
  });
  const [syncing, setSyncing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
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
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setValue]);

  const onSubmit = (data: SettingsFormValues) => {
    try {
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(data));

      toast({
        title: 'Settings saved',
        description: 'Your settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
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
  const notificationEnabled = watch('notificationEnabled');
  const autoSave = watch('autoSave');

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
          <CardDescription className="text-gray-600 font-medium">Manage your application preferences</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="p-8 space-y-8">
            {/* General Settings Section */}
            <div className="space-y-6">
              {/* Background Processing */}
              <div className="flex items-center justify-between py-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="allowBackgroundProcessing" className="text-base font-semibold text-gray-800">Background Processing</Label>
                  <p className="text-sm text-gray-600">
                    Enable to allow the app to process data in the background
                  </p>
                </div>
                <Switch
                  id="allowBackgroundProcessing"
                  checked={allowBackgroundProcessing}
                  onCheckedChange={(checked) => setValue('allowBackgroundProcessing', checked)}
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between py-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="notificationEnabled" className="text-base font-semibold text-gray-800">Enable Notifications</Label>
                  <p className="text-sm text-gray-600">
                    Receive notifications for important updates
                  </p>
                </div>
                <Switch
                  id="notificationEnabled"
                  checked={notificationEnabled}
                  onCheckedChange={(checked) => setValue('notificationEnabled', checked)}
                />
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between py-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="autoSave" className="text-base font-semibold text-gray-800">Auto Save</Label>
                  <p className="text-sm text-gray-600">
                    Automatically save changes
                  </p>
                </div>
                <Switch
                  id="autoSave"
                  checked={autoSave}
                  onCheckedChange={(checked) => setValue('autoSave', checked)}
                />
              </div>

              {/* OpenAI API Key */}
              <div className="space-y-3 py-4">
                <Label htmlFor="openaiApiKey" className="text-base font-semibold text-gray-800">OpenAI API Key</Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  placeholder="sk-..."
                  {...register('openaiApiKey')}
                  className="max-w-md"
                />
                <p className="text-sm text-gray-600">
                  Your API key is stored locally and never sent to our servers
                </p>
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
                        Your data automatically syncs to the cloud every 5 minutes. You can access it from any device by signing in with the same account. No configuration needed!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="border-t-4 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
            <button 
              type="submit"
              className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              💾 Save Changes
            </button>
          </CardFooter>
        </form>
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
