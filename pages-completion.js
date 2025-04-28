// pages/login.js (continued)
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import LoginForm from '../components/LoginForm';
import Head from 'next/head';

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);
  
  return (
    <>
      <Head>
        <title>Login - Supply Chain Forecast</title>
        <meta name="description" content="Login to the Supply Chain Forecasting platform" />
      </Head>
      <LoginForm />
    </>
  );
}

// pages/dashboard.js
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { ProtectedRoute } from '../lib/auth';
import Navigation from '../components/Navigation';
import MapInterface from '../components/MapInterface';
import ForecastDisplay from '../components/ForecastDisplay';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamic import of MapInterface with no SSR to avoid leaflet issues
const MapWithNoSSR = dynamic(() => import('../components/MapInterface'), {
  ssr: false,
});

export default function Dashboard() {
  const [forecastData, setForecastData] = useState(null);
  
  return (
    <ProtectedRoute>
      <Head>
        <title>Dashboard - Supply Chain Forecast</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.min.css"
          integrity="sha512-1xoFisiGdy9nvho8EgXuXvnpR5GAMSjFwp40gSRE3NwdUdIMIKuPa7bqoUhLD0O/5tPNhteAsE5XyyMi5reQVA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </Head>
      
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        
        <main className="container mx-auto py-6 px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Distribution Network</h1>
            <p className="text-gray-600">
              Click on a distribution center to view sales and inventory forecasts
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MapWithNoSSR onSelectCenter={setForecastData} />
            </div>
            
            <div>
              <ForecastDisplay forecastData={forecastData} />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
