import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import multer from 'multer';
import registerAllRoutes, { registerAuthRoutes } from './routes/index.js';
import { requireAuthAndFilter } from './middleware/authAndFilter.js';
import { requireJwtAuth } from './middleware/jwtAuth.js';
import pool from '../traccar_wrapper/db/index.js';
import telecomPool from '../telecom/db/index.js';
import registerTelecomRoutes from '../telecom/routes/index.js';
import registerOSRoutes from '../os_backend/routes/index.js';
import { startCommandScheduler } from './schedulers/commandScheduler.js';
import { startRouteBlockMonitor } from './schedulers/routeBlockMonitor.js';
import { startJ16DoorMonitor } from './schedulers/j16DoorMonitor.js';
import { startCommandEventMonitor } from './schedulers/commandEventMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.GESTAO_PORT || 3666;

const uploadsDir = resolve(__dirname, '../../../../uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

app.use(
    cors({
        origin: process.env.FRONTEND_URL || '*',
        credentials: true
    })
);
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secreto-super-seguro',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

registerAuthRoutes(app, { pool });

app.use('/gestao', requireAuthAndFilter);
app.use('/api', requireAuthAndFilter);

const ctx = { pool, requireAuthAndFilter, requireJwtAuth, upload };
registerAllRoutes(app, ctx);
registerTelecomRoutes(app, { pool: telecomPool, requireAuthAndFilter });
registerOSRoutes(app, { pool, requireAuthAndFilter });

app.get('/', (req, res) => {
    res.json({
        service: 'Gestão Backend (Unificado)',
        port: PORT,
        status: 'Online',
        database: process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'
    });
});

app.listen(PORT, () => {
    console.log(`\n🚗 Gestão Backend unificado rodando na porta ${PORT}`);
    console.log(`👉 Rotas: /auth/*, /gestao/*, /api/*, /app/motorista/*`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'OK' : 'Faltando DATABASE_URL'}`);
    console.log(`📱 Comtele SMS: ${process.env.COMTELE_API_KEY ? 'OK (COMTELE_API_KEY configurada)' : 'Não configurada'}`);
    console.log(`📋 OS Backend: ${process.env.DATABASE_OS_URL || process.env.DATABASE_URL ? 'OK' : 'Faltando DATABASE_OS_URL'}\n`);

    startCommandScheduler().catch((e) => {
        console.error('Falha ao iniciar agendador de comandos:', e?.message);
    });
    startRouteBlockMonitor().catch((e) => {
        console.error('Falha ao iniciar monitor de bloqueio por rota:', e?.message);
    });
    startJ16DoorMonitor().catch((e) => {
        console.error('Falha ao iniciar monitor de porta J16+:', e?.message);
    });
    startCommandEventMonitor().catch((e) => {
        console.error('Falha ao iniciar monitor de comandos:', e?.message);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    process.exit(0);
});
