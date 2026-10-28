import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { ExportDataQuery } from '../schemas/exportAndAlerts.schema.js';

export class ExportService {
  /**
   * Export historical cell composite scores in CSV or JSON format.
   */
  async exportData(userId: string, query: ExportDataQuery) {
    // Retrieve subscription for tracking
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      // Find any default plan or create a free subscription for logging
      const defaultPlan = await prisma.plan.findFirst();
      if (defaultPlan) {
        subscription = await prisma.subscription.create({
          data: {
            userId,
            planId: defaultPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        });
      }
    }

    const where: any = {};

    if (query.cellIds) {
      const ids = query.cellIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        where.gridCellId = { in: ids };
      }
    }

    if (query.periodStart || query.periodEnd) {
      where.period = {};
      if (query.periodStart) {
        where.period.gte = new Date(query.periodStart);
      }
      if (query.periodEnd) {
        where.period.lte = new Date(query.periodEnd);
      }
    }

    const snapshots = await prisma.compositeScoreSnapshot.findMany({
      where,
      include: {
        gridCell: true,
      },
      orderBy: [{ period: 'desc' }, { gridCellId: 'asc' }],
      take: 2000,
    });

    // Record export log if subscription exists
    if (subscription) {
      await prisma.exportLog.create({
        data: {
          subscriptionId: subscription.id,
          format: query.format,
          cellCount: snapshots.length,
        },
      });
    }

    if (query.format === 'JSON') {
      const data = snapshots.map((s) => ({
        cellId: s.gridCellId,
        cellRow: s.gridCell.cellRow,
        cellCol: s.gridCell.cellCol,
        areaLabel: s.gridCell.areaLabel,
        period: s.period.toISOString().split('T')[0],
        compositeScore: s.compositeScore,
        isComplete: s.isComplete,
      }));

      return {
        format: 'JSON' as const,
        contentType: 'application/json',
        filename: `export-lem-${Date.now()}.json`,
        data,
      };
    }

    // Format as CSV
    const headers = [
      'cell_id',
      'cell_row',
      'cell_col',
      'area_label',
      'period',
      'composite_score',
      'is_complete',
    ];

    const rows = snapshots.map((s) => [
      s.gridCellId,
      s.gridCell.cellRow,
      s.gridCell.cellCol,
      `"${(s.gridCell.areaLabel || '').replace(/"/g, '""')}"`,
      s.period.toISOString().split('T')[0],
      s.compositeScore,
      s.isComplete,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      format: 'CSV' as const,
      contentType: 'text/csv',
      filename: `export-lem-${Date.now()}.csv`,
      data: csvContent,
    };
  }
}

export const exportService = new ExportService();
