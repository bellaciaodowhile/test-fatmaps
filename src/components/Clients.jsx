import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Modal,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const initialClients = Array.from({ length: 15 }, (_, index) => ({
  id: `C${index + 1}`,
  name: `Client ${index + 1}`,
  userType: index % 2 === 0 ? 'residential' : 'public',
  address: `Address ${index + 1}`,
  dni: `DNI${index + 1}`,
}));

const Clients = () => {
  const [clients, setClients] = useState(initialClients);
  const [clientForm, setClientForm] = useState({
    id: '',
    name: '',
    userType: 'residential',
    address: '',
    dni: '',
  });
  const [openModal, setOpenModal] = useState(false);

  const addClient = (e) => {
    e.preventDefault();
    setClients([...clients, clientForm]);
    setClientForm({ id: '', name: '', userType: 'residential', address: '', dni: '' });
    setOpenModal(false);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Nombre', width: 150 },
    { field: 'userType', headerName: 'Tipo de Usuario', width: 150 },
    { field: 'address', headerName: 'Dirección', width: 200 },
    { field: 'dni', headerName: 'DNI', width: 150 },
  ];

  return (
    <Box>
      <Button variant="contained" color="primary" onClick={() => setOpenModal(true)}>
        Agregar Cliente
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
          <Typography variant="h6">Agregar Cliente</Typography>
          <form onSubmit={addClient}>
            <TextField
              label="Client ID"
              value={clientForm.id}
              onChange={(e) => setClientForm({ ...clientForm, id: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Nombre"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <FormControl fullWidth required margin="normal">
              <InputLabel>Tipo de Usuario</InputLabel>
              <Select
                value={clientForm.userType}
                onChange={(e) => setClientForm({ ...clientForm, userType: e.target.value })}
              >
                <MenuItem value="residential">Residencial</MenuItem>
                <MenuItem value="public">Público</MenuItem>
                <MenuItem value="private">Privado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Dirección"
              value={clientForm.address}
              onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="DNI"
              value={clientForm.dni}
              onChange={(e) => setClientForm({ ...clientForm, dni: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <Button type="submit" variant="contained" color="primary">
              Agregar Cliente
            </Button>
          </form>
        </Box>
      </Modal>

      <Typography variant="h6" sx={{ mt: 4 }}>Lista de Clientes</Typography>
      <div style={{ height: 400, width: '100%', marginTop: '20px' }}>
        <DataGrid
          rows={clients}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          checkboxSelection
        />
      </div>
    </Box>
  );
};

export default Clients;