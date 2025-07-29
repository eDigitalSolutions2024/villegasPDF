import React, { useState, useEffect } from "react";

const EditarProducto = ({ producto, onClose, onSave }) => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [unidad, setUnidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nombreInglesManual, setNombreInglesManual] = useState("");

  useEffect(() => {
    if (producto) {
      setNombre(producto.nombre);
      setPrecio(producto.precio);
      setUnidad(producto.unidad);
      setCategoria(producto.categoria);
      setNombreInglesManual(producto.nombreInglesManual || "");
    }
  }, [producto]);

  const handleGuardar = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/productos/${producto._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          precio,
          unidad,
          categoria,
          nombreInglesManual
        })
      });

      if (response.ok) {
        onSave(); // Actualiza lista en padre
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      console.error("Error al guardar producto:", error);
    }
  };

  return (
    <form>
      <div className="mb-3">
        <label className="form-label">Nombre</label>
        <input
          type="text"
          className="form-control"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Precio</label>
        <input
          type="number"
          className="form-control"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Unidad</label>
        <select
          className="form-select"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        >
          <option value="">Selecciona unidad</option>
          <option value="EA">EA</option>
          <option value="LB">LB</option>
          <option value="OZ">OZ</option>
          <option value="PK">PK</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Categoría</label>
        <select
          className="form-select"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Selecciona categoría</option>
          <option value="Frutas">Frutas</option>
          <option value="Carnes">Carnes</option>
          <option value="Panaderia">Panadería</option>
          <option value="Abarrotes">Abarrotes</option>
          <option value="Taqueria">Taquería</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Traducción al inglés</label>
        <input
          type="text"
          className="form-control"
          value={nombreInglesManual}
          onChange={(e) => setNombreInglesManual(e.target.value)}
        />
      </div>

      <div className="text-end">
        <button
          type="button"
          className="btn btn-secondary me-2"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGuardar}
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

export default EditarProducto;
