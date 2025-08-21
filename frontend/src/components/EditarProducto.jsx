// EditarProducto.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import BuscadorUnsplash from "./BuscadorUnsplash"; // tu buscador (Pixabay por debajo)

const EditarProducto = ({ producto, onClose, onSave }) => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [unidad, setUnidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nombreInglesManual, setNombreInglesManual] = useState("");

  // ---- Imagen (archivo o URL) + preview
  const [nuevaImagenFile, setNuevaImagenFile] = useState(null);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState("");
  const [preview, setPreview] = useState("");

  // ---- Verificación (igual que en Productos.jsx)
  const [verificacion, setVerificacion] = useState(null);

  useEffect(() => {
    if (!producto) return;
    setNombre(producto.nombre);
    setPrecio(producto.precio);
    setUnidad(producto.unidad);
    setCategoria(producto.categoria);
    setNombreInglesManual(producto.nombreInglesManual || "");

    // preview de la imagen actual del producto
    const rutaActual = `http://localhost:4000/${producto.imagen.replace(/\\/g, "/")}`;
    setPreview(rutaActual);
  }, [producto]);

  // ====== Handlers de imagen ======
  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setNuevaImagenFile(f);
    setNuevaImagenUrl("");
    setPreview(f ? URL.createObjectURL(f) : preview);
  };

  const onSeleccionarUrl = (url) => {
    setNuevaImagenUrl(url);
    setNuevaImagenFile(null);
    setPreview(url);
  };

  const limpiarNuevaImagen = () => {
    setNuevaImagenFile(null);
    setNuevaImagenUrl("");
    const rutaActual = `http://localhost:4000/${producto.imagen.replace(/\\/g, "/")}`;
    setPreview(rutaActual);
  };

  // ====== Quitar fondo (igual endpoints que en Productos.jsx) ======
  const eliminarFondoImagen = async () => {
    try {
      if (nuevaImagenFile) {
        const formData = new FormData();
        formData.append("imagen", nuevaImagenFile);

        const res = await axios.post(
          "http://localhost:4000/api/productos/eliminar-fondo-local",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const urlServida = `http://localhost:4000/${res.data.nuevaImagen.replace(/^\/+/, "").replace(/\\/g, "/")}`;
        setNuevaImagenUrl(urlServida);
        setNuevaImagenFile(null);
        setPreview(urlServida);
      } else if (nuevaImagenUrl) {
        const res = await axios.post(
          "http://localhost:4000/api/productos/eliminar-fondo-url",
          { imageUrl: nuevaImagenUrl }
        );

        const urlServida = `http://localhost:4000/${res.data.nuevaImagen.replace(/^\/+/, "")}`;
        setNuevaImagenUrl(urlServida);
        setPreview(urlServida);
      } else {
        alert("No hay imagen para procesar.");
        return;
      }

      alert("✅ Fondo eliminado correctamente");
    } catch (err) {
      console.error("❌ Error al eliminar fondo:", err);
      alert("❌ Error al eliminar el fondo");
    }
  };

  // ====== Verificar imagen (igual que en Productos.jsx: solo archivo local) ======
  const handleVerificarImagen = async () => {
    if (!nuevaImagenFile) {
      alert("Para verificar, selecciona primero una imagen local (archivo).");
      return;
    }

    const formData = new FormData();
    formData.append("imagen", nuevaImagenFile);

    try {
      const response = await axios.post(
        "http://localhost:4000/api/productos/verificar-imagen",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { fullMatchingImages, partialMatchingImages, webEntities, pagesWithMatchingImages } = response.data;

      setVerificacion({ webEntities, pagesWithMatchingImages });

      if (fullMatchingImages.length > 0 || partialMatchingImages.length > 0) {
        alert("⚠️ Esta imagen fue encontrada en otros sitios. Podría tener copyright.");
        console.log("Full:", fullMatchingImages);
        console.log("Partial:", partialMatchingImages);
      } else {
        alert("✅ No se encontraron coincidencias. Esta imagen parece segura.");
      }
    } catch (error) {
      console.error("Error al verificar la imagen:", error.message);
      alert("Ocurrió un error al verificar la imagen.");
    }
  };

  // ====== Guardar (FormData si cambiaste imagen; JSON si no) ======
  const handleGuardar = async () => {
    try {
      if (nuevaImagenFile || nuevaImagenUrl) {
        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("precio", precio);
        formData.append("unidad", unidad);
        formData.append("categoria", categoria);
        formData.append("nombreInglesManual", nombreInglesManual);

        if (nuevaImagenFile) formData.append("imagen", nuevaImagenFile);
        if (nuevaImagenUrl) formData.append("imagenBase64", nuevaImagenUrl);

        const resp = await fetch(`http://localhost:4000/api/productos/${producto._id}`, {
          method: "PUT",
          body: formData,
        });
        if (!resp.ok) throw new Error("Error al guardar con imagen");
      } else {
        const resp = await fetch(`http://localhost:4000/api/productos/${producto._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, precio, unidad, categoria, nombreInglesManual }),
        });
        if (!resp.ok) throw new Error("Error al guardar");
      }

      onSave();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Error al guardar el producto.");
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="mb-3">
        <label className="form-label">Nombre</label>
        <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>

      <div className="mb-3">
        <label className="form-label">Precio</label>
        <input className="form-control" value={precio} onChange={(e) => setPrecio(e.target.value)} />
      </div>

      <div className="mb-3">
        <label className="form-label">Unidad</label>
        <select className="form-select" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          <option value="">Selecciona unidad</option>
          <option value="EA">EA</option>
          <option value="LB">LB</option>
          <option value="OZ">OZ</option>
          <option value="PK">PK</option>
          <option value="DZN">DZN</option>
          <option value="CT">CT</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Categoría</label>
        <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Selecciona categoría</option>
          <option value="Frutas">Frutas y Verduras</option>
          <option value="Carnes">Carnes</option>
          <option value="Panaderia">Panadería</option>
          <option value="Abarrotes">Abarrotes</option>
          <option value="Taqueria">Taquería</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Traducción al inglés</label>
        <input className="form-control" value={nombreInglesManual} onChange={(e) => setNombreInglesManual(e.target.value)} />
      </div>

      <hr />
      <h6 className="mb-2">Imagen del producto</h6>

      {preview && (
        <div className="mb-3 text-center">
          <img src={preview} alt="preview" style={{ maxHeight: 180, objectFit: "cover", borderRadius: 6 }} />
        </div>
      )}

      <div className="mb-3">
        <label className="form-label">Subir nueva imagen (opcional)</label>
        <input type="file" className="form-control" onChange={onFileChange} />
      </div>

      <div className="mb-3">
        <p className="mb-1">…o elegir desde Pixabay:</p>
        <BuscadorUnsplash onSeleccionar={onSeleccionarUrl} />
        {(nuevaImagenFile || nuevaImagenUrl) && (
          <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={limpiarNuevaImagen}>
            Quitar nueva imagen
          </button>
        )}
      </div>

      {(nuevaImagenFile || nuevaImagenUrl) && (
        <div className="mb-3">
          <button type="button" className="btn btn-warning me-2" onClick={handleVerificarImagen}>
            🔍 Verificar imagen
          </button>
          <button type="button" className="btn btn-outline-success" onClick={eliminarFondoImagen}>
            ✂️ Eliminar fondo de la imagen
          </button>
        </div>
      )}

      {verificacion?.pagesWithMatchingImages?.length > 0 && (
        <div className="mt-3">
          <h6>🔗 Sitios donde aparece esta imagen:</h6>
          <ul>
            {verificacion.pagesWithMatchingImages.map((p, i) => (
              <li key={i}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {verificacion?.webEntities?.length > 0 && (
        <div className="mt-3">
          <h6>📌 Entidades relacionadas:</h6>
          <ul>{verificacion.webEntities.map((e, i) => <li key={i}>{e.description}</li>)}</ul>
        </div>
      )}

      <div className="text-end mt-3">
        <button type="button" className="btn btn-secondary me-2" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleGuardar}>
          Guardar
        </button>
      </div>
    </form>
  );
};

export default EditarProducto;
