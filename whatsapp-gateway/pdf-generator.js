// c:\Users\Martin\whatsapp-gateway\pdf-generator.js
import PDFDocument from 'pdfkit';

const FONT_SIZE_NORMAL = 10;
/**
 * Genera un PDF de cotización basado en los datos proporcionados.
 * @param {object} datosCotizacion - Los datos para la cotización.
 * @returns {Promise<Buffer>} Una promesa que se resuelve con el buffer del PDF.
 */
async function generarCotizacionPDF(datosCotizacion) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    // --- Contenido del PDF ---
    // Encabezado
    doc.fontSize(18).text('Cotización de Materiales', { align: 'center' });
    doc.moveDown();

    // Datos del cliente y fecha
    doc.fontSize(FONT_SIZE_NORMAL).text(`Cliente: ${datosCotizacion.cliente || 'Consumidor Final'}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    // --- Tabla de Ítems ---
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 490;

    // Encabezados de la tabla
    doc.fontSize(FONT_SIZE_NORMAL + 1).font('Helvetica-Bold');
    doc.text('Descripción', itemX, tableTop);
    doc.text('Cant.', qtyX, tableTop, { width: 40, align: 'right' });
    doc.text('P. Unit.', priceX, tableTop, { width: 60, align: 'right' });
    doc.text('Total', totalX, tableTop, { width: 60, align: 'right' });
    doc.moveDown();
    
    // Línea separadora
    const tableBottom = doc.y;
    doc.moveTo(itemX, tableBottom).lineTo(totalX + 60, tableBottom).stroke();
    doc.font('Helvetica').fontSize(FONT_SIZE_NORMAL);

    // Filas de la tabla
    let finalY = doc.y;
    datosCotizacion.items.forEach(item => {
        const y = doc.y;
        doc.text(item.descripcion, itemX, y, { width: 280 });
        doc.text(item.cantidad.toString(), qtyX, y, { width: 40, align: 'right' });
        doc.text(`$${(item.precio_unitario || 0).toFixed(2)}`, priceX, y, { width: 60, align: 'right' });
        doc.text(`$${(item.total_item || 0).toFixed(2)}`, totalX, y, { width: 60, align: 'right' });
        doc.moveDown();
        finalY = doc.y;
    });

    // Línea y Total General
    doc.moveTo(itemX, finalY).lineTo(totalX + 60, finalY).stroke();
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(FONT_SIZE_NORMAL + 2);
    doc.text('Total General:', priceX - 40, doc.y, { align: 'right', width: 100 });
    doc.text(`$${(datosCotizacion.total || 0).toFixed(2)}`, totalX, doc.y, { width: 60, align: 'right' });

    doc.end();
  });
}

export { generarCotizacionPDF };