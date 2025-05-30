const {
    TIPOS_EVENTOS_TRANSACCIONES,
    ESTADOS_EVENTOS,
    crearRegistroBitacoraTransacciones,
    obtenerRegistrosBitacoraTransacciones,
    obtenerRegistroBitacoraTransaccionesPorId
} = require('../database');

/**
 * Registra un nuevo evento en la bitácora de transacciones
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.registrarEvento = async (req, res) => {
    try {
        const {
            tipo_evento,
            estado,
            descripcion,
            trama_enviada,
            trama_recibida,
            codigo_respuesta_banco,
            tiempo_respuesta_ms,
            servidor_banco,
            id_transaccion,
            numero_referencia,
            monto,
            codigo_cliente,
            nombre_cliente,
            email_cliente,
            id_factura,
            numero_factura,
            ruta_pdf,
            detalles_error,
            datos_adicionales
        } = req.body;

        // Validar campos requeridos
        if (!tipo_evento || !estado || !descripcion) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: tipo_evento, estado, descripcion'
            });
        }

        // Validar que el tipo de evento sea válido
        if (!Object.values(TIPOS_EVENTOS_TRANSACCIONES).includes(tipo_evento)) {
            return res.status(400).json({
                error: 'Tipo de evento inválido'
            });
        }

        // Validar que el estado sea válido
        if (!Object.values(ESTADOS_EVENTOS).includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido'
            });
        }

        const registro = await crearRegistroBitacoraTransacciones({
            tipo_evento,
            estado,
            descripcion,
            trama_enviada,
            trama_recibida,
            codigo_respuesta_banco,
            tiempo_respuesta_ms,
            servidor_banco,
            id_transaccion,
            numero_referencia,
            monto,
            codigo_cliente,
            nombre_cliente,
            email_cliente,
            id_factura,
            numero_factura,
            ruta_pdf,
            ip_origen: req.ip,
            detalles_error,
            datos_adicionales,
            usuario_admin_id: req.usuario?.id
        });

        res.json(registro);
    } catch (error) {
        console.error('Error al registrar evento en bitácora:', error);
        res.status(500).json({
            error: 'Error al registrar evento en bitácora'
        });
    }
};

/**
 * Obtiene registros de la bitácora de transacciones con filtros
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.obtenerRegistros = async (req, res) => {
    try {
        const {
            tipo_evento,
            estado,
            fecha_inicio,
            fecha_fin,
            numero_referencia,
            id_transaccion,
            numero_factura,
            codigo_respuesta_banco,
            limite = 50,
            pagina = 1
        } = req.query;

        const filtros = {
            tipo_evento,
            estado,
            fecha_inicio,
            fecha_fin,
            numero_referencia,
            id_transaccion,
            numero_factura,
            codigo_respuesta_banco,
            limite: parseInt(limite),
            offset: (parseInt(pagina) - 1) * parseInt(limite)
        };

        // Obtener registros con filtros
        const registros = await obtenerRegistrosBitacoraTransacciones(filtros);
        // Obtener el total de registros sin límite para la paginación
        const filtrosSinLimite = {
            tipo_evento,
            estado,
            fecha_inicio,
            fecha_fin,
            numero_referencia,
            id_transaccion,
            numero_factura,
            codigo_respuesta_banco
        };
        const todosLosRegistros = await obtenerRegistrosBitacoraTransacciones(filtrosSinLimite);
        const total = todosLosRegistros.length;

        const respuesta = {
            registros,
            pagina: parseInt(pagina),
            limite: parseInt(limite),
            total,
            tipos_disponibles: Object.values(TIPOS_EVENTOS_TRANSACCIONES),
            estados_disponibles: Object.values(ESTADOS_EVENTOS)
        };

        res.json(respuesta);
    } catch (error) {
        console.error('Error detallado al obtener registros de bitácora:', error);
        res.status(500).json({
            error: 'Error al obtener registros de bitácora',
            detalle: error.message
        });
    }
};

/**
 * Obtiene un registro específico de la bitácora de transacciones
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.obtenerRegistroPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const registro = await obtenerRegistroBitacoraTransaccionesPorId(id);

        if (!registro) {
            return res.status(404).json({
                error: 'Registro no encontrado'
            });
        }

        res.json(registro);
    } catch (error) {
        console.error('Error al obtener registro de bitácora:', error);
        res.status(500).json({
            error: 'Error al obtener registro de bitácora'
        });
    }
}; 