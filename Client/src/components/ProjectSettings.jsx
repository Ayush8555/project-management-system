import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchWorkspace } from "../features/workspaceSlice";
import AddProjectMember from "./AddProjectMember";
import apiClient from "../utils/api.js";
import toast from "react-hot-toast";

export default function ProjectSettings({ project, onUpdate }) {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "ACTIVE",
        priority: "MEDIUM",
        start_date: null,
        end_date: null,
        progress: 0,
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || "",
                description: project.description || "",
                status: project.status || "ACTIVE",
                priority: project.priority || "MEDIUM",
                start_date: project.start_date ? new Date(project.start_date) : null,
                end_date: project.end_date ? new Date(project.end_date) : null,
                progress: project.progress || 0,
            });
        }
    }, [project]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!project?.id) {
            toast.error('Project not found');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.updateProject(project.id, {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                status: formData.status,
                priority: formData.priority,
                start_date: formData.start_date ? formData.start_date.toISOString() : null,
                end_date: formData.end_date ? formData.end_date.toISOString() : null,
            });

            toast.success('Project settings updated successfully!');
            
            // Fetch updated project
            try {
                const updatedResponse = await apiClient.getProject(project.id);
                if (onUpdate) {
                    onUpdate(updatedResponse.project);
                }
                
                // Refresh workspace to get updated project list
                if (project.workspaceId) {
                    await dispatch(fetchWorkspace(project.workspaceId));
                }
            } catch (error) {
                console.error('Failed to refresh project:', error);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update project settings');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";
    const cardClasses = "rounded-lg border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800";
    const labelClasses = "text-sm text-zinc-600 dark:text-zinc-400";

    if (!project) {
        return (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                No project selected
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">Project Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Project Name</label>
                        <input 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            className={inputClasses} 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            className={inputClasses + " h-24"} 
                        />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Status</label>
                            <select 
                                value={formData.status} 
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                                className={inputClasses}
                            >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClasses}>Priority</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
                                className={inputClasses}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Start Date</label>
                            <input 
                                type="date" 
                                value={formData.start_date ? format(formData.start_date, "yyyy-MM-dd") : ""} 
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value ? new Date(e.target.value) : null })} 
                                className={inputClasses} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClasses}>End Date</label>
                            <input 
                                type="date" 
                                value={formData.end_date ? format(formData.end_date, "yyyy-MM-dd") : ""} 
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value ? new Date(e.target.value) : null })} 
                                className={inputClasses} 
                            />
                        </div>
                    </div>

                    {/* Progress - Read only (calculated from tasks) */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Progress: {formData.progress}%</label>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded">
                            <div 
                                className="h-2 bg-blue-500 rounded" 
                                style={{ width: `${formData.progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Progress is automatically calculated from task completion
                        </p>
                    </div>

                    {/* Save Button */}
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" 
                    >
                        <Save className="size-4" /> {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300">
                            Team Members <span className="text-sm text-zinc-600 dark:text-zinc-400">({project.members?.length || 0})</span>
                        </h2>
                        <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(true)} 
                            className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                        >
                            <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                        </button>
                        <AddProjectMember 
                            isDialogOpen={isDialogOpen} 
                            setIsDialogOpen={setIsDialogOpen}
                            projectId={project.id}
                        />
                    </div>

                    {/* Member List */}
                    {project.members && project.members.length > 0 ? (
                        <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                            {project.members.map((member, index) => (
                                <div 
                                    key={member.id || index} 
                                    className="flex items-center justify-between px-3 py-2 rounded dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-300" 
                                >
                                    <span>{member?.user?.name || member?.user?.email || "Unknown"}</span>
                                    {project.team_lead === member.userId && (
                                        <span className="px-2 py-0.5 rounded-xs ring ring-zinc-200 dark:ring-zinc-600 text-xs">
                                            Team Lead
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                            No team members yet
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
