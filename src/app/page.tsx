
"use client";

import React, { useState, useEffect, use } from "react";
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
  MessageSquare,
  ShieldCheck,
  Zap,
  Clock,
  CalendarDays
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

export default function SchedilyDashboard(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  
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
  const acceptedMeetings = currentMeetings.filter(m => m.status !== 'pending');

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
    toast({ title: "Calendar Generated", description: `Exported ${acceptedOnly.length} items.` });
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

  const shareWithGroup = async (meeting: Meeting, groupId: string, groupName: string) => {
    if (!db || !user || !groupId) return;

    try {
      const groupMeetingRef = collection(db, "groups", groupId, "meetings");
      const { id, ...dataToShare } = meeting;
      
      addDocumentNonBlocking(groupMeetingRef, {
        ...dataToShare,
        status: 'accepted',
        senderId: user.uid,
        senderName: user.displayName || "Teammate",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Group Broadcast!", description: `Shared with ${groupName}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Group Dispatch Failed" });
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
                <Link href="/groups">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-bold">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">Groups</span>
                  </Button>
                </Link>
                <Link href="/network">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-medium">
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">Network</span>
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
                <Button className="bg-primary hover:bg-primary/90 rounded-full px-6 shadow-lg shadow-primary/20">Login / Join</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] py-20 relative overflow-hidden">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest mb-8">
                <Zap className="w-3 h-3 fill-current" /> Powered by SYNC TECH Solutions
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black font-headline text-slate-900 mb-8 leading-[1.05] tracking-tight text-balance">
                Team Social <span className="text-primary italic">Coordination</span>.
              </h2>
              
              <p className="text-slate-600 text-xl md:text-2xl max-w-3xl mb-12 leading-relaxed font-medium">
                The ultimate collaboration hub for businesses. Create <span className="text-slate-900 font-bold">Team Groups</span>, synchronize shared schedules, and tag colleagues instantly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 mb-20">
                <Link href="/login">
                  <Button size="lg" className="px-12 py-8 h-auto text-xl rounded-2xl shadow-2xl shadow-primary/30 font-bold bg-primary hover:bg-primary/90 transform transition-all hover:-translate-y-1 active:scale-95">
                     Join the Network
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/50 hover:border-primary/20 transition-all text-left">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-3">Group Synergy</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Form professional groups for your department and synchronize collective schedules in real-time.
                  </p>
                </div>
                
                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/50 hover:border-accent/20 transition-all text-left">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                    <Download className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-3">Smart Sync</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    One-click ICS generation for any shared shift, ensuring your team is always on the same page.
                  </p>
                </div>

                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/50 hover:border-emerald-200 transition-all text-left">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-3">Professional Privacy</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Role-based group access ensures sensitive coordination data stays within your authorized team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                  <TrendingUp className="w-4 h-4" /> Team Coordination
                </div>
                <h2 className="text-4xl font-black font-headline text-slate-900 tracking-tight">Social Groups</h2>
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

            {acceptedMeetings.length > 0 && (
              <div className="mb-10 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/20 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <CalendarDays className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Full Schedule Sync</h3>
                    <p className="text-slate-500 font-medium">Bulk export all {acceptedMeetings.length} coordination entries to your calendar.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleDownload} 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-primary/20 transform transition-all active:scale-95 flex items-center gap-3"
                >
                  <Download className="w-5 h-5" /> Export Entire Schedule (.ics)
                </Button>
              </div>
            )}

            {expiredMeetings.length > 0 && (
              <div className="mb-10 p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Info className="w-5 h-5 text-primary/70" />
                  </div>
                  <span>Archive {expiredMeetings.length} historical tasks.</span>
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
                  <p className="text-slate-400 font-bold">Syncing Team Hub...</p>
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
                    onShareGroup={shareWithGroup}
                    onAccept={acceptMeeting}
                  />
                ))
              ) : (
                <div className="text-center py-32 border-4 border-dashed border-slate-200 rounded-[64px] bg-white/50 group">
                  <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-8 border border-slate-100">
                    <CalendarPlus className="w-12 h-12 text-slate-300" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">Start Your Team Schedule</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto text-lg">
                    Build professional groups to synchronize shifts and meetings.
                  </p>
                  <div className="mt-10 flex gap-4 justify-center">
                    <Link href="/groups">
                      <Button size="lg" className="rounded-2xl font-black h-14 px-10">
                        <Users className="w-5 h-5 mr-2" /> Create Group
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <Toaster />
    </div>
  );
}

