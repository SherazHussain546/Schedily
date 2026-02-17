
"use client";

import React, { useState, useEffect } from "react";
import { Meeting, ItemType } from "@/lib/calendar-utils";
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
  Send,
  UserPlus
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
import { generateICSContent, downloadICS } from "@/lib/calendar-utils";

export default function SchedilyDashboard() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [year, setYear] = useState<number>(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Fetch Schedule
  const meetingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "meetings"),
      orderBy("date", "asc"),
      orderBy("startTime", "asc")
    );
  }, [db, user]);

  const { data: allMeetings, isLoading: isMeetingsLoading } = useCollection<Meeting>(meetingsQuery);

  // Fetch Connections (Following)
  const followingQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "following");
  }, [db, user]);

  const { data: followingList } = useCollection(followingQuery);

  const today = new Date().toISOString().split('T')[0];
  const currentMeetings = allMeetings?.filter(m => m.date >= today) || [];
  const expiredMeetings = allMeetings?.filter(m => m.date < today) || [];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
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
      status: 'accepted',
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
      description: "Added to your personal schedule.",
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
    toast({ title: "Schedule Updated", description: "Entry accepted." });
  };

  const purgeExpired = async () => {
    if (!user || !db || expiredMeetings.length === 0) return;
    const batch = writeBatch(db);
    expiredMeetings.forEach(m => {
      batch.delete(doc(db, "users", user.uid, "meetings", m.id));
    });
    await batch.commit();
    toast({ title: "Cleanup Complete" });
  };

  const handleDownload = () => {
    if (!currentMeetings || currentMeetings.length === 0) return;
    const acceptedOnly = currentMeetings.filter(m => m.status !== 'pending');
    if (acceptedOnly.length === 0) {
      toast({ title: "Nothing to Export", description: "Accept shifts first." });
      return;
    }
    const content = generateICSContent(acceptedOnly);
    downloadICS(content, `schedule-${today}.ics`);
    toast({ title: "Export Success" });
  };

  const shareWithUser = async (meeting: Meeting, targetUsername: string) => {
    if (!db || !user || !targetUsername.trim()) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayName", "==", targetUsername.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: "destructive", title: "Recipient Not Found" });
        return;
      }

      const targetUid = querySnapshot.docs[0].id;
      if (targetUid === user.uid) return;

      const recipientMeetingRef = collection(db, "users", targetUid, "meetings");
      const { id, ...dataToShare } = meeting;
      
      addDocumentNonBlocking(recipientMeetingRef, {
        ...dataToShare,
        status: 'pending',
        userId: targetUid,
        senderId: user.uid,
        senderName: user.displayName || "Colleague",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Shift Dispatched", description: `Sent to ${targetUsername}.` });
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
                <Link href="/network" className="hidden md:flex items-center gap-2 mr-2 text-sm text-muted-foreground hover:text-primary font-medium transition-colors">
                  <Users className="w-4 h-4" />
                  Network
                </Link>
                <Link href="/profile" className="hidden md:flex items-center gap-2 mr-2 text-sm text-muted-foreground hover:text-primary font-medium transition-colors">
                  <UserIcon className="w-4 h-4" />
                  {user.displayName || "Profile"}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4 sm:mr-2" />
                </Button>
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h2 className="text-5xl font-black font-headline text-slate-900 mb-6 leading-tight">
              Connect. Schedule.<br/><span className="text-primary">Sync.</span>
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mb-10">
              The professional network for shared scheduling. Follow your team, push shifts, and stay perfectly in sync.
            </p>
            <Link href="/login">
              <Button size="lg" className="px-10 py-7 h-auto text-lg rounded-2xl shadow-xl font-bold">
                 Join the Network
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black font-headline text-slate-900 tracking-tight mb-1">My Schedule</h2>
                <p className="text-slate-500">Managing personal and team-pushed entries.</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => addItem('meeting')} variant="outline" className="h-12 px-6 rounded-xl border-slate-200">
                  <CalendarPlus className="w-5 h-5 mr-2" /> Meeting
                </Button>
                <Button onClick={() => addItem('shift')} className="bg-accent hover:bg-accent/90 text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-accent/20">
                  <Briefcase className="w-5 h-5 mr-2" /> New Shift
                </Button>
              </div>
            </div>

            {expiredMeetings.length > 0 && (
              <div className="mb-8 p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span>{expiredMeetings.length} history items to clear.</span>
                </div>
                <Button variant="ghost" size="sm" onClick={purgeExpired} className="text-destructive hover:bg-destructive/5">
                  <Trash className="w-4 h-4 mr-2" /> Clear
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
                <div className="text-center py-24 border-4 border-dashed rounded-[40px] bg-white">
                  <h3 className="text-2xl font-bold text-slate-400">Empty Schedule</h3>
                  <p className="text-slate-400 mt-2">Start drafting or connect with teammates.</p>
                  <Link href="/network">
                    <Button variant="link" className="mt-4 text-primary font-bold">
                      <UserPlus className="w-4 h-4 mr-2" /> Find Teammates
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {followingList && followingList.length > 0 && (
              <div className="mt-16 p-8 bg-white border rounded-[32px] shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> My Team Network
                </h3>
                <div className="flex flex-wrap gap-4">
                  {followingList.map((f: any) => (
                    <Link key={f.id} href="/network">
                      <div className="px-4 py-2 bg-slate-50 border rounded-full text-sm font-medium hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer">
                        @{f.targetName}
                      </div>
                    </Link>
                  ))}
                  <Link href="/network">
                    <Button variant="ghost" size="sm" className="rounded-full border-dashed border-2">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Toaster />
    </div>
  );
}
