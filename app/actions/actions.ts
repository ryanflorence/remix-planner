// TODO: nahh ... I don't like this, gonna move the actions to the specific
// routes that handle them so illustrate how you might scale a very large app in
// Remix, this huge list of actions (and the huge function that handles them
// all) wouldn't scale as well as each route owning it's actions.
export enum Actions {
  CREATE_TASK = "CREATE_TASK",
  UPDATE_TASK_NAME = "UPDATE_TASK_NAME",
  MOVE_TASK_TO_DAY = "MOVE_TASK_TO_DAY",
  MOVE_TASK_TO_BACKLOG = "MOVE_TASK_TO_BACKLOG",
  MARK_COMPLETE = "MARK_COMPLETE",
  MARK_INCOMPLETE = "MARK_INCOMPLETE",
  DELETE_TASK = "DELETE_TASK",
  UNASSIGN_TASK = "UNASSIGN_TASK",
  CREATE_BUCKET = "CREATE_BUCKET",
  DELETE_BUCKET = "DELETE_BUCKET",
  UPDATE_BUCKET_NAME = "UPDATE_BUCKET_NAME",
  MOVE_TASK_TO_BUCKET = "MOVE_TASK_TO_BUCKET",
}
