import { describe, it, expect, vi, beforeEach } from 'vitest';

// Per project memory/established convention: mock the db module path directly
// (vi.mock('../../src/config/db.js')), not '@/lib/prisma' — the '@/' alias has
// no tsconfig 'paths' entry in this scaffold.
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

// Per 09-test-file-specification/backend/9-1-shared-config.md's assumed aiClient
// interface: generateStructuredOutput<T>(prompt, schemaHint): Promise<T | null>
vi.mock('../../src/utils/aiClient.js', () => ({
  generateText: vi.fn(),
  generateStructuredOutput: vi.fn(),
}));

import { prisma } from '../../src/config/db.js';
import * as aiClient from '../../src/utils/aiClient.js';
import {
  getAllCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  searchCaseStudyCandidates,
} from '../../src/services/adminCaseStudies.service.js';

const adminId = 'admin-1';

const baseInput = {
  name: 'Bole Rd Expansion',
  latitude: 9.01,
  longitude: 38.78,
  evidenceDescription: 'New commercial signage observed',
  scoreRiseDate: '2026-03-01',
  confirmedDate: '2026-05-01',
};

// Simulates Prisma's "record not found" rejection shape (P2025) for update/delete
function notFoundError() {
  return Object.assign(new Error('Record to update/delete does not exist.'), { code: 'P2025' });
}

