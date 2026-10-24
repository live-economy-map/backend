import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  CreateReportRequestInput,
  AdminUpdateReportRequestInput,
  AdminUploadDeliverableInput,
  AdminReportRequestsQuery,
} from '../schemas/reportRequests.schema.js';
import { sendRequestStatusChangeEmail } from './email.service.js';

export const createReportRequest = async (userId: string, input: CreateReportRequestInput) => {
  // Validate that all specified cell IDs exist
  const existingCells = await prisma.gridCell.findMany({
    where: { id: { in: input.areaCellIds } },
    select: { id: true },
  });

  if (existingCells.length !== input.areaCellIds.length) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'One or more selected grid cells could not be found',
    );
  }

  // Create report request with initial SUBMITTED event
  const createdRequest = await prisma.reportRequest.create({
    data: {
      userId,
      title: input.title,
      questionPrompt: input.questionPrompt,
      areaCellIds: input.areaCellIds,
      orgType: input.orgType,
      contactPreference: input.contactPreference,
      status: 'SUBMITTED',
      events: {
        create: {
          actorId: userId,
          previousStatus: null,
          newStatus: 'SUBMITTED',
          note: 'Report request submitted by user',
        },
      },
    },
    include: {
      events: true,
      deliverables: true,
    },
  });

  return createdRequest;
};

export const listUserReportRequests = async (userId: string) => {
  const requests = await prisma.reportRequest.findMany({
    where: { userId },
    include: {
      deliverables: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSizeBytes: true,
          mimeType: true,
          createdAt: true,
        },
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests;
};

export const getUserReportRequest = async (
  userId: string,
  requestId: string,
  role: 'USER' | 'ADMIN',
) => {
  const request = await prisma.reportRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          organizationName: true,
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      deliverables: {
        orderBy: { createdAt: 'desc' },
      },
      events: {
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!request) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Report request not found');
  }

  if (role !== 'ADMIN' && request.userId !== userId) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not authorized to view this request');
  }

  return request;
};

export const adminListReportRequests = async (query: AdminReportRequestsQuery) => {
  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }
  if (query.priority !== undefined) {
    where.priority = query.priority;
  }
  if (query.assignedAdminId) {
    where.assignedAdminId = query.assignedAdminId;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.reportRequest.findMany({
      where,
      skip,
      take: query.limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            organizationName: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        deliverables: {
          select: { id: true, fileName: true, fileUrl: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.reportRequest.count({ where }),
  ]);

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
  };
};

export const adminUpdateReportRequest = async (
  adminId: string,
  requestId: string,
  input: AdminUpdateReportRequestInput,
) => {
  const request = await prisma.reportRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!request) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Report request not found');
  }

  const isStatusChanging = input.status && input.status !== request.status;

  const updatedRequest = await prisma.$transaction(async (tx) => {
    if (isStatusChanging) {
      await tx.reportRequestEvent.create({
        data: {
          requestId,
          actorId: adminId,
          previousStatus: request.status,
          newStatus: input.status!,
          note: input.statusChangeNote || `Status changed to ${input.status}`,
        },
      });
    }

    return tx.reportRequest.update({
      where: { id: requestId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assignedAdminId !== undefined ? { assignedAdminId: input.assignedAdminId } : {}),
        ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      },
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
        deliverables: true,
      },
    });
  });

  if (isStatusChanging) {
    sendRequestStatusChangeEmail(
      request.user.email,
      request.title,
      input.status!,
      input.statusChangeNote,
    ).catch(() => {});
  }

  return updatedRequest;
};

export const adminAttachDeliverable = async (
  adminId: string,
  requestId: string,
  deliverableInput: AdminUploadDeliverableInput,
) => {
  const request = await prisma.reportRequest.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!request) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Report request not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const deliverable = await tx.reportDeliverable.create({
      data: {
        requestId,
        fileUrl: deliverableInput.fileUrl,
        fileName: deliverableInput.fileName,
        fileSizeBytes: deliverableInput.fileSizeBytes,
        mimeType: deliverableInput.mimeType,
        uploadedById: adminId,
      },
    });

    const previousStatus = request.status;
    const newStatus = 'DELIVERED';

    await tx.reportRequestEvent.create({
      data: {
        requestId,
        actorId: adminId,
        previousStatus,
        newStatus,
        note: `Deliverable uploaded: ${deliverableInput.fileName}`,
      },
    });

    await tx.reportRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    return deliverable;
  });

  sendRequestStatusChangeEmail(
    request.user.email,
    request.title,
    'DELIVERED',
    `Your deliverable "${deliverableInput.fileName}" is ready for download.`,
  ).catch(() => {});

  return result;
};

export const getDemandMetrics = async () => {
  const [totalRequests, distinctUserGroups, statusBreakdown] = await Promise.all([
    prisma.reportRequest.count(),
    prisma.reportRequest.groupBy({
      by: ['userId'],
      where: {
        user: {
          role: 'USER',
        },
      },
      _count: { id: true },
    }),
    prisma.reportRequest.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  const distinctUsersCount = distinctUserGroups.length;
  const isGateMet = distinctUsersCount >= 5 && totalRequests >= 10;

  const formattedStatusBreakdown = statusBreakdown.reduce(
    (acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalRequests,
    distinctUsersCount,
    statusBreakdown: formattedStatusBreakdown,
    gateThreshold: {
      minDistinctUsers: 5,
      minTotalRequests: 10,
    },
    isGateMet,
  };
};
