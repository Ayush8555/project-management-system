import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, Search, FolderOpen } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ProjectCard from "../components/ProjectCard";
import CreateProjectDialog from "../components/CreateProjectDialog";
import { fetchWorkspace } from "../features/workspaceSlice";
import { ProjectCardSkeleton } from "../components/Skeletons";
import useSWR from "swr";
import fetcher from "../utils/fetcher";

export default function Projects() {
    const dispatch = useDispatch();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        status: "ALL",
        priority: "ALL",
    });
    const prevDialogOpenRef = useRef(false);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filters.status, filters.priority]);

    const shouldFetch = isAuthenticated && !authLoading && currentWorkspace?.id;
    
    // Construct query path
    const queryParams = new URLSearchParams({
        workspaceId: currentWorkspace?.id || '',
        page: currentPage,
        limit: 9,
        search: debouncedSearchTerm,
        status: filters.status,
        priority: filters.priority
    }).toString();

    // SWR takes over caching, deduplication, and fetching
    const { data: response, isLoading, mutate } = useSWR(
        shouldFetch ? `/api/projects?${queryParams}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            keepPreviousData: true, // Prevents layout shift while paginating/searching
        }
    );

    const projects = response?.projects || [];
    const pagination = response?.pagination || null;

    // Refresh projects after creating new one
    useEffect(() => {
        if (prevDialogOpenRef.current && !isDialogOpen && shouldFetch) {
            mutate();
        }
        prevDialogOpenRef.current = isDialogOpen;
    }, [isDialogOpen, shouldFetch, mutate]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Projects </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Manage and track your projects </p>
                </div>
                <button onClick={() => setIsDialogOpen(true)} className="flex items-center px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition" >
                    <Plus className="size-4 mr-2" /> New Project
                </button>
                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 w-4 h-4" />
                    <input onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm} className="w-full pl-10 text-sm pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:border-blue-500 outline-none" placeholder="Search projects..." />
                </div>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm" >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm" >
                    <option value="ALL">All Priority</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            </div>

            {/* Projects Grid */}
            {isLoading && projects.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48"><ProjectCardSkeleton /></div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.length === 0 ? (
                            <div className="col-span-full text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                    <FolderOpen className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    No projects found
                                </h3>
                                <p className="text-gray-500 dark:text-zinc-400 mb-6 text-sm">
                                    Try adjusting your search or filters, or create your first project to get started
                                </p>
                                <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mx-auto text-sm" >
                                    <Plus className="size-4" />
                                    Create Project
                                </button>
                            </div>
                        ) : (
                            projects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))
                        )}
                    </div>
                    
                    {/* Pagination Controls */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 pt-4">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-gray-300 dark:border-zinc-700 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600 dark:text-zinc-400 font-medium">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={currentPage === pagination.totalPages}
                                className="px-4 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-gray-300 dark:border-zinc-700 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

