import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  category: string;
  color: string;
  thoughtId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  
  // Actions
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  getEventsForThought: (thoughtId: string) => CalendarEvent[];
  clearEvents: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCalendar = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      loading: false,
      error: null,

      addEvent: (eventData) => {
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          events: [...state.events, newEvent],
        }));
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id
              ? { ...event, ...updates, updatedAt: new Date().toISOString() }
              : event
          ),
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
      },

      getEventsForDate: (date) => {
        const { events } = get();
        return events.filter((event) => event.date === date);
      },

      getEventsForMonth: (year, month) => {
        const { events } = get();
        return events.filter((event) => {
          const eventDate = new Date(event.date);
          return eventDate.getFullYear() === year && eventDate.getMonth() === month;
        });
      },

      getEventsForThought: (thoughtId) => {
        const { events } = get();
        return events.filter((event) => event.thoughtId === thoughtId);
      },

      clearEvents: () => {
        set({ events: [] });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        events: state.events,
      }),
    }
  )
);
