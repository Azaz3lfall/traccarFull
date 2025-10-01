import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow specific origins
        const allowedOrigins = [
            '*',
            'http://localhost:3000',
            'https://localhost:3000',
            'https://gps.codeartisan.cloud',
            'https://cloud.absmultipla.com.br'
        ];

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.get('/api/resellers', (req, res) => {
    res.json({
        message: 'Resellers API is working',
        method: 'GET',
        timestamp: new Date().toISOString()
    });
});

// POST endpoint for resellers data
app.post('/api/resellers', (req, res) => {
    try {
        const { body } = req;

        // Validate required fields (customize as needed)
        if (!body) {
            return res.status(400).json({
                error: 'Request body is required',
                timestamp: new Date().toISOString()
            });
        }

        // Process the reseller data
        console.log('Received reseller data:', body);

        // Here you can add your business logic
        // For example: save to database, validate data, etc.

        res.json({
            success: true,
            message: 'Reseller data received successfully',
            data: body,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing reseller data:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// PUT endpoint for updating resellers
app.put('/api/resellers/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;

        console.log(`Updating reseller with ID: ${id}`, body);

        res.json({
            success: true,
            message: `Reseller ${id} updated successfully`,
            data: body,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error updating reseller:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE endpoint for resellers
app.delete('/api/resellers/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log(`Deleting reseller with ID: ${id}`);

        res.json({
            success: true,
            message: `Reseller ${id} deleted successfully`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error deleting reseller:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Generic JSON POST endpoint
app.post('/api/data', (req, res) => {
    try {
        const { body } = req;

        console.log('Received generic data:', body);

        res.json({
            success: true,
            message: 'Data received successfully',
            data: body,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing data:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Resellers Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API endpoints:`);
    console.log(`   GET  /api/resellers`);
    console.log(`   POST /api/resellers`);
    console.log(`   PUT  /api/resellers/:id`);
    console.log(`   DELETE /api/resellers/:id`);
    console.log(`   POST /api/data`);
    console.log(`\n💡 React app should be running on http://localhost:3000`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

export default app;
