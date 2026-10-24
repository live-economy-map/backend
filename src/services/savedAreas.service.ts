import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { CreateSavedAreaInput, UpdateSavedAreaInput } from '../schemas/savedAreas.schema.js';

export const listSavedAreas = async (userId: string) => {
  const savedAreas = await prisma.savedArea.findMany({
    where: { userId },
    include: {
      gridCell: {
        select: {
          id: true,
          cellRow: true,
          cellCol: true,
          centroidLat: true,
          centroidLng: true,
          areaLabel: true,
          boundaryGeoJson: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return savedAreas;
};

export const createSavedArea = async (userId: string, input: CreateSavedAreaInput) => {
  const cell = await prisma.gridCell.findUnique({
    where: { id: input.gridCellId },
  });

  if (!cell) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
  }

  const existing = await prisma.savedArea.findUnique({
    where: {
      userId_gridCellId: {
        userId,
        gridCellId: input.gridCellId,
      },
    },
  });

  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'This grid cell is already saved to your bookmarks');
  }

  const savedArea = await prisma.savedArea.create({
    data: {
      userId,
      gridCellId: input.gridCellId,
      customName: input.customName,
      notes: input.notes,
    },
    include: {
      gridCell: {
        select: {
          id: true,
          cellRow: true,
          cellCol: true,
          centroidLat: true,
          centroidLng: true,
          areaLabel: true,
          boundaryGeoJson: true,
        },
      },
    },
  });

  return savedArea;
};

export const updateSavedArea = async (userId: string, id: string, input: UpdateSavedAreaInput) => {
  const existing = await prisma.savedArea.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Saved area bookmark not found');
  }

  if (existing.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not authorized to update this bookmark');
  }

  const updated = await prisma.savedArea.update({
    where: { id },
    data: {
      ...(input.customName !== undefined ? { customName: input.customName } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: {
      gridCell: {
        select: {
          id: true,
          cellRow: true,
          cellCol: true,
          centroidLat: true,
          centroidLng: true,
          areaLabel: true,
          boundaryGeoJson: true,
        },
      },
    },
  });

  return updated;
};

export const deleteSavedArea = async (userId: string, id: string) => {
  const existing = await prisma.savedArea.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Saved area bookmark not found');
  }

  if (existing.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not authorized to delete this bookmark');
  }

  await prisma.savedArea.delete({
    where: { id },
  });

  return { message: 'Saved area deleted successfully' };
};
