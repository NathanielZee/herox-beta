// ✅ 2. /api/animepahe/episodes/route.ts
import { NextRequest } from "next/server"

const API_BASE_URL = "https://herox-animepahe-api.vercel.app";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const page = searchParams.get("page") || 1;

    if (!session) {
      return Response.json({ error: "Missing session ID" }, { status: 400 });
    }

    const res = await fetch(`${API_BASE_URL}/api/${session}/releases?sort=episode_asc&page=${page}`);
    
    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }
    
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error("AnimePahe episodes error:", error);
    return Response.json({ error: "Failed to fetch episode list" }, { status: 500 });
  }
}