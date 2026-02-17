
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
  Trash,
  Info,
  Users,
  UserPlus,
  ArrowRight
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

  // Fetch Schedule - Explicit collection query
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
    toast({ title: "Shift Accepted", description: "Entry moved to your active schedule." });
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
        toast({ variant: "destructive", title: "User Not Found", description: "Make sure the username is exact." });
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

      toast({ title: "Shift Delivered", description: `Successfully pushed to @${targetUsername}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Delivery Error" });
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
    <div className="min-h-screen bg-slate-50 font-body pb-20">
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
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 rounded-full px-6">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-5xl font-black font-headline text-slate-900 mb-6 leading-tight">
              The Professional<br/><span className="text-primary underline decoration-accent/30 underline-offset-8">Coordination Network.</span>
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mb-10 leading-relaxed">
              Build your team network, tag colleagues, and push shifts directly to their calendars. Effortless scheduling for modern teams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button size="lg" className="px-10 py-7 h-auto text-lg rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90">
                   Get Started Now
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-10 py-7 h-auto text-lg rounded-2xl font-bold border-slate-200">
                How it Works
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-4xl font-black font-headline text-slate-900 tracking-tight">My Feed</h2>
                <p className="text-slate-500 font-medium">Incoming shifts and personal entries.</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => addItem('meeting')} variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-semibold hover:bg-white hover:border-primary/50 transition-all">
                  <CalendarPlus className="w-5 h-5 mr-2 text-primary" /> Draft Meeting
                </Button>
                <Button onClick={() => addItem('shift')} className="bg-accent hover:bg-accent/90 text-white h-12 px-8 rounded-2xl font-bold shadow-lg shadow-accent/20 transition-all transform hover:scale-105 active:scale-95">
                  <Briefcase className="w-5 h-5 mr-2" /> Create Shift
                </Button>
              </div>
            </div>

            {expiredMeetings.length > 0 && (
              <div className="mb-8 p-4 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                    <Info className="w-4 h-4 text-primary/60" />
                  </div>
                  <span className="font-medium">{expiredMeetings.length} historical entries can be archived.</span>
                </div>
                <Button variant="ghost" size="sm" onClick={purgeExpired} className="text-primary hover:bg-primary/5 rounded-full font-bold">
                  Archive All
                </Button>
              </div>
            )}

            <div className="space-y-8">
              {isMeetingsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-primary/20" />
                </div>
              ) : currentMeetings.length > 0 ? (
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
              ) : (
                <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-[48px] bg-white group hover:border-primary/30 transition-all">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <CalendarPlus className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-400">Your Feed is Quiet</h3>
                  <p className="text-slate-400 mt-2 max-w-xs mx-auto">Start creating your own entries or connect with teammates to receive shifts.</p>
                  <div className="mt-8 flex justify-center gap-4">
                    <Link href="/network">
                      <Button variant="outline" className="rounded-full font-bold border-slate-200">
                        <UserPlus className="w-4 h-4 mr-2" /> Grow Network
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {followingList && followingList.length > 0 && (
              <div className="mt-20 p-10 bg-white border border-slate-100 rounded-[48px] shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black font-headline text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    Professional Team
                  </h3>
                  <Link href="/network">
                    <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5 rounded-full">
                      Manage <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4">
                  {followingList.map((f: any) => (
                    <div key={f.id} className="group relative">
                      <div className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all cursor-default flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] group-hover:bg-white/20">
                          {f.targetName?.substring(0, 1).toUpperCase()}
                        </div>
                        @{f.targetName}
                      </div>
                    </div>
                  ))}
                  <Link href="/network">
                    <Button variant="ghost" className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 hover:border-primary hover:text-primary transition-all">
                      <UserPlus className="w-6 h-6" />
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

