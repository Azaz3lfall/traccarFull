import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export default function registerAuthRoutes(app, { pool }) {
    app.post('/auth/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        }
        try {
            const traccarAuth = await axios.post(
                `${process.env.TRACCAR_API_URL}/api/session`,
                new URLSearchParams({ email, password }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            req.session.traccarCookie = traccarAuth.headers['set-cookie'];
            req.session.userEmail = email;
            req.session.userPassword = password;
            res.status(200).json({ message: 'Autenticação bem-sucedida.' });
        } catch (error) {
            console.error('Erro de autenticação com Traccar:', error.response?.data || error.message);
            res.status(401).json({ error: 'Credenciais inválidas.' });
        }
    });

    app.post('/auth/driver-login', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }
        try {
            const userResult = await pool.query(
                'SELECT driver_id, password_hash FROM driver_users WHERE username = $1 AND is_active = TRUE',
                [username]
            );
            if (userResult.rowCount === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }
            const user = userResult.rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }
            const token = jwt.sign(
                { driverId: user.driver_id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            res.status(200).json({ message: 'Login do motorista bem-sucedido.', token });
        } catch (error) {
            console.error('Erro no login do motorista:', error);
            res.status(500).json({ error: 'Erro interno no servidor. Tente novamente mais tarde.' });
        }
    });

    app.post('/auth/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Não foi possível encerrar a sessão.' });
            }
            res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
        });
    });

    app.post('/auth/driver-logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Não foi possível encerrar a sessão do motorista.' });
            }
            res.status(200).json({ message: 'Sessão de motorista encerrada com sucesso.' });
        });
    });

    app.post('/gestao/auth/sync', async (req, res) => {
        const headerCookie = req.headers.cookie;
        if (!headerCookie) {
            return res.status(401).json({ error: 'Cookie do Traccar não encontrado no cabeçalho' });
        }
        try {
            const userResponse = await axios.get(`${process.env.TRACCAR_API_URL}/api/session`, {
                headers: { Cookie: headerCookie }
            });
            if (userResponse.data) {
                req.session.traccarCookie = headerCookie;
                req.session.currentUser = userResponse.data;
                return res.json({
                    success: true,
                    user: {
                        id: userResponse.data.id,
                        name: userResponse.data.name,
                        email: userResponse.data.email,
                        administrator: userResponse.data.administrator
                    }
                });
            }
            res.status(401).json({ error: 'Cookie do Traccar inválido.' });
        } catch (error) {
            console.error('Erro na sincronização de sessão:', error.message);
            res.status(401).json({ error: 'Falha ao sincronizar sessão com Traccar.' });
        }
    });
}
