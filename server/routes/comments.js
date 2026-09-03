import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { getIO } from '../socket.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

const router = express.Router();

// In-memory store for ephemeral chats: Map<taskId, Array<Comment>>
const ephemeralChats = new Map();
const MAX_HISTORY = 100;

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

    // Pre-flight workspaces fetch for faster auth check
    const userAccess = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ownedWorkspaces: { select: { id: true } },
        workspaces: { select: { workspaceId: true } },
      }
    });

    const accessibleWorkspaceIds = [
      ...(userAccess.ownedWorkspaces?.map(w => w.id) || []),
      ...(userAccess.workspaces?.map(w => w.workspaceId) || [])
    ];

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
                { members: { some: { userId: req.user.id } } },
                { workspaceId: { in: accessibleWorkspaceIds } }
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

    // Return ephemeral chats from memory
    const comments = ephemeralChats.get(taskId) || [];

    res.json({
      comments,
      pagination: {
        total: comments.length,
        totalPages: 1,
        currentPage: 1,
        limit: MAX_HISTORY,
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

    // Pre-flight workspaces fetch for faster auth check
    const userAccess = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ownedWorkspaces: { select: { id: true } },
        workspaces: { select: { workspaceId: true } },
      }
    });

    const accessibleWorkspaceIds = [
      ...(userAccess.ownedWorkspaces?.map(w => w.id) || []),
      ...(userAccess.workspaces?.map(w => w.workspaceId) || [])
    ];

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
                { members: { some: { userId: req.user.id } } },
                { workspaceId: { in: accessibleWorkspaceIds } }
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

    // Fetch user details for the ephemeral comment object
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    // Create ephemeral comment
    const comment = {
      id: nanoid(),
      content: content.trim(),
      taskId,
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      user,
    };

    // Store in memory
    if (!ephemeralChats.has(taskId)) {
      ephemeralChats.set(taskId, []);
    }
    const chatHistory = ephemeralChats.get(taskId);
    chatHistory.unshift(comment); // Add to beginning

    // Cap history to prevent memory leaks
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory.pop(); // Remove oldest
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment,
    });

    // Emit real-time event to all users viewing this task
    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('comment:created', comment);
    }
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

    // Since comments are now ephemeral, we need to remove it from the Map
    if (ephemeralChats.has(comment.taskId)) {
      const chats = ephemeralChats.get(comment.taskId);
      ephemeralChats.set(comment.taskId, chats.filter(c => c.id !== req.params.id));
    }

    await prisma.comment.delete({
      where: { id: req.params.id },
    }).catch(() => {}); // Ignore if it doesn't exist in DB

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

/**
 * DELETE /api/comments/clear - Clear ephemeral chat for a task (Admins only)
 */
router.delete('/clear/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verify user is Admin or Team Lead
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId: req.user.id, role: 'ADMIN' }
                }
              }
            }
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const isTeamLead = task.project.team_lead === req.user.id;
    const isOwner = task.project.workspace.ownerId === req.user.id;
    const isAdmin = task.project.workspace.members.length > 0;

    if (!isTeamLead && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only Admins or Team Leads can clear chats' });
    }

    // Clear the chat from memory
    ephemeralChats.delete(taskId);

    // Emit event to all clients to clear their UI
    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('chat:cleared');
    }

    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({
      error: 'Failed to clear chat',
      message: error.message,
    });
  }
});

export default router;

