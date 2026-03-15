const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../src/model/usuario', () => ({
  findAll: mockFindAll,
  findByPk: mockFindByPk,
  findOne: mockFindOne,
  create: mockCreate,
  update: mockUpdate,
  destroy: mockDestroy,
}));

const usuarioService = require('../../src/services/usuarioService');

describe('usuarioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsuarios', () => {
    it('should return all usuarios', async () => {
      const data = [{ idusuario: 'u1', nombre: 'Juan' }];
      mockFindAll.mockResolvedValue(data);

      const result = await usuarioService.getAllUsuarios();
      expect(result).toEqual(data);
      expect(mockFindAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUsuarioById', () => {
    it('should return usuario by id', async () => {
      const user = { idusuario: 'u1', nombre: 'Juan', correo: 'juan@test.com' };
      mockFindByPk.mockResolvedValue(user);

      const result = await usuarioService.getUsuarioById('u1');
      expect(result).toEqual(user);
      expect(mockFindByPk).toHaveBeenCalledWith('u1');
    });

    it('should return null for non-existent id', async () => {
      mockFindByPk.mockResolvedValue(null);
      const result = await usuarioService.getUsuarioById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getUsuarioByEmail', () => {
    it('should return usuario by email', async () => {
      const user = { idusuario: 'u1', correo: 'juan@test.com' };
      mockFindOne.mockResolvedValue(user);

      const result = await usuarioService.getUsuarioByEmail('juan@test.com');
      expect(result).toEqual(user);
      expect(mockFindOne).toHaveBeenCalledWith({ where: { correo: 'juan@test.com' } });
    });

    it('should return null for non-existent email', async () => {
      mockFindOne.mockResolvedValue(null);
      const result = await usuarioService.getUsuarioByEmail('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('createUsuario', () => {
    it('should create a new usuario', async () => {
      const newUser = { idusuario: 'u2', nombre: 'Maria', correo: 'maria@test.com' };
      mockCreate.mockResolvedValue(newUser);

      const result = await usuarioService.createUsuario(newUser);
      expect(result).toEqual(newUser);
      expect(mockCreate).toHaveBeenCalledWith(newUser);
    });
  });

  describe('updateUsuario', () => {
    it('should update usuario', async () => {
      mockUpdate.mockResolvedValue([1]);

      const result = await usuarioService.updateUsuario('u1', { nombre: 'Juan Updated' });
      expect(mockUpdate).toHaveBeenCalledWith(
        { nombre: 'Juan Updated' },
        { where: { idusuario: 'u1' } }
      );
      expect(result).toEqual([1]);
    });

    it('should return [0] if user not found', async () => {
      mockUpdate.mockResolvedValue([0]);
      const result = await usuarioService.updateUsuario('missing', { nombre: 'X' });
      expect(result).toEqual([0]);
    });
  });

  describe('deleteUsuario', () => {
    it('should delete usuario', async () => {
      mockDestroy.mockResolvedValue(1);

      const result = await usuarioService.deleteUsuario('u1');
      expect(mockDestroy).toHaveBeenCalledWith({ where: { idusuario: 'u1' } });
      expect(result).toBe(1);
    });

    it('should return 0 if user not found', async () => {
      mockDestroy.mockResolvedValue(0);
      const result = await usuarioService.deleteUsuario('missing');
      expect(result).toBe(0);
    });
  });
});
