import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Maps from './components/Maps';
import Fats from './components/Fats';
import Clients from './components/Clients';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState } from 'react';

function App() {
  const [markers, setMarkers] = useState([]);
  const location = useLocation();
  const pageActive = location.pathname.split('/').pop(); // Obtener la última parte de la ruta
  const navigate = useNavigate();
  const handleLogout = () => {
    console.log('logout');
    if (localStorage.getItem('session')) {
      localStorage.removeItem('session');
      navigate('/')
    }
  }
  return (
    <Box display="flex" height="100vh">
      <Box sx={{ width: 300, bgcolor: '#0a0d22', color: 'white', padding: '0 20px' }} hidden={pageActive == '' ? true : false}>
        <Typography variant="h6" component="div" sx={{ p: 2 }}>Dashboard</Typography>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ListItem
            component={Link}
            to="/clients"
            sx={{
              bgcolor: pageActive === 'clients' ? '#494aa7' : '#111234',
              borderRadius: '6px',
              padding: '10px 16px',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#494aa7' },
            }}
          >
            <ListItemText primary="Clientes" />
          </ListItem>
          <ListItem
            component={Link}
            to="/fats"
            sx={{
              bgcolor: pageActive === 'fats' ? '#494aa7' : '#111234',
              borderRadius: '6px',
              padding: '10px 16px',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#494aa7' },
            }}
          >
            <ListItemText primary="FATs" />
          </ListItem>
          <ListItem
            component={Link}
            to="/map"
            sx={{
              bgcolor: pageActive === 'map' ? '#494aa7' : '#111234',
              borderRadius: '6px',
              padding: '10px 16px',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#494aa7' },
            }}
          >
            <ListItemText primary="Mapa" />
          </ListItem>
          <ListItem
            onClick={handleLogout}
            sx={{
              bgcolor: '#c6362c',
              borderRadius: '6px',
              padding: '10px 16px',
              cursor: 'pointer'
            }}
          >
            <ListItemText primary="Cerrar sesión" />
          </ListItem>
        </List>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: pageActive === 'map' || pageActive === 'search' ? 0 : 3 }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/fats" element={<Fats />} />
          <Route path="/map" element={<Maps />} />
          <Route path="/map/search" element={<Maps />} />
          <Route path="*" element={<Maps />} />
        </Routes>
      </Box>
      <ToastContainer />
    </Box>
  );
}

export default App;