import { FolderOpen, CheckCircle, Users, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../utils/api.js";

export default function StatsGrid() {
    const currentWorkspace = useSelector(
        (state) => state?.workspace?.currentWorkspace || null
    );
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        myTasks: 0,
        overdueIssues: 0,
    });

    const statCards = [
        {
            icon: FolderOpen,
            title: "Total Projects",
            value: stats.totalProjects,
            subtitle: `projects in ${currentWorkspace?.name}`,
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-500",
        },
        {
            icon: CheckCircle,
            title: "Completed Projects",
            value: stats.completedProjects,
            subtitle: `of ${stats.totalProjects} total`,
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-500",
        },
        {
            icon: Users,
            title: "My Tasks",
            value: stats.myTasks,
            subtitle: "assigned to me",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-500",
        },
        {
            icon: AlertTriangle,
            title: "Overdue",
            value: stats.overdueIssues,
            subtitle: "need attention",
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-500",
        },
    ];

    useEffect(() => {
        const loadStats = async () => {
            // Wait for auth to be ready
            if (authLoading || !isAuthenticated) return;
            
            if (!currentWorkspace?.id || !user?.id) return;

            // Check for token
            const token = apiClient.getAccessToken();
            if (!token) return;

            try {
                // Fetch projects for the workspace
                const projectsResponse = await apiClient.getProjects(currentWorkspace.id);
                const projects = projectsResponse.projects || [];

                // Fetch all tasks for the workspace
                const tasksResponse = await apiClient.getTasks(null, null, user.id);
                const allTasks = tasksResponse.tasks || [];

                // Get all tasks from all projects
                const allProjectTasks = [];
                for (const project of projects) {
                    try {
                        const projectResponse = await apiClient.getProject(project.id);
                        allProjectTasks.push(...(projectResponse.project.tasks || []));
                    } catch (error) {
                        console.error(`Failed to fetch tasks for project ${project.id}:`, error);
                    }
                }

                const now = new Date();
                const myTasks = allProjectTasks.filter((t) => t.assigneeId === user.id);
                const overdueTasks = allProjectTasks.filter(
                    (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'DONE'
                );

                setStats({
                    totalProjects: projects.length,
                    activeProjects: projects.filter(
                        (p) => p.status !== "CANCELLED" && p.status !== "COMPLETED"
                    ).length,
                    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
                    myTasks: myTasks.length,
                    overdueIssues: overdueTasks.length,
                });
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        };

        loadStats();
    }, [currentWorkspace?.id, user?.id, isAuthenticated, authLoading]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-9">
            {statCards.map(
                ({ icon: Icon, title, value, subtitle, bgColor, textColor }, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200 rounded-md" >
                        <div className="p-6 py-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                                        {title}
                                    </p>
                                    <p className="text-3xl font-bold text-zinc-800 dark:text-white">
                                        {value}
                                    </p>
                                    {subtitle && (
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
                                    <Icon size={20} className={textColor} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
