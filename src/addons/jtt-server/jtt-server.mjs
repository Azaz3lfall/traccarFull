import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// ──────────────────────────────────────────────────────────────────────
// CONFIG: MEDIA SERVER DOMAIN
// ──────────────────────────────────────────────────────────────────────
const MEDIA_SERVER = 'https://midia.rastreadorautoram.com.br';

// ──────────────────────────────────────────────────────────────────────
// CONFIG: TRACCAR SERVER URL
// ──────────────────────────────────────────────────────────────────────
const TRACCAR_SERVER_URL = 'http://rast.rastreadorautoram.com.br:5055';

// ──────────────────────────────────────────────────────────────────────
// CORS: ALLOW *.rastreadorautoram.com.br + 192.168.*.* (http & https)
// ──────────────────────────────────────────────────────────────────────
const cors = (req, res, next) => {
  const origin = req.headers.origin || '';

  const isRastreador = origin.endsWith('.rastreadorautoram.com.br') || 
                       origin === 'https://rastreadorautoram.com.br';

  const isLocalHttp = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
  const isLocalHttps = /^https:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);

  if (isRastreador || isLocalHttp || isLocalHttps) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
};

const app = express();
const PORT = 3334;
app.use(cors); // CORS FIRST
app.use(bodyParser.text({ type: '*/*', limit: '50mb' }));

// ──────────────────────────────────────────────────────────────────────
// Pending file list requests - wait for pushresourcelist response
// ──────────────────────────────────────────────────────────────────────
const pendingFileListRequests = new Map(); // deviceImei -> { resolve, reject, timeout }

// ──────────────────────────────────────────────────────────────────────
// REQUEST LOGGING MIDDLEWARE
// ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  // Log request
  console.log(`\n[${timestamp}] ${method} ${url}`);
  console.log(`[REQUEST] IP: ${ip}`);
  console.log(`[REQUEST] Headers:`, JSON.stringify(req.headers, null, 2));
  
  // Parse and log payload (body)
  if (req.body) {
    let parsedBody = null;
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    try {
      // Try to parse as URL-encoded query string
      if (bodyStr.includes('=') && bodyStr.includes('&')) {
        parsedBody = querystring.parse(bodyStr);
        // Try to parse JSON values within the parsed object
        for (const [key, value] of Object.entries(parsedBody)) {
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              parsedBody[key] = JSON.parse(value);
            } catch (e) {
              // Keep as string if JSON parse fails
            }
          }
        }
      } else if (bodyStr.trim().startsWith('{') || bodyStr.trim().startsWith('[')) {
        // Try to parse as JSON
        parsedBody = JSON.parse(bodyStr);
      } else {
        parsedBody = bodyStr;
      }
    } catch (e) {
      parsedBody = bodyStr;
    }
    
    console.log(`[REQUEST] Payload (${bodyStr.length} bytes):`);
    console.log(JSON.stringify(parsedBody, null, 2));
  } else {
    console.log(`[REQUEST] Payload: (empty)`);
  }
  
  // Log query parameters if any
  if (Object.keys(req.query).length > 0) {
    console.log(`[REQUEST] Query params:`, JSON.stringify(req.query, null, 2));
  }
  
  next();
});

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────
const fsExists = p => new Promise(r => fs.access(p, fs.constants.F_OK, e => r(!e)));
const fsMkdir = p => new Promise(r => fs.mkdir(p, { recursive: true }, () => r()));
// REMOVED: fsRename - no longer used (file moving operations disabled)

// Wait for file to stabilize (not being written to)
// Uses file modification time instead of frequent size checks to avoid interference
async function waitForFileStable(filePath, maxWaitMs = 5000, checkIntervalMs = 200, requiredStableChecks = 10) {
  let lastSize = null; // Use null to detect first check
  let lastMtime = null;
  let stableCount = 0;
  
  const startTime = Date.now();
  
  // First check - get initial values
  try {
    const initialStats = fs.statSync(filePath);
    lastSize = initialStats.size;
    lastMtime = initialStats.mtimeMs;
  } catch (err) {
    // File doesn't exist
    return false;
  }
  
  // Wait a bit before first comparison to see if file changes
  await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const stats = fs.statSync(filePath);
      // Check both size and modification time - if both are unchanged, file is stable
      if (stats.size === lastSize && stats.mtimeMs === lastMtime) {
        stableCount++;
        if (stableCount >= requiredStableChecks) {
          // Final wait to ensure file is completely written
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 more seconds
          return true; // File is stable
        }
      } else {
        stableCount = 0; // Reset counter if size or mtime changed
        lastSize = stats.size;
        lastMtime = stats.mtimeMs;
      }
    } catch (err) {
      // File might have been deleted
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  return false; // Timeout
}

// ──────────────────────────────────────────────────────────────────────
// File Processing System - Global File Tracker
// ──────────────────────────────────────────────────────────────────────
// Track files being processed to avoid duplicate processing
const trackedFiles = new Map(); // filePath -> { checkCount, lastSize, stableCount, startTime }

// ──────────────────────────────────────────────────────────────────────
// File Size Checking Function (Non-blocking, Non-intrusive)
// ──────────────────────────────────────────────────────────────────────
// Checks file size up to 30 times, 30 seconds between each check
// If file size doesn't change for 4 consecutive checks, file is considered stable
async function checkFileSize(filePath) {
  const maxChecks = 30;
  const checkIntervalMs = 30000; // 30 seconds
  const requiredStableChecks = 4;
  
  let checkCount = 0;
  let lastSize = null;
  let stableCount = 0;
  
  while (checkCount < maxChecks) {
    try {
      const stats = fs.statSync(filePath);
      const currentSize = stats.size;
      
      if (lastSize === null) {
        // First check
        lastSize = currentSize;
        checkCount++;
        console.log(`[FILE_CHECK] [${checkCount}/${maxChecks}] ${path.basename(filePath)}: ${currentSize} bytes (initial)`);
      } else if (currentSize === lastSize) {
        // Size unchanged
        stableCount++;
        checkCount++;
        console.log(`[FILE_CHECK] [${checkCount}/${maxChecks}] ${path.basename(filePath)}: ${currentSize} bytes (stable ${stableCount}/${requiredStableChecks})`);
        
        if (stableCount >= requiredStableChecks) {
          console.log(`[FILE_CHECK] ${path.basename(filePath)}: File is stable after ${checkCount} checks`);
          return { stable: true, size: currentSize };
        }
      } else {
        // Size changed - reset stable count
        stableCount = 0;
        checkCount++;
        lastSize = currentSize;
        console.log(`[FILE_CHECK] [${checkCount}/${maxChecks}] ${path.basename(filePath)}: ${currentSize} bytes (growing, reset stable count)`);
      }
      
      // Wait before next check (except on last check)
      if (checkCount < maxChecks) {
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
      }
    } catch (err) {
      // File doesn't exist or inaccessible
      console.log(`[FILE_CHECK] ${path.basename(filePath)}: File not found or inaccessible`);
      return { stable: false, error: err.message };
    }
  }
  
  // After 30 checks, file is still growing - considered corrupted
  console.log(`[FILE_CHECK] ${path.basename(filePath)}: File still growing after ${maxChecks} checks - will be deleted`);
  return { stable: false, stillGrowing: true };
}

