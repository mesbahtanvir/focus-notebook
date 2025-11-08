'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, Settings, User, Wrench, Menu, X, Shield, ChevronDown, ChevronRight, Target, Heart, Wallet, Plane, Grid3x3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toolGroups } from '../../shared/toolSpecs';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const pathname = usePathname();
  const { user } = useAuth();

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navItems: Array<{
    href: string;
    icon: typeof Home;
    label: string;
    color: string;
    badge?: string | number;
  }> = [
    { href: '/', icon: Home, label: 'Home', color: 'from-purple-500 to-pink-500' },
  ];

  const toolGroupItems = [
    { id: 'productivity', icon: Target, label: 'Productivity', color: 'text-purple-600' },
    { id: 'soulful', icon: Heart, label: 'Soulful', color: 'text-pink-600' },
    { id: 'finances', icon: Wallet, label: 'Finances', color: 'text-green-600' },
    { id: 'trips', icon: Plane, label: 'Trips', color: 'text-blue-600' },
  ];

  const closeSidebar = () => setIsOpen(false);

  // Close sidebar on ESC key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      closeSidebar();
    }
  };

  // Touch swipe to close on mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe && isOpen) {
      closeSidebar();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="lg:hidden fixed top-4 left-4 z-50 p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300 min-h-[44px] min-w-[44px] touch-manipulation"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        onKeyDown={handleKeyDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          flex flex-col h-[100dvh] lg:h-screen
          bg-gradient-to-b from-white via-purple-50 to-pink-50
          border-r-4 border-purple-200 shadow-2xl
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-64 lg:w-20 xl:w-64
        `}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b-4 border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent lg:hidden xl:block">
            ✨ Notebook
          </h1>
          <div className="hidden lg:block xl:hidden text-center text-2xl">
            ✨
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group relative flex items-center gap-3 p-4 min-h-[44px] rounded-xl
                  transition-all duration-200 transform
                  focus:outline-none focus:ring-4 focus:ring-purple-300
                  touch-manipulation
                  ${isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md scale-105`
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 hover:scale-105'
                  }
                  lg:justify-center xl:justify-start
                `}
                title={item.label}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <span className="font-medium lg:hidden xl:inline flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for tablet view */}
                <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Tools Section with Expandable Categories */}
          <div className="space-y-1">
            <button
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className={`
                group relative flex items-center gap-3 p-4 min-h-[44px] rounded-xl w-full
                transition-all duration-200 transform
                focus:outline-none focus:ring-4 focus:ring-green-300
                touch-manipulation
                ${pathname.startsWith('/tools')
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md scale-105'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 hover:scale-105'
                }
                lg:justify-center xl:justify-start
              `}
              title="Tools"
            >
              <Wrench className={`h-5 w-5 ${pathname.startsWith('/tools') ? 'text-white' : 'text-gray-600'}`} />
              <span className="font-medium lg:hidden xl:inline flex-1 text-left">Tools</span>
              {toolsExpanded ? (
                <ChevronDown className={`h-4 w-4 lg:hidden xl:block ${pathname.startsWith('/tools') ? 'text-white' : 'text-gray-600'}`} />
              ) : (
                <ChevronRight className={`h-4 w-4 lg:hidden xl:block ${pathname.startsWith('/tools') ? 'text-white' : 'text-gray-600'}`} />
              )}

              {/* Tooltip for tablet view */}
              <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Tools
              </span>
            </button>

            {/* Tool Group Sub-items */}
            {toolsExpanded && (
              <div className="lg:hidden xl:block space-y-1 pl-4">
                {toolGroupItems.map((group) => {
                  const groupPath = `/tools/${group.id}`;
                  const isActive = pathname === groupPath;
                  return (
                    <Link
                      key={group.id}
                      href={groupPath}
                      onClick={closeSidebar}
                      className={`
                        flex items-center gap-3 p-3 min-h-[40px] rounded-lg
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-purple-300
                        touch-manipulation
                        ${isActive
                          ? 'bg-white/60 shadow-sm'
                          : 'hover:bg-white/40'
                        }
                      `}
                      title={group.label}
                    >
                      <group.icon className={`h-4 w-4 ${group.color}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {group.label}
                      </span>
                    </Link>
                  );
                })}

                {/* View All Tools Link */}
                <Link
                  href="/tools"
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 p-3 min-h-[40px] rounded-lg
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-purple-300
                    touch-manipulation
                    ${pathname === '/tools'
                      ? 'bg-white/60 shadow-sm'
                      : 'hover:bg-white/40'
                    }
                  `}
                >
                  <Grid3x3 className="h-4 w-4 text-gray-600" />
                  <span className={`text-sm font-medium ${pathname === '/tools' ? 'text-gray-900' : 'text-gray-700'}`}>
                    All Tools
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Dashboard Link */}
          <Link
            href="/dashboard"
            onClick={closeSidebar}
            aria-current={pathname === '/dashboard' ? 'page' : undefined}
            className={`
              group relative flex items-center gap-3 p-4 min-h-[44px] rounded-xl
              transition-all duration-200 transform
              focus:outline-none focus:ring-4 focus:ring-blue-300
              touch-manipulation
              ${pathname === '/dashboard'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md scale-105'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100 hover:scale-105'
              }
              lg:justify-center xl:justify-start
            `}
            title="Dashboard"
          >
            <LayoutDashboard className={`h-5 w-5 ${pathname === '/dashboard' ? 'text-white' : 'text-gray-600'}`} />
            <span className="font-medium lg:hidden xl:inline">Dashboard</span>

            {/* Tooltip for tablet view */}
            <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Dashboard
            </span>
          </Link>

          {/* Settings Link */}
          <Link
            href="/settings"
            onClick={closeSidebar}
            aria-current={pathname === '/settings' ? 'page' : undefined}
            className={`
              group relative flex items-center gap-3 p-4 min-h-[44px] rounded-xl
              transition-all duration-200 transform
              focus:outline-none focus:ring-4 focus:ring-orange-300
              touch-manipulation
              ${pathname === '/settings'
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-md scale-105'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-100 hover:to-yellow-100 hover:scale-105'
              }
              lg:justify-center xl:justify-start
            `}
            title="Settings"
          >
            <Settings className={`h-5 w-5 ${pathname === '/settings' ? 'text-white' : 'text-gray-600'}`} />
            <span className="font-medium lg:hidden xl:inline">Settings</span>

            {/* Tooltip for tablet view */}
            <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Settings
            </span>
          </Link>

          {/* Debug Link - Visible for all users */}
          <Link
            href="/admin"
            onClick={closeSidebar}
            aria-current={pathname === '/admin' ? 'page' : undefined}
            className={`
              group relative flex items-center gap-3 p-4 min-h-[44px] rounded-xl
              transition-all duration-200 transform
              focus:outline-none focus:ring-4 focus:ring-red-300
              touch-manipulation
              ${pathname === '/admin'
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md scale-105'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 hover:scale-105'
              }
              lg:justify-center xl:justify-start
            `}
            title="Debug"
          >
            <Shield className={`h-5 w-5 ${pathname === '/admin' ? 'text-white' : 'text-red-600'}`} />
            <span className="font-medium lg:hidden xl:inline">Debug</span>

            {/* Tooltip for tablet view */}
            <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Debug
            </span>
          </Link>
        </nav>

        {/* User Info or Login Button */}
        <div className="p-4 border-t-4 border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100">
          {user ? (
            <Link
              href="/profile"
              onClick={closeSidebar}
              className="flex items-center gap-3 lg:justify-center xl:justify-start p-2 rounded-xl hover:bg-white/50 transition-all transform hover:scale-105 cursor-pointer group"
              title="Go to Profile"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full ring-2 ring-purple-400 flex-shrink-0 group-hover:ring-4 transition-all"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0 group-hover:shadow-lg transition-all">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div className="truncate lg:hidden xl:block">
                <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-purple-600 transition-colors">
                  {user.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={closeSidebar}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
            >
              <User className="h-5 w-5" />
              <span className="lg:hidden xl:inline">Sign In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
