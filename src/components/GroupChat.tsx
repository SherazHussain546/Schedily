
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
import { MessageSquare, Send, Loader2, Paperclip, X, Image as ImageIcon, Film, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupChatProps {
  groupId: string;
  groupName: string;
}

export function GroupChat({ groupId, groupName }: GroupChatProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [message, setMessage] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview({
        url: event.target?.result as string,
        type: type as 'image' | 'video'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !mediaPreview) || !user || !db) return;

    setIsUploading(true);
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    
    addDocumentNonBlocking(messagesRef, {
      text: message.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Teammate',
      mediaUrl: mediaPreview?.url || null,
      mediaType: mediaPreview?.type || null,
      createdAt: serverTimestamp(),
    });

    setMessage('');
    setMediaPreview(null);
    setIsUploading(false);
  };

  const downloadMedia = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-4 border-b bg-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 leading-tight">{groupName} Hub</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Social Coordination & Media</p>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-6">
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">
                      {msg.senderName}
                    </span>
                  )}
                  
                  <div className={cn(
                    "flex flex-col gap-2 rounded-2xl p-1.5 shadow-sm transition-all overflow-hidden relative group",
                    isMe 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                  )}>
                    {msg.mediaUrl && (
                      <div className="relative rounded-xl overflow-hidden bg-black/5 aspect-video w-full max-w-sm">
                        {msg.mediaType === 'image' ? (
                          <img 
                            src={msg.mediaUrl} 
                            alt="Shared media" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video 
                            src={msg.mediaUrl} 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button 
                          onClick={() => downloadMedia(msg.mediaUrl, `schedily-media-${msg.id}`)}
                          className="absolute top-2 right-2 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                          title="Download Media"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {msg.text && (
                      <div className="px-3 py-1.5 text-sm font-medium">
                        {msg.text}
                      </div>
                    )}
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
              Start the discussion! Share images, videos, and coordinate with your team.
            </p>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-white border-t space-y-4">
        {mediaPreview && (
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary shadow-lg animate-in zoom-in-95">
            {mediaPreview.type === 'image' ? (
              <img src={mediaPreview.url} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                <Film className="w-8 h-8 text-white/50" />
              </div>
            )}
            <button 
              onClick={() => setMediaPreview(null)}
              className="absolute top-1 right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl h-12 w-12 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input 
            placeholder="Type a message..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-xl h-12 bg-slate-50 border-none focus-visible:ring-primary font-medium"
            disabled={isUploading}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={(!message.trim() && !mediaPreview) || isUploading}
            className="rounded-xl h-12 w-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0 transition-transform active:scale-95"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
