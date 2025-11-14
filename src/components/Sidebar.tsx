'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, Settings, User, Wrench, Menu, X, Shield, ChevronDown, ChevronRight, Target, Heart, Wallet, Plane, Grid3x3, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toolGroups } from '../../shared/toolSpecs';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
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
    { href: '/', icon: Home, label: 'Home', color: 'from-purple-400/70 to-indigo-400/70' },
  ];

  const toolGroupItems = [
    { id: 'productivity', icon: Target, label: 'Productivity', color: 'text-purple-500/70' },
    { id: 'soulful', icon: Heart, label: 'Soulful', color: 'text-pink-500/70' },
    { id: 'finances', icon: Wallet, label: 'Finances', color: 'text-emerald-500/70' },
    { id: 'travel', icon: Plane, label: 'Travel', color: 'text-blue-500/70' },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] min-w-[48px] touch-manipulation"
        style={{ boxShadow: 'var(--shadow-card)' }}
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
          bg-card/95 backdrop-blur-sm
          border-r border-border
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-64 lg:w-20 xl:w-64
        `}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent lg:hidden xl:block">
            ✨ Notebook
          </h1>
          <div className="hidden lg:block xl:hidden text-center text-2xl">
            ✨
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group relative flex items-center gap-3 p-4 min-h-[48px] rounded-xl
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-ring
                  touch-manipulation
                  ${isActive
                    ? `bg-gradient-to-r ${item.color} text-white border-l-4 border-primary`
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                  lg:justify-center xl:justify-start
                `}
                title={item.label}
                style={isActive ? { boxShadow: 'var(--shadow-subtle)' } : {}}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'opacity-70'}`} />
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
          <div className="space-y-2">
            <button
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className={`
                group relative flex items-center gap-3 p-4 min-h-[48px] rounded-xl w-full
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-ring
                touch-manipulation
                ${pathname.startsWith('/tools')
                  ? 'bg-gradient-to-r from-emerald-400/70 to-teal-400/70 text-white border-l-4 border-emerald-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
                lg:justify-center xl:justify-start
              `}
              title="Tools"
              style={pathname.startsWith('/tools') ? { boxShadow: 'var(--shadow-subtle)' } : {}}
            >
              <Wrench className={`h-5 w-5 ${pathname.startsWith('/tools') ? 'text-white' : 'opacity-70'}`} />
              <span className="font-medium lg:hidden xl:inline flex-1 text-left">Tools</span>
              {toolsExpanded ? (
                <ChevronDown className={`h-4 w-4 lg:hidden xl:block ${pathname.startsWith('/tools') ? 'text-white' : 'opacity-70'}`} />
              ) : (
                <ChevronRight className={`h-4 w-4 lg:hidden xl:block ${pathname.startsWith('/tools') ? 'text-white' : 'opacity-70'}`} />
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
              group relative flex items-center gap-3 p-4 min-h-[48px] rounded-xl
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-ring
              touch-manipulation
              ${pathname === '/dashboard'
                ? 'bg-gradient-to-r from-slate-400/70 to-blue-400/70 text-white border-l-4 border-blue-500'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
              lg:justify-center xl:justify-start
            `}
            title="Dashboard"
            style={pathname === '/dashboard' ? { boxShadow: 'var(--shadow-subtle)' } : {}}
          >
            <LayoutDashboard className={`h-5 w-5 ${pathname === '/dashboard' ? 'text-white' : 'opacity-70'}`} />
            <span className="font-medium lg:hidden xl:inline">Dashboard</span>

            {/* Tooltip for tablet view */}
            <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Dashboard
            </span>
          </Link>

          {/* Settings Section with Expandable Subsections */}
          <div className="space-y-2">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={`
                group relative flex items-center gap-3 p-4 min-h-[48px] rounded-xl w-full
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-ring
                touch-manipulation
                ${pathname.startsWith('/settings')
                  ? 'bg-gradient-to-r from-orange-400/70 to-amber-400/70 text-white border-l-4 border-orange-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
                lg:justify-center xl:justify-start
              `}
              title="Settings"
              style={pathname.startsWith('/settings') ? { boxShadow: 'var(--shadow-subtle)' } : {}}
            >
              <Settings className={`h-5 w-5 ${pathname.startsWith('/settings') ? 'text-white' : 'opacity-70'}`} />
              <span className="font-medium lg:hidden xl:inline flex-1 text-left">Settings</span>
              {settingsExpanded ? (
                <ChevronDown className={`h-4 w-4 lg:hidden xl:block ${pathname.startsWith('/settings') ? 'text-white' : 'opacity-70'}`} />
              ) : (
                <ChevronRight className={`h-4 w-4 lg:hidden xl:block ${pathname.startsWith('/settings') ? 'text-white' : 'opacity-70'}`} />
              )}

              {/* Tooltip for tablet view */}
              <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Settings
              </span>
            </button>

            {/* Settings Sub-items */}
            {settingsExpanded && (
              <div className="lg:hidden xl:block space-y-1 pl-4">
                {/* General Settings */}
                <Link
                  href="/settings"
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 p-3 min-h-[44px] rounded-lg
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-ring
                    touch-manipulation
                    ${pathname === '/settings'
                      ? 'bg-muted shadow-sm'
                      : 'hover:bg-muted/50'
                    }
                  `}
                  title="General Settings"
                >
                  <Settings className="h-4 w-4 text-orange-500/70" />
                  <span className={`text-sm font-medium ${pathname === '/settings' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    General
                  </span>
                </Link>

                {/* Data Management */}
                <Link
                  href="/settings/data-management"
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 p-3 min-h-[44px] rounded-lg
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-ring
                    touch-manipulation
                    ${pathname === '/settings/data-management'
                      ? 'bg-muted shadow-sm'
                      : 'hover:bg-muted/50'
                    }
                  `}
                  title="Data Management"
                >
                  <Database className="h-4 w-4 text-emerald-500/70" />
                  <span className={`text-sm font-medium ${pathname === '/settings/data-management' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Data Management
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Debug Link - Visible for all users */}
          <Link
            href="/admin"
            onClick={closeSidebar}
            aria-current={pathname === '/admin' ? 'page' : undefined}
            className={`
              group relative flex items-center gap-3 p-4 min-h-[48px] rounded-xl
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-ring
              touch-manipulation
              ${pathname === '/admin'
                ? 'bg-gradient-to-r from-red-400/70 to-pink-400/70 text-white border-l-4 border-red-500'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
              lg:justify-center xl:justify-start
            `}
            title="Debug"
            style={pathname === '/admin' ? { boxShadow: 'var(--shadow-subtle)' } : {}}
          >
            <Shield className={`h-5 w-5 ${pathname === '/admin' ? 'text-white' : 'text-red-500/70'}`} />
            <span className="font-medium lg:hidden xl:inline">Debug</span>

            {/* Tooltip for tablet view */}
            <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Debug
            </span>
          </Link>
        </nav>

        {/* User Info or Login Button */}
        <div className="p-5 border-t border-border">
          {user ? (
            <Link
              href="/profile"
              onClick={closeSidebar}
              className="flex items-center gap-3 lg:justify-center xl:justify-start p-3 rounded-xl hover:bg-muted transition-all cursor-pointer group"
              title="Go to Profile"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full ring-2 ring-primary/40 flex-shrink-0 group-hover:ring-primary transition-all"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white flex-shrink-0 transition-all">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div className="truncate lg:hidden xl:block">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {user.displayName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={closeSidebar}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ boxShadow: 'var(--shadow-card)' }}
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
