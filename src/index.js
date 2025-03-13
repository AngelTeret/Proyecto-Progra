const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configuración de la sesión
const sessionMiddleware = session({
    secret: 'tu_secreto_aqui',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Conexión a la base de datos
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificar conexión a la base de datos
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado exitosamente a la base de datos MySQL');
    
    // Verificar si las tablas existen
    connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            ip VARCHAR(45),
            port INT,
            socketId VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creando tabla users:', err);
            return;
        }
        console.log('Tabla users verificada/creada');
    });

    connection.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            message TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP NULL,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creando tabla messages:', err);
            return;
        }
        console.log('Tabla messages verificada');
    });

    connection.release();
});

// Función para obtener mensajes no leídos
async function getUnreadCount(username) {
    try {
        console.log(`Obteniendo mensajes no leídos para: ${username}`);
        const [result] = await db.promise().query(
            `SELECT 
                sender.username as sender,
                COUNT(*) as unread
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE receiver.username = ? 
            AND m.read_at IS NULL
            GROUP BY sender.username`,
            [username]
        );
        console.log('Mensajes no leídos encontrados:', result);
        return result;
    } catch (error) {
        console.error('Error al obtener mensajes no leídos:', error);
        return [];
    }
}

// Función para marcar mensajes como leídos
async function markMessagesAsRead(from, to) {
    try {
        console.log(`Marcando mensajes como leídos de ${from} para ${to}`);
        const [fromUser] = await db.promise().query('SELECT id FROM users WHERE username = ?', [from]);
        const [toUser] = await db.promise().query('SELECT id FROM users WHERE username = ?', [to]);

        if (!fromUser.length || !toUser.length) {
            console.log('No se encontraron usuarios para marcar mensajes como leídos');
            return;
        }

        const result = await db.promise().query(
            `UPDATE messages 
            SET read_at = NOW()
            WHERE sender_id = ?
            AND receiver_id = ?
            AND read_at IS NULL`,
            [fromUser[0].id, toUser[0].id]
        );
        console.log('Mensajes marcados como leídos:', result);

        // Actualizar contadores después de marcar como leídos
        await broadcastUsers();
    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
    }
}

// Socket.IO para la comunicación en tiempo real
const connectedUsers = new Map();

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

