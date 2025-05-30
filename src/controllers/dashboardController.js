const db = require('../database');

// Obtener datos del dashboard
async function getDashboardData(req, res) {
    try {
        // 1. Resumen de Productos
        const [resumenProductos] = await db.pool.query(`
            SELECT 
                COUNT(*) as total_productos,
                COUNT(CASE WHEN estado = 'activo' THEN 1 END) as productos_activos,
                COUNT(CASE WHEN estado = 'agotado' THEN 1 END) as productos_agotados,
                COALESCE(SUM(stock), 0) as stock_total
            FROM productos
        `);

        // 2. Resumen de Categorías
        const [categorias] = await db.pool.query(`
            SELECT 
                c.nombre as categoria,
                COUNT(pc.id_producto) as total_productos
            FROM categorias c
            LEFT JOIN producto_categoria pc ON c.id_categoria = pc.id_categoria
            GROUP BY c.id_categoria, c.nombre
        `);

        // 3. Eventos de Bitácora
        const [eventosBitacora] = await db.pool.query(`
            SELECT 
                tipo_evento,
                COUNT(*) as total
            FROM bitacora_transacciones
            WHERE fecha_hora >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY tipo_evento
            ORDER BY total DESC
        `);

        // Asegurarse de que resumenProductos[0] existe
        const resumen = resumenProductos[0] || {
            total_productos: 0,
            productos_activos: 0,
            productos_agotados: 0,
            stock_total: 0
        };

        res.json({
            productos: {
                resumen: {
                    total_productos: parseInt(resumen.total_productos) || 0,
                    productos_activos: parseInt(resumen.productos_activos) || 0,
                    productos_agotados: parseInt(resumen.productos_agotados) || 0,
                    stock_total: parseInt(resumen.stock_total) || 0
                }
            },
            categorias: categorias.map(cat => ({
                categoria: cat.categoria,
                total_productos: parseInt(cat.total_productos) || 0
            })),
            bitacora: {
                eventos24h: eventosBitacora.map(ev => ({
                    tipo_evento: ev.tipo_evento,
                    total: parseInt(ev.total) || 0
                }))
            }
        });

    } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
        res.status(500).json({
            error: 'Error al cargar los datos del dashboard'
        });
    }
}

module.exports = {
    getDashboardData
};
