
"use client";

import React, { useState } from "react";
import { Meeting, generateICSContent, downloadICS } from "@/lib/calendar-utils";
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
  Share
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, getDocs, Firestore } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

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
  const [groupResults, setGroupResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isUrl = meeting.location.startsWith('http://') || meeting.location.startsWith('https://');
  const isEircode = /^[A-Z][0-9][0-9W]\s?[0-9A-Z]{4}$/i.test(meeting.location.trim());
  const isPending = meeting.status === 'pending';

  const getMapUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagSearch.trim() || !db) return;

    setIsSearching(true);
    try {
      // Search Users
      const usersRef = collection(db, "users");
      const uq = query(
        usersRef, 
        where("displayName", ">=", tagSearch),
        where("displayName", "<=", tagSearch + '\uf8ff')
      );
      const uSnap = await getDocs(uq);
      const uRes = uSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'user' }));

      // Search Groups
      const groupsRef = collection(db, "groups");
      const gq = query(
        groupsRef,
        where("name", ">=", tagSearch),
        where("name", "<=", tagSearch + '\uf8ff')
      );
      const gSnap = await getDocs(gq);
      const gRes = gSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'group' }));

      setSearchResults([...uRes, ...gRes]);
    } catch (error) {
      toast({ variant: "destructive", title: "Search failed" });
    } finally {
      setIsSearching(false);
    }
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

  return (
    <Card className={cn(
      "mb-6 overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 group relative",
      meeting.type === 'shift' ? "border-l-accent" : "border-l-primary",
      isPending && "bg-amber-50/30 border-l-amber-400"
    )}>
      {isPending && (
        <div className="absolute top-0 right-0 p-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 font-bold">
            <AlertCircle className="w-3 h-3" /> New Task Pushed
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Tabs 
                value={meeting.type} 
                onValueChange={(val) => onUpdate(meeting.id, { type: val as any })}
                className="w-[300px]"
                disabled={isPending}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="meeting" className="flex items-center gap-2 font-bold">
                    <Video className="w-3.5 h-3.5" /> Meeting
                  </TabsTrigger>
                  <TabsTrigger value="shift" className="flex items-center gap-2 font-bold">
                    <Briefcase className="w-3.5 h-3.5" /> Retail Shift
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {meeting.senderName && (
                <div className="flex items-center gap-1.5 text-xs font-black text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                  <UserCheck className="w-3 h-3" />
                  DISPATCHED BY: {meeting.senderName.toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPending && onAccept && (
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                  onClick={() => onAccept(meeting.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Sync to Schedule
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleIndividualDownload}
                className="text-muted-foreground hover:text-primary"
                title="Download ICS"
              >
                <Download className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(meeting.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete Entry"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                <Type className="w-4 h-4 text-primary" /> {meeting.type === 'shift' ? 'Shift Title' : 'Meeting Title'}
              </Label>
              <Input
                placeholder={meeting.type === 'shift' ? "e.g. Morning Shift" : "e.g. Project Sync"}
                value={meeting.title}
                onChange={(e) => onUpdate(meeting.id, { title: e.target.value })}
                className="bg-background focus:ring-primary font-bold text-slate-900 h-12 rounded-xl"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                <Share className="w-4 h-4 text-accent" /> Dispatch to Network / Team
              </Label>
              
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-bold h-12 px-4 bg-white hover:bg-slate-50 border-slate-200 rounded-xl"
                    disabled={isPending}
                  >
                    {meeting.employeeName ? (
                      <span className="flex items-center gap-2 text-primary">
                        <UserCheck className="w-4 h-4" /> {meeting.employeeName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2 font-medium">
                        <Search className="w-4 h-4" /> Tag teammate or group...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-none" align="start">
                  <div className="p-4 border-b bg-slate-50 rounded-t-2xl">
                    <form onSubmit={handleSearch} className="flex gap-2">
                      <Input 
                        placeholder="Search name or group..." 
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        className="h-10 text-sm rounded-lg"
                      />
                      <Button type="submit" size="sm" className="h-10 rounded-lg px-3" disabled={isSearching}>
                        {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      </Button>
                    </form>
                  </div>
                  <div className="max-h-[240px] overflow-auto p-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((t) => (
                        <button
                          key={t.id}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-primary/5 rounded-xl transition-colors flex items-center justify-between group"
                          onClick={() => dispatchTask(t)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black",
                              t.type === 'user' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                            )}>
                              {t.type === 'user' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{t.type === 'user' ? `@${t.displayName}` : t.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{t.type.toUpperCase()}</p>
                            </div>
                          </div>
                          <Send className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                        {tagSearch ? "No results found" : "Enter a name to broadcast task"}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                  <AlignLeft className="w-4 h-4" /> Context & Notes
                </Label>
                <Textarea
                  placeholder="Provide some context for the team..."
                  value={meeting.description || ''}
                  onChange={(e) => onUpdate(meeting.id, { description: e.target.value })}
                  className="bg-background focus:ring-primary min-h-[100px] rounded-xl font-medium"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                  <Paperclip className="w-4 h-4" /> Related Links
                </Label>
                <Textarea
                  placeholder="Links to docs or resources..."
                  value={meeting.attachments || ''}
                  onChange={(e) => onUpdate(meeting.id, { attachments: e.target.value })}
                  className="bg-background focus:ring-primary min-h-[100px] rounded-xl font-medium"
                  disabled={isPending}
                />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                <Calendar className="w-4 h-4" /> Scheduled Date
              </Label>
              <Input
                type="date"
                value={meeting.date}
                onChange={(e) => onUpdate(meeting.id, { date: e.target.value })}
                className="bg-background rounded-xl font-bold"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                <Clock className="w-4 h-4" /> Start
              </Label>
              <Input
                type="time"
                value={meeting.startTime}
                onChange={(e) => onUpdate(meeting.id, { startTime: e.target.value })}
                className="bg-background rounded-xl font-bold"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                <Clock className="w-4 h-4" /> End
              </Label>
              <Input
                type="time"
                value={meeting.endTime}
                onChange={(e) => onUpdate(meeting.id, { endTime: e.target.value })}
                className="bg-background rounded-xl font-bold"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
              <MapPin className="w-4 h-4" /> Location / URL / Eircode
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Dublin Office or Zoom Link"
                value={meeting.location}
                onChange={(e) => onUpdate(meeting.id, { location: e.target.value })}
                className="bg-background flex-1 rounded-xl font-bold"
                disabled={isPending}
              />
              {meeting.location && (isUrl || isEircode) && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-12 w-12"
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
