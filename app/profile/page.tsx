"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Settings, HelpCircle, LogOut, Home, Calendar, Bookmark, User, Crown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePremium } from "@/contexts/PremiumContext"

interface User {
  username: string
  email: string
  profileImage?: string
  coverImage?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  
  // Premium context
  const { isPremium, premiumStatus, getDaysRemaining } = usePremium()

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
      setIsAuthenticated(true)
    }
  }, [])

  const handleSignIn = () => {
    router.push("/auth")
  }

  const handleSignOut = () => {
    localStorage.removeItem("user")
    setIsAuthenticated(false)
    setUser(null)
    router.replace("/auth")
  }

  const daysRemaining = getDaysRemaining()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="H Anime Logo" width={32} height={32} className="object-contain" />
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>
        
        {/* Premium Badge in Header */}
        {isAuthenticated && isPremium && (
          <div className="bg-gradient-to-r from-[#ff914d] to-orange-600 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-bold">PREMIUM</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {!isAuthenticated ? (
          /* Sign In Prompt */
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-2">My profile</h2>
            <p className="text-gray-400 text-sm mb-6">Sign in to synchronize your anime</p>
            <button
              onClick={handleSignIn}
              className="w-full bg-[#ff914d] hover:bg-[#e8823d] text-white font-medium py-3 rounded-full transition-colors"
            >
              Continue
            </button>
          </div>
        ) : (
          /* User Profile */
          <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
            {/* Cover Image */}
            <div className="relative h-32 bg-gradient-to-r from-[#ff914d] to-orange-600">
              <Image
                src={user?.coverImage || "/cover/1-cover.jpg"}
                alt="Cover"
                fill
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Profile Content */}
            <div className="relative px-6 pb-6">
              {/* Profile Picture - Positioned to overlap cover */}
              <div className="relative -mt-12 mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-gray-900 overflow-hidden bg-gray-800">
                  <Image
                    src={user?.profileImage || "/profile/1.jpg"}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                </div>
              </div>

              {/* User Info */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  {user?.username}
                  {isPremium && (
                    <Crown className="w-5 h-5 text-[#ff914d]" />
                  )}
                </h2>
                <p className="text-gray-400 text-sm">{user?.email}</p>
              </div>

              {/* Premium Status Card */}
              {isPremium ? (
                <div className="mb-4 p-4 bg-gradient-to-r from-[#ff914d]/10 to-orange-600/10 border border-[#ff914d]/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#ff914d] to-orange-600 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Premium Member</h3>
                      <p className="text-[#ff914d] text-sm font-medium">
                        {premiumStatus.tier && premiumStatus.tier.charAt(0).toUpperCase() + premiumStatus.tier.slice(1)} Plan
                      </p>
                    </div>
                  </div>
                  
                  {daysRemaining !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Days remaining:</span>
                      <span className="text-white font-bold">
                        {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Premium Upgrade Prompt */
                <div className="mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Guest</h3>
                      <p className="text-gray-400 text-sm">Limited downloads & features</p>
                    </div>
                  </div>
                  
                  <Link 
                    href="/premium"
                    className="inline-flex items-center gap-2 bg-[#ff914d] hover:bg-[#e8823d] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Premium
                  </Link>
                </div>
              )}

              <button onClick={handleSignOut} className="flex items-center gap-2 text-[#ff914d] text-sm hover:underline">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Settings Menu */}
        <div className="space-y-3">
          <h3 className="text-gray-400 text-sm font-medium px-2 uppercase tracking-wider">Settings & Support</h3>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
            <Link href="/premium" className="flex items-center justify-between p-5 hover:bg-gray-700/30 transition-all duration-200 border-b border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ff914d] to-orange-600 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-medium">Premium</span>
                  <p className="text-gray-400 text-sm">Unlock all features</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPremium && (
                  <span className="bg-[#ff914d] text-white px-3 py-1 rounded-full text-xs font-bold">
                    ACTIVE
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>

            <Link href="/settings" className="flex items-center justify-between p-5 hover:bg-gray-700/30 transition-all duration-200 border-b border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-medium">Settings</span>
                  <p className="text-gray-400 text-sm">App preferences</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link href="/help-center" className="flex items-center justify-between p-5 hover:bg-gray-700/30 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-medium">Help Center</span>
                  <p className="text-gray-400 text-sm">Get support</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
        <div className="flex justify-around items-center py-3">
          <Link href="/" className="flex flex-col items-center gap-1">
            <Home className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">Home</span>
          </Link>
          <Link href="/schedule" className="flex flex-col items-center gap-1">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">Schedule</span>
          </Link>
          <Link href="/my-list" className="flex flex-col items-center gap-1">
            <Bookmark className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">My List</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 relative">
            <div className="relative">
              <Image 
                src="/clicked.ico" 
                alt="Profile" 
                width={20} 
                height={20} 
                className="object-contain"
              />
              {/* Premium Crown Icon */}
              {isAuthenticated && isPremium && (
                <Crown className="w-3 h-3 text-[#ff914d] absolute -top-1 -right-1 bg-black rounded-full" />
              )}
            </div>
            <span className="text-xs text-[#ff914d] font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  )
}