
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking 
} from '@/firebase';
import { collection, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupChatProps {
  groupId: string;
  groupName: string;
}

export function GroupChat({ groupId, groupName }: GroupChatProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !groupId) return null;
    return query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
  }, [db, groupId]);

  const { data: messages, isLoading } = useCollection(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !db) return;

    const messagesRef = collection(db, 'groups', groupId, 'messages');
    addDocumentNonBlocking(messagesRef, {
      text: message.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Teammate',
      createdAt: serverTimestamp(),
    });
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-4 border-b bg-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 leading-tight">{groupName} Chat</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Knowledge Base & Discussion</p>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg: any) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {!isMe && (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">
                      {msg.senderName}
                    </span>
                  )}
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm",
                    isMe 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                  )}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white border border-dashed flex items-center justify-center text-slate-200">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Start the discussion! Share knowledge and coordinate with your team.
            </p>
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2">
        <Input 
          placeholder="Message the team..." 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-xl h-12 bg-slate-50 border-none focus-visible:ring-primary"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim()}
          className="rounded-xl h-12 w-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
