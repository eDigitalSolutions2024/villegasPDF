const mongoose = require('mongoose');

const HistorialPDFSchema = new mongoose.Schema({
  nombreArchivo: String,
  usuario: String,
  ruta: String,
  imagen: String,
  fecha: { type: Date, default: Date.now },
  imagenes: [{ type: String }],  // rutas relativas a cada JPG por hoja
preview: { type: String },     // ruta relativa al JPG “completo” para vista previa
zip: { type: String },         // ruta a un ZIP con todos los JPGs
});

module.exports = mongoose.model('HistorialPDF', HistorialPDFSchema);
