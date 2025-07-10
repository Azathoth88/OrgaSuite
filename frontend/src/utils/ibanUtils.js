// ibanUtils.js - Mit axios wie im Rest Ihrer App

import axios from 'axios';

// Verwende die gleiche API_URL wie überall in Ihrer App
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Cache für bereits abgerufene Bankdaten
const bankDataCache = new Map();

/**
 * Formatiert eine IBAN mit Leerzeichen alle 4 Zeichen
 * @param {string} value - Die zu formatierende IBAN
 * @returns {string} Formatierte IBAN
 */
export const formatIBAN = (value) => {
  if (!value) return '';
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  return formatted;
};

/**
 * Entfernt alle Leerzeichen aus einer IBAN
 * @param {string} iban - Die IBAN mit möglichen Leerzeichen
 * @returns {string} IBAN ohne Leerzeichen
 */
export const cleanIBAN = (iban) => {
  return iban.replace(/\s/g, '').toUpperCase();
};

/**
 * IBAN-Längen nach Land
 */
const IBAN_LENGTHS = {
  'AD': 24, 'AE': 23, 'AT': 20, 'BE': 16, 'BG': 22, 'CH': 21, 'CY': 28, 'CZ': 24,
  'DE': 22, 'DK': 18, 'EE': 20, 'ES': 24, 'FI': 18, 'FR': 27, 'GB': 22, 'GI': 23,
  'GR': 27, 'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23, 'IS': 26, 'IT': 27, 'LI': 21,
  'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27, 'ME': 22, 'MK': 19, 'MT': 31, 'NL': 18,
  'NO': 15, 'PL': 28, 'PT': 25, 'RO': 24, 'RS': 22, 'SE': 24, 'SI': 19, 'SK': 24,
  'SM': 27, 'TR': 26
};

/**
 * Validiert die IBAN-Prüfsumme mit Modulo-97
 */
const validateIBANChecksum = (iban) => {
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  let numericString = '';
  
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    if (isNaN(parseInt(char))) {
      numericString += (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10);
    } else {
      numericString += char;
    }
  }
  
  let remainder = numericString.substring(0, 9) % 97;
  for (let i = 9; i < numericString.length; i += 7) {
    remainder = (remainder + numericString.substring(i, i + 7)) % 97;
  }
  
  return remainder === 1;
};

/**
 * Validiert eine IBAN
 */
export const validateIBAN = (iban) => {
  const cleaned = cleanIBAN(iban);
  
  if (!cleaned) {
    return { isValid: false, error: null, countryCode: null, bankCode: null };
  }
  
  if (cleaned.length < 4) {
    return { isValid: false, error: 'IBAN zu kurz', countryCode: null, bankCode: null };
  }
  
  const countryCode = cleaned.substring(0, 2);
  const checkDigits = cleaned.substring(2, 4);
  
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { isValid: false, error: 'Ungültiger Ländercode', countryCode: null, bankCode: null };
  }
  
  if (!/^\d{2}$/.test(checkDigits)) {
    return { isValid: false, error: 'Ungültige Prüfziffern', countryCode: countryCode, bankCode: null };
  }
  
  const expectedLength = IBAN_LENGTHS[countryCode];
  if (!expectedLength) {
    return { isValid: false, error: `Ländercode ${countryCode} wird nicht unterstützt`, countryCode: countryCode, bankCode: null };
  }
  
  if (cleaned.length !== expectedLength) {
    return { isValid: false, error: `IBAN für ${countryCode} muss ${expectedLength} Zeichen lang sein (aktuell: ${cleaned.length})`, countryCode: countryCode, bankCode: null };
  }
  
  if (!/^[A-Z0-9]+$/.test(cleaned)) {
    return { isValid: false, error: 'IBAN darf nur Buchstaben und Zahlen enthalten', countryCode: countryCode, bankCode: null };
  }
  
  if (!validateIBANChecksum(cleaned)) {
    return { isValid: false, error: 'Ungültige IBAN-Prüfsumme', countryCode: countryCode, bankCode: null };
  }
  
  let bankCode = null;
  if (countryCode === 'DE' && cleaned.length === 22) {
    bankCode = cleaned.substring(4, 12);
  }
  
  return { isValid: true, error: null, countryCode: countryCode, bankCode: bankCode };
};

/**
 * Ruft Bankdaten über die API ab - NUTZT AXIOS WIE DER REST DER APP!
 * @param {string} iban - Die IBAN für die Bankabfrage
 * @returns {Promise<{success: boolean, bic?: string, bankName?: string, error?: string}>}
 */
