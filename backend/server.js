// backend/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const path = require('path');

// Rutas
const productosRoutes = require('./routes/productos');
const authRoutes = require('./routes/auth');
const folletoRoutes = require('./routes/folleto');
const historialRoutes = require('./routes/pdf');

// Middlewares
app.use(cors());
app.use(express.json());

console.log("📁 Cargando ruta estática: /uploads");
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir imágenes

console.log("📁 Cargando ruta estática: /pdfs");
app.use('/pdfs', express.static(path.join(__dirname, 'public', 'pdfs')));

console.log("📁 Cargando ruta estática: /jpgs");
app.use('/jpgs', express.static(path.join(__dirname, 'public', 'jpgs')));

console.log("📦 Cargando ruta: /api/productos");
app.use('/api/productos', productosRoutes);

console.log("📦 Cargando ruta: /api/auth");
app.use('/api/auth', authRoutes);

console.log("📦 Cargando ruta: /api/folleto");
app.use('/api/folleto', folletoRoutes);

console.log("📦 Cargando ruta: /api/pdf");
app.use('/api/pdf', historialRoutes);

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/folletosDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => console.log('❌ Error conectando a MongoDB:', err));

// Iniciar servidor
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
