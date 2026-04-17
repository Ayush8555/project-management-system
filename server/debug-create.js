import prisma from './configs/prisma.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

async function run() {
  const user = await prisma.user.findFirst();
  const ws = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
  
  console.log("Testing with user:", user.id, "workspace:", ws.id);
  
  try {
    const projectWithRelations = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          id: nanoid(),
          name: "Test Bug",
          description: "Testing 500 error",
          workspaceId: ws.id,
          team_lead: user.id,
          priority: "MEDIUM",
          status: "ACTIVE",
          start_date: null,
          end_date: null,
          progress: 0,
        },
      });

      const membersToAdd = [{ userId: user.id, projectId: project.id }];
      await tx.projectMember.createMany({
        data: membersToAdd,
        skipDuplicates: true,
      });

      return await tx.project.findUnique({
        where: { id: project.id },
        include: {
          owner: { select: { id: true, name: true, email: true, image: true } },
          workspace: { select: { id: true, name: true, slug: true } },
          members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          _count: { select: { tasks: true, members: true } },
        },
      });
    });
    console.log("Success:", !!projectWithRelations);
  } catch(e) {
    console.error("Prisma Error:", e.name, e.message);
  }
}
run();
