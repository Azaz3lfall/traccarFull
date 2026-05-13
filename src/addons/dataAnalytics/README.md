# Data Analytics Server

Backend server for Traccar Data Analytics Reports Builder with template management.

## Overview

This server provides REST API endpoints for managing report templates in the Data Analytics feature. It runs on port 4444 and stores templates as JSON files.

## Features

- **Template Management**: Create, read, update, and delete report templates
- **User-based Filtering**: Templates are filtered by userId and currentDomain
- **File-based Storage**: Templates stored as JSON files in `/opt/addons/dataAnalytics/data/templates/`
- **CORS Enabled**: Allows frontend access from any origin

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and uptime.

### List Templates
```
POST /api/templates/list
Body: { userId: string, currentDomain?: string }
```
Returns all templates for a specific user.

### Get Template
```
GET /api/templates/:id
```
Returns a specific template by ID.

### Create Template
```
POST /api/templates/create
Body: {
  userId: string,
  currentDomain?: string,
  name: string,
  entityType?: string,
  selectedEntities?: array,
  visualizationType?: string,
  configuration?: object
}
```
Creates a new template.

### Update Template
```
POST /api/templates/update
Body: {
  id: string,
  name?: string,
  entityType?: string,
  selectedEntities?: array,
  visualizationType?: string,
  configuration?: object
}
```
Updates an existing template.

### Delete Template
```
POST /api/templates/delete
Body: { id: string }
```
Deletes a template.

## Template Data Structure

```json
{
  "id": "template_1234567890_abc123",
  "userId": "123",
  "currentDomain": "example.com",
  "name": "My Report Template",
  "entityType": "devices",
  "selectedEntities": [1, 2, 3],
  "visualizationType": "table",
  "configuration": {},
  "createdAt": "2025-12-05T10:00:00.000Z",
  "updatedAt": "2025-12-05T10:00:00.000Z"
}
```

## Running the Server

### Standalone
```bash
cd src/addons/dataAnalytics
node dataAnalyticsServer.mjs
```

### With nodemon (development)
```bash
cd src/addons/dataAnalytics
nodemon dataAnalyticsServer.mjs
```

### With main application
The server is automatically started when running `npm start` from the project root.

## Environment Variables

- `DATA_ANALYTICS_PORT`: Server port (default: 4444)

## Storage

Templates are stored in `/opt/addons/dataAnalytics/data/templates/` as individual JSON files named by their template ID.

The directory structure is created automatically on server startup if it doesn't exist.
