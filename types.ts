export type MessageType = 'text' | 'image' | 'file';

export interface Reaction {
  emoji: string;
  from: string; // userId
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string; // mime type
  data: string | ArrayBuffer | Blob; // Base64 for images, Blob for files in memory
  url?: string; // Object URL for display
}

export interface Message {
  id: string;
  senderId: string;
  timestamp: number;
  type: MessageType;
  content?: string;
  attachment?: Attachment;
  replyTo?: string; // ID of the message being replied to
  reactions: Record<string, string[]>; // emoji -> array of userIds
}

export interface PeerState {
  myId: string;
  peerId: string | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
