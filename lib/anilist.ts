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

interface AnimeData {
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
}

interface AniListResponse {
  data: { Media: AnimeData | null }
}

const fetchSingleAnime = async (query: string, variables: {}) => {
  const response = await fetch("/api/anilist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })
  const { data } = await response.json()
  return data?.Media
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

    // Safely drill-down; fall back to empty array if any level is null/undefined
    return json?.data?.Page?.media ?? []
  } catch (error) {
    console.error("Error fetching data:", error)
    return []
  }
}

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

export type { AnimeData }