import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from '../../src/utils/jwt.js';
import router from '../../src/routes/index.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

// Mock Services and Prisma
vi.mock('../../src/config/db.js', () => ({
  prisma: {
    admin: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    payment: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    reportRequest: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    reportRequestEvent: {
      create: vi.fn().mockResolvedValue({ id: 'ev-1' }),
    },
    reportDeliverable: {
      create: vi.fn().mockResolvedValue({ id: 'del-1' }),
    },
    $transaction: vi.fn((fn: any) =>
      typeof fn === 'function'
        ? fn({
            reportDeliverable: {
              create: vi.fn().mockResolvedValue({ id: 'del-1', fileName: 'report.pdf' }),
            },
            reportRequest: {
              update: vi.fn().mockResolvedValue({ id: 'req-1', status: 'DELIVERED' }),
            },
            reportRequestEvent: { create: vi.fn().mockResolvedValue({ id: 'ev-1' }) },
          })
        : Promise.all(fn),
    ),
  },
}));

vi.mock('../../src/services/adminPipeline.service.js', () => ({
  getSourcesWithHealth: vi.fn().mockResolvedValue([
    { key: 'VIIRS', name: 'VIIRS', isHealthy: true, lastSuccessAt: new Date() },
    { key: 'GHSL', name: 'GHSL', isHealthy: true, lastSuccessAt: new Date() },
    { key: 'RWI', name: 'RWI', isHealthy: true, lastSuccessAt: new Date() },
    { key: 'GDELT', name: 'GDELT', isHealthy: true, lastSuccessAt: new Date() },
  ]),
  startPipelineRun: vi.fn().mockResolvedValue({ pipelineRunId: 'run-123' }),
  getPipelineRuns: vi.fn().mockResolvedValue({
    items: [{ id: 'run-1', status: 'SUCCESS' }],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  }),
  recomputeCompositeScores: vi.fn().mockResolvedValue({ count: 354, period: '2026-03-01' }),
  getWeightConfigs: vi.fn().mockResolvedValue({
    activeConfig: { id: 'cfg-1', weights: [] },
    configs: [],
  }),
  createAndActivateWeightConfig: vi.fn().mockResolvedValue({ id: 'cfg-2' }),
}));

vi.mock('../../src/services/adminCaseStudies.service.js', () => ({
  getAllCaseStudies: vi.fn().mockResolvedValue({ items: [{ id: 'cs-1' }], total: 1 }),
  createCaseStudy: vi.fn().mockResolvedValue({ id: 'cs-1' }),
  updateCaseStudy: vi.fn().mockResolvedValue({ id: 'cs-1' }),
  deleteCaseStudy: vi.fn().mockResolvedValue({ success: true }),
  searchCaseStudyCandidates: vi.fn().mockResolvedValue({ candidates: [] }),
}));

vi.mock('../../src/services/reportDrafts.service.js', () => ({
  reportDraftsService: {
    generateDraft: vi.fn().mockResolvedValue({ id: 'draft-1', status: 'IN_REVIEW' }),
    getDraft: vi.fn().mockResolvedValue({ id: 'draft-1' }),
    updateDraft: vi.fn().mockResolvedValue({ id: 'draft-1' }),
    deliverDraft: vi
      .fn()
      .mockResolvedValue({ deliverable: { id: 'del-1' }, draft: { id: 'draft-1' } }),
  },
}));

import { prisma } from '../../src/config/db.js';
import * as adminPipelineService from '../../src/services/adminPipeline.service.js';
import * as adminCaseStudiesService from '../../src/services/adminCaseStudies.service.js';
import { reportDraftsService } from '../../src/services/reportDrafts.service.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorMiddleware);
  return app;
}

