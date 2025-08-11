import React, { useEffect, useState } from "react";
import { Reorder, motion } from "framer-motion";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const TASKS_KEY = "taskList";
const PIN_KEY = "taskListPinned";

export default function TaskList({ idle, isBreak }: { idle: boolean; isBreak: boolean }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [pinned, setPinned] = useState(() => localStorage.getItem(PIN_KEY) === "1");

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
  }, [pinned]);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setInput("");
  };

  const clearAll = () => setTasks([]);

  const bg = isBreak ? "bg-white/80 text-black" : "bg-black/40 text-white";

  return (
    <motion.div
      className={`fixed top-3 left-3 z-20 p-2 rounded-lg shadow ${bg}`}
      animate={{ opacity: pinned || !idle ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: pinned || !idle ? "auto" : "none" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          className={`flex-1 px-1 py-0.5 text-sm rounded border bg-transparent outline-none ${isBreak ? "border-black/20" : "border-white/20"}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Add task"
        />
        <button
          className="px-2 py-1 text-sm rounded border"
          onClick={addTask}
        >
          Add
        </button>
        <button
          className="px-2 py-1 text-sm rounded border"
          onClick={() => setPinned((p) => !p)}
          title={pinned ? "Unpin" : "Pin"}
        >
          {pinned ? "📌" : "📍"}
        </button>
      </div>
      {tasks.length > 0 && (
        <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="flex flex-col gap-1 mb-2">
          {tasks.map((task) => (
            <Reorder.Item key={task.id} value={task}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-current"
                  checked={task.done}
                  onChange={() =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === task.id ? { ...t, done: !t.done } : t
                      )
                    )
                  }
                />
                <span className={`text-sm ${task.done ? "line-through opacity-60" : ""}`}>{task.text}</span>
              </label>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
      {tasks.length > 0 && (
        <button className="w-full px-2 py-1 text-xs rounded border" onClick={clearAll}>
          Clear All
        </button>
      )}
    </motion.div>
  );
}
