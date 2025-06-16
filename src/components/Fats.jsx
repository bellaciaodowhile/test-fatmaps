import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Modal, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SUPABASE_URL = 'https://qmzmznpbpvonegajtavg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtem16bnBicHZvbmVnYWp0YXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMjE5NjMsImV4cCI6MjA2NTU5Nzk2M30.YkJmlrS_55zqdJ-Iu9esXJO56LfJwg-itB6IwGUJnA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const generateUniqueId = () => {
  return `FAT${Math.floor(100000 + Math.random() * 900000)}`;
};

const Fats = ({ onLocationSelect, setMarkers }) => {
  const [fats, setFats] = useState([]);
  const [fatForm, setFatForm] = useState({
    IdFat: '',
    lat: '',
    lng: '',
    description: '',
    totalPorts: 4,
  });
  const [openModal, setOpenModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [editFat, setEditFat] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [fatToDelete, setFatToDelete] = useState(null);

  useEffect(() => {
    const fetchFats = async () => {
      const { data, error } = await supabase
        .from('fats')
        .select('*');

      if (error) {
        console.error('Error fetching FATs:', error);
        return;
      }

      console.log('Fetched FATs from Supabase:', data);
      setFats(data);
      // setMarkers(data);
    };


    fetchFats();
  }, [setMarkers, setFats]);

  const handleFileUpload = (e) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      console.log('Excel data:', json);

      for (const row of json) {
        const lat = Number(row['LATITUD DEL FAT'].replace(',', '.'));
        console.log('Latitude from excel', lat)
        const lng = parseFloat(row['LONGITUD DEL FAT']);
        console.log('Longitude from excel', lng)
        const nombreApellido = row['NOMBRE Y APELLIDO'] || '';
        const cedulaRiff = row['CEDULA/RIFF'] || '';
        const telefono = row['TELEFONO'] || '';

        const totalPortsString = row['2ºNivel de SPLlitter'] || '';
        const totalPortsMatch = totalPortsString.match(/\((\d+):(\d+)\)/);
        const totalPorts = totalPortsMatch ? parseInt(totalPortsMatch[2], 10) : 0;

        // Check if FAT already exists in Supabase
        const { data: existingFat, error } = await supabase
          .from('fats')
          .select('*')
          .eq('lat', lat)
          .eq('lng', lng);

        if (error) {
          console.error('Error checking for existing FAT:', error);
          continue; // Skip to the next row
        }

        if (existingFat && existingFat.length > 0) {
          console.log('FAT already exists:', row['NOMBRE FAT']);
          continue; // Skip to the next row
        }

        // Create new FAT object
        const newFat = {
          IdFat: row['NOMBRE FAT'],
          lat: lat,
          lng: lng,
          description: row['DESCRIPCION'] || '',
          totalPorts: totalPorts,
        };

        // Insert new FAT into Supabase
        const { data: insertedFat, error: insertError } = await supabase
          .from('fats')
          .insert([newFat]);

        if (insertError) {
          console.error('Error inserting FAT:', insertError, newFat);
          continue; // Skip to the next row
        }

        console.log('Inserted FAT:', insertedFat);

        setFats((prevFats) => [...prevFats, newFat]);
        console.log('New FAT added to state:', newFat);
        // setMarkers((prevMarkers) => [...prevMarkers, newFat]);
      }
    };

    reader.readAsArrayBuffer(file);
    console.log('File reading started');
  };

  const addFat = async (e) => {
    e.preventDefault();

     // Check if FAT already exists in Supabase
     const { data: existingFat, error } = await supabase
     .from('fats')
     .select('*')
     .eq('lat', fatForm.lat)
     .eq('lng', fatForm.lng);

   if (error) {
     console.error('Error checking for existing FAT:', error);
     return;
   }

   if (existingFat && existingFat.length > 0) {
    toast.error('Estas coordenadas ya están registradas con un FAT');
     console.log('FAT already exists:', fatForm.IdFat);
     return;
   }

    // Insert new FAT into Supabase
    const { data: insertedFat, error: insertError } = await supabase
      .from('fats')
      .insert([fatForm]);

    if (insertError) {
      console.error('Error inserting FAT:', insertError, fatForm);
      toast.error('Error adding FAT');
      return;
    }

    console.log('Inserted FAT:', insertedFat);
    setFats([...fats, fatForm]);
    // setMarkers(prevMarkers => [...prevMarkers, fatForm]);
    toast.success('FAT agregar dorrectamente.');
    setFatForm({ IdFat: '', lat: '', lng: '', description: '', totalPorts: 4 });
    setOpenModal(false);
    setEditFat(null);
  };

  const handleEditFat = async (e) => {
    e.preventDefault();



  console.log('Attempting to update FAT with IdFat:', fatForm.IdFat, 'Data:', fatForm);
    const { data, error } = await supabase
      .from('fats')
      .update(fatForm)
      .eq('id', fatForm.id)
      .select()

    console.log('Supabase update result:', data, error);
    if (error) {
      console.error('Error updating FAT:', error);
      return;
    }
    console.log('Updated FAT:', data);

    setFats(fats.map((fat) => (fat.id === fatForm.id ? fatForm : fat)));
    toast.success('FAT editado correctamente.');
     console.log('Success Toast should be showing up');
    setOpenModal(false);
    setFatForm({ IdFat: '', lat: '', lng: '', description: '', totalPorts: 4 });
  };
  const handleDeleteFat = (fat) => {
    setFatToDelete(fat);
    setDeleteConfirmationOpen(true);
  };

  const handleConfirmDelete = async () => {
    const { error } = await supabase
      .from('fats')
      .delete()
      .eq('IdFat', fatToDelete.IdFat);

    if (error) {
      console.error('Error deleting FAT:', error);
    } else {
      setFats(fats.filter((f) => f.IdFat !== fatToDelete.IdFat));
      // setMarkers(markers.filter((marker) => marker.IdFat !== fatToDelete.IdFat));
      toast.success('FAT eliminado correctaente.');
    }

    setDeleteConfirmationOpen(false);
    setFatToDelete(null);
  };

  const columns = [
    { field: 'IdFat', headerName: 'ID FAT', width: 120 },
    { field: 'description', headerName: 'Descripción', width: 200 },
    { field: 'totalPorts', headerName: 'Número de Puertos', width: 180 },
    { field: 'lat', headerName: 'Latitud', width: 150 },
    { field: 'lng', headerName: 'Longitud', width: 150 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      renderCell: (params) => (
        <>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => handleEdit(params.row)}
          >
            ✎
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={() => handleDeleteFat(params.row)}
          >
            🗑
          </Button>
        </>
      ),
    },
  ];


  const handleEdit = (fat) => {
    setFatForm(fat);
    setOpenModal(true);
  };
  return (
    <Box>
      <Button variant="contained" color="primary" onClick={() => setOpenModal(true)}>
        Agregar FAT
      </Button>

       <Button variant="contained" component="label">
        Subir archivo Excel
        <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileUpload} />
      </Button>

      <Modal open={openModal} onClose={() => {setOpenModal(false); setFatForm({ IdFat: '', lat: '', lng: '', description: '', totalPorts: 4 });}}>
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
          <Typography variant="h6">{fatForm.IdFat ? 'Editar FAT' : 'Agregar FAT'}</Typography>
          <form onSubmit={fatForm.IdFat ? handleEditFat : addFat}>
            <TextField
              label="ID FAT"
              value={fatForm.IdFat}
              onChange={(e) => setFatForm({ ...fatForm, IdFat: e.target.value })}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Latitud"
              value={fatForm.lat}
              onChange={(e) => setFatForm({ ...fatForm, lat: e.target.value })}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Longitud"
              value={fatForm.lng}
              onChange={(e) => setFatForm({ ...fatForm, lng: e.target.value })}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Descripción"
              value={fatForm.description}
              onChange={(e) => setFatForm({ ...fatForm, description: e.target.value })}
              fullWidth
              margin="normal"
              required
            />
            <FormControl fullWidth required margin="normal">
              <InputLabel>Número de Puertos</InputLabel>
              <Select
                value={fatForm.totalPorts}
                onChange={(e) => setFatForm({ ...fatForm, totalPorts: e.target.value })}
              >
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={16}>16</MenuItem>
                <MenuItem value={32}>32</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary">
              {fatForm.IdFat ? 'Guardar Cambios' : 'Agregar FAT'}
            </Button>
          </form>
        </Box>
      </Modal>
      <Typography variant="h6" sx={{ mt: 4 }}>Lista de FATs</Typography>
      <div style={{ height: 400, width: '100%', marginTop: '20px' }}>
        <DataGrid
          getRowId={(row) => row.IdFat}
          rows={fats}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          checkboxSelection
        />
      </div>
      <Dialog
        open={deleteConfirmationOpen}
        onClose={() => setDeleteConfirmationOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que quieres eliminar este FAT?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmationOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="primary">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Fats;