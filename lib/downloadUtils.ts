// lib/downloadUtils.ts
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'

export interface ComickImageData {
  b2key: string
  optimized?: boolean
  w?: number
  h?: number
}

export interface ComickChapter {
  id: number
  chap: string
  title: string
  vol: string
  lang: string
  hid: string
}

// Function to fetch chapter images - matches your read page implementation
export async function fetchChapterImages(chapterId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/comick/images?chapterId=${chapterId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch images for chapter ${chapterId}`)
    }
    
    const imageData = await response.json() as ComickImageData[]
    
    if (!Array.isArray(imageData) || imageData.length === 0) {
      console.warn(`No images found for chapter ${chapterId}`)
      return []
    }
    
    // Convert to image URLs exactly like your read page does
    const imageUrls = imageData.map((img: ComickImageData) => `https://meo.comick.pictures/${img.b2key}`)
    
    return imageUrls
  } catch (error) {
    console.error(`Error fetching images for chapter ${chapterId}:`, error)
    return []
  }
}

// Function to load image and get dimensions
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Function to create PDF from images - FIXED RETURN TYPE
export async function createPDFFromImages(
  imageUrls: string[], 
  chapterNumber: string,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  let isFirstPage = true

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      onProgress?.(((i + 1) / imageUrls.length) * 100)
      
      const img = await loadImage(imageUrls[i])
      
      if (!isFirstPage) {
        pdf.addPage()
      }
      isFirstPage = false

      // Calculate dimensions to fit A4 page
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const availableWidth = pageWidth - (margin * 2)
      const availableHeight = pageHeight - (margin * 2)

      const imgRatio = img.width / img.height
      const pageRatio = availableWidth / availableHeight

      let finalWidth, finalHeight

      if (imgRatio > pageRatio) {
        // Image is wider relative to page
        finalWidth = availableWidth
        finalHeight = availableWidth / imgRatio
      } else {
        // Image is taller relative to page
        finalHeight = availableHeight
        finalWidth = availableHeight * imgRatio
      }

      const x = (pageWidth - finalWidth) / 2
      const y = (pageHeight - finalHeight) / 2

      pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight)
    } catch (error) {
      console.error(`Failed to add image ${i + 1} to PDF:`, error)
      // Continue with next image instead of failing completely
    }
  }

  return pdf.output('arraybuffer') as ArrayBuffer
}

// Function to download single chapter as PDF - REMOVED EXPORT MODIFIER ERROR
async function downloadSingleChapterPDF(
  chapter: ComickChapter,
  mangaTitle: string,
  onProgress?: (progress: number) => void
): Promise<void> {
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
      onProgress
    )

    // Download PDF - FIXED BLOB CREATION
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
    throw error
  }
}

// Export the single chapter download function
export { downloadSingleChapterPDF }

// Function to download all chapters as ZIP
export async function downloadMangaChapters(
  chapters: ComickChapter[],
  mangaTitle: string,
  onProgress?: (chapterIndex: number, chapterProgress: number, totalChapters: number) => void,
  onChapterComplete?: (chapterNumber: string) => void
): Promise<void> {
  const zip = new JSZip()
  const mangaFolder = zip.folder(mangaTitle.replace(/[/\\?%*:|"<>]/g, '-')) // Clean folder name

  if (!mangaFolder) {
    throw new Error('Failed to create manga folder')
  }

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    
    try {
      // Update progress
      onProgress?.(i, 0, chapters.length)
      
      // Fetch chapter images - now returns URLs directly
      const imageUrls = await fetchChapterImages(chapter.hid)
      
      if (imageUrls.length === 0) {
        console.warn(`No images found for chapter ${chapter.chap}`)
        continue
      }

      // Create PDF from images - FIXED TO USE ArrayBuffer
      const pdfData = await createPDFFromImages(
        imageUrls, 
        chapter.chap,
        (chapterProgress) => onProgress?.(i, chapterProgress, chapters.length)
      )

      // Add PDF to zip - FIXED TO USE ArrayBuffer DIRECTLY
      const fileName = `Chapter ${chapter.chap}${chapter.title ? ` - ${chapter.title}` : ''}.pdf`
        .replace(/[/\\?%*:|"<>]/g, '-') // Clean filename
      
      mangaFolder.file(fileName, pdfData)
      onChapterComplete?.(chapter.chap)
      
    } catch (error) {
      console.error(`Failed to process chapter ${chapter.chap}:`, error)
      // Continue with next chapter
    }
  }

  // Generate and download ZIP
  const zipData = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipData)
  const a = document.createElement('a')
  a.href = url
  a.download = `${mangaTitle.replace(/[/\\?%*:|"<>]/g, '-')}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}