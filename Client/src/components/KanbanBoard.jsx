import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { mutate } from "swr";
import apiClient from "../utils/api.js";
import toast from "react-hot-toast";
import { Bug, CalendarIcon, GitCommit, MessageSquare, Square, Zap } from "lucide-react";

// Same icons and colors as ProjectTasks (keeps consistent look)
const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-600 dark:text-purple-400" },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityColors = {
    LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    HIGH: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

// The 3 Kanban columns
const COLUMNS = [
    { id: "TODO", title: "To Do", color: "border-zinc-400 dark:border-zinc-600", bg: "bg-zinc-100 dark:bg-zinc-800/50" },
    { id: "IN_PROGRESS", title: "In Progress", color: "border-amber-400 dark:border-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { id: "DONE", title: "Done", color: "border-emerald-400 dark:border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
];

export default function KanbanBoard({ tasks, projectId }) {
    const navigate = useNavigate();

    // Group tasks by status
    const columns = useMemo(() => {
        const grouped = { TODO: [], IN_PROGRESS: [], DONE: [] };
        tasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    // Called when a card is dropped
    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        // Dropped outside a column or in the same position
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId; // "TODO", "IN_PROGRESS", or "DONE"
        const taskId = draggableId;
        const swrKey = `/api/projects/${projectId}`;

        // Optimistic update: immediately move the card in the UI
        // We use a function to get the current cached data so we don't overwrite the whole project object
        const optimisticUpdate = (currentData) => {
            if (!currentData || !currentData.project) return currentData;
            return {
                ...currentData,
                project: {
                    ...currentData.project,
                    tasks: currentData.project.tasks.map((t) =>
                        t.id === taskId ? { ...t, status: newStatus } : t
                    ),
                },
            };
        };

        try {
            mutate(swrKey, optimisticUpdate, false);
            await apiClient.updateTask(taskId, { status: newStatus });
            mutate(swrKey); // Refresh with real server data
        } catch (error) {
            mutate(swrKey); // Revert on error
            toast.error(error?.message || "Failed to update task status");
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COLUMNS.map((column) => (
                    <div key={column.id} className={`rounded-lg border-t-4 ${column.color} ${column.bg} p-3 min-h-[300px]`}>
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                                {column.title}
                            </h3>
                            <span className="text-xs bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                                {columns[column.id]?.length || 0}
                            </span>
                        </div>

                        {/* Droppable Area */}
                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`space-y-2 min-h-[200px] rounded-md p-1 transition-colors ${
                                        snapshot.isDraggingOver
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : ""
                                    }`}
                                >
                                    {columns[column.id]?.map((task, index) => (
                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)}
                                                    className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all ${
                                                        snapshot.isDragging
                                                            ? "shadow-lg ring-2 ring-blue-400 rotate-[2deg]"
                                                            : "shadow-sm"
                                                    }`}
                                                >
                                                    {/* Task Title */}
                                                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-2">
                                                        {task.title}
                                                    </p>

                                                    {/* Type and Priority */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {typeIcons[task.type] && (
                                                            <span className={`${typeIcons[task.type].color}`}>
                                                                {(() => {
                                                                    const Icon = typeIcons[task.type].icon;
                                                                    return <Icon className="size-3.5" />;
                                                                })()}
                                                            </span>
                                                        )}
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority] || ""}`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>

                                                    {/* Assignee and Due Date */}
                                                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <img
                                                                src={task.assignee?.image || "/profile_img_a.svg"}
                                                                className="size-5 rounded-full"
                                                                alt="avatar"
                                                                onError={(e) => { e.target.src = "/profile_img_a.svg"; }}
                                                            />
                                                            <span>{task.assignee?.name || "Unassigned"}</span>
                                                        </div>
                                                        {task.due_date && (
                                                            <div className="flex items-center gap-1">
                                                                <CalendarIcon className="size-3" />
                                                                {format(new Date(task.due_date), "dd MMM")}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
}
