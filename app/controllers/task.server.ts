import type { ActionFunction } from "remix";

import invariant from "tiny-invariant";

import { requireAuthSession } from "./auth.server";
import { Actions } from "~/models/task";
import * as Task from "~/models/task";
import { parseStringFormData } from "~/util/http";

export let handleTaskAction: ActionFunction = async ({ request, params }) => {
  let session = await requireAuthSession(request);
  let userId = session.get("userId");

  let data = await parseStringFormData(request);

  switch (data._action) {
    case Actions.CREATE_TASK:
    case Actions.UPDATE_TASK_NAME: {
      invariant(data.id && data.name, "expected id and name");
      return Task.createOrUpdateTask(userId, data.id, data.name, data.date);
    }

    case Actions.MARK_COMPLETE: {
      invariant(data.id, "expected task id");
      return Task.markComplete(data.id);
    }

    case Actions.MARK_INCOMPLETE: {
      invariant(data.id, "expected task id");
      return Task.markIncomplete(data.id);
    }

    case Actions.MOVE_TASK_TO_DAY: {
      invariant(data.id && params.day, "expected taskId and params.day");
      return Task.addDate(data.id, params.day);
    }

    case Actions.MOVE_TASK_TO_BACKLOG: {
      invariant(data.id, "expected taskId");
      return Task.removeDate(data.id);
    }

    case Actions.DELETE_TASK: {
      invariant(data.id, "expected taskId");
      return Task.deleteTask(data.id);
    }

    default: {
      throw new Response("Bad Request", { status: 400 });
    }
  }
};
