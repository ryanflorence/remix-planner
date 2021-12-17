import {
  format,
  subWeeks,
  addWeeks,
  eachWeekOfInterval,
  addDays,
  parse,
} from "date-fns";

export function getCalendarWeeks(date: Date) {
  // FIXME: implement user time zones so these aren't all based on the server
  let start = subWeeks(date, 4);
  let end = addWeeks(date, 12);
  let weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  return weeks.map((start) => {
    return [0, 1, 2, 3, 4, 5, 6].map((n) => formatParamDate(addDays(start, n)));
  });
}

const PARAM_FORMAT = "yyyy-MM-dd";

export function formatParamDate(date: Date) {
  return format(date, PARAM_FORMAT);
}

export function parseParamDate(paramDate: string) {
  return parse(paramDate, PARAM_FORMAT, new Date());
}
