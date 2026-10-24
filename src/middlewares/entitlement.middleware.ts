import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { prisma } from '../config/db.js';

export type EntitlementKey = 'canExport' | 'canAlert' | 'priorityReports';

export const requireEntitlement = (entitlement: EntitlementKey) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Authentication required'));
      }

      // Admins have access to all entitlements
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
        include: { plan: true },
      });

      const now = new Date();
      const isActive =
        subscription &&
        subscription.status === 'ACTIVE' &&
        (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > now);

      if (!isActive || !subscription?.plan || !subscription.plan[entitlement]) {
        return next(
          new ApiError(
            HTTP_STATUS.FORBIDDEN,
            `Active subscription required with '${entitlement}' entitlement`,
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
