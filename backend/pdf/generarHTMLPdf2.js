const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Producto = require('../models/Producto');
const HistorialPDF = require('../models/HistorialPDF');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const metodosPath = path.join(__dirname, '..', 'uploads', 'metodos');
const traducciones = require('../traductor.js');

const cssPath = path.join(__dirname, '..', 'templates', 'folleto2.css');
const css = fs.readFileSync(cssPath, 'utf8');
const htmlPath = path.join(__dirname, '..', 'templates', 'folleto2.html');

// 🔄 Local/URL → base64
async function obtenerBase64Imagen(ruta) {
  try {
    if (ruta?.startsWith('http')) {
      const response = await axios.get(ruta, { responseType: 'arraybuffer' });
      const mimeType = response.headers['content-type'];
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:${mimeType};base64,${base64}`;
    } else if (ruta) {
      const buffer = fs.readFileSync(ruta);
      const mimeType = mime.lookup(ruta);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
    return '';
  } catch (error) {
    console.error('Error obteniendo imagen base64:', error.message);
    return '';
  }
}

function getBase64FromUploads(subdirArray, filename) {
  if (!filename) return '';
  try {
    const fullPath = path.join(__dirname, '..', 'uploads', ...subdirArray, filename);
    const base64 = fs.readFileSync(fullPath, { encoding: 'base64' });
    const mimeType = mime.lookup(fullPath);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error cargando ${subdirArray.join('/')}/${filename}:`, error.message);
    return '';
  }
}
const getBase64LogoCentro  = (name) => getBase64FromUploads(['logos','centro'], name);
const getBase64LogoLateral = (name) => getBase64FromUploads(['logos','laterales'], name);

function getBase64Festivo(nombre) {
  if (!nombre) return '';
  try {
    const fullPath = path.join(__dirname, '..', 'uploads', 'Dias', nombre);
    const base64 = fs.readFileSync(fullPath, { encoding: 'base64' });
    const mimeType = mime.lookup(fullPath);
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.error('Error cargando festivo:', e.message);
    return '';
  }
}

