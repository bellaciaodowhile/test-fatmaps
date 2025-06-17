import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as XLSX from 'xlsx'; 
import { createClient } from '@supabase/supabase-js';
import 'leaflet-control-geocoder';

const SUPABASE_URL = 'https://qmzmznpbpvonegajtavg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtem16bnBicHZvbmVnYWp0YXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMjE5NjMsImV4cCI6MjA2NTU5Nzk2M30.YkJmlrS_55zqdJ-Iu9esXJO56LfJwg-itB6IwGUJnA8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const createMarkerIcon = (isFull) => {
  return L.icon({
    iconUrl: isFull
      ? 'https://static.vecteezy.com/system/resources/previews/013/760/669/non_2x/map-location-pin-icon-in-red-colors-png.png'
      : 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Map_pin_icon_green.svg/752px-Map_pin_icon_green.svg.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const center = {
  lat: -34.397,
  lng: 150.644
};

const MapComponent = () => {
  const [isLoading, setIsLoading] = useState(false); 
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMarkers, setFilteredMarkers] = useState([]);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const mapRef = React.useRef();

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
        const associatedClients = clientes.filter(cliente => cliente.fat_id === fat.id);
        return {
          ...fat,
          clientes: associatedClients,
        };
      });
      setMarkers(fatsWithClients);
      setFilteredMarkers(fatsWithClients);
    };
    fetchMarkers();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet);
      const newMarkers = [];
      const clientesMap = {}; // Mapa para almacenar clientes por fat_id

      for (const row of json) {
        const lat = Number(row['LATITUD DEL FAT'].replace(',', '.'));
        const lng = parseFloat(row['LONGITUD DEL FAT']);
        const totalPortsString = row['2ºNivel de SPLlitter'] || '';
        const totalPortsMatch = totalPortsString.match(/\((\d+):(\d+)\)/);
        const totalPorts = totalPortsMatch ? parseInt(totalPortsMatch[2], 10) : 0;

        // Verifica si el FAT ya existe en Supabase
        const { data: existingFats, error: fetchError } = await supabase
          .from('fats')
          .select('*')
          .eq('lat', lat)
          .eq('lng', lng);

        if (fetchError) {
          console.error('Error al verificar FAT existente:', fetchError);
          continue; // Salta a la siguiente fila si hay un error
        }

        let fatId;
        if (existingFats.length === 0) {
          // Inserta el FAT en Supabase
          const { data: fatData, error } = await supabase
            .from('fats')
            .insert([{
              IdFat: row['NOMBRE FAT'],
              lat: lat,
              lng: lng,
              description: row['DESCRIPCION'],
              totalPorts: totalPorts,
            }]);

          if (error) {
            console.error('Error al insertar FAT en Supabase:', error);
            continue; // Salta a la siguiente fila si hay un error
          }

          if (fatData && fatData.length > 0) {
            fatId = fatData[0].id; // Obtiene el ID del nuevo registro
            newMarkers.push({
              id: fatId,
              IdFat: row['NOMBRE FAT'],
              lat: lat,
              lng: lng,
              description: row['DESCRIPCION'],
              totalPorts: totalPorts,
              clientes: [] // Inicializa la lista de clientes
            });
          }
        } else {
          fatId = existingFats[0].id; // Si existe, usa el ID existente
          console.log(`El FAT con coordenadas (${lat}, ${lng}) ya existe.`);
        }

        // Ahora inserta los clientes asociados a este FAT
        const nombreCliente = row['NOMBRE Y APELLIDO'];
        const tipoUsuario = row['TIPOUSUARIO']; // Obtiene el tipo de usuario del cliente
        if (nombreCliente) { // Solo insertar si el nombre y apellido no está vacío
          const cliente = {
            id: generateUUID(), // Genera un ID único para el cliente
            nombreApellido: nombreCliente,
            cedulaRiff: row['CEDULA/RIFF'],
            telefono: row['TELEFONO'],
            tipoUsuario: tipoUsuario, // Incluye el tipo de usuario
            fat_id: fatId // Relación con el FAT
          };

          // Agrega el cliente al mapa de clientes por fat_id
          if (!clientesMap[fatId]) {
            clientesMap[fatId] = [];
          }
          clientesMap[fatId].push(cliente);
        }
      }

      // Asocia los clientes a los FATs
      newMarkers.forEach(marker => {
        if (clientesMap[marker.id]) {
          marker.clientes = clientesMap[marker.id];
        }
      });

      // Actualiza el estado de los marcadores
      setMarkers(prevMarkers => [...prevMarkers, ...newMarkers]);
      setFilteredMarkers(prevMarkers => [...prevMarkers, ...newMarkers]);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  const handleSidebarClick = (marker) => {
    setSelectedMarker(marker);
    mapRef.current.flyTo([parseFloat(marker.lat), parseFloat(marker.lng)], 14);
  };

 const handleSearch = (term) => {
    setSearchTerm(term);
    const filtered = markers.filter(marker => {
      const matchesFat = marker.IdFat.toLowerCase().includes(term.toLowerCase());
      const matchesClient = marker.clientes && marker.clientes.some(cliente => 
        cliente.nombreApellido.toLowerCase().includes(term.toLowerCase()) || 
        cliente.cedulaRiff.toLowerCase().includes(term.toLowerCase())
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
              marker: newMarker // Guardar referencia del marcador
            };
          });
          setGeocodeResults(markers); // Actualiza los resultados de geocodificación con todos los marcadores

          // Opcional: Si deseas centrar el mapa en el primer resultado
          const { lat, lon } = results[0];
          mapRef.current.flyTo([lat, lon], 14);
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

  return (
    <div className='flex'>
      <div className='w-1/4 bg-white shadow-2xl p-4 h-screen overflow-y-auto'>
        <h2 className='text-lg font-bold mb-4'>Locations</h2>
        <div className='mb-4'>
          <input
            type='file'
            accept='.xlsx, .xls'
            onChange={handleFileUpload}
            className='hidden'
            id='file-upload'
          />
          <label htmlFor='file-upload' className='w-full p-2 text-center bg-blue-500 text-white font-bold uppercase rounded-lg cursor-pointer hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 inline-block'>
            Importar Excel
          </label>
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
          {filteredMarkers.map(marker => (
            <li
              key={marker.id}
              className='cursor-pointer mb-2 p-2 rounded-lg hover:bg-blue-100 transition duration-200 font-semibold flex items-center gap-2'
              onClick={() => {
                handleSidebarClick(marker);
                handleMarkerClick(marker);
              }}
            >
              <span className={`w-[10px] h-[10px] bg-${marker.usedPorts >= marker.totalPorts ? 'red' : 'green'}-500 rounded-full inline-block`}></span> {marker.IdFat}             
            </li>
          ))}
        </ul>
      </div>
      <div className='relative w-3/4'>
        <MapContainer center={center} zoom={10} style={{ height: '100vh', width: '100%' }} ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=''
          />
          {markers.map(marker => (
            <Marker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              icon={createMarkerIcon(marker.usedPorts >= marker.totalPorts)}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              {selectedMarker && selectedMarker.id === marker.id && (
                <Popup onClose={() => setSelectedMarker(null)}>
                  <div className='max-h-[500px] overflow-auto'>
                    <h5 className='font-bold mb-2'>Coordenadas</h5>
                    <span className='font-bold'>LAT: {marker.lat} <br /> LONG: {marker.lng}</span>
                    <h5 className='font-bold mt-2'>Información general:</h5>
                    <ul className='pl-5 list-disc mb-2'>
                      <li className='mt-2'><strong>Nombre FAT:</strong> {marker.IdFat}</li>
                      <li><strong>Puertos:</strong> {marker.totalPorts}</li>
                      <li><strong>Puertos en uso:</strong> {marker?.clientes?.length > 0 ? marker?.clientes?.length : 0}</li>
                      <li><strong>Estado:</strong> <span className={`text-xs uppercase rounded-full w-3 h-3 inline-flex -mb-[1px] mr-[2px] ${marker.usedPorts >= marker.totalPorts ? 'bg-red-500' : 'bg-green-500'}`}></span><strong>{marker.usedPorts >= marker.totalPorts ? 'Completo' : 'Disponible'}</strong></li>
                    </ul>
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
        {/* Lista flotante de resultados de geocodificación */}
         <div className='absolute right-0 top-0 bg-white shadow-lg p-4 h-screen overflow-y-auto w-1/4 z-[999999999]'>
          <h3 className='text-lg font-bold mb-4'>Resultados de Geocodificación</h3>
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
          </div>
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
                    mapRef.current.flyTo([result.lat, result.lng], 14);
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
  );
};

export default MapComponent;