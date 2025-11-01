"use client";

import { useMemo, useState } from "react";
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock3,
  Highlighter,
  MonitorSmartphone,
  RefreshCcw,
  Sparkles,
  Cloud,
  Upload,
} from "lucide-react";
import {
  ToolPageLayout,
  ToolHeader,
  ToolCard,
  ToolGrid,
  ToolContent,
  ToolList,
  ToolInfoSection,
  toolThemes,
} from "@/components/tools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";

const connectorTheme = toolThemes.indigo;

type Platform = "apple" | "kindle";

type AccountStatus = {
  id: Platform;
  name: string;
  status: "connected" | "syncing" | "action";
  lastSync: string;
  libraryCount: number;
  newHighlights: number;
};

const CONNECTED_ACCOUNTS: AccountStatus[] = [
  {
    id: "apple",
    name: "Apple Books",
    status: "connected",
    lastSync: "Today at 7:12 AM",
    libraryCount: 128,
    newHighlights: 2,
  },
  {
    id: "kindle",
    name: "Amazon Kindle",
    status: "connected",
    lastSync: "Today at 7:10 AM",
    libraryCount: 214,
    newHighlights: 5,
  },
];

type WeeklyReadingDatum = {
  label: string;
  appleMinutes: number;
  kindleMinutes: number;
  totalSessions: number;
};

const WEEKLY_READING: WeeklyReadingDatum[] = [
  { label: "Mon", appleMinutes: 32, kindleMinutes: 18, totalSessions: 3 },
  { label: "Tue", appleMinutes: 48, kindleMinutes: 35, totalSessions: 4 },
  { label: "Wed", appleMinutes: 26, kindleMinutes: 40, totalSessions: 3 },
  { label: "Thu", appleMinutes: 52, kindleMinutes: 20, totalSessions: 4 },
  { label: "Fri", appleMinutes: 20, kindleMinutes: 56, totalSessions: 3 },
  { label: "Sat", appleMinutes: 15, kindleMinutes: 68, totalSessions: 4 },
  { label: "Sun", appleMinutes: 41, kindleMinutes: 32, totalSessions: 3 },
];

type ActiveBook = {
  id: string;
  title: string;
  author: string;
  platform: Platform;
  progress: number;
  minutesThisWeek: number;
  lastRead: string;
  highlights: number;
  coverColor: string;
};

const ACTIVE_BOOKS: ActiveBook[] = [
  {
    id: "deep-work",
    title: "Deep Work",
    author: "Cal Newport",
    platform: "kindle",
    progress: 68,
    minutesThisWeek: 142,
    lastRead: "Today at 6:45 AM",
    highlights: 12,
    coverColor: "from-amber-200 to-orange-400",
  },
  {
    id: "creative-act",
    title: "The Creative Act",
    author: "Rick Rubin",
    platform: "apple",
    progress: 54,
    minutesThisWeek: 96,
    lastRead: "Yesterday at 9:15 PM",
    highlights: 7,
    coverColor: "from-emerald-200 to-emerald-500",
  },
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    platform: "kindle",
    progress: 82,
    minutesThisWeek: 75,
    lastRead: "2 days ago",
    highlights: 18,
    coverColor: "from-blue-200 to-indigo-500",
  },
  {
    id: "flow",
    title: "Flow",
    author: "Mihaly Csikszentmihalyi",
    platform: "apple",
    progress: 37,
    minutesThisWeek: 58,
    lastRead: "3 days ago",
    highlights: 5,
    coverColor: "from-rose-200 to-pink-500",
  },
];

type Highlight = {
  id: string;
  quote: string;
  context: string;
  book: string;
  platform: Platform;
  added: string;
  sentiment?: "positive" | "insight" | "question";
  tags: string[];
};

