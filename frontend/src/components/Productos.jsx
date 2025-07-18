import React, { useEffect, useState } from "react";
import axios from "axios";

const Productos = () => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [unidad, setUnidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const response = await axios.get("http://localhost:4000/api/productos");
      setProductos(response.data);
    } catch (error) {
      console.error("Error al cargar productos", error);
    }
  };

  const handleGuardar = async () => {
    if (!nombre || !precio || !unidad || !categoria || !imagen) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("unidad", unidad);
    formData.append("categoria", categoria);
    formData.append("imagen", imagen);

    try {
      await axios.post("http://localhost:4000/api/productos", formData);
      setNombre("");
      setPrecio("");
      setUnidad("");
      setCategoria("");
      setImagen(null);
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

    // Actualiza el estado local recargando productos o modificando directamente el producto
    setProductos((prev) =>
      prev.map((prod) =>
        prod._id === id ? { ...prod, promocion: nuevaPromocion } : prod
      )
    );
  } catch (error) {
    console.error("Error actualizando promoción:", error);
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
            <option value="PK">PK</option>
            
          </select>
          
        </div>
        <div className="col-md-3">
          <select
            className="form-control"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Selecciona una categoría</option>
            <option value="Frutas">Frutas y Verduras</option>
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
            onChange={(e) => setImagen(e.target.files[0])}
          />
        </div>
        <div className="col-md-12">
          <button className="btn btn-primary" onClick={handleGuardar}>
            Guardar producto
          </button>
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
                <p className="card-text">${producto.precio} / {producto.unidad}</p>
                <span className="badge bg-info text-dark">{producto.categoria}</span>
                <input
                  type="checkbox"
                  checked={producto.promocion}
                  onChange={() => togglePromocion(producto._id, !producto.promocion)}
                  style={{ position: "absolute", top: 10, right: 10, transform: "scale(1.5)" }}
                  title="Marcar como promoción"
                />
                <label className="form-check-label ms-2">Seleccionar</label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Productos;
