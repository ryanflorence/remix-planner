// @ts-expect-error
import sortBy from "sort-by";
import { Task } from "@prisma/client";
import { useFetcher, useFormAction } from "remix";

import { ArrowButton, CheckIcon, RightArrowIcon } from "~/components/icons";
import { Actions } from "~/actions/actions";
import {
  ContentEditableField,
  EditableItem,
  EditableList,
  Header,
} from "~/components/editable-list";
import {
  isNewTask,
  RenderedTask,
  useImmigrants,
} from "~/components/tasks/shared";

export function BucketTaskList({
  bucketName,
  bucketId,
  tasks,
  unassigned,
}: {
  bucketName: string;
  bucketId: string;
  tasks: Task[];
  unassigned: Task[];
}) {
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_BUCKET, unassigned);
  return (
    <>
      <Header>{bucketName}</Header>
      <EditableList
        label="New Task"
        items={tasks.concat(immigrants).sort(sortBy("updatedAt"))}
        renderItem={(task) => (
          <BucketTask key={task.id} task={task} bucketId={bucketId} />
        )}
      />
    </>
  );
}

function BucketTask({
  task,
  bucketId,
}: {
  task: RenderedTask;
  bucketId: string;
}) {
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
    fetcher.submission?.formData.get("_action") === Actions.UNASSIGN_TASK;

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_TASK;

  return (
    <EditableItem key={task.id} hide={moving || deleting}>
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
              bucketId: bucketId,
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
        <input type="hidden" name="_action" value={Actions.UNASSIGN_TASK} />
        <input type="hidden" name="id" value={task.id} />
        <ArrowButton>
          <RightArrowIcon />
        </ArrowButton>
      </fetcher.Form>
    </EditableItem>
  );
}
