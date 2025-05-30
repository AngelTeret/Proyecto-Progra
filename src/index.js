require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Configuración de CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// Middleware para parsear cookies
app.use(cookieParser());

// Configuración de la sesión
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración del motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Rutas
const rutasTienda = require('./routes');
app.use('/', rutasTienda);

// Configurar Socket.IO
io.on('connection', (socket) => {
    // Evento para recibir mensajes del chat
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    // Desconexión
    socket.on('disconnect', () => {
    });
});

// Iniciar el servidor con soporte para Socket.IO
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0');
