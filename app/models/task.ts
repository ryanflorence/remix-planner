import { db } from "~/util/db.server";
import invariant from "tiny-invariant";
import { formatParamDate } from "~/util/date";

export function getBacklog(userId: string) {
  return db.task.findMany({
    where: { userId, date: null },
    orderBy: { createdAt: "asc" },
  });
}

export function getDayTasks(userId: string, day: string) {
  console.log({ day });
  return db.task.findMany({
    where: { userId, date: day },
    orderBy: { createdAt: "asc" },
  });
}

export type CalendarStats = Awaited<ReturnType<typeof getCalendarStats>>;

export async function getTotalCountsByDate(
  userId: string,
  start: Date,
  end: Date
) {
  let result = await db.task.groupBy({
    by: ["date"],
    orderBy: { date: "asc" },
    _count: {
      date: true,
    },
    where: {
      userId: userId,
      date: {
        gt: formatParamDate(start),
        lt: formatParamDate(end),
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
        date: group.date,
        count: group._count.date,
      };
    })
    .reduce((map, stat) => {
      map[stat.date] = stat.count;
      return map;
    }, {} as { [date: string]: number });
}

export async function getCompletedCountsByDate(
  userId: string,
  start: Date,
  end: Date
) {
  let result = await db.task.groupBy({
    by: ["date"],
    orderBy: { date: "asc" },
    _count: {
      date: true,
    },
    where: {
      userId: userId,
      complete: true,
      date: {
        gt: formatParamDate(start),
        lt: formatParamDate(end),
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
        date: group.date,
        count: group._count.date,
      };
    })
    .reduce((map, stat) => {
      map[stat.date] = stat.count;
      return map;
    }, {} as { [date: string]: number });
}

export async function getCalendarStats(userId: string, start: Date, end: Date) {
  let [total, incomplete] = await Promise.all([
    getTotalCountsByDate(userId, start, end),
    getCompletedCountsByDate(userId, start, end),
  ]);

  return { total, incomplete };
}
