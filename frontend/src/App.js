import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, membersRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/members`)
      ]);
      
      setStats(statsRes.data);
      setMembers(membersRes.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const initDemo = async () => {
    try {
      await axios.post(`${API_URL}/init-demo`);
      fetchData();
      alert('Demo-Daten wurden erfolgreich initialisiert!');
    } catch (error) {
      console.error('Error initializing demo:', error);
      alert('Fehler beim Initialisieren der Demo-Daten');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">OrgaSuite lädt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verbindungsfehler</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🏢 OrgaSuite</h1>
          <p className="text-blue-100">ERP für Vereine und Unternehmen</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Mitglieder</h3>
            <p className="text-3xl font-bold text-blue-600">{stats?.members || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Organisationen</h3>
            <p className="text-3xl font-bold text-green-600">{stats?.organizations || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Transaktionen</h3>
            <p className="text-3xl font-bold text-purple-600">{stats?.transactions || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Module</h3>
            <p className="text-3xl font-bold text-orange-600">{stats?.modules?.length || 0}</p>
          </div>
        </div>

        {/* Members Overview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mitglieder</h2>
              {members.length === 0 && (
                <button
                  onClick={initDemo}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Demo-Daten laden
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-500 mb-4">Noch keine Mitglieder vorhanden</p>
                <button
                  onClick={initDemo}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Demo-Daten initialisieren
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {members.map(member => (
                  <div key={member.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{member.firstName} {member.lastName}</h4>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-sm text-gray-500">Mitglied seit: {new Date(member.joinedAt).toLocaleDateString('de-DE')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      member.status === 'active' ? 'bg-green-100 text-green-800' :
                      member.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Module Overview */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Verfügbare Module</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stats?.modules?.map(module => (
                <div key={module} className="p-4 border rounded-lg text-center hover:bg-gray-50 transition-colors">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">{module}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;