import React from "react";
import { Task } from "@prisma/client";
import cuid from "cuid";
import { useFetchers } from "remix";

import { Actions } from "~/actions/actions";

export type NewTask = {
  id: string;
  name: string;
  isNew?: boolean;
  complete?: boolean;
};

export type RenderedTask = Task | NewTask;

export function isNewTask(task: any): task is NewTask {
  return (
    task &&
    typeof task.id === "string" &&
    typeof task.name === "string" &&
    task.isNew
  );
}

export function useImmigrants(action: Actions, tasks: Task[]): Task[] {
  let fetchers = useFetchers();
  let immigrants: Task[] = [];
  let tasksMap = new Map<string, Task>();

  // if there are some fetchers, fill up the map to avoid a nested loop next
  if (fetchers.length) {
    for (let task of tasks) {
      tasksMap.set(task.id, task);
    }
  }

  // find the tasks that are moving to the other list
  for (let fetcher of fetchers) {
    if (fetcher.submission?.formData.get("_action") === action) {
      let id = fetcher.submission.formData.get("id");
      if (typeof id === "string") {
        let task = tasksMap.get(id);
        if (task) {
          immigrants.push(task);
        }
      }
    }
  }

  return immigrants;
}

export function Dot({ str }: { str: string }) {
  return (
    <div
      className="h-2 w-2 rounded-full m-1"
      style={{
        background: numberToHex(hashString(str)),
      }}
    />
  );
}

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function numberToHex(i: number) {
  var c = (i & 0x00ffffff).toString(16).toUpperCase();
  let val = "00000".substring(0, 6 - c.length) + c;
  return "#" + val;
}
