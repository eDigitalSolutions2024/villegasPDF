import React, { useEffect, useState } from 'react';
import '../styles/Historial\.css'; // (si luego decides usar un archivo externo)

const HistorialFolletos = () => {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/pdf/historial');
        const data = await res.json();
        setHistorial(data);
      } catch (error) {
        console.error('Error al obtener el historial:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchHistorial();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem', color: '#333' }}>
        Historial de PDFs generados
      </h2>

      {cargando ? (
        <p>Cargando historial...</p>
      ) : historial.length === 0 ? (
        <p>No hay PDFs generados aún.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            width: '100%',
            backgroundColor: '#fff',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4ff', color: '#333' }}>
                <th style={thStyle}>Archivo</th>
                <th style={thStyle}>Usuario</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Ver PDF</th>
                <th style={thStyle}>Ver JPG</th>
                <th style={thStyle}>Vista previa</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item, index) => (
                <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                  <td style={tdStyle}>{item.nombreArchivo}</td>
                  <td style={tdStyle}>{item.usuario}</td>
                  <td style={tdStyle}>{new Date(item.fecha).toLocaleString()}</td>
                  <td style={tdStyle}>
                    <a
                      href={`http://localhost:4000${item.ruta}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={buttonStyle}
                    >
                      Ver PDF
                    </a>
                  </td>
                  <td style={tdStyle}>
                    <a
                      href={`http://localhost:4000${item.imagen}`}
                      download={`folleto-${index + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={buttonStyle}
                    >
                      Descargar JPG
                    </a>
                  </td>
                  <td style={tdStyle}>
                    <img
                      src={`http://localhost:4000${item.imagen}`}
                      alt="Vista previa"
                      style={{ width: '80px', borderRadius: '5px', border: '1px solid #ccc' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Estilos en objetos JS
const thStyle = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 'bold',
  borderBottom: '2px solid #ddd'
};

const tdStyle = {
  padding: '10px',
  textAlign: 'left',
  verticalAlign: 'middle'
};

const rowEven = { backgroundColor: '#fff' };
const rowOdd = { backgroundColor: '#f9f9f9' };

const buttonStyle = {
  display: 'inline-block',
  padding: '6px 12px',
  backgroundColor: '#555',
  color: '#fff',
  borderRadius: '5px',
  textDecoration: 'none',
  fontSize: '0.9rem'
};

const linkStyle = {
  color: '#1a73e8',
  fontWeight: 'bold',
  textDecoration: 'none'
};

export default HistorialFolletos;
