import { useLoaderData, useParams, json } from "remix";
import invariant from "tiny-invariant";

import type { LoaderFunction, ActionFunction } from "remix";
import type { Task } from "@prisma/client";

import {
  Actions,
  DayTaskList,
  BacklogTaskList,
  Calendar,
} from "~/components/task";
import { requireAuthSession } from "~/util/auth.server";
import { getDayTasks } from "~/models/task";
import { db } from "~/util/db.server";
import { useParentData } from "~/components/use-parent-data";
import { CACHE_CONTROL } from "~/util/http";
import { CalendarLoaderData } from "../calendar";
import {
  HScrollChild,
  HScrollContent,
  SidebarLayout,
  SidebarNav,
} from "~/components/layouts";

export default function DayRoute() {
  let params = useParams();
  invariant(params.day, "expected params.day");
  let { tasks } = useLoaderData<LoaderData>();
  let { backlog, weeks, stats } = useParentData<CalendarLoaderData>();

  return (
    <SidebarLayout>
      <SidebarNav>
        <Calendar day={params.day} weeks={weeks} stats={stats} />
      </SidebarNav>
      <HScrollContent>
        <HScrollChild>
          <DayTaskList day={params.day} tasks={tasks} backlog={backlog} />
        </HScrollChild>
        <HScrollChild>
          <BacklogTaskList tasks={tasks} backlog={backlog} />
        </HScrollChild>
      </HScrollContent>
    </SidebarLayout>
  );
}

type LoaderData = {
  tasks: Task[];
};

export let loader: LoaderFunction = async ({ request, params }) => {
  let session = await requireAuthSession(request);
  let userId = session.get("userId");

  invariant(params.day, "Expected params.day");

  let tasks = await getDayTasks(userId, params.day);
  let data: LoaderData = { tasks };

  return json(data, {
    headers: { "Cache-Control": CACHE_CONTROL.safePrefetch },
  });
};

export let action: ActionFunction = async ({ request, params }) => {
  let session = await requireAuthSession(request);
  let userId = session.get("userId");

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
          userId,
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
        data: { date: params.day },
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
