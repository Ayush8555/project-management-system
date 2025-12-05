import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Save, AlertTriangle } from 'lucide-react';
import { fetchWorkspaces, clearWorkspaces } from '../features/workspaceSlice';
import apiClient from '../utils/api.js';
import toast from 'react-hot-toast';

const WorkspaceSettings = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Check if user is owner/admin
    const isOwner = currentWorkspace?.ownerId === user?.id;
    const isAdmin = isOwner || currentWorkspace?.members?.some(m => m.userId === user?.id && m.role === 'ADMIN');

    // Initialize form data
    useEffect(() => {
        if (currentWorkspace) {
            setFormData({
                name: currentWorkspace.name || '',
                description: currentWorkspace.description || '',
            });
        }
    }, [currentWorkspace]);

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!currentWorkspace?.id) {
            toast.error('No workspace selected');
            return;
        }

        if (!isAdmin) {
            toast.error('Only admins can update workspace settings');
            return;
        }

        setIsSaving(true);
        try {
            await apiClient.updateWorkspace(currentWorkspace.id, {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
            });

            toast.success('Workspace updated successfully!');
            
            // Refresh workspaces
            await dispatch(fetchWorkspaces());
        } catch (error) {
            toast.error(error.message || 'Failed to update workspace');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!currentWorkspace?.id) {
            toast.error('No workspace selected');
            return;
        }

        if (!isOwner) {
            toast.error('Only the workspace owner can delete the workspace');
            return;
        }

        setIsDeleting(true);
        try {
            await apiClient.deleteWorkspace(currentWorkspace.id);
            toast.success('Workspace deleted successfully!');
            
            // Clear current workspace
            dispatch(clearWorkspaces());
            
            // Refresh workspaces list
            await dispatch(fetchWorkspaces());
            
            // Navigate to dashboard
            navigate('/');
        } catch (error) {
            toast.error(error.message || 'Failed to delete workspace');
            setIsDeleting(false);
        }
    };

    if (!currentWorkspace) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-zinc-400">No workspace selected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    Workspace Settings
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                    Manage your workspace settings and preferences
                </p>
            </div>

            {/* Workspace Details */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Workspace Details
                </h2>
                
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Workspace Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                            placeholder="Workspace name"
                            required
                            disabled={!isAdmin}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-zinc-800 text-gray-900 dark:text-white resize-none"
                            placeholder="Workspace description"
                            rows={4}
                            disabled={!isAdmin}
                        />
                    </div>

                    {isAdmin && (
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                <Save className="size-4" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}

                    {!isAdmin && (
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                            Only admins can edit workspace settings
                        </p>
                    )}
                </form>
            </div>

            {/* Danger Zone */}
            {isOwner && (
                <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                        <h2 className="text-lg font-medium text-red-600 dark:text-red-400">
                            Danger Zone
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                Delete Workspace
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                                Once you delete a workspace, there is no going back. Please be certain.
                            </p>
                            
                            {!showDeleteConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                >
                                    <Trash2 className="size-4" />
                                    Delete Workspace
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                        Are you absolutely sure? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleDeleteWorkspace}
                                            disabled={isDeleting}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                                        >
                                            <Trash2 className="size-4" />
                                            {isDeleting ? 'Deleting...' : 'Yes, Delete Workspace'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={isDeleting}
                                            className="px-4 py-2 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceSettings;