io.on('connection', async (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('register socket', async (username) => {
        try {
            socket.username = username;
            
            // Actualizar socket ID en la base de datos
            await db.promise().query(
                'UPDATE users SET socketId = ? WHERE username = ?',
                [socket.id, username]
            );

            // Marcar usuario como conectado
            connectedUsers.set(username, {
                socketId: socket.id,
                online: true
            });

            await broadcastUsers();
        } catch (error) {
            console.error('Error en register socket:', error);
        }
    });

    socket.on('request messages', async ({ with: username }) => {
        try {
            if (!socket.username || !username) {
                console.error('Falta username para obtener mensajes');
                return;
            }

            console.log(`Solicitando mensajes entre ${socket.username} y ${username}`);

            // Marcar mensajes como leídos
            await markMessagesAsRead(username, socket.username);

            const [messages] = await db.promise().query(
                `SELECT 
                    messages.*,
                    sender.username as sender_username,
                    receiver.username as receiver_username
                FROM messages
                JOIN users sender ON messages.sender_id = sender.id
                JOIN users receiver ON messages.receiver_id = receiver.id
                WHERE 
                    (sender.username = ? AND receiver.username = ?) OR
                    (sender.username = ? AND receiver.username = ?)
                ORDER BY messages.timestamp ASC`,
                [socket.username, username, username, socket.username]
            );

            console.log(`Encontrados ${messages.length} mensajes`);
            socket.emit('message history', messages);

            // Actualizar lista de usuarios con contadores actualizados
            await broadcastUsers();
        } catch (error) {
            console.error('Error al obtener mensajes:', error);
        }
    });

    socket.on('private message', async (data) => {
        try {
            const { to, message } = data;
            const from = socket.username;

            console.log(`Enviando mensaje de ${from} a ${to}: ${message}`);

            // Obtener IDs de usuarios
            const [senderResult] = await db.promise().query('SELECT id FROM users WHERE username = ?', [from]);
            const [receiverResult] = await db.promise().query('SELECT id FROM users WHERE username = ?', [to]);

            if (!senderResult.length || !receiverResult.length) {
                console.error('Usuario no encontrado');
                return;
            }

            const senderId = senderResult[0].id;
            const receiverId = receiverResult[0].id;

            // Guardar mensaje en la base de datos con read_at NULL
            const [insertResult] = await db.promise().query(
                'INSERT INTO messages (sender_id, receiver_id, message, read_at) VALUES (?, ?, ?, NULL)',
                [senderId, receiverId, message]
            );
            console.log('Mensaje guardado en la base de datos:', insertResult);

            // Obtener el socket del destinatario
            const recipientSocket = Array.from(connectedUsers.entries())
                .find(([username]) => username === to)?.[1]?.socketId;

            if (recipientSocket) {
                io.to(recipientSocket).emit('private message', {
                    from,
                    message,
                    timestamp: new Date()
                });
                console.log('Mensaje enviado al destinatario');
            }

            // Actualizar contadores de mensajes no leídos
            await broadcastUsers();
        } catch (error) {
            console.error('Error al enviar mensaje privado:', error);
        }
    });

    socket.on('disconnect', async () => {
        const username = socket.username;
        if (username) {
            console.log('Usuario desconectado:', username);
            
            // Verificar si el usuario tiene otras conexiones activas
            const hasOtherConnections = Array.from(io.sockets.sockets.values())
                .some(s => s.id !== socket.id && s.username === username);

            if (!hasOtherConnections) {
                connectedUsers.delete(username);
                await db.promise().query(
                    'UPDATE users SET socketId = NULL WHERE username = ?',
                    [username]
                );
            }

            await broadcastUsers();
        }
    });

    socket.on('request users list', async () => {
        await broadcastUsers();
    });
});

// Función para emitir la lista de usuarios
async function broadcastUsers() {
    try {
        const [users] = await db.promise().query('SELECT id, username FROM users');
        
        const usersList = await Promise.all(users.map(async user => {
            const unreadMessages = await getUnreadCount(user.username);
            const unreadCounts = {};
            
            unreadMessages.forEach(msg => {
                unreadCounts[msg.sender] = parseInt(msg.unread);
            });

            console.log(`Contadores para ${user.username}:`, unreadCounts);

            return {
                username: user.username,
                online: connectedUsers.has(user.username),
                unreadMessages: unreadCounts
            };
        }));

        console.log('Lista de usuarios actualizada:', usersList);
        io.emit('users update', usersList);
    } catch (error) {
        console.error('Error al emitir lista de usuarios:', error);
    }
}

// Rutas principales
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/chat');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

// Rutas de autenticación
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar datos
        if (!username || !password) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Verificar si el usuario ya existe
        const [existingUsers] = await db.promise().query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Obtener IP del cliente
        const ip = req.ip.replace('::ffff:', '');
        
        // Asignar puerto dinámicamente
        const port = await getAvailablePort(50000);

        // Insertar nuevo usuario
        await db.promise().query(
            'INSERT INTO users (username, password, ip, port, created_at) VALUES (?, ?, ?, ?, NOW())',
            [username, hashedPassword, ip, port]
        );

        res.json({ 
            message: 'Usuario registrado exitosamente',
            username,
            ip,
            port
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar datos
        if (!username || !password) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Buscar usuario
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Guardar usuario en sesión
        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.json({
            message: 'Login exitoso',
            username: user.username,
            ip: user.ip,
            port: user.port
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Función para obtener puerto disponible
async function getAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(getAvailablePort(startPort + 1));
        });
    });
}

// Iniciar servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
