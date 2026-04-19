-- Idempotent migration: adds embedding_hash column + index on medicina_embeddings.
-- The hash lets regeneration skip rows whose source text has not changed.
-- Safe to re-run.

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 1. Column embedding_hash VARCHAR(64) NULL
-- ---------------------------------------------------------------------------
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME   = 'medicina_embeddings'
    AND COLUMN_NAME  = 'embedding_hash'
);

SET @sql := IF(@has_col = 0,
  'ALTER TABLE medicina_embeddings
     ADD COLUMN embedding_hash VARCHAR(64) NULL',
  'SELECT "embedding_hash column already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 2. Index idx_embedding_hash for fast cache lookups by hash
-- ---------------------------------------------------------------------------
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME   = 'medicina_embeddings'
    AND INDEX_NAME   = 'idx_embedding_hash'
);

SET @sql := IF(@has_idx = 0,
  'ALTER TABLE medicina_embeddings
     ADD INDEX idx_embedding_hash (embedding_hash)',
  'SELECT "idx_embedding_hash already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Reverse migration (uncomment to roll back):
--
-- ALTER TABLE medicina_embeddings
--   DROP INDEX idx_embedding_hash,
--   DROP COLUMN embedding_hash;
-- ---------------------------------------------------------------------------
