const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

// Configuración de la conexión a la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificar la conexión
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión a la base de datos establecida');
    connection.release();
});

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

// Controlador de login
async function login(req, res) {
    const { email, password } = req.body;

    try {
        console.log('Intento de login:', { email }); // Log para debugging

        // Validar campos requeridos
        if (!email || !password) {
            console.log('Campos faltantes');
            return res.status(400).json({
                error: true,
                mensaje: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario en la base de datos
        let connection;
        try {
            connection = await pool.getConnection();
            console.log('Ejecutando query con email:', email);
            
            const [usuarios] = await connection.query(
                'SELECT * FROM usuarios_admin WHERE email = ? AND estado = 1',
                [email]
            );

            console.log('Query ejecutado');
            console.log('Usuarios encontrados:', usuarios.length);
            if (usuarios.length > 0) {
                console.log('Datos del usuario encontrado:', {
                    id: usuarios[0].id_usuario,
                    email: usuarios[0].email,
                    nombre: usuarios[0].nombre,
                    rol: usuarios[0].rol,
                    estado: usuarios[0].estado,
                    passwordHash: usuarios[0].password.substring(0, 10) + '...' // Solo mostramos parte del hash por seguridad
                });
            } else {
                console.log('No se encontró ningún usuario con ese email');
            }

            if (usuarios.length === 0) {
                console.log('Usuario no encontrado o inactivo');
                return res.status(401).json({
                    error: true,
                    mensaje: 'Credenciales inválidas o usuario inactivo'
                });
            }

            const usuario = usuarios[0];

            // Verificar contraseña
            console.log('=== Verificación de contraseña ===');
            console.log('Password proporcionada:', password);
            console.log('Password en DB:', usuario.password);
            
            const passwordValida = password === usuario.password;
            console.log('Contraseñas coinciden:', passwordValida);

            if (!passwordValida) {
                console.log('Password incorrecta');
                return res.status(401).json({
                    error: true,
                    mensaje: 'Credenciales inválidas'
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                {
                    id: usuario.id_usuario,
                    email: usuario.email,
                    rol: usuario.rol
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('Token generado correctamente'); // Log para debugging

            // Actualizar último acceso
            await connection.query(
                'UPDATE usuarios_admin SET ultimo_acceso = NOW() WHERE id_usuario = ?',
                [usuario.id_usuario]
            );

            console.log('Login exitoso para:', usuario.email); // Log para debugging

            res.json({
                error: false,
                token,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            });

        } catch (error) {
            console.error('Error en la base de datos:', error);
            res.status(500).json({
                error: true,
                mensaje: 'Error en el servidor: ' + error.message
            });
        } finally {
            if (connection) connection.release();
        }

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: true,
            mensaje: 'Error en el servidor: ' + error.message
        });
    }
}

// Middleware para verificar token JWT
function verificarToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: true,
            mensaje: 'Token no proporcionado'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: true,
            mensaje: 'Token inválido'
        });
    }
}

// Middleware para verificar rol de administrador
function verificarAdmin(req, res, next) {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({
            error: true,
            mensaje: 'Acceso denegado: se requiere rol de administrador'
        });
    }
    next();
}

module.exports = {
    login,
    verificarToken,
    verificarAdmin
};
