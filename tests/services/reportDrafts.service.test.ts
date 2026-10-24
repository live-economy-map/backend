import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportDraftsService } from '../../src/services/reportDrafts.service.js';
import { prisma } from '../../src/config/db.js';
import * as aiClient from '../../src/utils/aiClient.js';
import * as emailService from '../../src/services/email.service.js';

vi.mock('../../src/config/db.js');
vi.mock('../../src/utils/aiClient.js', () => ({
  generateText: vi.fn(),
}));
vi.mock('../../src/services/email.service.js', () => ({
  sendRequestStatusChangeEmail: vi.fn(),
}));

describe('reportDrafts.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDraft', () => {
    it('throws 404 when request is missing', async () => {
      vi.mocked(prisma.reportRequest.findUnique).mockResolvedValueOnce(null);

      await expect(reportDraftsService.generateDraft('req-404', 'admin-1', {})).rejects.toThrow(
        'Report request not found',
      );
    });

    it('generates an AI draft and transitions request to IN_PROGRESS', async () => {
      vi.mocked(prisma.reportRequest.findUnique).mockResolvedValueOnce({
        id: 'req-1',
        title: 'Bole Expansion Analysis',
        questionPrompt: 'Analyze economic trends',
        areaCellIds: ['cell-1'],
        user: { id: 'u-1', email: 'user@example.com' },
      } as any);

      vi.mocked(prisma.compositeScoreSnapshot.findMany).mockResolvedValueOnce([
        {
          gridCellId: 'cell-1',
          compositeScore: 82.5,
          period: new Date('2026-06-01T00:00:00Z'),
          gridCell: { areaLabel: 'Bole East' },
        },
      ] as any);

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce([
        { name: 'Bole Tech Hub', evidenceDescription: 'Commercial expansion' },
      ] as any);

      vi.mocked(aiClient.generateText).mockResolvedValueOnce(
        '# Executive Summary\nStrong economic growth detected.',
      );
      vi.mocked(prisma.reportDraft.create).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'IN_REVIEW',
      } as any);
      vi.mocked(prisma.reportRequest.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.reportRequestEvent.create).mockResolvedValueOnce({} as any);

      const res = await reportDraftsService.generateDraft('req-1', 'admin-1', {
        customPrompt: 'Focus on infrastructure developments',
      });

      expect(res.id).toBe('draft-1');
      expect(aiClient.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Focus on infrastructure developments'),
      );
      expect(prisma.reportRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'IN_PROGRESS' },
      });
      expect(prisma.reportRequestEvent.create).toHaveBeenCalled();
    });
  });

  describe('updateDraft', () => {
    it('prevents modifying a draft that has already been DELIVERED', async () => {
      vi.mocked(prisma.reportDraft.findUnique).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'DELIVERED',
      } as any);

      await expect(
        reportDraftsService.updateDraft('draft-1', 'admin-1', {
          draftContent: 'New modified content for report draft',
        }),
      ).rejects.toThrow('Delivered drafts cannot be modified');
    });

    it('updates draft content and status when in review', async () => {
      vi.mocked(prisma.reportDraft.findUnique).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'IN_REVIEW',
      } as any);

      vi.mocked(prisma.reportDraft.update).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'APPROVED',
        draftContent: 'Analyst verified content',
      } as any);

      const res = await reportDraftsService.updateDraft('draft-1', 'admin-1', {
        draftContent: 'Analyst verified content',
        status: 'APPROVED',
      });

      expect(res.status).toBe('APPROVED');
      expect(prisma.reportDraft.update).toHaveBeenCalled();
    });
  });

  describe('deliverDraft', () => {
    it('creates deliverable, updates parent request, and emails user', async () => {
      vi.mocked(prisma.reportDraft.findUnique).mockResolvedValueOnce({
        id: 'draft-1',
        requestId: 'req-1',
        status: 'APPROVED',
        draftContent: '# Final Report Content',
        request: {
          title: 'Custom Economic Analysis',
          user: { email: 'client@example.com' },
        },
      } as any);

      vi.mocked(prisma.reportDeliverable.create).mockResolvedValueOnce({
        id: 'del-1',
        fileName: 'Economic-Report-req-1.md',
      } as any);
      vi.mocked(prisma.reportDraft.update).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'DELIVERED',
      } as any);
      vi.mocked(prisma.reportRequest.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.reportRequestEvent.create).mockResolvedValueOnce({} as any);

      const res = await reportDraftsService.deliverDraft('draft-1', 'admin-1', {
        finalNote: 'Report delivered after secondary review',
      });

      expect(res.deliverable.id).toBe('del-1');
      expect(res.draft.status).toBe('DELIVERED');
      expect(prisma.reportRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'DELIVERED' },
      });
      expect(emailService.sendRequestStatusChangeEmail).toHaveBeenCalledWith(
        'client@example.com',
        'Custom Economic Analysis',
        'DELIVERED',
        'Report delivered after secondary review',
      );
    });
  });
});
