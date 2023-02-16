import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { requireAuthSession } from "~/util/auth.server";
import { CalendarStats, getBacklog, getCalendarStats } from "~/models/task";
import { format } from "date-fns";
import { CACHE_CONTROL } from "~/util/http";
import { getCalendarWeeks } from "~/util/date";
import { Task } from "@prisma/client";

export type CalendarLoaderData = {
  backlog: Task[];
  stats: CalendarStats;
  weeks: Array<Array<string>>;
};

export let loader: LoaderFunction = async ({ request, params }) => {
  if (!params.day) {
    let today = new Date();
    return redirect(`/calendar/${format(today, "yyyy-MM-dd")}`);
  }

  let session = await requireAuthSession(request);
  let userId = session.get("id");

  // FIXME: need timezone offset of user to show what I mean to
  let date = new Date();
  let weeks = getCalendarWeeks(date);
  let start = new Date(weeks[0][0]);
  let end = new Date(weeks.slice(-1)[0].slice(-1)[0]);

  let [backlog, stats] = await Promise.all([
    getBacklog(userId),
    getCalendarStats(userId, start, end),
  ]);

  let data: CalendarLoaderData = { backlog, stats, weeks };
  return json(data, {
    headers: { "Cache-Control": CACHE_CONTROL.none },
  });
};

export default function Calendar() {
  return <Outlet />;
}
