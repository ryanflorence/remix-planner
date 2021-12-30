import React, { forwardRef } from "react";
import { useLayoutEffect } from "./layout-effect";

export let Button = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithRef<"button">
>(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={
        "inline-block text-center box-border py-1 px-8 rounded bg-green-500 hover:bg-green-600 active:bg-green-400 disabled:bg-gray-300 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-600 text-white font-semibold transition-colors " +
        className
      }
      type={props.type}
      {...props}
    >
      {children}
    </button>
  );
});

export let TextInput = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithRef<"input">
>(({ className, children, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={
        "inline-block box-border py-1 px-2 rounded text-black bg-white border border-gray-300 dark:border-gray-500 dark:text-white dark:bg-gray-600" +
        " " +
        className
      }
      type={props.type}
      {...props}
    />
  );
});

export let AppButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithRef<"button">
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
      className={
        "shadow flex items-center justify-between gap-1 w-full nm-flat-gray-100 active:nm-inset-gray-100 text-green-500 px-4 py-2 rounded text-sm font-bold uppercase" +
        " " +
        className
      }
      type={props.type}
      {...props}
    />
  );
});

interface EditableRecord extends Record<string, any> {
  name: string;
  id: string;
  isNew?: boolean;
}

export function isNewRecord(record: any): record is EditableRecord {
  return (
    record &&
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    record.isNew
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
    if (isNew) {
      ref.current?.focus();
      // scroll iOS all the way
      ref.current?.scrollIntoView();
      onCreate();
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
