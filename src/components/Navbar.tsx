'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, Home, LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowUserMenu(false)
      // Redirect to login page after successful sign out
      window.location.href = '/login'
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b-4 border-purple-500 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: App Title & Navigation */}
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              ✨ Focus Notebook
            </h1>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105 ${
                  pathname === '/' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-purple-100'
                }`}
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
              <Link
                href="/tasks"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105 ${
                  pathname === '/tasks' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-blue-100'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </Link>
              <Link
                href="/settings"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105 ${
                  pathname === '/settings' 
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-orange-100'
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>

          {/* Right side: User Info */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* User Info */}
                <div className="hidden md:flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-md border-2 border-purple-200">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-8 w-8 rounded-full ring-2 ring-purple-400"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                      {user.displayName || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {user.email}
                    </span>
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105 bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md hover:shadow-lg"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-md"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

