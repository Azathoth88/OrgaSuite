// frontend/src/components/modals/MemberFormModal.js - VOLLSTÄNDIGE VERSION mit Currency Fix + Kündigungsgründen + Beitrittsquellen + BIC-Lookup + GRUPPEN
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import { useIBANValidation, formatIBAN } from '../../utils/ibanUtils';
import { CustomFieldRenderer, validateCustomField } from '../fields/CustomFieldComponents';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ✅ Color Options für Gruppen
const colorOptions = [
  { value: 'gray', class: 'bg-gray-100 text-gray-800' },
  { value: 'blue', class: 'bg-blue-100 text-blue-800' },
  { value: 'green', class: 'bg-green-100 text-green-800' },
  { value: 'yellow', class: 'bg-yellow-100 text-yellow-800' },
  { value: 'red', class: 'bg-red-100 text-red-800' },
  { value: 'purple', class: 'bg-purple-100 text-purple-800' },
  { value: 'pink', class: 'bg-pink-100 text-pink-800' },
  { value: 'indigo', class: 'bg-indigo-100 text-indigo-800' }
];

const MemberFormModal = ({ isOpen, onClose, member = null, onSuccess }) => {
  const { t, organization } = useOrgTranslation();
  const isEditMode = !!member;
  
  // ✅ ERWEITERTE State für alle Konfigurationsdaten
  const [memberStatuses, setMemberStatuses] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState('EUR');
  const [customFieldsConfig, setCustomFieldsConfig] = useState({ tabs: [] });
  const [joiningSources, setJoiningSources] = useState([]);
  const [leavingReasons, setLeavingReasons] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  const [loadingSourcesAndReasons, setLoadingSourcesAndReasons] = useState(false);
  
  // ✅ ERWEITERTE Form States mit neuen Feldern und GRUPPEN
  const [formData, setFormData] = useState({
    // Persönliche Daten
    salutation: '',
    title: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    // Kontaktdaten
    email: '',
    landline: '',
    mobile: '',
    website: '',
    // Sonstige
    status: 'active',
    memberNumber: '',
    address: {
      street: '',
      city: '',
      zip: '',
      country: 'Deutschland'
    },
    // ✅ NEU: Gruppen
    groups: [],
    membershipData: {
      joinDate: '',
      membershipStatus: '',
      joiningSource: '',
      leavingReason: '',
      leavingDate: '',
      paymentMethod: 'Überweisung',
      bankDetails: {
        accountHolder: '',
        iban: '',
        bic: '',
        bankName: '',
        sepaActive: false
      },
      customFields: {}
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState('personal');

  // ERWEITERTE IBAN Validation Hook mit Bank-Lookup
  const {
    iban,
    validation: ibanValidation,
    handleIbanChange,
    isValid: isIbanValid,
    error: ibanError,
    formatted: ibanFormatted,
    countryCode: ibanCountryCode,
    bankCode: ibanBankCode,
    bic: lookupBic,
    bankName: lookupBankName,
    bankLoading,
    bankError
  } = useIBANValidation(formData.membershipData?.bankDetails?.iban || '');

  // ✅ NEU: Automatisch BIC und Bankname aktualisieren, wenn sie über die API gefunden wurden
  useEffect(() => {
    if (isIbanValid && lookupBic && !bankLoading) {
      setFormData(prev => ({
        ...prev,
        membershipData: {
          ...prev.membershipData,
          bankDetails: {
            ...prev.membershipData.bankDetails,
            bic: lookupBic,
            bankName: lookupBankName
          }
        }
      }));
    }
  }, [lookupBic, lookupBankName, isIbanValid, bankLoading]);

  // ✅ Konfiguration aus Organization laden
  useEffect(() => {
    const fetchConfiguration = async () => {
      try {
        setLoadingStatuses(true);
        setLoadingSourcesAndReasons(true);
        setLoadingCustomFields(true);
        
        // Organization-Daten laden (enthält alle Settings)
        const orgResponse = await axios.get(`${API_URL}/organization`);
        
        if (orgResponse.data && orgResponse.data.settings) {
          const settings = orgResponse.data.settings;
          const membershipConfig = settings.membershipConfig || {};
          
          // Member-Status
          const statuses = membershipConfig.statuses || [];
          setMemberStatuses(statuses);
          
          // Währung
          const currency = membershipConfig.defaultCurrency || 'EUR';
          setDefaultCurrency(currency);
          
          // Beitrittsquellen
          const sources = membershipConfig.joiningSources || [];
          setJoiningSources(sources);
          
          // Kündigungsgründe
          const reasons = membershipConfig.leavingReasons || [];
          setLeavingReasons(reasons);
          
          // Custom Fields
          const customFields = membershipConfig.customFields || { tabs: [] };
          setCustomFieldsConfig(customFields);
          
          console.log('✅ Loaded configuration from organization:', {
            statuses: statuses.length,
            sources: sources.length,
            reasons: reasons.length,
            currency,
            customFieldTabs: customFields.tabs?.length || 0,
            groups: membershipConfig.groups?.length || 0
          });
          
          // Default status setzen - NUR wenn kein Member geladen wird (neues Mitglied)
          if (!isEditMode && !formData.membershipData.membershipStatus && statuses.length > 0) {
            const defaultStatus = statuses.find(s => s.default === true) || statuses[0];
            setFormData(prev => ({
              ...prev,
              membershipData: {
                ...prev.membershipData,
                membershipStatus: defaultStatus.key
              }
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error fetching configuration:', error);
        
        // Fallback auf member-statuses Endpunkt
        try {
          const statusResponse = await axios.get(`${API_URL}/organization/member-statuses`);
          if (statusResponse.data.statuses) {
            setMemberStatuses(statusResponse.data.statuses);
            setDefaultCurrency(statusResponse.data.stats?.defaultCurrency || 'EUR');
            console.log('✅ Loaded statuses from fallback endpoint');
          }
        } catch (statusError) {
          console.error('❌ Error fetching member statuses:', statusError);
        }
        
        // Setze leere Arrays für Sources und Reasons
        setJoiningSources([]);
        setLeavingReasons([]);
        setCustomFieldsConfig({ tabs: [] });
      } finally {
        setLoadingStatuses(false);
        setLoadingSourcesAndReasons(false);
        setLoadingCustomFields(false);
      }
    };

    if (isOpen) {
      fetchConfiguration();
    }
  }, [isOpen]);

  // Load member data in edit mode
  useEffect(() => {
  if (isEditMode && member) {
        console.log('📊 Member data received:', {
      member,
      membershipData: member.membershipData,
      storedStatus: member.membershipData?.membershipStatus,
      oldStatus: member.status
    });

    const membershipData = member.membershipData || {};
    
    // ✅ WICHTIG: Erstelle das membershipData Objekt mit dem korrekten Status aus member.status
    const formattedMembershipData = {
      joinDate: membershipData.joinDate || member.joinedAt || new Date().toISOString().split('T')[0],
      membershipStatus: membershipData.membershipStatus || '', // ✅ Verwende member.status für den konfigurierbaren Status
      joiningSource: membershipData.joiningSource || '',
      leavingReason: membershipData.leavingReason || '',
      leavingDate: membershipData.leavingDate || '',
      paymentMethod: membershipData.paymentMethod || 'Überweisung',
      bankDetails: membershipData.bankDetails || {
        accountHolder: '',
        iban: '',
        bic: '',
        bankName: '',
        sepaActive: false
      },
      customFields: membershipData.customFields || {}
    };
    
    // DEBUG: Ausgabe der formatierten Daten
    console.log('📊 Formatted membershipData:', formattedMembershipData);

    setFormData({
      salutation: member.salutation || '',
      title: member.title || '',
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      gender: member.gender || '',
      birthDate: member.birthDate || '',
      email: member.email || '',
      landline: member.landline || '',
      mobile: member.mobile || '',
      website: member.website || '',
      status: member.status || 'active', // Dies wird nicht mehr verwendet, aber für Kompatibilität belassen
      memberNumber: member.memberNumber || '',
      address: member.address || {
        street: '',
        city: '',
        zip: '',
        country: 'Deutschland'
      },
      groups: member.groups || [],
      membershipData: formattedMembershipData
    });
    
    // IBAN Handler aufrufen, falls vorhanden
    if (formattedMembershipData.bankDetails?.iban) {
      handleIbanChange(formattedMembershipData.bankDetails.iban);
    }
  }
}, [member, isEditMode]);


  // Reset form when modal opens/closes
useEffect(() => {
  if (!isOpen) {
    setTimeout(() => {
      // Nur beim Schließen zurücksetzen
      if (!isEditMode) {
        const defaultStatus = memberStatuses.find(s => s.isDefault) || memberStatuses[0];
        setFormData({
          salutation: '',
          title: '',
          firstName: '',
          lastName: '',
          gender: '',
          birthDate: '',
          email: '',
          landline: '',
          mobile: '',
          website: '',
          status: 'active',
          memberNumber: '',
          address: {
            street: '',
            city: '',
            zip: '',
            country: 'Deutschland'
          },
          groups: [], // ✅ NEU: Gruppen zurücksetzen
          membershipData: {
            joinDate: new Date().toISOString().split('T')[0],
            membershipStatus: defaultStatus?.key || '',
            joiningSource: '',
            leavingReason: '',
            leavingDate: '',
            paymentMethod: 'Überweisung',
            bankDetails: {
              accountHolder: '',
              iban: '',
              bic: '',
              bankName: '',
              sepaActive: false
            },
            customFields: {}
          }
        });
      } // Diese schließende Klammer war wichtig
      setError(null);
      setFieldErrors({});
      handleIbanChange('');
      setActiveTab('personal');
      setDefaultCurrency('EUR');
    }, 300);
  }
}, [isOpen, memberStatuses, isEditMode]); // isEditMode zu den Dependencies hinzugefügt

  // ✅ Custom Fields Handlers
  const updateCustomFieldValue = (tabKey, fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      membershipData: {
        ...prev.membershipData,
        customFields: {
          ...prev.membershipData.customFields,
          [tabKey]: {
            ...prev.membershipData.customFields[tabKey],
            [fieldKey]: value
          }
        }
      }
    }));
  };

  const getCustomFieldValue = (tabKey, fieldKey) => {
    return formData.membershipData?.customFields?.[tabKey]?.[fieldKey];
  };

  // ✅ ERWEITERTE Validierung mit neuen Feldern + Custom Fields
  const validateForm = () => {
    const errors = {};
    
    // Pflichtfelder
    if (!formData.firstName.trim()) {
      errors.firstName = t('validation.required', 'Pflichtfeld');
    }
    if (!formData.lastName.trim()) {
      errors.lastName = t('validation.required', 'Pflichtfeld');
    }
    
    // E-Mail & Website Validierung
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('validation.invalidEmail', 'Ungültige E-Mail-Adresse');
    }
    if (formData.website.trim() && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(formData.website)) {
      errors.website = t('validation.invalidUrl', 'Ungültige URL');
    }
    
    // IBAN Validierung
    if (iban && !isIbanValid) {
      errors.iban = ibanError || t('validation.invalidIban', 'Ungültige IBAN');
    }
    
    // ✅ NEU: Validierung für Kündigungsdatum
    if (formData.membershipData.leavingReason) {
      const selectedReason = leavingReasons.find(r => r.key === formData.membershipData.leavingReason);
      if (selectedReason?.requiresDate && !formData.membershipData.leavingDate) {
        errors.leavingDate = t('validation.leavingDateRequired', 'Kündigungsdatum ist für diesen Grund erforderlich');
      }
    }
    
    // ✅ Custom Fields Validierung
    customFieldsConfig.tabs?.forEach(tab => {
      if (tab.active !== false) {
        tab.fields?.forEach(field => {
          const value = getCustomFieldValue(tab.key, field.key);
          const fieldError = validateCustomField(field, value);
          if (fieldError) {
            errors[`customField_${tab.key}_${field.key}`] = fieldError;
          }
        });
      }
    });
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enhanced submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Find first tab with error and switch to it
      const firstErrorKey = Object.keys(fieldErrors)[0];
      if (firstErrorKey && firstErrorKey.startsWith('customField_')) {
        const parts = firstErrorKey.split('_');
        const errorTabKey = parts[1];
        const customTab = customFieldsConfig.tabs?.find(tab => tab.key === errorTabKey);
        if (customTab) {
          setActiveTab(`custom_${customTab.key}`);
        }
      }
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use membershipStatus to set the member's status
      const submitData = {
        salutation: formData.salutation,
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        birthDate: formData.birthDate || undefined,
        email: formData.email || undefined,
        landline: formData.landline || undefined,
        mobile: formData.mobile || undefined,
        website: formData.website || undefined,
        status: formData.membershipData.membershipStatus || 'active',
        memberNumber: formData.memberNumber || undefined,
        address: formData.address,
        groups: formData.groups || [], // ✅ NEU: Gruppen mitsenden
        membershipData: {
          ...formData.membershipData,
          bankDetails: (iban || formData.membershipData.bankDetails.accountHolder || 
                       formData.membershipData.bankDetails.bic || formData.membershipData.bankDetails.bankName ||
                       formData.membershipData.bankDetails.sepaActive) ? {
            accountHolder: formData.membershipData.bankDetails.accountHolder || '',
            iban: iban || '',
            bic: formData.membershipData.bankDetails.bic || '',
            bankName: formData.membershipData.bankDetails.bankName || '',
            sepaActive: formData.membershipData.bankDetails.sepaActive || false
          } : undefined
        }
      };
      
      console.log('📤 Submitting member data with custom fields and groups:', submitData);
      
      const response = isEditMode
        ? await axios.put(`${API_URL}/members/${member.id}`, submitData)
        : await axios.post(`${API_URL}/members`, submitData);
      
      console.log('✅ Member saved successfully:', response.data);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Error saving member:', error);
      
      let errorMessage = t('common.saveError', 'Fehler beim Speichern');
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        
        if (error.response.data.field) {
          const field = error.response.data.field;
          
          switch(field) {
            case 'email':
              setFieldErrors(prev => ({ ...prev, email: errorMessage }));
              setActiveTab('contact');
              break;
            case 'memberNumber':
              setFieldErrors(prev => ({ ...prev, memberNumber: errorMessage }));
              break;
            case 'membershipData.bankDetails.iban':
              setFieldErrors(prev => ({ ...prev, iban: errorMessage }));
              setActiveTab('bank');
              break;
          }
        }
        
        if (error.response.data.details) {
          if (Array.isArray(error.response.data.details)) {
            errorMessage = error.response.data.details.join(', ');
          } else if (typeof error.response.data.details === 'string') {
            errorMessage = error.response.data.details;
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate age
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(formData.birthDate);
  const selectedStatus = memberStatuses.find(s => s.key === formData.membershipData.membershipStatus);

  // ✅ Enhanced tab system with custom tabs and groups
  const baseTabs = [
    {
      id: 'personal',
      label: t('members.tabs.personal', 'Person'),
      icon: '👤'
    },
    {
      id: 'contact',
      label: t('members.tabs.contact', 'Kontakt'),
      icon: '📞'
    },
    {
      id: 'address',
      label: t('members.tabs.address', 'Anschrift'),
      icon: '🏠'
    },
    {
      id: 'membership',
      label: t('members.tabs.membership', 'Mitgliedschaft'),
      icon: '👥'
    },
    {
      id: 'groups',
      label: t('members.tabs.groups', 'Gruppen'),
      icon: '👥'
    },
    {
      id: 'bank',
      label: t('members.tabs.bank', 'Bankdaten'),
      icon: '🏦'
    }
  ];

  // Add custom tabs
  const customTabs = (customFieldsConfig.tabs || [])
    .filter(tab => tab.active !== false)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(tab => ({
      id: `custom_${tab.key}`,
      label: tab.label,
      icon: tab.icon || '📝',
      customTab: tab
    }));

  const allTabs = [...baseTabs, ...customTabs];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditMode 
                ? t('members.editMember', 'Mitglied bearbeiten')
                : t('members.newMember', 'Neues Mitglied')
              }
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ✅ Enhanced Tab Navigation mit Error Indicators */}
        <div className="bg-gray-100 px-6 py-2 border-b border-gray-200">
          <nav className="flex space-x-4 overflow-x-auto">
            {allTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap flex items-center ${
                  activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {/* ✅ Error Indicator für Tabs */}
                {Object.keys(fieldErrors).some(key => 
                  tab.customTab ? 
                    key.startsWith(`customField_${tab.customTab.key}_`) :
                    (tab.id === 'personal' && ['firstName', 'lastName', 'memberNumber'].includes(key)) ||
                    (tab.id === 'contact' && ['email', 'website'].includes(key)) ||
                    (tab.id === 'membership' && ['leavingDate'].includes(key)) ||
                    (tab.id === 'bank' && ['iban'].includes(key))
                ) && (
                  <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-red-600 mr-2">⚠️</span>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Tab - VOLLSTÄNDIG */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.salutation', 'Anrede')}
                    </label>
                    <select
                      value={formData.salutation}
                      onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">{t('common.pleaseSelect', 'Bitte wählen')}</option>
                      <option value="Herr">{t('members.salutations.mr', 'Herr')}</option>
                      <option value="Frau">{t('members.salutations.mrs', 'Frau')}</option>
                      <option value="Dr.">{t('members.salutations.dr', 'Dr.')}</option>
                      <option value="Prof.">{t('members.salutations.prof', 'Prof.')}</option>
                      <option value="Prof. Dr.">{t('members.salutations.profDr', 'Prof. Dr.')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.title', 'Titel')}
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('members.titlePlaceholder', 'z.B. Prof. Dr. med.')}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.firstName', 'Vorname')} *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.firstName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {fieldErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.lastName', 'Nachname')} *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.lastName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {fieldErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.gender', 'Geschlecht')}
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">{t('members.genders.notSpecified', 'Nicht angegeben')}</option>
                      <option value="male">{t('members.genders.male', 'Männlich')}</option>
                      <option value="female">{t('members.genders.female', 'Weiblich')}</option>
                      <option value="diverse">{t('members.genders.diverse', 'Divers')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.birthDate', 'Geburtsdatum')}
                    </label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                    {age !== null && (
                      <p className="mt-1 text-sm text-gray-600">
                        {t('members.age', 'Alter')}: {age} {t('members.years', 'Jahre')}
                      </p>
                    )}
                  </div>

                  {isEditMode ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('members.memberNumber', 'Mitgliedsnummer')}
                      </label>
                      <div className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        {member?.memberNumber || '-'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('members.memberNumber', 'Mitgliedsnummer')}
                        <span className="text-xs text-gray-500 ml-2">
                          ({t('members.autoGenerated', 'wird automatisch generiert')})
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.memberNumber || ''}
                        onChange={(e) => setFormData({ ...formData, memberNumber: e.target.value })}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          fieldErrors.memberNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder={organization?.type === 'verein' ? 'z.B. M001' : 'z.B. K001'}
                        disabled={loading}
                      />
                      {fieldErrors.memberNumber && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.memberNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Tab - VOLLSTÄNDIG */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common.email', 'E-Mail')}
                      <span className="text-xs text-gray-500 ml-2">({t('common.optional', 'optional')})</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="beispiel@email.de"
                      disabled={loading}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.website', 'Webseite')}
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.website ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="https://www.beispiel.de"
                      disabled={loading}
                    />
                    {fieldErrors.website && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.landline', 'Festnetz')}
                    </label>
                    <input
                      type="tel"
                      value={formData.landline}
                      onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+49 30 12345678"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.mobile', 'Mobil')}
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+49 170 12345678"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address Tab - VOLLSTÄNDIG */}
            {activeTab === 'address' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.street', 'Straße und Hausnummer')}
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.zip', 'PLZ')}
                    </label>
                    <input
                      type="text"
                      value={formData.address.zip}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, zip: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.city', 'Stadt')}
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.country', 'Land')}
                    </label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, country: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ✅ ERWEITERT: Membership Tab mit Beitrittsquellen und Kündigungsgründen */}
            {activeTab === 'membership' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.memberSince', 'Mitglied seit')}
                    </label>
                    <input
                      type="date"
                      value={formData.membershipData.joinDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        membershipData: {
                          ...formData.membershipData,
                          joinDate: e.target.value
                        }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.membershipStatus', 'Mitgliedsstatus')}
                    </label>
                    {loadingStatuses ? (
                      <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <span className="text-gray-500">{t('common.loading', 'Lädt...')}</span>
                      </div>
                    ) : (
                      <select
                        value={formData.membershipData.membershipStatus}
                        onChange={(e) => setFormData({
                          ...formData,
                          membershipData: {
                            ...formData.membershipData,
                            membershipStatus: e.target.value
                          }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={loading || memberStatuses.length === 0}
                      >
                        {memberStatuses.length === 0 && (
                          <option value="">{t('configuration.noStatuses', 'Keine Status konfiguriert')}</option>
                        )}
                        {memberStatuses.map(status => (
                          <option key={status.key} value={status.key}>
                            {status.label}
                            {status.billing?.active && ` (${status.billing.fee} ${defaultCurrency})`}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {selectedStatus && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                        {selectedStatus.description && (
                          <p className="text-gray-600 mb-2">{selectedStatus.description}</p>
                        )}
                        {selectedStatus.billing?.active ? (
                          <div className="space-y-1">
                            <p className="font-medium text-gray-700">
                              {t('configuration.status.billingTitle', 'Beitragseinstellungen')}:
                            </p>
                            <p className="text-gray-600">
                              • {t('configuration.status.feeAmount', 'Beitrag')}: {selectedStatus.billing.fee} {defaultCurrency}
                            </p>
                            <p className="text-gray-600">
                              • {t('configuration.billing.frequency', 'Turnus')}: 
                              {' '}
                              {selectedStatus.billing.frequency === 'monthly' && t('configuration.billing.monthly', 'Monatlich')}
                              {selectedStatus.billing.frequency === 'quarterly' && t('configuration.billing.quarterly', 'Quartalsweise')}
                              {selectedStatus.billing.frequency === 'yearly' && t('configuration.billing.yearly', 'Jährlich')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            {t('configuration.status.noFeesInfo', 'Für diesen Status werden keine Beiträge erhoben.')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✅ NEU: Beitrittsquelle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.joiningSource', 'Beitrittsquelle')}
                      <span className="text-xs text-gray-500 ml-2">({t('common.optional', 'optional')})</span>
                    </label>
                    {loadingSourcesAndReasons ? (
                      <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <span className="text-gray-500">{t('common.loading', 'Lädt...')}</span>
                      </div>
                    ) : (
                      <select
                        value={formData.membershipData.joiningSource || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          membershipData: {
                            ...formData.membershipData,
                            joiningSource: e.target.value
                          }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={loading || joiningSources.length === 0}
                      >
                        <option value="">{t('members.joiningSource.pleaseSelect', 'Bitte wählen...')}</option>
                        {joiningSources
                          .filter(source => source.active !== false)
                          .map(source => (
                            <option key={source.key} value={source.key}>
                              {source.label}
                            </option>
                          ))}
                      </select>
                    )}
                    {joiningSources.length === 0 && !loadingSourcesAndReasons && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t('configuration.joiningSources.noneConfigured', 'Keine Beitrittsquellen konfiguriert')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.paymentMethod', 'Zahlungsweise')}
                    </label>
                    <select
                      value={formData.membershipData.paymentMethod}
                      onChange={(e) => setFormData({
                        ...formData,
                        membershipData: {
                          ...formData.membershipData,
                          paymentMethod: e.target.value
                        }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="Überweisung">Überweisung</option>
                      <option value="Lastschrift">Lastschrift</option>
                      <option value="Bar">Bar</option>
                    </select>
                  </div>

                  {/* ✅ NEU: Kündigungsgrund (nur bei inaktiven Mitgliedern) */}
                  {leavingReasons.length > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('members.leavingReason', 'Kündigungsgrund')}
                          <span className="text-xs text-gray-500 ml-2">({t('common.optional', 'optional')})</span>
                        </label>
                        {loadingSourcesAndReasons ? (
                          <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
                            <span className="text-gray-500">{t('common.loading', 'Lädt...')}</span>
                          </div>
                        ) : (
                          <select
                            value={formData.membershipData.leavingReason || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              membershipData: {
                                ...formData.membershipData,
                                leavingReason: e.target.value,
                                leavingDate: e.target.value ? formData.membershipData.leavingDate : ''
                              }
                            })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={loading || leavingReasons.length === 0}
                          >
                            <option value="">{t('members.leavingReason.pleaseSelect', 'Bitte wählen...')}</option>
                            {leavingReasons
                              .filter(reason => reason.active !== false)
                              .map(reason => (
                                <option key={reason.key} value={reason.key}>
                                  {reason.label}
                                </option>
                              ))}
                          </select>
                        )}
                        {leavingReasons.length === 0 && !loadingSourcesAndReasons && (
                          <p className="mt-1 text-xs text-gray-500">
                            {t('configuration.leavingReasons.noneConfigured', 'Keine Kündigungsgründe konfiguriert')}
                          </p>
                        )}
                      </div>

                      {/* ✅ NEU: Kündigungsdatum (wenn Kündigungsgrund ausgewählt) */}
                      {formData.membershipData.leavingReason && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('members.leavingDate', 'Kündigungsdatum')}
                            {(() => {
                              const selectedReason = leavingReasons.find(r => r.key === formData.membershipData.leavingReason);
                              return selectedReason?.requiresDate ? <span className="text-red-500 ml-1">*</span> : null;
                            })()}
                          </label>
                          <input
                            type="date"
                            value={formData.membershipData.leavingDate || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              membershipData: {
                                ...formData.membershipData,
                                leavingDate: e.target.value
                              }
                            })}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              fieldErrors.leavingDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          />
                          {fieldErrors.leavingDate && (
                            <p className="mt-1 text-sm text-red-600">{fieldErrors.leavingDate}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ✅ NEU: Groups Tab */}
            {activeTab === 'groups' && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    {t('members.groups.info', 'Gruppenzuordnung')}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {t('members.groups.infoText', 'Weisen Sie dem Mitglied eine oder mehrere Gruppen zu.')}
                  </p>
                </div>
                
                {/* Gruppenliste */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('members.groups.available', 'Verfügbare Gruppen')}
                  </label>
                  
                  {organization?.settings?.membershipConfig?.groups?.filter(g => g.active !== false).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {organization.settings.membershipConfig.groups
                        .filter(group => group.active !== false)
                        .map(group => {
                          const isSelected = formData.groups?.includes(group.key);
                          const colorClass = colorOptions.find(c => c.value === group.color)?.class || 'bg-gray-100 text-gray-800';
                          
                          return (
                            <div
                              key={group.key}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => {
                                if (organization.settings?.membershipConfig?.groupSettings?.allowMultiple !== false) {
                                  // Mehrfachauswahl erlaubt
                                  setFormData(prev => ({
                                    ...prev,
                                    groups: isSelected
                                      ? (prev.groups || []).filter(g => g !== group.key)
                                      : [...(prev.groups || []), group.key]
                                  }));
                                } else {
                                  // Nur Einzelauswahl erlaubt
                                  setFormData(prev => ({
                                    ...prev,
                                    groups: isSelected ? [] : [group.key]
                                  }));
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className={`inline-flex items-center justify-center px-3 py-2 rounded-full text-lg ${colorClass}`}>
                                    {group.icon || '👥'}
                                  </span>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      {group.label}
                                    </h4>
                                    {group.description && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {group.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className="text-blue-600 text-2xl">✓</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">
                        {t('members.groups.noGroupsDefined', 'Keine Gruppen definiert.')}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        {t('members.groups.defineInConfig', 'Definieren Sie Gruppen in der Konfiguration.')}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Ausgewählte Gruppen Zusammenfassung */}
                {formData.groups?.length > 0 && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {t('members.groups.selected', 'Ausgewählte Gruppen')}:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.groups.map(groupKey => {
                        const group = organization.settings.membershipConfig.groups.find(g => g.key === groupKey);
                        if (!group) return null;
                        const colorClass = colorOptions.find(c => c.value === group.color)?.class || 'bg-gray-100 text-gray-800';
                        
                        return (
                          <span
                            key={groupKey}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
                          >
                            <span className="mr-1">{group.icon || '👥'}</span>
                            {group.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ERWEITERTE Bank Tab mit automatischer BIC-Ableitung */}
            {activeTab === 'bank' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    {t('members.bankDetailsInfo', 'Bankdaten sind optional und werden nur für Lastschriftverfahren benötigt.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.bank.accountHolder', 'Kontoinhaber')}
                    </label>
                    <input
                      type="text"
                      value={formData.membershipData.bankDetails?.accountHolder || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        membershipData: {
                          ...formData.membershipData,
                          bankDetails: {
                            ...formData.membershipData.bankDetails,
                            accountHolder: e.target.value
                          }
                        }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.bank.iban', 'IBAN')}
                      {iban && ibanCountryCode && (
                        <span className="ml-2 text-xs text-blue-600">
                          ({ibanCountryCode})
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={iban}
                      onChange={(e) => {
                        handleIbanChange(e.target.value);
                        setFormData({
                          ...formData,
                          membershipData: {
                            ...formData.membershipData,
                            bankDetails: {
                              ...formData.membershipData.bankDetails,
                              iban: e.target.value
                            }
                          }
                        });
                      }}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                        iban && !isIbanValid ? 'border-red-300 bg-red-50' :
                        iban && isIbanValid ? 'border-green-300 bg-green-50' :
                        fieldErrors.iban ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      disabled={loading}
                    />
                    
                    {/* ERWEITERTE IBAN-Validierung und Bank-Lookup Feedback */}
                    {iban && (
                      <div className="mt-2">
                        {isIbanValid ? (
                          <div>
                            <div className="flex items-center text-green-700 text-sm">
                              <span className="mr-2">✅</span>
                              <span>
                                IBAN ist gültig 
                                {ibanCountryCode && ` (${ibanCountryCode})`}
                                {ibanBankCode && ` - BLZ: ${ibanBankCode}`}
                              </span>
                            </div>
                            {lookupBic && lookupBankName && !bankLoading && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                <div className="text-blue-700">
                                  <span className="font-medium">Bank gefunden:</span> {lookupBankName}
                                </div>
                                <div className="text-blue-600 text-xs mt-1">
                                  BIC wird automatisch eingetragen
                                </div>
                              </div>
                            )}
                            {bankError && !bankLoading && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                                <div className="text-amber-700">
                                  ⚠️ {bankError}
                                </div>
                                <div className="text-amber-600 text-xs mt-1">
                                  BIC und Bankname müssen manuell eingegeben werden
                                </div>
                              </div>
                            )}
                            {bankLoading && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="inline-block animate-spin mr-2">⏳</span>
                                Bankdaten werden abgerufen...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-start text-red-700 text-sm">
                            <span className="mr-2 mt-0.5">❌</span>
                            <div>
                              <div className="font-medium">IBAN-Validierung fehlgeschlagen:</div>
                              <div className="mt-1">{ibanError}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Formatierte IBAN Vorschau */}
                    {iban && isIbanValid && ibanFormatted && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <span className="text-blue-700 font-medium">Formatierte IBAN:</span>
                        <div className="font-mono text-blue-800 mt-1">{ibanFormatted}</div>
                      </div>
                    )}
                    
                    {fieldErrors.iban && !iban && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.iban}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.bank.bic', 'BIC')}
                      {lookupBic && (
                        <span className="ml-2 text-xs text-green-600">
                          ✅ {t('organization.bank.autoDetected', 'Automatisch ermittelt')}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.membershipData.bankDetails?.bic || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        membershipData: {
                          ...formData.membershipData,
                          bankDetails: {
                            ...formData.membershipData.bankDetails,
                            bic: e.target.value.toUpperCase()
                          }
                        }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                        lookupBic ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      placeholder="COBADEFFXXX"
                      disabled={loading || (lookupBic && isIbanValid)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.bankName', 'Bankbezeichnung')}
                      {lookupBankName && (
                        <span className="ml-2 text-xs text-green-600">
                          ✅ {t('organization.bank.autoDetected', 'Automatisch ermittelt')}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.membershipData.bankDetails?.bankName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        membershipData: {
                          ...formData.membershipData,
                          bankDetails: {
                            ...formData.membershipData.bankDetails,
                            bankName: e.target.value
                          }
                        }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        lookupBankName ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      placeholder="z.B. Commerzbank AG"
                      disabled={loading || (lookupBankName && isIbanValid)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.membershipData.bankDetails?.sepaActive || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          membershipData: {
                            ...formData.membershipData,
                            bankDetails: {
                              ...formData.membershipData.bankDetails,
                              sepaActive: e.target.checked
                            }
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        disabled={loading}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {t('members.sepaActive', 'SEPA-Lastschriftmandat eingerichtet')}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Custom Tabs Rendering */}
            {activeTab.startsWith('custom_') && (() => {
              const tabKey = activeTab.replace('custom_', '');
              const customTab = customFieldsConfig.tabs?.find(tab => tab.key === tabKey);
              
              if (!customTab) {
                return (
                  <div className="text-center py-8 text-red-500">
                    <p>⚠️ Custom Tab nicht gefunden: {tabKey}</p>
                  </div>
                );
              }

              if (loadingCustomFields) {
                return (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Lade Custom Fields...</p>
                  </div>
                );
              }

              const fields = (customTab.fields || []).sort((a, b) => (a.position || 0) - (b.position || 0));

              return (
                <div className="space-y-6">
                  {/* Custom Tab Header */}
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">{customTab.icon || '📝'}</div>
                    <h3 className="text-lg font-semibold text-gray-800">{customTab.label}</h3>
                    {customTab.description && (
                      <p className="text-sm text-gray-600 mt-1">{customTab.description}</p>
                    )}
                  </div>

                  {/* Custom Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fields.map((field) => {
                      const fieldValue = getCustomFieldValue(tabKey, field.key);
                      const fieldError = fieldErrors[`customField_${tabKey}_${field.key}`];
                      
                      return (
                        <div key={field.key} className={
                          field.type === 'textarea' || field.type === 'multi-entry' ? 'md:col-span-2' : ''
                        }>
                          <CustomFieldRenderer
                            field={field}
                            value={fieldValue}
                            onChange={(value) => updateCustomFieldValue(tabKey, field.key, value)}
                            error={fieldError}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {fields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📋</div>
                      <p>Keine Felder in diesem Tab konfiguriert.</p>
                      <p className="text-sm">Konfigurieren Sie Custom Fields in den Systemeinstellungen.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </form>
        </div>

        {/* ✅ Enhanced Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            {/* Tab indicator */}
            <div className="text-sm text-gray-500">
              {allTabs.length > 5 && (
                <span>
                  {allTabs.findIndex(tab => tab.id === activeTab) + 1} {t('members.customFields.tabIndicator', 'von')} {allTabs.length} {t('members.customFields.tabs', 'Tabs')}
                  {Object.keys(fieldErrors).length > 0 && (
                    <span className="text-red-500 ml-2">
                      • {Object.keys(fieldErrors).length} {t('members.customFields.errors', 'Fehler')}
                    </span>
                  )}
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                {t('actions.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || (iban && !isIbanValid)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block mr-2">⏳</span>
                    {t('common.saving', 'Speichere...')}
                  </>
                ) : (
                  t('actions.save', 'Speichern')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberFormModal;