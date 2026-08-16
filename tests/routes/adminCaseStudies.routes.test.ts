import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/adminCaseStudies.service.js', () => ({
  getAllCaseStudies: vi.fn(),
  createCaseStudy: vi.fn(),
  updateCaseStudy: vi.fn(),
  deleteCaseStudy: vi.fn(),
  searchCaseStudyCandidates: vi.fn(),
}));

// "Integration (supertest, mocked service layer + mocked authMiddleware)".
// This mock replicates the real middleware's observable contract (401 without a
// Bearer-style Authorization header, req.user attached otherwise) without depending
// on real JWT verification.
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  default: (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Invalid or expired token',
        errors: [],
      });
    }
    (req as any).user = { id: 'admin-1', role: 'admin' };
    next();
  },
}));

import * as adminCaseStudiesService from '../../src/services/adminCaseStudies.service.js';
import adminCaseStudiesRouter from '../../src/routes/adminCaseStudies.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin/case-studies', adminCaseStudiesRouter);
  app.use(errorMiddleware);
  return app;
}

const validBody = {
  name: 'Bole Rd Expansion',
  latitude: 9.01,
  longitude: 38.78,
  evidenceDescription: 'New commercial signage observed',
  scoreRiseDate: '2026-03-01',
  confirmedDate: '2026-05-01',
};

const validUuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('adminCaseStudies.routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('every route requires auth', () => {
    it('GET / returns 401 without an Authorization header, controller mock never invoked', async () => {
      const res = await request(app).get('/admin/case-studies');
      expect(res.status).toBe(401);
      expect(adminCaseStudiesService.getAllCaseStudies).not.toHaveBeenCalled();
    });

    it('POST / returns 401 without an Authorization header, controller mock never invoked', async () => {
      const res = await request(app).post('/admin/case-studies').send(validBody);
      expect(res.status).toBe(401);
      expect(adminCaseStudiesService.createCaseStudy).not.toHaveBeenCalled();
    });

    it('PATCH /:caseStudyId returns 401 without an Authorization header, controller mock never invoked', async () => {
      const res = await request(app).patch(`/admin/case-studies/${validUuid}`).send({ name: 'x' });
      expect(res.status).toBe(401);
      expect(adminCaseStudiesService.updateCaseStudy).not.toHaveBeenCalled();
    });

    it('DELETE /:caseStudyId returns 401 without an Authorization header, controller mock never invoked', async () => {
      const res = await request(app).delete(`/admin/case-studies/${validUuid}`);
      expect(res.status).toBe(401);
      expect(adminCaseStudiesService.deleteCaseStudy).not.toHaveBeenCalled();
    });

    it('POST /discover returns 401 without an Authorization header, controller mock never invoked', async () => {
      const res = await request(app)
        .post('/admin/case-studies/discover')
        .send({ areaFocus: 'Ayat' });
      expect(res.status).toBe(401);
      expect(adminCaseStudiesService.searchCaseStudyCandidates).not.toHaveBeenCalled();
    });
  });

  describe('POST / validates body against createCaseStudySchema', () => {
    it('rejects an empty body — controller mock never called', async () => {
      const res = await request(app)
        .post('/admin/case-studies')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(adminCaseStudiesService.createCaseStudy).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /:caseStudyId validates the uuid param', () => {
    it('rejects a malformed caseStudyId with a valid body — controller mock never called', async () => {
      const res = await request(app)
        .patch('/admin/case-studies/not-a-uuid')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New name' });

      expect(res.status).toBe(400);
      expect(adminCaseStudiesService.updateCaseStudy).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:caseStudyId has no body schema', () => {
    it('reaches the controller mock even with a malformed id — service is responsible for the 404', async () => {
      (adminCaseStudiesService.deleteCaseStudy as any).mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/admin/case-studies/some-malformed-id')
        .set('Authorization', 'Bearer valid-token');

      expect(adminCaseStudiesService.deleteCaseStudy).toHaveBeenCalledWith('some-malformed-id');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /discover validates areaFocus', () => {
    it('rejects an empty areaFocus — controller mock never called', async () => {
      const res = await request(app)
        .post('/admin/case-studies/discover')
        .set('Authorization', 'Bearer valid-token')
        .send({ areaFocus: '' });

      expect(res.status).toBe(400);
      expect(adminCaseStudiesService.searchCaseStudyCandidates).not.toHaveBeenCalled();
    });
  });

  describe('happy paths — authorized, valid input reaches the controller', () => {
    it('GET / returns 200', async () => {
      (adminCaseStudiesService.getAllCaseStudies as any).mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      const res = await request(app)
        .get('/admin/case-studies')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('POST / returns 201 with a valid body', async () => {
      (adminCaseStudiesService.createCaseStudy as any).mockResolvedValue({
        caseStudy: { id: '1', ...validBody },
        dateOrderWarning: false,
      });

      const res = await request(app)
        .post('/admin/case-studies')
        .set('Authorization', 'Bearer valid-token')
        .send(validBody);

      expect(res.status).toBe(201);
    });

    it('PATCH /:caseStudyId returns 200 with a valid uuid and body', async () => {
      (adminCaseStudiesService.updateCaseStudy as any).mockResolvedValue({
        caseStudy: { id: validUuid },
        dateOrderWarning: false,
      });

      const res = await request(app)
        .patch(`/admin/case-studies/${validUuid}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ evidenceUrl: 'https://example.com/article' });

      expect(res.status).toBe(200);
    });

    it('DELETE /:caseStudyId returns 200 with a valid uuid', async () => {
      (adminCaseStudiesService.deleteCaseStudy as any).mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/admin/case-studies/${validUuid}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('POST /discover returns 200 with a valid areaFocus', async () => {
      (adminCaseStudiesService.searchCaseStudyCandidates as any).mockResolvedValue({
        candidates: [],
      });

      const res = await request(app)
        .post('/admin/case-studies/discover')
        .set('Authorization', 'Bearer valid-token')
        .send({ areaFocus: 'Ayat' });

      expect(res.status).toBe(200);
    });
  });
});
