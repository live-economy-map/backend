import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  prisma: {
    caseStudy: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    gridCell: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../src/utils/aiClient.js', () => ({
  generateText: vi.fn(),
  generateStructuredOutput: vi.fn(),
}));

import { prisma } from '../../src/config/db.js';
import { generateStructuredOutput } from '../../src/utils/aiClient.js';
import {
  getAllCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  searchCaseStudyCandidates,
} from '../../src/services/adminCaseStudies.service.js';

// vi.mocked(prisma.caseStudy.X) type-checks against the REAL Prisma Client's
// full CaseStudy model (all 15+ fields), regardless of what the mock factory
// above declares. During this stub-only TDD phase our fixtures are
// deliberately partial, so we test through an `any`-typed handle instead of
// fighting Prisma's generated types on every fixture.
const mockPrisma = prisma as any;

const adminId = 'admin-1';

const baseInput = {
  name: 'Bole Rd Expansion',
  latitude: 9.01,
  longitude: 38.78,
  evidenceDescription: 'New commercial signage observed',
  scoreRiseDate: '2026-03-01',
  confirmedDate: '2026-05-01',
};

function notFoundError() {
  return Object.assign(new Error('Record to update/delete does not exist.'), { code: 'P2025' });
}

describe.skip('adminCaseStudies.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllCaseStudies', () => {
    it('returns both published and draft rows when no isPublished filter is given', async () => {
      mockPrisma.caseStudy.findMany.mockResolvedValue([
        { id: '1', isPublished: true },
        { id: '2', isPublished: false },
      ]);
      mockPrisma.caseStudy.count.mockResolvedValue(2);

      await getAllCaseStudies();

      const callArgs = mockPrisma.caseStudy.findMany.mock.calls[0][0] ?? {};
      expect(callArgs.where?.isPublished).toBeUndefined();
    });

    it('applies an isPublished: true filter when requested', async () => {
      mockPrisma.caseStudy.findMany.mockResolvedValue([]);
      mockPrisma.caseStudy.count.mockResolvedValue(0);

      await getAllCaseStudies(true);

      expect(mockPrisma.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) }),
      );
    });

    it('applies an isPublished: false filter when requested', async () => {
      mockPrisma.caseStudy.findMany.mockResolvedValue([]);
      mockPrisma.caseStudy.count.mockResolvedValue(0);

      await getAllCaseStudies(false);

      expect(mockPrisma.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: false }) }),
      );
    });

    it('resolves an empty result, not an error, when there are zero rows', async () => {
      mockPrisma.caseStudy.findMany.mockResolvedValue([]);
      mockPrisma.caseStudy.count.mockResolvedValue(0);

      const result = await getAllCaseStudies();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('createCaseStudy', () => {
    it('resolves dateOrderWarning: false for valid input with no gridCellId and dates in normal order', async () => {
      mockPrisma.caseStudy.create.mockResolvedValue({ id: '1', ...baseInput, isPublished: false });

      const result = await createCaseStudy(baseInput, adminId);

      expect(result.dateOrderWarning).toBe(false);
      expect(result.caseStudy).toBeDefined();
    });

    it('resolves successfully when a provided gridCellId exists', async () => {
      mockPrisma.gridCell.findUnique.mockResolvedValue({ id: 'grid-1' });
      mockPrisma.caseStudy.create.mockResolvedValue({
        id: '1',
        ...baseInput,
        gridCellId: 'grid-1',
        isPublished: false,
      });

      const result = await createCaseStudy({ ...baseInput, gridCellId: 'grid-1' }, adminId);

      expect(result.caseStudy.gridCellId).toBe('grid-1');
    });

    it('throws ApiError(404, "Grid cell not found") when the provided gridCellId does not exist', async () => {
      mockPrisma.gridCell.findUnique.mockResolvedValue(null);

      await expect(
        createCaseStudy({ ...baseInput, gridCellId: 'bad-grid-id' }, adminId),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Grid cell not found' });

      expect(mockPrisma.caseStudy.create).not.toHaveBeenCalled();
    });

    it('treats scoreRiseDate after confirmedDate as a success with dateOrderWarning: true, not a rejection', async () => {
      mockPrisma.caseStudy.create.mockResolvedValue({
        id: '1',
        ...baseInput,
        scoreRiseDate: '2026-06-01',
        confirmedDate: '2026-01-01',
        isPublished: false,
      });

      const result = await createCaseStudy(
        { ...baseInput, scoreRiseDate: '2026-06-01', confirmedDate: '2026-01-01' },
        adminId,
      );

      expect(result.dateOrderWarning).toBe(true);
      expect(result.caseStudy.scoreRiseDate).toBe('2026-06-01');
      expect(result.caseStudy.confirmedDate).toBe('2026-01-01');
    });

    it('defaults isPublished to false when omitted from input', async () => {
      mockPrisma.caseStudy.create.mockResolvedValue({ id: '1', ...baseInput, isPublished: false });

      await createCaseStudy(baseInput, adminId);

      const createArgs = mockPrisma.caseStudy.create.mock.calls[0][0];
      expect(createArgs.data.isPublished).toBe(false);
    });

    it('records createdById on the create payload', async () => {
      mockPrisma.caseStudy.create.mockResolvedValue({ id: '1', ...baseInput, isPublished: false });

      await createCaseStudy(baseInput, adminId);

      const createArgs = mockPrisma.caseStudy.create.mock.calls[0][0];
      expect(createArgs.data.createdById).toBe(adminId);
    });
  });

  describe('updateCaseStudy', () => {
    it('resolves dateOrderWarning: false on a valid partial update', async () => {
      mockPrisma.caseStudy.update.mockResolvedValue({
        id: '1',
        ...baseInput,
        evidenceUrl: 'https://example.com/article',
      });

      const result = await updateCaseStudy('1', { evidenceUrl: 'https://example.com/article' });

      expect(result.dateOrderWarning).toBe(false);
    });

    it('throws ApiError(404, "Case study not found") when the case study does not exist', async () => {
      mockPrisma.caseStudy.update.mockRejectedValue(notFoundError());

      await expect(
        updateCaseStudy('bad-id', { evidenceUrl: 'https://example.com' }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Case study not found' });
    });

    it('publishes a draft via isPublished: true — same function used for publishing', async () => {
      mockPrisma.caseStudy.update.mockResolvedValue({ id: '1', ...baseInput, isPublished: true });

      const result = await updateCaseStudy('1', { isPublished: true });

      expect(result.caseStudy.isPublished).toBe(true);
    });

    it('re-evaluates dateOrderWarning against the resulting merged record, not just the request fields', async () => {
      mockPrisma.caseStudy.update.mockResolvedValue({
        id: '1',
        ...baseInput,
        scoreRiseDate: '2026-06-01',
        confirmedDate: '2026-01-01',
        evidenceUrl: 'https://example.com/new-article',
      });

      const result = await updateCaseStudy('1', { evidenceUrl: 'https://example.com/new-article' });

      expect(result.dateOrderWarning).toBe(true);
    });

    it('throws ApiError(404, "Grid cell not found") when an updated gridCellId does not exist', async () => {
      mockPrisma.gridCell.findUnique.mockResolvedValue(null);

      await expect(updateCaseStudy('1', { gridCellId: 'bad-grid-id' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'Grid cell not found',
      });
    });
  });

  describe('deleteCaseStudy', () => {
    it('deletes an existing case study by id', async () => {
      mockPrisma.caseStudy.delete.mockResolvedValue({ id: '1' });

      await deleteCaseStudy('1');

      expect(mockPrisma.caseStudy.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } }),
      );
    });

    it('throws ApiError(404, "Case study not found") when the case study does not exist', async () => {
      mockPrisma.caseStudy.delete.mockRejectedValue(notFoundError());

      await expect(deleteCaseStudy('bad-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Case study not found',
      });
    });

    it('performs a genuine hard delete — never prisma.caseStudy.update as a soft-delete substitute', async () => {
      mockPrisma.caseStudy.delete.mockResolvedValue({ id: '1' });

      await deleteCaseStudy('1');

      expect(mockPrisma.caseStudy.delete).toHaveBeenCalled();
      expect(mockPrisma.caseStudy.update).not.toHaveBeenCalled();
    });
  });

  describe('searchCaseStudyCandidates', () => {
    it('resolves candidates shaped per API spec 6.2 on a successful search', async () => {
      vi.mocked(generateStructuredOutput).mockResolvedValue({
        candidates: [
          {
            summary: 'New retail complex under construction',
            sourceUrl: 'https://example.com/article',
            suggestedEvidenceTier: 'LOCAL_NEWS',
            mentionedDate: '2026-07-20',
          },
        ],
      });

      const result = await searchCaseStudyCandidates('Ayat');

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]).toMatchObject({
        summary: expect.any(String),
        sourceUrl: expect.any(String),
        suggestedEvidenceTier: expect.any(String),
        mentionedDate: expect.any(String),
      });
    });

    it('resolves an empty candidates array — not an error — when nothing relevant is found', async () => {
      vi.mocked(generateStructuredOutput).mockResolvedValue({ candidates: [] });

      const result = await searchCaseStudyCandidates('An obscure area');

      expect(result.candidates).toEqual([]);
    });

    it('throws ApiError(400, "Discovery search is temporarily unavailable") when the AI/search service is unreachable', async () => {
      vi.mocked(generateStructuredOutput).mockRejectedValue(new Error('connection refused'));

      await expect(searchCaseStudyCandidates('Ayat')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Discovery search is temporarily unavailable',
      });
    });

    it('never calls any prisma.caseStudy write method — regression guard against auto-publish', async () => {
      vi.mocked(generateStructuredOutput).mockResolvedValue({
        candidates: [
          {
            summary: 'A',
            sourceUrl: 'https://example.com/a',
            suggestedEvidenceTier: 'LOCAL_NEWS',
            mentionedDate: '2026-07-20',
          },
        ],
      });

      await searchCaseStudyCandidates('Ayat');

      expect(mockPrisma.caseStudy.create).not.toHaveBeenCalled();
      expect(mockPrisma.caseStudy.update).not.toHaveBeenCalled();
      expect(mockPrisma.caseStudy.delete).not.toHaveBeenCalled();
      expect(mockPrisma.caseStudy.upsert).not.toHaveBeenCalled();
    });

    it('resolves an empty candidates array, not a fabricated one, when the AI returns null/malformed output', async () => {
      vi.mocked(generateStructuredOutput).mockResolvedValue(null);

      const result = await searchCaseStudyCandidates('Ayat');

      expect(result.candidates).toEqual([]);
    });
  });
});
