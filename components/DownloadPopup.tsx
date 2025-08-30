// components/DownloadPopup.tsx
import React, { useState } from 'react'
import { X, Download, AlertCircle, CheckCircle, Loader2, DownloadCloud } from 'lucide-react'
import { downloadMangaChapters, createPDFFromImages, fetchChapterImages, type ComickChapter } from '@/lib/downloadUtils'

interface DownloadPopupProps {
  isOpen: boolean
  onClose: () => void
  chapters: ComickChapter[]
  mangaTitle: string
  totalChapters: number
}

interface DownloadProgress {
  currentChapter: number
  chapterProgress: number
  totalChapters: number
  completedChapters: string[]
  isDownloading: boolean
  isComplete: boolean
  hasErrors: boolean
  downloadingChapter: string | null // Track which individual chapter is downloading
}

export default function DownloadPopup({ 
  isOpen, 
  onClose, 
  chapters, 
  mangaTitle, 
  totalChapters 
}: DownloadPopupProps) {
  const [progress, setProgress] = useState<DownloadProgress>({
    currentChapter: 0,
    chapterProgress: 0,
    totalChapters: 0,
    completedChapters: [],
    isDownloading: false,
    isComplete: false,
    hasErrors: false,
    downloadingChapter: null
  })

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
      'nl': 'Dutch'
    }
    return languageMap[langCode] || langCode.toUpperCase()
  }

  // Download individual chapter
  const downloadSingleChapter = async (chapter: ComickChapter) => {
    setProgress(prev => ({ 
      ...prev, 
      downloadingChapter: chapter.hid,
      chapterProgress: 0
    }))

    try {
      // Fetch chapter images
      const imageUrls = await fetchChapterImages(chapter.hid)
      
      if (imageUrls.length === 0) {
        throw new Error('No images found for this chapter')
      }

      // Create PDF from images
      const pdfData = await createPDFFromImages(
        imageUrls, 
        chapter.chap,
        (chapterProgress) => setProgress(prev => ({ ...prev, chapterProgress }))
      )

      // Download PDF
      const blob = new Blob([pdfData], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${mangaTitle.replace(/[/\\?%*:|"<>]/g, '-')} - Chapter ${chapter.chap}${chapter.title ? ` - ${chapter.title}` : ''}.pdf`
        .replace(/[/\\?%*:|"<>]/g, '-')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error(`Failed to download chapter ${chapter.chap}:`, error)
    } finally {
      setProgress(prev => ({ 
        ...prev, 
        downloadingChapter: null,
        chapterProgress: 0
      }))
    }
  }

  // Bulk download all chapters
  const handleBulkDownload = async () => {
    setProgress({
      currentChapter: 0,
      chapterProgress: 0,
      totalChapters: chapters.length,
      completedChapters: [],
      isDownloading: true,
      isComplete: false,
      hasErrors: false,
      downloadingChapter: null
    })

    try {
      await downloadMangaChapters(
        chapters,
        mangaTitle,
        (chapterIndex, chapterProgress, totalChapters) => {
          setProgress(prev => ({
            ...prev,
            currentChapter: chapterIndex + 1,
            chapterProgress,
            totalChapters
          }))
        },
        (chapterNumber) => {
          setProgress(prev => ({
            ...prev,
            completedChapters: [...prev.completedChapters, chapterNumber]
          }))
        }
      )

      setProgress(prev => ({
        ...prev,
        isDownloading: false,
        isComplete: true
      }))
    } catch (error) {
      console.error('Bulk download failed:', error)
      setProgress(prev => ({
        ...prev,
        isDownloading: false,
        hasErrors: true
      }))
    }
  }

  const resetProgress = () => {
    setProgress({
      currentChapter: 0,
      chapterProgress: 0,
      totalChapters: 0,
      completedChapters: [],
      isDownloading: false,
      isComplete: false,
      hasErrors: false,
      downloadingChapter: null
    })
  }

  const handleClose = () => {
    if (!progress.isDownloading && !progress.downloadingChapter) {
      resetProgress()
      onClose()
    }
  }

  if (!isOpen) return null

  // Custom scrollbar styles
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #424242;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #ff914d;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #e8823d;
    }
    /* Firefox scrollbar */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #ff914d #424242;
    }
  `

  // Show bulk download progress if downloading all
  if (progress.isDownloading || progress.isComplete || progress.hasErrors) {
    const overallProgress = progress.totalChapters > 0 
      ? ((progress.currentChapter - 1 + progress.chapterProgress / 100) / progress.totalChapters) * 100
      : 0

    return (
      <>
        <style>{scrollbarStyles}</style>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#2d2d2d] rounded-xl border-2 border-[#ff914d] w-full max-w-sm sm:max-w-md mx-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-[#ff914d]/30">
              <h2 className="text-lg sm:text-xl font-bold text-white">Bulk Download</h2>
              <button
                onClick={handleClose}
                disabled={progress.isDownloading}
                className="p-1 hover:bg-[#ff914d]/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {progress.isDownloading ? (
                // Downloading State
                <div className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#ff914d]/10 border-2 border-[#ff914d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#ff914d] animate-spin" />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-2 text-base sm:text-lg">Downloading...</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Chapter {progress.currentChapter} of {progress.totalChapters}
                  </p>

                  {/* Overall Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Overall Progress</span>
                      <span className="text-white font-medium">{Math.round(overallProgress)}%</span>
                    </div>
                    <div className="w-full bg-[#424242] rounded-full h-2.5">
                      <div 
                        className="bg-[#ff914d] h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Chapter Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Current Chapter</span>
                      <span className="text-white font-medium">{Math.round(progress.chapterProgress)}%</span>
                    </div>
                    <div className="w-full bg-[#424242] rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-150 ease-out"
                        style={{ width: `${progress.chapterProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-gray-300 text-xs">Please keep this tab open...</p>
                  </div>
                </div>
              ) : progress.isComplete ? (
                // Complete State
                <div className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500/10 border-2 border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-2 text-base sm:text-lg">Download Complete!</h3>
                  <p className="text-gray-300 text-sm mb-6">
                    Successfully downloaded {progress.completedChapters.length} of {progress.totalChapters} chapters
                  </p>

                  <button
                    onClick={handleClose}
                    className="w-full bg-[#424242] hover:bg-[#525252] text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                // Error State
                <div className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-2 text-base sm:text-lg">Download Failed</h3>
                  <p className="text-gray-300 text-sm mb-6">
                    There was an error downloading the manga. Please try again.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 bg-[#424242] hover:bg-[#525252] text-white py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        resetProgress()
                        handleBulkDownload()
                      }}
                      className="flex-1 bg-[#ff914d] hover:bg-[#e8823d] text-white py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main chapter selection view
  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-[#2d2d2d] rounded-xl border-2 border-[#ff914d] w-full max-w-lg sm:max-w-2xl mx-auto max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#ff914d]/30 flex-shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Download Chapters</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Choose chapters or download all
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-[#ff914d]/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Bulk Download Button */}
          <div className="p-2 sm:p-3 border-b border-[#ff914d]/30 flex-shrink-0">
            <button
              onClick={handleBulkDownload}
              className="w-full bg-[#ff914d] hover:bg-[#e8823d] text-white py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <DownloadCloud className="w-3 h-3 sm:w-4 sm:h-4" />
              Download All {totalChapters} Chapters (ZIP)
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-1">
              All chapters as PDFs in ZIP
            </p>
          </div>

          {/* Chapter List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
            <h3 className="text-sm font-bold text-white mb-3">Individual Chapters</h3>
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div key={chapter.hid} className="flex items-center gap-2 sm:gap-3 p-2 bg-[#1a1a1a] hover:bg-[#222] rounded-lg transition-colors group border border-[#ff914d]/10 hover:border-[#ff914d]/30">
                  {/* Chapter Icon */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ff914d]/10 border border-[#ff914d]/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#ff914d]/20 transition-colors">
                    <svg 
                      className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff914d]" 
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
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-300 flex-wrap">
                      <span className="bg-[#333] px-1.5 py-0.5 rounded text-xs">
                        CH {chapter.chap}
                      </span>
                      {chapter.vol && chapter.vol !== "0" && (
                        <span className="bg-[#333] px-1.5 py-0.5 rounded text-xs">
                          Vol {chapter.vol}
                        </span>
                      )}
                      <span className="hidden sm:inline">{getLanguageDisplayName(chapter.lang)}</span>
                      <span className="sm:hidden">{getLanguageDisplayName(chapter.lang).slice(0, 3)}</span>
                    </div>
                  </div>
                  
                  {/* Download Button */}
                  <button
                    onClick={() => downloadSingleChapter(chapter)}
                    disabled={progress.downloadingChapter === chapter.hid}
                    className="bg-[#ff914d] hover:bg-[#e8823d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium flex items-center gap-1 sm:gap-2 text-xs transition-colors min-w-[70px] sm:min-w-[80px]"
                  >
                    {progress.downloadingChapter === chapter.hid ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">{Math.round(progress.chapterProgress)}%</span>
                        <span className="sm:hidden">{Math.round(progress.chapterProgress)}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        PDF
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-2 sm:p-3 border-t border-[#ff914d]/30 flex-shrink-0">
            <div className="flex items-start gap-1 sm:gap-2">
              <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-white text-xs font-medium mb-0.5">Download Options:</p>
                <ul className="text-gray-400 text-[10px] space-y-0.5">
                  <li>• Individual: PDF files • Bulk: ZIP file • Keep tab open</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}