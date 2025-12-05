import { useState, useEffect } from "react";
import { UserPlus, Trash2, Search, X } from "lucide-react";
import { useSelector } from "react-redux";
import apiClient from "../utils/api.js";
import toast from "react-hot-toast";

export default function ProjectMembers({ project, onUpdate }) {
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter members based on search
    const filteredMembers = project?.members?.filter(
        (member) =>
            member.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Load available users (workspace members not in project)
    useEffect(() => {
        if (isAddDialogOpen && currentWorkspace?.id && project?.members) {
            const projectMemberIds = project.members.map(m => m.userId);
            // Get workspace members
            const workspaceMembers = currentWorkspace.members || [];
            // Filter out those already in project
            const available = workspaceMembers.filter(m => !projectMemberIds.includes(m.userId));
            setAvailableUsers(available);
        }
    }, [isAddDialogOpen, currentWorkspace, project]);

    const handleAddMembers = async () => {
        if (selectedUserIds.length === 0) {
            toast.error('Select users to add');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.addProjectMembers(project.id, selectedUserIds);
            toast.success('Members added successfully');
            setIsAddDialogOpen(false);
            setSelectedUserIds([]);
            onUpdate();
        } catch (error) {
            toast.error(error.message || 'Failed to add members');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (memberId, userId) => {
        if (userId === project.team_lead) {
            toast.error('Cannot remove team lead');
            return;
        }

        const confirm = window.confirm('Are you sure you want to remove this member?');
        if (!confirm) return;

        try {
            await apiClient.removeProjectMember(project.id, userId);
            toast.success('Member removed successfully');
            onUpdate();
        } catch (error) {
            toast.error(error.message || 'Failed to remove member');
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Project Members</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage who has access to this project</p>
                </div>
                <button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                    <UserPlus className="size-4" />
                    Add Member
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-4" />
                <input 
                    placeholder="Search members..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-9 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500" 
                />
            </div>

            {/* Members List */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {member.user.image ? (
                                    <img src={member.user.image} alt={member.user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                                        {member.user.name[0].toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-white">{member.user.name}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.user.email}</p>
                            </div>
                        </div>
                        {member.userId === project.team_lead ? (
                            <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                                Lead
                            </span>
                        ) : (
                            <button 
                                onClick={() => handleRemoveMember(member.id, member.userId)}
                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                title="Remove member"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>
                ))}

                {filteredMembers.length === 0 && (
                    <div className="col-span-full py-8 text-center text-zinc-500 dark:text-zinc-400">
                        No members found matching your search.
                    </div>
                )}
            </div>

            {/* Add Member Dialog */}
            {isAddDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur">
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 text-zinc-900 dark:text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Add Members to Project</h3>
                            <button onClick={() => setIsAddDialogOpen(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {availableUsers.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded p-2">
                                    {availableUsers.map((member) => (
                                        <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUserIds.includes(member.userId)}
                                                onChange={() => toggleUserSelection(member.userId)}
                                                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium">
                                                    {member.user.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{member.user.name}</p>
                                                    <p className="text-xs text-zinc-500">{member.user.email}</p>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-4 text-zinc-500">
                                    All workspace members are already in this project.
                                </p>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    onClick={() => setIsAddDialogOpen(false)}
                                    className="px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAddMembers}
                                    disabled={isSubmitting || selectedUserIds.length === 0}
                                    className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Selected'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