const HIGHLIGHTS: Highlight[] = [
  {
    id: "h1",
    quote:
      "Focus is a force multiplier on your efforts, so guard it relentlessly.",
    context: "Chapter 4 · Deep Work",
    book: "Deep Work",
    platform: "kindle",
    added: "Today",
    sentiment: "insight",
    tags: ["focus", "productivity"],
  },
  {
    id: "h2",
    quote: "Art is a conversation with the world. The work answers the call.",
    context: "Part II · The Creative Act",
    book: "The Creative Act",
    platform: "apple",
    added: "Yesterday",
    sentiment: "positive",
    tags: ["creativity", "mindset"],
  },
  {
    id: "h3",
    quote: "Small improvements compound into remarkable results over time.",
    context: "Chapter 1 · Atomic Habits",
    book: "Atomic Habits",
    platform: "kindle",
    added: "2 days ago",
    sentiment: "insight",
    tags: ["habits", "growth"],
  },
  {
    id: "h4",
    quote:
      "Flow emerges when challenge and skill are both stretched just beyond comfort.",
    context: "Chapter 5 · Flow",
    book: "Flow",
    platform: "apple",
    added: "3 days ago",
    sentiment: "question",
    tags: ["psychology", "performance"],
  },
];

type SyncEvent = {
  id: string;
  title: string;
  description: string;
  time: string;
  status: "completed" | "queued" | "in-progress";
  platform: Platform | "unified";
};

const SYNC_EVENTS: SyncEvent[] = [
  {
    id: "sync-1",
    title: "Highlights imported",
    description: "5 Kindle highlights processed and tagged",
    time: "Today · 7:12 AM",
    status: "completed",
    platform: "kindle",
  },
  {
    id: "sync-2",
    title: "Library delta",
    description: "Apple Books: 2 new titles detected",
    time: "Today · 7:08 AM",
    status: "completed",
    platform: "apple",
  },
  {
    id: "sync-3",
    title: "Streak backup",
    description: "Unified reading streak synced to cloud vault",
    time: "Yesterday · 9:46 PM",
    status: "completed",
    platform: "unified",
  },
  {
    id: "sync-4",
    title: "Annotation sentiment",
    description: "Queued: run sentiment model on 3 fresh highlights",
    time: "Queued · 8 mins ago",
    status: "queued",
    platform: "unified",
  },
];

type AutomationRecipe = {
  id: string;
  title: string;
  description: string;
  trigger: string;
  action: string;
  status: "active" | "draft";
};

const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: "recipe-1",
    title: "Weekly reading digest",
    description: "Send a summary of new highlights every Sunday evening",
    trigger: "Sunday · 7:00 PM",
    action: "Email via Focus Notebook",
    status: "active",
  },
  {
    id: "recipe-2",
    title: "Momentum nudges",
    description: "If Kindle progress drops below 20 mins/day, post a reminder",
    trigger: "Daily · 8:00 PM",
    action: "Push notification",
    status: "active",
  },
  {
    id: "recipe-3",
    title: "Sync to notes vault",
    description: "Export favorited highlights to your Obsidian notebook",
    trigger: "When highlight favorited",
    action: "Markdown append",
    status: "draft",
  },
];

const platformMeta: Record<Platform, { label: string; badgeClass: string }> = {
  apple: {
    label: "Apple Books",
    badgeClass:
      "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 dark:from-orange-500/20 dark:to-amber-500/20 dark:text-amber-200",
  },
  kindle: {
    label: "Kindle",
    badgeClass:
      "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-500/20 dark:to-indigo-500/20 dark:text-indigo-200",
  },
};

interface ReadingConnectorDashboardProps {
  showHeader?: boolean;
}

