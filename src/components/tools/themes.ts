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
    headerBg: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
    headerBorder: 'border-purple-200 dark:border-purple-800',
    headerText: 'from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400',
    backButtonColor: 'purple',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-purple-500',
    statPrimary: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    infoBg: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
    infoBorder: 'border-purple-200 dark:border-purple-800',
  },
  blue: {
    name: 'Blue',
    headerBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    headerBorder: 'border-blue-200 dark:border-blue-800',
    headerText: 'from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400',
    backButtonColor: 'blue',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-blue-500',
    statPrimary: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300',
    fabGradient: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    infoBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    infoBorder: 'border-blue-200 dark:border-blue-800',
  },
  green: {
    name: 'Green',
    headerBg: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
    headerBorder: 'border-green-200 dark:border-green-800',
    headerText: 'from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400',
    backButtonColor: 'green',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-green-500',
    statPrimary: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
    infoBg: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
    infoBorder: 'border-green-200 dark:border-green-800',
  },
  orange: {
    name: 'Orange',
    headerBg: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',
    headerBorder: 'border-orange-200 dark:border-orange-800',
    headerText: 'from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400',
    backButtonColor: 'orange',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-orange-500',
    statPrimary: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600',
    infoBg: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',
    infoBorder: 'border-orange-200 dark:border-orange-800',
  },
  pink: {
    name: 'Pink',
    headerBg: 'from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20',
    headerBorder: 'border-pink-200 dark:border-pink-800',
    headerText: 'from-pink-600 to-rose-600 dark:from-pink-400 dark:to-rose-400',
    backButtonColor: 'pink',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-pink-500',
    statPrimary: 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
    infoBg: 'from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20',
    infoBorder: 'border-pink-200 dark:border-pink-800',
  },
  indigo: {
    name: 'Indigo',
    headerBg: 'from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20',
    headerBorder: 'border-indigo-200 dark:border-indigo-800',
    headerText: 'from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400',
    backButtonColor: 'indigo',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-indigo-500',
    statPrimary: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
    infoBg: 'from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20',
    infoBorder: 'border-indigo-200 dark:border-indigo-800',
  },
  yellow: {
    name: 'Yellow',
    headerBg: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
    headerBorder: 'border-yellow-200 dark:border-yellow-800',
    headerText: 'from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400',
    backButtonColor: 'yellow',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-yellow-500',
    statPrimary: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
    infoBg: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
    infoBorder: 'border-yellow-200 dark:border-yellow-800',
  },
  teal: {
    name: 'Teal',
    headerBg: 'from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20',
    headerBorder: 'border-teal-200 dark:border-teal-800',
    headerText: 'from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400',
    backButtonColor: 'blue',
    searchBg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    searchBorder: 'border-blue-200 dark:border-blue-800',
    searchFocus: 'ring-teal-500',
    statPrimary: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300',
    statSecondary: 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300',
    statSuccess: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300',
    statWarning: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    fabGradient: 'from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600',
    infoBg: 'from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20',
    infoBorder: 'border-teal-200 dark:border-teal-800',
  },
};

