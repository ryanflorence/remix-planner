import { Task } from "@prisma/client";
import { useFetcher, useFormAction } from "remix";

import { Actions } from "~/actions/actions";
import {
  isNewTask,
  RenderedTask,
  useImmigrants,
} from "~/components/tasks/shared";
import {
  ContentEditableField,
  EditableItem,
  EditableList,
  Header,
} from "../editable-list";
import { ArrowButton, LeftArrowIcon } from "../icons";

export function UnassignedTaskList({
  tasks,
  bucketId,
  unassigned,
}: {
  tasks: Task[];
  bucketId: string;
  unassigned: Task[];
}) {
  let immigrants = useImmigrants(Actions.UNASSIGN_TASK, tasks);
  return (
    <>
      <Header>Unassigned</Header>
      <EditableList
        label="New Task"
        items={unassigned.concat(immigrants)}
        renderItem={(task) => (
          <UnassignedTask key={task.id} task={task} bucketId={bucketId} />
        )}
      />
    </>
  );
}

/**
 *  TODO: This is just copy/pasta from BacklogTask, needs it's own stuff
 */
function UnassignedTask({
  task,
  bucketId,
}: {
  task: RenderedTask;
  bucketId: string;
}) {
  let action = useFormAction();
  let fetcher = useFetcher();
  let moving =
    fetcher.submission?.formData.get("_action") === Actions.MOVE_TASK_TO_BUCKET;

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_TASK;

  return (
    <EditableItem key={task.id} hide={moving || deleting}>
      <fetcher.Form method="post">
        <input
          type="hidden"
          name="_action"
          value={Actions.MOVE_TASK_TO_BUCKET}
        />
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="bucketId" value={bucketId} />
        <ArrowButton>
          <LeftArrowIcon />
        </ArrowButton>
      </fetcher.Form>
      <ContentEditableField
        value={task.name}
        isNew={isNewTask(task)}
        onCreate={() => {
          fetcher.submit(
            { _action: Actions.CREATE_TASK, id: task.id, name: "" },
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
    </EditableItem>
  );
}