export function ReadingConnectorDashboard({
  showHeader = false,
}: ReadingConnectorDashboardProps) {
  useTrackToolUsage("apple-kindle-connector");

  const [activePlatformFilter, setActivePlatformFilter] = useState<"all" | Platform>("all");
  const [highlightFilter, setHighlightFilter] = useState<"all" | Platform>("all");

  const stats = useMemo(() => {
    const totalMinutes = WEEKLY_READING.reduce(
      (sum, day) => sum + day.appleMinutes + day.kindleMinutes,
      0
    );
    const totalSessions = WEEKLY_READING.reduce(
      (sum, day) => sum + day.totalSessions,
      0
    );
    const averageSession = totalSessions === 0 ? 0 : Math.round(totalMinutes / totalSessions);
    const highlightCount = HIGHLIGHTS.length;
    const activeStreak = 12;

    return {
      totalMinutes,
      averageSession,
      highlightCount,
      activeStreak,
    };
  }, []);

  const filteredBooks = useMemo(() => {
    if (activePlatformFilter === "all") {
      return ACTIVE_BOOKS;
    }
    return ACTIVE_BOOKS.filter((book) => book.platform === activePlatformFilter);
  }, [activePlatformFilter]);

  const filteredHighlights = useMemo(() => {
    if (highlightFilter === "all") {
      return HIGHLIGHTS;
    }
    return HIGHLIGHTS.filter((highlight) => highlight.platform === highlightFilter);
  }, [highlightFilter]);

  return (
    <ToolPageLayout maxWidth="wide">
      {showHeader && (
        <ToolHeader
          title="Apple Books + Kindle Connector"
          emoji="📚"
          subtitle="Monitor your unified reading streaks, sync highlights, and keep momentum across both ecosystems."
          stats={[
            {
              label: "weekly minutes",
              value: `${stats.totalMinutes}`,
              variant: "info",
            },
            {
              label: "avg session",
              value: `${stats.averageSession} min`,
              variant: "default",
            },
            {
              label: "highlights",
              value: stats.highlightCount,
              variant: "success",
            },
            {
              label: "day streak",
              value: stats.activeStreak,
              variant: "warning",
            },
          ]}
          theme={connectorTheme}
          showBackButton
        />
      )}

      <ToolContent>
        <ToolGrid columns={3} className="gap-3">
          {CONNECTED_ACCOUNTS.map((account) => (
            <ToolCard key={account.id} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {account.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {account.libraryCount} titles synced
                  </p>
                </div>
                <Badge
                  className={cn(
                    "border-none",
                    account.status === "connected"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
                      : account.status === "syncing"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                  )}
                >
                  {account.status === "connected" ? "Connected" : account.status === "syncing" ? "Syncing" : "Action needed"}
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <RefreshCcw className="h-4 w-4" />
                <span>Last sync: {account.lastSync}</span>
              </div>

              <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-300 font-medium">
                {account.newHighlights} new highlights captured
              </div>
            </ToolCard>
          ))}
          <ToolCard className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Unified vault</h3>
                <p className="text-xs text-indigo-100/90">
                  Secure, encrypted snapshot of your reading universe
                </p>
              </div>
              <Cloud className="h-5 w-5" />
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Auto-detected duplicates resolved nightly</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <Upload className="h-4 w-4" />
              <span>Exports available: Notion · Obsidian · CSV</span>
            </div>
          </ToolCard>
        </ToolGrid>
      </ToolContent>

      <ToolCard className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Weekly reading momentum
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Combined time-on-page across Apple Books and Kindle sessions
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">
              Apple Books
            </Badge>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
              Kindle
            </Badge>
          </div>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={WEEKLY_READING}>
              <defs>
                <linearGradient id="appleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="kindleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                stroke="#d1d5db"
              />
              <YAxis
                tickFormatter={(value) => `${value}m`}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                stroke="#d1d5db"
              />
              <Tooltip
                formatter={(value: number, name) => [
                  `${value} min`,
                  name === "appleMinutes" ? "Apple Books" : "Kindle",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.95)",
                  borderRadius: 12,
                  border: "1px solid rgba(75,85,99,0.6)",
                  color: "#f9fafb",
                }}
                labelFormatter={(label) => `Day · ${label}`}
              />
              <Area
                type="monotone"
                dataKey="appleMinutes"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#appleGradient)"
                name="Apple Books"
              />
              <Area
                type="monotone"
                dataKey="kindleMinutes"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#kindleGradient)"
                name="Kindle"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ToolCard>

      <div className="grid gap-3 lg:grid-cols-3">
        <ToolCard className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Active reading queue
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filter by platform to focus your next session
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {["all", "apple", "kindle"].map((value) => (
                <button
                  key={value}
                  onClick={() => setActivePlatformFilter(value as "all" | Platform)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    activePlatformFilter === value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-indigo-400"
                  )}
                >
                  {value === "all" ? "All" : platformMeta[value as Platform].label}
                </button>
              ))}
            </div>
          </div>
          <ToolList className="mt-4">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "h-14 w-12 rounded-lg bg-gradient-to-br shadow-inner",
                      book.coverColor
                    )}
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {book.author}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge className={cn("border-none", platformMeta[book.platform].badgeClass)}>
                        {platformMeta[book.platform].label}
                      </Badge>
                      <span className="text-gray-500 dark:text-gray-400">
                        Last read · {book.lastRead}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 md:px-6">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Progress</span>
                    <span>{book.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <Clock3 className="h-4 w-4" />
                    <span>{book.minutesThisWeek} min this week</span>
                    <Highlighter className="h-4 w-4" />
                    <span>{book.highlights} highlights</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-indigo-600 dark:text-indigo-300">
                  <button className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">
                    Continue reading
                  </button>
                  <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all">
                    View highlights
                  </button>
                </div>
              </div>
            ))}
          </ToolList>
        </ToolCard>

        <ToolCard>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Highlights inbox
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Curate quotes and tag themes across both services
              </p>
            </div>
            <Highlighter className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            {["all", "apple", "kindle"].map((value) => (
              <button
                key={value}
                onClick={() => setHighlightFilter(value as "all" | Platform)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  highlightFilter === value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-indigo-400"
                )}
              >
                {value === "all" ? "All" : platformMeta[value as Platform].label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {filteredHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className="rounded-lg border border-gray-200 dark:border-gray-800 p-3"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-indigo-500 mt-1" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                      “{highlight.quote}”
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{highlight.context}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <span>{highlight.book}</span>
                      <Badge className={cn("border-none", platformMeta[highlight.platform].badgeClass)}>
                        {platformMeta[highlight.platform].label}
                      </Badge>
                      {highlight.sentiment && (
                        <Badge className="border-none bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200">
                          {highlight.sentiment}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <Clock3 className="h-3 w-3" />
                      <span>{highlight.added}</span>
                      {highlight.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredHighlights.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                No highlights yet for this filter.
              </div>
            )}
          </div>
        </ToolCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Sync activity
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Latest jobs keeping your reading universe in parity
              </p>
            </div>
            <MonitorSmartphone className="h-5 w-5 text-indigo-500" />
          </div>
          <ToolList className="mt-4">
            {SYNC_EVENTS.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-start gap-3"
              >
                <div className="mt-1">
                  {event.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : event.status === "in-progress" ? (
                    <RefreshCcw className="h-4 w-4 text-indigo-500 animate-spin" />
                  ) : (
                    <BookMarked className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.title}
                    </span>
                    {event.platform !== "unified" && (
                      <Badge className={cn("border-none", platformMeta[event.platform].badgeClass)}>
                        {platformMeta[event.platform].label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {event.description}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                    {event.time}
                  </p>
                </div>
              </div>
            ))}
          </ToolList>
        </ToolCard>

        <ToolCard>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Automation recipes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create workflows that react to reading signals
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-indigo-500" />
          </div>
          <ToolList className="mt-4">
            {AUTOMATION_RECIPES.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-lg border border-gray-200 dark:border-gray-800 p-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {recipe.title}
                  </h3>
                  <Badge
                    className={cn(
                      "border-none",
                      recipe.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300"
                    )}
                  >
                    {recipe.status === "active" ? "Active" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {recipe.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                    Trigger · {recipe.trigger}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                    Action · {recipe.action}
                  </span>
                </div>
              </div>
            ))}
          </ToolList>
        </ToolCard>
      </div>

      <ToolInfoSection
        title="Implementation checklist"
        content={
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Establish OAuth flows for both Apple Books (via Sign in with Apple) and Amazon, storing refresh tokens with secure
              encryption.
            </li>
            <li>
              Schedule incremental sync jobs: library metadata hourly, highlights every 15 minutes, and reading-position deltas on
              open/close events.
            </li>
            <li>
              Normalize raw data into a unified schema (books, sessions, highlights) to power analytics like streaks and momentum.
            </li>
            <li>
              Provide export adapters for Markdown/CSV and webhook destinations so highlights stay portable.
            </li>
          </ul>
        }
        theme={connectorTheme}
        className="mt-4"
      />
    </ToolPageLayout>
  );
}
