// @ts-expect-error
import sortBy from "sort-by";
import { Task } from "@prisma/client";
import { useFetcher, useFormAction } from "remix";

import { ArrowButton, LeftArrowIcon, PlusIcon } from "~/components/icons";
import { Actions } from "~/actions/actions";
import {
  ContentEditableField,
  EditableItem,
  EditableList,
  Header,
} from "~/components/editable-list";
import {
  ColoredLabel,
  isNewTask,
  RenderedTask,
  useImmigrants,
} from "~/components/tasks/shared";

export function BacklogTaskList({
  tasks,
  backlog,
}: {
  tasks: Task[];
  backlog: Task[];
}) {
  let immigrants = useImmigrants(Actions.MOVE_TASK_TO_BACKLOG, tasks);
  return (
    <>
      <Header>Backlog</Header>
      <EditableList
        items={backlog.concat(immigrants).sort(sortBy("sortUpdatedAt"))}
        renderItem={(task) => <BacklogTask key={task.id} task={task} />}
        label="New Task"
      />
    </>
  );
}

function BacklogTask({ task }: { task: RenderedTask }) {
  let action = useFormAction();
  let fetcher = useFetcher();
  let moving =
    fetcher.submission?.formData.get("_action") === Actions.MOVE_TASK_TO_DAY;

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_TASK;

  // FIXME: fix the types here
  let bucketName = (task as any).Bucket?.name as string | undefined;

  return (
    <EditableItem key={task.id} hide={moving || deleting}>
      <fetcher.Form method="post">
        <input type="hidden" name="_action" value={Actions.MOVE_TASK_TO_DAY} />
        <input type="hidden" name="id" value={task.id} />
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
      {bucketName && <ColoredLabel label={bucketName} />}
    </EditableItem>
  );
}
