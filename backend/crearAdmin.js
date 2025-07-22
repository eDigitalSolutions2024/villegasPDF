require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('./models/Usuario'); // Asegúrate que esté bien el path

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('🟢 Conectado a MongoDB Atlas');

  const passwordEncriptada = await bcrypt.hash('1234', 10);

  const nuevoUsuario = new Usuario({
    username: 'admin',
    password: passwordEncriptada,
  });

  await nuevoUsuario.save();
  console.log('✅ Usuario administrador creado');

  mongoose.disconnect();
})
.catch(err => {
  console.error('❌ Error:', err);
});
