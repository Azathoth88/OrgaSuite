// frontend/src/components/modals/MemberFormModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import { useIBANValidation } from '../../utils/ibanUtils';

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
    memberNumber: '', // Will be auto-generated if empty
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
      // Ensure membershipData and bankDetails exist
      const membershipData = member.membershipData || {
        joinDate: member.joinedAt || new Date().toISOString().split('T')[0],
        membershipType: organization?.type === 'verein' ? 'Vollmitglied' : 'Standard',
        membershipFee: 50.00,
        paymentMethod: 'Überweisung',
        bankDetails: {
          accountHolder: '',
          iban: ''
        }
      };

      // Ensure bankDetails exists within membershipData
      if (!membershipData.bankDetails) {
        membershipData.bankDetails = {
          accountHolder: '',
          iban: ''
        };
      }

      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || '',
        phone: member.phone || '',
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
      
      // Set IBAN if exists
      if (membershipData.bankDetails?.iban) {
        handleIbanChange(membershipData.bankDetails.iban);
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
          memberNumber: '',
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
    
    // E-Mail is optional, but if provided, must be valid
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined, // Send undefined if empty to let backend handle
        phone: formData.phone || undefined,
        status: formData.status,
        memberNumber: formData.memberNumber || undefined, // Only send if provided
        address: formData.address,
        membershipData: {
          ...formData.membershipData,
          bankDetails: (iban || formData.membershipData.bankDetails.accountHolder) ? {
            accountHolder: formData.membershipData.bankDetails.accountHolder || '',
            iban: iban || ''
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
          
          // Map backend field names to form field names
          switch(field) {
            case 'email':
              setFieldErrors(prev => ({ 
                ...prev, 
                email: errorMessage 
              }));
              // Scroll to email field
              setTimeout(() => {
                const emailInput = document.querySelector('input[type="email"]');
                if (emailInput) {
                  emailInput.focus();
                  emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
              break;
              
            case 'memberNumber':
              setFieldErrors(prev => ({ 
                ...prev, 
                memberNumber: errorMessage 
              }));
              break;
              
            case 'membershipData.bankDetails.iban':
              setFieldErrors(prev => ({ 
                ...prev, 
                iban: errorMessage 
              }));
              break;
              
            default:
              // Generic field error
              setFieldErrors(prev => ({ 
                ...prev, 
                [field]: errorMessage 
              }));
          }
        }
        
        // Handle validation errors array
        if (error.response.data.details) {
          if (Array.isArray(error.response.data.details)) {
            errorMessage = error.response.data.details.join(', ');
          } else if (typeof error.response.data.details === 'string') {
            errorMessage = error.response.data.details;
          }
        }
        
        // Handle specific HTTP status codes
        if (error.response.status === 400) {
          // Bad Request - show user-friendly message
          if (!error.response.data.field) {
            // General validation error
            errorMessage = errorMessage || t('validation.checkFields', 'Bitte überprüfen Sie Ihre Eingaben');
          }
        } else if (error.response.status === 409) {
          // Conflict - duplicate entry
          errorMessage = t('validation.duplicateEntry', 'Ein Eintrag mit diesen Daten existiert bereits');
        } else if (error.response.status === 500) {
          // Server error
          errorMessage = t('common.serverError', 'Serverfehler. Bitte versuchen Sie es später erneut.');
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = t('common.networkError', 'Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.');
      } else {
        // Something else happened
        errorMessage = error.message || t('common.unknownError', 'Ein unbekannter Fehler ist aufgetreten');
      }
      
      setError(errorMessage);
      
      // Log detailed error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Detailed error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
      }
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
                    {t('common.email', 'E-Mail')}
                    <span className="text-xs text-gray-500 ml-2">({t('common.optional', 'optional')})</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      // Clear error when user starts typing
                      if (fieldErrors.email) {
                        setFieldErrors(prev => ({ ...prev, email: null }));
                      }
                    }}
                    onBlur={(e) => {
                      // Validate email on blur only if not empty
                      const email = e.target.value.trim();
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setFieldErrors(prev => ({ 
                          ...prev, 
                          email: t('validation.invalidEmail', 'Ungültige E-Mail-Adresse') 
                        }));
                      }
                    }}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="beispiel@email.de"
                    disabled={loading}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.email}
                    </p>
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

                {isEditMode ? (
                  // Show member number as read-only in edit mode
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
                        ({t('common.optional', 'optional')} - {t('members.autoGenerated', 'wird automatisch generiert')})
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.memberNumber || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, memberNumber: e.target.value });
                        if (fieldErrors.memberNumber) {
                          setFieldErrors(prev => ({ ...prev, memberNumber: null }));
                        }
                      }}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.memberNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder={organization?.type === 'verein' ? 'z.B. M001' : 'z.B. K001'}
                      disabled={loading}
                    />
                    {fieldErrors.memberNumber && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {fieldErrors.memberNumber}
                      </p>
                    )}
                  </div>
                )}
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