import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    gridCell: {
      findMany: vi.fn(),
    },
    reportRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') {
        const tx = {
          reportRequestEvent: { create: vi.fn() },
          reportDeliverable: { create: vi.fn().mockResolvedValue({ id: 'del-1' }) },
          reportRequest: {
            update: vi.fn().mockResolvedValue({ id: 'req-1', status: 'IN_PROGRESS' }),
          },
        };
        return cb(tx);
      }
      return Promise.all(cb);
    }),
  },
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendRequestStatusChangeEmail: vi.fn().mockResolvedValue(true),
}));

import { prisma } from '../../src/config/db.js';
import {
  createReportRequest,
  listUserReportRequests,
  getUserReportRequest,
  adminListReportRequests,
  adminUpdateReportRequest,
  adminAttachDeliverable,
  getDemandMetrics,
} from '../../src/services/reportRequests.service.js';
import ApiError from '../../src/utils/ApiError.js';

const mockPrisma = prisma as any;

describe('reportRequests.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReportRequest', () => {
    it('creates request when cells exist', async () => {
      mockPrisma.gridCell.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
      mockPrisma.reportRequest.create.mockResolvedValue({
        id: 'req-1',
        title: 'Title',
        status: 'SUBMITTED',
      });

      const result = await createReportRequest('user-1', {
        title: 'Title',
        questionPrompt: 'Detailed Prompt Text',
        areaCellIds: ['c-1', 'c-2'],
        contactPreference: 'EMAIL',
      });

      expect(result.id).toBe('req-1');
      expect(mockPrisma.reportRequest.create).toHaveBeenCalled();
    });

    it('creates request and propagates phoneNumber and telegramHandle', async () => {
      mockPrisma.gridCell.findMany.mockResolvedValue([{ id: 'c-1' }]);
      mockPrisma.reportRequest.create.mockResolvedValue({
        id: 'req-2',
        title: 'Title 2',
        phoneNumber: '+251911223344',
        telegramHandle: '@tele_analyst',
        status: 'SUBMITTED',
      });

      const result = await createReportRequest('user-1', {
        title: 'Title 2',
        questionPrompt: 'Detailed Prompt Text',
        areaCellIds: ['c-1'],
        contactPreference: 'PHONE',
        phoneNumber: '+251911223344',
        telegramHandle: '@tele_analyst',
      });

      expect(result.id).toBe('req-2');
      expect(mockPrisma.reportRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phoneNumber: '+251911223344',
            telegramHandle: '@tele_analyst',
          }),
        }),
      );
    });

    it('throws 400 when one or more cells do not exist', async () => {
      mockPrisma.gridCell.findMany.mockResolvedValue([{ id: 'c-1' }]);

      await expect(
        createReportRequest('user-1', {
          title: 'Title',
          questionPrompt: 'Prompt text',
          areaCellIds: ['c-1', 'c-missing'],
          contactPreference: 'EMAIL',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('listUserReportRequests & getUserReportRequest', () => {
    it('returns requests for specified user', async () => {
      mockPrisma.reportRequest.findMany.mockResolvedValue([{ id: 'req-1' }]);
      const requests = await listUserReportRequests('user-1');
      expect(requests).toHaveLength(1);
    });

    it('throws 403 when non-admin accesses another user request', async () => {
      mockPrisma.reportRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        userId: 'user-2',
      });

      await expect(getUserReportRequest('user-1', 'req-1', 'USER')).rejects.toThrow(ApiError);
    });

    it('allows admin to view any user request', async () => {
      mockPrisma.reportRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        userId: 'user-2',
      });

      const result = await getUserReportRequest('admin-1', 'req-1', 'ADMIN');
      expect(result.id).toBe('req-1');
    });
  });

  describe('adminListReportRequests', () => {
    it('returns paginated items and total count', async () => {
      mockPrisma.reportRequest.findMany.mockResolvedValue([{ id: 'req-1' }]);
      mockPrisma.reportRequest.count.mockResolvedValue(1);

      const result = await adminListReportRequests({ page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('constructs OR search filter across title, prompt, user, and cell IDs', async () => {
      mockPrisma.reportRequest.findMany.mockResolvedValue([{ id: 'req-1', drafts: [] }]);
      mockPrisma.reportRequest.count.mockResolvedValue(1);

      await adminListReportRequests({ page: 1, limit: 10, search: 'Bole' });
      expect(mockPrisma.reportRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'Bole', mode: 'insensitive' } },
              { questionPrompt: { contains: 'Bole', mode: 'insensitive' } },
              { user: { email: { contains: 'Bole', mode: 'insensitive' } } },
              { user: { fullName: { contains: 'Bole', mode: 'insensitive' } } },
              { areaCellIds: { array_contains: 'Bole' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('adminUpdateReportRequest & adminAttachDeliverable', () => {
    it('updates request status and logs event in transaction', async () => {
      mockPrisma.reportRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        title: 'Title',
        status: 'SUBMITTED',
        user: { email: 'user@example.com' },
      });

      const result = await adminUpdateReportRequest('admin-1', 'req-1', {
        status: 'IN_PROGRESS',
        statusChangeNote: 'Started analysis',
      });

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('attaches deliverable and transitions to DELIVERED', async () => {
      mockPrisma.reportRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        title: 'Title',
        status: 'IN_PROGRESS',
        user: { email: 'user@example.com' },
      });

      const result = await adminAttachDeliverable('admin-1', 'req-1', {
        fileUrl: 'https://example.com/file.pdf',
        fileName: 'report.pdf',
        fileSizeBytes: 1024,
        mimeType: 'application/pdf',
      });

      expect(result.id).toBe('del-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getDemandMetrics', () => {
    it('computes demand metrics and evaluates gate thresholds correctly', async () => {
      mockPrisma.reportRequest.count.mockResolvedValue(12);
      mockPrisma.reportRequest.groupBy
        .mockResolvedValueOnce([
          { userId: 'u-1', _count: { id: 3 } },
          { userId: 'u-2', _count: { id: 2 } },
          { userId: 'u-3', _count: { id: 2 } },
          { userId: 'u-4', _count: { id: 3 } },
          { userId: 'u-5', _count: { id: 2 } },
        ])
        .mockResolvedValueOnce([
          { status: 'SUBMITTED', _count: { id: 8 } },
          { status: 'DELIVERED', _count: { id: 4 } },
        ]);

      const metrics = await getDemandMetrics();
      expect(metrics.totalRequests).toBe(12);
      expect(metrics.distinctUsersCount).toBe(5);
      expect(metrics.distinctUsers).toBe(5);
      expect(metrics.targetRequests).toBe(10);
      expect(metrics.targetUsers).toBe(5);
      expect(metrics.gateStatus).toBe('PASSED');
      expect(metrics.isGateMet).toBe(true);
      expect(metrics.statusBreakdown.SUBMITTED).toBe(8);
      expect(metrics.statusBreakdown.DELIVERED).toBe(4);
    });
  });
});
