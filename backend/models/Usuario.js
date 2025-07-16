// backend/models/Usuario.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Será encriptada
});

module.exports = mongoose.model('Usuario', UserSchema);
