import { describe, it, expect } from 'vitest';
import caseStudiesRoutes from '../../src/routes/caseStudies.routes.js';

// Proper type for Express router layer structure
interface RouterLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

interface CaseStudiesRouter {
  stack: RouterLayer[];
}

describe('caseStudies.routes', () => {
  it('should be a valid Express router', () => {
    expect(caseStudiesRoutes).toBeDefined();
    expect(caseStudiesRoutes).toHaveProperty('get');
  });

  it('should register GET / route', () => {
    const stack = (caseStudiesRoutes as unknown as CaseStudiesRouter).stack;
    const rootRoute = stack.find((layer) => layer.route?.path === '/');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.route?.methods.get).toBe(true);
  });

  it('should register GET /:caseStudyId route', () => {
    const stack = (caseStudiesRoutes as unknown as CaseStudiesRouter).stack;
    const detailRoute = stack.find((layer) => layer.route?.path === '/:caseStudyId');
    expect(detailRoute).toBeDefined();
    expect(detailRoute?.route?.methods.get).toBe(true);
  });
});
