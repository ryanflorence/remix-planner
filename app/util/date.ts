import {
  format,
  subWeeks,
  addWeeks,
  eachWeekOfInterval,
  addDays,
} from "date-fns";

export function getCalendarWeeks(date: Date) {
  // FIXME: implement user time zones so these aren't all based on the server
  let start = subWeeks(date, 1);
  let end = addWeeks(date, 3);
  let weeks = eachWeekOfInterval({ start, end });
  return weeks.map((start) => {
    return [0, 1, 2, 3, 4, 5, 6].map((n) =>
      format(addDays(start, n), "yyyy-MM-dd")
    );
  });
}