// TDD STATUS: SKIPPED — src/services/adminCaseStudies.service.ts does not exist yet.
// Once the service file is implemented per 8-7-case-study-curation.md, change
// `describe.skip` below to `describe` to activate this suite.
describe.skip('adminCaseStudies.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllCaseStudies', () => {
    it('returns both published and draft rows when no isPublished filter is given', async () => {
      prisma.caseStudy.findMany.mockResolvedValue([
        { id: '1', isPublished: true },
        { id: '2', isPublished: false },
      ]);
      prisma.caseStudy.count.mockResolvedValue(2);

      await getAllCaseStudies();

      const callArgs = prisma.caseStudy.findMany.mock.calls[0][0] ?? {};
      // Distinct from the public caseStudies.service, which always forces isPublished: true (Doc 9-3)
      expect(callArgs.where?.isPublished).toBeUndefined();
    });

    it('applies an isPublished: true filter when requested', async () => {
      prisma.caseStudy.findMany.mockResolvedValue([]);
      prisma.caseStudy.count.mockResolvedValue(0);

      await getAllCaseStudies(true);

      expect(prisma.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) }),
      );
    });

    it('applies an isPublished: false filter when requested', async () => {
      prisma.caseStudy.findMany.mockResolvedValue([]);
      prisma.caseStudy.count.mockResolvedValue(0);

      await getAllCaseStudies(false);

      expect(prisma.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: false }) }),
      );
    });

    it('resolves an empty result, not an error, when there are zero rows', async () => {
      prisma.caseStudy.findMany.mockResolvedValue([]);
      prisma.caseStudy.count.mockResolvedValue(0);

      const result = await getAllCaseStudies();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('createCaseStudy', () => {
    it('resolves dateOrderWarning: false for valid input with no gridCellId and dates in normal order', async () => {
      prisma.caseStudy.create.mockResolvedValue({ id: '1', ...baseInput, isPublished: false });

      const result = await createCaseStudy(baseInput, adminId);

      expect(result.dateOrderWarning).toBe(false);
      expect(result.caseStudy).toBeDefined();
    });

    it('resolves successfully when a provided gridCellId exists', async () => {
      prisma.gridCell.findUnique.mockResolvedValue({ id: 'grid-1' });
      prisma.caseStudy.create.mockResolvedValue({
        id: '1',
        ...baseInput,
        gridCellId: 'grid-1',
        isPublished: false,
      });

      const result = await createCaseStudy({ ...baseInput, gridCellId: 'grid-1' }, adminId);

      expect(result.caseStudy.gridCellId).toBe('grid-1');
    });

    it('throws ApiError(404, "Grid cell not found") when the provided gridCellId does not exist', async () => {
      prisma.gridCell.findUnique.mockResolvedValue(null);

      await expect(
        createCaseStudy({ ...baseInput, gridCellId: 'bad-grid-id' }, adminId),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Grid cell not found' });

      expect(prisma.caseStudy.create).not.toHaveBeenCalled();
    });

    it('treats scoreRiseDate after confirmedDate as a success with dateOrderWarning: true, not a rejection', async () => {
      prisma.caseStudy.create.mockResolvedValue({
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
      // the unusual dates are stored as-is, not silently corrected
      expect(result.caseStudy.scoreRiseDate).toBe('2026-06-01');
      expect(result.caseStudy.confirmedDate).toBe('2026-01-01');
    });

    it('defaults isPublished to false when omitted from input', async () => {
      prisma.caseStudy.create.mockResolvedValue({ id: '1', ...baseInput, isPublished: false });

      await createCaseStudy(baseInput, adminId);

      const createArgs = prisma.caseStudy.create.mock.calls[0][0];
      expect(createArgs.data.isPublished).toBe(false);
    });

    it('records createdById on the create payload', async () => {
      prisma.caseStudy.create.mockResolvedValue({ id: '1', ...baseInput, isPublished: false });

      await createCaseStudy(baseInput, adminId);

      const createArgs = prisma.caseStudy.create.mock.calls[0][0];
      expect(createArgs.data.createdById).toBe(adminId);
    });
  });

  describe('updateCaseStudy', () => {
    it('resolves dateOrderWarning: false on a valid partial update', async () => {
      prisma.caseStudy.update.mockResolvedValue({
        id: '1',
        ...baseInput,
        evidenceUrl: 'https://example.com/article',
      });

      const result = await updateCaseStudy('1', { evidenceUrl: 'https://example.com/article' });

      expect(result.dateOrderWarning).toBe(false);
    });

    it('throws ApiError(404, "Case study not found") when the case study does not exist', async () => {
      prisma.caseStudy.update.mockRejectedValue(notFoundError());

      await expect(
        updateCaseStudy('bad-id', { evidenceUrl: 'https://example.com' }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Case study not found' });
    });

    it('publishes a draft via isPublished: true — same function used for publishing', async () => {
      prisma.caseStudy.update.mockResolvedValue({ id: '1', ...baseInput, isPublished: true });

      const result = await updateCaseStudy('1', { isPublished: true });

      expect(result.caseStudy.isPublished).toBe(true);
    });

    it('re-evaluates dateOrderWarning against the resulting merged record, not just the request fields', async () => {
      // existing row already has scoreRiseDate after confirmedDate; this request only
      // touches evidenceUrl, but the warning must still fire on the merged record
      prisma.caseStudy.update.mockResolvedValue({
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
      prisma.gridCell.findUnique.mockResolvedValue(null);

      await expect(updateCaseStudy('1', { gridCellId: 'bad-grid-id' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'Grid cell not found',
      });
    });
  });

  describe('deleteCaseStudy', () => {
    it('deletes an existing case study by id', async () => {
      prisma.caseStudy.delete.mockResolvedValue({ id: '1' });

      await deleteCaseStudy('1');

      expect(prisma.caseStudy.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } }),
      );
    });

    it('throws ApiError(404, "Case study not found") when the case study does not exist', async () => {
      prisma.caseStudy.delete.mockRejectedValue(notFoundError());

      await expect(deleteCaseStudy('bad-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Case study not found',
      });
    });

    it('performs a genuine hard delete — never prisma.caseStudy.update as a soft-delete substitute', async () => {
      prisma.caseStudy.delete.mockResolvedValue({ id: '1' });

      await deleteCaseStudy('1');

      expect(prisma.caseStudy.delete).toHaveBeenCalled();
      expect(prisma.caseStudy.update).not.toHaveBeenCalled();
    });
  });

  describe('searchCaseStudyCandidates', () => {
    it('resolves candidates shaped per API spec 6.2 on a successful search', async () => {
      aiClient.generateStructuredOutput.mockResolvedValue({
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
      aiClient.generateStructuredOutput.mockResolvedValue({ candidates: [] });

      const result = await searchCaseStudyCandidates('An obscure area');

      expect(result.candidates).toEqual([]);
    });

    it('throws ApiError(400, "Discovery search is temporarily unavailable") when the AI/search service is unreachable', async () => {
      aiClient.generateStructuredOutput.mockRejectedValue(new Error('connection refused'));

      await expect(searchCaseStudyCandidates('Ayat')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Discovery search is temporarily unavailable',
      });
    });

    it('never calls any prisma.caseStudy write method — regression guard against auto-publish', async () => {
      aiClient.generateStructuredOutput.mockResolvedValue({
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

      expect(prisma.caseStudy.create).not.toHaveBeenCalled();
      expect(prisma.caseStudy.update).not.toHaveBeenCalled();
      expect(prisma.caseStudy.delete).not.toHaveBeenCalled();
      expect(prisma.caseStudy.upsert).not.toHaveBeenCalled();
    });

    it('resolves an empty candidates array, not a fabricated one, when the AI returns null/malformed output', async () => {
      aiClient.generateStructuredOutput.mockResolvedValue(null);

      const result = await searchCaseStudyCandidates('Ayat');

      expect(result.candidates).toEqual([]);
    });
  });
});
