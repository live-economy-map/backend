import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as emailService from './email.service.js';
import {
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
  ListNotificationsQuery,
} from '../schemas/exportAndAlerts.schema.js';

export class AlertsService {
  /**
   * Create or update a spatial anomaly alert rule for a grid cell.
   */
  async createAlertRule(userId: string, input: CreateAlertRuleInput, userRole: string = 'USER') {
    const cell = await prisma.gridCell.findUnique({
      where: { id: input.gridCellId },
    });

    if (!cell) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
    }

    // Check alert count limit from plan if not ADMIN
    if (userRole !== 'ADMIN') {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      const maxAllowed = subscription?.plan?.maxAlerts || 0;
      const currentActiveCount = await prisma.alertRule.count({
        where: { userId, isActive: true },
      });

      // If already has rule for this cell, it's an update, otherwise check limit
      const existing = await prisma.alertRule.findUnique({
        where: {
          userId_gridCellId: {
            userId,
            gridCellId: input.gridCellId,
          },
        },
      });

      if (!existing && currentActiveCount >= maxAllowed) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          `Alert rule limit reached: your plan allows up to ${maxAllowed} active alerts`,
        );
      }
    }

    return prisma.alertRule.upsert({
      where: {
        userId_gridCellId: {
          userId,
          gridCellId: input.gridCellId,
        },
      },
      create: {
        userId,
        gridCellId: input.gridCellId,
        thresholdDelta: input.thresholdDelta,
        isActive: true,
      },
      update: {
        thresholdDelta: input.thresholdDelta,
        isActive: true,
      },
      include: {
        gridCell: true,
      },
    });
  }

  /**
   * List all alert rules configured by the user.
   */
  async listAlertRules(userId: string) {
    return prisma.alertRule.findMany({
      where: { userId },
      include: {
        gridCell: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an existing alert rule.
   */
  async updateAlertRule(userId: string, alertId: string, input: UpdateAlertRuleInput) {
    const existing = await prisma.alertRule.findUnique({
      where: { id: alertId },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Alert rule not found');
    }

    return prisma.alertRule.update({
      where: { id: alertId },
      data: {
        thresholdDelta: input.thresholdDelta,
        isActive: input.isActive,
      },
      include: {
        gridCell: true,
      },
    });
  }

  /**
   * Delete an alert rule.
   */
  async deleteAlertRule(userId: string, alertId: string) {
    const existing = await prisma.alertRule.findUnique({
      where: { id: alertId },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Alert rule not found');
    }

    await prisma.alertRule.delete({
      where: { id: alertId },
    });

    return { deleted: true };
  }

  /**
   * Evaluate active alert rules against a newly computed period vs prior period.
   */
  async evaluateAlertsForPeriod(newPeriod: string, previousPeriod: string) {
    const activeRules = await prisma.alertRule.findMany({
      where: { isActive: true },
      include: {
        gridCell: true,
        user: { select: { id: true, email: true } },
      },
    });

    const triggeredAlerts = [];

    for (const rule of activeRules) {
      const [currentSnapshot, prevSnapshot] = await Promise.all([
        prisma.compositeScoreSnapshot.findFirst({
          where: {
            gridCellId: rule.gridCellId,
            period: new Date(newPeriod),
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.compositeScoreSnapshot.findFirst({
          where: {
            gridCellId: rule.gridCellId,
            period: new Date(previousPeriod),
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (currentSnapshot && prevSnapshot) {
        const delta = currentSnapshot.compositeScore - prevSnapshot.compositeScore;
        if (Math.abs(delta) >= rule.thresholdDelta) {
          const areaLabel =
            rule.gridCell.areaLabel || `Cell (${rule.gridCell.cellRow}, ${rule.gridCell.cellCol})`;
          const percentage = (Math.abs(delta) * 100).toFixed(1);
          const direction = delta > 0 ? 'increase' : 'decrease';

          // 1. Create in-app notification
          await prisma.notification.create({
            data: {
              userId: rule.userId,
              title: `Economic Alert: ${areaLabel}`,
              message: `Activity shifted by ${percentage}% (${direction}) between ${previousPeriod} and ${newPeriod}.`,
            },
          });

          // 2. Update last triggered timestamp
          await prisma.alertRule.update({
            where: { id: rule.id },
            data: { lastTriggeredAt: new Date() },
          });

          // 3. Send transactional email
          await emailService.sendAnomalyAlertEmail(rule.user.email, areaLabel, delta, newPeriod);

          triggeredAlerts.push({
            ruleId: rule.id,
            userId: rule.userId,
            delta,
          });
        }
      }
    }

    return {
      evaluatedCount: activeRules.length,
      triggeredCount: triggeredAlerts.length,
      alerts: triggeredAlerts,
    };
  }

  /**
   * List in-app notifications for the user.
   */
  async listUserNotifications(userId: string, query: ListNotificationsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}

export const alertsService = new AlertsService();
