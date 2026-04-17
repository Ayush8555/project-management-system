import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { customAlphabet } from 'nanoid';
import { getCache, setCache, invalidateCache } from '../utils/cache.js';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/tasks - Get all tasks for the logged-in user
 * OPTIMIZED: Replaced "fetch all user projects" preflight with workspace-based access
 */
router.get('/', async (req, res) => {
  try {
    const { projectId, status, assigneeId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100
    const skip = (page - 1) * limit;

    // Cache key based on user + filters
    const cacheKey = `tasks:${req.user.id}:${projectId || ''}:${status || ''}:${assigneeId || ''}:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    // OPTIMIZED: Fetch accessible workspace IDs instead of all project IDs
    // This is O(workspaces) instead of O(projects) — much smaller set
    const userAccess = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ownedWorkspaces: { select: { id: true } },
        workspaces: { select: { workspaceId: true } },
      }
    });

    const accessibleWorkspaceIds = [
      ...(userAccess?.ownedWorkspaces?.map(w => w.id) || []),
      ...(userAccess?.workspaces?.map(w => w.workspaceId) || [])
    ];

    const where = {
      OR: [
        { assigneeId: req.user.id },
        { project: { workspaceId: { in: accessibleWorkspaceIds } } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
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
              workspaceId: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const result = {
      tasks,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };

    // Cache for 30 seconds
    setCache(cacheKey, result, 30);

    res.json(result);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error.message,
    });
  }
});

/**
 * GET /api/tasks/:id - Get a single task by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { assigneeId: req.user.id },
          {
            project: {
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
          },
        ],
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
            team_lead: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        comments: {
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
          orderBy: {
            createdAt: 'desc',
          },
          take: 50, // Paginate comments
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
      });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      error: 'Failed to fetch task',
      message: error.message,
    });
  }
});

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, projectId, assigneeId, due_date, status, type, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Task title is required',
      });
    }

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required',
      });
    }

    if (!due_date) {
      return res.status(400).json({
        error: 'Due date is required',
      });
    }

    // Verify user has access to project — select only id
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or you do not have access',
      });
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        id: nanoid(),
        title: title.trim(),
        description: description?.trim() || null,
        projectId,
        assigneeId,
        due_date: new Date(due_date),
        status: status || 'TODO',
        type: type || 'TASK',
        priority: priority || 'MEDIUM',
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
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Update project progress (fire and forget — don't block response)
    updateProjectProgress(projectId);

    // Invalidate caches
    invalidateCache('dashboard');
    invalidateCache('tasks');
    invalidateCache(`project:${projectId}`);

    res.status(201).json({
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Failed to create task',
      message: error.message,
    });
  }
});

/**
 * PUT /api/tasks/:id - Update a task
 * OPTIMIZED: 
 *   - Permission check uses select instead of include: { project: true }
 *   - Response excludes full comments array, uses _count instead
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, type, priority, assigneeId, due_date } = req.body;

    // OPTIMIZED: select only projectId for permission check (was: include: { project: true })
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { assigneeId: req.user.id },
          {
            project: {
              OR: [
                { team_lead: req.user.id },
                {
                  workspace: {
                    OR: [
                      { ownerId: req.user.id },
                      {
                        members: {
                          some: {
                            userId: req.user.id,
                            role: 'ADMIN',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!task) {
      return res.status(404).json({
        error: 'Task not found or you do not have permission',
      });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status) updateData.status = status;
    if (type) updateData.type = type;
    if (priority) updateData.priority = priority;
    if (assigneeId) updateData.assigneeId = assigneeId;
    if (due_date) updateData.due_date = new Date(due_date);

    // OPTIMIZED: Don't include full comments array — just return task data + _count
    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
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
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Update project progress if status changed (fire and forget)
    if (status) {
      updateProjectProgress(task.projectId);
    }
    
    // Invalidate caches
    invalidateCache('dashboard');
    invalidateCache('tasks');
    invalidateCache(`project:${task.projectId}`);

    res.json({
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      error: 'Failed to update task',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/tasks/:id - Delete a task
 * OPTIMIZED: Permission check uses select instead of include: { project: true }
 */
router.delete('/:id', async (req, res) => {
  try {
    // OPTIMIZED: select only projectId (was: include: { project: true })
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        OR: [
          {
            project: {
              OR: [
                { team_lead: req.user.id },
                {
                  workspace: {
                    ownerId: req.user.id,
                  },
                },
                {
                  workspace: {
                    members: {
                      some: {
                        userId: req.user.id,
                        role: 'ADMIN',
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!task) {
      return res.status(404).json({
        error: 'Task not found or you do not have permission',
      });
    }

    const projectId = task.projectId;

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    // Update project progress (fire and forget)
    updateProjectProgress(projectId);

    // Invalidate caches
    invalidateCache('dashboard');
    invalidateCache('tasks');
    invalidateCache(`project:${projectId}`);

    res.json({
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Failed to delete task',
      message: error.message,
    });
  }
});

/**
 * Helper function to update project progress
 */
async function updateProjectProgress(projectId) {
  try {
    // Use count() instead of findMany() — fetches zero rows from DB
    const [totalTasks, completedTasks] = await Promise.all([
      prisma.task.count({ where: { projectId } }),
      prisma.task.count({ where: { projectId, status: 'DONE' } }),
    ]);

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });
  } catch (error) {
    console.error('Update project progress error:', error);
  }
}

export default router;
