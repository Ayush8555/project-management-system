import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/dashboard?workspaceId=X
 * Returns all dashboard data in a single query:
 * - projects (lightweight list)
 * - stats (total, active, completed counts)
 * - myTasks (tasks assigned to current user)
 * - recentTasks (last 10 updated tasks across workspace)
 * - overdue count
 */
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    // Verify user has access to workspace
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
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Run all queries in parallel for maximum speed
    const [projects, allTasks] = await Promise.all([
      // 1. Get projects (lightweight — no tasks/comments)
      prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { team_lead: req.user.id },
            {
              members: {
                some: {
                  userId: req.user.id,
                },
              },
            },
            {
              workspace: {
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
            },
          ],
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // 2. Get ALL tasks for workspace projects (with assignee, for stats + recent activity)
      prisma.task.findMany({
        where: {
          project: {
            workspaceId,
          },
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
    ]);

    // Compute stats from the data we already have
    const now = new Date();
    const myTasks = allTasks.filter((t) => t.assigneeId === req.user.id);
    const overdueTasks = allTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'DONE'
    );
    const recentTasks = allTasks.slice(0, 10); // already sorted by updatedAt desc

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(
        (p) => p.status !== 'CANCELLED' && p.status !== 'COMPLETED'
      ).length,
      completedProjects: projects.filter((p) => p.status === 'COMPLETED').length,
      myTasksCount: myTasks.length,
      overdueCount: overdueTasks.length,
    };

    res.json({
      projects,
      stats,
      myTasks,
      recentTasks,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard',
      message: error.message,
    });
  }
});

export default router;
