-- Idempotent migration: adds FULLTEXT + composite index on chat_historial.
-- Safe to re-run: each ALTER is gated by INFORMATION_SCHEMA lookups.
-- Indexes:
--   ft_chat_historial_q_r   FULLTEXT(pregunta, respuesta) WITH PARSER ngram
--   idx_chat_user_fecha     (idusuario, fecha DESC, id DESC) for cursor pagination
-- Reverse block at the bottom (commented) drops both indexes.

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 1. FULLTEXT index on (pregunta, respuesta) with ngram parser (ES/GN short tokens)
-- ---------------------------------------------------------------------------
SET @has_ft := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME   = 'chat_historial'
    AND INDEX_NAME   = 'ft_chat_historial_q_r'
);

SET @sql := IF(@has_ft = 0,
  'ALTER TABLE chat_historial
     ADD FULLTEXT INDEX ft_chat_historial_q_r (pregunta, respuesta) WITH PARSER ngram,
     ALGORITHM=INPLACE, LOCK=NONE',
  'SELECT "ft_chat_historial_q_r already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 2. Composite index (idusuario, fecha DESC, id DESC) for cursor pagination
-- ---------------------------------------------------------------------------
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME   = 'chat_historial'
    AND INDEX_NAME   = 'idx_chat_user_fecha'
);

SET @sql := IF(@has_idx = 0,
  'ALTER TABLE chat_historial
     ADD INDEX idx_chat_user_fecha (idusuario, fecha DESC, id DESC),
     ALGORITHM=INPLACE, LOCK=NONE',
  'SELECT "idx_chat_user_fecha already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Reverse migration (uncomment to roll back):
--
-- ALTER TABLE chat_historial
--   DROP INDEX ft_chat_historial_q_r,
--   DROP INDEX idx_chat_user_fecha;
-- ---------------------------------------------------------------------------
