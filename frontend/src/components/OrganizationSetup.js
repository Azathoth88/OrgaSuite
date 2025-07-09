import React, { useState, useContext } from 'react';
import { OrganizationContext } from '../contexts/OrganizationContext';

const OrganizationSetup = () => {
  const { saveOrganization, setupDemo } = useContext(OrganizationContext);
  const [formData, setFormData] = useState({
    name: '',
    type: 'verein',
    taxNumber: '',
    address: {
      street: '',
      city: '',
      zip: '',
      country: 'Deutschland'
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('📝 Submitting organization:', formData);
    const success = await saveOrganization(formData);
    
    if (success) {
      alert('Organisation erfolgreich erstellt!');
      // Page reload will happen from context
    } else {
      alert('Fehler beim Speichern der Organisation');
    }
    
    setLoading(false);
  };

  const handleDemoSetup = async (orgType) => {
    setLoading(true);
    
    console.log('🎮 Starting demo setup:', orgType);
    const success = await setupDemo(orgType);
    
    if (success) {
      alert(`Demo ${orgType === 'verein' ? 'Verein' : 'Unternehmen'} erstellt!`);
      // Page reload will happen from context
    } else {
      alert('Fehler beim Erstellen der Demo-Organisation');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🏢 OrgaSuite</h1>
          <p className="text-gray-600 mt-2">Organisation einrichten</p>
        </div>

        {/* Demo Setup */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-3">Schnellstart mit Demo-Daten:</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleDemoSetup('verein')}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '...' : '🏛️ Demo Verein'}
            </button>
            <button
              onClick={() => handleDemoSetup('unternehmen')}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '...' : '🏢 Demo Unternehmen'}
            </button>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Erstellt automatisch Organisation + 3 Test-{' '}
            {formData.type === 'verein' ? 'Mitglieder' : 'Kunden'}
          </p>
        </div>

        <div className="text-center text-gray-500 mb-4">oder manuell erstellen</div>

        {/* Manual Setup */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organisationsname *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Mein Verein e.V."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organisationstyp *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="verein">🏛️ Verein (Mitglieder)</option>
                <option value="unternehmen">🏢 Unternehmen (Kunden)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Bestimmt die verwendeten Labels (Mitglieder vs. Kunden)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Steuernummer
              </label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="12345/67890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Straße
              </label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, street: e.target.value}
                })}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Musterstraße 123"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={formData.address.zip}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, zip: e.target.value}
                })}
                className="w-1/3 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, city: e.target.value}
                })}
                className="flex-1 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Stadt"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.name}
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loading ? 'Erstelle...' : 'Organisation erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationSetup;