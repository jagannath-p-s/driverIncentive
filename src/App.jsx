// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Home from './components/Home';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const sessionUser = localStorage.getItem('user');
    if (sessionUser) {
      setUser(JSON.parse(sessionUser));
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />}
        />
        <Route
          path="/"
          element={user ? <Home user={user} /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
