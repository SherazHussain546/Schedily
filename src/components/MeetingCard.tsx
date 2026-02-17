
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Meeting, generateICSContent, downloadICS, generateGoogleCalendarUrl } from "@/lib/calendar-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Type, 
  User, 
  ExternalLink, 
  Briefcase, 
  Video, 
  Users, 
  AlignLeft, 
  Paperclip,
  Share2,
  Send,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  UserPlus,
  Download,
  Share,
  FileText,
  Link as LinkIcon,
  CalendarDays
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, getDocs, Firestore } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MeetingCardProps {
  meeting: Meeting;
  db: Firestore;
  onUpdate: (id: string, updates: Partial<Meeting>) => void;
  onRemove: (id: string) => void;
  onShare?: (meeting: Meeting, username: string) => void;
  onShareGroup?: (meeting: Meeting, groupId: string, groupName: string) => void;
  onAccept?: (id: string) => void;
}

export function MeetingCard({ meeting, db, onUpdate, onRemove, onShare, onShareGroup, onAccept }: MeetingCardProps) {
  const [tagSearch, setTagSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isUrl = meeting.location.startsWith('http://') || meeting.location.startsWith('https://');
  const isEircode = /^[A-Z][0-9][0-9W]\s?[0-9A-Z]{4}$/i.test(meeting.location.trim());
  const isPending = meeting.status === 'pending';

  const detectedLinks = useMemo(() => {
    if (!meeting.attachments) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return meeting.attachments.match(urlRegex) || [];
  }, [meeting.attachments]);

  useEffect(() => {
    const performSearch = async () => {
      if (!tagSearch.trim() || !db) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const usersRef = collection(db, "users");
        const uq = query(
          usersRef, 
          where("displayName", ">=", tagSearch),
          where("displayName", "<=", tagSearch + '\uf8ff')
        );
        const uSnap = await getDocs(uq);
        const uRes = uSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'user' }));

        const groupsRef = collection(db, "groups");
        const gq = query(
          groupsRef,
          where("name", ">=", tagSearch),
          where("name", "<=", tagSearch + '\uf8ff')
        );
        const gSnap = await getDocs(gq);
        const gRes = gSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'group' }));

        setSearchResults([...uRes, ...gRes].slice(0, 6));
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [tagSearch, db]);

  const getMapUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const dispatchTask = (target: any) => {
    if (target.type === 'user') {
      onUpdate(meeting.id, { employeeName: target.displayName });
      if (onShare) onShare(meeting, target.displayName);
    } else if (target.type === 'group') {
      onUpdate(meeting.id, { employeeName: `Group: ${target.name}` });
      if (onShareGroup) onShareGroup(meeting, target.id, target.name);
    }
    setIsPopoverOpen(false);
    setSearchResults([]);
    setTagSearch("");
  };

  const handleIndividualDownload = () => {
    const content = generateICSContent([meeting]);
    const filename = `${meeting.title || (meeting.type === 'shift' ? 'Shift' : 'Meeting')}-${meeting.date}.ics`;
    downloadICS(content, filename);
    toast({ title: "Calendar Event Generated" });
  };

  const handleAddToGoogle = () => {
    const url = generateGoogleCalendarUrl(meeting);
    window.open(url, '_blank');
  };

  const downloadAttachment = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = "_blank";
    link.download = url.split('/').pop() || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className={cn(
      "mb-6 overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 group relative rounded-[1.5rem] sm:rounded-[2rem]",
      meeting.type === 'shift' ? "border-l-accent" : "border-l-primary",
      isPending && "bg-amber-50/30 border-l-amber-400"
    )}>
      {isPending && (
        <div className="absolute top-0 right-0 p-2 sm:p-3">
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 font-bold text-[10px] sm:text-xs">
            <AlertCircle className="w-3 h-3" /> New Task
          </Badge>
        </div>
      )}

      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Tabs 
                value={meeting.type} 
                onValueChange={(val) => onUpdate(meeting.id, { type: val as any })}
                className="w-full sm:w-[280px]"
                disabled={isPending}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="meeting" className="flex items-center justify-center gap-2 font-bold text-xs">
                    <Video className="w-3.5 h-3.5" /> Meeting
                  </TabsTrigger>
                  <TabsTrigger value="shift" className="flex items-center justify-center gap-2 font-bold text-xs">
                    <Briefcase className="w-3.5 h-3.5" /> Shift
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {meeting.senderName && (
                <div className="flex items-center gap-1.5 text-[9px] sm:text-xs font-black text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10 whitespace-nowrap">
                  <UserCheck className="w-3 h-3" />
                  DISPATCHED BY: {meeting.senderName.toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              {isPending && onAccept && (
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-9 text-xs"
                  onClick={() => onAccept(meeting.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Sync
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddToGoogle}
                className="text-muted-foreground hover:text-primary rounded-full h-9 w-9"
                title="Add to Google Calendar"
              >
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleIndividualDownload}
                className="text-muted-foreground hover:text-primary rounded-full h-9 w-9"
                title="Download ICS"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(meeting.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full h-9 w-9"
                title="Delete Entry"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                <Type className="w-3.5 h-3.5 sm:w-4 h-4 text-primary" /> {meeting.type === 'shift' ? 'Shift Title' : 'Meeting Title'}
              </Label>
              <Input
                placeholder={meeting.type === 'shift' ? "e.g. Morning Shift" : "e.g. Project Sync"}
                value={meeting.title}
                onChange={(e) => onUpdate(meeting.id, { title: e.target.value })}
                className="bg-background focus:ring-primary font-bold text-slate-900 h-11 sm:h-12 rounded-xl text-sm sm:text-base"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                <Share className="w-3.5 h-3.5 sm:w-4 h-4 text-accent" /> Dispatch to Network / Team
              </Label>
              
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-bold h-11 sm:h-12 px-4 bg-white hover:bg-slate-50 border-slate-200 rounded-xl text-sm"
                    disabled={isPending}
                  >
                    {meeting.employeeName ? (
                      <span className="flex items-center gap-2 text-primary truncate">
                        <UserCheck className="w-4 h-4 shrink-0" /> {meeting.employeeName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2 font-medium truncate">
                        <Search className="w-4 h-4 shrink-0" /> Tag teammate or group...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[320px] p-0 rounded-2xl shadow-2xl border-none" align="start">
                  <div className="p-3 sm:p-4 border-b bg-slate-50 rounded-t-2xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Type name..." 
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        className="h-9 sm:h-10 pl-9 text-xs sm:text-sm rounded-lg bg-white border-slate-200"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[250px] sm:max-h-[300px] overflow-auto p-2 space-y-1">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-6 sm:py-8 gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Searching...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((t) => (
                        <button
                          key={t.id}
                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98]"
                          onClick={() => dispatchTask(t)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl">
                              <AvatarFallback className={cn(
                                "rounded-xl text-[10px] sm:text-xs font-black",
                                t.type === 'user' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                              )}>
                                {t.type === 'user' ? (t.displayName?.substring(0, 1).toUpperCase() || <User className="w-4 h-4" />) : <Users className="w-4 h-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {t.type === 'user' ? `@${t.displayName}` : t.name}
                              </p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                                {t.type === 'user' ? 'Professional' : 'Team Group'}
                              </p>
                            </div>
                          </div>
                          <Send className="w-3.5 h-3.5 sm:w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                      ))
                    ) : (
                      <div className="p-6 sm:p-8 text-center">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                          {tagSearch ? "No matches" : "Start typing"}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Search usernames or team names.
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                  <AlignLeft className="w-3.5 h-3.5 sm:w-4 h-4" /> Context & Notes
                </Label>
                <Textarea
                  placeholder="Provide some context..."
                  value={meeting.description || ''}
                  onChange={(e) => onUpdate(meeting.id, { description: e.target.value })}
                  className="bg-background focus:ring-primary min-h-[80px] sm:min-h-[100px] rounded-xl font-medium text-xs sm:text-sm"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                  <Paperclip className="w-3.5 h-3.5 sm:w-4 h-4" /> Links & Attachments
                </Label>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Paste URLs to docs or files..."
                    value={meeting.attachments || ''}
                    onChange={(e) => onUpdate(meeting.id, { attachments: e.target.value })}
                    className="bg-background focus:ring-primary min-h-[80px] sm:min-h-[100px] rounded-xl font-medium text-xs sm:text-sm"
                    disabled={isPending}
                  />
                  {detectedLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
                      {detectedLinks.map((url, i) => (
                        <div key={i} className="flex items-center gap-1.5 p-1.5 bg-slate-50 border rounded-lg text-[9px] sm:text-[10px] font-bold">
                          <LinkIcon className="w-3 h-3 text-primary" />
                          <span className="text-slate-500 truncate max-w-[100px] sm:max-w-[120px]">Resource {i+1}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5 sm:w-4 h-4" /> Date
              </Label>
              <Input
                type="date"
                value={meeting.date}
                onChange={(e) => onUpdate(meeting.id, { date: e.target.value })}
                className="bg-background rounded-xl font-bold h-10 sm:h-11 text-xs sm:text-sm"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5 sm:w-4 h-4" /> Start
              </Label>
              <Input
                type="time"
                value={meeting.startTime}
                onChange={(e) => onUpdate(meeting.id, { startTime: e.target.value })}
                className="bg-background rounded-xl font-bold h-10 sm:h-11 text-xs sm:text-sm"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5 sm:w-4 h-4" /> End
              </Label>
              <Input
                type="time"
                value={meeting.endTime}
                onChange={(e) => onUpdate(meeting.id, { endTime: e.target.value })}
                className="bg-background rounded-xl font-bold h-10 sm:h-11 text-xs sm:text-sm"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
              <MapPin className="w-3.5 h-3.5 sm:w-4 h-4" /> Location / URL / Eircode
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Dublin Office or Zoom Link"
                value={meeting.location}
                onChange={(e) => onUpdate(meeting.id, { location: e.target.value })}
                className="bg-background flex-1 rounded-xl font-bold h-10 sm:h-12 text-sm"
                disabled={isPending}
              />
              {meeting.location && (isUrl || isEircode) && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-10 sm:h-12 w-10 sm:w-12 shrink-0"
                  onClick={() => window.open(isUrl ? meeting.location : getMapUrl(meeting.location), '_blank')}
                  title={isUrl ? "Open Link" : "Open Maps"}
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
