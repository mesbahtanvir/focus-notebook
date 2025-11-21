"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Volume2,
  ChevronLeft,
  Headphones,
  Radio,
  Waves,
  TreePine,
  Cloud,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  type: 'spotify' | 'nature' | 'binaural' | 'whitenoise';
  url?: string;
  preview?: string;
  color: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: MusicTrack[];
  color: string;
  icon: React.ElementType;
}

const playlists: Playlist[] = [
  {
    id: "meditation",
    name: "Meditation Classics",
    description: "Curated meditation tracks from Spotify",
    color: "from-purple-400 to-pink-400",
    icon: Headphones,
    tracks: [
      {
        id: "1",
        title: "Weightless",
        artist: "Marconi Union",
        duration: "8:08",
        type: "spotify",
        color: "from-purple-400 to-pink-400"
      },
      {
        id: "2",
        title: "Om Mani Padme Hum",
        artist: "Deva Premal",
        duration: "9:15",
        type: "spotify",
        color: "from-purple-400 to-pink-400"
      },
      {
        id: "3",
        title: "Deep Meditation",
        artist: "Parijat",
        duration: "12:30",
        type: "spotify",
        color: "from-purple-400 to-pink-400"
      }
    ]
  },
  {
    id: "nature",
    name: "Nature Sounds",
    description: "Calming sounds from nature",
    color: "from-green-400 to-teal-400",
    icon: TreePine,
    tracks: [
      {
        id: "4",
        title: "Ocean Waves",
        artist: "Nature Sounds",
        duration: "∞",
        type: "nature",
        color: "from-green-400 to-teal-400"
      },
      {
        id: "5",
        title: "Rain Forest",
        artist: "Nature Sounds",
        duration: "∞",
        type: "nature",
        color: "from-green-400 to-teal-400"
      },
      {
        id: "6",
        title: "Mountain Stream",
        artist: "Nature Sounds",
        duration: "∞",
        type: "nature",
        color: "from-green-400 to-teal-400"
      }
    ]
  },
  {
    id: "binaural",
    name: "Binaural Beats",
    description: "Brainwave entrainment frequencies",
    color: "from-blue-400 to-indigo-400",
    icon: Waves,
    tracks: [
      {
        id: "7",
        title: "Alpha Waves (8-12 Hz)",
        artist: "Binaural Beats Lab",
        duration: "30:00",
        type: "binaural",
        color: "from-blue-400 to-indigo-400"
      },
      {
        id: "8",
        title: "Theta Waves (4-8 Hz)",
        artist: "Binaural Beats Lab",
        duration: "30:00",
        type: "binaural",
        color: "from-blue-400 to-indigo-400"
      },
      {
        id: "9",
        title: "Delta Waves (0.5-4 Hz)",
        artist: "Binaural Beats Lab",
        duration: "45:00",
        type: "binaural",
        color: "from-blue-400 to-indigo-400"
      }
    ]
  },
  {
    id: "ambient",
    name: "Ambient & White Noise",
    description: "Background sounds for focus",
    color: "from-orange-400 to-red-400",
    icon: Cloud,
    tracks: [
      {
        id: "10",
        title: "White Noise",
        artist: "Sound Therapy",
        duration: "∞",
        type: "whitenoise",
        color: "from-orange-400 to-red-400"
      },
      {
        id: "11",
        title: "Pink Noise",
        artist: "Sound Therapy",
        duration: "∞",
        type: "whitenoise",
        color: "from-orange-400 to-red-400"
      },
      {
        id: "12",
        title: "Brown Noise",
        artist: "Sound Therapy",
        duration: "∞",
        type: "whitenoise",
        color: "from-orange-400 to-red-400"
      }
    ]
  }
];

export default function MusicPage() {
  const router = useRouter();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist>(playlists[0]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  const handleTrackSelect = (track: MusicTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (currentTrack) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpotifyConnect = () => {
    // In a real implementation, this would initiate OAuth flow
    window.open('https://accounts.spotify.com/authorize', '_blank', 'width=400,height=600');
    // For demo purposes, we'll just set it to true
    setTimeout(() => setIsSpotifyConnected(true), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-400/20 to-orange-400/20 blur-3xl"
            style={{
              width: `${180 + i * 35}px`,
              height: `${180 + i * 35}px`,
              left: `${12 + i * 11}%`,
              top: `${8 + i * 9}%`,
            }}
            animate={{
              x: [0, 30, -25, 0],
              y: [0, -25, 30, 0],
              scale: [1, 1.4, 0.7, 1],
            }}
            transition={{
              duration: 16 + i * 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
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
            Meditation Music
          </h1>
          <button className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-colors">
            <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Spotify Connection Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {!isSpotifyConnected ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Music className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Connect Spotify</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Access millions of meditation tracks and playlists
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSpotifyConnect}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Headphones className="h-4 w-4" />
                  Connect
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Music className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Spotify Connected</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Premium features available
                    </p>
                  </div>
                </div>
                <button className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Playlist Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {playlists.map((playlist) => {
            const IconComponent = playlist.icon;
            return (
              <button
                key={playlist.id}
                onClick={() => setSelectedPlaylist(playlist)}
                className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  selectedPlaylist.id === playlist.id
                    ? `bg-gradient-to-r ${playlist.color} text-white shadow-lg`
                    : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <IconComponent className="h-8 w-8" />
                  <div className="font-bold text-center">{playlist.name}</div>
                  <div className="text-xs opacity-80 text-center">{playlist.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Track List */}
          <div className="lg:col-span-2">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <selectedPlaylist.icon className="h-5 w-5" />
                {selectedPlaylist.name}
              </h3>
              <div className="space-y-2">
                {selectedPlaylist.tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      currentTrack?.id === track.id
                        ? `bg-gradient-to-r ${track.color} text-white shadow-lg`
                        : 'bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60'
                    }`}
                    onClick={() => handleTrackSelect(track)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                          {currentTrack?.id === track.id && isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{track.title}</div>
                          <div className={`text-sm ${currentTrack?.id === track.id ? 'opacity-80' : 'text-gray-600 dark:text-gray-400'}`}>
                            {track.artist}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${currentTrack?.id === track.id ? 'opacity-80' : 'text-gray-600 dark:text-gray-400'}`}>
                          {track.duration}
                        </span>
                        {track.type === 'spotify' && (
                          <ExternalLink className="h-4 w-4 opacity-60" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Now Playing */}
          <div className="lg:col-span-1">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Now Playing</h3>
              
              {currentTrack ? (
                <div className="space-y-4">
                  {/* Album Art Placeholder */}
                  <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${currentTrack.color} flex items-center justify-center shadow-lg`}>
                    <Music className="h-16 w-16 text-white opacity-80" />
                  </div>

                  {/* Track Info */}
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">
                      {currentTrack.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentTrack.artist}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: isPlaying ? "60%" : "30%" }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>2:15</span>
                      <span>{currentTrack.duration}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <SkipBack className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className={`p-3 rounded-full bg-gradient-to-r ${currentTrack.color} text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <SkipForward className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Volume</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Music className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a track to start playing
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-3 mb-2">
              <Radio className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Live Streaming</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Continuous playback with smooth transitions
            </p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Smart Recommendations</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered music matching your meditation style
            </p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-3 mb-2">
              <Volume2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Audio Quality</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              High-quality streaming for immersive experience
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
