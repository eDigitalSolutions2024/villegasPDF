// backend/models/Producto.js

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  nombreIngles: { type: String, default: '' }, // Nombre del producto en inglés
  precio: { type: Number, required: true },
  unidad: { type: String, required: true },
  categoria: { type: String, required: true }, // Categoría del producto en inglés
  imagen: { type: String }, // Ruta de la imagen guardada
  promocion: { type: Boolean, default: false } // Indica si es un producto en promoción
});

module.exports = mongoose.model('Producto', productoSchema);

 
