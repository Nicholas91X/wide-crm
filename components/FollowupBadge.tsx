"use client";
import { useEffect, useState } from "react";

export function FollowupBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/leads/followups")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
