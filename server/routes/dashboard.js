import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { getCache, setCache } from '../utils/cache.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/dashboard?workspaceId=X
 */
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    const cacheKey = `dashboard:${workspaceId}:${req.user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    // Verify user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Run all queries in parallel — 6 queries, all independent
    const now = new Date();
    const [projects, myTasks, recentTasks, overdueCount, totalTasksCount, myTotalTasksCount] = await Promise.all([
      // 1. Get projects — slim payload (counts only, no full member objects)
      prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { team_lead: req.user.id },
            { members: { some: { userId: req.user.id } } },
            { workspace: { OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, image: true } },
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Get myTasks — only the most recent 20
      prisma.task.findMany({
        where: { project: { workspaceId }, assigneeId: req.user.id },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),

      // 3. Get recentTasks
      prisma.task.findMany({
        where: { project: { workspaceId } },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),

      // 4. Get overdueTasks count — accurate via count()
      prisma.task.count({
        where: { project: { workspaceId }, due_date: { lt: now }, status: { not: 'DONE' } },
      }),

      // 5. Total tasks in workspace — accurate count
      prisma.task.count({
        where: { project: { workspaceId } },
      }),

      // 6. My total tasks count — accurate (not capped at 20)
      prisma.task.count({
        where: { project: { workspaceId }, assigneeId: req.user.id },
      }),
    ]);

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status !== 'CANCELLED' && p.status !== 'COMPLETED').length,
      completedProjects: projects.filter((p) => p.status === 'COMPLETED').length,
      totalTasks: totalTasksCount,
      myTasksCount: myTotalTasksCount, // Accurate count, not capped at 20
      overdueCount,
    };

    const result = { projects, stats, myTasks, recentTasks };
    
    // Cache for 90 seconds — dashboard doesn't need real-time
    setCache(cacheKey, result, 90);

    res.json(result);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard',
      message: error.message,
    });
  }
});

export default router;
