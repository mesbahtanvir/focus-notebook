"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock3,
  Cloud,
  Highlighter,
  MonitorSmartphone,
  RefreshCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  ToolPageLayout,
  ToolHeader,
  ToolCard,
  ToolContent,
  ToolGrid,
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
} from "recharts";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";

const connectorTheme = toolThemes.indigo;

const platformMeta = {
  apple: {
    label: "Apple Books",
    badge: "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 dark:from-orange-500/20 dark:to-amber-500/20 dark:text-amber-200",
  },
  kindle: {
    label: "Amazon Kindle",
    badge: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-500/20 dark:to-indigo-500/20 dark:text-indigo-200",
  },
} as const;

type Platform = keyof typeof platformMeta;
type PlatformFilter = Platform | "all";

type AccountStatus = {
  id: Platform;
  libraryCount: number;
  lastSync: string;
  newHighlights: number;
  status: "connected" | "syncing" | "action";
};

const ACCOUNT_STATUS: AccountStatus[] = [
  {
    id: "apple",
    libraryCount: 128,
    lastSync: "Today · 07:12",
    newHighlights: 2,
    status: "connected",
  },
  {
    id: "kindle",
    libraryCount: 214,
    lastSync: "Today · 07:10",
    newHighlights: 5,
    status: "connected",
  },
];

type WeeklyReadingDatum = {
  label: string;
  appleMinutes: number;
  kindleMinutes: number;
};

const WEEKLY_READING: WeeklyReadingDatum[] = [
  { label: "Mon", appleMinutes: 32, kindleMinutes: 18 },
  { label: "Tue", appleMinutes: 48, kindleMinutes: 35 },
  { label: "Wed", appleMinutes: 26, kindleMinutes: 40 },
  { label: "Thu", appleMinutes: 52, kindleMinutes: 20 },
  { label: "Fri", appleMinutes: 20, kindleMinutes: 56 },
  { label: "Sat", appleMinutes: 15, kindleMinutes: 68 },
  { label: "Sun", appleMinutes: 41, kindleMinutes: 32 },
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
};

const ACTIVE_QUEUE: ActiveBook[] = [
  {
    id: "deep-work",
    title: "Deep Work",
    author: "Cal Newport",
    platform: "kindle",
    progress: 68,
    minutesThisWeek: 142,
    lastRead: "Today · 06:45",
    highlights: 12,
  },
  {
    id: "creative-act",
    title: "The Creative Act",
    author: "Rick Rubin",
    platform: "apple",
    progress: 54,
    minutesThisWeek: 96,
    lastRead: "Yesterday · 21:15",
    highlights: 7,
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
  },
];

type Highlight = {
  id: string;
  quote: string;
  context: string;
  book: string;
  platform: Platform;
  added: string;
  tags: string[];
};

