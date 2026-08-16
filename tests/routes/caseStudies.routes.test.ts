import { describe, it, expect, vi } from 'vitest';
import caseStudiesRoutes from '../../src/routes/caseStudies.routes.js';

vi.mock('../../src/controllers/caseStudies.controller.js');
vi.mock('../../src/middlewares/validate.middleware.js');

// Type for Express Router's internal layer structure (standalone, doesn't extend Router)
interface RouterLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ name: string }>;
  };
}

interface ExpressRouterStack {
  stack: RouterLayer[];
}

describe.skip('caseStudies.routes', () => {
  it('should be a valid Express router', () => {
    expect(caseStudiesRoutes).toBeDefined();
    expect(caseStudiesRoutes).toHaveProperty('get');
    expect(caseStudiesRoutes).toHaveProperty('post');
  });

  it('should have GET / route', () => {
    const stack = (caseStudiesRoutes as unknown as ExpressRouterStack).stack;
    const rootRoute = stack.find((layer) => layer.route?.path === '/');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.route?.methods.get).toBe(true);
  });

  it('should have GET /:caseStudyId route', () => {
    const stack = (caseStudiesRoutes as unknown as ExpressRouterStack).stack;
    const detailRoute = stack.find((layer) => layer.route?.path === '/:caseStudyId');
    expect(detailRoute).toBeDefined();
    expect(detailRoute?.route?.methods.get).toBe(true);
  });

  it('GET / should have validation middleware', () => {
    const stack = (caseStudiesRoutes as unknown as ExpressRouterStack).stack;
    const rootRoute = stack.find((layer) => layer.route?.path === '/');

    const hasValidate = rootRoute?.route?.stack.some((mw) => mw.name === 'validate');
    expect(hasValidate).toBe(true);
  });

  it('GET /:caseStudyId should NOT have validation middleware', () => {
    const stack = (caseStudiesRoutes as unknown as ExpressRouterStack).stack;
    const detailRoute = stack.find((layer) => layer.route?.path === '/:caseStudyId');

    const hasValidate = detailRoute?.route?.stack.some((mw) => mw.name === 'validate');
    expect(hasValidate).toBe(false);
  });

  it('routes should NOT have authMiddleware', () => {
    const stack = (caseStudiesRoutes as unknown as ExpressRouterStack).stack;

    const allRoutes = stack.filter((layer) => layer.route);
    allRoutes.forEach((route) => {
      const hasAuth = route.route?.stack.some((mw) => mw.name?.includes('auth'));
      expect(hasAuth).toBe(false);
    });
  });
});
