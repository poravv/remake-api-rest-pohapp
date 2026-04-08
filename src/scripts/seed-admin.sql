-- Set andyvercha@gmail.com as admin
-- Run: mysql -u root -p db-pohapp < src/scripts/seed-admin.sql

UPDATE usuario SET isAdmin = 1 WHERE correo = 'andyvercha@gmail.com';

-- Verify
SELECT idusuario, correo, nombre, isAdmin FROM usuario WHERE correo = 'andyvercha@gmail.com';
