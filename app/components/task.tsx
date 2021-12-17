import { Task } from "@prisma/client";
// @ts-expect-error
import sortBy from "sort-by";
import cuid from "cuid";
import React from "react";
import { useFetcher, useFormAction } from "remix";
import { PlusIcon } from "./icons";
import { useLayoutEffect } from "./layout-effect";

export enum Actions {
  CREATE_TASK = "CREATE_TASK",
  UPDATE_TASK_NAME = "UPDATE_TASK_NAME",
  MOVE_TASK_TO_DAY = "MOVE_TASK_TO_DAY",
  MOVE_TASK_TO_BACKLOG = "MOVE_TASK_TO_BACKLOG",
  MARK_COMPLETE = "MARK_COMPLETE",
  MARK_INCOMPLETE = "MARK_INCOMPLETE",
  DELETE_TASK = "DELETE_TASK",
}

export type NewTask = {
  id: string;
  name: string;
  isNew?: boolean;
  complete?: boolean;
};

export type RenderedTask = Task | NewTask;

export function isNewTask(task: any): task is NewTask {
  return (
    task &&
    typeof task.id === "string" &&
    typeof task.name === "string" &&
    task.isNew
  );
}

export function useOptimisticTasks(
  savedTasks: Task[]
): [RenderedTask[], () => void] {
  let [optimisticIds, setOptimisticIds] = React.useState<string[]>([]);

  // Both optimistic and actual tasks combined into one array
  let renderedTasks: Array<RenderedTask> = [...savedTasks];

  // Add the optimistic tasks to the rendered list
  let savedTaskIds = new Set(savedTasks.map((t) => t.id));
  for (let id of optimisticIds) {
    if (!savedTaskIds.has(id)) {
      renderedTasks.push({ id, name: "", isNew: true });
    }
  }

  // Clear out optimistic task IDs when they show up in the actual list
  React.useEffect(() => {
    let newIds = new Set(optimisticIds);
    let intersection = new Set([...savedTaskIds].filter((x) => newIds.has(x)));
    if (intersection.size) {
      setOptimisticIds(optimisticIds.filter((id) => !intersection.has(id)));
    }
  });

  let addTask = React.useCallback(() => {
    setOptimisticIds((ids) => ids.concat([cuid()]));
  }, []);

  return [renderedTasks, addTask];
}

export function TaskList({
  tasks,
  renderTask,
}: {
  tasks: Task[];
  renderTask: (task: RenderedTask) => React.ReactNode;
}) {
  let [renderedTasks, addTask] = useOptimisticTasks(tasks);
  let scrollRef = React.useRef<HTMLDivElement>(null);

  // scroll to bottom of task list on mount, causes flicker on hydration
  // sometimes but oh well
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <div>
        <div>
          {renderedTasks
            .slice(0)
            .sort(sortBy("createdAt"))
            .map((task) => renderTask(task))}
        </div>
        <div className="px-4 py-4 w-full">
          <button
            type="button"
            onClick={addTask}
            style={{
              WebkitTapHighlightColor: "transparent",
            }}
            className="shadow flex items-center justify-between gap-1 w-full nm-flat-gray-100 active:nm-inset-gray-100 text-green-500 px-4 py-2 rounded text-sm font-bold uppercase"
          >
            New Task <PlusIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskItem({
  children,
  hide,
}: {
  children: React.ReactNode;
  // TODO: bringin in an animation library, needs to wrap the whole list to
  // persist them for the animation
  hide?: boolean;
}) {
  return hide ? null : (
    <div className="flex items-center border-t last:border-b border-gray-100 text-gray-700 bg-gray-50 focus-within:bg-white py-2 px-4">
      {children}
    </div>
  );
}

// FIXME: add this export to remix
type FetcherWithComponents = ReturnType<typeof useFetcher>;

export function EditableTask({
  task,
  onCreate,
  onChange,
  onDelete,
}: {
  task: RenderedTask;
  onCreate: () => void;
  onChange: (value: string) => void;
  onDelete: () => void;
}) {
  // uncontrolled contenteditable, so don't ever take an update from the server
  let [initialValue] = React.useState(task.name);

  let ref = React.useRef<HTMLDivElement>(null);
  let isNew = isNewTask(task);

  // Kick off the fetcher to create a new record and focus when it's new layout
  // effect so it's in the same tick of the event and therefore "in response to
  // a user interactions" so that the keyboard opens up to start editing
  useLayoutEffect(() => {
    if (isNew) {
      ref.current?.focus();
      // scroll iOS all the way
      ref.current?.scrollIntoView();
      onCreate();
    }
  }, [isNew]);

  return (
    <div
      ref={ref}
      className="flex-1 outline-none px-4"
      contentEditable
      onFocus={(e) => {
        placeCaretAtEnd(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.currentTarget.blur();
        }
        if (e.key === "Backspace") {
          let value = e.currentTarget.innerHTML.trim();
          if (value === "") {
            onDelete();
          }
        }
      }}
      onBlur={(e) => {
        let value = e.currentTarget.innerHTML.trim();
        if (value !== task.name) {
          onChange(value);
        }
      }}
      dangerouslySetInnerHTML={{ __html: initialValue }}
    />
  );
}

function placeCaretAtEnd(node: HTMLElement) {
  let range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  let sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
