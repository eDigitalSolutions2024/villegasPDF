const express = require('express');
const router = express.Router();
const HistorialPDF = require('../models/HistorialPDF');

router.post('/guardar-historial', async (req, res) => {
  const { nombreArchivo, generadoPor, url } = req.body;

  try {
    const nuevoRegistro = new HistorialPDF({ nombreArchivo, generadoPor, url });
    await nuevoRegistro.save();
    res.json({ mensaje: 'Historial guardado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar historial' });
  }
});

router.get('/historial', async (req, res) => {
  try {
    const historial = await HistorialPDF.find().sort({ fecha: -1 });
    res.json(historial);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

router.get('/', async (req, res) => {
  const historial = await HistorialPDF.find().sort({ fecha: -1 });
  res.json(historial);
});
module.exports = router;
