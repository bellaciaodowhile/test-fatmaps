import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import Clients from './Clients';
import Fats from './Fats';
import Maps from './Maps';

const Dashboard = () => {
  const [showClients, setShowClients] = useState(true);
  const [showFats, setShowFats] = useState(false);
  const [showMaps, setShowMaps] = useState(false);
    const [location, setLocation] = useState(null);

  const toggleClients = () => {
    setShowClients(true);
    setShowFats(false);
    setShowMaps(false);
  };

  const toggleFats = () => {
    setShowClients(false);
    setShowFats(true);
    setShowMaps(false);
  };

    const toggleMaps = () => {
    setShowClients(false);
    setShowFats(false);
    setShowMaps(true);
  };

  return (
    <Box display="flex" height="100vh">
      <Box sx={{ width: 300, bgcolor: '#0a0d22', color: 'white', padding: '0 20px' }}>
        <Typography variant="h6" component="div" sx={{ p: 2 }}>Dashboard</Typography>
       <List sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ListItem
                button
                onClick={toggleClients}
                sx={{
                bgcolor: '#111234', // Color de fondo rojo
                borderRadius: '6px', // Border-radius de 6px
                padding: '10px 16px', // Padding más grande
                cursor: 'pointer',
                '&:hover': { bgcolor: '#494aa7' }, // Color de fondo al pasar el mouse (opaco)
                }}
            >
                <ListItemText primary="Clientes" />
            </ListItem>
            <ListItem
                button
                onClick={toggleFats}
                sx={{
                bgcolor: '#111234', // Color de fondo rojo
                borderRadius: '6px', // Border-radius de 6px
                padding: '10px 16px', // Padding más grande
                cursor: 'pointer',
                '&:hover': { bgcolor: '#494aa7' }, // Color de fondo al pasar el mouse (opaco)
                }}
            >
                <ListItemText primary="FATs" />
            </ListItem>
             <ListItem
                button
                onClick={toggleMaps}
                sx={{
                bgcolor: '#111234', // Color de fondo rojo
                borderRadius: '6px', // Border-radius de 6px
                padding: '10px 16px', // Padding más grande
                cursor: 'pointer',
                '&:hover': { bgcolor: '#494aa7' }, // Color de fondo al pasar el mouse (opaco)
                }}
            >
                <ListItemText primary="Mapa" />
            </ListItem>
        </List>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: showMaps ? 0 : 3 }}>
        {showClients && <Clients />}
        {showFats && <Fats onLocationSelect={setLocation} />}
        {showMaps && <Maps onLocationSelect={setLocation} />}
      </Box>
    </Box>
  );
};

export default Dashboard;