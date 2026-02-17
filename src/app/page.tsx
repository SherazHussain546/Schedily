
"use client";

import React, { useState, useEffect } from "react";
import { Meeting, generateICSContent, downloadICS, ItemType } from "@/lib/calendar-utils";
import { MeetingCard } from "@/components/MeetingCard";
import { Button } from "@/components/ui/button";
import { 
  CalendarPlus, 
  Download, 
  Sparkles, 
  Briefcase, 
  LogIn, 
  Loader2, 
  LogOut, 
  User as UserIcon,
  Trash,
  Info,
  Users,
  Send
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

  const meetingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "meetings"),
      orderBy("date", "asc"),
      orderBy("startTime", "asc")
    );
  }, [db, user]);

  const { data: allMeetings, isLoading: isMeetingsLoading } = useCollection<Meeting>(meetingsQuery);

  const today = new Date().toISOString().split('T')[0];
  const currentMeetings = allMeetings?.filter(m => m.date >= today) || [];
  const expiredMeetings = allMeetings?.filter(m => m.date < today) || [];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "Successfully signed out.",
      });
      router.push("/login");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to sign out." });
    }
  };

  const addItem = (type: ItemType) => {
    if (!user || !db) {
      router.push("/login");
      return;
    }

    const meetingRef = collection(db, "users", user.uid, "meetings");
    
    addDocumentNonBlocking(meetingRef, {
      title: "",
      type,
      status: 'accepted', // Manually added are accepted by default
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
      title: type === 'shift' ? "Shift Drafted" : "Meeting Drafted",
      description: `A new ${type} has been added. You can now deliver it to an employee.`,
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

  const acceptMeeting = (id: string) => {
    if (!user || !db) return;
    const meetingDoc = doc(db, "users", user.uid, "meetings", id);
    updateDocumentNonBlocking(meetingDoc, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
    toast({
      title: "Shift Accepted",
      description: "This entry is now part of your official schedule.",
    });
  };

  const purgeExpired = async () => {
    if (!user || !db || expiredMeetings.length === 0) return;
    const batch = writeBatch(db);
    expiredMeetings.forEach(m => {
      batch.delete(doc(db, "users", user.uid, "meetings", m.id));
    });
    try {
      await batch.commit();
      toast({ title: "Cleanup Complete", description: `Cleared ${expiredMeetings.length} expired entries.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Cleanup Failed" });
    }
  };

  const handleDownload = () => {
    if (!currentMeetings || currentMeetings.length === 0) {
      toast({ variant: "destructive", title: "No entries to export." });
      return;
    }
    const acceptedOnly = currentMeetings.filter(m => m.status !== 'pending');
    if (acceptedOnly.length === 0) {
      toast({ title: "No accepted shifts", description: "Accept shifts before exporting." });
      return;
    }
    const content = generateICSContent(acceptedOnly);
    downloadICS(content, `schedule-${today}.ics`);
    toast({ title: "Export Success", description: "Schedule downloaded for calendar sync." });
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
          title: "Recipient Not Found",
          description: `No user matches "${targetUsername}".`,
        });
        return;
      }

      const targetUser = querySnapshot.docs[0];
      const targetUid = targetUser.id;

      if (targetUid === user.uid) {
        toast({ title: "Self-Delivery", description: "This is already in your schedule." });
        return;
      }

      const recipientMeetingRef = collection(db, "users", targetUid, "meetings");
      
      const { id, ...dataToShare } = meeting;
      addDocumentNonBlocking(recipientMeetingRef, {
        ...dataToShare,
        status: 'pending', // Recipients must accept
        userId: targetUid,
        senderId: user.uid,
        senderName: user.displayName || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Shift Dispatched",
        description: `Successfully delivered to ${targetUsername}'s mailbox.`,
      });

    } catch (error) {
      toast({ variant: "destructive", title: "Delivery Failed" });
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
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="sticky top-0 z-30 w-full border-b bg-white shadow-sm">
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
                  {user.displayName || "My Profile"}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Sign Out</span>
                </Button>
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export Calendar</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90">
                  <LogIn className="w-4 h-4 mr-2" /> Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-5xl font-black font-headline text-slate-900 mb-6 leading-tight">
              Push Scheduling<br/><span className="text-primary">Perfected.</span>
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mb-10 leading-relaxed">
              Create professional shifts and meetings. Push them directly to your team's schedule via username. Simple, secure, and smart.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button size="lg" className="px-10 py-7 h-auto text-lg rounded-2xl shadow-2xl shadow-primary/30 font-bold transition-transform hover:scale-105">
                   Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                  <h2 className="text-3xl font-black font-headline text-slate-900 tracking-tight">Schedule Dashboard</h2>
                  {isMeetingsLoading && <Loader2 className="w-5 h-5 animate-spin text-primary/50" />}
                </div>
                <p className="text-slate-500 text-lg">
                   Manage your entries or push shifts to your team.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => addItem('meeting')} variant="outline" className="flex items-center gap-2 bg-white h-12 px-6 rounded-xl border-slate-200 hover:border-primary hover:text-primary shadow-sm">
                  <CalendarPlus className="w-5 h-5" /> Meeting
                </Button>
                <Button onClick={() => addItem('shift')} className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white h-12 px-6 rounded-xl shadow-lg shadow-accent/20 font-bold">
                  <Briefcase className="w-5 h-5" /> New Shift
                </Button>
              </div>
            </div>

            {expiredMeetings.length > 0 && (
              <div className="mb-8 p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>You have <strong>{expiredMeetings.length}</strong> history items that can be cleared.</span>
                </div>
                <Button variant="ghost" size="sm" onClick={purgeExpired} className="text-destructive hover:bg-destructive/5 font-semibold">
                  <Trash className="w-4 h-4 mr-2" /> Clear All
                </Button>
              </div>
            )}

            <div className="space-y-6">
              {currentMeetings.length > 0 ? (
                currentMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onUpdate={updateMeeting}
                    onRemove={removeMeeting}
                    onShare={shareWithUser}
                    onAccept={acceptMeeting}
                  />
                ))
              ) : !isMeetingsLoading && (
                <div className="text-center py-24 border-4 border-dashed rounded-[40px] bg-white shadow-inner">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-400 mb-2">Schedule is Empty</h3>
                  <p className="text-slate-400 max-w-sm mx-auto">Create your first shift or wait for a manager to push one to you.</p>
                </div>
              )}
            </div>

            <div className="mt-16 p-10 border-2 border-primary/10 rounded-[40px] bg-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Send className="w-48 h-48 text-primary" />
               </div>
               <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-8 h-8 text-primary" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 mb-4">Admin & Manager Tools</h3>
                 <p className="text-slate-500 text-lg max-w-xl mb-8 leading-relaxed">
                   To assign a shift, simply create it here first, then use the <strong>Send/Deliver</strong> icon on the shift card to push it directly to an employee's schedule.
                 </p>
                 <Button variant="outline" size="lg" onClick={() => addItem('shift')} className="h-14 px-10 rounded-2xl border-primary/20 hover:border-primary hover:bg-primary/5 text-primary font-bold">
                    <Briefcase className="w-5 h-5 mr-3" /> Prepare Team Shift
                 </Button>
               </div>
            </div>
          </>
        )}

        <footer className="mt-24 py-12 border-t text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-400 font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Schedily</span>
          </div>
          <p className="text-slate-400 text-sm">© {year} High-Performance Push Scheduling.</p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <Link href="/" className="text-xs text-slate-400 hover:text-primary uppercase tracking-widest font-bold">Dashboard</Link>
            <Link href="/profile" className="text-xs text-slate-400 hover:text-primary uppercase tracking-widest font-bold">Profile</Link>
          </div>
        </footer>
      </main>

      <Toaster />
    </div>
  );
}
