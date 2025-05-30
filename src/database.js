// Acceso a base de datos y helpers para la tienda
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;

// Importar configuración centralizada
const { DB_CONFIG } = require('./config');

// Crear el pool de conexiones usando la configuración centralizada
const pool = mysql.createPool(DB_CONFIG);

// Verificar la conexión
pool.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos MySQL');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

// ============================================
// HELPERS
// ============================================

/**
 * Normaliza los campos numéricos de un producto.
 * Convierte precio y stock a tipo numérico para cálculos y visualización.
 * @param {Object} producto 
 * @returns {Object}
 */
function normalizarProducto(producto) {
    return {
        ...producto,
        precio: producto.precio ? parseFloat(producto.precio) : 0,
        stock: producto.stock ? parseInt(producto.stock) : 0
    };
}

// ============================================
// REPOSITORIO DE PRODUCTOS
// ============================================

/**
 * Obtiene todos los productos con su información de categorías
 * @returns {Promise<Array>} Lista de productos
 */
// Obtiene productos para la tienda pública (solo activos y con stock)
async function obtenerTodosProductos() {
    try {
        const [productos] = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre, c.id_categoria
            FROM productos p
            LEFT JOIN producto_categoria pc ON p.id_producto = pc.id_producto
            LEFT JOIN categorias c ON pc.id_categoria = c.id_categoria
            WHERE p.estado = 'Activo' AND p.stock > 0
        `);
        return productos.map(producto => ({
            ...producto,
            precio: producto.precio ? parseFloat(producto.precio) : 0,
            stock: producto.stock ? parseInt(producto.stock) : 0
        }));
    } catch (error) {
        console.error('Error en repository - obtenerTodosProductos:', error);
        throw error;
    }
}

// Obtiene todos los productos (sin filtro) para el panel admin
async function obtenerTodosProductosAdmin() {
    try {
        const [productos] = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre, c.id_categoria
            FROM productos p
            LEFT JOIN producto_categoria pc ON p.id_producto = pc.id_producto
            LEFT JOIN categorias c ON pc.id_categoria = c.id_categoria
        `);
        return productos.map(producto => ({
            ...producto,
            precio: producto.precio ? parseFloat(producto.precio) : 0,
            stock: producto.stock ? parseInt(producto.stock) : 0
        }));
    } catch (error) {
        console.error('Error en repository - obtenerTodosProductosAdmin:', error);
        throw error;
    }
}

/**
 * Obtiene un producto por su ID con toda su información
 * @param {number} idProducto - ID del producto
 * @returns {Promise<Object>} Datos del producto
 */
async function obtenerProductoPorId(idProducto) {
    try {
        const [productos] = await pool.query(`
            SELECT 
                p.id_producto,
                p.nombre,
                p.descripcion,
                p.precio,
                p.stock,
                p.imagen,
                p.estado,
                c.id_categoria,
                c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN producto_categoria pc ON p.id_producto = pc.id_producto
            LEFT JOIN categorias c ON pc.id_categoria = c.id_categoria
            WHERE p.id_producto = ?
        `, [idProducto]);

        // Si no hay resultados, devolver null
        if (productos.length === 0) {
            return null;
        }
        
        // Normalizar campos numéricos del producto encontrado
        return normalizarProducto(productos[0]);
    } catch (error) {
        console.error(`Error en repository - obtenerProductoPorId(${idProducto}):`, error);
        throw error;
    }
}

/**
 * Obtiene productos destacados para la landing page
 * @param {number} limite - Cantidad de productos a obtener
 * @returns {Promise<Array>} Lista de productos destacados
 */
