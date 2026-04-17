import express from 'express';
import prisma from '../configs/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/search
 * Query params: q (search string)
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        projects: [],
        tasks: [],
        members: []
      });
    }

    const searchTerm = q.trim();

    // Pre-flight check: Get all accessible workspaces and projects for the user quickly
    const userProjectsAndWorkspaces = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ownedWorkspaces: { select: { id: true } },
        workspaces: { select: { workspaceId: true } },
        projects: { select: { id: true } },
        ProjectMember: { select: { projectId: true } },
      }
    });

    const accessibleWorkspaceIds = [
       ...userProjectsAndWorkspaces.ownedWorkspaces.map(w => w.id),
       ...userProjectsAndWorkspaces.workspaces.map(w => w.workspaceId)
    ];

    const accessibleProjectIds = [
       ...userProjectsAndWorkspaces.projects.map(p => p.id),
       ...userProjectsAndWorkspaces.ProjectMember.map(p => p.projectId)
    ];

    // Parallel search queries for better performance
    const [projects, tasks, users] = await Promise.all([
      // 1. Search Projects
      prisma.project.findMany({
        where: {
          AND: [
             {
               OR: [
                 { name: { contains: searchTerm, mode: 'insensitive' } },
                 { description: { contains: searchTerm, mode: 'insensitive' } }
               ]
             },
             {
               OR: [
                 { id: { in: accessibleProjectIds } },
                 { workspaceId: { in: accessibleWorkspaceIds } }
               ]
             }
          ]
        },
        select: {
          id: true,
          name: true,
          status: true,
          workspaceId: true // needed for navigation
        },
        take: 5
      }),

      // 2. Search Tasks
      prisma.task.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            {
               OR: [
                 { assigneeId: req.user.id },
                 { projectId: { in: accessibleProjectIds } },
                 { project: { workspaceId: { in: accessibleWorkspaceIds } } }
               ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          status: true,
          projectId: true,
          project: {
             select: { name: true }
          }
        },
        take: 5
      }),

      // 3. Search Users (Members of user's workspaces)
      prisma.user.findMany({
         where: {
            AND: [
               {
                 OR: [
                   { name: { contains: searchTerm, mode: 'insensitive' } },
                   { email: { contains: searchTerm, mode: 'insensitive' } }
                 ]
               },
               {
                 workspaces: {
                   some: {
                     workspaceId: { in: accessibleWorkspaceIds }
                   }
                 }
               }
            ]
         },
         select: {
           id: true,
           name: true,
           email: true,
           image: true
         },
         take: 5
      })
    ]);

    res.json({
      projects,
      tasks,
      members: users
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

export default router;
