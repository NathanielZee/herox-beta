"use client"

import { useEffect, useState } from "react"
import { Search, Play, Home, Calendar, Bookmark, User, Crown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { fetchSchedule } from "@/lib/anilist"
import { usePremium } from "@/contexts/PremiumContext"

interface ScheduleItem {
  id: number
  title: {
    romaji: string
    english: string
  }
  coverImage: {
    large: string
    medium: string
  }
  nextAiringEpisode: {
    episode: number
    airingAt: number
  }
  format: string
  averageScore?: number
  genres?: string[]
  status?: string
  episodes?: number
  season?: string
  seasonYear?: number
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [myListIds, setMyListIds] = useState<number[]>([])

  // Premium user state (same as old working code)
  const [isPremiumUser, setIsPremiumUser] = useState(false)

  // Use premium context 
  const { isPremium } = usePremium()

  // Check if user is authenticated and premium (for crown icon) - EXACT SAME LOGIC AS HOME PAGE
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData && isPremium) {
      setIsPremiumUser(true)
    } else {
      setIsPremiumUser(false)
    }
  }, [isPremium])

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await fetchSchedule()
        setScheduleData(data)
      } catch (error) {
        console.error("Error loading schedule:", error)
      } finally {
        setLoading(false)
      }
    }

    // Load current my list IDs
    const loadMyList = () => {
      const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
      setMyListIds(savedListIds)
    }

    loadSchedule()
    loadMyList()
  }, [])

  const handleAddToMyList = async (anime: ScheduleItem) => {
    // Check if user is authenticated
    const user = localStorage.getItem("user")
    if (!user) {
      // Redirect to auth if not logged in
      window.location.href = "/auth"
      return
    }

    try {
      // Get current lists
      const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
      const savedAnimeDetails = JSON.parse(localStorage.getItem("myAnimeDetails") || "{}")

      // Check if already in list
      if (savedListIds.includes(anime.id)) {
        return // Already in list
      }

      // Create properly structured anime data for My List
      const animeForMyList = {
        id: anime.id,
        title: {
          romaji: anime.title.romaji,
          english: anime.title.english || anime.title.romaji
        },
        coverImage: {
          large: anime.coverImage.large,
          medium: anime.coverImage.medium
        },
        averageScore: anime.averageScore || 0,
        genres: anime.genres || [],
        format: anime.format || "TV",
        status: anime.status || "RELEASING",
        episodes: anime.episodes || 0,
        season: anime.season || "UNKNOWN",
        seasonYear: anime.seasonYear || new Date().getFullYear()
      }

      // Add to lists
      const updatedIds = [...savedListIds, anime.id]
      const updatedDetails = {
        ...savedAnimeDetails,
        [anime.id]: animeForMyList
      }

      // Save to localStorage
      localStorage.setItem("myAnimeList", JSON.stringify(updatedIds))
      localStorage.setItem("myAnimeDetails", JSON.stringify(updatedDetails))

      // Update local state
      setMyListIds(updatedIds)

      console.log("Added to My List:", anime.title.english || anime.title.romaji)
    } catch (error) {
      console.error("Error adding to My List:", error)
    }
  }

  const handleRemoveFromMyList = (animeId: number) => {
    try {
      // Get current lists
      const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
      const savedAnimeDetails = JSON.parse(localStorage.getItem("myAnimeDetails") || "{}")

      // Remove from lists
      const updatedIds = savedListIds.filter((id: number) => id !== animeId)
      delete savedAnimeDetails[animeId]

      // Save to localStorage
      localStorage.setItem("myAnimeList", JSON.stringify(updatedIds))
      localStorage.setItem("myAnimeDetails", JSON.stringify(savedAnimeDetails))

      // Update local state
      setMyListIds(updatedIds)

      console.log("Removed from My List")
    } catch (error) {
      console.error("Error removing from My List:", error)
    }
  }

  const getFilteredSchedule = () => {
    const today = new Date()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + (selectedDay - today.getDay()))

    return scheduleData
      .filter((item) => {
        if (!item.nextAiringEpisode) return false
        const airingDate = new Date(item.nextAiringEpisode.airingAt * 1000)
        return airingDate.toDateString() === targetDate.toDateString()
      })
      .sort((a, b) => a.nextAiringEpisode.airingAt - b.nextAiringEpisode.airingAt)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const getDayNumber = (dayIndex: number) => {
    const today = new Date()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + (dayIndex - today.getDay()))
    return targetDate.getDate()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="H Anime Logo" width={32} height={32} className="object-contain" />
          <h1 className="text-xl font-bold text-white">Schedule</h1>
        </div>
        <Link href="/search">
          <Search className="w-6 h-6 text-white hover:text-[#ff914d] transition-colors cursor-pointer" />
        </Link>
      </div>

      {/* Day Selector */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {days.map((day, index) => (
            <button
              key={day}
              onClick={() => setSelectedDay(index)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-full transition-colors ${
                selectedDay === index ? "bg-[#ff914d] text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <span className="text-xs font-medium">{day}</span>
              <span className="text-sm font-bold">{getDayNumber(index)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule List */}
      <div className="px-6 pb-24">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-16 h-20 bg-gray-800 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-800 rounded-full w-16 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredSchedule().map((item) => {
              const isInMyList = myListIds.includes(item.id)
              
              return (
                <div key={item.id}>
                  {/* Time */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-[#ff914d] rounded-full"></div>
                    <span className="text-[#ff914d] text-sm font-bold">
                      {formatTime(item.nextAiringEpisode.airingAt)}
                    </span>
                  </div>

                  {/* Anime Item */}
                  <div className="flex gap-3 mb-6">
                    <Link
                      href={`/anime/${item.id}`}
                      className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={item.coverImage.large || "/placeholder.svg"}
                        alt={item.title.english || item.title.romaji}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="bg-black/60 rounded-full p-1">
                          <Play className="w-3 h-3 text-white fill-current" />
                        </div>
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-sm font-bold mb-1 line-clamp-2">
                        {item.title.english || item.title.romaji}
                      </h3>
                      <p className="text-gray-400 text-xs mb-2">Episode {item.nextAiringEpisode.episode}</p>
                      
                      {isInMyList ? (
                        <button 
                          onClick={() => handleRemoveFromMyList(item.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1 rounded-full flex items-center gap-1 transition-colors text-xs"
                        >
                          <span className="text-xs">✓</span>
                          In My List
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddToMyList(item)}
                          className="bg-[#ff914d] hover:bg-[#e8823d] text-white font-medium px-3 py-1 rounded-full flex items-center gap-1 transition-colors text-xs"
                        >
                          <span className="text-xs">+</span>
                          My List
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {getFilteredSchedule().length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No anime scheduled for this day</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
<div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
  <div className="flex justify-around items-center py-3">
    <Link href="/" className="flex flex-col items-center gap-1">
      <Home className="w-5 h-5 text-gray-400" />
      <span className="text-xs text-gray-400">Home</span>
    </Link>
    <Link href="/schedule" className="flex flex-col items-center gap-1">
      <Calendar className="w-5 h-5 text-[#ff914d]" />
      <span className="text-xs text-[#ff914d] font-medium">Schedule</span>
    </Link>
    <Link href="/my-list" className="flex flex-col items-center gap-1">
      <Bookmark className="w-5 h-5 text-gray-400" />
      <span className="text-xs text-gray-400">My List</span>
    </Link>
    <Link href="/profile" className="flex flex-col items-center gap-1 relative">
      <div className="relative">
        <Image 
          src="/unlicked.ico" 
          alt="Profile" 
          width={20} 
          height={20} 
          className="object-contain"
        />
        {/* Premium Crown Icon - same as old working code */}
        {isPremiumUser && (
          <Crown className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1 bg-black rounded-full" />
        )}
      </div>
      <span className="text-xs text-gray-400">Profile</span>
    </Link>
  </div>
</div>
    </div>
  )
}
