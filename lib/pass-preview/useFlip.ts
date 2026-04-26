"use client";
import { useCallback, useState } from "react";

export function useFlip(initial: "front" | "back" = "front") {
  const [face, setFace] = useState<"front" | "back">(initial);
  const flip = useCallback(() => {
    setFace((prev) => (prev === "front" ? "back" : "front"));
  }, []);
  return { face, flip, setFace };
}
