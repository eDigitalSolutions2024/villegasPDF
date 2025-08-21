// backend/routes/productos.js

const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const multer = require('multer');
const path = require('path');
const vision = require('@google-cloud/vision');
const fs = require('fs');
require('dotenv').config();
const sharp = require('sharp');
const Replicate = require("replicate");

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
const axios = require('axios');



// Cliente de Google Vision
const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, '../config/vision-key.json')
});

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
    const { nombre, precio, unidad, categoria, imagenBase64 } = req.body;
    let imagenFinal = '';

    // ✅ Caso: imagen URL directa (por ejemplo desde Replicate)
    if (imagenBase64 && imagenBase64.startsWith('http')) {
       // ✅ Extrae solo la parte relativa: uploads/nombre.png
        try {
          const url = new URL(imagenBase64);
          imagenFinal = url.pathname.replace(/^\/+/, ''); // elimina el primer "/"
        } catch (err) {
          console.error("URL inválida:", imagenBase64);
          return res.status(400).json({ mensaje: "URL de imagen inválida" });
        }

    // ✅ Caso: imagen en base64 (desde Unsplash, webcam, etc.)
    } else if (imagenBase64 && imagenBase64.startsWith('data:image/')) {
      const extension = imagenBase64.substring(
        imagenBase64.indexOf('/') + 1,
        imagenBase64.indexOf(';')
      );
      const nombreArchivo = `img_${Date.now()}.${extension}`;
      const ruta = path.join(__dirname, '../uploads', nombreArchivo);

      try {
        const base64Data = imagenBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(ruta, buffer);
        imagenFinal = `uploads/${nombreArchivo}`;
      } catch (error) {
        console.error("❌ Error al guardar imagen base64:", error.message);
        return res.status(400).json({ mensaje: "Imagen base64 inválida" });
      }

    // ✅ Caso: imagen ya procesada (con fondo eliminado y guardada en uploads/)
    } else if (imagenBase64 && imagenBase64.startsWith('uploads/')) {
      imagenFinal = imagenBase64;

    // ✅ Caso: imagen tradicional subida con <input type="file" />
    } else if (req.file) {
      imagenFinal = req.file.path.replace(/\\/g, '/').replace(/^\/+/, '');
    }

    // Crear el nuevo producto
    const nuevoProducto = new Producto({
      nombre,
      precio,
      unidad,
      categoria,
      imagen: imagenFinal,
    });

    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error('❌ Error al guardar producto:', error.message);
    res.status(500).json({ mensaje: 'Error al guardar el producto' });
  }
});




// Ruta para obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find().sort({
      categoria: 1,     // agrupa por categoría
      promocion: -1,    // primero los que están en promoción
      promoOrder: 1,    // dentro de promoción, por orden
      nombre: 1,        // fallback estable
    });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});

// Ruta para obtener productos en promoción
router.get('/promociones', async (req, res) => {
  try {
    const productosPromocion = await Producto
      .find({ promocion: true })
      .sort({ categoria: 1, promoOrder: 1 });
    res.json(productosPromocion);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos en promoción' });
  }
});


// Ruta para cambiar el estado de promoción de un producto
router.put('/:id/promocion', async (req, res) => {
  try {
    const { promocion } = req.body;
    const prod = await Producto.findById(req.params.id);
    if (!prod) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    if (promocion) {
      // Activar promo: asignar next order dentro de la categoría
      const maxEnCategoria = await Producto
        .find({ categoria: prod.categoria, promocion: true })
        .sort({ promoOrder: -1 })
        .limit(1)
        .lean();

      const nextOrder = maxEnCategoria.length
        ? ((maxEnCategoria[0].promoOrder || 0) + 1)
        : 1;

      prod.promocion = true;
      prod.promoOrder = nextOrder;
      await prod.save();

    } else {
      // Desactivar promo: compactar órdenes posteriores
      const oldOrder = prod.promoOrder;
      const cat = prod.categoria;

      prod.promocion = false;
      prod.promoOrder = null;
      await prod.save();

      if (oldOrder != null) {
        await Producto.updateMany(
          { categoria: cat, promocion: true, promoOrder: { $gt: oldOrder } },
          { $inc: { promoOrder: -1 } }
        );
      }
    }

    const actualizado = await Producto.findById(prod._id).lean();
    return res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar promoción' });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Producto.findByIdAndDelete(id);

    if (!eliminado) {
      console.log("⚠️ Producto no encontrado en la base de datos:", id);
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    console.log("✅ Producto eliminado:", eliminado);
    res.status(200).json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    res.status(500).json({ mensaje: "Error al eliminar el producto" });
  }
});

router.put('/:id', upload.single('imagen'), async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'No encontrado' });

    // Extrae lo que venga (soporta JSON o multipart)
    const {
      nombre,
      precio,
      unidad,
      categoria,
      nombreInglesManual,
      imagenBase64, // puede ser URL servida por tu backend
    } = req.body || {};

    // Actualiza solo si viene el campo (evita leer undefined.nombre)
    if (typeof nombre !== 'undefined') producto.nombre = nombre;
    if (typeof precio !== 'undefined') producto.precio = precio;
    if (typeof unidad !== 'undefined') producto.unidad = unidad;
    if (typeof categoria !== 'undefined') producto.categoria = categoria;
    if (typeof nombreInglesManual !== 'undefined') {
      producto.nombreInglesManual = nombreInglesManual || '';
    }

    // Imagen: archivo local (req.file) o URL (imagenBase64)
    if (req.file) {
      // guardas la ruta relativa que usas en el front
      producto.imagen = path.join('uploads', req.file.filename);
    } else if (imagenBase64) {
      // si te llega una URL completa de tu servidor, guarda ruta relativa
      producto.imagen = imagenBase64.replace(/^https?:\/\/[^/]+\//, '');
    }
    // si no viene ni archivo ni imagenBase64, se conserva la imagen actual

    await producto.save();
    res.json({ mensaje: 'Actualizado correctamente', producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});


// Ruta para verificar imagen con Google Vision
router.post('/verificar-imagen', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ mensaje: 'No se subió ninguna imagen' });
    }

    const imagePath = req.file.path;

    const [result] = await client.webDetection(imagePath);
    const webDetection = result.webDetection;

    // Eliminar imagen temporal
    fs.unlinkSync(imagePath);

    // Extraer y retornar todos los campos útiles
    res.json({
      fullMatchingImages: webDetection.fullMatchingImages || [],
      partialMatchingImages: webDetection.partialMatchingImages || [],
      visuallySimilarImages: webDetection.visuallySimilarImages || [],
      pagesWithMatchingImages: webDetection.pagesWithMatchingImages || [],
      webEntities: webDetection.webEntities || [],
    });
  } catch (error) {
    console.error('❌ Error al verificar imagen:', error.message);
    res.status(500).json({ mensaje: 'Error al analizar la imagen' });
  }
});


