"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  ChevronLeft,
  Volume2,
  Bell,
  Moon,
  Sun,
  Palette,
  Clock,
  Headphones,
  Heart,
  Sparkles,
  Smartphone,
  Monitor,
  Globe,
  Music,
  Play
} from "lucide-react";

interface Setting {
  id: string;
  title: string;
  description: string;
  type: 'toggle' | 'select' | 'slider' | 'button';
  value?: any;
  options?: string[];
  min?: number;
  max?: number;
  icon: React.ElementType;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    // Audio Settings
    backgroundMusic: true,
    natureSounds: false,
    binauralBeats: false,
    volume: 70,
    autoPlay: false,
    
    // Visual Settings
    darkMode: false,
    animations: true,
    particles: true,
    theme: 'ocean',
    
    // Session Settings
    defaultDuration: 15,
    reminderEnabled: true,
    reminderTime: '09:00',
    hapticFeedback: true,
    
    // Integration Settings
    spotifyConnected: false,
    syncAcrossDevices: true,
    offlineMode: false,
    
    // Accessibility
    screenReader: false,
    highContrast: false,
    largeText: false
  });

  const settingCategories = [
    {
      id: 'audio',
      name: 'Audio Settings',
      icon: Volume2,
      settings: [
        {
          id: 'backgroundMusic',
          title: 'Background Music',
          description: 'Play ambient music during sessions',
          type: 'toggle' as const,
          value: settings.backgroundMusic,
          icon: Music
        },
        {
          id: 'natureSounds',
          title: 'Nature Sounds',
          description: 'Include nature sound effects',
          type: 'toggle' as const,
          value: settings.natureSounds,
          icon: Globe
        },
        {
          id: 'binauralBeats',
          title: 'Binaural Beats',
          description: 'Use brainwave entrainment frequencies',
          type: 'toggle' as const,
          value: settings.binauralBeats,
          icon: Headphones
        },
        {
          id: 'volume',
          title: 'Default Volume',
          description: 'Set the default audio volume',
          type: 'slider' as const,
          value: settings.volume,
          min: 0,
          max: 100,
          icon: Volume2
        },
        {
          id: 'autoPlay',
          title: 'Auto-Play',
          description: 'Automatically start music when session begins',
          type: 'toggle' as const,
          value: settings.autoPlay,
          icon: Play
        }
      ]
    },
    {
      id: 'visual',
      name: 'Visual Settings',
      icon: Palette,
      settings: [
        {
          id: 'darkMode',
          title: 'Dark Mode',
          description: 'Use dark theme for better nighttime experience',
          type: 'toggle' as const,
          value: settings.darkMode,
          icon: Moon
        },
        {
          id: 'animations',
          title: 'Animations',
          description: 'Enable smooth animations and transitions',
          type: 'toggle' as const,
          value: settings.animations,
          icon: Sparkles
        },
        {
          id: 'particles',
          title: 'Particle Effects',
          description: 'Show floating particles in background',
          type: 'toggle' as const,
          value: settings.particles,
          icon: Sparkles
        },
        {
          id: 'theme',
          title: 'Color Theme',
          description: 'Choose your preferred color scheme',
          type: 'select' as const,
          value: settings.theme,
          options: ['ocean', 'sunset', 'forest', 'cosmic', 'minimal'],
          icon: Palette
        }
      ]
    },
    {
      id: 'session',
      name: 'Session Settings',
      icon: Clock,
      settings: [
        {
          id: 'defaultDuration',
          title: 'Default Duration',
          description: 'Default session length in minutes',
          type: 'slider' as const,
          value: settings.defaultDuration,
          min: 5,
          max: 60,
          icon: Clock
        },
        {
          id: 'reminderEnabled',
          title: 'Daily Reminders',
          description: 'Get reminded to meditate daily',
          type: 'toggle' as const,
          value: settings.reminderEnabled,
          icon: Bell
        },
        {
          id: 'reminderTime',
          title: 'Reminder Time',
          description: 'What time to send daily reminders',
          type: 'select' as const,
          value: settings.reminderTime,
          options: ['06:00', '08:00', '09:00', '12:00', '18:00', '20:00'],
          icon: Clock
        },
        {
          id: 'hapticFeedback',
          title: 'Haptic Feedback',
          description: 'Vibrate on phase changes (mobile only)',
          type: 'toggle' as const,
          value: settings.hapticFeedback,
          icon: Smartphone
        }
      ]
    },
    {
      id: 'integration',
      name: 'Integrations',
      icon: Globe,
      settings: [
        {
          id: 'spotifyConnected',
          title: 'Spotify Connection',
          description: 'Connect your Spotify account for music',
          type: 'button' as const,
          value: settings.spotifyConnected,
          icon: Headphones
        },
        {
          id: 'syncAcrossDevices',
          title: 'Sync Across Devices',
          description: 'Sync meditation data between devices',
          type: 'toggle' as const,
          value: settings.syncAcrossDevices,
          icon: Monitor
        },
        {
          id: 'offlineMode',
          title: 'Offline Mode',
          description: 'Download sessions for offline use',
          type: 'toggle' as const,
          value: settings.offlineMode,
          icon: Smartphone
        }
      ]
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      icon: Heart,
      settings: [
        {
          id: 'screenReader',
          title: 'Screen Reader',
          description: 'Optimize for screen readers',
          type: 'toggle' as const,
          value: settings.screenReader,
          icon: Monitor
        },
        {
          id: 'highContrast',
          title: 'High Contrast',
          description: 'Increase contrast for better visibility',
          type: 'toggle' as const,
          value: settings.highContrast,
          icon: Sun
        },
        {
          id: 'largeText',
          title: 'Large Text',
          description: 'Increase text size for better readability',
          type: 'toggle' as const,
          value: settings.largeText,
          icon: Monitor
        }
      ]
    }
  ];

  const handleSettingChange = (settingId: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [settingId]: value
    }));
  };

  const renderSettingControl = (setting: Setting) => {
    switch (setting.type) {
      case 'toggle':
        return (
          <button
            onClick={() => handleSettingChange(setting.id, !setting.value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              setting.value ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                setting.value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );
      
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            className="px-3 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {setting.options?.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'slider':
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              value={setting.value}
              onChange={(e) => handleSettingChange(setting.id, parseInt(e.target.value))}
              className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
              {setting.value}
            </span>
          </div>
        );
      
      case 'button':
        return (
          <button
            onClick={() => {
              // Handle Spotify connection
              if (setting.id === 'spotifyConnected') {
                window.open('https://accounts.spotify.com/authorize', '_blank');
                handleSettingChange(setting.id, !setting.value);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              setting.value
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {setting.value ? 'Connected' : 'Connect'}
          </button>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-400/20 to-orange-400/20 blur-3xl"
            style={{
              width: `${200 + i * 30}px`,
              height: `${200 + i * 30}px`,
              left: `${10 + i * 15}%`,
              top: `${5 + i * 12}%`,
            }}
            animate={{
              x: [0, 20, -15, 0],
              y: [0, -15, 20, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Meditation Settings
          </h1>
          <div className="w-9 h-9" />
        </div>

        {/* Settings Categories */}
        <div className="space-y-6">
          {settingCategories.map((category, categoryIndex) => {
            const IconComponent = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <IconComponent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {category.name}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {category.settings.map((setting, settingIndex) => {
                    const SettingIcon = setting.icon;
                    return (
                      <motion.div
                        key={setting.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: categoryIndex * 0.1 + settingIndex * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <SettingIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {setting.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {setting.description}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4">
                          {renderSettingControl(setting)}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            Save Settings
          </button>
        </motion.div>

        {/* Reset Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            Reset to Default Settings
          </button>
        </motion.div>
      </div>
    </div>
  );
}
