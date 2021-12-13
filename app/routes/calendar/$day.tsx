import {
  useLoaderData,
  useFetcher,
  Link,
  useLocation,
  useNavigate,
  useFormAction,
  useParams,
} from "remix";
import invariant from "tiny-invariant";
import React from "react";

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
import { CheckIcon, LeftArrowIcon } from "~/components/icons";
import { getCalendarWeeks } from "~/util/date";

type LoaderData = {
  user: User;
  backlog: Task[];
  tasks: Task[];
  weeks: Array<Array<string>>;
};

export let loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.day, "Expected params.day");
  let session = await requireAuthSession(request);
  let user = await ensureUserAccount(session.get("auth"));
  let [backlog, tasks] = await Promise.all([
    getBacklog(user.id),
    getDayTasks(user.id, new Date(params.day)),
  ]);
  let weeks = getCalendarWeeks(new Date());
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
  let { tasks } = useLoaderData<LoaderData>();
  return (
    <TaskList
      tasks={tasks}
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

  return (
    <TaskItem key={task.id}>
      <fetcher.Form method="post" className="mr-1">
        <input
          type="hidden"
          name="_action"
          value={complete ? Actions.MARK_INCOMPLETE : Actions.MARK_COMPLETE}
        />
        <input type="hidden" name="id" value={task.id} />
        <button
          className={
            "text-gray-500 p-1 m-2 rounded-full bg-gray-200 active:bg-blue-500"
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
      />
    </TaskItem>
  );
}

function Backlog() {
  let { backlog } = useLoaderData<LoaderData>();
  return (
    <TaskList
      tasks={backlog}
      renderTask={(task) => <BacklogTask key={task.id} task={task} />}
    />
  );
}

function BacklogTask({ task }: { task: RenderedTask }) {
  // TODO: move this to a generic route so it doesn't matter which route
  // is calling this
  let action = useFormAction();
  let fetcher = useFetcher();

  return (
    <TaskItem key={task.id}>
      <fetcher.Form method="post">
        <input type="hidden" name="_action" value={Actions.MOVE_TASK_TO_DAY} />
        <input type="hidden" name="id" value={task.id} />
        <button className="text-gray-400 p-1 m-2 rounded-full border active:bg-blue-500">
          <LeftArrowIcon />
        </button>
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
        gridTemplateColumns: "repeat(7, 1fr)",
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
  return (
    <div className="bg-gray-100 flex items-center justify-center p-4 font-semibold">
      {new Date(datestring).getDate()}
    </div>
  );
}
