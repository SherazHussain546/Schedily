"use client";

import React, { useState, useEffect } from "react";
import { Meeting, generateICSContent, downloadICS, ItemType } from "@/lib/calendar-utils";
import { MeetingCard } from "@/components/MeetingCard";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Download, Sparkles, LayoutDashboard, Briefcase } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

export default function MeetingMaestro() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [year, setYear] = useState<number>(2025);

  useEffect(() => {
    setHydrated(true);
    setYear(new Date().getFullYear());
    const today = new Date().toISOString().split('T')[0];
    setMeetings([
      {
        id: crypto.randomUUID(),
        title: "",
        type: 'meeting',
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      },
    ]);
  }, []);

  const addItem = (type: ItemType) => {
    const today = new Date().toISOString().split('T')[0];
    setMeetings([
      ...meetings,
      {
        id: crypto.randomUUID(),
        title: "",
        type,
        employeeName: "",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      },
    ]);
    toast({
      title: type === 'shift' ? "Shift Added" : "Meeting Added",
      description: `A new ${type} card has been added to your list.`,
    });
  };

  const removeMeeting = (id: string) => {
    if (meetings.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot Remove",
        description: "You need at least one entry in your schedule.",
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
    const hasEmptyFields = meetings.some((m) => {
        if (m.type === 'shift' && !m.employeeName?.trim()) return true;
        return !m.title.trim() && m.type === 'meeting';
    });

    if (hasEmptyFields) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please ensure all entries have titles or employee names.",
      });
      return;
    }

    const content = generateICSContent(meetings);
    downloadICS(content, "schedule-export.ics");
    toast({
      title: "Success",
      description: "Your schedule has been exported successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-primary-foreground w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-headline tracking-tight text-primary">
              Maestro
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => addItem('meeting')} className="hidden sm:flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" /> Meeting
            </Button>
            <Button variant="outline" onClick={() => addItem('shift')} className="hidden sm:flex items-center gap-2 border-accent/20 hover:border-accent text-accent">
              <Briefcase className="w-4 h-4" /> Shift
            </Button>
            <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export .ics</span>
            </Button>
          </div>
        </div>
      </header>

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
              <h2 className="text-3xl font-bold font-headline text-slate-800 mb-2">Schedule Management</h2>
              <p className="text-muted-foreground text-lg">
                Create meetings or retail shifts and export them directly to any calendar.
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

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 group">
                  <LayoutDashboard className="w-8 h-8 text-primary mb-4" />
                  <p className="text-slate-600 font-medium mb-6 text-center">Plan a collaborative meeting</p>
                  <Button variant="secondary" onClick={() => addItem('meeting')} className="bg-white border hover:bg-slate-50 text-primary font-semibold w-full py-6 h-auto rounded-2xl shadow-sm">
                    <CalendarPlus className="w-5 h-5 mr-2" /> Add Meeting
                  </Button>
               </div>
               <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-accent/20 rounded-3xl bg-accent/5 group">
                  <Briefcase className="w-8 h-8 text-accent mb-4" />
                  <p className="text-slate-600 font-medium mb-6 text-center">Manage retail staff shifts</p>
                  <Button variant="secondary" onClick={() => addItem('shift')} className="bg-white border hover:bg-slate-50 text-accent font-semibold w-full py-6 h-auto rounded-2xl shadow-sm">
                    <Briefcase className="w-5 h-5 mr-2" /> Add Shift
                  </Button>
               </div>
            </div>
          </>
        )}

        <div className="mt-20 pt-10 border-t text-center text-sm text-muted-foreground">
          <p>© {year} Meeting Maestro. Irish Eircode and Virtual Link ready.</p>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
