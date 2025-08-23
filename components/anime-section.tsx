"use client"

import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"

interface AnimeData {
  id: number
  title: {
    romaji: string
    english: string
  }
  coverImage: {
    extraLarge: string
    large: string
  }
  averageScore: number
  genres: string[]
  format: string
  status: string
  episodes: number
  season: string
  seasonYear: number
  chapters?: number
  volumes?: number
}

interface AnimeSectionProps {
  title: string
  animeList: AnimeData[]
  loading: boolean
  showRanking?: boolean
  sectionSlug: string
  isMangas?: boolean
}

export function AnimeSection({
  title,
  animeList,
  loading,
  showRanking = false,
  sectionSlug,
  isMangas = false,
}: AnimeSectionProps) {
  return (
    <div className="mb-6 pl-0 ml-3">
      <div className="flex justify-between items-center mb-3 pr-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link
          href={`/section/${sectionSlug}`}
          className="text-[#ff914d] text-sm font-medium hover:text-[#e8823d] transition-colors"
        >
          See all
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-4 w-max pr-6">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="relative w-[110px] h-[160px] overflow-hidden bg-gray-800 animate-pulse flex-shrink-0 rounded"
                >
                  <div className="absolute top-2 left-2 w-6 h-4 bg-gray-700 rounded"></div>
                  {showRanking && (
                    <div className="absolute top-2 right-2 text-lg font-bold text-white/90">{index + 1}</div>
                  )}
                </div>
              ))
            : animeList.map((anime, index) => (
                <Link href={isMangas ? `/manga/${anime.id}` : `/anime/${anime.id}`} key={anime.id}>
                  <div className="relative w-[110px] h-[160px] overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform rounded">
                    <Image
                      src={anime.coverImage.extraLarge || anime.coverImage.large || "/placeholder.svg"}
                      alt={anime.title.english || anime.title.romaji}
                      fill
                      className="object-cover rounded"
                      quality={95}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded" />
                    <Badge className="absolute top-1.5 left-1.5 bg-[#ff914d] text-white text-xs px-1.5 py-0.5">
                      {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A"}
                    </Badge>
                    {showRanking && (
                      <div className="absolute top-1.5 right-1.5 text-lg font-bold text-white/90 bg-black/50 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <p className="text-white text-xs font-medium truncate">
                        {anime.title.english || anime.title.romaji}
                      </p>
                      <p className="text-gray-300 text-xs truncate">
                        {anime.format} • {" "}
                        {isMangas
                          ? anime.chapters
                            ? `${anime.chapters} ch`
                            : "Ongoing"
                          : anime.episodes
                            ? `${anime.episodes} eps`
                            : "Ongoing"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  )
}