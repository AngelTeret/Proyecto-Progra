const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();

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

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
