import { describe, it, expect, vi, beforeEach } from 'vitest';
import { watchlistsService } from '../../src/services/watchlists.service.js';
import { prisma } from '../../src/config/db.js';

vi.mock('../../src/config/db.js');

describe('watchlists.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWatchlist', () => {
    it('creates a watchlist for user', async () => {
      vi.mocked(prisma.watchlist.create).mockResolvedValueOnce({
        id: 'wl-1',
        name: 'Prime Retail Hubs',
        userId: 'u-1',
        _count: { items: 0 },
      } as any);

      const res = await watchlistsService.createWatchlist('u-1', {
        name: 'Prime Retail Hubs',
      });

      expect(res.id).toBe('wl-1');
      expect(prisma.watchlist.create).toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('throws 404 if grid cell does not exist', async () => {
      vi.mocked(prisma.watchlist.findUnique).mockResolvedValueOnce({
        id: 'wl-1',
        userId: 'u-1',
      } as any);
      vi.mocked(prisma.gridCell.findUnique).mockResolvedValueOnce(null);

      await expect(
        watchlistsService.addItem('u-1', 'wl-1', {
          gridCellId: 'cell-404',
        }),
      ).rejects.toThrow('Grid cell not found');
    });

    it('adds item to watchlist successfully', async () => {
      vi.mocked(prisma.watchlist.findUnique).mockResolvedValueOnce({
        id: 'wl-1',
        userId: 'u-1',
      } as any);
      vi.mocked(prisma.gridCell.findUnique).mockResolvedValueOnce({
        id: 'cell-1',
      } as any);
      vi.mocked(prisma.watchlistItem.upsert).mockResolvedValueOnce({
        id: 'item-1',
        watchlistId: 'wl-1',
        gridCellId: 'cell-1',
        notes: 'Monitored for quarterly retail surge',
      } as any);

      const res = await watchlistsService.addItem('u-1', 'wl-1', {
        gridCellId: 'cell-1',
        notes: 'Monitored for quarterly retail surge',
      });

      expect(res.gridCellId).toBe('cell-1');
      expect(prisma.watchlistItem.upsert).toHaveBeenCalled();
    });
  });
});
