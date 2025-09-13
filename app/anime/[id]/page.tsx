"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Play, Download, Star, Clock, Calendar, X, Crown, RotateCw } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
// FIXED: Updated import to match the exact exports from lib/anilist.ts
import { fetchMediaDetails, fetchAnimeEpisodes } from "@/lib/anilist"
import type { AnimeData, AniListEpisode } from "@/lib/anilist"
import { downloadEpisodeAsMp4 } from "@/lib/download-episode"
import { usePremium } from "@/contexts/PremiumContext"
import { PremiumModal } from "@/components/PremiumModal"
import { StreamAPI } from "@/lib/stream-api"

interface AnimepaheSearchResult {
  id: number
  title: string
  type: string
  episodes: number
  status: string
  season: string
  year: number
  score: number
  poster: string
  session: string
  slug: string
}

interface DownloadState {
  isDownloading: boolean
  countdown: number
  intervalId?: NodeJS.Timeout
}

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

// Function to find exact anime match by title
const findExactAnimeMatch = (searchResults: AnimepaheSearchResult[], targetAnime: AnimeData): AnimepaheSearchResult => {
  const targetTitleEnglish = targetAnime.title.english?.toLowerCase().trim()
  const targetTitleRomaji = targetAnime.title.romaji?.toLowerCase().trim()
  
  console.log(`🎯 Looking for exact match for: "${targetTitleEnglish}" or "${targetTitleRomaji}"`)
  
  // Try to find exact match
  for (const result of searchResults) {
    const resultTitle = result.title.toLowerCase().trim()
    
    console.log(`Comparing: "${resultTitle}" with target titles`)
    
    // Check for exact match with English title
    if (targetTitleEnglish && resultTitle === targetTitleEnglish) {
      console.log(`✅ Found exact match (English): "${result.title}"`)
      return result
    }
    
    // Check for exact match with Romaji title
    if (targetTitleRomaji && resultTitle === targetTitleRomaji) {
      console.log(`✅ Found exact match (Romaji): "${result.title}"`)
      return result
    }
  }
  
  console.log(`❌ No exact match found, falling back to first result: "${searchResults[0].title}"`)
  return searchResults[0]
}

