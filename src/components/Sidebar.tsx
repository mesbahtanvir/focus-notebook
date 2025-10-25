'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, Settings, User, Wrench, Menu, X, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
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

  const navItems = [
    { href: '/', icon: Home, label: 'Home', color: 'from-purple-500 to-pink-500' },
    { href: '/tools', icon: Wrench, label: 'Tools', color: 'from-green-500 to-emerald-500' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'from-blue-500 to-cyan-500' },
    { href: '/settings', icon: Settings, label: 'Settings', color: 'from-orange-500 to-yellow-500' },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300"
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
                  group relative flex items-center gap-3 p-3 rounded-xl
                  transition-all duration-200 transform
                  focus:outline-none focus:ring-4 focus:ring-purple-300
                  ${isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md scale-105`
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 hover:scale-105'
                  }
                  lg:justify-center xl:justify-start
                `}
                title={item.label}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <span className="font-medium lg:hidden xl:inline">{item.label}</span>
                
                {/* Tooltip for tablet view */}
                <span className="hidden lg:block xl:hidden absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Debug Link - Visible for all users */}
          <Link
            href="/admin"
            onClick={closeSidebar}
            aria-current={pathname === '/admin' ? 'page' : undefined}
            className={`
              group relative flex items-center gap-3 p-3 rounded-xl
              transition-all duration-200 transform
              focus:outline-none focus:ring-4 focus:ring-blue-300
              ${pathname === '/admin'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md scale-105'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100 hover:scale-105'
              }
              lg:justify-center xl:justify-start
            `}
            title="Debug"
          >
            <Shield className={`h-5 w-5 ${pathname === '/admin' ? 'text-white' : 'text-blue-600'}`} />
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