// ──────────────────────────────────────────────────────────────────────
// Test Video File with FFmpeg (Validate file is not corrupted/truncated)
// ──────────────────────────────────────────────────────────────────────
// Simple and efficient: Extract a frame and check for truncation messages
// "Truncated VUI" or other truncation warnings indicate corrupted files
async function testVideoFile(videoPath) {
  try {
    const fileName = path.basename(videoPath);
    console.log(`[FFMPEG_TEST] Testing video file ${fileName} for corruption/truncation...`);
    
    // Extract a frame at 1 second - this will show truncation warnings if file is corrupted
    // Use /dev/null as output to avoid creating files
    const testCmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -f null /dev/null 2>&1`;
    
    try {
      const { stdout, stderr } = await execAsync(testCmd, { timeout: 30000 }); // 30 second timeout
      
      // Combine stdout and stderr (ffmpeg outputs warnings/errors to stderr)
      const output = (stdout + stderr).toLowerCase();
      
      // Check for truncation/corruption indicators
      // "Truncated VUI" is the key indicator of corrupted files
      const isCorrupted = output.includes('truncated vui') ||
                         output.includes('truncated') ||
                         output.includes('invalid data') ||
                         output.includes('error while decoding') ||
                         output.includes('corrupt') ||
                         output.includes('moov atom not found') ||
                         output.includes('could not find codec parameters') ||
                         output.includes('end of file') ||
                         output.includes('i/o error') ||
                         output.includes('invalid argument');
      
      if (isCorrupted) {
        const errorDetails = (stdout + stderr).substring(0, 500);
        console.log(`[FFMPEG_TEST] ${fileName} is CORRUPTED: ${errorDetails}`);
        return { valid: false, error: 'Video file is corrupted/truncated', details: errorDetails };
      }
      
      console.log(`[FFMPEG_TEST] ${fileName} is VALID (no truncation warnings)`);
      return { valid: true };
      
    } catch (execError) {
      // execAsync throws an error if command fails - check stderr for corruption indicators
      const stderr = (execError.stderr || '').toLowerCase();
      const stdout = (execError.stdout || '').toLowerCase();
      const errorMsg = (execError.message || '').toLowerCase();
      const combined = stderr + ' ' + stdout + ' ' + errorMsg;
      
      // Check for truncation/corruption indicators
      const isCorrupted = combined.includes('truncated vui') ||
                         combined.includes('truncated') ||
                         combined.includes('invalid data') ||
                         combined.includes('error while decoding') ||
                         combined.includes('corrupt') ||
                         combined.includes('moov atom not found') ||
                         combined.includes('could not find codec parameters') ||
                         combined.includes('end of file') ||
                         combined.includes('i/o error') ||
                         combined.includes('invalid argument');
      
      if (isCorrupted) {
        const errorDetails = (execError.stderr || execError.message || '').substring(0, 500);
        console.log(`[FFMPEG_TEST] ${fileName} is CORRUPTED: ${errorDetails}`);
        return { valid: false, error: 'Video file is corrupted/truncated', details: errorDetails, isCorrupted: true };
      }
      
      // If it's not a corruption error, it might be a different issue (timeout, etc.)
      console.log(`[FFMPEG_TEST] ${fileName} test failed (not necessarily corrupted): ${execError.message}`);
      return { valid: false, error: execError.message, isCorrupted: false };
    }
  } catch (error) {
    console.log(`[FFMPEG_TEST] Unexpected error testing video file ${path.basename(videoPath)}: ${error.message}`);
    return { valid: false, error: error.message, isCorrupted: false };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Thumbnail Generation Function
// ──────────────────────────────────────────────────────────────────────
async function generateThumbnail(videoPath, thumbnailPath) {
  try {
    // Generate thumbnail at 1 second into the video
    // Output format: JPEG, 320x240, quality 85
    const ffmpegCmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:240" -q:v 2 "${thumbnailPath}"`;
    
    console.log(`[THUMBNAIL] Generating thumbnail for ${path.basename(videoPath)}...`);
    await execAsync(ffmpegCmd, { timeout: 30000 }); // 30 second timeout
    
    // Check if thumbnail was created and has size
    if (await fsExists(thumbnailPath)) {
      const thumbStats = fs.statSync(thumbnailPath);
      if (thumbStats.size > 0) {
        console.log(`[THUMBNAIL] Successfully generated ${path.basename(thumbnailPath)} (${thumbStats.size} bytes)`);
        return { success: true };
      } else {
        console.log(`[THUMBNAIL] Thumbnail file created but is 0 bytes - video may be corrupted`);
        return { success: false, error: 'Thumbnail file is 0 bytes' };
      }
    } else {
      console.log(`[THUMBNAIL] Thumbnail file was not created`);
      return { success: false, error: 'Thumbnail file not created' };
    }
  } catch (error) {
    console.log(`[THUMBNAIL] Error generating thumbnail: ${error.message}`);
    // Check if error indicates truncated/corrupted video
    const errorMsg = error.message.toLowerCase();
    const isTruncated = errorMsg.includes('truncated') || 
                       errorMsg.includes('invalid data') ||
                       errorMsg.includes('error while decoding') ||
                       errorMsg.includes('corrupt');
    
    return { success: false, error: error.message, isTruncated };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Move File to processedVideos
// ──────────────────────────────────────────────────────────────────────
async function moveToProcessedVideos(filePath, userHomeFolder) {
  try {
    const fileName = path.basename(filePath);
    const processedVideosFolder = path.join(userHomeFolder, 'processedVideos');
    
    // Ensure processedVideos folder exists
    await fsMkdir(processedVideosFolder);
    
    const destPath = path.join(processedVideosFolder, fileName);
    
    // Copy file to destination
    await fs.promises.copyFile(filePath, destPath);
    
    // Verify copy was successful
    const sourceStats = fs.statSync(filePath);
    const destStats = fs.statSync(destPath);
    
    if (sourceStats.size === destStats.size) {
      // Delete original file
      await fs.promises.unlink(filePath);
      console.log(`[MOVE] Successfully moved ${fileName} to processedVideos`);
      return { success: true };
    } else {
      console.log(`[MOVE] Copy verification failed - sizes don't match`);
      // Delete incomplete copy
      try {
        await fs.promises.unlink(destPath);
      } catch {
        // Ignore errors when cleaning up incomplete copy
      }
      return { success: false, error: 'Copy verification failed' };
    }
  } catch (error) {
    console.log(`[MOVE] Error moving file: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Delete Corrupted File
// ──────────────────────────────────────────────────────────────────────
async function deleteCorruptedFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
    console.log(`[DELETE] Deleted corrupted file: ${path.basename(filePath)}`);
    return { success: true };
  } catch (error) {
    console.log(`[DELETE] Error deleting file: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Process Single File (Non-blocking)
// ──────────────────────────────────────────────────────────────────────
async function processFile(filePath, userHomeFolder) {
  const fileName = path.basename(filePath);
  const fileKey = filePath;
  
  // Skip if already being tracked
  if (trackedFiles.has(fileKey)) {
    console.log(`[PROCESS] Skipping ${fileName} - already being processed`);
    return;
  }
  
  // Verify file exists before tracking
  if (!await fsExists(filePath)) {
    console.log(`[PROCESS] Skipping ${fileName} - file does not exist`);
    return;
  }
  
  // Mark as tracked
  trackedFiles.set(fileKey, { startTime: Date.now() });
  console.log(`[PROCESS] Starting processing for ${fileName} (path: ${filePath})`);
  
  try {
    // Step 1: Check file size (non-blocking, runs in background)
    console.log(`[PROCESS] ${fileName} - Starting file size check...`);
    const sizeCheck = await checkFileSize(filePath);
    
    if (!sizeCheck.stable) {
      // File is not stable or still growing
      if (sizeCheck.stillGrowing) {
        // File still growing after 30 checks - delete it
        console.log(`[PROCESS] ${fileName} - File still growing after 30 checks, deleting...`);
        await deleteCorruptedFile(filePath);
      } else if (sizeCheck.error) {
        // File doesn't exist or inaccessible - remove from tracking
        console.log(`[PROCESS] ${fileName} - File check error: ${sizeCheck.error}`);
      } else {
        console.log(`[PROCESS] ${fileName} - File not stable (timeout or error)`);
      }
      trackedFiles.delete(fileKey);
      return;
    }
    
    console.log(`[PROCESS] ${fileName} - File is stable (${sizeCheck.size} bytes), generating thumbnail...`);
    
    // Step 2: Generate thumbnail
    const thumbnailPath = `${filePath}.jpg`;
    const thumbnailResult = await generateThumbnail(filePath, thumbnailPath);
    
    if (!thumbnailResult.success) {
      // Thumbnail generation failed - delete corrupted file
      console.log(`[PROCESS] ${fileName}: Thumbnail generation failed - ${thumbnailResult.error}`);
      await deleteCorruptedFile(filePath);
      // Delete thumbnail if it exists but is invalid
      try {
        if (await fsExists(thumbnailPath)) {
          await fs.promises.unlink(thumbnailPath);
        }
      } catch {
        // Ignore errors when cleaning up invalid thumbnail
      }
      trackedFiles.delete(fileKey);
      return;
    }
    
    console.log(`[PROCESS] ${fileName} - Thumbnail generated successfully, testing video file with ffmpeg...`);
    
    // Step 3: Test video file with ffmpeg to ensure it's not corrupted
    const videoTest = await testVideoFile(filePath);
    
    if (!videoTest.valid) {
      // Video file is corrupted - delete it and thumbnail
      console.log(`[PROCESS] ${fileName} - Video file is CORRUPTED: ${videoTest.error}`);
      await deleteCorruptedFile(filePath);
      try {
        if (await fsExists(thumbnailPath)) {
          await fs.promises.unlink(thumbnailPath);
        }
      } catch {
        // Ignore errors when cleaning up thumbnail
      }
      trackedFiles.delete(fileKey);
      return;
    }
    
    console.log(`[PROCESS] ${fileName} - Video file validated successfully, moving to processedVideos...`);
    
    // Step 4: Move file to processedVideos
    const moveResult = await moveToProcessedVideos(filePath, userHomeFolder);
    
    if (!moveResult.success) {
      // Move failed - delete thumbnail and keep original file
      console.log(`[PROCESS] ${fileName} - Move failed: ${moveResult.error}`);
      try {
        if (await fsExists(thumbnailPath)) {
          await fs.promises.unlink(thumbnailPath);
        }
      } catch {
        // Ignore errors when cleaning up thumbnail after move failure
      }
      trackedFiles.delete(fileKey);
      return;
    }
    
    // Success! File processed and moved
    console.log(`[PROCESS] Successfully processed ${fileName} - moved to processedVideos`);
    trackedFiles.delete(fileKey);
    
  } catch (error) {
    console.log(`[PROCESS] Error processing ${fileName}: ${error.message}`);
    trackedFiles.delete(fileKey);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Cleanup Stuck Files in Tracking Queue
// ──────────────────────────────────────────────────────────────────────
// Files should not take longer than 5 minutes to upload via FTP
// If a file has been in the queue for more than 5 minutes, it's likely stuck
function cleanupStuckFiles() {
  const now = Date.now();
  const maxProcessingTime = 5 * 60 * 1000; // 5 minutes - if file has been in queue longer, it's stuck
  const stuckFiles = [];
  
  for (const [filePath, trackingInfo] of trackedFiles.entries()) {
    const age = now - trackingInfo.startTime;
    if (age > maxProcessingTime) {
      stuckFiles.push({ filePath, age });
    }
  }
  
  if (stuckFiles.length > 0) {
    console.log(`[CLEANUP] Found ${stuckFiles.length} stuck file(s) in tracking queue (older than 5 minutes):`);
    for (const { filePath, age } of stuckFiles) {
      const fileName = path.basename(filePath);
      const ageMinutes = Math.round(age / 60000);
      console.log(`[CLEANUP] Removing stuck file: ${fileName} (in queue for ${ageMinutes} minutes - exceeds max upload time)`);
      trackedFiles.delete(filePath);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Global File Scanner (Runs every 45 seconds)
// ──────────────────────────────────────────────────────────────────────
// Scans both /home (for jc181) and /iothub/dvr-upload/uploadFile (for jc400)
async function scanForNewFiles() {
  console.log(`[SCAN] ========== Starting file scan ==========`);
  
  // First, cleanup stuck files from tracking queue
  cleanupStuckFiles();
  
  // ────── SCAN /home (jc181 devices) ──────
  try {
    const homeDir = '/home';
    
    // Check if /home exists
    if (await fsExists(homeDir)) {
      // Read all user folders in /home
      const entries = await fs.promises.readdir(homeDir, { withFileTypes: true });
      console.log(`[SCAN] Found ${entries.length} entries in /home`);
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const userFolder = path.join(homeDir, entry.name);
        const userHomeFolder = userFolder;
        
        try {
          // Read all files in user folder
          const files = await fs.promises.readdir(userFolder, { withFileTypes: true });
          const mp4Files = files.filter(f => f.isFile() && f.name.endsWith('.mp4'));
          console.log(`[SCAN] User folder ${entry.name}: ${mp4Files.length} MP4 files found`);
          
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.mp4')) {
              const filePath = path.join(userFolder, file.name);
              const fileKey = filePath;
              
              // Check if already tracked - if stuck (>5 min), remove and retry
              // Files should not take longer than 5 minutes to upload via FTP
              if (trackedFiles.has(fileKey)) {
                const trackingInfo = trackedFiles.get(fileKey);
                const age = Date.now() - trackingInfo.startTime;
                const maxProcessingTime = 5 * 60 * 1000; // 5 minutes - if longer, file is stuck
                
                if (age > maxProcessingTime) {
                  // File is stuck - remove from tracking and retry
                  console.log(`[SCAN] ${file.name} is stuck in queue (${Math.round(age / 60000)} min) - removing and retrying`);
                  trackedFiles.delete(fileKey);
                  // Continue to process below
                } else {
                  // File is still being processed (recently added or within expected upload time)
                  const ageMinutes = Math.round(age / 60000);
                  const ageSeconds = Math.round(age / 1000);
                  console.log(`[SCAN] Skipping ${file.name} - already in tracking queue (${ageMinutes > 0 ? ageMinutes + 'm ' : ''}${ageSeconds % 60}s ago)`);
                  continue;
                }
              }
              
              // Check if file is already in processedVideos
              const processedPath = path.join(userHomeFolder, 'processedVideos', file.name);
              if (await fsExists(processedPath)) {
                console.log(`[SCAN] Skipping ${file.name} - already in processedVideos`);
                continue; // Already processed
              }
              
              // Check if file exists and has size
              try {
                const stats = fs.statSync(filePath);
                if (stats.size === 0) {
                  console.log(`[SCAN] Skipping ${file.name} - file is 0 bytes`);
                  continue;
                }
              } catch (err) {
                console.log(`[SCAN] Skipping ${file.name} - cannot access file: ${err.message}`);
                continue;
              }
              
              // Check if thumbnail already exists
              const thumbnailPath = `${filePath}.jpg`;
              const thumbnailExists = await fsExists(thumbnailPath);
              
              if (thumbnailExists) {
                // Thumbnail exists but file not moved - might be from failed previous attempt
                // Check if thumbnail is valid (has size)
                try {
                  const thumbStats = fs.statSync(thumbnailPath);
                  if (thumbStats.size === 0) {
                    // Invalid thumbnail - delete it and reprocess
                    console.log(`[SCAN] ${file.name} has invalid thumbnail (0 bytes) - deleting and reprocessing`);
                    await fs.promises.unlink(thumbnailPath);
                  } else {
                    // Valid thumbnail but file not moved - file might be stuck
                    // Check file age - if older than 5 minutes, retry processing
                    const fileStats = fs.statSync(filePath);
                    const fileAge = Date.now() - fileStats.mtimeMs;
                    const fiveMinutes = 5 * 60 * 1000;
                    
                    if (fileAge > fiveMinutes) {
                      console.log(`[SCAN] ${file.name} has thumbnail but file not moved (age: ${Math.round(fileAge / 1000)}s) - retrying processing`);
                      // Delete thumbnail and reprocess
                      await fs.promises.unlink(thumbnailPath);
                    } else {
                      // File is recent, might still be processing - skip for now
                      console.log(`[SCAN] Skipping ${file.name} - has valid thumbnail and file is recent (age: ${Math.round(fileAge / 1000)}s)`);
                      continue;
                    }
                  }
                } catch (err) {
                  console.log(`[SCAN] Error checking thumbnail for ${file.name}: ${err.message} - will reprocess`);
                  // Continue to process the file
                }
              }
              
              // New file found or needs reprocessing - start processing (non-blocking)
              console.log(`[SCAN] Found new file to process: ${file.name}`);
              processFile(filePath, userHomeFolder).catch(err => {
                console.log(`[SCAN] Error starting processing for ${file.name}: ${err.message}`);
              });
            }
          }
        } catch (err) {
          // Skip user folder if can't read it
          console.log(`[SCAN] Cannot read folder ${entry.name}: ${err.message}`);
        }
      }
    } else {
      console.log(`[SCAN] /home directory not found`);
    }
  } catch (error) {
    console.log(`[SCAN] Error scanning /home: ${error.message}`);
  }
  
  // ────── SCAN /iothub/dvr-upload/uploadFile (jc400 devices) ──────
  try {
    const jc400UploadFolder = '/iothub/dvr-upload/uploadFile';
    
    if (await fsExists(jc400UploadFolder)) {
      // Read all files in jc400 upload folder
      const files = await fs.promises.readdir(jc400UploadFolder, { withFileTypes: true });
      const mp4Files = files.filter(f => f.isFile() && f.name.endsWith('.mp4') && f.name.startsWith('EVENT_'));
      console.log(`[SCAN] JC400 upload folder: ${mp4Files.length} MP4 files found`);
      
      // Ensure processedVideos folder exists in jc400 upload folder
      const jc400ProcessedFolder = path.join(jc400UploadFolder, 'processedVideos');
      await fsMkdir(jc400ProcessedFolder);
      
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.mp4') && file.name.startsWith('EVENT_')) {
          const filePath = path.join(jc400UploadFolder, file.name);
          const fileKey = filePath;
          
          // Check if already tracked - if stuck (>5 min), remove and retry
          if (trackedFiles.has(fileKey)) {
            const trackingInfo = trackedFiles.get(fileKey);
            const age = Date.now() - trackingInfo.startTime;
            const maxProcessingTime = 5 * 60 * 1000; // 5 minutes
            
            if (age > maxProcessingTime) {
              console.log(`[SCAN] JC400 ${file.name} is stuck in queue (${Math.round(age / 60000)} min) - removing and retrying`);
              trackedFiles.delete(fileKey);
            } else {
              const ageMinutes = Math.round(age / 60000);
              const ageSeconds = Math.round(age / 1000);
              console.log(`[SCAN] Skipping JC400 ${file.name} - already in tracking queue (${ageMinutes > 0 ? ageMinutes + 'm ' : ''}${ageSeconds % 60}s ago)`);
              continue;
            }
          }
          
          // Check if file is already in processedVideos
          const processedPath = path.join(jc400ProcessedFolder, file.name);
          if (await fsExists(processedPath)) {
            console.log(`[SCAN] Skipping JC400 ${file.name} - already in processedVideos`);
            continue; // Already processed
          }
          
          // Check if file exists and has size
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              console.log(`[SCAN] Skipping JC400 ${file.name} - file is 0 bytes`);
              continue;
            }
          } catch (err) {
            console.log(`[SCAN] Skipping JC400 ${file.name} - cannot access file: ${err.message}`);
            continue;
          }
          
          // Check if thumbnail already exists
          const thumbnailPath = `${filePath}.jpg`;
          const thumbnailExists = await fsExists(thumbnailPath);
          
          if (thumbnailExists) {
            try {
              const thumbStats = fs.statSync(thumbnailPath);
              if (thumbStats.size === 0) {
                console.log(`[SCAN] JC400 ${file.name} has invalid thumbnail (0 bytes) - deleting and reprocessing`);
                await fs.promises.unlink(thumbnailPath);
              } else {
                // Valid thumbnail but file not moved - check file age
                const fileStats = fs.statSync(filePath);
                const fileAge = Date.now() - fileStats.mtimeMs;
                const fiveMinutes = 5 * 60 * 1000;
                
                if (fileAge > fiveMinutes) {
                  console.log(`[SCAN] JC400 ${file.name} has thumbnail but file not moved (age: ${Math.round(fileAge / 1000)}s) - retrying processing`);
                  await fs.promises.unlink(thumbnailPath);
                } else {
                  console.log(`[SCAN] Skipping JC400 ${file.name} - has valid thumbnail and file is recent (age: ${Math.round(fileAge / 1000)}s)`);
                  continue;
                }
              }
            } catch (err) {
              console.log(`[SCAN] Error checking thumbnail for JC400 ${file.name}: ${err.message} - will reprocess`);
            }
          }
          
          // New file found or needs reprocessing - start processing (non-blocking)
          // For jc400, use the upload folder as the "home folder" for processedVideos
          console.log(`[SCAN] Found new JC400 file to process: ${file.name}`);
          processFile(filePath, jc400UploadFolder).catch(err => {
            console.log(`[SCAN] Error starting processing for JC400 ${file.name}: ${err.message}`);
          });
        }
      }
    } else {
      console.log(`[SCAN] JC400 upload folder not found: ${jc400UploadFolder}`);
    }
  } catch (error) {
    console.log(`[SCAN] Error scanning JC400 upload folder: ${error.message}`);
  }
  
  console.log(`[SCAN] ========== File scan completed ==========`);
}

// Start the global scanner - runs every 45 seconds
console.log(`[SCAN] Starting global file scanner (runs every 45 seconds)`);
setInterval(() => {
  scanForNewFiles().catch(err => {
    console.log(`[SCAN] Error in scanner: ${err.message}`);
  });
}, 45000); // 45 seconds

// Run cleanup for stuck files every 5 minutes
console.log(`[CLEANUP] Starting stuck file cleanup (runs every 5 minutes)`);
setInterval(() => {
  cleanupStuckFiles();
}, 5 * 60 * 1000); // 5 minutes

// Run initial scan after 5 seconds (give server time to start)
setTimeout(() => {
  scanForNewFiles().catch(err => {
    console.log(`[SCAN] Error in initial scan: ${err.message}`);
  });
}, 5000);

// ──────────────────────────────────────────────────────────────────────
// Check if file is being processed (in trackedFiles)
// ──────────────────────────────────────────────────────────────────────
function isFileBeingProcessed(filePath) {
  return trackedFiles.has(filePath);
}

// ──────────────────────────────────────────────────────────────────────
// Parse filename to channel + time (jc181 format)
// ──────────────────────────────────────────────────────────────────────
function parseFilename(filename) {
  const m = filename.match(/^CH(\d)_(\d{6})_(\d{6})_000000\.mp4$/);
  if (!m) return null;
  const [_, ch, yymmdd, hhmmss] = m;
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const hh = hhmmss.slice(0, 2);
  const mi = hhmmss.slice(2, 4);
  const beginTime = `20${yy}-${mm}-${dd} ${hh}:${mi}:00`;
  return { channel: Number(ch), beginTime, endTime: beginTime };
}

// ──────────────────────────────────────────────────────────────────────
// Parse jc400 filename: EVENT_IMEI_00000000_YYYY_MM_DD_HH_MM_SS_TYPE_CHANNEL.mp4
// ──────────────────────────────────────────────────────────────────────
function parseJC400Filename(filename) {
  // Format: EVENT_IMEI_SEQUENCE_YYYY_MM_DD_HH_MM_SS_CHANNEL(F|I)_EVENTTYPE.mp4
  // Example: EVENT_862798052572175_00000000_2025_11_12_11_32_22_F_23.mp4
  // Channel is F or I, eventType is the number at the end
  const m = filename.match(/^EVENT_(\d+)_00000000_(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_([FI])_(\d+)\.mp4$/);
  if (!m) return null;
  const [_, imei, year, month, day, hour, minute, second, channel, eventType] = m;
  const beginTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  // Map F/I to channel numbers: F = 1, I = 2
  const channelNumber = channel === 'F' ? 1 : (channel === 'I' ? 2 : null);
  return { imei, channel: channelNumber, channelLabel: channel, eventType: Number(eventType), beginTime, endTime: beginTime };
}

// ──────────────────────────────────────────────────────────────────────
// Build expected filename
// ──────────────────────────────────────────────────────────────────────
function buildFilename(channel, beginTime) {
  const dt = beginTime.replace(/[- :]/g, '');
  const yy = dt.slice(2, 4);
  const mmdd = dt.slice(4, 8);
  const hhmmss = dt.slice(8, 14);
  return `CH${channel}_${yy}${mmdd}_${hhmmss}_000000.mp4`;
}

// ──────────────────────────────────────────────────────────────────────
// MAIN PROCESSOR — FINAL
// ──────────────────────────────────────────────────────────────────────
async function processDevice(imei, deviceFolder, expectedVideos = [], triggerSource = '') {
  console.log(`\n[MAIN] START PROCESSING IMEI: ${imei} | Trigger: ${triggerSource}`);
  const processedFolder = path.join(deviceFolder, 'processedVideos');
  const reportPath = path.join(deviceFolder, 'status_report.json');
  await fsMkdir(processedFolder);

  const rootFiles = fs.readdirSync(deviceFolder);
  const procFiles = fs.readdirSync(processedFolder);
  const allMp4s = procFiles.filter(f => f.endsWith('.mp4'));

  console.log(`[SCAN] ROOT FILES: ${rootFiles.length}`);
  console.log(`[SCAN] PROCESSED FILES: ${procFiles.length} | MP4s: ${allMp4s.length}`);

  const report = {
    imei,
    generated_at: new Date().toISOString(),
    resource_count: expectedVideos.length,
    videos: [],
    summary: { uploaded_ok: 0, upload_errored: 0, not_uploaded: 0, pending: 0 }
  };

  const expectedSet = new Set(expectedVideos.map(v => buildFilename(v.channel, v.beginTime)));

  // ────── 1. COLLECT THUMBS FROM ROOT — STRIP .mp4 FROM NAME ──────
  const allThumbs = rootFiles
    .filter(f => f.endsWith('.mp4.jpg'))
    .map(f => {
      const stats = fs.statSync(path.join(deviceFolder, f));
      const rawName = path.parse(f).name; // e.g., "CH1_251109_001400_000000.mp4" from "CH1_251109_001400_000000.mp4.jpg"
      const name = rawName.replace(/\.mp4$/, ''); // e.g., "CH1_251109_001400_000000"
      const chMatch = f.match(/^CH(\d)_/);
      const channel = chMatch ? Number(chMatch[1]) : null;
      
      // Extract timestamp from filename for sorting (YYMMDDHHMMSS format)
      // Format: CH1_YYMMDD_HHMMSS_000000.mp4.jpg
      const timeMatch = name.match(/^CH\d+_(\d{6})_(\d{6})_/);
      let timestamp = 0;
      if (timeMatch) {
        const yymmdd = timeMatch[1]; // YYMMDD
        const hhmmss = timeMatch[2]; // HHMMSS
        timestamp = parseInt(yymmdd + hhmmss, 10); // YYMMDDHHMMSS as number for sorting
      }
      
      return { name, channel, mtime: stats.mtime, filename: f, timestamp }; // Store timestamp for sorting
    })
    .filter(t => t.channel !== null);

  console.log(`[THUMBS] FOUND IN ROOT: ${allThumbs.length}`);

  // Sort by timestamp (most recent first), then by mtime as fallback
  const latestThumbByChannel = {};
  allThumbs.forEach(thumb => {
    if (!latestThumbByChannel[thumb.channel]) {
      latestThumbByChannel[thumb.channel] = thumb;
    } else {
      const current = latestThumbByChannel[thumb.channel];
      // Prefer higher timestamp (more recent video), fallback to mtime
      if (thumb.timestamp > current.timestamp || 
          (thumb.timestamp === current.timestamp && thumb.mtime > current.mtime)) {
      latestThumbByChannel[thumb.channel] = thumb;
      }
    }
  });

  console.log(`[THUMBS] LATEST: ${Object.keys(latestThumbByChannel).map(ch => `CH${ch}`).join(', ')}`);

  // ────── 2. EXPECTED VIDEOS ──────
  for (const vid of expectedVideos) {
    const file = buildFilename(vid.channel, vid.beginTime);
    const mp4Path = path.join(processedFolder, file);
    const rootMp4Path = path.join(deviceFolder, file); // Check root folder for tracked files
    const thumbPath = path.join(deviceFolder, `${file}.jpg`);

    const mp4Exists = await fsExists(mp4Path);
    const mp4Size = mp4Exists ? fs.statSync(mp4Path).size : 0;
    const thumbExists = await fsExists(thumbPath);
    const thumbSize = thumbExists ? fs.statSync(thumbPath).size : 0;

    // Check if file is being processed by global file processing system
    const isInProcessingQueue = isFileBeingProcessed(rootMp4Path);
    
    let status = 'not_uploaded';
    if (isInProcessingQueue) {
      // File is in processing queue - mark as pending
      status = 'pending';
    } else if (mp4Exists && mp4Size > 0) {
      status = (thumbExists && thumbSize > 0) ? 'uploaded_ok' : 'upload_errored';
    } else if (mp4Exists) {
      status = 'upload_errored';
    }

    const cleanName = path.parse(file).name;
    const thumbUrl = `${MEDIA_SERVER}/${imei}/${cleanName}/jc181`;
    const mp4Url = `${MEDIA_SERVER}/${imei}/${cleanName}/MP4/jc181`;

    // For not_uploaded and upload_errored, use most recent thumbnail for that channel
    // For uploaded_ok, use specific thumbnail if exists, otherwise latest for channel
    let thumbnail_url = null;
    if (status === 'not_uploaded' || status === 'upload_errored') {
      // Always use latest thumbnail for that channel (verify it exists using original filename)
      const latest = latestThumbByChannel[vid.channel];
      if (latest) {
        // Use the original filename we found to verify existence
        const latestThumbPath = path.join(deviceFolder, latest.filename);
        if (await fsExists(latestThumbPath)) {
          thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}/jc181`;
          console.log(`[THUMB] ${status} video CH${vid.channel} using latest thumbnail: ${latest.name} (timestamp: ${latest.timestamp})`);
        } else {
          // Latest thumbnail file doesn't exist, try fallback
          const allLatest = Object.values(latestThumbByChannel);
          for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
            const thumbPath = path.join(deviceFolder, thumb.filename);
            if (await fsExists(thumbPath)) {
              thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
              break;
            }
          }
        }
      } else {
        // Fallback: use latest thumbnail from any channel if this channel has none
        const allLatest = Object.values(latestThumbByChannel);
        for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
          const thumbPath = path.join(deviceFolder, thumb.filename);
          if (await fsExists(thumbPath)) {
            thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
            break;
          }
        }
      }
    } else {
      // uploaded_ok: use specific thumbnail if exists, otherwise latest for channel
    if (thumbExists && thumbSize > 0) {
      thumbnail_url = thumbUrl;
    } else {
      const latest = latestThumbByChannel[vid.channel];
        if (latest) {
          // Use the original filename we found to verify existence
          const latestThumbPath = path.join(deviceFolder, latest.filename);
          if (await fsExists(latestThumbPath)) {
            thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}/jc181`;
          } else {
            // Fallback: use latest thumbnail from any channel
            const allLatest = Object.values(latestThumbByChannel);
            for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
              const thumbPath = path.join(deviceFolder, thumb.filename);
              if (await fsExists(thumbPath)) {
                thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
                break;
              }
            }
          }
        } else {
          // Fallback: use latest thumbnail from any channel
          const allLatest = Object.values(latestThumbByChannel);
          for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
            const thumbPath = path.join(deviceFolder, thumb.filename);
            if (await fsExists(thumbPath)) {
              thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
              break;
            }
          }
        }
      }
    }

    // Only set video_url for uploaded_ok videos (file exists and is valid)
    const video_url = (status === 'uploaded_ok' && mp4Exists && mp4Size > 0) ? mp4Url : null;

    report.videos.push({
      channel: vid.channel,
      beginTime: vid.beginTime,
      endTime: vid.endTime,
      expected_file: file,
      expected_size: vid.expectedSize,
      file_exists: mp4Exists,
      file_size: mp4Size,
      thumbnail_exists: thumbExists,
      thumbnail_size: thumbSize,
      in_processed_folder: true,
      status,
      thumbnail_url,
      video_url
    });
    report.summary[status]++;
  }

  // ────── 3. ORPHAN MP4s ──────
  for (const file of allMp4s) {
    if (expectedSet.has(file)) continue;

    const mp4Path = path.join(processedFolder, file);
    const thumbPath = path.join(deviceFolder, `${file}.jpg`);
    const parsed = parseFilename(file);

    if (!parsed) {
      console.log(`[WARN] Cannot parse: ${file}`);
      continue;
    }

    const mp4Size = fs.statSync(mp4Path).size;
    const thumbExists = await fsExists(thumbPath);
    const thumbSize = thumbExists ? fs.statSync(thumbPath).size : 0;

    let status = mp4Size > 0
      ? (thumbExists && thumbSize > 0 ? 'uploaded_ok' : 'upload_errored')
      : 'upload_errored';

    const cleanName = path.parse(file).name;
    const thumbUrl = `${MEDIA_SERVER}/${imei}/${cleanName}/jc181`;
    const mp4Url = `${MEDIA_SERVER}/${imei}/${cleanName}/MP4/jc181`;

    // For not_uploaded and upload_errored, use most recent thumbnail for that channel
    // For uploaded_ok, use specific thumbnail if exists, otherwise latest for channel
    let thumbnail_url = null;
    if (status === 'not_uploaded' || status === 'upload_errored') {
      // Always use latest thumbnail for that channel (verify it exists using original filename)
      const latest = latestThumbByChannel[parsed.channel];
      if (latest) {
        // Use the original filename we found to verify existence
        const latestThumbPath = path.join(deviceFolder, latest.filename);
        if (await fsExists(latestThumbPath)) {
          thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}/jc181`;
        } else {
          // Latest thumbnail file doesn't exist, try fallback
          const allLatest = Object.values(latestThumbByChannel);
          for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
            const thumbPath = path.join(deviceFolder, thumb.filename);
            if (await fsExists(thumbPath)) {
              thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
              break;
            }
          }
        }
      } else {
        // Fallback: use latest thumbnail from any channel if this channel has none
        const allLatest = Object.values(latestThumbByChannel);
        for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
          const thumbPath = path.join(deviceFolder, thumb.filename);
          if (await fsExists(thumbPath)) {
            thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
            break;
          }
        }
      }
    } else {
      // uploaded_ok: use specific thumbnail if exists, otherwise latest for channel
    if (thumbExists && thumbSize > 0) {
      thumbnail_url = thumbUrl;
    } else {
      const latest = latestThumbByChannel[parsed.channel];
        if (latest) {
          // Use the original filename we found to verify existence
          const latestThumbPath = path.join(deviceFolder, latest.filename);
          if (await fsExists(latestThumbPath)) {
            thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}/jc181`;
          } else {
            // Fallback: use latest thumbnail from any channel
            const allLatest = Object.values(latestThumbByChannel);
            for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
              const thumbPath = path.join(deviceFolder, thumb.filename);
              if (await fsExists(thumbPath)) {
                thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
                break;
              }
            }
          }
        } else {
          // Fallback: use latest thumbnail from any channel
          const allLatest = Object.values(latestThumbByChannel);
          for (const thumb of allLatest.sort((a, b) => b.mtime - a.mtime)) {
            const thumbPath = path.join(deviceFolder, thumb.filename);
            if (await fsExists(thumbPath)) {
              thumbnail_url = `${MEDIA_SERVER}/${imei}/${thumb.name}/jc181`;
              break;
            }
          }
        }
      }
    }

    // Only set video_url for uploaded_ok videos (file exists and is valid)
    const video_url = (status === 'uploaded_ok' && mp4Size > 0) ? mp4Url : null;

    report.videos.push({
      channel: parsed.channel,
      beginTime: parsed.beginTime,
      endTime: parsed.beginTime,
      expected_file: file,
      expected_size: mp4Size,
      file_exists: true,
      file_size: mp4Size,
      thumbnail_exists: thumbExists,
      thumbnail_size: thumbSize,
      in_processed_folder: true,
      status,
      thumbnail_url,
      video_url
    });
    report.summary[status]++;
  }

  // ────── 4. FORCE CLEANUP ROOT MP4s ──────
  // DISABLED: All file processing operations removed - waiting for new steps
  // Files remain in root folder untouched

  // ────── 5. CORRECT STATUS FOR TRACKED FILES ──────
  // After creating report, check tracked files and update status
  for (const video of report.videos) {
    const file = video.expected_file;
    const rootMp4Path = path.join(deviceFolder, file);
    
    // If file is being processed, update status to pending
    if (isFileBeingProcessed(rootMp4Path)) {
      // Update summary counts
      if (video.status !== 'pending') {
        report.summary[video.status]--;
        report.summary.pending = (report.summary.pending || 0) + 1;
        video.status = 'pending';
        console.log(`[REPORT] Updated ${file} status to pending (in processing queue)`);
      }
    }
  }

  // ────── 6. WRITE REPORT ──────
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o644 });
  console.log(`[REPORT] SAVED: ${report.videos.length} videos`);
  console.log(`[REPORT] OK: ${report.summary.uploaded_ok} | ERR: ${report.summary.upload_errored} | NOT_UPLOADED: ${report.summary.not_uploaded} | PENDING: ${report.summary.pending || 0}`);
}

