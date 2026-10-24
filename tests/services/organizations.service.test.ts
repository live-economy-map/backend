import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizationsService } from '../../src/services/organizations.service.js';
import { prisma } from '../../src/config/db.js';

vi.mock('../../src/config/db.js');

describe('organizations.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('throws 409 if organization slug is taken', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        id: 'org-1',
        slug: 'acme-corp',
      } as any);

      await expect(
        organizationsService.createOrganization('u-1', {
          name: 'Acme Corp',
          slug: 'acme-corp',
        }),
      ).rejects.toThrow("Organization with slug 'acme-corp' already exists");
    });

    it('creates organization and adds user as OWNER', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.organization.create).mockResolvedValueOnce({
        id: 'org-1',
        name: 'Alpha Analytics',
        slug: 'alpha-analytics',
        members: [{ userId: 'u-1', role: 'OWNER' }],
      } as any);

      const res = await organizationsService.createOrganization('u-1', {
        name: 'Alpha Analytics',
        slug: 'alpha-analytics',
      });

      expect(res.id).toBe('org-1');
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            members: {
              create: {
                userId: 'u-1',
                role: 'OWNER',
              },
            },
          }),
        }),
      );
    });
  });

  describe('addMember', () => {
    it('rejects if actor is not OWNER or ADMIN', async () => {
      vi.mocked(prisma.orgMember.findUnique).mockResolvedValueOnce({
        orgId: 'org-1',
        userId: 'actor-1',
        role: 'MEMBER',
      } as any);

      await expect(
        organizationsService.addMember('org-1', 'actor-1', {
          userId: 'u-target',
          role: 'MEMBER',
        }),
      ).rejects.toThrow('Only organization owners and admins can invite new members');
    });

    it('adds member when actor is OWNER', async () => {
      vi.mocked(prisma.orgMember.findUnique).mockResolvedValueOnce({
        orgId: 'org-1',
        userId: 'actor-1',
        role: 'OWNER',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u-target' } as any);
      vi.mocked(prisma.orgMember.upsert).mockResolvedValueOnce({
        id: 'm-1',
        orgId: 'org-1',
        userId: 'u-target',
        role: 'MEMBER',
      } as any);

      const res = await organizationsService.addMember('org-1', 'actor-1', {
        userId: 'u-target',
        role: 'MEMBER',
      });

      expect(res.userId).toBe('u-target');
      expect(prisma.orgMember.upsert).toHaveBeenCalled();
    });
  });
});
