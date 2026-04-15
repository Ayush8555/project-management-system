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
               // User must have access to the project
               OR: [
                 { team_lead: req.user.id },
                 { members: { some: { userId: req.user.id } } },
                 { workspace: { ownerId: req.user.id } }, // workspace owner
                 { workspace: { members: { some: { userId: req.user.id } } } } // workspace member access check might be too broad here?
                 // Usually project visibility is tied to workspace membership, but let's be safe:
                 // If user is in workspace, they can see projects?
                 // The original project fetch logic in projects.js checks for:
                 // team_lead, OR members.some(userId), OR workspace.ownerId, OR workspace.members.some(userId)
                 // This implies if you are in the workspace, you can see the project.
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
              // User must have access: assignee, or project member/lead, or workspace member
               project: {
                  OR: [
                    { team_lead: req.user.id },
                    { members: { some: { userId: req.user.id } } },
                    { workspace: { ownerId: req.user.id } },
                    { workspace: { members: { some: { userId: req.user.id } } } }
                  ]
               }
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
      // We want users who share at least one workspace with the requesting user
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
                     workspace: {
                        members: {
                          some: { userId: req.user.id }
                        }
                     }
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
