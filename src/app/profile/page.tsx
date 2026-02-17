
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Sparkles, 
  Mail, 
  User, 
  Calendar, 
  ArrowLeft, 
  LogOut, 
  Loader2, 
  ShieldCheck, 
  Edit2, 
  Save, 
  X, 
  Info,
  UserX,
  Bell,
  MailOpen,
  History
} from "lucide-react";
import { 
  useUser, 
  useAuth, 
  useFirestore, 
  useDoc, 
  useCollection,
  useMemoFirebase, 
  setDocumentNonBlocking 
} from "@/firebase";
import { signOut, updateProfile, deleteUser } from "firebase/auth";
import { doc, serverTimestamp, deleteDoc, collection, query, orderBy, limit } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch full profile
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc(profileRef);

  // Fetch Notification Inbox
  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [db, user]);

  const { data: notifications, isLoading: isNotificationsLoading } = useCollection(notificationsQuery);

  useEffect(() => {
    if (profileData) {
      setDisplayName(profileData.displayName || "");
      setBio(profileData.bio || "");
    } else if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [profileData, user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to sign out." });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !db) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      router.push("/login");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !db) return;
    setIsSaving(true);
    try {
      await updateProfile(user, { displayName });
      const userRef = doc(db, "users", user.uid);
      setDocumentNonBlocking(userRef, {
        id: user.uid,
        email: user.email || "",
        displayName,
        bio,
        updatedAt: serverTimestamp(),
        ...(!profileData ? { createdAt: serverTimestamp() } : {})
      }, { merge: true });
      setIsEditing(false);
      toast({ title: "Profile Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const initials = (displayName || user.email || "U").split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 shadow-2xl overflow-hidden border-none rounded-[2rem] h-fit">
            <CardHeader className="bg-primary text-primary-foreground pb-12 pt-10 text-center">
              <div className="relative mb-6 inline-block mx-auto">
                <Avatar className="w-24 h-24 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback className="text-3xl font-black bg-white text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1.5 rounded-full border-4 border-primary">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              
              {!isEditing ? (
                <>
                  <CardTitle className="text-2xl font-black tracking-tight">{displayName || "Professional"}</CardTitle>
                  <CardDescription className="text-primary-foreground/80 font-medium">@{displayName?.toLowerCase().replace(/\s+/g, '') || "member"}</CardDescription>
                  <Button variant="secondary" size="sm" className="mt-6 rounded-xl font-bold" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                  </Button>
                </>
              ) : (
                <div className="space-y-4 px-4 text-left">
                  <Label className="text-white/80 font-bold">Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Professional Email</p>
                <p className="text-sm font-bold truncate">{user.email || "Guest"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Bio</p>
                <p className="text-xs text-slate-600 leading-relaxed italic">{bio || "No professional summary set."}</p>
              </div>
              {isEditing && (
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Summary..." className="rounded-xl min-h-[100px]" />
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-6 bg-slate-50 border-t">
              {isEditing ? (
                <div className="flex gap-2 w-full">
                  <Button variant="ghost" onClick={() => setIsEditing(false)} className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={handleUpdateProfile} disabled={isSaving} className="flex-1 rounded-xl shadow-lg shadow-primary/20">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" onClick={handleSignOut} className="w-full rounded-xl font-bold"><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/5 rounded-xl font-bold"><UserX className="w-4 h-4 mr-2" /> Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Permanently remove your identity from Schedily?</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive rounded-xl">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </CardFooter>
          </Card>

          <Card className="lg:col-span-2 shadow-xl border-none rounded-[2rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" /> Notification Inbox
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-500">Log of professional AI emails dispatched to you.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-bold px-3 py-1">
                  <History className="w-3 h-3 mr-1.5" /> AI Activity Ledger
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[600px]">
                {isNotificationsLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Inbox...</p>
                  </div>
                ) : notifications && notifications.length > 0 ? (
                  <div className="divide-y">
                    {notifications.map((notif: any) => (
                      <div key={notif.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                              <MailOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">FROM: SCHEDILY AI AGENT</p>
                              <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{notif.subject}</h4>
                            </div>
                          </div>
                          <p className="text-[10px] font-black text-slate-300 uppercase">
                            {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                        <div className="pl-13 ml-13 border-l-2 border-slate-100 pl-4 py-1">
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">{notif.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-40 text-center px-10">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-dashed">
                      <MailOpen className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Inbox Empty</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                      AI-generated coordination emails will appear here whenever you are tagged or invited by a teammate.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
