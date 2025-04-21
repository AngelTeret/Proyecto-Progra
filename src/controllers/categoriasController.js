// Importar el repositorio centralizado
const db = require('../database');

// Obtener todas las categorías
exports.getCategorias = async (req, res) => {
    try {
        // Usar la función centralizada del repositorio
        const categorias = await db.obtenerTodasCategorias();
        
        // Mantenemos el formato esperado por el frontend
        // El frontend espera un array directo de categorías
        res.json(categorias);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ mensaje: 'Error al obtener las categorías' });
    }
};

// Obtener una categoría por ID
exports.getCategoriaById = async (req, res) => {
    try {
        const { id } = req.params;
        // Usar la función centralizada del repositorio
        const categoria = await db.obtenerCategoriaPorId(id);
        
        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }
        
        res.json(categoria);
    } catch (error) {
        console.error('Error al obtener la categoría:', error);
        res.status(500).json({ mensaje: 'Error al obtener la categoría' });
    }
};

// Crear nueva categoría
exports.createCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        
        if (!nombre) {
            return res.status(400).json({
                mensaje: 'El nombre de la categoría es obligatorio'
            });
        }
        
        // Usar la función centralizada del repositorio
        const nuevaCategoria = await db.crearCategoria({
            nombre, 
            descripcion: descripcion || ''
        });
        
        res.status(201).json(nuevaCategoria);
    } catch (error) {
        console.error('Error al crear la categoría:', error);
        res.status(500).json({ mensaje: 'Error al crear la categoría' });
    }
};

// Actualizar categoría
exports.updateCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, estado } = req.body;
        
        console.log('Datos para actualizar categoría:', { id, nombre, descripcion, estado });
        
        if (!nombre) {
            return res.status(400).json({
                mensaje: 'El nombre de la categoría es obligatorio'
            });
        }
        
        // Verificar si la categoría existe
        const categoriaExistente = await db.obtenerCategoriaPorId(id);
        
        if (!categoriaExistente) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }
        
        // Usar la función centralizada del repositorio
        // Convertir estado a booleano para MySQL si está presente
        const datosActualizados = {
            nombre, 
            descripcion: descripcion || ''
        };
        
        // Incluir estado solo si fue enviado en la solicitud
        if (estado !== undefined) {
            // Convertir cualquier valor a booleano para MySQL
            // estado=1 o estado='1' o estado=true → true
            // estado=0 o estado='0' o estado=false → false
            datosActualizados.estado = estado == 1 || estado === true || estado === 'true' ? 1 : 0;
        }
        
        const categoriaActualizada = await db.actualizarCategoria(id, datosActualizados);
        
        res.json(categoriaActualizada);
    } catch (error) {
        console.error('Error al actualizar la categoría:', error);
        res.status(500).json({ mensaje: 'Error al actualizar la categoría' });
    }
};

// Eliminar categoría
exports.deleteCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si la categoría existe
        const categoriaExistente = await db.obtenerCategoriaPorId(id);
        
        if (!categoriaExistente) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }
        
        // Usar la función centralizada del repositorio
        await db.eliminarCategoria(id);
        
        res.json({ mensaje: 'Categoría eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar la categoría:', error);
        res.status(500).json({ mensaje: 'Error al eliminar la categoría' });
    }
};
