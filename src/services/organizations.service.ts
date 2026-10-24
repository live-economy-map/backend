import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { CreateOrgInput, AddMemberInput } from '../schemas/organizations.schema.js';

export class OrganizationsService {
  /**
   * Create a new organization and assign creator as OWNER.
   */
  async createOrganization(userId: string, input: CreateOrgInput) {
    const existing = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Organization with slug '${input.slug}' already exists`,
      );
    }

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });

    return org;
  }

  /**
   * List organizations where user is a member.
   */
  async getUserOrganizations(userId: string) {
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true, apiKeys: true, watchlists: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Get organization details and member roster.
   */
  async getOrganization(orgId: string, userId: string) {
    const membership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied: not a member of this organization');
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            tier: true,
            rateLimitRpm: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!org) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Organization not found');
    }

    return {
      ...org,
      currentUserRole: membership.role,
    };
  }

  /**
   * Add a member to organization with specified role.
   */
  async addMember(orgId: string, actorId: string, input: AddMemberInput) {
    const actorMembership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: actorId,
        },
      },
    });

    if (
      !actorMembership ||
      (actorMembership.role !== 'OWNER' && actorMembership.role !== 'ADMIN')
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Only organization owners and admins can invite new members',
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User to add not found');
    }

    const member = await prisma.orgMember.upsert({
      where: {
        orgId_userId: {
          orgId,
          userId: input.userId,
        },
      },
      create: {
        orgId,
        userId: input.userId,
        role: input.role,
      },
      update: {
        role: input.role,
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    });

    return member;
  }

  /**
   * Remove member from organization.
   */
  async removeMember(orgId: string, actorId: string, targetUserId: string) {
    const actorMembership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: actorId,
        },
      },
    });

    if (
      !actorMembership ||
      (actorMembership.role !== 'OWNER' && actorMembership.role !== 'ADMIN')
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Only organization owners and admins can remove members',
      );
    }

    if (actorId === targetUserId && actorMembership.role === 'OWNER') {
      const ownerCount = await prisma.orgMember.count({
        where: { orgId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot leave: you are the sole owner');
      }
    }

    await prisma.orgMember.delete({
      where: {
        orgId_userId: {
          orgId,
          userId: targetUserId,
        },
      },
    });

    return { removed: true };
  }
}

export const organizationsService = new OrganizationsService();
