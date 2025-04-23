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
    generarNumeroReferencia
};
