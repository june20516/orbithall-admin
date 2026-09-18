"use client";

import { useState } from "react";

interface IpAddressProps {
  masked?: string;
  unmasked?: string;
}

/**
 * 댓글 작성자 IP 표시
 * 기본은 마스킹된 IP를 보여주고, 클릭하면 원본 IP로 전환
 */
export function IpAddress({ masked, unmasked }: IpAddressProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (!unmasked) {
    return <span className="font-mono">{masked || "-"}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setIsRevealed((previous) => !previous)}
      aria-pressed={isRevealed}
      title={isRevealed ? "클릭하여 IP 가리기" : "클릭하여 원본 IP 보기"}
      className="cursor-pointer font-mono underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50"
    >
      {isRevealed ? unmasked : masked || "***.***.***.***"}
    </button>
  );
}
