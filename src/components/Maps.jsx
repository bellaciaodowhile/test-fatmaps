import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as XLSX from 'xlsx'; // Importa la biblioteca xlsx

// Define the marker icons
const createMarkerIcon = (isFull) => {
  return L.icon({
    iconUrl: isFull
      ? 'https://static.vecteezy.com/system/resources/previews/013/760/669/non_2x/map-location-pin-icon-in-red-colors-png.png' // URL del pin rojo
      : 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Map_pin_icon_green.svg/752px-Map_pin_icon_green.svg.png', // URL del pin verde
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const center = {
  lat: -34.397,
  lng: 150.644
};

const MapComponent = ({ markers }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMarkers, setFilteredMarkers] = useState(markers || []);

  
  useEffect(() => {
    setFilteredMarkers(markers);
  }, [markers]);

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  const handleSidebarClick = (marker) => {
    setSelectedMarker(marker);
    mapRef.current.flyTo([marker.lat, marker.lng], 14); // Centra el mapa en el marcador
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    const filtered = markers.filter(marker =>
      marker.IdFat.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredMarkers(filtered);
  };

  const generateUUID = () => {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
  }
  const mapRef = React.useRef();

  return (
    <div className='flex'>
      {/* Sidebar */}
      <div className='w-1/4 bg-white shadow-2xl p-4 h-screen overflow-y-auto'>
        <h2 className='text-lg font-bold mb-4'>Locations</h2>
        {/* Search Bar */}
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Buscar FAT´s...'
            className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {/* File Upload Button */}
        <div className='mb-4'>
          <input
            type='file'
            accept='.xlsx, .xls'
            onChange={handleFileUpload}
            className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        {/* Locations List */}
        <ul>
          {filteredMarkers.map(marker => (
            <li
              key={marker.id}
              className='cursor-pointer mb-2 p-2 rounded-lg hover:bg-blue-100 transition duration-200 font-semibold flex items-center gap-2'
              onClick={() => {
                handleSidebarClick(marker);
                handleMarkerClick(marker);
              }} // Click opens popup
            >
              <span className={`w-4 h-4 bg-${ marker.usedPorts >= marker.totalPorts ? 'red':'green' }-500 rounded-full inline-block`}></span> {marker.IdFat}
            </li>
          ))}
        </ul>
      </div>
      {/* Map */}
      <div className='w-3/4'>
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
                      <li><strong>Puertos en uso:</strong> {marker.clientes.filter(x => x.nombreApellido != '').length}</li>
                      <li><strong>Estado:</strong> <span className={`text-xs uppercase rounded-full w-3 h-3 inline-flex -mb-[1px] mr-[2px] ${marker.usedPorts >= marker.totalPorts ? 'bg-red-500' : 'bg-green-500'}`}></span><strong>{marker.usedPorts >= marker.totalPorts ? 'Completo' : 'Disponible'}</strong></li>
                    </ul>
                    {/* <p>Clientes: {marker.clientes.map(cliente => cliente.IdFat).join(', ')}</p> */}
                    <h5 className='font-bold'>Clientes:</h5>
                    <ul className=''>
                    {marker.clientes.map(cliente => cliente.nombreApellido && (
                      <li className='bg-blue-700 p-2 my-2 rounded-lg text-white relative' key={cliente.id}>
                        {cliente.nombreApellido && <span><strong className='text-blue-200'>Nombre y Apellido:</strong> <br /> {cliente.nombreApellido}</span>}
                        <span className='absolute top-0 right-0 text-red-800 bg-white p-1 rounded-bl-xl'>{cliente.port}</span>
                        <div className='flex justify-between mt-2'>
                          {cliente.cedulaRiff && <span><strong className='text-blue-200'>Cédula/Riff:</strong> <br /> {cliente.cedulaRiff}</span>}
                          {cliente.telefono && <span><strong className='text-blue-200'>Teléfono:</strong> <br /> {cliente.telefono}</span>}
                        </div>
                      </li>
                    ))}
                    </ul>
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;