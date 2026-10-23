import React from "react";

export function Avatar({
  src,
  alt = "Avatar",
  size = "md",
  className = "",
}: {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}) {
  const isImage =
    typeof src === "string" &&
    (src.startsWith("data:image/") ||
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("/"));

  const sizeMap = {
    xs: "w-5 h-5 text-xs rounded-md",
    sm: "w-7 h-7 text-sm rounded-lg",
    md: "w-9 h-9 text-base rounded-xl",
    lg: "w-11 h-11 text-xl rounded-xl",
    xl: "w-16 h-16 text-3xl rounded-2xl",
    "2xl": "w-20 h-20 text-4xl rounded-2xl",
  };

  if (isImage) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-900 border border-zinc-700/80 shrink-0 shadow-sm ${sizeMap[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-zinc-900/60 border border-zinc-800/80 shrink-0 select-none ${sizeMap[size]} ${className}`}
    >
      <span className="leading-none">{src || "⚡"}</span>
    </div>
  );
}
