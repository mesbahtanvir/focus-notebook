"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
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
  connection?:
    | {
        type: "readwise";
        sourceType: "apple_books" | "kindle";
        credentialLabel: string;
        setupHelpUrl: string;
      }
    | {
        type: "comingSoon";
      };
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
    defaultStatus: "disconnected",
    lastSync: null,
    connection: {
      type: "readwise",
      sourceType: "apple_books",
      credentialLabel: "Readwise API token",
      setupHelpUrl: "https://readwise.io/access_token",
    },
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
    defaultStatus: "disconnected",
    lastSync: null,
    connection: {
      type: "readwise",
      sourceType: "kindle",
      credentialLabel: "Readwise API token",
      setupHelpUrl: "https://readwise.io/access_token",
    },
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
    connection: { type: "comingSoon" },
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
    connection: { type: "comingSoon" },
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
    connection: { type: "comingSoon" },
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

type ConnectorSyncPayload = {
  syncedAt: string;
  totals: {
    books: number;
    highlights: number;
    notes: number;
  };
  books: Array<{
    id: string;
    title: string;
    author: string;
    lastHighlightAt: string | null;
    numHighlights: number;
  }>;
  highlights: Array<{
    id: string;
    text: string;
    bookTitle: string;
    author: string;
    highlightedAt: string | null;
    location?: string | null;
  }>;
};

type ConnectorState = {
  status: ConnectorStatus;
  lastSync: string | null;
  loading: boolean;
  error?: string;
  data?: ConnectorSyncPayload;
};

