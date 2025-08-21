// routes/assets.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const router = express.Router();

// --- Tipos permitidos y carpetas físicas ---
const TYPE_DIR = {
  logoCentro:  ['uploads', 'logos', 'centro'],
  logoLateral: ['uploads', 'logos', 'laterales'],
  diasFestivos:['uploads', 'Dias'],       // OJO: "Dias" con D mayúscula
};

function resolveDir(type) {
  const parts = TYPE_DIR[type];
  return parts ? path.join(__dirname, '..', ...parts) : null;
}

// ---------- LISTAR ----------
router.get('/', (req, res) => {
  const { type } = req.query;
  const dir = resolveDir(type);
  if (!dir) return res.status(400).json({ error: 'Tipo inválido' });

  fs.mkdirSync(dir, { recursive: true });

  const files = fs.readdirSync(dir)
    .filter(name => fs.statSync(path.join(dir, name)).isFile())
    .map(filename => {
      const enc = encodeURIComponent(filename); // evita problemas con espacios
      if (type === 'logoCentro')   return { filename, url: `/uploads/logos/centro/${enc}` };
      if (type === 'logoLateral')  return { filename, url: `/uploads/logos/laterales/${enc}` };
      if (type === 'diasFestivos') return { filename, url: `/uploads/Dias/${enc}` };
      return { filename, url: `/uploads/${enc}` }; // fallback neutro (no se usa)
    });

  return res.json({ files });
});

// ---------- SUBIR ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = resolveDir(req.query.type);
    if (!dir) return cb(new Error('Tipo inválido'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe =
      (Date.now() + '-' + file.originalname)
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, safe);
  }
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res) => {
  const { type } = req.query;
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });

  const enc = encodeURIComponent(req.file.filename);
  let url = `/uploads/${enc}`;
  if (type === 'logoCentro')   url = `/uploads/logos/centro/${enc}`;
  if (type === 'logoLateral')  url = `/uploads/logos/laterales/${enc}`;
  if (type === 'diasFestivos') url = `/uploads/Dias/${enc}`;

  return res.json({ ok: true, file: { filename: req.file.filename, url } });
});

// ---------- ELIMINAR ----------
router.delete('/', (req, res) => {
  const { type, filename } = req.query;
  const dir = resolveDir(type);
  if (!dir) return res.status(400).json({ error: 'Tipo inválido' });
  if (!filename) return res.status(400).json({ error: 'filename requerido' });

  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No existe' });

  fs.unlinkSync(filePath);
  return res.json({ ok: true });
});

module.exports = router;
