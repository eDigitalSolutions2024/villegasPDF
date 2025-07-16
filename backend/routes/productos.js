// backend/routes/productos.js

const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const multer = require('multer');
const path = require('path');

// Configurar almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Carpeta donde se guarda la imagen
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Ruta para crear un producto
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    const { nombre, precio, unidad, categoria } = req.body;
    const imagen = req.file ? req.file.path : null;

    const nuevoProducto = new Producto({
      nombre,
      precio,
      unidad,
      categoria,
      imagen
    });

    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar el producto' });
  }
});

// Ruta para obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});

// Ruta para obtener productos en promoción
router.get('/promociones', async (req, res) => {
  try {
    const productosPromocion = await Producto.find({ promocion: true });
    res.json(productosPromocion);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos en promoción' });
  }
});


// Ruta para cambiar el estado de promoción de un producto
router.put('/:id/promocion', async (req, res) => {
  try {
    const { promocion } = req.body;
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { promocion },
      { new: true }
    );
    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar promoción' });
  }
});



module.exports = router;