import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useLocation, useParams, useTransition } from "@remix-run/react";
import type { CalendarLoaderData } from "../calendar";

import invariant from "tiny-invariant";

import { handleTaskAction } from "~/actions/actions.server";
import { requireUserId } from "~/util/auth.server";
import * as Task from "~/models/task";
import { CACHE_CONTROL } from "~/util/http";

import { useParentData } from "~/components/use-parent-data";
import {
  HScrollChild,
  HScrollContent,
  SidebarLayout,
  SidebarNav,
} from "~/components/layouts";
import { DayTaskList } from "~/components/tasks/day";
import { BacklogTaskList } from "~/components/tasks/backlog";
import { Calendar } from "~/components/tasks/calendar";

////////////////////////////////////////////////////////////////////////////////
type DayTasks = Awaited<ReturnType<typeof Task.getDayTasks>>;

export let loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.day, "Expected params.day");

  let userId = await requireUserId(request);
  let tasks = await Task.getDayTasks(userId, params.day);

  return json<DayTasks>(tasks, {
    headers: { "Cache-Control": CACHE_CONTROL.safePrefetch },
  });
};

////////////////////////////////////////////////////////////////////////////////
export { handleTaskAction as action };

////////////////////////////////////////////////////////////////////////////////
export default function DayRoute() {
  let params = useParams<"day">();
  invariant(params.day, "expected params.day");

  let tasks = useLoaderData<DayTasks>();
  let { backlog, weeks, stats } = useParentData<CalendarLoaderData>();
  let location = useLocation();
  let transition = useTransition();
  let changingDays =
    transition.location &&
    transition.location.pathname.split("/").slice(-1)[0] !==
      location.pathname.split("/").slice(-1)[0];

  return (
    <SidebarLayout>
      <SidebarNav>
        <Calendar day={params.day} weeks={weeks} stats={stats} />
      </SidebarNav>
      <HScrollContent>
        <HScrollChild
          className={
            changingDays ? "opacity-20 transition-opacity delay-500" : ""
          }
        >
          <DayTaskList day={params.day} tasks={tasks} backlog={backlog} />
        </HScrollChild>
        <HScrollChild>
          <BacklogTaskList tasks={tasks} backlog={backlog} />
        </HScrollChild>
      </HScrollContent>
    </SidebarLayout>
  );
}
