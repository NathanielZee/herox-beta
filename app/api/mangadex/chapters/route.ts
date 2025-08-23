import type { NextRequest } from "next/server"

const MANGADEX_API_BASE = "https://api.mangadex.org"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mangaId = searchParams.get("mangaId")

    if (!mangaId) {
      return Response.json({ error: "mangaId parameter is required" }, { status: 400 })
    }

    const apiUrl = `${MANGADEX_API_BASE}/manga/${mangaId}/feed?limit=100&order[chapter]=asc&translatedLanguage[]=en`
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    })

    // MangaDex occasionally returns a Cloudflare or error HTML page.
    // Attempt json(); if it fails, read text and return a descriptive error.
    let data: unknown
    try {
      data = await response.json()
    } catch {
      const text = await response.text()
      console.error("Non-JSON from MangaDex:", text.slice(0, 200))
      return Response.json(
        { error: "MangaDex returned non-JSON response", details: text.slice(0, 200) },
        { status: 502 },
      )
    }

    if (!response.ok) {
      return Response.json({ error: "MangaDex API error", details: data }, { status: response.status })
    }

    return Response.json(data)
  } catch (error) {
    console.error("Error fetching chapters from MangaDex API:", error)
    return Response.json({ error: "Failed to fetch chapters" }, { status: 500 })
  }
}
