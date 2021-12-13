import { Task } from "@prisma/client";
import { Fetcher } from "@remix-run/react/transition";
import cuid from "cuid";
import React from "react";
import { useFetcher, useFormAction } from "remix";
import plusIconUrl from "~/icons/plus.svg";
import { useLayoutEffect } from "./layout-effect";

export enum Actions {
  CREATE_TASK = "CREATE_TASK",
  UPDATE_TASK_NAME = "UPDATE_TASK_NAME",
  MOVE_TASK_TO_DAY = "MOVE_TASK_TO_DAY",
  MOVE_TASK_TO_BACKLOG = "MOVE_TASK_TO_BACKLOG",
  MARK_COMPLETE = "MARK_COMPLETE",
  MARK_INCOMPLETE = "MARK_INCOMPLETE",
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
    <div className="h-full relative">
      <div ref={scrollRef} className="h-full overflow-auto pb-16 mt-[-1px]">
        {renderedTasks.map((task) => renderTask(task))}
      </div>
      <div className="px-2 py-4 absolute left-0 bottom-0 w-full">
        <button
          type="button"
          onClick={addTask}
          className="shadow flex items-center justify-between gap-1 w-full bg-green-500 text-gray-50 px-4 py-2 rounded text-sm font-bold uppercase"
        >
          New Task{" "}
          <svg className="w-5 h-5">
            <use href={`${plusIconUrl}#plus`} />
          </svg>
        </button>
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
    <div className="flex items-center border-t last:border-b text-gray-700 bg-gray-50 focus-within:bg-white p-2 transition-all">
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
}: {
  task: RenderedTask;
  onCreate: () => void;
  onChange: (value: string) => void;
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
      className="flex-1 outline-none"
      contentEditable
      onFocus={(e) => {
        placeCaretAtEnd(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.currentTarget.blur();
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
