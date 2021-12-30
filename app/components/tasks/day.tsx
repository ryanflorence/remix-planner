import { format } from "date-fns";
import { Task } from "@prisma/client";
import { useFetcher, useFormAction } from "remix";

import { ArrowButton, CheckIcon, RightArrowIcon } from "~/components/icons";
import { Actions } from "~/actions/actions";
import { ContentEditableField } from "~/components/forms";
import {
  isNewTask,
  RenderedTask,
  TaskItem,
  TaskList,
  TaskListHeader,
  useImmigrants,
} from "~/components/tasks/shared";
import { parseParamDate } from "~/util/date";

export function DayTaskList({
  day,
  tasks,
  backlog,
}: {
  day: string;
  tasks: Task[];
  backlog: Task[];
}) {
  let formattedDate = format(parseParamDate(day), "E, LLL do");
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_DAY, backlog);
  return (
    <>
      <TaskListHeader>{formattedDate}</TaskListHeader>
      <TaskList
        tasks={tasks.concat(immigrants)}
        renderTask={(task) => <DayTask key={task.id} task={task} day={day} />}
        day={day}
      />
    </>
  );
}

function DayTask({ task, day }: { task: RenderedTask; day: string }) {
  let fetcher = useFetcher();

  // TODO: move this to a generic route so it doesn't matter which route
  // is calling this
  let action = useFormAction();

  // optimistic "complete" status
  let complete =
    fetcher.submission?.formData.get("_action") === Actions.MARK_COMPLETE
      ? true
      : fetcher.submission?.formData.get("_action") === Actions.MARK_INCOMPLETE
      ? false
      : Boolean(task.complete);

  let moving =
    fetcher.submission?.formData.get("_action") ===
    Actions.MOVE_TASK_TO_BACKLOG;

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_TASK;

  return (
    <TaskItem key={task.id} hide={moving || deleting}>
      <fetcher.Form method="post">
        <input
          type="hidden"
          name="_action"
          value={complete ? Actions.MARK_INCOMPLETE : Actions.MARK_COMPLETE}
        />
        <input type="hidden" name="id" value={task.id} />
        <button
          aria-label={complete ? "Mark incomplete" : "Mark complete"}
          style={{
            WebkitTapHighlightColor: "transparent",
          }}
          className={
            "text-blue-500 p-2 rounded-full nm-flat-gray-50-sm active:nm-inset-gray-50-sm"
          }
        >
          <CheckIcon className={complete ? "" : "opacity-0"} />
        </button>
      </fetcher.Form>

      <ContentEditableField
        value={task.name}
        isNew={isNewTask(task)}
        onCreate={() => {
          fetcher.submit(
            {
              _action: Actions.CREATE_TASK,
              id: task.id,
              name: "",
              date: day,
            },
            { method: "post", action }
          );
        }}
        onChange={(value) => {
          fetcher.submit(
            { _action: Actions.UPDATE_TASK_NAME, id: task.id, name: value },
            { method: "post", action }
          );
        }}
        onDelete={() => {
          fetcher.submit(
            { _action: Actions.DELETE_TASK, id: task.id },
            { method: "post", action }
          );
        }}
      />

      <fetcher.Form method="post">
        <input
          type="hidden"
          name="_action"
          value={Actions.MOVE_TASK_TO_BACKLOG}
        />
        <input type="hidden" name="id" value={task.id} />
        <ArrowButton>
          <RightArrowIcon />
        </ArrowButton>
      </fetcher.Form>
    </TaskItem>
  );
}
