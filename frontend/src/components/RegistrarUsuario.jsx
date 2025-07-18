import { useState } from 'react';
import axios from 'axios';

const RegistrarUsuario = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleRegister = async () => {
    try {
      const res = await axios.post('http://localhost:4000/api/auth/register', {
        username,
        password,
      });
      setMensaje('✅ Usuario registrado exitosamente');
      setUsername('');
      setPassword('');
    } catch (error) {
      setMensaje('❌ Error: ' + (error.response?.data?.error || 'No se pudo registrar'));
    }
  };

  return (
    <div className="card p-4">
      <h3 className="mb-3">Registrar Nuevo Usuario</h3>
      {mensaje && <div className="alert alert-info">{mensaje}</div>}
      hola
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Nombre de usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        className="form-control mb-3"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary w-100" onClick={handleRegister}>
        Registrar
      </button>
    </div>
  );
};

export default RegistrarUsuario;
