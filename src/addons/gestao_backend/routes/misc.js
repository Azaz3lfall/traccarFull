import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function registerMiscRoutes(app, { pool, requireAuthAndFilter, upload }) {
    app.get('/', (req, res) => {
        res.send('Servidor da API de Gestão está no ar e acessível!');
    });

    app.get('/api/devices', requireAuthAndFilter, async (req, res) => {
        try {
            const devices =
                req.userDeviceIds != null
                    ? req.userDeviceIds
                    : req.userVehicleIds === 'ALL'
                        ? []
                        : req.userVehicleIds;
            res.json(devices);
        } catch (error) {
            console.error('Erro ao buscar dispositivos:', error);
            res.status(500).json({ error: 'Erro ao conectar com a API do Traccar.' });
        }
    });

    app.get('/api/reports/route', requireAuthAndFilter, async (req, res) => {
        const { deviceId, from, to } = req.query;
        if (!deviceId || !from || !to) {
            return res.status(400).json({ error: 'deviceId, from e to são obrigatórios.' });
        }
        try {
            const allowedIds = req.userDeviceIds || (req.userVehicleIds === 'ALL' ? [] : req.userVehicleIds);
            if (Array.isArray(allowedIds) && !allowedIds.includes(Number(deviceId))) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            const response = await axios.get(`${process.env.TRACCAR_API_URL}/reports/route`, {
                params: { deviceId, from: new Date(from).toISOString(), to: new Date(to).toISOString() },
                headers: { Cookie: req.headers.cookie }
            });
            res.json(response.data);
        } catch (error) {
            console.error('Erro ao buscar rota:', error);
            res.status(500).json({ error: 'Erro ao conectar com a API do Traccar.' });
        }
    });

    app.post('/gestao/upload', requireAuthAndFilter, upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
    });

    const uploadsDir = path.resolve(__dirname, '../../../../uploads');
    app.get('/gestao/abastecimentos/image/:filename', requireAuthAndFilter, (req, res) => {
        const safeFilename = path.basename(req.params.filename);
        const filePath = path.join(uploadsDir, safeFilename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Imagem não encontrada.' });
        const ext = path.extname(safeFilename).toLowerCase();
        const contentTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
        res.sendFile(filePath);
    });

    app.get('/gestao/uploads/:filename', requireAuthAndFilter, (req, res) => {
        const safeFilename = path.basename(req.params.filename);
        const filePath = path.join(uploadsDir, safeFilename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado.' });
        const ext = path.extname(safeFilename).toLowerCase();
        const contentTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf'
        };
        res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
        res.sendFile(filePath);
    });
}
