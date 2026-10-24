import crypto from 'crypto';
import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

import {
  CheckoutInput,
  AdminCreatePlanInput,
  AdminUpdateSubscriptionInput,
  AdminListPaymentsQuery,
} from '../schemas/billing.schema.js';

export class BillingService {
  /**
   * List available subscription plans.
   */
  async listPlans(includeInactive = false) {
    return prisma.plan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { priceEtb: 'asc' },
    });
  }

  /**
   * Admin: create a new subscription plan.
   */
  async createPlan(input: AdminCreatePlanInput) {
    const existing = await prisma.plan.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ApiError(HTTP_STATUS.CONFLICT, `Plan with name '${input.name}' already exists`);
    }

    return prisma.plan.create({
      data: {
        name: input.name,
        priceEtb: input.priceEtb,
        interval: input.interval,
        canExport: input.canExport,
        canAlert: input.canAlert,
        maxAlerts: input.maxAlerts,
        priorityReports: input.priorityReports,
        isActive: input.isActive,
      },
    });
  }

  /**
   * Directly activates subscription for the user with hardcoded instant confirmation.
   */
  async initializeCheckout(userId: string, input: CheckoutInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    const plan = await prisma.plan.findUnique({
      where: { id: input.planId },
    });

    if (!plan || !plan.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Selected plan is not available');
    }

    const now = new Date();
    const daysToAdd = plan.interval === 'YEARLY' ? 365 : 30;
    const currentPeriodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // Immediately activate subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
      },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
      },
      include: { plan: true },
    });

    const txRef = `SUB-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amountEtb: plan.priceEtb,
        status: 'SUCCESS',
        txRef,
        verifiedAt: now,
        rawWebhookJson: {
          provider: 'HARDCODED_INTERNAL',
          status: 'SUCCESS',
          activatedAt: now.toISOString(),
        },
      },
    });

    const returnUrl =
      input.returnUrl || input.successUrl || 'http://localhost:5173/billing/success';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const checkoutUrl = `${returnUrl}${separator}txRef=${txRef}`;

    return {
      paymentId: payment.id,
      txRef,
      checkoutUrl,
      subscription,
      plan: {
        id: plan.id,
        name: plan.name,
        priceEtb: plan.priceEtb,
        interval: plan.interval,
      },
    };
  }

  /**
   * Return verified subscription and payment details for txRef (hardcoded).
   */
  async verifyPayment(txRef: string) {
    const payment = await prisma.payment.findUnique({
      where: { txRef },
      include: {
        subscription: {
          include: {
            plan: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Payment not found for txRef: ${txRef}`);
    }

    return { payment, subscription: payment.subscription };
  }

  /**
   * Webhook stub for backwards compatibility.
   */
  async handleChapaWebhook(
    _signature: string | undefined,
    _rawBody: string | Buffer,
    _payload: any,
  ) {
    return { received: true, status: 'hardcoded' };
  }

  /**
   * Get user's current subscription and recent payment history.
   */
  async getUserSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return {
      subscription: subscription || null,
      recentPayments: subscription?.payments || [],
    };
  }

  /**
   * Admin: list all transactions with pagination and filtering.
   */
  async adminListPayments(query: AdminListPaymentsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.userId) {
      where.subscription = { userId: query.userId };
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: {
              user: {
                select: { id: true, email: true },
              },
              plan: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: manually update a subscription.
   */
  async adminUpdateSubscription(subscriptionId: string, input: AdminUpdateSubscriptionInput) {
    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!existing) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Subscription not found');
    }

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        planId: input.planId,
      },
      include: { plan: true, user: { select: { id: true, email: true } } },
    });
  }
}

export const billingService = new BillingService();
