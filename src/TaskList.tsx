import React, { useEffect, useState } from "react";
import { Reorder, motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const TASKS_KEY = "taskList";
const PIN_KEY = "taskListPinned";

const sortTasks = (arr: Task[]) => {
  const undone = arr.filter((t) => !t.done);
  const done = arr.filter((t) => t.done);
  return [...undone, ...done];
};

export default function TaskList({
  idle,
  isBreak,
  pauseIdle,
  resumeIdle,
}: {
  idle: boolean;
  isBreak: boolean;
  pauseIdle: () => void;
  resumeIdle: () => void;
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [spark, setSpark] = useState(false);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
  }, [pinned]);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const task = { id: crypto.randomUUID(), text, done: false };
    setTasks((prev) => sortTasks([...prev, task]));
    setInput("");
    setSpark(true);
    setTimeout(() => setSpark(false), 400);
  };

  const clearAll = () => setTasks([]);

  const toggleDone = (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      return sortTasks(updated);
    });
  };

  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bg = isBreak ? "text-black" : "bg-black/40 text-white";
  const btnCls = `px-2 py-1 text-sm rounded border ${
    isBreak
      ? "border-black/20 text-black/60 hover:bg-black/5"
      : "border-white/20 text-white/60 hover:bg-white/10"
  }`;

  return (
    <motion.div
      className={`fixed top-3 left-3 z-20 rounded-lg shadow ${bg}`}
      animate={{ opacity: pinned ? 1 : idle ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: pinned || !idle ? "auto" : "none" }}
      onMouseEnter={pauseIdle}
      onMouseLeave={resumeIdle}
    >
      <AnimatePresence>
        {!idle && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 p-2"
          >
            <input
              className={`flex-1 px-1 py-0.5 text-sm rounded border bg-transparent outline-none ${
                isBreak ? "border-black/20" : "border-white/20"
              }`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
              }}
              onFocus={pauseIdle}
              onBlur={resumeIdle}
              placeholder="Add task"
            />
            <div className="relative">
              <button className={btnCls} onClick={addTask}>
                Add
              </button>
              <AnimatePresence>
                {spark && (
                  <motion.span
                    key="spark"
                    className="absolute inset-0 rounded-full pointer-events-none"
                    initial={{ opacity: 0.6, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      background: isBreak
                        ? "rgba(0,0,0,0.2)"
                        : "rgba(255,255,255,0.2)",
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
            <button
              className={btnCls}
              onClick={() => setPinned((p) => !p)}
              title={pinned ? "Unpin" : "Pin"}
            >
              <PinIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {tasks.length > 0 && (
        <Reorder.Group
          axis="y"
          values={tasks}
          onReorder={(newOrder) => setTasks(sortTasks(newOrder))}
          className="flex flex-col gap-1 p-2"
        >
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <Reorder.Item
                key={task.id}
                value={task}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              >
                <div className="group flex items-start gap-2">
                  <button
                    className="font-mono leading-none"
                    onClick={() => toggleDone(task.id)}
                  >
                    [{task.done ? "x" : " "}]
                  </button>
                  <span
                    className={`flex-1 text-sm whitespace-pre-wrap ${
                      task.done ? "line-through opacity-60" : ""
                    } ${expanded.has(task.id) ? "" : "max-h-10 overflow-hidden"}`}
                    onClick={() => toggleExpand(task.id)}
                  >
                    {task.text}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-red-500"
                    onClick={() => removeTask(task.id)}
                    title="Remove"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {tasks.length > 0 && (
        <AnimatePresence>
          {!idle && (
            <motion.button
              key="clear"
              className={`w-full px-2 py-1 text-xs rounded border ${
                isBreak
                  ? "border-black/20 text-black/60 hover:bg-black/5"
                  : "border-white/20 text-white/60 hover:bg-white/10"
              }`}
              onClick={clearAll}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              Clear All
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9 3h6l1 2h5v2H4V5h5l1-2zm1 5v10h2V8h-2zm4 0v10h2V8h-2zm-6 0v10h2V8H8zm-1 0h10l-1 12H8L7 8z" />
  </svg>
);

const PinIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16 3a1 1 0 00-1 1v5h2l-5 6-5-6h2V4a1 1 0 00-1-1H6v2h2v4H6l6 7v5h2v-5l6-7h-2V5h2V3h-4z" />
  </svg>
);
