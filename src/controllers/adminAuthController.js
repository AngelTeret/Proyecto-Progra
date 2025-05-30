const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_CONFIG } = require('../config');

// Controlador de autenticación admin
exports.login = async (req, res) => {
    try {
    const { email, password } = req.body;

        // Verificar credenciales - obtener usuario por email
        const [usuarios] = await db.pool.query(
                'SELECT * FROM usuarios_admin WHERE email = ? AND estado = 1',
                [email]
            );

            if (usuarios.length === 0) {
                return res.status(401).json({
                error: 'Credenciales inválidas'
                });
            }

            const usuario = usuarios[0];

        // Verificar contraseña directamente
        if (password !== usuario.password) {
                return res.status(401).json({
                error: 'Credenciales inválidas'
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                {
                    id: usuario.id_usuario,
                    email: usuario.email,
                    rol: usuario.rol
                },
            JWT_CONFIG.secret,
            { expiresIn: JWT_CONFIG.expiresIn }
            );

            // Actualizar último acceso
        await db.pool.query(
                'UPDATE usuarios_admin SET ultimo_acceso = NOW() WHERE id_usuario = ?',
                [usuario.id_usuario]
            );

        // Establecer cookie con el token
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });

            res.json({
                token,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Error al procesar el login'
        });
    }
};

// Middleware para verificar token
exports.verificarToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token no proporcionado'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_CONFIG.secret);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }
};

// Middleware para verificar rol de admin
exports.verificarAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({
            error: 'Acceso denegado - Se requiere rol de administrador'
        });
    }
    next();
};
