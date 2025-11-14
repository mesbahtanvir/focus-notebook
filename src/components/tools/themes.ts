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
    headerBg: 'from-purple-100/40 to-indigo-100/30 dark:from-purple-900/10 dark:to-indigo-900/10',
    headerBorder: 'border-purple-200/60 dark:border-purple-700/40',
    headerText: 'from-purple-500 to-indigo-500 dark:from-purple-400 dark:to-indigo-400',
    backButtonColor: 'purple',
    searchBg: 'from-slate-100/60 to-blue-100/40 dark:from-slate-900/10 dark:to-blue-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-purple-400',
    statPrimary: 'bg-blue-100/60 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-purple-400/90 to-indigo-400/90 hover:from-purple-500/90 hover:to-indigo-500/90',
    infoBg: 'from-purple-100/40 to-indigo-100/30 dark:from-purple-900/10 dark:to-indigo-900/10',
    infoBorder: 'border-purple-200/60 dark:border-purple-700/40',
  },
  blue: {
    name: 'Blue',
    headerBg: 'from-slate-100/50 to-blue-100/40 dark:from-slate-900/10 dark:to-blue-900/10',
    headerBorder: 'border-slate-200/60 dark:border-slate-700/40',
    headerText: 'from-slate-600 to-blue-500 dark:from-slate-400 dark:to-blue-400',
    backButtonColor: 'blue',
    searchBg: 'from-slate-100/60 to-blue-100/40 dark:from-slate-900/10 dark:to-blue-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-blue-400',
    statPrimary: 'bg-blue-100/60 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-slate-400/90 to-blue-400/90 hover:from-slate-500/90 hover:to-blue-500/90',
    infoBg: 'from-slate-100/50 to-blue-100/40 dark:from-slate-900/10 dark:to-blue-900/10',
    infoBorder: 'border-slate-200/60 dark:border-slate-700/40',
  },
  green: {
    name: 'Green',
    headerBg: 'from-emerald-100/40 to-teal-100/30 dark:from-emerald-900/10 dark:to-teal-900/10',
    headerBorder: 'border-emerald-200/60 dark:border-emerald-700/40',
    headerText: 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400',
    backButtonColor: 'green',
    searchBg: 'from-slate-100/60 to-emerald-100/40 dark:from-slate-900/10 dark:to-emerald-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-emerald-400',
    statPrimary: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-emerald-400/90 to-teal-400/90 hover:from-emerald-500/90 hover:to-teal-500/90',
    infoBg: 'from-emerald-100/40 to-teal-100/30 dark:from-emerald-900/10 dark:to-teal-900/10',
    infoBorder: 'border-emerald-200/60 dark:border-emerald-700/40',
  },
  orange: {
    name: 'Orange',
    headerBg: 'from-orange-100/40 to-amber-100/30 dark:from-orange-900/10 dark:to-amber-900/10',
    headerBorder: 'border-orange-200/60 dark:border-orange-700/40',
    headerText: 'from-orange-500 to-amber-500 dark:from-orange-400 dark:to-amber-400',
    backButtonColor: 'orange',
    searchBg: 'from-slate-100/60 to-amber-100/40 dark:from-slate-900/10 dark:to-amber-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-orange-400',
    statPrimary: 'bg-orange-100/60 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-orange-400/90 to-amber-400/90 hover:from-orange-500/90 hover:to-amber-500/90',
    infoBg: 'from-orange-100/40 to-amber-100/30 dark:from-orange-900/10 dark:to-amber-900/10',
    infoBorder: 'border-orange-200/60 dark:border-orange-700/40',
  },
  pink: {
    name: 'Pink',
    headerBg: 'from-pink-100/40 to-rose-100/30 dark:from-pink-900/10 dark:to-rose-900/10',
    headerBorder: 'border-pink-200/60 dark:border-pink-700/40',
    headerText: 'from-pink-500 to-rose-500 dark:from-pink-400 dark:to-rose-400',
    backButtonColor: 'pink',
    searchBg: 'from-slate-100/60 to-pink-100/40 dark:from-slate-900/10 dark:to-pink-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-pink-400',
    statPrimary: 'bg-pink-100/60 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-pink-400/90 to-rose-400/90 hover:from-pink-500/90 hover:to-rose-500/90',
    infoBg: 'from-pink-100/40 to-rose-100/30 dark:from-pink-900/10 dark:to-rose-900/10',
    infoBorder: 'border-pink-200/60 dark:border-pink-700/40',
  },
  indigo: {
    name: 'Indigo',
    headerBg: 'from-indigo-100/40 to-violet-100/30 dark:from-indigo-900/10 dark:to-violet-900/10',
    headerBorder: 'border-indigo-200/60 dark:border-indigo-700/40',
    headerText: 'from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400',
    backButtonColor: 'indigo',
    searchBg: 'from-slate-100/60 to-indigo-100/40 dark:from-slate-900/10 dark:to-indigo-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-indigo-400',
    statPrimary: 'bg-indigo-100/60 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-indigo-400/90 to-violet-400/90 hover:from-indigo-500/90 hover:to-violet-500/90',
    infoBg: 'from-indigo-100/40 to-violet-100/30 dark:from-indigo-900/10 dark:to-violet-900/10',
    infoBorder: 'border-indigo-200/60 dark:border-indigo-700/40',
  },
  yellow: {
    name: 'Yellow',
    headerBg: 'from-yellow-100/40 to-amber-100/30 dark:from-yellow-900/10 dark:to-amber-900/10',
    headerBorder: 'border-yellow-200/60 dark:border-yellow-700/40',
    headerText: 'from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400',
    backButtonColor: 'yellow',
    searchBg: 'from-slate-100/60 to-yellow-100/40 dark:from-slate-900/10 dark:to-yellow-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-yellow-400',
    statPrimary: 'bg-yellow-100/60 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-yellow-400/90 to-amber-400/90 hover:from-yellow-500/90 hover:to-amber-500/90',
    infoBg: 'from-yellow-100/40 to-amber-100/30 dark:from-yellow-900/10 dark:to-amber-900/10',
    infoBorder: 'border-yellow-200/60 dark:border-yellow-700/40',
  },
  teal: {
    name: 'Teal',
    headerBg: 'from-teal-100/40 to-cyan-100/30 dark:from-teal-900/10 dark:to-cyan-900/10',
    headerBorder: 'border-teal-200/60 dark:border-teal-700/40',
    headerText: 'from-teal-500 to-cyan-500 dark:from-teal-400 dark:to-cyan-400',
    backButtonColor: 'blue',
    searchBg: 'from-slate-100/60 to-cyan-100/40 dark:from-slate-900/10 dark:to-cyan-900/10',
    searchBorder: 'border-slate-200/60 dark:border-slate-700/40',
    searchFocus: 'ring-teal-400',
    statPrimary: 'bg-teal-100/60 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300',
    statSecondary: 'bg-stone-100/60 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300',
    statSuccess: 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    statWarning: 'bg-amber-100/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    fabGradient: 'from-teal-400/90 to-cyan-400/90 hover:from-teal-500/90 hover:to-cyan-500/90',
    infoBg: 'from-teal-100/40 to-cyan-100/30 dark:from-teal-900/10 dark:to-cyan-900/10',
    infoBorder: 'border-teal-200/60 dark:border-teal-700/40',
  },
};

