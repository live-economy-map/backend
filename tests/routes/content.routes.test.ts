import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as contentController from '../../src/controllers/content.controller.js';
import contentRouter from '../../src/routes/content.routes.js';

vi.mock('../../src/controllers/content.controller.js');

const app = express();
app.use(express.json());
app.use('/content', contentRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('content.routes', () => {
  it('GET /landing has no auth requirement', async () => {
    (contentController.getLandingContent as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/content/landing');

    expect(res.status).toBe(200);
    expect(contentController.getLandingContent).toHaveBeenCalled();
  });

  it('GET /methodology has no auth requirement', async () => {
    (contentController.getMethodologyContent as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/content/methodology');

    expect(res.status).toBe(200);
    expect(contentController.getMethodologyContent).toHaveBeenCalled();
  });

  it('GET /about has no auth requirement', async () => {
    (contentController.getAboutContent as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res = await request(app).get('/content/about');

    expect(res.status).toBe(200);
    expect(contentController.getAboutContent).toHaveBeenCalled();
  });

  it('none of the content routes rejects arbitrary query params — no validation middleware in the chain', async () => {
    (contentController.getLandingContent as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );
    (contentController.getMethodologyContent as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );
    (contentController.getAboutContent as any).mockImplementation((req: any, res: any) =>
      res.status(200).json({}),
    );

    const res1 = await request(app).get('/content/landing').query({ arbitrary: 'value' });
    const res2 = await request(app).get('/content/methodology').query({ arbitrary: 'value' });
    const res3 = await request(app).get('/content/about').query({ arbitrary: 'value' });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
    expect(contentController.getLandingContent).toHaveBeenCalled();
    expect(contentController.getMethodologyContent).toHaveBeenCalled();
    expect(contentController.getAboutContent).toHaveBeenCalled();
  });
});
