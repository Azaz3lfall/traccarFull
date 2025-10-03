import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { glob } from 'glob';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define data directory paths
const DATA_DIR = '/opt/addons/resellers/data';
const IMAGES_DIR = path.join(DATA_DIR, 'images');

const app = express();
// Use environment PORT or default to 3333
const PORT = process.env.PORT || 3333;

// Helper function to generate unique filename
const generateUniqueFilename = (appUrl, parentUserId, resellerId, extension) => {
  const timestamp = Date.now().toString();
  const hash = crypto.createHash('md5').update(timestamp).digest('hex').substring(0, 8);
  return `${appUrl}_${parentUserId}_${resellerId}_${hash}.${extension}`;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Images directory is ensured to exist at startup
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    // Generate a temporary filename first, we'll rename it after processing
    const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    cb(null, tempFilename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 120 * 1024, // 120KB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG images are allowed'), false);
    }
  }
});

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

// GET endpoint for listing resellers (filtered by parentUserId)
app.post('/api/resellers/list', async (req, res) => {
  try {
    const { parentUserId } = req.body;
    
    if (!parentUserId) {
      return res.status(400).json({
        error: 'parentUserId is required',
        timestamp: new Date().toISOString()
      });
    }


    // Get all JSON files from data directory
    const dataDir = DATA_DIR;
    const jsonFiles = await glob('*.json', { cwd: dataDir });
    
    const resellers = [];
    
    // Process each JSON file
    for (const jsonFile of jsonFiles) {
      try {
        // Parse filename to extract components: reseller_{appUrl}_{parentUserId}_{resellerId}.json
        const filenameParts = jsonFile.replace('.json', '').split('_');
        
        if (filenameParts.length >= 4 && filenameParts[0] === 'reseller') {
          const fileAppUrl = filenameParts[1];
          const fileParentUserId = filenameParts[2];
          const fileResellerId = filenameParts[3];
          
          // Filter by parentUserId
          if (fileParentUserId === parentUserId.toString()) {
            const filePath = path.join(dataDir, jsonFile);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const resellerData = JSON.parse(fileContent);
            
            // Add filename info for reference
            resellerData.filename = jsonFile;
            resellerData.fileAppUrl = fileAppUrl;
            resellerData.fileParentUserId = fileParentUserId;
            resellerData.fileResellerId = fileResellerId;
            
            resellers.push(resellerData);
          }
        }
      } catch (fileError) {
        console.error('❌ Error reading file:', jsonFile, fileError.message);
        continue; // Skip this file and continue with others
      }
    }


    res.json({
      success: true,
      parentUserId: parentUserId,
      count: resellers.length,
      resellers: resellers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching resellers list:', error);
    res.status(500).json({
      error: 'Failed to fetch resellers list',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy GET endpoint (kept for compatibility)
app.get('/api/resellers', (req, res) => {
    res.json({
        message: 'Resellers API is working - Use POST /api/resellers/list with parentUserId',
        method: 'GET',
        timestamp: new Date().toISOString()
    });
});

// POST endpoint for resellers data
app.post('/api/resellers', upload.any(), async (req, res) => {
  try {
    
    let body;
    
    // Check if request is FormData (with image) or JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Handle FormData - use individual fields from form data
    
      
      // Extract all fields from FormData
      body = {
        currentDomain: req.body.currentDomain,
        parentUserId: req.body.parentUserId,
        parentUser: req.body.parentUser,
        parentEmail: req.body.parentEmail,
        resellerId: req.body.resellerId,
        resellerUser: req.body.resellerUser,
        resellerEmail: req.body.resellerEmail,
        companyName: req.body.companyName,
        logotype: req.body.logotype || '', // Will be updated with image URL if image is uploaded
        appUrl: req.body.appUrl,
        whatsapp: req.body.whatsapp,
        billingEmail: req.body.billingEmail,
        supportEmail: req.body.supportEmail,
        resellerLimit: parseInt(req.body.resellerLimit) || 0,
        deviceLimit: parseInt(req.body.deviceLimit) || 0,
        userLimit: parseInt(req.body.userLimit) || 0,
        status: req.body.status || 'active',
        createdAt: req.body.createdAt
      };
    } else {
      // Handle JSON request
      body = req.body;
    }
    
    // Validate required fields (customize as needed)
    if (!body) {
      return res.status(400).json({ 
        error: 'Request body is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate required fields (logotype is optional as it will be set from image upload)
    const requiredFields = [
      'currentDomain', 'parentUserId', 'parentUser', 'parentEmail',
      'resellerId', 'resellerUser', 'resellerEmail', 'companyName',
      'appUrl', 'whatsapp', 'billingEmail', 'supportEmail',
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
    
    
    // Check if appUrl already exists
    try {
      const dataDir = DATA_DIR;
      const jsonFiles = await glob('*.json', { cwd: dataDir });
      
      for (const jsonFile of jsonFiles) {
        try {
          const filePath = path.join(dataDir, jsonFile);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const existingReseller = JSON.parse(fileContent);
          
          // Check if appUrl already exists
          if (existingReseller.appUrl === body.appUrl) {
            
            // Mask email and company name for privacy
            const maskedEmail = existingReseller.resellerEmail ? 
              existingReseller.resellerEmail.replace(/(.{2}).*(@.*)/, '$1***$2') : 'N/A';
            const maskedCompany = existingReseller.companyName ? 
              existingReseller.companyName.substring(0, 3) + '***' : 'N/A';
            
            return res.status(409).json({
              error: 'Domain already in use',
              message: `The domain '${body.appUrl}' is already registered`,
              details: {
                domain: body.appUrl,
                existingReseller: {
                  email: maskedEmail,
                  company: maskedCompany
                }
              },
              timestamp: new Date().toISOString()
            });
          }
        } catch (fileError) {
          console.error('❌ Error reading file during domain check:', jsonFile, fileError.message);
          continue; // Skip this file and continue checking others
        }
      }
      
    } catch (domainCheckError) {
      console.error('❌ Error checking domain availability:', domainCheckError);
      return res.status(500).json({
        error: 'Domain availability check failed',
        message: domainCheckError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Check if WhatsApp number already exists
    try {
      const dataDir = DATA_DIR;
      const jsonFiles = await glob('*.json', { cwd: dataDir });
      
      for (const jsonFile of jsonFiles) {
        try {
          const filePath = path.join(dataDir, jsonFile);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const existingReseller = JSON.parse(fileContent);
          
          // Check if WhatsApp number already exists
          if (existingReseller.whatsapp === body.whatsapp) {
            
            // Mask email and company name for privacy
            const maskedEmail = existingReseller.resellerEmail ? 
              existingReseller.resellerEmail.replace(/(.{2}).*(@.*)/, '$1***$2') : 'N/A';
            const maskedCompany = existingReseller.companyName ? 
              existingReseller.companyName.substring(0, 3) + '***' : 'N/A';
            
            return res.status(409).json({
              error: 'WhatsApp number already in use',
              message: `The WhatsApp number '${body.whatsapp}' is already registered`,
              details: {
                whatsapp: body.whatsapp,
                existingReseller: {
                  email: maskedEmail,
                  company: maskedCompany
                }
              },
              timestamp: new Date().toISOString()
            });
          }
        } catch (fileError) {
          console.error('❌ Error reading file during WhatsApp check:', jsonFile, fileError.message);
          continue; // Skip this file and continue checking others
        }
      }
      
    } catch (whatsappCheckError) {
      console.error('❌ Error checking WhatsApp availability:', whatsappCheckError);
      return res.status(500).json({
        error: 'WhatsApp availability check failed',
        message: whatsappCheckError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Process image if provided (after validation passes)
    let imageUrl = body.logotype || '';
    if (req.files && req.files.length > 0) {
      try {
        const imageFile = req.files.find(file => file.fieldname === 'image');
        if (imageFile) {
          const appUrl = req.body.appUrl;
          const parentUserId = req.body.parentUserId;
          const resellerId = req.body.resellerId;
          
          // Generate unique filename for image
          const imageFilename = `reseller_${appUrl}_${parentUserId}_${resellerId}_${Date.now()}.png`;
          const imagesDir = IMAGES_DIR;
          const imagePath = path.join(imagesDir, imageFilename);
          
          // Move uploaded file to final location
          fs.renameSync(imageFile.path, imagePath);
          
          // Update logotype with relative path
          imageUrl = `images/${imageFilename}`;
          body.logotype = imageUrl;
          
        }
      } catch (imageError) {
        console.error('❌ Error processing image:', imageError);
        return res.status(500).json({
          error: 'Image processing failed',
          message: imageError.message,
          timestamp: new Date().toISOString()
        });
      }
    } else if (body.logotype && body.logotype.startsWith('data:image')) {
      // Handle base64 image
      try {
        const base64Data = body.logotype.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const imageFilename = `reseller_${body.appUrl}_${body.parentUserId}_${body.resellerId}_${Date.now()}.png`;
        const imagesDir = IMAGES_DIR;
        const imagePath = path.join(imagesDir, imageFilename);
        
        // Ensure images directory exists
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        fs.writeFileSync(imagePath, buffer);
        imageUrl = `images/${imageFilename}`;
        body.logotype = imageUrl;
        
      } catch (base64Error) {
        console.error('❌ Error processing base64 image:', base64Error);
        return res.status(500).json({
          error: 'Base64 image processing failed',
          message: base64Error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Create JSON file with reseller data
    try {
      // Create filename: reseller_{appUrl}_{parentUserId}_{resellerId}.json
      const filename = `reseller_${body.appUrl}_${body.parentUserId}_${body.resellerId}.json`;
      
      // Data directory is ensured to exist at startup
      const dataDir = DATA_DIR;
      
      // Full file path
      const filePath = path.join(dataDir, filename);
      
      // Add metadata to the data
      const fileData = {
        ...body,
        logotype: imageUrl, // Use processed image URL
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
app.put('/api/resellers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;
        
        
        // Find existing reseller first
        const dataDir = DATA_DIR;
        const jsonFiles = await glob('*.json', { cwd: dataDir });
        
        let existingReseller = null;
        let existingResellerFile = null;
        
        for (const jsonFile of jsonFiles) {
            try {
                const filenameParts = jsonFile.replace('.json', '').split('_');
                
                if (filenameParts.length >= 4 && filenameParts[0] === 'reseller') {
                    const fileParentUserId = filenameParts[2];
                    const fileResellerId = filenameParts[3];
                    
                    // Check if this file matches the update request
                    if (fileParentUserId === body.parentUserId.toString() && 
                        fileResellerId === body.resellerId) {
                        const filePath = path.join(dataDir, jsonFile);
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        existingReseller = JSON.parse(fileContent);
                        existingResellerFile = jsonFile;
                        break;
                    }
                }
            } catch (fileError) {
                console.error('❌ Error reading file during update search:', jsonFile, fileError.message);
                continue;
            }
        }

        if (!existingReseller) {
            return res.status(404).json({
                error: 'Reseller not found',
                message: `No reseller found with resellerId '${body.resellerId}' for user '${body.parentUserId}'`,
                timestamp: new Date().toISOString()
            });
        }

        
        // Merge with existing data - keep old values if new ones are empty
        const updatedData = {
            ...existingReseller,
            ...body,
            // Keep old logotype if new one is empty
            logotype: body.logotype && body.logotype.trim() !== '' ? body.logotype : existingReseller.logotype,
            // Keep old appUrl if new one is empty
            appUrl: body.appUrl && body.appUrl.trim() !== '' ? body.appUrl : existingReseller.appUrl,
            updatedAt: new Date().toISOString()
        };

        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Create filename for the reseller (use merged data)
        const filename = `reseller_${updatedData.appUrl}_${updatedData.parentUserId}_${updatedData.resellerId}.json`;
        const filePath = path.join(dataDir, filename);
        
        // Add metadata to the data
        const fileData = {
            ...updatedData,
            filename: filename
        };
        
        // Delete old file if filename changed
        if (existingResellerFile && existingResellerFile !== filename) {
            const oldFilePath = path.join(dataDir, existingResellerFile);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        
        // Write JSON file
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
        

        res.json({
            success: true,
            message: `Reseller ${id} updated successfully`,
            data: fileData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error updating reseller:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE endpoint for resellers - POST for security
app.post('/api/resellers/delete', async (req, res) => {
  try {
    const { appUrl, parentUserId } = req.body;
    
    if (!appUrl || !parentUserId) {
      return res.status(400).json({
        error: 'appUrl and parentUserId are required',
        timestamp: new Date().toISOString()
      });
    }


    // Find the reseller file that matches both appUrl and parentUserId
    const dataDir = DATA_DIR;
    const jsonFiles = await glob('*.json', { cwd: dataDir });
    
    let resellerFile = null;
    let resellerData = null;
    
    for (const jsonFile of jsonFiles) {
      try {
        // Parse filename to extract components: reseller_{appUrl}_{parentUserId}_{resellerId}.json
        const filenameParts = jsonFile.replace('.json', '').split('_');
        
        if (filenameParts.length >= 4 && filenameParts[0] === 'reseller') {
          const fileAppUrl = filenameParts[1];
          const fileParentUserId = filenameParts[2];
          
          // Check if this file matches the delete request
          if (fileAppUrl === appUrl && fileParentUserId === parentUserId.toString()) {
            const filePath = path.join(dataDir, jsonFile);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            resellerData = JSON.parse(fileContent);
            resellerFile = jsonFile;
            break;
          }
        }
      } catch (fileError) {
        console.error('❌ Error reading file during delete search:', jsonFile, fileError.message);
        continue;
      }
    }

    if (!resellerFile || !resellerData) {
      return res.status(404).json({
        error: 'Reseller not found',
        message: `No reseller found with appUrl '${appUrl}' for user '${parentUserId}'`,
        timestamp: new Date().toISOString()
      });
    }

    

    // Delete the JSON file
    const jsonFilePath = path.join(dataDir, resellerFile);
    fs.unlinkSync(jsonFilePath);


    // Delete associated image if it exists
    if (resellerData.logotype && resellerData.logotype.startsWith('images/')) {
      const imageFilename = resellerData.logotype.replace('images/', '');
      const imagePath = path.join(IMAGES_DIR, imageFilename);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);

      } else {

      }
    }

    res.json({
      success: true,
      message: `Reseller '${resellerData.companyName}' deleted successfully`,
      deletedFiles: {
        json: resellerFile,
        image: resellerData.logotype || 'none'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error deleting reseller:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Image upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        timestamp: new Date().toISOString()
      });
    }

    // Get appUrl from the request body
    const appUrl = req.body.appUrl;
    if (!appUrl) {
      // Delete the temp file if no appUrl provided
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'appUrl is required for image upload',
        timestamp: new Date().toISOString()
      });
    }

    // Create the correct filename using the same pattern as JSON files
    const parentUserId = req.body.parentUserId || 'unknown';
    const resellerId = req.body.resellerId || 'unknown';
    const correctFilename = `reseller_${appUrl}_${parentUserId}_${resellerId}_${Date.now()}.png`;
    const correctPath = path.join(path.dirname(req.file.path), correctFilename);
    
    // Check if file already exists and handle it
    if (fs.existsSync(correctPath)) {
      // Delete the old file to replace it
      fs.unlinkSync(correctPath);
    }
    
    // Rename the file from temp name to correct name with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        fs.renameSync(req.file.path, correctPath);
        break; // Success, exit the loop
      } catch (renameError) {
        retries--;
        if (retries === 0) {
          throw renameError; // Re-throw if all retries failed
        }
        // Wait a bit before retrying (for concurrent access issues)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }





    res.json({
      success: true,
      message: 'Image uploaded successfully',
      filename: correctFilename,
      url: `images/${correctFilename}`,
      size: req.file.size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      error: 'Image upload failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve uploaded images
app.use('/images', express.static(IMAGES_DIR));

// Domain lookup endpoint - POST to get domain data with base64 image
app.post('/api/domain-lookup', async (req, res) => {
  try {
    const { domain } = req.body;
    



    
    if (!domain) {

      return res.status(400).json({
        error: 'Domain is required',
        timestamp: new Date().toISOString()
      });
    }



    // Search for JSON files that contain this domain in filename
    const dataDir = DATA_DIR;
    const jsonPattern = `reseller_${domain}_*.json`;
    


    
    const jsonFiles = await glob(jsonPattern, { cwd: dataDir });

    
    let domainData = null;
    let imageBase64 = null;

    // If we found matching files, read the first one
    if (jsonFiles.length > 0) {
      const jsonFile = jsonFiles[0]; // Take the first match

      
      try {
        const filePath = path.join(dataDir, jsonFile);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        domainData = data;
        
        // Look for corresponding image file using the same pattern
        const imagePattern = `reseller_${domain}_${data.parentUserId}_${data.resellerId}_*.png`;
      
        const imageFiles = await glob(imagePattern, { cwd: IMAGES_DIR });
        
        if (imageFiles.length > 0) {
          const imagePath = path.join(IMAGES_DIR, imageFiles[0]);
          const imageBuffer = fs.readFileSync(imagePath);
          imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        }
      } catch (fileError) {
        console.error('❌ Error reading file:', jsonFile, fileError.message);
      }
    } else {
    }

    if (!domainData) {
      return res.status(404).json({
        error: 'Domain not found',
        domain: domain,
        timestamp: new Date().toISOString()
      });
    }

    // Return domain data with base64 image
    const response = {
      success: true,
      domain: domain,
      data: domainData,
      imageBase64: imageBase64,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error in domain lookup:', error);
    res.status(500).json({
      error: 'Domain lookup failed',
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

// Ensure required directories exist on startup
const ensureDirectories = () => {
  try {
    // Create main resellers directory
    const mainDir = '/opt/addons/resellers';
    if (!fs.existsSync(mainDir)) {
      fs.mkdirSync(mainDir, { recursive: true });
      console.log('✅ Created main resellers directory:', mainDir);
    }
    
    // Create data directory
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('✅ Created data directory:', DATA_DIR);
    }
    
    // Create images directory
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      console.log('✅ Created images directory:', IMAGES_DIR);
    }
    
    console.log('✅ All required directories ensured:', mainDir, DATA_DIR, IMAGES_DIR);
  } catch (error) {
    console.error('❌ Error creating directories:', error);
    console.error('❌ Make sure the application has write permissions to /opt/addons/resellers');
    process.exit(1);
  }
};

// Create directories on startup
ensureDirectories();

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
