/**
 * Idempotent migration that ensures the append-only `audit_log` table exists.
 * Run manually before starting the server in environments where the admin
 * platform is enabled. Safe to run repeatedly (uses CREATE TABLE IF NOT EXISTS).
 */

require('dotenv').config();
const sequelize = require('../database');

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_uid VARCHAR(128) NOT NULL,
  actor_email VARCHAR(255),
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32),
  target_id VARCHAR(128),
  payload JSON,
  status VARCHAR(16) NOT NULL DEFAULT 'ok',
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor (actor_uid, created_at),
  INDEX idx_action (action, created_at),
  INDEX idx_target (target_type, target_id)
);
`;

// Separate index so pre-existing audit_log tables created without it still
// get it applied when migrate runs again. MySQL's CREATE INDEX lacks IF NOT
// EXISTS, so probe INFORMATION_SCHEMA first.
const INDEX_NAME = 'idx_audit_created';

async function ensureCreatedAtIndex() {
    const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS n
           FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'audit_log'
            AND index_name = :indexName`,
        { replacements: { indexName: INDEX_NAME } }
    );
    const exists = rows && rows[0] && Number(rows[0].n) > 0;
    if (exists) return false;
    await sequelize.query(
        `CREATE INDEX ${INDEX_NAME} ON audit_log (created_at DESC, id DESC)`
    );
    return true;
}

async function migrate() {
    await sequelize.authenticate();
    await sequelize.query(CREATE_TABLE_SQL);
    const created = await ensureCreatedAtIndex();
    console.log(
        created
            ? `audit_log table ensured + ${INDEX_NAME} created.`
            : 'audit_log table ensured.'
    );
}

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('audit_log migration failed:', err.message);
            process.exit(1);
        });
}

module.exports = { migrate, CREATE_TABLE_SQL, ensureCreatedAtIndex, INDEX_NAME };
