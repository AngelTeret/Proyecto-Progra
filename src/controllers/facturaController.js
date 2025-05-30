// Controlador de facturación y generación de PDF/email
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { crearFactura, obtenerFacturaPorId, actualizarRutaPdfFactura, generarNumeroFactura } = require('../database');

// Verificar que las variables de entorno estén disponibles
console.log('Verificando configuración de correo:', {
    userConfigured: process.env.EMAIL_USER,
    passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
});

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true // Activar debugging para ver más detalles
});

// Verificar la conexión al iniciar
transporter.verify(function(error, success) {
    if (error) {
        console.log('Error en la configuración del correo:', error);
    } else {
        console.log('Servidor de correo está listo para enviar mensajes');
    }
});

/**
 * Genera el PDF de la factura
 * @param {Object} facturaData Datos de la factura
 * @returns {Promise<string>} Ruta del archivo PDF generado
 */
async function generarPDF(facturaData) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });
    const outputDir = path.join(__dirname, '../public/facturas');
    await fsPromises.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `factura-${facturaData.numero_factura}.pdf`);
    const writeStream = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
        doc.pipe(writeStream);

        // Estilos y configuración
        const colorPrimario = '#8B0000'; // Color vino
        const colorSecundario = '#4A4A4A'; // Gris oscuro
        const fontRegular = 'Helvetica';
        const fontBold = 'Helvetica-Bold';

        // Encabezado con logo
        doc.image(path.join(__dirname, '../public/img/logo.jpg'), 50, 45, { width: 120 })
           .font(fontBold)
           .fontSize(24)
           .fillColor(colorPrimario)
           .text('FACTURA', 250, 45)
           .fontSize(12)
           .fillColor(colorSecundario)
           .text(`Nº: ${facturaData.numero_factura}`, 250, 75)
           .text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, 250, 95)
           .text(`Ref. Bancaria: ${facturaData.numero_referencia || 'N/A'}`, 250, 115);

        // Línea separadora
        doc.moveTo(50, 145)
           .lineTo(550, 145)
           .strokeColor(colorPrimario)
           .stroke();

        // Información del cliente
        doc.moveDown()
           .font(fontBold)
           .fontSize(14)
           .fillColor(colorPrimario)
           .text('Datos del Cliente', 50, 165)
           .moveDown(0.2)
           .font(fontRegular)
           .fontSize(12)
           .fillColor(colorSecundario)
           .text(`Nombre: ${facturaData.nombre_cliente}`, 50, null)
           .text(`Email: ${facturaData.email_cliente}`)
           .text(`Teléfono: ${facturaData.telefono_cliente}`)
           .text(`Dirección: ${facturaData.direccion_cliente}`, {width: 400});

        // Tabla de productos - ajustada para empezar más cerca de los datos del cliente
        const tableTop = 295;
        const tableHeaders = ['Producto', 'Cantidad', 'Precio', 'Subtotal'];
        // Ajustado anchos para que quepa todo en el PDF (ancho total disponible ~500)
        const columnWidths = [250, 75, 85, 85]; // Total: 495
        const startX = 50;
        const endX = startX + columnWidths.reduce((a, b) => a + b, 0);
        let currentTop = tableTop;

        // Función helper para dibujar líneas verticales
        function drawVerticalLines(y1, y2) {
            let x = startX;
            columnWidths.forEach(width => {
                x += width;
                if (x < endX) { // No dibujar después de la última columna
                    doc.moveTo(x, y1)
                       .lineTo(x, y2)
                       .stroke();
                }
            });
        }

        // Línea superior de la tabla
        doc.moveTo(startX, currentTop)
           .lineTo(endX, currentTop)
           .strokeColor(colorPrimario)
           .stroke();

        // Encabezados de la tabla
        currentTop += 10;
        doc.font(fontBold)
           .fillColor(colorPrimario)
           .fontSize(12);

        let currentLeft = startX;
        tableHeaders.forEach((header, i) => {
            doc.text(header, currentLeft, currentTop, {
                width: columnWidths[i],
                align: i === 0 ? 'left' : 'center'
            });
            currentLeft += columnWidths[i];
        });

        // Línea bajo los encabezados
        currentTop += 20;
        doc.moveTo(startX, currentTop)
           .lineTo(endX, currentTop)
           .stroke();

        // Líneas verticales para los encabezados
        drawVerticalLines(tableTop, currentTop);

        // Contenido de la tabla
        doc.font(fontRegular)
           .fillColor(colorSecundario);

        let lastRowBottom = currentTop;

        facturaData.detalles.forEach((item, index) => {
            currentTop += 20;
            const subtotal = item.cantidad * item.precio;
            
            // Fondo gris alternado para las filas
            if (index % 2 === 1) {
                doc.rect(startX, currentTop - 5, 
                        columnWidths.reduce((a, b) => a + b, 0), 25)
                   .fill('#f9f9f9');
            }

            // Producto
            doc.fillColor(colorSecundario)
               .text(item.nombre, startX + 5, currentTop, {
                   width: columnWidths[0] - 10,
                   align: 'left'
               });

            // Cantidad
            doc.text(item.cantidad.toString(), startX + columnWidths[0] + 5, currentTop, {
                width: columnWidths[1] - 10,
                align: 'center'
            });

            // Precio
            doc.text(`Q. ${item.precio.toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + 5, currentTop, {
                width: columnWidths[2] - 10,
                align: 'right'
            });

            // Subtotal
            doc.text(`Q. ${subtotal.toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, currentTop, {
                width: columnWidths[3] - 10,
                align: 'right'
            });

            // Línea separadora horizontal
            currentTop += 20;
            doc.moveTo(startX, currentTop)
               .lineTo(endX, currentTop)
               .strokeColor('#E5E5E5')
               .stroke();

            lastRowBottom = currentTop;
        });

        // Líneas verticales para todo el contenido
        drawVerticalLines(tableTop, lastRowBottom);

        // Total
        currentTop += 5;
        const totalStartX = startX + columnWidths[0] + columnWidths[1];
        
        doc.font(fontBold)
           .fontSize(14)
           .fillColor(colorPrimario)
           .text('Total:', totalStartX, currentTop, {
               width: columnWidths[2],
               align: 'right'
           })
           .text(`Q. ${facturaData.total.toFixed(2)}`, totalStartX + columnWidths[2], currentTop, {
               width: columnWidths[3] - 10,
               align: 'right'
           });

        // Pie de página
        doc.fontSize(10)
           .fillColor(colorSecundario)
           .text('Gracias por su compra', 50, 700, { align: 'center' })
           .text('Rare Beauty', 50, 720, { align: 'center' });

        doc.end();

        writeStream.on('finish', () => {
            resolve(outputPath);
        });

        writeStream.on('error', reject);
    });
}

