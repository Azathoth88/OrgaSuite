// frontend/src/components/views/ConfigurationView.js - VOLLSTÄNDIG ERWEITERT
import React, { useState, useContext, useEffect } from 'react';
import { OrganizationContext } from '../../contexts/OrganizationContext';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ConfigurationView = () => {
  const { organization, saveOrganization } = useContext(OrganizationContext);
  const { t } = useOrgTranslation();
  
  // Loading und Error States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('membership');
  
  // Default Konfiguration VOLLSTÄNDIG ERWEITERT
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
      // ✅ NEUE KONFIGURATIONEN
      joiningSources: [
        { key: 'website', label: 'Internet / Webseite', color: 'blue', description: '', active: true },
        { key: 'social_media', label: 'Social Media', color: 'purple', description: '', active: true },
        { key: 'advertising', label: 'Werbung Geflügelzeitung', color: 'yellow', description: '', active: true },
        { key: 'recommendation', label: 'Empfehlung SV-Mitglied', color: 'green', description: '', active: true },
        { key: 'other', label: 'Sonstiges', color: 'gray', description: '', active: true }
      ],
      leavingReasons: [
        { key: 'voluntary_resignation', label: 'Freiwillige Kündigung', color: 'blue', description: '', requiresDate: true, active: true },
        { key: 'stopped_breeding', label: 'Zuchtaufgabe', color: 'orange', description: '', requiresDate: true, active: true },
        { key: 'deceased', label: 'Verstorben', color: 'gray', description: '', requiresDate: true, active: true },
        { key: 'expelled', label: 'Kündigung durch Verein', color: 'red', description: '', requiresDate: true, active: true },
        { key: 'no_reason', label: 'Keine Angabe', color: 'gray', description: '', requiresDate: false, active: true }
      ],
      defaultCurrency: 'EUR'
    },
    generalConfig: {
      dateFormat: 'DD.MM.YYYY',
      timeZone: 'Europe/Berlin',
      currency: 'EUR'
    }
  };

  // Aktuelle Konfiguration aus Organization Settings laden mit sicherer Struktur
  const [config, setConfig] = useState(() => {
    const orgSettings = organization?.settings || {};
    return {
      membershipConfig: {
        ...defaultConfig.membershipConfig,
        ...(orgSettings.membershipConfig || {}),
        statuses: orgSettings.membershipConfig?.statuses || defaultConfig.membershipConfig.statuses,
        joiningSources: orgSettings.membershipConfig?.joiningSources || defaultConfig.membershipConfig.joiningSources,
        leavingReasons: orgSettings.membershipConfig?.leavingReasons || defaultConfig.membershipConfig.leavingReasons
      },
      generalConfig: {
        ...defaultConfig.generalConfig,
        ...(orgSettings.generalConfig || {})
      }
    };
  });

  // Konfiguration beim Laden der Organization aktualisieren
  useEffect(() => {
    if (organization?.settings) {
      setConfig(prevConfig => ({
        membershipConfig: {
          ...defaultConfig.membershipConfig,
          ...(organization.settings.membershipConfig || {}),
          statuses: organization.settings.membershipConfig?.statuses || defaultConfig.membershipConfig.statuses,
          joiningSources: organization.settings.membershipConfig?.joiningSources || defaultConfig.membershipConfig.joiningSources,
          leavingReasons: organization.settings.membershipConfig?.leavingReasons || defaultConfig.membershipConfig.leavingReasons
        },
        generalConfig: {
          ...defaultConfig.generalConfig,
          ...(organization.settings.generalConfig || {})
        }
      }));
    }
  }, [organization]);

  // ✅ RESET-FUNKTION MIT API-AUFRUF
  const handleResetToDefaults = async () => {
    if (!window.confirm(t('configuration.reset.confirm', 'Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.'))) {
      return;
    }

    setSaving(true);
    
    try {
      // Fallback: Use local defaultConfig if API is not available
      setConfig({ ...defaultConfig });
      
      // Versuche API-Call, aber verwende lokalen Fallback bei Fehler
      try {
        const response = await axios.post(`${API_URL}/organization/config/reset-defaults`);
        if (response.data?.config) {
          setConfig(response.data.config);
        }
      } catch (apiError) {
        console.warn('API reset not available, using local default config:', apiError);
      }
      
      // Organization Context aktualisieren
      if (saveOrganization) {
        await saveOrganization({
          ...organization,
          settings: config
        });
      }
      
      alert(t('configuration.reset.success', 'Konfiguration wurde erfolgreich auf Standardwerte zurückgesetzt.'));
    } catch (error) {
      console.error('Error resetting configuration:', error);
      alert(t('configuration.reset.error', 'Fehler beim Zurücksetzen der Konfiguration.'));
    } finally {
      setSaving(false);
    }
  };

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

  // ✅ VOLLSTÄNDIGE MITGLIEDSSTATUS-FUNKTIONEN
  const updateMemberStatus = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: (prev.membershipConfig?.statuses || []).map((status, i) => 
          i === index ? { ...status, [field]: value } : status
        )
      }
    }));
  };

  const addMemberStatus = () => {
    const currentStatuses = config.membershipConfig?.statuses || [];
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: [
          ...currentStatuses,
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

  const removeMemberStatus = (index) => {
    const currentStatuses = config.membershipConfig?.statuses || [];
    if (currentStatuses.length <= 1) {
      alert(t('configuration.status.minRequired', 'Mindestens ein Status muss vorhanden sein.'));
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: (prev.membershipConfig?.statuses || []).filter((_, i) => i !== index)
      }
    }));
  };

  const updateStatusBilling = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        statuses: (prev.membershipConfig?.statuses || []).map((status, i) => 
          i === index ? { 
            ...status, 
            billing: { 
              ...(status.billing || {}), 
              [field]: field === 'fee' ? parseFloat(value) || 0 : value 
            } 
          } : status
        )
      }
    }));
  };

  const updateDefaultCurrency = (currency) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...(prev.membershipConfig || {}),
        defaultCurrency: currency
      }
    }));
  };

  // ✅ NEUE FUNKTIONEN FÜR BEITRITTSQUELLEN
  const updateJoiningSource = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        joiningSources: (prev.membershipConfig?.joiningSources || []).map((source, i) => 
          i === index ? { ...source, [field]: value } : source
        )
      }
    }));
  };

  const addJoiningSource = () => {
    const currentSources = config.membershipConfig?.joiningSources || [];
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        joiningSources: [
          ...currentSources,
          {
            key: `source_${Date.now()}`,
            label: 'Neue Beitrittsquelle',
            color: 'blue',
            description: '',
            active: true
          }
        ]
      }
    }));
  };

  const removeJoiningSource = (index) => {
    const currentSources = config.membershipConfig?.joiningSources || [];
    if (currentSources.length <= 1) {
      alert(t('configuration.joiningSources.minRequired', 'Mindestens eine Beitrittsquelle muss vorhanden sein.'));
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        joiningSources: (prev.membershipConfig?.joiningSources || []).filter((_, i) => i !== index)
      }
    }));
  };

  // ✅ NEUE FUNKTIONEN FÜR KÜNDIGUNGSGRÜNDE
  const updateLeavingReason = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        leavingReasons: (prev.membershipConfig?.leavingReasons || []).map((reason, i) => 
          i === index ? { ...reason, [field]: value } : reason
        )
      }
    }));
  };

  const addLeavingReason = () => {
    const currentReasons = config.membershipConfig?.leavingReasons || [];
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        leavingReasons: [
          ...currentReasons,
          {
            key: `reason_${Date.now()}`,
            label: 'Neuer Kündigungsgrund',
            color: 'blue',
            description: '',
            requiresDate: true,
            active: true
          }
        ]
      }
    }));
  };

  const removeLeavingReason = (index) => {
    const currentReasons = config.membershipConfig?.leavingReasons || [];
    if (currentReasons.length <= 1) {
      alert(t('configuration.leavingReasons.minRequired', 'Mindestens ein Kündigungsgrund muss vorhanden sein.'));
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      membershipConfig: {
        ...prev.membershipConfig,
        leavingReasons: (prev.membershipConfig?.leavingReasons || []).filter((_, i) => i !== index)
      }
    }));
  };

  // Tab-Definitionen VOLLSTÄNDIG ERWEITERT
  const tabs = [
    {
      id: 'membership',
      name: t('configuration.tabs.membership', 'Mitgliedschaft'),
      icon: '👥',
      description: t('configuration.tabs.membershipDesc', 'Status, Beiträge und Abrechnungszyklen')
    },
    {
      id: 'sources_reasons', // ✅ NEUER TAB
      name: t('configuration.tabs.sourcesReasons', 'Quellen & Gründe'),
      icon: '📝',
      description: t('configuration.tabs.sourcesReasonsDesc', 'Beitrittsquellen und Kündigungsgründe')
    },
    {
      id: 'general',
      name: t('configuration.tabs.general', 'Allgemein'),
      icon: '⚙️',
      description: t('configuration.tabs.generalDesc', 'Grundeinstellungen')
    }
  ];

  // Farb-Optionen für Status ERWEITERT
  const colorOptions = [
    { value: 'green', label: t('configuration.colors.green', 'Grün'), class: 'bg-green-100 text-green-800' },
    { value: 'blue', label: t('configuration.colors.blue', 'Blau'), class: 'bg-blue-100 text-blue-800' },
    { value: 'yellow', label: t('configuration.colors.yellow', 'Gelb'), class: 'bg-yellow-100 text-yellow-800' },
    { value: 'red', label: t('configuration.colors.red', 'Rot'), class: 'bg-red-100 text-red-800' },
    { value: 'gray', label: t('configuration.colors.gray', 'Grau'), class: 'bg-gray-100 text-gray-800' },
    { value: 'purple', label: t('configuration.colors.purple', 'Lila'), class: 'bg-purple-100 text-purple-800' },
    { value: 'orange', label: t('configuration.colors.orange', 'Orange'), class: 'bg-orange-100 text-orange-800' },
    { value: 'cyan', label: t('configuration.colors.cyan', 'Cyan'), class: 'bg-cyan-100 text-cyan-800' }
  ];

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('common.loading', 'Lädt...')}
          </h2>
          <p className="text-gray-600">
            {t('organization.notFoundDesc', 'Organisation wird geladen...')}
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
              onClick={handleResetToDefaults}
              disabled={saving}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
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
          {/* ✅ VOLLSTÄNDIGER MITGLIEDSCHAFT TAB */}
          {activeTab === 'membership' && (
            <div className="space-y-8">
              {/* Mitgliedsstatus Konfiguration - VOLLSTÄNDIG */}
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
                  {(config.membershipConfig?.statuses || []).map((status, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.status.key', 'Schlüssel')}
                          </label>
                          <input
                            type="text"
                            value={status.key || ''}
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
                            value={status.label || ''}
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
                            value={status.color || 'blue'}
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
                              colorOptions.find(c => c.value === (status.color || 'blue'))?.class || 'bg-gray-100 text-gray-800'
                            }`}>
                              {t('configuration.status.preview', 'Vorschau')}: {status.label || 'Status'}
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
                                      statuses: (prev.membershipConfig?.statuses || []).map((s, i) => ({
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

                      {/* ✅ VOLLSTÄNDIGE Billing-Konfiguration für diesen Status */}
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
                                      {config.membershipConfig?.defaultCurrency || 'EUR'}
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
                                  <strong>{t('configuration.status.preview', 'Vorschau')}:</strong> {t('configuration.status.previewInfo', 'Mitglieder mit Status')} "{status.label || 'Status'}" 
                                  {' '}{t('configuration.status.previewPay', 'zahlen')} {status.billing?.fee || 0} {config.membershipConfig?.defaultCurrency || 'EUR'}
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
                    value={config.membershipConfig?.defaultCurrency || 'EUR'}
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

          {/* ✅ NEUER TAB: Quellen & Gründe */}
          {activeTab === 'sources_reasons' && (
            <div className="space-y-8">
              {/* Beitrittsquellen Konfiguration */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {t('configuration.joiningSources.title', 'Beitrittsquellen verwalten')}
                  </h3>
                  <button
                    onClick={addJoiningSource}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    ➕ {t('configuration.joiningSources.add', 'Quelle hinzufügen')}
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(config.membershipConfig?.joiningSources || []).map((source, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.joiningSources.key', 'Schlüssel')}
                          </label>
                          <input
                            type="text"
                            value={source.key || ''}
                            onChange={(e) => updateJoiningSource(index, 'key', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configuration.joiningSources.keyPlaceholder', 'z.B. website')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.joiningSources.label', 'Bezeichnung')}
                          </label>
                          <input
                            type="text"
                            value={source.label || ''}
                            onChange={(e) => updateJoiningSource(index, 'label', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configuration.joiningSources.labelPlaceholder', 'z.B. Internet / Webseite')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.joiningSources.color', 'Farbe')}
                          </label>
                          <select
                            value={source.color || 'blue'}
                            onChange={(e) => updateJoiningSource(index, 'color', e.target.value)}
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
                              colorOptions.find(c => c.value === (source.color || 'blue'))?.class || 'bg-gray-100 text-gray-800'
                            }`}>
                              {t('configuration.joiningSources.preview', 'Vorschau')}: {source.label || 'Quelle'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-end space-x-2">
                          <div className="flex-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={source.active !== false}
                                onChange={(e) => updateJoiningSource(index, 'active', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm text-gray-700">
                                {t('configuration.joiningSources.active', 'Aktiv')}
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeJoiningSource(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title={t('configuration.joiningSources.remove', 'Quelle entfernen')}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('configuration.joiningSources.description', 'Beschreibung')}
                        </label>
                        <input
                          type="text"
                          value={source.description || ''}
                          onChange={(e) => updateJoiningSource(index, 'description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder={t('configuration.joiningSources.descriptionPlaceholder', 'Beschreibung der Beitrittsquelle (optional)')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kündigungsgründe Konfiguration */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {t('configuration.leavingReasons.title', 'Kündigungsgründe verwalten')}
                  </h3>
                  <button
                    onClick={addLeavingReason}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    ➕ {t('configuration.leavingReasons.add', 'Grund hinzufügen')}
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(config.membershipConfig?.leavingReasons || []).map((reason, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.leavingReasons.key', 'Schlüssel')}
                          </label>
                          <input
                            type="text"
                            value={reason.key || ''}
                            onChange={(e) => updateLeavingReason(index, 'key', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configuration.leavingReasons.keyPlaceholder', 'z.B. deceased')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.leavingReasons.label', 'Bezeichnung')}
                          </label>
                          <input
                            type="text"
                            value={reason.label || ''}
                            onChange={(e) => updateLeavingReason(index, 'label', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configuration.leavingReasons.labelPlaceholder', 'z.B. Verstorben')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('configuration.leavingReasons.color', 'Farbe')}
                          </label>
                          <select
                            value={reason.color || 'blue'}
                            onChange={(e) => updateLeavingReason(index, 'color', e.target.value)}
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
                              colorOptions.find(c => c.value === (reason.color || 'blue'))?.class || 'bg-gray-100 text-gray-800'
                            }`}>
                              {t('configuration.leavingReasons.preview', 'Vorschau')}: {reason.label || 'Grund'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-end space-x-2">
                          <div className="flex-1 space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={reason.active !== false}
                                onChange={(e) => updateLeavingReason(index, 'active', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm text-gray-700">
                                {t('configuration.leavingReasons.active', 'Aktiv')}
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={reason.requiresDate || false}
                                onChange={(e) => updateLeavingReason(index, 'requiresDate', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                              />
                              <span className="text-sm text-gray-700">
                                {t('configuration.leavingReasons.requiresDate', 'Datum erforderlich')}
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeLeavingReason(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title={t('configuration.leavingReasons.remove', 'Grund entfernen')}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('configuration.leavingReasons.description', 'Beschreibung')}
                        </label>
                        <input
                          type="text"
                          value={reason.description || ''}
                          onChange={(e) => updateLeavingReason(index, 'description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder={t('configuration.leavingReasons.descriptionPlaceholder', 'Beschreibung des Kündigungsgrunds (optional)')}
                        />
                      </div>
                    </div>
                  ))}
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
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info-Panel VOLLSTÄNDIG ERWEITERT */}
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
              <li>• <strong>{t('configuration.info.sourcesReasons', 'Beitrittsquellen und Kündigungsgründe helfen bei der statistischen Auswertung der Mitgliederbewegungen')}</strong></li>
              <li>• {t('configuration.info.billingCycles', 'Verschiedene Mitgliedsstatus können unterschiedliche Beitragszyklen haben')}</li>
              <li>• {t('configuration.info.statusColors', 'Farben helfen bei der visuellen Unterscheidung der Status in Listen und Berichten')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationView;