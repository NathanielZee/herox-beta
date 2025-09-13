// server/unified-app.js - Updated with full Animepahe backend integration
const express = require('express');
const next = require('next');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import your existing backend components (now from server/)
const Config = require('./utils/config');
const { errorHandler, CustomError } = require('./middleware/errorHandler');
const cache = require('./middleware/cache');

// Import all your Animepahe routes
const homeRoutes = require('./routes/homeRoutes');
const queueRoutes = require('./routes/queueRoutes');
const animeListRoutes = require('./routes/animeListRoutes');
const animeInfoRoutes = require('./routes/animeInfoRoutes');
const playRoutes = require('./routes/playRoutes');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

async function startUnifiedServer() {
    try {
        // Initialize Next.js
        await nextApp.prepare();
        console.log('✅ Next.js app prepared');

        // Initialize backend config
        try {
            Config.validate();
            Config.loadFromEnv();
            console.log('✅ Backend configuration loaded successfully');
        } catch (error) {
            console.error('❌ Backend configuration error:', error.message);
            process.exit(1);
        }

        const app = express();
        const PORT = process.env.PORT || 3000;

        // ============ OPTIMIZED MIDDLEWARE SETUP ============
        // Only apply CORS to routes that need it (skip static assets)
        app.use((req, res, next) => {
            // Skip CORS for static assets and hot reload
            if (req.path.startsWith('/_next/') || req.path.startsWith('/__nextjs') || 
                req.path.endsWith('.js') || req.path.endsWith('.css') || 
                req.path.endsWith('.png') || req.path.endsWith('.jpg') || 
                req.path.endsWith('.ico') || req.path.endsWith('.woff2')) {
                return next();
            }
            
            // Apply CORS only to API routes and pages
            cors({
                origin: [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`],
                credentials: true
            })(req, res, next);
        });

        // Middleware to set hostUrl for each request (from your original code)
        app.use((req, res, next) => {
            try {
                const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
                const host = req.headers.host;
                if (protocol && host) {
                    Config.setHostUrl(protocol, host);
                }
                next();
            } catch (error) {
                console.error('Error setting host URL:', error.message);
                next(); // Continue even if this fails
            }
        });

        // ============ FAST NEXT.JS API ROUTES (Zero Express Processing) ============
        const createFastNextHandler = (routeName) => (req, res) => {
            if (dev) console.log(`⚡ [FAST] ${routeName}:`, req.path);
            setImmediate(() => handle(req, res));
        };

        // Optimized route handlers (zero middleware) - Your existing Next.js routes
        app.all('/api/anilist*', createFastNextHandler('AniList'));
        app.all('/api/comick*', createFastNextHandler('ComicK'));
        app.all('/api/comments*', createFastNextHandler('Comments'));
        app.all('/api/mangadex*', createFastNextHandler('MangaDex'));
        app.all('/api/proxy*', createFastNextHandler('Proxy'));
        app.all('/api/proxy-image*', createFastNextHandler('ProxyImage'));
        app.all('/api/ratings*', createFastNextHandler('Ratings'));
        app.all('/api/send-email*', createFastNextHandler('SendEmail'));
        app.all('/api/verify-paystack-payment*', createFastNextHandler('PayStack'));

        // ============ ANIMEPAHE BACKEND ROUTES (Full Integration) ============
        
        // 🚀 NEW: Animepahe API Routes with different cache durations
        app.use('/api/animepahe', homeRoutes); // Search & Airing (caching handled in homeRoutes)
        app.use('/api/animepahe', cache(30), queueRoutes); // Queue (30 seconds)
        app.use('/api/animepahe', cache(3600), animeListRoutes); // Browse anime (1 hour)
        app.use('/api/animepahe', cache(86400), animeInfoRoutes); // Anime info (1 day)
        app.use('/api/animepahe', cache(1800), playRoutes); // Streaming links (30 minutes)

        // Health check endpoint (enhanced with new features)
        app.get('/api/health', (req, res) => {
            if (dev) console.log('🥏 [FAST] Health check');
            
            const redis = require('./utils/redis');
            
            const health = {
                status: 'ok',
                message: 'HeroX unified app with full Animepahe integration!',
                features: [
                    'anime-search', 
                    'episode-list', 
                    'streaming-links', 
                    'airing-anime', 
                    'browse-catalog',
                    'queue-status'
                ],
                endpoints: [
                    'GET /api/animepahe/airing - Get airing anime',
                    'GET /api/animepahe/search?q=query - Search anime',
                    'GET /api/animepahe/queue - Get encoding queue',
                    'GET /api/animepahe/anime - Browse anime catalog',
                    'GET /api/animepahe/:id - Get anime info',
                    'GET /api/animepahe/:id/releases - Get anime episodes',
                    'GET /api/animepahe/play/:id?episodeId=xxx - Get streaming links'
                ],
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                redis: {
                    enabled: redis.enabled,
                    healthy: redis.isHealthy()
                },
                memory: process.memoryUsage(),
                mode: 'local-residential-ip',
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                version: '2.0.0-enhanced'
            };
            
            res.json(health);
        });

        // 404 handler for unknown API routes
        app.use('/api/*', (req, res, next) => {
            if (!res.headersSent) {
                next(new CustomError(`API route not found: ${req.path}. Check available endpoints at /api/health`, 404));
            }
        });

        // Global error handling middleware for API routes
        app.use('/api/*', errorHandler);

        // ============ OPTIMIZED FRONTEND HANDLING ============
        app.all('*', (req, res) => {
            if (!req.path.startsWith('/api/')) {
                if (dev && !req.path.startsWith('/_next/') && !req.path.startsWith('/__nextjs')) {
                    console.log('🎨 [FAST] Frontend:', req.path);
                }
                
                // Add performance headers for static assets
                if (req.path.startsWith('/_next/static/')) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
                
                return handle(req, res);
            }
        });

        // ============ GRACEFUL SHUTDOWN HANDLERS ============
        const gracefulShutdown = async (signal) => {
            console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
            
            // Stop accepting new requests
            server.close(async () => {
                console.log('HTTP server closed');
                
                try {
                    // Cleanup Redis connection
                    const redis = require('./utils/redis');
                    if (redis.enabled) {
                        await redis.disconnect();
                    }
                    
                    console.log('Cleanup completed');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during cleanup:', error.message);
                    process.exit(1);
                }
            });
            
            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

        // ============ SERVER STARTUP ============
        const server = app.listen(PORT, 'localhost', () => {
            console.log('\n🚀 ==========================================');
            console.log(`⚡ ENHANCED HEROX123 APP STARTED!`);
            console.log(`📱 Frontend: http://localhost:${PORT}`);
            console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
            console.log(`🎌 Animepahe API: http://localhost:${PORT}/api/animepahe`);
            console.log(`🏠 Scraping: Using user's residential IP`);
            console.log(`🎯 Status: Ready with full anime features!`);
            console.log('🚀 ==========================================\n');
            console.log('📍 Available Animepahe Features:');
            console.log('   🔍 Search anime by title');
            console.log('   📺 Get currently airing anime');
            console.log('   📖 Get detailed anime information');
            console.log('   📋 Get anime episode lists');
            console.log('   🔎 Browse anime catalog');
            console.log('   🎥 Get streaming links');
            console.log('   📊 Check encoding queue status');
            console.log('   💾 Redis caching for performance');
            
            if (dev) {
                console.log('\n💡 Development mode - auto-reload enabled');
                console.log(`🌐 Test endpoints: http://localhost:${PORT}/api/health`);
            }
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
                process.exit(1);
            } else {
                console.error('Server error:', error);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start unified server:', error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    startUnifiedServer();
}

module.exports = { startUnifiedServer };