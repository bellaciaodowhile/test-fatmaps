import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { createClient } from '@supabase/supabase-js';
import { ToastContainer, toast } from 'react-toastify';

const SUPABASE_URL = 'https://rwrzvwamfgeuqizewhac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cnp2d2FtZmdldXFpemV3aGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjczNTAsImV4cCI6MjA2NzE0MzM1MH0.Y4-F12FQdpTXhFl-gRrZkcjREiKf2Eu99IxHSS0E0XQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [clientForm, setClientForm] = useState({
    id: '',
    name: '',
    userType: 'residential',
    direccion: 'No registrada',
    dni: '',
    port: '',
    telefono: '',
    fat_id: '',
    splitter: '',
  });
   const [availablePorts, setAvailablePorts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [filteredMarkers, setFilteredMarkers] = useState([]);

  useEffect(() => {
    fetchClients();
    const fetchMarkers = async () => {
      const { data: fats, error: fatsError } = await supabase.from('fats').select('*');
      if (fatsError) {
        console.error('Error fetching FATs:', fatsError);
        return;
      }
      const { data: clientes, error: clientesError } = await supabase.from('clientes').select('*');
      if (clientesError) {
        console.error('Error fetching Clientes:', clientesError);
        return;
      }
      const fatsWithClients = fats.map(fat => {
        const associatedClients = clientes.filter(cliente => cliente.fat_id == fat.id);
        return {
          ...fat,
          clientes: associatedClients,
        };
      });
      console.log(fatsWithClients)
      setMarkers(fatsWithClients);
      setFilteredMarkers(fatsWithClients);
    };
    fetchMarkers();
  }, []);

  const handleFatChange = (fatId) => {
      console.log(fatId);
      const selectedFat = markers.find(fat => fat.id == fatId);
      console.log({
        type: 'test',
        selectedFat
      })
      if (selectedFat) {
          const totalPorts = selectedFat.totalPorts; // Total de puertos
          const occupiedPorts = selectedFat.clientes.map(cliente => cliente.port); // Puertos ocupados por clientes
          
          // Generar puertos disponibles
          const allPorts = Array.from({ length: totalPorts }, (_, i) => `P${(i < 10 ? `0${i+1}` : i+1)}`)
              .filter(port => !occupiedPorts.includes(port)); // Excluir puertos ocupados

              console.log({
                type: 'test',
                allPorts,
                occupiedPorts
              })

          setAvailablePorts(allPorts); // Actualizar puertos disponibles
      } else {
          setAvailablePorts([]); // Limpiar puertos disponibles si no hay FAT seleccionado
      }
    };

  const fetchClients = async () => {
  const { data: clients, error: clientsError } = await supabase.from('clientes').select('*');

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return;
  }

  // Obtener los IDs de los fats de los clientes
  const fatIds = clients.map(client => client.fat_id).filter(id => id);

  // Realizar una petición para obtener los fats
  const { data: fats, error: fatsError } = await supabase
    .from('fats')
    .select('*')
    .in('id', fatIds); // Asumiendo que 'id' es el campo que relaciona con 'fat_id'

  if (fatsError) {
    console.error('Error fetching fats:', fatsError);
    return;
  }

  // Crear un objeto de lookup para los fats
  const fatsLookup = fats.reduce((acc, fat) => {
    acc[fat.id] = fat; // Asumiendo que 'id' es el campo único en la tabla 'fats'
    return acc;
  }, {});

  // Reemplazar dirección vacía por "No registrada" y agregar el objeto fat
  const updatedData = clients.map(client => ({
    ...client,
    direccion: client.direccion || 'No registrada', // Reemplaza dirección vacía
    fat: fatsLookup[client.fat_id] || null, // Agrega el fat correspondiente
  }));

  setClients(updatedData);
  console.log(updatedData); // Muestra los clientes en la consola
};

  const handleOpenModal = (client) => {
     if (client) {
       setClientForm({
         id: client.id,
         name: client.nombreApellido, // Asegúrate de que el nombre coincida
         userType: client.tipoUsuario, // Asegúrate de que el nombre coincida
         address: client.direccion || 'No registrada',
         dni: client.cedulaRiff, // Asegúrate de que el nombre coincida
         port: client.port, // Asegúrate de que el nombre coincida
         telefono: client.telefono, // Asegúrate de que el nombre coincida
         fat_id: client.fat_id, // Asegúrate de que el nombre coincida
         splitter: client.splitter, // Asegúrate de que el nombre coincida
       });
       setIsEditing(true);
     } else {
       setClientForm({ id: '', name: '', userType: 'residential', address: '', dni: '', port: '' });
       setIsEditing(false);
     }
     setOpenModal(true);
   };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

 const addOrUpdateClient = async (e) => {
    e.preventDefault();
    if (isEditing) {
        // Update client
        const { error } = await supabase
            .from('clientes')
            .update({
                nombreApellido: clientForm.name, // Cambia a nombreApellido
                tipoUsuario: clientForm.userType, // Cambia a tipoUsuario
                direccion: clientForm.address || 'No registrada',
                cedulaRiff: clientForm.dni, // Cambia a cedulaRiff
                telefono: clientForm.telefono, // Cambia a cedulaRiff
                fat_id: clientForm.fat_id, // Cambia a cedulaRiff
                port: clientForm.port, // Cambia a cedulaRiff
                splitter: clientForm.splitter, // Cambia a cedulaRiff
            })
            .eq('id', clientForm.id);
            toast.success('Operación realizada satisfactoriamente.');
            const fetchMarkers = async () => {
            const { data: fats, error: fatsError } = await supabase.from('fats').select('*');
            if (fatsError) {
              console.error('Error fetching FATs:', fatsError);
              return;
            }
            const { data: clientes, error: clientesError } = await supabase.from('clientes').select('*');
            if (clientesError) {
              console.error('Error fetching Clientes:', clientesError);
              return;
            }
            const fatsWithClients = fats.map(fat => {
              const associatedClients = clientes.filter(cliente => cliente.fat_id == fat.id);
              return {
                ...fat,
                clientes: associatedClients,
              };
            });
            console.log(fatsWithClients)
            setMarkers(fatsWithClients);
            setFilteredMarkers(fatsWithClients);
          };
          fetchMarkers();
        if (error) {
            toast.error('Ha ocurrido un error...');
            console.error('Error updating client:', error);
        }
    } else {
        // Add new client
        const { error } = await supabase
            .from('clientes')
            .insert([{
                nombreApellido: clientForm.name, // Cambia a nombreApellido
                tipoUsuario: clientForm.userType, // Cambia a tipoUsuario
                direccion: clientForm.address || 'No registrada',
                cedulaRiff: clientForm.dni, // Cambia a cedulaRiff
                telefono: clientForm.telefono, // Cambia a cedulaRiff
                fat_id: clientForm.fat_id, // Cambia a cedulaRiff
                port: clientForm.port, // Cambia a cedulaRiff
                splitter: clientForm.splitter, // Cambia a cedulaRiff
            }]);
            toast.success('Operación realizada satisfactoriamente.');
            const fetchMarkers = async () => {
            const { data: fats, error: fatsError } = await supabase.from('fats').select('*');
            if (fatsError) {
              console.error('Error fetching FATs:', fatsError);
              return;
            }
            const { data: clientes, error: clientesError } = await supabase.from('clientes').select('*');
            if (clientesError) {
              console.error('Error fetching Clientes:', clientesError);
              return;
            }
            const fatsWithClients = fats.map(fat => {
              const associatedClients = clientes.filter(cliente => cliente.fat_id == fat.id);
              return {
                ...fat,
                clientes: associatedClients,
              };
            });
      console.log(fatsWithClients)
      setMarkers(fatsWithClients);
      setFilteredMarkers(fatsWithClients);
    };
    fetchMarkers();
        if (error) {
            toast.error('Ha ocurrido un error...');
            console.error('Error adding client:', error);
        }
    }
    // Refresh client list
    fetchClients();
    handleCloseModal();
};
  const handleDeleteClient = async (id) => {
    const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este cliente?');
    if (confirmDelete) {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
        toast.success('Operación realizada satisfactoriamente.');
      if (error) {
        toast.error('Ha ocurrido un error...');
        console.error('Error deleting client:', error);
      } else {
        fetchClients(); // Refresh the client list after deletion
      }
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'nombreApellido', headerName: 'Nombre', width: 150 },
    { field: 'tipoUsuario', headerName: 'Tipo de Usuario', width: 150 },
    { field: 'port', headerName: 'Puerto', width: 50 },
    { field: 'splitter', headerName: 'Splitter', width: 80 },
    { field: 'telefono', headerName: 'Teléfono', width: 150 },
    { field: 'direccion', headerName: 'Dirección', width: 200 },
    { field: 'cedulaRiff', headerName: 'DNI', width: 150 },
    {
     field: 'fat',
     headerName: 'FAT',
     width: 150,
     renderCell: (params) => (
       <>
        <Link 
          to={`/map/search?lat=${params.row.fat ? params.row.fat.lat : ''}&lng=${params.row.fat ? params.row.fat.lng : ''}`} 
          className='underline text-blue-500'>
          {params.row.fat ? params.row.fat.IdFat : 'NO ASIGNADO'}
        </Link>
       </>
     ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      renderCell: (params) => (
        <>
          <Button variant="contained" size="small" color="primary" onClick={() => handleOpenModal(params.row)}>
            ✎
          </Button>
          <Button variant="contained" size="small" color="secondary" onClick={() => handleDeleteClient(params.row.id)}>
            🗑
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Button variant="contained" color="primary" onClick={() => handleOpenModal(null)}>
        Agregar Cliente
      </Button>
      <Modal open={openModal} onClose={handleCloseModal}>
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
          <Typography variant="h6">{isEditing ? 'Editar Cliente' : 'Agregar Cliente'}</Typography>
          <form onSubmit={addOrUpdateClient}>
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
                <MenuItem value="RESIDENCIAL">RESIDENCIAL</MenuItem>
                <MenuItem value="EMPRESAS">EMPRESAS</MenuItem>
                <MenuItem value="PÚBLICO">PÚBLICO</MenuItem>
                <MenuItem value="PRIVADO">PRIVADO</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required margin="normal">
                <InputLabel>FAT</InputLabel>
                <Select
                    required
                    value={clientForm.fat_id}
                    onChange={(e) => {
                      const selectedFatId = e.target.value;
                      setClientForm({ ...clientForm, fat_id: e.target.value })
                      handleFatChange(selectedFatId);
                    }}
                >
                    {markers?.map((fat) => {
                      if (fat?.clientes?.length < fat.totalPorts) {
                        return (
                          <MenuItem key={fat.id} value={fat.id}>
                            {fat.fat_unique} - {fat.IdFat}
                          </MenuItem>
                        );
                      }
                      return null;
                    })}
                </Select>
            </FormControl>
             <FormControl fullWidth required margin="normal">
                <InputLabel>Puerto</InputLabel>
                <Select
                    required
                    value={clientForm.port} // Asegúrate de que `port` esté en el estado de `clientForm`
                    onChange={(e) => setClientForm({ ...clientForm, port: e.target.value })}
                >
                    {availablePorts.map((port) => (
                        <MenuItem key={port} value={port}>
                            {port}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <TextField
              label="Splitter"
              value={clientForm.splitter}
              onChange={(e) => setClientForm({ ...clientForm, splitter: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Dirección"
              value={clientForm.address}
              onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Teléfono"
              value={clientForm.telefono}
              onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
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
              {isEditing ? 'Actualizar Cliente' : 'Agregar Cliente'}
            </Button>
          </form>
        </Box>
      </Modal>
      <Typography variant="h6" sx={{ mt: 4 }}>Lista de Clientes</Typography>
      <div style={{ height: 400, width: '1024px', marginTop: '20px' }}>
        <DataGrid
          showToolbar 
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