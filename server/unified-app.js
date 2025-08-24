// server/unified-app.js - Performance Optimized
const express = require('express');
const next = require('next');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import your existing backend components
const Config = require('./utils/config');
const { errorHandler, CustomError } = require('./middleware/errorHandler');
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
            console.log('✅ Backend configuration loaded');
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

        // ============ FAST NEXT.JS API ROUTES (Zero Express Processing) ============
        // Create optimized handlers that bypass all Express middleware
        const createFastNextHandler = (routeName) => (req, res) => {
            // Skip all logging for performance in production
            if (dev) console.log(`⚡ [FAST] ${routeName}:`, req.path);
            
            // Directly call Next.js handler without any Express processing
            setImmediate(() => handle(req, res));
        };

        // Optimized route handlers (zero middleware)
        app.all('/api/anilist*', createFastNextHandler('AniList'));
        app.all('/api/animepahe*', createFastNextHandler('AnimePahe'));
        app.all('/api/comick*', createFastNextHandler('ComicK'));
        app.all('/api/comments*', createFastNextHandler('Comments'));
        app.all('/api/mangadex*', createFastNextHandler('MangaDex'));
        app.all('/api/proxy*', createFastNextHandler('Proxy'));
        app.all('/api/proxy-image*', createFastNextHandler('ProxyImage'));
        app.all('/api/ratings*', createFastNextHandler('Ratings'));
        app.all('/api/send-email*', createFastNextHandler('SendEmail'));
        
        // 🚀 ADD THIS LINE - PayStack verification route
        app.all('/api/verify-paystack-payment*', createFastNextHandler('PayStack'));

        // ============ CUSTOM BACKEND ROUTES (Minimal Middleware) ============
        // Only apply JSON parsing to specific endpoints that need it
        app.use('/api/play', express.json({ limit: '10mb' })); // Increased limit for better performance
        app.use('/api/play', playRoutes);
        
        // Optimized health check (no middleware)
        app.get('/api/health', (req, res) => {
            if (dev) console.log('🥏 [FAST] Health check');
            res.json({ 
                status: 'ok', 
                message: 'Unified scraper app running (optimized)',
                mode: 'local-residential-ip',
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                performance: 'optimized'
            });
        });

        // Error handling only for custom routes
        app.use('/api/play', errorHandler);

        // ============ OPTIMIZED FRONTEND HANDLING ============
        // Fast frontend handler with caching hints
        app.all('*', (req, res) => {
            if (!req.path.startsWith('/api/')) {
                // Skip logging for static assets to improve performance
                if (dev && !req.path.startsWith('/_next/') && !req.path.startsWith('/__nextjs')) {
                    console.log('🎨 [FAST] Frontend:', req.path);
                }
                
                // Add performance headers for static assets
                if (req.path.startsWith('/_next/static/')) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
                
                return handle(req, res);
            } else {
                // Unknown API route - fast response
                console.log('❓ [FAST] Unknown API route:', req.path);
                res.status(404).json({ error: 'API route not found' });
            }
        });

        // ============ SERVER STARTUP ============
        app.listen(PORT, 'localhost', () => {
            console.log('\n🚀 ==========================================');
            console.log(`⚡ OPTIMIZED HEROX123 APP STARTED!`);
            console.log(`📱 Frontend: http://localhost:${PORT}`);
            console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
            console.log(`🏠 Scraping: Using user's residential IP`);
            console.log(`🎯 Status: Ready for TWA packaging!`);
            console.log('🚀 ==========================================\n');
            console.log('📍 Performance Optimizations:');
            console.log('   ⚡ Zero-middleware Next.js API routes');
            console.log('   🚀 Selective CORS application');  
            console.log('   💾 Static asset caching');
            console.log('   🔥 Reduced logging overhead');
            
            if (dev) {
                console.log('\n💡 Development mode - auto-reload enabled');
                console.log(`🌐 Open: http://localhost:${PORT}`);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start unified server:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down unified server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down unified server...');
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startUnifiedServer();
}

module.exports = { startUnifiedServer };