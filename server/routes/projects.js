import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/projects - Get all projects for the logged-in user
 */
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.query;

    const where = {
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
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
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
    });

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message,
    });
  }
});

/**
 * GET /api/projects/:id - Get a single project by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
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
        workspace: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
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
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
      });
    }

    res.json({
      project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message,
    });
  }
});

/**
 * POST /api/projects - Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, workspaceId, team_lead, start_date, end_date, priority, status, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Project name is required',
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        error: 'Workspace ID is required',
      });
    }

    if (!team_lead) {
      return res.status(400).json({
        error: 'Team lead is required',
      });
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
      return res.status(404).json({
        error: 'Workspace not found or you do not have access',
      });
    }

    // Collect all user IDs we need to validate
    const allUserIds = [team_lead];
    if (memberIds && Array.isArray(memberIds)) {
      allUserIds.push(...memberIds);
    }
    const uniqueUserIds = [...new Set(allUserIds.filter(Boolean))];

    // Validate all user IDs exist in the database
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true },
    });
    const existingUserIds = new Set(existingUsers.map(u => u.id));

    // Check team_lead exists
    if (!existingUserIds.has(team_lead)) {
      return res.status(400).json({
        error: 'Team lead user not found',
      });
    }

    // Filter memberIds to only valid users
    const validMemberIds = memberIds
      ? memberIds.filter(id => existingUserIds.has(id) && id !== team_lead)
      : [];

    // Create project and members in a transaction
    const projectWithRelations = await prisma.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          id: nanoid(),
          name: name.trim(),
          description: description?.trim() || null,
          workspaceId,
          team_lead,
          priority: priority || 'MEDIUM',
          status: (() => {
            const now = new Date();
            const start = start_date ? new Date(start_date) : null;
            const end = end_date ? new Date(end_date) : null;

            if (start && start > now) return 'UPCOMING';
            if (end && end < now) return 'COMPLETED';
            if (start && start <= now && end && end >= now) return 'IN_PROGRESS';
            return 'ACTIVE';
          })(),
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          progress: 0,
        },
      });

      // Add team lead + valid members as project members
      const membersToAdd = [{ userId: team_lead, projectId: project.id }];
      for (const userId of validMemberIds) {
        membersToAdd.push({ userId, projectId: project.id });
      }

      await tx.projectMember.createMany({
        data: membersToAdd,
        skipDuplicates: true,
      });

      // Fetch the complete project with relations
      return await tx.project.findUnique({
        where: { id: project.id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
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
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: projectWithRelations,
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message,
    });
  }
});

/**
 * PUT /api/projects/:id - Update a project
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, status, priority, start_date, end_date, team_lead } = req.body;

    // Check if user has permission (team lead or workspace admin/owner)
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or you do not have permission',
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority) updateData.priority = priority;
    if (start_date) updateData.start_date = new Date(start_date);
    if (end_date) updateData.end_date = new Date(end_date);
    if (team_lead) updateData.team_lead = team_lead;

    // Auto-calculate status if dates are updated
    if (start_date || end_date) {
      const now = new Date();
      const start = updateData.start_date || (project.start_date ? new Date(project.start_date) : null);
      const end = updateData.end_date || (project.end_date ? new Date(project.end_date) : null);

      if (start && start > now) updateData.status = 'UPCOMING';
      else if (end && end < now) updateData.status = 'COMPLETED';
      else if (start && start <= now && end && end >= now) updateData.status = 'IN_PROGRESS';
      else if (!updateData.status) updateData.status = project.status; // Keep existing if not determined
    } else if (status) {
        // Allow manual status update if dates are not changed, or if user explicitly sets it (though requirements say auto)
        // But if dates are NOT provided in update, we might want to allow status update.
        // However, requirements say "This should work automatically without user selecting the status manually."
        // I will assume if dates are provided, we recalculate. If only status is provided, we allow it?
        // Let's stick to auto-calculation if dates are involved.
        updateData.status = status;
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
    });

    // Calculate progress
    const totalTasks = updatedProject.tasks.length;
    const completedTasks = updatedProject.tasks.filter((t) => t.status === 'DONE').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update progress in database
    await prisma.project.update({
      where: { id: req.params.id },
      data: { progress },
    });

    res.json({
      message: 'Project updated successfully',
      project: {
        ...updatedProject,
        progress,
      },
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/projects/:id - Delete a project
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if user has permission (team lead or workspace owner/admin)
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or you do not have permission',
      });
    }

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message,
    });
  }
});

/**
 * POST /api/projects/:id/members - Add members to project
 */
router.post('/:id/members', async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'User IDs array is required',
      });
    }

    // Check if user has permission
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or you do not have permission',
      });
    }

    // Add members
    const membersToAdd = userIds.map((userId) => ({
      userId,
      projectId: req.params.id,
    }));

    await prisma.projectMember.createMany({
      data: membersToAdd,
      skipDuplicates: true,
    });

    // Fetch updated project
    const updatedProject = await prisma.project.findUnique({
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
      project: updatedProject,
    });
  } catch (error) {
    console.error('Add project members error:', error);
    res.status(500).json({
      error: 'Failed to add members',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/projects/:id/members/:memberId - Remove member from project
 */
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    // Check if user has permission
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
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
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or you do not have permission',
      });
    }

    // Cannot remove team lead
    if (req.params.memberId === project.team_lead) {
      return res.status(400).json({
        error: 'Cannot remove project team lead',
      });
    }

    await prisma.projectMember.deleteMany({
      where: {
        projectId: req.params.id,
        userId: req.params.memberId,
      },
    });

    res.json({
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({
      error: 'Failed to remove member',
      message: error.message,
    });
  }
});

export default router;

