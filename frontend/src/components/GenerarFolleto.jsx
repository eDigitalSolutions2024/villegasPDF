import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../styles/GenerarFolleto.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const GenerarFolleto = () => {
  const [plantilla, setPlantilla] = useState('1');

  // selección
  const [logoCentro, setLogoCentro] = useState('');
  const [logoIzq, setLogoIzq] = useState('');
  const [festivo, setFestivo] = useState(''); // filename o ''

  // opciones
  const [logoCentroOpts, setLogoCentroOpts] = useState([]);
  const [logoLateralOpts, setLogoLateralOpts] = useState([]);
  const [festivoOpts, setFestivoOpts] = useState([]);

  // otros
  const [iframeSrc, setIframeSrc] = useState('');
  const [fechaValidez, setFechaValidez] = useState('del 1 al 7 de Julio de 2025');
  const [fondo, setFondo] = useState('#d3c2a0');
  const [cargando, setCargando] = useState(true);

  // ---- cargar opciones desde backend (solo los 3 tipos válidos) ----
  useEffect(() => {
    let cancel = false;
    async function load() {
      const reqs = [
        axios.get(`${API}/api/assets`, { params: { type: 'logoCentro' } })
          .then(r => ({ ok: true, type: 'logoCentro', data: r.data }))
          .catch(e => ({ ok: false, type: 'logoCentro', error: e })),
        axios.get(`${API}/api/assets`, { params: { type: 'logoLateral' } })
          .then(r => ({ ok: true, type: 'logoLateral', data: r.data }))
          .catch(e => ({ ok: false, type: 'logoLateral', error: e })),
        axios.get(`${API}/api/assets`, { params: { type: 'diasFestivos' } })
          .then(r => ({ ok: true, type: 'diasFestivos', data: r.data }))
          .catch(e => ({ ok: false, type: 'diasFestivos', error: e })),
      ];

      const results = await Promise.all(reqs);
      if (cancel) return;

      const rCentro   = results.find(x => x.type === 'logoCentro');
      const rLateral  = results.find(x => x.type === 'logoLateral');
      const rFestivos = results.find(x => x.type === 'diasFestivos');

      if (rCentro?.ok) {
        const arr = rCentro.data?.files || [];
        setLogoCentroOpts(arr);
        if (!logoCentro && arr.length) setLogoCentro(arr[0].filename);
      }
      if (rLateral?.ok) {
        const arr = rLateral.data?.files || [];
        setLogoLateralOpts(arr);
        if (!logoIzq && arr.length) setLogoIzq(arr[0].filename);
      }
      if (rFestivos?.ok) {
        setFestivoOpts(rFestivos.data?.files || []);
      }

      const fallidos = results.filter(r => !r.ok).map(r => r.type);
      if (fallidos.length) {
        alert(`No pude cargar: ${fallidos.join(', ')}. Verifica backend en 4000 y /api/assets.`);
      }
    }
    load();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- previews (solo renderiza <img> si hay url) ----
  const logoCentroPreview = useMemo(() => {
    const f = logoCentroOpts.find(x => x.filename === logoCentro);
    return f ? `${API}${f.url}` : '';
  }, [logoCentro, logoCentroOpts]);

  const logoIzqPreview = useMemo(() => {
    const f = logoLateralOpts.find(x => x.filename === logoIzq);
    return f ? `${API}${f.url}` : '';
  }, [logoIzq, logoLateralOpts]);

  const festivoPreview = useMemo(() => {
    const f = festivoOpts.find(x => x.filename === festivo);
    return f ? `${API}${f.url}` : '';
  }, [festivo, festivoOpts]);

  // ---- actualizar iframe ----
  useEffect(() => {
    if (!logoCentro) return; // aún no hay datos
    const params = new URLSearchParams({
      logoCentro,
      logoIzq: logoIzq || '',
      fechaValidez,
      fondo,
    });
    if (festivo) params.append('festivo', festivo);

    setIframeSrc(`http://localhost:4000/api/folleto/ver-folleto${plantilla}?${params.toString()}`);
    setCargando(true);
  }, [plantilla, logoCentro, logoIzq, festivo, fechaValidez, fondo]);

  // ---- guardar PDF ----
  const guardarPdf = async () => {
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({
        logoCentro,
        logoIzq: logoIzq || '',
        fechaValidez,
        fondo,
      });
      if (festivo) params.append('festivo', festivo);

      const res = await fetch(`http://localhost:4000/api/folleto/guardar-pdf${plantilla}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ logoCentro, logoIzq, festivo }),
      });

      if (!res.ok) throw new Error('Error al guardar el PDF');
      const data = await res.json();
      alert('PDF guardado correctamente: ' + data.archivo);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el PDF');
    }
  };

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="config-container">
        {/* Plantilla */}
        <div className="config-row">
          <label>Selecciona una plantilla:</label>
          <select value={plantilla} onChange={e => setPlantilla(e.target.value)}>
            <option value="1">Plantilla 1</option>
            <option value="2">Plantilla 2</option>
          </select>
        </div>

        {/* Logos + Festivo */}
        <div className="config-row">
          <div className="logo-select">
            <label>Logo 1:</label><br />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select value={logoCentro} onChange={e => setLogoCentro(e.target.value)}>
                {logoCentroOpts.map(f => (
                  <option key={f.filename} value={f.filename}>{f.filename}</option>
                ))}
              </select>
              {logoCentroPreview ? (
                <img src={logoCentroPreview} alt="logo centro"
                     style={{ width: 56, height: 40, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 6 }} />
              ) : null}
            </div>
          </div>


          <div className="logo-select">
            <label>Día Festivo (opcional):</label><br />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select value={festivo} onChange={e => setFestivo(e.target.value)}>
                <option value="">— ninguno —</option>
                {festivoOpts.map(f => (
                  <option key={f.filename} value={f.filename}>{f.filename}</option>
                ))}
              </select>
              {festivoPreview ? (
                <img src={festivoPreview} alt="festivo"
                     style={{ width: 56, height: 40, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 6 }} />
              ) : null}
            </div>
          </div>
        </div>

        {/* Fecha válida */}
        <div className="config-row">
          <label>Fecha válida:</label>
          <input
            type="text"
            placeholder="Ej: del 1 al 7 de Julio de 2025"
            defaultValue={fechaValidez} // usamos defaultValue para que no sea controlado letra x letra
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFechaValidez(e.target.value);
              }
            }}
          />
        </div>


        {/* Fondo */}
        <div className="config-row">
          <label>Fondo del folleto:</label>
          <select value={fondo} onChange={(e) => setFondo(e.target.value)}>
            <option value="#d3c2a0">Cremita clásico</option>
            <option value="#ffea5eff">Amarillo suave</option>
            <option value="#ffe0aeff">Beige claro</option>
          </select>
        </div>
      </div>

      {/* Vista previa */}
      <div style={{ flex: 1, position: 'relative' }}>
        {cargando && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.8)',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            height: '200px',
          }}>
            <div className="spinner" />
            <p style={{ marginTop: 10 }}>Generando folleto, espera un momento...</p>
          </div>
        )}
        <iframe
          title="Vista previa del Folleto PDF"
          src={iframeSrc || 'about:blank'}
          onLoad={() => setCargando(false)}
          style={{ width: '100%', height: '1000px', border: 'none' }}
        />
      </div>

      {/* Guardar */}
      <div style={{ padding: '1rem', textAlign: 'center', background: '#f5f5f5' }}>
        <button className="btn btn-success" onClick={guardarPdf}>
          Guardar Folleto como PDF
        </button>
      </div>
    </div>
  );
};

export default GenerarFolleto;
