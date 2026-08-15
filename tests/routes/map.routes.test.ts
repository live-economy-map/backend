import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../src/controllers/map.controller.js', () => ({
  getCells: vi.fn((req, res) =>
    res.status(200).json({ statusCode: 200, success: true, message: 'OK', data: {} }),
  ),
  getCellDetail: vi.fn((req, res) =>
    res.status(200).json({ statusCode: 200, success: true, message: 'OK', data: {} }),
  ),
  getRawLayer: vi.fn((req, res) =>
    res.status(200).json({ statusCode: 200, success: true, message: 'OK', data: {} }),
  ),
  searchMap: vi.fn((req, res) =>
    res.status(200).json({ statusCode: 200, success: true, message: 'OK', data: {} }),
  ),
}));

import * as mapController from '../../src/controllers/map.controller.js';
import mapRouter from '../../src/routes/map.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/map', mapRouter);
  app.use(errorMiddleware);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('map.routes', () => {
  it('GET / has no auth requirement', async () => {
    const res = await request(buildApp()).get('/map');
    expect(res.status).toBe(200);
  });

  it('GET / validates period format', async () => {
    const res = await request(buildApp()).get('/map').query({ period: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(mapController.getCells).not.toHaveBeenCalled();
  });

  it('GET /:cellId requires a uuid cellId', async () => {
    const res = await request(buildApp()).get('/map/not-a-uuid');
    expect(res.status).toBe(400);
    expect(mapController.getCellDetail).not.toHaveBeenCalled();
  });

  it('GET /layers/:sourceKey rejects GDELT at the route layer', async () => {
    const res = await request(buildApp()).get('/map/layers/GDELT');
    expect(res.status).toBe(400);
    expect(mapController.getRawLayer).not.toHaveBeenCalled();
  });

  it('GET /layers/:sourceKey accepts VIIRS/GHSL/RWI', async () => {
    const res = await request(buildApp()).get('/map/layers/VIIRS');
    expect(res.status).toBe(200);
    expect(mapController.getRawLayer).toHaveBeenCalled();
  });

  it('POST /search enforces min/max query length', async () => {
    const res = await request(buildApp()).post('/map/search').send({ query: '' });
    expect(res.status).toBe(400);
    expect(mapController.searchMap).not.toHaveBeenCalled();
  });

  it('POST /search has no auth requirement', async () => {
    const res = await request(buildApp())
      .post('/map/search')
      .send({ query: 'areas near Bole with rising construction' });
    expect(res.status).toBe(200);
  });

  it('no route in this router requires auth', async () => {
    const app = buildApp();
    const responses = await Promise.all([
      request(app).get('/map'),
      request(app).get('/map/11111111-1111-1111-1111-111111111111'),
      request(app).get('/map/layers/VIIRS'),
      request(app).post('/map/search').send({ query: 'areas near Bole with rising construction' }),
    ]);
    for (const res of responses) expect(res.status).not.toBe(401);
  });
});
