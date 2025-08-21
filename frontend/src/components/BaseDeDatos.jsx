import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const TIPOS = [
  { key: 'logoCentro',   label: 'Logos centro' },
  { key: 'logoLateral',  label: 'Logos laterales' },
  { key: 'diasFestivos', label: 'Días Festivos' }, // <- clave correcta
];

export default function BaseDeDatos() {
  const [type, setType]   = useState(TIPOS[0].key);
  const [files, setFiles] = useState([]);
  const [file, setFile]   = useState(null);

  async function load(t = type) {
    try {
      const { data } = await axios.get(`${API}/api/assets`, { params: { type: t } });
      setFiles(data.files || []);
    } catch (e) {
      console.error(e);
      alert('Error al listar. Revisa que el backend esté en 4000 y /api/assets montado.');
    }
  }

  useEffect(() => { load(type); }, [type]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      await axios.post(`${API}/api/assets/upload`, form, {
        params: { type }, // más claro aquí
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFile(null);
      await load();
    } catch (e) {
      console.error(e);
      alert('Error al subir archivo');
    }
  }

  async function handleDelete(filename) {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await axios.delete(`${API}/api/assets`, { params: { type, filename } }); // <- DELETE correcto
      await load();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar archivo');
    }
  }

  return (
    <div className="container py-3">
      <h3>Base de datos de imágenes</h3>

      <div className="btn-group my-3" role="group">
        {TIPOS.map(t => (
          <button
            key={t.key}
            className={`btn btn-sm ${type === t.key ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form className="mb-3" onSubmit={handleUpload}>
        <div className="input-group">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="form-control"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button className="btn btn-success" disabled={!file}>Subir</button>
        </div>
        <small className="text-muted">Formatos: PNG, JPG, WEBP, GIF. Máx 5MB.</small>
      </form>

      <div className="row">
        {files.map(f => (
          <div key={f.filename} className="col-6 col-md-3 mb-3">
            <div className="card">
              {f.url ? (
                <img
                  src={`${API}${f.url}`} // /uploads/... servido por backend
                  className="card-img-top"
                  alt={f.filename}
                />
              ) : (
                <div
                  className="card-img-top d-flex align-items-center justify-content-center"
                  style={{ height: 120, background: '#f5f5f5' }}
                >
                  <small className="text-muted">Sin vista previa</small>
                </div>
              )}
              <div className="card-body p-2">
                <div className="small text-truncate">{f.filename}</div>
                <button
                  className="btn btn-sm btn-outline-danger mt-2"
                  onClick={() => handleDelete(f.filename)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {files.length === 0 && <div className="text-muted">No hay archivos en esta categoría.</div>}
      </div>
    </div>
  );
}
