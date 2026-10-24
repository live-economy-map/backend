import crypto from 'crypto';
import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { chapaClient } from './chapa.client.js';
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
   * Initialize a checkout session via Chapa.
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

    // Upsert subscription shell for user
    const now = new Date();
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'INCOMPLETE',
        currentPeriodStart: now,
        currentPeriodEnd: now,
      },
      update: {
        planId: plan.id,
      },
    });

    const txRef = `LEM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amountEtb: plan.priceEtb,
        status: 'PENDING',
        txRef,
      },
    });

    // Convert ETB cents to ETB currency units for Chapa display
    const amountInBirr = Number((plan.priceEtb / 100).toFixed(2));

    const initResult = await chapaClient.initialize({
      amount: amountInBirr,
      currency: 'ETB',
      email: user.email,
      txRef,
      returnUrl: input.returnUrl,
    });

    return {
      paymentId: payment.id,
      txRef,
      checkoutUrl: initResult.checkoutUrl,
      plan: {
        id: plan.id,
        name: plan.name,
        priceEtb: plan.priceEtb,
        interval: plan.interval,
      },
    };
  }

  /**
   * Verify transaction with Chapa and activate subscription upon success (idempotent).
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

    if (payment.status === 'SUCCESS') {
      return { payment, subscription: payment.subscription };
    }

    const verifyResult = await chapaClient.verify(txRef);

    if (verifyResult.data.status === 'success') {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          verifiedAt: new Date(),
          rawWebhookJson: verifyResult as any,
        },
      });

      // Calculate new period end
      const daysToAdd = payment.subscription.plan.interval === 'YEARLY' ? 365 : 30;
      const now = new Date();
      const baseDate =
        payment.subscription.status === 'ACTIVE' &&
        new Date(payment.subscription.currentPeriodEnd) > now
          ? new Date(payment.subscription.currentPeriodEnd)
          : now;

      const newPeriodEnd = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      const updatedSubscription = await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
        },
        include: { plan: true },
      });

      return { payment: updatedPayment, subscription: updatedSubscription };
    } else {
      const failedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
        },
      });
      return { payment: failedPayment, subscription: payment.subscription };
    }
  }

  /**
   * Handle incoming Chapa webhook notification.
   */
  async handleChapaWebhook(signature: string | undefined, rawBody: string | Buffer, payload: any) {
    const isValid = chapaClient.verifyWebhookSignature(signature, rawBody);
    if (!isValid) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid webhook signature');
    }

    const txRef = payload?.tx_ref || payload?.data?.tx_ref;
    if (!txRef) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Missing transaction reference in payload');
    }

    await this.verifyPayment(txRef);
    return { received: true };
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
