// ✅ 1. /api/animepahe/search/route.ts
import { NextRequest } from "next/server"

const API_BASE_URL = "https://herox-animepahe-api.vercel.app";

export async function GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("q");
  
      if (!query) {
        return Response.json({ error: "Missing search query" }, { status: 400 });
      }
  
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      
      if (!res.ok) {
        throw new Error(`API responded with status: ${res.status}`);
      }
      
      const data = await res.json();
      return Response.json(data);
    } catch (error) {
      console.error("AnimePahe search error:", error);
      return Response.json({ error: "Failed to search AnimePahe" }, { status: 500 });
    }
}