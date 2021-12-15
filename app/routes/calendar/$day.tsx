import {
  useLoaderData,
  useFetcher,
  Link,
  useLocation,
  useNavigate,
  useFormAction,
  useParams,
  useFetchers,
  NavLink,
  json,
} from "remix";
import invariant from "tiny-invariant";
import React, { ReactNode } from "react";

import type { LoaderFunction, ActionFunction } from "remix";
import type { Task, User } from "@prisma/client";
import {
  RenderedTask,
  TaskItem,
  TaskList,
  Actions,
  EditableTask,
} from "~/components/task";

import { requireAuthSession } from "~/util/auth.server";
import { ensureUserAccount } from "~/util/account.server";
import { getBacklog, getDayTasks } from "~/models/task";
import { CheckIcon, LeftArrowIcon, RightArrowIcon } from "~/components/icons";
import { getCalendarWeeks } from "~/util/date";
import { format, isFirstDayOfMonth, isLastDayOfMonth, isToday } from "date-fns";
import { db } from "~/util/db.server";
import { useParentData } from "~/components/use-parent-data";
import { CACHE_CONTROL } from "~/util/http";

type LoaderData = {
  user: User;
  backlog: Task[];
  tasks: Task[];
  weeks: Array<Array<string>>;
};

export let loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.day, "Expected params.day");
  let date = new Date(params.day);
  let session = await requireAuthSession(request);
  let user = await ensureUserAccount(session.get("auth"));
  let tasks = await getDayTasks(user.id, date);
  let weeks = getCalendarWeeks(date);
  return json(
    { user, tasks, weeks },
    {
      headers: { "Cache-Control": CACHE_CONTROL.safePrefetch },
    }
  );
};

export let action: ActionFunction = async ({ request, params }) => {
  let session = await requireAuthSession(request);
  let user = await ensureUserAccount(session.get("auth"));

  let data = Object.fromEntries(await request.formData());
  invariant(typeof data._action === "string", "_action should be string");

  switch (data._action) {
    case Actions.CREATE_TASK:
    case Actions.UPDATE_TASK_NAME: {
      invariant(typeof data.id === "string", "expected taskId");
      invariant(typeof data.name === "string", "expected name");
      invariant(
        typeof data.date === "string" || data.date === undefined,
        "expected name"
      );
      return db.task.upsert({
        where: { id: data.id },
        create: {
          name: data.name,
          id: data.id,
          userId: user.id,
          date: data.date,
        },
        update: { name: data.name, id: data.id },
      });
    }

    case Actions.MARK_COMPLETE: {
      invariant(typeof data.id === "string", "expected task id");
      return db.task.update({
        where: { id: data.id },
        data: { complete: true },
      });
    }

    case Actions.MARK_INCOMPLETE: {
      invariant(typeof data.id === "string", "expected task id");
      return db.task.update({
        where: { id: data.id },
        data: { complete: false },
      });
    }

    case Actions.MOVE_TASK_TO_DAY: {
      invariant(typeof data.id === "string", "expected taskId");
      invariant(params.day, "expcted params.day");
      return db.task.update({
        where: { id: data.id },
        data: { date: new Date(params.day) },
      });
    }

    case Actions.MOVE_TASK_TO_BACKLOG: {
      invariant(typeof data.id === "string", "expected taskId");
      invariant(params.day, "expcted params.day");
      return db.task.update({
        where: { id: data.id },
        data: { date: null },
      });
    }

    case Actions.DELETE_TASK: {
      invariant(typeof data.id === "string", "expected taskId");
      return db.task.delete({ where: { id: data.id } });
    }

    default: {
      throw new Response("Bad Request", { status: 400 });
    }
  }
};

function TaskListHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky top-0 bg-gray-100 border-b z-10 flex-1 text-center p-4 font-bold uppercase text-sm text-black"
      children={children}
    />
  );
}

export default function DayRoute() {
  let params = useParams();
  invariant(params.day, "expected params.day");
  let day = format(new Date(params.day), "E, LLL do");

  return (
    <div className="h-full flex flex-col xl:flex-row">
      <div className="xl:border-r">
        <Calendar />
      </div>

      <div
        className="flex-1 flex h-full overflow-x-scroll lg:overflow-hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div
          id="day"
          className="h-full flex-shrink-0 w-full order-1 lg:w-1/2"
          style={{
            scrollSnapAlign: "start",
          }}
        >
          <div className="overflow-auto h-full border-r">
            <TaskListHeader>{day}</TaskListHeader>
            <Day />
          </div>
        </div>
        <div className="border-r border-gray-400 h-full" />
        <div
          id="backlog"
          className="flex-shrink-0 h-full w-full order-2 lg:w-1/2"
          style={{
            scrollSnapAlign: "start",
          }}
        >
          <TaskListHeader>Backlog</TaskListHeader>
          <Backlog />
        </div>
      </div>
    </div>
  );
}

function Headers({ children }: { children: ReactNode }) {
  return <div children={children} />;
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="hidden flex-1 lg:block bg-gray-50 text-center px-4 py-2 font-bold uppercase text-sm active:bg-blue-300 text-gray-500"
      children={children}
    />
  );
}

function Day() {
  let { tasks } = useLoaderData<LoaderData>();
  let backlog = useParentData<Task[]>();
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_DAY, backlog);
  return (
    <TaskList
      tasks={tasks.concat(immigrants)}
      renderTask={(task) => <DayTask key={task.id} task={task} />}
    />
  );
}

function DayTask({ task }: { task: RenderedTask }) {
  let params = useParams<"day">();
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
          invariant(params.day, "expected params.day");
          fetcher.submit(
            {
              _action: Actions.CREATE_TASK,
              id: task.id,
              name: "",
              date: new Date(params.day).toISOString(),
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

function Backlog() {
  let { tasks } = useLoaderData<LoaderData>();
  let backlog = useParentData<Task[]>();
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_BACKLOG, tasks);

  return (
    <TaskList
      tasks={backlog.concat(immigrants)}
      renderTask={(task) => <BacklogTask key={task.id} task={task} />}
    />
  );
}

function ArrowButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
      className="text-gray-400 nm-flat-gray-50-xs active:nm-inset-gray-50-xs rounded-lg p-2"
      children={children}
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

function Calendar() {
  let { weeks } = useLoaderData<LoaderData>();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0,1fr))",
      }}
      className="bg-gray-50 border-b xl:border-b-0"
    >
      {weeks.map((week) =>
        week.map((day) => <CalendarDay key={day} datestring={day} />)
      )}
    </div>
  );
}

function CalendarDay({ datestring }: { datestring: string }) {
  let date = new Date(datestring);
  let isMonthBoundary = isFirstDayOfMonth(date) || isLastDayOfMonth(date);

  return (
    <NavLink
      to={`../${datestring}`}
      prefetch="intent"
      className={({ isActive }) =>
        "relative flex items-center justify-center m-1 h-10 font-semibold rounded-lg xl:w-12 xl:h-10 text-sm" +
        " " +
        (isActive ? "bg-indigo-500 text-white" : "") +
        " " +
        (isToday(date) ? "bg-gray-200" : "")
      }
    >
      {isMonthBoundary && (
        <div className="absolute top-0 left-0 uppercase text-gray-500 text-xs font-light">
          {format(date, "MMM")}
        </div>
      )}
      {date.getDate()}
    </NavLink>
  );
}
