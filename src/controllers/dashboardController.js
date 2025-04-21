const mysql = require('mysql2/promise');

// Configuración de la conexión a la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Obtener datos del dashboard
async function getDashboardData(req, res) {
    let connection;
    try {
        connection = await pool.getConnection();

        // Obtener ventas del día
        const [ventasDia] = await connection.query(`
            SELECT COALESCE(SUM(total), 0) as total
            FROM pedidos
            WHERE DATE(fecha_pedido) = CURDATE()
            AND estado = 'pagado'
        `);

        // Obtener pedidos pendientes
        const [pedidosPendientes] = await connection.query(`
            SELECT COUNT(*) as total
            FROM pedidos
            WHERE estado = 'pendiente'
        `);

        // Obtener productos activos
        const [productosActivos] = await connection.query(`
            SELECT COUNT(*) as total
            FROM productos
            WHERE estado = 'activo'
        `);

        // Obtener total de clientes (pedidos únicos)
        const [totalClientes] = await connection.query(`
            SELECT COUNT(DISTINCT email_cliente) as total
            FROM pedidos
        `);

        // Obtener ventas de los últimos 7 días
        const [ventasUltimos7Dias] = await connection.query(`
            SELECT 
                DATE(fecha_pedido) as fecha,
                SUM(total) as total
            FROM pedidos
            WHERE fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND estado = 'pagado'
            GROUP BY DATE(fecha_pedido)
            ORDER BY fecha
        `);

        // Obtener productos más vendidos
        const [productosMasVendidos] = await connection.query(`
            SELECT 
                p.nombre,
                SUM(dp.cantidad) as total_vendido
            FROM detalle_pedido dp
            JOIN productos p ON dp.id_producto = p.id_producto
            JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
            WHERE pe.estado = 'pagado'
            GROUP BY p.id_producto
            ORDER BY total_vendido DESC
            LIMIT 5
        `);

        // Obtener últimos pedidos
        const [ultimosPedidos] = await connection.query(`
            SELECT 
                id_pedido,
                nombre_cliente,
                total,
                estado,
                fecha_pedido
            FROM pedidos
            ORDER BY fecha_pedido DESC
            LIMIT 5
        `);

        res.json({
            ventasDia: ventasDia[0].total,
            pedidosPendientes: pedidosPendientes[0].total,
            productosActivos: productosActivos[0].total,
            totalClientes: totalClientes[0].total,
            ventasUltimos7Dias,
            productosMasVendidos,
            ultimosPedidos
        });

    } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
        res.status(500).json({
            error: true,
            mensaje: 'Error al obtener datos del dashboard'
        });
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    getDashboardData
};