export function ThirdPartyConnectorsSection() {
  const [states, setStates] = useState<Record<string, ConnectorState>>(() =>
    CONNECTORS.reduce((acc, connector) => {
      acc[connector.id] = {
        status: connector.defaultStatus,
        lastSync: connector.lastSync,
        loading: false,
        error: undefined,
        data: undefined,
      };
      return acc;
    }, {} as Record<string, ConnectorState>)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);
  const [activeConnector, setActiveConnector] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

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

  const handleCredentialChange = (connectorId: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [connectorId]: value }));
  };

  const handleDisconnect = (connectorId: string) => {
    setStates((prev) => ({
      ...prev,
      [connectorId]: {
        status: "disconnected",
        lastSync: null,
        loading: false,
        error: undefined,
        data: undefined,
      },
    }));
  };

  const handleResolveAttention = (connectorId: string) => {
    setStates((prev) => ({
      ...prev,
      [connectorId]: {
        ...prev[connectorId],
        status: "connected",
        lastSync: new Date().toLocaleString(),
        error: undefined,
      },
    }));
  };

  const handleConnection = async (connector: ConnectorDefinition) => {
    if (!connector.connection || connector.connection.type !== "readwise") {
      return;
    }

    const apiKey = credentials[connector.id];

    if (!apiKey) {
      setStates((prev) => ({
        ...prev,
        [connector.id]: {
          ...prev[connector.id],
          error: "Enter a Readwise access token to connect.",
        },
      }));
      return;
    }

    setStates((prev) => ({
      ...prev,
      [connector.id]: {
        ...prev[connector.id],
        loading: true,
        error: undefined,
      },
    }));

    try {
      const response = await fetch("/api/connectors/readwise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          sourceType: connector.connection.sourceType,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.error || "Connection failed. Verify the token and try again.";
        throw new Error(message);
      }

      const payload: ConnectorSyncPayload = await response.json();

      setStates((prev) => ({
        ...prev,
        [connector.id]: {
          status: "connected",
          lastSync: new Date(payload.syncedAt).toLocaleString(),
          loading: false,
          error: undefined,
          data: payload,
        },
      }));
      setActiveConnector(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error while connecting.";

      setStates((prev) => ({
        ...prev,
        [connector.id]: {
          ...prev[connector.id],
          loading: false,
          error: message,
        },
      }));
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Cloud className="mt-1 h-5 w-5 text-emerald-600" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reading connectors
            </h3>
            <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Link Apple Books, Kindle, and other reading services to pull real highlights and progress into Focus Notebook.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          >
            {showConnectedOnly ? "Showing connected" : "Show connected only"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-gray-700 dark:border-gray-700 dark:text-gray-200">
          <Layers className="h-3.5 w-3.5" />
          {totals.connected} of {totals.total} connected
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-gray-700 dark:border-gray-700 dark:text-gray-200">
          <RefreshCcw className="h-3.5 w-3.5" />
          {totals.attention} needing setup
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-gray-700 dark:border-gray-700 dark:text-gray-200">
          {Math.round((totals.connected / totals.total) * 100)}% coverage
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/30">
        {filteredConnectors.map((connector, index) => {
          const state = states[connector.id];
          const statusMeta = STATUS_META[state.status];
          const credentialValue = credentials[connector.id] ?? "";
          const isActive = activeConnector === connector.id;
          const readwiseConfig =
            connector.connection?.type === "readwise"
              ? connector.connection
              : undefined;
          const canConnect = Boolean(readwiseConfig);
          const isAttention = state.status === "action-required";

          return (
            <div
              key={connector.id}
              className={cn(
                "space-y-4 p-5 sm:p-6",
                index !== filteredConnectors.length - 1
                  ? "border-b border-gray-200 dark:border-gray-800"
                  : undefined
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {connector.name}
                    </h4>
                    <Badge className={cn("text-xs font-medium", statusMeta.className)}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {connector.vendor}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {connector.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {connector.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 dark:border-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                    {connector.dataTypes.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 dark:bg-gray-800"
                      >
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 self-start">
                  {isAttention ? (
                    <Button type="button" variant="default" onClick={() => handleResolveAttention(connector.id)}>
                      Mark resolved
                    </Button>
                  ) : state.status === "connected" ? (
                    <Button type="button" variant="outline" onClick={() => handleDisconnect(connector.id)}>
                      Disconnect
                    </Button>
                  ) : canConnect ? (
                    <Button
                      type="button"
                      onClick={() =>
                        setActiveConnector((prev) => (prev === connector.id ? null : connector.id))
                      }
                    >
                      {isActive ? "Close" : "Connect"}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Last sync: {state.lastSync ?? "Not yet connected"}
                  </span>
                  <a
                    href={connector.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    View setup guide
                  </a>
                </div>
              </div>

              {canConnect && (
                <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900/40">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Provide your Readwise token to securely pull highlights and progress for this connector.
                  </p>

                  {isActive && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {readwiseConfig?.credentialLabel}
                      </label>
                      <Input
                        type="password"
                        value={credentialValue}
                        onChange={(event) =>
                          handleCredentialChange(connector.id, event.target.value)
                        }
                        autoComplete="off"
                        placeholder="rw_live_..."
                        disabled={state.loading}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => handleConnection(connector)} disabled={state.loading}>
                          {state.loading ? "Connecting..." : "Save & sync"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveConnector(null)}
                          disabled={state.loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="link"
                          className="px-0 text-xs"
                          onClick={() =>
                            readwiseConfig && window.open(readwiseConfig.setupHelpUrl, "_blank")
                          }
                        >
                          How to generate a token
                        </Button>
                      </div>
                      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
                    </div>
                  )}

                  {state.status === "connected" && state.data && (
                    <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>
                          {state.data.totals.books} synced book
                          {state.data.totals.books === 1 ? "" : "s"}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-gray-400/60" />
                        <span>{state.data.totals.highlights} highlights</span>
                        <span className="h-1 w-1 rounded-full bg-gray-400/60" />
                        <span>{state.data.totals.notes} notes</span>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-800 dark:text-gray-100">Recent books</p>
                        <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                          {state.data.books.slice(0, 3).map((book) => (
                            <li key={book.id}>
                              <span className="font-medium text-gray-800 dark:text-gray-100">
                                {book.title}
                              </span>{" "}
                              by {book.author}
                              {book.lastHighlightAt && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                  (last highlight {new Date(book.lastHighlightAt).toLocaleDateString()})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-800 dark:text-gray-100">Latest highlights</p>
                        <ul className="space-y-2">
                          {state.data.highlights.slice(0, 2).map((highlight) => (
                            <li
                              key={highlight.id}
                              className="rounded-md border border-gray-200 bg-white/90 p-2 dark:border-gray-700 dark:bg-gray-900/60"
                            >
                              <p className="text-sm text-gray-800 dark:text-gray-100">“{highlight.text}”</p>
                              <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {highlight.bookTitle} · {highlight.author}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredConnectors.length === 0 && (
          <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <Cloud className="h-5 w-5 text-gray-500" />
            </div>
            <p className="font-medium text-gray-700 dark:text-gray-200">
              No connectors match your filters yet.
            </p>
            <p>Try clearing the search or showing all connectors to explore available integrations.</p>
          </div>
        )}
      </div>
    </section>
  );
}
