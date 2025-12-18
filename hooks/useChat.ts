import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, PeerState, MessageType, Attachment } from '../types';
import { generateId } from '../utils/ui';

export function useChat() {
  const [peerState, setPeerState] = useState<PeerState>({
    myId: '',
    peerId: null,
    connected: false,
    loading: true,
    error: null,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // Initialize Peer
  useEffect(() => {
    const initPeer = async () => {
      try {
        // Dynamic import to avoid SSR issues if we were using Next.js, standard React is fine but good practice
        const { default: Peer } = await import('peerjs');
        const peer = new Peer();

        peer.on('open', (id) => {
          console.log('My peer ID is: ' + id);
          setPeerState(prev => ({ ...prev, myId: id, loading: false }));
        });

        peer.on('connection', (conn) => {
          handleConnection(conn);
        });

        peer.on('error', (err) => {
          console.error(err);
          setPeerState(prev => ({ ...prev, error: 'Connection error: ' + err.type }));
        });

        peerRef.current = peer;
      } catch (e) {
        setPeerState(prev => ({ ...prev, error: 'Failed to load PeerJS' }));
      }
    };

    initPeer();

    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  const handleConnection = (conn: DataConnection) => {
    connRef.current = conn;
    
    conn.on('open', () => {
      setPeerState(prev => ({ ...prev, connected: true, peerId: conn.peer }));
    });

    conn.on('data', (data: any) => {
      if (data.action === 'reaction') {
        addReaction(data.messageId, data.emoji, false);
      } else {
        receiveMessage(data);
      }
    });

    conn.on('close', () => {
      setPeerState(prev => ({ ...prev, connected: false, peerId: null }));
      connRef.current = null;
    });

    conn.on('error', (err) => {
      console.error("Connection Error", err);
      setPeerState(prev => ({ ...prev, connected: false }));
    });
  };

  const connectToPeer = (peerId: string) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(peerId);
    handleConnection(conn);
  };

  const sendMessage = async (
    content: string, 
    type: MessageType = 'text', 
    replyTo?: string, 
    attachmentFile?: File
  ) => {
    let attachment: Attachment | undefined;

    if (attachmentFile) {
      // Small file strategy: Read as ArrayBuffer/Blob and send directly
      // 30MB is the limit set by user. 
      // Note: Reliable transfer of 30MB via standard PeerJS data channel can be tricky without chunking.
      // We will assume a happy path or standard buffer handling by PeerJS/Browser.
      const buffer = await attachmentFile.arrayBuffer();
      const blob = new Blob([buffer], { type: attachmentFile.type });
      
      attachment = {
        id: generateId(),
        name: attachmentFile.name,
        size: attachmentFile.size,
        type: attachmentFile.type,
        data: blob,
        url: URL.createObjectURL(blob) // Local preview
      };
    }

    const newMessage: Message = {
      id: generateId(),
      senderId: peerState.myId,
      timestamp: Date.now(),
      type,
      content,
      replyTo,
      attachment,
      reactions: {}
    };

    // Update local state
    setMessages(prev => [...prev, newMessage]);

    // Send to peer
    if (connRef.current && peerState.connected) {
      // Clone for sending (exclude local URL object)
      const payload = { ...newMessage };
      if (payload.attachment) {
         // Send the blob/buffer directly
         payload.attachment = { 
           ...payload.attachment, 
           url: undefined 
         };
      }
      connRef.current.send(payload);
    }
  };

  const receiveMessage = (data: any) => {
    const msg = data as Message;
    // Hydrate attachment blob to URL
    if (msg.attachment && msg.attachment.data) {
      // PeerJS preserves Blob/ArrayBuffer types usually
      const blob = new Blob([msg.attachment.data as any], { type: msg.attachment.type });
      msg.attachment.url = URL.createObjectURL(blob);
    }
    setMessages(prev => [...prev, msg]);
  };

  const addReaction = (messageId: string, emoji: string, broadcast = true) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      
      const currentUsers = msg.reactions[emoji] || [];
      const userId = broadcast ? peerState.myId : (peerState.peerId || 'peer');
      
      // Toggle logic
      const exists = currentUsers.includes(userId);
      const newUsers = exists 
        ? currentUsers.filter(id => id !== userId)
        : [...currentUsers, userId];
      
      const newReactions = { ...msg.reactions };
      if (newUsers.length === 0) {
        delete newReactions[emoji];
      } else {
        newReactions[emoji] = newUsers;
      }
      
      return { ...msg, reactions: newReactions };
    }));

    if (broadcast && connRef.current && peerState.connected) {
      connRef.current.send({
        action: 'reaction',
        messageId,
        emoji
      });
    }
  };

  return {
    ...peerState,
    messages,
    connectToPeer,
    sendMessage,
    addReaction
  };
}