import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Modal,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid'; // Asegúrate de que esta línea esté presente

// Generar un ID único para cada FAT
const generateUniqueId = () => {
  return `FAT${Math.floor(100000 + Math.random() * 900000)}`; // Genera un ID en el formato FATxxxxx
};

const initialFats = Array.from({ length: 15 }, () => ({
  id: generateUniqueId(), // Genera un ID único
  address: `Coordenadas ${Math.floor(Math.random() * 100)}`, // Dirección aleatoria
  description: `Descripción ${Math.floor(Math.random() * 100)}`, // Descripción aleatoria
  ports: 4, // Valor por defecto
  lat: -34.397 + Math.random() * 0.1, // Coordenadas aleatorias
  lng: 150.644 + Math.random() * 0.1, // Coordenadas aleatorias
}));

const Fats = ({ onLocationSelect }) => { // Recibe la función como prop
  const [fats, setFats] = useState(initialFats);
  const [fatForm, setFatForm] = useState({
    id: '', // Se generará un ID único al agregar un nuevo FAT
    address: '',
    description: '',
    ports: 4, // Valor por defecto
  });
  const [openModal, setOpenModal] = useState(false);

  const addFat = (e) => {
    e.preventDefault();
    // Generar un nuevo ID único para el nuevo FAT
    const newFat = { ...fatForm, id: generateUniqueId() };
    setFats([...fats, newFat]);
    setFatForm({ id: '', address: '', description: '', ports: 4 }); // Restablecer a valor por defecto
    setOpenModal(false);
  };

  const handleLocationClick = (lat, lng) => {
    onLocationSelect({ lat, lng }); // Llama a la función pasada como prop
  };

  const columns = [
    { field: 'id', headerName: 'ID FAT', width: 120 },
    { field: 'address', headerName: 'Dirección', width: 200 },
    { field: 'description', headerName: 'Descripción', width: 200 },
    { field: 'ports', headerName: 'Número de Puertos', width: 180 },
  ];

  return (
    <Box>
      <Button variant="contained" color="primary" onClick={() => setOpenModal(true)}>
        Agregar FAT
      </Button>
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box sx={{
          width: 400,
          bgcolor: 'background.paper',
          p: 4,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: 24
        }}>
          <Typography variant="h6">Agregar FAT</Typography>
          <form onSubmit={addFat}>
            <TextField
              label="ID FAT"
              value={fatForm.id}
              disabled // Deshabilitar el campo ya que se genera automáticamente
              fullWidth
              margin="normal"
            />
            <TextField
              label="Dirección"
              value={fatForm.address}
              onChange={(e) => setFatForm({ ...fatForm, address: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Descripción"
              value={fatForm.description}
              onChange={(e) => setFatForm({ ...fatForm, description: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <FormControl fullWidth required margin="normal">
              <InputLabel>Número de Puertos</InputLabel>
              <Select
                value={fatForm.ports}
                onChange={(e) => setFatForm({ ...fatForm, ports: e.target.value })}
              >
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={16}>16</MenuItem>
                <MenuItem value={32}>32</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary">
              Agregar FAT
            </Button>
          </form>
        </Box>
      </Modal>
      <Typography variant="h6" sx={{ mt: 4 }}>Lista de FATs</Typography>
      <div style={{ height: 400, width: '100%', marginTop: '20px' }}>
        <DataGrid
          rows={fats}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          checkboxSelection
        />
      </div>
    </Box>
  );
};

export default Fats;