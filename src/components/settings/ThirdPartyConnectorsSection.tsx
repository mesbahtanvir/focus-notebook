"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Cloud,
  Layers,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConnectorStatus = "connected" | "disconnected" | "action-required";

type ConnectorDefinition = {
  id: string;
  name: string;
  vendor: string;
  description: string;
  accent: string;
  tags: string[];
  dataTypes: string[];
  docsUrl: string;
  defaultStatus: ConnectorStatus;
  lastSync: string | null;
};

const CONNECTORS: ConnectorDefinition[] = [
  {
    id: "apple-books",
    name: "Apple Books",
    vendor: "Apple",
    description:
      "Sync your current reads, progress, and curated highlights from your Apple library.",
    accent: "from-orange-400 to-amber-500",
    tags: ["Reading", "Highlights"],
    dataTypes: ["Reading progress", "Highlights", "Collections"],
    docsUrl: "https://support.apple.com/en-us/HT201650",
    defaultStatus: "connected",
    lastSync: "Today · 7:12 AM",
  },
  {
    id: "amazon-kindle",
    name: "Amazon Kindle",
    vendor: "Amazon",
    description:
      "Keep Kindle position, notes, and popular highlights aligned with your reading queue.",
    accent: "from-indigo-500 to-purple-500",
    tags: ["Reading", "Notes"],
    dataTypes: ["Reading progress", "Highlights", "Annotations"],
    docsUrl: "https://www.amazon.com/kindle-dbs/hz/help",
    defaultStatus: "connected",
    lastSync: "Today · 7:10 AM",
  },
  {
    id: "pocket",
    name: "Pocket",
    vendor: "Mozilla",
    description:
      "Bring saved articles into your backlog so you can schedule time to read them.",
    accent: "from-rose-400 to-pink-500",
    tags: ["Articles", "Queue"],
    dataTypes: ["Saved articles", "Tags", "Estimated reading time"],
    docsUrl: "https://help.getpocket.com/",
    defaultStatus: "disconnected",
    lastSync: null,
  },
  {
    id: "notion-reading",
    name: "Notion Reading Database",
    vendor: "Notion",
    description:
      "Push consolidated reading progress into a Notion database for cross-project visibility.",
    accent: "from-slate-500 to-gray-700",
    tags: ["Workspace", "Sync"],
    dataTypes: ["Reading progress", "Highlights", "Completion status"],
    docsUrl: "https://www.notion.so/help/",
    defaultStatus: "action-required",
    lastSync: "Yesterday · 5:42 PM",
  },
  {
    id: "kobo",
    name: "Kobo",
    vendor: "Rakuten",
    description:
      "Mirror Kobo library updates and device reading stats when you're outside the Kindle ecosystem.",
    accent: "from-cyan-400 to-blue-500",
    tags: ["Reading", "Devices"],
    dataTypes: ["Reading progress", "Library", "Awards"],
    docsUrl: "https://help.kobo.com/hc/en-us",
    defaultStatus: "disconnected",
    lastSync: null,
  },
];

const STATUS_META: Record<ConnectorStatus, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  disconnected: {
    label: "Not connected",
    className:
      "border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
  },
  "action-required": {
    label: "Action required",
    className:
      "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
};

type ConnectorState = {
  status: ConnectorStatus;
  lastSync: string | null;
};

