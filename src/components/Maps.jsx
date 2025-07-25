import React, { useState, useEffect } from 'react';
import { useParams, useLocation, redirect, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as XLSX from 'xlsx'; 
import { createClient } from '@supabase/supabase-js';
import 'leaflet-control-geocoder';
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
import { ToastContainer, toast } from 'react-toastify';

const SUPABASE_URL = 'https://qmzmznpbpvonegajtavg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtem16bnBicHZvbmVnYWp0YXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMjE5NjMsImV4cCI6MjA2NTU5Nzk2M30.YkJmlrS_55zqdJ-Iu9esXJO56LfJwg-itB6IwGUJnA8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to calculate splitter status for a FAT
const calculateSplitterStatus = (marker) => {
  if (!marker?.clientes || !marker.totalPorts) return { status: 'empty', splitters: [] };
  
  // Group clients by splitter
  const splitterGroups = {};
  marker.clientes.forEach(cliente => {
    if (cliente.splitter) {
      if (!splitterGroups[cliente.splitter]) {
        splitterGroups[cliente.splitter] = [];
      }
      splitterGroups[cliente.splitter].push(cliente);
    }
  });
  
  // Calculate status for each splitter
  const splitters = Object.keys(splitterGroups).map(splitter => {
    const clientsInSplitter = splitterGroups[splitter];
    const isFull = clientsInSplitter.length >= marker.totalPorts;
    const available = marker.totalPorts - clientsInSplitter.length;
    return {
      name: splitter,
      clients: clientsInSplitter.length,
      total: marker.totalPorts,
      available,
      isFull
    };
  });
  
  // Determine overall status
  const allSplittersFull = splitters.length > 0 && splitters.every(s => s.isFull);
  const someSplittersFull = splitters.some(s => s.isFull);
  const hasClients = splitters.length > 0;
  
  let status = 'empty';
  if (allSplittersFull) status = 'full';
  else if (someSplittersFull || hasClients) status = 'partial';
  
  return { status, splitters };
};

const createMarkerIcon = (status) => {
  let iconUrl;
  switch (status) {
    case 'full':
      iconUrl = 'https://static.vecteezy.com/system/resources/previews/013/760/669/non_2x/map-location-pin-icon-in-red-colors-png.png';
      break;
    case 'partial':
      iconUrl = 'https://cdn-icons-png.freepik.com/512/12522/12522440.png';
      break;
    default:
      iconUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Map_pin_icon_green.svg/752px-Map_pin_icon_green.svg.png';
  }
  
  return L.icon({
    iconUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const center = {
  lat: 7.872182986252612,
  lng: -67.4889908730983
};
const MAP_ZOOM = 17;
const MapComponent = () => {
  const [availablePorts, setAvailablePorts] = useState([]);
  const [openAssignFatModal, setOpenAssignFatModal] = useState(false);
  const [clientsWithoutFat, setClientsWithoutFat] = useState([]); // Para almacenar los clientes sin FAT
  const [selectedClientId, setSelectedClientId] = useState(''); // Para almacenar el cliente seleccionado
  const [clientToAssign, setClientToAssign] = useState(null); // Almacena el cliente seleccionado
  const [selectedFatId, setSelectedFatId] = useState(''); // Almacena el FAT seleccionado
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fatList, setFatList] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isOpenGeocoding, setIsOpenGeocoding] = useState(false); 
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMarkers, setFilteredMarkers] = useState([]);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFat, setSelectedFat] = useState(''); // Estado para el FAT de destino
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null); // Estado para almacenar el cliente seleccionado para eliminar el fat_id
  const [clientForm, setClientForm] = useState({
    id: '',
    name: '',
    userType: 'RESIDENCIAL',
    direccion: 'No registrada',
    dni: '',
    fat_id: '',
    telefono: '',
    port: '',
    splitter: ''
  });
  const mapRef = React.useRef();

  // Estado para splitters disponibles según el FAT seleccionado
  const [availableSplitters, setAvailableSplitters] = useState([]);

  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const lat = query.get('lat');
  const lng = query.get('lng');
  let currentCircle = null; // Variable para almacenar el círculo actual
  async function runMap(lat, lng) {
      try {
          const mapa = await mapRef; // Espera a que mapRef se resuelva
          if (lat && lng) {
              console.log(mapa.current);
              mapa.current.flyTo([parseFloat(lat), parseFloat(lng)], MAP_ZOOM);
              
              // Si ya existe un círculo, eliminarlo
              if (currentCircle) {
                  currentCircle.remove(); // Eliminar el círculo anterior
              }

              // Crear un nuevo círculo de 50 metros de radio
              currentCircle = L.circle([parseFloat(lat), parseFloat(lng)], {
                  color: 'blue',
                  radius: 10 // Radio en metros
              }).addTo(mapa.current); // Añadir el círculo al mapa
          }
      } catch (error) {
          console.error("Error al obtener mapRef:", error);
      }
  }
  // Llama a la función con las coordenadas deseadas
  runMap(lat, lng);
  const navigate = useNavigate();
  useEffect(() => {
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
    if (!localStorage.getItem('session')) {
      navigate('/')
      return redirect ;
    }
  }, []);

  const handleFileUpload = async (event) => {
    setLoading(true); // Muestra el preloader
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet);
        const totalRows = json.length; // Total de filas a procesar
        const newMarkers = [];
        const clientesMap = {};
        let processedRows = 0; // Contador de filas procesadas
        console.log(json);
        // return

        for (const row of json) {
            const lat = row['LATITUD DEL FAT'];
            const lng = row['LONGITUD DEL FAT'];
            const nombreCliente = row['NOMBRE Y APELLIDO'];
            const FAT_UNIQUE = row['FAT'];
            const splitter = row['SPLITTER'];

            console.log({ lat, lng });

            if (lat && lng) {
                const latNum = String(lat.replace(',', '.'));
                const lngNum = String(lng) + '0';
                const totalPortsString = row['2ºNivel de SPLlitter'] || '';
                const totalPortsMatch = totalPortsString.match(/\((\d+):(\d+)\)/);
                const totalPorts = totalPortsMatch ? parseInt(totalPortsMatch[2], 10) : 0;

                console.log({ latNum, lngNum });

                const { data: existingFats, error: fetchError } = await supabase
                    .from('fats')
                    .select('*')
                    .eq('lat', latNum)
                    .eq('lng', lngNum);

                if (fetchError) {
                    console.error('Error al verificar FAT existente:', fetchError);
                    continue;
                }

                let fatId;
                if (existingFats.length === 0) {
                    const { data: fatData, error } = await supabase
                        .from('fats')
                        .insert([{
                            IdFat: row['NOMBRE FAT'],
                            lat: latNum,
                            lng: lngNum,
                            description: row['DESCRIPCION'],
                            totalPorts: totalPorts,
                            fat_unique: FAT_UNIQUE,
                        }])
                        .select()

                        console.log({
                          type:'aqui',
                          fatData,
                        })

                    if (error) {
                        console.error('Error al insertar FAT en Supabase:', error);
                    } else if (fatData && fatData.length > 0) {
                        fatId = fatData[0].id;
                        newMarkers.push({
                            id: fatId,
                            IdFat: row['NOMBRE FAT'],
                            lat: latNum,
                            lng: lngNum,
                            fat_unique: FAT_UNIQUE,
                            description: row['DESCRIPCION'],
                            totalPorts: totalPorts,
                            clientes: []
                        });
                    }
                } else {
                    fatId = existingFats[0].id;
                    console.log(`El FAT con coordenadas (${latNum}, ${lngNum}) ya existe.`);
                }

                const tipoUsuario = row['TIPO_USUARIO'];
                if (nombreCliente) {
                    const cedulaRiff = row['CEDULA/RIFF'];
                    const { data: existingClientes, error: clienteFetchError } = await supabase
                        .from('clientes')
                        .select('*')
                        .eq('cedulaRiff', cedulaRiff);

                    if (clienteFetchError) {
                        console.error('Error al verificar cliente existente:', clienteFetchError);
                        continue;
                    }

                    if (existingClientes.length === 0) {
                        const cliente = {
                            nombreApellido: nombreCliente,
                            cedulaRiff: cedulaRiff,
                            telefono: row['TELEFONO'],
                            tipoUsuario: tipoUsuario,
                            fat_id: fatId,
                            port: row['PUERTO'],
                            splitter: row['SPLITTER'],
                        };

                        const { error: clienteError } = await supabase
                            .from('clientes')
                            .insert([cliente]);

                        if (clienteError) {
                            console.error('Error al insertar cliente en Supabase:', clienteError);
                        } else {
                            console.log(`Cliente ${nombreCliente} registrado exitosamente para FAT ID: ${fatId}`);
                            if (!clientesMap[fatId]) {
                                clientesMap[fatId] = [];
                            }
                            clientesMap[fatId].push(cliente);
                        }
                    } else {
                        console.log(`El cliente con cedulaRiff ${cedulaRiff} ya existe.`);
                    }
                }

                processedRows++; // Incrementar el contador de filas procesadas
                console.log(`Procesando fila ${processedRows} de ${totalRows}`); // Mostrar progreso
                setProgress(`Procesando fila ${processedRows} de ${totalRows}`);
            } else {
                console.log(`Fila vacía o incompleta, no se procesará: ${JSON.stringify(row)}`);
            }
        }

        newMarkers.forEach(marker => {
            if (clientesMap[marker.id]) {
                marker.clientes = clientesMap[marker.id];
            }
        });

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
            console.log(fatsWithClients);
            setMarkers(fatsWithClients);
            setFilteredMarkers(fatsWithClients);
        };

        await fetchMarkers();
        setMarkers(prevMarkers => [...prevMarkers, ...newMarkers]);
        setFilteredMarkers(prevMarkers => [...prevMarkers, ...newMarkers]);
        setLoading(false); // Oculta el preloader después de cargar los datos
        setProgress('Carga completada'); // Mensaje de finalización
    };

    reader.readAsArrayBuffer(file);
};

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
      console.log(fatsWithClients);
      setMarkers(fatsWithClients);
      setFilteredMarkers(fatsWithClients);
  };
  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };



  const handleSidebarClick = (marker) => {
      const lat = parseFloat(marker.lat);
      const lng = parseFloat(marker.lng);
      
      // Verifica que lat y lng sean números válidos
      if (!isNaN(lat) && !isNaN(lng)) {
          // Reinicia el círculo anterior si existe
          markers.map(fat => {
            mapRef.current.eachLayer(layer => {
              if (layer instanceof L.Circle) {
                mapRef.current.removeLayer(layer);
              }
            });
          })
          if (currentCircle) {
              currentCircle.remove(); // Elimina el círculo anterior
          }

          setSelectedMarker(marker);
          mapRef.current.flyTo([lat, lng], MAP_ZOOM);

          // Crear un nuevo círculo de 10 metros de radio
          currentCircle = L.circle([lat, lng], {
              color: 'blue',
              radius: 10 // Radio en metros
          }).addTo(mapRef.current); // Añadir el círculo al mapa
      } else {
          console.error('Latitud o longitud inválida:', marker.lat, marker.lng);
          alert('Este FAT no tiene coordenadas registradas.');
      }
  };

 const handleSearch = (term) => {
    setSearchTerm(term);
    const filtered = markers.filter(marker => {
      const matchesFat = marker.fat_unique.toLowerCase().includes(term.toLowerCase());
      const matchesClient = marker.clientes && marker.clientes.some(cliente => 
        cliente.nombreApellido.toLowerCase().includes(term.toLowerCase())
      );
      return matchesFat || matchesClient;
    });
    setFilteredMarkers(filtered);
  };

  const handleGeocode = (address) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=jsonv2`;

    // Eliminar los marcadores existentes del mapa
    geocodeResults.forEach(marker => {
      console.log(marker)
        mapRef.current.removeLayer(marker.marker); // Asegúrate de que 'marker.marker' sea el objeto correcto
    });

    console.log(geocodeResults);
    setGeocodeResults([]);
    setIsLoading(true); // Iniciar el preloader

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la red');
        }
        return response.json();
      })
      .then(results => {
        if (results && results.length > 0) {
          const markers = results.map(result => {
            const { lat, lon, display_name } = result;
            const newMarker = L.marker([lat, lon]).addTo(mapRef.current); // Crear el marcador y añadirlo al mapa
            return {
              id: generateUUID(),
              IdFat: display_name,
              lat,
              lng: lon,
              description: 'Ubicación buscada',
              totalPorts: 0,
              clientes: [],
              fat_unique: display_name.match(/\d+/)?.[0], // Extraer el número del fat_unique
              marker: newMarker // Guardar referencia del marcador
            };
          });
          setGeocodeResults(markers); // Actualiza los resultados de geocodificación con todos los marcadores

          // Opcional: Si deseas centrar el mapa en el primer resultado
          const { lat, lon } = results[0];
          mapRef.current.flyTo([lat, lon], MAP_ZOOM);
        } else {
          // alert('No se encontró la dirección. Por favor, intenta con otro formato.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Ocurrió un error al buscar la dirección.');
      }).finally(() => {
        setIsLoading(false); // Detener el preloader
      });
  }

  const generateUUID = () => {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
  };

  const findNearestFAT = (lat, lng) => {
  let nearestFAT = null;
  let shortestDistance = Infinity;

  markers.forEach(fat => {
    const fatLat = parseFloat(fat.lat); // Asegúrate de que la propiedad de latitud sea correcta
    const fatLng = parseFloat(fat.lng); // Asegúrate de que la propiedad de longitud sea correcta

    // Calcular la distancia utilizando la fórmula de Haversine
    const distance = Math.sqrt(Math.pow(fatLat - lat, 2) + Math.pow(fatLng - lng, 2));

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestFAT = fat;
    }
  });

  return nearestFAT;
};

function haversineDistance(coords1, coords2) {
  console.log({
    type: 'test',
    data: {
      coords1,
      coords2
    }
  })
    const toRad = (value) => (Math.PI / 180) * value;

    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(coords1.latitude)) * Math.cos(toRad(coords2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en kilómetros
}

 const handleOpenModal = (client) => {
     if (client) {
       setClientForm({
         id: client.id,
         name: client.nombreApellido, // Asegúrate de que el nombre coincida
         userType: client.tipoUsuario, // Asegúrate de que el nombre coincida
         address: client.direccion || 'No registrada',
         dni: client.cedulaRiff, // Asegúrate de que el nombre coincida
       });
       setIsEditing(true);
     } else {
       setClientForm({ id: '', name: '', userType: '', address: '', dni: '' });
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
              })
              .eq('id', clientForm.id);
              toast.success('Operación realizada satisfactoriamente.');
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
                  fat_id: clientForm.fat_id, // Cambia a cedulaRiff
                  telefono: clientForm.telefono, // Cambia a cedulaRiff
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
      handleCloseModal();
  };

  const handleDeleteClient = (clientId) => {
    setClientToDelete(clientId); // Almacena el ID del cliente que se va a eliminar
    setIsDeleteConfirmOpen(true); // Abre el diálogo de confirmación
  };

  const handleOpenAssignFatModal = async () => {
    // Obtener los clientes sin FAT
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .is('fat_id', null); // Filtrar clientes sin FAT

    if (error) {
        console.error('Error al obtener clientes sin FAT:', error);
        return;
    }

    setClientsWithoutFat(data); // Almacena los clientes sin FAT
    setOpenAssignFatModal(true); // Abre el modal
};

    const handleCloseAssignFatModal = () => {
        setOpenAssignFatModal(false); // Cierra el modal
        setSelectedClientId(''); // Limpia el cliente seleccionado
        setSelectedFatId(''); // Limpia el FAT seleccionado
    };

    // Modificar handleFatChange para sugerir splitters F{N}.1 y F{N}.2 automáticamente
    const handleFatChange = (fatId) => {
      const selectedFat = markers.find(fat => fat.id == fatId);
      if (selectedFat) {
        // Solo splitters de este FAT
        let splitters = [...new Set((selectedFat.clientes || []).map(cliente => cliente.splitter).filter(Boolean))];
        // Sugerir F{N}.1 y F{N}.2 solo para este FAT usando fat_unique
        const fatNumber = selectedFat.fat_unique.match(/\d+/)?.[0];
        if (fatNumber) {
          const s1 = `F${fatNumber}.1`;
          const s2 = `F${fatNumber}.2`;
          if (!splitters.includes(s1)) splitters.push(s1);
          if (!splitters.includes(s2)) splitters.push(s2);
          // Solo mostrar F{N}.1 y F{N}.2 y los que existan para este FAT
          splitters = splitters.filter(s => s === s1 || s === s2 || (s.startsWith(`F${fatNumber}.`)));
        }
        setAvailableSplitters(splitters);
        setClientForm({ ...clientForm, fat_id: fatId, splitter: '', port: '' });
        setAvailablePorts([]);
      } else {
        setAvailableSplitters([]);
        setAvailablePorts([]);
        setClientForm({ ...clientForm, fat_id: fatId, splitter: '', port: '' });
      }
    };

    // Modificar handleSplitterChange para mostrar disponibilidad de puertos
    const handleSplitterChange = (splitter) => {
      const selectedFat = markers.find(fat => fat.id == clientForm.fat_id);
      if (selectedFat) {
        // Filtrar clientes de este FAT y splitter
        const clientesEnSplitter = (selectedFat.clientes || []).filter(cliente => cliente.splitter === splitter);
        const totalPorts = selectedFat.totalPorts || 0;
        const occupiedPorts = clientesEnSplitter.map(cliente => cliente.port);
        // Generar puertos disponibles para este splitter
        const allPorts = Array.from({ length: totalPorts }, (_, i) => `P${(i < 10 ? `0${i+1}` : i+1)}`)
          .filter(port => !occupiedPorts.includes(port));
        setAvailablePorts(allPorts);
        setClientForm({ ...clientForm, splitter, port: '' }); // Limpiar puerto al cambiar splitter
      } else {
        setAvailablePorts([]);
        setClientForm({ ...clientForm, splitter, port: '' });
      }
    };

 


  return (
    <div className='flex'>
      <div className='w-1/4 bg-white shadow-2xl p-4 h-screen overflow-y-auto'>
        <h2 className='text-lg font-bold mb-4'>FATS</h2>
        <Button variant="contained" className='w-full font-bold' color="primary" onClick={() => handleOpenModal(null)}>
          nuevo cliente
        </Button>
        <div className='mt-4'></div>
        <Button variant="contained" className='w-full font-bold' color="primary" onClick={handleOpenAssignFatModal}>Asignar FAT</Button>
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
                            required
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
                            onChange={(e) => handleFatChange(e.target.value)}
                        >
                            {markers?.map((fat) => {
                              const status = calculateSplitterStatus(fat).status;
                              // Show FATs that are not completely full
                              if (status !== 'full') {
                                return (
                                  <MenuItem key={fat.id} value={fat.id}>
                                    {fat.fat_unique} - {fat.IdFat} ({status === 'partial' ? 'Parcial' : 'Disponible'})
                                  </MenuItem>
                                );
                              }
                              return null;
                            })}
                        </Select>
                    </FormControl>

                    {/* Nuevo select para splitter */}
                    <FormControl fullWidth required margin="normal" disabled={!clientForm.fat_id}>
                        <InputLabel>Splitter</InputLabel>
                        <Select
                            required
                            value={clientForm.splitter}
                            onChange={(e) => handleSplitterChange(e.target.value)}
                        >
                            {/* Mostrar splitters sugeridos y su disponibilidad */}
                            {availableSplitters.map(splitter => {
                              const selectedFat = markers.find(fat => fat.id == clientForm.fat_id);
                              const clientesEnSplitter = selectedFat ? (selectedFat.clientes || []).filter(cliente => cliente.splitter === splitter) : [];
                              const totalPorts = selectedFat ? selectedFat.totalPorts : 0;
                              const used = clientesEnSplitter.length;
                              const available = totalPorts - used;
                              return (
                                <MenuItem key={splitter} value={splitter}>
                                  {splitter} ({available} disponibles)
                                </MenuItem>
                              );
                            })}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required margin="normal" disabled={!clientForm.splitter}>
                        <InputLabel>Puerto</InputLabel>
                        <Select
                            required
                            value={clientForm.port}
                            onChange={(e) => setClientForm({ ...clientForm, port: e.target.value })}
                        >
                            {availablePorts.map((port) => (
                                <MenuItem key={port} value={port}>{port}</MenuItem>
                            ))}
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
        {/* Asignacion de FAT */}
        <Modal open={openAssignFatModal} onClose={handleCloseAssignFatModal}>
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
                <Typography variant="h6">Asignar FAT</Typography>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    // Lógica para asignar el FAT al cliente
                    try {
                        const { data, error } = await supabase
                            .from('clientes')
                            .update({ fat_id: selectedFatId, port: clientForm?.port }) // Actualiza el fat_id del cliente
                            .eq('id', selectedClientId); // Filtra por el id del cliente

                        if (error) {
                            console.error('Error al asignar el FAT:', error);
                            toast.error('Error al asignar el FAT');
                        } else {
                            toast.success('FAT asignado correctamente');
                            console.log(`FAT ${selectedFatId} asignado al cliente con ID ${selectedClientId}`);
                            setClientForm({ id: '', name: '', userType: '', address: '', dni: '' });
                            await fetchMarkers();
                        }
                    } catch (error) {
                        console.error('Error al realizar la operación:', error);
                    } finally {
                        handleCloseAssignFatModal(); // Cierra el modal
                    }
                }}>
                    <FormControl fullWidth required margin="normal">
                        <InputLabel>Cliente</InputLabel>
                        <Select
                            required
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                        >
                            {clientsWithoutFat.map((client) => (
                                <MenuItem key={client.id} value={client.id}>
                                    {client.nombreApellido}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required margin="normal">
                        <InputLabel>FAT</InputLabel>
                        <Select
                            required
                            value={selectedFatId}
                            onChange={(e) => {
                              const selectedFatId = e.target.value;
                              handleFatChange(selectedFatId); // Actualizar puertos disponibles al cambiar de FAT
                              setSelectedFatId(e.target.value)
                            }}
                        >
                            {markers?.map((fat) => {
                              const status = calculateSplitterStatus(fat).status;
                              // Show FATs that are not completely full
                              if (status !== 'full') {
                                return (
                                  <MenuItem key={fat.id} value={fat.id}>
                                    {fat.fat_unique} - {fat.IdFat} ({status === 'partial' ? 'Parcial' : 'Disponible'})
                                  </MenuItem>
                                );
                              }
                              return null;
                            })}
                        </Select>
                    </FormControl>

                    {/* Nuevo campo para seleccionar puertos disponibles */}
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

                    <Button type="submit" variant="contained" color="primary">
                        Asignar FAT
                    </Button>
                </form>
            </Box>
        </Modal>
        <div className='mb-4'>
          <input
            type='file'
            accept='.xlsx, .xls'
            onChange={handleFileUpload}
            className='hidden'
            id='file-upload'
          />
          <label htmlFor='file-upload' className='w-full p-2 mt-4 text-center bg-blue-500 text-white font-bold uppercase rounded cursor-pointer hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 inline-block text-md'>
            Importar Excel
          </label>
          {/* {loading && 
          <div className="preloader">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle fill="#1E17FF" stroke="#1E17FF" stroke-width="12" r="15" cx="40" cy="100"><animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate></circle><circle fill="#1E17FF" stroke="#1E17FF" stroke-width="12" r="15" cx="100" cy="100"><animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate></circle><circle fill="#1E17FF" stroke="#1E17FF" stroke-width="12" r="15" cx="160" cy="100"><animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate></circle></svg>
          </div>} */}
          {loading && <div>{progress}</div>}
          <h4 className='uppercase text-xs my-1 font-bold text-gray-500'>importarás fats con sus respectivos clientes.</h4>
        </div>
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Buscar FAT´s...'
            className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <ul>
          {filteredMarkers.map((marker, index) => (
            <li
              key={`filtered-marker-${index}`}
              className='cursor-pointer mb-2 p-2 rounded-lg hover:bg-blue-100 transition duration-200 font-semibold flex items-center gap-2'
              onClick={() => {
                handleSidebarClick(marker);
                handleMarkerClick(marker);
              }}
            >
              <span className={`w-[10px] h-[10px] ${calculateSplitterStatus(marker).status === 'full' ? 'bg-red-500' : calculateSplitterStatus(marker).status === 'partial' ? 'bg-yellow-500' : 'bg-green-500'} rounded-full inline-block`}></span> {marker.fat_unique}             
            </li>
          ))}
        </ul>
      </div>
      <div className='relative w-3/4'>
        <MapContainer center={center} zoom={16} style={{ height: '100vh', width: '100%' }} ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=''
          />
          {markers.map((marker, index) => (
            <Marker
              key={`marker-map-${index}`}
              position={{ lat: marker.lat, lng: marker.lng }}
              icon={createMarkerIcon(calculateSplitterStatus(marker).status)}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              {/* selectedMarker.id == marker.id && */}
              {selectedMarker &&  (
                <Popup onClose={() => setSelectedMarker(null)}>
                    <div className='max-h-[500px] overflow-y-auto overflow-x-hidden'>
                        <strong className='text-xl'>{marker.fat_unique}</strong>
                        <h5 className='font-bold mb-2'>Coordenadas</h5>
                        <span className='font-bold'>LAT: {marker.lat} <br /> LONG: {marker.lng}</span>
                        <h5 className='font-bold mt-2'>Información general:</h5>
                        <ul className='pl-5 list-disc mb-2 min-w-[281px]'>
                            <li className='mt-2'><strong>Nombre FAT:</strong> {marker.IdFat}</li>
                            <li><strong>Puertos:</strong> {marker.totalPorts}</li>
                            <li><strong>Puertos en uso:</strong> {marker?.clientes?.length > 0 ? marker?.clientes?.length : 0}</li>
                            <li><strong>Estado:</strong> <span className={`text-xs uppercase rounded-full w-3 h-3 inline-flex -mb-[1px] mr-[2px] ${calculateSplitterStatus(marker).status === 'full' ? 'bg-red-500' : calculateSplitterStatus(marker).status === 'partial' ? 'bg-yellow-500' : 'bg-green-500'}`}></span><strong>{calculateSplitterStatus(marker).status === 'full' ? 'Completo' : calculateSplitterStatus(marker).status === 'partial' ? 'Parcial' : 'Disponible'}</strong></li>
                        </ul>
                        {calculateSplitterStatus(marker).splitters.length > 0 && (
                          <>
                            <h5 className='font-bold mt-3'>Estado de Splitters:</h5>
                            <ul className='pl-5 list-disc mb-2 min-w-[281px]'>
                              {calculateSplitterStatus(marker).splitters.map(splitter => (
                                <li key={splitter.name} className='flex items-center gap-2'>
                                  <span className={`text-xs uppercase rounded-full w-3 h-3 inline-flex ${splitter.isFull ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                  <strong>{splitter.name}:</strong> {splitter.clients}/{splitter.total} puertos ({splitter.available} disponibles)
                                  {splitter.isFull && <span className='text-red-600 font-bold text-xs'>COMPLETO</span>}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        <h5 className='font-bold'>Clientes:</h5>
                        <ul className=''>
                            {marker?.clientes?.length > 0 ? (
                                marker.clientes.map(cliente => (
                                    <li className='bg-blue-700 p-2 my-2 rounded-lg text-white relative' key={cliente.id}>
                                        {cliente.nombreApellido && <span><strong className='text-blue-200'>Nombre y Apellido:</strong> <br /> {cliente.nombreApellido}</span>}
                                        <div className='flex justify-between mt-2'>
                                            {cliente.cedulaRiff && <span><strong className='text-blue-200'>Cédula/Riff:</strong> <br /> {cliente.cedulaRiff}</span>}
                                            {cliente.telefono && <span><strong className='text-blue-200'>Teléfono:</strong> <br /> {cliente.telefono}</span>}
                                        </div>
                                        <div className="mt-2 flex gap-3">
                                          <div><strong className='text-blue-200'>Puerto:</strong> {cliente.port}</div>
                                          <div><strong className='text-blue-200'>Splitter:</strong> {cliente?.splitter}</div>
                                        </div>
                                        <div className="mt-2">
                                          <strong className='text-blue-200'>Tipo:</strong> {cliente.tipoUsuario}
                                        </div>
                                        <button
                                         className='cursor-pointer text-xl absolute top-0 right-[22px] rounded-bl-lg p-1 bg-white text-blue-500 transition-all hover:bg-blue-500 hover:text-white'
                                         onClick={() => {
                                            setSelectedClient({...cliente, fat: marker.IdFat});
                                            // Limpiar campos del formulario al abrir el modal
                                            setSelectedFat('');
                                            setClientForm({ ...clientForm, fat_id: '', splitter: '', port: '' });
                                            setAvailableSplitters([]);
                                            setAvailablePorts([]);
                                            setIsModalOpen(true);
                                        }} color="primary" variant='contained'>⇆</button>
                                        <button
                                         className='cursor-pointer text-xl absolute top-0 right-0 p-1 transition-all hover:bg-red-500 hover:text-white bg-white text-red-500 rounded-tr-lg'
                                         onClick={() => handleDeleteClient(cliente.id)} variant='contained' color="secondary">🗑</button>
                                    </li>
                                ))
                            ) : (
                                <li className='text-gray-500'>No hay clientes asociados</li>
                            )}
                        </ul>
                    </div>
                </Popup>
              )}
            </Marker>
          ))}
        </MapContainer>

        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <DialogTitle>Transferir Cliente de:</DialogTitle>
          <DialogContent>
              <h1 className='font-bold text-xl mb-1'>{selectedClient?.fat}</h1>
              <p className='mb-1'>¿A qué FAT deseas transferir a <strong className='uppercase'>{selectedClient?.nombreApellido}</strong>?</p>
              {/* aquivale */}
              <FormControl fullWidth required margin="normal">
                  <InputLabel>FAT</InputLabel>
                  <Select
                    fullWidth
                    required
                    value={selectedFat}
                    onChange={(e) => {
                      const selectedFatId = e.target.value;
                      setSelectedFat(e.target.value);
                      // Limpiar splitter y puerto al cambiar de FAT
                      setClientForm({ ...clientForm, fat_id: selectedFatId, splitter: '', port: '' });
                      setAvailableSplitters([]);
                      setAvailablePorts([]);
                      // Actualizar splitters disponibles para el nuevo FAT
                      handleFatChange(selectedFatId);
                    }}
                  >
                    {markers?.map((fat) => {
                      const status = calculateSplitterStatus(fat).status;
                      // Show FATs that are not completely full
                      if (status !== 'full') {
                        return (
                          <MenuItem key={fat.id} value={fat.id}>
                            {fat.IdFat} ({status === 'partial' ? 'Parcial' : 'Disponible'})
                          </MenuItem>
                        );
                      }
                      return null;
                    })}
                  </Select>
              </FormControl>
              
              <FormControl fullWidth required margin="normal" disabled={!selectedFat}>
                  <InputLabel>Splitter</InputLabel>
                  <Select
                      required
                      value={clientForm.splitter}
                      onChange={(e) => handleSplitterChange(e.target.value)}
                  >
                      {availableSplitters.map(splitter => {
                        const selectedFatData = markers.find(fat => fat.id == selectedFat);
                        const clientesEnSplitter = selectedFatData ? (selectedFatData.clientes || []).filter(cliente => cliente.splitter === splitter) : [];
                        const totalPorts = selectedFatData ? selectedFatData.totalPorts : 0;
                        const used = clientesEnSplitter.length;
                        const available = totalPorts - used;
                        return (
                          <MenuItem key={splitter} value={splitter}>
                            {splitter} ({available} disponibles)
                          </MenuItem>
                        );
                      })}
                  </Select>
              </FormControl>
              
              <FormControl fullWidth required margin="normal" disabled={!clientForm.splitter}>
                  <InputLabel>Puerto</InputLabel>
                  <Select
                      required
                      value={clientForm.port}
                      onChange={(e) => setClientForm({ ...clientForm, port: e.target.value })}
                  >
                      {availablePorts.map((port) => (
                          <MenuItem key={port} value={port}>
                              {port}
                          </MenuItem>
                      ))}
                  </Select>
              </FormControl>


          </DialogContent>
          <DialogActions>
              <Button onClick={() => {
                setIsModalOpen(false);
                // Limpiar campos al cerrar el modal
                setSelectedFat('');
                setClientForm({ ...clientForm, fat_id: '', splitter: '', port: '' });
                setAvailableSplitters([]);
                setAvailablePorts([]);
                setSelectedClient(null);
              }} color="primary">Cancelar</Button>
              <Button onClick={() => { 
                if (!clientForm?.splitter) {
                  toast.error('Debe elegir un splitter');
                } else if (!clientForm?.port) {
                  toast.error('Debe elegir un puerto');
                } else {
                  setIsConfirmOpen(true);
                }
              }} color="primary">Transferir</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
          <DialogTitle>Confirmar Transferencia</DialogTitle>
          <DialogContent>
                {console.log({
                  marker: markers,
                  selectedFat,
                })}
              <p>¿Está seguro de que desea transferir a <strong className='uppercase'>{selectedClient?.nombreApellido}</strong> al splitter <strong className='uppercase'>{clientForm?.splitter}</strong> puerto <strong className='uppercase'>{clientForm?.port}</strong> en el <strong className='uppercase'>{markers?.filter(x => x?.id == selectedFat)[0]?.fat_unique} - {markers?.filter(x => x?.id == selectedFat)[0]?.IdFat}</strong>?</p>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setIsConfirmOpen(false)} color="primary">Cancelar</Button>
              <Button onClick={async () => {
                  // Lógica para transferir el cliente
                  try {
                      const fatName = markers?.filter(x => x?.id == selectedFat)[0]?.IdFat;
                      const { data, error } = await supabase
                          .from('clientes')
                          .update({ fat_id: selectedFat, splitter: clientForm?.splitter, port: clientForm?.port }) // Actualiza fat_id, splitter y puerto del cliente
                          .eq('id', selectedClient.id); // Filtra por el id del cliente

                      if (error) {
                          console.error('Error al transferir el cliente:', error);
                          toast.error('Error al transferir el cliente');
                      } else {
                          await fetchMarkers();
                          console.log(`Cliente ${selectedClient?.nombreApellido} transferido a FAT ${fatName}`);
                          toast.success(`Cliente ${selectedClient?.nombreApellido} transferido a FAT ${fatName}`);
                          setClientForm({ id: '', name: '', userType: '', address: '', dni: '', fat_id: '', splitter: '', port: '' });
                          setSelectedFat('');
                          setAvailableSplitters([]);
                          setAvailablePorts([]);
                          // Aquí puedes agregar lógica adicional si es necesario
                      }
                  } catch (error) {
                      console.error('Error al realizar la transferencia:', error);
                  } finally {
                      setIsConfirmOpen(false); // Cierra el diálogo de confirmación
                      setIsModalOpen(false); // Cierra el modal
                      setSelectedClient(null); // Limpia el cliente seleccionado
                  }
              }} color="primary">Confirmar</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminar cliente de este FAT</DialogTitle>
          <DialogContent>
              <p>¿Está seguro de que desea eliminar este cliente del FAT?</p>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setIsDeleteConfirmOpen(false)} color="primary">Cancelar</Button>
              <Button onClick={async () => {
                  // Lógica para vaciar el fat_id del cliente
                  try {
                      const { data, error } = await supabase
                          .from('clientes')
                          .update({ fat_id: null, port: null }) // Vacía el fat_id del cliente
                          .eq('id', clientToDelete); // Filtra por el id del cliente

                      if (error) {
                          toast.error('Error al eliminar cliente del FAT')
                          console.error('Error al eliminar cliente del FAT:', error);
                      } else {
                          // Aquí puedes agregar lógica adicional si es necesario
                          toast.success(`Cliente eliminado del FAT`);
                          await fetchMarkers();
                      }
                  } catch (error) {
                      console.error('Error al realizar la operación:', error);
                  } finally {
                      setIsDeleteConfirmOpen(false); // Cierra el diálogo de confirmación
                      setClientToDelete(null); // Limpia el cliente seleccionado
                  }
              }} color="primary">Confirmar</Button>
          </DialogActions>
      </Dialog>
        {/* Lista flotante de resultados de geocodificación */}
       <div className={`absolute top-0 ${isOpenGeocoding ? 'right-0' : '-right-[300px]'} h-screen w-[300px] z-[999999999] transition-all`}>
         <span 
         className='absolute bg-white -left-[65px] p-2 rounded-l-lg top-3 cursor-pointer hover:pr-5 hover:-left-[80px] transition-all shadow-2xl' 
         onClick={()=> {setIsOpenGeocoding(!isOpenGeocoding)}}
         >
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="50" height="50" viewBox="0 0 30 30">
            <path d="M 13 3 C 7.4889971 3 3 7.4889971 3 13 C 3 18.511003 7.4889971 23 13 23 C 15.396508 23 17.597385 22.148986 19.322266 20.736328 L 25.292969 26.707031 A 1.0001 1.0001 0 1 0 26.707031 25.292969 L 20.736328 19.322266 C 22.148986 17.597385 23 15.396508 23 13 C 23 7.4889971 18.511003 3 13 3 z M 13 5 C 17.430123 5 21 8.5698774 21 13 C 21 17.430123 17.430123 21 13 21 C 8.5698774 21 5 17.430123 5 13 C 5 8.5698774 8.5698774 5 13 5 z"></path>
            </svg>
        </span>
        <div className='absolute right-0 top-0 bg-white shadow-2xl p-4 h-screen overflow-y-auto w-full z-[999999999]'>
          <h3 className='text-lg font-bold mb-4'>Resultados de Geocodificación</h3>
          <h3 className='text-lg font-bold mb-4'>Búsqueda por coordenadas</h3>
          {/* Apartado para ingresar latitud y longitud */}
          <div className='mb-4'>
            <input
              type='text'
              placeholder='Latitud'
              className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2'
              id='latitudeInput'
            />
            <input
              type='text'
              placeholder='Longitud'
              className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2'
              id='longitudeInput'
            />
            <input
                type='text'
                placeholder='Radio en metros. Ej: 1000, 1300, 500...'
                className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2'
                id='radiusInput'
            />
            <button
                className='mt-2 w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
                onClick={() => {
                    const radiusInMeters = parseInt(document.getElementById('radiusInput').value) || 1000; // Valor por defecto de 1000 metros
                    const lat = parseFloat(document.getElementById('latitudeInput').value);
                    const lng = parseFloat(document.getElementById('longitudeInput').value);
                   if (!isNaN(lat) && !isNaN(lng)) {
                      // Limpiar el mapa de marcadores y círculos anteriores
                      mapRef.current.eachLayer((layer) => {
                          if (layer instanceof L.Circle) {
                              mapRef.current.removeLayer(layer);
                          }
                      });
                      fatList.map((fat) => {
                      //  mapRef.current.removeLayer(fat.marker);
                      });
                    // Marcar la ubicación actual en el mapa


                      // Marcar la ubicación actual en el mapa
                      L.marker([lat, lng]).addTo(mapRef.current);
                      mapRef.current.flyTo([lat, lng], MAP_ZOOM);
                      
                      // Crear una lista para almacenar los FATS y sus distancias
                      const newFatList = [];
                      
                      // Obtener el radio en metros
                      const radiusInMeters = parseInt(document.getElementById('radiusInput').value) || 1000;

                      // Recorrer todos los FATS
                      filteredMarkers.forEach(nearestFAT => {
                          const distance = haversineDistance({ latitude: lat, longitude: lng }, { latitude: nearestFAT.lat, longitude: nearestFAT.lng });
                          
                          // Solo agregar FATS que estén dentro del radio especificado
                          if (distance <= radiusInMeters) {
                              newFatList.push({ id: nearestFAT.id, fat_unique: nearestFAT.fat_unique, name: nearestFAT.IdFat, distance: distance, lat: nearestFAT.lat, lng: nearestFAT.lng });
                          }
                      });

                      // Círculo para el punto de búsqueda
                      L.circle([lat, lng], {
                          color: 'blue', // Color del círculo
                          radius: radiusInMeters
                      }).addTo(mapRef.current);
                      
                      // Actualizar el estado con la nueva lista de FATS
                      setFatList(newFatList);
                  } else {
                      alert('Por favor, ingrese valores válidos para latitud y longitud.');
                  }
                }}
            >
                Ir a Ubicación
            </button>
          </div>
          {/* Renderizar la lista de FATS */}
          <ul className='mt-4'>
            {console.log(fatList)}
              {fatList.map(fat => (
                  <li
                  className='cursor-pointer mb-2 p-2 rounded-lg hover:bg-blue-100 transition duration-200 font-semibold flex items-center gap-2'
                  onClick={() => {
                    handleSidebarClick(fat);
                    handleMarkerClick(fat);
                  }} 
                  key={fat.id}>
                      {fat.fat_unique} - {fat.name} <br /> Distancia: {fat.distance.toFixed(2)} km
                  </li>
              ))}
          </ul>
          {/* <h3 className='text-lg font-bold mb-4'>Búsqueda por dirección</h3>
          <div className='mb-4'>
            <input
              type='text'
              placeholder='Buscar dirección...'
              className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleGeocode(e.target.value);
                }
              }}
            />
          </div> */}

          {isLoading ? ( // Mostrar preloader si está cargando
            <div className='flex justify-center items-center'>
              <div className='loader'>Espere un momento...</div> {/* Aquí puedes usar un spinner o un texto de carga */}
            </div>
          ) : (
            <ul>
              {geocodeResults.map(result => (
                <li
                  key={result.id}
                  className='cursor-pointer mb-2 p-2 rounded-lg hover:bg-blue-100 transition duration-200 font-semibold flex items-center gap-2'
                  onClick={() => {
                    mapRef.current.flyTo([result.lat, result.lng], MAP_ZOOM);
                    setSelectedMarker(result);
                  }}
                >
                  <span className='w-[10px] h-[10px] bg-blue-500 rounded-full inline-block'></span> {result.IdFat}
                </li>
              ))}
            </ul>
          )}
        </div>
       </div>
      </div>
    </div>
  );
};

export default MapComponent;