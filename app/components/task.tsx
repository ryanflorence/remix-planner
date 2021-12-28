// @ts-expect-error
import sortBy from "sort-by";
import React from "react";
import { Task } from "@prisma/client";
import { format, isFirstDayOfMonth, isToday } from "date-fns";
import cuid from "cuid";
import {
  Form,
  NavLink,
  useFetcher,
  useFetchers,
  useFormAction,
  useTransition,
} from "remix";

import {
  ArrowButton,
  CheckIcon,
  LeftArrowIcon,
  PlusIcon,
  RightArrowIcon,
} from "./icons";
import { useLayoutEffect } from "./layout-effect";
import { parseParamDate } from "~/util/date";
import { Actions, CalendarStats } from "~/models/task";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";

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
            <button
              type="submit"
              onClick={(event) => {
                addTask();
                event.preventDefault();
              }}
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
              className="shadow flex items-center justify-between gap-1 w-full nm-flat-gray-100 active:nm-inset-gray-100 text-green-500 px-4 py-2 rounded text-sm font-bold uppercase"
            >
              New Task <PlusIcon />
            </button>
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
      className="flex-1 outline-none px-4 py-1"
      contentEditable
      onFocus={(e) => {
        placeCaretAtEnd(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
          return;
        }

        if (e.shiftKey && e.key === "Enter") {
          // TODO: create a new task, don't blur
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

export function DayTaskList({
  day,
  tasks,
  backlog,
}: {
  day: string;
  tasks: Task[];
  backlog: Task[];
}) {
  let formattedDate = format(parseParamDate(day), "E, LLL do");
  return (
    <>
      <TaskListHeader>{formattedDate}</TaskListHeader>
      <DayTasks tasks={tasks} backlog={backlog} day={day} />
    </>
  );
}

function DayTasks({
  tasks,
  backlog,
  day,
}: {
  tasks: Task[];
  backlog: Task[];
  day: string;
}) {
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_DAY, backlog);

  return (
    <TaskList
      tasks={tasks.concat(immigrants)}
      renderTask={(task) => <DayTask key={task.id} task={task} day={day} />}
      day={day}
    />
  );
}

function DayTask({ task, day }: { task: RenderedTask; day: string }) {
  let fetcher = useFetcher();

  // TODO: move this to a generic route so it doesn't matter which route
  // is calling this
  let action = useFormAction();

  // optimistic "complete" status
  let complete =
    fetcher.submission?.formData.get("_action") === Actions.MARK_COMPLETE
      ? true
      : fetcher.submission?.formData.get("_action") === Actions.MARK_INCOMPLETE
      ? false
      : Boolean(task.complete);

  let moving =
    fetcher.submission?.formData.get("_action") ===
    Actions.MOVE_TASK_TO_BACKLOG;

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_TASK;

  return (
    <TaskItem key={task.id} hide={moving || deleting}>
      <fetcher.Form method="post">
        <input
          type="hidden"
          name="_action"
          value={complete ? Actions.MARK_INCOMPLETE : Actions.MARK_COMPLETE}
        />
        <input type="hidden" name="id" value={task.id} />
        <button
          aria-label={complete ? "Mark incomplete" : "Mark complete"}
          style={{
            WebkitTapHighlightColor: "transparent",
          }}
          className={
            "text-blue-500 p-2 rounded-full nm-flat-gray-50-sm active:nm-inset-gray-50-sm"
          }
        >
          <CheckIcon className={complete ? "" : "opacity-0"} />
        </button>
      </fetcher.Form>

      <EditableTask
        task={task}
        onCreate={() => {
          fetcher.submit(
            {
              _action: Actions.CREATE_TASK,
              id: task.id,
              name: "",
              date: day,
            },
            { method: "post", action }
          );
        }}
        onChange={(value) => {
          fetcher.submit(
            { _action: Actions.UPDATE_TASK_NAME, id: task.id, name: value },
            { method: "post", action }
          );
        }}
        onDelete={() => {
          fetcher.submit(
            { _action: Actions.DELETE_TASK, id: task.id },
            { method: "post", action }
          );
        }}
      />

      <fetcher.Form method="post">
        <input
          type="hidden"
          name="_action"
          value={Actions.MOVE_TASK_TO_BACKLOG}
        />
        <input type="hidden" name="id" value={task.id} />
        <ArrowButton>
          <RightArrowIcon />
        </ArrowButton>
      </fetcher.Form>
    </TaskItem>
  );
}

function TaskListHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-gray-100 border-b text-center p-4 font-bold uppercase text-sm text-black"
      children={children}
    />
  );
}

