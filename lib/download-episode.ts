// lib/download-episode.ts
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

let ffmpeg: FFmpeg | null = null
let isFFmpegLoading = false

// Initialize FFmpeg with proper configuration for Next.js
async function initFFmpeg() {
  if (ffmpeg) return ffmpeg
  if (isFFmpegLoading) {
    // Wait for existing initialization to complete
    while (isFFmpegLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return ffmpeg
  }

  isFFmpegLoading = true
  
  try {
    ffmpeg = new FFmpeg()
    
    // Try multiple CDN sources for better reliability
    const cdnSources = [
      {
        name: 'unpkg',
        baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      },
      {
        name: 'jsdelivr',
        baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
      }
    ]

    let lastError: Error | null = null
    
    for (const source of cdnSources) {
      try {
        console.log(`🔧 Trying to load FFmpeg from ${source.name}...`)
        
        await ffmpeg.load({
          coreURL: await toBlobURL(`${source.baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${source.baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${source.baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
        })

        console.log(`✅ FFmpeg loaded successfully from ${source.name}`)
        break
        
      } catch (error) {
        console.warn(`⚠️ Failed to load from ${source.name}:`, error)
        lastError = error as Error
        continue
      }
    }
    
    if (lastError && !ffmpeg.loaded) {
      throw lastError
    }

    if (!ffmpeg.loaded) {
      throw new Error("FFmpeg failed to load properly")
    }

    console.log("✅ FFmpeg initialization completed successfully")
    return ffmpeg
  } catch (error) {
    console.error("❌ Failed to load FFmpeg:", error)
    ffmpeg = null
    isFFmpegLoading = false
    throw new Error(`FFmpeg initialization failed: ${error}`)
  } finally {
    if (ffmpeg?.loaded) {
      isFFmpegLoading = false
    }
  }
}

// AES-128 decryption using Web Crypto API
async function decryptAES128(encryptedData: ArrayBuffer, key: ArrayBuffer, iv: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    )

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: iv
      },
      cryptoKey,
      encryptedData
    )

    return decryptedData
  } catch (error) {
    console.error('❌ AES decryption failed:', error)
    throw new Error(`AES decryption failed: ${error}`)
  }
}

// Download and decrypt a segment
async function downloadAndDecryptSegment(
  segmentUrl: string, 
  keyData: ArrayBuffer, 
  segmentIndex: number,
  maxRetries = 3
): Promise<{data: ArrayBuffer | null, info: string}> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Only log every 10th segment to reduce spam
      if (segmentIndex % 10 === 0) {
        console.log(`🔐 Downloading encrypted segment ${segmentIndex + 1} (attempt ${attempt}/${maxRetries})`)
      }
      
      // Download the encrypted segment
      const response = await fetch(segmentUrl, {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': window.location.origin
        },
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const encryptedData = await response.arrayBuffer()
      
      if (encryptedData.byteLength === 0) {
        throw new Error("Empty encrypted segment")
      }

      // Only log size for every 10th segment
      if (segmentIndex % 10 === 0) {
        console.log(`📦 Downloaded encrypted segment ${segmentIndex + 1}: ${encryptedData.byteLength} bytes`)
      }
      
      // For HLS AES-128, the IV is typically the segment sequence number as a 16-byte big-endian integer
      // Starting from sequence number 1 (as seen in #EXT-X-MEDIA-SEQUENCE:1)
      const iv = new ArrayBuffer(16)
      const ivView = new DataView(iv)
      ivView.setUint32(12, segmentIndex + 1, false) // Big-endian, sequence starts at 1
      
      // Decrypt the segment
      const decryptedData = await decryptAES128(encryptedData, keyData, iv)
      
      // Verify decrypted data starts with TS sync byte
      const decryptedArray = new Uint8Array(decryptedData)
      if (decryptedArray[0] === 0x47) {
        return { data: decryptedData, info: `Decrypted TS segment (${decryptedData.byteLength} bytes)` }
      } else {
        // Try alternative IV calculation (some servers use different methods)
        if (segmentIndex % 10 === 0) {
          console.log(`⚠️ Invalid TS header after decryption. Trying alternative IV...`)
        }
        
        // Alternative: IV = segment index (0-based)
        const altIv = new ArrayBuffer(16)
        const altIvView = new DataView(altIv)
        altIvView.setUint32(12, segmentIndex, false) // 0-based index
        
        const altDecryptedData = await decryptAES128(encryptedData, keyData, altIv)
        const altDecryptedArray = new Uint8Array(altDecryptedData)
        
        if (altDecryptedArray[0] === 0x47) {
          return { data: altDecryptedData, info: `Decrypted TS segment with alt IV (${altDecryptedData.byteLength} bytes)` }
        }
        
        // If still fails, show hex dump for debugging (only for first few failures)
        if (segmentIndex < 5) {
          const hexDump = Array.from(decryptedArray.slice(0, 16))
            .map(b => b.toString(16).padStart(2, '0')).join(' ')
          console.warn(`❌ Decryption may have failed for segment ${segmentIndex + 1}. First 16 bytes: ${hexDump}`)
        }
        
        return { data: decryptedData, info: `Decrypted but invalid header (first byte: 0x${decryptedArray[0].toString(16)})` }
      }
      
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt} failed for segment ${segmentIndex + 1}:`, error)
      
      if (attempt === maxRetries) {
        return { data: null, info: `Failed after ${maxRetries} attempts: ${error}` }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    }
  }
  
  return { data: null, info: 'Maximum retries exceeded' }
}

export async function downloadEpisodeAsMp4(streamUrl: string, filename: string) {
  let segmentFiles: string[] = []
  let encryptionKey: ArrayBuffer | null = null
  
  try {
    console.log(`🎬 Starting AES-128 encrypted download for: ${filename}`)
    console.log(`📡 Stream URL: ${streamUrl}`)

    // Initialize FFmpeg
    console.log("🔧 Initializing FFmpeg...")
    const ffmpegInstance = await initFFmpeg()
    if (!ffmpegInstance) {
      throw new Error("Failed to initialize FFmpeg")
    }
    console.log("✅ FFmpeg initialized successfully")
    
    // Step 1: Fetch the M3U8 playlist
    console.log("📋 Fetching M3U8 playlist...")
    const m3u8Response = await fetch(streamUrl)
    if (!m3u8Response.ok) {
      throw new Error(`Failed to fetch M3U8: ${m3u8Response.status} ${m3u8Response.statusText}`)
    }
    
    let m3u8Data = await m3u8Response.text()
    console.log("✅ M3U8 playlist fetched successfully")

    // Check if this is a master playlist and get the media playlist
    const isMainPlaylist = m3u8Data.includes('#EXT-X-STREAM-INF')
    
    if (isMainPlaylist) {
      console.log("🎯 Detected master playlist, fetching media playlist...")
      
      const mediaPlaylistLines = m3u8Data
        .split('\n')
        .filter(line => {
          const trimmed = line.trim()
          return trimmed && !trimmed.startsWith('#') && trimmed.includes('.m3u8')
        })
      
      if (mediaPlaylistLines.length === 0) {
        throw new Error("No media playlist found in master playlist")
      }
      
      const mediaPlaylistUrl = mediaPlaylistLines[0].trim()
      console.log("📋 Fetching media playlist:", mediaPlaylistUrl)
      
      const mediaResponse = await fetch(mediaPlaylistUrl.startsWith('http') ? mediaPlaylistUrl : `${window.location.origin}${mediaPlaylistUrl}`)
      if (!mediaResponse.ok) {
        throw new Error(`Failed to fetch media playlist: ${mediaResponse.status} ${mediaResponse.statusText}`)
      }
      
      m3u8Data = await mediaResponse.text()
      console.log("✅ Media playlist fetched successfully")
    }

    console.log("📋 Playlist content preview:")
    console.log(m3u8Data.split('\n').slice(0, 15).join('\n'))

    // Step 2: Check for encryption and get the key
    const keyMatch = m3u8Data.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/)
    
    if (!keyMatch) {
      throw new Error("No AES-128 encryption key found in playlist. This downloader specifically handles encrypted streams.")
    }
    
    const keyUrl = keyMatch[1]
    console.log(`🔑 Found AES-128 encryption key URL: ${keyUrl}`)
    
    // Download the encryption key
    console.log("🔑 Downloading encryption key...")
    const keyResponse = await fetch(keyUrl)
    if (!keyResponse.ok) {
      throw new Error(`Failed to download encryption key: ${keyResponse.status} ${keyResponse.statusText}`)
    }
    
    encryptionKey = await keyResponse.arrayBuffer()
    console.log(`✅ Encryption key downloaded: ${encryptionKey.byteLength} bytes`)
    
    // Show key for debugging (first 8 bytes only for security)
    const keyPreview = Array.from(new Uint8Array(encryptionKey).slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0')).join(' ')
    console.log(`🔍 Key preview (first 8 bytes): ${keyPreview}...`)

    // Step 3: Parse segment URLs
    const segmentUrls = m3u8Data
      .split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed && 
               !trimmed.startsWith('#') && 
               !trimmed.includes('.key') &&
               (trimmed.includes('.jpg') || trimmed.includes('.ts') || 
                trimmed.includes('.m4s') || trimmed.startsWith('/api/proxy/stream'))
      })

    console.log(`🧩 Found ${segmentUrls.length} encrypted video segments`)

    if (segmentUrls.length === 0) {
      throw new Error("No video segments found in M3U8 playlist")
    }

    // Step 4: Download and decrypt ALL segments
    console.log("🔐 Downloading and decrypting video segments...")
    let successCount = 0
    let failedCount = 0
    
    console.log(`📥 Processing all ${segmentUrls.length} segments for complete episode...`)

    for (let i = 0; i < segmentUrls.length; i++) {
      const segmentUrl = segmentUrls[i].trim()
      
      let fullSegmentUrl = segmentUrl
      if (!segmentUrl.startsWith('http')) {
        fullSegmentUrl = segmentUrl.startsWith('/') ? 
          `${window.location.origin}${segmentUrl}` : 
          `${window.location.origin}/${segmentUrl}`
      }

      const result = await downloadAndDecryptSegment(fullSegmentUrl, encryptionKey, i)
      
      if (result.data && result.data.byteLength > 0) {
        const segmentFilename = `seg${i.toString().padStart(4, '0')}.ts`
        
        try {
          await ffmpegInstance.writeFile(segmentFilename, new Uint8Array(result.data))
          segmentFiles.push(segmentFilename)
          successCount++
          
          // Show progress every 10 segments
          if ((i + 1) % 10 === 0 || i === segmentUrls.length - 1) {
            console.log(`📊 Progress: ${i + 1}/${segmentUrls.length} segments processed (${successCount} successful, ${failedCount} failed)`)
          }
        } catch (fsError) {
          console.error(`❌ Failed to write decrypted segment ${i + 1} to FFmpeg FS:`, fsError)
          failedCount++
        }
      } else {
        console.error(`❌ Failed to decrypt segment ${i + 1}: ${result.info}`)
        failedCount++
      }

      // Small delay between downloads to avoid overwhelming the server
      if (i % 5 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`📊 Final Decryption Results: ${successCount}/${segmentUrls.length} segments successful, ${failedCount} failed`)

    if (successCount === 0) {
      throw new Error("Failed to decrypt any video segments. The encryption key or IV calculation may be incorrect.")
    }

    if (successCount < segmentUrls.length * 0.8) {
      console.warn(`⚠️ Warning: Only ${successCount}/${segmentUrls.length} segments downloaded successfully. Episode may be incomplete.`)
    }

    // Step 5: Create input file for FFmpeg
    console.log("📝 Creating segment list for FFmpeg...")
    const fileListContent = segmentFiles.map(file => `file '${file}'`).join('\n')
    await ffmpegInstance.writeFile('input.txt', fileListContent)
    
    // Step 6: Convert to MP4
    console.log("🔄 Converting decrypted segments to MP4...")
    const outputFilename = 'output.mp4'
    
    try {
      await ffmpegInstance.exec([
        '-f', 'concat',
        '-safe', '0', 
        '-i', 'input.txt',
        '-c', 'copy',
        '-bsf:a', 'aac_adtstoasc',
        '-movflags', '+faststart',
        outputFilename
      ])
      
      console.log("✅ Conversion completed successfully")
      
    } catch (conversionError) {
      console.warn("⚠️ Stream copy failed, trying re-encode...")
      
      // Fallback: re-encode
      await ffmpegInstance.exec([
        '-f', 'concat',
        '-safe', '0', 
        '-i', 'input.txt',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23',
        outputFilename
      ])
      
      console.log("✅ Re-encode conversion completed")
    }

    // Step 7: Read and download the output file
    console.log("📁 Reading output file...")
    
    const outputData = await ffmpegInstance.readFile(outputFilename) as Uint8Array
    
    if (outputData.length === 0) {
      throw new Error("Generated MP4 file is empty")
    }

    console.log(`📁 Generated MP4 file: ${outputData.length} bytes`)

    // Create and trigger download
    const blob = new Blob([outputData], { type: 'video/mp4' })
    const downloadUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${filename.replace(/[<>:"/\\|?*]/g, '_')}.mp4`
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up blob URL
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl)
    }, 1000)

    console.log(`🎉 Complete episode download successful: ${filename}.mp4`)
    console.log(`📊 Final stats: ${successCount}/${segmentUrls.length} segments decrypted and processed`)
    console.log(`⏱️ Expected duration: ~${Math.round(segmentUrls.length * 6 / 60)} minutes`)

  } catch (error) {
    console.error("❌ Encrypted download failed:", error)
    throw error
  } finally {
    // Clean up FFmpeg virtual filesystem
    if (ffmpeg && segmentFiles.length > 0) {
      console.log("🧹 Cleaning up temporary files...")
      try {
        // Clean up segment files
        for (const file of segmentFiles) {
          try {
            await ffmpeg.deleteFile(file)
          } catch (e) {
            // Ignore cleanup errors for individual files
          }
        }
        
        // Clean up other files
        const filesToClean = ['input.txt', 'output.mp4']
        for (const file of filesToClean) {
          try {
            await ffmpeg.deleteFile(file)
          } catch (e) {}
        }
        
        console.log("✅ Cleanup completed")
      } catch (cleanupError) {
        console.warn("⚠️ Cleanup warning:", cleanupError)
      }
    }
  }
}