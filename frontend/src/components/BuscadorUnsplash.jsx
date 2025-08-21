// frontend/src/components/BuscadorUnsplash.jsx (adaptado para Pixabay)
import React, { useState } from 'react';
import axios from 'axios';

const PIXABAY_KEY = process.env.REACT_APP_PIXABAY_KEY;

function BuscadorUnsplash({ onSeleccionar }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscarImagenes = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const respuesta = await axios.get(`https://pixabay.com/api/`, {
        params: {
          key: PIXABAY_KEY,
          q: query,
          per_page: 12,
          image_type: 'photo',
          orientation: 'horizontal',
          safesearch: true
        }
      });
      setResultados(respuesta.data.hits || []);
    } catch (error) {
      console.error('Error al buscar imágenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionar = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        onSeleccionar(base64Data);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error al convertir imagen a base64:', error);
    }
  };

  return (
    <div className="mb-4">
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar imágenes (Pixabay)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-outline-primary" onClick={buscarImagenes}>
          Buscar
        </button>
      </div>

      {loading && <div className="text-secondary">Cargando imágenes...</div>}

      <div className="row">
        {resultados.map((img) => (
          <div key={img.id} className="col-6 col-md-3 mb-3">
            <img
              src={img.previewURL}
              alt={img.tags}
              className="img-fluid rounded border border-secondary"
              style={{ cursor: 'pointer' }}
              onClick={() => handleSeleccionar(img.largeImageURL || img.webformatURL)}
            />
            <div className="text-center mt-1 small text-muted">{img.user}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BuscadorUnsplash;
