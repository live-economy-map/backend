import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as adminPipelineController from '../../src/controllers/adminPipeline.controller.js';
import adminPipelineRouter from '../../src/routes/adminPipeline.routes.js';

vi.mock('../../src/controllers/adminPipeline.controller.js');
vi.mock('../../src/middlewares/auth.middleware.js', () => {
  const authMiddleware = (req: any, res: any, next: any) => {
    if (!req.headers.authorization) {
      return res
        .status(401)
        .json({ statusCode: 401, success: false, message: 'Unauthorized', errors: [] });
    }
    req.user = { id: 'admin-1' };
    next();
  };
  return { default: authMiddleware };
});

const app = express();
app.use(express.json());
app.use('/admin/pipeline', adminPipelineRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminPipeline.routes', () => {
  it('returns 401 with no Authorization header on every route in this router', async () => {
    const routes = [
      { method: 'get', path: '/admin/pipeline/sources' },
      { method: 'post', path: '/admin/pipeline/sources/VIIRS/refresh' },
      { method: 'get', path: '/admin/pipeline/runs' },
      { method: 'post', path: '/admin/pipeline/recompute' },
      { method: 'get', path: '/admin/pipeline/weight-configs' },
      { method: 'post', path: '/admin/pipeline/weight-configs' },
    ];

    for (const { method, path } of routes) {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    }
    expect(adminPipelineController.listSources).not.toHaveBeenCalled();
  });

  it('rejects an invalid sourceKey on POST /sources/:sourceKey/refresh before reaching the controller', async () => {
    const res = await request(app)
      .post('/admin/pipeline/sources/LANDSAT/refresh')
      .set('Authorization', 'Bearer token');

    expect(adminPipelineController.triggerRefresh).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it('rejects an invalid period on POST /recompute before reaching the controller', async () => {
    const res = await request(app)
      .post('/admin/pipeline/recompute')
      .set('Authorization', 'Bearer token')
      .send({ period: 'not-a-date' });

    expect(adminPipelineController.triggerRecompute).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it('rejects a malformed weights array on POST /weight-configs before reaching the controller', async () => {
    const res = await request(app)
      .post('/admin/pipeline/weight-configs')
      .set('Authorization', 'Bearer token')
      .send({ weights: [{ sourceKey: 'VIIRS', weight: 0.5 }] });

    expect(adminPipelineController.createWeightConfig).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it('GET /sources, /runs, /weight-configs reach the controller with only auth, no body schema', async () => {
    (adminPipelineController.listSources as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );
    (adminPipelineController.listRuns as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );
    (adminPipelineController.listWeightConfigs as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    await request(app).get('/admin/pipeline/sources').set('Authorization', 'Bearer token');
    await request(app).get('/admin/pipeline/runs').set('Authorization', 'Bearer token');
    await request(app).get('/admin/pipeline/weight-configs').set('Authorization', 'Bearer token');

    expect(adminPipelineController.listSources).toHaveBeenCalled();
    expect(adminPipelineController.listRuns).toHaveBeenCalled();
    expect(adminPipelineController.listWeightConfigs).toHaveBeenCalled();
  });
});
