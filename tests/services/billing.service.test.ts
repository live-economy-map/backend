import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingService } from '../../src/services/billing.service.js';
import { prisma } from '../../src/config/db.js';

vi.mock('../../src/config/db.js');

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

  describe('initializeCheckout (hardcoded)', () => {
    it('immediately activates subscription, creates successful payment, and returns checkoutUrl', async () => {
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
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.payment.create).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'SUCCESS',
      } as any);

      const res = await billingService.initializeCheckout('u-1', {
        planId: 'p-1',
        returnUrl: 'https://app.example.com/success',
      });

      expect(res.paymentId).toBe('pay-1');
      expect(res.checkoutUrl).toContain('https://app.example.com/success');
      expect(res.checkoutUrl).toContain('txRef=');
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u-1' },
          create: expect.objectContaining({ status: 'ACTIVE' }),
          update: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUCCESS' }),
        }),
      );
    });
  });

  describe('verifyPayment', () => {
    it('returns payment and active subscription for valid txRef', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: 'pay-1',
        status: 'SUCCESS',
        subscription: {
          id: 'sub-1',
          status: 'ACTIVE',
        },
      } as any);

      const res = await billingService.verifyPayment('SUB-123');
      expect(res.payment.status).toBe('SUCCESS');
      expect(res.subscription?.status).toBe('ACTIVE');
    });

    it('throws 404 when payment does not exist', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(null);

      await expect(billingService.verifyPayment('NONEXISTENT')).rejects.toThrow(
        'Payment not found',
      );
    });
  });

  describe('handleChapaWebhook stub', () => {
    it('returns received true for stub compatibility', async () => {
      const res = await billingService.handleChapaWebhook('sig', 'raw', {});
      expect(res.received).toBe(true);
    });
  });
});
