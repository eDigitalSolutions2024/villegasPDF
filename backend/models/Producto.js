// backend/models/Producto.js

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  nombreIngles: { type: String, default: '' }, // Nombre del producto en inglés
  precio: { type: String, required: true },
  unidad: { type: String, default: null }, // Unidad de medida del producto
  categoria: { type: String, required: true }, // Categoría del producto en inglés
  imagen: { type: String }, // Ruta de la imagen guardada
  promocion: { type: Boolean, default: false },// Indica si es un producto en promoción
  nombreInglesManual: { type: String, default: ''},
  promoOrder: { type: Number, default: null },
});

module.exports = mongoose.model('Producto', productoSchema);

 
