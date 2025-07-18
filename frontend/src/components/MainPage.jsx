import React, { useEffect, useState } from 'react';
import {useNavigate} from 'react-router-dom';
import Productos from './Productos';
import RegistrarUsuario from './RegistrarUsuario';
import GenerarPDF from './GenerarFolleto';
import Historial from './Historial';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/MainPage.css'; // Asegúrate de tener este archivo CSS
import { FaStar, FaFilePdf, FaClipboardList, FaBox } from 'react-icons/fa';

const MainPage = () => {
  const [vista, setVista] = useState('productos');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('usuario'));
    if (userData) {
      setUsuario(userData);
    }
  }, []);

  const username = usuario?.username || 'Usuario';
  const navigate = useNavigate();
const renderContenido = () => {
    switch (vista) {
      case 'productos':
        return <Productos />;
      case 'Registrar':
        return <RegistrarUsuario />;
      case 'pdf':
        return <GenerarPDF />;
      case 'historial':
        return <Historial />;
      default:
        return <Productos />;
    }
  };
  const handleLogout = () => {
   
  // Aquí podrías limpiar el token, redirigir, etc.
  
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          navigate('/login');
};



  return (
    <div className="container-fluid p-0">
  {/* HEADER FIJO */}
  <div className="header-fixed">
  <div className="header-title">
    🛒 Folletos
  </div>
  <div className="dropdown">
  <button
    className="btn btn-sm btn-light dropdown-toggle text-dark"
    type="button"
    id="dropdownMenuButton"
    data-bs-toggle="dropdown"
    aria-expanded="false"
  >
    👤 Bienvenido, {username}
  </button>
  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
    <li><button className="dropdown-item" onClick={() => handleLogout()}>Cerrar sesión</button></li>
  </ul>
</div>
</div>


  {/* SIDEBAR FIJO */}
  <div className="navbar-custom">
    <ul className="nav flex-column nav-pills p-3">
      <li className="nav-item mb-2">
        <button className={`nav-link ${vista === 'productos' ? 'active' : ''}`} onClick={() => setVista('productos')}>
          <FaBox className="me-2" /> Productos
        </button>
      </li>
      <li className="nav-item mb-2">
        <button className={`nav-link ${vista === 'pdf' ? 'active' : ''}`} onClick={() => setVista('pdf')}>
          <FaFilePdf className="me-2" /> Generar PDF
        </button>
      </li>
      <li className="nav-item mb-2">
        <button className={`nav-link ${vista === 'historial' ? 'active' : ''}`} onClick={() => setVista('historial')}>
          <FaClipboardList className="me-2" /> Historial
        </button>
      </li>
      <li className="nav-item">
        <button className={`nav-link ${vista === 'Registrar' ? 'active' : ''}`} onClick={() => setVista('Registrar')}>
          <FaStar className="me-2" /> Registrar Usuario
        </button>
      </li>
    </ul>
  </div>

  {/* CONTENIDO AJUSTADO */}
  <div className="main-content">
    {renderContenido()}
  </div>
</div>


  );
};

export default MainPage;
