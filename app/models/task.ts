import { db } from "~/util/db.server";

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
