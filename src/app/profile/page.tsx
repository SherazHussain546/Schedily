
"use client";

import React, { useState, useEffect } from "react";
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
  UserX
} from "lucide-react";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { signOut, updateProfile, deleteUser } from "firebase/auth";
import { doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch full profile from Firestore to get bio and other details
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc(profileRef);

  // Sync local state when profile data loads
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !db) return;
    
    setIsDeleting(true);
    try {
      // 1. Delete Firestore Profile Document
      const userRef = doc(db, "users", user.uid);
      await deleteDoc(userRef);

      // 2. Delete Auth User
      await deleteUser(user);

      toast({
        title: "Account Deleted",
        description: "Your professional profile has been removed.",
      });
      router.push("/login");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast({
          variant: "destructive",
          title: "Sensitive Action",
          description: "Please log out and log back in to verify your identity before deleting your account.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Deletion Failed",
          description: error.message || "Could not delete your account. Please try again later.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !db) return;
    
    setIsSaving(true);
    try {
      // 1. Update Firebase Auth Profile (Global Auth state)
      await updateProfile(user, { displayName });

      // 2. Update Firestore Profile Document (Searchable social profile)
      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, {
        displayName,
        bio,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Profile Updated",
        description: "Your professional details have been saved.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not save profile changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const initials = (displayName || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <Card className="shadow-2xl overflow-hidden border-none rounded-[2rem]">
          <CardHeader className="bg-primary text-primary-foreground pb-12 pt-10">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <Avatar className="w-28 h-28 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback className="text-3xl font-black bg-white text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full border-4 border-primary">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {!isEditing ? (
                <>
                  <CardTitle className="text-3xl font-headline font-black tracking-tight">
                    {displayName || "Professional User"}
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80 text-lg mt-1">
                    @{displayName?.toLowerCase().replace(/\s+/g, '') || "member"}
                  </CardDescription>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-6 rounded-xl font-bold px-6"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit My Details
                  </Button>
                </>
              ) : (
                <div className="w-full max-w-sm space-y-4 mt-2">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="displayName" className="text-white/80 font-bold">Display Name</Label>
                    <Input 
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8 pt-10 px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-black uppercase tracking-widest">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </div>
                <div className="text-sm font-bold text-slate-900">{user.email || "Guest User"}</div>
              </div>

              <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-black uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" /> Network Member Since
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Today"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-900 font-black uppercase tracking-widest">
                  <Info className="w-4 h-4 text-primary" /> Professional Bio
                </div>
              </div>
              
              {!isEditing ? (
                <p className="text-slate-600 leading-relaxed italic bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[100px]">
                  {bio || "Your professional summary will appear here. Tell your network about your role, expertise, or coordination preferences."}
                </p>
              ) : (
                <Textarea 
                  placeholder="Tell colleagues about your professional role, skills, or scheduling preferences..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[140px] rounded-2xl focus:ring-primary"
                />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap gap-4 justify-between items-center p-8 bg-slate-50 border-t">
            {!isEditing ? (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push("/")} className="rounded-xl font-bold px-6">
                    Back to Hub
                  </Button>
                  <Button variant="outline" onClick={handleSignOut} className="rounded-xl font-bold px-6 flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-xl font-bold px-6 flex items-center gap-2">
                      <UserX className="w-4 h-4" /> Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your professional profile and all associated data from Schedily.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete My Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <div className="flex gap-3 w-full justify-end">
                 <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profileData?.displayName || user.displayName || "");
                      setBio(profileData?.bio || "");
                    }}
                    className="rounded-xl font-bold px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Update Profile
                  </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        <div className="mt-10 text-center flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            Professional Identity Secure
          </div>
          <p className="text-xs text-slate-400 max-w-xs leading-tight">
            Deleting your account will remove your identity and availability from the professional network.
          </p>
        </div>
      </div>
    </div>
  );
}
