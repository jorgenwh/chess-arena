import React from "react";
import { cn } from "@/lib/utils";

interface LoaderFiveProps {
  className?: string;
  text?: string;
}

export const LoaderFive = ({ className, text = "Loading..." }: LoaderFiveProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      <span className="text-white/80 animate-pulse">{text}</span>
    </div>
  );
};