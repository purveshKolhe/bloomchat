import { useState, useEffect, useRef } from 'react';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Message, PeerState, MessageType, Attachment } from '../types';
import { generateId, blobToBase64, base64ToBlob } from '../utils/ui';

const STORAGE_KEY_MSGS = 'bloom_messages';
const STORAGE_KEY_MY_ID = 'bloom_my_id';
const STORAGE_KEY_LAST_PEER = 'bloom_last_peer';

export function useChat() {
  const [peerState, setPeerState] = useState<PeerState>({
    myId: '',
    peerId: null,
    connected: false,
    loading: true,
    error: null,
  });
  
  // Initialize messages from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MSGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
    return [];
  });

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // Hydration Effect: Convert stored Base64 data back to Blobs/URLs
  useEffect(() => {
    const hydrate = async () => {
        let updated = false;
        const hydratedMessages = await Promise.all(messages.map(async (msg) => {
            if (msg.attachment && typeof msg.attachment.data === 'string' && !msg.attachment.url) {
                try {
                    const blob = await base64ToBlob(msg.attachment.data as string);
                    updated = true;
                    return {
                        ...msg,
                        attachment: {
                            ...msg.attachment,
                            data: blob, // Restore as Blob object for consistency
                            url: URL.createObjectURL(blob)
                        }
                    };
                } catch (e) {
                    return msg;
                }
            }
            return msg;
        }));

        if (updated) {
            setMessages(hydratedMessages);
        }
    };
    hydrate();
  }, []); // Run once on mount to hydrate loaded messages

  // Persistence Effect: Save messages when they change
  useEffect(() => {
    const saveMessages = async () => {
        if (messages.length === 0) return;
        
        // Deep copy and prepare for storage
        const serializableMessages = await Promise.all(messages.map(async (msg) => {
            const m = { ...msg };
            if (m.attachment) {
                // If it's a Blob, convert to Base64
                if (m.attachment.data instanceof Blob) {
                    if (m.attachment.size < 2 * 1024 * 1024) { // Limit to 2MB for localStorage
                        const b64 = await blobToBase64(m.attachment.data);
                        m.attachment = { ...m.attachment, data: b64, url: undefined }; 
                    } else {
                        // Too big, don't save the body
                        m.attachment = { ...m.attachment, data: '', url: undefined };
                        m.content = (m.content || '') + '\n(File expired or too large to save)';
                    }
                } else {
                    // Already string or empty
                    m.attachment = { ...m.attachment, url: undefined };
                }
            }
            return m;
        }));

        try {
            localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(serializableMessages));
        } catch (e) {
            console.error("Storage quota exceeded", e);
        }
    };

    const timeout = setTimeout(saveMessages, 1000); // Debounce
    return () => clearTimeout(timeout);
  }, [messages]);


  // Initialize Peer
  useEffect(() => {
    const initPeer = async () => {
      try {
        const { default: PeerClass } = await import('peerjs');
        
        // Try to reuse ID
        const savedId = localStorage.getItem(STORAGE_KEY_MY_ID);
        const peer = savedId ? new PeerClass(savedId) : new PeerClass();

        peer.on('open', (id) => {
          console.log('My peer ID is: ' + id);
          localStorage.setItem(STORAGE_KEY_MY_ID, id);
          setPeerState(prev => ({ ...prev, myId: id, loading: false }));

          // Auto-reconnect if we have a last peer
          const lastPeer = localStorage.getItem(STORAGE_KEY_LAST_PEER);
          if (lastPeer && !connRef.current) {
              // Short delay to ensure everything is ready
              setTimeout(() => connectToPeer(lastPeer), 500);
          }
        });

        peer.on('connection', (conn) => {
          handleConnection(conn);
        });

        peer.on('error', (err: any) => {
          console.error(err);
          if (err.type === 'unavailable-id') {
             // ID taken, maybe tab open? Remove ID and reload to get new one
             localStorage.removeItem(STORAGE_KEY_MY_ID);
             window.location.reload();
          } else {
             setPeerState(prev => ({ ...prev, error: 'Connection error: ' + err.type }));
          }
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
      localStorage.setItem(STORAGE_KEY_LAST_PEER, conn.peer);
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
    // Don't connect to self
    if (peerId === peerState.myId) return;

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
      const buffer = await attachmentFile.arrayBuffer();
      const blob = new Blob([buffer], { type: attachmentFile.type });
      
      attachment = {
        id: generateId(),
        name: attachmentFile.name,
        size: attachmentFile.size,
        type: attachmentFile.type,
        data: blob,
        url: URL.createObjectURL(blob)
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

    setMessages(prev => [...prev, newMessage]);

    if (connRef.current && peerState.connected) {
      const payload = { ...newMessage };
      if (payload.attachment) {
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
    if (msg.attachment && msg.attachment.data) {
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

  const clearChat = () => {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY_MSGS);
      localStorage.removeItem(STORAGE_KEY_LAST_PEER);
      localStorage.removeItem(STORAGE_KEY_MY_ID);
      
      setPeerState(prev => ({...prev, connected: false, peerId: null}));
      connRef.current?.close();
      
      // Reload the page without query parameters to ensure a fresh start
      window.location.href = window.location.pathname;
  };

  return {
    ...peerState,
    messages,
    connectToPeer,
    sendMessage,
    addReaction,
    clearChat
  };
}