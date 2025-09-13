"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Play, Loader, Search, ChevronDown, MessageCircle, Star, X, WifiOff, AlertCircle, Send, RotateCw } from "lucide-react"
import { fetchMediaDetails } from "@/lib/anilist"
import type { AnimeData } from "@/lib/anilist"
import { StreamAPI } from "@/lib/stream-api"
import Hls from "hls.js"

interface StreamData {
  ids?: {
    animepahe_id?: number
    mal_id?: number
    anilist_id?: number
    anime_planet_id?: number | null
    ann_id?: number
    anilist?: string
    anime_planet?: string
    ann?: string
    kitsu?: string | null
    myanimelist?: string
  }
  session?: string
  provider?: string
  episode?: string
  sources?: Array<{
    url: string
    isM3U8?: boolean
    resolution?: string
    isDub?: boolean
    fanSub?: string
  }>
  downloadLinks?: Array<{
    url: string
    fansub: string
    quality: string
    filesize: string
    isDub: boolean
  }>
}

interface Episode {
  id: string
  session: string
  episode: number
  title?: string
  duration?: string
  snapshot?: string
}

interface AnimeInfo {
  title: string
  poster: string
  episodes: Episode[]
  session: string
}

interface ErrorNotification {
  id: string
  type: 'network' | 'fatal'
  message: string
  timestamp: number
}

interface User {
  username: string
  email: string
}

interface Comment {
  id: string
  username: string
  message: string
  timestamp: number
  animeId?: number
  episodeNumber?: number
}

