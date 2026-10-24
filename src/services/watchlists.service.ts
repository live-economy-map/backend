import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { CreateWatchlistInput, AddWatchlistItemInput } from '../schemas/watchlists.schema.js';

export class WatchlistsService {
  /**
   * Create a new watchlist portfolio of grid cells.
   */
  async createWatchlist(userId: string, input: CreateWatchlistInput) {
    if (input.orgId) {
      const membership = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId: input.orgId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not a member of the specified organization');
      }
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        userId,
        orgId: input.orgId,
        name: input.name,
        description: input.description,
        items:
          input.cellIds && input.cellIds.length > 0
            ? {
                createMany: {
                  data: input.cellIds.map((gridCellId) => ({ gridCellId })),
                },
              }
            : undefined,
      },
      include: {
        _count: { select: { items: true } },
      },
    });

    return watchlist;
  }

  /**
   * List watchlists for user or organization.
   */
  async listUserWatchlists(userId: string, orgId?: string) {
    const where: any = orgId ? { orgId } : { userId };

    return prisma.watchlist.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single watchlist with member cells and latest activity scores.
   */
  async getWatchlist(userId: string, watchlistId: string) {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
      include: {
        items: {
          include: {
            gridCell: true,
          },
          orderBy: { addedAt: 'desc' },
        },
        organization: true,
      },
    });

    if (!watchlist) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Watchlist not found');
    }

    if (watchlist.userId !== userId && watchlist.orgId) {
      const membership = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId: watchlist.orgId,
            userId,
          },
        },
      });
      if (!membership) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied to this organization watchlist');
      }
    } else if (watchlist.userId !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied to this watchlist');
    }

    // Attach latest snapshot scores for each monitored cell
    const cellIds = watchlist.items.map((i) => i.gridCellId);
    const snapshots = await prisma.compositeScoreSnapshot.findMany({
      where: { gridCellId: { in: cellIds } },
      orderBy: { period: 'desc' },
    });

    // Map latest score per cell
    const latestScoreMap = new Map<string, number>();
    for (const snap of snapshots) {
      if (!latestScoreMap.has(snap.gridCellId)) {
        latestScoreMap.set(snap.gridCellId, snap.compositeScore);
      }
    }

    const itemsWithScores = watchlist.items.map((item) => ({
      ...item,
      currentCompositeScore: latestScoreMap.get(item.gridCellId) ?? null,
    }));

    return {
      ...watchlist,
      items: itemsWithScores,
    };
  }

  /**
   * Add a cell to watchlist.
   */
  async addItem(userId: string, watchlistId: string, input: AddWatchlistItemInput) {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!watchlist) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied to modify this watchlist');
    }

    const cell = await prisma.gridCell.findUnique({
      where: { id: input.gridCellId },
    });

    if (!cell) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
    }

    return prisma.watchlistItem.upsert({
      where: {
        watchlistId_gridCellId: {
          watchlistId,
          gridCellId: input.gridCellId,
        },
      },
      create: {
        watchlistId,
        gridCellId: input.gridCellId,
        notes: input.notes,
      },
      update: {
        notes: input.notes,
      },
      include: {
        gridCell: true,
      },
    });
  }

  /**
   * Remove cell from watchlist.
   */
  async removeItem(userId: string, watchlistId: string, gridCellId: string) {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!watchlist || watchlist.userId !== userId) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Watchlist not found or access denied');
    }

    await prisma.watchlistItem.delete({
      where: {
        watchlistId_gridCellId: {
          watchlistId,
          gridCellId,
        },
      },
    });

    return { removed: true };
  }
}

export const watchlistsService = new WatchlistsService();
