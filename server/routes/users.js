import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { getCache, setCache } from '../utils/cache.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users - Get all users (for team member selection)
 * Only returns users that are in at least one workspace with the current user
 */
router.get('/', async (req, res) => {
  try {
    const { workspaceId, search } = req.query;

    const cacheKey = `users:${req.user.id}:${workspaceId || 'all'}:${search || ''}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    let where = {};

    // If workspaceId is provided, get users from that workspace
    if (workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: req.user.id },
            {
              members: {
                some: {
                  userId: req.user.id,
                },
              },
            },
          ],
        },
        include: {
          members: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!workspace) {
        return res.status(404).json({
          error: 'Workspace not found or you do not have access',
        });
      }

      const memberIds = workspace.members.map((m) => m.userId);
      if (!memberIds.includes(workspace.ownerId)) {
        memberIds.push(workspace.ownerId);
      }
      where.id = {
        in: memberIds,
      };
    } else {
      // Get all users that share at least one workspace with current user
      const userWorkspaces = await prisma.workspaceMember.findMany({
        where: {
          userId: req.user.id,
        },
        select: {
          workspaceId: true,
        },
      });

      const workspaceIds = userWorkspaces.map((w) => w.workspaceId);

      if (workspaceIds.length > 0) {
        const allMembers = await prisma.workspaceMember.findMany({
          where: {
            workspaceId: {
              in: workspaceIds,
            },
          },
          select: {
            userId: true,
          },
        });

        const userIds = [...new Set(allMembers.map((m) => m.userId))];
        where.id = {
          in: userIds,
        };
      } else {
        // No workspaces, return empty
        return res.json({ users: [] });
      }
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 50, // Limit to 50 users to prevent massive payloads
    });

    setCache(cacheKey, { users }, 30); // Cache for 30s
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
});

export default router;

