/*import axios from 'axios';

const API_URL = 'http://localhost:5000/api/productos';

export const obtenerPromociones = async () => {
  const res = await axios.get(`${API_URL}/promociones`);
  return res.data;
};*/

// frontend/src/services/productosService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/productos';

export const obtenerProductos = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

