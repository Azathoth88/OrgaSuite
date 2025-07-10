// backend/data/bundesbank/import-banks.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Datenbankverbindung
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'orgasuite_user',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'orgasuite',
  password: process.env.POSTGRES_PASSWORD || 'orgasuite_password',
  port: process.env.POSTGRES_PORT || 5432,
});

/**
 * Erstellt das Datenbank-Schema für Bankdaten
 */
async function createBankSchema(client) {
  console.log('🗄️  [BANK_SCHEMA] Creating bank database schema...');
  
  const schemaSQL = `
    -- Tabelle für deutsche Bankdaten (Bundesbank)
    CREATE TABLE IF NOT EXISTS german_banks (
        id SERIAL PRIMARY KEY,
        bankleitzahl VARCHAR(8) NOT NULL UNIQUE,
        merkmal VARCHAR(1),
        bezeichnung TEXT NOT NULL,
        plz VARCHAR(5),
        ort VARCHAR(100),
        kurzbezeichnung VARCHAR(100),
        pan VARCHAR(5),
        bic VARCHAR(11),
        pruefzifferberechnungsmethode VARCHAR(2),
        datensatznummer VARCHAR(10),
        aenderungskennzeichen VARCHAR(1),
        bankleitzahllöschung VARCHAR(1),
        nachfolge_bankleitzahl VARCHAR(8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Index für Performance bei BIC/BLZ-Suchen
    CREATE INDEX IF NOT EXISTS idx_german_banks_bic ON german_banks(bic);
    CREATE INDEX IF NOT EXISTS idx_german_banks_blz ON german_banks(bankleitzahl);
    CREATE INDEX IF NOT EXISTS idx_german_banks_bezeichnung ON german_banks(bezeichnung);

    -- Trigger für updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_german_banks_updated_at ON german_banks;
    CREATE TRIGGER update_german_banks_updated_at 
        BEFORE UPDATE ON german_banks 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  await client.query(schemaSQL);
  console.log('✅ [BANK_SCHEMA] Bank schema created successfully');
}

/**
 * Importiert die Bundesbank-Datei in die Datenbank
 */
async function importBundesbankData() {
  const csvFilePath = path.join(__dirname, 'bundesbank.csv');
  
  console.log('🏦 [BANK_IMPORT] Starting Bundesbank data import...');
  console.log(`📁 [BANK_IMPORT] Reading file: ${csvFilePath}`);
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ [BANK_IMPORT] File not found: ${csvFilePath}`);
    throw new Error(`Bundesbank CSV file not found: ${csvFilePath}`);
  }

  const client = await pool.connect();
  
  try {
    // Transaktion starten
    await client.query('BEGIN');
    
    // Schema erstellen
    await createBankSchema(client);
    
    // Bestehende Daten löschen
    console.log('🗑️  [BANK_IMPORT] Clearing existing bank data...');
    await client.query('DELETE FROM german_banks');
    
    const banks = [];
    
    // CSV-Datei lesen - Angepasst für Ihr Format
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath, { encoding: 'latin1' }) // ANSI/Windows-1252
        .pipe(csv({
          separator: ';',     // Semikolon als Trennzeichen
          headers: true,      // Erste Zeile enthält Header
          quote: '"',         // Anführungszeichen
          strict: false,      // Nicht so strikt bei Parsing-Fehlern
          skipLinesWithError: false
        }))
        .on('headers', (headers) => {
          console.log('📋 [BANK_IMPORT] CSV Headers found:', headers.slice(0, 5).join(', '), '...');
        })
        .on('data', (row) => {
          // Normalisiere die Feldnamen (falls Header Umlaute enthalten)
          const normalizedRow = {};
          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key
              .toLowerCase()
              .replace('ä', 'ae')
              .replace('ö', 'oe')
              .replace('ü', 'ue')
              .replace('ß', 'ss')
              .replace(/[^a-z0-9]/g, '');
            normalizedRow[normalizedKey] = value;
          }
          
          // Importiere ALLE Banken (nicht nur die mit BIC)
          const bankleitzahl = normalizedRow.bankleitzahl || row.Bankleitzahl || row.bankleitzahl;
          
          if (bankleitzahl && bankleitzahl.trim()) {
            banks.push({
              bankleitzahl: bankleitzahl.trim(),
              merkmal: (normalizedRow.merkmal || row.Merkmal || '').trim(),
              bezeichnung: (normalizedRow.bezeichnung || row.Bezeichnung || '').trim(),
              plz: (normalizedRow.plz || row.PLZ || '').trim(),
              ort: (normalizedRow.ort || row.Ort || '').trim(),
              kurzbezeichnung: (normalizedRow.kurzbezeichnung || row.Kurzbezeichnung || '').trim(),
              pan: (normalizedRow.pan || row.PAN || '').trim(),
              bic: (normalizedRow.bic || row.BIC || '').trim(),
              pruefzifferberechnungsmethode: (normalizedRow.prfzifferberechnungsmethode || 
                                              normalizedRow.pruefzifferberechnungsmethode || 
                                              row['Prüfzifferberechnungsmethode'] || 
                                              row['Pr�fzifferberechnungsmethode'] || '').trim(),
              datensatznummer: (normalizedRow.datensatznummer || row.Datensatznummer || '').trim(),
              aenderungskennzeichen: (normalizedRow.nderungskennzeichen || 
                                     normalizedRow.aenderungskennzeichen || 
                                     row['Änderungskennzeichen'] || 
                                     row['�nderungskennzeichen'] || '').trim(),
              bankleitzahllöschung: (normalizedRow.bankleitzahllschung || 
                                    normalizedRow.bankleitzahllöschung || 
                                    row['Bankleitzahllöschung'] || 
                                    row['Bankleitzahll�schung'] || '').trim(),
              nachfolge_bankleitzahl: (normalizedRow.nachfolgebankleitzahl || 
                                      row['Nachfolge-Bankleitzahl'] || '').trim()
            });
          }
        })
        .on('end', () => {
          console.log(`✅ [BANK_IMPORT] CSV parsing complete`);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ [BANK_IMPORT] CSV parsing error:', error);
          reject(error);
        });
    });
    
    console.log(`📊 [BANK_IMPORT] Parsed ${banks.length} bank records`);
    
    // Batch-Insert für bessere Performance
    const batchSize = 1000;
    let insertedCount = 0;
    
    for (let i = 0; i < banks.length; i += batchSize) {
      const batch = banks.slice(i, i + batchSize);
      
      const insertQuery = `
        INSERT INTO german_banks (
          bankleitzahl, merkmal, bezeichnung, plz, ort, kurzbezeichnung,
          pan, bic, pruefzifferberechnungsmethode, datensatznummer,
          aenderungskennzeichen, bankleitzahllöschung, nachfolge_bankleitzahl
        ) VALUES ${batch.map((_, idx) => 
          `($${idx * 13 + 1}, $${idx * 13 + 2}, $${idx * 13 + 3}, $${idx * 13 + 4}, 
           $${idx * 13 + 5}, $${idx * 13 + 6}, $${idx * 13 + 7}, $${idx * 13 + 8},
           $${idx * 13 + 9}, $${idx * 13 + 10}, $${idx * 13 + 11}, $${idx * 13 + 12}, $${idx * 13 + 13})`
        ).join(', ')}
        ON CONFLICT (bankleitzahl) DO UPDATE SET
          bezeichnung = EXCLUDED.bezeichnung,
          bic = EXCLUDED.bic,
          ort = EXCLUDED.ort,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const values = batch.flatMap(bank => [
        bank.bankleitzahl, bank.merkmal, bank.bezeichnung, bank.plz,
        bank.ort, bank.kurzbezeichnung, bank.pan, bank.bic,
        bank.pruefzifferberechnungsmethode, bank.datensatznummer,
        bank.aenderungskennzeichen, bank.bankleitzahllöschung, bank.nachfolge_bankleitzahl
      ]);
      
      await client.query(insertQuery, values);
      insertedCount += batch.length;
      
      console.log(`📥 [BANK_IMPORT] Imported ${insertedCount}/${banks.length} records...`);
    }
    
    // Transaktion bestätigen
    await client.query('COMMIT');
    
    console.log(`✅ [BANK_IMPORT] Successfully imported ${insertedCount} bank records`);
    
    // Statistiken ausgeben
    const statsQuery = `
      SELECT 
        COUNT(*) as total_banks,
        COUNT(DISTINCT bic) as unique_bics,
        COUNT(CASE WHEN bic IS NOT NULL AND bic != '' THEN 1 END) as banks_with_bic
      FROM german_banks
    `;
    const stats = await client.query(statsQuery);
    console.log('📈 [BANK_IMPORT] Import statistics:', stats.rows[0]);
    
    return {
      success: true,
      imported: insertedCount,
      stats: stats.rows[0]
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [BANK_IMPORT] Import failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Führt den Import aus, wenn direkt aufgerufen
 */
if (require.main === module) {
  importBundesbankData()
    .then((result) => {
      console.log('🎉 [BANK_IMPORT] Import completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [BANK_IMPORT] Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importBundesbankData };