"use client";

import React from "react";

interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
}

export function TextShimmer({ children, className = "" }: TextShimmerProps) {
  return (
    <span
      className={`inline-flex bg-gradient-to-r from-zinc-100 via-zinc-400 to-zinc-100 bg-[length:200%_auto] bg-clip-text text-transparent animate-amicro-shimmer ${className}`}
    >
      {children}
    </span>
  );
}
