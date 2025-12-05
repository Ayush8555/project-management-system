import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/workspaces - Get all workspaces for the logged-in user
 */
router.get('/', async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
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
        projects: {
          include: {
            tasks: true,
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
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      error: 'Failed to fetch workspaces',
      message: error.message,
    });
  }
});

/**
 * GET /api/workspaces/:id - Get a single workspace by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
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
        projects: {
          include: {
            tasks: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
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
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found',
      });
    }

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({
      error: 'Failed to fetch workspace',
      message: error.message,
    });
  }
});

/**
 * POST /api/workspaces - Create a new workspace
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Workspace name is required',
      });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + nanoid(8);

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        id: nanoid(),
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        ownerId: req.user.id,
        settings: {},
      },
    });

    // Add owner as admin member
    await prisma.workspaceMember.create({
      data: {
        userId: req.user.id,
        workspaceId: workspace.id,
        role: 'ADMIN',
      },
    });

    // Add other members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const membersToAdd = memberIds
        .filter((id) => id !== req.user.id) // Don't add owner again
        .map((userId) => ({
          userId,
          workspaceId: workspace.id,
          role: 'MEMBER',
        }));

      if (membersToAdd.length > 0) {
        await prisma.workspaceMember.createMany({
          data: membersToAdd,
          skipDuplicates: true,
        });
      }
    }

    // Fetch the complete workspace with relations
    const workspaceWithRelations = await prisma.workspace.findUnique({
      where: { id: workspace.id },
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
        projects: [],
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: workspaceWithRelations,
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      error: 'Failed to create workspace',
      message: error.message,
    });
  }
});

/**
 * PUT /api/workspaces/:id - Update a workspace
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if user is owner or admin
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found or you do not have permission',
      });
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
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
            members: true,
            projects: true,
          },
        },
      },
    });

    res.json({
      message: 'Workspace updated successfully',
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({
      error: 'Failed to update workspace',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/workspaces/:id - Delete a workspace
 */
router.delete('/:id', async (req, res) => {
  try {
    // Only owner can delete
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found or you do not have permission',
      });
    }

    await prisma.workspace.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({
      error: 'Failed to delete workspace',
      message: error.message,
    });
  }
});

/**
 * POST /api/workspaces/:id/invite - Invite member by email
 */
router.post('/:id/invite', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    // Check if user has permission (owner or admin)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found or you do not have permission',
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists, add to workspace if not already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: req.params.id,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({
          error: 'User is already a member of this workspace',
        });
      }

      await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: req.params.id,
          role: 'MEMBER',
        },
      });

      return res.json({
        message: 'User added to workspace successfully',
        user,
      });
    } else {
      // User does not exist, create pending invite
      const existingInvite = await prisma.pendingInvite.findUnique({
        where: {
          email_workspaceId: {
            email,
            workspaceId: req.params.id,
          },
        },
      });

      if (existingInvite) {
        return res.status(400).json({
          error: 'User has already been invited',
        });
      }

      const token = nanoid(32); // Generate a secure token

      await prisma.pendingInvite.create({
        data: {
          email,
          workspaceId: req.params.id,
          token,
          role: 'MEMBER',
        },
      });

      // In a real app, send email here
      return res.json({
        message: 'Invitation sent successfully',
        pending: true,
      });
    }
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      error: 'Failed to invite member',
      message: error.message,
    });
  }
});

/**
 * POST /api/workspaces/:id/members - Add members to workspace
 */
router.post('/:id/members', async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'User IDs array is required',
      });
    }

    // Check if user has permission (owner or admin)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found or you do not have permission',
      });
    }

    // Add members
    const membersToAdd = userIds.map((userId) => ({
      userId,
      workspaceId: req.params.id,
      role: 'MEMBER',
    }));

    await prisma.workspaceMember.createMany({
      data: membersToAdd,
      skipDuplicates: true,
    });

    // Fetch updated workspace
    const updatedWorkspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
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
      },
    });

    res.json({
      message: 'Members added successfully',
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({
      error: 'Failed to add members',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/workspaces/:id/members/:memberId - Remove member from workspace
 */
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    // Check if user has permission
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!workspace) {
      return res.status(404).json({
        error: 'Workspace not found or you do not have permission',
      });
    }

    // Cannot remove owner
    if (req.params.memberId === workspace.ownerId) {
      return res.status(400).json({
        error: 'Cannot remove workspace owner',
      });
    }

    await prisma.workspaceMember.deleteMany({
      where: {
        workspaceId: req.params.id,
        userId: req.params.memberId,
      },
    });

    res.json({
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      error: 'Failed to remove member',
      message: error.message,
    });
  }
});

export default router;

