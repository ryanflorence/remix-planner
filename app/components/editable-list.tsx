// @ts-expect-error
import sortBy from "sort-by";
import cuid from "cuid";
import React from "react";
import { useLayoutEffect } from "./layout-effect";
import { PlusIcon } from "./icons";
import { AppButton } from "./forms";

interface EditableRecord extends Record<string, any> {
  name: string;
  id: string;
  isNew?: boolean;
}

type RenderedRecord<T> = EditableRecord | T;

export function isNewRecord(record: any): record is EditableRecord {
  return (
    record &&
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    record.isNew
  );
}

export function useOptimisticRecords<T extends EditableRecord>(
  records: T[]
): [RenderedRecord<T>[], () => void] {
  let [optimisticIds, setOptimisticIds] = React.useState<string[]>([]);

  // Both optimistic and actual tasks combined into one array
  let renderedRecords: RenderedRecord<T>[] = [...records];

  // Add the optimistic tasks to the rendered list
  let savedIds = new Set(records.map((t) => t.id));
  for (let id of optimisticIds) {
    if (!savedIds.has(id)) {
      renderedRecords.push({ id, name: "", isNew: true });
    }
  }

  // Clear out optimistic task IDs when they show up in the actual list
  React.useEffect(() => {
    let newIds = new Set(optimisticIds);
    let intersection = new Set([...savedIds].filter((x) => newIds.has(x)));
    if (intersection.size) {
      setOptimisticIds(optimisticIds.filter((id) => !intersection.has(id)));
    }
  });

  let addRecord = React.useCallback(() => {
    setOptimisticIds((ids) => ids.concat([cuid()]));
  }, []);

  return [renderedRecords, addRecord];
}

export function EditableList<T extends EditableRecord>({
  items,
  renderItem,
  label,
}: {
  items: T[];
  renderItem: (item: RenderedRecord<T>) => React.ReactNode;
  label: string;
}) {
  let [renderedRecords, addRecord] = useOptimisticRecords<T>(items);
  let scrollRef = React.useRef<HTMLDivElement>(null);

  // scroll to bottom of task list on mount, causes flicker on hydration
  // sometimes but oh well
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <div>
        <div>
          {renderedRecords
            .slice(0)
            .sort(sortBy("createdAt"))
            .map((item) => renderItem(item))}
        </div>
        <div className="px-4 py-4 w-full">
          <AppButton
            type="button"
            onClick={(event) => {
              addRecord();
              event.preventDefault();
            }}
          >
            {label} <PlusIcon />
          </AppButton>
        </div>
      </div>
    </div>
  );
}

export function ContentEditableField({
  value,
  isNew,
  onCreate,
  onChange,
  onDelete,
}: {
  value: string;
  isNew: boolean;
  onCreate: () => void;
  onChange: (value: string) => void;
  onDelete: () => void;
}) {
  // uncontrolled contenteditable, so don't ever take an update from the server
  let [initialValue] = React.useState(value);

  let ref = React.useRef<HTMLDivElement>(null);

  // Kick off the fetcher to create a new record and focus when it's new layout
  // effect so it's in the same tick of the event and therefore "in response to
  // a user interactions" so that the keyboard opens up to start editing
  useLayoutEffect(() => {
    if (isNew && ref.current) {
      onCreate();
      ref.current.focus();
      ref.current?.scrollIntoView();
    }
  }, [isNew]);

  return (
    <div
      ref={ref}
      className="flex-1 outline-none px-4 py-1"
      contentEditable
      onFocus={(e) => {
        placeCaretAtEnd(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
          return;
        }

        if (e.metaKey && e.key === "Enter") {
          // TODO: create a new task, don't blur
          e.currentTarget.blur();
        }

        if (e.key === "Backspace") {
          let value = e.currentTarget.innerHTML.trim();
          if (value === "") {
            onDelete();
          }
        }
      }}
      onBlur={(e) => {
        let newValue = e.currentTarget.innerHTML.trim();
        if (newValue !== value) {
          onChange(newValue);
        }
      }}
      dangerouslySetInnerHTML={{ __html: initialValue }}
    />
  );
}

function placeCaretAtEnd(node: HTMLElement) {
  let range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  let sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function selectAll(node: HTMLElement) {
  let range = document.createRange();
  range.selectNodeContents(node);
  let sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function Header({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-gray-100 border-b text-center p-4 font-bold uppercase text-sm text-black"
      children={children}
    />
  );
}

export function EditableItem({
  children,
  hide,
}: {
  children: React.ReactNode;
  // TODO: bringin in an animation library, needs to wrap the whole list to
  // persist them for the animation
  hide?: boolean;
}) {
  return hide ? null : (
    <div className="flex items-start border-t last:border-b border-gray-100 text-gray-700 bg-gray-50 focus-within:bg-white py-2 px-4">
      {children}
    </div>
  );
}
