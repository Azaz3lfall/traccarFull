import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import { glob } from 'glob';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define data directory paths
const DATA_DIR = '/opt/addons/dataAnalytics/data';
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');

const app = express();
const PORT = process.env.DATA_ANALYTICS_PORT || 4444;

// Helper function to generate unique ID
const generateUniqueId = () => {
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('md5').update(timestamp + Math.random().toString()).digest('hex').substring(0, 8);
    return `template_${timestamp}_${hash}`;
};

// Helper function to ensure directories exist
const ensureDirectoriesExist = () => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`✅ Created data directory: ${DATA_DIR}`);
        }
        if (!fs.existsSync(TEMPLATES_DIR)) {
            fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
            console.log(`✅ Created templates directory: ${TEMPLATES_DIR}`);
        }
    } catch (error) {
        console.error('❌ Error creating directories:', error);
        throw error;
    }
};

// CORS configuration - Allow all origins
const corsOptions = {
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Manual CORS headers as backup
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Allow-Credentials', 'false');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('   Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Data Analytics Server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: PORT
    });
});

// List templates for a user
app.post('/api/templates/list', async (req, res) => {
    try {
        const { userId, currentDomain } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'userId is required',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`📋 Listing templates for userId: ${userId}, domain: ${currentDomain || 'any'}`);

        // Get all JSON files from templates directory
        const jsonFiles = await glob('*.json', { cwd: TEMPLATES_DIR });

        const templates = [];

        // Process each JSON file
        for (const jsonFile of jsonFiles) {
            try {
                const filePath = path.join(TEMPLATES_DIR, jsonFile);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const templateData = JSON.parse(fileContent);

                // Filter by userId and optionally by currentDomain
                const matchesUserId = templateData.userId === userId.toString();
                const matchesDomain = !currentDomain || !templateData.currentDomain || templateData.currentDomain === currentDomain;

                if (matchesUserId && matchesDomain) {
                    templates.push(templateData);
                }
            } catch (fileError) {
                console.error('❌ Error reading template file:', jsonFile, fileError.message);
                continue;
            }
        }

        // Sort by updatedAt (most recent first)
        templates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        console.log(`✅ Found ${templates.length} templates for user ${userId}`);

        res.json({
            success: true,
            userId: userId,
            count: templates.length,
            templates: templates,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching templates list:', error);
        res.status(500).json({
            error: 'Failed to fetch templates list',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get specific template by ID
app.get('/api/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📄 Fetching template: ${id}`);

        const filePath = path.join(TEMPLATES_DIR, `${id}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Template not found',
                templateId: id,
                timestamp: new Date().toISOString()
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const templateData = JSON.parse(fileContent);

        console.log(`✅ Template found: ${templateData.name}`);

        res.json({
            success: true,
            template: templateData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching template:', error);
        res.status(500).json({
            error: 'Failed to fetch template',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Create new template
app.post('/api/templates/create', async (req, res) => {
    try {
        const { userId, currentDomain, name, entityType, selectedEntities, visualizationType, configuration } = req.body;

        if (!userId || !name) {
            return res.status(400).json({
                error: 'userId and name are required',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`➕ Creating template: ${name} for user ${userId}`);

        const templateId = generateUniqueId();
        const timestamp = new Date().toISOString();

        const templateData = {
            id: templateId,
            userId: userId.toString(),
            currentDomain: currentDomain || null,
            name: name,
            entityType: entityType || 'devices',
            selectedEntities: selectedEntities || [],
            visualizationType: visualizationType || 'table',
            configuration: configuration || {},
            createdAt: timestamp,
            updatedAt: timestamp
        };

        const filePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2));

        console.log(`✅ Template created: ${templateId}`);

        res.json({
            success: true,
            template: templateData,
            message: 'Template created successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error creating template:', error);
        res.status(500).json({
            error: 'Failed to create template',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Update existing template
app.post('/api/templates/update', async (req, res) => {
    try {
        const { id, name, entityType, selectedEntities, visualizationType, configuration } = req.body;

        if (!id) {
            return res.status(400).json({
                error: 'Template id is required',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`✏️ Updating template: ${id}`);

        const filePath = path.join(TEMPLATES_DIR, `${id}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Template not found',
                templateId: id,
                timestamp: new Date().toISOString()
            });
        }

        // Read existing template
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const existingTemplate = JSON.parse(fileContent);

        // Update fields
        const updatedTemplate = {
            ...existingTemplate,
            name: name !== undefined ? name : existingTemplate.name,
            entityType: entityType !== undefined ? entityType : existingTemplate.entityType,
            selectedEntities: selectedEntities !== undefined ? selectedEntities : existingTemplate.selectedEntities,
            visualizationType: visualizationType !== undefined ? visualizationType : existingTemplate.visualizationType,
            configuration: configuration !== undefined ? configuration : existingTemplate.configuration,
            updatedAt: new Date().toISOString()
        };

        // Save updated template
        fs.writeFileSync(filePath, JSON.stringify(updatedTemplate, null, 2));

        console.log(`✅ Template updated: ${id}`);

        res.json({
            success: true,
            template: updatedTemplate,
            message: 'Template updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error updating template:', error);
        res.status(500).json({
            error: 'Failed to update template',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Delete template
app.post('/api/templates/delete', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                error: 'Template id is required',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`🗑️ Deleting template: ${id}`);

        const filePath = path.join(TEMPLATES_DIR, `${id}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Template not found',
                templateId: id,
                timestamp: new Date().toISOString()
            });
        }

        // Delete the file
        fs.unlinkSync(filePath);

        console.log(`✅ Template deleted: ${id}`);

        res.json({
            success: true,
            message: 'Template deleted successfully',
            templateId: id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error deleting template:', error);
        res.status(500).json({
            error: 'Failed to delete template',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Initialize server
const startServer = async () => {
    try {
        console.log('🚀 Starting Data Analytics Server...');

        // Ensure directories exist
        ensureDirectoriesExist();

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('📊 Data Analytics Server is running');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`🌐 Port: ${PORT}`);
            console.log(`📁 Data Directory: ${DATA_DIR}`);
            console.log(`📋 Templates Directory: ${TEMPLATES_DIR}`);
            console.log('');
            console.log('Available endpoints:');
            console.log(`  GET  /health`);
            console.log(`  POST /api/templates/list`);
            console.log(`  GET  /api/templates/:id`);
            console.log(`  POST /api/templates/create`);
            console.log(`  POST /api/templates/update`);
            console.log(`  POST /api/templates/delete`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
