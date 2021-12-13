import { forwardRef } from "react";

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
