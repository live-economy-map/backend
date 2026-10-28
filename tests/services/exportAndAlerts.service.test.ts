import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportService } from '../../src/services/export.service.js';
import { alertsService } from '../../src/services/alerts.service.js';
import { prisma } from '../../src/config/db.js';
import * as emailService from '../../src/services/email.service.js';

vi.mock('../../src/config/db.js');
vi.mock('../../src/services/email.service.js', () => ({
  sendAnomalyAlertEmail: vi.fn(),
}));

describe('exportAndAlerts.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportService.exportData', () => {
    it('exports data in CSV format and logs to exportLog', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
        id: 'sub-1',
      } as any);

      const mockSnapshots = [
        {
          gridCellId: 'cell-1',
          period: new Date('2026-06-01T00:00:00Z'),
          compositeScore: 78.5,
          isComplete: true,
          gridCell: {
            cellRow: 10,
            cellCol: 20,
            areaLabel: 'Bole Area',
          },
        },
      ];

      vi.mocked(prisma.compositeScoreSnapshot.findMany).mockResolvedValueOnce(mockSnapshots as any);
      vi.mocked(prisma.exportLog.create).mockResolvedValueOnce({ id: 'log-1' } as any);

      const result = await exportService.exportData('u-1', {
        format: 'CSV',
      });

      expect(result.format).toBe('CSV');
      expect(result.contentType).toBe('text/csv');
      expect(result.data).toContain(
        'cell_id,cell_row,cell_col,area_label,period,composite_score,is_complete',
      );
      expect(result.data).toContain('cell-1,10,20,"Bole Area",2026-06-01,78.5,true');
      expect(prisma.exportLog.create).toHaveBeenCalledWith({
        data: {
          subscriptionId: 'sub-1',
          format: 'CSV',
          cellCount: 1,
        },
      });
    });

    it('exports data in JSON format', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
        id: 'sub-1',
      } as any);

      const mockSnapshots = [
        {
          gridCellId: 'cell-2',
          period: new Date('2026-06-01T00:00:00Z'),
          compositeScore: 65.0,
          isComplete: true,
          gridCell: {
            cellRow: 12,
            cellCol: 22,
            areaLabel: null,
          },
        },
      ];

      vi.mocked(prisma.compositeScoreSnapshot.findMany).mockResolvedValueOnce(mockSnapshots as any);
      vi.mocked(prisma.exportLog.create).mockResolvedValueOnce({ id: 'log-2' } as any);

      const result = await exportService.exportData('u-1', {
        format: 'JSON',
      });

      expect(result.format).toBe('JSON');
      expect(result.contentType).toBe('application/json');
      expect(result.data).toHaveLength(1);
      expect((result.data as any)[0].cellId).toBe('cell-2');
    });
  });

  describe('alertsService', () => {
    describe('createAlertRule', () => {
      it('throws 404 if grid cell is not found', async () => {
        vi.mocked(prisma.gridCell.findUnique).mockResolvedValueOnce(null);

        await expect(
          alertsService.createAlertRule('u-1', {
            gridCellId: 'non-existent',
            thresholdDelta: 0.15,
          }),
        ).rejects.toThrow('Grid cell not found');
      });

      it('enforces plan maxAlerts limit for non-admin users', async () => {
        vi.mocked(prisma.gridCell.findUnique).mockResolvedValueOnce({ id: 'cell-1' } as any);
        vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
          plan: { maxAlerts: 1 },
        } as any);
        vi.mocked(prisma.alertRule.count).mockResolvedValueOnce(1);
        vi.mocked(prisma.alertRule.findUnique).mockResolvedValueOnce(null);

        await expect(
          alertsService.createAlertRule(
            'u-1',
            { gridCellId: 'cell-1', thresholdDelta: 0.1 },
            'USER',
          ),
        ).rejects.toThrow('Alert rule limit reached');
      });

      it('upserts alert rule successfully when within limits', async () => {
        vi.mocked(prisma.gridCell.findUnique).mockResolvedValueOnce({ id: 'cell-1' } as any);
        vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
          plan: { maxAlerts: 5 },
        } as any);
        vi.mocked(prisma.alertRule.count).mockResolvedValueOnce(0);
        vi.mocked(prisma.alertRule.findUnique).mockResolvedValueOnce(null);
        vi.mocked(prisma.alertRule.upsert).mockResolvedValueOnce({
          id: 'rule-1',
          gridCellId: 'cell-1',
          thresholdDelta: 0.15,
        } as any);

        const res = await alertsService.createAlertRule(
          'u-1',
          { gridCellId: 'cell-1', thresholdDelta: 0.15 },
          'USER',
        );

        expect(res.id).toBe('rule-1');
        expect(prisma.alertRule.upsert).toHaveBeenCalled();
      });
    });

    describe('evaluateAlertsForPeriod', () => {
      it('triggers notification and email when threshold is crossed', async () => {
        const mockRules = [
          {
            id: 'rule-1',
            userId: 'u-1',
            gridCellId: 'cell-1',
            thresholdDelta: 0.1,
            gridCell: { areaLabel: 'Mercato Area', cellRow: 5, cellCol: 6 },
            user: { email: 'trader@example.com' },
          },
        ];

        vi.mocked(prisma.alertRule.findMany).mockResolvedValueOnce(mockRules as any);
        vi.mocked(prisma.compositeScoreSnapshot.findFirst)
          .mockResolvedValueOnce({ compositeScore: 0.85 } as any) // newPeriod
          .mockResolvedValueOnce({ compositeScore: 0.7 } as any); // prevPeriod (delta = +0.15 >= 0.1)

        vi.mocked(prisma.notification.create).mockResolvedValueOnce({ id: 'notif-1' } as any);
        vi.mocked(prisma.alertRule.update).mockResolvedValueOnce({} as any);

        const result = await alertsService.evaluateAlertsForPeriod('2026-07-01', '2026-06-01');

        expect(result.triggeredCount).toBe(1);
        expect(prisma.notification.create).toHaveBeenCalled();
        expect(emailService.sendAnomalyAlertEmail).toHaveBeenCalledWith(
          'trader@example.com',
          'Mercato Area',
          expect.closeTo(0.15, 2),
          '2026-07-01',
        );
      });
    });

    describe('markNotificationRead', () => {
      it('marks notification as read', async () => {
        vi.mocked(prisma.notification.findUnique).mockResolvedValueOnce({
          id: 'n-1',
          userId: 'u-1',
          isRead: false,
        } as any);
        vi.mocked(prisma.notification.update).mockResolvedValueOnce({
          id: 'n-1',
          isRead: true,
        } as any);

        const res = await alertsService.markNotificationRead('u-1', 'n-1');
        expect(res.isRead).toBe(true);
      });
    });
  });
});
