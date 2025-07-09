// frontend/src/components/modals/MemberFormModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import { useIBANValidation, formatIBAN } from '../../utils/ibanUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MemberFormModal = ({ isOpen, onClose, member = null, onSuccess }) => {
  const { t, organization } = useOrgTranslation();
  const isEditMode = !!member;
  
  // Form States
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'active',
    address: {
      street: '',
      city: '',
      zip: '',
      country: 'Deutschland'
    },
    membershipData: {
      joinDate: new Date().toISOString().split('T')[0],
      membershipType: organization?.type === 'verein' ? 'Vollmitglied' : 'Standard',
      membershipFee: 50.00,
      paymentMethod: 'Überweisung',
      bankDetails: {
        accountHolder: '',
        iban: ''
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // IBAN Validation Hook
  const {
    iban,
    validation: ibanValidation,
    handleIbanChange,
    isValid: isIbanValid,
    error: ibanError,
    formatted: ibanFormatted
  } = useIBANValidation(formData.membershipData?.bankDetails?.iban || '');

  // Load member data in edit mode
  useEffect(() => {
    if (isEditMode && member) {
      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || '',
        phone: member.phone || '',
        status: member.status || 'active',
        address: member.address || {
          street: '',
          city: '',
          zip: '',
          country: 'Deutschland'
        },
        membershipData: member.membershipData || {
          joinDate: member.joinedAt || new Date().toISOString().split('T')[0],
          membershipType: organization?.type === 'verein' ? 'Vollmitglied' : 'Standard',
          membershipFee: 50.00,
          paymentMethod: 'Überweisung',
          bankDetails: {
            accountHolder: '',
            iban: ''
          }
        }
      });
      
      // Set IBAN if exists
      if (member.membershipData?.bankDetails?.iban) {
        handleIbanChange(member.membershipData.bankDetails.iban);
      }
    }
  }, [member, isEditMode, organization]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form after close animation
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          status: 'active',
          address: {
            street: '',
            city: '',
            zip: '',
            country: 'Deutschland'
          },
          membershipData: {
            joinDate: new Date().toISOString().split('T')[0],
            membershipType: organization?.type === 'verein' ? 'Vollmitglied' : 'Standard',
            membershipFee: 50.00,
            paymentMethod: 'Überweisung',
            bankDetails: {
              accountHolder: '',
              iban: ''
            }
          }
        });
        setError(null);
        setFieldErrors({});
        handleIbanChange('');
      }, 300);
    }
  }, [isOpen, organization]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = t('validation.required', 'Pflichtfeld');
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = t('validation.required', 'Pflichtfeld');
    }
    
    if (!formData.email.trim()) {
      errors.email = t('validation.required', 'Pflichtfeld');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('validation.invalidEmail', 'Ungültige E-Mail-Adresse');
    }
    
    // IBAN validation if provided
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
      // Prepare data for submission
      const submitData = {
        ...formData,
        membershipData: {
          ...formData.membershipData,
          bankDetails: iban ? {
            ...formData.membershipData.bankDetails,
            iban: iban // Use the raw IBAN value
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
      
      // Extract error message from response
      let errorMessage = t('common.saveError', 'Fehler beim Speichern');
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        
        // Handle specific field errors
        if (error.response.data.field) {
          const field = error.response.data.field;
          if (field === 'membershipData.bankDetails.iban') {
            setFieldErrors(prev => ({ ...prev, iban: errorMessage }));
          }
        }
        
        // Handle validation errors
        if (error.response.data.details && Array.isArray(error.response.data.details)) {
          errorMessage = error.response.data.details.join(', ');
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-red-600 mr-2">⚠️</span>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('members.personalInfo', 'Persönliche Informationen')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {t('common.email', 'E-Mail')} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.phone', 'Telefon')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.status', 'Status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="active">{t('members.status.active', 'Aktiv')}</option>
                    <option value="inactive">{t('members.status.inactive', 'Inaktiv')}</option>
                    <option value="suspended">{t('members.status.suspended', 'Gesperrt')}</option>
                  </select>
                </div>

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
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('members.address', 'Anschrift')}
              </h3>
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
              </div>
            </div>

            {/* Membership Data */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('members.membershipData', 'Mitgliedschaftsdaten')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('members.membershipType', 'Mitgliedschaftstyp')}
                  </label>
                  <select
                    value={formData.membershipData.membershipType}
                    onChange={(e) => setFormData({
                      ...formData,
                      membershipData: {
                        ...formData.membershipData,
                        membershipType: e.target.value
                      }
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {organization?.type === 'verein' ? (
                      <>
                        <option value="Vollmitglied">Vollmitglied</option>
                        <option value="Fördermitglied">Fördermitglied</option>
                        <option value="Ehrenmitglied">Ehrenmitglied</option>
                      </>
                    ) : (
                      <>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="VIP">VIP</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('members.membershipFee', 'Mitgliedsbeitrag')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.membershipData.membershipFee}
                      onChange={(e) => setFormData({
                        ...formData,
                        membershipData: {
                          ...formData.membershipData,
                          membershipFee: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-3 text-gray-500">€</span>
                  </div>
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
              </div>
            </div>

            {/* Bank Details (optional) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('members.bankDetails', 'Bankverbindung')} 
                <span className="text-sm font-normal text-gray-500 ml-2">({t('common.optional', 'optional')})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.accountHolder', 'Kontoinhaber')}
                  </label>
                  <input
                    type="text"
                    value={formData.membershipData.bankDetails.accountHolder}
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
              </div>
            </div>
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