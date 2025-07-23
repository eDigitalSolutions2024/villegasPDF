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
app.use(express.json());
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

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const folletoRoutes = require('./routes/folleto');
app.use('/api/folleto', folletoRoutes);

const historialRoutes = require('./routes/pdf');
app.use('/api/pdf', historialRoutes);

app.use('/jpgs', express.static(path.join(__dirname, 'public', 'jpgs')));
