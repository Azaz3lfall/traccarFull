import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Use environment PORT or default to 3333
const PORT = process.env.PORT || 3333;

// CORS configuration - Allow all origins (development and production)
const corsOptions = {
  origin: '*', // Allow all origins everywhere
  credentials: false, // Set to false when using wildcard origin
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
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
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

  if (req.body && Object.keys(req.body).length > 0) {
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


    
    // Validate required fields
    const requiredFields = [
      'currentDomain', 'parentUserId', 'parentUser', 'parentEmail',
      'resellerId', 'resellerUser', 'resellerEmail', 'companyName',
      'logotype', 'appUrl', 'whatsapp', 'billingEmail', 'supportEmail',
      'resellerLimit', 'deviceLimit', 'userLimit', 'status', 'createdAt'
    ];
    
    const missingFields = requiredFields.filter(field => !body[field] || body[field] === '');
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields: missingFields,
        timestamp: new Date().toISOString()
      });
    }
    
    
    // Create JSON file with reseller data
    try {
      // Create filename: reseller_{appUrl}_{parentUserId}_{resellerId}.json
      const filename = `reseller_${body.appUrl}_${body.parentUserId}_${body.resellerId}.json`;
      
      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Full file path
      const filePath = path.join(dataDir, filename);
      
      // Add metadata to the data
      const fileData = {
        ...body,
        savedAt: new Date().toISOString(),
        filename: filename
      };
      
      // Write JSON file
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
      
      
    } catch (fileError) {
      console.error('❌ Error saving reseller file:', fileError);
      return res.status(500).json({
        error: 'File save error',
        message: fileError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Reseller data received and validated successfully',
      data: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing reseller data:', error);
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

export default app;
