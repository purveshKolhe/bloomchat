import React, { useState } from 'react';
import { Message, Attachment } from '../types';
import { cn, formatBytes } from '../utils/ui';
import { FileText, Download, Reply, Smile, X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  parentMessage?: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onReply, onReact, parentMessage }) => {
  const [showReactions, setShowReactions] = useState(false);

  const renderAttachment = (att: Attachment) => {
    if (att.type.startsWith('image/')) {
      return (
        <div className="rounded-lg overflow-hidden my-2 max-w-sm border border-black/5 dark:border-white/10">
          <img src={att.url || (att.data as string)} alt={att.name} className="max-w-full h-auto object-cover" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-black/5 dark:border-white/5 my-1 backdrop-blur-sm">
        <div className="p-2 bg-rose-100 dark:bg-indigo-900/50 rounded-lg text-rose-600 dark:text-indigo-300">
          <FileText size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate dark:text-slate-200">{att.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(att.size)}</p>
        </div>
        <a 
          href={att.url} 
          download={att.name}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-slate-600 dark:text-slate-300"
        >
          <Download size={18} />
        </a>
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "group flex flex-col max-w-[85%] md:max-w-[70%] mb-4 relative animate-in fade-in slide-in-from-bottom-2 duration-300",
        isMe ? "self-end items-end" : "self-start items-start"
      )}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Reply Context */}
      {parentMessage && (
        <div 
          className={cn(
            "text-xs mb-1 px-2 py-0.5 rounded-md opacity-70 flex items-center gap-1 cursor-pointer hover:opacity-100 transition-opacity",
            isMe ? "bg-rose-100 text-rose-800 dark:bg-indigo-900/50 dark:text-indigo-200" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          )}
        >
          <Reply size={10} />
          <span className="truncate max-w-[150px]">
             {parentMessage.type === 'image' ? 'Image' : parentMessage.type === 'file' ? 'File' : parentMessage.content}
          </span>
        </div>
      )}

      {/* Main Bubble */}
      <div 
        className={cn(
          "relative px-4 py-2.5 shadow-sm text-[15px] leading-relaxed",
          isMe 
            ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl rounded-tr-sm" 
            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700"
        )}
      >
        {message.type === 'text' && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        {message.attachment && renderAttachment(message.attachment)}

        {/* Timestamp & Meta */}
        <div className={cn("text-[10px] mt-1 flex items-center gap-2", isMe ? "text-rose-100" : "text-slate-400")}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Action Buttons (Hover) */}
        <div className={cn(
          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 -translate-y-1/2 shadow-sm rounded-full bg-white dark:bg-slate-800 p-0.5 border border-slate-100 dark:border-slate-700",
          isMe ? "left-0 -translate-x-full mr-2" : "right-0 translate-x-full ml-2"
        )}>
          <button 
            onClick={() => onReply(message)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"
            title="Reply"
          >
            <Reply size={14} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"
              title="Add Reaction"
            >
              <Smile size={14} />
            </button>
            {showReactions && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                <EmojiPicker onSelect={(emoji) => { onReact(message.id, emoji); setShowReactions(false); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Display */}
      {Object.keys(message.reactions || {}).length > 0 && (
        <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
          {Object.entries(message.reactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-all",
                users.includes('me') // This assumes local user check happens upstream or logic adapted
                  ? "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300" 
                  : "bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
              )}
            >
              <span>{emoji}</span>
              <span className="font-medium">{users.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