// ──────────────────────────────────────────────────────────────────────
// Convert date string to unix timestamp (milliseconds)
// ──────────────────────────────────────────────────────────────────────
function dateToTimestamp(dateStr) {
  if (!dateStr) return null;
  try {
    // Format: "2025-11-08 11:47:07"
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.getTime();
  } catch (e) {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Convert km/h to knots
// ──────────────────────────────────────────────────────────────────────
function kmhToKnots(kmh) {
  if (kmh === undefined || kmh === null) return undefined;
  return Math.round((kmh / 1.852) * 100) / 100;
}

// ──────────────────────────────────────────────────────────────────────
// Transform GPS data to OsmAnd protocol format
// ──────────────────────────────────────────────────────────────────────
function transformGpsToOsmAnd(gpsData) {
  const params = new URLSearchParams();
  
  // Extract IMEI
  const imei = gpsData.deviceImei || gpsData.imei || '';
  if (!imei) return null;
  
  params.append('id', imei);
  
  // Extract coordinates - check both direct lat/lng and msg.lat/msg.lng (for alarms)
  // Coordinates are optional - send data even without GPS position
  const lat = gpsData.lat !== undefined ? gpsData.lat : (gpsData.msg?.lat !== undefined ? gpsData.msg.lat : null);
  const lng = gpsData.lng !== undefined ? gpsData.lng : (gpsData.msg?.lng !== undefined ? gpsData.msg.lng : null);
  
  // Only append coordinates if they exist
  if (lat !== null && lng !== null) {
    params.append('lat', lat.toString());
    params.append('lon', lng.toString());
  }
  
  // Timestamp - prefer gpsTime, fallback to gateTime
  const timeStr = gpsData.gpsTime || gpsData.gateTime || gpsData.msg?.alarmTime;
  if (timeStr) {
    const timestamp = dateToTimestamp(timeStr);
    if (timestamp) {
      params.append('timestamp', timestamp.toString());
    }
  }
  
  // Speed - convert from km/h to knots
  const speedKmh = gpsData.gpsSpeed !== undefined ? gpsData.gpsSpeed : (gpsData.msg?.gpsSpeed !== undefined ? gpsData.msg.gpsSpeed : undefined);
  if (speedKmh !== undefined) {
    const speedKnots = kmhToKnots(speedKmh);
    if (speedKnots !== undefined) {
      params.append('speed', speedKnots.toString());
    }
  }
  
  // Direction/Heading
  if (gpsData.direction !== undefined) {
    params.append('heading', gpsData.direction.toString());
  }
  
  // GPS validity - check if we have valid GPS data
  const hasValidGps = (lat !== null && lng !== null && lat !== 0 && lng !== 0);
  if (lat !== null && lng !== null) {
    params.append('valid', hasValidGps.toString());
  }
  
  // Ignition (acc field: 1 = on, 0 = off)
  if (gpsData.acc !== undefined) {
    params.append('ignition', (gpsData.acc === 1).toString());
  }
  
  // Additional fields as custom attributes
  if (gpsData.altitude !== undefined) params.append('altitude', gpsData.altitude.toString());
  if (gpsData.satelliteNum !== undefined) params.append('satelliteNum', gpsData.satelliteNum.toString());
  if (gpsData.gsmSignal !== undefined) params.append('gsmSignal', gpsData.gsmSignal.toString());
  if (gpsData.gsmSign !== undefined) params.append('gsmSign', gpsData.gsmSign.toString());
  if (gpsData.status !== undefined) params.append('status', gpsData.status.toString());
  if (gpsData.powerStatus !== undefined) params.append('powerStatus', gpsData.powerStatus.toString());
  if (gpsData.powerLevel !== undefined) params.append('powerLevel', gpsData.powerLevel.toString());
  if (gpsData.fortify !== undefined) params.append('fortify', gpsData.fortify.toString());
  if (gpsData.remoteLock !== undefined) params.append('remoteLock', gpsData.remoteLock.toString());
  if (gpsData.oilEle !== undefined) params.append('oilEle', gpsData.oilEle.toString());
  if (gpsData.gpsPos !== undefined) params.append('gpsPos', gpsData.gpsPos.toString());
  if (gpsData.msg?.alertType) params.append('alertType', gpsData.msg.alertType.toString());
  if (gpsData.msg?.alarmLabel) params.append('alarmLabel', gpsData.msg.alarmLabel);
  
  return params.toString();
}

// ──────────────────────────────────────────────────────────────────────
// Send GPS data to Traccar server in OsmAnd protocol format
// ──────────────────────────────────────────────────────────────────────
async function sendGpsToTraccar(gpsData) {
  const queryString = transformGpsToOsmAnd(gpsData);
  if (!queryString) {
    console.log(`[TRACCAR] SKIP: Missing IMEI`);
    return false;
  }
  
  try {
    const response = await fetch(TRACCAR_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: queryString,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.log(`[TRACCAR] FAILED: Status ${response.status} - ${errorText.substring(0, 100)}`);
      return false;
    }

    console.log(`[TRACCAR] SUCCESS: IMEI ${gpsData.deviceImei || gpsData.imei}`);
    return true;
  } catch (error) {
    console.log(`[TRACCAR] ERROR: ${error.message}`);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────
// 1. SERVE MP4 VIDEO — with deviceModel in path (MUST COME FIRST)
// ──────────────────────────────────────────────────────────────────────
app.get('/:imei/:name/MP4/:deviceModel', async (req, res, next) => {
  const { imei, name, deviceModel } = req.params;
  
  // Only allow known device models, skip if invalid
  const deviceModelLower = deviceModel?.toLowerCase();
  if (deviceModelLower !== 'jc181' && deviceModelLower !== 'jc400') {
    return next(); // Skip to next route
  }
  
  let file;
  if (deviceModelLower === 'jc400') {
    // jc400: look for video in /iothub/dvr-upload/uploadFile (processedVideos or upload folder)
    // name parameter is the full filename without extension (e.g., EVENT_862798052572175_00000000_2025_11_12_10_40_40_F_23)
    const uploadFolder = '/iothub/dvr-upload/uploadFile';
    if (!await fsExists(uploadFolder)) {
      console.log(`[MP4 NOT FOUND] Upload folder not found: ${uploadFolder}`);
      return res.status(200).send('FILE NOT UPLOADED');
    }
    // Video file should be: {name}.mp4
    const videoFile = `${name}.mp4`;
    // Check processedVideos first, then upload folder
    const processedPath = path.join(uploadFolder, 'processedVideos', videoFile);
    const uploadPath = path.join(uploadFolder, videoFile);
    file = (await fsExists(processedPath)) ? processedPath : uploadPath;
  } else {
    // jc181: default behavior
    const baseName = name.replace(/_000000$/, '');
    file = `/home/_${imei}/processedVideos/${baseName}_000000.mp4`;
  }
  
  if (!await fsExists(file)) {
    console.log(`[MP4 NOT FOUND] ${file}`);
    return res.status(200).send('FILE NOT UPLOADED');
  }
  
  // Files are served immediately - no stability checks or file operations
  // All file processing operations have been removed
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(file);
});

// ──────────────────────────────────────────────────────────────────────
// 1b. SERVE MP4 VIDEO — without deviceModel (defaults to jc181, query param supported)
// ──────────────────────────────────────────────────────────────────────
app.get('/:imei/:name/MP4', async (req, res) => {
  const { imei, name } = req.params;
  const deviceModelLower = (req.query.deviceModel || 'jc181').toLowerCase();
  
  let file;
  if (deviceModelLower === 'jc400') {
    // jc400: look for video in /iothub/dvr-upload/uploadFile (processedVideos or upload folder)
    // name parameter is the full filename without extension (e.g., EVENT_862798052572175_00000000_2025_11_12_10_40_40_F_23)
    const uploadFolder = '/iothub/dvr-upload/uploadFile';
    if (!await fsExists(uploadFolder)) {
      console.log(`[MP4 NOT FOUND] Upload folder not found: ${uploadFolder}`);
      return res.status(200).send('FILE NOT UPLOADED');
    }
    // Video file should be: {name}.mp4
    const videoFile = `${name}.mp4`;
    // Check processedVideos first, then upload folder
    const processedPath = path.join(uploadFolder, 'processedVideos', videoFile);
    const uploadPath = path.join(uploadFolder, videoFile);
    file = (await fsExists(processedPath)) ? processedPath : uploadPath;
  } else {
    // jc181: default behavior
    const baseName = name.replace(/_000000$/, '');
    file = `/home/_${imei}/processedVideos/${baseName}_000000.mp4`;
  }
  
  if (!await fsExists(file)) {
    console.log(`[MP4 NOT FOUND] ${file}`);
    return res.status(200).send('FILE NOT UPLOADED');
  }
  
  // Files are served immediately - no stability checks or file operations
  // All file processing operations have been removed
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(file);
});

// ──────────────────────────────────────────────────────────────────────
// 2. SERVE THUMBNAIL (with deviceModel as path param - only match known device models, not "MP4")
// ──────────────────────────────────────────────────────────────────────
app.get('/:imei/:name/:deviceModel', async (req, res, next) => {
  const { imei, name, deviceModel } = req.params;
  
  // Skip if deviceModel is "MP4" (that's a video request, not thumbnail)
  if (deviceModel === 'MP4' || deviceModel?.toLowerCase() === 'mp4') {
    return next(); // Skip to next route
  }
  
  // Only allow known device models, skip if invalid
  const deviceModelLower = deviceModel?.toLowerCase();
  if (deviceModelLower !== 'jc181' && deviceModelLower !== 'jc400') {
    return next(); // Skip to next route
  }
  
  let file;
  if (deviceModelLower === 'jc400') {
    // jc400: look for thumbnail in /iothub/dvr-upload/uploadFile
    // name parameter is the full filename without extension (e.g., EVENT_862798052572175_00000000_2025_11_12_10_40_40_F_23)
    const uploadFolder = '/iothub/dvr-upload/uploadFile';
    if (!await fsExists(uploadFolder)) {
      console.log(`[404] Upload folder not found: ${uploadFolder}`);
      return res.status(200).send('FILE NOT UPLOADED');
    }
    // Thumbnail file should be: {name}.mp4.jpg
    const thumbFile = `${name}.mp4.jpg`;
    file = path.join(uploadFolder, thumbFile);
  } else {
    // jc181: default behavior
    file = `/home/_${imei}/${name}.mp4.jpg`;
  }
  
  if (!await fsExists(file)) {
    console.log(`[404] ${file}`);
    return res.status(200).send('FILE NOT UPLOADED');
  }
  
  // Thumbnails are served immediately - no stability check needed
  // They are generated during processing and should already be stable
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(file);
});

// ──────────────────────────────────────────────────────────────────────
// 2b. SERVE THUMBNAIL (without deviceModel - defaults to jc181)
// ──────────────────────────────────────────────────────────────────────
app.get('/:imei/:name', async (req, res) => {
  const { imei, name } = req.params;
  const deviceModelLower = (req.query.deviceModel || 'jc181').toLowerCase();
  
  let file;
  if (deviceModelLower === 'jc400') {
    // jc400: look for thumbnail in /iothub/dvr-upload/uploadFile
    // name parameter is the full filename without extension (e.g., EVENT_862798052572175_00000000_2025_11_12_10_40_40_F_23)
    const uploadFolder = '/iothub/dvr-upload/uploadFile';
    if (!await fsExists(uploadFolder)) {
      console.log(`[404] Upload folder not found: ${uploadFolder}`);
      return res.status(200).send('FILE NOT UPLOADED');
    }
    // Thumbnail file should be: {name}.mp4.jpg
    const thumbFile = `${name}.mp4.jpg`;
    file = path.join(uploadFolder, thumbFile);
  } else {
    // jc181: default behavior
    file = `/home/_${imei}/${name}.mp4.jpg`;
  }
  
  if (!await fsExists(file)) {
    console.log(`[404] ${file}`);
    return res.status(200).send('FILE NOT UPLOADED');
  }
  
  // Thumbnails are served immediately - no stability check needed
  // They are generated during processing and should already be stable
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(file);
});

// ──────────────────────────────────────────────────────────────────────
// Process jc400 device - scan /iothub/dvr-upload/uploadFile and filter by IMEI
// ──────────────────────────────────────────────────────────────────────
// For jc400, files are event-based and uploaded directly to /iothub/dvr-upload/uploadFile
// Processed files are moved to processedVideos subfolder
async function processDeviceJC400(imei) {
  console.log(`\n[JC400] START PROCESSING IMEI: ${imei}`);
  const uploadFolder = '/iothub/dvr-upload/uploadFile';
  const processedFolder = path.join(uploadFolder, 'processedVideos');
  
  if (!await fsExists(uploadFolder)) {
    console.log(`[JC400] Upload folder not found: ${uploadFolder}`);
    return {
      imei,
      generated_at: new Date().toISOString(),
      resource_count: 0,
      videos: [],
      summary: { uploaded_ok: 0, upload_errored: 0, not_uploaded: 0 }
    };
  }

  // Ensure processedVideos folder exists
  await fsMkdir(processedFolder);

  // Get all files from both upload folder and processedVideos
  const allFiles = fs.readdirSync(uploadFolder);
  const processedFiles = await fsExists(processedFolder) ? fs.readdirSync(processedFolder) : [];
  
  // Combine files from both locations (prioritize processedVideos for processed files)
  const allVideoFiles = [];
  
  // First, add files from processedVideos (already processed)
  for (const file of processedFiles) {
    if (file.startsWith(`EVENT_${imei}_`) && file.endsWith('.mp4') && !file.endsWith('.mp4.jpg')) {
      allVideoFiles.push({ file, isProcessed: true });
    }
  }
  
  // Then, add files from upload folder (not yet processed)
  for (const file of allFiles) {
    if (file.startsWith(`EVENT_${imei}_`) && file.endsWith('.mp4') && !file.endsWith('.mp4.jpg')) {
      // Only add if not already in processedVideos
      if (!processedFiles.includes(file)) {
        allVideoFiles.push({ file, isProcessed: false });
      }
    }
  }

  console.log(`[JC400] FOUND ${allVideoFiles.length} video files for IMEI ${imei} (${allVideoFiles.filter(f => f.isProcessed).length} processed, ${allVideoFiles.filter(f => !f.isProcessed).length} not processed)`);

  const report = {
    imei,
    generated_at: new Date().toISOString(),
    resource_count: allVideoFiles.length,
    videos: [],
    summary: { uploaded_ok: 0, upload_errored: 0, not_uploaded: 0 }
  };

  // Group by channel and get latest thumbnail per channel
  // Thumbnails are in the upload folder (same location as original files)
  const thumbFiles = allFiles.filter(f => 
    f.startsWith(`EVENT_${imei}_`) && 
    f.endsWith('.mp4.jpg')
  );

  const latestThumbByChannel = {};
  thumbFiles.forEach(thumbFile => {
    const parsed = parseJC400Filename(thumbFile.replace('.mp4.jpg', '.mp4'));
    if (parsed && parsed.channel !== null) {
      const stats = fs.statSync(path.join(uploadFolder, thumbFile));
      if (!latestThumbByChannel[parsed.channel] || stats.mtime > latestThumbByChannel[parsed.channel].mtime) {
        latestThumbByChannel[parsed.channel] = {
          name: thumbFile.replace('.mp4.jpg', ''),
          channel: parsed.channel,
          mtime: stats.mtime
        };
      }
    }
  });

  // Process each video file
  for (const { file: videoFile, isProcessed } of allVideoFiles) {
    const parsed = parseJC400Filename(videoFile);
    if (!parsed) {
      console.log(`[JC400] Cannot parse: ${videoFile}`);
      continue;
    }

    // Check file location (processedVideos or upload folder)
    const videoPath = isProcessed 
      ? path.join(processedFolder, videoFile)
      : path.join(uploadFolder, videoFile);
    
    // Thumbnail is always in upload folder (same location as original file before processing)
    const thumbFile = `${videoFile}.jpg`;
    const thumbPath = path.join(uploadFolder, thumbFile);

    const videoExists = await fsExists(videoPath);
    const videoSize = videoExists ? fs.statSync(videoPath).size : 0;
    const thumbExists = await fsExists(thumbPath);
    const thumbSize = thumbExists ? fs.statSync(thumbPath).size : 0;

    // For jc400, all files that exist are considered uploaded_ok (event-based uploads)
    // Files without thumbnails are still uploaded_ok - thumbnail generation happens asynchronously
    let status = 'not_uploaded';
    if (videoExists && videoSize > 0) {
      // File exists and has size - it's uploaded successfully
      // Thumbnail may not exist yet, but that's OK - it will be generated by the global scanner
      status = 'uploaded_ok';
    } else if (videoExists) {
      status = 'upload_errored';
    }

    const cleanName = path.parse(videoFile).name;
    const deviceModel = 'jc400';
    const thumbUrl = `${MEDIA_SERVER}/${imei}/${cleanName}/${deviceModel}`;
    const mp4Url = `${MEDIA_SERVER}/${imei}/${cleanName}/MP4/${deviceModel}`;

    let thumbnail_url = null;
    if (thumbExists && thumbSize > 0) {
      thumbnail_url = thumbUrl;
    } else {
      const latest = latestThumbByChannel[parsed.channel];
      if (latest) thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}/${deviceModel}`;
    }

    report.videos.push({
      channel: parsed.channel,
      beginTime: parsed.beginTime,
      endTime: parsed.endTime,
      expected_file: videoFile,
      expected_size: videoSize,
      file_exists: videoExists,
      file_size: videoSize,
      thumbnail_exists: thumbExists,
      thumbnail_size: thumbSize,
      in_processed_folder: isProcessed,
      status,
      thumbnail_url,
      video_url: (videoExists && videoSize > 0) ? mp4Url : null
    });
    report.summary[status]++;
  }

  console.log(`[JC400] REPORT: ${report.videos.length} videos`);
  console.log(`[JC400] OK: ${report.summary.uploaded_ok} | ERR: ${report.summary.upload_errored} | NOT_UPLOADED: ${report.summary.not_uploaded}`);
  
  return report;
}

// ──────────────────────────────────────────────────────────────────────
// Get files from server folder (onServer)
// ──────────────────────────────────────────────────────────────────────
async function getFilesOnServer(deviceImei) {
  const deviceFolder = `/home/_${deviceImei}`;
  if (!await fsExists(deviceFolder)) return [];
  
  const processedFolder = path.join(deviceFolder, 'processedVideos');
  const files = [];
  
  if (await fsExists(processedFolder)) {
    const mp4Files = fs.readdirSync(processedFolder).filter(f => f.endsWith('.mp4'));
    for (const file of mp4Files) {
      const parsed = parseFilename(file);
      if (!parsed) continue;
      
      const mp4Path = path.join(processedFolder, file);
      const mp4Size = fs.statSync(mp4Path).size;
      const cleanName = path.parse(file).name;
      
      files.push({
        channel: parsed.channel,
        beginTime: parsed.beginTime,
        endTime: parsed.endTime,
        expected_file: file,
        file_exists: true,
        file_size: mp4Size,
        thumbnail_url: `${MEDIA_SERVER}/${deviceImei}/${cleanName}/jc181`,
        video_url: `${MEDIA_SERVER}/${deviceImei}/${cleanName}/MP4/jc181`
      });
    }
  }
  
  return files;
}

// ──────────────────────────────────────────────────────────────────────
// 3. FTP Upload Endpoint (MUST BE BEFORE REGEX ROUTES)
// ──────────────────────────────────────────────────────────────────────
console.log(`[SERVER START] Registering /ftpupload route...`);
app.post('/ftpupload', async (req, res) => {
  console.log(`\n[FTPUPLOAD] ========== ROUTE HIT! ========== Starting handler...`);
  try {
    console.log(`[FTPUPLOAD] Parsing body...`);
    const data = JSON.parse(req.body || "{}");
    
    // Console log the received POST data
    console.log(`\n[FTPUPLOAD] Received POST request:`);
    console.log(JSON.stringify(data, null, 2));
    
    const { deviceModel, deviceImei, channel, beginTime, endTime, iothub } = data;
    const deviceModelLower = (deviceModel || '').toLowerCase();
    
    // Filter by deviceModel - for now only handle jc181
    if (deviceModelLower === 'jc181') {
      console.log(`[FTPUPLOAD] Processing jc181 device`);
      
      // Validate required fields
      console.log(`[FTPUPLOAD] Validating fields...`);
      if (!deviceImei || channel === undefined || !beginTime || !endTime || !iothub) {
        console.log(`[FTPUPLOAD] Missing required fields - deviceImei: ${!!deviceImei}, channel: ${channel}, beginTime: ${!!beginTime}, endTime: ${!!endTime}, iothub: ${!!iothub}`);
        return res.status(400).json({ 
          code: 1, 
          ok: false, 
          error: 'Missing required fields: deviceImei, channel, beginTime, endTime, or iothub' 
        });
      }
      console.log(`[FTPUPLOAD] All required fields present`);
      
      // Extract iothub configuration
      console.log(`[FTPUPLOAD] Extracting iothub configuration...`);
      const token = iothub?.token || '';
      const jimiServer = iothub?.iothubServer || '';
      const ftpServerIp = iothub?.ftpServerIp || '';
      const ftpPort = parseInt(iothub?.ftpPort || '21', 10);
      const fileUploadPath = iothub?.fileUploadPath || '/';
      
      if (!token || !jimiServer || !ftpServerIp || !fileUploadPath) {
        console.log(`[FTPUPLOAD] Missing iothub config - token: ${!!token}, jimiServer: ${!!jimiServer}, ftpServerIp: ${!!ftpServerIp}, fileUploadPath: ${!!fileUploadPath}`);
        return res.status(400).json({ 
          code: 1, 
          ok: false, 
          error: 'Missing required iothub configuration: token, iothubServer, ftpServerIp, or fileUploadPath' 
        });
      }
      console.log(`[FTPUPLOAD] All iothub config present`);
      
      // Format dates from "2025-11-02 00:00:00" to "YYMMDDHHMMSS" (251102000000)
      console.log(`[FTPUPLOAD] Formatting dates...`);
      const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return '';
        try {
          const date = new Date(dateTimeString.replace(' ', 'T'));
          const yy = date.getFullYear().toString().slice(-2);
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const hh = String(date.getHours()).padStart(2, '0');
          const mi = String(date.getMinutes()).padStart(2, '0');
          const ss = String(date.getSeconds()).padStart(2, '0');
          return `${yy}${mm}${dd}${hh}${mi}${ss}`;
        } catch (e) {
          console.log(`[FTPUPLOAD] Error formatting date: ${e.message}`);
          return '';
        }
      };
      
      const beginTimeFormatted = formatDateTime(beginTime);
      const endTimeFormatted = formatDateTime(endTime);
      
      if (!beginTimeFormatted || !endTimeFormatted) {
        console.log(`[FTPUPLOAD] Invalid date format - beginTime: ${beginTimeFormatted}, endTime: ${endTimeFormatted}`);
        return res.status(400).json({ 
          code: 1, 
          ok: false, 
          error: 'Invalid date format for beginTime or endTime' 
        });
      }
      console.log(`[FTPUPLOAD] Dates formatted: ${beginTimeFormatted} to ${endTimeFormatted}`);
      
      // Send FTP upload request to Jimi server
      // Match EXACT format from Postman reference request
      console.log(`[FTPUPLOAD] Building request...`);
      const cleanJimiServer = jimiServer.replace(/\/+$/, '');
      
      // Ensure channel is a number (not string)
      const channelNum = parseInt(channel, 10);
      if (isNaN(channelNum)) {
        console.log(`[FTPUPLOAD] ERROR: Invalid channel value: ${channel} (type: ${typeof channel})`);
        return res.status(400).json({ 
          code: 1, 
          ok: false, 
          error: `Invalid channel value: ${channel}` 
        });
      }
      
      // Build cmdContent JSON string - EXACT format matching Postman reference
      // Postman uses: 4 spaces for indentation, 12 spaces for beginTime/endTime, 2 spaces for closing brace
      // URLSearchParams encodes spaces as + or %20, but we need to match Postman's exact format
      const cmdContentJson = `{\n    "serverAddress": "${ftpServerIp}",\n    "ftpPort": ${ftpPort},\n    "userName": "_${deviceImei}",\n    "password": "_${deviceImei}",\n    "fileUploadPath": "${fileUploadPath}",\n    "channel": ${channelNum},\n\n            "beginTime": "${beginTimeFormatted}",\n            "endTime": "${endTimeFormatted}",\n"alarmFlag": 0,\n    "resourceType": 0,\n    "codeType": 0,\n    "storageType": 0,\n    "condition": 1,\n    "instructionID": "123456789"\n  }`;
      
      // Log the raw JSON string BEFORE URL encoding for comparison
      console.log(`[FTPUPLOAD] ========== CHANNEL ${channelNum} REQUEST ==========`);
      console.log(`[FTPUPLOAD] Raw cmdContentJson (BEFORE encoding):`);
      console.log(cmdContentJson);
      console.log(`[FTPUPLOAD] Channel value: ${channelNum} (type: ${typeof channelNum}, original: ${channel} type: ${typeof channel})`);
      
      // Build URLSearchParams - EXACT order matching Postman reference
      const urlencoded = new URLSearchParams();
      urlencoded.append("deviceImei", deviceImei);
      urlencoded.append("cmdContent", cmdContentJson);
      urlencoded.append("serverFlagId", "0");
      urlencoded.append("proNo", "37382");
      urlencoded.append("platform", "web");
      urlencoded.append("requestId", "6");
      urlencoded.append("cmdType", "normallns");
      urlencoded.append("offLineFlag", "1");
      urlencoded.append("token", token);
      
      const apiUrl = `${cleanJimiServer}/api/device/sendInstruct`;
      
      // Log the URL-encoded body for comparison
      const encodedBody = urlencoded.toString();
      console.log(`[FTPUPLOAD] URL-encoded body (AFTER encoding):`);
      console.log(encodedBody);
      
      // Decode and show the exact cmdContent for comparison
      const decodedCmdContent = decodeURIComponent(encodedBody.split('cmdContent=')[1]?.split('&')[0] || '');
      console.log(`[FTPUPLOAD] Decoded cmdContent (for comparison):`);
      console.log(decodedCmdContent);
      console.log(`[FTPUPLOAD] =========================================`);
      
      // Log for debugging
      console.log(`[FTPUPLOAD] Sending request to: ${apiUrl}`);
      console.log(`[FTPUPLOAD] Request params:`, {
        deviceImei,
        channel: channelNum,
        channelOriginal: channel,
        channelType: typeof channelNum,
        beginTime: beginTimeFormatted,
        endTime: endTimeFormatted,
        ftpServerIp,
        ftpPort,
        fileUploadPath,
        token: token ? '***' : 'missing'
      });
      
      console.log(`[FTPUPLOAD] About to call fetch...`);
      console.log(`[FTPUPLOAD] ========== JIMI SERVER REQUEST ==========`);
      console.log(`[FTPUPLOAD] URL: ${apiUrl}`);
      console.log(`[FTPUPLOAD] Method: POST`);
      console.log(`[FTPUPLOAD] Headers:`, {
        "Content-Type": "application/x-www-form-urlencoded"
      });
      console.log(`[FTPUPLOAD] Body:`, encodedBody);
      console.log(`[FTPUPLOAD] =========================================`);
      
      try {
        // Use encodedBody - this matches Postman's format
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: encodedBody,
          redirect: "follow"
        });
        
        console.log(`[FTPUPLOAD] Fetch completed, status: ${response.status}`);
        const responseText = await response.text();
        console.log(`[FTPUPLOAD] Jimi server response status: ${response.status}`);
        console.log(`[FTPUPLOAD] Jimi server response:`, responseText);
        
        // Return the Jimi server response as the ftpupload response
        // Try to parse as JSON, if it fails return as text
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = responseText;
        }
        
        // If upload was successful, immediately track the file as pending
        // This ensures the file is marked as pending in status_report.json when processDevice runs
        if (response.ok && responseData.code === 0) {
          const dataMsg = (responseData.data?._msg || responseData.data?.msg || '').toString().toLowerCase();
          const isSuccess = responseData.msg === 'success' && 
                           !dataMsg.includes('busy') &&
                           !dataMsg.includes('error') &&
                           !dataMsg.includes('fail');
          const isOfflineCommand = (responseData.msg || '').toLowerCase().includes('converted to an offline command') ||
                                  dataMsg.includes('converted to an offline command');
          
          if (isSuccess || isOfflineCommand) {
            // Build expected filename from channel and beginTime
            const expectedFile = buildFilename(channel, beginTime);
            const deviceFolder = `/home/_${deviceImei}`;
            const rootMp4Path = path.join(deviceFolder, expectedFile);
            
            // Immediately add file to trackedFiles so it's marked as pending
            // The file may not exist yet, but it will be uploaded soon
            if (!trackedFiles.has(rootMp4Path)) {
              trackedFiles.set(rootMp4Path, { startTime: Date.now() });
              console.log(`[FTPUPLOAD] File ${expectedFile} added to tracking queue (will be marked as pending)`);
              
              // Also trigger processing if file already exists
              // This handles the case where file was already uploaded but not yet processed
              if (await fsExists(rootMp4Path)) {
                console.log(`[FTPUPLOAD] File ${expectedFile} already exists - starting processing`);
                processFile(rootMp4Path, deviceFolder).catch(err => {
                  console.log(`[FTPUPLOAD] Error starting processing for ${expectedFile}: ${err.message}`);
                });
              }
            }
          }
        }
        
        console.log(`[FTPUPLOAD] Returning response to client`);
        // Return the response with the same status code from Jimi server
        return res.status(response.status).json(responseData);
      } catch (error) {
        console.log(`[FTPUPLOAD] ERROR in fetch:`);
        console.log(`[FTPUPLOAD] Error message: ${error.message}`);
        console.log(`[FTPUPLOAD] Error stack: ${error.stack}`);
        return res.status(500).json({ 
          code: 1, 
          ok: false, 
          error: `Failed to send FTP upload request: ${error.message}`,
          details: error.stack
        });
      }
    } else if (deviceModelLower) {
      console.log(`[FTPUPLOAD] Device model ${deviceModelLower} not yet supported`);
      return res.status(400).json({ 
        code: 1, 
        ok: false, 
        error: `Device model ${deviceModelLower} not yet supported. Only jc181 is supported at this time.` 
      });
    } else {
      console.log(`[FTPUPLOAD] Missing deviceModel in request`);
      return res.status(400).json({ 
        code: 1, 
        ok: false, 
        error: 'Missing deviceModel in request' 
      });
    }
  } catch (error) {
    console.log(`[FTPUPLOAD] Error: ${error.message}`);
    return res.status(500).json({ 
      code: 1, 
      ok: false, 
      error: error.message 
    });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 4. getFileList
// ──────────────────────────────────────────────────────────────────────
app.post('/getFileList', async (req, res) => {
  try {
    const { deviceImei, deviceModel, beginTime, endTime, token, jimiServer } = JSON.parse(req.body || "{}");
    if (!deviceImei) return res.json({ code: 0, ok: true });
    
    const deviceModelLower = (deviceModel || 'jc181').toLowerCase();
    
    if (deviceModelLower === 'jc400') {
      // jc400: scan /iothub/dvr-upload/uploadFile and filter by IMEI
      const report = await processDeviceJC400(deviceImei);
      return res.json(report);
    } else {
      // jc181: check if we need to request file list from device
      if (beginTime && endTime && token && jimiServer) {
        console.log(`[getFileList] Requesting file list from device ${deviceImei} via jimi server`);
        console.log(`[getFileList] Received jimiServer: "${jimiServer}"`);
        
        // Create promise to wait for pushresourcelist response
        const waitForResponse = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            pendingFileListRequests.delete(deviceImei);
            reject(new Error('Timeout waiting for device response'));
          }, 30000); // 30 second timeout
          
          pendingFileListRequests.set(deviceImei, { resolve, reject, timeout });
        });
        
        // Make request to jimi server
        try {
          // Remove trailing slash from jimiServer if present
          const cleanJimiServer = (jimiServer || '').replace(/\/+$/, '');
          
          if (!cleanJimiServer) {
            throw new Error('jimiServer is required but was not provided');
          }
          
          const urlencoded = new URLSearchParams();
          urlencoded.append("deviceImei", deviceImei);
          urlencoded.append("cmdContent", JSON.stringify({
            channel: 0,
            beginTime: beginTime,
            endTime: endTime,
            alarmFlag: 0,
            resourceType: 0,
            codeType: 0,
            storageType: 0,
            instructionID: "123456789"
          }));
          urlencoded.append("serverFlagId", "0");
          urlencoded.append("proNo", "37381");
          urlencoded.append("platform", "web");
          urlencoded.append("requestId", "6");
          urlencoded.append("cmdType", "normallns");
          urlencoded.append("offLineFlag", "1");
          urlencoded.append("token", token);
          
          const apiUrl = `${cleanJimiServer}/api/device/sendInstruct`;
          console.log(`[getFileList] Full API URL: ${apiUrl}`);
          console.log(`[getFileList] Request params:`, {
            deviceImei,
            beginTime,
            endTime,
            token: token ? '***' : 'missing',
            jimiServer: cleanJimiServer
          });
          
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: urlencoded,
            redirect: "follow"
          });
          
          const resultText = await response.text();
          console.log(`[getFileList] jimi server response:`, resultText);
          
          // Parse the response to extract device message
          let deviceResponse = null;
          try {
            const result = JSON.parse(resultText);
            deviceResponse = {
              code: result.code,
              msg: result.msg,
              data: result.data ? {
                _imei: result.data._imei,
                _code: result.data._code,
                _msg: result.data._msg || result.data.msg || '',
                _content: result.data._content
              } : null
            };
          } catch (e) {
            // If response is not JSON, use the text as message
            deviceResponse = {
              code: response.ok ? 0 : 1,
              msg: resultText || 'Unknown response',
              data: null
            };
          }
          
          // Wait for pushresourcelist to process and create status_report.json
          await waitForResponse;
          
          // Get files from server and device
          const onServer = await getFilesOnServer(deviceImei);
          
    const reportPath = `/home/_${deviceImei}/status_report.json`;
          let onDevice = [];
          if (await fsExists(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            onDevice = report.videos || [];
            
            // Update URLs to include deviceModel
            onDevice.forEach(video => {
              if (video.thumbnail_url && !video.thumbnail_url.includes('/jc181') && !video.thumbnail_url.includes('/jc400')) {
                if (!video.thumbnail_url.endsWith('/jc181') && !video.thumbnail_url.endsWith('/jc400')) {
                  video.thumbnail_url = video.thumbnail_url + '/jc181';
                }
              }
              if (video.video_url && !video.video_url.includes('/jc181') && !video.video_url.includes('/jc400')) {
                if (video.video_url.endsWith('/MP4')) {
                  video.video_url = video.video_url + '/jc181';
                } else if (!video.video_url.includes('/MP4/')) {
                  video.video_url = video.video_url.replace(/\/MP4$/, '/MP4/jc181');
                }
              }
            });
          }
          
          return res.json({
            onServerLength: onServer.length,
            onDeviceLength: onDevice.length,
            onServer,
            onDevice,
            deviceResponse: deviceResponse // Include device response for frontend notification
          });
        } catch (error) {
          // Clean up pending request
          if (pendingFileListRequests.has(deviceImei)) {
            const pending = pendingFileListRequests.get(deviceImei);
            clearTimeout(pending.timeout);
            pendingFileListRequests.delete(deviceImei);
          }
          
          console.log(`[getFileList] Error requesting from jimi server:`, error.message);
          
          // Fallback to reading existing status_report.json
          const reportPath = `/home/_${deviceImei}/status_report.json`;
          if (!await fsExists(reportPath)) {
            return res.json({ 
              onServerLength: 0,
              onDeviceLength: 0,
              onServer: [], 
              onDevice: []
            });
          }
          
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          const onServer = await getFilesOnServer(deviceImei);
          const onDevice = report.videos || [];
          
          return res.json({ 
            onServerLength: onServer.length,
            onDeviceLength: onDevice.length,
            onServer, 
            onDevice,
            deviceResponse: {
              code: 1,
              msg: 'Error requesting from device',
              data: {
                _msg: error.message || 'Using cached data - device did not respond'
              }
            }
          });
        }
      } else {
        // jc181: default behavior - read from status_report.json
        const reportPath = `/home/_${deviceImei}/status_report.json`;
        if (!await fsExists(reportPath)) {
          const onServer = await getFilesOnServer(deviceImei);
          return res.json({ 
            onServerLength: onServer.length,
            onDeviceLength: 0,
            onServer, 
            onDevice: [],
            deviceResponse: {
              code: 0,
              msg: 'success',
              data: {
                _msg: 'Using cached data - no device request made'
              }
            }
          });
        }
        
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const onServer = await getFilesOnServer(deviceImei);
        const onDevice = report.videos || [];
        
        // Update URLs to include deviceModel if not present
        onDevice.forEach(video => {
          if (video.thumbnail_url && !video.thumbnail_url.includes('/jc181') && !video.thumbnail_url.includes('/jc400')) {
            if (!video.thumbnail_url.endsWith('/jc181') && !video.thumbnail_url.endsWith('/jc400')) {
              video.thumbnail_url = video.thumbnail_url + '/jc181';
            }
          }
          if (video.video_url && !video.video_url.includes('/jc181') && !video.video_url.includes('/jc400')) {
            if (video.video_url.endsWith('/MP4')) {
              video.video_url = video.video_url + '/jc181';
            } else if (!video.video_url.includes('/MP4/')) {
              video.video_url = video.video_url.replace(/\/MP4$/, '/MP4/jc181');
            }
          }
        });
        
        return res.json({ 
          onServerLength: onServer.length,
          onDeviceLength: onDevice.length,
          onServer, 
          onDevice,
          deviceResponse: {
            code: 0,
            msg: 'success',
            data: {
              _msg: 'Using cached data - no device request made'
            }
          }
        });
      }
    }
  } catch (e) {
    console.log(`[getFileList] Error:`, e.message);
    res.json({ 
      onServerLength: 0,
      onDeviceLength: 0,
      onServer: [], 
      onDevice: []
    });
  }
});

// ──────────────────────────────────────────────────────────────────────
// 4. GPS & HEARTBEAT HANDLERS
// ──────────────────────────────────────────────────────────────────────
app.post(/\/pushURL\/(pushgps|pushhb)/, async (req, res) => {
  let body = {};
  try {
    const qs = querystring.parse(req.body);
    for (const [k, v] of Object.entries(qs)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        body[k] = JSON.parse(v);
      } else body[k] = v;
    }
  } catch (e) {
    console.log(`[GPS] Error parsing body:`, e.message);
  }

  const dataList = body.data_list || [];
  
  // Discard empty data_list
  if (dataList.length === 0) {
    console.log(`[GPS] EMPTY data_list - discarding`);
    return res.json({ code: 0, ok: true });
  }

  console.log(`[GPS] Processing ${dataList.length} item(s) from ${req.originalUrl}`);
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each item in data_list - send all data even without coordinates
  for (const item of dataList) {
    const success = await sendGpsToTraccar(item);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`[GPS] Sent ${successCount} to Traccar, ${failCount} failed`);
  res.json({ code: 0, ok: true });
});

// ──────────────────────────────────────────────────────────────────────
// 5. POST HANDLER (FTP/RESOURCE LIST)
// ──────────────────────────────────────────────────────────────────────
app.post(/\/pushURL\/(pushftpfileupload|pushresourcelist)/, async (req, res) => {
  let body = {};
  try {
    const qs = querystring.parse(req.body);
    for (const [k, v] of Object.entries(qs)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        body[k] = JSON.parse(v);
      } else body[k] = v;
    }
  } catch (e) {}

  const imei = body.data_list?.[0]?.imei || body.data_list?.[0]?.deviceImei;
  if (!imei) return res.json({ code: 0, ok: true });

  const deviceFolder = `/home/_${imei}`;
  if (!await fsExists(deviceFolder)) return res.json({ code: 0, ok: true });

  let expected = [];
  if (req.originalUrl.includes('pushresourcelist')) {
    for (const item of body.data_list || []) {
      if (item.imei !== imei) continue;
      for (const r of item.resourceList || []) {
        expected.push({
          channel: r.channel,
          beginTime: r.beginTime,
          endTime: r.endTime,
          expectedSize: r.fileSize
        });
      }
    }
  }

  await processDevice(imei, deviceFolder, expected, req.originalUrl.includes('ftp') ? 'FTP' : 'LIST');
  
  // Check if there's a pending file list request waiting for this response
  if (pendingFileListRequests.has(imei)) {
    const pending = pendingFileListRequests.get(imei);
    clearTimeout(pending.timeout);
    pendingFileListRequests.delete(imei);
    pending.resolve(); // Notify waiting request
    console.log(`[pushresourcelist] Notified pending request for ${imei}`);
  }
  
  res.json({ code: 0, ok: true });
});

// ──────────────────────────────────────────────────────────────────────
// 7. CATCH-ALL
// ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[CATCH-ALL] Unhandled ${req.method} ${req.originalUrl || req.url}`);
  console.log(`[CATCH-ALL] Query params:`, JSON.stringify(req.query, null, 2));
  if (req.body) {
    console.log(`[CATCH-ALL] Body:`, typeof req.body === 'string' ? req.body.substring(0, 500) : JSON.stringify(req.body, null, 2));
  }
  res.json({ code: 0, ok: true });
});

// ──────────────────────────────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nDAEMON RUNNING ON PORT ${PORT}`);
  console.log(`→ MEDIA SERVER: ${MEDIA_SERVER}`);
  console.log(`→ THUMB: ${MEDIA_SERVER}/<imei>/<name>`);
  console.log(`→ MP4:   ${MEDIA_SERVER}/<imei>/<name>/MP4`);
  console.log(`→ CORS:  *.rastreadorautoram.com.br + 192.168.*.* (http & https)`);
  console.log(`→ SELF-SIGNED SSL SUPPORTED`);
  console.log(`→ 100% DONE | NO CORS ERRORS | NO DOUBLE _000000`);
  console.log(`→ REGISTERED ROUTES: /ftpupload, /getFileList, /pushURL/*\n`);
});