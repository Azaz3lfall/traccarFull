import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { glob } from 'glob';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define data directory paths
const DATA_DIR = process.env.RBAC_DATA_DIR || '/opt/addons/rbac/data';
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.RBAC_PORT || 5555;

// CORS configuration - Allow all origins for development/custom domains
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// GET endpoint for listing roles
app.get('/api/roles', async (req, res) => {
    try {
        const jsonFiles = await glob('*.json', { cwd: DATA_DIR });
        const roles = [];

        for (const jsonFile of jsonFiles) {
            try {
                const filePath = path.join(DATA_DIR, jsonFile);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const roleData = JSON.parse(fileContent);
                roles.push(roleData);
            } catch (fileError) {
                console.error('❌ Error reading file:', jsonFile, fileError.message);
            }
        }

        res.json({
            success: true,
            roles: roles,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles', message: error.message });
    }
});

// POST endpoint for creating a role
app.post('/api/roles', (req, res) => {
    try {
        const roleData = req.body;
        if (!roleData.name) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        const roleId = roleData.id || uuidv4();
        const newRole = {
            ...roleData,
            id: roleId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const filePath = path.join(DATA_DIR, `role_${roleId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(newRole, null, 2));

        res.json({
            success: true,
            role: newRole,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role', message: error.message });
    }
});

// PUT endpoint for updating a role
app.put('/api/roles/:id', (req, res) => {
    try {
        const roleId = req.params.id;
        const roleUpdate = req.body;
        const filePath = path.join(DATA_DIR, `role_${roleId}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const existingRoleContent = fs.readFileSync(filePath, 'utf8');
        const existingRole = JSON.parse(existingRoleContent);

        const updatedRole = {
            ...existingRole,
            ...roleUpdate,
            id: roleId,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(updatedRole, null, 2));

        res.json({
            success: true,
            role: updatedRole,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role', message: error.message });
    }
});

// DELETE endpoint for deleting a role
app.delete('/api/roles/:id', (req, res) => {
    try {
        const roleId = req.params.id;
        const filePath = path.join(DATA_DIR, `role_${roleId}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Role not found' });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Role deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 RBAC Server running on port ${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
});
