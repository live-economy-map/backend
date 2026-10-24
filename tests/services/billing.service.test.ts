import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingService } from '../../src/services/billing.service.js';
import { prisma } from '../../src/config/db.js';
import { chapaClient } from '../../src/services/chapa.client.js';

vi.mock('../../src/config/db.js');
vi.mock('../../src/services/chapa.client.js');

describe('billing.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPlans', () => {
    it('returns active plans by default', async () => {
      const mockPlans = [{ id: 'plan-1', name: 'Pro', isActive: true, priceEtb: 150000 }];
      vi.mocked(prisma.plan.findMany).mockResolvedValueOnce(mockPlans as any);

      const res = await billingService.listPlans();
      expect(res).toEqual(mockPlans);
      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { priceEtb: 'asc' },
      });
    });
  });

  describe('createPlan', () => {
    it('throws 409 if plan name already exists', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValueOnce({
        id: 'plan-1',
        name: 'Pro',
      } as any);

      await expect(
        billingService.createPlan({
          name: 'Pro',
          priceEtb: 100000,
          interval: 'MONTHLY',
          canExport: true,
          canAlert: true,
          maxAlerts: 5,
          priorityReports: true,
          isActive: true,
        }),
      ).rejects.toThrow("Plan with name 'Pro' already exists");
    });

    it('creates a new plan if name is unique', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.plan.create).mockResolvedValueOnce({
        id: 'plan-new',
        name: 'Enterprise',
        priceEtb: 500000,
      } as any);

      const res = await billingService.createPlan({
        name: 'Enterprise',
        priceEtb: 500000,
        interval: 'YEARLY',
        canExport: true,
        canAlert: true,
        maxAlerts: 20,
        priorityReports: true,
        isActive: true,
      });

      expect(res.id).toBe('plan-new');
      expect(prisma.plan.create).toHaveBeenCalled();
    });
  });

  describe('initializeCheckout', () => {
    it('creates a pending payment with subscription shell and returns checkoutUrl', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u-1',
        email: 'user@example.com',
      } as any);
      vi.mocked(prisma.plan.findUnique).mockResolvedValueOnce({
        id: 'p-1',
        name: 'Pro',
        priceEtb: 150000,
        interval: 'MONTHLY',
        isActive: true,
      } as any);
      vi.mocked(prisma.subscription.upsert).mockResolvedValueOnce({
        id: 'sub-1',
      } as any);
      vi.mocked(prisma.payment.create).mockResolvedValueOnce({
        id: 'pay-1',
      } as any);
      vi.mocked(chapaClient.initialize).mockResolvedValueOnce({
        status: 'success',
        message: 'Link generated',
        checkoutUrl: 'https://checkout.chapa.co/123',
      });

      const res = await billingService.initializeCheckout('u-1', {
        planId: 'p-1',
        returnUrl: 'https://app.example.com/success',
      });

      expect(res.paymentId).toBe('pay-1');
      expect(res.checkoutUrl).toBe('https://checkout.chapa.co/123');
      expect(prisma.subscription.upsert).toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(chapaClient.initialize).toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    it('returns existing payment if already SUCCESS (idempotent)', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'SUCCESS',
        subscription: {
          id: 'sub-1',
          status: 'ACTIVE',
        },
      } as any);

      const res = await billingService.verifyPayment('LEM-123');
      expect(res.payment.status).toBe('SUCCESS');
      expect(chapaClient.verify).not.toHaveBeenCalled();
    });

    it('verifies pending payment, marks it SUCCESS, and activates subscription', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'PENDING',
        subscriptionId: 'sub-1',
        subscription: {
          id: 'sub-1',
          status: 'INCOMPLETE',
          currentPeriodEnd: new Date(),
          plan: { id: 'p-1', interval: 'MONTHLY' },
        },
      } as any);
      vi.mocked(chapaClient.verify).mockResolvedValueOnce({
        status: 'success',
        message: 'Verified',
        data: {
          status: 'success',
          txRef: 'LEM-123',
          amount: 1500,
          currency: 'ETB',
          reference: 'CHAPA-REF-123',
        },
      });
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'SUCCESS',
      } as any);
      vi.mocked(prisma.subscription.update).mockResolvedValueOnce({
        id: 'sub-1',
        status: 'ACTIVE',
      } as any);

      const res = await billingService.verifyPayment('LEM-123');
      expect(res.payment.status).toBe('SUCCESS');
      expect(res.subscription?.status).toBe('ACTIVE');
      expect(prisma.subscription.update).toHaveBeenCalled();
    });
  });

  describe('handleChapaWebhook', () => {
    it('rejects invalid signature with 400', async () => {
      vi.mocked(chapaClient.verifyWebhookSignature).mockReturnValueOnce(false);

      await expect(billingService.handleChapaWebhook('bad-sig', 'raw', {})).rejects.toThrow(
        'Invalid webhook signature',
      );
    });

    it('verifies payment when signature is valid', async () => {
      vi.mocked(chapaClient.verifyWebhookSignature).mockReturnValueOnce(true);
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'SUCCESS',
        subscription: {
          id: 'sub-1',
          status: 'ACTIVE',
        },
      } as any);

      const res = await billingService.handleChapaWebhook('good-sig', 'raw', {
        tx_ref: 'LEM-123',
      });
      expect(res.received).toBe(true);
    });
  });
});
