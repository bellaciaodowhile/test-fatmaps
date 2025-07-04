import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Modal, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, redirect } from 'react-router-dom';
const SUPABASE_URL = 'https://rwrzvwamfgeuqizewhac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cnp2d2FtZmdldXFpemV3aGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjczNTAsImV4cCI6MjA2NzE0MzM1MH0.Y4-F12FQdpTXhFl-gRrZkcjREiKf2Eu99IxHSS0E0XQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const generateUUID = () => {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
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
  const [modal, setModal] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [editFat, setEditFat] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [fatToDelete, setFatToDelete] = useState(null);
  const [importResults, setImportResults] = useState([]);
  const [showImportResultsModal, setShowImportResultsModal] = useState(false);
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();
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

    if (!localStorage.getItem('session')) {
      navigate('/')
      return redirect ;
    }
  }, [setMarkers, setFats]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    console.log(file)

    reader.onload = async (event) => {
      console.log('Hola')
      console.log(event)
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
          console.log(file)
          e.target.value = ''
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
        toast.success('Se ha realizado la importación correctamente.');
        console.log('New FAT added to state:', newFat);
        // setMarkers((prevMarkers) => [...prevMarkers, newFat]);
      }
      e.target.value = ''
    };
    // reader.abort();
    reader.readAsArrayBuffer(file);
    console.log(file)

    console.log('File reading started');
        setShowImportResultsModal(true);
  };

  const addFat = async (e) => {
      e.preventDefault();
      
      // Verificar que fatForm tenga todos los campos necesarios
      if (!fatForm.IdFat || !fatForm.lat || !fatForm.lng || !fatForm.description) {
          toast.error('Por favor, completa todos los campos requeridos.');
          return;
      }

      // Verificar que lat y lng sean números
      if (isNaN(fatForm.lat) || isNaN(fatForm.lng)) {
          toast.error('La latitud y longitud deben ser valores numéricos.');
          return;
      }

      // Comprobar si el FAT ya existe en Supabase
      const { data: existingFat, error: checkError } = await supabase
          .from('fats')
          .select('*')
          .eq('lat', parseFloat(fatForm.lat)) // Asegúrate de convertir a número
          .eq('lng', parseFloat(fatForm.lng)); // Asegúrate de convertir a número

      if (checkError) {
          console.error('Error checking for existing FAT:', checkError);
          toast.error('Error al verificar si el FAT ya existe.');
          return;
      }

      if (existingFat.length > 0) {
          toast.error('Estas coordenadas ya están registradas con un FAT');
          return;
      }

      // Insertar nuevo FAT en Supabase
      const { data: insertedFat, error: insertError } = await supabase
          .from('fats')
          .insert([fatForm]);

      if (insertError) {
          console.error('Error inserting FAT:', insertError);
          toast.error('Error al agregar el FAT');
          return;
      }

      // Si llegamos aquí, la inserción fue exitosa
      console.log('Inserted FAT:', insertedFat);
      
      // Función para obtener los FATs actualizados
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
      };

      fetchFats();
      toast.success('FAT agregado correctamente.');
      setFatForm({ IdFat: '', lat: '', lng: '', description: '', totalPorts: 4 });
      setOpenModal(false);
      setEditFat(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = null;
      }
  };

  const handleEditFat = async (e) => {
      e.preventDefault();

      // Verificar que fatForm tenga todos los campos necesarios
      if (!fatForm.IdFat || !fatForm.lat || !fatForm.lng || !fatForm.description) {
          toast.error('Por favor, completa todos los campos requeridos.');
          return;
      }

      // Validar que lat y lng sean números
      if (isNaN(fatForm.lat) || isNaN(fatForm.lng)) {
          toast.error('La latitud y longitud deben ser valores numéricos.');
          return;
      }

      console.log('Attempting to update FAT with IdFat:', fatForm.IdFat, 'Data:', fatForm);
      
      const { data, error } = await supabase
          .from('fats')
          .update(fatForm)
          .eq('id', fatForm.id) // Asegúrate de que fatForm.id esté definido
          .select();

      if (error) {
          console.error('Error updating FAT:', error);
          toast.error('Error al editar el FAT');
          return;
      }

      console.log('Updated FAT:', data);

      // Función para obtener los FATs actualizados
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
      toast.success('FAT editado correctamente.');
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
    { field: 'IdFat', headerName: 'ID', width: 50 },
    { field: 'fat_unique', headerName: 'FAT', width: 100 },
    { field: 'description', headerName: 'Descripción', width: 100 },
    { field: 'totalPorts', headerName: 'Número de Puertos', width: 50 },
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
    setModal('edit');
  };
  return (
    <Box>
      <Button variant="contained" color="primary" onClick={() => {setOpenModal(true); setModal('add')}}>
        Agregar FAT
      </Button>

      {/* <Button variant="contained" component="label">
        Subir archivo Excel
        <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileUpload} />
      </Button> */}

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
          <Typography variant="h6">{modal != 'add' ? 'Editar FAT' : 'Agregar FAT'}</Typography>
          <form onSubmit={modal != 'add' ? handleEditFat : addFat}>
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
              {modal != 'add' ? 'Guardar Cambios' : 'Agregar FAT'}
            </Button>
          </form>
        </Box>
      </Modal>
      <Typography variant="h6" sx={{ mt: 4 }}>Lista de FATs</Typography>
      <div style={{ height: 400, width: '100%', marginTop: '20px' }}>
        <DataGrid
          showToolbar
          getRowId={(row) => row.IdFat}
          rows={fats}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          checkboxSelection
        />
      </div>
       <Dialog
        open={showImportResultsModal}
        onClose={() => setShowImportResultsModal(false)}
      >
        <DialogTitle>Resultados de la Importación</DialogTitle>
        <DialogContent>
          {importResults.length > 0 ? (
            <ul>
              {importResults.map((result, index) => (
                <li key={index}>
                  {result.IdFat} - {result.success ? 'Importado' : 'Ya existe'}
                </li>
              ))}
            </ul>
          ) : (
            <p>No se importaron datos.</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportResultsModal(false)} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
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