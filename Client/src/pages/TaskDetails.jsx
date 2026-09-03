import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CalendarIcon, MessageCircle, PenIcon, Edit2Icon, ArrowLeftIcon, Trash2Icon } from "lucide-react";
import apiClient from "../utils/api.js";
import EditTaskDialog from "../components/EditTaskDialog";
import { useSelector } from "react-redux";
import { getSocket, connectSocket, joinRoom, leaveRoom } from "../utils/socket.js";

const TaskDetails = () => {

    const [searchParams] = useSearchParams();
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");
    const navigate = useNavigate();

    const { user } = useAuth();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const fetchTaskDetails = async () => {
        setLoading(true);
        if (!taskId) {
            setLoading(false);
            return;
        }

        try {
            // Fetch everything in parallel since we have both taskId and projectId from the URL
            const [taskResponse, projectResponse, commentsResponse] = await Promise.all([
                apiClient.getTask(taskId),
                projectId 
                    ? apiClient.getProject(projectId).catch((err) => { console.error(err); return null; }) 
                    : Promise.resolve(null),
                apiClient.getComments(taskId).catch((err) => { console.error(err); return { comments: [] }; })
            ]);

            setTask(taskResponse.task);
            if (projectResponse) setProject(projectResponse.project);
            setComments(commentsResponse.comments || []);
        } catch (error) {
            console.error('Failed to fetch task details:', error);
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            toast.error('Comment cannot be empty');
            return;
        }

        if (!taskId) return;

        try {
            toast.loading("Adding comment...");

            const response = await apiClient.createComment({
                content: newComment.trim(),
                taskId,
            });

            setComments((prev) => [response.comment, ...prev]);
            setNewComment("");
            toast.dismiss();
            toast.success("Comment added successfully!");
        } catch (error) {
            toast.dismiss();
            toast.error(error.message || 'Failed to add comment');
            console.error(error);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
        
        // Real-time comments
        if (taskId) {
            const socket = connectSocket();
            const room = `task:${taskId}`;
            if (socket) {
                joinRoom(room);
                const handleCommentCreated = (newComment) => {
                    setComments((prev) => {
                        // Prevent duplicates if we already added it locally
                        if (prev.some(c => c.id === newComment.id)) return prev;
                        return [newComment, ...prev];
                    });
                };
                socket.on('comment:created', handleCommentCreated);
                socket.on('chat:cleared', () => setComments([]));
                return () => {
                    socket.off('comment:created', handleCommentCreated);
                    socket.off('chat:cleared');
                    leaveRoom(room);
                };
            }
        }
    }, [taskId]);

    // Check if user is admin/owner
    const isAdmin = currentWorkspace?.ownerId === user?.id || 
                   currentWorkspace?.members?.some(m => m.userId === user?.id && m.role === 'ADMIN') ||
                   project?.team_lead === user?.id;

    const handleClearChat = async () => {
        if (!isAdmin) return;
        if (!confirm("Are you sure you want to clear this task's chat history for everyone?")) return;
        
        try {
            await apiClient.clearComments(taskId);
            toast.success("Chat cleared successfully");
            // The UI clears automatically when the chat:cleared socket event is received
        } catch (error) {
            toast.error(error.message || "Failed to clear chat");
        }
    };

    if (loading) return <div className="text-gray-500 dark:text-zinc-400 px-4 py-6">Loading task details...</div>;
    if (!task) return <div className="text-red-500 px-4 py-6">Task not found.</div>;

    return (
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
            {/* Header / Back Button */}
            <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                    title="Go Back"
                >
                    <ArrowLeftIcon className="size-5" />
                </button>
                <h1 className="text-xl font-medium">Task Details</h1>
            </div>

            <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100">
            {/* Left: Comments / Chatbox */}
            <div className="w-full lg:w-2/3">
                <div className="p-5 rounded-md  border border-gray-300 dark:border-zinc-800  flex flex-col lg:h-[80vh]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                            <MessageCircle className="size-5" /> Task Discussion ({comments.length})
                        </h2>
                        {isAdmin && (
                            <button
                                onClick={handleClearChat}
                                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Clear chat history for everyone"
                            >
                                <Trash2Icon className="size-3.5" />
                                Clear Chat
                            </button>
                        )}
                    </div>

                    <div className="flex-1 md:overflow-y-scroll no-scrollbar">
                        {comments.length > 0 ? (
                            <div className="flex flex-col gap-4 mb-6 mr-2">
                                {comments.map((comment) => (
                                    <div key={comment.id} className={`sm:max-w-4/5 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-900 border border-gray-300 dark:border-zinc-700 p-3 rounded-md ${comment.user.id === user?.id ? "ml-auto" : "mr-auto"}`} >
                                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500 dark:text-zinc-400">
                                            <img 
                                                src={comment.user.image || '/profile_img_a.svg'} 
                                                alt="avatar" 
                                                className="size-5 rounded-full"
                                                onError={(e) => {
                                                    e.target.src = '/profile_img_a.svg';
                                                }}
                                            />
                                            <span className="font-medium text-gray-900 dark:text-white">{comment.user.name}</span>
                                            <span className="text-xs text-gray-400 dark:text-zinc-600">
                                                • {format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-zinc-200">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 dark:text-zinc-500 mb-4 text-sm">No comments yet. Be the first!</p>
                        )}
                    </div>

                    {/* Add Comment */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                            rows={3}
                        />
                        <button onClick={handleAddComment} className="bg-gradient-to-l from-blue-500 to-blue-600 transition-colors text-white text-sm px-5 py-2 rounded " >
                            Post
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Task + Project Info */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
                {/* Task Info */}
                <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 ">
                    <div className="mb-3">
                        <div className="flex justify-between items-start">
                            <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{task.title}</h1>
                            <button 
                                onClick={() => setIsEditOpen(true)}
                                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                title="Edit Task"
                            >
                                <Edit2Icon className="size-4" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-300 text-xs">
                                {task.status}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300 text-xs">
                                {task.type}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-emerald-900 text-green-900 dark:text-emerald-300 text-xs">
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-4">{task.description}</p>
                    )}

                    <hr className="border-zinc-200 dark:border-zinc-700 my-3" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                            <img 
                                src={task.assignee?.image || '/profile_img_a.svg'} 
                                className="size-5 rounded-full" 
                                alt="avatar"
                                onError={(e) => {
                                    e.target.src = '/profile_img_a.svg';
                                }}
                            />
                            {task.assignee?.name || "Unassigned"}
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-4 text-gray-500 dark:text-zinc-500" />
                            Due : {format(new Date(task.due_date), "dd MMM yyyy")}
                        </div>
                    </div>
                </div>

                {/* Project Info */}
                {project && (
                    <div className="p-4 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800 ">
                        <p className="text-xl font-medium mb-4">Project Details</p>
                        <h2 className="text-gray-900 dark:text-zinc-100 flex items-center gap-2"> <PenIcon className="size-4" /> {project.name}</h2>
                        <p className="text-xs mt-3">Project Start Date: {format(new Date(project.start_date), "dd MMM yyyy")}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-zinc-400 mt-3">
                            <span>Status: {project.status}</span>
                            <span>Priority: {project.priority}</span>
                            <span>Progress: {project.progress}%</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Edit Task Dialog */}
            <EditTaskDialog 
                isOpen={isEditOpen} 
                setIsOpen={setIsEditOpen} 
                task={task} 
                isAdmin={isAdmin}
                onUpdate={(updatedTask) => {
                    setTask(updatedTask);
                    // Also refresh task list if needed via context or forced reload, but local state update is good for now
                }} 
            />
            </div>
        </div>
    );
};

export default TaskDetails;
