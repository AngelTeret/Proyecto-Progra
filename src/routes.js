// Rutas principales para el sistema de tienda
const express = require('express');
const router = express.Router();
const path = require('path');

// Middleware para permitir acceso público al chat y su API
router.use((req, res, next) => {
    const publicPaths = ['/chat', '/views/chat.html', '/js/chat.js', '/api/banco/procesar', '/api/trama'];
    if (publicPaths.includes(req.path)) {
        return next(); // Permite acceso sin autenticación
    }
    next();
});

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

// Ruta para procesar tramas bancarias desde el chat
router.post('/api/trama', async (req, res) => {
    try {
        const { trama } = req.body;
        
        if (!trama) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere una trama bancaria válida' 
            });
        }
        
        // Modificamos el objeto request para simular los datos esperados por pagoController
        req.body = {
            trama,
            montoTotal: 0,
            datosContacto: {
                nombre: 'Usuario',
                apellido: 'Chat'
            }
        };
        
        const customRes = {
            statusCode: 200,
            data: null,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.data = data;
                return this;
            }
        };
        
        // Usar la misma lógica del pagoController
        await pagoController.procesarPago(req, customRes);
        
        // Transformar la respuesta al formato esperado por el chat
        if (customRes.statusCode >= 400) {
            return res.status(customRes.statusCode).json({
                success: false,
                error: customRes.data?.mensaje || 'Error al procesar la trama'
            });
        }
        
        // Extraer el estado de la trama de respuesta
        if (customRes.data?.trama_respuesta) {
            const tramaRespuesta = customRes.data.trama_respuesta;
            const estadoTrama = tramaRespuesta.substring(61, 63); // Últimos 2 dígitos
            
            let mensaje = '';
            let exito = false;
            
            // Codificar mensajes basados en el estado (igual que en SweetAlert de pagoController)
            switch (estadoTrama) {
                case '01': // Aprobada
                    exito = true;
                    mensaje = 'Transacción aprobada';
                    break;
                case '02': // Rechazada
                    mensaje = 'Transacción rechazada';
                    break;
                case '03': // Sistema fuera de servicio
                    mensaje = 'Sistema fuera de servicio';
                    break;
                case '04': // Cancelada por usuario
                    mensaje = 'Operación cancelada';
                    break;
                case '05': // Sin fondos suficientes
                    mensaje = 'Fondos insuficientes';
                    break;
                case '06': // Cliente no identificado
                    mensaje = 'Cliente no identificado';
                    break;
                case '07': // Empresa/Sucursal inválida
                    mensaje = 'Empresa o sucursal inválida';
                    break;
                case '08': // Monto inválido
                    mensaje = 'Monto inválido';
                    break;
                case '09': // Transacción duplicada
                    mensaje = 'Transacción duplicada';
                    break;
                default:
                    mensaje = 'Estado desconocido: ' + estadoTrama;
            }
            
            // Extraer más detalles de la trama para mostrar al cliente
            const monto = tramaRespuesta.substring(37, 49);
            const montoFormateado = parseFloat(monto.substring(0, 10) + '.' + monto.substring(10, 12));
            const referencia = tramaRespuesta.substring(49, 61);
            
            return res.json({
                success: exito,
                mensaje: mensaje,
                estado: estadoTrama,
                trama_respuesta: tramaRespuesta,
                monto: montoFormateado,
                referencia: referencia,
                fecha: new Date().toISOString()
            });
        }
        
        // Si no hay trama de respuesta, usar la respuesta original
        return res.json({
            success: customRes.data?.exito || false,
            mensaje: customRes.data?.mensaje || 'Operación procesada',
            detalles: customRes.data || {}
        });
        
    } catch (error) {
        console.error('Error al procesar la trama desde el chat:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error al procesar la trama bancaria', 
            detalle: error.message 
        });
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
// --- VISTA CHAT LIMITADO (Fase 2) ---
router.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/chat.html'));
});

// --- API para procesar trama bancaria desde el chat ---
router.post('/api/banco/procesar', async (req, res) => {
    try {
        const trama = req.body.trama;
        if (!trama || !/^\d{63}$/.test(trama)) {
            return res.status(400).json({ mensaje: 'La trama debe tener exactamente 63 dígitos numéricos.' });
        }
        // Reutiliza la función para enviar la trama al banco
        const { enviarTramaBanco } = require('./utilsBanco');
        const respuesta = await enviarTramaBanco(trama);
        if (respuesta) {
            return res.json({ tramaRespuesta: respuesta });
        } else {
            return res.status(500).json({ mensaje: 'No se recibió respuesta del banco.' });
        }
    } catch (err) {
        return res.status(500).json({ mensaje: err.message || 'Error procesando la trama.' });
    }
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
