import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const res = await fetch(`https://comick-api-proxy.notaspider.dev/api/v1.0/search?q=${encodeURIComponent(query)}`)
  const data = await res.json()

  return NextResponse.json(data)
}
