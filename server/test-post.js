import fetch from 'node-fetch';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

// MOCK the request to backend!
async function run() {
  const token = jwt.sign({ id: 'dummy-user', email: 'test@test.com' }, process.env.JWT_SECRET || 'secret123');
  const res = await fetch("http://localhost:5009/api/projects", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Test Fetch Project',
      description: 'hi',
      workspaceId: 'clg12345',
      team_lead: 'dummy-user',
      memberIds: []
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