async function obtenerProductosDestacados(limite = 2) {
    try {
        const [productos] = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN producto_categoria pc ON p.id_producto = pc.id_producto
            LEFT JOIN categorias c ON pc.id_categoria = c.id_categoria
            WHERE p.estado = 'Activo'
            LIMIT ?
        `, [limite]);
        
        // Convertir campos numéricos a su tipo correcto para que funcionen métodos como toFixed()
        return productos.map(producto => ({
            ...producto,
            precio: producto.precio ? parseFloat(producto.precio) : 0,
            stock: producto.stock ? parseInt(producto.stock) : 0
        }));
    } catch (error) {
        console.error('Error en repository - obtenerProductosDestacados:', error);
        throw error;
    }
}

// ============================================
// REPOSITORIO DE CATEGORÍAS
// ============================================

/**
 * Obtiene todas las categorías con el conteo de productos asociados
 * @returns {Promise<Array>} Lista de categorías
 */
async function obtenerTodasCategorias() {
    try {
        const [categorias] = await pool.query(`
            SELECT 
                c.id_categoria, 
                c.nombre, 
                c.descripcion, 
                c.estado,
                COUNT(pc.id_producto) as total_productos
            FROM 
                categorias c
            LEFT JOIN 
                producto_categoria pc ON c.id_categoria = pc.id_categoria
            GROUP BY 
                c.id_categoria
            ORDER BY 
                c.nombre
        `);
        
        // Normaliza el estado y el conteo de productos asociados a cada categoría
        
         return categorias.map(categoria => {

            let estadoEsActivo = false;
            
            if (categoria.estado === 1 || 
                categoria.estado === '1' || 
                categoria.estado === true ||
                (Buffer.isBuffer(categoria.estado) && categoria.estado[0] === 1)) {
                estadoEsActivo = true;
            }
            
            return {
                ...categoria,
                
                estado: estadoEsActivo ? 1 : 0,
                
                total_productos: parseInt(categoria.total_productos || 0, 10)
            };
        });
    } catch (error) {
        console.error('Error en repository - obtenerTodasCategorias:', error);
        throw error;
    }
}

/**
 * Obtiene una categoría por su ID
 * @param {number} id - ID de la categoría
 * @returns {Promise<Object>} Datos de la categoría
 */
async function obtenerCategoriaPorId(id) {
    try {
        const [categorias] = await pool.query('SELECT * FROM categorias WHERE id_categoria = ?', [id]);
        return categorias[0]; // Devolver solo el primer resultado
    } catch (error) {
        console.error(`Error en repository - obtenerCategoriaPorId(${id}):`, error);
        throw error;
    }
}

/**
 * Crea una nueva categoría
 * @param {Object} categoria - Datos de la categoría a crear
 * @returns {Promise<Object>} Resultado de la operación
 */
async function crearCategoria(categoria) {
    try {
        const [result] = await pool.query(
            'INSERT INTO categorias (nombre, descripcion, estado) VALUES (?, ?, ?)',
            [categoria.nombre, categoria.descripcion, categoria.estado === '1' || categoria.estado === 1 || categoria.estado === true ? 1 : 0]
        );
        return {
            id: result.insertId,
            ...categoria
        };
    } catch (error) {
        console.error('Error en repository - crearCategoria:', error);
        throw error;
    }
}

/**
 * Actualiza una categoría existente
 * @param {number} id - ID de la categoría
 * @param {Object} categoria - Datos actualizados
 * @returns {Promise<Object>} Resultado de la operación
 */
async function actualizarCategoria(id, categoria) {
    try {
        // Construir la consulta dinámicamente basada en los campos proporcionados
        let queryFields = [];
        let queryParams = [];
        
        // Añadir campos que existen en el objeto categoria
        if (categoria.nombre !== undefined) {
            queryFields.push('nombre = ?');
            queryParams.push(categoria.nombre);
        }
        
        if (categoria.descripcion !== undefined) {
            queryFields.push('descripcion = ?');
            queryParams.push(categoria.descripcion);
        }
        
        if (categoria.estado !== undefined) {
            queryFields.push('estado = ?');
            queryParams.push(categoria.estado);
        }
        
        // Si no hay campos para actualizar, retornar error
        if (queryFields.length === 0) {
            throw new Error('No se proporcionaron campos para actualizar');
        }
        
        // Construir la consulta SQL
        const queryString = `UPDATE categorias SET ${queryFields.join(', ')} WHERE id_categoria = ?`;
        
        // Añadir el ID al final de los parámetros
        queryParams.push(id);
        
        console.log('SQL para actualizar categoría:', queryString, queryParams);
        
        const [result] = await pool.query(queryString, queryParams);
        
        return {
            id,
            afectados: result.affectedRows,
            ...categoria
        };
    } catch (error) {
        console.error(`Error en repository - actualizarCategoria(${id}):`, error);
        throw error;
    }
}

/**
 * Elimina una categoría y sus relaciones
 * @param {number} id - ID de la categoría a eliminar
 * @returns {Promise<Object>} Resultado de la operación
 */
async function eliminarCategoria(id) {
    try {
        // Primero eliminar relaciones en la tabla producto_categoria
        await pool.query('DELETE FROM producto_categoria WHERE id_categoria = ?', [id]);
        
        // Luego eliminar la categoría
        const [result] = await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
        
        return {
            id,
            afectados: result.affectedRows
        };
    } catch (error) {
        console.error(`Error en repository - eliminarCategoria(${id}):`, error);
        throw error;
    }
}

/**
 * Crea un nuevo producto con sus relaciones de categoría
 * @param {Object} producto - Datos del producto a crear
 * @param {number} idCategoria - ID de la categoría asociada (opcional)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function crearProducto(producto, idCategoria) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Insertar producto
        const [result] = await connection.query(
            'INSERT INTO productos (nombre, descripcion, precio, stock, imagen, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [producto.nombre, producto.descripcion, producto.precio, producto.stock, producto.imagen, producto.estado]
        );

        const idProducto = result.insertId;

        // Insertar categoría si se proporciona
        if (idCategoria) {
            await connection.query(
                'INSERT INTO producto_categoria (id_producto, id_categoria) VALUES (?, ?)',
                [idProducto, idCategoria]
            );
        }

        await connection.commit();
        
        return {
            error: false,
            mensaje: 'Producto creado exitosamente',
            id: idProducto
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error en repository - crearProducto:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Actualiza un producto existente
 * @param {number} idProducto - ID del producto a actualizar
 * @param {Object} producto - Datos actualizados del producto
 * @param {number} idCategoria - ID de la categoría asociada (opcional)
 * @param {string} oldImagePath - Ruta de la imagen actual para eliminarla si hay nueva imagen
 * @returns {Promise<Object>} Resultado de la operación
 */
async function actualizarProducto(idProducto, producto, idCategoria, oldImagePath) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        console.log('Actualizando producto ID:', idProducto, 'Datos:', producto);
        
        // Si hay nueva imagen y hay una ruta de imagen antigua, intentar eliminarla
        if (producto.imagen && oldImagePath) {
            try {
                await fs.unlink(oldImagePath).catch(() => {
                    console.log('No se pudo eliminar la imagen anterior, posiblemente no existe:', oldImagePath);
                });
            } catch (err) {
                console.log('Error al eliminar imagen anterior:', err.message);
                // Continuar aunque no se pueda eliminar la imagen
            }
        }

        // Construir la consulta de actualización
        let updateFields = [];
        let updateParams = [];
        
        // Añadir campos que existen en el objeto producto
        if (producto.nombre !== undefined) {
            updateFields.push('nombre = ?');
            updateParams.push(producto.nombre);
        }
        
        if (producto.descripcion !== undefined) {
            updateFields.push('descripcion = ?');
            updateParams.push(producto.descripcion);
        }
        
        if (producto.precio !== undefined) {
            updateFields.push('precio = ?');
            updateParams.push(parseFloat(producto.precio));
        }
        
        if (producto.stock !== undefined) {
            updateFields.push('stock = ?');
            updateParams.push(parseInt(producto.stock));
        }
        
        if (producto.estado !== undefined) {
            updateFields.push('estado = ?');
            updateParams.push(producto.estado);
        }
        
        if (producto.imagen !== undefined) {
            updateFields.push('imagen = ?');
            updateParams.push(producto.imagen);
        }
        
        // Si no hay campos para actualizar, lanzar error
        if (updateFields.length === 0) {
            throw new Error('No se proporcionaron campos para actualizar');
        }
        
        // Añadir el ID del producto al final de los parámetros
        updateParams.push(idProducto);
        
        // Ejecutar la consulta de actualización
        const queryString = `UPDATE productos SET ${updateFields.join(', ')} WHERE id_producto = ?`;
        console.log('SQL para actualizar producto:', queryString, updateParams);
        
        await connection.query(queryString, updateParams);
        
        // Si se proporciona un ID de categoría, actualizar la relación
        if (idCategoria !== undefined) {
            // Eliminar categoría anterior
            await connection.query('DELETE FROM producto_categoria WHERE id_producto = ?', [idProducto]);
            
            // Insertar nueva categoría
            await connection.query(
                'INSERT INTO producto_categoria (id_producto, id_categoria) VALUES (?, ?)',
                [idProducto, idCategoria]
            );
        }
        
        await connection.commit();
        return {
            error: false,
            mensaje: 'Producto actualizado exitosamente',
            id: idProducto
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error en repository - actualizarProducto:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Elimina un producto existente y sus relaciones
 * @param {number} idProducto - ID del producto a eliminar
 * @returns {Promise<Object>} Resultado de la operación
 */
async function eliminarProducto(idProducto) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        console.log('Eliminando producto ID:', idProducto);
        
        // Obtener la información del producto antes de eliminarlo para borrar la(s) imagen(es)
        const [producto] = await connection.query(
            'SELECT imagen FROM productos WHERE id_producto = ?',
            [idProducto]
        );

        if (!producto || producto.length === 0) {
            throw new Error(`El producto con ID ${idProducto} no existe`);
        }

        // Eliminar relaciones de categoría
        await connection.query(
            'DELETE FROM producto_categoria WHERE id_producto = ?',
            [idProducto]
        );

        // Eliminar el producto
        const [resultado] = await connection.query(
            'DELETE FROM productos WHERE id_producto = ?',
            [idProducto]
        );

        if (resultado.affectedRows === 0) {
            throw new Error(`No se pudo eliminar el producto con ID ${idProducto}`);
        }

        // Eliminar TODAS las imágenes asociadas al producto en uploads/productos
        if (producto[0]?.imagen) {
            try {
                const fsPromises = require('fs').promises;
                const pathUploads = path.resolve(__dirname, '..', 'public', 'uploads', 'productos');
                // Si hay varias imágenes separadas por ',' las eliminamos todas
                const imagenes = producto[0].imagen.split(',').map(img => img.trim()).filter(Boolean);
                for (const img of imagenes) {
    // Elimina el prefijo '/uploads/productos/' o 'uploads/productos/' si existe
    let fileName = img.replace(/^\/?uploads\/productos\//, '');
    const imagePath = path.join(pathUploads, fileName);
    try {
        await fsPromises.access(imagePath); // Verifica si existe
        await fsPromises.unlink(imagePath);
        console.log('Imagen eliminada:', imagePath);
    } catch (err) {
        console.log('La imagen no existe o no se pudo eliminar:', imagePath);
    }
}
            } catch (err) {
                // Continuar aunque no se pueda eliminar la imagen
                console.log('Error al eliminar imagen(es):', err.message);
            }
        }
        
        await connection.commit();
        return {
            error: false,
            mensaje: 'Producto eliminado exitosamente',
            id: idProducto
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error en repository - eliminarProducto:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Crea un registro de transacción bancaria detallada
 * @param {Object} transaccionData - Datos de la transacción bancaria
 * @returns {Object} - La transacción creada con su ID
 */
async function crearTransaccionBancaria(transaccionData) {
    try {
        // SQL para insertar una transacción con toda la información
        const sql = `
            INSERT INTO transacciones_bancarias (
                tipo_transaccion, canal_terminal, id_empresa,
                id_sucursal, codigo_cliente, tipo_moneda, monto_entero,
                monto_decimal, numero_referencia, fecha_hora_trama, estado_banco,
                descripcion_estado, trama_enviada, trama_recibida,
                nombre_cliente, email_cliente, telefono_cliente, direccion_cliente
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Parámetros para la inserción
        const params = [
            transaccionData.tipo_transaccion || '',
            transaccionData.canal_terminal || '',
            transaccionData.id_empresa || '',
            transaccionData.id_sucursal || '',
            transaccionData.codigo_cliente || '',
            transaccionData.tipo_moneda || '',
            transaccionData.monto_entero || '',
            transaccionData.monto_decimal || '',
            transaccionData.numero_referencia || '',
            transaccionData.fecha_hora_trama || '',
            transaccionData.estado_banco || '',
            transaccionData.descripcion_estado || '',
            transaccionData.trama_enviada || '',
            transaccionData.trama_recibida || '',
            transaccionData.nombre_cliente || '',
            transaccionData.email_cliente || '',
            transaccionData.telefono_cliente || '',
            transaccionData.direccion_cliente || ''
        ];
        
        // Intentar insertar directamente, asumiendo que la tabla ya existe
        try {
            const [result] = await pool.execute(sql, params);
            
            return {
                id_transaccion: result.insertId,
                ...transaccionData
            };
        } catch (error) {
            // Si ocurre algún error al insertar, lo reportamos
            console.error('Error al insertar en transacciones_bancarias:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error al crear transacción bancaria:', error);
        console.log('Tipo de error:', error.code);
        throw error;
    }
}

/**
 * Genera un número de referencia aleatorio único para transacciones bancarias
 * @returns {Promise<string>} - Número de referencia de 12 dígitos
 */
async function generarNumeroReferencia() {
    let intentos = 0;
    const maxIntentos = 10; // Límite de intentos para evitar bucles infinitos
    
    while (intentos < maxIntentos) {
        // Generar un número aleatorio de 12 dígitos
        const numeroRef = generarNumeroAleatorio(12);
        
        // Verificar si ya existe en la base de datos
        const existe = await verificarNumeroReferenciaExiste(numeroRef);
        
        if (!existe) {
            return numeroRef; // Devolver número único
        }
        
        intentos++;
    }
    
    // Si se agotan los intentos, usar timestamp como fallback (muy poco probable)
    console.warn('No se pudo generar un número de referencia único después de varios intentos');
    return `R${Date.now().toString().slice(-12)}`;
}

/**
 * Genera un número aleatorio de longitud especificada
 * @param {number} longitud - Longitud del número a generar
 * @returns {string} - Número aleatorio como string
 */
function generarNumeroAleatorio(longitud) {
    let resultado = '';
    const caracteres = '0123456789';
    
    // Primer dígito no puede ser cero para números de referencia
    resultado += caracteres.charAt(Math.floor(Math.random() * 9) + 1);
    
    // Generar el resto de dígitos
    for (let i = 1; i < longitud; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    return resultado;
}

/**
 * Verifica si un número de referencia ya existe en la base de datos
 * @param {string} numeroRef - Número de referencia a verificar
 * @returns {Promise<boolean>} - true si existe, false si no existe
 */
async function verificarNumeroReferenciaExiste(numeroRef) {
    try {
        // Verifica existencia de la tabla y del número de referencia
        const [tablas] = await pool.query(
            "SHOW TABLES LIKE 'transacciones_bancarias'"
        );
        if (tablas.length === 0) return false;
        const [transacciones] = await pool.execute(
            'SELECT 1 FROM transacciones_bancarias WHERE numero_referencia = ? LIMIT 1',
            [numeroRef]
        );
        return transacciones.length > 0;
    } catch (error) {
        // Si el error es por tabla inexistente, asumimos que no hay duplicados
        if (error.code === 'ER_NO_SUCH_TABLE') return false;
        return false;
    }
}

// ============================================
// REPOSITORIO DE FACTURAS
// ============================================

/**
 * Genera un hash aleatorio de longitud específica
 * @param {number} length Longitud deseada del hash
 * @returns {string} Hash generado
 */
function generarHash(length) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    for (let i = 0; i < length; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

/**
 * Genera un número de factura único basado en la fecha y un hash
 * @returns {Promise<string>} Número de factura generado
 */
async function generarNumeroFactura() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    const segundo = String(fecha.getSeconds()).padStart(2, '0');
    
    let intentos = 0;
    const maxIntentos = 10;
    
    while (intentos < maxIntentos) {
        // Generar un hash aleatorio de 6 caracteres
        const hash = generarHash(6);
        const numeroFactura = `FAC-${año}${mes}${dia}-${hora}${minuto}${segundo}-${hash}`;
        
        // Verificar si este número de factura ya existe
        const [existe] = await pool.query(
            'SELECT 1 FROM facturas WHERE numero_factura = ? LIMIT 1',
            [numeroFactura]
        );
        
        if (existe.length === 0) {
            return numeroFactura;
        }
        
        intentos++;
    }
    
    // Si después de varios intentos no se genera un número único,
    // usar timestamp como último recurso
    const timestamp = Date.now().toString().slice(-6);
    return `FAC-${año}${mes}${dia}-${hora}${minuto}${segundo}-${timestamp}`;
}

/**
 * Crea una nueva factura en la base de datos
 * @param {Object} facturaData Datos de la factura
 * @returns {Promise<Object>} Factura creada
 */
async function crearFactura(facturaData) {
    try {
        // Si no se proporciona un número de factura, generamos uno
        if (!facturaData.numero_factura) {
            facturaData.numero_factura = await generarNumeroFactura();
        }
        
        const [result] = await pool.query(`
            INSERT INTO facturas (
                id_transaccion,
                numero_factura,
                numero_referencia,
                nombre_cliente,
                email_cliente,
                telefono_cliente,
                direccion_cliente,
                total,
                detalles,
                ruta_pdf
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            facturaData.id_transaccion,
            facturaData.numero_factura,
            facturaData.numero_referencia,
            facturaData.nombre_cliente,
            facturaData.email_cliente,
            facturaData.telefono_cliente,
            facturaData.direccion_cliente,
            facturaData.total,
            JSON.stringify(facturaData.detalles),
            facturaData.ruta_pdf
        ]);

        return {
            id_factura: result.insertId,
            ...facturaData
        };
    } catch (error) {
        console.error('Error en repository - crearFactura:', error);
        throw error;
    }
}

/**
 * Obtiene una factura por su ID
 * @param {number} idFactura ID de la factura
 * @returns {Promise<Object>} Datos de la factura
 */
async function obtenerFacturaPorId(idFactura) {
    try {
        // Consulta principal con CAST explícito
        const [facturas] = await pool.query(`
            SELECT 
                f.id_factura,
                CAST(f.numero_factura AS CHAR(50)) as numero_factura,
                f.nombre_cliente,
                f.email_cliente,
                f.telefono_cliente,
                f.direccion_cliente,
                f.total,
                f.detalles,
                f.ruta_pdf,
                f.fecha_emision,
                tb.* 
            FROM facturas f
            LEFT JOIN transacciones_bancarias tb ON f.id_transaccion = tb.id_transaccion
            WHERE f.id_factura = ?
        `, [idFactura]);

        if (facturas.length === 0) {
            return null;
        }

        const factura = facturas[0];

        return {
            ...factura,
            detalles: JSON.parse(factura.detalles),
            total: parseFloat(factura.total)
        };
    } catch (error) {
        console.error(`Error en repository - obtenerFacturaPorId(${idFactura}):`, error);
        throw error;
    }
}

/**
 * Actualiza la ruta del PDF de una factura
 * @param {number} idFactura ID de la factura
 * @param {string} rutaPdf Ruta del archivo PDF
 * @returns {Promise<void>}
 */
async function actualizarRutaPdfFactura(idFactura, rutaPdf) {
    try {
        await pool.query(`
            UPDATE facturas 
            SET ruta_pdf = ?
            WHERE id_factura = ?
        `, [rutaPdf, idFactura]);
    } catch (error) {
        console.error(`Error en repository - actualizarRutaPdfFactura:`, error);
        throw error;
    }
}

// Verificar y actualizar la estructura de la tabla facturas si es necesaria
async function verificarYActualizarTablaFacturas() {
    try {
        // Verificar columna numero_factura
        const [columnas] = await pool.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'facturas' 
            AND COLUMN_NAME IN ('numero_factura', 'numero_referencia')
        `);

        const tieneNumeroFactura = columnas.some(col => col.COLUMN_NAME === 'numero_factura');
        const tieneNumeroReferencia = columnas.some(col => col.COLUMN_NAME === 'numero_referencia');

        if (!tieneNumeroFactura || (tieneNumeroFactura && columnas.find(col => col.COLUMN_NAME === 'numero_factura').CHARACTER_MAXIMUM_LENGTH < 50)) {
            await pool.query(`
                ALTER TABLE facturas 
                MODIFY COLUMN numero_factura VARCHAR(50) NOT NULL
            `);
        }

        if (!tieneNumeroReferencia) {
            await pool.query(`
                ALTER TABLE facturas 
                ADD COLUMN numero_referencia VARCHAR(12) AFTER numero_factura
            `);
        }
    } catch (error) {
        console.error('Error al verificar/actualizar estructura de tabla:', error);
    }
}

// Llamar a la función cuando se inicia la aplicación
verificarYActualizarTablaFacturas().catch(console.error);

const TIPOS_EVENTOS_TRANSACCIONES = {
    TRAMA_ENVIADA: 'TRAMA_ENVIADA',
    TRAMA_RECIBIDA: 'TRAMA_RECIBIDA', 
    TRAMA_ERROR: 'TRAMA_ERROR',
    PAGO_INICIADO: 'PAGO_INICIADO',
    PAGO_APROBADO: 'PAGO_APROBADO',
    PAGO_RECHAZADO: 'PAGO_RECHAZADO',
    PAGO_ERROR: 'PAGO_ERROR',
    FACTURA_GENERADA: 'FACTURA_GENERADA',
    FACTURA_ENVIADA: 'FACTURA_ENVIADA',
    FACTURA_ERROR: 'FACTURA_ERROR'
};

/**
 * Estados para eventos de transacciones
 */
const ESTADOS_EVENTOS = {
    EXITOSO: 'EXITOSO',
    FALLIDO: 'FALLIDO',
    PENDIENTE: 'PENDIENTE',
    ERROR: 'ERROR'
};

/**
 * Función helper para parsear detalles de forma segura
 * @param {*} detalles - Los detalles a parsear
 * @returns {Object} - Objeto parseado o vacío
 */
function parsearDetallesSeguro(detalles) {
    // Si es null o undefined, devolver objeto vacío
    if (!detalles) {
        return {};
    }
    
    // Si ya es un objeto, devolverlo tal como está
    if (typeof detalles === 'object' && detalles !== null) {
        return detalles;
    }
    
    // Si es una cadena, intentar parsear como JSON
    if (typeof detalles === 'string') {
        try {
            return JSON.parse(detalles);
        } catch (error) {
            console.warn('Error al parsear detalles JSON:', detalles, error.message);
            return { texto_original: detalles };
        }
    }
    
    // Para cualquier otro tipo, devolver objeto vacío
    return {};
}

/**
 * Crea un nuevo registro en la bitácora de transacciones
 * @param {Object} registroData Datos del registro
 * @returns {Promise<Object>} Registro creado
 */
async function crearRegistroBitacoraTransacciones(registroData) {
    try {
        const [result] = await pool.query(`
            INSERT INTO bitacora_transacciones (
                tipo_evento, estado, descripcion, trama_enviada, trama_recibida,
                codigo_respuesta_banco, tiempo_respuesta_ms, servidor_banco,
                id_transaccion, numero_referencia, monto, codigo_cliente,
                nombre_cliente, email_cliente, id_factura, numero_factura,
                ruta_pdf, ip_origen, detalles_error, datos_adicionales,
                usuario_admin_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            registroData.tipo_evento,
            registroData.estado,
            registroData.descripcion,
            registroData.trama_enviada || null,
            registroData.trama_recibida || null,
            registroData.codigo_respuesta_banco || null,
            registroData.tiempo_respuesta_ms || null,
            registroData.servidor_banco || null,
            registroData.id_transaccion || null,
            registroData.numero_referencia || null,
            registroData.monto || null,
            registroData.codigo_cliente || null,
            registroData.nombre_cliente || null,
            registroData.email_cliente || null,
            registroData.id_factura || null,
            registroData.numero_factura || null,
            registroData.ruta_pdf || null,
            registroData.ip_origen || null,
            registroData.detalles_error || null,
            JSON.stringify(registroData.datos_adicionales || {}),
            registroData.usuario_admin_id || null
        ]);

        return {
            id_registro: result.insertId,
            ...registroData,
            fecha_hora: new Date()
        };
    } catch (error) {
        console.error('Error en repository - crearRegistroBitacoraTransacciones:', error);
        throw error;
    }
}

/**
 * Obtiene registros de la bitácora de transacciones con filtros
 * @param {Object} filtros Filtros para la búsqueda
 * @returns {Promise<Array>} Lista de registros
 */
async function obtenerRegistrosBitacoraTransacciones(filtros = {}) {
    try {
        let query = `
            SELECT 
                bt.*,
                ua.nombre as admin_nombre,
                ua.email as admin_email
            FROM bitacora_transacciones bt
            LEFT JOIN usuarios_admin ua ON bt.usuario_admin_id = ua.id_usuario
            WHERE 1=1
        `;
        const params = [];

        if (filtros.tipo_evento) {
            query += ' AND bt.tipo_evento = ?';
            params.push(filtros.tipo_evento);
        }

        if (filtros.estado) {
            query += ' AND bt.estado = ?';
            params.push(filtros.estado);
        }

        if (filtros.fecha_inicio) {
            query += ' AND bt.fecha_hora >= ?';
            params.push(filtros.fecha_inicio);
        }

        if (filtros.fecha_fin) {
            query += ' AND bt.fecha_hora <= ?';
            params.push(filtros.fecha_fin);
        }

        if (filtros.numero_referencia) {
            query += ' AND bt.numero_referencia = ?';
            params.push(filtros.numero_referencia);
        }

        if (filtros.id_transaccion) {
            query += ' AND bt.id_transaccion = ?';
            params.push(filtros.id_transaccion);
        }

        if (filtros.numero_factura) {
            query += ' AND bt.numero_factura = ?';
            params.push(filtros.numero_factura);
        }

        if (filtros.codigo_respuesta_banco) {
            query += ' AND bt.codigo_respuesta_banco = ?';
            params.push(filtros.codigo_respuesta_banco);
        }

        // Ordenar por fecha descendente
        query += ' ORDER BY bt.fecha_hora DESC';

        // Paginación
        if (filtros.limite) {
            query += ' LIMIT ?';
            params.push(parseInt(filtros.limite));

            if (filtros.offset) {
                query += ' OFFSET ?';
                params.push(parseInt(filtros.offset));
            }
        }

        console.log('Ejecutando query bitácora transacciones:', query);
        console.log('Con parámetros:', params);

        const [registros] = await pool.query(query, params);
        console.log(`Query ejecutada, ${registros.length} registros obtenidos`);

        return registros.map(registro => ({
            ...registro,
            datos_adicionales: parsearDetallesSeguro(registro.datos_adicionales)
        }));
    } catch (error) {
        console.error('Error en repository - obtenerRegistrosBitacoraTransacciones:', error);
        throw error;
    }
}

/**
 * Obtiene un registro específico de la bitácora de transacciones
 * @param {number} idRegistro ID del registro
 * @returns {Promise<Object>} Registro encontrado
 */
async function obtenerRegistroBitacoraTransaccionesPorId(idRegistro) {
    try {
        const [registros] = await pool.query(`
            SELECT 
                bt.*,
                ua.nombre as admin_nombre,
                ua.email as admin_email
            FROM bitacora_transacciones bt
            LEFT JOIN usuarios_admin ua ON bt.usuario_admin_id = ua.id_usuario
            WHERE bt.id_registro = ?
        `, [idRegistro]);

        if (registros.length === 0) {
            return null;
        }

        const registro = registros[0];
        return {
            ...registro,
            datos_adicionales: parsearDetallesSeguro(registro.datos_adicionales)
        };
    } catch (error) {
        console.error(`Error en repository - obtenerRegistroBitacoraTransaccionesPorId(${idRegistro}):`, error);
        throw error;
    }
}

// Exportar tanto el pool de conexiones como las funciones de repositorio
module.exports = {
    // Conexión a la base de datos (para compatibilidad con código existente)
    pool,
    
    // Funciones de productos
    obtenerTodosProductos,
    obtenerProductoPorId,
    obtenerProductosDestacados,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    obtenerTodosProductosAdmin,
    
    // Funciones de categorías
    obtenerTodasCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    
    // Funciones de transacciones bancarias
    crearTransaccionBancaria,
    generarNumeroReferencia,
    
    // Funciones de facturas
    generarNumeroFactura,
    crearFactura,
    obtenerFacturaPorId,
    actualizarRutaPdfFactura,
    
    // Funciones de bitácora
    TIPOS_EVENTOS_TRANSACCIONES,
    ESTADOS_EVENTOS,
    crearRegistroBitacoraTransacciones,
    obtenerRegistrosBitacoraTransacciones,
    obtenerRegistroBitacoraTransaccionesPorId
};
