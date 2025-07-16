const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Producto = require('../models/Producto');
const HistorialPDF = require('../models/HistorialPDF');
const jwt = require('jsonwebtoken');

// Cargar plantilla HTML y CSS de la nueva plantilla
const cssPath = path.join(__dirname, '..', 'templates', 'folleto2.css');
const css = fs.readFileSync(cssPath, 'utf8');

const htmlPath = path.join(__dirname, '..', 'templates', 'folleto2.html');

// Logos y métodos de pago (reutilizados)
const base64Image = (filePath) => {
  const buffer = fs.readFileSync(filePath, { encoding: 'base64' });
  const mimeType = mime.lookup(filePath);
  return `data:${mimeType};base64,${buffer}`;
};

const logoSrc = base64Image(path.join(__dirname, '..', 'uploads', 'logo2.png'));
const logoSrc1 = base64Image(path.join(__dirname, '..', 'uploads', 'logo1.png'));
const riaSrc = base64Image(path.join(__dirname, '..', 'uploads', 'RIA.png'));
const visaSrc = base64Image(path.join(__dirname, '..', 'uploads', 'visa.png'));
const moneySrc = base64Image(path.join(__dirname, '..', 'uploads', 'MoneyGram.png'));

async function generarHTMLPdf2(req, res, opciones = {}) {
  try {
    const productos = await Producto.find({ promocion: true });
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('{{LOGO_CENTRO}}', logoSrc)
      .replace('{{LOGOIZQ}}', logoSrc1)
      .replace('{{LOGODER}}', logoSrc1)
      .replace('{{ria}}', riaSrc)
      .replace('{{visa}}', visaSrc)
      .replace('{{money}}', moneySrc);

    let htmlProductos = '';

    for (const p of productos) {
      const imagenPath = path.join(__dirname, '..', p.imagen);
      let base64Img = '';
      try {
        const buffer = fs.readFileSync(imagenPath);
        const mimeType = mime.lookup(imagenPath);
        base64Img = `data:${mimeType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.error('Error leyendo imagen:', imagenPath, err.message);
      }

      htmlProductos += `
        <div class="producto-card">
          <img class="producto-img" src="${base64Img}" />
          <div class="producto-info">
            <div class="producto-datos">
          <div class="producto-nombres">
          <div class="nombre-es">${p.nombre.toUpperCase()}</div>
          <div class="nombre-en">${p.nombreIngles}</div>
        </div>
        <div class="producto-precio-vertical">
        <div class="precio-monto">$${p.precio}</div>
        <div class="precio-unidad">${p.unidad}</div>
      </div>

      </div>
          </div>
        </div>
      `;
    }

    html = html.replace('<!-- AQUI_PRODUCTOS -->', htmlProductos);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    if (opciones.guardar) {
      const nombreArchivo = `folleto2-${Date.now()}.pdf`;
      const outputPath = path.join(__dirname, '..', 'public', 'pdfs', nombreArchivo);
      await page.pdf({ path: outputPath, format: 'A4', printBackground: true });

      // Decodificar usuario
      let usuario = 'usuario-desconocido';
      try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          usuario = decoded.nombre || 'usuario-sin-nombre';
        }
      } catch (err) {
        console.log('Token inválido:', err.message);
        return res.status(401).json({ mensaje: 'Token inválido' });
      }

      await HistorialPDF.create({
        nombreArchivo,
        usuario,
        ruta: `/pdfs/${nombreArchivo}`,
        fecha: new Date(),
      });

      await browser.close();
      return res.send({ mensaje: 'PDF 2 guardado correctamente', archivo: nombreArchivo });
    } else {
      const buffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      return res.send(buffer);
    }
  } catch (error) {
    console.error('Error generando PDF 2:', error);
    return res.status(500).send({ mensaje: 'Error generando PDF 2' });
  }
}

module.exports = generarHTMLPdf2;
