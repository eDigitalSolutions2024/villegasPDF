import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css'; // Asegúrate de crear este archivo

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://api.villegassistema.com/api/auth/login', {
        username,
        password,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify({ username }));
      navigate('/');
    } catch (err) {
      alert('Credenciales incorrectas');
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card p-4">
        <h3 className="text-center mb-3">Iniciar Sesión</h3>
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Usuario"
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="form-control mb-3"
          placeholder="Contraseña"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-success w-100" onClick={handleLogin}>
          Entrar
        </button>
      </div>
    </div>
  );
};

export default Login;
