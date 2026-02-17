
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
  Loader2, 
  LogOut, 
  User as UserIcon,
  Info,
  Users,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Search,
  MessageSquare
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
      orderBy("date", "asc")
    );
  }, [db, user]);

  const { data: allMeetings, isLoading: isMeetingsLoading } = useCollection<Meeting>(meetingsQuery);

  // Fetch Following
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
    toast({ title: "Coordination Accepted", description: "Entry moved to your active schedule." });
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
      toast({ title: "Nothing to Export", description: "Accept shared entries first." });
      return;
    }
    const content = generateICSContent(acceptedOnly);
    downloadICS(content, `schedule-${today}.ics`);
    toast({ title: "Calendar Generated" });
  };

  const shareWithUser = async (meeting: Meeting, targetUsername: string) => {
    if (!db || !user || !targetUsername.trim()) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayName", "==", targetUsername.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: "destructive", title: "User Not Found", description: "Username must be exact." });
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
        senderName: user.displayName || "Teammate",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Shift Tagged!", description: `Sent to @${targetUsername}'s mailbox.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Dispatch Failed" });
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
    <div className="min-h-screen bg-[#F8FAFC] font-body pb-20">
      <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-primary-foreground w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-headline tracking-tight text-primary hidden sm:block">
              Schedily
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/network">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-medium">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">My Network</span>
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-medium">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">{user.displayName || "Profile"}</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-slate-200 mx-2" />
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2 rounded-xl">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Get ICS</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 rounded-full px-6">Login / Join</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <div className="relative mb-12">
               <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl animate-pulse" />
               <div className="relative w-28 h-28 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-slate-100">
                  <Users className="w-14 h-14 text-primary" />
               </div>
            </div>
            <h2 className="text-5xl md:text-6xl font-black font-headline text-slate-900 mb-6 leading-[1.1] tracking-tight text-balance">
              Professional Social Coordination.
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mb-12 leading-relaxed">
              Build your professional network and securely push tasks into teammates' schedules. Social coordination, reinvented.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/login">
                <Button size="lg" className="px-12 py-8 h-auto text-xl rounded-2xl shadow-2xl font-bold bg-primary hover:bg-primary/90 transform transition-all hover:-translate-y-1">
                   Start Your Network
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                  <TrendingUp className="w-4 h-4" /> My Professional Hub
                </div>
                <h2 className="text-4xl font-black font-headline text-slate-900 tracking-tight">Social Coordination</h2>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => addItem('meeting')} variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 bg-white font-bold hover:border-primary/50 transition-all shadow-sm">
                  <MessageSquare className="w-5 h-5 mr-2 text-primary" /> Meeting
                </Button>
                <Button onClick={() => addItem('shift')} className="bg-accent hover:bg-accent/90 text-white h-14 px-10 rounded-2xl font-bold shadow-xl shadow-accent/20 transition-all transform hover:scale-105">
                  <Briefcase className="w-5 h-5 mr-2" /> New Shift
                </Button>
              </div>
            </div>

            {expiredMeetings.length > 0 && (
              <div className="mb-10 p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Info className="w-5 h-5 text-primary/70" />
                  </div>
                  <span>Clear {expiredMeetings.length} historical tasks.</span>
                </div>
                <Button variant="ghost" size="sm" onClick={purgeExpired} className="text-primary hover:bg-primary/5 rounded-full font-black px-6">
                  Archive
                </Button>
              </div>
            )}

            <div className="space-y-8">
              {isMeetingsLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary/40" />
                  <p className="text-slate-400 font-bold">Syncing Network...</p>
                </div>
              ) : currentMeetings.length > 0 ? (
                currentMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    db={db}
                    onUpdate={updateMeeting}
                    onRemove={removeMeeting}
                    onShare={shareWithUser}
                    onAccept={acceptMeeting}
                  />
                ))
              ) : (
                <div className="text-center py-32 border-4 border-dashed border-slate-200 rounded-[64px] bg-white/50 group">
                  <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-8 border border-slate-100">
                    <CalendarPlus className="w-12 h-12 text-slate-300" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">Your Feed is Empty</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto text-lg">
                    Build your professional network to start coordinating tasks.
                  </p>
                  <div className="mt-10">
                    <Link href="/network">
                      <Button size="lg" className="rounded-2xl font-black h-14 px-10">
                        <UserPlus className="w-5 h-5 mr-2" /> Find Colleagues
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {followingList && followingList.length > 0 && (
              <div className="mt-24 p-10 bg-white border border-slate-100 rounded-[48px] shadow-2xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black font-headline text-slate-900 flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    Professional Circle
                  </h3>
                  <Link href="/network">
                    <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5 rounded-full">
                      Network Hub <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-3">
                  {followingList.map((f: any) => (
                    <div key={f.id} className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] text-primary font-black">
                        {f.targetName?.substring(0, 1).toUpperCase()}
                      </div>
                      @{f.targetName}
                    </div>
                  ))}
                  <Link href="/network">
                    <Button variant="ghost" className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 hover:border-primary hover:text-primary bg-slate-50/50">
                      <Search className="w-5 h-5" />
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
