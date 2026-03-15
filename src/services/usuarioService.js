const usuario = require('../model/usuario');

async function getAllUsuarios() {
    return usuario.findAll();
}

async function getUsuarioById(idusuario) {
    return usuario.findByPk(idusuario);
}

async function getUsuarioByEmail(correo) {
    return usuario.findOne({ where: { correo } });
}

async function createUsuario(data) {
    return usuario.create(data);
}

async function updateUsuario(idusuario, data) {
    return usuario.update(data, { where: { idusuario } });
}

async function deleteUsuario(idusuario) {
    return usuario.destroy({ where: { idusuario } });
}

module.exports = {
    getAllUsuarios,
    getUsuarioById,
    getUsuarioByEmail,
    createUsuario,
    updateUsuario,
    deleteUsuario,
};
