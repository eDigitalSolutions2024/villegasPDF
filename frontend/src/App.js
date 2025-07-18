import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MainPage from './components/MainPage';
import Productos from './components/Productos';
import Login from './components/Login';
import GenerarFolleto from './components/GenerarFolleto';
function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoggedIn(!!token);
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={loggedIn ? <MainPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/productos"
          element={loggedIn ? <Productos /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={<Login onLoginSuccess={() => setLoggedIn(true)} />}
        />
        <Route path="/folleto" 
        element={loggedIn ? <GenerarFolleto /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
