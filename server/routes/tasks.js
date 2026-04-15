import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/tasks - Get all tasks for the logged-in user
 */
router.get('/', async (req, res) => {
  try {
    const { projectId, status, assigneeId } = req.query;

    const where = {
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

    const tasks = await prisma.task.findMany({
      where,
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
    });

    res.json({ tasks });
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
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
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

    // if (!assigneeId) {
    //   return res.status(400).json({
    //     error: 'Assignee is required',
    //   });
    // }

    if (!due_date) {
      return res.status(400).json({
        error: 'Due date is required',
      });
    }

    // Verify user has access to project
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
        comments: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Update project progress
    await updateProjectProgress(projectId);

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
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, type, priority, assigneeId, due_date } = req.body;

    // Check if user has permission
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
      include: {
        project: true,
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
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Update project progress if status changed
    if (status) {
      await updateProjectProgress(task.projectId);
    }

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
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if user has permission
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
      include: {
        project: true,
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

    // Update project progress
    await updateProjectProgress(projectId);

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
    const tasks = await prisma.task.findMany({
      where: { projectId },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
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

