const MEDIA_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      id
      type
      title { romaji english }
      coverImage { extraLarge large }
      bannerImage
      averageScore
      genres
      format
      status
      episodes
      duration
      chapters
      volumes
      season
      seasonYear
      description(asHtml:false)
      studios { nodes { name } }
      characters(sort: ROLE, perPage: 20) {
        edges {
          node { id name { full } image { large } }
          role
        }
      }
      recommendations(perPage: 10) {
        edges {
          node {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { extraLarge large }
              averageScore
              format
              episodes
              chapters
            }
          }
        }
      }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
    }
  }
`

// New query specifically for episodes only
const EPISODES_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      episodes
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
    }
  }
`

const SCHEDULE_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { extraLarge large }
        format
        nextAiringEpisode {
          episode
          airingAt
        }
      }
    }
  }
`

const API_URL = "https://graphql.anilist.co"

// Type definitions
export interface AnimeData {
  id: number
  type: string
  title: { romaji: string; english: string }
  coverImage: { extraLarge: string; large: string }
  bannerImage: string
  averageScore: number
  genres: string[]
  format: string
  status: string
  episodes: number
  duration: number
  chapters: number
  volumes: number
  season: string
  seasonYear: number
  description: string
  studios: { nodes: { name: string }[] }
  characters: {
    edges: {
      node: {
        id: number
        name: { full: string }
        image: { large: string }
      }
      role: string
    }[]
  }
  recommendations: {
    edges: {
      node: {
        mediaRecommendation: {
          id: number
          title: { romaji: string; english: string }
          coverImage: { extraLarge: string; large: string }
          averageScore: number
          format: string
          episodes: number
          chapters: number
        }
      }
    }[]
  }
  nextAiringEpisode?: {
    episode: number
    airingAt: number
  }
  streamingEpisodes?: {
    title: string
    thumbnail: string
    url: string
    site: string
  }[]
}

// Episode interface
export interface AniListEpisode {
  id: string
  episode: number
  title?: string
  snapshot?: string
  airingAt?: number
}

interface AniListResponse {
  data: { Media: AnimeData | null }
}

/* ---------------- Single media helper ------------------------- */
async function fetchSingleMedia(variables: Record<string, unknown>): Promise<AnimeData | null> {
  try {
    const res = await fetch("/api/anilist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: MEDIA_DETAIL_QUERY, variables }),
    })

    if (!res.ok) {
      console.error("Proxy error:", res.status)
      return null
    }

    const json: AniListResponse = await res.json()
    return json.data?.Media ?? null
  } catch (err) {
    console.error("Error fetching media details:", err)
    return null
  }
}

/* FIXED: Fetch episodes from AniList - PROPERLY EXPORTED */
export async function fetchAnimeEpisodes(id: number): Promise<AniListEpisode[]> {
  try {
    console.log(`🔍 Fetching episodes from AniList for anime ID: ${id}`)
    const res = await fetch("/api/anilist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: EPISODES_QUERY, 
        variables: { id } 
      }),
    })

    if (!res.ok) {
      console.error("AniList episodes fetch error:", res.status)
      return []
    }

    const json: AniListResponse = await res.json()
    const media = json.data?.Media

    if (!media) {
      console.log("No media data found for ID:", id)
      return []
    }

    console.log("Media data found:", {
      id: media.id,
      episodes: media.episodes,
      streamingEpisodesCount: media.streamingEpisodes?.length || 0
    })

    // If streamingEpisodes exist, use them, but ensure we generate all episodes if count is incomplete
    if (media.streamingEpisodes && media.streamingEpisodes.length > 0) {
      let episodeList = media.streamingEpisodes.map((ep, index) => ({
        id: String(index + 1),
        episode: index + 1,
        title: ep.title || `Episode ${index + 1}`,
        snapshot: ep.thumbnail || undefined,
      }))
      // If AniList reports more episodes than streamingEpisodes, fill in missing ones
      if (media.episodes && media.episodes > episodeList.length) {
        for (let i = episodeList.length; i < media.episodes; i++) {
          episodeList.push({
            id: String(i + 1),
            episode: i + 1,
            title: `Episode ${i + 1}`,
            snapshot: undefined
          })
        }
      }
      return episodeList
    }

    // Fallback: Generate episodes based on total episode count
    if (media.episodes && media.episodes > 0) {
      console.log(`✅ Generating ${media.episodes} episodes based on total count`)
      return Array.from({ length: media.episodes }, (_, index) => ({
        id: String(index + 1),
        episode: index + 1,
        title: `Episode ${index + 1}`,
      }))
    }

    console.log("❌ No episodes found in AniList data")
    return []
  } catch (error) {
    console.error("❌ Error fetching AniList episodes:", error)
    return []
  }
}

/* Exported detail fetcher */
export const fetchMediaDetails = (id: number) => fetchSingleMedia({ id })

/* Schedule fetcher */
export const fetchSchedule = async (page = 1, perPage = 50) => {
  try {
    const response = await fetch("/api/anilist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: SCHEDULE_QUERY,
        variables: { page, perPage },
      }),
    })

    if (!response.ok) {
      console.error("AniList proxy error:", response.status)
      return []
    }

    const json = (await response.json()) as { data?: { Page?: { media?: AnimeData[] } } }
    return json?.data?.Page?.media?.filter((anime) => anime.nextAiringEpisode) ?? []
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return []
  }
}

// Query definitions for different data types
const trendingAnimeQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const trendingMangaQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: MANGA, countryOfOrigin: "JP") {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      chapters
    }
  }
}
`

const topAiringQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME, status: RELEASING) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const newEpisodeReleasesQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: ID_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const mostFavoriteQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: FAVOURITES_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const topTVSeriesQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME, format: TV) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const topMovieQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME, format: MOVIE) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const mostPopularQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      episodes
    }
  }
}
`

const trendingManhwaQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: MANGA, countryOfOrigin: "KR") {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      chapters
    }
  }
}
`

const trendingManhuaQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: MANGA, countryOfOrigin: "CN") {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      genres
      format
      chapters
    }
  }
}
`

// Generic fetch function
const fetchData = async (query: string, page = 1, perPage = 50) => {
  try {
    const response = await fetch("/api/anilist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { page, perPage },
      }),
    })

    if (!response.ok) {
      console.error("AniList proxy error:", response.status)
      return []
    }

    const json = (await response.json()) as { data?: { Page?: { media?: unknown[] } } }
    return json?.data?.Page?.media ?? []
  } catch (error) {
    console.error("Error fetching data:", error)
    return []
  }
}

// Export all the fetcher functions
export const fetchTopAiring = (page?: number) => fetchData(topAiringQuery, page)
export const fetchNewEpisodeReleases = (page?: number) => fetchData(newEpisodeReleasesQuery, page)
export const fetchMostFavorite = (page?: number) => fetchData(mostFavoriteQuery, page)
export const fetchTopTVSeries = (page?: number) => fetchData(topTVSeriesQuery, page)
export const fetchTopMovie = (page?: number) => fetchData(topMovieQuery, page)
export const fetchMostPopular = (page?: number) => fetchData(mostPopularQuery, page)
export const fetchTrendingAnime = (page?: number) => fetchData(trendingAnimeQuery, page)
export const fetchTrendingManga = (page?: number) => fetchData(trendingMangaQuery, page)
export const fetchTrendingManhwa = (page?: number) => fetchData(trendingManhwaQuery, page)
export const fetchTrendingManhua = (page?: number) => fetchData(trendingManhuaQuery, page)

export const fetchMangaDetails = (id: number) => fetchSingleMedia({ id })