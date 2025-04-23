import React, { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";


export default function TaskGanttView({ onTaskClick }) {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [startDateFilter, setStartDateFilter] = useState("");
    const [endDateFilter, setEndDateFilter] = useState("");

    useEffect(() => {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        fetch(`${apiUrl}/tasks`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const filteredTasks = data.tasks.filter(task => task.startDate && task.endDate);
                const formattedTasks = filteredTasks.map((task, index) => ({
                    ...task,
                    id: task._id || index.toString(),
                    name: task.title,
                    start: new Date(task.startDate),
                    end: new Date(task.endDate),
                    type: "task",
                    progress: task.progress || 100,
                    isDisabled: false,
                    styles: { progressColor: '#ffbb54', progressSelectedColor: '#ff9e0d' },

            }));
            setTasks(formattedTasks);
            })
            .catch((error) => console.error("Fehler beim Laden der Tasks:", error))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredTasks = tasks.filter(task => 
        (!startDateFilter || task.start >= new Date(startDateFilter).getTime()) &&
        (!endDateFilter || task.end <= new Date(endDateFilter).getTime())
    );

    const minDate = filteredTasks.length > 0 ? Math.min(...filteredTasks.map(task => task.start)) : null;
    const maxDate = filteredTasks.length > 0 ? Math.max(...filteredTasks.map(task => task.end)) : null;

    const handleTaskChange = (updatedTask) => {
        console.log(updatedTask)
        setTasks(tasks.map(task => (task.id === updatedTask.id ? updatedTask : task)));
        
        fetch(`${apiUrl}/tasks/${updatedTask.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem("token"),
            },
            body: JSON.stringify({
                startDate: updatedTask.start.toISOString(),
                endDate: updatedTask.end.toISOString(),
                progress: updatedTask.progress,
            }),
        }).catch((error) => console.error("Fehler beim Aktualisieren der Aufgabe:", error));
    };

    return (
        <div className="custom-gantt-container" style={{ width: "100%", height: "500px" }}>
            <div style={{ marginBottom: "10px" }}>
                <label>Startdatum: </label>
                <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
                <label> Enddatum: </label>
                <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
            </div>
            {isLoading ? (
                <p>Lade Aufgaben...</p>
            ) : filteredTasks.length > 0 ? (
                <Gantt tasks={filteredTasks} viewMode={ViewMode.HalfDay} columnWidth={65} onDateChange={handleTaskChange} onClick={(task) => onTaskClick(task)} />
            ) : (
                <p>Keine Aufgaben verfügbar.</p>
            )}
        </div>
    );
}
