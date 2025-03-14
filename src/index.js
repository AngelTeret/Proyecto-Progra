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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'public/styles')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
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
    connection.release();
});

// Función para obtener mensajes no leídos
async function getUnreadCount(username) {
    try {
        const [result] = await db.promise().query(
            `SELECT 
                sender.username as sender,
                receiver.username as receiver,
                COUNT(*) as unread
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE receiver.username = ? 
            AND m.read_at IS NULL
            GROUP BY sender.username, receiver.username`,
            [username]
        );
        
        // Convertir el resultado en un objeto más fácil de usar
        const unreadCounts = {};
        (result || []).forEach(row => {
            if (row.sender !== username) {  // Solo contar mensajes de otros usuarios
                unreadCounts[row.sender] = parseInt(row.unread);
            }
        });
        return unreadCounts;
    } catch (error) {
        console.error('Error al obtener mensajes no leídos:', error);
        return {};
    }
}

// Socket.IO para la comunicación en tiempo real
const connectedUsers = new Map();

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

io.on('connection', async (socket) => {
    console.log('Socket conectado:', socket.id);

    socket.on('register socket', async (username) => {
        try {
            if (!username) {
                console.error('No se proporcionó nombre de usuario');
                return;
            }

            console.log(`Registrando usuario ${username} con socket ${socket.id}`);
            socket.username = username;
            
            // Actualizar socket ID en la base de datos
            await db.promise().query(
                'UPDATE users SET socketId = ? WHERE username = ?',
                [socket.id, username]
            );

            connectedUsers.set(username, {
                socketId: socket.id,
                username: username,
                online: true
            });

            // Emitir lista actualizada de usuarios
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

            // Obtener IDs de usuario
            const [senderResult] = await db.promise().query('SELECT id FROM users WHERE username = ?', [username]);
            const [receiverResult] = await db.promise().query('SELECT id FROM users WHERE username = ?', [socket.username]);
            
            if (senderResult.length > 0 && receiverResult.length > 0) {
                const senderId = senderResult[0].id;
                const receiverId = receiverResult[0].id;
                
                // Marcar mensajes como leídos
                await db.promise().query(
                    `UPDATE messages 
                    SET read_at = CURRENT_TIMESTAMP 
                    WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL`,
                    [senderId, receiverId]
                );
                
                // Obtener historial de mensajes
                const [messages] = await db.promise().query(
                    `SELECT 
                        messages.*, 
                        sender.username as sender_username,
                        receiver.username as receiver_username,
                        messages.created_at as timestamp
                    FROM messages
                    JOIN users sender ON messages.sender_id = sender.id
                    JOIN users receiver ON messages.receiver_id = receiver.id
                    WHERE 
                        (sender.username = ? AND receiver.username = ?) OR
                        (sender.username = ? AND receiver.username = ?)
                    ORDER BY messages.created_at ASC`,
                    [socket.username, username, username, socket.username]
                );
                
                socket.emit('message history', messages);
                
                // Actualizar lista de usuarios con contadores actualizados
                await broadcastUsers();
            }
        } catch (error) {
            console.error('Error al obtener mensajes:', error);
        }
    });

    socket.on('private message', async (data) => {
        try {
            const { to, message } = data;
            if (!socket.username || !to || !message) return;

            // Obtener IDs de usuario
            const [senderResult] = await db.promise().query('SELECT id FROM users WHERE username = ?', [socket.username]);
            const [receiverResult] = await db.promise().query('SELECT id FROM users WHERE username = ?', [to]);

            if (!senderResult.length || !receiverResult.length) return;

            const senderId = senderResult[0].id;
            const receiverId = receiverResult[0].id;

            // Insertar el mensaje
            await db.promise().query(
                'INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES (?, ?, ?, NOW())',
                [senderId, receiverId, message]
            );

            // Enviar mensaje al destinatario
            const recipientSocket = connectedUsers.get(to)?.socketId;
            if (recipientSocket) {
                io.to(recipientSocket).emit('private message', {
                    from: socket.username,
                    message: message,
                    created_at: new Date()
                });
            }

            // Actualizar lista de usuarios con contadores actualizados
            await broadcastUsers();

            // Confirmar envío al remitente
            socket.emit('message sent', {
                to: to,
                message: message,
                created_at: new Date()
            });
        } catch (error) {
            console.error('Error al enviar mensaje privado:', error);
        }
    });

    socket.on('disconnect', async () => {
        if (socket.username) {
            console.log(`Usuario ${socket.username} desconectado`);
            connectedUsers.delete(socket.username);
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
        const [users] = await db.promise().query('SELECT username FROM users');
        const usersList = await Promise.all(users.map(async user => {
            const unreadMessages = await getUnreadCount(user.username);
            return {
                username: user.username,
                online: connectedUsers.has(user.username),
                unreadMessages: unreadMessages
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
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }
    res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/chat', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }
    res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Verificar si el usuario ya existe
        const [existingUser] = await db.promise().query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        await db.promise().query(
            'INSERT INTO users (username, password, created_at) VALUES (?, ?, NOW())',
            [username, hashedPassword]
        );

        res.json({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el registro' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

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
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.json({
            message: 'Login exitoso',
            user: {
                username: user.username,
                unreadMessages: {}
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el login' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout exitoso' });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
