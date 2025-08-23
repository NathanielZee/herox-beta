"use client"

import { useEffect, useState } from "react"
import { WifiOff, RefreshCw, Home, Smartphone } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check if we're online
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Auto-redirect to home when connection is restored
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="Herox Logo"
          width={60}
          height={60}
          className="object-contain"
        />
      </div>

      {/* Offline Icon with Animation */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse"></div>
        <div className="relative bg-red-500/10 p-6 rounded-full border border-red-500/30">
          <WifiOff className="w-12 h-12 text-red-400" />
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-3 text-white">
          {isOnline ? "Connection Restored!" : "You're Offline"}
        </h1>
        <p className="text-gray-400 text-lg mb-2">
          {isOnline 
            ? "Great! Your internet connection is back." 
            : "No internet connection detected."
          }
        </p>
        <p className="text-gray-500 text-sm">
          {isOnline
            ? "Redirecting you back to Herox..."
            : "Check your connection and try again."
          }
        </p>
      </div>

      {/* Connection Status Indicator */}
      <div className="flex items-center gap-3 mb-8 p-3 rounded-lg bg-gray-900 border border-gray-800">
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-sm text-gray-300">
          {isOnline ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isOnline}
          className={`flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
            isOnline
              ? "bg-green-600 text-white cursor-not-allowed"
              : "bg-[#ff914d] hover:bg-[#e8823d] text-black cursor-pointer active:scale-95"
          }`}
        >
          {isOnline ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </>
          )}
        </button>

        {/* Go Home Button */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-all duration-200 active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Go to Home</span>
        </Link>
      </div>

      {/* Offline Features */}
      {!isOnline && (
        <div className="mt-12 p-6 rounded-lg bg-gray-900/50 border border-gray-800 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4 text-center text-white">
            What you can do offline:
          </h3>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#ff914d] flex-shrink-0" />
              <span>View previously loaded content</span>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#ff914d] flex-shrink-0" />
              <span>Browse your saved anime list</span>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#ff914d] flex-shrink-0" />
              <span>Check your profile settings</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Connect to the internet to access new content and features.
          </p>
        </div>
      )}

      {/* App Info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-600">
          Herox - Best Anime App
        </p>
        <p className="text-xs text-gray-700 mt-1">
          v1.0.0 • TWA Mode
        </p>
      </div>
    </div>
  )
}