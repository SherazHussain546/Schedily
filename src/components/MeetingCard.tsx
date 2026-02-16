
"use client";

import React from "react";
import { Meeting } from "@/lib/calendar-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Calendar, Clock, MapPin, Type } from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  onUpdate: (id: string, updates: Partial<Meeting>) => void;
  onRemove: (id: string) => void;
}

export function MeetingCard({ meeting, onUpdate, onRemove }: MeetingCardProps) {
  return (
    <Card className="mb-6 overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 border-l-primary group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Type className="w-4 h-4" /> Meeting Title
                </Label>
                <Input
                  placeholder="e.g. Weekly Sync"
                  value={meeting.title}
                  onChange={(e) => onUpdate(meeting.id, { title: e.target.value })}
                  className="bg-background focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Calendar className="w-4 h-4" /> Date
                </Label>
                <Input
                  type="date"
                  value={meeting.date}
                  onChange={(e) => onUpdate(meeting.id, { date: e.target.value })}
                  className="bg-background focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Clock className="w-4 h-4" /> Start Time
                </Label>
                <Input
                  type="time"
                  value={meeting.startTime}
                  onChange={(e) => onUpdate(meeting.id, { startTime: e.target.value })}
                  className="bg-background focus:ring-primary"
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
                  className="bg-background focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <MapPin className="w-4 h-4" /> Location (Optional)
                </Label>
                <Input
                  placeholder="e.g. Conference Room A"
                  value={meeting.location}
                  onChange={(e) => onUpdate(meeting.id, { location: e.target.value })}
                  className="bg-background focus:ring-primary"
                />
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(meeting.id)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
