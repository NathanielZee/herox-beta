import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const hid = searchParams.get("hid")
  const limit = searchParams.get("limit") || "60"
  const page = searchParams.get("page") || "1"
  const chapOrder = searchParams.get("chap-order") || "0"
  const dateOrder = searchParams.get("date-order") || ""
  const lang = searchParams.get("lang") || ""
  const chap = searchParams.get("chap") || ""

  if (!hid) {
    return NextResponse.json({ error: "Missing hid" }, { status: 400 })
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      limit,
      page,
      "chap-order": chapOrder,
    })

    // Add optional parameters if provided
    if (dateOrder) params.append("date-order", dateOrder)
    if (lang) params.append("lang", lang)
    if (chap) params.append("chap", chap)

    const url = `https://comick-api-proxy.notaspider.dev/api/comic/${hid}/chapters?${params.toString()}`
    console.log("Fetching from:", url)

    const res = await fetch(url)
    const data = await res.json()

    // Handle internal API errors returned as JSON
    if (data?.statusCode === 500) {
      return NextResponse.json({ error: "Chapters not found on Comick." }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}