import { useState, useEffect, useRef } from 'react';
import { SearchIcon, X, Loader2, FolderIcon, CheckSquareIcon, UserIcon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 0) {
                setLoading(true);
                try {
                    const data = await apiClient.search(query);
                    setResults(data);
                    setIsOpen(true);
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults(null);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleNavigate = (path) => {
        setIsOpen(false);
        setQuery('');
        navigate(path);
    };

    const hasResults = results && (results.projects?.length > 0 || results.tasks?.length > 0 || results.members?.length > 0);

    return (
        <div className="relative flex-1 max-w-sm" ref={searchRef}>
            <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if(query) setIsOpen(true); }}
                    placeholder="Search projects, tasks, members..."
                    className="pl-8 pr-8 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                {query && (
                    <button 
                        onClick={() => { setQuery(''); setResults(null); setIsOpen(false); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        {loading ? <Loader2 className="size-3.5 animate-spin"/> : <X className="size-3.5" />}
                    </button>
                )}
            </div>

            {isOpen && query.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-800 max-h-[80vh] overflow-y-auto z-50">
                    {!loading && !hasResults ? (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="py-2">
                            {/* Projects */}
                            {results?.projects?.length > 0 && (
                                <div className="mb-2">
                                    <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Projects
                                    </h3>
                                    {results.projects.map(project => (
                                        <div 
                                            key={project.id}
                                            onClick={() => handleNavigate(`/projectsDetail?id=${project.id}`)}
                                            className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer group"
                                        >
                                            <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                                <FolderIcon className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {project.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                                    {project.status.replace('_', ' ')}
                                                </p>
                                            </div>
                                            <ArrowRight className="size-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tasks */}
                            {results?.tasks?.length > 0 && (
                                <div className="mb-2">
                                    <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Tasks
                                    </h3>
                                    {results.tasks.map(task => (
                                        <div 
                                            key={task.id}
                                            onClick={() => handleNavigate(`/taskDetails?id=${task.id}`)}
                                            className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer group"
                                        >
                                            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                                <CheckSquareIcon className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {task.title}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                                                    <span className="truncate max-w-[100px]">{task.project.name}</span>
                                                    <span>•</span>
                                                    <span>{task.status}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="size-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Members */}
                            {results?.members?.length > 0 && (
                                <div>
                                    <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Members
                                    </h3>
                                    {results.members.map(member => (
                                        <div 
                                            key={member.id}
                                            // There isn't a specific member profile page yet, maybe just navigate to Team page or do nothing but show info
                                            // Requirement says: "Search should work... in Teams, Members"
                                            // Let's navigate to Team page with query? Or just nothing for now.
                                            // Or maybe we can just open a profile modal if we had one.
                                            // For now, let's just highlight that they exist.
                                            className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-default"
                                        >
                                            <img 
                                                src={member.image || '/profile_img_a.svg'} 
                                                alt={member.name}
                                                className="size-8 rounded-full bg-gray-200 dark:bg-zinc-700"
                                                onError={(e) => e.target.src = '/profile_img_a.svg'}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {member.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                                    {member.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
