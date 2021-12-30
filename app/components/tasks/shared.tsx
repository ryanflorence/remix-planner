// @ts-expect-error
import sortBy from "sort-by";
import React from "react";
import { Task } from "@prisma/client";
import cuid from "cuid";
import { Form, useFetchers } from "remix";

import { PlusIcon } from "~/components/icons";
import { useLayoutEffect } from "~/components/layout-effect";
import { Actions } from "~/actions/actions";
import { AppButton } from "~/components/forms";

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

////////////////////////////////////////////////////////////////////////////////
export function TaskList({
  tasks,
  renderTask,
  day: date,
}: {
  tasks: Task[];
  renderTask: (task: RenderedTask) => React.ReactNode;
  day?: string;
}) {
  let [peNewId] = React.useState(() => cuid());
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
          {/* PE Form, not used when JS is loaded */}
          <Form method="post" onSubmit={(e) => e.preventDefault()}>
            <input type="hidden" name="_action" value={Actions.CREATE_TASK} />
            <input type="hidden" name="id" value={peNewId} />
            <input type="hidden" name="name" value="" />
            {date && <input type="hidden" name="date" value={date} />}
            <AppButton
              type="submit"
              onClick={(event) => {
                addTask();
                event.preventDefault();
              }}
            >
              New Task <PlusIcon />
            </AppButton>
          </Form>
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
    <div className="flex items-start border-t last:border-b border-gray-100 text-gray-700 bg-gray-50 focus-within:bg-white py-2 px-4">
      {children}
    </div>
  );
}

export function TaskListHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-gray-100 border-b text-center p-4 font-bold uppercase text-sm text-black"
      children={children}
    />
  );
}

////////////////////////////////////////////////////////////////////////////////
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

export function useImmigrants(action: Actions, tasks: Task[]): Task[] {
  let fetchers = useFetchers();
  let immigrants: Task[] = [];
  let tasksMap = new Map<string, Task>();

  // if there are some fetchers, fill up the map to avoid a nested loop next
  if (fetchers.length) {
    for (let task of tasks) {
      tasksMap.set(task.id, task);
    }
  }

  // find the tasks that are moving to the other list
  for (let fetcher of fetchers) {
    if (fetcher.submission?.formData.get("_action") === action) {
      let id = fetcher.submission.formData.get("id");
      if (typeof id === "string") {
        let task = tasksMap.get(id);
        if (task) {
          immigrants.push(task);
        }
      }
    }
  }

  return immigrants;
}
