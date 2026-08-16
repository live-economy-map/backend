import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as caseStudiesController from '../../src/controllers/caseStudies.controller.js';
import caseStudiesRouter from '../../src/routes/caseStudies.routes.js';

vi.mock('../../src/controllers/caseStudies.controller.js');

const app = express();
app.use(express.json());
app.use('/case-studies', caseStudiesRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('caseStudies.routes', () => {
  it('GET / has no auth requirement, delegates to listCaseStudies', async () => {
    vi.mocked(caseStudiesController.listCaseStudies).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/case-studies');

    expect(res.status).toBe(200);
    expect(caseStudiesController.listCaseStudies).toHaveBeenCalled();
  });

  it('GET / validates query params against listCaseStudiesQuerySchema — rejects an out-of-range limit', async () => {
    vi.mocked(caseStudiesController.listCaseStudies).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/case-studies').query({ limit: 101 });

    expect(res.status).toBe(400);
    expect(caseStudiesController.listCaseStudies).not.toHaveBeenCalled();
  });

  it('GET /:caseStudyId has no auth requirement, delegates to getCaseStudyById', async () => {
    vi.mocked(caseStudiesController.getCaseStudyById).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/case-studies/cs-1');

    expect(res.status).toBe(200);
    expect(caseStudiesController.getCaseStudyById).toHaveBeenCalled();
  });

  it("GET /:caseStudyId has no schema on the param — a malformed id still reaches the controller mock (404 is the service/Prisma layer's job)", async () => {
    vi.mocked(caseStudiesController.getCaseStudyById).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/case-studies/not-a-real-id');

    expect(res.status).toBe(200);
    expect(caseStudiesController.getCaseStudyById).toHaveBeenCalled();
  });
});
