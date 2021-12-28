export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col xl:flex-row" children={children} />
  );
}

export function SidebarNav({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0,1fr))",
      }}
      className="bg-gray-50 border-b xl:border-b-0 max-h-52 overflow-auto xl:max-h-full"
      children={children}
    />
  );
}

export function HScrollContent({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 flex overflow-x-scroll overflow-y-hidden lg:overflow-hidden"
      style={{ scrollSnapType: "x mandatory" }}
      children={children}
    />
  );
}

export function HScrollChild({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col h-full flex-shrink-0 w-full order-1 lg:w-1/2 border-l last:border-r"
      style={{
        scrollSnapAlign: "start",
      }}
      children={children}
    />
  );
}
