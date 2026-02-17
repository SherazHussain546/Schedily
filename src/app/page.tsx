
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
  Users,
  UserPlus,
  Zap,
  CalendarDays,
  MailWarning,
  Globe,
  BellRing
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
import { triggerNotification } from "@/app/actions/notifications";

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

  const today = new Date().toISOString().split('T')[0];
  const currentMeetings = allMeetings?.filter(m => m.date >= today) || [];
  const pendingInvites = currentMeetings.filter(m => m.status === 'pending');
  const activeSchedule = currentMeetings.filter(m => m.status !== 'pending');
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
    if (!activeSchedule || activeSchedule.length === 0) return;
    const content = generateICSContent(activeSchedule);
    downloadICS(content, `schedule-${today}.ics`);
    toast({ title: "Calendar Generated", description: `Exported ${activeSchedule.length} items.` });
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

      const targetUserData = querySnapshot.docs[0].data();
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

      triggerNotification({
        recipientId: targetUid,
        recipientEmail: targetUserData.email,
        recipientName: targetUserData.displayName || 'Professional',
        senderName: user.displayName || 'A colleague',
        type: meeting.type as any,
        content: meeting.title || 'New coordination task'
      });

      toast({ title: "Shift Tagged!", description: `Sent to @${targetUsername}'s mailbox and AI notification dispatched.` });
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

      const membersRef = collection(db, "groups", groupId, "members");
      const membersSnap = await getDocs(membersRef);
      membersSnap.docs.forEach(memberDoc => {
        const m = memberDoc.data();
        if (m.userId !== user.uid && m.email) {
          triggerNotification({
            recipientId: m.userId,
            recipientEmail: m.email,
            recipientName: m.displayName,
            senderName: user.displayName || 'Teammate',
            type: meeting.type as any,
            groupName: groupName,
            content: meeting.title
          });
        }
      });

      toast({ title: "Group Broadcast!", description: `Shared with ${groupName}. AI notifications logged for members.` });
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
    <div className="min-h-screen bg-[#F8FAFC] font-body">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-primary-foreground w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-headline tracking-tighter text-primary">
              Schedily
            </h1>
          </Link>
          <nav className="hidden lg:flex items-center gap-8 ml-8">
            <Link href="/about" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">About</Link>
            <Link href="/how-it-works" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Guide</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link href="/groups">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary font-bold px-2 sm:px-4">
                    <Users className="w-4 h-4 sm:mr-2" />
                    <span className="hidden md:inline">Groups</span>
                  </Button>
                </Link>
                <Link href="/network">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary font-bold px-2 sm:px-4">
                    <UserPlus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden md:inline">Network</span>
                  </Button>
                </Link>
                <Link href="/profile" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary font-bold">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">{user.displayName || "Profile"}</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-slate-400 hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
                <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />
                <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl font-bold h-9 sm:h-10">
                  <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Bulk Sync</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                  Sign In
                </Link>
                <Link href="/login?tab=signup">
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl px-4 sm:px-6 font-bold shadow-lg shadow-primary/20 h-9 sm:h-10">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        {!user ? (
          <div className="flex flex-col">
            <section className="relative pt-12 pb-20 sm:pt-24 sm:pb-32 overflow-hidden bg-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-64 h-64 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-[80px] sm:blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-accent/5 rounded-full blur-[100px] sm:blur-[150px]" />
              </div>

              <div className="container mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm text-primary font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mb-8 sm:mb-12">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-current" /> Engineered by <a href="https://sheraz.synctech.ie" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary/70">Sheraz Hussain</a>
                </div>
                
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-headline text-slate-900 mb-6 sm:mb-8 leading-[1.1] sm:leading-[0.95] tracking-tight sm:tracking-tighter">
                  Professional Social <br className="hidden sm:block" />
                  <span className="text-primary">Coordination.</span>
                </h1>
                
                <p className="text-slate-500 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-10 sm:mb-14 leading-relaxed font-medium text-balance">
                  The future of team synchronization. Tag teammates, dispatch retail shifts, and coordinate department schedules with a social-first Schedily portal.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-16 sm:mb-24">
                  <Link href="/login?tab=signup" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto px-10 sm:px-14 py-6 sm:py-8 h-auto text-lg sm:text-xl rounded-2xl shadow-2xl shadow-primary/30 font-black bg-primary hover:bg-primary/90 transform transition-all hover:-translate-y-1 active:scale-95">
                       Join the Network
                    </Button>
                  </Link>
                  <Link href="/how-it-works" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 sm:px-10 py-6 sm:py-8 h-auto text-lg sm:text-xl rounded-2xl border-2 font-black hover:bg-slate-50 transition-all">
                       See How It Works
                    </Button>
                  </Link>
                </div>

                <div className="max-w-6xl mx-auto rounded-[1.5rem] sm:rounded-[3rem] border-4 sm:border-8 border-white bg-slate-200 shadow-2xl overflow-hidden relative group">
                  <img 
                    src="https://picsum.photos/seed/calendar-sync/1200/600" 
                    alt="Universal Calendar Syncing Overview" 
                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-10 sm:left-10 sm:right-10 flex items-center justify-between">
                     <div className="flex items-center gap-3 sm:gap-4 text-white">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center">
                           <CalendarDays className="w-5 h-5 sm:w-7 sm:h-7" />
                        </div>
                        <div className="text-left">
                           <p className="font-black text-[10px] sm:text-sm uppercase tracking-widest">Universal Sync</p>
                           <p className="text-white/80 text-xs sm:text-base font-medium hidden sm:block">Your entire schedule, unified through the Schedily Portal.</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-16 sm:py-32 bg-slate-50">
               <div className="container mx-auto px-4">
                  <div className="text-center mb-16 sm:mb-24 space-y-4">
                     <h2 className="text-3xl sm:text-4xl md:text-6xl font-black font-headline text-slate-900 tracking-tight">
                        Built for <span className="text-accent italic">Performance.</span>
                     </h2>
                     <p className="text-slate-500 text-base sm:text-lg font-medium max-w-2xl mx-auto">
                        Everything you need to coordinate complex team schedules in a high-speed professional Schedily portal.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
                    <div className="p-8 sm:p-10 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-xl shadow-slate-200/50 hover:border-primary/20 transition-all group">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                        <Users className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">Social Tagging</h4>
                      <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">
                        Tag colleagues and groups just like on social media. Dispatch shifts instantly to their Schedily mailbox and calendar.
                      </p>
                    </div>
                    
                    <div className="p-8 sm:p-10 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-xl shadow-slate-200/50 hover:border-accent/20 transition-all group">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                        <Globe className="w-7 h-7 sm:w-8 sm:h-8 text-accent" />
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">Portal Sync</h4>
                      <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">
                        Generate a single .ics file for your entire professional schedule. Sync with Google, Apple, or Outlook in one click.
                      </p>
                    </div>

                    <div className="p-8 sm:p-10 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-xl shadow-slate-200/50 hover:border-emerald-200 transition-all group">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                        <BellRing className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">AI Dispatch Alerts</h4>
                      <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">
                        Schedily AI crafts professional email notifications for every action, ensuring your team is always informed and engaged.
                      </p>
                    </div>
                  </div>
               </div>
            </section>

            <section className="py-16 sm:py-24 bg-primary text-primary-foreground relative overflow-hidden">
               <div className="absolute top-0 right-0 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-white/5 rounded-full -mr-48 -mt-48 sm:-mr-72 -mt-72 blur-[80px] sm:blur-[100px]" />
               <div className="container mx-auto px-4 relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-10 sm:gap-12">
                     <div className="max-w-xl space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 text-white/80 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                           <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> Professional Integrity
                        </div>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-black font-headline leading-tight tracking-tight">
                           Engineered by <a href="https://sheraz.synctech.ie" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">Sheraz Hussain</a>
                        </h3>
                        <p className="text-primary-foreground/70 text-base sm:text-lg font-medium">
                           Schedily is a premium coordination portal built with the support and agency expertise of <a href="https://synctech.ie" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">SYNC TECH Solutions</a>.
                        </p>
                        <Link href="/about" className="inline-block pt-2 sm:pt-4">
                           <Button variant="secondary" size="lg" className="rounded-xl px-8 sm:px-10 h-12 sm:h-14 font-black">
                              Meet the Creators
                           </Button>
                        </Link>
                     </div>
                     <div className="w-full md:w-1/3 p-6 sm:p-8 bg-white/10 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 text-center md:text-left">
                        <div className="flex items-center gap-4 mb-6 sm:mb-8 justify-center md:justify-start">
                           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center font-black">SH</div>
                           <div className="text-left">
                              <p className="font-black text-sm">Sheraz Hussain</p>
                              <p className="text-white/60 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">Lead Developer</p>
                           </div>
                        </div>
                        <p className="text-primary-foreground/80 italic text-sm sm:text-base font-medium leading-relaxed">
                           "My primary effort was focused on bridging the gap between social interaction and professional productivity. Schedily is the result."
                        </p>
                     </div>
                  </div>
               </div>
            </section>

            <section className="py-20 sm:py-32 bg-white text-center">
               <div className="container mx-auto px-4">
                  <h3 className="text-4xl sm:text-5xl md:text-7xl font-black font-headline text-slate-900 mb-8 sm:mb-10 tracking-tighter">
                     Ready to <span className="text-primary">Sync</span> Your Team?
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                    <Link href="/login?tab=signup" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto px-10 sm:px-16 py-6 sm:py-8 h-auto text-xl sm:text-2xl rounded-2xl shadow-2xl shadow-primary/30 font-black bg-primary hover:bg-primary/90 transition-all active:scale-95">
                         Get Started Now
                      </Button>
                    </Link>
                  </div>
                  <p className="mt-8 text-slate-400 font-bold text-xs sm:text-sm">Free for professional teams under 10 members.</p>
               </div>
            </section>

            <footer className="py-12 sm:py-20 bg-slate-900 text-white border-t">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 mb-12 sm:mb-16">
                  <div className="space-y-4 sm:space-y-6">
                    <Link href="/" className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <Sparkles className="text-white w-6 h-6" />
                      </div>
                      <h1 className="text-xl font-black font-headline tracking-tighter">
                        Schedily
                      </h1>
                    </Link>
                    <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
                      Professional social coordination portal engineered by <a href="https://sheraz.synctech.ie" target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary transition-colors">Sheraz Hussain</a>.
                    </p>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <h5 className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-slate-500">Portal Nav</h5>
                    <ul className="space-y-2">
                      <li><Link href="/about" className="text-sm sm:text-base text-slate-300 hover:text-primary transition-colors font-bold">About Schedily</Link></li>
                      <li><Link href="/how-it-works" className="text-sm sm:text-base text-slate-300 hover:text-primary transition-colors font-bold">How It Works</Link></li>
                      <li><Link href="/login" className="text-sm sm:text-base text-slate-300 hover:text-primary transition-colors font-bold">Professional Login</Link></li>
                    </ul>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <h5 className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-slate-500">Agency & Credits</h5>
                    <ul className="space-y-1 sm:space-y-2">
                      <li className="text-slate-400 text-[10px] sm:text-xs">Developed by <a href="https://sheraz.synctech.ie" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-white transition-colors">Sheraz Hussain</a></li>
                      <li className="text-slate-400 text-[10px] sm:text-xs">Agency: <a href="https://synctech.ie" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-white transition-colors">SYNC TECH Solutions</a></li>
                    </ul>
                  </div>
                </div>
                <div className="pt-8 sm:pt-12 border-t border-slate-800 text-center text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-widest">
                  © {year} Schedily Hub. Engineered in Dublin, Ireland.
                </div>
              </div>
            </footer>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8 sm:py-10 max-w-4xl">
            <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] sm:text-sm uppercase tracking-widest">
                  <Zap className="w-4 h-4" /> Team Coordination
                </div>
                <h2 className="text-3xl sm:text-4xl font-black font-headline text-slate-900 tracking-tight">Social Groups</h2>
              </div>
              <div className="flex flex-row gap-2 sm:gap-4">
                <Button onClick={() => addItem('meeting')} variant="outline" className="flex-1 sm:flex-none h-12 sm:h-14 px-4 sm:px-8 rounded-xl sm:rounded-2xl border-slate-200 bg-white font-bold hover:border-primary/50 transition-all shadow-sm">
                  <Users className="w-5 h-5 sm:mr-2 text-primary" /> <span className="hidden sm:inline">Meeting</span>
                </Button>
                <Button onClick={() => addItem('shift')} className="flex-1 sm:flex-none bg-accent hover:bg-accent/90 text-white h-12 sm:h-14 px-4 sm:px-10 rounded-xl sm:rounded-2xl font-bold shadow-xl shadow-accent/20 transition-all transform hover:scale-105">
                  <Briefcase className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">New Shift</span>
                </Button>
              </div>
            </div>

            {pendingInvites.length > 0 && (
              <section className="mb-10 sm:mb-12 space-y-4">
                <h3 className="text-lg sm:text-xl font-black flex items-center gap-2 px-2 text-amber-600">
                  <MailWarning className="w-5 h-5" /> Pending Coordination Invitations
                </h3>
                <div className="space-y-4">
                  {pendingInvites.map((meeting) => (
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
                  ))}
                </div>
              </section>
            )}

            {activeSchedule.length > 0 && (
              <div className="mb-8 sm:mb-10 p-5 sm:p-6 bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-slate-200/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16" />
                <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Full Schedule Sync</h3>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium">Bulk export all {activeSchedule.length} entries.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleDownload} 
                  size="lg"
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-black rounded-xl sm:rounded-2xl h-12 sm:h-14 px-6 sm:px-8 shadow-xl shadow-primary/20 transform transition-all active:scale-95 flex items-center justify-center gap-3 relative z-10"
                >
                  <Download className="w-5 h-5" /> Export Schedule (.ics)
                </Button>
              </div>
            )}

            <div className="space-y-6 sm:space-y-8">
              {isMeetingsLoading ? (
                <div className="flex flex-col items-center justify-center py-24 sm:py-32 gap-4">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary/40" />
                  <p className="text-slate-400 font-bold text-sm sm:text-base">Syncing Schedily Hub...</p>
                </div>
              ) : activeSchedule.length > 0 ? (
                activeSchedule.map((meeting) => (
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
              ) : pendingInvites.length === 0 && (
                <div className="text-center py-20 sm:py-32 border-4 border-dashed border-slate-200 rounded-[2rem] sm:rounded-[4rem] bg-white/50 group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-slate-100">
                    <CalendarPlus className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 px-4">Start Your Team Schedule</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto text-base sm:text-lg px-6">
                    Build professional groups on the Schedily portal to synchronize shifts and meetings.
                  </p>
                  <div className="mt-8 sm:mt-10 flex gap-4 justify-center px-4">
                    <Link href="/groups" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto rounded-xl sm:rounded-2xl font-black h-12 sm:h-14 px-8 sm:px-10">
                        <Users className="w-5 h-5 mr-2" /> Create Group
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
