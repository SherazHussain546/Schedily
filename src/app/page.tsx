"use client";

import React, { useState, useEffect } from "react";
import { Meeting, generateICSContent, downloadICS, ItemType } from "@/lib/calendar-utils";
import { MeetingCard } from "@/components/MeetingCard";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Download, Sparkles, LayoutDashboard, Briefcase, LogIn, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { 
  useUser, 
  useFirestore, 
  useAuth, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  initiateAnonymousSignIn
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";

export default function Schedily() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [year, setYear] = useState<number>(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Memoize the query for the user's meetings
  const meetingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "meetings"),
      orderBy("createdAt", "desc")
    );
  }, [db, user]);

  const { data: meetings, isLoading: isMeetingsLoading } = useCollection<Meeting>(meetingsQuery);

  const handleSignIn = () => {
    initiateAnonymousSignIn(auth);
  };

  const addItem = (type: ItemType) => {
    if (!user || !db) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save your schedule.",
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const meetingRef = collection(db, "users", user.uid, "meetings");
    
    addDocumentNonBlocking(meetingRef, {
      title: "",
      type,
      employeeName: "",
      emails: "",
      description: "",
      attachments: "",
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    toast({
      title: type === 'shift' ? "Shift Added" : "Meeting Added",
      description: `A new ${type} has been added to your cloud storage.`,
    });
  };

  const removeMeeting = (id: string) => {
    if (!user || !db) return;
    const meetingDoc = doc(db, "users", user.uid, "meetings", id);
    deleteDocumentNonBlocking(meetingDoc);
  };

  const updateMeeting = (id: string, updates: Partial<Meeting>) => {
    if (!user || !db) return;
    const meetingDoc = doc(db, "users", user.uid, "meetings", id);
    updateDocumentNonBlocking(meetingDoc, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const handleDownload = () => {
    if (!meetings || meetings.length === 0) {
      toast({
        variant: "destructive",
        title: "No entries",
        description: "Add some entries to your schedule first.",
      });
      return;
    }

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
      description: "Your schedule has been exported successfully with cloud-synced data.",
    });
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-primary-foreground w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-headline tracking-tight text-primary">
              Schedily
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="outline" onClick={() => addItem('meeting')} className="hidden sm:flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4" /> Meeting
                </Button>
                <Button variant="outline" onClick={() => addItem('shift')} className="hidden sm:flex items-center gap-2 border-accent/20 hover:border-accent text-accent">
                  <Briefcase className="w-4 h-4" /> Shift
                </Button>
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export .ics</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleSignIn} className="bg-primary hover:bg-primary/90">
                <LogIn className="w-4 h-4 mr-2" /> Get Started
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-4xl font-bold font-headline text-slate-800 mb-4">Welcome to Schedily</h2>
            <p className="text-muted-foreground text-xl max-w-xl mb-8">
              Sync your professional meetings and retail shifts to the cloud and export them to any calendar with smart reminders.
            </p>
            <Button size="lg" onClick={handleSignIn} className="px-8 py-6 h-auto text-lg rounded-2xl">
               Start Scheduling Now
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center sm:text-left">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold font-headline text-slate-800">My Schedule</h2>
                {isMeetingsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-muted-foreground text-lg">
                Your entries are automatically saved and synced to your account.
              </p>
            </div>

            <div className="space-y-4">
              {meetings && meetings.length > 0 ? (
                meetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onUpdate={updateMeeting}
                    onRemove={removeMeeting}
                  />
                ))
              ) : !isMeetingsLoading && (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-slate-50">
                  <p className="text-muted-foreground">Your schedule is currently empty. Add a meeting or shift below!</p>
                </div>
              )}
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
          <p>© {year} Schedily. Irish Eircode and Virtual Link ready.</p>
          <p className="mt-2">
            Built by <a href="https://synctech.ie" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">SYNC TECH Solutions</a>
          </p>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
