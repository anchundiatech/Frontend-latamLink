"use client";

import { ArrowLeft } from "lucide-react";

interface TerminalHeaderProps {
  showBack: boolean;
  onBack: () => void;
}

export function TerminalHeader({ showBack, onBack }: TerminalHeaderProps) {
  if (!showBack) return null;

  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onBack}
        className="ml-auto flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3 h-3" />
        Back
      </button>
    </div>
  );
}
