const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Importar el repositorio de base de datos centralizado
const db = require('../database');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/productos'));
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'producto-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
}).single('imagen');

// Obtener todos los productos
async function obtenerProductos(req, res) {
    try {
        // Usar la función centralizada del repositorio
        const productos = await db.obtenerTodosProductos();
        
        // Verificar si la solicitud viene del panel admin o de la tienda pública
        const esAdmin = req.path.includes('/admin/');
        
        if (esAdmin) {
            // Formato para el panel administrativo (objeto con propiedad 'productos')
            res.json({ productos: productos });
        } else {
            // Formato para la tienda pública (array directo)
            res.json(productos);
        }
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            error: true,
            mensaje: 'Error al obtener los productos'
        });
    }
}

// Obtener un producto por ID
async function obtenerProductoPorId(req, res) {
    try {
        // Usar la función centralizada del repositorio
        const producto = await db.obtenerProductoPorId(req.params.id);

        if (!producto) {
            return res.status(404).json({ error: true, mensaje: 'Producto no encontrado' });
        }

        res.json(producto);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({
            error: true,
            mensaje: 'Error al obtener el producto'
        });
    }
}

// Crear nuevo producto
async function crearProducto(req, res) {
    upload(req, res, async function(err) {
        if (err) {
            return res.status(400).json({
                error: true,
                mensaje: err.message
            });
        }

        const { nombre, descripcion, precio, stock, estado } = req.body;
        const imagen = req.file ? `/uploads/productos/${req.file.filename}` : null;

        try {
            // Crear objeto con los datos del producto
            const productoData = {
                nombre,
                descripcion,
                precio,
                stock, 
                imagen,
                estado
            };
            
            // Usar la función centralizada del repositorio
            const resultado = await db.crearProducto(productoData, req.body.id_categoria);
            
            // Devolver respuesta al cliente
            res.json(resultado);
        } catch (error) {
            console.error('Error al crear producto:', error);
            res.status(500).json({
                error: true,
                mensaje: 'Error al crear el producto: ' + error.message
            });
        }
    });
}

// Actualizar producto
async function actualizarProducto(req, res) {
    upload(req, res, async function(err) {
        if (err) {
            return res.status(400).json({
                error: true,
                mensaje: err.message
            });
        }

        const { id } = req.params;
        const { nombre, descripcion, precio, stock, estado } = req.body;
        const imagen = req.file ? `/uploads/productos/${req.file.filename}` : null;
        const idCategoria = req.body.id_categoria || null;

        try {
            // Si hay nueva imagen, necesitamos obtener la ruta de la imagen antigua
            let oldImagePath = null;
            if (imagen) {
                // Obtener el producto actual para saber la imagen anterior
                const productoActual = await db.obtenerProductoPorId(id);
                if (productoActual && productoActual.imagen) {
                    oldImagePath = path.join(__dirname, '../public', productoActual.imagen);
                }
            }

            // Crear objeto con los datos actualizados del producto
            const datosProducto = {};
            if (nombre) datosProducto.nombre = nombre;
            if (descripcion !== undefined) datosProducto.descripcion = descripcion;
            if (precio) datosProducto.precio = precio;
            if (stock !== undefined) datosProducto.stock = stock;
            if (estado) datosProducto.estado = estado;
            if (imagen) datosProducto.imagen = imagen;
            
            console.log('Datos para actualizar:', datosProducto, 'ID:', id, 'Categoría:', idCategoria);
            
            // Usar la función centralizada del repositorio
            const resultado = await db.actualizarProducto(id, datosProducto, idCategoria, oldImagePath);
            
            // Devolver respuesta al cliente
            res.json(resultado);
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            res.status(500).json({
                error: true,
                mensaje: 'Error al actualizar el producto: ' + error.message
            });
        }
    });
}

// Eliminar producto
async function eliminarProducto(req, res) {
    const { id } = req.params;

    try {
        // Usar la función centralizada del repositorio para eliminar el producto
        const resultado = await db.eliminarProducto(id);
        
        // Devolver respuesta al cliente
        res.json(resultado);
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({
            error: true,
            mensaje: 'Error al eliminar el producto: ' + error.message
        });
    }
}

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};
