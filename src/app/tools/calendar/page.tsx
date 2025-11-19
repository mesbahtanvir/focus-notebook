"use client";

import { useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Tag, Plus, ChevronDown, Download, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCalendar } from "@/store/useCalendar";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_META = {
  Work: { pill: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  Personal: { pill: "from-emerald-500 to-lime-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  Health: { pill: "from-rose-500 to-red-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  Social: { pill: "from-purple-500 to-indigo-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  Learning: { pill: "from-amber-500 to-yellow-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
} as const;

type CategoryName = keyof typeof CATEGORY_META;

type EventDraft = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: CategoryName;
  thoughtId?: string;
};

const DEFAULT_CATEGORY: CategoryName = "Work";

const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

const makeDraft = (dateKey = formatDateKey(new Date())): EventDraft => ({
  title: "",
  date: dateKey,
  time: "",
  location: "",
  description: "",
  category: DEFAULT_CATEGORY,
});

function CalendarTool() {
  useTrackToolUsage("calendar");

  const events = useCalendar((state) => state.events);
  const addEvent = useCalendar((state) => state.addEvent);
  const getEventsForDate = useCalendar((state) => state.getEventsForDate);
  const exportToICS = useCalendar((state) => state.exportToICS);
  const importFromICS = useCalendar((state) => state.importFromICS);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() => makeDraft());
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInView = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingBlanks = firstDay.getDay();
    const collection: Array<Date | null> = [];

    for (let i = 0; i < leadingBlanks; i++) collection.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      collection.push(new Date(year, month, day));
    }
    return collection;
  }, [currentMonth]);

  const todayKey = formatDateKey(new Date());
  const selectedDateKey = formatDateKey(selectedDate);

  const openComposer = (seed?: Partial<EventDraft>) => {
    setError(null);
    setDraft({ ...makeDraft(selectedDateKey), ...seed });
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setDraft(makeDraft(selectedDateKey));
    setError(null);
    setShowMoreDetails(false);
  };

  const handleSaveEvent = () => {
    if (!draft.title.trim()) {
      setError("Please provide a title for this event.");
      return;
    }

    const categoryMeta = CATEGORY_META[draft.category] ?? CATEGORY_META[DEFAULT_CATEGORY];

    addEvent({
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time.trim() || undefined,
      location: draft.location.trim() || undefined,
      description: draft.description.trim() || undefined,
      category: draft.category,
      color: categoryMeta.pill,
      thoughtId: draft.thoughtId,
    });

    closeComposer();
  };

  const handleExportToICS = () => {
    try {
      const icsContent = exportToICS();
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `focus-notebook-calendar-${new Date().toISOString().split('T')[0]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Calendar exported',
        description: `${events.length} event(s) exported to .ics file`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export calendar events',
        variant: 'destructive',
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFromICS = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const imported = await importFromICS(content);

      toast({
        title: 'Calendar imported',
        description: `${imported} event(s) imported from .ics file`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import calendar events. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  const selectedDayEvents = getEventsForDate(selectedDateKey);

  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());

    return Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(start);
      day.setDate(start.getDate() + idx);
      return day;
    });
  }, [selectedDate]);

  const upcomingEvents = useMemo(() => {
    const normalize = (eventDate: string, time?: string) => {
      if (time) return new Date(`${eventDate}T${time}`);
      return new Date(`${eventDate}T00:00`);
    };

    const sorted = [...events].sort((a, b) => normalize(a.date, a.time).getTime() - normalize(b.date, b.time).getTime());
    const now = new Date();
    return sorted
      .filter((event) => normalize(event.date, event.time).getTime() >= now.getTime())
      .slice(0, 8);
  }, [events]);

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Hidden file input for importing .ics files */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".ics,.ical"
        onChange={handleImportFromICS}
        className="hidden"
      />

      <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-purple-500" />
              Calendar
            </CardTitle>
            <CardDescription>
              Organize upcoming commitments and turn meaningful thoughts into events.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleImportClick} title="Import .ics file">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportToICS} disabled={events.length === 0} title="Export to .ics file">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="secondary" onClick={() => openComposer()}>
              <Plus className="h-4 w-4 mr-1" />
              New Event
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">{monthLabel}</CardTitle>
              <CardDescription>
                {events.length} saved {events.length === 1 ? "event" : "events"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center rounded-full border border-slate-200 text-xs font-medium">
                {(["month", "week", "day"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 capitalize transition ${
                      viewMode === mode ? "bg-purple-600 text-white" : "text-slate-600"
                    } ${mode === "month" ? "rounded-l-full" : mode === "day" ? "rounded-r-full" : ""}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {viewMode === "month" && (
              <div className="grid grid-cols-7 gap-1 text-sm text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2 text-center font-medium">
                    {day}
                  </div>
                ))}
                {daysInView.map((day, idx) => {
                  const key = day ? formatDateKey(day) : `${monthLabel}-pad-${idx}`;
                  const dayEvents = day ? getEventsForDate(formatDateKey(day)) : [];
                  const isToday = day && formatDateKey(day) === todayKey;
                  const isSelected = day && formatDateKey(day) === selectedDateKey;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!day}
                      onClick={() => day && setSelectedDate(day)}
                      className={`min-h-[88px] rounded-lg border text-left p-2 transition ${
                        day
                          ? "hover:border-purple-300 focus-visible:outline-purple-500"
                          : "opacity-0 cursor-default"
                      } ${isSelected ? "border-purple-400 ring-1 ring-purple-200" : "border-slate-200 dark:border-slate-800"} ${
                        isToday ? "bg-purple-50/60 dark:bg-purple-900/10" : ""
                      }`}
                    >
                      {day && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className={`text-[11px] px-2 py-0.5 rounded-full text-white truncate bg-gradient-to-r ${event.color}`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[11px] text-slate-400">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {viewMode === "week" && (
              <div className="grid grid-cols-1 gap-4 text-sm lg:grid-cols-7">
                {weekDays.map((day) => {
                  const dayKey = formatDateKey(day);
                  const dayEvents = getEventsForDate(dayKey);
                  const isSelected = dayKey === selectedDateKey;
                  return (
                    <div key={dayKey} className={`rounded-xl border p-3 ${isSelected ? "border-purple-400 ring-1 ring-purple-100" : "border-slate-200"}`}>
                      <button type="button" className="mb-2 text-left" onClick={() => setSelectedDate(day)}>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {day.toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </button>
                      <div className="space-y-2">
                        {dayEvents.length === 0 && (
                          <p className="text-xs text-slate-400">No events</p>
                        )}
                        {dayEvents.map((event) => (
                          <div key={event.id} className="rounded-md border border-slate-200 px-2 py-1">
                            <p className="text-xs font-semibold text-slate-800">{event.title}</p>
                            <p className="text-[11px] text-slate-500">
                              {event.time ? event.time : "All day"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "day" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Viewing</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => openComposer({ date: selectedDateKey })}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add event
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedDayEvents.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No events scheduled for this day.
                    </p>
                  )}
                  {selectedDayEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{event.title}</p>
                            <p className="text-sm text-slate-500">
                              {event.time ? event.time : "All day"}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">{event.category}</span>
                        </div>
                        {event.location && (
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-slate-700">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Selected day</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
                <Button variant="outline" onClick={() => openComposer({ date: selectedDateKey })}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add event
                </Button>
              </div>

              {viewMode === "month" && (
                <div className="space-y-3">
                  {selectedDayEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No events scheduled for this day.
                    </div>
                  ) : (
                    selectedDayEvents.map((event) => {
                      const meta = CATEGORY_META[event.category as CategoryName] ?? CATEGORY_META[DEFAULT_CATEGORY];
                      return (
                        <div key={event.id} className={`rounded-xl border px-4 py-3 ${meta.bg}`}>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-900 dark:text-slate-50">{event.title}</p>
                              <span className="text-xs text-slate-500">{event.category}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                              {event.time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {event.time}
                                </span>
                              )}
                              {event.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-slate-700 dark:text-slate-200">{event.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming events</CardTitle>
            <CardDescription>Your next scheduled commitments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-slate-500">No upcoming events. Add one from the calendar to get started.</p>
            )}
            {upcomingEvents.map((event) => {
              const meta = CATEGORY_META[event.category as CategoryName] ?? CATEGORY_META[DEFAULT_CATEGORY];
              const eventDate = new Date(event.date);
              return (
                <div key={event.id} className={`rounded-xl border px-4 py-3 ${meta.bg}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{event.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                        {event.time ? ` · ${event.time}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{event.category}</span>
                  </div>
                  {event.location && (
                    <p className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {composerOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeComposer}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6">
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">Create calendar event</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Add a new event to your calendar
                </p>
              </div>

              <div className="space-y-5">
                {/* Primary Fields - Always Visible */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="event-title">
                    Event Title
                  </label>
                  <input
                    id="event-title"
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none transition-colors"
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Project sync with team"
                    autoFocus
                  />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1" htmlFor="event-date">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Date
                    </label>
                    <input
                      type="date"
                      id="event-date"
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none transition-colors"
                      value={draft.date}
                      onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1" htmlFor="event-time">
                      <Clock className="h-3.5 w-3.5" />
                      Time
                    </label>
                    <input
                      type="time"
                      id="event-time"
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none transition-colors"
                      value={draft.time}
                      onChange={(e) => setDraft((prev) => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>

                {/* More Details - Collapsible */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="flex items-center justify-between w-full text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    <span>More details</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1" htmlFor="event-location">
                              <MapPin className="h-3.5 w-3.5" />
                              Location
                            </label>
                            <input
                              id="event-location"
                              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none transition-colors"
                              value={draft.location}
                              onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
                              placeholder="Optional"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="event-description">
                              Notes
                            </label>
                            <textarea
                              id="event-description"
                              className="min-h-[80px] w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none transition-colors resize-none"
                              value={draft.description}
                              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="Context, agenda, prep reminders..."
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1" htmlFor="event-category">
                              <Tag className="h-3.5 w-3.5" />
                              Category
                            </label>
                            <select
                              id="event-category"
                              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none transition-colors"
                              value={draft.category}
                              onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value as CategoryName }))}
                            >
                              {Object.keys(CATEGORY_META).map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={closeComposer}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEvent}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  >
                    Save event
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <CalendarTool />
    </motion.div>
  );
}
