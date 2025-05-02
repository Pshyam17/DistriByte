// components/MapInterface.js
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix for Leaflet icons in Next.js
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function MapInterface({ onSelectCenter }) {
  const [centers, setCenters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const { data } = await axios.get(`${process.env.API_URL}/centers`);
        setCenters(data.centers);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch distribution centers", err);
        setError("Failed to load distribution centers");
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  // Create connections between all distribution centers
  const createConnections = () => {
    const connections = [];
    const centersList = Object.values(centers);
    
    for (let i = 0; i < centersList.length; i++) {
      for (let j = i + 1; j < centersList.length; j++) {
        connections.push({
          from: centersList[i].location,
          to: centersList[j].location
        });
      }
    }
    
    return connections;
  };

  const handleCenterClick = async (centerId) => {
    try {
      setLoading(true);
      const { data } = await axios.post(`${process.env.API_URL}/forecast`, {
        center_id: centerId,
        lookback_days: 30,
        forecast_days: 10
      });
      onSelectCenter(data);
    } catch (err) {
      console.error("Failed to fetch forecast", err);
      setError("Failed to load forecast data");
    } finally {
      setLoading(false);
    }
  };

  if (loading && Object.keys(centers).length === 0) {
    return <div className="flex items-center justify-center h-64">Loading map data...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-600">{error}</div>;
  }

  const connections = createConnections();
  const centersList = Object.values(centers);
  const initialCenter = centersList.length > 0 ? centersList[0].location : [39.8283, -98.5795]; // US center
  
  return (
    <div className="h-96 rounded-lg overflow-hidden shadow-md">
      <MapContainer
        center={initialCenter}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Draw connections between centers */}
        {connections.map((connection, idx) => (
          <Polyline 
            key={idx}
            positions={[connection.from, connection.to]} 
            color="#3388ff"
            weight={2}
            opacity={0.6}
            dashArray="5, 5"
          />
        ))}
        
        {/* Place markers for each distribution center */}
        {Object.entries(centers).map(([id, center]) => (
          <Marker 
            key={id} 
            position={center.location}
            eventHandlers={{
              click: () => handleCenterClick(id),
            }}
          >
            <Popup>
              <div>
                <h3 className="font-bold">{center.name}</h3>
                <button 
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  onClick={() => handleCenterClick(id)}
                >
                  View Forecast
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// pages/_app.js
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export { DistriByte };

// pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading...</div>
    </div>
  );
}

// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import LoginForm from '../components/LoginForm';
import Head from 'next/head';

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { error } = router.query;}