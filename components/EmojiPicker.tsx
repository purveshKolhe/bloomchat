import React from 'react';
import { cn } from '../utils/ui';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, className }) => {
  return (
    <div className={cn("flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-rose-100 dark:border-slate-700", className)}>
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="hover:bg-rose-50 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors text-lg leading-none"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};