describe('Admin System & Report Requests Rigorous Integration Suite', () => {
  let app: express.Express;
  let adminToken: string;
  let userToken: string;
  const adminId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '123e4567-e89b-12d3-a456-426614174001';
  const requestId = '123e4567-e89b-12d3-a456-426614174002';
  const hashedAdminPassword = bcrypt.hashSync('Admin123!', 10);

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();

    adminToken = generateToken({
      id: adminId,
      email: 'admin@ecolens.org',
      role: 'ADMIN',
      createdAt: new Date('2026-10-24T00:00:00.000Z'),
    });

    userToken = generateToken({
      id: userId,
      email: 'user@example.com',
      role: 'USER',
      createdAt: new Date('2026-10-24T00:00:00.000Z'),
    });

    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: adminId,
      email: 'admin@ecolens.org',
      role: 'ADMIN',
      createdAt: new Date('2026-10-24T00:00:00.000Z'),
    } as any);
  });

  describe('1. Verify Admin User Seeding & Credentials', () => {
    it('authenticates admin@ecolens.org with Admin123! and returns standardized envelope', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValueOnce({
        id: adminId,
        email: 'admin@ecolens.org',
        password: hashedAdminPassword,
        createdAt: new Date('2026-10-24T00:00:00.000Z'),
        updatedAt: new Date('2026-10-24T00:00:00.000Z'),
      } as any);

      const res = await request(app).post('/api/v1/admin/auth/login').send({
        email: 'admin@ecolens.org',
        password: 'Admin123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.admin).toEqual({
        id: adminId,
        email: 'admin@ecolens.org',
        role: 'ADMIN',
        createdAt: '2026-10-24T00:00:00.000Z',
      });

      // Verify JWT payload contents
      const decoded = verifyToken(res.body.data.token) as any;
      expect(decoded.id).toBe(adminId);
      expect(decoded.email).toBe('admin@ecolens.org');
      expect(decoded.role).toBe('ADMIN');
    });

    it('rejects invalid password with 401', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValueOnce({
        id: adminId,
        email: 'admin@ecolens.org',
        password: hashedAdminPassword,
        createdAt: new Date('2026-10-24T00:00:00.000Z'),
        updatedAt: new Date('2026-10-24T00:00:00.000Z'),
      } as any);

      const res = await request(app).post('/api/v1/admin/auth/login').send({
        email: 'admin@ecolens.org',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('authenticates through User table fallback if present with role ADMIN', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
        id: adminId,
        email: 'admin@ecolens.org',
        role: 'ADMIN',
        password: hashedAdminPassword,
        createdAt: new Date('2026-10-24T00:00:00.000Z'),
      } as any);

      const res = await request(app).post('/api/v1/admin/auth/login').send({
        email: 'admin@ecolens.org',
        password: 'Admin123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.admin.role).toBe('ADMIN');
    });

    it('returns 200 for GET /api/v1/admin/auth/me when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@ecolens.org');
    });
  });

  describe('2. Authorization Middleware Matrix Across Admin Endpoints', () => {
    const adminEndpoints = [
      { method: 'get', url: '/api/v1/admin/report-requests' },
      { method: 'get', url: '/api/v1/admin/metrics/demand' },
      { method: 'get', url: '/api/v1/admin/pipeline/sources' },
      { method: 'get', url: '/api/v1/admin/case-studies' },
      { method: 'get', url: '/api/v1/admin/billing/payments' },
    ];

    it.each(adminEndpoints)(
      'rejects anonymous access to $method $url with 401',
      async ({ method, url }) => {
        const res = await (request(app) as any)[method](url);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      },
    );

    it.each(adminEndpoints)(
      'rejects standard user role (USER) to $method $url with 403',
      async ({ method, url }) => {
        const res = await (request(app) as any)
          [method](url)
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      },
    );

    it.each(adminEndpoints)(
      'allows ADMIN role to $method $url with 200',
      async ({ method, url }) => {
        const res = await (request(app) as any)
          [method](url)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      },
    );
  });

  describe('3. Verify Admin Report Requests & Gate 2 Demand Queue', () => {
    it('GET /api/v1/admin/report-requests lists paginated requests with user & deliverables', async () => {
      const mockRequestItem = {
        id: requestId,
        userId,
        user: {
          id: userId,
          email: 'requester@example.com',
          fullName: 'Requester Name',
          phoneNumber: '+251911223344',
          telegramHandle: '@requester_tg',
        },
        title: 'Custom Spatial Analysis: Cell 37099087',
        questionPrompt: 'Investigate commercial growth in this cell.',
        areaCellIds: ['37099087-4718-435b-b302-106cfa2c415a'],
        orgType: 'Independent Researcher',
        contactPreference: 'TELEGRAM',
        phoneNumber: '+251911223344',
        telegramHandle: '@requester_tg',
        status: 'SUBMITTED',
        priority: false,
        assignedAdminId: null,
        internalNotes: null,
        createdAt: new Date('2026-10-24T20:00:00.000Z'),
        deliverables: [],
        events: [],
        drafts: [],
      };

      vi.mocked(prisma.reportRequest.findMany).mockResolvedValueOnce([mockRequestItem] as any);
      vi.mocked(prisma.reportRequest.count).mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/v1/admin/report-requests?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(10);
      expect(res.body.data.items[0].title).toBe('Custom Spatial Analysis: Cell 37099087');
      expect(res.body.data.items[0].user.email).toBe('requester@example.com');
    });

    it('GET /api/v1/admin/metrics/demand returns Gate 2 threshold metrics', async () => {
      vi.mocked(prisma.reportRequest.count).mockResolvedValueOnce(8);
      vi.mocked(prisma.reportRequest.groupBy)
        .mockResolvedValueOnce([
          { userId: 'u1', _count: { id: 4 } },
          { userId: 'u2', _count: { id: 4 } },
        ] as any)
        .mockResolvedValueOnce([{ status: 'SUBMITTED', _count: { id: 8 } }] as any);

      const res = await request(app)
        .get('/api/v1/admin/metrics/demand')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalRequests).toBe(8);
      expect(res.body.data.distinctUsers).toBe(2);
      expect(res.body.data.targetRequests).toBe(10);
      expect(res.body.data.targetUsers).toBe(5);
      expect(res.body.data.gateStatus).toBe('PENDING');
      expect(res.body.data.isGateMet).toBe(false);
    });

    it('PATCH /api/v1/admin/report-requests/:id updates status and priority', async () => {
      vi.mocked(prisma.reportRequest.findUnique).mockResolvedValueOnce({
        id: requestId,
        status: 'SUBMITTED',
        user: { email: 'client@example.com' },
      } as any);

      vi.mocked(prisma.$transaction).mockResolvedValueOnce({
        id: requestId,
        status: 'IN_PROGRESS',
        priority: true,
        internalNotes: 'Assigned to senior analyst',
      });

      const res = await request(app)
        .patch(`/api/v1/admin/report-requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          internalNotes: 'Assigned to senior analyst',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('POST /api/v1/admin/report-requests/:id/deliverable accepts deliverable payload', async () => {
      vi.mocked(prisma.reportRequest.findUnique).mockResolvedValueOnce({
        id: requestId,
        status: 'IN_PROGRESS',
        title: 'Analysis Report',
        user: { email: 'client@example.com' },
      } as any);

      const res = await request(app)
        .post(`/api/v1/admin/report-requests/${requestId}/deliverable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fileName: 'Final_Economic_Report_Cell_12.pdf',
          fileUrl: 'https://storage.ecolens.org/deliverables/report_12.pdf',
          fileSizeMb: 3.5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('del-1');
    });

    it('POST /api/v1/admin/report-requests/:id/generate-draft generates AI synthesis draft', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/report-requests/${requestId}/generate-draft`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customPrompt: 'Focus on infrastructure and night light density signals.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('draft-1');
      expect(reportDraftsService.generateDraft).toHaveBeenCalled();
    });
  });

  describe('4. Verify Admin Pipeline & Weight Config Endpoints', () => {
    it('GET /api/v1/admin/pipeline/sources returns health statuses for all 4 orbital sources', async () => {
      const res = await request(app)
        .get('/api/v1/admin/pipeline/sources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sources).toHaveLength(4);
      expect(adminPipelineService.getSourcesWithHealth).toHaveBeenCalled();
    });

    it('POST /api/v1/admin/pipeline/sources/:sourceKey/refresh triggers ingestion run', async () => {
      const res = await request(app)
        .post('/api/v1/admin/pipeline/sources/VIIRS/refresh')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(202);
      expect(res.body.data.pipelineRunId).toBe('run-123');
    });

    it('GET /api/v1/admin/pipeline/runs returns queryable pipeline run history', async () => {
      const res = await request(app)
        .get('/api/v1/admin/pipeline/runs?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('POST /api/v1/admin/pipeline/recompute recalculates composite score for period', async () => {
      const res = await request(app)
        .post('/api/v1/admin/pipeline/recompute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-03-01' });

      expect(res.status).toBe(202);
      expect(res.body.data.count).toBe(354);
    });

    it('GET & POST /api/v1/admin/pipeline/weight-configs manages source weight configurations', async () => {
      const getRes = await request(app)
        .get('/api/v1/admin/pipeline/weight-configs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);

      const postRes = await request(app)
        .post('/api/v1/admin/pipeline/weight-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          weights: [
            { sourceKey: 'VIIRS', weight: 0.5 },
            { sourceKey: 'GHSL', weight: 0.3 },
            { sourceKey: 'RWI', weight: 0.2 },
          ],
        });

      expect(postRes.status).toBe(201);
    });
  });

  describe('5. Verify Admin Case Study Curation Endpoints', () => {
    const caseStudyId = '123e4567-e89b-12d3-a456-426614174003';

    it('manages case studies lifecycle (GET, POST, PATCH, DELETE, DISCOVER)', async () => {
      // 1. GET case studies
      const listRes = await request(app)
        .get('/api/v1/admin/case-studies')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items).toHaveLength(1);

      // 2. POST create case study
      const createRes = await request(app)
        .post('/api/v1/admin/case-studies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bole Commercial Corridor Expansion',
          latitude: 8.98,
          longitude: 38.79,
          evidenceDescription: 'Rapid expansion of retail hubs confirmed by high-res imagery.',
          scoreRiseDate: '2026-01-01',
          confirmedDate: '2026-03-01',
        });
      expect(createRes.status).toBe(201);

      // 3. PATCH update case study
      const updateRes = await request(app)
        .patch(`/api/v1/admin/case-studies/${caseStudyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Bole Commercial Corridor',
        });
      expect(updateRes.status).toBe(200);

      // 4. DELETE case study
      const deleteRes = await request(app)
        .delete(`/api/v1/admin/case-studies/${caseStudyId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);

      // 5. POST discover anomaly candidates
      const discoverRes = await request(app)
        .post('/api/v1/admin/case-studies/discover')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          areaFocus: 'Addis Ababa Central',
        });
      expect(discoverRes.status).toBe(200);
    });
  });
});
