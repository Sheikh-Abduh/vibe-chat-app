"use client";

import Image from "next/image";
import React from "react";

export type VibeUserTag = "AURA" | "BONE" | "FORM" | "INIT" | "LITE";

interface UserTagProps {
  tag?: VibeUserTag | null;
  size?: number; // px square for the image
  showLabel?: boolean;
  className?: string;
}

const TAG_TO_IMAGE: Record<VibeUserTag, string> = {
  AURA: "/AURA.png",
  BONE: "/BONE.png",
  FORM: "/FORM.png",
  INIT: "/INIT.png",
  LITE: "/LITE.png",
};

export function UserTag({ tag, size = 16, showLabel = false, className = "" }: UserTagProps) {
  if (!tag) return null;
  const src = TAG_TO_IMAGE[tag];
  return (
    <span className={`inline-flex items-center gap-1 ml-1 align-middle ${className}`}>
      <Image src={src} alt={`${tag} tag`} width={size} height={size} />
      {showLabel && <span className="text-[0.7rem] text-muted-foreground">{tag}</span>}
    </span>
  );
}

export default UserTag;
