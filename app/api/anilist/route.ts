import type { NextRequest } from "next/server"

const ANILIST_URL = "https://graphql.anilist.co"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query: string; variables?: unknown }

    const anilistRes = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      // Optional: cache the response for one hour
      next: { revalidate: 3600 },
    })

    if (!anilistRes.ok) {
      const text = await anilistRes.text()
      return new Response(text || "AniList error", { status: anilistRes.status })
    }

    const data = await anilistRes.json()
    return Response.json(data)
  } catch (err) {
    console.error("AniList proxy error:", err)
    return new Response("Internal error", { status: 500 })
  }
}
