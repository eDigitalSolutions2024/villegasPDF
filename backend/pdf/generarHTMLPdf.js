const puppeteer = require('puppeteer'); 
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Producto = require('../models/Producto');
const HistorialPDF = require('../models/HistorialPDF');
const jwt = require('jsonwebtoken');
const metodosPath = path.join(__dirname, '..', 'uploads', 'metodos');
const traducciones = require('../traductor.js');


const cssPath = path.join(__dirname, '..', 'templates', 'folleto.css');
const css = fs.readFileSync(cssPath, 'utf8');

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

// Otros logos fijos
/*const ria = path.join(__dirname, '..', 'uploads/metodos', 'RIA.png');
const riaBase64 = fs.readFileSync(ria, { encoding: 'base64' });
const riaMime = mime.lookup(ria);
const riaSrc = `data:${riaMime};base64,${riaBase64}`;

const visa = path.join(__dirname, '..', 'uploads/metodos', 'visa.png');
const visaBase64 = fs.readFileSync(visa, { encoding: 'base64' });
const visaMime = mime.lookup(visa);
const visaSrc = `data:${visaMime};base64,${visaBase64}`;

const Money = path.join(__dirname, '..', 'uploads/metodos', 'MoneyGram.png');
const MoneyBase64 = fs.readFileSync(Money, { encoding: 'base64' });
const MoneyMime = mime.lookup(Money);
const MoneySrc = `data:${MoneyMime};base64,${MoneyBase64}`;*/

const traducirTexto = require('../traductor');
const htmlPath = path.join(__dirname, '..', 'templates', 'folleto.html');

async function generarHTMLPdf(req, res, opciones = {}) {
  let browser;
  try {
    
    const fechaValidez = req.query.fechaValidez || 'del 1 al 7 de Julio de 2025';

    const productos = await Producto.find({ promocion: true });

    // Agrupar productos por categoría
    const productosPorCategoria = {};
    for (const p of productos) {
      const categoria = p.categoria || 'Sin categoría';
      if (!productosPorCategoria[categoria]) {
        productosPorCategoria[categoria] = [];
      }
      productosPorCategoria[categoria].push(p);
    }

    const ordenCategorias = ['Carnes', 'Frutas', 'Abarrotes', 'Panaderia', 'Taqueria'];

    // Traducir nombres
    for (const p of productos) {
      const traduccion = await traducirTexto(p.nombre);
      p.nombreIngles = traduccion || p.nombre;
      await p.save();
    }

    

    // Obtener logos desde req.body o usar por defecto
    const logoCentro = getBase64Logo(req.query.logoCentro || 'juanita.png');
const logoIzq = getBase64Logo(req.query.logoIzq || 'harris.png');
const logoDer = getBase64Logo(req.query.logoDer || 'harris.png');


 

    // Cargar HTML y reemplazar estilos y logos
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('{{LOGO_CENTRO}}', logoCentro)
      .replace('{{LOGOIZQ}}', logoIzq)
      .replace('{{LOGODER}}', logoDer)
      /*.replace('{{ria}}', riaSrc)
      .replace('{{visa}}', visaSrc)
      .replace('{{money}}', MoneySrc)*/
      .replace('{{FECHA_VALIDEZ}}', fechaValidez);

    // Generar los bloques HTML por categoría
    let htmlProductos = '';
    for (const categoria of ordenCategorias) {
      const productosCategoria = productosPorCategoria[categoria];
      if (!productosCategoria) continue;
      
      const categoriaIngles = await traducirTexto(categoria) || " ";
      

      htmlProductos += `<div class="categoria-bloque">
      <div class="separador">
        <h1 class="tit-cat">${categoria.toUpperCase()}</h1>
        <h1 class="tit-cat-en">${categoriaIngles.toUpperCase()}</h1>
      </div>
      `
      ;

      // Primera fila: 2 productos grandes
      htmlProductos += `<div class="fila-dos-productos">`;
      for (let i = 0; i < productosCategoria.length && i < 2; i++) {
        const p = productosCategoria[i];
        const imagenPath = path.join(__dirname, '..', p.imagen);
        const mimeType = mime.lookup(imagenPath);
        let base64Img = '';
        try {
          const buffer = fs.readFileSync(imagenPath);
          base64Img = `data:${mimeType};base64,${buffer.toString('base64')}`;
        } catch (error) {
          console.error('Error leyendo imagen:', imagenPath, error);
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
          </div>`;
      }
      htmlProductos += `</div>`; // fin fila 2

      // Resto: 3 por fila
      if (productosCategoria.length > 2) {
        htmlProductos += `<div class="fila-tres-productos">`;
        for (let i = 2; i < productosCategoria.length; i++) {
          const p = productosCategoria[i];
          const imagenPath = path.join(__dirname, '..', p.imagen);
          const mimeType = mime.lookup(imagenPath);
          let base64Img = '';
          try {
            const buffer = fs.readFileSync(imagenPath);
            base64Img = `data:${mimeType};base64,${buffer.toString('base64')}`;
          } catch (error) {
            console.error('Error leyendo imagen:', imagenPath, error);
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
            </div>`;
        }
        htmlProductos += `</div>`; // fin fila 3
      }

      htmlProductos += `</div>`; // fin categoria-bloque
    }

    html = html.replace('<!-- AQUI_PRODUCTOS -->', htmlProductos);

    // Leer dinámicamente los logos de métodos de pago
    let metodosHTML = '';
      try {
        const metodosSeleccionados = (req.query.metodos || '').split(',').filter(Boolean);
        for (const archivo of metodosSeleccionados) {
          const metodoPath = path.join(metodosPath, archivo);
          if (fs.existsSync(metodoPath)) {
            const mimeType = mime.lookup(metodoPath);
            const base64 = fs.readFileSync(metodoPath, { encoding: 'base64' });
            const src = `data:${mimeType};base64,${base64}`;
            metodosHTML += `<img class="logo-pago" src="${src}" alt="${archivo}" />\n`;
          }
          //console.log('Métodos seleccionados:', req.query.metodos);

        }
      } catch (err) {
        console.error('Error leyendo métodos de pago:', err.message);
      }
      html = html.replace('{{METODOS_PAGO}}', metodosHTML);


    // Iniciar Puppeteer y generar el PDF

    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const timestamp = Date.now();

    if (opciones.generarJPG) {
      const imagePath = path.join(__dirname, '..', 'public', 'jpgs', `folleto-${timestamp}.jpg`);
      await page.setViewport({ width: 850, height: 1980 }); // Tamaño aproximado para carta u oficio
      await page.screenshot({ path: imagePath, type: 'jpeg', quality: 100, fullPage: true });
    }

    if (opciones.guardar) {
      const nombreArchivo = `folleto-${timestamp}.pdf`;
      const outputPath = path.join(__dirname, '..', 'public', 'pdfs', nombreArchivo);
      await page.pdf({ path: outputPath, width: '8.5in', height: '14in', printBackground: true });

      let usuario = 'usuario-desconocido';
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
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
      return res.status(200).send({
        mensaje: 'PDF guardado correctamente',
        archivo: nombreArchivo,
      });
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

module.exports = generarHTMLPdf;
