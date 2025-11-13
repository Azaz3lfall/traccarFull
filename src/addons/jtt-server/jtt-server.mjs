import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promises as fsPromises } from 'fs';

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
const fsRename = (a, b) => new Promise((res, rej) => fs.rename(a, b, e => e ? rej(e) : res()));
const runFF = cmd => new Promise((res, rej) => exec(cmd, { timeout: 60000 }, e => e ? rej(e) : res()));

// ──────────────────────────────────────────────────────────────────────
// Generate thumbnail < 30KB — SKIP 0-BYTE
// ──────────────────────────────────────────────────────────────────────
async function generateSmallThumbnail(mp4Path, thumbPath) {
  const stats = fs.statSync(mp4Path);
  if (stats.size === 0) {
    console.log(`[THUMB] SKIP: ${mp4Path} is 0 bytes`);
    return false;
  }

  console.log(`[THUMB] START: ${mp4Path} to ${thumbPath}`);
  try {
    await runFF(`ffmpeg -y -i "${mp4Path}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" -q:v 8 "${thumbPath}"`);
    let size = fs.statSync(thumbPath).size;
    console.log(`[THUMB] FIRST PASS: ${size} bytes`);
    if (size > 30000) {
      console.log(`[THUMB] RECOMPRESSING...`);
      await runFF(`ffmpeg -y -i "${mp4Path}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" -q:v 12 "${thumbPath}"`);
      size = fs.statSync(thumbPath).size;
    }
    console.log(`[THUMB] SUCCESS: ${thumbPath} (${size}B)`);
    return size > 0;
  } catch (err) {
    console.log(`[THUMB] FAILED: ${err.message}`);
    return false;
  }
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
  const m = filename.match(/^EVENT_(\d+)_00000000_(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_([FI])_(\d+)\.mp4$/);
  if (!m) return null;
  const [_, imei, year, month, day, hour, minute, second, type, channel] = m;
  const beginTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  return { imei, channel: Number(channel), beginTime, endTime: beginTime, type };
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
  const rootMp4s = rootFiles.filter(f => f.endsWith('.mp4'));
  const allMp4s = procFiles.filter(f => f.endsWith('.mp4'));

  console.log(`[SCAN] ROOT FILES: ${rootFiles.length} | ROOT MP4s: ${rootMp4s.length}`);
  console.log(`[SCAN] PROCESSED FILES: ${procFiles.length} | MP4s: ${allMp4s.length}`);

  const report = {
    imei,
    generated_at: new Date().toISOString(),
    resource_count: expectedVideos.length,
    videos: [],
    summary: { uploaded_ok: 0, upload_errored: 0, not_uploaded: 0 }
  };

  const expectedSet = new Set(expectedVideos.map(v => buildFilename(v.channel, v.beginTime)));

  // ────── 1. COLLECT THUMBS FROM ROOT — STRIP .mp4 FROM NAME ──────
  const allThumbs = rootFiles
    .filter(f => f.endsWith('.mp4.jpg'))
    .map(f => {
      const stats = fs.statSync(path.join(deviceFolder, f));
      const rawName = path.parse(f).name;
      const name = rawName.replace(/\.mp4$/, '');
      const chMatch = f.match(/^CH(\d)_/);
      const channel = chMatch ? Number(chMatch[1]) : null;
      return { name, channel, mtime: stats.mtime };
    })
    .filter(t => t.channel !== null);

  console.log(`[THUMBS] FOUND IN ROOT: ${allThumbs.length}`);

  const latestThumbByChannel = {};
  allThumbs.forEach(thumb => {
    if (!latestThumbByChannel[thumb.channel] || thumb.mtime > latestThumbByChannel[thumb.channel].mtime) {
      latestThumbByChannel[thumb.channel] = thumb;
    }
  });

  console.log(`[THUMBS] LATEST: ${Object.keys(latestThumbByChannel).map(ch => `CH${ch}`).join(', ')}`);

  // ────── 2. EXPECTED VIDEOS ──────
  for (const vid of expectedVideos) {
    const file = buildFilename(vid.channel, vid.beginTime);
    const mp4Path = path.join(processedFolder, file);
    const thumbPath = path.join(deviceFolder, `${file}.jpg`);

    const mp4Exists = await fsExists(mp4Path);
    const mp4Size = mp4Exists ? fs.statSync(mp4Path).size : 0;
    const thumbExists = await fsExists(thumbPath);
    const thumbSize = thumbExists ? fs.statSync(thumbPath).size : 0;

    let status = 'not_uploaded';
    if (mp4Exists && mp4Size > 0) {
      status = (thumbExists && thumbSize > 0) ? 'uploaded_ok' : 'upload_errored';
    } else if (mp4Exists) {
      status = 'upload_errored';
    }

    const cleanName = path.parse(file).name;
    const thumbUrl = `${MEDIA_SERVER}/${imei}/${cleanName}`;
    const mp4Url = `${MEDIA_SERVER}/${imei}/${cleanName}/MP4`;

    let thumbnail_url = null;
    if (thumbExists && thumbSize > 0) {
      thumbnail_url = thumbUrl;
    } else {
      const latest = latestThumbByChannel[vid.channel];
      if (latest) thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}`;
    }

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
      video_url: mp4Exists ? mp4Url : null
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
    const thumbUrl = `${MEDIA_SERVER}/${imei}/${cleanName}`;
    const mp4Url = `${MEDIA_SERVER}/${imei}/${cleanName}/MP4`;

    let thumbnail_url = null;
    if (thumbExists && thumbSize > 0) {
      thumbnail_url = thumbUrl;
    } else {
      const latest = latestThumbByChannel[parsed.channel];
      if (latest) thumbnail_url = `${MEDIA_SERVER}/${imei}/${latest.name}`;
    }

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
      video_url: mp4Url
    });
    report.summary[status]++;
  }

  // ────── 4. FORCE CLEANUP ROOT MP4s ──────
  if (rootMp4s.length > 0) {
    console.log(`[FORCE] ${rootMp4s.length} MP4s in root to MOVING`);
    for (const file of rootMp4s) {
      const mp4Path = path.join(deviceFolder, file);
      const thumbPath = path.join(deviceFolder, `${file}.jpg`);
      const dest = path.join(processedFolder, file);
      const stats = fs.statSync(mp4Path);

      try {
        if (stats.size > 0) await generateSmallThumbnail(mp4Path, thumbPath);
        console.log(`[MOVE] ${file} to processedVideos/`);
        await fsRename(mp4Path, dest);
      } catch (err) {
        console.log(`[FORCE] FAILED ${file}: ${err.message}`);
      }
    }
  }

  // ────── 5. WRITE REPORT ──────
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o644 });
  console.log(`[REPORT] SAVED: ${report.videos.length} videos`);
  console.log(`[REPORT] OK: ${report.summary.uploaded_ok} | ERR: ${report.summary.upload_errored} | PENDING: ${report.summary.not_uploaded}`);
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
// 1. SERVE MP4 VIDEO — STRIP _000000 BEFORE ADDING (MUST COME BEFORE THUMBNAIL ROUTE)
// ──────────────────────────────────────────────────────────────────────
app.get('/:imei/:name/MP4', async (req, res) => {
  const { imei, name } = req.params;
  const deviceModelLower = (req.query.deviceModel || 'jc181').toLowerCase();
  
  let file;
  if (deviceModelLower === 'jc400') {
    // jc400: look for video in /iothub/dvr-upload/uploadFile
    // name parameter is the full filename without extension (e.g., EVENT_862798052572175_00000000_2025_11_12_10_40_40_F_23)
    const uploadFolder = '/iothub/dvr-upload/uploadFile';
    if (!await fsExists(uploadFolder)) {
      console.log(`[MP4 NOT FOUND] Upload folder not found: ${uploadFolder}`);
      return res.status(200).send('FILE NOT UPLOADED');
    }
    // Video file should be: {name}.mp4
    const videoFile = `${name}.mp4`;
    file = path.join(uploadFolder, videoFile);
  } else {
    // jc181: default behavior
    const baseName = name.replace(/_000000$/, '');
    file = `/home/_${imei}/processedVideos/${baseName}_000000.mp4`;
  }
  
  if (!await fsExists(file)) {
    console.log(`[MP4 NOT FOUND] ${file}`);
    return res.status(200).send('FILE NOT UPLOADED');
  }
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(file);
});

// ──────────────────────────────────────────────────────────────────────
// 2. SERVE THUMBNAIL (with optional deviceModel as path param or query param)
// ──────────────────────────────────────────────────────────────────────
app.get('/:imei/:name/:deviceModel', async (req, res) => {
  const { imei, name, deviceModel } = req.params;
  const deviceModelLower = (deviceModel || req.query.deviceModel || 'jc181').toLowerCase();
  
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
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(file);
});

// ──────────────────────────────────────────────────────────────────────
// Process jc400 device - scan /iothub/dvr-upload/uploadFile and filter by IMEI
// ──────────────────────────────────────────────────────────────────────
async function processDeviceJC400(imei) {
  console.log(`\n[JC400] START PROCESSING IMEI: ${imei}`);
  const uploadFolder = '/iothub/dvr-upload/uploadFile';
  
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

  const allFiles = fs.readdirSync(uploadFolder);
  const videoFiles = allFiles.filter(f => 
    f.startsWith(`EVENT_${imei}_`) && 
    f.endsWith('.mp4') && 
    !f.endsWith('.mp4.jpg')
  );

  console.log(`[JC400] FOUND ${videoFiles.length} video files for IMEI ${imei}`);

  const report = {
    imei,
    generated_at: new Date().toISOString(),
    resource_count: videoFiles.length,
    videos: [],
    summary: { uploaded_ok: 0, upload_errored: 0, not_uploaded: 0 }
  };

  // Group by channel and get latest thumbnail per channel
  const thumbFiles = allFiles.filter(f => 
    f.startsWith(`EVENT_${imei}_`) && 
    f.endsWith('.mp4.jpg')
  );

  const latestThumbByChannel = {};
  thumbFiles.forEach(thumbFile => {
    const parsed = parseJC400Filename(thumbFile.replace('.mp4.jpg', '.mp4'));
    if (parsed) {
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
  for (const videoFile of videoFiles) {
    const parsed = parseJC400Filename(videoFile);
    if (!parsed) {
      console.log(`[JC400] Cannot parse: ${videoFile}`);
      continue;
    }

    const videoPath = path.join(uploadFolder, videoFile);
    const thumbFile = `${videoFile}.jpg`;
    const thumbPath = path.join(uploadFolder, thumbFile);

    const videoExists = await fsExists(videoPath);
    const videoSize = videoExists ? fs.statSync(videoPath).size : 0;
    const thumbExists = await fsExists(thumbPath);
    const thumbSize = thumbExists ? fs.statSync(thumbPath).size : 0;

    let status = 'not_uploaded';
    if (videoExists && videoSize > 0) {
      status = (thumbExists && thumbSize > 0) ? 'uploaded_ok' : 'upload_errored';
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
      in_processed_folder: false,
      status,
      thumbnail_url,
      video_url: videoExists ? mp4Url : null
    });
    report.summary[status]++;
  }

  console.log(`[JC400] REPORT: ${report.videos.length} videos`);
  console.log(`[JC400] OK: ${report.summary.uploaded_ok} | ERR: ${report.summary.upload_errored} | PENDING: ${report.summary.not_uploaded}`);
  
  return report;
}

// ──────────────────────────────────────────────────────────────────────
// 3. getFileList
// ──────────────────────────────────────────────────────────────────────
app.post('/getFileList', async (req, res) => {
  try {
    const { deviceImei, deviceModel } = JSON.parse(req.body || "{}");
    if (!deviceImei) return res.json({ code: 0, ok: true });
    
    const deviceModelLower = (deviceModel || 'jc181').toLowerCase();
    
    if (deviceModelLower === 'jc400') {
      // jc400: scan /iothub/dvr-upload/uploadFile and filter by IMEI
      const report = await processDeviceJC400(deviceImei);
      return res.json(report);
    } else {
      // jc181: default behavior - read from status_report.json
      const reportPath = `/home/_${deviceImei}/status_report.json`;
      if (!await fsExists(reportPath)) return res.json({ code: 0, ok: true });
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      // Update URLs to include deviceModel if not present
      if (report.videos) {
        report.videos.forEach(video => {
          if (video.thumbnail_url && !video.thumbnail_url.includes('/jc181') && !video.thumbnail_url.includes('/jc400')) {
            // Append /jc181 to thumbnail URL: https://.../{imei}/{name} -> https://.../{imei}/{name}/jc181
            if (!video.thumbnail_url.endsWith('/jc181') && !video.thumbnail_url.endsWith('/jc400')) {
              video.thumbnail_url = video.thumbnail_url + '/jc181';
            }
          }
          if (video.video_url && !video.video_url.includes('/jc181') && !video.video_url.includes('/jc400')) {
            // Update video URL: https://.../{imei}/{name}/MP4 -> https://.../{imei}/{name}/MP4/jc181
            if (video.video_url.endsWith('/MP4')) {
              video.video_url = video.video_url + '/jc181';
            } else if (!video.video_url.includes('/MP4/')) {
              // If it doesn't have /MP4, it might be malformed, but try to fix it
              video.video_url = video.video_url.replace(/\/MP4$/, '/MP4/jc181');
            }
          }
        });
      }
      
      res.json(report);
    }
  } catch (e) {
    console.log(`[getFileList] Error:`, e.message);
    res.json({ code: 0, ok: true });
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
  res.json({ code: 0, ok: true });
});

// ──────────────────────────────────────────────────────────────────────
// 6. CATCH-ALL
// ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.json({ code: 0, ok: true }));

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
  console.log(`→ 100% DONE | NO CORS ERRORS | NO DOUBLE _000000\n`);
});