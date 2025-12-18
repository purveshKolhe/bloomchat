import React, { useState, useEffect, useRef } from 'react';
import { useChat } from './hooks/useChat';
import { MessageBubble } from './components/MessageBubble';
import { cn, fileToDataUrl } from './utils/ui';
import { Send, Paperclip, Image as ImageIcon, X, Copy, Check, Moon, Sun, Loader2, Reply, MessageSquarePlus } from 'lucide-react';
import { Message } from './types';

export default function App() {
  const { myId, peerId, connected, loading, error, messages, connectToPeer, sendMessage, addReaction, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle URL join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    // Only connect if not already connected and join ID is different from my ID
    if (joinId && !connected && myId && joinId !== myId) {
       // Check if we are already connected or trying to connect to the same peer
       connectToPeer(joinId);
    }
  }, [myId, connected]);

  // Theme effect
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Clipboard Paste Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) setFileToUpload(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSend = () => {
    if ((!inputText.trim() && !fileToUpload)) return;
    
    // Allow sending to self for notes if not connected, or enforce connection?
    // User requested "chat app", implies 2 people. But we can let them type while waiting.
    
    if (fileToUpload) {
        const type = fileToUpload.type.startsWith('image/') ? 'image' : 'file';
        sendMessage(inputText, type, replyTo?.id, fileToUpload);
    } else {
        sendMessage(inputText, 'text', replyTo?.id);
    }

    setInputText('');
    setReplyTo(null);
    setFileToUpload(null);
  };

  const copyLink = () => {
    const url = `${window.location.origin}?join=${myId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Background Mesh
  const MeshBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Light Mode Mesh */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-200/40 blur-[100px] dark:hidden animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-pink-200/40 blur-[120px] dark:hidden animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-rose-100/50 blur-[80px] dark:hidden" />

        {/* Dark Mode Mesh */}
        <div className="hidden dark:block absolute top-[-20%] right-0 w-[60%] h-[60%] bg-indigo-900/20 blur-[150px] rounded-full" />
        <div className="hidden dark:block absolute bottom-0 left-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full" />
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-rose-50 dark:bg-slate-900 text-slate-500">
        <Loader2 className="animate-spin mb-2" />
        <p>Initializing secure bloom network...</p>
      </div>
    );
  }

  // Connection Screen
  if (!connected && messages.length === 0) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-rose-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-500">
        <MeshBackground />
        
        <div className="relative z-10 w-full max-w-md bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-light tracking-tight bg-gradient-to-r from-rose-400 to-pink-600 bg-clip-text text-transparent font-sans">
              BloomChat
            </h1>
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-rose-500 dark:text-rose-300">
                <Send size={32} />
              </div>
              <h2 className="text-xl font-medium mb-2">Start a private conversation</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Share this link with a friend to establish a direct, peer-to-peer secure connection.
              </p>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <input 
                readOnly 
                value={`${window.location.origin}?join=${myId}`}
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none text-slate-600 dark:text-slate-300 font-mono"
              />
              <button 
                onClick={copyLink}
                className={cn(
                  "p-2.5 rounded-lg transition-all shadow-sm flex items-center gap-2",
                  copied 
                    ? "bg-green-500 text-white" 
                    : "bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                )}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="text-xs font-medium">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {error && (
               <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center">
                 {error}
               </div>
            )}
            
            <div className="pt-4 flex justify-center">
                <p className="text-xs text-slate-400 animate-pulse">Waiting for peer connection...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat Screen
  return (
    <div className="relative h-screen flex flex-col bg-rose-50 dark:bg-slate-900 transition-colors duration-500">
      <MeshBackground />

      {/* Header */}
      <header className="relative z-20 flex-none h-16 px-6 flex items-center justify-between bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px]", connected ? "bg-green-500 shadow-green-500/60" : "bg-yellow-500 shadow-yellow-500/60")} />
          <span className="font-medium text-slate-700 dark:text-slate-200">
              {connected ? 'Connected with Peer' : 'Waiting for connection...'}
          </span>
        </div>
        <div className="flex items-center gap-4">
           <button 
              onClick={clearChat}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
              title="New Conversation (Clears History)"
            >
              <MessageSquarePlus size={20} />
            </button>
           <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-4xl mx-auto flex flex-col">
            {messages.length === 0 && (
                <div className="self-center mt-20 text-center opacity-40">
                    <p className="text-6xl mb-4">🌸</p>
                    <p className="text-slate-500 dark:text-slate-400">Say hello to start the bloom.</p>
                </div>
            )}
            
            {/* Render restored messages, even if offline */}
            {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                message={msg} 
                isMe={msg.senderId === myId}
                onReply={setReplyTo}
                onReact={addReaction}
                parentMessage={msg.replyTo ? messages.find(m => m.id === msg.replyTo) : undefined}
            />
            ))}
            <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative z-20 flex-none p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {replyTo && (
            <div className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur p-2 px-4 rounded-t-xl border-x border-t border-slate-200 dark:border-slate-700 text-sm">
               <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
                  <Reply size={14} className="text-rose-500" />
                  <span className="font-medium">Replying to:</span>
                  <span className="opacity-75 truncate max-w-[200px]">{replyTo.type === 'image' ? 'Image' : replyTo.type === 'file' ? 'File' : replyTo.content}</span>
               </div>
               <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                 <X size={14} />
               </button>
            </div>
          )}
          
          {fileToUpload && (
            <div className="flex items-center justify-between bg-rose-50 dark:bg-slate-800/90 p-3 rounded-t-xl border border-rose-100 dark:border-slate-700 mx-1">
                <div className="flex items-center gap-3">
                    {fileToUpload.type.startsWith('image/') ? (
                        <div className="h-10 w-10 rounded overflow-hidden bg-slate-200">
                            <img src={URL.createObjectURL(fileToUpload)} className="h-full w-full object-cover" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                            <Paperclip size={20} />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{fileToUpload.name}</span>
                        <span className="text-xs text-slate-500">{(fileToUpload.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                </div>
                <button onClick={() => setFileToUpload(null)} className="p-1.5 hover:bg-rose-100 dark:hover:bg-slate-600 rounded-full text-slate-500">
                    <X size={16} />
                </button>
            </div>
          )}

          <div className={cn(
             "flex items-end gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-2 rounded-3xl border border-white/50 dark:border-slate-700 shadow-lg transition-all",
             (replyTo || fileToUpload) ? "rounded-t-sm" : ""
          )}>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => {
                if(e.target.files?.[0]) setFileToUpload(e.target.files[0]);
                e.target.value = ''; // Reset
              }} 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors rounded-full hover:bg-rose-50 dark:hover:bg-slate-700/50"
              title="Add file or image"
            >
              <Paperclip size={20} />
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-transparent max-h-32 min-h-[44px] py-3 px-2 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none scrollbar-hide"
              rows={1}
            />

            <button 
              onClick={handleSend}
              disabled={(!inputText.trim() && !fileToUpload)}
              className="p-3 bg-gradient-to-tr from-rose-500 to-pink-600 text-white rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-rose-200 dark:shadow-none"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400 dark:text-slate-600">
               Press Enter to send • Ctrl+V to paste images • Max 30MB
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}