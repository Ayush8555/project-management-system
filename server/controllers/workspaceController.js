// Get all workspaces for user

export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const workspaces = await prisma.workspaces.findMany({
      where: {
        members: {
          some: {
            userId: userId,   // Check if this user is a member of workspace
          }
        }
      }
    })}}
