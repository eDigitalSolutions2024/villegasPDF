const mongoose = require('mongoose');

const HistorialPDFSchema = new mongoose.Schema({
  nombreArchivo: String,
  usuario: String,
  ruta: String,
  imagen: String,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HistorialPDF', HistorialPDFSchema);
