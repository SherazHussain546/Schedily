
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Mail, User, Calendar, ArrowLeft, LogOut, Loader2, ShieldCheck, Edit2, Save, X, Info } from "lucide-react";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { signOut, updateProfile } from "firebase/auth";
import { doc, serverTimestamp } from "firebase/firestore";
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

  // Fetch full profile from Firestore
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc(profileRef);

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

  const handleUpdateProfile = async () => {
    if (!user || !db) return;
    
    setIsSaving(true);
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, { displayName });

      // 2. Update Firestore Profile Document
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
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <Card className="shadow-xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="bg-muted/30 pb-10">
            <div className="flex flex-col items-center text-center pt-4">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg mb-4">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {!isEditing ? (
                <>
                  <CardTitle className="text-3xl font-headline font-bold">
                    {displayName || "Schedily User"}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {user.isAnonymous ? "Guest Profile" : "Professional Member"}
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 rounded-full"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit Profile
                  </Button>
                </>
              ) : (
                <div className="w-full max-w-sm space-y-4 mt-2">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your professional name"
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      size="sm" 
                      onClick={handleUpdateProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                      Save Changes
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(profileData?.displayName || user.displayName || "");
                      }}
                      disabled={isSaving}
                    >
                      <X className="w-3.5 h-3.5 mr-2" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Mail className="w-4 h-4" /> Email Address
                </div>
                <div className="text-lg font-semibold">{user.email || "Anonymous Access"}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <ShieldCheck className="w-4 h-4" /> Account Type
                </div>
                <div className="text-lg font-semibold">
                  {user.isAnonymous ? "Anonymous / Temporary" : "Standard Email"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Calendar className="w-4 h-4" /> Member Since
                </div>
                <div className="text-lg font-semibold">
                  {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Recently"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Info className="w-4 h-4" /> Professional Bio
                </div>
                {!isEditing && (
                   <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsEditing(true)}>
                     <Edit2 className="w-3 h-3 mr-1" /> Edit
                   </Button>
                )}
              </div>
              
              {!isEditing ? (
                <p className="text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-dashed">
                  {bio || "Tell colleagues about your professional role, skills, or scheduling preferences."}
                </p>
              ) : (
                <Textarea 
                  placeholder="Tell colleagues about your professional role..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[120px]"
                />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t p-6 bg-slate-50">
            <Button variant="outline" onClick={() => router.push("/")}>
              Manage Schedule
            </Button>
            <Button variant="destructive" onClick={handleSignOut} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Professional Network Active
        </div>
      </div>
    </div>
  );
}
