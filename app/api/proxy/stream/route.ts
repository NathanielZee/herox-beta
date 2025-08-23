import { NextRequest } from "next/server"

// 🎯 In-memory cache for segments
const segmentCache = new Map<string, {
  data: ArrayBuffer
  contentType: string
  timestamp: number
}>()

// 🔄 Pending requests deduplication
const pendingRequests = new Map<string, Promise<Response>>()

// 🕐 Cache duration (5 minutes for segments, 30 seconds for playlists)
const SEGMENT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const PLAYLIST_CACHE_DURATION = 30 * 1000 // 30 seconds

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new Response("Missing URL", { status: 400 })

  const ext = url.split(".").pop()?.split("?")[0] || ""

  // Serve direct files (.ts, .m4s, .key, .jpg, etc.)
  if (ext !== "m3u8") {
    return handleSegmentRequest(url, req)
  }

  // Playlist (.m3u8) – needs URL rewriting
  return handlePlaylistRequest(url, req)
}

// 🔐 Build headers to bypass anti-hotlinking protection
function buildBypassHeaders(req: NextRequest): HeadersInit {
  const range = req.headers.get("range")
  
  const headers: HeadersInit = {
    "Referer": "https://kwik.si",
    "Origin": "https://kwik.si",
    "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  }
  
  // Forward Range header for video streaming
  if (range) {
    headers["Range"] = range
  }
  
  return headers
}

async function handleSegmentRequest(url: string, req: NextRequest): Promise<Response> {
  const cacheKey = url
  const now = Date.now()

  // 🎯 Check cache first
  const cached = segmentCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < SEGMENT_CACHE_DURATION) {
    console.log("🎯 Cache HIT for:", url.split('/').pop())
    
    // Handle range requests from cache
    const range = req.headers.get("range")
    if (range) {
      return handleRangeRequest(cached.data, range, cached.contentType)
    }
    
    return new Response(cached.data, {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=300", // 5 minutes
        "Accept-Ranges": "bytes",
      },
    })
  }

  // 🔄 Check if request is already pending
  const existingRequest = pendingRequests.get(cacheKey)
  if (existingRequest) {
    console.log("🔄 Deduplicating request for:", url.split('/').pop())
    return existingRequest
  }

  // 🚀 Create new request with timeout
  const requestPromise = fetchSegmentWithTimeout(url, req)
  pendingRequests.set(cacheKey, requestPromise)

  try {
    const response = await requestPromise
    return response
  } finally {
    // Clean up pending request
    pendingRequests.delete(cacheKey)
  }
}

async function fetchSegmentWithTimeout(url: string, req: NextRequest): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    console.log("🔥 Fetching segment:", url.split('/').pop())
    
    const targetRes = await fetch(url, {
      headers: buildBypassHeaders(req),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!targetRes.ok) {
      console.error("❌ Segment fetch failed:", url.split('/').pop(), `HTTP ${targetRes.status}`)
      throw new Error(`HTTP ${targetRes.status}`)
    }

    // Get response as ArrayBuffer for caching
    const data = await targetRes.arrayBuffer()
    const contentType = getContentType(url)

    // 💾 Cache the segment
    segmentCache.set(url, {
      data,
      contentType,
      timestamp: Date.now()
    })

    console.log("✅ Cached segment:", url.split('/').pop(), `(${data.byteLength} bytes)`)

    // Handle range requests
    const range = req.headers.get("range")
    if (range) {
      return handleRangeRequest(data, range, contentType)
    }

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=300",
        "Accept-Ranges": "bytes",
      },
    })

  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.error("❌ Segment fetch failed:", url.split('/').pop(), error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response("Request timeout", { status: 504 })
    }
    
    return new Response("Segment fetch failed", { status: 500 })
  }
}

// 🎯 Handle HTTP Range requests for video streaming
function handleRangeRequest(data: ArrayBuffer, range: string, contentType: string): Response {
  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes",
      }
    });
  }

  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : data.byteLength - 1;
  const chunkSize = (end - start) + 1;
  const chunk = data.slice(start, end + 1);

  return new Response(chunk, {
    status: 206, // Partial Content
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${data.byteLength}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize.toString(),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    }
  });
}