interface Rating {
  id: string
  username: string
  rating: number
  animeId?: number
  episodeNumber?: number
  timestamp: number
}

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const animeId = Number.parseInt(params.animeId as string)
  // Always start from episode 1
  const episodeNumber = 1

  const [anime, setAnime] = useState<AnimeData | null>(null)
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null)
  const [streamData, setStreamData] = useState<StreamData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // SEPARATED STATE: Player-specific episodes vs UI episodes
  const [playerEpisodes, setPlayerEpisodes] = useState<Episode[]>([]) // Only for player logic
  const [uiEpisodes, setUiEpisodes] = useState<Episode[]>([]) // For episode list UI
  
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [error, setError] = useState<string>("")

  // Episode list pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(false)
  const [loadingMoreEpisodes, setLoadingMoreEpisodes] = useState(false)

  // Stream loading states
  const [streamLoading, setStreamLoading] = useState(false)

  const [selectedMode, setSelectedMode] = useState<string>("Sub")
  const [episodeSearch, setEpisodeSearch] = useState("")
  const [showEpisodeList, setShowEpisodeList] = useState(true)

  // Error notifications state - Only network and fatal errors
  const [notifications, setNotifications] = useState<ErrorNotification[]>([])
  const [isRecovering, setIsRecovering] = useState(false)

  // Episode loading and auto-play state
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [autoPlayNext, setAutoPlayNext] = useState(true)

  // User authentication state
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Comments state
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)

  // Rating state - Updated to 1-5 scale
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [episodeRating, setEpisodeRating] = useState<number>(0)
  const [userRating, setUserRating] = useState<number>(0)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)

  // Video ref for HLS
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // Check authentication on load
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
      setIsAuthenticated(true)
    }
  }, [])

  // Load comments and ratings when episode changes or component mounts
  useEffect(() => {
    if (animeId && episodeNumber) {
      loadComments()
      loadRatings()
    }
  }, [animeId, episodeNumber, isAuthenticated])

  // Load comments from localStorage (visible to everyone)
  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const response = await fetch(`/api/comments?animeId=${animeId}&episode=${episodeNumber}`)
      const data = await response.json()
      
      if (response.ok) {
        const commentsWithTimestamp = (data.comments || []).map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.created_at).getTime()
        }))
        setComments(commentsWithTimestamp)
      } else {
        console.error("Error loading comments:", data.error)
        setComments([])
      }
    } catch (error) {
      console.error("Error loading comments:", error)
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  // Load ratings from localStorage
  const loadRatings = async () => {
    try {
      const response = await fetch(`/api/ratings?animeId=${animeId}&episode=${episodeNumber}`)
      const data = await response.json()
      
      if (response.ok) {
        setEpisodeRating(data.averageRating || 0)
        setTotalRatings(data.totalRatings || 0)
        
        let currentUsername = "Anonymous"
        if (isAuthenticated && user) {
          currentUsername = user.username
        } else {
          const anonymousId = localStorage.getItem('anonymousId')
          if (anonymousId) {
            currentUsername = anonymousId
          }
        }
        
        if (data.ratings) {
          const userRatingObj = data.ratings.find((r: any) => r.username === currentUsername)
          setUserRating(userRatingObj?.rating || 0)
        } else {
          setUserRating(0)
        }
      } else {
        console.error("Error loading ratings:", data.error)
        setEpisodeRating(0)
        setTotalRatings(0)
        setUserRating(0)
      }
    } catch (error) {
      console.error("Error loading ratings:", error)
      setEpisodeRating(0)
      setTotalRatings(0)
      setUserRating(0)
    }
  }

  // Submit comment
  const handleSubmitComment = async () => {
    if (!isAuthenticated || !user || !newComment.trim()) {
      if (!isAuthenticated) {
        alert("Please sign in to leave comments")
      }
      return
    }
  
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          message: newComment.trim(),
          animeId,
          episodeNumber
        })
      })
  
      const data = await response.json()
      
      if (response.ok) {
        setNewComment("")
        await loadComments()
      } else {
        console.error("Error submitting comment:", data.error)
        alert("Failed to submit comment. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      alert("Failed to submit comment. Please try again.")
    }
  }

  // Submit rating - Updated for 1-5 scale
  const handleSubmitRating = async (rating: number) => {
    let username = "Anonymous"
    
    if (isAuthenticated && user) {
      username = user.username
    } else {
      let anonymousId = localStorage.getItem('anonymousId')
      if (!anonymousId) {
        anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('anonymousId', anonymousId)
      }
      username = anonymousId
    }
  
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          rating,
          animeId,
          episodeNumber
        })
      })
  
      const data = await response.json()
      
      if (response.ok) {
        setUserRating(rating)
        setShowRatingPopup(false)
        await loadRatings()
      } else {
        console.error("Error submitting rating:", data.error)
        alert("Failed to submit rating. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting rating:", error)
      alert("Failed to submit rating. Please try again.")
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // Add error notification - Only for network and fatal errors
  const addNotification = (type: ErrorNotification['type'], message: string) => {
    if (type !== 'network' && type !== 'fatal') {
      return
    }
    
    const id = Math.random().toString(36).substr(2, 9)
    const notification: ErrorNotification = {
      id,
      type,
      message,
      timestamp: Date.now()
    }
    
    setNotifications(prev => [...prev, notification])
    
    if (type !== 'fatal') {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }
  }

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Load episodes for a specific page - UPDATED TO USE StreamAPI
  const loadEpisodesPage = async (animeSession: string, page: number): Promise<Episode[]> => {
    try {
      console.log(`Loading episodes page ${page}`)
      
      // UPDATED: Use StreamAPI instead of direct fetch
      const episodesData = await StreamAPI.getAnimeEpisodes(animeSession, 'episode_desc', page)
      
      const episodesList = (episodesData.data || []).map((ep: any) => ({
        id: ep.session,
        session: ep.session,
        episode: ep.episode,
        title: ep.title,
        duration: ep.duration,
        snapshot: ep.snapshot
      }))
  // Sort episodes ascending (episode 1 first)
  episodesList.sort((a: Episode, b: Episode) => a.episode - b.episode)
      
      console.log(`Loaded ${episodesList.length} episodes for page ${page}`)
      return episodesList
    } catch (error) {
      console.error(`Error loading episodes page ${page}:`, error)
      return []
    }
  }

  // Initialize episodes - SEPARATED: Sets both player and UI episodes from first page only
  const initializeEpisodes = async (animeSession: string) => {
    try {
      setEpisodesLoading(true)
      setPlayerEpisodes([]) // Clear player episodes
      setUiEpisodes([]) // Clear UI episodes
      setCurrentPage(1)
      setHasMoreEpisodes(false)
      
      // Load first page
      const firstPageEpisodes = await loadEpisodesPage(animeSession, 1)
      
      if (firstPageEpisodes.length === 0) {
        setError("No episodes found for this anime")
        return
      }

      // Set BOTH player and UI episodes to first page
      setPlayerEpisodes(firstPageEpisodes)
      setUiEpisodes(firstPageEpisodes)
      setHasMoreEpisodes(firstPageEpisodes.length === 30)
      
      console.log(`Initialized with ${firstPageEpisodes.length} episodes`)
      
    } catch (error) {
      console.error("Error initializing episodes:", error)
      setError("Failed to load episodes")
    } finally {
      setEpisodesLoading(false)
    }
  }

  // Load more episodes - ONLY updates UI episodes, not player episodes
  const loadMoreEpisodes = async () => {
    if (!animeInfo?.session || loadingMoreEpisodes || !hasMoreEpisodes) return
    
    setLoadingMoreEpisodes(true)
    const nextPage = currentPage + 1
    
    try {
      console.log(`Loading more episodes - page ${nextPage}`)
      
      const newEpisodes = await loadEpisodesPage(animeInfo.session, nextPage)
      
      if (newEpisodes.length > 0) {
        // ONLY append to UI episodes, not player episodes
        setUiEpisodes(prev => [...prev, ...newEpisodes])
        setCurrentPage(nextPage)
        setHasMoreEpisodes(newEpisodes.length === 30)
        
        console.log(`Added ${newEpisodes.length} more episodes to UI. Total UI episodes: ${uiEpisodes.length + newEpisodes.length}`)
      } else {
        setHasMoreEpisodes(false)
        console.log("No more episodes to load")
      }
      
    } catch (error) {
      console.error("Error loading more episodes:", error)
    } finally {
      setLoadingMoreEpisodes(false)
    }
  }

  // MAIN INITIALIZATION - Only runs once on mount - UPDATED TO USE StreamAPI
  useEffect(() => {
    const loadAnimeAndStream = async () => {
      try {
        setLoading(true)
        setError("")
    
        // 1. Load anime details from AniList
        const animeData = await fetchMediaDetails(animeId)
        if (animeData?.type !== "ANIME") {
          router.push("/")
          return
        }
        setAnime(animeData)
    
        // 2. Search for anime on Animepahe - UPDATED TO USE StreamAPI
        const searchQuery = animeData.title.english || animeData.title.romaji
        const searchJson = await StreamAPI.searchAnime(searchQuery, 1)
    
        const searchData = searchJson?.data || []
    
        if (!Array.isArray(searchData) || searchData.length === 0) {
          setError("Anime not found on Animepahe")
          return
        }
    
        // 3. Smart anime matching logic
        const findBestMatch = (results: any[], query: string) => {
          const normalizeTitle = (title: string) => 
            title.toLowerCase()
              .replace(/[^\w\s]/g, '') // Remove special characters
              .replace(/\s+/g, ' ')    // Normalize spaces
              .trim()

          const normalizedQuery = normalizeTitle(query)
          
          // 1. Try exact match first
          let exactMatch = results.find(item => 
            normalizeTitle(item.title) === normalizedQuery
          )
          if (exactMatch) {
            console.log(`✅ Found exact match: ${exactMatch.title}`)
            return exactMatch
          }

          // 2. Try to find TV series over movies/specials (prefer main series)
          const tvSeries = results.filter(item => item.type === 'TV')
          if (tvSeries.length > 0) {
            // Among TV series, find the one with most similar title
            exactMatch = tvSeries.find(item => 
              normalizeTitle(item.title) === normalizedQuery
            )
            if (exactMatch) {
              console.log(`✅ Found exact TV match: ${exactMatch.title}`)
              return exactMatch
            }

            // Find TV series that contains the query
            const containsMatch = tvSeries.find(item =>
              normalizeTitle(item.title).includes(normalizedQuery) ||
              normalizedQuery.includes(normalizeTitle(item.title))
            )
            if (containsMatch) {
              console.log(`✅ Found TV series containing query: ${containsMatch.title}`)
              return containsMatch
            }

            // If no good match, prefer the TV series with highest score
            const bestTvSeries = tvSeries.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
            console.log(`✅ Falling back to highest rated TV series: ${bestTvSeries.title}`)
            return bestTvSeries
          }

          // 3. Last resort: find any result that contains the query
          const fallbackMatch = results.find(item =>
            normalizeTitle(item.title).includes(normalizedQuery) ||
            normalizedQuery.includes(normalizeTitle(item.title))
          )
          if (fallbackMatch) {
            console.log(`⚠️ Using fallback match: ${fallbackMatch.title}`)
            return fallbackMatch
          }

          // 4. Ultimate fallback: first result
          console.log(`⚠️ No good match found, using first result: ${results[0]?.title}`)
          return results[0]
        }

        const matchedAnime = findBestMatch(searchData, searchQuery)
    
        const animeSession = matchedAnime.session
    
        // 4. Set anime info
        setAnimeInfo({
          title: matchedAnime.title,
          poster: matchedAnime.poster,
          episodes: [],
          session: animeSession
        })

        // 5. Initialize episodes
        await initializeEpisodes(animeSession)
    
      } catch (error) {
        console.error("Error loading stream:", error)
        setError(error instanceof Error ? error.message : "Failed to load episode")
        addNotification('fatal', 'Failed to load anime data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }    

    // IMPORTANT: Only run once on mount
    if (animeId) {
      loadAnimeAndStream()
    }
  }, [animeId, episodeNumber, router]) // Only depends on URL params

  // Load stream when PLAYER episodes are ready - ONLY uses playerEpisodes
  useEffect(() => {
    const loadCurrentEpisodeStream = async () => {
      if (!animeInfo?.session || playerEpisodes.length === 0) return

      // Use playerEpisodes for finding the current episode
      const episode = playerEpisodes.find((ep: Episode) => ep.episode === episodeNumber)
      if (!episode) {
        console.warn(`Episode ${episodeNumber} not found in player episodes`)
        return
      }

      setCurrentEpisode(episode)
      await loadEpisodeStream(animeInfo.session, episode.session)
    }

    loadCurrentEpisodeStream()
  }, [playerEpisodes, animeInfo, episodeNumber]) // Only depends on playerEpisodes

  // Updated: Direct API call using StreamAPI
  const loadEpisodeStream = async (animeSession: string, episodeId: string) => {
    try {
      setStreamLoading(true)
      console.log(`Loading stream for session: ${animeSession}, episode: ${episodeId}`)
      
      const streamData = await StreamAPI.getStreamingLinks(animeSession, episodeId)
      
      console.log(`Stream data received:`, streamData)
      setStreamData(streamData)
      
    } catch (error) {
      console.error("Stream loading failed:", error)
      setError("Failed to load episode stream")
      addNotification('fatal', 'Failed to load video streams. Please refresh and try again.')
    } finally {
      setStreamLoading(false)
    }
  }

  // Handle episode selection - Updated for faster switching
  const handleEpisodeSelect = async (episode: Episode) => {
    if (episode.episode === episodeNumber) {
      return
    }

    // Update URL without refreshing the page
    window.history.pushState(null, '', `/watch/${animeId}/${episode.episode}`)
    
    // Update state immediately for UI responsiveness
    setCurrentEpisode(episode)
    setShowEpisodeList(false)
    
    // Load new stream in background
    if (animeInfo) {
      setStreamLoading(true)
      try {
        await loadEpisodeStream(animeInfo.session, episode.session)
        await Promise.all([loadComments(), loadRatings()])
      } catch (error) {
        console.error("Failed to switch episode:", error)
      } finally {
        setStreamLoading(false)
      }
    }
  }

  // Auto-play next episode - Uses uiEpisodes for searching next episode
  const playNextEpisode = async () => {
    if (!currentEpisode || !animeInfo) return

    const nextEpisodeNum = currentEpisode.episode + 1
    
    // Check if next episode is in UI episodes (broader search)
    const nextEpisode = uiEpisodes.find(ep => ep.episode === nextEpisodeNum)
    if (nextEpisode) {
      handleEpisodeSelect(nextEpisode)
      return
    }

    console.log(`Next episode ${nextEpisodeNum} not found in loaded episodes. User needs to load more.`)
  }

  // Handle video end for auto-play
  const handleVideoEnd = () => {
    if (autoPlayNext && currentEpisode) {
      setTimeout(() => {
        playNextEpisode()
      }, 3000)
    }
  }

  // Get best quality source for selected mode (Sub/Dub)
  const getVideoSource = () => {
    if (!streamData?.sources || streamData.sources.length === 0) {
      return null
    }

    const isDub = selectedMode === "Dub"
    
    const filteredSources = streamData.sources.filter(source => {
      const sourceIsDub = source.isDub === true
      return sourceIsDub === isDub
    })

    const sourcesToUse = filteredSources.length > 0 ? filteredSources : streamData.sources

    const source = sourcesToUse.find(s => s.resolution === "1080") ||
                   sourcesToUse.find(s => s.resolution === "720") ||
                   sourcesToUse.find(s => s.resolution === "360") ||
                   sourcesToUse[0]

    if (source) {
      console.log(`Using source: ${source.resolution}p ${isDub ? 'DUB' : 'SUB'} - ${source.url.substring(0, 50)}...`)
      return source.url
    }

    return null
  }

  // Transform uwu.m3u8 URLs to master.m3u8 URLs
  const getMasterPlaylistUrl = (originalUrl: string): string => {
    if (!originalUrl.includes('.m3u8')) {
      return originalUrl
    }
    
    if (originalUrl.includes('/uwu.m3u8')) {
      const masterUrl = originalUrl.replace('/uwu.m3u8', '/master.m3u8')
      console.log(`Transforming to master playlist: ${originalUrl} -> ${masterUrl}`)
      return masterUrl
    }
    
    return originalUrl
  }

  // HLS Video Setup Effect with better error handling
  useEffect(() => {
    const videoSource = getVideoSource()
    
    if (!videoSource || !videoRef.current) return

    const video = videoRef.current

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (videoSource.includes('.m3u8')) {
      const masterPlaylistUrl = getMasterPlaylistUrl(videoSource)
      const proxiedUrl = `/api/proxy/stream?url=${encodeURIComponent(masterPlaylistUrl)}`
      
      console.log(`Loading master playlist through proxy: ${proxiedUrl}`)
      
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          startLevel: -1,
          capLevelToPlayerSize: true,
        })
        
        hlsRef.current = hls
        
        hls.loadSource(proxiedUrl)
        hls.attachMedia(video)
        
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          console.log('HLS master manifest parsed successfully')
          video.play().catch(console.error)
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data || Object.keys(data).length === 0) {
            return
          }
        
          const hasValidData = Boolean(
            data.type || 
            data.details || 
            data.reason || 
            data.response || 
            data.networkDetails || 
            data.frag || 
            data.level ||
            data.fatal === true
          )
          if (!hasValidData) {
            return
          }
        
          console.error('HLS Error Details:', data)
        
          if (data.fatal) {
            setIsRecovering(true)
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('Fatal network error - attempting recovery...')
                addNotification('network', 'Poor network connection detected. Attempting to reconnect...')
                setTimeout(() => {
                  try {
                    hls.startLoad()
                    setIsRecovering(false)
                  } catch (e) {
                    console.error('Failed to restart load:', e)
                    addNotification('fatal', 'Unable to restore connection. Please refresh the page.')
                    setIsRecovering(false)
                  }
                }, 1000)
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('Fatal media error - attempting recovery...')
                setTimeout(() => {
                  try {
                    hls.recoverMediaError()
                    setIsRecovering(false)
                  } catch (e) {
                    console.error('Failed to recover media error:', e)
                    addNotification('fatal', 'Playback failed. Please refresh the page.')
                    setIsRecovering(false)
                  }
                }, 1000)
                break
              default:
                console.error('Unrecoverable HLS error')
                addNotification('fatal', 'Video player encountered a fatal error. Please refresh the page.')
                hls.destroy()
                setIsRecovering(false)
                break
            }
          }
        })

        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
          }
        }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using Safari native HLS support')
        video.src = proxiedUrl
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(console.error)
        })
      } else {
        addNotification('fatal', 'HLS not supported in this browser')
      }
    } else {
      const proxiedUrl = `/api/proxy/stream?url=${encodeURIComponent(videoSource)}`
      video.src = proxiedUrl
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(console.error)
      })
    }
  }, [streamData, selectedMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [])

  // Handle back button - Navigate to anime details page
  const handleBackButton = () => {
    router.push(`/anime/${animeId}`)
  }

  // Notification component
  const NotificationIcon = ({ type }: { type: ErrorNotification['type'] }) => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-5 h-5" />
      case 'fatal':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getNotificationColors = (type: ErrorNotification['type']) => {
    switch (type) {
      case 'network':
        return 'bg-[#232323] border-gray-600'
      case 'fatal':
        return 'bg-red-600 border-red-500'
      default:
        return 'bg-[#232323] border-gray-500'
    }
  }

  // Episode skeleton loader component
  const EpisodeSkeleton = () => (
    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto scrollbar-none">
      {Array.from({ length: 20 }).map((_, index) => (
        <div
          key={index}
          className="aspect-square rounded-lg bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  )

  // Truncate title function
  const truncateTitle = (title: string, maxLength: number) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Loader className="animate-spin h-12 w-12 text-[#ff914d] mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-3">{error || "Episode not found"}</h1>
          <button onClick={handleBackButton} className="text-[#ff914d] hover:underline text-sm">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const videoSource = getVideoSource()
  // Use uiEpisodes for filtering in the episode list
  const filteredEpisodes = uiEpisodes.filter(ep => 
    ep.episode.toString().includes(episodeSearch) ||
    ep.title?.toLowerCase().includes(episodeSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Notifications - Only network and fatal errors */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm text-white text-sm font-medium shadow-lg max-w-sm animate-in slide-in-from-right-4 ${getNotificationColors(notification.type)}`}
          >
            <NotificationIcon type={notification.type} />
            <div className="flex-1">
              <span>{notification.message}</span>
              {notification.type === 'fatal' && (
                <button
                  onClick={() => window.location.reload()}
                  className="block text-white underline hover:no-underline mt-2 text-xs"
                >
                  🔄 Retry
                </button>
              )}
            </div>
            {notification.type !== 'fatal' && (
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-white/80 hover:text-white p-1 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Recovery overlay */}
      {isRecovering && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <Loader className="animate-spin h-8 w-8 text-[#ff914d] mx-auto mb-4" />
            <p className="text-white">Recovering playback...</p>
          </div>
        </div>
      )}

      {/* Blur Loading Overlay for Episode Switching */}
      {streamLoading && loading && (
        <div className="fixed inset-0 backdrop-blur-md z-45 flex items-center justify-center">
          <Loader className="animate-spin h-16 w-16 text-[#ff914d]" />
        </div>
      )}

      {/* Header - Mobile Responsive */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={handleBackButton}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-semibold text-white truncate">
                  {truncateTitle(anime?.title.english || anime?.title.romaji || '', 25)}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400">Episode {currentEpisode?.episode || episodeNumber}</p>
              </div>
            </div>
            
            {/* Sub/Dub Toggle - Fixed position */}
            {streamData?.sources && streamData.sources.length > 0 && (
              <div className="flex-shrink-0">
                <div className="flex bg-[#232323] rounded-lg p-1">
                  {['Sub', 'Dub'].map((mode) => {
                    const hasMode = streamData.sources?.some(s => 
                      mode === 'Dub' ? s.isDub : !s.isDub
                    );
                    
                    return (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        disabled={!hasMode}
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                          selectedMode === mode
                            ? 'bg-[#ff914d] text-white'
                            : hasMode
                            ? 'text-gray-300 hover:text-white hover:bg-[#2C2C2C]'
                            : 'text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Episode Sidebar - Left on Desktop */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-[#232323] rounded-xl p-4 sm:p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Episodes</h3>
                  <span className="text-xs sm:text-sm text-gray-400">({uiEpisodes.length})</span>
                </div>
                
                <button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  className="lg:hidden p-2 rounded-lg bg-[#2C2C2C] hover:bg-gray-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 text-white transform transition-transform ${showEpisodeList ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Episode Search */}
              <div className={`mb-4 ${!showEpisodeList ? 'hidden lg:block' : ''}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search episodes..."
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#ff914d] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Episodes List */}
              <div className={`${!showEpisodeList ? 'hidden lg:block' : ''}`}>
                {episodesLoading ? (
                  <EpisodeSkeleton />
                ) : (
                  <div>
                    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto scrollbar-none">
                      {/* Always sort episodes ascending before rendering */}
                      {filteredEpisodes.slice().sort((a, b) => a.episode - b.episode).map((episode) => (
                        <button
                          key={episode.id}
                          onClick={() => handleEpisodeSelect(episode)}
                          className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            episode.episode === (currentEpisode?.episode || episodeNumber)
                              ? 'bg-[#ff914d] text-white'
                              : 'bg-[#2C2C2C] text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          {episode.episode}
                        </button>
                      ))}
                    </div>

                    {/* Load More Episodes Button */}
                    {hasMoreEpisodes && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={loadMoreEpisodes}
                          disabled={loadingMoreEpisodes}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs sm:text-sm"
                        >
                          {loadingMoreEpisodes ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <RotateCw className="w-4 h-4" />
                              Load More
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Episodes loaded indicator */}
                    {!hasMoreEpisodes && uiEpisodes.length > 30 && (
                      <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500">
                          All {uiEpisodes.length} episodes loaded
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video Player - Right on Desktop */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden">
              {videoSource ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video bg-black"
                    controls
                    playsInline
                    onEnded={handleVideoEnd}
                    poster={anime?.coverImage.large}
                  />
                  {/* Episode switching loading indicator */}
                  {streamLoading && !loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-gray-900/90 rounded-lg p-4 flex items-center gap-3">
                        <Loader className="animate-spin h-6 w-6 text-[#ff914d]" />
                        <span className="text-white text-sm">Loading Episode {currentEpisode?.episode || episodeNumber}...</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">No video source available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls - Mobile Responsive */}
            <div className="mt-4 space-y-3">
              {/* Auto-play toggle - Full width on mobile */}
              <div className="flex items-center justify-center sm:justify-start">
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlayNext}
                      onChange={(e) => setAutoPlayNext(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-9 h-5 sm:w-11 sm:h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff914d]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[#ff914d]"></div>
                  </label>
                  <label htmlFor="autoplay" className="text-xs sm:text-sm text-gray-300 cursor-pointer">
                    Auto-play next episode
                  </label>
                </div>
              </div>

              {/* Action buttons - Mobile optimized */}
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#232323] hover:bg-[#2C2C2C] rounded-lg text-xs sm:text-sm transition-colors flex-1 sm:flex-none justify-center"
                >
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Comments</span>
                  <span className="text-gray-400">({comments.length})</span>
                </button>
                
                <button
                  onClick={() => setShowRatingPopup(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#232323] hover:bg-[#2C2C2C] rounded-lg text-xs sm:text-sm transition-colors flex-1 sm:flex-none justify-center"
                >
                  <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Rate</span>
                  <span className="text-gray-400">({episodeRating.toFixed(1)}/5)</span>
                </button>
              </div>
            </div>

            {/* Comments Section - Mobile Responsive */}
            {showComments && (
              <div className="mt-4 sm:mt-6 bg-[#232323] rounded-xl p-3 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                  Comments ({comments.length})
                </h3>
                
                {/* Add Comment - Mobile Responsive */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        isAuthenticated 
                          ? "Share your thoughts..."
                          : "Sign in to comment"
                      }
                      disabled={!isAuthenticated}
                      className="flex-1 px-3 sm:px-4 py-2 bg-[#2C2C2C] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#ff914d] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!isAuthenticated || !newComment.trim()}
                      className="px-3 sm:px-4 py-2 bg-[#ff914d] hover:bg-[#ff914d]/90 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="sm:inline">Post</span>
                    </button>
                  </div>
                  
                  {!isAuthenticated && (
                    <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
                      Please sign in to participate in discussions
                    </p>
                  )}
                </div>

                {/* Comments List - Mobile Responsive */}
                <div className="space-y-3 sm:space-y-4 max-h-64 sm:max-h-96 overflow-y-auto">
                  {loadingComments ? (
                    <div className="text-center py-4">
                      <Loader className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-[#ff914d] mx-auto mb-2" />
                      <p className="text-gray-400 text-xs sm:text-sm">Loading comments...</p>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-400">
                      <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-600" />
                      <p className="text-sm sm:text-base">No comments yet</p>
                      <p className="text-xs sm:text-sm">Be the first to share your thoughts!</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-[#2C2C2C] rounded-lg p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-[#ff914d] text-sm sm:text-base truncate">
                            {comment.username}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTimestamp(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-300 leading-relaxed text-sm sm:text-base break-words">
                          {comment.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Popup - Mobile Responsive and positioned at bottom */}
      {showRatingPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-[#232323] rounded-t-xl w-full max-w-md mx-3 sm:mx-0 sm:rounded-xl sm:mb-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Rate Episode {currentEpisode?.episode || episodeNumber}
                </h3>
                <button
                  onClick={() => setShowRatingPopup(false)}
                  className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </button>
              </div>

              <div className="text-center mb-4 sm:mb-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-2">
                  Current Rating: {episodeRating.toFixed(1)}/5 ({totalRatings} ratings)
                </div>
                {userRating > 0 && (
                  <div className="text-xs sm:text-sm text-[#ff914d]">
                    Your Rating: {userRating}/5
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleSubmitRating(rating)}
                    onMouseEnter={() => setHoverRating(rating)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      rating <= (hoverRating || userRating)
                        ? 'bg-[#ff914d] text-white'
                        : 'bg-[#2C2C2C] text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${rating <= (hoverRating || userRating) ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {isAuthenticated 
                    ? "Click a star to rate this episode"
                    : "Your rating will be saved anonymously"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
