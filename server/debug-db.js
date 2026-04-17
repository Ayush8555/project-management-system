import prisma from './configs/prisma.js';

async function test() {
  const user = await prisma.user.findFirst();
  const ws = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
  
  if(!ws) return console.log("No workspace found");
  
  console.log("Mocking POST payload with user:", user.id, "ws:", ws.id);
  
  try {
     const res = await fetch("http://localhost:5009/api/projects", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       // We skip auth token check by bypassing auth? No, we need auth token.
       // Let's generate one!
     });
  } catch (e) {
  }
}
test();