async function handlePlaylistRequest(url: string, req: NextRequest): Promise<Response> {
  const cacheKey = `playlist_${url}`
  const now = Date.now()

  // 🎯 Check playlist cache (shorter duration)
  const cached = segmentCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < PLAYLIST_CACHE_DURATION) {
    console.log("🎯 Playlist cache HIT")
    return new Response(cached.data, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=30", // 30 seconds
      },
    })
  }

  try {
    // 🎯 STEP 1: Try to fetch master.m3u8 first
    let finalUrl = url
    let isMasterPlaylist = false
    
    if (url.includes('/uwu.m3u8')) {
      // Transform uwu.m3u8 -> master.m3u8
      const masterUrl = url.replace('/uwu.m3u8', '/master.m3u8')
      console.log("🎯 Attempting to fetch master playlist:", masterUrl.split('/').pop())
      
      try {
        const masterRes = await fetch(masterUrl, {
          headers: buildBypassHeaders(req),
        })
        
        if (masterRes.ok) {
          console.log("✅ Master playlist found! Using master.m3u8")
          finalUrl = masterUrl
          isMasterPlaylist = true
        } else {
          console.log("⚠️ Master playlist not found, falling back to uwu.m3u8")
        }
      } catch (masterError) {
        console.log("⚠️ Master playlist fetch failed, falling back to uwu.m3u8:", masterError)
      }
    }

    console.log("🔥 Fetching playlist:", finalUrl.split('/').pop())
    
    const targetRes = await fetch(finalUrl, {
      headers: buildBypassHeaders(req),
    })

    if (!targetRes.ok) {
      console.error("❌ Playlist fetch failed:", finalUrl.split('/').pop(), `HTTP ${targetRes.status}`)
      throw new Error(`HTTP ${targetRes.status}`)
    }

    const text = await targetRes.text()
    const base = new URL(finalUrl)
    const basePath = base.href.replace(/\/[^\/]+$/, "/")

    let rewritten: string

    if (isMasterPlaylist) {
      // 🎯 Handle master playlist - rewrite variant URLs
      rewritten = text.replace(/^(?!#)(.*)$/gm, (line) => {
        const trimmed = line.trim()
        
        if (trimmed.length === 0) return line
        
        let targetUrl: string
        if (trimmed.startsWith("http")) {
          targetUrl = trimmed
        } else {
          targetUrl = basePath + trimmed
        }
        
        return `/api/proxy/stream?url=${encodeURIComponent(targetUrl)}`
      })
      
      console.log("✅ Rewritten master playlist with", (text.match(/^(?!#)(.+)$/gm) || []).length, "variants")
    } else {
      // 🎯 Handle media playlist (uwu.m3u8) - rewrite segments BUT KEEP .jpg extensions
      rewritten = text
        // 🔐 Rewrite key URI
        .replace(/URI="(.*?)"/g, (_, keyPath) => {
          const abs = keyPath.startsWith("http") ? keyPath : basePath + keyPath
          return `URI="/api/proxy/stream?url=${encodeURIComponent(abs)}"`
        })
        
        // 🧱 STEP 2: Rewrite segment URLs but KEEP original extensions (.jpg)
        .replace(/^(?!#)(.*)$/gm, (line) => {
          const trimmed = line.trim()

          if (trimmed.length === 0) return line

          let targetUrl: string
          if (trimmed.startsWith("http")) {
            targetUrl = trimmed
          } else {
            targetUrl = basePath + trimmed
          }

          // 🎯 CRITICAL FIX: DON'T change .jpg to .ts - keep original extension!
          // The server actually serves video segments as .jpg files
          if (targetUrl.includes("segment-") && targetUrl.endsWith(".jpg")) {
            console.log("🎯 Keeping disguised segment as .jpg:", targetUrl.split('/').pop())
          }

          return `/api/proxy/stream?url=${encodeURIComponent(targetUrl)}`
        })
      
      console.log("✅ Rewritten media playlist keeping original .jpg extensions")
    }

    // 💾 Cache the playlist
    const encodedData = new TextEncoder().encode(rewritten)
    const data = new ArrayBuffer(encodedData.length)
    const view = new Uint8Array(data)
    view.set(encodedData)
    
    segmentCache.set(cacheKey, {
      data,
      contentType: "application/vnd.apple.mpegurl",
      timestamp: Date.now()
    })

    console.log("✅ Cached playlist")

    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=30",
      },
    })
  } catch (err) {
    console.error("❌ Playlist fetch failed:", err)
    return new Response("Playlist proxy failed", { status: 500 })
  }
}

// 📦 Content type helper - CRITICAL: Serve .jpg segments as video/mp2t
function getContentType(url: string) {
  if (url.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (url.endsWith(".ts")) return "video/mp2t"
  if (url.endsWith(".m4s")) return "video/iso.segment"
  if (url.endsWith(".key")) return "application/octet-stream"
  
  // 🔥 CRITICAL: Handle disguised video segments (they're actually .jpg but contain video data)
  if (url.endsWith(".jpg") && url.includes("segment-")) {
    console.log("🎯 Detected disguised video segment (.jpg containing video data):", url.split('/').pop())
    return "video/mp2t"  // Tell the video player this is actually a video segment
  }
  
  // Regular images
  if (url.endsWith(".jpg")) return "image/jpeg"
  if (url.endsWith(".png")) return "image/png"
  
  return "application/octet-stream"
}

// 🧹 Optional: Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of segmentCache.entries()) {
    const isExpired = key.startsWith('playlist_') 
      ? (now - value.timestamp) > PLAYLIST_CACHE_DURATION
      : (now - value.timestamp) > SEGMENT_CACHE_DURATION
    
    if (isExpired) {
      segmentCache.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`)
  }
}, 60000) // Clean every minute