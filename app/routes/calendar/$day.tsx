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
  let [backlog, tasks] = await Promise.all([
    getBacklog(user.id),
    getDayTasks(user.id, date),
  ]);
  let weeks = getCalendarWeeks(date);
  return { user, backlog, tasks, weeks };
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

function NavHeader({
  children,
  active,
  href,
}: {
  children: React.ReactNode;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      replace
      to={href}
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
      className={
        "block px-4 py-2 rounded-full font-bold uppercase text-sm active:bg-blue-300" +
        " " +
        (active ? "text-blue-500" : "text-gray-500")
      }
    >
      {children}
    </Link>
  );
}

export default function DayRoute() {
  let location = useLocation();
  let navigate = useNavigate();
  // managed as state because browsers don't send #hash to the server, so there
  // would be a mismatch in markup after hydration if we didn't use state.
  let [activePane, setActivePane] = React.useState<"backlog" | "day">("day");

  let handlePanelScroll = (node: HTMLElement) => {
    let { scrollLeft, offsetWidth } = node;
    let atSnappingPoint = scrollLeft % offsetWidth === 0;
    if (atSnappingPoint) {
      navigate(scrollLeft > 0 ? "#backlog" : "#day", { replace: true });
    }
  };

  React.useEffect(() => {
    let id = location.hash.replace(/#/, "");
    if (id === "backlog" || id === "day") {
      setActivePane(id);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location]);

  return (
    <div className="h-full flex flex-col">
      <div>
        <Calendar />
      </div>
      <div className="flex justify-around py-2 border-b bg-gray-50">
        <NavHeader href="#day" active={activePane === "day"}>
          Day
        </NavHeader>
        <NavHeader href="#backlog" active={activePane === "backlog"}>
          Backlog
        </NavHeader>
      </div>
      <div
        className="flex-1 flex overflow-x-scroll"
        style={{ scrollSnapType: "x mandatory" }}
        onScroll={(e) => handlePanelScroll(e.currentTarget)}
      >
        <div
          id="day"
          className="h-full flex-shrink-0 w-full order-1"
          style={{
            scrollSnapAlign: "start",
          }}
        >
          <div className="overflow-auto h-full">
            <Day />
          </div>
        </div>
        <div
          id="backlog"
          className="flex-shrink-0 h-full w-full order-2"
          style={{
            scrollSnapAlign: "start",
          }}
        >
          <Backlog />
        </div>
      </div>
    </div>
  );
}

function Day() {
  let { backlog, tasks } = useLoaderData<LoaderData>();
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
  let { backlog, tasks } = useLoaderData<LoaderData>();
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
        gridGap: "1px",
      }}
      className="bg-gray-200 border-b"
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
      to={`../calendar/${datestring}`}
      prefetch="intent"
      className={({ isActive }) =>
        "relative flex items-center justify-center p-4 font-semibold" +
        " " +
        (isActive ? "bg-white" : "bg-gray-100") +
        " " +
        (isToday(date) ? "text-red-500" : "text-gray-600")
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
