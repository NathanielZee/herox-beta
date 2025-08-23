"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Home, Calendar, Bookmark, User, Bell, Crown, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface DailyNotification {
  id: string
  title: string
  message: string
  icon: "crown" | "bell"
  date: string
  read: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<DailyNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [isPremiumUser, setIsPremiumUser] = useState(false)

  // Premium advertising messages
  const premiumAds = [
    {
      title: "🚀 Unlock Premium Features!",
      message: "Get unlimited downloads, HD quality, and ad-free experience. Upgrade to Premium today!"
    },
    {
      title: "⭐ Premium Weekly - Best Value!",
      message: "Try Premium for just $2.99/week. Bulk download entire seasons and enjoy 4K quality!"
    },
    {
      title: "🎯 Missing Out on Premium?",
      message: "Premium users get early access to new episodes and exclusive content. Join now!"
    },
    {
      title: "💎 Premium Experience Awaits",
      message: "No ads, unlimited downloads, and crystal clear HD. Your anime deserves Premium quality!"
    },
    {
      title: "🔥 Limited Time: Premium Trial",
      message: "Start your 7-day free Premium trial and experience anime like never before!"
    }
  ]

  useEffect(() => {
    // Check if user is premium
    const premiumStatus = localStorage.getItem("premium_status")
    const isPremium = premiumStatus ? JSON.parse(premiumStatus).isPremium : false
    setIsPremiumUser(isPremium)

    // Load notifications
    loadNotifications(isPremium)
  }, [])

  const loadNotifications = (isPremium: boolean) => {
    const today = new Date().toDateString()
    const storedNotifications = JSON.parse(localStorage.getItem("dailyNotifications") || "[]")
    
    // If user is premium, don't show any notifications
    if (isPremium) {
      setNotifications([])
      setLoading(false)
      return
    }

    // Check if we already have notifications for today
    const todayNotifications = storedNotifications.filter(
      (notification: DailyNotification) => new Date(notification.date).toDateString() === today
    )

    let updatedNotifications = [...storedNotifications]

    // If no notifications for today, create 2 new ones
    if (todayNotifications.length === 0) {
      const randomAds = [...premiumAds].sort(() => Math.random() - 0.5).slice(0, 2)
      
      const newNotifications = randomAds.map((ad, index) => ({
        id: `${Date.now()}-${index}`,
        title: ad.title,
        message: ad.message,
        icon: "crown" as const,
        date: new Date().toISOString(),
        read: false
      }))

      updatedNotifications = [...newNotifications, ...storedNotifications]
      localStorage.setItem("dailyNotifications", JSON.stringify(updatedNotifications))
    }

    // Keep only last 7 days of notifications
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const filteredNotifications = updatedNotifications.filter(
      (notification: DailyNotification) => new Date(notification.date) > sevenDaysAgo
    )

    setNotifications(filteredNotifications)
    setLoading(false)
  }

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    )
    setNotifications(updatedNotifications)
    localStorage.setItem("dailyNotifications", JSON.stringify(updatedNotifications))
  }

  const dismissNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId)
    setNotifications(updatedNotifications)
    localStorage.setItem("dailyNotifications", JSON.stringify(updatedNotifications))
  }

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/")}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <Image src="/logo.png" alt="H Anime Logo" width={32} height={32} className="object-contain" />
          <h1 className="text-xl font-bold text-white">Notifications</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4 bg-gray-900 rounded-lg animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-5 bg-gray-800 rounded w-3/4"></div>
                  <div className="w-5 h-5 bg-gray-800 rounded"></div>
                </div>
                <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : isPremiumUser ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <Crown className="w-16 h-16 text-[#ff914d] mx-auto mb-4" />
            </div>
            <p className="text-white text-lg mb-2">You're a Premium User!</p>
            <p className="text-gray-400 text-sm mb-6">
              Enjoy an ad-free experience with no promotional notifications
            </p>
            <button 
              onClick={() => router.push("/")}
              className="bg-[#ff914d] hover:bg-[#e8823d] text-white font-medium py-3 px-6 rounded-full transition-colors"
            >
              Continue Watching
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            </div>
            <p className="text-gray-400 text-lg mb-2">No notifications today</p>
            <p className="text-gray-500 text-sm">
              Check back tomorrow for updates and premium offers
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-4 rounded-lg transition-colors ${
                    notification.read 
                      ? "bg-gray-900" 
                      : "bg-gradient-to-r from-[#ff914d]/10 to-orange-600/10 border border-[#ff914d]/20"
                  }`}
                >
                  {/* Dismiss Button */}
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="absolute top-3 right-3 p-1 hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>

                  <div 
                    className="cursor-pointer pr-8"
                    onClick={() => {
                      markAsRead(notification.id)
                      router.push("/premium")
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Notification Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 bg-[#ff914d] rounded-full flex items-center justify-center">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className={`text-sm font-bold line-clamp-1 ${
                            notification.read ? "text-gray-300" : "text-white"
                          }`}>
                            {notification.title}
                          </h3>
                        </div>

                        <p className={`text-xs mb-2 line-clamp-2 ${
                          notification.read ? "text-gray-500" : "text-gray-300"
                        }`}>
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatNotificationTime(notification.date)}
                          </span>
                          <span className="text-xs text-[#ff914d] font-medium">
                            Tap to learn more
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}