import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const chapterId = searchParams.get("chapterId")

  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 })
  }

  try {
    const res = await fetch(`https://comick-api-proxy.notaspider.dev/api/chapter/${chapterId}/get_images`)
    const data = await res.json()

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "No images returned" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
