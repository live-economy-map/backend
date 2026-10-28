import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  prisma: {
    gridCell: {
      findUnique: vi.fn(),
    },
    savedArea: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/db.js';
import {
  listSavedAreas,
  createSavedArea,
  updateSavedArea,
  deleteSavedArea,
} from '../../src/services/savedAreas.service.js';
import ApiError from '../../src/utils/ApiError.js';

const mockPrisma = prisma as any;

describe('savedAreas.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSavedAreas', () => {
    it('returns all saved areas for the specified user', async () => {
      const mockRows = [
        {
          id: 'area-1',
          userId: 'user-1',
          gridCellId: 'cell-1',
          customName: 'My Area',
          gridCell: { id: 'cell-1', centroidLat: 9.0, centroidLng: 38.7 },
        },
      ];
      mockPrisma.savedArea.findMany.mockResolvedValue(mockRows);

      const result = await listSavedAreas('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].customName).toBe('My Area');
      expect(mockPrisma.savedArea.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createSavedArea', () => {
    it('creates a saved area bookmark when cell exists and not already saved', async () => {
      mockPrisma.gridCell.findUnique.mockResolvedValue({ id: 'cell-1' });
      mockPrisma.savedArea.findUnique.mockResolvedValue(null);
      mockPrisma.savedArea.create.mockResolvedValue({
        id: 'area-1',
        userId: 'user-1',
        gridCellId: 'cell-1',
        customName: 'Custom',
      });

      const result = await createSavedArea('user-1', {
        gridCellId: 'cell-1',
        customName: 'Custom',
      });

      expect(result.id).toBe('area-1');
      expect(mockPrisma.savedArea.create).toHaveBeenCalled();
    });

    it('throws 404 when grid cell does not exist', async () => {
      mockPrisma.gridCell.findUnique.mockResolvedValue(null);

      await expect(createSavedArea('user-1', { gridCellId: 'non-existent' })).rejects.toThrow(
        ApiError,
      );
    });

    it('throws 409 when cell is already saved by user', async () => {
      mockPrisma.gridCell.findUnique.mockResolvedValue({ id: 'cell-1' });
      mockPrisma.savedArea.findUnique.mockResolvedValue({ id: 'existing-area' });

      await expect(createSavedArea('user-1', { gridCellId: 'cell-1' })).rejects.toThrow(ApiError);
    });
  });

  describe('updateSavedArea', () => {
    it('updates bookmark if caller is the owner', async () => {
      mockPrisma.savedArea.findUnique.mockResolvedValue({
        id: 'area-1',
        userId: 'user-1',
        customName: 'Old',
      });
      mockPrisma.savedArea.update.mockResolvedValue({
        id: 'area-1',
        userId: 'user-1',
        customName: 'New',
      });

      const result = await updateSavedArea('user-1', 'area-1', {
        customName: 'New',
      });

      expect(result.customName).toBe('New');
    });

    it('throws 403 when user is not the owner', async () => {
      mockPrisma.savedArea.findUnique.mockResolvedValue({
        id: 'area-1',
        userId: 'user-different',
      });

      await expect(updateSavedArea('user-1', 'area-1', { customName: 'New' })).rejects.toThrow(
        ApiError,
      );
    });

    it('throws 404 if bookmark does not exist', async () => {
      mockPrisma.savedArea.findUnique.mockResolvedValue(null);

      await expect(
        updateSavedArea('user-1', 'non-existent', { customName: 'New' }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('deleteSavedArea', () => {
    it('deletes bookmark if user is the owner', async () => {
      mockPrisma.savedArea.findUnique.mockResolvedValue({
        id: 'area-1',
        userId: 'user-1',
      });
      mockPrisma.savedArea.delete.mockResolvedValue({});

      const result = await deleteSavedArea('user-1', 'area-1');
      expect(result.message).toBe('Saved area deleted successfully');
      expect(mockPrisma.savedArea.delete).toHaveBeenCalledWith({
        where: { id: 'area-1' },
      });
    });

    it('throws 403 if user is not the owner', async () => {
      mockPrisma.savedArea.findUnique.mockResolvedValue({
        id: 'area-1',
        userId: 'another-user',
      });

      await expect(deleteSavedArea('user-1', 'area-1')).rejects.toThrow(ApiError);
    });
  });
});
