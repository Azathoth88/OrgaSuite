import React, { useState, useContext } from 'react';
import { OrganizationContext } from '../../contexts/OrganizationContext';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';

const OrganizationSettings = () => {
  const { organization, saveOrganization } = useContext(OrganizationContext);
  const { labels } = useOrgTranslation();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(organization || {});

  const handleSave = async () => {
    const success = await saveOrganization(formData);
    if (success) {
      setEditing(false);
      alert('Organisation erfolgreich aktualisiert!');
    } else {
      alert('Fehler beim Speichern der Änderungen');
    }
  };

  if (!organization) {
    return <div>Keine Organisation gefunden</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Organisations-Einstellungen</h2>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editing ? 'Speichern' : 'Bearbeiten'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          {editing ? (
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="p-3 bg-gray-50 rounded">{organization.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Typ
          </label>
          {editing ? (
            <select
              value={formData.type || ''}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="verein">Verein (Mitglieder)</option>
              <option value="unternehmen">Unternehmen (Kunden)</option>
            </select>
          ) : (
            <p className="p-3 bg-gray-50 rounded">
              {organization.type === 'verein' ? 'Verein (Mitglieder)' : 'Unternehmen (Kunden)'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Steuernummer
          </label>
          {editing ? (
            <input
              type="text"
              value={formData.taxNumber || ''}
              onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="p-3 bg-gray-50 rounded">{organization.taxNumber || 'Nicht angegeben'}</p>
          )}
        </div>

        {organization.address && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    address: {...(formData.address || {}), street: e.target.value}
                  })}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Straße"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.address?.zip || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      address: {...(formData.address || {}), zip: e.target.value}
                    })}
                    className="w-1/3 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="PLZ"
                  />
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      address: {...(formData.address || {}), city: e.target.value}
                    })}
                    className="flex-1 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Stadt"
                  />
                </div>
              </div>
            ) : (
              <p className="p-3 bg-gray-50 rounded">
                {organization.address.street}<br />
                {organization.address.zip} {organization.address.city}
              </p>
            )}
          </div>
        )}

        {editing && (
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setEditing(false);
                setFormData(organization);
              }}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Änderungen speichern
            </button>
          </div>
        )}
      </div>

      {/* Current Labels Preview */}
      <div className="mt-8 p-4 bg-gray-50 rounded">
        <h3 className="font-medium text-gray-700 mb-3">Aktuelle Labels:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Einzeln:</strong> {labels.memberSingle()}</div>
          <div><strong>Plural:</strong> {labels.memberPlural()}</div>
          <div><strong>Nummer:</strong> {labels.memberNumber()}</div>
          <div><strong>Gebühr:</strong> {labels.membershipFee()}</div>
          <div><strong>Dashboard:</strong> {labels.dashboardTitle()}</div>
          <div><strong>Aktiv:</strong> {labels.statusActive()}</div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;