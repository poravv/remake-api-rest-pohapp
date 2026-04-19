/**
 * Runs the AI-search migrations idempotently via Sequelize.
 * Executes each .sql statement-by-statement so prepared-statement blocks behave.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../database');

const MIGRATIONS = [
  'migration_chat_historial_indexes.sql',
  'migration_medicina_embeddings_hash.sql',
];

/** Split a .sql file into executable statements, stripping comments and blanks. */
function splitStatements(sql) {
  const noBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = noBlockComments
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'));
  return lines
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  const statements = splitStatements(raw);
  console.log(`\n▶ Running ${fileName} (${statements.length} statements)`);

  for (const stmt of statements) {
    try {
      await sequelize.query(stmt);
    } catch (err) {
      console.error(`  ✗ Failed statement: ${stmt.slice(0, 120)}...`);
      throw err;
    }
  }
  console.log(`  ✓ ${fileName} applied`);
}

async function main() {
  try {
    await sequelize.authenticate();
    for (const file of MIGRATIONS) {
      await runFile(file);
    }
    console.log('\n✅ AI-search migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
