import { useState, useEffect } from "react";
import { Mail, UserPlus, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { fetchWorkspace } from "../features/workspaceSlice";
import apiClient from "../utils/api.js";
import toast from "react-hot-toast";

const AddProjectMember = ({ isDialogOpen, setIsDialogOpen, projectId }) => {
    const dispatch = useDispatch();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [project, setProject] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isAdding, setIsAdding] = useState(false);

    // Fetch project and available users
    useEffect(() => {
        if (isDialogOpen && projectId) {
            const loadData = async () => {
                try {
                    // Fetch project details
                    const projectResponse = await apiClient.getProject(projectId);
                    setProject(projectResponse.project);

                    // Fetch available users from workspace
                    if (currentWorkspace?.id) {
                        const usersResponse = await apiClient.getUsers(currentWorkspace.id);
                        const projectMemberIds = projectResponse.project.members?.map(m => m.userId) || [];
                        const available = usersResponse.users.filter(u => !projectMemberIds.includes(u.id));
                        setAvailableUsers(available);
                    }
                } catch (error) {
                    console.error('Failed to load data:', error);
                }
            };
            loadData();
        }
    }, [isDialogOpen, projectId, currentWorkspace?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!projectId || selectedUserIds.length === 0) {
            toast.error('Please select at least one member');
            return;
        }

        setIsAdding(true);
        try {
            await apiClient.addProjectMembers(projectId, selectedUserIds);
            toast.success('Members added successfully!');
            
            // Refresh workspace
            if (currentWorkspace?.id) {
                await dispatch(fetchWorkspace(currentWorkspace.id));
            }
            
            setSelectedUserIds([]);
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.message || 'Failed to add members');
        } finally {
            setIsAdding(false);
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" /> Add Member to Project
                        </h2>
                        {project && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-400 mt-1">
                                Adding to: <span className="text-blue-600 dark:text-blue-400">{project.name}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setIsDialogOpen(false);
                            setSelectedUserIds([]);
                        }}
                        className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User Selection */}
                    {availableUsers.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto border border-zinc-300 dark:border-zinc-700 rounded p-2">
                            {availableUsers.map((user) => (
                                <label 
                                    key={user.id}
                                    className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user.id)}
                                        onChange={() => toggleUserSelection(user.id)}
                                        className="accent-blue-500"
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                            <span className="text-xs font-semibold">
                                                {user.name[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                            No available users to add
                        </p>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsDialogOpen(false);
                                setSelectedUserIds([]);
                            }} 
                            className="px-5 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isAdding || selectedUserIds.length === 0} 
                            className="px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white disabled:opacity-50 transition" 
                        >
                            {isAdding ? "Adding..." : "Add Members"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectMember;
