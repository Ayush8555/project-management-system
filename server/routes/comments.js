import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/comments - Get all comments for a task
 */
router.get('/', async (req, res) => {
  try {
    const { taskId } = req.query;

    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required',
      });
    }

    // Verify user has access to the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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
    });

    if (!task) {
      return res.status(404).json({
        error: 'Task not found or you do not have access',
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [total, comments] = await Promise.all([
      prisma.comment.count({ where: { taskId } }),
      prisma.comment.findMany({
        where: { taskId },
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
        skip,
        take: limit,
      }),
    ]);

    res.json({
      comments,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      error: 'Failed to fetch comments',
      message: error.message,
    });
  }
});

/**
 * POST /api/comments - Create a new comment
 */
router.post('/', async (req, res) => {
  try {
    const { content, taskId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        error: 'Comment content is required',
      });
    }

    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required',
      });
    }

    // Verify user has access to the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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
    });

    if (!task) {
      return res.status(404).json({
        error: 'Task not found or you do not have access',
      });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        id: nanoid(),
        content: content.trim(),
        taskId,
        userId: req.user.id,
      },
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
    });

    res.status(201).json({
      message: 'Comment created successfully',
      comment,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      error: 'Failed to create comment',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/comments/:id - Delete a comment
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if user owns the comment or has permission
    const comment = await prisma.comment.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { userId: req.user.id },
          {
            task: {
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
          },
        ],
      },
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found or you do not have permission',
      });
    }

    await prisma.comment.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      error: 'Failed to delete comment',
      message: error.message,
    });
  }
});

export default router;

