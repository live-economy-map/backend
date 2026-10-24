import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireEntitlement } from '../../src/middlewares/entitlement.middleware.js';
import { prisma } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/index.js';

vi.mock('../../src/config/db.js');

describe('requireEntitlement middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const middleware = requireEntitlement('canExport');
    const req: any = {};
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      }),
    );
  });

  it('allows ADMIN users to bypass subscription entitlement checks', async () => {
    const middleware = requireEntitlement('canExport');
    const req: any = {
      user: { id: 'admin-id', role: 'ADMIN' },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows users with active subscription possessing the required entitlement', async () => {
    const middleware = requireEntitlement('canAlert');
    const futureDate = new Date(Date.now() + 86400000 * 10);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-pro',
      status: 'ACTIVE',
      currentPeriodEnd: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: 'plan-pro',
        name: 'Pro',
        code: 'pro',
        priceBirr: 1000,
        interval: 'MONTHLY',
        canExport: true,
        canAlert: true,
        maxAlerts: 10,
        priorityReports: true,
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any);

    const req: any = {
      user: { id: 'user-1', role: 'USER' },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects users without active subscription with 403', async () => {
    const middleware = requireEntitlement('canExport');

    vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce(null);

    const req: any = {
      user: { id: 'user-1', role: 'USER' },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.FORBIDDEN,
      }),
    );
  });

  it('rejects users whose active plan lacks the specific entitlement with 403', async () => {
    const middleware = requireEntitlement('canExport');
    const futureDate = new Date(Date.now() + 86400000 * 10);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-starter',
      status: 'ACTIVE',
      currentPeriodEnd: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: 'plan-starter',
        name: 'Starter',
        code: 'starter',
        priceBirr: 200,
        interval: 'MONTHLY',
        canExport: false,
        canAlert: true,
        maxAlerts: 2,
        priorityReports: false,
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any);

    const req: any = {
      user: { id: 'user-1', role: 'USER' },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.FORBIDDEN,
      }),
    );
  });
});
