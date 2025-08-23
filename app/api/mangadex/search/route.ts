import type { NextRequest } from "next/server"

const MANGADEX_API_BASE = "https://api.mangadex.org"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")

    if (!query) {
      return Response.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const response = await fetch(
      `${MANGADEX_API_BASE}/manga?title=${encodeURIComponent(query)}&limit=10&includes[]=cover_art&includes[]=author&includes[]=artist`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`MangaDex API error: ${response.status}`)
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Error fetching from MangaDex API:", error)
    return Response.json({ error: "Failed to search manga" }, { status: 500 })
  }
}
