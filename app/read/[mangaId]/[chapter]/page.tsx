"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react"
import { fetchMediaDetails } from "@/lib/anilist"
import type { AnimeData } from "@/lib/anilist"

interface ComickChapter {
  id: number
  chap: string
  title: string
  vol: string
  lang: string
  hid: string
}

export default function ReadPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const mangaId = Number.parseInt(params.mangaId as string)
  const chapterNumber = params.chapter as string
  const chapterId = searchParams.get("chapterId")

  const [manga, setManga] = useState<AnimeData | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fullScreen, setFullScreen] = useState(false)
  const [chapters, setChapters] = useState<ComickChapter[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load chapters from localStorage on component mount
  useEffect(() => {
    const storedChapters = localStorage.getItem("chapters")
    const storedMangaId = localStorage.getItem("mangaId")
    
    if (storedChapters && storedMangaId === mangaId.toString()) {
      const parsedChapters = JSON.parse(storedChapters) as ComickChapter[]
      setChapters(parsedChapters)
      
      // Find current chapter index
      const currentIndex = parsedChapters.findIndex(ch => ch.hid === chapterId)
      setCurrentChapterIndex(currentIndex)
    }
  }, [mangaId, chapterId])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [mangaDetailsRes, chapterImagesRes] = await Promise.all([
          fetchMediaDetails(mangaId),
          fetch(`/api/comick/images?chapterId=${chapterId}`).then(res => res.json())
        ])

        if (mangaDetailsRes?.type !== "MANGA") {
          router.push("/")
          return
        }

        setManga(mangaDetailsRes)

        const imgUrls = chapterImagesRes.map((img: any) => `https://meo.comick.pictures/${img.b2key}`)
        setImages(imgUrls)
      } catch (err) {
        console.error("Error loading data:", err)
      } finally {
        setLoading(false)
      }
    }

    if (mangaId && chapterId) {
      loadData()
    }
  }, [mangaId, chapterId, router])

  const toggleFullScreen = () => {
    setFullScreen(!fullScreen)
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const goToChapter = (delta: number) => {
    if (chapters.length === 0 || currentChapterIndex === -1) return
    
    const targetIndex = currentChapterIndex + delta
    const targetChapter = chapters[targetIndex]
    
    if (targetChapter) {
      router.push(`/read/${mangaId}/${targetChapter.chap}?chapterId=${targetChapter.hid}`)
    }
  }

  // Check if navigation is possible
  const canGoPrevious = currentChapterIndex > 0
  const canGoNext = currentChapterIndex < chapters.length - 1 && currentChapterIndex !== -1

  // Get current chapter info for display
  const currentChapter = currentChapterIndex !== -1 ? chapters[currentChapterIndex] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff914d] mx-auto mb-4"></div>
          <p>Loading chapter...</p>
        </div>
      </div>
    )
  }

  if (!manga || images.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-3">Chapter not found</h1>
          <button onClick={() => router.push(`/manga/${mangaId}`)} className="text-[#ff914d] hover:underline text-sm">
            Go to manga page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-black text-white ${fullScreen ? "overflow-hidden" : "overflow-y-auto"}`}>
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/manga/${mangaId}`)} className="p-2 hover:bg-gray-800 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-xs">
              {manga.title.english || manga.title.romaji}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Chapter {chapterNumber}</span>
              {currentChapter?.title && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[150px]">{currentChapter.title}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => goToChapter(-1)} 
            disabled={!canGoPrevious}
            className="hover:bg-gray-800 p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title={canGoPrevious ? `Previous: Chapter ${chapters[currentChapterIndex - 1]?.chap}` : "No previous chapter"}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => goToChapter(1)} 
            disabled={!canGoNext}
            className="hover:bg-gray-800 p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title={canGoNext ? `Next: Chapter ${chapters[currentChapterIndex + 1]?.chap}` : "No next chapter"}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={toggleFullScreen} className="hover:bg-gray-800 p-2 rounded">
            {fullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Chapter Info Bar */}
      {currentChapter && (
        <div className="bg-gray-900/50 backdrop-blur-sm px-4 py-2 text-center border-b border-gray-800">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>
              {currentChapterIndex + 1} of {chapters.length} chapters
            </span>
            {currentChapter.vol && currentChapter.vol !== "0" && (
              <span>Volume {currentChapter.vol}</span>
            )}
            <span className="capitalize">{currentChapter.lang}</span>
          </div>
        </div>
      )}

      {/* Reader - Webtoon Style (No Spacing) */}
      <div className="select-none">
        {images.map((url, index) => (
          <div key={index} className="relative">
            <img
              src={url}
              alt={`Page ${index + 1}`}
              className="w-full max-w-[800px] mx-auto block object-contain touch-pan-y"
              loading="lazy"
            />
            {/* Page number overlay */}
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {index + 1} / {images.length}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 bg-black/90 backdrop-blur-sm border-t border-gray-800 p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button 
            onClick={() => goToChapter(-1)} 
            disabled={!canGoPrevious}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          
          <div className="text-center">
            <div className="text-xs text-gray-400">Chapter</div>
            <div className="text-sm font-medium">{chapterNumber}</div>
          </div>
          
          <button 
            onClick={() => goToChapter(1)} 
            disabled={!canGoNext}
            className="flex items-center gap-2 bg-[#ff914d] hover:bg-[#e8823d] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Chapter progress indicator */}
        {chapters.length > 0 && currentChapterIndex !== -1 && (
          <div className="mt-3">
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div 
                className="bg-[#ff914d] h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentChapterIndex + 1) / chapters.length) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Start</span>
              <span>{currentChapterIndex + 1} / {chapters.length}</span>
              <span>Latest</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
