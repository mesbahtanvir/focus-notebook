"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useThoughts } from "@/store/useThoughts";
import { useSettings } from "@/store/useSettings";
import { useRequestLog } from "@/store/useRequestLog";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  MessageSquare,
  Send,
  ArrowLeft,
  Sparkles,
  Loader2,
  BookOpen,
  Plus,
  Settings,
  Key,
  AlertCircle
} from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function BrainstormingPage() {
  useTrackToolUsage('brainstorming');

  const thoughts = useThoughts((s) => s.thoughts);
  const updateThought = useThoughts((s) => s.updateThought);
  const settings = useSettings((s) => s.settings);
  const hasApiKey = useSettings((s) => s.hasApiKey);
  const addToQueue = useRequestLog((s) => s.addToQueue);
  const updateRequestStatus = useRequestLog((s) => s.updateRequestStatus);
  const router = useRouter();
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get thoughts with brainstorm tag
  const brainstormThoughts = useMemo(() => {
    return thoughts.filter(t => 
      t.tags?.some(tag => tag.toLowerCase().includes('brainstorm'))
    );
  }, [thoughts]);

  const currentThought = useMemo(() => {
    if (!selectedThought) return null;
    return thoughts.find(t => t.id === selectedThought);
  }, [selectedThought, thoughts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load previous conversation from thought notes
  useEffect(() => {
    if (currentThought) {
      // Try to parse conversation from notes
      const conversationMatch = currentThought.notes?.match(/\[BRAINSTORM_CONVERSATION\](.*?)\[\/BRAINSTORM_CONVERSATION\]/s);
      if (conversationMatch) {
        try {
          const parsedMessages = JSON.parse(conversationMatch[1]);
          setMessages(parsedMessages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        } catch (e) {
          console.error('Failed to parse conversation:', e);
          setMessages([]);
        }
      } else {
        // Start fresh conversation
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm here to help you brainstorm about "${currentThought.text}". What would you like to explore?`,
          timestamp: new Date()
        }]);
      }
    }
  }, [currentThought]);

  const handleSendMessage = async () => {
    if (!input.trim() || !currentThought) return;

    // Check if API key is configured
    if (!hasApiKey()) {
      setShowApiKeyWarning(true);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Log request to queue for debug dashboard
    const requestId = addToQueue({
      type: 'api',
      method: 'POST /api/chat',
      url: 'OpenAI Chat Completions',
      request: {
        model: settings.aiModel || 'gpt-3.5-turbo',
        messageCount: messages.length + 2,
        thought: currentThought.text,
      },
    });

    try {
      // Update status to in-progress
      updateRequestStatus(requestId, 'in-progress');

      // Call OpenAI API with user's API key
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: settings.openaiApiKey,
          model: settings.aiModel || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a helpful brainstorming assistant. The user is brainstorming about: "${currentThought.text}". Help them explore ideas, ask thought-provoking questions, and provide creative suggestions. Keep responses concise and engaging.`
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            {
              role: 'user',
              content: input
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Check if setup is needed
      if (data.needsSetup) {
        setShowApiKeyWarning(true);
        updateRequestStatus(requestId, 'failed', {
          error: 'API key not configured',
          response: data,
        });
        const warningMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, warningMessage]);
        return;
      }
      
      // Check if there's an error
      if (data.error) {
        console.error('API Error:', data);
        updateRequestStatus(requestId, 'failed', {
          error: data.message,
          response: data,
          status: data.statusCode,
        });
        const errorMessage: Message = {
          role: 'assistant',
          content: data.message || "I'm having trouble connecting right now. Please try again!",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Mark request as completed
      updateRequestStatus(requestId, 'completed', {
        response: {
          message: data.message,
          messageLength: data.message?.length || 0,
        },
        status: 200,
      });

      // Save conversation to thought notes
      await saveConversation([...messages, userMessage, assistantMessage]);

    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Mark request as failed
      updateRequestStatus(requestId, 'failed', {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      });
      
      // Fallback response
      const fallbackMessage: Message = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your internet connection and try again!",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (msgs: Message[]) => {
    if (!currentThought) return;

    const conversationData = JSON.stringify(msgs);
    const conversationBlock = `[BRAINSTORM_CONVERSATION]${conversationData}[/BRAINSTORM_CONVERSATION]`;
    
    // Update thought notes with conversation
    const currentNotes = currentThought.notes || '';
    const notesWithoutConversation = currentNotes.replace(
      /\[BRAINSTORM_CONVERSATION\].*?\[\/BRAINSTORM_CONVERSATION\]/s,
      ''
    ).trim();
    
    const updatedNotes = notesWithoutConversation 
      ? `${notesWithoutConversation}\n\n${conversationBlock}`
      : conversationBlock;

    await updateThought(currentThought.id, {
      notes: updatedNotes
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (selectedThought && currentThought) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 p-4 border-b-2 border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto">
            <button
              onClick={() => setSelectedThought(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to brainstorms
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{currentThought.text}</h1>
                <p className="text-sm text-muted-foreground">Brainstorming Session</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Warning Banner */}
        {showApiKeyWarning && !hasApiKey() && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-200 dark:border-yellow-800 p-4">
            <div className="container mx-auto max-w-4xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">OpenAI API Key Required</h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    To use AI-powered brainstorming, you need to configure your OpenAI API key in Settings.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/settings')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Go to Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto max-w-4xl">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start mb-4"
              >
                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question or idea..."
                className="flex-1 input min-h-[60px] max-h-[200px] resize-none"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 md:py-8 space-y-6 px-4 md:px-0 max-w-7xl">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full">
            <Lightbulb className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          💡 Brainstorming
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
          AI-powered brainstorming sessions for your ideas
        </p>
      </div>

      {/* API Key Warning */}
      {!hasApiKey() && (
        <div className="card p-6 border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-800/30 rounded-lg shrink-0">
              <Key className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                Setup Required: OpenAI API Key
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                To use AI-powered brainstorming, you need to add your OpenAI API key. 
                This enables real-time conversations with ChatGPT to help you explore and develop your ideas.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push('/settings')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Configure in Settings
                </button>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-yellow-600 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                >
                  Get API Key →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {brainstormThoughts.length === 0 && (
        <div className="card p-6 text-center space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold mb-2">Get Started with Brainstorming</h2>
            <p className="text-muted-foreground mb-4">
              To start a brainstorming session, create a thought with the tag &quot;brainstorm&quot;
            </p>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium mb-2">How it works:</p>
              <ol className="text-sm text-left space-y-2 max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-yellow-600">1.</span>
                  <span>Go to <strong>Thoughts</strong> tool</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-yellow-600">2.</span>
                  <span>Create a new thought with your idea</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-yellow-600">3.</span>
                  <span>Add the tag <strong>&quot;brainstorm&quot;</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-yellow-600">4.</span>
                  <span>Come back here to start your AI-powered session!</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Brainstorm Thoughts List */}
      {brainstormThoughts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Brainstorming Ideas</h2>
            <div className="text-sm text-muted-foreground">
              {brainstormThoughts.length} {brainstormThoughts.length === 1 ? 'idea' : 'ideas'}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brainstormThoughts.map((thought) => (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="card p-6 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedThought(thought.id)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shrink-0">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg line-clamp-2">{thought.text}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(thought.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {thought.tags && thought.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {thought.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Start brainstorming
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
