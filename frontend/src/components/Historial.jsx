import React, { useEffect, useState } from 'react';
// conserva tu import si usas css externo
import '../styles/Historial.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const HistorialFolletos = () => {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pdf/historial`);
        const data = await res.json();
        // Asegura forma homogénea aunque el backend aún no tenga arrays
        const normalizado = (Array.isArray(data) ? data : []).map((item) => ({
          ...item,
          // preview: imagen “completa” si existe; si no, usa la primera imagen individual
          preview: item.preview || item.imagen || (item.imagenes?.[0] ?? null),
          // arreglo de imágenes individuales
          imagenes: Array.isArray(item.imagenes) ? item.imagenes : (item.imagen ? [item.imagen] : []),
          zip: item.zip || null,
        }));
        setHistorial(normalizado);
      } catch (error) {
        console.error('Error al obtener el historial:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchHistorial();
  }, []);

  const handleDescargarJPGs = (item) => {
    // Opción 1: si el backend da un ZIP, lo usamos (UX mejor).
    if (item.zip) {
      window.location.href = `${API_BASE}${item.zip}`;
      return;
    }

    // Opción 2 (fallback): descargar uno por uno (algunos navegadores bloquean muchas descargas).
    if (Array.isArray(item.imagenes) && item.imagenes.length) {
      item.imagenes.forEach((rel, idx) => {
        const a = document.createElement('a');
        a.href = `${API_BASE}${rel}`;
        // nombre sugerido: base del archivo + índice
        const base = (item.nombreArchivo || `folleto-${idx + 1}`).replace(/\.pdf$/i, '');
        a.download = `${base}-${idx + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem', color: '#333' }}>
        Historial de PDFs / JPGs generados
      </h2>

      {cargando ? (
        <p>Cargando historial...</p>
      ) : historial.length === 0 ? (
        <p>No hay folletos generados aún.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              backgroundColor: '#fff',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4ff', color: '#333' }}>
                <th style={thStyle}>Archivo (base)</th>
                <th style={thStyle}>Usuario</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Ver PDF</th>
                <th style={thStyle}>Descargar JPG(s)</th>
                <th style={thStyle}>Hojas JPG</th>
                <th style={thStyle}>Vista previa</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item, index) => {
                const pdfHref = item.ruta ? `${API_BASE}${item.ruta}` : null;
                const previewSrc = item.preview ? `${API_BASE}${item.preview}` : null;
                const countJpgs = Array.isArray(item.imagenes) ? item.imagenes.length : 0;

                return (
                  <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdStyle}>{item.nombreArchivo || `folleto-${index + 1}.pdf`}</td>
                    <td style={tdStyle}>{item.usuario || '—'}</td>
                    <td style={tdStyle}>
                      {item.fecha ? new Date(item.fecha).toLocaleString() : '—'}
                    </td>
                    <td style={tdStyle}>
                      {pdfHref ? (
                        <a
                          href={pdfHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={buttonStyle}
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span style={{ opacity: 0.6 }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        target="_blank"
                        onClick={() => handleDescargarJPGs(item)}
                        style={buttonStyle}
                        title={
                          item.zip
                            ? 'Descargar ZIP con todas las hojas JPG'
                            : 'Descargar cada JPG individual'
                        }
                      >
                        {item.zip ? 'Descargar ZIP' : 'Descargar JPG(s)'}
                      </button>
                    </td>
                    <td style={tdStyle}>{countJpgs || '0'}</td>
                    <td style={tdStyle}>
                      {previewSrc ? (
                        <a
                          href={previewSrc}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir vista previa en tamaño completo"
                        >
                          <img
                            src={previewSrc}
                            alt="Vista previa"
                            style={{
                              width: '90px',
                              borderRadius: '5px',
                              border: '1px solid #ccc',
                              display: 'block',
                            }}
                          />
                        </a>
                      ) : (
                        <span style={{ opacity: 0.6 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
  borderBottom: '2px solid #ddd',
};

const tdStyle = {
  padding: '10px',
  textAlign: 'left',
  verticalAlign: 'middle',
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
  fontSize: '0.9rem',
  border: 'none',
  cursor: 'pointer',
};

export default HistorialFolletos;
