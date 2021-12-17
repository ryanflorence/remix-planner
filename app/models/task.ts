import { db } from "~/util/db.server";
import { format } from "date-fns";
import { formatParamDate } from "~/util/date";
import invariant from "tiny-invariant";

export function getBacklog(userId: string) {
  return db.task.findMany({
    where: { userId, date: null },
    orderBy: { createdAt: "asc" },
  });
}

export function getDayTasks(userId: string, day: Date) {
  return db.task.findMany({
    where: { userId, date: day },
    orderBy: { createdAt: "asc" },
  });
}

export type CalendarStats = Awaited<ReturnType<typeof getCalendarStats>>;

export async function getCalendarStats(userId: string, start: Date, end: Date) {
  let result = await db.task.groupBy({
    by: ["date"],
    orderBy: { date: "asc" },
    _count: {
      date: true,
    },
    where: {
      userId: userId,
      complete: false,
      date: {
        gt: start,
        lt: end,
      },
    },
  });

  return result
    .map((group) => {
      invariant(
        group.date,
        "expected group.date (being one on one makes me nervous)"
      );
      return {
        date: formatParamDate(group.date),
        count: group._count.date,
      };
    })
    .reduce((map, stat) => {
      map[stat.date] = stat.count;
      return map;
    }, {} as { [date: string]: number });
}
