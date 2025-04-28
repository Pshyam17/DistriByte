// lib/auth.js - Authentication utilities
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUserFromCookies() {
      const token = Cookies.get('token');
      if (token) {
        axios.defaults.headers.Authorization = `Bearer ${token}`;
        try {
          // In a real app, you would validate the token with the backend
          setUser({ email: Cookies.get('email') });
        } catch (e) {
          console.error('Error loading user', e);
          Cookies.remove('token');
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUserFromCookies();
  }, []);

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const { data } = await axios.post(`${process.env.API_URL}/token`, formData);
      if (data.access_token) {
        Cookies.set('token', data.access_token, { expires: 60 });
        Cookies.set('email', email, { expires: 60 });
        axios.defaults.headers.Authorization = `Bearer ${data.access_token}`;
        setUser({ email });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('email');
    setUser(null);
    delete axios.defaults.headers.Authorization;
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  return children;
};

// components/LoginForm.js
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (error) {
      setError('An error occurred during login');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
          Sales & Inventory Forecasting
        </h2>
        
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="example@company.com"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <div className="mt-4 text-sm text-center text-gray-600">
          <p>Demo credentials: demo@example.com / password123</p>
        </div>
      </div>
    </div>
  );
}

// components/Navigation.js
import { useAuth } from '../lib/auth';
import Link from 'next/link';

export default function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">Supply Chain Forecast</div>
        
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <span className="text-sm">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1 bg-red-600 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// components/ForecastDisplay.js
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ForecastDisplay({ forecastData }) {
  const [activeTab, setActiveTab] = useState('table');

  if (!forecastData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600">Select a distribution center to view forecasts</p>
      </div>
    );
  }

  // Prepare data for chart visualization
  const chartData = forecastData.forecasts.map(product => {
    return {
      name: product.product_name,
      inventory: product.current_inventory,
      forecast: product.forecasted_sales.reduce((a, b) => a + b, 0),
      recommended: product.recommended_order
    };
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {forecastData.center_id} - Top 10 Products
        </h2>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded-md ${
              activeTab === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setActiveTab('table')}
          >
            Table
          </button>
          <button
            className={`px-3 py-1 rounded-md ${
              activeTab === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setActiveTab('chart')}
          >
            Chart
          </button>
        </div>
      </div>
      
      {activeTab === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left">Product</th>
                <th className="py-2 px-4 text-right">Current Stock</th>
                <th className="py-2 px-4 text-right">Forecast (10 days)</th>
                <th className="py-2 px-4 text-right">Recommended Order</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.forecasts.map((product) => (
                <tr key={product.product_id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{product.product_name}</td>
                  <td className="py-2 px-4 text-right">{product.current_inventory}</td>
                  <td className="py-2 px-4 text-right">
                    {product.forecasted_sales.reduce((a, b) => a + b, 0)}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className={product.recommended_order > 0 ? 'text-red-600 font-bold' : ''}>
                      {product.recommended_order}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="inventory" name="Current Inventory" fill="#8884d8" />
              <Bar dataKey="forecast" name="Forecasted Sales" fill="#82ca9d" />
              <Bar dataKey="recommended" name="Recommended Order" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 text-xs text-gray-500 text-right">
        Last updated: {new Date(forecastData.last_updated).toLocaleString()}
      </div>
    </div>
  );
}