/**
 * Envía la factura por correo electrónico
 * @param {Object} facturaData Datos de la factura
 * @param {string} pdfPath Ruta del archivo PDF
 * @returns {Promise<void>}
 */
async function enviarFacturaPorEmail(facturaData, pdfPath) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: facturaData.email_cliente,
        subject: 'Factura de su compra - Rare Beauty',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8B0000; text-align: center;">¡Gracias por su compra!</h2>
                <p>Estimado/a ${facturaData.nombre_cliente},</p>
                <p>Adjunto encontrará la factura de su compra con el número ${facturaData.numero_factura}.</p>
                <p><strong>Resumen de la compra:</strong></p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f8f8f8;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Cantidad</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Precio</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${facturaData.detalles.map(item => `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.nombre}</td>
                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${item.cantidad}</td>
                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Q. ${item.precio.toFixed(2)}</td>
                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Q. ${(item.cantidad * item.precio).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
                            <td style="padding: 10px; text-align: right; font-weight: bold;">Q. ${facturaData.total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div style="margin-top: 30px; padding: 15px; background-color: #f8f8f8; border-radius: 5px;">
                    <p style="margin: 0; color: #666;">
                        <strong>Nota:</strong> Para su comodidad, encontrará adjunto a este correo el archivo PDF de su factura, 
                        el cual puede descargar y guardar para sus registros.
                    </p>
                </div>
                <p style="text-align: center; color: #666; margin-top: 30px;">¡Gracias por confiar en Rare Beauty!</p>
            </div>
        `,
        attachments: [{
            filename: `factura-${facturaData.numero_factura}.pdf`,
            path: pdfPath
        }]
    };

    await transporter.sendMail(mailOptions);
}

/**
 * Crea una nueva factura, genera el PDF y envía el correo
 * @param {Object} datosTransaccion Datos de la transacción bancaria
 * @returns {Promise<Object>} Datos de la factura creada
 */
async function procesarFactura(datosTransaccion) {
    try {
        // Validar que tengamos un número de referencia
        if (!datosTransaccion.numero_referencia) {
            throw new Error('No se proporcionó un número de referencia para la factura');
        }

        // Primero generar el número de factura
        const numeroFactura = await generarNumeroFactura();

        // Crear la factura en la base de datos
        const facturaData = {
            id_transaccion: datosTransaccion.id_transaccion,
            numero_factura: numeroFactura,
            nombre_cliente: datosTransaccion.nombre_cliente,
            email_cliente: datosTransaccion.email_cliente,
            telefono_cliente: datosTransaccion.telefono_cliente,
            direccion_cliente: datosTransaccion.direccion_cliente,
            total: datosTransaccion.monto,
            detalles: JSON.parse(datosTransaccion.detalles_compra),
            numero_referencia: datosTransaccion.numero_referencia,
            ruta_pdf: ''
        };

        const factura = await crearFactura(facturaData);
        
        // Generar el PDF
        const pdfPath = await generarPDF(factura);
        
        // Actualizar la ruta del PDF en la base de datos
        const rutaPdfRelativa = path.relative(
            path.join(__dirname, '../public'),
            pdfPath
        ).replace(/\\/g, '/');
        
        await actualizarRutaPdfFactura(factura.id_factura, rutaPdfRelativa);
        
        // Enviar el correo electrónico
        await enviarFacturaPorEmail(factura, pdfPath);

        return {
            ...factura,
            ruta_pdf: rutaPdfRelativa,
            numero_referencia: datosTransaccion.numero_referencia
        };
    } catch (error) {
        console.error('Error en procesarFactura:', error);
        throw error;
    }
}

/**
 * Obtiene los datos de una factura para mostrar en la vista
 * @param {number} idFactura ID de la factura
 * @returns {Promise<Object>} Datos de la factura
 */
async function obtenerDatosFactura(idFactura) {
    try {
        const factura = await obtenerFacturaPorId(idFactura);
        if (!factura) {
            throw new Error('Factura no encontrada');
        }
        return factura;
    } catch (error) {
        console.error(`Error en obtenerDatosFactura(${idFactura}):`, error);
        throw error;
    }
}

module.exports = {
    procesarFactura,
    obtenerDatosFactura
}; 