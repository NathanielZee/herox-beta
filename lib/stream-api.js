// lib/stream-api.js
export class StreamAPI {
    static async getStreamingLinks(animeId, episodeId) {
        try {
            console.log(`🎯 [STREAM-API] Requesting streams for ${animeId}/${episodeId}`);
            
            // Direct call to unified server's /api/play endpoint
            const response = await fetch(`/api/play/${animeId}?episodeId=${episodeId}`, {
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
            }
            
            return data;
        } catch (error) {
            console.error('❌ [STREAM-API] Error:', error);
            throw error;
        }
    }

    static async checkServerHealth() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ [STREAM-API] Server health check passed:', data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ [STREAM-API] Server health check failed:', error);
            return false;
        }
    }
}