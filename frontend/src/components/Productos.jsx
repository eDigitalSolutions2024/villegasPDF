import React, { useEffect, useState } from "react";
import axios from "axios";
import EditarProducto from './EditarProducto';
import '../styles/Productos.css';
import BuscadorUnsplash from './BuscadorUnsplash';


const Productos = () => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [unidad, setUnidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null);
  const [productos, setProductos] = useState([]);
  const [productoEditando, setProductoEditando] = useState(null);
  const [imagenBase64, setImagenBase64] = useState('');
  const [verificacion, setVerificacion] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    cargarProductos();
  }, []);


  useEffect(() => {
  if (verificacion) {
    console.log("🔗 Sitios donde aparece:");
    verificacion.pagesWithMatchingImages.forEach(p => {
      console.log(p.url);
    });
  }
}, [verificacion]);

  const cargarProductos = async () => {
    try {
      const response = await axios.get("http://localhost:4000/api/productos");
      setProductos(response.data);
    } catch (error) {
      console.error("Error al cargar productos", error);
    }
  };

  const handleGuardar = async () => {
    if (!nombre || !precio || !categoria || (!imagen && !imagenBase64)) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("unidad", unidad);
    formData.append("categoria", categoria);

    if (imagenBase64) {
    formData.append("imagenBase64", imagenBase64);
  } else if (imagen) {
    formData.append("imagen", imagen); // clave que deberás manejar en tu backend
  }

    try {
      await axios.post("http://localhost:4000/api/productos", formData);
      setNombre("");
      setPrecio("");
      setUnidad("");
      setCategoria("");
      setImagen(null);
      setImagenBase64("");
      cargarProductos();
    } catch (error) {
      console.error("Error al guardar producto", error);
    }
  };

  const togglePromocion = async (id, nuevaPromocion) => {
  try {
    await fetch(`http://localhost:4000/api/productos/${id}/promocion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promocion: nuevaPromocion }),
    });

   await cargarProductos();
  } catch (error) {
    console.error("Error actualizando promoción:", error);
  }
};

const orderOf = (id) => {
  const p = productos.find(x => x._id === id);
  return p?.promocion ? (p?.promoOrder ?? null) : null;
};


const eliminarProducto = async (id) => {
  if (!id) {
    console.error("ID inválido para eliminar producto");
    return;
  }

  const confirmar = window.confirm("¿Estás seguro de que deseas eliminar este producto ?");
  if (!confirmar) return;

  try {
    await axios.delete(`http://localhost:4000/api/productos/${id}`);
    setProductos((prev) => prev.filter((prod) => prod._id !== id));
  } catch (error) {
    console.error("Error al eliminar producto", error);
  }
};

const handleVerificarImagen = async () => {
  if (!imagen) {
    alert("Primero selecciona una imagen para verificar.");
    return;
  }

  const formData = new FormData();
  formData.append("imagen", imagen);

  try {
    const response = await axios.post("http://localhost:4000/api/productos/verificar-imagen", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const { fullMatchingImages, partialMatchingImages, webEntities, pagesWithMatchingImages } = response.data;

    // Guardar para mostrarlo en el frontend
    setVerificacion({
      webEntities,
      pagesWithMatchingImages,
    });

    if (fullMatchingImages.length > 0 || partialMatchingImages.length > 0) {
      alert("⚠️ Esta imagen fue encontrada en otros sitios. Podría tener copyright.");
      console.log("Full:", fullMatchingImages);
      console.log("Partial:", partialMatchingImages);
      // Aquí más adelante podemos mostrar la opción de Unsplash
    } else {
      alert("✅ No se encontraron coincidencias. Esta imagen parece segura.");
    }
  } catch (error) {
    console.error("Error al verificar la imagen:", error.message);
    alert("Ocurrió un error al verificar la imagen.");
  }
};

// Esta función se pasa como prop a <BuscadorUnsplash />
const handleSeleccionarImagenUnsplash = (url) => {
  setImagenBase64(url);    // Guarda la URL seleccionada
  setImagen(null);         // Limpia la imagen local si había una
};

const handleFileUpload = (e) => {
  setImagen(e.target.files[0]);
  setImagenBase64(''); // Limpia base64 de Unsplash si elige imagen local
};


const eliminarFondoImagen = async () => {
  try {
    if (imagen) {
      const formData = new FormData();
      formData.append("imagen", imagen);

      const response = await axios.post("http://localhost:4000/api/productos/eliminar-fondo-local", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Imagen sin fondo:", response.data.nuevaImagen)
      setImagenBase64(`http://localhost:4000/${response.data.nuevaImagen.replace(/^\/+/, '').replace(/\\/g, '/')}`);

      console.log(imagenBase64)
      setImagen(null);
    } else if (imagenBase64) {
      const response = await axios.post("http://localhost:4000/api/productos/eliminar-fondo-url", {
        imageUrl: imagenBase64,
      });

      setImagenBase64(`http://localhost:4000/${response.data.nuevaImagen.replace(/^\/+/, '')}`);

    } else {
      alert("No hay imagen para procesar.");
    }

    alert("✅ Fondo eliminado correctamente");
  } catch (error) {
    console.error("❌ Error:", error);
    alert("❌ Error al eliminar el fondo");
  }
};


  return (
    
    <div className="container mt-4">
      <h2 className="mb-4">Subir Producto</h2>
      <div className="row g-3">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <input
            type="text"
            className="form-control"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-control"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
          >
            <option value="">Unidad de medida</option>
            <option value="LB">LB</option>
            <option value="EA">EA</option>
            <option value="OZ">OZ</option>
            <option value="DZN">DZN</option>
            <option value="CT">CT</option>
          </select>
          
        </div>
        <div className="col-md-3">
          <select
            className="form-control"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Selecciona una categoría</option>
            <option value="frutas y verduras">Frutas y Verduras</option>
            <option value="Carnes">Carnes</option>
            <option value="Panaderia">Panadería</option>
            <option value="Abarrotes">Abarrotes</option>
            <option value="Taqueria">Taqueria</option>
          </select>
        </div>
        <div className="col-md-6">
          <input
            type="file"
            className="form-control"
            onChange={handleFileUpload}
          />

          {(imagen || imagenBase64) && (
            <>
              <button
                className="btn btn-warning mt-2 me-2"
                onClick={handleVerificarImagen}
                type="button"
              >
                🔍 Verificar imagen
              </button>

              <button
                className="btn btn-outline-success mt-2 ms-2"
                type="button"
                onClick={eliminarFondoImagen}
              >
                ✂️ Eliminar fondo de la imagen
              </button>
            </>
          )}
    

          <hr className="my-3 col-md-6" />

            <p className="fw-bold">O elige una imagen desde Pixabay:</p>
            <BuscadorUnsplash
              onSeleccionar={handleSeleccionarImagenUnsplash}
            />

            {imagenBase64 && (
              <div className="mt-3">
                <p className="text-success">Imagen seleccionada:</p>
                <img src={imagenBase64} alt="Unsplash" className="img-fluid rounded" />
              </div>
            )}
            {imagen && (
              <div className="mt-3">
                <p className="text-primary">Vista previa (imagen local):</p>
                <img
                  src={URL.createObjectURL(imagen)}
                  alt="Vista previa"
                  className="img-fluid rounded"
                />
              </div>
            )}
        </div>
        
        <div className="col-md-6">
          {verificacion?.pagesWithMatchingImages?.length > 0 && (
            <div>
              <h5>🔗 Sitios donde aparece esta imagen:</h5>
              <ul>
                {verificacion.pagesWithMatchingImages.map((pagina, i) => (
                  <li key={i}>
                    <a href={pagina.url} target="_blank" rel="noopener noreferrer">
                      {pagina.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verificacion?.webEntities?.length > 0 && (
            <div>
              <h5>📌 Entidades relacionadas:</h5>
              <ul>
                {verificacion.webEntities.map((entidad, i) => (
                  <li key={i}>{entidad.description}</li>
                ))}
              </ul>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleGuardar}>
            Guardar producto
          </button>
        </div>
        <div className="col-md-6">
          
          
          </div>
      </div>

      <hr className="my-5" />

      <h3 className="mb-4">Productos existentes</h3>
      <div className="row">
        {productos.map((producto, index) => (
          <div className="col-md-3 mb-4" key={index}>
            <div className="card shadow-sm h-100">
              <img
                 src={`http://localhost:4000/${producto.imagen.replace(/\\/g, '/')}`}
                className="card-img-top"
                alt={producto.nombre}
                style={{ height: "160px", objectFit: "cover" }}
              />
              <div className="card-body text-center">
                <h5 className="card-title">{producto.nombre}</h5>
                <p className="card-text">{producto.precio} / {producto.unidad}</p>
                <span className="badge bg-info text-dark">{producto.categoria}</span>
                <input
                  type="checkbox"
                  checked={producto.promocion}
                  onChange={() => togglePromocion(producto._id, !producto.promocion)}
                  style={{ position: "absolute", top: 10, right: 10, transform: "scale(1.5)" }}
                  title="Marcar como promoción"
                />
                
                <br></br>
                {orderOf(producto._id) && (
                  <span
                    className="badge bg-primary"
                    style={{ position: "absolute", top: 10, left: 10 }}
                  >
                    {orderOf(producto._id)}
                  </span>
                )}
                <button
                  className="btn btn-sm btn-danger mt-2"
                  onClick={() => eliminarProducto(producto._id)}
                >
                  Eliminar
                </button>
                
                <button 
                style={{ marginLeft: '10px' }}
                  className="btn btn-sm btn-info mt-2"
                  onClick={() => setProductoEditando(producto)}>
                  Editar
                  </button>

              </div>
            </div>
          </div>
        ))}
        
        {productoEditando && (
  <>
    {/* Fondo oscuro */}
    <div
      className="modal-backdrop fade show"
      style={{
        zIndex: 1040,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
    ></div>

    {/* Contenido del modal */}
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      style={{
        zIndex: 1050,
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        width: '90%',
        maxWidth: '800px',
      }}
    >
      <div className="modal-header">
        <h5 className="modal-title">Editar Producto</h5>
        <button
          type="button"
          className="btn-close"
          onClick={() => setProductoEditando(null)}
        ></button>
      </div>
      <div className="modal-body">
        <EditarProducto
          producto={productoEditando}
          onClose={() => setProductoEditando(null)}
          onSave={() => {
            setProductoEditando(null);
            cargarProductos();
          }}
        />
      </div>
    </div>
  </>
)}



      </div>
    </div>
    
  );
};

export default Productos;
