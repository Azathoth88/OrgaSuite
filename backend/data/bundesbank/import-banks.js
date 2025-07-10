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
    RETURNS TRIGGER AS $
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $ language 'plpgsql';

    CREATE TRIGGER IF NOT EXISTS update_german_banks_updated_at 
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
    
    // CSV-Datei lesen
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({
          separator: '\t', // Tab-getrennt, falls nötig anpassen
          headers: [
            'bankleitzahl',
            'merkmal', 
            'bezeichnung',
            'plz',
            'ort',
            'kurzbezeichnung',
            'pan',
            'bic',
            'pruefzifferberechnungsmethode',
            'datensatznummer',
            'aenderungskennzeichen',
            'bankleitzahllöschung',
            'nachfolge_bankleitzahl'
          ]
        }))
        .on('data', (row) => {
          // Nur Einträge mit gültiger BIC importieren
          if (row.bic && row.bic.trim() && row.bic !== 'undefined') {
            banks.push({
              bankleitzahl: row.bankleitzahl?.trim() || '',
              merkmal: row.merkmal?.trim() || '',
              bezeichnung: row.bezeichnung?.trim() || '',
              plz: row.plz?.trim() || '',
              ort: row.ort?.trim() || '',
              kurzbezeichnung: row.kurzbezeichnung?.trim() || '',
              pan: row.pan?.trim() || '',
              bic: row.bic?.trim() || '',
              pruefzifferberechnungsmethode: row.pruefzifferberechnungsmethode?.trim() || '',
              datensatznummer: row.datensatznummer?.trim() || '',
              aenderungskennzeichen: row.aenderungskennzeichen?.trim() || '',
              bankleitzahllöschung: row.bankleitzahllöschung?.trim() || '',
              nachfolge_bankleitzahl: row.nachfolge_bankleitzahl?.trim() || ''
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
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
          `(${idx * 13 + 1}, ${idx * 13 + 2}, ${idx * 13 + 3}, ${idx * 13 + 4}, 
           ${idx * 13 + 5}, ${idx * 13 + 6}, ${idx * 13 + 7}, ${idx * 13 + 8},
           ${idx * 13 + 9}, ${idx * 13 + 10}, ${idx * 13 + 11}, ${idx * 13 + 12}, ${idx * 13 + 13})`
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