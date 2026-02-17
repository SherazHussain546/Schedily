
"use client";

import React, { useState } from "react";
import { Meeting } from "@/lib/calendar-utils";
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
  UserPlus
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
  onAccept?: (id: string) => void;
}

export function MeetingCard({ meeting, db, onUpdate, onRemove, onShare, onAccept }: MeetingCardProps) {
  const [tagSearch, setTagSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isUrl = meeting.location.startsWith('http://') || meeting.location.startsWith('https://');
  const isEircode = /^[A-Z][0-9][0-9W]\s?[0-9A-Z]{4}$/i.test(meeting.location.trim());
  const isPending = meeting.status === 'pending';

  const getMapUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagSearch.trim() || !db) return;

    setIsSearching(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef, 
        where("displayName", ">=", tagSearch),
        where("displayName", "<=", tagSearch + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSearchResults(results);
    } catch (error) {
      toast({ variant: "destructive", title: "Search failed" });
    } finally {
      setIsSearching(false);
    }
  };

  const tagUser = (user: any) => {
    onUpdate(meeting.id, { employeeName: user.displayName });
    if (onShare) {
      onShare(meeting, user.displayName);
    }
    setIsPopoverOpen(false);
    setSearchResults([]);
    setTagSearch("");
  };

  return (
    <Card className={cn(
      "mb-6 overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 group relative",
      meeting.type === 'shift' ? "border-l-accent" : "border-l-primary",
      isPending && "bg-amber-50/30 border-l-amber-400"
    )}>
      {isPending && (
        <div className="absolute top-0 right-0 p-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> New Request
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
                  <TabsTrigger value="meeting" className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5" /> Meeting
                  </TabsTrigger>
                  <TabsTrigger value="shift" className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> Retail Shift
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {meeting.senderName && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  <UserCheck className="w-3 h-3" />
                  From: {meeting.senderName}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPending && onAccept && (
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onAccept(meeting.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Accept Shift
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(meeting.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                <Type className="w-4 h-4" /> {meeting.type === 'shift' ? 'Shift Title' : 'Meeting Title'}
              </Label>
              <Input
                placeholder={meeting.type === 'shift' ? "e.g. Morning Shift" : "e.g. Project Sync"}
                value={meeting.title}
                onChange={(e) => onUpdate(meeting.id, { title: e.target.value })}
                className="bg-background focus:ring-primary"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                {meeting.type === 'shift' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {meeting.type === 'shift' ? 'Tag Teammate (Deliver Shift)' : 'Attendees (Tag list)'}
              </Label>
              
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal h-10 px-3 bg-white hover:bg-slate-50 border-slate-200"
                    disabled={isPending}
                  >
                    {meeting.employeeName || meeting.emails ? (
                      <span className="flex items-center gap-2 text-primary font-bold">
                        <UserPlus className="w-4 h-4" /> @{meeting.employeeName || meeting.emails}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Search className="w-4 h-4" /> Tag a colleague...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-3 border-b">
                    <form onSubmit={handleUserSearch} className="flex gap-2">
                      <Input 
                        placeholder="Search username..." 
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button type="submit" size="sm" className="h-8" disabled={isSearching}>
                        {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      </Button>
                    </form>
                  </div>
                  <div className="max-h-[200px] overflow-auto p-1">
                    {searchResults.length > 0 ? (
                      searchResults.map((u) => (
                        <button
                          key={u.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 rounded-md transition-colors flex items-center gap-2"
                          onClick={() => tagUser(u)}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {u.displayName?.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-bold">@{u.displayName}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        {tagSearch ? "No professionals found" : "Search to tag a colleague"}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <AlignLeft className="w-4 h-4" /> Description (Optional)
                </Label>
                <Textarea
                  placeholder="Provide some context..."
                  value={meeting.description || ''}
                  onChange={(e) => onUpdate(meeting.id, { description: e.target.value })}
                  className="bg-background focus:ring-primary min-h-[80px]"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Paperclip className="w-4 h-4" /> Attachment Links (Optional)
                </Label>
                <Textarea
                  placeholder="Links to documents (one per line)"
                  value={meeting.attachments || ''}
                  onChange={(e) => onUpdate(meeting.id, { attachments: e.target.value })}
                  className="bg-background focus:ring-primary min-h-[80px]"
                  disabled={isPending}
                />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                <Calendar className="w-4 h-4" /> Date
              </Label>
              <Input
                type="date"
                value={meeting.date}
                onChange={(e) => onUpdate(meeting.id, { date: e.target.value })}
                className="bg-background"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                <Clock className="w-4 h-4" /> Start Time
              </Label>
              <Input
                type="time"
                value={meeting.startTime}
                onChange={(e) => onUpdate(meeting.id, { startTime: e.target.value })}
                className="bg-background"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                <Clock className="w-4 h-4" /> End Time
              </Label>
              <Input
                type="time"
                value={meeting.endTime}
                onChange={(e) => onUpdate(meeting.id, { endTime: e.target.value })}
                className="bg-background"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground font-medium">
              <MapPin className="w-4 h-4" /> Location / Eircode / URL
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. D02 X285 or https://zoom.us/..."
                value={meeting.location}
                onChange={(e) => onUpdate(meeting.id, { location: e.target.value })}
                className="bg-background flex-1"
                disabled={isPending}
              />
              {meeting.location && (isUrl || isEircode) && (
                <Button
                  variant="outline"
                  size="icon"
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
