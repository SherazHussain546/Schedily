"use client";

import React, { useState, useEffect } from "react";
import { Meeting, generateICSContent, downloadICS, ItemType } from "@/lib/calendar-utils";
import { MeetingCard } from "@/components/MeetingCard";
import { Button } from "@/components/ui/button";
import { 
  CalendarPlus, 
  Download, 
  Sparkles, 
  LayoutDashboard, 
  Briefcase, 
  LogIn, 
  Loader2, 
  LogOut, 
  User as UserIcon,
  Trash,
  Info,
  Users
} from "lucide-react";
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
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, writeBatch, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Schedily() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [year, setYear] = useState<number>(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Memoize the query for the user's meetings
  const meetingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "meetings"),
      orderBy("date", "asc"),
      orderBy("startTime", "asc")
    );
  }, [db, user]);

  const { data: allMeetings, isLoading: isMeetingsLoading } = useCollection<Meeting>(meetingsQuery);

  // Filter meetings: Split between current and expired
  const today = new Date().toISOString().split('T')[0];
  const currentMeetings = allMeetings?.filter(m => m.date >= today) || [];
  const expiredMeetings = allMeetings?.filter(m => m.date < today) || [];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      router.push("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out.",
      });
    }
  };

  const addItem = (type: ItemType) => {
    if (!user || !db) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save your schedule.",
      });
      router.push("/login");
      return;
    }

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
      description: `A new ${type} has been added to your local schedule.`,
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

  const purgeExpired = async () => {
    if (!user || !db || expiredMeetings.length === 0) return;
    
    const batch = writeBatch(db);
    expiredMeetings.forEach(m => {
      const ref = doc(db, "users", user.uid, "meetings", m.id);
      batch.delete(ref);
    });

    try {
      await batch.commit();
      toast({
        title: "Cleanup Complete",
        description: `Permanently deleted ${expiredMeetings.length} expired entries.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: "Could not delete expired entries.",
      });
    }
  };

  const handleDownload = () => {
    if (!currentMeetings || currentMeetings.length === 0) {
      toast({
        variant: "destructive",
        title: "No entries",
        description: "Add some future entries to your schedule first.",
      });
      return;
    }

    const content = generateICSContent(currentMeetings);
    downloadICS(content, "schedule-export.ics");
    toast({
      title: "Success",
      description: "Your schedule has been exported successfully.",
    });
  };

  const shareWithUser = async (meeting: Meeting, targetUsername: string) => {
    if (!db || !user || !targetUsername.trim()) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayName", "==", targetUsername.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "User not found",
          description: `No user found with username "${targetUsername}"`,
        });
        return;
      }

      const targetUser = querySnapshot.docs[0];
      const targetUid = targetUser.id;

      if (targetUid === user.uid) {
        toast({
          title: "Self-Delivery",
          description: "You are already viewing this entry.",
        });
        return;
      }

      const recipientMeetingRef = collection(db, "users", targetUid, "meetings");
      
      const { id, ...dataToShare } = meeting;
      addDocumentNonBlocking(recipientMeetingRef, {
        ...dataToShare,
        userId: targetUid,
        senderId: user.uid,
        senderName: user.displayName || "Manager",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Pushed to Employee",
        description: `Sent "${meeting.title}" directly to ${targetUsername}'s schedule.`,
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delivery Failed",
        description: "Could not send entry to employee.",
      });
    }
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
                <Link href="/profile" className="hidden md:flex items-center gap-2 mr-2 text-sm text-muted-foreground hover:text-primary font-medium transition-colors">
                  <UserIcon className="w-4 h-4" />
                  {user.displayName || "Profile"}
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Sign Out</span>
                </Button>
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2 ml-2">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export .ics</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90">
                  <LogIn className="w-4 h-4 mr-2" /> Get Started
                </Button>
              </Link>
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
              The professional "Push" scheduler. Managers create shifts, employees receive them instantly.
            </p>
            <Link href="/login">
              <Button size="lg" className="px-8 py-6 h-auto text-lg rounded-2xl shadow-xl shadow-primary/20">
                 Start Scheduling Now
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                  <h2 className="text-3xl font-bold font-headline text-slate-800">My Schedule</h2>
                  {isMeetingsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-muted-foreground text-lg">
                  Entries pushed to you or created by you appear here.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => addItem('meeting')} className="flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4" /> Add Meeting
                </Button>
                <Button variant="outline" onClick={() => addItem('shift')} className="flex items-center gap-2 border-accent/20 hover:border-accent text-accent">
                  <Briefcase className="w-4 h-4" /> Create Shift
                </Button>
              </div>
            </div>

            {expiredMeetings.length > 0 && (
              <div className="mb-6 p-4 bg-muted/30 border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>You have {expiredMeetings.length} expired entries from previous dates.</span>
                </div>
                <Button variant="ghost" size="sm" onClick={purgeExpired} className="text-destructive hover:bg-destructive/10">
                  <Trash className="w-4 h-4 mr-2" /> Clear History
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {currentMeetings.length > 0 ? (
                currentMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onUpdate={updateMeeting}
                    onRemove={removeMeeting}
                    onShare={shareWithUser}
                  />
                ))
              ) : !isMeetingsLoading && (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-slate-50">
                  <p className="text-muted-foreground">No current entries. Add a shift to start!</p>
                </div>
              )}
            </div>

            <div className="mt-12 p-8 border-2 border-dashed rounded-3xl bg-slate-50/50 flex flex-col items-center text-center">
               <Users className="w-12 h-12 text-muted-foreground mb-4" />
               <h3 className="text-xl font-bold text-slate-800 mb-2">Manager Tools</h3>
               <p className="text-muted-foreground max-w-md mb-6">
                 To assign a shift to an employee, add it to your list first, then click the <strong>Delivery</strong> icon on the card to push it to their schedule.
               </p>
               <div className="flex gap-4">
                  <Button variant="outline" onClick={() => addItem('shift')}>
                    <Briefcase className="w-4 h-4 mr-2" /> Prep New Shift
                  </Button>
               </div>
            </div>
          </>
        )}

        <footer className="mt-20 pt-10 border-t text-center text-sm text-muted-foreground">
          <p>© {year} Schedily. High-Efficiency Push Scheduling.</p>
          <p className="mt-2">
            Built by <a href="https://synctech.ie" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">SYNC TECH Solutions</a>
          </p>
        </footer>
      </main>

      <Toaster />
    </div>
  );
}