function getBase64Mapa(mapaNombre) {
  if (!mapaNombre) return '';
  try {
    const fullPath = path.join(__dirname, '..', 'uploads', 'mapas', mapaNombre);
    const base64 = fs.readFileSync(fullPath, { encoding: 'base64' });
    const mimeType = mime.lookup(fullPath);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error cargando el mapa ${mapaNombre}:`, error.message);
    return '';
  }
}

async function generarHTMLPdf2(req, res, opciones = {}) {
  let browser;
  try {
    // ======= FECHAS / FONDO =======
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

    // ======= SUCURSALES / LOGOS =======
    const SUCURSALES = {
      'juanita.png': {
        direccion: '340 W Grant Line Rd. , Tracy, CA, United States, 95376',
        telefono: '(209) 123-4567',
        mapa: 'direccion_juanita.png'
      },
      'juanita.jpeg': { // por si llega .jpeg
        direccion: '340 W Grant Line Rd. , Tracy, CA, United States, 95376',
        telefono: '(209) 123-4567',
        mapa: 'direccion_juanita.png'
      },
      'maya.png': {
        direccion: '120 S. Orchard Ave., Vacaville, CA, United States, 95688',
        telefono: '(707) 359-5400',
        mapa: 'maya_direccion.png'
      },
      'bajio.jpg': {
        direccion: '10153 Live Oak Blvd, Live Oak, CA, United States, 95953 ',
        telefono: '(415) 555-0142',
        mapa: 'elbajio_direccion.png'
      },
      default: {
        direccion: '340 W Grant Line, Tracy, CA',
        telefono: '(209) 123-4567'
      }
    };

    const logoCentroNombre = req.query.logoCentro || 'juanita.png';
    const logoCentro = getBase64LogoCentro(logoCentroNombre);
    const logoIzq    = getBase64LogoLateral(req.query.logoIzq || 'harris.jpeg');
    const suc = SUCURSALES[logoCentroNombre] || SUCURSALES.default;
    const mapaTienda = getBase64Mapa(suc.mapa);

    // ======= ORDEN DE SELECCIÓN (selectedIds) =======
    const selectedFromOptions = Array.isArray(opciones.selectedIds)
      ? opciones.selectedIds.map(String)
      : [];
    const selectedFromQuery = req.query.ids
      ? String(req.query.ids).split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const selectedIds = selectedFromOptions.length > 0 ? selectedFromOptions : selectedFromQuery;

    // ======= OBTENCIÓN DE PRODUCTOS (misma lógica que plantilla 1) =======
    const filtroBase = { promocion: true };
    let productos;

    if (selectedIds.length > 0) {
      // Solo seleccionados + promocion:true
      productos = await Producto.find({
        _id: { $in: selectedIds },
        ...filtroBase
      });

      // Reordenar según el orden de clics/selección
      const orden = new Map(selectedIds.map((id, i) => [String(id), i]));
      productos.sort(
        (a, b) =>
          (orden.get(String(a._id)) ?? 1e9) -
          (orden.get(String(b._id)) ?? 1e9)
      );
    } else {
      // Fallback: promocion:true, uso de orden clásico
      productos = await Producto.find(filtroBase)
        .sort({ promoOrder: 1, categoria: 1, nombre: 1 });
    }

    // ======= AGRUPAR POR CATEGORÍA (preservando el orden ya calculado) =======
    const productosPorCategoria = {};
    for (const p of productos) {
      const categoria = p.categoria || 'Sin categoría';
      if (!productosPorCategoria[categoria]) {
        productosPorCategoria[categoria] = [];
      }
      productosPorCategoria[categoria].push(p); // ya vienen en orden global
    }

    const ordenCategorias = ['Carnes', 'Frutas y Verduras', 'Abarrotes', 'Panaderia', 'Taqueria'];

          // ======= Ordenar por categoría (sin tocar el diseño) =======
      const todasCats = Object.keys(productosPorCategoria);
      // primero las conocidas si existen, luego el resto en el orden en que aparecieron
      const primeras = ordenCategorias.filter(c => productosPorCategoria[c]?.length);
      const resto = todasCats.filter(c => !ordenCategorias.includes(c));
      const listaCats = [...primeras, ...resto];

      // aplanar manteniendo el orden interno de cada categoría (según selección)
      let productosOrdenados = [];
      for (const cat of listaCats) {
        productosOrdenados = productosOrdenados.concat(productosPorCategoria[cat]);
      }
      productos = productosOrdenados;
    // ======= Traducción y persistencia del nombre en inglés =======
    for (const p of productos) {
      const traduccion = p.nombreInglesManual || await traducciones(p.nombre);
      p.nombreIngles = traduccion || p.nombre;
      await p.save();
    }

    // ======= HTML base / Reemplazos =======
    const festivoFile = req.query.festivo || '';
    const imgFestivo  = festivoFile ? getBase64FromUploads(['Dias'], festivoFile) : '';

    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('{{LOGO_CENTRO}}', logoCentro)
      .replace('{{LOGOIZQ}}', logoIzq)
      .replace('{{FECHA_VALIDEZ}}', fechaValidez)
      .replace('{{FECHA_VALIDEZ_EN}}', fechaValidezEn)
      .replace('{{DIRECCION}}', suc.direccion)
      .replace('{{TELEFONO}}', suc.telefono)
      .replace('{{MAPA_TIENDA}}', mapaTienda)
      .replace('<body>', `<body style="background: ${fondo}; background-size: cover; background-repeat: no-repeat;">`);

    // ======= Producto destacado (o festivo) =======
    const destacado = productos[0];
    let base64ImgDestacado = '';
    if (destacado?.imagen && !imgFestivo) {
      try {
        const imagenPath = destacado.imagen.startsWith('http')
          ? destacado.imagen
          : path.join(__dirname, '..', destacado.imagen);
        base64ImgDestacado = await obtenerBase64Imagen(imagenPath);
      } catch (err) {
        console.error('Error leyendo imagen destacada:', err.message);
      }
    }

    let productoDestacadoHTML = '';
    if (imgFestivo) {
      productoDestacadoHTML = `
        <div class="producto-destacado">
          <div class="producto-card festivo">
            <img class="producto-img" src="${imgFestivo}" />
          </div>
        </div>`;
    } else if (destacado) {
      productoDestacadoHTML = `
        <div class="producto-destacado">
          <div class="producto-card">
            <img class="producto-img" src="${base64ImgDestacado}" />
            <div class="producto-info">
              <div class="producto-nombres">
                <div class="nombre-es">${destacado.nombre.toUpperCase()}</div>
                <div class="nombre-en">${destacado.nombreIngles.toUpperCase()}</div>
              </div>
              <div class="producto-precio-vertical">
                <div class="precio-monto">$${destacado.precio}</div>
                <div class="precio-unidad">${destacado.unidad}</div>
              </div>
            </div>
          </div>
        </div>`;
    }
    html = html.replace('{{PRODUCTO_DESTACADO}}', productoDestacadoHTML);

    // ======= Render SIN LÍMITE: 4 por fila hasta agotar =======
    const productosRestantes = productos.slice(1);
    let htmlTodos = '';
    const perRow = 3;

    for (let i = 0; i < productosRestantes.length; i += perRow) {
      const fila = productosRestantes.slice(i, i + perRow);

      htmlTodos += `<div class=" fila-cuatro-productos">`;

      for (const p of fila) {
        let base64Img = '';
        try {
          const imagenPath = p.imagen?.startsWith('http')
            ? p.imagen
            : path.join(__dirname, '..', p.imagen);
          base64Img = await obtenerBase64Imagen(imagenPath);
        } catch (err) {
          console.error('Error con imagen producto:', err.message);
        }

        htmlTodos += `
          <div class="producto-card">
              <div class="producto-precio-vertical">
                <span class="precio-monto">$${p.precio}</span>
                <span class="precio-unidad">${p.unidad}</span>
              </div>

            <img class="producto-img" src="${base64Img}" />

            <div class="producto-info">
              <div class="producto-nombres">
                <span class="nombre-es">${p.nombre.toUpperCase()}</span>
                <span class="nombre-en">${p.nombreIngles.toUpperCase()}</span>
              </div>
            </div>
          </div>`;
              }

      htmlTodos += `</div>`;
    }

    html = html.replace('<!-- AQUI_PRODUCTOS -->', htmlTodos);

    // ======= Métodos de pago =======
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

    // ======= Puppeteer =======
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
      await page.pdf({ path: outputPath, format: 'letter', printBackground: true });

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
