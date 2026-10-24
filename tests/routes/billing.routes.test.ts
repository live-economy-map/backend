import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/billing.service.js', () => ({
  billingService: {
    listPlans: vi.fn(),
    createPlan: vi.fn(),
    initializeCheckout: vi.fn(),
    verifyPayment: vi.fn(),
    handleChapaWebhook: vi.fn(),
    getUserSubscription: vi.fn(),
    adminListPayments: vi.fn(),
    adminUpdateSubscription: vi.fn(),
  },
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  default: (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Invalid or expired token',
        errors: [],
      });
    }

    if (authHeader.includes('admin-token')) {
      (req as any).user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: '2026-01-01T00:00:00Z',
      };
    } else {
      (req as any).user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2026-01-10T00:00:00Z',
      };
    }
    next();
  },
}));

import { billingService } from '../../src/services/billing.service.js';
import plansRoutes from '../../src/routes/plans.routes.js';
import billingRoutes from '../../src/routes/billing.routes.js';
import adminBillingRoutes from '../../src/routes/adminBilling.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/plans', plansRoutes);
  app.use('/billing', billingRoutes);
  app.use('/admin/billing', adminBillingRoutes);
  app.use(errorMiddleware);
  return app;
}

describe('billing.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /plans', () => {
    it('returns available subscription plans', async () => {
      const mockPlans = [{ id: 'p-1', name: 'Pro', priceBirr: 1500 }];
      vi.mocked(billingService.listPlans).mockResolvedValueOnce(mockPlans as any);

      const res = await request(buildApp()).get('/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockPlans);
    });
  });

  describe('POST /billing/checkout', () => {
    it('requires authentication (401 without token)', async () => {
      const res = await request(buildApp())
        .post('/billing/checkout')
        .send({ planId: '123e4567-e89b-12d3-a456-426614174000' });
      expect(res.status).toBe(401);
    });

    it('initializes checkout for authenticated user', async () => {
      vi.mocked(billingService.initializeCheckout).mockResolvedValueOnce({
        paymentId: 'pay-1',
        txRef: 'LEM-12345',
        checkoutUrl: 'https://checkout.chapa.co/12345',
        plan: { id: 'p-1', name: 'Pro', priceBirr: 1500, interval: 'MONTHLY' },
      } as any);

      const res = await request(buildApp())
        .post('/billing/checkout')
        .set('Authorization', 'Bearer user-token')
        .send({ planId: '123e4567-e89b-12d3-a456-426614174000' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkoutUrl).toBe('https://checkout.chapa.co/12345');
    });
  });

  describe('GET /billing/verify/:txRef', () => {
    it('verifies payment status given txRef', async () => {
      vi.mocked(billingService.verifyPayment).mockResolvedValueOnce({
        payment: { id: 'pay-1', status: 'SUCCESS' },
        subscription: { id: 'sub-1', status: 'ACTIVE' },
      } as any);

      const res = await request(buildApp())
        .get('/billing/verify/LEM-12345')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data.payment.status).toBe('SUCCESS');
    });
  });

  describe('POST /billing/webhook', () => {
    it('processes webhook notification without user authorization header', async () => {
      vi.mocked(billingService.handleChapaWebhook).mockResolvedValueOnce({ received: true });

      const res = await request(buildApp())
        .post('/billing/webhook')
        .set('x-chapa-signature', 'valid-mock-signature')
        .send({ tx_ref: 'LEM-12345', status: 'success' });

      expect(res.status).toBe(200);
      expect(res.body.data.received).toBe(true);
    });
  });

  describe('Admin Billing Routes', () => {
    it('rejects regular users with 403 on admin plan creation', async () => {
      const res = await request(buildApp())
        .post('/admin/billing/plans')
        .set('Authorization', 'Bearer user-token')
        .send({
          name: 'Pro',
          priceEtb: 100000,
        });

      expect(res.status).toBe(403);
    });

    it('creates plan when called by an ADMIN', async () => {
      vi.mocked(billingService.createPlan).mockResolvedValueOnce({
        id: 'p-new',
        name: 'Enterprise',
        priceEtb: 500000,
      } as any);

      const res = await request(buildApp())
        .post('/admin/billing/plans')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Enterprise',
          priceEtb: 500000,
          interval: 'YEARLY',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Enterprise');
    });

    it('lists payments for ADMIN', async () => {
      vi.mocked(billingService.adminListPayments).mockResolvedValueOnce({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });

      const res = await request(buildApp())
        .get('/admin/billing/payments')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });
  });
});
