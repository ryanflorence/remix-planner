import { db } from "~/models/db.server";
import invariant from "tiny-invariant";
import { formatParamDate } from "~/util/date";
import { Task } from "@prisma/client";

export function getBucketTasks(userId: string, slug: string) {
  return db.bucket.findMany({
    where: { userId, slug },
    orderBy: { updatedAt: "asc" },
  });
}

export function getUnassignedTasks(userId: string) {
  return db.task.findMany({
    where: { userId, bucketId: null },
    orderBy: { sortUpdatedAt: "asc" },
  });
}

export function getBacklog(userId: string) {
  return db.task.findMany({
    where: { userId, date: null },
    include: {
      Bucket: { select: { name: true } },
    },
  });
}

export function getDayTasks(userId: string, day: string) {
  return db.task.findMany({
    where: { userId, date: day },
    include: {
      Bucket: { select: { name: true } },
    },
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
    // TODO: why is this here?
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
    // TODO: why is this here?
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

export function markComplete(id: string) {
  return db.task.update({
    where: { id },
    data: { complete: true },
  });
}

export function createOrUpdateTask(
  userId: string,
  id: string,
  data: Partial<Task>
) {
  let name = data.name || "";
  return db.task.upsert({
    where: { id },
    create: { userId, ...data, id, name },
    update: { ...data, id, name },
  });
}

export function markIncomplete(id: string) {
  return db.task.update({
    where: { id },
    data: { complete: false },
  });
}

export function addDate(id: string, date: string) {
  return db.task.update({
    where: { id },
    data: { date, sortUpdatedAt: new Date() },
  });
}

export function removeDate(id: string) {
  return db.task.update({
    where: { id },
    data: { date: null, sortUpdatedAt: new Date() },
  });
}

export function unassignTask(id: string) {
  return db.task.update({
    where: { id },
    data: { bucketId: null, sortUpdatedAt: new Date() },
  });
}

export function assignTask(id: string, bucketId: string) {
  return db.task.update({
    where: { id },
    data: { bucketId, sortUpdatedAt: new Date() },
  });
}

export function deleteTask(id: string) {
  return db.task.delete({ where: { id } });
}
