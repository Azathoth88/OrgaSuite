// test-csv.js - Debug Script für CSV-Analyse
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const csvFilePath = path.join(__dirname, 'bundesbank.csv');

console.log('🔍 Testing CSV file:', csvFilePath);

// 1. Prüfe ob Datei existiert
if (!fs.existsSync(csvFilePath)) {
    console.error('❌ File not found!');
    process.exit(1);
}

const stats = fs.statSync(csvFilePath);
console.log(`📊 File size: ${stats.size} bytes`);

// 2. Zeige die ersten Bytes (raw)
const buffer = fs.readFileSync(csvFilePath);
console.log('\n📄 First 200 bytes (hex):');
console.log(buffer.slice(0, 200).toString('hex'));

// 3. Zeige die ersten Zeilen
console.log('\n📄 First 3 lines (raw):');
const content = fs.readFileSync(csvFilePath, 'utf8');
const lines = content.split(/\r?\n/);
for (let i = 0; i < Math.min(3, lines.length); i++) {
    console.log(`Line ${i} (${lines[i].length} chars): "${lines[i].substring(0, 100)}..."`);
}

// 4. Teste verschiedene Encodings
console.log('\n🧪 Testing different encodings:');
const encodings = ['utf8', 'latin1', 'utf16le'];

for (const encoding of encodings) {
    try {
        const testContent = fs.readFileSync(csvFilePath, encoding);
        const firstLine = testContent.split(/\r?\n/)[0];
        console.log(`\n${encoding}: "${firstLine.substring(0, 50)}..."`);
    } catch (err) {
        console.log(`${encoding}: ERROR - ${err.message}`);
    }
}

// 5. Teste CSV-Parser mit verschiedenen Optionen
console.log('\n🧪 Testing CSV parser configurations:');

async function testParser(name, options) {
    return new Promise((resolve) => {
        let count = 0;
        let firstRow = null;
        let error = null;

        const stream = fs.createReadStream(csvFilePath, { encoding: options.encoding || 'utf8' })
            .pipe(csv(options.parserOptions || {}))
            .on('data', (row) => {
                count++;
                if (!firstRow) {
                    firstRow = row;
                }
                if (count >= 3) {
                    stream.destroy();
                }
            })
            .on('end', () => {
                console.log(`\n${name}:`);
                console.log(`  Rows found: ${count}`);
                if (firstRow) {
                    console.log(`  First row keys: ${Object.keys(firstRow).join(', ')}`);
                    console.log(`  First row sample:`, firstRow);
                }
                resolve();
            })
            .on('error', (err) => {
                error = err;
                console.log(`\n${name}: ERROR - ${err.message}`);
                resolve();
            });
    });
}

// Teste verschiedene Konfigurationen
(async () => {
    await testParser('Config 1: UTF-8, semicolon, headers', {
        encoding: 'utf8',
        parserOptions: {
            separator: ';',
            headers: true
        }
    });

    await testParser('Config 2: Latin1, semicolon, headers', {
        encoding: 'latin1',
        parserOptions: {
            separator: ';',
            headers: true
        }
    });

    await testParser('Config 3: Latin1, semicolon, no headers', {
        encoding: 'latin1',
        parserOptions: {
            separator: ';',
            headers: false
        }
    });

    await testParser('Config 4: Latin1, auto-detect separator', {
        encoding: 'latin1',
        parserOptions: {
            headers: true
        }
    });

    console.log('\n✅ Test completed!');
})();