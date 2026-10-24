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

  // Resolve phone number and telegram handle, defaulting to user profile if not passed
  let phoneNumber = input.phoneNumber;
  let telegramHandle = input.telegramHandle;

  if (!phoneNumber || !telegramHandle) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true, telegramHandle: true },
    });
    if (user) {
      if (!phoneNumber && user.phoneNumber) phoneNumber = user.phoneNumber;
      if (!telegramHandle && user.telegramHandle) telegramHandle = user.telegramHandle;
    }
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
      phoneNumber,
      telegramHandle,
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
          phoneNumber: true,
          telegramHandle: true,
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

  if (query.search) {
    const search = query.search;
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { questionPrompt: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { areaCellIds: { array_contains: search } },
    ];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.reportRequest.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            organizationName: true,
            phoneNumber: true,
            telegramHandle: true,
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
        events: {
          orderBy: { createdAt: 'desc' },
        },
        drafts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.reportRequest.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      draft: item.drafts?.[0] || null,
    })),
    page,
    limit,
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
        ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
        ...(input.telegramHandle !== undefined ? { telegramHandle: input.telegramHandle } : {}),
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
    distinctUsers: distinctUsersCount,
    distinctUsersCount,
    targetRequests: 10,
    targetUsers: 5,
    gateStatus: isGateMet ? 'PASSED' : 'PENDING',
    gateThreshold: {
      minDistinctUsers: 5,
      minTotalRequests: 10,
    },
    isGateMet,
    statusBreakdown: formattedStatusBreakdown,
  };
};
