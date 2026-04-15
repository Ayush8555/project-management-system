# Project Management System (PMS)

A comprehensive, full-stack open-source Project Management System built with React, Node.js, Express, and Prisma. This platform allows teams to manage workspaces, track projects, assign tasks, collaborate through comments, and visualize progress in real-time.

## Features

- **Authentication & Authorization**: Secure JWT-based authentication with access and refresh tokens.
- **Workspaces**: Create standalone workspaces and invite team members.
- **Project Management**: Create projects, set priorities, track statuses (Planning, Active, Completed, etc.).
- **Task Management**: Create tasks, assign them to team members, set due dates, add priorities, and track progress (To Do, In Progress, Done).
- **Collaboration**: Real-time commenting and task discussion built securely into every task.
- **Analytics & Dashboards**: Visual charts (via Recharts) displaying project progress, task distributions, and workspace health.
- **Global Search**: Instantly find projects, tasks, or users within your workspaces.

## Tech Stack

### Frontend (Client)
- **Framework**: React 19 / Vite
- **Styling**: Tailwind CSS v4, Lucide React icons
- **State Management**: Redux Toolkit, React-Redux
- **Routing**: React Router DOM
- **Data Visualization**: Recharts
- **Notifications**: React Hot Toast

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database ORM**: Prisma
- **Database**: PostgreSQL (adapted for Neon Serverless)
- **Security**: bcrypt (password hashing), jsonwebtoken (JWT auth), cookie-parser, CORS

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A PostgreSQL database (Local or Cloud like Neon/Supabase)

### 1. Clone the repository

```bash
git clone https://github.com/YourUsername/project-management-system.git
cd project-management-system
```

### 2. Backend Setup

Navigate to the `server` directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server` root directory and add the following environment variables (make sure not to expose your real keys in source control):

```env
# Server configuration
PORT=5009
CLIENT_URL=http://localhost:5173

# Database configuration
DATABASE_URL="postgresql://user:password@localhost:5432/pms_database"

# JWT Secrets (Generate random secure strings for these)
JWT_ACCESS_SECRET="your-super-secure-access-token-secret"
JWT_REFRESH_SECRET="your-super-secure-refresh-token-secret"
```

Initialize the database using Prisma:

```bash
npx prisma generate
npx prisma db push
```

Start the backend development server:

```bash
npm run dev
# The server will run on http://localhost:5009
```

### 3. Frontend Setup

Open a new terminal window, navigate to the `Client` directory, and install dependencies:

```bash
cd Client
npm install
```

Create a `.env` file in the `Client` root directory to configure the frontend environment variables:

```env
VITE_API_URL=http://localhost:5009/api
```

Start the Vite development server:

```bash
npm run dev
# The frontend will run on http://localhost:5173
```

---

## Folder Structure

```
PMS/
├── Client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React Context (Auth, etc.)
│   │   ├── features/       # Redux slices
│   │   ├── pages/          # Full page views (Dashboard, Projects, etc.)
│   │   └── utils/          # Helper files, API interceptors
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Backend Express Application
│   ├── configs/            # Database and App Configuration
│   ├── controllers/        # Route logic and handlers
│   ├── middleware/         # Auth and validation middleware
│   ├── prisma/             # Database schema and migrations
│   ├── routes/             # API routing setup
│   ├── utils/              # Helper functions (JWT, error handling)
│   ├── server.js           # App entry point
│   └── package.json
```

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


