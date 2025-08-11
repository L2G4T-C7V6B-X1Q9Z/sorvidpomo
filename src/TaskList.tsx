import React, { useEffect, useState } from "react";
import { Reorder, motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const TASKS_KEY = "taskList";
const PIN_KEY = "taskListPinned";

export default function TaskList({
  idle,
  isBreak,
  setIdleGuard,
}: {
  idle: boolean;
  isBreak: boolean;
  setIdleGuard: (lock: boolean) => void;
}) {
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
  const [dragging, setDragging] = useState(false);
  const [spark, setSpark] = useState(0);

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
    setSpark((s) => s + 1);
  };

  const toggleTask = (id: string) =>
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      );
      return [...updated.filter((t) => !t.done), ...updated.filter((t) => t.done)];
    });

  const removeTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const clearAll = () => setTasks([]);

  const theme = isBreak ? "text-black" : "text-white";
  const activeBg = isBreak ? "" : "bg-black/40 backdrop-blur";
  const containerCls = `fixed top-3 left-3 z-20 rounded-lg ${theme} ${
    pinned && idle ? "" : `p-2 ${activeBg}`
  }`;

  return (
    <motion.div
      className={containerCls}
      onMouseEnter={() => setIdleGuard(true)}
      onMouseLeave={() => setIdleGuard(false)}
      animate={{ opacity: pinned || !idle ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: pinned || !idle ? "auto" : "none" }}
    >
      <motion.div
        className="flex items-center gap-2 mb-2"
        animate={{ opacity: idle ? 0 : 1 }}
        style={{ pointerEvents: idle ? "none" : "auto" }}
      >
        <input
          className={`flex-1 px-1 py-0.5 text-sm rounded border bg-transparent outline-none ${
            isBreak ? "border-black/20" : "border-white/20"
          }`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIdleGuard(true)}
          onBlur={() => setIdleGuard(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Add task"
        />
        <button
          className="relative px-2 py-1 text-sm rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
          onClick={addTask}
        >
          Add
          <AnimatePresence>
            <motion.span
              key={spark}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0.6, scale: 0.8 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.4 }}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
            </motion.span>
          </AnimatePresence>
        </button>
        <button
          className="px-2 py-1 text-sm rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
          onClick={() => setPinned((p) => !p)}
          title={pinned ? "Unpin" : "Pin"}
        >
          <PinIcon pinned={pinned} />
        </button>
      </motion.div>
      {tasks.length > 0 && (
        <Reorder.Group
          axis="y"
          values={tasks}
          onReorder={setTasks}
          className="flex flex-col gap-1"
        >
          <AnimatePresence>
            {tasks.map((task) => (
              <Reorder.Item
                key={task.id}
                value={task}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
              >
                <div className="group flex items-start gap-2 p-1 rounded hover:bg-black/10">
                  <span
                    onClick={() => !dragging && toggleTask(task.id)}
                    className="select-none font-mono text-base leading-5"
                  >
                    {task.done ? "[x]" : "[ ]"}
                  </span>
                  <span
                    className={`flex-1 text-sm ${task.done ? "line-through opacity-60" : ""} overflow-hidden max-h-10 group-hover:max-h-40 group-hover:overflow-auto`}
                  >
                    {task.text}
                  </span>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="ml-2 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <MinusCircleIcon />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      {tasks.length > 0 && (
        <motion.button
          className="mt-2 w-full px-2 py-1 text-xs rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
          onClick={clearAll}
          animate={{ opacity: idle ? 0 : 1 }}
          style={{ pointerEvents: idle ? "none" : "auto" }}
        >
          Clear All
        </motion.button>
      )}
    </motion.div>
  );
}

const PinIcon = ({ pinned, size = 14 }: { pinned: boolean; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    fill={pinned ? "currentColor" : "none"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 2l4 4-6 6v4l-2 2-2-2v-4L4 6l4-4h8z"
    />
  </svg>
);

const MinusCircleIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M8 12h8" />
  </svg>
);
