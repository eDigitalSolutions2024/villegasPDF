import React, { useState, useEffect } from 'react';
import '../styles/GenerarFolleto.css'; // Asegúrate de tener este archivo CSS
const GenerarFolleto = () => {
  const [plantilla, setPlantilla] = useState('1');
  const [logoCentro, setLogoCentro] = useState('juanita.jpeg');
  const [logoIzq, setLogoIzq] = useState('harris.jpeg');
  const [logoDer, setLogoDer] = useState('harris.jpeg');
  const [iframeSrc, setIframeSrc] = useState('');
  const [fechaValidez, setFechaValidez] = useState('del 1 al 7 de Julio de 2025');
  const [metodosPago, setMetodosPago] = useState([]);
  const [metodosSeleccionados, setMetodosSeleccionados] = useState([]);
  const [fondo, setFondo] = useState(' #d3c2a0');
  // Actualizar el iframe cuando cambian los logos o la plantilla
  useEffect(() => {
    const query = new URLSearchParams({
      logoCentro,
      logoIzq,
      logoDer,
      metodos: metodosSeleccionados.join(',')
    }).toString();

    setIframeSrc(
        `http://localhost:4000/api/folleto/ver-folleto${plantilla}?` +
        `logoCentro=${logoCentro}&logoIzq=${logoIzq}&logoDer=${logoDer}` +
        `&fechaValidez=${encodeURIComponent(fechaValidez)}` +
        `&metodos=${metodosSeleccionados.join(',')}` +
        `&fondo=${encodeURIComponent(fondo)}`
      ); 
    }, [plantilla, logoCentro, logoIzq, logoDer, fechaValidez,metodosSeleccionados,fondo]);

  const guardarPdf = async () => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(
        `http://localhost:4000/api/folleto/guardar-pdf${plantilla}?` +
        `logoCentro=${logoCentro}&logoIzq=${logoIzq}&logoDer=${logoDer}` +
        `&fechaValidez=${encodeURIComponent(fechaValidez)}` +
        `&metodos=${metodosSeleccionados.join(',')}` +
        `&fondo=${encodeURIComponent(fondo)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ logoCentro, logoIzq, logoDer })
        }
      );

      if (!res.ok) throw new Error('Error al guardar el PDF');
      const data = await res.json();
      alert('PDF guardado correctamente: ' + data.archivo);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el PDF');
    }
  };

 

    useEffect(() => {
  fetch('http://localhost:4000/api/folleto/metodos-pago')
    .then(res => res.json())
    .then(data => setMetodosPago(data))
    .catch(err => console.error('Error al cargar métodos de pago:', err));
}, []);


    const handleMetodoChange = (e) => {
      const value = e.target.value;
      if (metodosSeleccionados.includes(value)) {
        setMetodosSeleccionados(metodosSeleccionados.filter(m => m !== value));
      } else {
        setMetodosSeleccionados([...metodosSeleccionados, value]);
      }
    };


 return (
  <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <div className="config-container">
      {/* Plantilla */}
      <div className="config-row">
        <label>Selecciona una plantilla:</label>
        <select value={plantilla} onChange={e => setPlantilla(e.target.value)}>
          <option value="1">Plantilla 1</option>
          <option value="2">Plantilla 2</option>
        </select>
      </div>

      {/* Logos */}
      <div className="config-row">
        <div className="logo-select">
          <label>Logo Central:</label><br></br>
          <select value={logoCentro} onChange={e => setLogoCentro(e.target.value)}>
            <option value="juanita.jpeg">Logo Juanita Market</option>
            <option value="maya.jpeg">Logo Maya</option>
            <option value="bajio.jpeg">Logo Bajío</option>
          </select>
        </div>

        <div className="logo-select">
          <label>Logo Izquierdo:</label><br></br>
          <select value={logoIzq} onChange={e => setLogoIzq(e.target.value)}>
            <option value="harris.jpeg">Logo Harris</option>
          </select>
        </div>

        <div className="logo-select">
          <label>Logo Derecho:</label><br></br>
          <select value={logoDer} onChange={e => setLogoDer(e.target.value)}>
            <option value="harris.jpeg">Logo Harris</option>
          </select>
        </div>
      </div>

      {/* Fecha válida */}
      <div className="config-row">
        <label>Fecha válida:</label>
        <input
          type="text"
          value={fechaValidez}
          onChange={(e) => setFechaValidez(e.target.value)}
          placeholder="Ej: del 1 al 7 de Julio de 2025"
        />
      </div>
      {/* Fondo predefinido */}
      <div className="config-row">
        <label>Fondo del folleto:</label>
        <select value={fondo} onChange={(e) => setFondo(e.target.value)}>
          <option value="#d3c2a0">Cremita clásico</option>
          <option value="#fff6cc">Amarillo suave</option>
          <option value="#f0ebe3">Gris topo claro</option>
        </select>
      </div>

      {/* Métodos de pago 
      <div className="config-row">
        <label>Métodos de pago:</label>
        <div className="metodos-checkboxes">
          {metodosPago.map((metodo, idx) => (
            <label key={idx}>
              <input
                type="checkbox"
                value={metodo}
                checked={metodosSeleccionados.includes(metodo)}
                onChange={handleMetodoChange}
              />
              {metodo.replace(/\.(png|jpg|jpeg|webp)/i, '')}
            </label>
          ))}
        </div>
      </div>*/}

    </div>

    

    {/* Vista previa del PDF */}
    <div style={{ flex: 1 }}>
      <iframe
        title="Vista previa del Folleto PDF"
        src={iframeSrc}
        style={{ width: '100%', height: '1000px', border: 'none' }}
      />
    </div>

    {/* Botón de guardar */}
    <div style={{ padding: '1rem', textAlign: 'center', background: '#f5f5f5' }}>
      <button className="btn btn-success" onClick={guardarPdf}>
        Guardar Folleto como PDF
      </button>
    </div>
  </div>
);


};

export default GenerarFolleto;
