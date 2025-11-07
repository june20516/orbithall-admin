"use client";

import { useState } from "react";
import { Button } from "@/app/_components/Button";

interface CorsOriginInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

/**
 * CORS Origin 동적 입력 컴포넌트
 * 여러 개의 URL을 추가/삭제할 수 있습니다.
 */
export function CorsOriginInput({ value, onChange, error }: CorsOriginInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <Button onClick={handleAdd}>추가</Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((origin, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-sm text-zinc-900 dark:text-zinc-50">{origin}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
