import { ActionFunction, redirect } from "@remix-run/node";

import invariant from "tiny-invariant";

import { requireAuthSession } from "../util/auth.server";

import * as Task from "~/models/task";
import * as Bucket from "~/models/bucket";

import { parseStringFormData } from "~/util/http";
import { Actions } from "./actions";

export let handleTaskAction: ActionFunction = async ({ request, params }) => {
  let session = await requireAuthSession(request);
  let userId = session.get("userId");

  let data = await parseStringFormData(request);

  switch (data._action) {
    case Actions.CREATE_TASK:
    case Actions.UPDATE_TASK_NAME: {
      invariant(data.id, "expected id");
      let { date, name, bucketId } = data;
      return Task.createOrUpdateTask(userId, data.id, { date, name, bucketId });
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

    case Actions.UNASSIGN_TASK: {
      invariant(data.id, "expected taskId");
      return Task.unassignTask(data.id);
    }

    case Actions.MOVE_TASK_TO_BUCKET: {
      invariant(data.id && data.bucketId, "expected taskId, bucketId");
      return Task.assignTask(data.id, data.bucketId);
    }

    case Actions.DELETE_TASK: {
      invariant(data.id, "expected taskId");
      return Task.deleteTask(data.id);
    }

    case Actions.CREATE_BUCKET: {
      invariant(data.id, "expected bucket id");
      return Bucket.createBucket(userId, data.id, data.name);
    }

    case Actions.DELETE_BUCKET: {
      invariant(data.id, "expected bucket id");
      return Bucket.deleteBucket(data.id);
    }

    case Actions.UPDATE_BUCKET_NAME: {
      invariant(
        data.id && data.name && data.slug,
        "expected bucket id, slug, name"
      );
      let bucket = await Bucket.getBucket(data.id);
      invariant(bucket, `expected bucket with id ${data.id}`);
      let bucketIsActivePage = data.slug === bucket.slug;
      bucket = await Bucket.updateBucketName(data.id, data.name);
      return bucketIsActivePage ? redirect(`/buckets/${bucket.slug}`) : bucket;
    }

    default: {
      throw new Response(`Unknown action ${data._action}`, { status: 400 });
    }
  }
};
