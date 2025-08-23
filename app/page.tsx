"use client"

import { useEffect, useState } from "react"
import { Home, Search, Bell, Calendar, Bookmark, User, Play, Crown } from "lucide-react"
import {
  fetchTopAiring,
  fetchNewEpisodeReleases,
  fetchMostFavorite,
  fetchTopTVSeries,
  fetchTopMovie,
  fetchMostPopular,
  fetchTrendingAnime,
  fetchTrendingManga,
  fetchTrendingManhwa,
  fetchTrendingManhua,
} from "@/lib/anilist"
import { AnimeSection } from "@/components/anime-section"
import { ContentToggle } from "@/components/content-toggle"
import { SplashScreen } from "@/components/splash-screen"
import Image from "next/image"
import Link from "next/link"
import type { AnimeData } from "@/lib/anilist"
import { useRouter } from "next/navigation"
import { usePremium } from "@/contexts/PremiumContext"

export default function AnimeStreamingApp() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"anime" | "manga">("anime")

  // Splash screen state - this controls if we show splash or home page
  const [showSplash, setShowSplash] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  // Premium user state (same as old working code)
  const [isPremiumUser, setIsPremiumUser] = useState(false)

  // Use premium context 
  const { isPremium } = usePremium()

  // Check if user is authenticated and premium (for crown icon)
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData && isPremium) {
      setIsPremiumUser(true)
    } else {
      setIsPremiumUser(false)
    }
  }, [isPremium])

  // Check if user should see splash screen or go directly to home
  useEffect(() => {
    const checkUserStatus = () => {
      const user = localStorage.getItem('user')
      
      if (user) {
        // User is logged in, go directly to home page
        setShowSplash(false)
      } else {
        // User is not logged in, show splash screen
        setShowSplash(true)
      }
      setIsLoading(false)
    }

    checkUserStatus()
  }, [])

  // Handle closing splash screen (when user goes to auth)
  const handleCloseSplash = () => {
    setShowSplash(false)
  }

  // State to track if hero anime is in user's list
  const [isHeroInList, setIsHeroInList] = useState(false)

  // Anime state
  const [topAiring, setTopAiring] = useState<AnimeData[]>([])
  const [newEpisodeReleases, setNewEpisodeReleases] = useState<AnimeData[]>([])
  const [mostFavorite, setMostFavorite] = useState<AnimeData[]>([])
  const [topTVSeries, setTopTVSeries] = useState<AnimeData[]>([])
  const [topMovie, setTopMovie] = useState<AnimeData[]>([])
  const [mostPopular, setMostPopular] = useState<AnimeData[]>([])
  const [trendingAnime, setTrendingAnime] = useState<AnimeData[]>([])

  // Manga state
  const [trendingManga, setTrendingManga] = useState<AnimeData[]>([])
  const [trendingManhwa, setTrendingManhwa] = useState<AnimeData[]>([])
  const [trendingManhua, setTrendingManhua] = useState<AnimeData[]>([])

  const [loading, setLoading] = useState(true)
  const [heroIndex, setHeroIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const currentList = activeTab === "anime" ? trendingAnime : trendingManga
    if (currentList.length > 0) {
      const interval = setInterval(() => {
        setIsTransitioning(true)
        setTimeout(() => {
          setHeroIndex((prevIndex) => (prevIndex + 1) % Math.min(currentList.length, 5))
          setIsTransitioning(false)
        }, 300)
      }, 6000)

      return () => clearInterval(interval)
    }
  }, [activeTab, trendingAnime, trendingManga])

  const heroAnime =
    activeTab === "anime"
      ? trendingAnime.length > 0
        ? trendingAnime[heroIndex]
        : null
      : trendingManga.length > 0
        ? trendingManga[heroIndex]
        : null

  // Check if hero anime is in user's list whenever hero changes
  useEffect(() => {
    if (heroAnime) {
      checkIfInList(heroAnime.id)
    }
  }, [heroAnime])

  const checkIfInList = (animeId: number) => {
    try {
      const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
      setIsHeroInList(savedListIds.includes(animeId))
    } catch (error) {
      console.error("Error checking if anime is in list:", error)
      setIsHeroInList(false)
    }
  }

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!heroAnime) {
      console.log("No hero anime available")
      return
    }

    try {
      const savedListIds = JSON.parse(localStorage.getItem("myAnimeList") || "[]")
      const savedAnimeDetails = JSON.parse(localStorage.getItem("myAnimeDetails") || "{}")

      if (isHeroInList) {
        // Remove from list
        const updatedIds = savedListIds.filter((id: number) => id !== heroAnime.id)
        delete savedAnimeDetails[heroAnime.id]
        
        localStorage.setItem("myAnimeList", JSON.stringify(updatedIds))
        localStorage.setItem("myAnimeDetails", JSON.stringify(savedAnimeDetails))
        setIsHeroInList(false)
        console.log("Removed from list:", heroAnime.title.english || heroAnime.title.romaji)
      } else {
        // Add to list
        const updatedIds = [...savedListIds, heroAnime.id]
        savedAnimeDetails[heroAnime.id] = heroAnime
        
        localStorage.setItem("myAnimeList", JSON.stringify(updatedIds))
        localStorage.setItem("myAnimeDetails", JSON.stringify(savedAnimeDetails))
        setIsHeroInList(true)
        console.log("Added to list:", heroAnime.title.english || heroAnime.title.romaji)
      }
    } catch (error) {
      console.error("Error updating bookmark:", error)
    }
  }

  useEffect(() => {
    const loadAnimeData = async () => {
      try {
        const [airing, episodes, favorite, tvSeries, movie, popular, trending] = await Promise.all([
          fetchTopAiring(),
          fetchNewEpisodeReleases(),
          fetchMostFavorite(),
          fetchTopTVSeries(),
          fetchTopMovie(),
          fetchMostPopular(),
          fetchTrendingAnime(),
        ])

        setTopAiring(airing)
        setNewEpisodeReleases(episodes)
        setMostFavorite(favorite)
        setTopTVSeries(tvSeries)
        setTopMovie(movie)
        setMostPopular(popular)
        setTrendingAnime(trending)
      } catch (error) {
        console.error("Error loading anime data:", error)
      }
    }

    const loadMangaData = async () => {
      try {
        const [manga, manhwa, manhua] = await Promise.all([
          fetchTrendingManga(),
          fetchTrendingManhwa(),
          fetchTrendingManhua(),
        ])

        setTrendingManga(manga)
        setTrendingManhwa(manhwa)
        setTrendingManhua(manhua)
      } catch (error) {
        console.error("Error loading manga data:", error)
      }
    }

    Promise.all([loadAnimeData(), loadMangaData()]).finally(() => {
      setLoading(false)
    })
  }, [])

  const handleHeroButtonClick = () => {
    if (heroAnime) {
      const path = activeTab === "anime" ? `/anime/${heroAnime.id}` : `/manga/${heroAnime.id}`
      router.push(path)
    }
  }

  // Show loading or splash screen first
  if (isLoading) {
    return <div className="min-h-screen bg-black"></div>
  }

  // Show splash screen for non-logged-in users
  if (showSplash) {
    return <SplashScreen onClose={handleCloseSplash} />
  }

  // Show home page for logged-in users
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative mb-4">
        <div className="relative h-96 overflow-hidden bg-gray-800">
          {heroAnime && (
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
            >
              <Image
                src={heroAnime.bannerImage || heroAnime.coverImage.extraLarge || heroAnime.coverImage.large || "/placeholder.svg"}
                alt={heroAnime.title.english || heroAnime.title.romaji}
                fill
                className="object-cover"
                priority
                quality={100}
                sizes="100vw"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />

          {/* Logo */}
          <div className="absolute top-4 left-6 z-10">
            <Image
              src="/logo.png"
              alt="Fox Anime Logo"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>

          {/* Content Toggle Component */}
          <ContentToggle activeTab={activeTab} onTabChange={setActiveTab} />

         {/* Search and Notification Icons */}
<div className="absolute top-4 right-6 z-10 flex gap-4">
  <button onClick={() => router.push("/search")}>
    <Search className="w-5 h-5 text-white hover:text-[#ff914d] transition-colors cursor-pointer" />
  </button>
  <Link href="/notifications" className="relative">
    <Bell className="w-5 h-5 text-white hover:text-[#ff914d] transition-colors cursor-pointer" />
    
    {/* Notification badge (orange dot) */}
    <span className="absolute top-0 right-0 block w-2 h-2 bg-orange-500 rounded-full ring-2 ring-black"></span>
  </Link>
</div>

          {/* Hero Content */}
          {heroAnime && (
            <div
              className={`absolute bottom-3 left-4 right-4 z-10 transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
            >
              <h1 className="text-base font-bold mb-1 text-white line-clamp-1">
                {heroAnime.title.english || heroAnime.title.romaji}
              </h1>
              <p className="text-gray-300 mb-3 text-xs">
                {heroAnime.genres.slice(0, 2).join(", ")} • {heroAnime.format} •{" "}
                {activeTab === "anime"
                  ? heroAnime.episodes
                    ? `${heroAnime.episodes} eps`
                    : "Ongoing"
                  : heroAnime.chapters
                    ? `${heroAnime.chapters} ch`
                    : "Ongoing"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleHeroButtonClick}
                  className="bg-[#ff914d] font-medium flex items-center gap-2 hover:bg-[#e8823d] transition-all duration-200 text-xs text-black rounded px-4 sm:px-6 md:px-8 lg:px-12 py-2 flex-1 justify-center whitespace-nowrap min-w-0"
                >
                  <Play className="w-4 h-4 fill-current flex-shrink-0" />
                  <span className="truncate">
                    {activeTab === "anime" ? "Start Watching" : "Start Reading"}
                  </span>
                </button>
                <button 
                  onClick={handleBookmarkClick}
                  className={`w-10 h-10 flex items-center justify-center border hover:bg-gray-700 transition-all duration-200 backdrop-blur-sm rounded flex-shrink-0 ${
                    isHeroInList 
                      ? "bg-[rgba(255,145,77,0.2)] text-[rgba(255,145,77,1)] border-[rgba(255,145,77,1)]" 
                      : "bg-transparent text-[rgba(255,145,77,1)] border-[rgba(255,145,77,1)]"
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${isHeroInList ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Middle content overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Sections */}
      {activeTab === "anime" ? (
        <>
          <AnimeSection title="Top Airing" animeList={topAiring} loading={loading} sectionSlug="top-airing" />
          <AnimeSection
            title="New Episode Releases"
            animeList={newEpisodeReleases}
            loading={loading}
            sectionSlug="new-episodes"
          />
          <AnimeSection
            title="Most Favorite"
            animeList={mostFavorite}
            loading={loading}
            showRanking={true}
            sectionSlug="most-favorite"
          />
          <AnimeSection title="Top TV Series" animeList={topTVSeries} loading={loading} sectionSlug="top-tv-series" />
          <AnimeSection title="Top Movie" animeList={topMovie} loading={loading} sectionSlug="top-movie" />
          <AnimeSection title="Most Popular" animeList={mostPopular} loading={loading} sectionSlug="most-popular" />
        </>
      ) : (
        <>
          <AnimeSection
            title="Trending Manga"
            animeList={trendingManga}
            loading={loading}
            sectionSlug="trending-manga"
            isMangas={true}
          />
          <AnimeSection
            title="Trending Manhwa"
            animeList={trendingManhwa}
            loading={loading}
            sectionSlug="trending-manhwa"
            isMangas={true}
          />
          <AnimeSection
            title="Trending Manhua"
            animeList={trendingManhua}
            loading={loading}
            sectionSlug="trending-manhua"
            isMangas={true}
          />
        </>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
        <div className="flex justify-around items-center py-3">
          <Link href="/" className="flex flex-col items-center gap-1">
            <Home className="w-5 h-5 text-[#ff914d]" />
            <span className="text-xs text-[#ff914d] font-medium">Home</span>
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

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  )
}
