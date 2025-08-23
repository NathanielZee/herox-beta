"use client"

import { useEffect, useState } from "react"
import { Search, Home, Calendar, Bookmark, User, X, Crown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePremium } from "@/contexts/PremiumContext"

interface AnimeData {
  id: number
  title: {
    romaji: string
    english: string
  }
  coverImage: {
    large: string
    medium: string
  }
  averageScore: number
  genres: string[]
  format: string
  status: string
  episodes: number
  season: string
  seasonYear: number
  chapters?: number
  volumes?: number
}

export default function MyListPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [myList, setMyList] = useState<AnimeData[]>([])
  const [loading, setLoading] = useState(true)

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
    // Check if user is authenticated
    const user = localStorage.getItem("user")
    setIsAuthenticated(!!user)
    
    if (user) {
      try {
        // Load user's anime list
        const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
        const savedAnimeDetails = JSON.parse(localStorage.getItem("myAnimeDetails") || "{}")
        
        // Convert saved data to array and ensure data integrity
        const animeList = savedListIds
          .map((id: number) => {
            const anime = savedAnimeDetails[id]
            if (!anime) return null
            
            // Ensure all required properties exist with safe defaults
            return {
              id: anime.id || id,
              title: {
                romaji: anime.title?.romaji || "Unknown Title",
                english: anime.title?.english || anime.title?.romaji || "Unknown Title"
              },
              coverImage: {
                large: anime.coverImage?.large || "/placeholder.svg",
                medium: anime.coverImage?.medium || "/placeholder.svg"
              },
              averageScore: anime.averageScore || 0,
              genres: Array.isArray(anime.genres) ? anime.genres : [],
              format: anime.format || "TV",
              status: anime.status || "UNKNOWN",
              episodes: anime.episodes || 0,
              season: anime.season || "UNKNOWN",
              seasonYear: anime.seasonYear || new Date().getFullYear(),
              chapters: anime.chapters,
              volumes: anime.volumes
            }
          })
          .filter(Boolean)
        
        setMyList(animeList)
      } catch (error) {
        console.error("Error loading anime list:", error)
        // Clear corrupted data and start fresh
        localStorage.removeItem("myAnimeList")
        localStorage.removeItem("myAnimeDetails")
        setMyList([])
      }
    }
    
    setLoading(false)
  }, [])

  const handleSignIn = () => {
    // Redirect to auth page
    router.push("/auth")
  }

  const handleAnimeClick = (animeId: number, isMangas: boolean = false) => {
    if (isMangas) {
      router.push(`/manga/${animeId}`)
    } else {
      router.push(`/anime/${animeId}`)
    }
  }

  const handleRemoveFromList = (e: React.MouseEvent, animeId: number) => {
    e.stopPropagation()
    
    // Remove from local state
    const updatedList = myList.filter(anime => anime.id !== animeId)
    setMyList(updatedList)
    
    // Update localStorage
    const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
    const savedAnimeDetails = JSON.parse(localStorage.getItem("myAnimeDetails") || "{}")
    
    const updatedIds = savedListIds.filter((id: number) => id !== animeId)
    delete savedAnimeDetails[animeId]
    
    localStorage.setItem("myAnimeList", JSON.stringify(updatedIds))
    localStorage.setItem("myAnimeDetails", JSON.stringify(savedAnimeDetails))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="H Anime Logo" width={32} height={32} className="object-contain" />
            <h1 className="text-xl font-bold text-white">My List</h1>
          </div>
          <Link href="/search">
            <Search className="w-6 h-6 text-white hover:text-[#ff914d] transition-colors cursor-pointer" />
          </Link>
        </div>

        {/* Sign In Prompt */}
        <div className="px-6 py-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-2">My profile</h2>
            <p className="text-gray-400 text-sm mb-6">Sign in to synchronize your anime</p>
            <button
              onClick={handleSignIn}
              className="w-full bg-[#ff914d] hover:bg-[#e8823d] text-white font-medium py-3 rounded-full transition-colors"
            >
              Continue
            </button>
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
      <Bookmark className="w-5 h-5 text-[#ff914d]" />
      <span className="text-xs text-[#ff914d] font-medium">My List</span>
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="H Anime Logo" width={32} height={32} className="object-contain" />
          <h1 className="text-xl font-bold text-white">My List</h1>
        </div>
        <Link href="/search">
          <Search className="w-6 h-6 text-white hover:text-[#ff914d] transition-colors cursor-pointer" />
        </Link>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-24 h-32 bg-gray-800 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-800 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : myList.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            </div>
            <p className="text-gray-400 text-lg mb-2">Your anime list is empty</p>
            <p className="text-gray-500 text-sm mb-6">Start adding anime to your list to see them here</p>
            <button 
              onClick={() => router.push("/")}
              className="bg-[#ff914d] hover:bg-[#e8823d] text-white font-medium py-3 px-6 rounded-full transition-colors"
            >
              Explore Anime
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-400 text-sm">
                {myList.length} {myList.length === 1 ? "anime" : "anime"} in your list
              </p>
            </div>
            <div className="space-y-4">
              {myList.map((anime) => {
                // Additional safety check
                if (!anime || !anime.id) {
                  return null
                }
                
                const isMangas = anime.format === "MANGA" || anime.format === "MANHWA" || anime.format === "ONE_SHOT"
                return (
                  <div 
                    key={anime.id} 
                    className="flex gap-3 cursor-pointer hover:bg-gray-900 transition-colors duration-200 rounded-lg p-2 -mx-2 relative group"
                    onClick={() => handleAnimeClick(anime.id, isMangas)}
                  >
                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleRemoveFromList(e, anime.id)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Anime Cover */}
                    <div className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={anime.coverImage?.large || "/placeholder.svg"}
                        alt={anime.title?.english || anime.title?.romaji || "Anime"}
                        fill
                        className="object-cover"
                      />
                      {/* Rating Badge */}
                      <div className="absolute top-1.5 left-1.5 bg-white text-black text-xs font-bold px-1.5 py-0.5 rounded text-[10px]">
                        PG-13
                      </div>
                      {/* HD Badge */}
                      <div className="absolute top-1.5 right-1.5 bg-[#ff914d] text-white text-xs font-bold px-1.5 py-0.5 rounded text-[10px]">
                        HD
                      </div>
                    </div>

                    {/* Anime Info */}
                    <div className="flex-1 pt-1">
                      <h3 className="text-white text-base font-bold mb-1.5 leading-tight line-clamp-2">
                        {anime.title?.english || anime.title?.romaji || "Unknown Title"}
                      </h3>

                      <p className="text-white text-sm mb-2">{anime.seasonYear || "2025"}</p>

                      <p className="text-gray-400 text-xs mb-3 leading-relaxed line-clamp-2">
                        {(() => {
                          try {
                            if (anime.genres && Array.isArray(anime.genres) && anime.genres.length > 0) {
                              return anime.genres.slice(0, 3).join(", ")
                            }
                            return "No genres available"
                          } catch (error) {
                            console.error("Error processing genres:", error)
                            return "Error loading genres"
                          }
                        })()}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="bg-green-600 text-white font-medium px-3 py-1 rounded-full text-xs">
                          In List
                        </span>
                        {anime.averageScore && (
                          <span className="text-gray-400 text-xs">
                            ★ {anime.averageScore / 10}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
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
      <Calendar className="w-5 h-5 text-gray-400" />
      <span className="text-xs text-gray-400">Schedule</span>
    </Link>
    <Link href="/my-list" className="flex flex-col items-center gap-1">
      <Bookmark className="w-5 h-5 text-[#ff914d]" />
      <span className="text-xs text-[#ff914d] font-medium">My List</span>
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