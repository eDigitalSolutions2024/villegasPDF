const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Producto = require('../models/Producto');
const HistorialPDF = require('../models/HistorialPDF');
const jwt = require('jsonwebtoken');
const metodosPath = path.join(__dirname, '..', 'uploads', 'metodos');
const traducciones = require('../traductor.js');

const cssPath = path.join(__dirname, '..', 'templates', 'folleto2.css');
const css = fs.readFileSync(cssPath, 'utf8');
const htmlPath = path.join(__dirname, '..', 'templates', 'folleto2.html');

function getBase64Logo(logoNombre) {
  try {
    const fullPath = path.join(__dirname, '..', 'uploads', logoNombre);
    const base64 = fs.readFileSync(fullPath, { encoding: 'base64' });
    const mimeType = mime.lookup(fullPath);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error cargando el logo ${logoNombre}:`, error.message);
    return '';
  }
}

async function generarHTMLPdf2(req, res, opciones = {}) {
  let browser;
  try {
    const fechaValidez = req.query.fechaValidez || 'del 1 al 7 de Julio de 2025';
    const fondo = req.query.fondo || '#ffffff';

    const meses = {
      enero: 'January', febrero: 'February', marzo: 'March', abril: 'April',
      mayo: 'May', junio: 'June', julio: 'July', agosto: 'August',
      septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December'
    };

    function traducirFecha(fechaEs) {
      const match = fechaEs.match(/del\s+(\d+)\s+al\s+(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
      if (!match) return 'From ? to ?';
      const [, diaInicio, diaFin, mesEs, anio] = match;
      const mesEn = meses[mesEs.toLowerCase()] || mesEs;
      return `From ${mesEn} ${diaInicio} to ${diaFin}, ${anio}`;
    }

    const fechaValidezEn = traducirFecha(fechaValidez);

    // Ordenamos productos por orden de _id (asumiendo orden de inserción)
    const productos = await Producto.find({ promocion: true }).sort({ _id: 1 });

    for (const p of productos) {
      const traduccion = p.nombreInglesManual || await traducciones(p.nombre);
      p.nombreIngles = traduccion || p.nombre;
      await p.save();
    }

    const destacado = productos[0];
    const productosRestantes = productos.slice(1);

    let base64ImgDestacado = '';
    if (destacado?.imagen) {
      const imagenPath = path.join(__dirname, '..', destacado.imagen);
      const mimeType = mime.lookup(imagenPath);
      try {
        const buffer = fs.readFileSync(imagenPath);
        base64ImgDestacado = `data:${mimeType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.error('Error leyendo imagen destacada:', err.message);
      }
    }

    const logoCentro = getBase64Logo(req.query.logoCentro || 'juanita.png');
    const logoIzq = getBase64Logo(req.query.logoIzq || 'harris.png');
    const logoDer = getBase64Logo(req.query.logoDer || 'harris.png');

    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('{{LOGO_CENTRO}}', logoCentro)
      .replace('{{LOGOIZQ}}', logoIzq)
      .replace('{{LOGODER}}', logoDer)
      .replace('{{FECHA_VALIDEZ}}', fechaValidez)
      .replace('{{FECHA_VALIDEZ_EN}}', fechaValidezEn)
      .replace('<body>', `<body style="background: ${fondo}; background-size: cover; background-repeat: no-repeat;">`);

    const productoDestacadoHTML = destacado ? `
      <div class="producto-destacado">
        <div class="producto-card">
          <img class="producto-img" src="${base64ImgDestacado}" />
          <div class="producto-info">
            <div class="producto-nombres">
              <div class="nombre-es">${destacado.nombre.toUpperCase()}</div>
              <div class="nombre-en">${destacado.nombreIngles}</div>
            </div>
            <div class="producto-precio-vertical">
              <div class="precio-monto">$${destacado.precio}</div>
              <div class="precio-unidad">${destacado.unidad}</div>
            </div>
          </div>
        </div>
      </div>` : '';

    html = html.replace('{{PRODUCTO_DESTACADO}}', productoDestacadoHTML);

    // Construimos las secciones (6, 4, 6)
    const secciones = [3,3, 4, 5];
    let index = 0;
    let htmlTodos = '';

    for (const cantidad of secciones) {
      const fila = productosRestantes.slice(index, index + cantidad);
      index += cantidad;

      if (fila.length === 0) break;

      htmlTodos += `<div class="fila-productos fila-${cantidad}">\n`;
      for (const p of fila) {
        let base64Img = '';
        try {
          const imagenPath = path.join(__dirname, '..', p.imagen);
          const mimeType = mime.lookup(imagenPath);
          const buffer = fs.readFileSync(imagenPath);
          base64Img = `data:${mimeType};base64,${buffer.toString('base64')}`;
        } catch (err) {
          console.error('Error con imagen producto:', err.message);
        }

        htmlTodos += `
        <div class="producto-card">
          <img class="producto-img" src="${base64Img}" />
          <div class="producto-info">
            <div class="producto-nombres">
              <div class="nombre-es">${p.nombre.toUpperCase()}</div>
              <div class="nombre-en">${p.nombreIngles}</div>
            </div>
            <div class="producto-precio-vertical">
              <div class="precio-monto">$${p.precio}</div>
              <div class="precio-unidad">${p.unidad}</div>
            </div>
          </div>
        </div>\n`;
      }
      htmlTodos += '</div>\n';
    }

    html = html.replace('<!-- AQUI_PRODUCTOS -->', htmlTodos);

    // Métodos de pago
    let metodosHTML = '';
    const metodosFijos = ['visa.png', 'mastercard.png', 'RIA.png', 'MoneyGram.png'];
    for (const archivo of metodosFijos) {
      const metodoPath = path.join(metodosPath, archivo);
      if (fs.existsSync(metodoPath)) {
        const mimeType = mime.lookup(metodoPath);
        const base64 = fs.readFileSync(metodoPath, { encoding: 'base64' });
        const src = `data:${mimeType};base64,${base64}`;
        metodosHTML += `<img class="logo-pago" src="${src}" alt="${archivo}" />\n`;
      }
    }
    html = html.replace('{{METODOS_PAGO}}', metodosHTML);

    // PDF o imagen
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const timestamp = Date.now();

    if (opciones.generarJPG) {
      const imagePath = path.join(__dirname, '..', 'public', 'jpgs', `folleto-${timestamp}.jpg`);
      await page.setViewport({ width: 850, height: 1980 });
      await page.screenshot({ path: imagePath, type: 'jpeg', quality: 100, fullPage: true });
    }

    if (opciones.guardar) {
      const nombreArchivo = `folleto-${timestamp}.pdf`;
      const outputPath = path.join(__dirname, '..', 'public', 'pdfs', nombreArchivo);
      await page.pdf({ path: outputPath, format:'letter',printBackground: true });

      let usuario = 'usuario-desconocido';
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          usuario = decoded.nombre || 'usuario-sin-nombre';
        } catch (err) {
          await browser.close();
          return res.status(401).json({ mensaje: 'Token inválido' });
        }
      }

      await HistorialPDF.create({
        nombreArchivo,
        usuario,
        ruta: `/pdfs/${nombreArchivo}`,
        imagen: `/jpgs/${nombreArchivo.replace('.pdf', '.jpg')}`,
        fecha: new Date()
      });

      await browser.close();
      return res.status(200).send({ mensaje: 'PDF guardado correctamente', archivo: nombreArchivo });
    } else {
      const buffer = await page.pdf({ width: '8.5in', height: '14in', printBackground: true });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(buffer);
    }

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    if (browser) await browser.close();
    return res.status(500).send({ mensaje: 'Error interno al generar el PDF' });
  }
}

module.exports = generarHTMLPdf2;
