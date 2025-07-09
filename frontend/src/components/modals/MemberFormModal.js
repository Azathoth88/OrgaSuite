// frontend/src/components/modals/MemberFormModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import { useIBANValidation } from '../../utils/ibanUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MemberFormModal = ({ isOpen, onClose, member = null, onSuccess }) => {
  const { t, organization } = useOrgTranslation();
  const isEditMode = !!member;
  
  // State for configured member statuses
  const [memberStatuses, setMemberStatuses] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  
  // Form States
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
    membershipData: {
      joinDate: new Date().toISOString().split('T')[0],
      membershipStatus: '', // This will use configured statuses
      paymentMethod: 'Überweisung',
      bankDetails: {
        accountHolder: '',
        iban: '',
        bic: '',
        bankName: '',
        sepaActive: false
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState('personal');

  // IBAN Validation Hook
  const {
    iban,
    validation: ibanValidation,
    handleIbanChange,
    isValid: isIbanValid,
    error: ibanError,
    formatted: ibanFormatted
  } = useIBANValidation(formData.membershipData?.bankDetails?.iban || '');

  // Load configured member statuses
  useEffect(() => {
    const fetchMemberStatuses = async () => {
      try {
        setLoadingStatuses(true);
        const response = await axios.get(`${API_URL}/organization/member-statuses`);
        setMemberStatuses(response.data.statuses || []);
        
        // Set default status if not already set
        if (!formData.membershipData.membershipStatus && response.data.statuses.length > 0) {
          const defaultStatus = response.data.statuses.find(s => s.isDefault) || response.data.statuses[0];
          setFormData(prev => ({
            ...prev,
            membershipData: {
              ...prev.membershipData,
              membershipStatus: defaultStatus.key
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching member statuses:', error);
      } finally {
        setLoadingStatuses(false);
      }
    };

    if (isOpen) {
      fetchMemberStatuses();
    }
  }, [isOpen]);

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

  // Load member data in edit mode
  useEffect(() => {
    if (isEditMode && member) {
      const membershipData = member.membershipData || {
        joinDate: member.joinedAt || new Date().toISOString().split('T')[0],
        membershipStatus: member.status || '', // Use actual status
        paymentMethod: 'Überweisung',
        bankDetails: {
          accountHolder: '',
          iban: '',
          bic: '',
          bankName: '',
          sepaActive: false
        }
      };

      if (!membershipData.bankDetails) {
        membershipData.bankDetails = {
          accountHolder: '',
          iban: '',
          bic: '',
          bankName: '',
          sepaActive: false
        };
      }

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
        status: member.status || 'active',
        memberNumber: member.memberNumber || '',
        address: member.address || {
          street: '',
          city: '',
          zip: '',
          country: 'Deutschland'
        },
        membershipData: membershipData
      });
      
      if (membershipData.bankDetails?.iban) {
        handleIbanChange(membershipData.bankDetails.iban);
      }
    }
  }, [member, isEditMode]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
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
          membershipData: {
            joinDate: new Date().toISOString().split('T')[0],
            membershipStatus: defaultStatus?.key || '',
            paymentMethod: 'Überweisung',
            bankDetails: {
              accountHolder: '',
              iban: '',
              bic: '',
              bankName: '',
              sepaActive: false
            }
          }
        });
        setError(null);
        setFieldErrors({});
        handleIbanChange('');
        setActiveTab('personal');
      }, 300);
    }
  }, [isOpen, memberStatuses]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = t('validation.required', 'Pflichtfeld');
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = t('validation.required', 'Pflichtfeld');
    }
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('validation.invalidEmail', 'Ungültige E-Mail-Adresse');
    }
    
    if (formData.website.trim() && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(formData.website)) {
      errors.website = t('validation.invalidUrl', 'Ungültige URL');
    }
    
    if (iban && !isIbanValid) {
      errors.iban = ibanError || t('validation.invalidIban', 'Ungültige IBAN');
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
        status: formData.membershipData.membershipStatus || 'active', // Use configured status
        memberNumber: formData.memberNumber || undefined,
        address: formData.address,
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
      
      console.log('📤 Submitting member data:', submitData);
      
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

  const age = calculateAge(formData.birthDate);
  
  // Get selected status details
  const selectedStatus = memberStatuses.find(s => s.key === formData.membershipData.membershipStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
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

        {/* Tab Navigation */}
        <div className="bg-gray-100 px-6 py-2 border-b border-gray-200">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'personal' 
                  ? 'bg-white text-blue-600 shadow' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('members.tabs.personal', 'Person')}
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'contact' 
                  ? 'bg-white text-blue-600 shadow' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('members.tabs.contact', 'Kontakt')}
            </button>
            <button
              onClick={() => setActiveTab('address')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'address' 
                  ? 'bg-white text-blue-600 shadow' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('members.tabs.address', 'Anschrift')}
            </button>
            <button
              onClick={() => setActiveTab('membership')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'membership' 
                  ? 'bg-white text-blue-600 shadow' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('members.tabs.membership', 'Mitgliedschaft')}
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'bank' 
                  ? 'bg-white text-blue-600 shadow' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('members.tabs.bank', 'Bankdaten')}
            </button>
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
            {/* Personal Tab */}
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

            {/* Contact Tab */}
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

            {/* Address Tab */}
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

            {/* Membership Tab */}
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
                            {status.billing.active && ` (${status.billing.fee} ${status.billing.currency})`}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {/* Show selected status details */}
                    {selectedStatus && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                        {selectedStatus.description && (
                          <p className="text-gray-600 mb-2">{selectedStatus.description}</p>
                        )}
                        {selectedStatus.billing.active ? (
                          <div className="space-y-1">
                            <p className="font-medium text-gray-700">
                              {t('configuration.status.billingTitle', 'Beitragseinstellungen')}:
                            </p>
                            <p className="text-gray-600">
                              • {t('configuration.status.feeAmount', 'Beitrag')}: {selectedStatus.billing.fee} {selectedStatus.billing.currency}
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

                  <div className="md:col-span-2">
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
                </div>
              </div>
            )}

            {/* Bank Tab */}
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
                      {iban && ibanValidation.countryCode && (
                        <span className="ml-2 text-xs text-blue-600">
                          ({ibanValidation.countryCode})
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
                    {fieldErrors.iban && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.iban}</p>
                    )}
                    {iban && (
                      <div className="mt-1">
                        {isIbanValid ? (
                          <p className="text-sm text-green-600">✅ IBAN ist gültig</p>
                        ) : (
                          <p className="text-sm text-red-600">❌ {ibanError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.bank.bic', 'BIC')}
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="COBADEFFXXX"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('members.bankName', 'Bankbezeichnung')}
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Commerzbank AG"
                      disabled={loading}
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
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
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
  );
};

export default MemberFormModal;