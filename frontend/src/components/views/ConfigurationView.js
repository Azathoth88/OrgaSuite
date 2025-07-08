import React, { useState, useContext, useEffect } from 'react';
import { OrganizationContext } from '../../contexts/OrganizationContext';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';

const ConfigurationView = () => {
  const { organization, saveOrganization } = useContext(OrganizationContext);
  const { t } = useOrgTranslation();
  
  // Loading und Error States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('membership');
  
  // Default Konfiguration
  const defaultConfig = {
    membershipConfig: {
      statuses: [
        { 
          key: 'active', 
          label: t('members.status.active', 'Aktiv'), 
          color: 'green', 
          default: true,
          description: 'Vollwertige Mitgliedschaft mit allen Rechten',
          billing: {
            fee: 50.00,
            frequency: 'yearly', // yearly, monthly, quarterly, custom
            dueDay: 1, // Tag im Monat/Quartal/Jahr
            active: true // Ob für diesen Status Beiträge erhoben werden
          }
        },
        { 
          key: 'inactive', 
          label: t('members.status.inactive', 'Inaktiv'), 
          color: 'gray',
          description: 'Mitgliedschaft ruht temporär',
          billing: {
            fee: 0.00,
            frequency: 'yearly',
            dueDay: 1,
            active: false // Keine Beiträge für inaktive Mitglieder
          }
        },
        { 
          key: 'suspended', 
          label: t('members.status.suspended', 'Gesperrt'), 
          color: 'red',
          description: 'Mitgliedschaft ist gesperrt',
          billing: {
            fee: 0.00,
            frequency: 'yearly',
            dueDay: 1,
            active: false // Keine Beiträge für gesperrte Mitglieder
          }
        }
      ],
      defaultCurrency: 'EUR'
    },
    generalConfig: {
      dateFormat: 'DD.MM.YYYY',
      timeZone: 'Europe/Berlin',
      currency: 'EUR'
    }
  };

  // Aktuelle Konfiguration aus Organization Settings laden
  const [config, setConfig] = useState(() => {
    const orgSettings = organization?.settings || {};
    return {
      ...defaultConfig,
      ...orgSettings
    };
  });

  // Konfiguration beim Laden der Organization aktualisieren
  useEffect(() => {
    if (organization?.settings) {
      setConfig(prevConfig => ({
        ...defaultConfig,
        ...organization.settings
      }));
    }
  }, [organization]);

  // Speichern der Konfiguration
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const updatedOrganization = {
        ...organization,
        settings: {
          ...organization.settings,
          ...config
        }
      };

      const success = await saveOrganization(updatedOrganization);
      
      if (success) {
        alert(t('common.saveSuccess', 'Erfolgreich gespeichert!'));
      } else {
        alert(t('common.saveError', 'Fehler beim Speichern'));
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(t('common.saveError', 'Fehler beim Speichern'));
    } finally {
      setSaving(false);
    }
  };

  // Mitgliedsstatus aktualisieren
  const updateMemberStatus = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: prev.membershipConfig.statuses.map((status, i) => 
          i === index ? { ...status, [field]: value } : status
        )
      }
    }));
  };

  // Neuen Mitgliedsstatus hinzufügen
  const addMemberStatus = () => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: [
          ...prev.membershipConfig.statuses,
          {
            key: `status_${Date.now()}`,
            label: 'Neuer Status',
            color: 'blue',
            description: '',
            billing: {
              fee: 0.00,
              frequency: 'yearly',
              dueDay: 1,
              active: true
            }
          }
        ]
      }
    }));
  };

  // Mitgliedsstatus entfernen
  const removeMemberStatus = (index) => {
    if (config.membershipConfig.statuses.length <= 1) {
      alert('Mindestens ein Status muss vorhanden sein.');
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: prev.membershipConfig.statuses.filter((_, i) => i !== index)
      }
    }));
  };

  // Billing-Konfiguration für Status aktualisieren
  const updateStatusBilling = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: prev.membershipConfig.statuses.map((status, i) => 
          i === index ? { 
            ...status, 
            billing: { 
              ...status.billing, 
              [field]: field === 'fee' ? parseFloat(value) || 0 : value 
            } 
          } : status
        )
      }
    }));
  };

  // Standard-Währung aktualisieren
  const updateDefaultCurrency = (currency) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        defaultCurrency: currency
      }
    }));
  };

  // Tab-Definitionen (ohne Billing-Tab)
  const tabs = [
    {
      id: 'membership',
      name: 'Mitgliedschaft',
      icon: '👥',
      description: 'Status, Beiträge und Abrechnungszyklen'
    },
    {
      id: 'general',
      name: 'Allgemein',
      icon: '⚙️',
      description: 'Grundeinstellungen'
    }
  ];

  // Farb-Optionen für Status
  const colorOptions = [
    { value: 'green', label: 'Grün', class: 'bg-green-100 text-green-800' },
    { value: 'blue', label: 'Blau', class: 'bg-blue-100 text-blue-800' },
    { value: 'yellow', label: 'Gelb', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'red', label: 'Rot', class: 'bg-red-100 text-red-800' },
    { value: 'gray', label: 'Grau', class: 'bg-gray-100 text-gray-800' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-100 text-purple-800' }
  ];

  // Frequenz-Optionen
  const frequencyOptions = [
    { value: 'monthly', label: 'Monatlich', description: 'Jeden Monat' },
    { value: 'quarterly', label: 'Quartalsweise', description: 'Alle 3 Monate' },
    { value: 'yearly', label: 'Jährlich', description: 'Einmal pro Jahr' },
    { value: 'custom', label: 'Benutzerdefiniert', description: 'Individueller Zeitraum' }
  ];

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Organisation nicht gefunden
          </h2>
          <p className="text-gray-600">
            Bitte stellen Sie sicher, dass eine Organisation konfiguriert ist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              ⚙️ <span className="ml-2">Konfiguration</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Systemeinstellungen und Mitgliedschaftskonfiguration verwalten
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setConfig({ ...defaultConfig })}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="Auf Standardwerte zurücksetzen"
            >
              🔄 Zurücksetzen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  Speichere...
                </>
              ) : (
                <>💾 Speichern</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">{tab.icon}</span>
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400">{tab.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Mitgliedschaft Tab */}
          {activeTab === 'membership' && (
            <div className="space-y-8">
              {/* Mitgliedsstatus Konfiguration */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Mitgliedsstatus verwalten
                  </h3>
                  <button
                    onClick={addMemberStatus}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    ➕ Status hinzufügen
                  </button>
                </div>
                
                <div className="space-y-4">
                  {config.membershipConfig.statuses.map((status, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Schlüssel
                          </label>
                          <input
                            type="text"
                            value={status.key}
                            onChange={(e) => updateMemberStatus(index, 'key', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="z.B. active"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bezeichnung
                          </label>
                          <input
                            type="text"
                            value={status.label}
                            onChange={(e) => updateMemberStatus(index, 'label', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="z.B. Aktiv"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Farbe
                          </label>
                          <select
                            value={status.color}
                            onChange={(e) => updateMemberStatus(index, 'color', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            {colorOptions.map(color => (
                              <option key={color.value} value={color.value}>
                                {color.label}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              colorOptions.find(c => c.value === status.color)?.class || 'bg-gray-100 text-gray-800'
                            }`}>
                              Vorschau: {status.label}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-end space-x-2">
                          <div className="flex-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={status.default || false}
                                onChange={(e) => {
                                  // Entferne default von allen anderen Status
                                  setConfig(prev => ({
                                    ...prev,
                                    membershipConfig: {
                                      ...prev.membershipConfig,
                                      statuses: prev.membershipConfig.statuses.map((s, i) => ({
                                        ...s,
                                        default: i === index ? e.target.checked : false
                                      }))
                                    }
                                  }));
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm text-gray-700">Standard</span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeMemberStatus(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Status entfernen"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beschreibung
                        </label>
                        <input
                          type="text"
                          value={status.description || ''}
                          onChange={(e) => updateMemberStatus(index, 'description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Beschreibung des Status (optional)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard-Mitgliedsbeitrag */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Standard-Mitgliedsbeitrag
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Betrag
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={config.membershipConfig.fees.defaultAmount}
                          onChange={(e) => updateFeeConfig('defaultAmount', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 pr-12 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="50.00"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">EUR</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Währung
                      </label>
                      <select
                        value={config.membershipConfig.fees.currency}
                        onChange={(e) => updateFeeConfig('currency', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">US-Dollar ($)</option>
                        <option value="CHF">Schweizer Franken (CHF)</option>
                        <option value="GBP">Britisches Pfund (£)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kulanzzeit (Tage)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={config.membershipConfig.fees.billing.gracePeriod}
                        onChange={(e) => updateBillingConfig('gracePeriod', parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Abrechnung Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-8">
              {/* Abrechnungsfrequenz */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Abrechnungszyklus
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Abrechnungsfrequenz
                      </label>
                      <div className="space-y-2">
                        {frequencyOptions.map(option => (
                          <label key={option.value} className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input
                              type="radio"
                              name="frequency"
                              value={option.value}
                              checked={config.membershipConfig.fees.billing.frequency === option.value}
                              onChange={(e) => updateBillingConfig('frequency', e.target.value)}
                              className="text-blue-600 focus:ring-blue-500 mr-3"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{option.label}</div>
                              <div className="text-sm text-gray-600">{option.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fälligkeitstag
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={config.membershipConfig.fees.billing.dueDay}
                        onChange={(e) => updateBillingConfig('dueDay', parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {config.membershipConfig.fees.billing.frequency === 'monthly' && 'Tag im Monat (1-31)'}
                        {config.membershipConfig.fees.billing.frequency === 'quarterly' && 'Tag im ersten Quartalsmonat (1-31)'}
                        {config.membershipConfig.fees.billing.frequency === 'yearly' && 'Tag im Jahr (1-365)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mahnungen */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Erinnerungen und Mahnungen
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Erinnerungen (Tage vor Fälligkeit)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {config.membershipConfig.fees.billing.reminderDays.map((days, index) => (
                        <div key={index}>
                          <label className="block text-xs text-gray-600 mb-1">
                            {index === 0 ? 'Erste Erinnerung' : index === 1 ? 'Zweite Erinnerung' : `${index + 1}. Erinnerung`}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={days}
                              onChange={(e) => updateReminderDays(index, e.target.value)}
                              className="w-full p-2 pr-12 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              placeholder="30"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 text-xs">Tage</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => {
                          const newReminderDays = [...config.membershipConfig.fees.billing.reminderDays, 0];
                          updateBillingConfig('reminderDays', newReminderDays);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        ➕ Erinnerung hinzufügen
                      </button>
                      
                      {config.membershipConfig.fees.billing.reminderDays.length > 1 && (
                        <button
                          onClick={() => {
                            const newReminderDays = config.membershipConfig.fees.billing.reminderDays.slice(0, -1);
                            updateBillingConfig('reminderDays', newReminderDays);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          ➖ Letzte entfernen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Allgemein Tab */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              {/* Allgemeine Einstellungen */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Grundeinstellungen
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Datumsformat
                      </label>
                      <select
                        value={config.generalConfig?.dateFormat || 'DD.MM.YYYY'}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          generalConfig: {
                            ...prev.generalConfig,
                            dateFormat: e.target.value
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zeitzone
                      </label>
                      <select
                        value={config.generalConfig?.timeZone || 'Europe/Berlin'}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          generalConfig: {
                            ...prev.generalConfig,
                            timeZone: e.target.value
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Europe/Berlin">Europa/Berlin (MESZ)</option>
                        <option value="Europe/Vienna">Europa/Wien (MESZ)</option>
                        <option value="Europe/Zurich">Europa/Zürich (MESZ)</option>
                        <option value="UTC">UTC (koordinierte Weltzeit)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vorschau der aktuellen Konfiguration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Konfigurationsvorschau
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info-Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-blue-600 text-xl mr-3">ℹ️</div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">
              Hinweise zur Konfiguration
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Jeder Mitgliedsstatus kann individuelle Beiträge und Abrechnungszyklen haben</li>
              <li>• Für inaktive oder gesperrte Mitglieder können Beiträge deaktiviert werden</li>
              <li>• Änderungen wirken sich auf alle zukünftigen Abrechnungen aus</li>
              <li>• Bereits erstellte Rechnungen werden nicht rückwirkend geändert</li>
              <li>• Ein Backup der aktuellen Konfiguration wird automatisch erstellt</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationView;