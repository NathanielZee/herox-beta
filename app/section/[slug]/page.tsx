"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Search, Check } from "lucide-react"
import Image from "next/image"
import {
  fetchTopAiring,
  fetchNewEpisodeReleases,
  fetchMostFavorite,
  fetchTopTVSeries,
  fetchTopMovie,
  fetchMostPopular,
  fetchTrendingManga,
  fetchTrendingManhua,
} from "@/lib/anilist"

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

const sectionConfig = {
  "top-airing": { title: "Top Airing", fetchFunction: fetchTopAiring },
  "new-episodes": { title: "New Episode Releases", fetchFunction: fetchNewEpisodeReleases },
  "most-favorite": { title: "Most Favorite", fetchFunction: fetchMostFavorite },
  "top-tv-series": { title: "Top TV Series", fetchFunction: fetchTopTVSeries },
  "top-movie": { title: "Top Movie", fetchFunction: fetchTopMovie },
  "most-popular": { title: "Most Popular", fetchFunction: fetchMostPopular },
  "trending-manga": { title: "Trending Manga", fetchFunction: fetchTrendingManga },
  "trending-manhwa": { title: "Trending Manhwa", fetchFunction: fetchTrendingManhua },
  "trending-manhua": { title: "Trending Manhua", fetchFunction: fetchTrendingManhua },
}

export default function SectionPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [animeList, setAnimeList] = useState<AnimeData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [myList, setMyList] = useState<number[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const config = sectionConfig[slug as keyof typeof sectionConfig]
  const isMangas = slug.includes("manga") || slug.includes("manhwa") || slug.includes("manhua")

  // Check authentication and load user's list
  useEffect(() => {
    const user = localStorage.getItem("user")
    setIsAuthenticated(!!user)
    
    if (user) {
      const savedList = localStorage.getItem("myAnimeList")
      if (savedList) {
        setMyList(JSON.parse(savedList))
      }
    }
  }, [])

  // Function to handle anime card click
  const handleAnimeClick = (animeId: number) => {
    if (isMangas) {
      router.push(`/manga/${animeId}`)
    } else {
      router.push(`/anime/${animeId}`)
    }
  }

  // Function to handle "My List" button click
  const handleAddToList = (e: React.MouseEvent, anime: AnimeData) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      // Redirect to auth page if not authenticated
      router.push("/auth")
      return
    }

    const isInList = myList.includes(anime.id)
    let updatedList: number[]
    let updatedAnimeDetails = JSON.parse(localStorage.getItem("myAnimeDetails") || "{}")

    if (isInList) {
      // Remove from list
      updatedList = myList.filter(id => id !== anime.id)
      delete updatedAnimeDetails[anime.id]
    } else {
      // Add to list
      updatedList = [...myList, anime.id]
      updatedAnimeDetails[anime.id] = anime
    }

    setMyList(updatedList)
    localStorage.setItem("myAnimeList", JSON.stringify(updatedList))
    localStorage.setItem("myAnimeDetails", JSON.stringify(updatedAnimeDetails))
  }

  const loadMoreAnime = useCallback(async () => {
    if (loadingMore || !hasMore || !config) return

    setLoadingMore(true)
    try {
      const moreData = await config.fetchFunction(page + 1) as AnimeData[]
      if (moreData.length > 0) {
        setAnimeList((prev) => {
          // Create a Set of existing IDs to prevent duplicates
          const existingIds = new Set(prev.map(anime => anime.id))
          const newUniqueData = moreData.filter(anime => !existingIds.has(anime.id))
          return [...prev, ...newUniqueData]
        })
        setPage((prev) => prev + 1)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more anime:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [config, loadingMore, hasMore, page])

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMoreAnime()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadMoreAnime])

  useEffect(() => {
    if (config) {
      const loadAnime = async () => {
        try {
          const data = await config.fetchFunction(1) as AnimeData[]
          setAnimeList(data)
          setPage(1)
        } catch (error) {
          console.error("Error loading anime:", error)
        } finally {
          setLoading(false)
        }
      }
      loadAnime()
    }
  }, [slug, config])

  if (!config) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Section not found</div>
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{config.title}</h1>
        </div>
        <button onClick={() => router.push('/search')} className="p-1">
          <Search className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-24 h-32 bg-gray-800 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-800 rounded w-2/3"></div>
                  <div className="h-6 bg-gray-800 rounded-full w-20 mt-3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {animeList.map((anime, index) => {
              const isInList = myList.includes(anime.id)
              // Use combination of ID and index to ensure unique keys
              const uniqueKey = `${anime.id}-${index}`
              return (
                <div 
                  key={uniqueKey} 
                  className="flex gap-3 cursor-pointer hover:bg-gray-900 transition-colors duration-200 rounded-lg p-2 -mx-2"
                  onClick={() => handleAnimeClick(anime.id)}
                >
                  {/* Anime Cover */}
                  <div className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={anime.coverImage.large || "/placeholder.svg"}
                      alt={anime.title.english || anime.title.romaji}
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
                      {anime.title.english || anime.title.romaji}
                    </h3>

                    <p className="text-white text-sm mb-2">{anime.seasonYear || "2025"}</p>

                    <p className="text-gray-400 text-xs mb-3 leading-relaxed line-clamp-2">
                      {anime.genres.slice(0, 3).join(", ")}
                    </p>

                    <button 
                      className={`${
                        isInList 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "bg-[#ff914d] hover:bg-[#e8823d]"
                      } text-white font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors text-sm`}
                      onClick={(e) => handleAddToList(e, anime)}
                    >
                      {isInList ? (
                        <>
                          <Check className="w-3 h-3" />
                          In List
                        </>
                      ) : (
                        <>
                          <span className="text-sm">+</span>
                          My List
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff914d]"></div>
          </div>
        )}
      </div>
    </div>
  )
}