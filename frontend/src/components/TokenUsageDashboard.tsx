"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLLMLogs, type LLMLog } from '@/store/useLLMLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Zap,
  TrendingUp,
  Calendar,
  Download,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/services/currency';

interface TokenUsageDashboardProps {
  className?: string;
}

// Pricing per 1K tokens (as of 2024)
const MODEL_PRICING = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
} as const;

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Extract base model name (remove version suffixes)
  const baseModel = model.split('-').slice(0, -1).join('-') || model;

  const pricing = MODEL_PRICING[baseModel as keyof typeof MODEL_PRICING]
    || MODEL_PRICING[model as keyof typeof MODEL_PRICING];

  if (!pricing) {
    // Default pricing for unknown models
    return (promptTokens * 0.0005 + completionTokens * 0.0015) / 1000;
  }

  const inputCost = (promptTokens * pricing.input) / 1000;
  const outputCost = (completionTokens * pricing.output) / 1000;
  return inputCost + outputCost;
}

function extractModelFromLog(log: LLMLog): string {
  // Try to extract model from metadata or rawResponse
  try {
    if (log.metadata?.model) {
      return log.metadata.model;
    }
    // Try parsing rawResponse for model info
    const response = JSON.parse(log.rawResponse);
    if (response.model) {
      return response.model;
    }
  } catch {
    // Ignore parse errors
  }
  return 'gpt-4o-mini'; // Default model
}

interface TokenStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
    requests: number;
  }>;
}

export function TokenUsageDashboard({ className }: TokenUsageDashboardProps) {
  const { user } = useAuth();
  const { logs, subscribe, clear, isLoading } = useLLMLogs();
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  // Subscribe to Firebase logs on mount
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
    return () => {
      clear();
    };
  }, [user?.uid, subscribe, clear]);

  // Transform logs into token usage data with period filtering
  const tokenUsages = useMemo(() => {
    return logs.map((log) => {
      const model = extractModelFromLog(log);
      const promptTokens = log.usage?.prompt_tokens || 0;
      const completionTokens = log.usage?.completion_tokens || 0;
      const totalTokens = log.usage?.total_tokens || promptTokens + completionTokens;
      const cost = calculateCost(model, promptTokens, completionTokens);

      return {
        id: log.id,
        timestamp: log.createdAt || new Date().toISOString(),
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        thoughtId: log.thoughtId,
      };
    }).filter((usage) => {
      // Filter by selected period
      if (selectedPeriod === 'all') return true;
      const days = parseInt(selectedPeriod);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return new Date(usage.timestamp) >= cutoffDate;
    });
  }, [logs, selectedPeriod]);

  // Calculate statistics
  const stats = useMemo((): TokenStats => {
    const totalTokens = tokenUsages.reduce((sum, usage) => sum + usage.totalTokens, 0);
    const totalCost = tokenUsages.reduce((sum, usage) => sum + usage.cost, 0);
    const totalRequests = tokenUsages.length;
    const averageTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;
    const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    // Group by model
    const tokensByModel: Record<string, number> = {};
    const costByModel: Record<string, number> = {};
    tokenUsages.forEach((usage) => {
      tokensByModel[usage.model] = (tokensByModel[usage.model] || 0) + usage.totalTokens;
      costByModel[usage.model] = (costByModel[usage.model] || 0) + usage.cost;
    });

    // Group by day
    const dailyMap: Record<string, { tokens: number; cost: number; requests: number }> = {};
    tokenUsages.forEach((usage) => {
      const date = usage.timestamp.split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { tokens: 0, cost: 0, requests: 0 };
      }
      dailyMap[date].tokens += usage.totalTokens;
      dailyMap[date].cost += usage.cost;
      dailyMap[date].requests += 1;
    });

    const dailyUsage = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalTokens,
      totalCost,
      totalRequests,
      averageTokensPerRequest,
      averageCostPerRequest,
      tokensByModel,
      costByModel,
      dailyUsage,
    };
  }, [tokenUsages]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const handleExport = () => {
    const headers = ['Date', 'Model', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Cost (USD)', 'Thought ID'];
    const rows = tokenUsages.map((usage) => [
      new Date(usage.timestamp).toLocaleDateString(),
      usage.model,
      usage.promptTokens.toString(),
      usage.completionTokens.toString(),
      usage.totalTokens.toString(),
      usage.cost.toFixed(6),
      usage.thoughtId || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-usage-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Token Usage Dashboard</CardTitle>
          <CardDescription>Loading token usage data from Firebase...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Token Usage Dashboard</CardTitle>
          <CardDescription>Please sign in to view your token usage</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Token Usage Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your AI API usage and costs (synced from Firebase)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} size="sm" disabled={tokenUsages.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[
          { value: '7', label: '7 Days' },
          { value: '30', label: '30 Days' },
          { value: '90', label: '90 Days' },
          { value: 'all', label: 'All Time' },
        ].map((period) => (
          <Button
            key={period.value}
            variant={selectedPeriod === period.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period.value as any)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {tokenUsages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No token usage data yet</p>
              <p className="text-sm">
                Token usage will appear here once you start processing thoughts with AI
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalCost, 'USD', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalRequests} requests
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(Math.round(stats.averageTokensPerRequest))} avg per request
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Cost/Request</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.averageCostPerRequest, 'USD', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
                  <p className="text-xs text-muted-foreground">
                    Per API call
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Models Used</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(stats.tokensByModel).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Different models
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="models" className="space-y-4">
            <TabsList>
              <TabsTrigger value="models">By Model</TabsTrigger>
              <TabsTrigger value="daily">Daily Usage</TabsTrigger>
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="models" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Model</CardTitle>
                  <CardDescription>
                    Token consumption and costs broken down by AI model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.tokensByModel).map(([model, tokens]) => (
                      <div key={model} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">{model}</Badge>
                          <div>
                            <div className="font-medium">{formatNumber(tokens)} tokens</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(stats.costByModel[model] || 0, 'USD', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} cost
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {((tokens / stats.totalTokens) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">of total usage</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Usage Trend</CardTitle>
                  <CardDescription>
                    Token usage and costs over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.dailyUsage.slice(-14).map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {day.requests} requests
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatNumber(day.tokens)} tokens</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(day.cost, 'USD', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest API calls and their token usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tokenUsages.slice(0, 10).map((usage) => (
                      <div key={usage.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="font-medium text-sm">{usage.model}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(usage.timestamp).toLocaleString()}
                            </div>
                            {usage.thoughtId && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                Thought: {usage.thoughtId.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">
                            {formatNumber(usage.totalTokens)} tokens
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(usage.cost, 'USD', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
