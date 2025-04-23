// Rutas principales para el sistema de tienda
const express = require('express');
const router = express.Router();
const path = require('path');

// Importar el repositorio de base de datos centralizado
const db = require('./database');

// Importar controladores
const productosController = require('./controllers/productosController');
const adminAuthController = require('./controllers/adminAuthController');
const dashboardController = require('./controllers/dashboardController');
const categoriasController = require('./controllers/categoriasController');
const pagoController = require('./pagoController');

// Middleware de autenticación
const { verificarToken, verificarAdmin } = require('./controllers/adminAuthController');

// Rutas de productos
router.get('/api/productos', productosController.obtenerProductos);
router.get('/api/productos/:id', productosController.obtenerProductoPorId);

router.get('/api/landing', async (req, res) => {
    try {
        // Usar la función centralizada del repositorio
        const productosDestacados = await db.obtenerProductosDestacados(2); // Límite de 2 productos
        res.json({
            productosDestacados
        });
    } catch (error) {
        console.error('Error al obtener productos destacados:', error);
        res.status(500).json({ mensaje: 'Error al obtener los productos destacados' });
    }
});



// --- VISTAS PRINCIPALES (solo rutas limpias, sin .html) ---
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/landing.html'));
});
router.get('/carrito', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/carrito.html'));
});
router.get('/productos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/productos.html'));
});
router.get('/pago', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/pago.html'));
});

// Redirección automática si intentan acceder con .html a la ruta limpia
router.get(['/:page.html'], (req, res) => {
    const page = req.params.page;
    const allowed = ['productos', 'carrito', 'pago'];
    if (allowed.includes(page)) {
        return res.redirect('/' + page);
    }
    res.status(404).send('Página no encontrada');
});

// API de procesamiento de pago
router.post('/api/pago/procesar', pagoController.procesarPago);

// Redirigir a la ruta principal de productos para mantener todo centralizado
router.get('/api/tienda/productos', (req, res) => {
    // Redirigir a la ruta principal que ya usa el repositorio centralizado
    res.redirect('/api/productos');
});

// Rutas del panel administrativo

// Autenticación admin
router.post('/api/admin/auth/login', adminAuthController.login);

// Dashboard
router.get('/api/admin/dashboard', verificarToken, dashboardController.getDashboardData);

// Productos - CRUD
router.get('/api/admin/productos', verificarToken, productosController.obtenerProductos);
router.get('/api/admin/productos/:id', verificarToken, productosController.obtenerProductoPorId);
router.post('/api/admin/productos', verificarToken, productosController.crearProducto);
router.put('/api/admin/productos/:id', verificarToken, productosController.actualizarProducto);
router.delete('/api/admin/productos/:id', verificarToken, productosController.eliminarProducto);

// Servir archivos estáticos
router.use('/js', express.static(path.join(__dirname, 'public/js')));
router.use('/styles', express.static(path.join(__dirname, 'public/styles')));
router.use('/img', express.static(path.join(__dirname, 'public/img')));

// Rutas limpias para vistas admin
router.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin/login.html'));
});
router.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin/dashboard.html'));
});
router.get('/admin/productos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin/productos.html'));
});
router.get('/admin/categorias', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin/categorias.html'));
});

// Rutas de la API para categorías
router.get('/api/admin/categorias', verificarToken, categoriasController.getCategorias);
router.get('/api/admin/categorias/:id', verificarToken, categoriasController.getCategoriaById);
router.post('/api/admin/categorias', verificarToken, categoriasController.createCategoria);
router.put('/api/admin/categorias/:id', verificarToken, categoriasController.updateCategoria);
router.delete('/api/admin/categorias/:id', verificarToken, categoriasController.deleteCategoria);

// === BITÁCORA VISUAL Y API DE LOGS ===
const fs = require('fs');
const fsPromises = fs.promises;

// API para obtener logs en formato JSON para la tabla visual
router.get('/api/logs', (req, res) => {
    const logPath = path.join(__dirname, 'logs', 'combined.log');
    fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) return res.json([]);
        const lines = data.trim().split('\n').filter(Boolean);
        const logs = lines.map(line => {
            const match = line.match(/^\[(.*?)\] (\w+): (.*)$/);
            if (match) {
                return {
                    timestamp: match[1],
                    level: match[2],
                    message: match[3]
                };
            } else {
                return { timestamp: '', level: 'info', message: line };
            }
        });
        res.json(logs);
    });
});

// Ruta visual para la bitácora (logs)
router.get(['/bitacora', '/logs'], (req, res) => {
    const htmlPath = path.join(__dirname, 'views', 'logs_view.html');
    res.sendFile(htmlPath);
});

// --- ENDPOINTS PARA MANEJO DE ARCHIVO DE LOGS ---
const LOG_COMBINED = path.join(__dirname, 'logs', 'combined.log');
const LOG_ERROR = path.join(__dirname, 'logs', 'error.log');

// Descargar logs (combined.log)
router.get('/api/logs/download', async (req, res) => {
    try {
        if (!fs.existsSync(LOG_COMBINED)) {
            return res.status(404).send('Archivo de logs no encontrado');
        }
        res.download(LOG_COMBINED, 'combined.log');
    } catch (err) {
        res.status(500).send('Error al descargar el archivo de logs');
    }
});

// Limpiar logs (combined.log y error.log)
router.post('/api/logs/clear', async (req, res) => {
    try {
        await fsPromises.writeFile(LOG_COMBINED, '');
        if (fs.existsSync(LOG_ERROR)) {
            await fsPromises.writeFile(LOG_ERROR, '');
        }
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send('No se pudo limpiar el archivo de logs');
    }
});

// === FIN BITÁCORA ===

module.exports = router;