export function ThirdPartyConnectorsSection() {
  const [states, setStates] = useState<Record<string, ConnectorState>>(() =>
    CONNECTORS.reduce((acc, connector) => {
      acc[connector.id] = {
        status: connector.defaultStatus,
        lastSync: connector.lastSync,
      };
      return acc;
    }, {} as Record<string, ConnectorState>)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);

  const totals = useMemo(() => {
    const connected = Object.values(states).filter(
      (state) => state.status === "connected"
    ).length;
    const attention = Object.values(states).filter(
      (state) => state.status === "action-required"
    ).length;

    return {
      connected,
      attention,
      total: CONNECTORS.length,
    };
  }, [states]);

  const filteredConnectors = useMemo(() => {
    return CONNECTORS.filter((connector) => {
      const state = states[connector.id];
      if (showConnectedOnly && state.status !== "connected") {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const haystack = [
        connector.name,
        connector.vendor,
        connector.description,
        ...connector.tags,
        ...connector.dataTypes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [showConnectedOnly, searchTerm, states]);

  const handleToggleConnection = (id: string) => {
    setStates((prev) => {
      const current = prev[id];
      const nextStatus: ConnectorStatus =
        current.status === "connected" ? "disconnected" : "connected";

      return {
        ...prev,
        [id]: {
          status: nextStatus,
          lastSync:
            nextStatus === "connected"
              ? `Just now · ${new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : null,
        },
      };
    });
  };

  const resolveAttention = (id: string) => {
    setStates((prev) => ({
      ...prev,
      [id]: {
        status: "connected",
        lastSync: `Just now · ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      },
    }));
  };

  return (
    <section className="pt-8 space-y-6 border-t-4 border-green-200">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-inner">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Reading Connectors
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">
              Manage secure connections to Apple Books, Kindle, and other third-party
              services so your reading progress and highlights stay in sync across
              Focus Notebook.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search connectors"
            className="w-full sm:w-64"
          />
          <Button
            type="button"
            variant={showConnectedOnly ? "default" : "outline"}
            onClick={() => setShowConnectedOnly((prev) => !prev)}
            className={cn(
              showConnectedOnly
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                : ""
            )}
          >
            {showConnectedOnly ? "Showing connected" : "Show connected only"}
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-emerald-800 dark:text-emerald-200">
            Connection overview
          </CardTitle>
          <CardDescription className="text-sm text-emerald-700/80 dark:text-emerald-200/70">
            Track the health of your third-party integrations at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/70 dark:bg-emerald-900/40 p-4 border border-emerald-200/70 dark:border-emerald-800/80">
              <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300 mb-1">
                Connected
              </p>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-100">
                {totals.connected} / {totals.total}
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
                Active connectors keeping data in sync
              </p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-emerald-900/40 p-4 border border-emerald-200/70 dark:border-emerald-800/80">
              <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300 mb-1">
                Needs attention
              </p>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-100">
                {totals.attention}
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
                Reconnect to restore automation flows
              </p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-emerald-900/40 p-4 border border-emerald-200/70 dark:border-emerald-800/80">
              <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300 mb-1">
                Coverage
              </p>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-100">
                {Math.round((totals.connected / totals.total) * 100)}%
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
                Share of your library with live integrations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredConnectors.map((connector) => {
          const state = states[connector.id];
          const status = STATUS_META[state.status];
          const isConnected = state.status === "connected";
          const isAttention = state.status === "action-required";

          return (
            <Card
              key={connector.id}
              className="border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
            >
              <CardHeader className="flex flex-col gap-3 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-xl text-white shadow-md bg-gradient-to-br",
                        connector.accent
                      )}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                        {connector.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                        {connector.vendor}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={cn("text-xs font-medium", status.className)}>
                    {status.label}
                  </Badge>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {connector.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {connector.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <Layers className="h-4 w-4 mt-1 text-emerald-500" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Data synced
                      </p>
                      <ul className="mt-1 space-y-1">
                        {connector.dataTypes.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      <span>
                        Last sync: {state.lastSync ?? "Not yet connected"}
                      </span>
                    </div>
                    <a
                      href={connector.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300 hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      View setup guide
                    </a>
                  </div>

                  <div className="flex gap-2">
                    {isAttention ? (
                      <Button
                        type="button"
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                        onClick={() => resolveAttention(connector.id)}
                      >
                        Reconnect now
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant={isConnected ? "outline" : "default"}
                        className={cn(
                          !isConnected
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                            : ""
                        )}
                        onClick={() => handleToggleConnection(connector.id)}
                      >
                        {isConnected ? "Disconnect" : "Connect"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredConnectors.length === 0 && (
          <Card className="border-dashed border-2 border-gray-300 dark:border-gray-700">
            <CardContent className="py-12 text-center space-y-3">
              <div className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-3 mx-auto">
                <Cloud className="h-5 w-5 text-gray-500" />
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                No connectors match your filters yet
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Try clearing the search or showing all connectors to explore available integrations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

