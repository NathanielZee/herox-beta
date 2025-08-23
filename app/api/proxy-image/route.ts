// app/api/proxy-image/route.ts

import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")

  if (!url) {
    return new Response("Missing URL", { status: 400 })
  }

  try {
    const imageResponse = await fetch(url, { cache: "no-store" })

    if (!imageResponse.ok || !imageResponse.body) {
      const fallbackRes = await fetch(`${req.nextUrl.origin}/fallback.jpg`)
      return new Response(fallbackRes.body, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      })
    }

    return new Response(imageResponse.body, {
      headers: {
        "Content-Type": imageResponse.headers.get("Content-Type") || "image/jpeg"
      }
    })
  } catch (error) {
    console.error("Proxy image error:", error)
    const fallbackRes = await fetch(`${req.nextUrl.origin}/fallback.jpg`)
    return new Response(fallbackRes.body, {
      headers: {
        "Content-Type": "image/jpeg"
      }
    })
  }
}

