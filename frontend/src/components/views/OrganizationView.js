import React, { useState, useContext } from 'react';
import { OrganizationContext } from '../../contexts/OrganizationContext';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';

const OrganizationView = () => {
  const { organization, saveOrganization } = useContext(OrganizationContext);
  const { t } = useOrgTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(organization || {});
  const [ibanError, setIbanError] = useState('');

  // IBAN Validation
  const validateIban = (iban) => {
    if (!iban) return true; // Optional field
    
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic length check
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return false;
    }
    
    // Basic format check (starts with 2 letters, then numbers)
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
    return ibanRegex.test(cleanIban);
  };

  const handleIbanChange = (iban) => {
    setFormData({
      ...formData,
      bankDetails: { ...(formData.bankDetails || {}), iban }
    });
    
    if (iban && !validateIban(iban)) {
      setIbanError(t('organization.bank.invalidIban', 'Ungültiges IBAN-Format'));
    } else {
      setIbanError('');
    }
  };

  const handleSave = async () => {
    // Validate IBAN before saving
    if (formData.bankDetails?.iban && !validateIban(formData.bankDetails.iban)) {
      alert(t('organization.bank.invalidIban', 'Ungültiges IBAN-Format'));
      return;
    }

    setLoading(true);
    const success = await saveOrganization(formData);
    
    if (success) {
      setEditing(false);
      alert(t('common.saveSuccess', 'Erfolgreich gespeichert!'));
    } else {
      alert(t('common.saveError', 'Fehler beim Speichern'));
    }
    
    setLoading(false);
  };

  const handleCancel = () => {
    setFormData(organization || {});
    setEditing(false);
    setIbanError('');
  };

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('organization.notFound', 'Keine Organisation gefunden')}
          </h2>
          <p className="text-gray-600">
            {t('organization.notFoundDesc', 'Bitte kontaktieren Sie den Administrator')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            {organization.type === 'verein' ? '🏛️' : '🏢'}
            <span className="ml-2">
              {organization.type === 'verein' 
                ? t('organization.clubDetails', 'Vereinsdetails')
                : t('organization.companyDetails', 'Unternehmensdetails')
              }
            </span>
          </h1>
          <p className="text-gray-600 mt-1">
            {t('organization.manageInfo', 'Verwalten Sie die Grunddaten Ihrer Organisation')}
          </p>
        </div>
        
        <div className="flex space-x-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                {t('actions.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={handleSave}
                disabled={loading || ibanError}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? t('common.saving', 'Speichere...') : t('actions.save', 'Speichern')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('actions.edit', 'Bearbeiten')}
            </button>
          )}
        </div>
      </div>

      {/* Organization Form */}
      <div className="space-y-6">
        
        {/* Basic Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  {t('organization.basicInfo', 'Grundinformationen')}
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.name', 'Name')} *
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('organization.namePlaceholder', 'Name der Organisation')}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.type', 'Organisationstyp')}
                  </label>
                  {editing ? (
                    <select
                      value={formData.type || ''}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="verein">🏛️ {t('organization.typeClub', 'Verein')}</option>
                      <option value="unternehmen">🏢 {t('organization.typeCompany', 'Unternehmen')}</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.type === 'verein' 
                        ? `🏛️ ${t('organization.typeClub', 'Verein')}` 
                        : `🏢 ${t('organization.typeCompany', 'Unternehmen')}`
                      }
                    </div>
                  )}
                  {editing && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ {t('organization.typeWarning', 'Achtung: Änderung des Typs ändert alle Labels (Mitglieder ↔ Kunden)')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.taxNumber', 'Steuernummer')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.taxNumber || ''}
                      onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="z.B. 12345/67890"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.taxNumber || t('organization.noTaxNumber', 'Nicht angegeben')}
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  {t('organization.address', 'Anschrift')}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.street', 'Straße und Hausnummer')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.address?.street || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: {...(formData.address || {}), street: e.target.value}
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('organization.streetPlaceholder', 'z.B. Musterstraße 123')}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.address?.street || t('organization.noStreet', 'Nicht angegeben')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.zip', 'PLZ')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.address?.zip || ''}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...(formData.address || {}), zip: e.target.value}
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="12345"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {organization.address?.zip || '---'}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('organization.city', 'Stadt')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.address?.city || ''}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...(formData.address || {}), city: e.target.value}
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('organization.cityPlaceholder', 'z.B. Berlin')}
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {organization.address?.city || t('organization.noCity', 'Nicht angegeben')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.country', 'Land')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.address?.country || ''}
                      onChange={(e) => setFormData({
                        ...formData, 
                        address: {...(formData.address || {}), country: e.target.value}
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Deutschland"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.address?.country || 'Deutschland'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6 flex items-center">
              🏦 <span className="ml-2">{t('organization.bank.title', 'Bankverbindung')}</span>
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.accountHolder', 'Kontoinhaber')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.bankDetails?.accountHolder || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...(formData.bankDetails || {}), accountHolder: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('organization.bank.accountHolderPlaceholder', 'Name des Kontoinhabers')}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.bankDetails?.accountHolder || t('organization.bank.notSpecified', 'Nicht angegeben')}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.iban', 'IBAN')}
                  </label>
                  {editing ? (
                    <div>
                      <input
                        type="text"
                        value={formData.bankDetails?.iban || ''}
                        onChange={(e) => handleIbanChange(e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          ibanError ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="DE89 3704 0044 0532 0130 00"
                      />
                      {ibanError && (
                        <p className="text-red-600 text-xs mt-1">{ibanError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg font-mono">
                      {organization.bankDetails?.iban ? 
                        organization.bankDetails.iban.replace(/(.{4})/g, '$1 ').trim() :
                        t('organization.bank.notSpecified', 'Nicht angegeben')
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.bic', 'BIC / SWIFT')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.bankDetails?.bic || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...(formData.bankDetails || {}), bic: e.target.value.toUpperCase() }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="COBADEFFXXX"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg font-mono">
                      {organization.bankDetails?.bic || t('organization.bank.notSpecified', 'Nicht angegeben')}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.bankName', 'Bankname')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.bankDetails?.bankName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...(formData.bankDetails || {}), bankName: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('organization.bank.bankNamePlaceholder', 'z.B. Commerzbank AG')}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.bankDetails?.bankName || t('organization.bank.notSpecified', 'Nicht angegeben')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Info Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <div className="text-blue-600 text-xl mr-3">ℹ️</div>
                <div>
                  <h4 className="font-semibold text-blue-800">
                    {t('organization.bank.infoTitle', 'Verwendung der Bankdaten')}
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('organization.bank.infoDesc', 'Diese Bankverbindung wird für ausgehende Rechnungen, Zahlungsaufforderungen und andere Dokumente verwendet.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t('organization.additionalInfo', 'Zusätzliche Informationen')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">
                  {t('organization.created', 'Erstellt am')}:
                </span>
                <span className="ml-2 text-gray-600">
                  {new Date(organization.created_at).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">
                  {t('organization.lastUpdated', 'Zuletzt aktualisiert')}:
                </span>
                <span className="ml-2 text-gray-600">
                  {new Date(organization.updated_at).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Type Change Impact */}
        {editing && formData.type !== organization.type && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <div className="text-amber-600 text-xl mr-3">⚠️</div>
              <div>
                <h4 className="font-semibold text-amber-800">
                  {t('organization.typeChangeTitle', 'Organisationstyp wird geändert')}
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  {t('organization.typeChangeDesc', 'Diese Änderung hat folgende Auswirkungen:')}
                </p>
                <ul className="text-sm text-amber-700 mt-2 list-disc list-inside space-y-1">
                  <li>
                    {formData.type === 'verein' 
                      ? t('organization.changeToClub', 'Alle "Kunden" werden zu "Mitgliedern"')
                      : t('organization.changeToCompany', 'Alle "Mitglieder" werden zu "Kunden"')
                    }
                  </li>
                  <li>
                    {t('organization.changeLabels', 'Dashboard und Menü-Labels ändern sich automatisch')}
                  </li>
                  <li>
                    {t('organization.changeNumbers', 'Neue Nummernkreise (M001... oder K001...)')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationView;