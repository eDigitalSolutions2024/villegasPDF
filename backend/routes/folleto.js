const express = require('express');
const router = express.Router();
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

router.post('/generar-folleto', async (req, res) => {
  const { fechaValidez } = req.body;

  // Ruta al archivo HTML base
  const htmlPath = path.join(__dirname, '..', 'template', 'folleto.html');
  const templateHtml = fs.readFileSync(htmlPath, 'utf8');

  // Inserta la fecha en el marcador del HTML
  const htmlConFecha = templateHtml.replace('{{FECHA_VALIDEZ}}', fechaValidez || '');

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlConFecha, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).send('Error generando el folleto');
  }
  
});

router.get('/ver-folleto1', async (req, res) => {
  try {
    const generarHTMLPdf = require('../pdf/generarHTMLPdf');
    generarHTMLPdf(req, res, {guardar: false}); // esta función ya genera y responde el PDF
  } catch (err) {
    console.error(err);
    res.status(500).send('Error  vista previa del PDF');
  }
});

router.post('/guardar-pdf1', async (req, res) => {
  try {
    const generarHTMLPdf = require('../pdf/generarHTMLPdf');
    await generarHTMLPdf(req, res, { guardar: true, generarJPG: true });
 // renderiza y guarda
  } catch (err) {
    console.error(err);
    res.status(500).send('Error guardando PDF');
  }
});

//plantilla 2

router.get('/ver-folleto2', async (req, res) => {
  try {
    const generarHTMLPdf2 = require('../pdf/generarHTMLPdf2');
    generarHTMLPdf2(req, res, {guardar: false}); // esta función ya genera y responde el PDF
  } catch (err) {
    console.error(err);
    res.status(500).send('Error  vista previa del PDF');
  }
});

router.post('/guardar-pdf2', async (req, res) => {
  try {
    const generarHTMLPdf2 = require('../pdf/generarHTMLPdf2');
   await generarHTMLPdf2(req, res, { guardar: true, generarJPG: true });
  // renderiza y guarda
  } catch (err) {
    console.error(err);
    res.status(500).send('Error guardando PDF');
  }
});



// GET /api/metodos-pago
router.get('/metodos-pago', (req, res) => {
  const carpeta = path.join(__dirname, '..', 'uploads', 'metodos');

  fs.readdir(carpeta, (err, archivos) => {
    if (err) {
      console.error('Error leyendo la carpeta de métodos de pago:', err);
      return res.status(500).json({ mensaje: 'Error al leer la carpeta de métodos de pago' });
    }

    // Solo incluir imágenes válidas
    const imagenes = archivos.filter(nombre =>
      nombre.match(/\.(png|jpg|jpeg|webp)$/i)
    );

    res.json(imagenes);
  });
});





module.exports = router;
