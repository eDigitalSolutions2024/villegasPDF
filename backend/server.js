// backend/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const path = require('path');
const productosRoutes = require('./routes/productos'); // Lo crearemos pronto

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir imágenes
app.use('/api/productos', productosRoutes);
app.use('/pdfs', express.static(path.join(__dirname, 'public', 'pdfs')));

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/folletosDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => console.log('❌ Error conectando a MongoDB:', err));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// Sirve los archivos generados
app.use('/pdfs', express.static(path.join(__dirname, 'public', 'pdfs')));
app.use('/jpgs', express.static(path.join(__dirname, 'public', 'jpgs')));
app.use('/zips', express.static(path.join(__dirname, 'public', 'zips'))); // <-- NUEVO


const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const folletoRoutes = require('./routes/folleto');
app.use('/api/folleto', folletoRoutes);

const historialRoutes = require('./routes/pdf');
app.use('/api/pdf', historialRoutes);

app.use('/jpgs', express.static(path.join(__dirname, 'public', 'jpgs')));

// Rutas de assets (FS, sin Mongo)
const assetsRoutes = require('./routes/assets');
app.use('/api/assets', assetsRoutes);   // <--- IMPORTANTE
