import React from "react";
import { NavLink, useTransition } from "@remix-run/react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { format, isFirstDayOfMonth, isToday } from "date-fns";

import { useLayoutEffect } from "~/components/layout-effect";
import { parseParamDate } from "~/util/date";
import { CalendarStats } from "~/models/task";

/**
 * This component needs a lot of help, but for now this is a great MVP
 *
 * - add virtual scrolling
 * - on load, scroll the active day to the second row
 * - don't bounce around when clicking
 *
 */
export function Calendar({
  weeks,
  stats,
  day: paramDate,
}: {
  stats: CalendarStats;
  weeks: Array<Array<string>>;
  day: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0,1fr))",
      }}
    >
      {weeks.map((week) =>
        week.map((day) => (
          <CalendarDay
            key={day}
            isActive={paramDate === day}
            day={day}
            complete={stats.incomplete[day]}
            total={stats.total[day]}
          />
        ))
      )}
    </div>
  );
}

function CalendarDay({
  day,
  complete,
  total,
  isActive,
}: {
  day: string;
  complete?: number;
  total?: number;
  isActive: boolean;
}) {
  let date = parseParamDate(day);
  let isMonthBoundary = isFirstDayOfMonth(date);
  let ref = React.useRef<HTMLAnchorElement>(null);
  let transition = useTransition();
  let isPending = transition.location?.pathname.split("/").slice(-1)[0] === day;

  // this is so gross right now.
  useLayoutEffect(() => {
    if (isActive) {
      ref.current?.scrollIntoView();
    }
  }, []);

  return (
    <NavLink
      ref={ref}
      to={`../${day}`}
      prefetch="intent"
      style={{
        WebkitTapHighlightColor: "transparent",
        scrollMarginTop: "3.5rem",
      }}
      className={({ isActive }) =>
        "relative flex items-center justify-center m-2 h-10 font-semibold rounded-lg xl:w-12 xl:h-10 text-sm" +
        " " +
        (isActive || isPending
          ? "bg-pink-500 text-white"
          : isToday(date)
          ? "text-gray-900 shadow"
          : "text-gray-400")
      }
    >
      {isMonthBoundary && (
        <div className="absolute -top-4 left-0 right-0 text-center uppercase text-gray-700 text-xs font-bold">
          {format(date, "MMM")}
        </div>
      )}
      <div className="">{day.split("-").slice(-1)[0]}</div>
      {total != null && (
        <div className="absolute top-1 w-8">
          <CircularProgressbar
            value={((complete || 0) / total) * 100}
            styles={buildStyles({
              strokeLinecap: "butt",
              pathColor: "currentColor",
              trailColor: "hsl(0, 0%, 0%, 0.1)",
            })}
          />
        </div>
      )}
    </NavLink>
  );
}
