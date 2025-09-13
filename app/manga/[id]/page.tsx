"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Download, Star, Calendar, ChevronLeft, ChevronRight, Crown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { fetchMediaDetails } from "@/lib/anilist"
import { usePremium } from "@/contexts/PremiumContext"
import { PremiumModal } from "@/components/PremiumModal"
import type { AnimeData } from "@/lib/anilist"
import DownloadPopup from "@/components/DownloadPopup"

interface ComickChapter {
  id: number
  chap: string
  title: string
  vol: string
  lang: string
  hid: string
}

export default function MangaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number.parseInt(params.id as string)
  const [manga, setManga] = useState<AnimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [chapters, setChapters] = useState<ComickChapter[]>([])
  const [allChapters, setAllChapters] = useState<ComickChapter[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en")
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [fetchingAllChapters, setFetchingAllChapters] = useState(false)
  const [chaptersFetchError, setChaptersFetchError] = useState<string | null>(null)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [chaptersPerPage] = useState(10)
  const [filteredChapters, setFilteredChapters] = useState<ComickChapter[]>([])

  // Download functionality state
  const [isDownloadPopupOpen, setIsDownloadPopupOpen] = useState(false)

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

  // Function to save chapters to localStorage before navigation
  const saveChaptersToStorage = () => {
    if (filteredChapters.length > 0) {
      localStorage.setItem("chapters", JSON.stringify(filteredChapters))
      localStorage.setItem("mangaId", id.toString())
    }
  }

  // Function to handle download button click with premium check
  const handleDownloadClick = () => {
    if (filteredChapters.length === 0) return
    
    // Check if user can download
    const downloadCheck = checkCanDownload()
    if (!downloadCheck.canDownload) {
      setPremiumModalFeature('download')
      setPremiumModalMessage(downloadCheck.reason)
      setDownloadsLeft(downloadCheck.downloadsLeft)
      setShowPremiumModal(true)
      return
    }

    // Only premium users get to see the download popup
    if (!isPremium) {
      setPremiumModalFeature('download')
      setPremiumModalMessage('Upgrade to Premium for unlimited manga downloads!')
      setDownloadsLeft(downloadCheck.downloadsLeft)
      setShowPremiumModal(true)
      return
    }

    // Premium users can proceed to the download popup
    setIsDownloadPopupOpen(true)
  }

  // Function to fetch ALL chapters from all pages with retry logic
  const fetchAllChapters = async (hid: string, maxRetries = 5): Promise<ComickChapter[]> => {
    const allChapters: ComickChapter[] = []
    let page = 1
    let hasMorePages = true
    const limit = 200 // Maximum allowed by API

    while (hasMorePages) {
      let retryAttempts = 0
      let pageSuccess = false
      
      while (retryAttempts < maxRetries && !pageSuccess) {
        try {
          console.log(`Fetching page ${page} of chapters... (attempt ${retryAttempts + 1}/${maxRetries})`)
          
          const chaptersRes = await fetch(
            `/api/comick/chapters?hid=${hid}&limit=${limit}&page=${page}&chap-order=1`
          )

          if (!chaptersRes.ok) {
            throw new Error(`HTTP ${chaptersRes.status}: ${chaptersRes.statusText}`)
          }

          const chaptersData = await chaptersRes.json()

          if (chaptersData.error) {
            throw new Error(chaptersData.error)
          }

          if (Array.isArray(chaptersData.chapters) && chaptersData.chapters.length > 0) {
            allChapters.push(...chaptersData.chapters)
            
            // If we got fewer chapters than the limit, we've reached the end
            if (chaptersData.chapters.length < limit) {
              hasMorePages = false
            } else {
              page++
            }
          } else {
            hasMorePages = false
          }

          pageSuccess = true
          setChaptersFetchError(null) // Clear any previous errors on success
          
        } catch (error) {
          retryAttempts++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Error fetching page ${page} (attempt ${retryAttempts}/${maxRetries}):`, errorMessage)
          
          if (retryAttempts < maxRetries) {
            // Exponential backoff: wait 1s, 2s, 4s, 8s, 16s
            const delay = Math.pow(2, retryAttempts - 1) * 1000
            console.log(`Retrying in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          } else {
            // Max retries reached for this page
            console.error(`Failed to fetch page ${page} after ${maxRetries} attempts`)
            setChaptersFetchError("Bad network or server down")
            hasMorePages = false // Stop trying more pages
            break
          }
        }
      }

      // Add a small delay between successful pages to be respectful to the API
      if (pageSuccess && hasMorePages) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log(`Fetched ${allChapters.length} total chapters across ${page} pages`)
    return allChapters
  }

  // Manual retry function - single retry attempt
  const retryFetchChapters = async () => {
    if (!manga) return
    
    // Hide retry button and start fresh attempt
    setChaptersFetchError(null)
    setFetchingAllChapters(true)
    
    try {
      // Search manga on Comick
      const searchRes = await fetch(
        `/api/comick/search?query=${encodeURIComponent(manga.title.english || manga.title.romaji)}`
      )

      if (!searchRes.ok) {
        throw new Error("Bad network or server down")
      }

      const searchData = await searchRes.json()
      console.log("Comick search results (retry):", searchData)

      if (Array.isArray(searchData) && searchData.length > 0) {
        const hid = searchData[0].hid

        // Fetch ALL chapters using pagination with retry logic
        const allChaptersData = await fetchAllChapters(hid)
        
        if (allChaptersData.length > 0) {
          setAllChapters(allChaptersData)
          
          // Get unique languages
          const languages = [...new Set(allChaptersData.map((ch: ComickChapter) => ch.lang))] as string[]
          setAvailableLanguages(languages)
          
          console.log(`Successfully fetched ${allChaptersData.length} chapters on retry`)
        } else {
          setChaptersFetchError("No chapters found")
        }
      } else {
        setChaptersFetchError("Bad network or server down")
      }
    } catch (error) {
      console.error("Error during manual retry:", error)
      setChaptersFetchError("Bad network or server down")
    } finally {
      setFetchingAllChapters(false)
    }
  }

  useEffect(() => {
    const loadMangaDetails = async () => {
      try {
        const data = await fetchMediaDetails(id)

        if (data?.type !== "MANGA") {
          setManga(null)
          setLoading(false)
          return
        }

        setManga(data)
        
        // Load preferred language from localStorage
        const savedLang = localStorage.getItem("preferredMangaLang")
        if (savedLang) {
          setSelectedLanguage(savedLang)
        }
      } catch (error) {
        console.error("Error loading manga details:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadMangaDetails()
    }
  }, [id])

  useEffect(() => {
    const fetchChapters = async () => {
      if (!manga) return

      setFetchingAllChapters(true)
      setChaptersFetchError(null)
      
      try {
        // Search manga on Comick
        const searchRes = await fetch(
          `/api/comick/search?query=${encodeURIComponent(manga.title.english || manga.title.romaji)}`
        )

        if (!searchRes.ok) {
          throw new Error("Bad network or server down")
        }

        const searchData = await searchRes.json()
        console.log("Comick search results:", searchData)

        if (Array.isArray(searchData) && searchData.length > 0) {
          const hid = searchData[0].hid // Use Comick HID (not slug)

          // Fetch ALL chapters using pagination with retry logic
          const allChaptersData = await fetchAllChapters(hid)
          
          if (allChaptersData.length > 0) {
            // Store all chapters
            setAllChapters(allChaptersData)
            
            // Get unique languages
            const languages = [...new Set(allChaptersData.map((ch: ComickChapter) => ch.lang))] as string[]
            setAvailableLanguages(languages)
          } else if (!chaptersFetchError) {
            // Only set this error if there wasn't already a more specific error
            setChaptersFetchError("No chapters found")
          }
        } else {
          setChaptersFetchError("Bad network or server down")
        }
      } catch (error) {
        console.error("Error fetching chapters from Comick:", error)
        setChaptersFetchError("Bad network or server down")
        setChapters([])
      } finally {
        setFetchingAllChapters(false)
      }
    }

    if (manga) {
      fetchChapters()
    }
  }, [manga])

  // Effect to filter and sort chapters when language changes
  useEffect(() => {
    if (allChapters.length > 0) {
      setChaptersLoading(true)
      // Only keep English chapters
      const englishChapters = allChapters.filter((ch: ComickChapter) => ch.lang === 'en')
      // Remove duplicates by keeping the latest/best version of each chapter
      const deduplicatedChapters = englishChapters.reduce((acc: ComickChapter[], current: ComickChapter) => {
        const existingChapterIndex = acc.findIndex(ch => ch.chap === current.chap)
        if (existingChapterIndex === -1) {
          acc.push(current)
        } else {
          const existingChapter = acc[existingChapterIndex]
          if (current.id > existingChapter.id) {
            acc[existingChapterIndex] = current
          }
        }
        return acc
      }, [])
      // Sort chapters ascending
      const smartSort = (a: ComickChapter, b: ComickChapter) => {
        const aChap = a.chap || "0"
        const bChap = b.chap || "0"
        if (aChap.toLowerCase() === "oneshot") return 1
        if (bChap.toLowerCase() === "oneshot") return -1
        if (aChap.toLowerCase().includes("extra")) return 1
        if (bChap.toLowerCase().includes("extra")) return -1
        const aNum = parseFloat(aChap)
        const bNum = parseFloat(bChap)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        return new Intl.Collator(undefined, { numeric: true }).compare(aChap, bChap)
      }
      const filtered = deduplicatedChapters.sort(smartSort)
      setTimeout(() => {
        setFilteredChapters(filtered)
        setCurrentPage(1)
        setChaptersLoading(false)
      }, 100)
    }
  }, [selectedLanguage, allChapters])

  // Calculate paginated chapters
  useEffect(() => {
    const startIndex = (currentPage - 1) * chaptersPerPage
    const endIndex = startIndex + chaptersPerPage
    setChapters(filteredChapters.slice(startIndex, endIndex))
  }, [filteredChapters, currentPage, chaptersPerPage])

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem("preferredMangaLang", selectedLanguage)
  }, [selectedLanguage])

  // Pagination helpers
  const totalPages = Math.ceil(filteredChapters.length / chaptersPerPage)
  const startChapter = (currentPage - 1) * chaptersPerPage + 1
  const endChapter = Math.min(currentPage * chaptersPerPage, filteredChapters.length)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Mobile-responsive pagination component
  const MobilePagination = () => {
    if (totalPages <= 1) return null

    const getPageButtons = () => {
      const buttons = []
      const maxButtons = 3 // Show max 3 page buttons on mobile
      
      if (totalPages <= maxButtons) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
          buttons.push(i)
        }
      } else {
        // Smart pagination for mobile
        if (currentPage <= 2) {
          buttons.push(1, 2, 3)
        } else if (currentPage >= totalPages - 1) {
          buttons.push(totalPages - 2, totalPages - 1, totalPages)
        } else {
          buttons.push(currentPage - 1, currentPage, currentPage + 1)
        }
      }
      
      return buttons
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        {/* Previous button */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-8 h-8 bg-gray-800 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* First page if not visible */}
        {!getPageButtons().includes(1) && (
          <>
            <button
              onClick={() => goToPage(1)}
              className="flex items-center justify-center w-8 h-8 bg-gray-800 text-white text-xs rounded hover:bg-gray-700"
            >
              1
            </button>
            <span className="text-gray-500 text-xs">...</span>
          </>
        )}
        
        {/* Page buttons */}
        {getPageButtons().map(pageNum => (
          <button
            key={pageNum}
            onClick={() => goToPage(pageNum)}
            className={`flex items-center justify-center w-8 h-8 text-xs rounded transition-colors ${
              currentPage === pageNum
                ? 'bg-[#ff914d] text-white'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {pageNum}
          </button>
        ))}
        
        {/* Last page if not visible */}
        {!getPageButtons().includes(totalPages) && (
          <>
            <span className="text-gray-500 text-xs">...</span>
            <button
              onClick={() => goToPage(totalPages)}
              className="flex items-center justify-center w-8 h-8 bg-gray-800 text-white text-xs rounded hover:bg-gray-700"
            >
              {totalPages}
            </button>
          </>
        )}
        
        {/* Next button */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-8 h-8 bg-gray-800 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Language display names mapping
  const getLanguageDisplayName = (langCode: string) => {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'tr': 'Turkish',
      'pl': 'Polish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Filipino',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'ur': 'Urdu',
      'fa': 'Persian',
      'he': 'Hebrew',
      'uk': 'Ukrainian',
      'cs': 'Czech',
      'sk': 'Slovak',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sr': 'Serbian',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'el': 'Greek',
      'mt': 'Maltese',
      'ga': 'Irish',
      'cy': 'Welsh',
      'is': 'Icelandic',
      'mk': 'Macedonian',
      'sq': 'Albanian',
      'eu': 'Basque',
      'ca': 'Catalan',
      'gl': 'Galician',
      'be': 'Belarusian',
      'ka': 'Georgian',
      'hy': 'Armenian',
      'az': 'Azerbaijani',
      'kk': 'Kazakh',
      'ky': 'Kyrgyz',
      'uz': 'Uzbek',
      'mn': 'Mongolian',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Myanmar',
      'km': 'Khmer',
      'lo': 'Lao',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'xh': 'Xhosa'
    }
    return languageMap[langCode] || langCode.toUpperCase()
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

  if (!manga) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-3">Manga not found</h1>
          <button onClick={() => router.push("/")} className="text-[#ff914d] hover:underline text-sm">
            Go to home page
          </button>
        </div>
      </div>
    )
  }

  const cleanDescription = manga.description?.replace(/<[^>]*>/g, "") || "No description available."
  const shortDescription = cleanDescription.length > 150 ? cleanDescription.substring(0, 150) + "..." : cleanDescription
  const recommendations =
    manga.recommendations?.edges?.map((edge) => edge.node.mediaRecommendation).filter(Boolean) || []

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Premium Modal - Higher z-index to appear in front */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature={premiumModalFeature}
        customMessage={premiumModalMessage}
        type="manga"
      />

      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        {manga.bannerImage && (
          <Image
            src={manga.bannerImage || "/placeholder.svg"}
            alt={manga.title.english || manga.title.romaji}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={() => router.push("/")} className="p-2 bg-black/50 rounded-full backdrop-blur-sm">
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
                src={manga.coverImage.large || "/placeholder.svg"}
                alt={manga.title.english || manga.title.romaji}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold mb-1 text-white line-clamp-2">
                {manga.title.english || manga.title.romaji}
              </h1>
              <div className="flex items-center gap-3 mb-2 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span>{manga.averageScore ? (manga.averageScore / 10).toFixed(1) : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{manga.seasonYear}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {filteredChapters.length > 0 ? (
                  <Link 
                    href={`/read/${manga.id}/${filteredChapters[0]?.chap}?chapterId=${filteredChapters[0]?.hid}`}
                    onClick={saveChaptersToStorage}
                  >
                    <button className="bg-[#ff914d] hover:bg-[#e8823d] text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors text-xs">
                      <BookOpen className="w-3 h-3" />
                      Read
                    </button>
                  </Link>
                ) : (
                  <button className="bg-gray-600 text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 text-xs opacity-50 cursor-not-allowed">
                    <BookOpen className="w-3 h-3" />
                    {fetchingAllChapters ? "Loading..." : chaptersFetchError ? "Error" : "No Chapters"}
                  </button>
                )}
                
                {/* Updated Download Button with Premium Icon */}
                {filteredChapters.length > 0 ? (
                  <button 
                    onClick={handleDownloadClick}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors text-xs relative"
                  >
                    {!isPremium && (
                      <Crown className="w-3 h-3 text-[#ff914d] absolute -top-1 -right-1" />
                    )}
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                ) : (
                  <button 
                    className="bg-gray-800 text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5 text-xs opacity-50 cursor-not-allowed"
                    title={fetchingAllChapters ? "Loading chapters..." : chaptersFetchError ? "No chapters available" : "No chapters to download"}
                    disabled
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                )}
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
            {manga.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="bg-gray-800 text-gray-300 px-2 py-1 rounded-full text-xs">
                {genre}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div>
              <span className="text-gray-400">Format:</span>
              <span className="ml-2 text-white">{manga.format}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="ml-2 text-white">{manga.status}</span>
            </div>
            <div>
              <span className="text-gray-400">Chapters:</span>
              <span className="ml-2 text-white">{manga.chapters || "Unknown"}</span>
            </div>
            <div>
              <span className="text-gray-400">Volumes:</span>
              <span className="ml-2 text-white">{manga.volumes || "Unknown"}</span>
            </div>
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

        {/* Chapters */}
        {(filteredChapters.length > 0 || chaptersLoading || fetchingAllChapters || chaptersFetchError) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                Chapters
                {fetchingAllChapters && (
                  <span className="ml-2 text-xs text-[#ff914d] animate-pulse">
                    Fetching all chapters...
                  </span>
                )}
                {!fetchingAllChapters && filteredChapters.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({filteredChapters.length} total)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                {/* Language selector removed for speed - only English chapters shown */}
              </div>
            </div>

            {/* Simple Error State with Retry Button */}
            {chaptersFetchError && !fetchingAllChapters && (
              <div className="text-center py-4 mb-4">
                <p className="text-gray-400 text-sm mb-3">{chaptersFetchError}</p>
                <button
                  onClick={retryFetchChapters}
                  className="bg-[#ff914d] hover:bg-[#e8823d] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              </div>
            )}

            {/* Pagination Info */}
            {!chaptersLoading && !fetchingAllChapters && !chaptersFetchError && filteredChapters.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-400">
                  Showing chapters {startChapter}-{endChapter} of {filteredChapters.length}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1 bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="text-xs text-gray-400 px-2">
                      {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1 bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {(chaptersLoading || fetchingAllChapters) ? (
              <div className="space-y-2">
                {/* Loading skeleton */}
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg animate-pulse">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                    </div>
                    <div className="w-6 h-6 bg-gray-700 rounded"></div>
                  </div>
                ))}
                {fetchingAllChapters && (
                  <div className="text-center py-4">
                    <div className="text-xs text-gray-400">
                      Loading all chapters... This might take a moment for series with many chapters.
                    </div>
                  </div>
                )}
              </div>
            ) : !chaptersFetchError && chapters.length > 0 ? (
              <div className="space-y-2">
                {chapters.map((chapter, index) => (
                  <Link
                    href={`/read/${manga.id}/${chapter.chap}?chapterId=${chapter.hid}`}
                    key={chapter.hid}
                    className="block"
                    onClick={saveChaptersToStorage}
                  >
                    <div className="flex items-center gap-3 p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors group cursor-pointer">
                      {/* Chapter Icon */}
                      <div className="w-12 h-12 bg-[#ff914d]/10 border border-[#ff914d]/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#ff914d]/20 transition-colors">
                        <svg 
                          className="w-6 h-6 text-[#ff914d]" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" 
                          />
                        </svg>
                      </div>
                      
                      {/* Chapter Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate mb-1">
                          {chapter.title || `Chapter ${chapter.chap}`}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="bg-gray-700 px-2 py-0.5 rounded">
                            CH {chapter.chap}
                          </span>
                          {chapter.vol && chapter.vol !== "0" && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">
                              Vol {chapter.vol}
                            </span>
                          )}
                          <span>{getLanguageDisplayName(chapter.lang)}</span>
                        </div>
                      </div>
                      
                      {/* Action Icon */}
                      <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                        <svg 
                          className="w-5 h-5 text-gray-400 group-hover:text-[#ff914d] transition-colors" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M9 5l7 7-7 7" 
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}

            {/* Mobile-Responsive Pagination */}
            <MobilePagination />

            {/* Original Page Navigation Buttons - Hidden on mobile, shown on desktop */}
            {!chaptersLoading && !fetchingAllChapters && !chaptersFetchError && totalPages > 1 && (
              <div className="hidden md:flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-800 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  First
                </button>
                
                {/* Page range buttons */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  
                  const startRange = (pageNum - 1) * chaptersPerPage + 1;
                  const endRange = Math.min(pageNum * chaptersPerPage, filteredChapters.length);
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#ff914d] text-white'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                      title={`Chapters ${startRange}-${endRange}`}
                    >
                      {startRange}-{endRange}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-800 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        )}

        {/* Characters */}
        {manga.characters?.edges && manga.characters.edges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-3">Characters</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2 w-max">
                {manga.characters.edges.slice(0, 10).map((character) => (
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
                  <Link href={`/manga/${rec.id}`} key={rec.id}>
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
                        {rec.format} • {rec.chapters ? `${rec.chapters} ch` : "Ongoing"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download Popup */}
      <DownloadPopup
        isOpen={isDownloadPopupOpen}
        onClose={() => setIsDownloadPopupOpen(false)}
        chapters={filteredChapters}
        mangaTitle={manga.title.english || manga.title.romaji}
        totalChapters={filteredChapters.length}
      />
    </div>
  )
}