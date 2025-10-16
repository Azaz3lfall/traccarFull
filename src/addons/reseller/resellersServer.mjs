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
import { exec } from 'child_process';
import { promisify } from 'util';
import dns from 'dns';

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

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Promisify DNS functions
const dnsLookup = promisify(dns.lookup);

// Helper function to check domain propagation
const checkDomainPropagation = async (domain) => {
  try {
    
    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Check DNS resolution
    const dnsResult = await dnsLookup(cleanDomain);
    const ipAddress = dnsResult.address;
    
    
    // Try to ping the domain (optional - just for additional verification)
    try {
      await execAsync(`ping -c 1 -W 3 ${cleanDomain}`);
    } catch (pingError) {
    }
    
    return {
      success: true,
      domain: cleanDomain,
      ipAddress: ipAddress,
      message: `Domain is properly propagated and points to ${ipAddress}`
    };
    
  } catch (error) {
    console.error(`❌ Domain check failed for ${domain}:`, error.message);
    return {
      success: false,
      domain: domain,
      error: error.message,
      message: `Domain check failed: ${error.message}`
    };
  }
};

// Helper function to create nginx configuration
const createNginxConfig = async (appUrl) => {
  try {
    const nginxConfig = `server {
    listen 80;
    server_name ${appUrl};

    # --- Performance fixes ---
    sendfile off;                 # Avoid stalls on virtualized servers
    tcp_nopush on;
    tcp_nodelay on;

    # --- GZIP Compression ---
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/xml
        application/xml+rss
        application/xhtml+xml
        application/font-woff
        application/font-woff2
        image/svg+xml;

    # --- Brotli (optional, enable only if supported) ---
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types
    #     text/plain
    #     text/css
    #     application/javascript
    #     application/json
    #     application/xml
    #     image/svg+xml
    #     font/woff2;

    # --- Proxy section (your app) ---
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        proxy_buffering off;          # Disable buffering to prevent pending JS/WS stalls
        proxy_request_buffering off;

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # --- Optional: Static file caching ---
    location ~* \\.(?:js|css|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri @backend;
    }

    location @backend {
        proxy_pass http://127.0.0.1:8082;
    }

    # --- Basic security headers ---
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
}`;

    // Create nginx sites-available directory if it doesn't exist
    const sitesAvailableDir = '/etc/nginx/sites-available';
    if (!fs.existsSync(sitesAvailableDir)) {
      fs.mkdirSync(sitesAvailableDir, { recursive: true });
    }

    // Write nginx configuration file
    const configPath = `${sitesAvailableDir}/${appUrl}.conf`;
    fs.writeFileSync(configPath, nginxConfig);

    return configPath;
  } catch (error) {
    console.error('❌ Error creating nginx config:', error);
    throw error;
  }
};

// Helper function to enable nginx site
const enableNginxSite = async (appUrl) => {
  try {
    const sitesEnabledDir = '/etc/nginx/sites-enabled';
    const configPath = `/etc/nginx/sites-available/${appUrl}.conf`;
    const symlinkPath = `${sitesEnabledDir}/${appUrl}.conf`;

    // Create sites-enabled directory if it doesn't exist
    if (!fs.existsSync(sitesEnabledDir)) {
      fs.mkdirSync(sitesEnabledDir, { recursive: true });
    }

    // Create symbolic link
    if (fs.existsSync(symlinkPath)) {
      fs.unlinkSync(symlinkPath); // Remove existing symlink
    }
    fs.symlinkSync(configPath, symlinkPath);

    return symlinkPath;
  } catch (error) {
    console.error('❌ Error enabling nginx site:', error);
    throw error;
  }
};

// Helper function to reload nginx
const reloadNginx = async (domain = 'unknown') => {
  try {
    logStep(domain, 'NGINX_RELOAD_START', 'Attempting to reload nginx');
    
    // Try different nginx reload commands
    try {
      logStep(domain, 'NGINX_RELOAD_SYSTEMCTL', 'Trying systemctl reload nginx');
      await execAsync('systemctl reload nginx');
      logStep(domain, 'NGINX_RELOAD_SYSTEMCTL_SUCCESS', 'systemctl reload nginx succeeded');
    } catch (systemctlError) {
      logStep(domain, 'NGINX_RELOAD_SYSTEMCTL_FAILED', 'systemctl reload nginx failed, trying service command', systemctlError);
      try {
        logStep(domain, 'NGINX_RELOAD_SERVICE', 'Trying service nginx reload');
        await execAsync('service nginx reload');
        logStep(domain, 'NGINX_RELOAD_SERVICE_SUCCESS', 'service nginx reload succeeded');
      } catch (serviceError) {
        logStep(domain, 'NGINX_RELOAD_SERVICE_FAILED', 'service nginx reload failed, trying nginx -s reload', serviceError);
        try {
          logStep(domain, 'NGINX_RELOAD_DIRECT', 'Trying nginx -s reload');
          await execAsync('nginx -s reload');
          logStep(domain, 'NGINX_RELOAD_DIRECT_SUCCESS', 'nginx -s reload succeeded');
        } catch (nginxError) {
          logStep(domain, 'NGINX_RELOAD_DIRECT_FAILED', 'nginx -s reload failed, trying systemctl restart', nginxError);
          // If all fail, try to restart nginx
          logStep(domain, 'NGINX_RESTART', 'Trying systemctl restart nginx');
          await execAsync('systemctl restart nginx');
          logStep(domain, 'NGINX_RESTART_SUCCESS', 'systemctl restart nginx succeeded');
        }
      }
    }
  } catch (error) {
    logStep(domain, 'NGINX_RELOAD_FAILED', 'All nginx reload methods failed', error);
    console.error('❌ Error reloading nginx:', error);
    throw error;
  }
};

