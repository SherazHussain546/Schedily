
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
  AlertCircle
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MeetingCardProps {
  meeting: Meeting;
  onUpdate: (id: string, updates: Partial<Meeting>) => void;
  onRemove: (id: string) => void;
  onShare?: (meeting: Meeting, username: string) => void;
  onAccept?: (id: string) => void;
}

export function MeetingCard({ meeting, onUpdate, onRemove, onShare, onAccept }: MeetingCardProps) {
  const [shareUsername, setShareUsername] = useState("");
  const isUrl = meeting.location.startsWith('http://') || meeting.location.startsWith('https://');
  const isEircode = /^[A-Z][0-9][0-9W]\s?[0-9A-Z]{4}$/i.test(meeting.location.trim());
  const isPending = meeting.status === 'pending';

  const getMapUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const handleShare = () => {
    if (onShare && shareUsername.trim()) {
      onShare(meeting, shareUsername);
      setShareUsername("");
    }
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

              {!isPending && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" title="Send to Employee">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4 shadow-xl border-primary/20">
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                         <Send className="w-3.5 h-3.5" /> Deliver Shift
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Enter employee's username to push this entry to their schedule.</p>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Employee Username" 
                          value={shareUsername}
                          onChange={(e) => setShareUsername(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button size="sm" className="h-8 px-2" onClick={handleShare}>
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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

            {meeting.type === 'shift' ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <User className="w-4 h-4" /> Employee Name
                </Label>
                <Input
                  placeholder="e.g. John Doe"
                  value={meeting.employeeName || ''}
                  onChange={(e) => onUpdate(meeting.id, { employeeName: e.target.value })}
                  className="bg-background focus:ring-accent"
                  disabled={isPending}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Users className="w-4 h-4" /> People (Email list)
                </Label>
                <Input
                  placeholder="e.g. john@example.com, sara@example.com"
                  value={meeting.emails || ''}
                  onChange={(e) => onUpdate(meeting.id, { emails: e.target.value })}
                  className="bg-background focus:ring-primary"
                  disabled={isPending}
                />
              </div>
            )}
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
