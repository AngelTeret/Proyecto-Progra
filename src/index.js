const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Configuración de CORS
app.use(cors({
    origin: true,
    credentials: true
}));

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

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Rutas
const rutasTienda = require('./routes');
app.use('/', rutasTienda);

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Usuario conectado a Socket.IO');
    
    // Evento para recibir mensajes del chat
    socket.on('chat message', (msg) => {
        console.log('Mensaje recibido en socket:', msg);
        io.emit('chat message', msg);
    });
    
    // Desconexión
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// Iniciar el servidor con soporte para Socket.IO
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Socket.IO está activo y escuchando conexiones`);
});