router.post('/buscar-imagenes', async (req, res) => {
  const { query } = req.body;
  try {
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: {
        query,
        per_page: 10,
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });
    const imagenes = response.data.results.map(img => ({
      url: img.urls.small,
      alt: img.alt_description
    }));
    res.json(imagenes);
  } catch (error) {
    console.error('Error buscando en Unsplash:', error.message);
    res.status(500).json({ mensaje: 'Error al buscar imágenes' });
  }
});


// Ruta para imagen local


router.post('/eliminar-fondo-local', upload.single("imagen"), async (req, res) => {
  try {
    const inputPath = path.resolve(__dirname, '..', req.file.path);
    const outputPath = path.resolve(__dirname, '..', 'uploads', `rgb_${req.file.filename}.png`);

    // ✅ Convertir imagen a PNG con transparencia
    await sharp(inputPath)
      .resize({ width: 1024 })         // opcional: puedes ajustar el tamaño si gustas
      .toFormat('png')                 // ✅ mantener transparencia
      .toFile(outputPath);

    // ✅ Codificar como base64
    const base64Image = fs.readFileSync(outputPath, { encoding: 'base64' });
    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    // ✅ Iniciar predicción en Replicate
    let prediction = await replicate.predictions.create({
      version: "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1", // modelo lucataco/remove-bg
      input: { image: imageDataUrl },
    });

    // ⏳ Esperar hasta que finalice
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      prediction = await replicate.predictions.get(prediction.id);
    }

    // 🧹 Limpiar archivos temporales
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // ✅ Devolver la imagen procesada
    if (prediction.status === "succeeded") {
      const imageUrl = prediction.output;
      const nombreArchivo = `resultado_${Date.now()}.png`;
      const rutaFinal = path.join(__dirname, '..', 'uploads', nombreArchivo);

      // Descargar imagen desde URL de Replicate
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(rutaFinal, response.data);

      console.log("✅ Imagen descargada y guardada en:", rutaFinal);

      res.json({
        nuevaImagen: `/uploads/${nombreArchivo}`, // <-- ruta relativa para mostrarla en el frontend
        urlOriginalReplicate: imageUrl             // opcional
      });
    } else {
      console.error("❌ Error de predicción:", prediction.error);
      res.status(500).json({ error: "La predicción falló en Replicate." });
    }

  } catch (error) {
    console.error("❌ Error con imagen local:", error.message);
    res.status(500).json({ error: "Error al eliminar fondo con imagen local." });
  }
});


router.post('/eliminar-fondo-url', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Falta la URL de la imagen." });
    }

    // Llamar al modelo de Replicate
    let prediction = await replicate.predictions.create({
      version: "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      input: { image: imageUrl },
    });

    // Esperar a que termine
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      prediction = await replicate.predictions.get(prediction.id);
    }

    if (prediction.status === "succeeded") {
      // Descargar imagen procesada
      const imageFinalUrl = prediction.output;
      const nombreArchivo = `resultado_${Date.now()}.png`;
      const rutaFinal = path.join(__dirname, '..', 'uploads', nombreArchivo);

      const response = await axios.get(imageFinalUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(rutaFinal, response.data);

      return res.json({
        nuevaImagen: `uploads/${nombreArchivo}`,
      });
    } else {
      return res.status(500).json({ error: "Fallo en Replicate." });
    }
  } catch (error) {
    console.error("❌ Error eliminando fondo de URL:", error.message);
    return res.status(500).json({ error: "Error al eliminar el fondo desde URL" });
  }
});



module.exports = router;

