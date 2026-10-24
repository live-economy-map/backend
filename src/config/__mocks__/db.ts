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
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  },
  emailToken: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  savedArea: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  reportRequest: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  reportRequestEvent: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  reportDeliverable: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};
