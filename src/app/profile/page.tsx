
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Mail, User, Calendar, ArrowLeft, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

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

  if (isUserLoading) {
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

  const initials = (user.displayName || user.email || "U")
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
              <CardTitle className="text-3xl font-headline font-bold">
                {user.displayName || "Schedily User"}
              </CardTitle>
              <CardDescription className="text-lg">
                {user.isAnonymous ? "Guest Profile" : "Professional Member"}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <User className="w-4 h-4" /> Username
                </div>
                <div className="text-lg font-semibold">{user.displayName || "Not set"}</div>
              </div>
              
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
          Powered by Schedily Infrastructure
        </div>
      </div>
    </div>
  );
}
