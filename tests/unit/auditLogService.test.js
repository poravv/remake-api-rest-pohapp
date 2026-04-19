const mockQuery = jest.fn();

jest.mock('../../src/database', () => ({
    query: (...args) => mockQuery(...args),
}));

const auditLogService = require('../../src/services/auditLogService');

describe('auditLogService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore && console.error.mockRestore();
    });

    describe('log', () => {
        it('should insert a sanitized audit row and return its id', async () => {
            mockQuery.mockResolvedValue([42, 1]);

            const result = await auditLogService.log({
                actorUid: 'admin-uid',
                actorEmail: 'admin@test.com',
                action: 'user.disable',
                targetType: 'user',
                targetId: 'target-uid',
                payload: {
                    reason: 'spam',
                    password: 'should-be-stripped',
                    token: 'secret',
                    nested: { apiKey: 'x', keep: 1 },
                },
                status: 'ok',
                ip: '10.0.0.1',
                userAgent: 'jest-agent',
            });

            expect(result).toEqual({ id: 42 });
            expect(mockQuery).toHaveBeenCalledTimes(1);

            const [sql, opts] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/INSERT INTO audit_log/);
            expect(opts.replacements).toEqual([
                'admin-uid',
                'admin@test.com',
                'user.disable',
                'user',
                'target-uid',
                expect.any(String),
                'ok',
                '10.0.0.1',
                'jest-agent',
            ]);

            const persistedPayload = JSON.parse(opts.replacements[5]);
            expect(persistedPayload).toEqual({
                reason: 'spam',
                nested: { keep: 1 },
            });
            expect(persistedPayload).not.toHaveProperty('password');
            expect(persistedPayload).not.toHaveProperty('token');
            expect(persistedPayload.nested).not.toHaveProperty('apiKey');
        });

        it('should default status to "ok" when omitted', async () => {
            mockQuery.mockResolvedValue([1, 1]);

            await auditLogService.log({
                actorUid: 'u',
                action: 'user.list',
            });

            const [, opts] = mockQuery.mock.calls[0];
            expect(opts.replacements[6]).toBe('ok');
        });

        it('should coerce numeric targetId to string', async () => {
            mockQuery.mockResolvedValue([1, 1]);

            await auditLogService.log({
                actorUid: 'u',
                action: 'planta.update',
                targetType: 'planta',
                targetId: 123,
            });

            const [, opts] = mockQuery.mock.calls[0];
            expect(opts.replacements[4]).toBe('123');
        });

        it('should truncate user-agent longer than 255 chars', async () => {
            mockQuery.mockResolvedValue([1, 1]);
            const longUa = 'x'.repeat(300);

            await auditLogService.log({
                actorUid: 'u',
                action: 'user.list',
                userAgent: longUa,
            });

            const [, opts] = mockQuery.mock.calls[0];
            expect(opts.replacements[8].length).toBe(255);
        });

        it('should skip insert when actorUid or action is missing', async () => {
            const noUid = await auditLogService.log({ action: 'x' });
            const noAction = await auditLogService.log({ actorUid: 'u' });

            expect(noUid).toBeNull();
            expect(noAction).toBeNull();
            expect(mockQuery).not.toHaveBeenCalled();
        });

        it('should swallow DB errors and return null', async () => {
            mockQuery.mockRejectedValue(new Error('mysql down'));

            const result = await auditLogService.log({
                actorUid: 'u',
                action: 'user.list',
            });

            expect(result).toBeNull();
        });
    });

    describe('sanitizePayload', () => {
        it('removes sensitive top-level and nested keys', () => {
            const clean = auditLogService.sanitizePayload({
                password: 'p',
                Authorization: 'Bearer x',
                user: { token: 't', name: 'ana' },
                list: [{ secret: 's', ok: 1 }],
            });

            expect(clean).toEqual({
                user: { name: 'ana' },
                list: [{ ok: 1 }],
            });
        });
    });
});
