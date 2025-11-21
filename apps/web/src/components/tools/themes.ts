export interface ToolTheme {
  name: string;
  // Header gradient
  headerBg: string;          // bg-gradient classes for header background
  headerBorder: string;      // border classes for header
  headerText: string;        // gradient text classes
  backButtonColor: string;   // back button theme (purple, blue, etc.)
  
  // Search & Filters
  searchBg: string;          // bg-gradient classes for search section
  searchBorder: string;      // border classes for search section
  searchFocus: string;       // focus ring color
  
  // Stats badges (variant colors)
  statPrimary: string;       // primary stat badge (usually info)
  statSecondary: string;     // secondary stat badge
  statSuccess: string;       // success stat badge
  statWarning: string;       // warning stat badge
  
  // FAB colors
  fabGradient: string;       // gradient classes for FAB
  
  // Info section
  infoBg: string;            // background for info section
  infoBorder: string;        // border for info section
}

export const toolThemes: Record<string, ToolTheme> = {
  purple: {
    name: 'Purple',
    headerBg: 'from-purple-50 to-indigo-50 dark:from-purple-900/15 dark:to-indigo-900/15',
    headerBorder: 'border-purple-200 dark:border-purple-700/50',
    headerText: 'from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400',
    backButtonColor: 'purple',
    searchBg: 'from-slate-50 to-blue-50 dark:from-slate-900/15 dark:to-blue-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-purple-500',
    statPrimary: 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600',
    infoBg: 'from-purple-50 to-indigo-50 dark:from-purple-900/15 dark:to-indigo-900/15',
    infoBorder: 'border-purple-200 dark:border-purple-700/50',
  },
  blue: {
    name: 'Blue',
    headerBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/15 dark:to-cyan-900/15',
    headerBorder: 'border-blue-200 dark:border-blue-700/50',
    headerText: 'from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400',
    backButtonColor: 'blue',
    searchBg: 'from-slate-50 to-blue-50 dark:from-slate-900/15 dark:to-blue-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-blue-500',
    statPrimary: 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    infoBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/15 dark:to-cyan-900/15',
    infoBorder: 'border-blue-200 dark:border-blue-700/50',
  },
  green: {
    name: 'Green',
    headerBg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/15 dark:to-teal-900/15',
    headerBorder: 'border-emerald-200 dark:border-emerald-700/50',
    headerText: 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400',
    backButtonColor: 'green',
    searchBg: 'from-slate-50 to-emerald-50 dark:from-slate-900/15 dark:to-emerald-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-emerald-500',
    statPrimary: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
    infoBg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/15 dark:to-teal-900/15',
    infoBorder: 'border-emerald-200 dark:border-emerald-700/50',
  },
  orange: {
    name: 'Orange',
    headerBg: 'from-orange-50 to-amber-50 dark:from-orange-900/15 dark:to-amber-900/15',
    headerBorder: 'border-orange-200 dark:border-orange-700/50',
    headerText: 'from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400',
    backButtonColor: 'orange',
    searchBg: 'from-slate-50 to-amber-50 dark:from-slate-900/15 dark:to-amber-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-orange-500',
    statPrimary: 'bg-orange-50 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600',
    infoBg: 'from-orange-50 to-amber-50 dark:from-orange-900/15 dark:to-amber-900/15',
    infoBorder: 'border-orange-200 dark:border-orange-700/50',
  },
  pink: {
    name: 'Pink',
    headerBg: 'from-pink-50 to-rose-50 dark:from-pink-900/15 dark:to-rose-900/15',
    headerBorder: 'border-pink-200 dark:border-pink-700/50',
    headerText: 'from-pink-600 to-rose-600 dark:from-pink-400 dark:to-rose-400',
    backButtonColor: 'pink',
    searchBg: 'from-slate-50 to-pink-50 dark:from-slate-900/15 dark:to-pink-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-pink-500',
    statPrimary: 'bg-pink-50 dark:bg-pink-900/25 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
    infoBg: 'from-pink-50 to-rose-50 dark:from-pink-900/15 dark:to-rose-900/15',
    infoBorder: 'border-pink-200 dark:border-pink-700/50',
  },
  indigo: {
    name: 'Indigo',
    headerBg: 'from-indigo-50 to-violet-50 dark:from-indigo-900/15 dark:to-violet-900/15',
    headerBorder: 'border-indigo-200 dark:border-indigo-700/50',
    headerText: 'from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400',
    backButtonColor: 'indigo',
    searchBg: 'from-slate-50 to-indigo-50 dark:from-slate-900/15 dark:to-indigo-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-indigo-500',
    statPrimary: 'bg-indigo-50 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
    infoBg: 'from-indigo-50 to-violet-50 dark:from-indigo-900/15 dark:to-violet-900/15',
    infoBorder: 'border-indigo-200 dark:border-indigo-700/50',
  },
  yellow: {
    name: 'Yellow',
    headerBg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/15 dark:to-amber-900/15',
    headerBorder: 'border-yellow-200 dark:border-yellow-700/50',
    headerText: 'from-yellow-700 to-amber-700 dark:from-yellow-400 dark:to-amber-400',
    backButtonColor: 'yellow',
    searchBg: 'from-slate-50 to-yellow-50 dark:from-slate-900/15 dark:to-yellow-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-yellow-500',
    statPrimary: 'bg-yellow-50 dark:bg-yellow-900/25 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600',
    infoBg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/15 dark:to-amber-900/15',
    infoBorder: 'border-yellow-200 dark:border-yellow-700/50',
  },
  teal: {
    name: 'Teal',
    headerBg: 'from-teal-50 to-cyan-50 dark:from-teal-900/15 dark:to-cyan-900/15',
    headerBorder: 'border-teal-200 dark:border-teal-700/50',
    headerText: 'from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400',
    backButtonColor: 'blue',
    searchBg: 'from-slate-50 to-cyan-50 dark:from-slate-900/15 dark:to-cyan-900/15',
    searchBorder: 'border-slate-200 dark:border-slate-700/50',
    searchFocus: 'ring-teal-500',
    statPrimary: 'bg-teal-50 dark:bg-teal-900/25 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700/30',
    statSecondary: 'bg-slate-50 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30',
    statSuccess: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30',
    statWarning: 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30',
    fabGradient: 'from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600',
    infoBg: 'from-teal-50 to-cyan-50 dark:from-teal-900/15 dark:to-cyan-900/15',
    infoBorder: 'border-teal-200 dark:border-teal-700/50',
  },
};

