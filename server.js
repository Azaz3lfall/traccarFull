import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 3333;
const __filename = fileURLToPath(import.meta.url);
const BUILD_DIR = path.dirname(__filename);

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

function serveIndexHtml(res) {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  serveFile(indexPath, res);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Remove leading slash
  if (pathname.startsWith('/')) {
    pathname = pathname.substring(1);
  }

  // If no path or root, serve index.html
  if (!pathname || pathname === '') {
    serveIndexHtml(res);
    return;
  }

  // Construct full file path
  const filePath = path.join(BUILD_DIR, pathname);

  // Security check: ensure the file is within the build directory
  if (!filePath.startsWith(BUILD_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  console.log(`Requesting: ${pathname}, Full path: ${filePath}`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`File not found: ${filePath}, serving index.html`);
      // File doesn't exist, serve index.html for SPA routing
      serveIndexHtml(res);
    } else {
      console.log(`File found: ${filePath}, serving file`);
      // File exists, serve it
      serveFile(filePath, res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from: ${BUILD_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