export default function AnimeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number.parseInt(params.id as string)
  const [anime, setAnime] = useState<AnimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)

  // Premium context
  const { 
    isPremium, 
    checkCanDownload, 
    checkCanBulkDownload, 
    recordDownload 
  } = usePremium()

  // Premium modal states
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [premiumModalFeature, setPremiumModalFeature] = useState<'download' | 'bulkDownload' | 'hdQuality'>('download')
  const [premiumModalMessage, setPremiumModalMessage] = useState<string>()
  const [downloadsLeft, setDownloadsLeft] = useState<number>()

  // NEW: AniList Episode states (instant loading)
  const [episodes, setEpisodes] = useState<AniListEpisode[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  // AnimePahe states (only used when clicking episodes/downloads)
  const [animepaheData, setAnimepaheData] = useState<AnimepaheSearchResult | null>(null)
  const [initializingAnimepahe, setInitializingAnimepahe] = useState(false)
  
  // Download states
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Map<string, DownloadState>>(new Map())
  const [bulkDownloading, setBulkDownloading] = useState(false)

  // Quality popup states
  const [showQualityPopup, setShowQualityPopup] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<AniListEpisode | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<string>('720p')
  const [selectedVersion, setSelectedVersion] = useState<'sub' | 'dub'>('sub')
  const [availableQualities, setAvailableQualities] = useState<string[]>(['720p'])
  const [availableVersions, setAvailableVersions] = useState<string[]>(['sub'])
  
  // Bulk download popup states
  const [showBulkPopup, setShowBulkPopup] = useState(false)
  const [bulkQuality, setBulkQuality] = useState<string>('720p')
  const [bulkVersion, setBulkVersion] = useState<'sub' | 'dub'>('sub')
  const [bulkAvailableQualities, setBulkAvailableQualities] = useState<string[]>(['720p'])
  const [bulkAvailableVersions, setBulkAvailableVersions] = useState<string[]>(['sub'])

  // Load anime details and episodes from AniList on page load
  useEffect(() => {
    const loadAnimeDetails = async () => {
      try {
        console.log(`🔍 Loading anime details for ID: ${id}`)
        const data = await fetchMediaDetails(id)

        if (!data) {
          console.log("❌ No anime data found")
          setAnime(null)
          setLoading(false)
          return
        }

        if (data?.type !== "ANIME") {
          console.log("❌ Not an anime type:", data.type)
          setAnime(null)
          setLoading(false)
          return
        }

        console.log("✅ Anime details loaded:", data.title)
        setAnime(data)
        
        // Load episodes from AniList immediately
        console.log("🎬 Loading episodes from AniList...")
        setLoadingEpisodes(true)
        const aniListEpisodes = await fetchAnimeEpisodes(id)
        setEpisodes(aniListEpisodes)
        setLoadingEpisodes(false)
        
        console.log(`✅ Loaded ${aniListEpisodes.length} episodes from AniList instantly`)

      } catch (error) {
        console.error("❌ Error loading anime details:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadAnimeDetails()
    }
  }, [id])

  // Cleanup countdown intervals on unmount
  useEffect(() => {
    return () => {
      downloadingEpisodes.forEach((state) => {
        if (state.intervalId) {
          clearInterval(state.intervalId)
        }
      })
    }
  }, [])

  // NEW: Initialize AnimePahe data only when needed (called when user clicks episode/download)
  const initializeAnimepaheData = async (): Promise<AnimepaheSearchResult | null> => {
    if (animepaheData) {
      return animepaheData // Already initialized
    }

    if (!anime) return null

    setInitializingAnimepahe(true)
    try {
      console.log(`🔍 Initializing AnimePahe data for: ${anime.title.english || anime.title.romaji}`)
      const query = anime.title.english || anime.title.romaji
      const searchData = await StreamAPI.searchAnime(query, 1)
      console.log("AnimePahe search results:", searchData)

      if (!Array.isArray(searchData.data) || searchData.data.length === 0) {
        console.log("❌ No AnimePahe search results found")
        return null
      }

      // Use exact matching function
      const animeResult = findExactAnimeMatch(searchData.data, anime)
      setAnimepaheData(animeResult)
      console.log("✅ AnimePahe data initialized:", animeResult)
      
      return animeResult
    } catch (error) {
      console.error("❌ Failed to initialize AnimePahe data:", error)
      return null
    } finally {
      setInitializingAnimepahe(false)
    }
  }

  // Get available qualities and versions for an episode using StreamAPI
  const getEpisodeQualities = async (episode: AniListEpisode): Promise<{qualities: string[], versions: string[], sources: any[]}> => {
    const animepaheResult = await initializeAnimepaheData()
    if (!animepaheResult) return {qualities: [], versions: [], sources: []}

    try {
      console.log(`🎯 Getting qualities for episode ${episode.episode} using StreamAPI`)
      
      // First, get the AnimePahe episodes to find the matching session
      const episodesData = await StreamAPI.getAnimeEpisodes(animepaheResult.session, 'episode_asc', 1)
      if (!Array.isArray(episodesData.data)) {
        console.log("❌ No AnimePahe episodes found")
        return {qualities: [], versions: [], sources: []}
      }

      // Find the matching episode by episode number
      const matchingEpisode = episodesData.data.find((ep: any) => ep.episode === episode.episode)
      if (!matchingEpisode) {
        console.log(`❌ Episode ${episode.episode} not found in AnimePahe`)
        return {qualities: [], versions: [], sources: []}
      }

      // Use StreamAPI to get stream data
      const streamData = await StreamAPI.getStreamingLinks(animepaheResult.session, matchingEpisode.session)
      console.log('Stream data for episode', episode.episode, ':', streamData)
      
      if (streamData.sources && Array.isArray(streamData.sources)) {
        // Extract unique qualities from resolution field
        const qualities = [...new Set(streamData.sources.map((s: any) => s.resolution))] as string[]
        
        // Determine available versions based on isDub field
        const hasSubbed = streamData.sources.some((s: any) => !s.isDub)
        const hasDubbed = streamData.sources.some((s: any) => s.isDub)
        const versions = []
        if (hasSubbed) versions.push('sub')
        if (hasDubbed) versions.push('dub')
        
        return {
          qualities: qualities.length > 0 ? qualities.sort((a, b) => parseInt(b) - parseInt(a)) : ['720'], // Sort highest to lowest
          versions: versions.length > 0 ? versions : ['sub'],
          sources: streamData.sources
        }
      }
    } catch (error) {
      console.error(`❌ Failed to get qualities for episode ${episode.episode}:`, error)
    }
    
    return {qualities: ['720'], versions: ['sub'], sources: []}
  }

  // Get stream URL for an episode with specific quality and version using StreamAPI
  const getEpisodeStreamUrl = async (episode: AniListEpisode, quality: string = '720p', version: 'sub' | 'dub' = 'sub'): Promise<string | null> => {
    const animepaheResult = await initializeAnimepaheData()
    if (!animepaheResult) return null

    try {
      console.log(`🎯 Getting stream URL for episode ${episode.episode}`)
      console.log(`Quality: ${quality}, Version: ${version}`)
      
      // First, get the AnimePahe episodes to find the matching session
      const episodesData = await StreamAPI.getAnimeEpisodes(animepaheResult.session, 'episode_asc', 1)
      if (!Array.isArray(episodesData.data)) return null

      // Find the matching episode by episode number
      const matchingEpisode = episodesData.data.find((ep: any) => ep.episode === episode.episode)
      if (!matchingEpisode) return null
      
      // Use StreamAPI to get stream data
      const streamData = await StreamAPI.getStreamingLinks(animepaheResult.session, matchingEpisode.session)
      console.log(`Looking for quality: ${quality}, version: ${version}`)
      console.log('Available sources:', streamData.sources)
      
      let selectedUrl = null
      
      if (streamData.sources && Array.isArray(streamData.sources)) {
        // Convert quality to just the number for comparison (e.g., "1080p" -> "1080")
        const targetQuality = quality.replace('p', '')
        const wantsDub = version === 'dub'
        
        // Try to find exact match first (quality + version)
        let matchingSource = streamData.sources.find((source: any) => {
          const sourceQuality = source.resolution
          const sourceIsDub = source.isDub
          
          return sourceQuality === targetQuality && sourceIsDub === wantsDub
        })
        
        // If no exact match, try quality match with preferred version
        if (!matchingSource) {
          matchingSource = streamData.sources.find((source: any) => {
            return source.resolution === targetQuality
          })
        }
        
        // If still no match, try version match only
        if (!matchingSource) {
          matchingSource = streamData.sources.find((source: any) => {
            return source.isDub === wantsDub
          })
        }
        
        // Last resort: take first available
        if (!matchingSource && streamData.sources.length > 0) {
          matchingSource = streamData.sources[0]
        }
        
        if (matchingSource) {
          selectedUrl = matchingSource.url
          console.log(`✅ Selected source:`, matchingSource)
          console.log(`Quality: ${matchingSource.resolution}p, Dub: ${matchingSource.isDub}, FanSub: ${matchingSource.fanSub}`)
        }
      }
      
      if (selectedUrl) {
        // Convert to our proxy URL for HLS streaming
        return `/api/proxy/stream?url=${encodeURIComponent(selectedUrl)}`
      }
    } catch (error) {
      console.error(`❌ Failed to get stream URL for episode ${episode.episode}:`, error)
    }
    
    return null
  }

  // Start countdown timer
  const startCountdown = (episodeId: string) => {
    const intervalId = setInterval(() => {
      setDownloadingEpisodes(prev => {
        const newMap = new Map(prev)
        const current = newMap.get(episodeId)
        if (current && current.countdown > 0) {
          newMap.set(episodeId, {
            ...current,
            countdown: current.countdown - 1
          })
        } else if (current) {
          // Countdown finished, clear interval
          clearInterval(current.intervalId!)
          newMap.set(episodeId, {
            ...current,
            countdown: 0
          })
        }
        return newMap
      })
    }, 100) // Update every 100ms for smooth countdown

    setDownloadingEpisodes(prev => {
      const newMap = new Map(prev)
      newMap.set(episodeId, {
        isDownloading: true,
        countdown: 100,
        intervalId
      })
      return newMap
    })
  }

  // Handle episode download button click (with premium check)
  const handleEpisodeDownloadClick = async (episode: AniListEpisode) => {
    const downloadState = downloadingEpisodes.get(episode.id)
    if (downloadState?.isDownloading) return
    
    // Check if user can download
    const downloadCheck = checkCanDownload()
    if (!downloadCheck.canDownload) {
      setPremiumModalFeature('download')
      setPremiumModalMessage(downloadCheck.reason)
      setDownloadsLeft(downloadCheck.downloadsLeft)
      setShowPremiumModal(true)
      return
    }

    // Show loading state while initializing AnimePahe
    if (initializingAnimepahe) {
      return
    }

    // Get available qualities and versions for this episode
    const {qualities, versions} = await getEpisodeQualities(episode)
    
    if (qualities.length === 0) {
      alert("Could not get episode data from AnimePahe. Please try again.")
      return
    }
    
    // Show all qualities but mark HD as premium
    setAvailableQualities(qualities.map(q => `${q}p`))
    if (qualities.length > 0) {
      // Default to highest available quality that user can access
      const defaultQuality = isPremium 
        ? (qualities.includes('1080') ? '1080p' : `${qualities[0]}p`)
        : '720p'
      setSelectedQuality(defaultQuality)
    }
    
    setAvailableVersions(versions)
    if (versions.length > 0) {
      setSelectedVersion(versions.includes('sub') ? 'sub' : (versions.includes('dub') ? 'dub' : 'sub'))
    }
    
    setSelectedEpisode(episode)
    setShowQualityPopup(true)
  }

  // Handle bulk download button click (with premium check)
  const handleBulkDownloadClick = async () => {
    if (!episodes.length || bulkDownloading) return

    // Check if user can bulk download
    const bulkCheck = checkCanBulkDownload()
    if (!bulkCheck.canBulkDownload) {
      setPremiumModalFeature('bulkDownload')
      setPremiumModalMessage(bulkCheck.reason)
      setShowPremiumModal(true)
      return
    }

    // Show loading state while initializing AnimePahe
    if (initializingAnimepahe) {
      return
    }

    // Initialize AnimePahe data first
    const animepaheResult = await initializeAnimepaheData()
    if (!animepaheResult) {
      alert("Could not connect to AnimePahe. Please try again.")
      return
    }

    // Premium users can proceed
    if (episodes.length > 0) {
      const {qualities, versions} = await getEpisodeQualities(episodes[0])
      
      if (qualities.length === 0) {
        alert("Could not get episode data from AnimePahe. Please try again.")
        return
      }
      
      setBulkAvailableQualities(qualities.map(q => `${q}p`))
      setBulkAvailableVersions(versions)
      
      if (qualities.length > 0) {
        setBulkQuality(qualities.includes('1080') ? '1080p' : `${qualities[0]}p`)
      }
      if (versions.length > 0) {
        setBulkVersion(versions.includes('sub') ? 'sub' : (versions.includes('dub') ? 'dub' : 'sub'))
      }
    }

    setShowBulkPopup(true)
  }

  // Handle actual bulk download after quality selection
  const handleConfirmBulkDownload = async () => {
    if (!episodes.length) return

    setShowBulkPopup(false)
    setBulkDownloading(true)
    let successCount = 0
    let failCount = 0

    try {
      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i]
        
        try {
          console.log(`Downloading episode ${i + 1}/${episodes.length}: Episode ${episode.episode}`)
          
          // Set processing state for current episode
          setDownloadingEpisodes(prev => {
            const newMap = new Map(prev)
            newMap.set(episode.id, {
              isDownloading: true,
              countdown: 0
            })
            return newMap
          })

          const streamUrl = await getEpisodeStreamUrl(episode, bulkQuality, bulkVersion)
          if (!streamUrl) {
            throw new Error("Could not get stream URL")
          }

          const filename = `${anime?.title.english || anime?.title.romaji} - Episode ${episode.episode}${episode.title ? ` - ${episode.title}` : ''} [${bulkQuality}] [${bulkVersion.toUpperCase()}]`
          
          // Start countdown for current episode
          startCountdown(episode.id)
          
          await downloadEpisodeAsMp4(streamUrl, filename)
          successCount++
          
          // Record download for premium tracking
          if (anime?.id) {
            recordDownload(anime.id, episode.episode)
          }
          
          console.log(`✅ Downloaded episode ${episode.episode}`)

          // Clear download state for completed episode
          setDownloadingEpisodes(prev => {
            const newMap = new Map(prev)
            const current = newMap.get(episode.id)
            if (current?.intervalId) {
              clearInterval(current.intervalId)
            }
            newMap.delete(episode.id)
            return newMap
          })

          // Add delay between downloads to prevent overwhelming the server
          if (i < episodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
          }

        } catch (error) {
          console.error(`Failed to download episode ${episode.episode}:`, error)
          failCount++
          
          // Clear download state for failed episode
          setDownloadingEpisodes(prev => {
            const newMap = new Map(prev)
            const current = newMap.get(episode.id)
            if (current?.intervalId) {
              clearInterval(current.intervalId)
            }
            newMap.delete(episode.id)
            return newMap
          })
        }
      }

      alert(`Bulk download completed!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`)

    } catch (error) {
      console.error("Bulk download error:", error)
      alert("Bulk download failed. Please try again.")
    } finally {
      setBulkDownloading(false)
    }
  }

  const handleConfirmDownload = async () => {
    if (!selectedEpisode) return

    setShowQualityPopup(false)
    
    // Set processing state first (no countdown)
    setDownloadingEpisodes(prev => {
      const newMap = new Map(prev)
      newMap.set(selectedEpisode.id, {
        isDownloading: true,
        countdown: 0
      })
      return newMap
    })

    try {
      const streamUrl = await getEpisodeStreamUrl(selectedEpisode, selectedQuality, selectedVersion)
      if (!streamUrl) {
        throw new Error("Could not get stream URL")
      }

      const filename = `${anime?.title.english || anime?.title.romaji} - Episode ${selectedEpisode.episode}${selectedEpisode.title ? ` - ${selectedEpisode.title}` : ''} [${selectedQuality}] [${selectedVersion.toUpperCase()}]`
      
      console.log(`Starting download for: ${filename} - Quality: ${selectedQuality}, Version: ${selectedVersion}`)
      
      // Start countdown when actual download begins
      startCountdown(selectedEpisode.id)
      
      await downloadEpisodeAsMp4(streamUrl, filename)
      
      // Record download for premium tracking
      if (anime?.id) {
        recordDownload(anime.id, selectedEpisode.episode)
      }
      
      console.log(`Download completed for episode ${selectedEpisode.episode}`)

    } catch (error) {
      console.error(`Failed to download episode ${selectedEpisode.episode}:`, error)
      alert(`Failed to download episode ${selectedEpisode.episode}. Please try again.`)
    } finally {
      // Clear download state
      setDownloadingEpisodes(prev => {
        const newMap = new Map(prev)
        const current = newMap.get(selectedEpisode.id)
        if (current?.intervalId) {
          clearInterval(current.intervalId)
        }
        newMap.delete(selectedEpisode.id)
        return newMap
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-800"></div>
          <div className="p-4 space-y-3">
            <div className="h-6 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-16 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-3">Anime not found</h1>
          <button 
            onClick={() => router.push('/')} 
            className="text-[#ff914d] hover:underline text-sm"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  const cleanDescription = anime.description?.replace(/<[^>]*>/g, "") || "No description available."
  const shortDescription = cleanDescription.length > 150 ? cleanDescription.substring(0, 150) + "..." : cleanDescription
  const recommendations =
    anime.recommendations?.edges?.map((edge) => edge.node.mediaRecommendation).filter(Boolean) || []

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Premium Modal - Higher z-index to appear in front */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature={premiumModalFeature}
        customMessage={premiumModalMessage}
        downloadsLeft={downloadsLeft}
      />

      {/* Quality Selection Popup */}
      {showQualityPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-black rounded-2xl border border-gray-700 p-6 w-full max-w-sm mx-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Select Quality</h3>
              <button
                onClick={() => setShowQualityPopup(false)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Episode Info */}
            <div className="mb-6">
              <p className="text-gray-300 text-sm">
                Episode {selectedEpisode?.episode}
                {selectedEpisode?.title && ` - ${selectedEpisode.title}`}
              </p>
            </div>

            {/* Quality Options */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Quality
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableQualities.map((quality) => {
                  const isHD = parseInt(quality) > 720
                  const needsPremium = !isPremium && isHD
                  
                  return (
                    <button
                      key={quality}
                      onClick={() => {
                        if (needsPremium) {
                          setPremiumModalFeature('hdQuality')
                          setPremiumModalMessage('Upgrade to Premium to unlock HD quality (1080p and above)')
                          setShowPremiumModal(true)
                          return
                        }
                        setSelectedQuality(quality)
                      }}
                      className={`p-3 rounded-lg border transition-all relative ${
                        selectedQuality === quality
                          ? 'border-[#ff914d] bg-[#ff914d]/10 text-[#ff914d]'
                          : needsPremium
                          ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-[#ff914d]/50 cursor-pointer'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {quality}
                      {needsPremium && (
                        <Crown className="w-3 h-3 text-[#ff914d] absolute top-1 right-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Version Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-300 mb-3 block">Version</label>
              <div className="flex gap-2">
                {availableVersions.map((version) => (
                  <button
                    key={version}
                    onClick={() => setSelectedVersion(version as 'sub' | 'dub')}
                    className={`flex-1 p-3 rounded-lg border transition-all ${
                      selectedVersion === version
                        ? 'border-[#ff914d] bg-[#ff914d]/10 text-[#ff914d]'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {version.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowQualityPopup(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDownload}
                className="flex-1 bg-[#ff914d] hover:bg-[#e8823d] text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Download Popup */}
      {showBulkPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-2xl border border-gray-700 p-5 w-full max-w-xs mx-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Bulk Download
                <Crown className="w-4 h-4 text-[#ff914d]" />
              </h3>
              <button
                onClick={() => setShowBulkPopup(false)}
                className="p-1.5 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Download Info */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-xs">Episodes:</span>
                <span className="text-white font-medium text-sm">{episodes.length}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-xs">Est. Size:</span>
                <span className="text-white font-medium text-sm">~{((episodes.length * 300) / 1024).toFixed(1)}GB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">Format:</span>
                <span className="text-white font-medium text-sm">MP4</span>
              </div>
            </div>

            {/* Quality Options */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-300 mb-2 block">Quality</label>
              <div className="grid grid-cols-2 gap-2">
                {bulkAvailableQualities.map((quality) => (
                  <button
                    key={quality}
                    onClick={() => setBulkQuality(quality)}
                    className={`p-2 rounded-lg border transition-all text-sm ${
                      bulkQuality === quality
                        ? 'border-[#ff914d] bg-[#ff914d]/10 text-[#ff914d]'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            {/* Version Selection */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-300 mb-2 block">Version</label>
              <div className="flex gap-2">
                {bulkAvailableVersions.map((version) => (
                  <button
                    key={version}
                    onClick={() => setBulkVersion(version as 'sub' | 'dub')}
                    className={`flex-1 p-2 rounded-lg border transition-all text-sm ${
                      bulkVersion === version
                        ? 'border-[#ff914d] bg-[#ff914d]/10 text-[#ff914d]'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {version.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-300 text-xs">
                ⚠️ Downloads all episodes sequentially. Cannot be paused.
              </p>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkPopup(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDownload}
                className="flex-1 bg-[#ff914d] hover:bg-[#e8823d] text-white py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3" />
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        {anime.bannerImage && (
          <Image
            src={anime.bannerImage || "/placeholder.svg"}
            alt={anime.title.english || anime.title.romaji}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button 
            onClick={() => router.push('/')} 
            className="p-2 bg-black/50 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          {/* Premium Badge */}
          {isPremium && (
            <div className="bg-gradient-to-r from-[#ff914d] to-orange-600 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-bold">PREMIUM</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex gap-3">
            <div className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={anime.coverImage.large || "/placeholder.svg"}
                alt={anime.title.english || anime.title.romaji}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold mb-1 text-white line-clamp-2">
                {anime.title.english || anime.title.romaji}
              </h1>
              <div className="flex items-center gap-3 mb-2 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span>{anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{anime.seasonYear}</span>
                </div>
                {anime.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{anime.duration}m</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {/* Stream Button */}
                <button
                  onClick={() => {
                    if (episodes.length > 0) {
                      router.push(`/watch/${id}/${episodes[0].episode}`)
                    }
                  }}
                  disabled={episodes.length === 0}
                  className="bg-[#ff914d] hover:bg-[#e8823d] text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  Stream
                </button>

                {/* Bulk Download Button with Premium Icon */}
                <button
                  onClick={handleBulkDownloadClick}
                  disabled={episodes.length === 0 || bulkDownloading || initializingAnimepahe}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {!isPremium && (
                    <Crown className="w-3 h-3 text-[#ff914d] absolute -top-1 -right-1" />
                  )}
                  <Download className="w-3 h-3" />
                  {initializingAnimepahe ? "Loading..." : bulkDownloading ? "Downloading..." : "Download"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-4">
        {/* Info */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {anime.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="bg-gray-800 text-gray-300 px-2 py-1 rounded-full text-xs">
                {genre}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div>
              <span className="text-gray-400">Format:</span>
              <span className="ml-2 text-white">{anime.format}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="ml-2 text-white">{anime.status}</span>
            </div>
            <div>
              <span className="text-gray-400">Episodes:</span>
              <span className="ml-2 text-white">{anime.episodes || "Unknown"}</span>
            </div>
            {anime.studios?.nodes.length > 0 && (
              <div>
                <span className="text-gray-400">Studio:</span>
                <span className="ml-2 text-white">{anime.studios.nodes[0].name}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold mb-2">Synopsis</h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              {showFullDescription ? cleanDescription : shortDescription}
            </p>
            {cleanDescription.length > 150 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-[#ff914d] text-xs mt-1 hover:underline"
              >
                {showFullDescription ? "Read less" : "Read more"}
              </button>
            )}
          </div>
        </div>

        {/* Episodes Section - Now using AniList data */}
        {episodes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Episodes</h3>
              {!isPremium && (
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  <span>{(() => {
                    const downloadCheck = checkCanDownload()
                    return downloadCheck.downloadsLeft !== undefined 
                      ? `${downloadCheck.downloadsLeft} downloads left today`
                      : 'Daily limit reached'
                  })()}</span>
                </div>
              )}
            </div>
            {loadingEpisodes ? (
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-2 w-max">
                  {Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-24">
                        <div className="w-24 h-24 bg-gray-800 rounded-lg animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-800 rounded animate-pulse"></div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3 pb-2 w-max">
                    {/* Episodes from AniList - sorted ascending, fallback to anime cover if no episode thumbnail, only show 'Episode {number}' */}
                    {episodes.slice().sort((a, b) => a.episode - b.episode).map((episode) => {
                      const downloadState = downloadingEpisodes.get(episode.id)
                      const isDownloading = downloadState?.isDownloading || false
                      const countdown = downloadState?.countdown || 0
                      const episodeImage = episode.snapshot ? `/api/proxy-image?url=${encodeURIComponent(episode.snapshot)}` : (anime?.coverImage?.large || "/placeholder.svg")
                      return (
                        <div key={episode.id} className="flex-shrink-0 w-24">
                          <div 
                            className="relative w-24 h-24 rounded-lg overflow-hidden mb-2 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleEpisodeDownloadClick(episode)}
                          >
                            <Image
                              src={episodeImage}
                              alt={`Episode ${episode.episode}`}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            {/* Download overlay - hide when downloading */}
                            {!isDownloading && !initializingAnimepahe && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                  <Download className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                            {(isDownloading || initializingAnimepahe) && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-white text-xs font-medium">
                                    {initializingAnimepahe ? "Loading..." : "Processing..."}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-white text-xs font-medium text-center truncate">
                            Episode {episode.episode}
                          </p>
                          {isDownloading && (
                            <p className="text-[#ff914d] text-xs text-center">
                              {countdown > 0 ? (
                                <span>Downloading... <span className="font-bold">({countdown})</span></span>
                              ) : (
                                <span className="animate-pulse">Processing...</span>
                              )}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No episodes fallback */}
        {!loadingEpisodes && episodes.length === 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Episodes</h3>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No episodes found</p>
              <p className="text-gray-500 text-xs mt-1">This anime might not have episode data available</p>
            </div>
          </div>
        )}

        {/* Characters */}
        {anime.characters?.edges && anime.characters.edges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-3">Characters</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2 w-max">
                {anime.characters.edges.slice(0, 10).map((character) => (
                  <div key={character.node.id} className="flex-shrink-0 w-20">
                    <div className="relative w-20 h-24 rounded-lg overflow-hidden mb-1.5">
                      <Image
                        src={character.node.image.large || "/placeholder.svg"}
                        alt={character.node.name.full}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-white text-xs font-medium text-center truncate">{character.node.name.full}</p>
                    <p className="text-gray-400 text-xs text-center capitalize">{character.role.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* More Like This */}
        {recommendations.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3">More Like This</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2 w-max">
                {recommendations.slice(0, 10).map((rec) => (
                  <Link href={`/anime/${rec.id}`} key={rec.id}>
                    <div className="flex-shrink-0 w-24 cursor-pointer hover:scale-105 transition-transform">
                      <div className="relative w-24 h-32 rounded-lg overflow-hidden mb-1.5">
                        <Image
                          src={rec.coverImage.large || "/placeholder.svg"}
                          alt={rec.title.english || rec.title.romaji}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-[#ff914d] text-white text-xs px-1.5 py-0.5 rounded">
                          {rec.averageScore ? (rec.averageScore / 10).toFixed(1) : "N/A"}
                        </div>
                      </div>
                      <p className="text-white text-xs font-medium text-center truncate line-clamp-2">
                        {rec.title.english || rec.title.romaji}
                      </p>
                      <p className="text-gray-400 text-xs text-center">
                        {rec.format} • {rec.episodes ? `${rec.episodes} eps` : "Ongoing"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}