export const lookupBankData = async (iban) => {
  const cleaned = cleanIBAN(iban);
  
  // Validierung
  const validation = validateIBAN(cleaned);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
      bic: '',
      bankName: ''
    };
  }
  
  // Prüfe Cache
  if (bankDataCache.has(cleaned)) {
    console.log('Bank-Daten aus Cache:', cleaned);
    return {
      success: true,
      ...bankDataCache.get(cleaned)
    };
  }
  
  try {
    // NUTZE AXIOS WIE IM REST DER APP!
    const url = `${API_URL}/banks/lookup-iban/${cleaned}`;
    console.log('Bank-Lookup API Call:', url);
    
    const response = await axios.get(url);
    const data = response.data;
    
    console.log('Bank-Lookup Response:', data);
    
    // Prüfe ob die API erfolgreich war und Bankdaten gefunden wurden
    if (!data.success) {
      throw new Error('API-Fehler');
    }
    
    if (!data.found || !data.bank) {
      // Bank wurde nicht gefunden - das ist kein Fehler, sondern ein normales Ergebnis
      console.log('Bank nicht in Datenbank gefunden für IBAN:', cleaned);
      return {
        success: false,
        error: 'Bank nicht in unserer Datenbank gefunden. Bitte BIC manuell eingeben.',
        bic: '',
        bankName: ''
      };
    }
    
    // Extrahiere BIC und Bankname
    const bankData = {
      bic: data.bank.bic || '',
      bankName: data.bank.name || data.bank.shortName || ''
    };
    
    console.log('Extrahierte Bankdaten:', bankData);
    
    // In Cache speichern
    bankDataCache.set(cleaned, bankData);
    
    return {
      success: true,
      ...bankData,
      bankleitzahl: data.bankleitzahl,
      city: data.bank.city
    };
    
  } catch (error) {
    console.error('Bank-Lookup Fehler:', error);
    
    // Axios Error Handling
    if (error.response) {
      // Server antwortete mit Fehlercode
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      
      if (error.response.status === 404) {
        return {
          success: false,
          error: 'Bank nicht gefunden',
          bic: '',
          bankName: ''
        };
      }
      
      return {
        success: false,
        error: `Server-Fehler: ${error.response.status}`,
        bic: '',
        bankName: ''
      };
    } else if (error.request) {
      // Request wurde gemacht aber keine Antwort
      console.error('No response received:', error.request);
      return {
        success: false,
        error: 'Keine Antwort vom Server',
        bic: '',
        bankName: ''
      };
    } else {
      // Sonstiger Fehler
      return {
        success: false,
        error: error.message || 'Fehler beim Abrufen der Bankdaten',
        bic: '',
        bankName: ''
      };
    }
  }
};

/**
 * React Hook für IBAN-Validierung mit Bank-Lookup (nur für Frontend)
 */
export const useIBANValidation = (initialIban = '') => {
  // Importiere React hooks nur wenn im Frontend
  const React = require('react');
  const { useState, useEffect, useCallback } = React;
  
  const [iban, setIban] = useState(initialIban || '');
  const [validation, setValidation] = useState({
    isValid: false,
    error: null,
    countryCode: null,
    bankCode: null
  });
  const [bankData, setBankData] = useState({
    bic: '',
    bankName: '',
    loading: false,
    error: null,
    city: ''
  });

  const [lookupTimer, setLookupTimer] = useState(null);

  const handleIbanChange = useCallback((value) => {
    setIban(value);
    
    const validationResult = validateIBAN(value);
    setValidation(validationResult);
    
    if (lookupTimer) {
      clearTimeout(lookupTimer);
    }
    
    if (!validationResult.isValid) {
      setBankData({
        bic: '',
        bankName: '',
        loading: false,
        error: null,
        city: ''
      });
      return;
    }
    
    const newTimer = setTimeout(async () => {
      setBankData(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await lookupBankData(value);
      
      if (result.success) {
        setBankData({
          bic: result.bic,
          bankName: result.bankName,
          loading: false,
          error: null,
          city: result.city || ''
        });
      } else {
        setBankData({
          bic: '',
          bankName: '',
          loading: false,
          error: result.error,
          city: ''
        });
      }
    }, 500);
    
    setLookupTimer(newTimer);
  }, [lookupTimer]);

  useEffect(() => {
    return () => {
      if (lookupTimer) {
        clearTimeout(lookupTimer);
      }
    };
  }, [lookupTimer]);

  useEffect(() => {
    if (initialIban) {
      handleIbanChange(initialIban);
    }
  }, [initialIban]);

  return {
    iban,
    validation,
    handleIbanChange,
    isValid: validation.isValid,
    error: validation.error,
    formatted: formatIBAN(iban),
    countryCode: validation.countryCode,
    bankCode: validation.bankCode,
    bic: bankData.bic,
    bankName: bankData.bankName,
    bankLoading: bankData.loading,
    bankError: bankData.error,
    bankCity: bankData.city,
    bankData: bankData
  };
};

/**
 * Weitere Utility-Funktionen
 */
export const clearBankDataCache = () => {
  bankDataCache.clear();
};

export const getCacheSize = () => {
  return bankDataCache.size;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};