const HIGHLIGHTS: Highlight[] = [
  {
    id: "h1",
    quote: "Focus is a force multiplier—protect it like a scarce resource.",
    context: "Chapter 4 · Deep Work",
    book: "Deep Work",
    platform: "kindle",
    added: "Today",
    tags: ["focus", "productivity"],
  },
  {
    id: "h2",
    quote: "Art is the practice of answering the world's questions with your work.",
    context: "Part II · The Creative Act",
    book: "The Creative Act",
    platform: "apple",
    added: "Yesterday",
    tags: ["creativity"],
  },
  {
    id: "h3",
    quote: "Tiny adjustments compound into remarkable change over time.",
    context: "Chapter 1 · Atomic Habits",
    book: "Atomic Habits",
    platform: "kindle",
    added: "2 days ago",
    tags: ["habits", "growth"],
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

const SYNC_LOG: SyncEvent[] = [
  {
    id: "sync-1",
    title: "Highlights imported",
    description: "5 Kindle highlights tagged + deduplicated",
    time: "Today · 07:12",
    status: "completed",
    platform: "kindle",
  },
  {
    id: "sync-2",
    title: "Library delta",
    description: "Apple Books: 2 new titles detected",
    time: "Today · 07:08",
    status: "completed",
    platform: "apple",
  },
  {
    id: "sync-3",
    title: "Streak backup",
    description: "Unified reading streak pushed to vault",
    time: "Yesterday · 21:46",
    status: "completed",
    platform: "unified",
  },
  {
    id: "sync-4",
    title: "Annotation sentiment",
    description: "Queued analysis for 3 new highlights",
    time: "Queued · 8m ago",
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

const AUTOMATIONS: AutomationRecipe[] = [
  {
    id: "automation-1",
    title: "Weekly reading digest",
    description: "Send a summary of new highlights every Sunday evening",
    trigger: "Sunday · 19:00",
    action: "Email via Focus Notebook",
    status: "active",
  },
  {
    id: "automation-2",
    title: "Momentum nudges",
    description: "If Kindle time drops below 20 min/day, post a reminder",
    trigger: "Daily · 20:00",
    action: "Push notification",
    status: "active",
  },
  {
    id: "automation-3",
    title: "Sync to notes vault",
    description: "Export favorited highlights to your Obsidian notebook",
    trigger: "On highlight favorited",
    action: "Markdown append",
    status: "draft",
  },
];

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
};

const CHECKLIST: ChecklistItem[] = [
  {
    id: "auth",
    label: "Connect Apple Books via Shortcuts automation",
    description: "Use the Focus Notebook Shortcut to export your current reading position and highlights.",
    done: true,
  },
  {
    id: "kindle",
    label: "Authorize Kindle Cloud Reader access",
    description: "Grant the connector permission to fetch recent reading progress and notes.",
    done: true,
  },
  {
    id: "tags",
    label: "Configure highlight tagging rules",
    description: "Decide which tags to apply automatically when new highlights arrive.",
    done: false,
  },
  {
    id: "export",
    label: "Select export destinations",
    description: "Choose Notion, Obsidian, or CSV exports for long-term storage.",
    done: false,
  },
];

function SourceBadge({ source }: { source: Platform | "unified" }) {
  if (source === "unified") {
    return (
      <Badge className="border-none bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 dark:from-indigo-500/20 dark:to-purple-500/20 dark:text-indigo-200">
        Unified vault
      </Badge>
    );
  }

  return (
    <Badge className={cn("border-none", platformMeta[source].badge)}>
      {platformMeta[source].label}
    </Badge>
  );
}

function FilterPills({
  active,
  onSelect,
}: {
  active: PlatformFilter;
  onSelect: (value: PlatformFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {["all", "apple", "kindle"].map((value) => (
        <button
          key={value}
          onClick={() => onSelect(value as PlatformFilter)}
          className={cn(
            "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
            active === value
              ? "bg-indigo-600 text-white border-indigo-600"
              : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-indigo-400"
          )}
        >
          {value === "all" ? "All" : platformMeta[value as Platform].label}
        </button>
      ))}
    </div>
  );
}

function AccountStatusCard({ account }: { account: AccountStatus }) {
  const statusText =
    account.status === "connected"
      ? "Connected"
      : account.status === "syncing"
      ? "Syncing"
      : "Action needed";
  const statusClass =
    account.status === "connected"
      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
      : account.status === "syncing"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";

  return (
    <ToolCard className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {platformMeta[account.id].label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {account.libraryCount} titles synced
          </p>
        </div>
        <Badge className={cn("border-none", statusClass)}>{statusText}</Badge>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <RefreshCcw className="h-4 w-4" />
        <span>Last sync · {account.lastSync}</span>
      </div>
      <div className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-300">
        {account.newHighlights} new highlights captured
      </div>
    </ToolCard>
  );
}

function UnifiedVaultCard() {
  return (
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
        <span>Duplicate titles resolved nightly</span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs">
        <Upload className="h-4 w-4" />
        <span>Exports available: Notion · Obsidian · CSV</span>
      </div>
    </ToolCard>
  );
}

function WeeklyMomentumSection({ data }: { data: WeeklyReadingDatum[] }) {
  const totalMinutes = data.reduce((sum, day) => sum + day.appleMinutes + day.kindleMinutes, 0);

  return (
    <ToolCard className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Weekly reading momentum
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Totals include both Apple Books and Kindle sessions
          </p>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          {totalMinutes} minutes captured this week
        </div>
      </div>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="appleGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="kindleGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis dataKey="label" className="text-xs" stroke="#9ca3af" />
            <Tooltip
              formatter={(value: number) => `${value} min`}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ borderRadius: 12, borderColor: "#e0e7ff" }}
            />
            <Area
              type="monotone"
              dataKey="appleMinutes"
              stroke="#fb923c"
              strokeWidth={2}
              fill="url(#appleGradient)"
              name="Apple Books"
            />
            <Area
              type="monotone"
              dataKey="kindleMinutes"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#kindleGradient)"
              name="Kindle"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ToolCard>
  );
}

function ActiveQueueSection({
  books,
  filter,
  onFilterChange,
}: {
  books: ActiveBook[];
  filter: PlatformFilter;
  onFilterChange: (value: PlatformFilter) => void;
}) {
  return (
    <ToolCard className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Active reading queue
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Filter by platform to focus your next session
          </p>
        </div>
        <FilterPills active={filter} onSelect={onFilterChange} />
      </div>
      <ToolList className="mt-4">
        {books.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No books match this filter yet. Pick a different platform to keep the momentum going.
          </div>
        ) : (
          books.map((book) => (
            <div
              key={book.id}
              className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-500/20 dark:to-indigo-400/10">
                  <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{book.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <SourceBadge source={book.platform} />
                    <span className="text-gray-500 dark:text-gray-400">Last read · {book.lastRead}</span>
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
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
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
          ))
        )}
      </ToolList>
    </ToolCard>
  );
}

function HighlightsSection({
  highlights,
  filter,
  onFilterChange,
}: {
  highlights: Highlight[];
  filter: PlatformFilter;
  onFilterChange: (value: PlatformFilter) => void;
}) {
  return (
    <ToolCard className="mt-3">
      <div className="flex items-start justify-between gap-3">
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
      <div className="mt-4">
        <FilterPills active={filter} onSelect={onFilterChange} />
      </div>
      <div className="mt-4 space-y-3">
        {highlights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No highlights for this source yet. Try syncing again to pull the latest notes.
          </div>
        ) : (
          highlights.map((highlight) => (
            <div key={highlight.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-start gap-3">
                <BookMarked className="h-4 w-4 text-indigo-500 mt-1" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">“{highlight.quote}”</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{highlight.context}</span>
                    <span>•</span>
                    <span>{highlight.book}</span>
                    <span>•</span>
                    <span>Added {highlight.added}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <SourceBadge source={highlight.platform} />
                    {highlight.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ToolCard>
  );
}

function SyncActivitySection({ events }: { events: SyncEvent[] }) {
  return (
    <ToolCard className="mt-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Sync activity
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Recent connector jobs across Apple Books and Kindle
          </p>
        </div>
        <MonitorSmartphone className="h-5 w-5 text-indigo-500" />
      </div>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <SourceBadge source={event.platform} />
              <span>{event.time}</span>
              <StatusBadge status={event.status} />
            </div>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

type Status = SyncEvent["status"] | AutomationRecipe["status"];

const STATUS_STYLES: Record<Status, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200",
  queued: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  active: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-200",
};

const STATUS_LABELS: Record<Status, string> = {
  completed: "Completed",
  queued: "Queued",
  "in-progress": "In progress",
  active: "Active",
  draft: "Draft",
};

function StatusBadge({ status }: { status: Status }) {
  return <Badge className={cn("border-none", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}

function AutomationsSection({ recipes }: { recipes: AutomationRecipe[] }) {
  return (
    <ToolCard className="mt-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Automation recipes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Keep your highlights and momentum flowing automatically
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-indigo-500" />
      </div>
      <ToolGrid columns={3} className="mt-4 gap-3">
        {recipes.map((recipe) => (
          <ToolCard key={recipe.id} className="border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{recipe.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{recipe.description}</p>
              </div>
              <StatusBadge status={recipe.status} />
            </div>
            <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                <span>{recipe.trigger}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                <span>{recipe.action}</span>
              </div>
            </div>
          </ToolCard>
        ))}
      </ToolGrid>
    </ToolCard>
  );
}

function ChecklistSection({ items }: { items: ChecklistItem[] }) {
  return (
    <ToolInfoSection
      title="Implementation checklist"
      content={
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border",
                  item.done
                    ? "border-green-200 bg-green-50 text-green-600 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200"
                    : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      }
      theme={connectorTheme}
    />
  );
}

export function ReadingConnectorDashboard({ showHeader = false }: { showHeader?: boolean }) {
  useTrackToolUsage("apple-kindle-connector");

  const [queueFilter, setQueueFilter] = useState<PlatformFilter>("all");
  const [highlightFilter, setHighlightFilter] = useState<PlatformFilter>("all");

  const stats = useMemo(() => {
    const totalMinutes = WEEKLY_READING.reduce(
      (sum, day) => sum + day.appleMinutes + day.kindleMinutes,
      0
    );
    const averageSession = Math.round(totalMinutes / 12);
    return {
      totalMinutes,
      averageSession,
      highlightCount: HIGHLIGHTS.length,
      activeStreak: 12,
    };
  }, []);

  const filteredQueue = useMemo(() => {
    if (queueFilter === "all") {
      return ACTIVE_QUEUE;
    }
    return ACTIVE_QUEUE.filter((book) => book.platform === queueFilter);
  }, [queueFilter]);

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
          subtitle="Monitor unified progress, highlights, and automations across both ecosystems."
          stats={[
            { label: "weekly minutes", value: `${stats.totalMinutes}`, variant: "info" },
            { label: "avg session", value: `${stats.averageSession} min`, variant: "default" },
            { label: "highlights", value: stats.highlightCount, variant: "success" },
            { label: "day streak", value: stats.activeStreak, variant: "warning" },
          ]}
          theme={connectorTheme}
          showBackButton
        />
      )}

      <ToolContent>
        <ToolGrid columns={3} className="gap-3">
          {ACCOUNT_STATUS.map((account) => (
            <AccountStatusCard key={account.id} account={account} />
          ))}
          <UnifiedVaultCard />
        </ToolGrid>

        <WeeklyMomentumSection data={WEEKLY_READING} />
        <ActiveQueueSection books={filteredQueue} filter={queueFilter} onFilterChange={setQueueFilter} />
        <HighlightsSection highlights={filteredHighlights} filter={highlightFilter} onFilterChange={setHighlightFilter} />
        <SyncActivitySection events={SYNC_LOG} />
        <AutomationsSection recipes={AUTOMATIONS} />
        <ChecklistSection items={CHECKLIST} />
      </ToolContent>
    </ToolPageLayout>
  );
}

