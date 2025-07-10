// backend/src/services/bankService.js
const sequelize = require('../config/database');

class BankService {
  
  /**
   * Sucht BIC anhand der Bankleitzahl (aus IBAN extrahiert)
   * @param {string} bankleitzahl - 8-stellige Bankleitzahl
   * @returns {Promise<Object|null>} Bankdaten oder null
   */
  async findBankByBLZ(bankleitzahl) {
    if (!bankleitzahl || bankleitzahl.length !== 8) {
      return null;
    }
    
    const query = `
      SELECT bankleitzahl, bezeichnung, bic, ort, kurzbezeichnung
      FROM german_banks 
      WHERE bankleitzahl = :bankleitzahl 
        AND bic IS NOT NULL 
        AND bic != ''
      LIMIT 1
    `;
    
    try {
      const [results] = await sequelize.query(query, {
        replacements: { bankleitzahl },
        type: sequelize.QueryTypes.SELECT
      });
      return results || null;
    } catch (error) {
      console.error('[BANK_SERVICE] Error finding bank by BLZ:', error);
      return null;
    }
  }
  
  /**
   * Sucht BIC anhand einer deutschen IBAN
   * @param {string} iban - Deutsche IBAN
   * @returns {Promise<Object|null>} Bankdaten oder null
   */
  async findBankByIBAN(iban) {
    if (!iban || !iban.startsWith('DE')) {
      return null;
    }
    
    // Deutsche IBAN: DE + 2 Prüfziffern + 8 BLZ + 10 Kontonummer
    const cleanIban = iban.replace(/\s/g, '');
    if (cleanIban.length !== 22) {
      return null;
    }
    
    const bankleitzahl = cleanIban.substring(4, 12);
    return await this.findBankByBLZ(bankleitzahl);
  }
  
  /**
   * Sucht Banken anhand des Namens (für Autocomplete)
   * @param {string} searchTerm - Suchbegriff
   * @param {number} limit - Maximale Anzahl Ergebnisse
   * @returns {Promise<Array>} Array von Bankdaten
   */
  async searchBanksByName(searchTerm, limit = 10) {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }
    
    const query = `
      SELECT bankleitzahl, bezeichnung, bic, ort, kurzbezeichnung
      FROM german_banks 
      WHERE (
        LOWER(bezeichnung) LIKE LOWER(:searchPattern) 
        OR LOWER(kurzbezeichnung) LIKE LOWER(:searchPattern)
        OR LOWER(ort) LIKE LOWER(:searchPattern)
      )
      AND bic IS NOT NULL 
      AND bic != ''
      ORDER BY 
        CASE 
          WHEN LOWER(kurzbezeichnung) LIKE LOWER(:exactPattern) THEN 1
          WHEN LOWER(bezeichnung) LIKE LOWER(:exactPattern) THEN 2
          ELSE 3
        END,
        bezeichnung
      LIMIT :limit
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const exactPattern = `${searchTerm}%`;
    
    try {
      const results = await sequelize.query(query, {
        replacements: { searchPattern, exactPattern, limit },
        type: sequelize.QueryTypes.SELECT
      });
      return results;
    } catch (error) {
      console.error('[BANK_SERVICE] Error searching banks by name:', error);
      return [];
    }
  }
  
  /**
   * Sucht Bank anhand BIC
   * @param {string} bic - BIC-Code
   * @returns {Promise<Object|null>} Bankdaten oder null
   */
  async findBankByBIC(bic) {
    if (!bic) {
      return null;
    }
    
    const query = `
      SELECT bankleitzahl, bezeichnung, bic, ort, kurzbezeichnung
      FROM german_banks 
      WHERE bic = :bic
      LIMIT 1
    `;
    
    try {
      const [results] = await sequelize.query(query, {
        replacements: { bic: bic.toUpperCase() },
        type: sequelize.QueryTypes.SELECT
      });
      return results || null;
    } catch (error) {
      console.error('[BANK_SERVICE] Error finding bank by BIC:', error);
      return null;
    }
  }
  
  /**
   * Extrahiert erweiterte Bankinformationen aus IBAN
   * @param {string} iban - IBAN
   * @returns {Promise<Object>} Erweiterte Bankinformationen
   */
  async getExtendedBankInfo(iban) {
    const bankData = await this.findBankByIBAN(iban);
    
    if (!bankData) {
      return {
        found: false,
        iban: iban,
        bankleitzahl: null,
        bank: null
      };
    }
    
    return {
      found: true,
      iban: iban,
      bankleitzahl: bankData.bankleitzahl,
      bank: {
        name: bankData.bezeichnung,
        shortName: bankData.kurzbezeichnung,
        bic: bankData.bic,
        city: bankData.ort
      }
    };
  }
  
  /**
   * Prüft, ob die Bankdatenbank verfügbar ist
   * @returns {Promise<Object>} Status der Bankdatenbank
   */
  async getStatus() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_banks,
          COUNT(DISTINCT bic) as unique_bics,
          MAX(updated_at) as last_update
        FROM german_banks
      `;
      
      const [results] = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });
      const stats = results;
      
      return {
        available: true,
        totalBanks: parseInt(stats.total_banks),
        uniqueBics: parseInt(stats.unique_bics),
        lastUpdate: stats.last_update
      };
    } catch (error) {
      console.error('[BANK_SERVICE] Error getting status:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = new BankService();