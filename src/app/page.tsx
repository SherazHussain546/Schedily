"use client";

import React, { useState, useEffect } from "react";
import { Meeting, generateICSContent, downloadICS } from "@/lib/calendar-utils";
import { MeetingCard } from "@/components/MeetingCard";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Download, Sparkles, LayoutDashboard } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

export default function MeetingMaestro() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [year, setYear] = useState<number>(2024);

  useEffect(() => {
    setHydrated(true);
    setYear(new Date().getFullYear());
    // Initial meeting
    const today = new Date().toISOString().split('T')[0];
    setMeetings([
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        title: "",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      },
    ]);
  }, []);

  const addMeeting = () => {
    const today = new Date().toISOString().split('T')[0];
    setMeetings([
      ...meetings,
      {
        id: crypto.randomUUID(),
        title: "",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      },
    ]);
    toast({
      title: "Meeting Added",
      description: "A new card has been added to your schedule.",
    });
  };

  const removeMeeting = (id: string) => {
    if (meetings.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot Remove",
        description: "You need at least one meeting in your schedule.",
      });
      return;
    }
    setMeetings(meetings.filter((m) => m.id !== id));
  };

  const updateMeeting = (id: string, updates: Partial<Meeting>) => {
    setMeetings(
      meetings.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const handleDownload = () => {
    const hasEmptyTitle = meetings.some((m) => !m.title.trim());
    if (hasEmptyTitle) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide titles for all meetings before exporting.",
      });
      return;
    }

    const content = generateICSContent(meetings);
    downloadICS(content, "meeting-maestro-schedule.ics");
    toast({
      title: "Success",
      description: "Your schedule has been exported successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-primary-foreground w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-headline tracking-tight text-primary">
              Meeting Maestro
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={addMeeting} className="hidden sm:flex items-center gap-2 border-primary/20 hover:border-primary">
              <CalendarPlus className="w-4 h-4" /> Add Meeting
            </Button>
            <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download .ics</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!hydrated ? (
          <div className="flex items-center justify-center min-h-[400px]">
             <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="h-4 w-48 bg-muted rounded"></div>
             </div>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center sm:text-left">
              <h2 className="text-3xl font-bold font-headline text-slate-800 mb-2">Build Your Schedule</h2>
              <p className="text-muted-foreground text-lg">
                Easily create meeting events and export them directly to your calendar.
              </p>
            </div>

            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onUpdate={updateMeeting}
                  onRemove={removeMeeting}
                />
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 group">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <LayoutDashboard className="w-8 h-8 text-primary" />
               </div>
               <p className="text-slate-600 font-medium mb-6">Want to add another session?</p>
               <Button variant="secondary" onClick={addMeeting} className="bg-white border hover:bg-slate-50 text-primary font-semibold px-8 py-6 h-auto rounded-2xl shadow-sm">
                 <CalendarPlus className="w-5 h-5 mr-2" /> Add New Meeting Card
               </Button>
            </div>
          </>
        )}

        <div className="mt-20 pt-10 border-t text-center text-sm text-muted-foreground">
          <p>© {year} Meeting Maestro. Professional scheduling made simple.</p>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
