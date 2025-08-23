"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowLeft, SearchIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

interface SearchResult {
  id: number
  title: {
    romaji: string
    english: string
  }
  coverImage: {
    large: string
    medium: string
  }
  averageScore: number
  format: string
  type: string
  episodes?: number
  chapters?: number
  seasonYear?: number
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "anime" | "manga">("all")

  const searchMedia = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/anilist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query ($search: String) {
              Page(page: 1, perPage: 50) {
                media(search: $search, sort: POPULARITY_DESC) {
                  id
                  type
                  title {
                    romaji
                    english
                  }
                  coverImage {
                    large
                    medium
                  }
                  averageScore
                  format
                  episodes
                  chapters
                  seasonYear
                }
              }
            }
          `,
          variables: { search: searchQuery },
        }),
      })

      const data = await response.json()
      setResults(data.data?.Page?.media || [])
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialQuery) {
      searchMedia(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchMedia(query)
  }

  const filteredResults = results.filter((item) => {
    if (activeTab === "all") return true
    if (activeTab === "anime") return item.type === "ANIME"
    if (activeTab === "manga") return item.type === "MANGA"
    return true
  })

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime or manga..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-[#ff914d]"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 mb-4">
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "anime", label: "Anime" },
            { key: "manga", label: "Manga" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "all" | "anime" | "manga")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[#ff914d] text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-16 h-20 bg-gray-800 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-800 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="space-y-4">
            {filteredResults.map((item) => (
              <Link
                key={item.id}
                href={item.type === "ANIME" ? `/anime/${item.id}` : `/manga/${item.id}`}
                className="flex gap-3 hover:bg-gray-900 rounded-lg p-2 transition-colors"
              >
                <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={item.coverImage.large || "/placeholder.svg"}
                    alt={item.title.english || item.title.romaji}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-[#ff914d] text-white text-xs px-1.5 py-0.5 rounded">
                    {item.averageScore ? (item.averageScore / 10).toFixed(1) : "N/A"}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-sm font-bold mb-1 line-clamp-2">
                    {item.title.english || item.title.romaji}
                  </h3>
                  <p className="text-gray-400 text-xs mb-1">
                    {item.format} • {item.seasonYear || "Unknown Year"}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {item.type === "ANIME"
                      ? item.episodes
                        ? `${item.episodes} episodes`
                        : "Ongoing"
                      : item.chapters
                        ? `${item.chapters} chapters`
                        : "Ongoing"}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        item.type === "ANIME" ? "bg-blue-900/30 text-blue-400" : "bg-green-900/30 text-green-400"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No results found for "{query}"</p>
            <p className="text-gray-500 text-sm mt-2">Try searching with different keywords</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Search for anime or manga</p>
            <p className="text-gray-500 text-sm mt-2">Enter a title to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