// Helper function to setup SSL with certbot
const setupSSL = async (appUrl, email = 'admin@example.com') => {
  try {
    logStep(appUrl, 'SSL_START', 'Starting SSL certificate setup with certbot');
    
    // Run certbot with non-interactive flags
    const certbotCommand = `certbot --nginx -d ${appUrl} --non-interactive --agree-tos --email ${email} --redirect`;
    logStep(appUrl, 'CERTBOT_COMMAND', `Running: ${certbotCommand}`);
    
    const result = await execAsync(certbotCommand);
    logStep(appUrl, 'CERTBOT_SUCCESS', 'Certbot command executed successfully');
    
    if (result.stdout) {
      logStep(appUrl, 'CERTBOT_OUTPUT', `Certbot output: ${result.stdout}`);
    }
    
    // Reload nginx after SSL setup
    logStep(appUrl, 'NGINX_RELOAD_SSL', 'Reloading nginx after SSL setup');
    await reloadNginx(appUrl);
    logStep(appUrl, 'NGINX_RELOAD_SSL_SUCCESS', 'Nginx reloaded successfully after SSL setup');
    
  } catch (error) {
    logStep(appUrl, 'SSL_ERROR', 'SSL certificate setup failed', error);
    
    // Log detailed error information
    if (error.stdout) {
      logStep(appUrl, 'CERTBOT_STDOUT', `Certbot stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      logStep(appUrl, 'CERTBOT_STDERR', `Certbot stderr: ${error.stderr}`);
    }
    
    console.error('❌ Error setting up SSL:', error);
    throw error;
  }
};

// Logging helper function
const logStep = (domain, step, message, error = null) => {
  console.log(`🔧 LOGSTEP CALLED: domain=${domain}, step=${step}, message=${message}`);
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    domain,
    step,
    message,
    error: error ? error.message : null,
    status: error ? 'ERROR' : 'SUCCESS'
  };

  console.log(`[${domain}] ${step}: ${message}${error ? ` - ERROR: ${error.message}` : ''}`);

  // Store log in memory (in production, you might want to use a database)
  if (!global.resellerLogs) {
    global.resellerLogs = new Map();
    console.log('🔧 Initialized global.resellerLogs Map');
  }

  if (!global.resellerLogs.has(domain)) {
    global.resellerLogs.set(domain, []);
    console.log(`🔧 Created log array for domain: ${domain}`);
  }

  global.resellerLogs.get(domain).push(logEntry);
  console.log(`🔧 Added log entry for ${domain}. Total logs: ${global.resellerLogs.get(domain).length}`);

  // Keep only last 100 logs per domain
  const logs = global.resellerLogs.get(domain);
  if (logs.length > 100) {
    logs.splice(0, logs.length - 100);
  }
};

// Main function to setup nginx and SSL for a reseller
const setupResellerNginx = async (appUrl, billingEmail = 'admin@example.com') => {
  try {
    logStep(appUrl, 'START', 'Starting nginx and SSL setup');
    
    // Step 1: Create nginx configuration
    try {
      await createNginxConfig(appUrl);
      logStep(appUrl, 'NGINX_CONFIG', 'Nginx configuration created successfully');
    } catch (error) {
      logStep(appUrl, 'NGINX_CONFIG', 'Failed to create nginx configuration', error);
      throw error;
    }
    
    // Step 2: Enable the site
    try {
      await enableNginxSite(appUrl);
      logStep(appUrl, 'NGINX_ENABLE', 'Nginx site enabled successfully');
    } catch (error) {
      logStep(appUrl, 'NGINX_ENABLE', 'Failed to enable nginx site', error);
      throw error;
    }
    
    // Step 3: Reload nginx
    try {
      await reloadNginx(appUrl);
      logStep(appUrl, 'NGINX_RELOAD', 'Nginx reloaded successfully');
    } catch (error) {
      logStep(appUrl, 'NGINX_RELOAD', 'Failed to reload nginx', error);
      throw error;
    }
    
    // Step 4: Setup SSL (with error handling - don't break if SSL fails)
    try {
      await setupSSL(appUrl, billingEmail);
      logStep(appUrl, 'SSL_SETUP', 'SSL certificate setup completed successfully');
    } catch (sslError) {
      logStep(appUrl, 'SSL_SETUP', 'SSL certificate setup failed', sslError);
      console.error('⚠️ SSL setup failed (non-blocking):', sslError.message);
    }
  } catch (nginxError) {
    logStep(appUrl, 'NGINX_SETUP_FAILED', 'Nginx setup failed, but continuing with SSL setup', nginxError);
    console.error('⚠️ Nginx setup failed, but continuing with SSL setup:', nginxError.message);
    
    // Even if nginx setup fails, try SSL setup to show certbot errors
    try {
      await setupSSL(appUrl, billingEmail);
      logStep(appUrl, 'SSL_SETUP_AFTER_NGINX_FAIL', 'SSL certificate setup completed after nginx failure');
    } catch (sslError) {
      logStep(appUrl, 'SSL_SETUP_AFTER_NGINX_FAIL', 'SSL certificate setup failed after nginx failure', sslError);
      console.error('⚠️ SSL setup failed after nginx failure:', sslError.message);
    }
    
    logStep(appUrl, 'COMPLETE', 'Nginx and SSL setup completed');
  }
};

// Helper function to disable nginx site
const disableNginxSite = async (appUrl) => {
  try {
    const enabledPath = `/etc/nginx/sites-enabled/${appUrl}.conf`;
    if (fs.existsSync(enabledPath)) {
      await execAsync(`rm -f ${enabledPath}`);
    } else {
    }
  } catch (error) {
    console.error(`❌ Error disabling nginx site ${appUrl}:`, error);
    throw error;
  }
};

// Helper function to remove nginx configuration
const removeNginxConfig = async (appUrl) => {
  try {
    const configPath = `/etc/nginx/sites-available/${appUrl}.conf`;
    if (fs.existsSync(configPath)) {
      await execAsync(`rm -f ${configPath}`);
    } else {
    }
  } catch (error) {
    console.error(`❌ Error removing nginx config ${appUrl}:`, error);
    throw error;
  }
};

// Helper function to cleanup nginx for deleted reseller
const cleanupResellerNginx = async (appUrl) => {
  try {

    // Step 1: Disable the site
    await disableNginxSite(appUrl);

    // Step 2: Remove the configuration file
    await removeNginxConfig(appUrl);

    // Step 3: Reload nginx
    await reloadNginx();

  } catch (error) {
    console.error('❌ Error in nginx cleanup (non-blocking):', error.message);
    // Don't throw - this is non-blocking
  }
};

// Helper function to update existing nginx configs with new template
const updateExistingNginxConfigs = async () => {
  try {
    console.log('🔄 Updating existing nginx configurations with new template...');
    
    const sitesAvailableDir = '/etc/nginx/sites-available';
    if (!fs.existsSync(sitesAvailableDir)) {
      console.log('⚠️ No sites-available directory found, skipping nginx update');
      return;
    }

    const files = fs.readdirSync(sitesAvailableDir);
    const resellerConfigs = files.filter(file => file.endsWith('.conf') && file.startsWith('reseller_'));
    
    console.log(`📁 Found ${resellerConfigs.length} existing reseller nginx configs to update`);
    
    for (const configFile of resellerConfigs) {
      try {
        // Extract appUrl from filename (assuming format: reseller_appUrl.conf or similar)
        const appUrl = configFile.replace('.conf', '');
        
        // Read current config to check if it needs updating
        const currentConfigPath = path.join(sitesAvailableDir, configFile);
        const currentConfig = fs.readFileSync(currentConfigPath, 'utf8');
        
        // Check if it's the old template (doesn't have gzip or performance optimizations)
        if (!currentConfig.includes('gzip on') || !currentConfig.includes('sendfile off')) {
          console.log(`🔄 Updating nginx config for: ${appUrl}`);
          
          // Create new config with updated template
          await createNginxConfig(appUrl);
          
          // Reload nginx
          await reloadNginx(appUrl);
          
          console.log(`✅ Updated nginx config for: ${appUrl}`);
        } else {
          console.log(`⏭️ Config for ${appUrl} already up to date`);
        }
      } catch (fileError) {
        console.error(`❌ Error updating config ${configFile}:`, fileError.message);
      }
    }
    
    console.log('✅ Nginx configuration update completed');
  } catch (error) {
    console.error('❌ Error updating existing nginx configs:', error);
  }
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
    fileSize: 2048 * 1024, // 2MB limit (2048KB)
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

// GET endpoint for listing resellers (filtered by currentUrl and parentUserId)
app.post('/api/resellers/list', async (req, res) => {
  try {
    const { parentUserId, currentDomain } = req.body;
    
    if (!parentUserId) {
      return res.status(400).json({
        error: 'parentUserId is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!currentDomain) {
      return res.status(400).json({
        error: 'currentDomain is required',
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
        // Parse filename to extract components
        // New pattern: reseller_{currentUrl}_{appUrl}_{parentUserId}_{resellerId}.json
        // Old pattern: reseller_{appUrl}_{parentUserId}_{resellerId}.json (for backward compatibility)
        const filenameParts = jsonFile.replace('.json', '').split('_');
        
        if (filenameParts.length >= 4 && filenameParts[0] === 'reseller') {
          let fileCurrentUrl, fileAppUrl, fileParentUserId, fileResellerId;
          
          if (filenameParts.length === 5) {
            // New pattern: reseller_{currentUrl}_{appUrl}_{parentUserId}_{resellerId}.json
            fileCurrentUrl = filenameParts[1];
            fileAppUrl = filenameParts[2];
            fileParentUserId = filenameParts[3];
            fileResellerId = filenameParts[4];
          } else if (filenameParts.length === 4) {
            // Old pattern: reseller_{appUrl}_{parentUserId}_{resellerId}.json (backward compatibility)
            fileCurrentUrl = null; // No currentUrl in old pattern
            fileAppUrl = filenameParts[1];
            fileParentUserId = filenameParts[2];
            fileResellerId = filenameParts[3];
          } else {
            continue; // Skip invalid filename patterns
          }
          
          // Filter by both currentDomain and parentUserId
          const matchesParentUserId = fileParentUserId === parentUserId.toString();
          const matchesCurrentDomain = !fileCurrentUrl || fileCurrentUrl === currentDomain;
          
          if (matchesParentUserId && matchesCurrentDomain) {
            const filePath = path.join(dataDir, jsonFile);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const resellerData = JSON.parse(fileContent);
            
            // Add filename info for reference
            resellerData.filename = jsonFile;
            resellerData.fileCurrentUrl = fileCurrentUrl;
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

// Domain checker endpoint
app.post('/api/check-domain', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Domain is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await checkDomainPropagation(domain);
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error checking domain:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST endpoint for resellers data
app.post('/api/resellers', upload.any(), async (req, res) => {
  try {
    console.log('🔧 POST /api/resellers called');
    console.log('🔧 Request body:', req.body);
    
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
    
    // Process images if provided (after validation passes)
    let imageUrl = body.logotype || '';
    let faviconUrl = '';
    let appImageUrl = '';
    let notificationIconUrl = '';
    
    if (req.files && req.files.length > 0) {
      try {
          const appUrl = req.body.appUrl;
          const parentUserId = req.body.parentUserId;
          const resellerId = req.body.resellerId;
        const timestamp = Date.now();
        
        // Process main logo image
        const imageFile = req.files.find(file => file.fieldname === 'image');
        if (imageFile) {
          const imageFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}.png`;
          const imagesDir = IMAGES_DIR;
          const imagePath = path.join(imagesDir, imageFilename);
          
          // Move uploaded file to final location
          fs.renameSync(imageFile.path, imagePath);
          
          // Update logotype with relative path
          imageUrl = `images/${imageFilename}`;
          body.logotype = imageUrl;
        }
        
        // Process favicon image
        const faviconFile = req.files.find(file => file.fieldname === 'favicon');
        if (faviconFile) {
          const faviconFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}_favicon.png`;
          const imagesDir = IMAGES_DIR;
          const faviconPath = path.join(imagesDir, faviconFilename);
          
          // Move uploaded file to final location
          fs.renameSync(faviconFile.path, faviconPath);
          
          // Update favicon with relative path
          faviconUrl = `images/${faviconFilename}`;
          body.favicon = faviconUrl;
        }
        
        // Process app image
        const appImageFile = req.files.find(file => file.fieldname === 'appImage');
        if (appImageFile) {
          const appImageFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}_appImage.png`;
          const imagesDir = IMAGES_DIR;
          const appImagePath = path.join(imagesDir, appImageFilename);
          
          // Move uploaded file to final location
          fs.renameSync(appImageFile.path, appImagePath);
          
          // Update app image with relative path
          appImageUrl = `images/${appImageFilename}`;
          body.appImage = appImageUrl;
        }
        
        // Process notification icon
        const notificationIconFile = req.files.find(file => file.fieldname === 'notificationIcon');
        if (notificationIconFile) {
          const notificationIconFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}_notificationIcon.png`;
          const imagesDir = IMAGES_DIR;
          const notificationIconPath = path.join(imagesDir, notificationIconFilename);
          
          // Move uploaded file to final location
          fs.renameSync(notificationIconFile.path, notificationIconPath);
          
          // Update notification icon with relative path
          notificationIconUrl = `images/${notificationIconFilename}`;
          body.notificationIcon = notificationIconUrl;
        }
        
      } catch (imageError) {
        console.error('❌ Error processing images:', imageError);
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
        const imageFilename = `reseller_${body.currentDomain}_${body.appUrl}_${body.parentUserId}_${body.resellerId}_${Date.now()}.png`;
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
      // Create filename: reseller_{currentDomain}_{appUrl}_{parentUserId}_{resellerId}.json
      const filename = `reseller_${body.currentDomain}_${body.appUrl}_${body.parentUserId}_${body.resellerId}.json`;
      
      // Data directory is ensured to exist at startup
      const dataDir = DATA_DIR;
      
      // Full file path
      const filePath = path.join(dataDir, filename);
      
      // Add metadata to the data
      const fileData = {
        ...body,
        logotype: imageUrl, // Use processed image URL
        favicon: faviconUrl, // Add favicon URL
        appImage: appImageUrl, // Add app image URL
        notificationIcon: notificationIconUrl, // Add notification icon URL
        savedAt: new Date().toISOString(),
        filename: filename
      };
      
      // Write JSON file
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
      
      // Log reseller creation
      logStep(body.appUrl, 'RESELLER_CREATED', `Reseller created successfully for domain: ${body.appUrl}`);
      
      // Setup nginx configuration and SSL (non-blocking)
      setupResellerNginx(body.appUrl, body.billingEmail || 'admin@example.com');
      
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
app.put('/api/resellers/:id', upload.any(), async (req, res) => {
    try {
        const { id } = req.params;
        let body;
        
        // Check if request is FormData (with images) or JSON
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            // Handle FormData - use individual fields from form data
            body = {
                currentDomain: req.body.currentDomain,
                parentUserId: req.body.parentUserId,
                parentUser: req.body.parentUser,
                parentEmail: req.body.parentEmail,
                resellerId: req.body.resellerId,
                resellerUser: req.body.resellerUser,
                resellerEmail: req.body.resellerEmail,
                companyName: req.body.companyName,
                logotype: req.body.logotype || '',
                appUrl: req.body.appUrl,
                whatsapp: req.body.whatsapp,
                billingEmail: req.body.billingEmail,
                supportEmail: req.body.supportEmail,
                resellerLimit: parseInt(req.body.resellerLimit) || 0,
                deviceLimit: parseInt(req.body.deviceLimit) || 0,
                userLimit: parseInt(req.body.userLimit) || 0,
                status: req.body.status || 'active',
                favicon: req.body.favicon || '',
                appImage: req.body.appImage || '',
                notificationIcon: req.body.notificationIcon || ''
            };
        } else {
            // Handle JSON request
            body = req.body;
        }
        
        
        // Find existing reseller first
        const dataDir = DATA_DIR;
        const jsonFiles = await glob('*.json', { cwd: dataDir });
        
        let existingReseller = null;
        let existingResellerFile = null;
        
        for (const jsonFile of jsonFiles) {
            try {
                const filenameParts = jsonFile.replace('.json', '').split('_');
                
                if (filenameParts.length >= 4 && filenameParts[0] === 'reseller') {
                    let fileCurrentUrl, fileAppUrl, fileParentUserId, fileResellerId;
                    
                    if (filenameParts.length === 5) {
                        // New pattern: reseller_{currentUrl}_{appUrl}_{parentUserId}_{resellerId}.json
                        fileCurrentUrl = filenameParts[1];
                        fileAppUrl = filenameParts[2];
                        fileParentUserId = filenameParts[3];
                        fileResellerId = filenameParts[4];
                    } else if (filenameParts.length === 4) {
                        // Old pattern: reseller_{appUrl}_{parentUserId}_{resellerId}.json (backward compatibility)
                        fileCurrentUrl = null;
                        fileAppUrl = filenameParts[1];
                        fileParentUserId = filenameParts[2];
                        fileResellerId = filenameParts[3];
                    } else {
                        continue; // Skip invalid filename patterns
                    }
                    
                    // Check if this file matches the update request
                    const matchesParentUserId = fileParentUserId === body.parentUserId.toString();
                    const matchesResellerId = fileResellerId === body.resellerId;
                    const matchesCurrentDomain = !fileCurrentUrl || fileCurrentUrl === body.currentDomain;
                    const matchesAppUrl = fileAppUrl === body.appUrl;
                    
                    if (matchesParentUserId && matchesResellerId && matchesCurrentDomain && matchesAppUrl) {
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

        // Process images if provided
        let imageUrl = body.logotype || existingReseller.logotype || '';
        let faviconUrl = body.favicon || existingReseller.favicon || '';
        let appImageUrl = body.appImage || existingReseller.appImage || '';
        let notificationIconUrl = body.notificationIcon || existingReseller.notificationIcon || '';
        
        if (req.files && req.files.length > 0) {
            try {
                const appUrl = req.body.appUrl;
                const parentUserId = req.body.parentUserId;
                const resellerId = req.body.resellerId;
                const timestamp = Date.now();
                
                // Process main logo image
                const imageFile = req.files.find(file => file.fieldname === 'image');
                if (imageFile) {
                    const imageFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}.png`;
                    const imagesDir = IMAGES_DIR;
                    const imagePath = path.join(imagesDir, imageFilename);
                    
                    // Move uploaded file to final location
                    fs.renameSync(imageFile.path, imagePath);
                    
                    // Update logotype with relative path
                    imageUrl = `images/${imageFilename}`;
                }
                
                // Process favicon image
                const faviconFile = req.files.find(file => file.fieldname === 'favicon');
                if (faviconFile) {
                    const faviconFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}_favicon.png`;
                    const imagesDir = IMAGES_DIR;
                    const faviconPath = path.join(imagesDir, faviconFilename);
                    
                    // Move uploaded file to final location
                    fs.renameSync(faviconFile.path, faviconPath);
                    
                    // Update favicon with relative path
                    faviconUrl = `images/${faviconFilename}`;
                }
                
                // Process app image
                const appImageFile = req.files.find(file => file.fieldname === 'appImage');
                if (appImageFile) {
                    const appImageFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}_appImage.png`;
                    const imagesDir = IMAGES_DIR;
                    const appImagePath = path.join(imagesDir, appImageFilename);
                    
                    // Move uploaded file to final location
                    fs.renameSync(appImageFile.path, appImagePath);
                    
                    // Update app image with relative path
                    appImageUrl = `images/${appImageFilename}`;
                }
                
                // Process notification icon
                const notificationIconFile = req.files.find(file => file.fieldname === 'notificationIcon');
                if (notificationIconFile) {
                    const notificationIconFilename = `reseller_${body.currentDomain}_${appUrl}_${parentUserId}_${resellerId}_${timestamp}_notificationIcon.png`;
                    const imagesDir = IMAGES_DIR;
                    const notificationIconPath = path.join(imagesDir, notificationIconFilename);
                    
                    // Move uploaded file to final location
                    fs.renameSync(notificationIconFile.path, notificationIconPath);
                    
                    // Update notification icon with relative path
                    notificationIconUrl = `images/${notificationIconFilename}`;
                }
                
            } catch (imageError) {
                console.error('❌ Error processing images during update:', imageError);
                return res.status(500).json({
                    error: 'Image processing failed',
                    message: imageError.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Merge with existing data - keep old values if new ones are empty
        const updatedData = {
            ...existingReseller,
            ...body,
            // Use processed image URLs
            logotype: imageUrl,
            favicon: faviconUrl,
            appImage: appImageUrl,
            notificationIcon: notificationIconUrl,
            // Keep old appUrl if new one is empty
            appUrl: body.appUrl && body.appUrl.trim() !== '' ? body.appUrl : existingReseller.appUrl,
            updatedAt: new Date().toISOString()
        };

        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Create filename for the reseller (use merged data)
        const filename = `reseller_${updatedData.currentDomain}_${updatedData.appUrl}_${updatedData.parentUserId}_${updatedData.resellerId}.json`;
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
        
        // Log reseller update
        logStep(updatedData.appUrl, 'RESELLER_UPDATED', `Reseller updated successfully for domain: ${updatedData.appUrl}`);
        
        // Setup nginx configuration and SSL if appUrl was updated (non-blocking)
        if (body.appUrl && body.appUrl.trim() !== '' && body.appUrl !== existingReseller.appUrl) {
          setupResellerNginx(body.appUrl, body.billingEmail || existingReseller.billingEmail || 'admin@example.com');
        }

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

// GET endpoint for reseller logs
app.post('/api/resellers/logs', async (req, res) => {
  try {
    const { domain } = req.body;

    console.log(`🔍 Logs request for domain: ${domain}`);
    console.log(`🔍 global.resellerLogs exists: ${!!global.resellerLogs}`);

    if (!domain) {
      return res.status(400).json({
        error: 'domain is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get logs for the domain
    const logs = global.resellerLogs ? global.resellerLogs.get(domain) || [] : [];
    console.log(`🔍 Found ${logs.length} logs for domain: ${domain}`);

    if (global.resellerLogs) {
      console.log(`🔍 All domains in logs: ${Array.from(global.resellerLogs.keys())}`);
    }

    // Sort logs by timestamp (newest first)
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      domain: domain,
      logs: sortedLogs,
      count: sortedLogs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching reseller logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE endpoint for reseller logs
app.post('/api/resellers/logs/delete', async (req, res) => {
  try {
    const { domain } = req.body;

    console.log(`🗑️ Delete logs request for domain: ${domain}`);

    if (!domain) {
      return res.status(400).json({
        error: 'domain is required',
        timestamp: new Date().toISOString()
      });
    }

    // Delete logs for the domain
    if (global.resellerLogs && global.resellerLogs.has(domain)) {
      global.resellerLogs.delete(domain);
      console.log(`🗑️ Deleted logs for domain: ${domain}`);
      
      res.json({
        success: true,
        message: `Logs deleted for domain: ${domain}`,
        domain: domain,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`🗑️ No logs found for domain: ${domain}`);
      
      res.json({
        success: true,
        message: `No logs found for domain: ${domain}`,
        domain: domain,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error deleting reseller logs:', error);
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
    const { currentDomain, appUrl, parentUserId } = req.body;
    
    if (!currentDomain || !appUrl || !parentUserId) {
      return res.status(400).json({
        error: 'currentDomain, appUrl and parentUserId are required',
        timestamp: new Date().toISOString()
      });
    }


    // Find the reseller file that matches both currentDomain and parentUserId
    const dataDir = DATA_DIR;
    const jsonFiles = await glob('*.json', { cwd: dataDir });
    
    let resellerFile = null;
    let resellerData = null;
    
    for (const jsonFile of jsonFiles) {
      try {
        // Parse filename to extract components
        const filenameParts = jsonFile.replace('.json', '').split('_');
        
        if (filenameParts.length >= 4 && filenameParts[0] === 'reseller') {
          let fileCurrentUrl, fileAppUrl, fileParentUserId;
          
          if (filenameParts.length === 5) {
            // New pattern: reseller_{currentUrl}_{appUrl}_{parentUserId}_{resellerId}.json
            fileCurrentUrl = filenameParts[1];
            fileAppUrl = filenameParts[2];
            fileParentUserId = filenameParts[3];
          } else if (filenameParts.length === 4) {
            // Old pattern: reseller_{appUrl}_{parentUserId}_{resellerId}.json (backward compatibility)
            fileCurrentUrl = null;
            fileAppUrl = filenameParts[1];
            fileParentUserId = filenameParts[2];
          } else {
            continue; // Skip invalid filename patterns
          }
          
          // Check if this file matches the delete request
          const matchesParentUserId = fileParentUserId === parentUserId.toString();
          const matchesCurrentDomain = !fileCurrentUrl || fileCurrentUrl === currentDomain;
          const matchesAppUrl = fileAppUrl === appUrl;
          
          if (matchesParentUserId && matchesCurrentDomain && matchesAppUrl) {
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
        message: `No reseller found with currentDomain '${currentDomain}', appUrl '${appUrl}' for user '${parentUserId}'`,
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
      }
    }

    // Cleanup nginx configuration for the deleted reseller
    try {
      await cleanupResellerNginx(resellerData.appUrl);
    } catch (cleanupError) {
      console.error('❌ Error during nginx cleanup (non-blocking):', cleanupError);
      // Don't fail the delete operation if cleanup fails
    }

    // Cleanup generated apps and source code for the deleted reseller
    try {
      console.log(`🧹 Cleaning up generated apps and source code for reseller: ${resellerData.appUrl}`);
      
      const cleanedFiles = [];
      const errors = [];

      // Clean APK file
      const apkPath = path.join(DATA_DIR, `${resellerData.appUrl}.apk`);
      if (fs.existsSync(apkPath)) {
        try {
          fs.unlinkSync(apkPath);
          cleanedFiles.push('APK');
          console.log(`✅ Deleted APK: ${apkPath}`);
        } catch (error) {
          errors.push(`Failed to delete APK: ${error.message}`);
          console.error(`❌ Error deleting APK:`, error);
        }
      }

      // Clean AAB file
      const aabPath = path.join(DATA_DIR, `${resellerData.appUrl}.aab`);
      if (fs.existsSync(aabPath)) {
        try {
          fs.unlinkSync(aabPath);
          cleanedFiles.push('AAB');
          console.log(`✅ Deleted AAB: ${aabPath}`);
        } catch (error) {
          errors.push(`Failed to delete AAB: ${error.message}`);
          console.error(`❌ Error deleting AAB:`, error);
        }
      }

      // Clean source code directory
      const files = fs.readdirSync(DATA_DIR);
      const matchingDirs = files.filter(file => {
        const fullPath = path.join(DATA_DIR, file);
        return fs.statSync(fullPath).isDirectory() && file.includes(resellerData.appUrl) && file.includes(resellerData.resellerId);
      });

      for (const dir of matchingDirs) {
        const dirPath = path.join(DATA_DIR, dir);
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          cleanedFiles.push(`Source code (${dir})`);
          console.log(`✅ Deleted source directory: ${dirPath}`);
        } catch (error) {
          errors.push(`Failed to delete source directory ${dir}: ${error.message}`);
          console.error(`❌ Error deleting source directory:`, error);
        }
      }

      if (cleanedFiles.length > 0) {
        console.log(`✅ Cleaned up: ${cleanedFiles.join(', ')}`);
      }
      if (errors.length > 0) {
        console.error(`⚠️ Cleanup errors: ${errors.join(', ')}`);
      }
    } catch (cleanupError) {
      console.error('❌ Error during app cleanup (non-blocking):', cleanupError);
      // Don't fail the delete operation if cleanup fails
    }

    res.json({
      success: true,
      message: `Reseller '${resellerData.companyName}' deleted successfully`,
      deletedFiles: {
        json: resellerFile,
        image: resellerData.logotype || 'none',
        nginx: `${resellerData.appUrl}.conf`
      },
      cleanup: {
        nginx: 'Configuration removed and nginx reloaded',
        domain: resellerData.appUrl
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

// Async function to handle Flutter build process
async function buildFlutterApp(resellerDirPath, resellerData, resellerDirName, buildType = 'apk') {
  try {
    console.log(`🔨 Starting Flutter build process for ${buildType.toUpperCase()}...`);
    const buildDir = path.join(resellerDirPath, 'build');
    
    // Clean previous build
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }

                // Clean and initialize Flutter project first
                console.log('🧹 Cleaning Flutter project...');
                await execAsync(`cd "${resellerDirPath}" && flutter clean`, { timeout: 60000 }); // 1 minute
                console.log('✅ Flutter project cleaned');
                
                console.log('🔧 Initializing Flutter project...');
                await execAsync(`cd "${resellerDirPath}" && flutter pub get`, { timeout: 300000 }); // 5 minutes
                console.log('✅ Flutter project initialized');

    // Run Flutter build based on requested type
    if (buildType === 'apk') {
      console.log('📱 Building APK...');
      await execAsync(`cd "${resellerDirPath}" && flutter build apk --release --target-platform android-arm,android-arm64,android-x64`, { timeout: 2400000 }); // 40 minutes
      console.log('✅ APK build completed');
    } else if (buildType === 'aab') {
      console.log('📦 Building AAB...');
      await execAsync(`cd "${resellerDirPath}" && flutter build appbundle --release`, { timeout: 2400000 }); // 40 minutes
      console.log('✅ AAB build completed');
    } else if (buildType === 'ios_simulator') {
      console.log('🍎 Building iOS for Simulator...');
      await execAsync(`cd "${resellerDirPath}" && flutter build ios --debug --simulator`, { timeout: 2400000 }); // 40 minutes
      console.log('✅ iOS Simulator build completed');
    } else if (buildType === 'ios_device') {
      console.log('🍎 Building iOS for Physical Device...');
      await execAsync(`cd "${resellerDirPath}" && flutter build ios --release --no-codesign`, { timeout: 2400000 }); // 40 minutes
      console.log('✅ iOS Device build completed');
    } else if (buildType === 'ios') {
      // Default to simulator for backward compatibility
      console.log('🍎 Building iOS for Simulator (default)...');
      await execAsync(`cd "${resellerDirPath}" && flutter build ios --debug --simulator`, { timeout: 2400000 }); // 40 minutes
      console.log('✅ iOS build completed');
    } else {
      // Build all if no specific type requested
      console.log('📱 Building APK...');
      await execAsync(`cd "${resellerDirPath}" && flutter build apk --release --target-platform android-arm,android-arm64,android-x64`, { timeout: 2400000 });
      console.log('✅ APK build completed');

      console.log('📦 Building AAB...');
      await execAsync(`cd "${resellerDirPath}" && flutter build appbundle --release`, { timeout: 2400000 });
      console.log('✅ AAB build completed');

      console.log('🍎 Building iOS for Simulator...');
      await execAsync(`cd "${resellerDirPath}" && flutter build ios --debug --simulator`, { timeout: 2400000 });
      console.log('✅ iOS build completed');
    }

    // Rename output files based on what was built
    if (buildType === 'apk' || buildType === 'both') {
      const apkSourcePath = path.join(resellerDirPath, 'build/app/outputs/flutter-apk/app-release.apk');
      const apkTargetPath = path.join(DATA_DIR, `${resellerData.appUrl}.apk`);
      
      if (fs.existsSync(apkSourcePath)) {
        fs.copyFileSync(apkSourcePath, apkTargetPath);
        console.log('✅ APK renamed to:', apkTargetPath);
      } else {
        console.log('❌ APK file not found after build');
      }
    }
    
    if (buildType === 'aab' || buildType === 'both') {
      const aabSourcePath = path.join(resellerDirPath, 'build/app/outputs/bundle/release/app-release.aab');
      const aabTargetPath = path.join(DATA_DIR, `${resellerData.appUrl}.aab`);
      
      if (fs.existsSync(aabSourcePath)) {
        fs.copyFileSync(aabSourcePath, aabTargetPath);
        console.log('✅ AAB renamed to:', aabTargetPath);
      } else {
        console.log('❌ AAB file not found after build');
      }
    }
    
    if (buildType === 'ios' || buildType === 'ios_simulator' || buildType === 'ios_device' || buildType === 'both') {
      // Determine the correct source path based on build type
      let iosSourcePath;
      if (buildType === 'ios_simulator' || buildType === 'ios') {
        // Simulator builds go to iphonesimulator directory
        iosSourcePath = path.join(resellerDirPath, 'build/ios/iphonesimulator/Runner.app');
      } else {
        // Device builds go to iphoneos directory
        iosSourcePath = path.join(resellerDirPath, 'build/ios/iphoneos/Runner.app');
      }
      
      const iosTargetPath = path.join(DATA_DIR, `${resellerData.appUrl}.app`);
      
      if (fs.existsSync(iosSourcePath)) {
        // Copy the entire .app bundle
        await new Promise((resolve, reject) => {
          exec(`cp -r "${iosSourcePath}" "${iosTargetPath}"`, (error, stdout, stderr) => {
            if (error) {
              console.error('❌ Error copying iOS app:', error);
              reject(error);
            } else {
              console.log('✅ iOS app copied to:', iosTargetPath);
              resolve();
            }
          });
        });
      } else {
        console.log('❌ iOS app not found after build');
      }
    }

    // Clean up build directory to save space
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
      console.log('🧹 Build directory cleaned up');
    }

    console.log('🎉 Mobile app build process completed successfully!');
  } catch (error) {
    console.error('❌ Error in build process:', error);
  }
}

// POST endpoint for building mobile app with reseller data

// Function to copy and replace mobile app images (appImage and notificationIcon only)
async function copyAppImages(resellerDirPath, resellerData) {
  try {
    console.log('🖼️ Copying app images...');
    console.log('📋 Reseller data keys:', Object.keys(resellerData));
    console.log('🖼️ App image field:', resellerData.appImage);
    console.log('🔔 Notification icon field:', resellerData.notificationIcon);
    
    // Get image paths from reseller data
    const appImagePath = resellerData.appImage ? path.join(IMAGES_DIR, resellerData.appImage.replace('images/', '')) : null;
    const notificationIconPath = resellerData.notificationIcon ? path.join(IMAGES_DIR, resellerData.notificationIcon.replace('images/', '')) : null;
    
    console.log('📁 App image path:', appImagePath);
    console.log('📁 Notification icon path:', notificationIconPath);
    console.log('📁 App image exists:', appImagePath ? fs.existsSync(appImagePath) : false);
    console.log('📁 Notification icon exists:', notificationIconPath ? fs.existsSync(notificationIconPath) : false);
    
    if (!appImagePath || !fs.existsSync(appImagePath)) {
      console.log('⚠️ App image not found, using default');
      return;
    }
    
    // Android app icon replacement
    const androidResPath = path.join(resellerDirPath, 'android/app/src/main/res');
    const androidIconSizes = [
      { folder: 'mipmap-hdpi', size: 72 },
      { folder: 'mipmap-mdpi', size: 48 },
      { folder: 'mipmap-xhdpi', size: 96 },
      { folder: 'mipmap-xxhdpi', size: 144 },
      { folder: 'mipmap-xxxhdpi', size: 192 }
    ];
    
    for (const iconSize of androidIconSizes) {
      const targetPath = path.join(androidResPath, iconSize.folder, 'ic_launcher.png');
      console.log(`🔍 Checking target path: ${targetPath}`);
      console.log(`📁 Target exists: ${fs.existsSync(targetPath)}`);
      
      if (fs.existsSync(targetPath)) {
        // Resize and copy app image
        console.log(`🔄 Replacing Android ${iconSize.folder} icon...`);
        await resizeAndCopyImage(appImagePath, targetPath, iconSize.size, iconSize.size);
        console.log(`✅ Android ${iconSize.folder} icon updated`);
      } else {
        console.log(`⚠️ Target path does not exist: ${targetPath}`);
      }
    }
    
    // Android notification icon replacement
    if (notificationIconPath && fs.existsSync(notificationIconPath)) {
      const notificationIconSizes = [
        { folder: 'mipmap-hdpi', size: 24 },
        { folder: 'mipmap-mdpi', size: 18 },
        { folder: 'mipmap-xhdpi', size: 36 },
        { folder: 'mipmap-xxhdpi', size: 48 },
        { folder: 'mipmap-xxxhdpi', size: 64 }
      ];
      
      for (const iconSize of notificationIconSizes) {
        const targetPath = path.join(androidResPath, iconSize.folder, 'ic_stat_notify.png');
        if (fs.existsSync(targetPath)) {
          // Resize and copy notification icon
          await resizeAndCopyImage(notificationIconPath, targetPath, iconSize.size, iconSize.size);
          console.log(`✅ Android ${iconSize.folder} notification icon updated`);
        }
      }
    }
    
    // Android PNG image replacement (replace vector drawables with PNGs)
    console.log('🎨 Replacing Android vector drawables with PNG images...');
    
    // Replace ic_launcher_foreground.xml with reseller app image as PNG
    if (appImagePath && fs.existsSync(appImagePath)) {
      const launcherForegroundPath = path.join(androidResPath, 'drawable', 'ic_launcher_foreground.xml');
      const launcherPngPath = path.join(androidResPath, 'drawable', 'ic_launcher_foreground.png');
      
      if (fs.existsSync(launcherForegroundPath)) {
        // Copy reseller image as PNG and remove the XML vector drawable
        await resizeAndCopyImage(appImagePath, launcherPngPath, 108, 108);
        fs.unlinkSync(launcherForegroundPath); // Remove the XML file
        console.log('✅ Android launcher foreground replaced with PNG image');
      }
    }
    
    // Replace ic_stat_notify.xml with reseller notification icon as PNG
    if (notificationIconPath && fs.existsSync(notificationIconPath)) {
      const notificationDrawablePath = path.join(androidResPath, 'drawable', 'ic_stat_notify.xml');
      const notificationPngPath = path.join(androidResPath, 'drawable', 'ic_stat_notify.png');
      
      if (fs.existsSync(notificationDrawablePath)) {
        // Copy reseller notification icon as PNG and remove the XML vector drawable
        await resizeAndCopyImage(notificationIconPath, notificationPngPath, 24, 24);
        fs.unlinkSync(notificationDrawablePath); // Remove the XML file
        console.log('✅ Android notification icon replaced with PNG image');
      }
    }
    
    // iOS app icon replacement
    const iosAssetsPath = path.join(resellerDirPath, 'ios/Runner/Assets.xcassets/AppIcon.appiconset');
    const iosIconSizes = [
      { name: '20.png', size: 20 },
      { name: '29.png', size: 29 },
      { name: '40.png', size: 40 },
      { name: '50.png', size: 50 },
      { name: '57.png', size: 57 },
      { name: '58.png', size: 58 },
      { name: '60.png', size: 60 },
      { name: '72.png', size: 72 },
      { name: '76.png', size: 76 },
      { name: '80.png', size: 80 },
      { name: '87.png', size: 87 },
      { name: '100.png', size: 100 },
      { name: '114.png', size: 114 },
      { name: '120.png', size: 120 },
      { name: '144.png', size: 144 },
      { name: '152.png', size: 152 },
      { name: '167.png', size: 167 },
      { name: '180.png', size: 180 },
      { name: '1024.png', size: 1024 }
    ];
    
    for (const iconSize of iosIconSizes) {
      const targetPath = path.join(iosAssetsPath, iconSize.name);
      if (fs.existsSync(targetPath)) {
        // Resize and copy app image
        await resizeAndCopyImage(appImagePath, targetPath, iconSize.size, iconSize.size);
        console.log(`✅ iOS ${iconSize.name} icon updated`);
      }
    }
    
    console.log('✅ All app images copied successfully');
    
  } catch (error) {
    console.error('❌ Error copying app images:', error);
    throw error;
  }
}

// Function to resize and copy image
async function resizeAndCopyImage(sourcePath, targetPath, width, height) {
  try {
    console.log(`🔄 Resizing image: ${sourcePath} -> ${targetPath} (${width}x${height})`);
    
    const sharp = (await import('sharp')).default;
    
    // Resize and copy the image
    await sharp(sourcePath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(targetPath);
      
    console.log(`✅ Image resized and copied: ${width}x${height} -> ${targetPath}`);
  } catch (error) {
    console.error(`❌ Error resizing image from ${sourcePath} to ${targetPath}:`, error);
    // Fallback to simple copy if sharp fails
    try {
      console.log(`⚠️ Fallback: Copying image without resizing...`);
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`⚠️ Fallback: Image copied without resizing: ${targetPath}`);
    } catch (copyError) {
      console.error(`❌ Error copying image as fallback:`, copyError);
      throw copyError;
    }
  }
}

// Function to copy favicon for web app (browser tab icon only)
async function copyFaviconForWebApp(resellerData) {
  try {
    console.log('🌐 Copying favicon for web app (browser tab icon)...');
    
    if (!resellerData.favicon) {
      console.log('⚠️ No favicon provided, skipping web app favicon');
      return;
    }
    
    const faviconPath = path.join(IMAGES_DIR, resellerData.favicon.replace('images/', ''));
    
    if (!fs.existsSync(faviconPath)) {
      console.log('⚠️ Favicon file not found, skipping web app favicon');
      return;
    }
    
    // Copy favicon to web app public directory (browser tab icon only)
    const webAppFaviconPath = path.join(process.cwd(), 'public', 'favicon.ico');
    const webAppFaviconPngPath = path.join(process.cwd(), 'public', 'favicon.png');
    
    // Copy as both .ico and .png for better browser compatibility
    fs.copyFileSync(faviconPath, webAppFaviconPath);
    fs.copyFileSync(faviconPath, webAppFaviconPngPath);
    
    console.log('✅ Web app favicon updated (browser tab icon only)');
    console.log('ℹ️ Note: Web app logo (logotype) remains unchanged for main branding');
    
  } catch (error) {
    console.error('❌ Error copying favicon for web app:', error);
    // Don't throw error, this is not critical for the build process
  }
}

// STANDARDS: 
// - Keep original package name (org.traccar.manager) for Firebase compatibility
// - Only change visual elements: app display name, icons, descriptions
// - Use same google-services.json for all apps (Traccar server supports only one FCM key)
// - All apps must use same internal package structure for push notifications
app.post('/api/resellers/build', async (req, res) => {
  try {
    console.log('🏗️ Starting mobile app build process...');
    console.log('🔥 BUILD ENDPOINT CALLED - THIS IS THE UPDATED VERSION!');
    
    const resellerData = req.body;
    console.log('📋 Reseller data received:', {
      appUrl: resellerData.appUrl,
      companyName: resellerData.companyName,
      parentUserId: resellerData.parentUserId,
      resellerId: resellerData.resellerId
    });

    // Validate required fields
    if (!resellerData.appUrl || !resellerData.companyName || !resellerData.parentUserId || !resellerData.resellerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'appUrl, companyName, parentUserId, and resellerId are required',
        timestamp: new Date().toISOString()
      });
    }

    // Create reseller-specific directory name
    const resellerDirName = `reseller_${resellerData.currentDomain || 'gps'}_${resellerData.appUrl}_${resellerData.parentUserId}_${resellerData.resellerId}`;
    const resellerDirPath = path.join(DATA_DIR, resellerDirName);
    const sourceDir = path.join(__dirname, 'traccar-manager');
    
    console.log('📁 Source directory:', sourceDir);
    console.log('📁 Target directory:', resellerDirPath);

    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      return res.status(500).json({
        error: 'Source code not found',
        message: 'Mobile app source code directory not found',
        timestamp: new Date().toISOString()
      });
    }

    // Remove existing reseller directory if it exists
    if (fs.existsSync(resellerDirPath)) {
      console.log('🗑️ Removing existing directory...');
      try {
        // Try multiple approaches for stubborn directories
        await new Promise((resolve, reject) => {
          exec(`rm -rf "${resellerDirPath}"`, (error, stdout, stderr) => {
            if (error) {
              console.log('⚠️ First rm -rf failed, trying with force...');
              // Try with force flag
              exec(`rm -rf -f "${resellerDirPath}"`, (error2, stdout2, stderr2) => {
                if (error2) {
                  console.log('⚠️ Force rm -rf failed, trying find + rm...');
                  // Try find + rm approach
                  exec(`find "${resellerDirPath}" -type f -delete && find "${resellerDirPath}" -type d -empty -delete && rmdir "${resellerDirPath}" 2>/dev/null || true`, (error3, stdout3, stderr3) => {
                    if (error3) {
                      console.log('⚠️ Find approach failed, trying chmod + rm...');
                      // Try chmod + rm approach
                      exec(`chmod -R 777 "${resellerDirPath}" 2>/dev/null && rm -rf "${resellerDirPath}" 2>/dev/null || true`, (error4, stdout4, stderr4) => {
                        if (error4) {
                          console.error('❌ All removal methods failed:', error4);
                          reject(error4);
                        } else {
                          console.log('✅ Directory removed with chmod + rm');
                          resolve();
                        }
                      });
                    } else {
                      console.log('✅ Directory removed with find approach');
                      resolve();
                    }
                  });
                } else {
                  console.log('✅ Directory removed with force flag');
                  resolve();
                }
              });
            } else {
              console.log('✅ Directory removed successfully');
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('❌ Failed to remove directory:', error);
        throw error;
      }
    }

    // Create the reseller directory
    console.log('📁 Creating reseller directory...');
    fs.mkdirSync(resellerDirPath, { recursive: true });
    console.log('✅ Reseller directory created:', resellerDirPath);

    // Get build type from request body (default to 'apk')
    const buildType = resellerData.buildType || 'apk';
    
    // Return immediately to frontend
    res.json({
      success: true,
      message: 'Build process started successfully',
      data: {
        resellerDir: resellerDirName,
        status: 'BUILDING',
        timestamp: new Date().toISOString()
      }
    });
    
    // Start build process in background (don't await)
    console.log('🔨 Starting Flutter build process in background...');
    
    // Run the build process asynchronously
    (async () => {
      try {
    // Copy source code to reseller directory
    console.log('📋 Copying source code...');
    console.log('📁 Source dir contents:', fs.readdirSync(sourceDir));
    await execAsync(`cp -r "${sourceDir}"/* "${resellerDirPath}/"`);
    console.log('✅ Source code copied successfully');
    
    // Verify pubspec.yaml exists
    const pubspecPath = path.join(resellerDirPath, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
      console.log('✅ pubspec.yaml found in target directory');
    } else {
      console.error('❌ pubspec.yaml NOT found in target directory');
      console.log('📁 Target directory contents:', fs.readdirSync(resellerDirPath));
      throw new Error('pubspec.yaml not found after copy operation');
    }

    // Update app configuration files
    console.log('⚙️ Updating app configuration...');
    
    // Update pubspec.yaml (keep original package name for Firebase compatibility)
    // pubspecPath already declared above
    if (fs.existsSync(pubspecPath)) {
      let pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
      // Only update description, keep original package name for Firebase
      pubspecContent = pubspecContent.replace(/description: .*/, `description: ${resellerData.companyName} - GPS Tracking App`);
      fs.writeFileSync(pubspecPath, pubspecContent);
      console.log('✅ pubspec.yaml updated (description only)');
    }

    // Update Android app configuration (keep original package name for Firebase)
    const androidManifestPath = path.join(resellerDirPath, 'android/app/src/main/AndroidManifest.xml');
    if (fs.existsSync(androidManifestPath)) {
      let manifestContent = fs.readFileSync(androidManifestPath, 'utf8');
      // Only update display label, keep original package name for Firebase
      manifestContent = manifestContent.replace(/android:label="[^"]*"/, `android:label="${resellerData.companyName}"`);
          
          // Update notification icon to use PNG instead of vector drawable
          manifestContent = manifestContent.replace(
            /android:resource="@drawable\/ic_stat_notify"/,
            'android:resource="@drawable/ic_stat_notify"'
          );
          
      fs.writeFileSync(androidManifestPath, manifestContent);
          console.log('✅ AndroidManifest.xml updated (display name and PNG icons)');
    }

    // Update iOS app configuration
    const iosInfoPlistPath = path.join(resellerDirPath, 'ios/Runner/Info.plist');
    if (fs.existsSync(iosInfoPlistPath)) {
      let plistContent = fs.readFileSync(iosInfoPlistPath, 'utf8');
      plistContent = plistContent.replace(/<key>CFBundleDisplayName<\/key>\s*<string>.*?<\/string>/, 
        `<key>CFBundleDisplayName</key>\n\t<string>${resellerData.companyName}</string>`);
      plistContent = plistContent.replace(/<key>CFBundleName<\/key>\s*<string>.*?<\/string>/, 
        `<key>CFBundleName</key>\n\t<string>${resellerData.companyName}</string>`);
      fs.writeFileSync(iosInfoPlistPath, plistContent);
      console.log('✅ iOS Info.plist updated');
    }

    // Update branding configuration (keep original package name for Firebase)
    const brandDartPath = path.join(resellerDirPath, 'tool/brand.dart');
    if (fs.existsSync(brandDartPath)) {
      let brandContent = fs.readFileSync(brandDartPath, 'utf8');
      // Only update app name and URL, keep original package ID for Firebase
      brandContent = brandContent.replace(/const appName = '.*';/, `const appName = '${resellerData.companyName}';`);
      brandContent = brandContent.replace(/const url = ".*";/, `const url = "https://${resellerData.appUrl}";`);
          // Also update the RegExp pattern to match the reseller URL
          brandContent = brandContent.replace(
            /RegExp\(r'https:\/\/demo\.traccar\.org'\)/,
            `RegExp(r'https://${resellerData.appUrl}')`
          );
      fs.writeFileSync(brandDartPath, brandContent);
          console.log('✅ brand.dart updated (app name, URL, and RegExp pattern)');
        }

        // Update main_screen.dart to use reseller URL instead of demo.traccar.org
        const mainScreenPath = path.join(resellerDirPath, 'lib/main_screen.dart');
        if (fs.existsSync(mainScreenPath)) {
          let mainScreenContent = fs.readFileSync(mainScreenPath, 'utf8');
          // Replace the default demo URL with reseller URL
          mainScreenContent = mainScreenContent.replace(
            /return _preferences\.getString\(_urlKey\) \?\? 'https:\/\/demo\.traccar\.org';/,
            `return _preferences.getString(_urlKey) ?? 'https://${resellerData.appUrl}';`
          );
          fs.writeFileSync(mainScreenPath, mainScreenContent);
          console.log('✅ main_screen.dart updated with reseller URL');
        }

        // Update ic_launcher.xml to use PNG instead of vector drawable
        const icLauncherXmlPath = path.join(resellerDirPath, 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
        if (fs.existsSync(icLauncherXmlPath)) {
          let launcherXmlContent = fs.readFileSync(icLauncherXmlPath, 'utf8');
          // Replace vector drawable reference with PNG
          launcherXmlContent = launcherXmlContent.replace(
            /android:drawable="@drawable\/ic_launcher_foreground"/,
            'android:drawable="@drawable/ic_launcher_foreground"'
          );
          fs.writeFileSync(icLauncherXmlPath, launcherXmlContent);
          console.log('✅ ic_launcher.xml updated to use PNG foreground');
    }

    // Note: google-services.json is already in source code, no need to copy
    console.log('✅ Using existing google-services.json from source code');

    // Get complete reseller data from JSON file to access all image fields
    const resellerFilePath = path.join(DATA_DIR, `${resellerDirName}.json`);
    let completeResellerData = resellerData;
    
    if (fs.existsSync(resellerFilePath)) {
      try {
        const fileContent = fs.readFileSync(resellerFilePath, 'utf8');
        completeResellerData = JSON.parse(fileContent);
        console.log('✅ Loaded complete reseller data from JSON file');
      } catch (error) {
        console.error('⚠️ Error loading reseller data from JSON file:', error);
      }
    }

    // Copy and replace mobile app images (appImage and notificationIcon)
    await copyAppImages(resellerDirPath, completeResellerData);

        // Start Flutter build process
        await buildFlutterApp(resellerDirPath, resellerData, resellerDirName, buildType);
      } catch (error) {
        console.error('❌ Error in background build process:', error);
      }
    })();

  } catch (error) {
    console.error('❌ Error building mobile app:', error);
    res.status(500).json({
      error: 'Build failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET endpoint for checking build status
app.get('/api/resellers/build/status/:appUrl', async (req, res) => {
  try {
    const { appUrl } = req.params;
    const { parentUserId, buildType = 'apk' } = req.query;
    
    if (!appUrl || !parentUserId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'appUrl and parentUserId are required',
        timestamp: new Date().toISOString()
      });
    }

    // Create reseller directory name - we need to find the resellerId from the JSON files
    // First, find the reseller data to get the resellerId
    const dataDir = DATA_DIR;
    const jsonFiles = await glob('*.json', { cwd: dataDir });
    
    let resellerData = null;
    let resellerId = null;
    
    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(dataDir, jsonFile);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (data.appUrl === appUrl && data.parentUserId === parentUserId) {
          resellerData = data;
          resellerId = data.resellerId;
          break;
        }
      } catch (fileError) {
        console.error('❌ Error reading file during build status check:', jsonFile, fileError.message);
        continue;
      }
    }
    
    if (!resellerData || !resellerId) {
      return res.status(404).json({
        error: 'Reseller not found',
        message: `No reseller found with appUrl '${appUrl}' for user '${parentUserId}'`,
        timestamp: new Date().toISOString()
      });
    }

    // Create reseller directory name
    const resellerDirName = `reseller_${resellerData.currentDomain || 'gps'}_${appUrl}_${parentUserId}_${resellerId}`;
    const resellerDirPath = path.join(DATA_DIR, resellerDirName);
    
    // Check if build directory exists
    const buildDir = path.join(resellerDirPath, 'build');
    const apkPath = path.join(DATA_DIR, `${appUrl}.apk`);
    const aabPath = path.join(DATA_DIR, `${appUrl}.aab`);
    const iosPath = path.join(DATA_DIR, `${appUrl}.app`);
    
    // Check build status
    const resellerDirExists = fs.existsSync(resellerDirPath);
    const buildDirExists = fs.existsSync(buildDir);
    const apkExists = fs.existsSync(apkPath);
    const aabExists = fs.existsSync(aabPath);
    const iosExists = fs.existsSync(iosPath);
    
    console.log(`🔍 Build status check for ${appUrl}:`);
    console.log(`📁 Reseller dir exists: ${resellerDirExists}`);
    console.log(`📁 Build dir exists: ${buildDirExists}`);
    console.log(`📁 APK exists: ${apkExists} at ${apkPath}`);
    console.log(`📁 AAB exists: ${aabExists} at ${aabPath}`);
    console.log(`📁 iOS exists: ${iosExists} at ${iosPath}`);
    
    // Determine build status based on buildType and file existence
    let buildStatus = 'NOT_BUILDED';
    let buildComplete = false;
    
    // If reseller directory exists but no build files yet, it's building
    if (resellerDirExists && !apkExists && !aabExists && !iosExists) {
      buildStatus = 'BUILDING';
      console.log(`🔨 Status: BUILDING (reseller dir exists, no build files yet)`);
    } else if (buildDirExists) {
      buildStatus = 'BUILDING';
      console.log(`🔨 Status: BUILDING (build dir exists)`);
    } else if (buildType === 'apk' && apkExists) {
      buildStatus = 'BUILDED';
      buildComplete = true;
    } else if (buildType === 'aab' && aabExists) {
      buildStatus = 'BUILDED';
      buildComplete = true;
    } else if ((buildType === 'ios' || buildType === 'ios_simulator' || buildType === 'ios_device') && iosExists) {
      buildStatus = 'BUILDED';
      buildComplete = true;
    } else if (buildType === 'both' && apkExists && aabExists) {
      buildStatus = 'BUILDED';
      buildComplete = true;
    } else if (buildType === 'both' && (apkExists || aabExists)) {
      buildStatus = 'PARTIAL_BUILDED';
    } else if (!apkExists && !aabExists && !iosExists) {
      buildStatus = 'NOT_BUILDED';
    }
    
    // Get file sizes if they exist
    const apkSize = apkExists ? fs.statSync(apkPath).size : 0;
    const aabSize = aabExists ? fs.statSync(aabPath).size : 0;
    const iosSize = iosExists ? fs.statSync(iosPath).size : 0;
    
    res.json({
      success: true,
      data: {
        appUrl,
        parentUserId,
        buildType,
        isBuilding: buildStatus === 'BUILDING',
        buildComplete,
        buildStatus,
        apkExists,
        aabExists,
        iosExists,
        apkSize,
        aabSize,
        iosSize,
        apkPath: apkExists ? apkPath : null,
        aabPath: aabExists ? aabPath : null,
        iosPath: iosExists ? iosPath : null,
        resellerDir: resellerDirName
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking build status:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET endpoint for downloading build files
app.get('/api/resellers/download', async (req, res) => {
  try {
    const { appUrl, buildType = 'apk' } = req.query;

    console.log('📥 Download request received:', { appUrl, buildType });

    // Validate required parameters
    if (!appUrl) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'appUrl is required'
      });
    }

    // Validate buildType
    if (!['apk', 'aab', 'ios', 'ios_simulator', 'ios_device'].includes(buildType)) {
      return res.status(400).json({
        error: 'Invalid build type',
        message: 'buildType must be either "apk", "aab", "ios", "ios_simulator", or "ios_device"'
      });
    }

    // Construct the expected filename
    let filename;
    if (buildType === 'ios' || buildType === 'ios_simulator' || buildType === 'ios_device') {
      filename = `${appUrl}.app`;
    } else {
      filename = `${appUrl}.${buildType}`;
    }
    const filePath = path.join(DATA_DIR, filename);

    console.log('🔍 Looking for file:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return res.status(404).json({
        error: 'File not found',
        message: `Build file ${filename} not found. Please ensure the build completed successfully.`
      });
    }

    // Handle iOS app bundle differently (it's a directory, needs to be zipped)
    if (buildType === 'ios' || buildType === 'ios_simulator' || buildType === 'ios_device') {
      const zipFilename = `${appUrl}.app.zip`;
      const zipPath = path.join(DATA_DIR, zipFilename);
      
      // Check if zip already exists
      if (!fs.existsSync(zipPath)) {
        console.log('📦 Creating zip for iOS app bundle...');
        try {
          await new Promise((resolve, reject) => {
            exec(`cd "${DATA_DIR}" && zip -r "${zipFilename}" "${filename}"`, (error, stdout, stderr) => {
              if (error) {
                console.error('❌ Error creating zip:', error);
                reject(error);
              } else {
                console.log('✅ iOS app bundle zipped successfully');
                resolve();
              }
            });
          });
        } catch (error) {
          console.error('❌ Failed to create zip:', error);
          return res.status(500).json({
            error: 'Failed to create zip',
            message: 'Could not create zip file for iOS app bundle'
          });
        }
      }
      
      // Update file path and filename for zip
      const zipStats = fs.statSync(zipPath);
      console.log('✅ Zip file found:', { filename: zipFilename, size: zipStats.size });
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
      res.setHeader('Content-Length', zipStats.size);
      
      // Stream the zip file to the client
      const fileStream = fs.createReadStream(zipPath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('❌ Error streaming iOS zip file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'File streaming error',
            message: error.message
          });
        }
      });
    } else {
      // Handle regular files (APK, AAB)
      const stats = fs.statSync(filePath);
      console.log('✅ File found:', { filename, size: stats.size });

      // Set appropriate headers for download
      let contentType = 'application/octet-stream';
      if (buildType === 'apk') {
        contentType = 'application/vnd.android.package-archive';
      } else if (buildType === 'aab') {
        contentType = 'application/octet-stream';
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size);

      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('❌ Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'File streaming error',
            message: error.message
          });
        }
      });
    }

    console.log('📤 File download started:', buildType === 'ios' ? `${appUrl}.app.zip` : filename);

  } catch (error) {
    console.error('❌ Error handling download request:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// POST endpoint for cleaning apps
app.post('/api/resellers/clean-apps', async (req, res) => {
  try {
    const { appUrl, resellerId, cleanType } = req.body;
    
    console.log('🧹 Clean apps request received:', { appUrl, resellerId, cleanType });
    
    if (!appUrl || !resellerId || !cleanType) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'appUrl, resellerId, and cleanType are required',
        timestamp: new Date().toISOString()
      });
    }

    if (!['apk', 'aab', 'ios', 'both'].includes(cleanType)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'cleanType must be apk, aab, ios, or both',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🧹 Cleaning ${cleanType} apps for reseller ${resellerId} (${appUrl})`);

    const cleanedFiles = [];
    const errors = [];

    // Clean APK files
    if (cleanType === 'apk' || cleanType === 'both') {
      const apkPath = path.join(DATA_DIR, `${appUrl}.apk`);
      if (fs.existsSync(apkPath)) {
        try {
          fs.unlinkSync(apkPath);
          cleanedFiles.push('APK');
          console.log(`✅ Deleted APK: ${apkPath}`);
        } catch (error) {
          errors.push(`Failed to delete APK: ${error.message}`);
          console.error(`❌ Error deleting APK:`, error);
        }
      }
    }

    // Clean AAB files
    if (cleanType === 'aab' || cleanType === 'both') {
      const aabPath = path.join(DATA_DIR, `${appUrl}.aab`);
      if (fs.existsSync(aabPath)) {
        try {
          fs.unlinkSync(aabPath);
          cleanedFiles.push('AAB');
          console.log(`✅ Deleted AAB: ${aabPath}`);
        } catch (error) {
          errors.push(`Failed to delete AAB: ${error.message}`);
          console.error(`❌ Error deleting AAB:`, error);
        }
      }
    }

    // Clean iOS files
    if (cleanType === 'ios' || cleanType === 'both') {
      const iosPath = path.join(DATA_DIR, `${appUrl}.app`);
      if (fs.existsSync(iosPath)) {
        try {
          // Use robust removal for iOS app bundle (it's a directory)
          await new Promise((resolve, reject) => {
            exec(`rm -rf "${iosPath}"`, (error, stdout, stderr) => {
              if (error) {
                console.log('⚠️ First rm -rf failed for iOS, trying with force...');
                // Try with force flag
                exec(`rm -rf -f "${iosPath}"`, (error2, stdout2, stderr2) => {
                  if (error2) {
                    console.log('⚠️ Force rm -rf failed for iOS, trying chmod + rm...');
                    // Try chmod + rm approach
                    exec(`chmod -R 777 "${iosPath}" 2>/dev/null && rm -rf "${iosPath}" 2>/dev/null || true`, (error3, stdout3, stderr3) => {
                      if (error3) {
                        console.error('❌ All iOS removal methods failed:', error3);
                        reject(error3);
                      } else {
                        console.log(`✅ Deleted iOS app with chmod + rm: ${iosPath}`);
                        resolve();
                      }
                    });
                  } else {
                    console.log(`✅ Deleted iOS app with force flag: ${iosPath}`);
                    resolve();
                  }
                });
              } else {
                console.log(`✅ Deleted iOS app: ${iosPath}`);
                resolve();
              }
            });
          });
          cleanedFiles.push('iOS');
        } catch (error) {
          errors.push(`Failed to delete iOS app: ${error.message}`);
          console.error(`❌ Error deleting iOS app:`, error);
        }
      }
    }

    // Clean source code directory if all are being cleaned
    if (cleanType === 'both') {
      const sourceDirPattern = `reseller_*_${appUrl}_*_${resellerId}`;
      const files = fs.readdirSync(DATA_DIR);
      const matchingDirs = files.filter(file => {
        const fullPath = path.join(DATA_DIR, file);
        return fs.statSync(fullPath).isDirectory() && file.includes(appUrl) && file.includes(resellerId);
      });

      for (const dir of matchingDirs) {
        const dirPath = path.join(DATA_DIR, dir);
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          cleanedFiles.push(`Source code (${dir})`);
          console.log(`✅ Deleted source directory: ${dirPath}`);
        } catch (error) {
          errors.push(`Failed to delete source directory ${dir}: ${error.message}`);
          console.error(`❌ Error deleting source directory:`, error);
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully cleaned ${cleanedFiles.join(', ')}`,
      cleanedFiles,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error cleaning apps:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint to update existing nginx configs
app.post('/api/nginx/update-configs', async (req, res) => {
  try {
    await updateExistingNginxConfigs();
    res.json({
      success: true,
      message: 'Nginx configurations updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error updating nginx configs:', error);
    res.status(500).json({
      error: 'Failed to update nginx configs',
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

// GET endpoint to get current reseller's logo based on domain
app.get('/api/reseller-logo', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'domain is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Find reseller by domain
    const dataDir = DATA_DIR;
    const jsonFiles = await glob('*.json', { cwd: dataDir });
    
    let resellerData = null;
    
    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(dataDir, jsonFile);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const reseller = JSON.parse(fileContent);
        
        // Check if this reseller matches the domain
        if (reseller.appUrl === domain) {
          resellerData = reseller;
          break;
        }
      } catch (fileError) {
        console.error('❌ Error reading file during logo search:', jsonFile, fileError.message);
        continue;
      }
    }
    
    if (!resellerData) {
      return res.status(404).json({
        error: 'Reseller not found',
        message: `No reseller found for domain: ${domain}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Convert logo to base64
    let logoBase64 = null;
    if (resellerData.logotype && resellerData.logotype.startsWith('images/')) {
      try {
        const logoPath = path.join(IMAGES_DIR, resellerData.logotype.replace('images/', ''));
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
      } catch (error) {
        console.error('❌ Error converting logo to base64:', error);
      }
    }

    // Return the logo as base64
    res.json({
      success: true,
      logo: logoBase64,
      companyName: resellerData.companyName || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting reseller logo:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Reseller check endpoint - POST to check if user is a reseller
app.post('/api/reseller-check', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get all JSON files from data directory
    const jsonFiles = await glob('*.json', { cwd: DATA_DIR });
    
    // Look for files that match the pattern: reseller_{appUrl}_{parentUserId}_{resellerId}.json
    // where resellerId matches the current userId
    const resellerFiles = jsonFiles.filter(filename => {
      const match = filename.match(/^reseller_(.+)_(\d+)_(\d+)\.json$/);
      if (match) {
        const [, appUrl, parentUserId, resellerId] = match;
        return parseInt(resellerId) === parseInt(userId);
      }
      return false;
    });

    if (resellerFiles.length === 0) {
      return res.status(404).json({
        isReseller: false,
        message: 'User is not a reseller',
        timestamp: new Date().toISOString()
      });
    }

    // Read the first matching reseller file
    const resellerFile = resellerFiles[0];
    const filePath = path.join(DATA_DIR, resellerFile);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const resellerData = JSON.parse(fileContent);

    // Return reseller details
    res.json({
      isReseller: true,
      resellerData: {
        appUrl: resellerData.appUrl,
        parentUserId: resellerData.parentUserId,
        parentUser: resellerData.parentUser,
        parentEmail: resellerData.parentEmail,
        resellerId: resellerData.resellerId,
        resellerUser: resellerData.resellerUser,
        resellerEmail: resellerData.resellerEmail,
        companyName: resellerData.companyName,
        logo: resellerData.logo,
        url: resellerData.url,
        whatsapp: resellerData.whatsapp,
        billingEmail: resellerData.billingEmail,
        supportEmail: resellerData.supportEmail,
        resellerLimit: resellerData.resellerLimit,
        deviceLimit: resellerData.deviceLimit,
        userLimit: resellerData.userLimit,
        status: resellerData.status,
        createdAt: resellerData.createdAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking reseller status:', error);
    res.status(500).json({
      error: 'Failed to check reseller status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
    const jsonPattern = `reseller_*_${domain}_*.json`;
    


    
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
        
        // Look for corresponding image file using both old and new patterns
        const newImagePattern = `reseller_${data.currentDomain}_${data.appUrl}_${data.parentUserId}_${data.resellerId}_*.png`;
        const oldImagePattern = `reseller_${data.appUrl}_${data.parentUserId}_${data.resellerId}_*.png`;
        
        console.log(`🔍 Looking for image with new pattern: ${newImagePattern}`);
        console.log(`🔍 Looking for image with old pattern: ${oldImagePattern}`);
        console.log(`🔍 In directory: ${IMAGES_DIR}`);
        
        // Try new pattern first
        let imageFiles = await glob(newImagePattern, { cwd: IMAGES_DIR });
        console.log(`🔍 Found ${imageFiles.length} image files with new pattern:`, imageFiles);
        
        // If no files found with new pattern, try old pattern
        if (imageFiles.length === 0) {
          imageFiles = await glob(oldImagePattern, { cwd: IMAGES_DIR });
          console.log(`🔍 Found ${imageFiles.length} image files with old pattern:`, imageFiles);
        }
        
        if (imageFiles.length > 0) {
          const imagePath = path.join(IMAGES_DIR, imageFiles[0]);
          console.log(`🔍 Using image file: ${imagePath}`);
          const imageBuffer = fs.readFileSync(imagePath);
          imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
          console.log(`🔍 Image loaded successfully, size: ${imageBuffer.length} bytes`);
        } else {
          console.log(`❌ No image files found for either pattern`);
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
    }
    
    // Create data directory
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Create images directory
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
    
  } catch (error) {
    console.error('❌ Error creating directories:', error);
    console.error('❌ Make sure the application has write permissions to /opt/addons/resellers');
    process.exit(1);
  }
};

// Create directories on startup
ensureDirectories();


// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Reseller server running on port ${PORT}`);
  
  // Update existing nginx configs with new template
  await updateExistingNginxConfigs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

export default app;
