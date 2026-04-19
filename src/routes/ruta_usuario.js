const express = require('express')
const ruta = express.Router();
const usuarioService = require('../services/usuarioService');
const adminUsersService = require('../services/adminUsersService');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
    validateCreateUsuario,
    validateUpdateUsuario,
    validateIdUsuario,
    validateEmailParam,
} = require('../middleware/validation/usuario.validation');

ruta.get('/get/', async (req, res) => {
    try {
        const response = await usuarioService.getAllUsuarios();
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/get/:idusuario', validateIdUsuario, async (req, res) => {
    try {
        const response = await usuarioService.getUsuarioById(req.params.idusuario);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.get('/correo/:correo', validateEmailParam, async (req, res) => {
    try {
        const response = await usuarioService.getUsuarioByEmail(req.params.correo);
        if (response) {
            res.json(response);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.post('/post/', verifyToken, validateCreateUsuario, async (req, res) => {
    try {
        const response = await usuarioService.createUsuario(req.body);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

ruta.put('/put/:idusuario', verifyToken, validateUpdateUsuario, async (req, res) => {
    try {
        // Users can only update their own data (unless admin)
        const targetUser = await usuarioService.getUsuarioById(req.params.idusuario);
        if (targetUser && targetUser.uid !== req.user.uid && req.user.isAdmin !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes actualizar tu propio perfil',
            });
        }

        // Never allow updating isAdmin through the API
        const { isAdmin, ...safeData } = req.body;

        const response = await usuarioService.updateUsuario(req.params.idusuario, safeData);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
})

// DEPRECATED: use DELETE /api/pohapp/admin/users/:uid instead.
// Kept for backward compatibility; now transactional (MySQL + Firebase).
ruta.delete('/delete/:idusuario', verifyToken, requireAdmin, validateIdUsuario, async (req, res) => {
    try {
        console.warn('[DEPRECATED] DELETE /usuario/delete/:idusuario — usar DELETE /api/pohapp/admin/users/:uid');
        const dbUser = await usuarioService.getUsuarioById(req.params.idusuario);
        if (!dbUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (!dbUser.uid) {
            // Legacy rows without Firebase uid: fall back to MySQL-only delete.
            const response = await usuarioService.deleteUsuario(req.params.idusuario);
            return res.json({ ...{}, mysqlOnly: true, response });
        }
        const result = await adminUsersService.deleteUserTransactional(dbUser.uid);
        res.json(result);
    } catch (error) {
        console.error('legacy usuario.delete error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ error: error.message, code: error.code });
    }
})


module.exports = ruta;
