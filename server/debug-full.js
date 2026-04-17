import fetch from 'node-fetch';
import prisma from './configs/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const user = await prisma.user.findFirst();
  const ws = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
  
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });

  const res = await fetch("http://localhost:5009/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      name: "Debug Project",
      description: "Testing API endpoint 500",
      workspaceId: ws.id,
      team_lead: user.id,
      priority: "MEDIUM",
      status: "ACTIVE",
      start_date: null,
      end_date: null,
      memberIds: []
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
run();
