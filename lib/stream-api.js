// lib/stream-api.js - Enhanced with all Animepahe features
export class StreamAPI {
    static BASE_URL = '/api/animepahe';

    // 🔍 SEARCH ANIME
    static async searchAnime(query, page = 1) {
        try {
            console.log(`🔍 [STREAM-API] Searching for: "${query}" (page ${page})`);
            
            const response = await fetch(`${this.BASE_URL}/search?q=${encodeURIComponent(query)}&page=${page}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Search failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Found ${data.data?.length || 0} search results`);
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Search error:', error);
            throw error;
        }
    }

    // 📺 GET AIRING ANIME
    static async getAiringAnime(page = 1) {
        try {
            console.log(`📺 [STREAM-API] Getting airing anime (page ${page})`);
            
            const response = await fetch(`${this.BASE_URL}/airing?page=${page}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Airing anime failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Got ${data.data?.length || 0} airing anime`);
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Airing anime error:', error);
            throw error;
        }
    }

    // 📖 GET ANIME INFO
    static async getAnimeInfo(animeId) {
        try {
            console.log(`📖 [STREAM-API] Getting info for anime: ${animeId}`);
            
            const response = await fetch(`${this.BASE_URL}/${animeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Anime info failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Got anime info for: ${data.title || animeId}`);
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Anime info error:', error);
            throw error;
        }
    }

    // 📋 GET ANIME EPISODES
    static async getAnimeEpisodes(animeId, sort = 'episode_desc', page = 1) {
        try {
            console.log(`📋 [STREAM-API] Getting episodes for: ${animeId}`);
            
            const response = await fetch(`${this.BASE_URL}/${animeId}/releases?sort=${sort}&page=${page}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Episodes failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Got ${data.data?.length || 0} episodes`);
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Episodes error:', error);
            throw error;
        }
    }

    // 🔎 BROWSE ANIME CATALOG
    static async browseAnime(options = {}) {
        try {
            const { tab, tag1, tag2, page = 1 } = options;
            console.log(`🔎 [STREAM-API] Browsing anime:`, { tab, tag1, tag2, page });
            
            let url = `${this.BASE_URL}/anime`;
            const params = new URLSearchParams();
            
            // Handle different browse endpoints based on your routes
            if (tag1 && tag2) {
                url = `${this.BASE_URL}/anime/${tag1}/${tag2}`;
            }
            
            if (tab) params.append('tab', tab);
            if (page) params.append('page', page);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Browse failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Got ${data.data?.length || data.length || 0} browse results`);
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Browse error:', error);
            throw error;
        }
    }

    // 📊 GET ENCODING QUEUE STATUS
    static async getQueueStatus() {
        try {
            console.log(`📊 [STREAM-API] Getting queue status`);
            
            const response = await fetch(`${this.BASE_URL}/queue`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Queue status failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Got ${data.data?.length || 0} queue items`);
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Queue status error:', error);
            throw error;
        }
    }

    // 🎥 GET STREAMING LINKS (Your existing functionality enhanced)
    static async getStreamingLinks(animeId, episodeId) {
        try {
            console.log(`🎯 [STREAM-API] Requesting streams for ${animeId}/${episodeId}`);
            
            // Use the Animepahe play endpoint
            const response = await fetch(`${this.BASE_URL}/play/${animeId}?episodeId=${episodeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Stream API failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log(`✅ [STREAM-API] Received ${data.sources?.length || 0} stream sources`);
            
            // Log available qualities for debugging
            if (data.sources && data.sources.length > 0) {
                const subSources = data.sources.filter(s => !s.isDub);
                const dubSources = data.sources.filter(s => s.isDub);
                console.log(`📊 [STREAM-API] Sub: ${subSources.length} sources, Dub: ${dubSources.length} sources`);
                
                // Log available resolutions
                const resolutions = [...new Set(data.sources.map(s => s.resolution))];
                console.log(`📺 [STREAM-API] Available qualities: ${resolutions.join(', ')}`);
            }
            
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Stream error:', error);
            throw error;
        }
    }

    // 🏥 CHECK SERVER HEALTH
    static async checkServerHealth() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ [STREAM-API] Server health check passed:', data);
                return data;
            }
            return false;
        } catch (error) {
            console.error('❌ [STREAM-API] Server health check failed:', error);
            return false;
        }
    }

    // 🔧 UTILITY: Get all data for homepage (optimized)
    static async getHomePageData() {
        try {
            console.log('🏠 [STREAM-API] Loading homepage data...');
            
            // Load airing anime and popular/recent anime in parallel
            const [airingData, browseData] = await Promise.all([
                this.getAiringAnime(1),
                this.browseAnime({ page: 1 }).catch(() => ({ data: [] })) // Fallback if browse fails
            ]);

            return {
                airing: airingData.data || [],
                browse: Array.isArray(browseData) ? browseData : browseData.data || [],
                airingPagination: airingData.paginationInfo || null,
                browsePagination: browseData.paginationInfo || null
            };
        } catch (error) {
            console.error('❌ [STREAM-API] Homepage data error:', error);
            // Return fallback data instead of throwing
            return {
                airing: [],
                browse: [],
                airingPagination: null,
                browsePagination: null
            };
        }
    }

    // 🎯 UTILITY: Search and get episode list in one call
    static async searchAndGetEpisodes(query) {
        try {
            console.log(`🎯 [STREAM-API] Searching and getting episodes for: ${query}`);
            
            // First search for the anime
            const searchResults = await this.searchAnime(query, 1);
            
            if (!searchResults.data || searchResults.data.length === 0) {
                throw new Error('No anime found with that search term');
            }

            // Get the first result's episodes
            const firstResult = searchResults.data[0];
            const episodes = await this.getAnimeEpisodes(firstResult.session);

            return {
                animeInfo: firstResult,
                episodes: episodes.data || [],
                searchResults: searchResults.data,
                episodesPagination: episodes.paginationInfo || null
            };
        } catch (error) {
            console.error('❌ [STREAM-API] Search and episodes error:', error);
            throw error;
        }
    }

    // 🔍 UTILITY: Get anime info with episodes (complete anime data)
    static async getCompleteAnimeData(animeId) {
        try {
            console.log(`🔍 [STREAM-API] Getting complete data for: ${animeId}`);
            
            // Get anime info and episodes in parallel
            const [animeInfo, episodes] = await Promise.all([
                this.getAnimeInfo(animeId),
                this.getAnimeEpisodes(animeId, 'episode_desc', 1)
            ]);

            return {
                info: animeInfo,
                episodes: episodes.data || [],
                episodesPagination: episodes.paginationInfo || null,
                totalEpisodes: episodes.paginationInfo?.total || episodes.data?.length || 0
            };
        } catch (error) {
            console.error('❌ [STREAM-API] Complete anime data error:', error);
            throw error;
        }
    }
}