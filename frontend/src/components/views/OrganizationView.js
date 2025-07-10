import React, { useState, useContext, useEffect } from 'react';
import { OrganizationContext } from '../../contexts/OrganizationContext';
import { useOrgTranslation } from '../../hooks/useOrgTranslation';
import { useIBANValidation, formatIBAN } from '../../utils/ibanUtils';

const OrganizationView = () => {
  const { organization, saveOrganization } = useContext(OrganizationContext);
  const { t } = useOrgTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(organization || {});

  // IBAN-Validierung Hook mit Bank-Lookup
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
  } = useIBANValidation(formData.bankDetails?.iban || '');

  // Automatisch BIC und Bankname aktualisieren, wenn sie über die API gefunden wurden
  useEffect(() => {
    if (editing && isIbanValid && lookupBic && !bankLoading) {
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          bic: lookupBic,
          bankName: lookupBankName
        }
      }));
    }
  }, [lookupBic, lookupBankName, isIbanValid, bankLoading, editing]);

  const handleSave = async () => {
    // IBAN-Validierung vor dem Speichern
    if (iban && !isIbanValid) {
      alert(ibanError || t('organization.bank.invalidIban', 'Ungültiges IBAN-Format'));
      return;
    }

    setLoading(true);
    
    // Bankdaten mit validierter IBAN aktualisieren
    const updatedFormData = {
      ...formData,
      bankDetails: {
        ...(formData.bankDetails || {}),
        iban: iban || ''
      }
    };

    const success = await saveOrganization(updatedFormData);
    
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
    handleIbanChange(organization?.bankDetails?.iban || '');
    setEditing(false);
  };

  // IBAN Input Handler
  const handleIbanInputChange = (value) => {
    handleIbanChange(value);
    setFormData({
      ...formData,
      bankDetails: { ...(formData.bankDetails || {}), iban: value }
    });
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
                disabled={loading || (iban && !isIbanValid)}
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

        {/* Bank Details Card mit automatischem BIC/Bank-Lookup */}
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

                {/* ERWEITERTE IBAN-EINGABE MIT BANK-LOOKUP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.iban', 'IBAN')}
                    {ibanCountryCode && (
                      <span className="ml-2 text-xs text-blue-600">
                        ({ibanCountryCode}
                        {ibanBankCode && ` - BLZ: ${ibanBankCode}`})
                      </span>
                    )}
                    {bankLoading && (
                      <span className="ml-2 text-xs text-amber-600">
                        🔄 {t('organization.bank.loadingBankData', 'Lade Bankdaten...')}
                      </span>
                    )}
                  </label>
                  {editing ? (
                    <div>
                      <input
                        type="text"
                        value={iban}
                        onChange={(e) => handleIbanInputChange(e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                          iban && !isIbanValid ? 'border-red-300 bg-red-50' : 
                          iban && isIbanValid ? 'border-green-300 bg-green-50' : 
                          'border-gray-300'
                        }`}
                        placeholder="DE89 3704 0044 0532 0130 00"
                      />
                      
                      {/* IBAN-Validierung und Bank-Lookup Feedback */}
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
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {organization.bankDetails?.iban ? (
                        <div>
                          <div className="font-mono">
                            {formatIBAN(organization.bankDetails.iban)}
                          </div>
                          {organization.bankDetails?.iban && (
                            <div className="text-xs text-gray-500 mt-1">
                              {(() => {
                                const validation = ibanValidation;
                                return validation.countryCode ? (
                                  <>
                                    Land: {validation.countryCode}
                                    {validation.bankCode && ` | BLZ: ${validation.bankCode}`}
                                  </>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        t('organization.bank.notSpecified', 'Nicht angegeben')
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organization.bank.bic', 'BIC / SWIFT')}
                    {editing && lookupBic && (
                      <span className="ml-2 text-xs text-green-600">
                        ✅ {t('organization.bank.autoDetected', 'Automatisch ermittelt')}
                      </span>
                    )}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.bankDetails?.bic || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...(formData.bankDetails || {}), bic: e.target.value.toUpperCase() }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        lookupBic ? 'bg-green-50 border-green-300' : 'border-gray-300'
                      }`}
                      placeholder="COBADEFFXXX"
                      readOnly={!!lookupBic}
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
                    {editing && lookupBankName && (
                      <span className="ml-2 text-xs text-green-600">
                        ✅ {t('organization.bank.autoDetected', 'Automatisch ermittelt')}
                      </span>
                    )}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.bankDetails?.bankName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...(formData.bankDetails || {}), bankName: e.target.value }
                      })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        lookupBankName ? 'bg-green-50 border-green-300' : 'border-gray-300'
                      }`}
                      placeholder={t('organization.bank.bankNamePlaceholder', 'z.B. Commerzbank AG')}
                      readOnly={!!lookupBankName}
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
                  {editing && (
                    <p className="text-sm text-blue-700 mt-2 font-medium">
                      💡 {t('organization.bank.autoLookupInfo', 'BIC und Bankname werden automatisch ermittelt, sobald Sie eine gültige IBAN eingeben.')}
                    </p>
                  )}
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