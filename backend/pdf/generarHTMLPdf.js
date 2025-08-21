// backend/pdf/generarHTMLPdf.js
const puppeteer = require('puppeteer'); 
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Producto = require('../models/Producto');
const HistorialPDF = require('../models/HistorialPDF');
const jwt = require('jsonwebtoken');
const metodosPath = path.join(__dirname, '..', 'uploads', 'metodos');
const traducciones = require('../traductor.js'); // (se mantiene para compat)
const archiver = require('archiver');

const cssPath = path.join(__dirname, '..', 'templates', 'folleto.css');
const css = fs.readFileSync(cssPath, 'utf8');

// reemplaza tu getBase64Logo por una versión con subdir
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
// helpers específicos
const getBase64LogoCentro  = (name) => getBase64FromUploads(['logos','centro'], name);
const getBase64LogoLateral = (name) => getBase64FromUploads(['logos','laterales'], name);

function getBase64Mapa(mapaNombre) {
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

const traducirTexto = require('../traductor');
const htmlPath = path.join(__dirname, '..', 'templates', 'folleto.html');

// --- Helper para crear ZIP con los JPG generados (fuera de la función) ---
function crearZipConArchivos(destZipPath, files) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    files.forEach(fp => archive.file(fp, { name: path.basename(fp) }));
    archive.finalize();
  });
}

async function generarHTMLPdf(req, res, opciones = {}) {
  let browser;
  try {
    // ======= FECHAS / FONDO / SUCURSALES =======
    const fechaValidez = req.query.fechaValidez || 'del 1 al 7 de Julio de 2025';

    function traducirFecha(fechaEs) {
      const meses = {
        enero: 'January', febrero: 'February', marzo: 'March', abril: 'April',
        mayo: 'May', junio: 'June', julio: 'July', agosto: 'August',
        septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December'
      };

      const match = fechaEs.match(/del\s+(\d+)\s+al\s+(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
      if (!match) return 'From ? to ?';

      const [, diaInicio, diaFin, mesEs, anio] = match;
      const mesEn = meses[mesEs.toLowerCase()] || mesEs;

      return `From ${mesEn} ${diaInicio} to ${diaFin}, ${anio}`;
    }

    const fechaValidezEn = traducirFecha(fechaValidez);
    const fondo = req.query.fondo || '#ffffff'; // Puede ser color o URL de imagen

    const SUCURSALES = {
      'juanita.png': {
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

    const logoCentroNombre = req.query.logoCentro || 'juanita.jpeg';
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

    // ======= OBTENCIÓN DE PRODUCTOS (y reordenamiento si aplica) =======
    const filtroBase = { promocion: true };
    let productos;

    if (selectedIds.length > 0) {
      productos = await Producto.find({
        _id: { $in: selectedIds },
        ...filtroBase
      });
      const orden = new Map(selectedIds.map((id, i) => [String(id), i]));
      productos.sort(
        (a, b) =>
          (orden.get(String(a._id)) ?? 1e9) - (orden.get(String(b._id)) ?? 1e9)
      );
    } else {
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
      productosPorCategoria[categoria].push(p);
    }

    const ordenCategorias = ['Carnes', 'Frutas y Verduras', 'Abarrotes', 'Panaderia', 'Taqueria'];

    // ======= TRADUCCIÓN Y GUARDADO DE NOMBRE INGLÉS =======
    for (const p of productos) {
      const traduccion = p.nombreInglesManual || await traducirTexto(p.nombre);
      p.nombreIngles = traduccion || p.nombre;
      await p.save();
    }

    // ======= CARGAR HTML BASE Y REEMPLAZOS =======
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

    // ======= CAPACIDAD Y PAGINACIÓN POR CATEGORÍA =======
    const CAP_POR_HOJA = Number(req.query.cap || process.env.CAT_ITEMS_PER_PAGE || 14);
    function paginarCategoria(items, cap) {
      const pages = [];
      for (let i = 0; i < items.length; i += cap) {
        pages.push(items.slice(i, i + cap));
      }
      return pages;
    }

    // ======= RENDER DE PRODUCTOS (respeta orden y diseño) =======
    let htmlProductos = '';
    for (const categoria of ordenCategorias) {
      const productosCategoria = productosPorCategoria[categoria];
      if (!productosCategoria || productosCategoria.length === 0) continue;

      const categoriaIngles = (await traducirTexto(categoria)) || " ";
      const paginas = paginarCategoria(productosCategoria, CAP_POR_HOJA);

      // Control para mostrar banner solo 1 vez por categoría "Carnes"
      const categoriaLower = categoria.toLowerCase();
      let pusoBannerCarnes = false;

      paginas.forEach((productosPagina, idx) => {
        const total = paginas.length;
        const etiqueta = total > 1 ? ` ${idx + 1}/${total}` : '';

        htmlProductos += `
          <div class="categoria-bloque cat-page" data-cat="${categoria}">
            <div class="categoria-nombre">
              <div class="categoria-texto">
                <span class="es">${(categoria + etiqueta).toUpperCase()}</span>
                <span class="en">  ${categoriaIngles.toUpperCase()}</span>
              </div>
            </div>
        `;

        // Primera fila: 2 productos grandes (o menos si no alcanzan)
        htmlProductos += `<div class="fila-dos-productos">`;
        for (let i = 0; i < productosPagina.length && i < 2; i++) {
          const p = productosPagina[i];
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
                <div class="producto-precio-vertical">
                  <span class="precio-monto">${p.precio}<span class="precio-unidad">${p.unidad}</span></span>
                </div>
                <div class="producto-nombres">
                  <span class="nombre-es">${p.nombre.toUpperCase()}</span>
                  <span class="nombre-en">${p.nombreIngles.toUpperCase()}</span>
                </div>
              </div>
            </div>`;
        }
        htmlProductos += `</div>`; // fin fila 2

        // Resto: 3 por fila
        if (productosPagina.length > 2) {
          // contador de filas de 3 en esta página
          let filas3EnEstaPagina = 0;

          for (let i = 2; i < productosPagina.length; i += 3) {
            htmlProductos += `<div class="fila-cuatro-productos">`;
            for (let j = i; j < i + 3 && j < productosPagina.length; j++) {
              const p = productosPagina[j];
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
                  <div class="producto-precio-vertical">
                    <span class="precio-monto">${p.precio}</span> 
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
            htmlProductos += `</div>`; // cerrar fila de 4 productos (3 items)

            // contamos la fila de 3 ya renderizada
            filas3EnEstaPagina++;

            // ---- Banner solo para CARNES, después de la TERCERA fila total ----
            // Fila 1 = 2 grandes, Fila 2 = 1ª de 3, Fila 3 = 2ª de 3
            // => Banner tras la 2ª fila de 3 (filas3EnEstaPagina === 2)
            // Solo en PRIMERA página (idx === 0) y una vez por categoría
            if (
              categoriaLower === 'carnes' &&
              !pusoBannerCarnes &&
              idx === 0 &&
              filas3EnEstaPagina === 2
            ) {
              htmlProductos += `
              <div style="
                width: 100%;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 800;
                font-size: 30px;
                margin: 30px 0 30px 0;
                letter-spacing: 0.3px;
                color: red;
                padding: 0 10px;
                box-sizing: border-box;
              ">
                <span>¡LA MEJOR CALIDAD DE CARNES!</span>
                <img src="${getBase64FromUploads(['logos', 'laterales'], 'harris.jpeg')}" 
                    style="width: 25%; height: 80px; object-fit: contain; margin: 30px 0 30px 0;" />
              </div>
              `;
              
                pusoBannerCarnes = true;
            }
          }
        }

        htmlProductos += `</div>`; // fin categoria-bloque (una hoja)
      }); // fin paginas.forEach
    }

    html = html.replace('<!-- AQUI_PRODUCTOS -->', htmlProductos);

    // ======= MÉTODOS DE PAGO =======
    let metodosHTML = '';
    try {
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
    } catch (err) {
      console.error('Error leyendo métodos de pago:', err.message);
    }
    html = html.replace('{{METODOS_PAGO}}', metodosHTML);

    // ======= PUPPETEER: PDF/JPG y RESPUESTA =======
    const NAV_TIMEOUT = Number(process.env.PDF_NAV_TIMEOUT_MS || 180000);
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: NAV_TIMEOUT

    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT); //cambio1
    page.setDefaultTimeout(NAV_TIMEOUT); //cambio2
    await page.setContent(html, { waitUntil: 'load', timeout: NAV_TIMEOUT }); //cambio de networkidle0
    
    await page.waitForFunction(
      'Array.from(document.images).every(i => i.complete)',
      { timeout: NAV_TIMEOUT }
    );
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map(i => (i.decode ? i.decode() : Promise.resolve())));
    });
    
    const timestamp = Date.now();

    // Acumuladores para historial
    const imagenesRel = [];   // rutas relativas /jpgs/...
    const imagenesAbs = [];   // rutas absolutas (para crear ZIP)
    let previewRel = null;    // ruta relativa del JPG “completo”
    let zipRel = null;        // ruta relativa del ZIP (opcional)

    // ---- JPG por hoja/categoría + preview ----
    if (opciones.generarJPG) {
      const outDir = path.join(__dirname, '..', 'public', 'jpgs');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      await page.evaluateHandle('document.fonts.ready');
      await page.waitForSelector('.cat-page');

      // Preview “completo” para la miniatura del historial
      if (!previewRel) {
        const previewAbs = path.join(outDir, `preview-${timestamp}.jpg`);
        await page.screenshot({ path: previewAbs, type: 'jpeg', quality: 80, fullPage: true });
        previewRel = `/jpgs/${path.basename(previewAbs)}`;
      }

         // JPG por hoja/categoría
      const sections = await page.$$('.cat-page');
      for (const sec of sections) {
        const catName = await page.evaluate(el => el.dataset.cat || 'categoria', sec);

        // ---- SOLO para "Carnes": insertar logo principal temporalmente arriba
        let insertoLogo = false;
        if (catName && catName.toLowerCase() === 'carnes' && logoCentro) {
          await page.evaluate((el, logoSrc) => {
            const holder = document.createElement('div');
            holder.className = 'temp-header-carnes';
            holder.style.display = 'flex';
            holder.style.justifyContent = 'center';
            holder.style.margin = '0 0 10px 0';
            holder.style.alignItems = 'center';

            const img = document.createElement('img');
            img.src = logoSrc;
            img.alt = 'Logo';
            img.style.maxHeight = '200px';
            img.style.width = '550px';
            img.style.objectFit = 'contain';

            holder.appendChild(img);
            el.insertBefore(holder, el.firstChild);
          }, sec, logoCentro);
          insertoLogo = true;
        }

        const slug = (catName || 'categoria')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const jpgAbs = path.join(outDir, `${slug}-${timestamp}.jpg`);

        await sec.screenshot({ path: jpgAbs, type: 'jpeg', quality: 90 });

        imagenesAbs.push(jpgAbs);
        imagenesRel.push(`/jpgs/${path.basename(jpgAbs)}`);

        // ---- quitar logo temporal si se insertó
        if (insertoLogo) {
          await page.evaluate((el) => {
            const temp = el.querySelector('.temp-header-carnes');
            if (temp) temp.remove();
          }, sec);
        }
      }
    }

   // ✅ SOLO PARA PDF: empuja la 3ª fila (fila-cuatro-productos #3) en la 1ª hoja de "Carnes"
        await page.evaluate(() => {
          // Busca las páginas de la categoría "Carnes"
          const carnPages = Array.from(document.querySelectorAll('.cat-page'))
            .filter(p => (p.dataset.cat || '').toLowerCase() === 'carnes');

          if (!carnPages.length) return;

          // Trabajamos en la PRIMERA hoja de Carnes (idx 0)
          const firstCarnesPage = carnPages[0];

          // Dentro de esa hoja, localiza las filas de 3 (.fila-cuatro-productos)
          const filas3 = firstCarnesPage.querySelectorAll('.fila-cuatro-productos');

          // Si existe la TERCERA fila de 3 (índice 2), agrégale margen superior
          if (filas3.length >= 3) {
            const terceraFila = filas3[2];
            terceraFila.style.marginTop = '200px'; // ajusta 10–24px a tu gusto
          }
        });

    if (opciones.guardar) {
      const nombreArchivo = `folleto-${timestamp}.pdf`;
      const outputPath = path.join(__dirname, '..', 'public', 'pdfs', nombreArchivo);
      await page.pdf({
        path: outputPath,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

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

      // Crea ZIP si hay JPGs individuales
      if (imagenesAbs.length) {
        const zipsDir = path.join(__dirname, '..', 'public', 'zips');
        if (!fs.existsSync(zipsDir)) fs.mkdirSync(zipsDir, { recursive: true });
        const zipAbs = path.join(zipsDir, `folleto-${timestamp}.zip`);
        await crearZipConArchivos(zipAbs, imagenesAbs);
        zipRel = `/zips/${path.basename(zipAbs)}`;
      }

      // Asegura un preview aunque no se hubiera generado arriba
      if (!previewRel) {
        const outDir = path.join(__dirname, '..', 'public', 'jpgs');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const previewAbs = path.join(outDir, `preview-${timestamp}.jpg`);
        await page.screenshot({ path: previewAbs, type: 'jpeg', quality: 80, fullPage: true });
        previewRel = `/jpgs/${path.basename(previewAbs)}`;
      }

      await HistorialPDF.create({
        nombreArchivo,
        usuario,
        ruta: `/pdfs/${nombreArchivo}`,   // deja esto si sigues generando PDF
        imagen: previewRel,               // compat con frontend anterior
        preview: previewRel,              // nuevo: vista previa “completa”
        imagenes: imagenesRel,            // nuevo: array de JPGs por hoja/categoría
        zip: zipRel || null,              // nuevo: ZIP con todos los JPGs
        fecha: new Date()
      });

      await browser.close();
      return res.status(200).send({
        mensaje: 'PDF guardado correctamente',
        archivo: nombreArchivo,
      });
    } else {
      const buffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
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