function useImmigrants(action: Actions, tasks: Task[]): Task[] {
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

export function BacklogTaskList({
  tasks,
  backlog,
}: {
  tasks: Task[];
  backlog: Task[];
}) {
  return (
    <>
      <TaskListHeader>Backlog</TaskListHeader>
      <Backlog tasks={tasks} backlog={backlog} />
    </>
  );
}

function Backlog({ tasks, backlog }: { tasks: Task[]; backlog: Task[] }) {
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_BACKLOG, tasks);

  return (
    <TaskList
      tasks={backlog.concat(immigrants)}
      renderTask={(task) => <BacklogTask key={task.id} task={task} />}
    />
  );
}

function BacklogTask({ task }: { task: RenderedTask }) {
  // TODO: move this to a generic route so it doesn't matter which route
  // is calling this
  let action = useFormAction();
  let fetcher = useFetcher();
  let moving =
    fetcher.submission?.formData.get("_action") === Actions.MOVE_TASK_TO_DAY;

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_TASK;

  return (
    <TaskItem key={task.id} hide={moving || deleting}>
      <fetcher.Form method="post">
        <input type="hidden" name="_action" value={Actions.MOVE_TASK_TO_DAY} />
        <input type="hidden" name="id" value={task.id} />
        <ArrowButton>
          <LeftArrowIcon />
        </ArrowButton>
      </fetcher.Form>
      <EditableTask
        task={task}
        onCreate={() => {
          fetcher.submit(
            { _action: Actions.CREATE_TASK, id: task.id, name: "" },
            { method: "post", action }
          );
        }}
        onChange={(value) => {
          fetcher.submit(
            { _action: Actions.UPDATE_TASK_NAME, id: task.id, name: value },
            { method: "post", action }
          );
        }}
        onDelete={() => {
          fetcher.submit(
            { _action: Actions.DELETE_TASK, id: task.id },
            { method: "post", action }
          );
        }}
      />
    </TaskItem>
  );
}

export function Calendar({
  weeks,
  stats,
  day: paramDate,
}: {
  stats: CalendarStats;
  weeks: Array<Array<string>>;
  day: string;
}) {
  return (
    <>
      {weeks.map((week) =>
        week.map((day) => (
          <CalendarDay
            key={day}
            isActive={paramDate === day}
            day={day}
            complete={stats.incomplete[day]}
            total={stats.total[day]}
          />
        ))
      )}
    </>
  );
}

// TODO: this component needs a lot of help, but for now this is a great MVP
// - add virtual scrolling
// - on load, scroll the active day to the second row
// - don't bounce around when clicking
function CalendarDay({
  day,
  complete,
  total,
  isActive,
}: {
  day: string;
  complete?: number;
  total?: number;
  isActive: boolean;
}) {
  let date = parseParamDate(day);
  let isMonthBoundary = isFirstDayOfMonth(date);
  let ref = React.useRef<HTMLAnchorElement>(null);
  let transition = useTransition();
  let isPending = transition.location?.pathname.split("/").slice(-1)[0] === day;

  // this is so gross right now.
  useLayoutEffect(() => {
    if (isActive) {
      ref.current?.scrollIntoView();
    }
  }, []);

  return (
    <NavLink
      ref={ref}
      to={`../${day}`}
      prefetch="intent"
      style={{
        WebkitTapHighlightColor: "transparent",
        scrollMarginTop: "3.5rem",
      }}
      className={({ isActive }) =>
        "relative flex items-center justify-center m-2 h-10 font-semibold rounded-lg xl:w-12 xl:h-10 text-sm" +
        " " +
        (isActive || isPending
          ? "bg-pink-500 text-white"
          : isToday(date)
          ? "text-gray-900 shadow"
          : "text-gray-400")
      }
    >
      {isMonthBoundary && (
        <div className="absolute -top-4 left-0 right-0 text-center uppercase text-gray-700 text-xs font-bold">
          {format(date, "MMM")}
        </div>
      )}
      <div className="">{day.split("-").slice(-1)[0]}</div>
      {total != null && (
        <div className="absolute top-1 w-8">
          <CircularProgressbar
            value={((complete || 0) / total) * 100}
            styles={buildStyles({
              strokeLinecap: "butt",
              pathColor: "currentColor",
              trailColor: "hsl(0, 0%, 0%, 0.1)",
            })}
          />
        </div>
      )}
    </NavLink>
  );
}
