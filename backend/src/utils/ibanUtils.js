// backend/src/utils/ibanUtils.js
/**
 * Zentrale IBAN-Validierung für OrgaSuite Backend
 * Kann sowohl für Organisation als auch Mitglieder verwendet werden
 */

/**
 * IBAN-Längen nach Ländercode
 */
const IBAN_CODE_LENGTHS = {
  AD: 24, AE: 23, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  CH: 21, CR: 21, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, ES: 24,
  FI: 18, FO: 18, FR: 27, GB: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21,
  HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26,   
  AL: 28, BY: 28, EG: 29, GE: 22, IQ: 23, LC: 32, SC: 31, ST: 25,
  SV: 28, TL: 23, UA: 29, VA: 22, VG: 24, XK: 20
};

/**
 * Berechnet den Mod97-Checksum für IBAN-Validierung
 * @param {string} string - Die zu prüfende Zeichenkette
 * @returns {number} - Checksum-Wert
 */
function mod97(string) {
  let checksum = string.slice(0, 2);
  let fragment;
  
  for (let offset = 2; offset < string.length; offset += 7) {
    fragment = String(checksum) + string.substring(offset, offset + 7);
    checksum = parseInt(fragment, 10) % 97;
  }
  
  return checksum;
}

/**
 * Validiert eine IBAN-Nummer vollständig
 * @param {string} input - Die zu prüfende IBAN
 * @returns {object} - Validierungsergebnis mit Details
 */
function validateIBAN(input) {
  // Basis-Prüfungen
  if (!input) {
    return {
      isValid: true, // Leere IBAN ist erlaubt (optionales Feld)
      error: null,
      formatted: '',
      countryCode: null,
      bankCode: null
    };
  }

  // IBAN normalisieren (nur alphanumerische Zeichen, Großbuchstaben)
  const iban = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Grundformat prüfen: 2 Buchstaben + 2 Ziffern + Rest
  const ibanMatch = iban.match(/^([A-Z]{2})(\d{2})([A-Z\d]+)$/);
  
  if (!ibanMatch) {
    return {
      isValid: false,
      error: 'Ungültiges IBAN-Format. IBAN muss mit 2 Buchstaben (Ländercode) und 2 Ziffern (Prüfziffern) beginnen.',
      formatted: input,
      countryCode: null,
      bankCode: null
    };
  }

  const [, countryCode, checkDigits, rest] = ibanMatch;

  // Länge für Land prüfen
  const expectedLength = IBAN_CODE_LENGTHS[countryCode];
  if (!expectedLength) {
    return {
      isValid: false,
      error: `Unbekannter Ländercode: ${countryCode}`,
      formatted: input,
      countryCode,
      bankCode: null
    };
  }

  if (iban.length !== expectedLength) {
    return {
      isValid: false,
      error: `Falsche IBAN-Länge für ${countryCode}. Erwartet: ${expectedLength} Zeichen, erhalten: ${iban.length}`,
      formatted: input,
      countryCode,
      bankCode: null
    };
  }

  // Checksum-Validierung (mod97)
  // IBAN umstellen: Rest + Ländercode + Prüfziffern
  const rearrangedIban = rest + countryCode + checkDigits;
  
  // Buchstaben in Zahlen umwandeln (A=10, B=11, ..., Z=35)
  const digits = rearrangedIban.replace(/[A-Z]/g, (letter) => {
    return letter.charCodeAt(0) - 55;
  });

  // Mod97-Prüfung: Ergebnis muss 1 sein
  const checksumValid = mod97(digits) === 1;

  if (!checksumValid) {
    return {
      isValid: false,
      error: 'IBAN-Prüfsumme ist ungültig. Bitte überprüfen Sie die eingegebene IBAN.',
      formatted: input,
      countryCode,
      bankCode: extractBankCode(iban, countryCode)
    };
  }

  // Alles gültig
  return {
    isValid: true,
    error: null,
    formatted: formatIBAN(iban),
    countryCode,
    bankCode: extractBankCode(iban, countryCode)
  };
}

