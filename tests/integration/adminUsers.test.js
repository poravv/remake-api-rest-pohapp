/**
 * Integration tests for /api/pohapp/admin/users/*.
 *
 * Strategy: mock `middleware/auth` to inject a synthetic admin req.user
 * (so we don't need real Firebase tokens), mock adminUsersService /
 * firebaseAdminService at the service boundary, and hit the router via
 * supertest through a minimal Express app.
 */

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => ({
    verifyToken: (req, _res, next) => {
        req.user = { uid: 'admin-uid', email: 'admin@test.com', isAdmin: 1 };
        next();
    },
    requireAdmin: (_req, _res, next) => next(),
    optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../../src/services/auditLogService', () => ({
    log: jest.fn().mockResolvedValue({ id: 1 }),
    sanitizePayload: (v) => v,
    SENSITIVE_KEYS: new Set(),
}));

const mockFirebaseAdminService = {
    listUsers: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    generatePasswordResetLink: jest.fn(),
    setCustomUserClaims: jest.fn(),
};
jest.mock('../../src/services/firebaseAdminService', () => mockFirebaseAdminService);

const mockAdminUsersService = {
    listUsers: jest.fn(),
    getUserDetail: jest.fn(),
    deleteUserTransactional: jest.fn(),
};
jest.mock('../../src/services/adminUsersService', () => mockAdminUsersService);

const usersRouter = require('../../src/routes/admin/users');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/pohapp/admin/users', usersRouter);
    return app;
}

describe('admin/users router', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
        // Reset the in-memory reset-password rate-limit bucket between tests.
        if (usersRouter._resetBuckets && usersRouter._resetBuckets.clear) {
            usersRouter._resetBuckets.clear();
        }
    });

    it('GET / returns paginated users', async () => {
        mockAdminUsersService.listUsers.mockResolvedValue({
            users: [{ uid: 'u1', email: 'a@a.com' }],
            next_cursor: 'abc',
        });
        const res = await request(app).get('/api/pohapp/admin/users?limit=10&q=ana');
        expect(res.status).toBe(200);
        expect(res.body.users).toHaveLength(1);
        expect(res.body.next_cursor).toBe('abc');
    });

    it('GET /:uid returns merged detail', async () => {
        mockAdminUsersService.getUserDetail.mockResolvedValue({
            firebase: { uid: 'u1' },
            db: { idusuario: 42 },
            claims: { admin: false },
        });
        const res = await request(app).get('/api/pohapp/admin/users/u1');
        expect(res.status).toBe(200);
        expect(res.body.firebase.uid).toBe('u1');
    });

    it('GET /:uid returns 404 when Firebase user not found', async () => {
        mockAdminUsersService.getUserDetail.mockRejectedValue({ code: 'auth/user-not-found' });
        const res = await request(app).get('/api/pohapp/admin/users/missing');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('POST /:uid/disable returns 409 on self-disable', async () => {
        const res = await request(app).post('/api/pohapp/admin/users/admin-uid/disable');
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('SELF_ACTION_FORBIDDEN');
    });

    it('POST /:uid/disable flips disabled true', async () => {
        mockFirebaseAdminService.updateUser.mockResolvedValue({ uid: 'u1', disabled: true });
        const res = await request(app).post('/api/pohapp/admin/users/u1/disable');
        expect(res.status).toBe(200);
        expect(mockFirebaseAdminService.updateUser).toHaveBeenCalledWith('u1', { disabled: true });
    });

    it('POST /:uid/enable flips disabled false', async () => {
        mockFirebaseAdminService.updateUser.mockResolvedValue({ uid: 'u1', disabled: false });
        const res = await request(app).post('/api/pohapp/admin/users/u1/enable');
        expect(res.status).toBe(200);
        expect(mockFirebaseAdminService.updateUser).toHaveBeenCalledWith('u1', { disabled: false });
    });

    it('POST /:uid/verify-email flips emailVerified true', async () => {
        mockFirebaseAdminService.updateUser.mockResolvedValue({ uid: 'u1', emailVerified: true });
        const res = await request(app).post('/api/pohapp/admin/users/u1/verify-email');
        expect(res.status).toBe(200);
        expect(res.body.emailVerified).toBe(true);
    });

    it('POST /:uid/reset-password returns link first 3 times, then 429', async () => {
        mockFirebaseAdminService.getUser.mockResolvedValue({ uid: 'u1', email: 'u@u.com' });
        mockFirebaseAdminService.generatePasswordResetLink.mockResolvedValue('https://reset');
        for (let i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const ok = await request(app).post('/api/pohapp/admin/users/u1/reset-password');
            expect(ok.status).toBe(200);
        }
        const fourth = await request(app).post('/api/pohapp/admin/users/u1/reset-password');
        expect(fourth.status).toBe(429);
        expect(fourth.body.error.code).toBe('TARGET_RATE_LIMIT');
    });

    it('DELETE /:uid returns transactional result', async () => {
        mockAdminUsersService.deleteUserTransactional.mockResolvedValue({ uid: 'u1', deleted: true, deletedAt: 'now' });
        const res = await request(app).delete('/api/pohapp/admin/users/u1');
        expect(res.status).toBe(200);
        expect(res.body.deleted).toBe(true);
    });

    it('DELETE /:uid returns 409 on self-delete', async () => {
        const res = await request(app).delete('/api/pohapp/admin/users/admin-uid');
        expect(res.status).toBe(409);
    });
});
