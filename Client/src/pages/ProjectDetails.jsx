import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import fetcher from "../utils/fetcher";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, SettingsIcon, BarChart3Icon, CalendarIcon, FileStackIcon, ZapIcon, CheckCircle, Trash2, UsersIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ProjectAnalytics from "../components/ProjectAnalytics";
import ProjectSettings from "../components/ProjectSettings";
import CreateTaskDialog from "../components/CreateTaskDialog";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectTasks from "../components/ProjectTasks";
import ProjectMembers from "../components/ProjectMembers";
import apiClient from "../utils/api.js";
import { fetchWorkspace } from "../features/workspaceSlice";
import toast from "react-hot-toast";

export default function ProjectDetail() {

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab');
    const id = searchParams.get('id');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const prevDialogOpenRef = useRef(false);

    const [showCreateTask, setShowCreateTask] = useState(false);
    const [activeTab, setActiveTab] = useState(tab || "tasks");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (tab) setActiveTab(tab);
    }, [tab]);

    const shouldFetch = isAuthenticated && !authLoading && id;

    // SWR takes over caching and fetching
    const { data: response, isLoading: loading, mutate } = useSWR(
        shouldFetch ? `/api/projects/${id}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    const project = response?.project;
    const tasks = project?.tasks || [];

    // Check if user is admin/owner
    const isAdmin = currentWorkspace?.ownerId === user?.id || 
                   currentWorkspace?.members?.some(m => m.userId === user?.id && m.role === 'ADMIN') ||
                   project?.team_lead === user?.id;

    // Refresh tasks when task dialog closes
    useEffect(() => {
        if (prevDialogOpenRef.current && !showCreateTask && shouldFetch) {
            mutate();
        }
        prevDialogOpenRef.current = showCreateTask;
    }, [showCreateTask, shouldFetch, mutate]);

    const handleMarkComplete = useCallback(async () => {
        if (!project?.id) return;

        const confirm = window.confirm('Are you sure you want to mark this project as completed?');
        if (!confirm) return;

        try {
            await apiClient.updateProject(project.id, { status: 'COMPLETED' });
            toast.success('Project marked as completed!');
            
            // Optimistic refresh
            mutate();
            
            // Refresh workspace
            if (project.workspaceId) {
                await dispatch(fetchWorkspace(project.workspaceId));
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update project');
        }
    }, [project?.id, project?.workspaceId, dispatch, mutate]);

    const handleDeleteProject = useCallback(async () => {
        if (!project?.id) return;

        const confirm = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');
        if (!confirm) return;

        setIsDeleting(true);
        try {
            await apiClient.deleteProject(project.id);
            toast.success('Project deleted successfully!');
            
            // Refresh workspace
            if (project.workspaceId) {
                await dispatch(fetchWorkspace(project.workspaceId));
            }
            
            // Navigate back to projects
            navigate('/projects');
        } catch (error) {
            toast.error(error.message || 'Failed to delete project');
            setIsDeleting(false);
        }
    }, [project?.id, project?.workspaceId, dispatch, navigate]);

    const statusColors = {
        PLANNING: "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-200",
        ACTIVE: "bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-900",
        ON_HOLD: "bg-amber-200 text-amber-900 dark:bg-amber-500 dark:text-amber-900",
        COMPLETED: "bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-blue-900",
        CANCELLED: "bg-red-200 text-red-900 dark:bg-red-500 dark:text-red-900",
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200 space-y-6">
                <div className="flex gap-4">
                    <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />)}
                </div>
                <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-3xl md:text-5xl mt-40 mb-10">Project not found</p>
                <button onClick={() => navigate('/projects')} className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600" >
                    Back to Projects
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-6xl mx-auto text-zinc-900 dark:text-white">
            {/* Header */}
            <div className="flex max-md:flex-col gap-4 flex-wrap items-start justify-between max-w-6xl">
                <div className="flex items-center gap-4">
                    <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400" onClick={() => navigate('/projects')}>
                        <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-medium">{project.name}</h1>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${statusColors[project.status]}`} >
                            {project.status.replace("_", " ")}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && project.status !== 'COMPLETED' && (
                        <button 
                            onClick={handleMarkComplete} 
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-emerald-500 hover:bg-emerald-600 text-white transition"
                            title="Mark as Complete"
                        >
                            <CheckCircle className="size-4" />
                            Mark Complete
                        </button>
                    )}
                    {isAdmin && (
                        <button 
                            onClick={handleDeleteProject} 
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-50"
                            title="Delete Project"
                        >
                            <Trash2 className="size-4" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    )}
                    <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white" >
                        <PlusIcon className="size-4" />
                        New Task
                    </button>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:flex flex-wrap gap-6">
                {[
                    { label: "Total Tasks", value: tasks.length, color: "text-zinc-900 dark:text-white" },
                    { label: "Completed", value: tasks.filter((t) => t.status === "DONE").length, color: "text-emerald-700 dark:text-emerald-400" },
                    { label: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO").length, color: "text-amber-700 dark:text-amber-400" },
                    { label: "Team Members", value: project.members?.length || 0, color: "text-blue-700 dark:text-blue-400" },
                ].map((card, idx) => (
                    <div key={idx} className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex justify-between sm:min-w-60 p-4 py-2.5 rounded">
                        <div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</div>
                            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                        </div>
                        <ZapIcon className={`size-4 ${card.color}`} />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div>
                <div className="inline-flex flex-wrap max-sm:grid grid-cols-3 gap-2 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
                    {[
                        { key: "tasks", label: "Tasks", icon: FileStackIcon },
                        { key: "calendar", label: "Calendar", icon: CalendarIcon },
                        { key: "analytics", label: "Analytics", icon: BarChart3Icon },
                        { key: "members", label: "Members", icon: UsersIcon },
                        { key: "settings", label: "Settings", icon: SettingsIcon },
                    ].map((tabItem) => (
                        <button key={tabItem.key} onClick={() => { setActiveTab(tabItem.key); setSearchParams({ id: id, tab: tabItem.key }) }} className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${activeTab === tabItem.key ? "bg-zinc-100 dark:bg-zinc-800/80" : "hover:bg-zinc-50 dark:hover:bg-zinc-700"}`} >
                            <tabItem.icon className="size-3.5" />
                            {tabItem.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === "tasks" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectTasks tasks={tasks} onTasksChange={() => mutate()} projectId={id} />
                        </div>
                    )}
                    {activeTab === "analytics" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectAnalytics tasks={tasks} project={project} />
                        </div>
                    )}
                    {activeTab === "calendar" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectCalendar tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "settings" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectSettings 
                                project={project} 
                                onUpdate={() => mutate()}
                            />
                        </div>
                    )}
                    {activeTab === "members" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectMembers project={project} onUpdate={() => mutate()} />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateTask && <CreateTaskDialog showCreateTask={showCreateTask} setShowCreateTask={setShowCreateTask} projectId={id} />}
        </div>
    );
}
