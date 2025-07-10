const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'orgasuite_user',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'orgasuite',
  password: process.env.POSTGRES_PASSWORD || 'orgasuite_password',
  port: process.env.POSTGRES_PORT || 5432,
});

async function simpleImport() {
  console.log('Starting simple import...');
  
  const content = fs.readFileSync('/app/data/bundesbank/bundesbank.csv', 'latin1');
  const lines = content.split(/\r?\n/);
  
  console.log(`Found ${lines.length} lines in CSV`);
  console.log('First line (header):', lines[0].substring(0, 100));
  console.log('Second line:', lines[1].substring(0, 100));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear existing data
    await client.query('DELETE FROM german_banks');
    
    let count = 0;
    let errors = 0;
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;
      
      // Remove quotes and split by semicolon
      const fields = line.split(';').map(f => f.replace(/^"|"$/g, '').trim());
      
      if (fields.length >= 13 && fields[0]) {
        try {
          await client.query(`
            INSERT INTO german_banks (
              bankleitzahl, merkmal, bezeichnung, plz, ort, kurzbezeichnung,
              pan, bic, pruefzifferberechnungsmethode, datensatznummer,
              aenderungskennzeichen, bankleitzahllöschung, nachfolge_bankleitzahl
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (bankleitzahl) DO UPDATE SET
              bezeichnung = EXCLUDED.bezeichnung,
              bic = EXCLUDED.bic,
              ort = EXCLUDED.ort,
              updated_at = CURRENT_TIMESTAMP
          `, [
            fields[0] || '', // bankleitzahl
            fields[1] || '', // merkmal
            fields[2] || '', // bezeichnung
            fields[3] || '', // plz
            fields[4] || '', // ort
            fields[5] || '', // kurzbezeichnung
            fields[6] || '', // pan
            fields[7] || '', // bic
            fields[8] || '', // pruefzifferberechnungsmethode
            fields[9] || '', // datensatznummer
            fields[10] || '', // aenderungskennzeichen
            fields[11] || '', // bankleitzahllöschung
            fields[12] || '' // nachfolge_bankleitzahl
          ]);
          count++;
          
          if (count % 100 === 0) {
            console.log(`Imported ${count} banks...`);
          }
        } catch (err) {
          errors++;
          if (errors <= 5) {
            console.log(`Error at line ${i}:`, err.message);
            console.log('Fields:', fields);
          }
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${count} banks (${errors} errors)`);
    
    // Show statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_banks,
        COUNT(DISTINCT bic) as unique_bics,
        COUNT(CASE WHEN bic IS NOT NULL AND bic != '' THEN 1 END) as banks_with_bic
      FROM german_banks
    `);
    console.log('Statistics:', stats.rows[0]);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import failed:', err);
  } finally {
    client.release();
  }
  
  process.exit(0);
}

simpleImport().catch(console.error);