import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Define the marker icons
const createMarkerIcon = (isFull) => {
  return L.icon({
    iconUrl: isFull
      ? 'https://static.vecteezy.com/system/resources/previews/013/760/669/non_2x/map-location-pin-icon-in-red-colors-png.png' // Replace with a red pin URL
      : 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Map_pin_icon_green.svg/752px-Map_pin_icon_green.svg.png', // Replace with a green pin URL
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
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMarkers, setFilteredMarkers] = useState([]);

  useEffect(() => {
    // Simulating JSON data with markers
    const fetchMarkers = async () => {
      const data = [
        { id: 1, IdFat: 'FAT3215489', lat: -34.397, lng: 150.644, description: 'Comercial la Gran Chinita', totalPorts: 8, usedPorts: 8 },
        { id: 2, IdFat: 'FAT5189710', lat: -34.407, lng: 150.654, description: 'Comercial la Casa Verde', totalPorts: 16, usedPorts: 4 },
        { id: 3, IdFat: 'FAT2910088', lat: -34.387, lng: 150.634, description: 'Comercial el Buen Precio', totalPorts: 32, usedPorts: 20 },
        { id: 4, IdFat: 'FAT8162220', lat: -34.367, lng: 150.614, description: 'Comercial la Nueva Era', totalPorts: 4, usedPorts: 0 },
        { id: 5, IdFat: 'FAT8456991', lat: -34.377, lng: 150.674, description: 'Comercial el Mercado', totalPorts: 8, usedPorts: 8 },
        // Add more markers as needed
      ];
      setMarkers(data);
      setFilteredMarkers(data); // Initialize filtered markers
    };
    fetchMarkers();
  }, []);

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  const handleSidebarClick = (marker) => {
    setSelectedMarker(marker);
    mapRef.current.flyTo([marker.lat, marker.lng], 14); // Center the map on the marker
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    const filtered = markers.filter(marker =>
      marker.IdFat.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredMarkers(filtered);
  };

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
        {/* Locations List */}
        <ul>
          {console.log({type: 'test', filteredMarkers})}
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
        {/* Add Button */}
        <button className='mt-4 w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition duration-200'>
          Agregar localización
        </button>
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
                  <div>
                    <h2 className='font-bold'>{marker.description}</h2>
                    <p>ID: {marker.IdFat}</p>
                    <p>Coordenadas: {marker.lat}, {marker.lng}</p>
                    <p>Puertos: {marker.totalPorts}</p>
                    <p>Puertos en uso: {marker.usedPorts}</p>
                    <p>Estado: {marker.usedPorts >= marker.totalPorts ? 'Completo' : 'Disponible'}</p>
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