/**
 * Formatiert eine IBAN für bessere Lesbarkeit (mit Leerzeichen alle 4 Zeichen)
 * @param {string} iban - Die unformatierte IBAN
 * @returns {string} - Formatierte IBAN
 */
function formatIBAN(iban) {
  if (!iban) return '';
  
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return cleanIban.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Extrahiert die Bankleitzahl aus der IBAN (falls möglich)
 * @param {string} iban - Die IBAN
 * @param {string} countryCode - Der Ländercode
 * @returns {string|null} - Bankleitzahl oder null
 */
function extractBankCode(iban, countryCode) {
  // Vereinfachte Bankcode-Extraktion für häufige Länder
  const bankCodePositions = {
    DE: { start: 4, length: 8 }, // Deutschland: Zeichen 5-12
    AT: { start: 4, length: 5 }, // Österreich: Zeichen 5-9
    CH: { start: 4, length: 5 }, // Schweiz: Zeichen 5-9
    FR: { start: 4, length: 5 }, // Frankreich: Zeichen 5-9
    IT: { start: 5, length: 5 }, // Italien: Zeichen 6-10
    ES: { start: 4, length: 4 }, // Spanien: Zeichen 5-8
    NL: { start: 4, length: 4 }, // Niederlande: Zeichen 5-8
  };

  const position = bankCodePositions[countryCode];
  if (position && iban.length >= position.start + position.length) {
    return iban.substring(position.start, position.start + position.length);
  }

  return null;
}

/**
 * Prüft, ob eine IBAN gültig ist (einfache Boolean-Funktion)
 * @param {string} iban - Die zu prüfende IBAN
 * @returns {boolean} - true wenn gültig, false wenn ungültig
 */
function isValidIBAN(iban) {
  return validateIBAN(iban).isValid;
}

/**
 * Express.js Middleware für IBAN-Validierung
 * @param {string} fieldName - Name des Feldes mit der IBAN (z.B. 'bankDetails.iban')
 * @param {boolean} required - Ob die IBAN erforderlich ist
 * @returns {Function} - Express Middleware
 */
function ibanValidationMiddleware(fieldName = 'iban', required = false) {
  return (req, res, next) => {
    // Verschachtelte Felder unterstützen (z.B. 'bankDetails.iban')
    const fieldPath = fieldName.split('.');
    let ibanValue = req.body;
    
    for (const path of fieldPath) {
      ibanValue = ibanValue && ibanValue[path];
    }

    // Wenn IBAN nicht vorhanden und nicht erforderlich
    if (!ibanValue && !required) {
      return next();
    }

    // Wenn IBAN erforderlich aber nicht vorhanden
    if (!ibanValue && required) {
      return res.status(400).json({
        error: 'IBAN ist erforderlich',
        field: fieldName
      });
    }

    // IBAN validieren
    const validation = validateIBAN(ibanValue);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'IBAN-Validierung fehlgeschlagen',
        details: validation.error,
        field: fieldName,
        provided: ibanValue
      });
    }

    // Validierte und formatierte IBAN zurück in Request speichern
    req.validatedIBAN = {
      original: ibanValue,
      formatted: validation.formatted,
      countryCode: validation.countryCode,
      bankCode: validation.bankCode
    };

    next();
  };
}

/**
 * Validiert IBAN mit detailliertem Logging
 * @param {string} iban - Die zu prüfende IBAN
 * @param {string} context - Kontext für Logging (z.B. 'Organization', 'Member')
 * @returns {object} - Validierungsergebnis
 */
function validateIBANWithLogging(iban, context = 'Unknown') {
  const result = validateIBAN(iban);
  
  if (iban) {
    if (result.isValid) {
      console.log(`✅ [${context}] IBAN validation successful: ${result.countryCode} (${result.formatted})`);
    } else {
      console.warn(`⚠️ [${context}] IBAN validation failed: ${result.error}`);
    }
  }
  
  return result;
}

module.exports = {
  validateIBAN,
  isValidIBAN,
  formatIBAN,
  extractBankCode,
  ibanValidationMiddleware,
  validateIBANWithLogging,
  IBAN_CODE_LENGTHS,
  mod97
};