import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOrgTranslation } from '../hooks/useOrgTranslation';
import { useIBANValidation, formatIBAN } from '../utils/ibanUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MemberFormModal = ({ isOpen, onClose, member, onSuccess }) => {
  const { t, organization } = useOrgTranslation();
  const isEditMode = !!member;
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    memberNumber: '',
    status: 'active',
    address: {
      street: '',
      city: '',
      zip: '',
      country: 'Deutschland'
    },
    membershipData: {
      membershipType: '',
      membershipFee: '',
      paymentMethod: '',
      bankDetails: {
        iban: '',
        accountHolder: ''
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // IBAN Validation Hook
  const {
    iban,
    validation: ibanValidation,
    handleIbanChange,
    isValid: isIbanValid,
    error: ibanError,
    formatted: ibanFormatted,
    countryCode: ibanCountryCode,
    bankCode: ibanBankCode
  } = useIBANValidation(formData.membershipData?.bankDetails?.iban || '');

  // Load member data in edit mode
  useEffect(() => {
    if (isEditMode && member) {
      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || '',
        phone: member.phone || '',
        memberNumber: member.memberNumber || '',
        status: member.status || 'active',
        address: {
          street: member.address?.street || '',
          city: member.address?.city || '',
          zip: member.address?.zip || '',
          country: member.address?.country || 'Deutschland'
        },
        membershipData: {
          membershipType: member.membershipData?.membershipType || '',
          membershipFee: member.membershipData?.membershipFee || '',
          paymentMethod: member.membershipData?.paymentMethod || '',
          bankDetails: {
            iban: member.membershipData?.bankDetails?.iban || '',
            accountHolder: member.membershipData?.bankDetails?.accountHolder || ''
          }
        }
      });
      
      // Set IBAN for validation
      if (member.membershipData?.bankDetails?.iban) {
        handleIbanChange(member.membershipData.bankDetails.iban);
      }
    }
  }, [member, isEditMode]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('validation.required', 'Pflichtfeld');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('validation.required', 'Pflichtfeld');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.required', 'Pflichtfeld');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail', 'Ungültige E-Mail-Adresse');
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = t('validation.invalidPhone', 'Ungültige Telefonnummer');
    }

    if (iban && !isIbanValid) {
      newErrors.iban = ibanError || t('validation.invalidIban', 'Ungültige IBAN');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        membershipData: {
          ...formData.membershipData,
          bankDetails: {
            ...formData.membershipData.bankDetails,
            iban: iban || ''
          }
        }
      };

      let response;
      if (isEditMode) {
        response = await axios.put(`${API_URL}/members/${member.id}`, submitData);
      } else {
        response = await axios.post(`${API_URL}/members`, submitData);
      }

      console.log('✅ Member saved successfully:', response.data);

      // Call success callback
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Close modal
      onClose();
      
      // Show success message
      alert(
        isEditMode 
          ? t('members.updateSuccess', 'Mitglied erfolgreich aktualisiert!') 
          : t('members.createSuccess', 'Mitglied erfolgreich angelegt!')
      );

    } catch (error) {
      console.error('❌ Error saving member:', error);
      
      if (error.response?.data?.error) {
        if (error.response.data.error.includes('Email')) {
          setErrors({ email: t('validation.emailExists', 'E-Mail-Adresse bereits vergeben') });
        } else if (error.response.data.error.includes('member number')) {
          setErrors({ memberNumber: t('validation.memberNumberExists', 'Mitgliedsnummer bereits vergeben') });
        } else {
          alert(error.response.data.error);
        }
      } else {
        alert(t('common.saveError', 'Fehler beim Speichern'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle IBAN change
  const handleIbanInputChange = (value) => {
    handleIbanChange(value);
    setFormData({
      ...formData,
      membershipData: {
        ...formData.membershipData,
        bankDetails: {
          ...formData.membershipData.bankDetails,
          iban: value
        }
      }
    });
  };

  // Input change handler
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {isEditMode 
                ? `${t('members.editMember')} - ${member.firstName} ${member.lastName}`
                : t('members.newMember')
              }
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('members.basicInfo', 'Grunddaten')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.firstName', 'Vorname')} *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.lastName', 'Nachname')} *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.email', 'E-Mail')} *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.phone', 'Telefon')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+49 123 456789"
                  disabled={loading}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.memberNumber')}
                </label>
                <input
                  type="text"
                  value={formData.memberNumber}
                  onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.memberNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('members.autoGenerated', 'Wird automatisch generiert')}
                  disabled={loading}
                />
                {errors.memberNumber && (
                  <p className="text-red-500 text-xs mt-1">{errors.memberNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.status', 'Status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="active">{t('members.status.active')}</option>
                  <option value="inactive">{t('members.status.inactive')}</option>
                  <option value="suspended">{t('members.status.suspended')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('members.addressInfo', 'Anschrift')}
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organization.street', 'Straße und Hausnummer')}
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Musterstraße 123"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.zip', 'PLZ')}
                  </label>
                  <input
                    type="text"
                    value={formData.address.zip}
                    onChange={(e) => handleInputChange('address.zip', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.city', 'Stadt')}
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Berlin"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organization.country', 'Land')}
                </label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Deutschland"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Membership Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              {organization?.type === 'verein' 
                ? t('members.membershipInfo', 'Mitgliedschaftsdaten')
                : t('members.customerInfo', 'Kundendaten')
              }
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {organization?.type === 'verein' 
                    ? t('members.membershipType', 'Mitgliedschaftstyp')
                    : t('members.customerType', 'Kundentyp')
                  }
                </label>
                <select
                  value={formData.membershipData.membershipType}
                  onChange={(e) => handleInputChange('membershipData.membershipType', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">-- {t('common.pleaseSelect', 'Bitte wählen')} --</option>
                  {organization?.type === 'verein' ? (
                    <>
                      <option value="Vollmitglied">{t('members.fullMember', 'Vollmitglied')}</option>
                      <option value="Fördermitglied">{t('members.supportingMember', 'Fördermitglied')}</option>
                      <option value="Ehrenmitglied">{t('members.honoraryMember', 'Ehrenmitglied')}</option>
                    </>
                  ) : (
                    <>
                      <option value="Standard">{t('members.standardCustomer', 'Standard')}</option>
                      <option value="Premium">{t('members.premiumCustomer', 'Premium')}</option>
                      <option value="VIP">{t('members.vipCustomer', 'VIP')}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.membershipFee')} (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.membershipData.membershipFee}
                  onChange={(e) => handleInputChange('membershipData.membershipFee', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50.00"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('members.paymentMethod', 'Zahlungsart')}
                </label>
                <select
                  value={formData.membershipData.paymentMethod}
                  onChange={(e) => handleInputChange('membershipData.paymentMethod', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">-- {t('common.pleaseSelect', 'Bitte wählen')} --</option>
                  <option value="Lastschrift">{t('members.directDebit', 'Lastschrift')}</option>
                  <option value="Überweisung">{t('members.bankTransfer', 'Überweisung')}</option>
                  <option value="Bar">{t('members.cash', 'Barzahlung')}</option>
                  <option value="PayPal">{t('members.paypal', 'PayPal')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              🏦 {t('members.bankDetails', 'Bankverbindung')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organization.bank.accountHolder', 'Kontoinhaber')}
                </label>
                <input
                  type="text"
                  value={formData.membershipData.bankDetails.accountHolder}
                  onChange={(e) => handleInputChange('membershipData.bankDetails.accountHolder', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`${formData.firstName} ${formData.lastName}`}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organization.bank.iban', 'IBAN')}
                  {ibanCountryCode && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({ibanCountryCode}
                      {ibanBankCode && ` - BLZ: ${ibanBankCode}`})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => handleIbanInputChange(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                    iban && !isIbanValid ? 'border-red-300 bg-red-50' : 
                    iban && isIbanValid ? 'border-green-300 bg-green-50' : 
                    'border-gray-300'
                  }`}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  disabled={loading}
                />
                
                {/* IBAN Validation Feedback */}
                {iban && (
                  <div className="mt-2">
                    {isIbanValid ? (
                      <div className="flex items-center text-green-700 text-sm">
                        <span className="mr-2">✅</span>
                        <span>
                          IBAN ist gültig 
                          {ibanCountryCode && ` (${ibanCountryCode})`}
                          {ibanBankCode && ` - BLZ: ${ibanBankCode}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start text-red-700 text-sm">
                        <span className="mr-2 mt-0.5">❌</span>
                        <div>{ibanError}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              {t('actions.cancel', 'Abbrechen')}
            </button>
            <button
              type="submit"
              disabled={loading || (iban && !isIbanValid)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  {t('common.saving', 'Speichere...')}
                </>
              ) : (
                <>
                  💾 {isEditMode ? t('actions.save', 'Speichern') : t('actions.create', 'Anlegen')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberFormModal;