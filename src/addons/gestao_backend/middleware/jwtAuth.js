import jwt from 'jsonwebtoken';

export const requireJwtAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido ou formato inválido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.driverId = decoded.driverId;
        next();
    } catch (error) {
        console.error('Erro na verificação do JWT:', error.message);
        return res.status(401).json({
            error: `Token de autenticação inválido ou expirado: ${error.message}`
        });
    }
};
