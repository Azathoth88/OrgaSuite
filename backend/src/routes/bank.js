// backend/src/routes/banks.js
const express = require('express');
const router = express.Router();
const bankService = require('../services/bankService');
const { validateIBAN } = require('../utils/ibanUtils');

/**
 * GET /api/banks/lookup-iban/:iban
 * Ermittelt Bankdaten anhand einer IBAN
 */
router.get('/lookup-iban/:iban', async (req, res) => {
  try {
    const { iban } = req.params;
    
    // IBAN-Format validieren
    const ibanValidation = validateIBAN(iban);
    if (!ibanValidation.isValid) {
      return res.status(400).json({
        error: 'Ungültige IBAN',
        details: ibanValidation.error
      });
    }
    
    const bankInfo = await bankService.getExtendedBankInfo(iban);
    
    res.json({
      success: true,
      iban: ibanValidation.formatted,
      ...bankInfo
    });
    
  } catch (error) {
    console.error('[BANK_API] Error in lookup-iban:', error);
    res.status(500).json({
      error: 'Fehler beim Ermitteln der Bankdaten',
      details: error.message
    });
  }
});

/**
 * GET /api/banks/lookup-blz/:blz
 * Ermittelt Bankdaten anhand einer Bankleitzahl
 */
router.get('/lookup-blz/:blz', async (req, res) => {
  try {
    const { blz } = req.params;
    
    if (!/^\d{8}$/.test(blz)) {
      return res.status(400).json({
        error: 'Ungültige Bankleitzahl',
        details: 'Bankleitzahl muss 8 Ziffern haben'
      });
    }
    
    const bankData = await bankService.findBankByBLZ(blz);
    
    if (!bankData) {
      return res.status(404).json({
        error: 'Bank nicht gefunden',
        bankleitzahl: blz
      });
    }
    
    res.json({
      success: true,
      found: true,
      bankleitzahl: blz,
      bank: {
        name: bankData.bezeichnung,
        shortName: bankData.kurzbezeichnung,
        bic: bankData.bic,
        city: bankData.ort
      }
    });
    
  } catch (error) {
    console.error('[BANK_API] Error in lookup-blz:', error);
    res.status(500).json({
      error: 'Fehler beim Ermitteln der Bankdaten',
      details: error.message
    });
  }
});

/**
 * GET /api/banks/search?q=<suchbegriff>&limit=<anzahl>
 * Sucht Banken anhand des Namens (für Autocomplete)
 */
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Mindestens 2 Zeichen erforderlich'
      });
    }
    
    const maxLimit = Math.min(parseInt(limit) || 10, 50);
    const banks = await bankService.searchBanksByName(searchTerm, maxLimit);
    
    res.json({
      success: true,
      results: banks.map(bank => ({
        bankleitzahl: bank.bankleitzahl,
        name: bank.bezeichnung,
        shortName: bank.kurzbezeichnung,
        bic: bank.bic,
        city: bank.ort,
        displayName: `${bank.kurzbezeichnung} (${bank.ort})`,
        fullDisplayName: `${bank.bezeichnung} - ${bank.ort}`
      })),
      count: banks.length,
      searchTerm
    });
    
  } catch (error) {
    console.error('[BANK_API] Error in search:', error);
    res.status(500).json({
      error: 'Fehler bei der Banksuche',
      details: error.message
    });
  }
});

/**
 * GET /api/banks/lookup-bic/:bic
 * Ermittelt Bankdaten anhand eines BIC
 */
router.get('/lookup-bic/:bic', async (req, res) => {
  try {
    const { bic } = req.params;
    
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase())) {
      return res.status(400).json({
        error: 'Ungültiger BIC',
        details: 'BIC muss 8 oder 11 Zeichen haben'
      });
    }
    
    const bankData = await bankService.findBankByBIC(bic);
    
    if (!bankData) {
      return res.status(404).json({
        error: 'Bank mit diesem BIC nicht gefunden',
        bic: bic.toUpperCase()
      });
    }
    
    res.json({
      success: true,
      found: true,
      bic: bic.toUpperCase(),
      bank: {
        name: bankData.bezeichnung,
        shortName: bankData.kurzbezeichnung,
        bankleitzahl: bankData.bankleitzahl,
        city: bankData.ort
      }
    });
    
  } catch (error) {
    console.error('[BANK_API] Error in lookup-bic:', error);
    res.status(500).json({
      error: 'Fehler beim Ermitteln der Bankdaten',
      details: error.message
    });
  }
});

/**
 * GET /api/banks/status
 * Gibt den Status der Bankdatenbank zurück
 */
router.get('/status', async (req, res) => {
  try {
    const status = await bankService.getStatus();
    
    res.json({
      success: true,
      bankDatabase: status
    });
    
  } catch (error) {
    console.error('[BANK_API] Error in status:', error);
    res.status(500).json({
      error: 'Fehler beim Ermitteln des Datenbankstatus',
      details: error.message
    });
  }
});

/**
 * POST /api/banks/batch-lookup
 * Ermittelt Bankdaten für mehrere IBANs gleichzeitig
 */
router.post('/batch-lookup', async (req, res) => {
  try {
    const { ibans } = req.body;
    
    if (!Array.isArray(ibans) || ibans.length === 0) {
      return res.status(400).json({
        error: 'Array von IBANs erwartet'
      });
    }
    
    if (ibans.length > 100) {
      return res.status(400).json({
        error: 'Maximal 100 IBANs pro Anfrage erlaubt'
      });
    }
    
    const results = [];
    
    for (const iban of ibans) {
      try {
        const bankInfo = await bankService.getExtendedBankInfo(iban);
        results.push({
          iban,
          ...bankInfo
        });
      } catch (error) {
        results.push({
          iban,
          found: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      processed: results.length
    });
    
  } catch (error) {
    console.error('[BANK_API] Error in batch-lookup:', error);
    res.status(500).json({
      error: 'Fehler beim Batch-Lookup',
      details: error.message
    });
  }
});

module.exports = router;