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
          label: 'Aktiv', 
          color: 'green', 
          default: true,
          description: '',
          billing: {
            fee: 50.00,
            frequency: 'yearly',
            dueDay: 1,
            active: true
          }
        },
        { 
          key: 'inactive', 
          label: 'Inaktiv', 
          color: 'gray',
          description: '',
          billing: {
            fee: 0.00,
            frequency: 'yearly',
            dueDay: 1,
            active: false
          }
        },
        { 
          key: 'suspended', 
          label: 'Gesperrt', 
          color: 'red',
          description: '',
          billing: {
            fee: 0.00,
            frequency: 'yearly',
            dueDay: 1,
            active: false
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
      alert(t('configuration.status.minRequired', 'Mindestens ein Status muss vorhanden sein.'));
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

  // Tab-Definitionen
  const tabs = [
    {
      id: 'membership',
      name: t('configuration.tabs.membership', 'Mitgliedschaft'),
      icon: '👥',
      description: t('configuration.tabs.membershipDesc', 'Status, Beiträge und Abrechnungszyklen')
    },
    {
      id: 'general',
      name: t('configuration.tabs.general', 'Allgemein'),
      icon: '⚙️',
      description: t('configuration.tabs.generalDesc', 'Grundeinstellungen')
    }
  ];

  // Farb-Optionen für Status
  const colorOptions = [
    { value: 'green', label: t('configuration.colors.green', 'Grün'), class: 'bg-green-100 text-green-800' },
    { value: 'blue', label: t('configuration.colors.blue', 'Blau'), class: 'bg-blue-100 text-blue-800' },
    { value: 'yellow', label: t('configuration.colors.yellow', 'Gelb'), class: 'bg-yellow-100 text-yellow-800' },
    { value: 'red', label: t('configuration.colors.red', 'Rot'), class: 'bg-red-100 text-red-800' },
    { value: 'gray', label: t('configuration.colors.gray', 'Grau'), class: 'bg-gray-100 text-gray-800' },
    { value: 'purple', label: t('configuration.colors.purple', 'Lila'), class: 'bg-purple-100 text-purple-800' }
  ];

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('organization.notFound', 'Organisation nicht gefunden')}
          </h2>
          <p className="text-gray-600">
            {t('organization.notFoundDesc', 'Bitte stellen Sie sicher, dass eine Organisation konfiguriert ist.')}
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
              ⚙️ <span className="ml-2">{t('configuration.title', 'Konfiguration')}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {t('configuration.subtitle', 'Systemeinstellungen und Mitgliedschaftskonfiguration verwalten')}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setConfig({ ...defaultConfig })}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title={t('configuration.reset', 'Auf Standardwerte zurücksetzen')}
            >
              🔄 {t('configuration.reset', 'Zurücksetzen')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  {t('configuration.saving', 'Speichere...')}
                </>
              ) : (
                <>💾 {t('configuration.save', 'Speichern')}</>
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
                    {t('configuration.status.title', 'Mitgliedsstatus verwalten')}
                  </h3>
                  <button
                    onClick={addMemberStatus}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    ➕ {t('configuration.status.add', 'Status hinzufügen')}
                  </button>
                </div>
                
                <div className="space-y-4">
                  {config.membershipConfig.statuses.map((status, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.status.key', 'Schlüssel')}
                          </label>
                          <input
                            type="text"
                            value={status.key}
                            onChange={(e) => updateMemberStatus(index, 'key', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configuration.status.keyPlaceholder', 'z.B. active')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.status.label', 'Bezeichnung')}
                          </label>
                          <input
                            type="text"
                            value={status.label}
                            onChange={(e) => updateMemberStatus(index, 'label', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configuration.status.labelPlaceholder', 'z.B. Aktiv')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.status.color', 'Farbe')}
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
                              {t('configuration.status.preview', 'Vorschau')}: {status.label}
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
                              <span className="text-sm text-gray-700">{t('configuration.status.default', 'Standard')}</span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeMemberStatus(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title={t('configuration.status.remove', 'Status entfernen')}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('configuration.status.description', 'Beschreibung')}
                        </label>
                        <input
                          type="text"
                          value={status.description || ''}
                          onChange={(e) => updateMemberStatus(index, 'description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder={t('configuration.status.descriptionPlaceholder', 'Beschreibung des Status (optional)')}
                        />
                      </div>

                      {/* Billing-Konfiguration für diesen Status */}
                      <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          {t('configuration.status.billingTitle', 'Beitrags- und Abrechnungseinstellungen')}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={status.billing?.active || false}
                                onChange={(e) => updateStatusBilling(index, 'active', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm text-gray-700">{t('configuration.status.billingActive', 'Beiträge erheben')}</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              {t('configuration.status.billingActiveHelp', 'Wenn deaktiviert, werden keine Beiträge berechnet')}
                            </p>
                          </div>
                          
                          {status.billing?.active && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('configuration.status.feeAmount', 'Beitragshöhe')}
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={status.billing?.fee || 0}
                                    onChange={(e) => updateStatusBilling(index, 'fee', e.target.value)}
                                    className="w-full p-2 pr-12 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="50.00"
                                  />
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 text-sm">
                                      {config.membershipConfig.defaultCurrency || 'EUR'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('configuration.status.billingFrequency', 'Abrechnungsturnus')}
                                </label>
                                <select
                                  value={status.billing?.frequency || 'yearly'}
                                  onChange={(e) => updateStatusBilling(index, 'frequency', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="monthly">{t('configuration.billing.monthly', 'Monatlich')}</option>
                                  <option value="quarterly">{t('configuration.billing.quarterly', 'Quartalsweise')}</option>
                                  <option value="yearly">{t('configuration.billing.yearly', 'Jährlich')}</option>
                                  <option value="custom">{t('configuration.billing.custom', 'Benutzerdefiniert')}</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('configuration.status.dueDay', 'Fälligkeitstag')}
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={status.billing?.dueDay || 1}
                                  onChange={(e) => updateStatusBilling(index, 'dueDay', parseInt(e.target.value) || 1)}
                                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  placeholder="1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {status.billing?.frequency === 'monthly' && t('configuration.billing.dueDayHelp.monthly', 'Tag im Monat (1-31)')}
                                  {status.billing?.frequency === 'quarterly' && t('configuration.billing.dueDayHelp.quarterly', 'Tag im ersten Quartalsmonat (1-31)')}
                                  {status.billing?.frequency === 'yearly' && t('configuration.billing.dueDayHelp.yearly', 'Tag im Jahr (1-365)')}
                                </p>
                              </div>
                              
                              <div className="md:col-span-2">
                                <div className="bg-blue-50 p-2 rounded text-xs">
                                  <strong>{t('configuration.status.preview', 'Vorschau')}:</strong> {t('configuration.status.previewInfo', 'Mitglieder mit Status')} "{status.label}" 
                                  {' '}{t('configuration.status.previewPay', 'zahlen')} {status.billing?.fee || 0} {config.membershipConfig.defaultCurrency || 'EUR'}
                                  {' '}
                                  {status.billing?.frequency === 'monthly' && t('configuration.billing.monthlyDesc', 'jeden Monat')}
                                  {status.billing?.frequency === 'quarterly' && t('configuration.billing.quarterlyDesc', 'alle 3 Monate')}
                                  {status.billing?.frequency === 'yearly' && t('configuration.billing.yearlyDesc', 'einmal pro Jahr')}
                                  {' '}{t('configuration.status.previewOn', 'am')} {status.billing?.dueDay || 1}. {t('configuration.status.previewOfPeriod', 'des Zeitraums')}.
                                </div>
                              </div>
                            </>
                          )}
                          
                          {!status.billing?.active && (
                            <div className="md:col-span-2">
                              <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                                <strong>{t('common.info', 'Info')}:</strong> {t('configuration.status.noFeesInfo', 'Für diesen Status werden keine automatischen Beiträge erhoben.')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard-Währung */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {t('configuration.defaultCurrency.title', 'Standard-Währung')}
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('configuration.defaultCurrency.label', 'Währung für alle Beiträge')}
                  </label>
                  <select
                    value={config.membershipConfig.defaultCurrency}
                    onChange={(e) => updateDefaultCurrency(e.target.value)}
                    className="w-full max-w-md p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EUR">{t('configuration.currency.eur', 'Euro (€)')}</option>
                    <option value="USD">{t('configuration.currency.usd', 'US-Dollar ($)')}</option>
                    <option value="CHF">{t('configuration.currency.chf', 'Schweizer Franken (CHF)')}</option>
                    <option value="GBP">{t('configuration.currency.gbp', 'Britisches Pfund (£)')}</option>
                  </select>
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
                  {t('configuration.general.title', 'Grundeinstellungen')}
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('configuration.general.dateFormat', 'Datumsformat')}
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
                        {t('configuration.general.timeZone', 'Zeitzone')}
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
                        <option value="Europe/Berlin">{t('configuration.timezone.berlin', 'Europa/Berlin (MESZ)')}</option>
                        <option value="Europe/Vienna">{t('configuration.timezone.vienna', 'Europa/Wien (MESZ)')}</option>
                        <option value="Europe/Zurich">{t('configuration.timezone.zurich', 'Europa/Zürich (MESZ)')}</option>
                        <option value="UTC">{t('configuration.timezone.utc', 'UTC (koordinierte Weltzeit)')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vorschau der aktuellen Konfiguration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {t('configuration.general.preview', 'Konfigurationsvorschau')}
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
              {t('configuration.info.title', 'Hinweise zur Konfiguration')}
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('configuration.info.membershipChanges', 'Änderungen an der Mitgliedschaftskonfiguration wirken sich auf alle zukünftigen Abrechnungen aus')}</li>
              <li>• {t('configuration.info.existingBills', 'Bereits versendete Rechnungen werden nicht rückwirkend geändert')}</li>
              <li>• {t('configuration.info.individualOverride', 'Die Standardeinstellungen können für einzelne Mitglieder überschrieben werden')}</li>
              <li>• {t('configuration.info.autoBackup', 'Ein Backup der aktuellen Konfiguration wird automatisch erstellt')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationView;