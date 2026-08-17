import { vi } from 'vitest';

export const prisma = {
  caseStudy: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  dataSource: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  pipelineRun: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  gridCell: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  signalValue: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  compositeScoreSnapshot: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  scoreWeightConfig: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  admin: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};
