"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from '@/store/useSettings'
import { Key, Eye, EyeOff, Check, X } from 'lucide-react'

type SettingsFormValues = {
  allowBackgroundProcessing: boolean;
  openaiApiKey: string;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { setValue, watch } = useForm<SettingsFormValues>({
    defaultValues: {
      allowBackgroundProcessing: false,
      openaiApiKey: '',
    },
  });
  
  // API Key management
  const { settings, updateSettings, clearApiKey } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  

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

          </CardContent>
      </Card>

    </div>
  );
}
