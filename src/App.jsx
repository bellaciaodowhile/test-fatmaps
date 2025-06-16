import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Maps from './components/Maps';
import Fats from './components/Fats';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [markers, setMarkers] = useState([]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fats" element={<Fats setMarkers={setMarkers} />} />
      <Route path="/map" element={<Maps markers={markers} />} />
      </Routes>
      <ToastContainer/>
      {console.log('Markers being passed to Maps:', markers)}
    </Router>
  );
}

export default App;