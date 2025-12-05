import { useState } from "react";
import { Mail, UserPlus, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { fetchWorkspace } from "../features/workspaceSlice";
import apiClient from "../utils/api.js";
import toast from "react-hot-toast";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const dispatch = useDispatch();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentWorkspace?.id) {
            toast.error('No workspace selected');
            return;
        }

        if (!email.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.inviteWorkspaceMember(currentWorkspace.id, email);
            
            // Refresh workspace
            await dispatch(fetchWorkspace(currentWorkspace.id));

            toast.success('Invitation sent successfully!');
            setEmail("");
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.message || 'Failed to invite member');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" /> Invite Team Member
                        </h2>
                        {currentWorkspace && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-400 mt-1">
                                Inviting to workspace: <span className="text-blue-600 dark:text-blue-400">{currentWorkspace.name}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setIsDialogOpen(false)}
                        className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Enter email address" 
                                className="pl-10 mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:border-blue-500" 
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            If the user exists, they will be added immediately. Otherwise, an invite will be sent.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsDialogOpen(false);
                                setEmail("");
                            }} 
                            className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !email.trim()} 
                            className="px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 hover:opacity-90 transition" 
                        >
                            {isSubmitting ? "Sending..." : "Send Invite"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;
