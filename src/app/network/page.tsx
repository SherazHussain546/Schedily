
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Search, 
  UserPlus, 
  UserMinus, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, query, where, getDocs, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";

export default function NetworkPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch following to check status
  const followingQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "following");
  }, [db, user]);

  const { data: followingList } = useCollection(followingQuery);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !db) return;

    setIsSearching(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef, 
        where("displayName", ">=", searchQuery),
        where("displayName", "<=", searchQuery + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.id !== user?.uid);
      
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: "No users found", description: "Try a different username." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Search failed" });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFollow = (targetUser: any) => {
    if (!user || !db) return;
    
    const isFollowing = followingList?.some(f => f.id === targetUser.id);
    const followRef = doc(db, "users", user.uid, "following", targetUser.id);

    if (isFollowing) {
      deleteDocumentNonBlocking(followRef);
      toast({ title: "Unfollowed", description: `Removed @${targetUser.displayName}` });
    } else {
      setDocumentNonBlocking(followRef, {
        targetId: targetUser.id,
        targetName: targetUser.displayName,
        createdAt: serverTimestamp(),
      });
      toast({ 
        title: "Connected!", 
        description: `You are now following @${targetUser.displayName}` 
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-headline">Professional Network</h1>
          </div>
        </header>

        <Card className="shadow-xl rounded-3xl overflow-hidden border-none mb-10">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <CardTitle className="text-3xl font-black flex items-center gap-3">
              <Users className="w-8 h-8" /> Find Your Team
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg">
              Search for colleagues by username to build your professional circle.
            </CardDescription>
            <form onSubmit={handleSearch} className="relative mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <Input 
                placeholder="Search usernames..." 
                className="pl-12 h-14 rounded-2xl bg-white text-slate-900 text-lg shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" className="absolute right-2 top-2 h-10 rounded-xl" disabled={isSearching}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
            </form>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.length > 0 ? (
                searchResults.map((u) => {
                  const isFollowing = followingList?.some(f => f.id === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 border rounded-2xl hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {u.displayName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-slate-900">@{u.displayName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <Button 
                        variant={isFollowing ? "outline" : "default"} 
                        size="sm" 
                        onClick={() => toggleFollow(u)}
                        className="rounded-xl"
                      >
                        {isFollowing ? (
                          <><UserMinus className="w-4 h-4 mr-2" /> Unfollow</>
                        ) : (
                          <><UserPlus className="w-4 h-4 mr-2" /> Follow</>
                        )}
                      </Button>
                    </div>
                  );
                })
              ) : searchQuery && !isSearching && (
                <div className="col-span-full py-12 text-center text-slate-400">
                  No users matched your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2 px-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Currently Following
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followingList && followingList.length > 0 ? (
              followingList.map((f: any) => (
                <div key={f.id} className="p-4 bg-white border rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-primary">
                      {f.targetName?.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="font-bold text-sm">@{f.targetName}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => toggleFollow({ id: f.id, displayName: f.targetName })}>
                    <UserMinus className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="col-span-full p-12 bg-white border border-dashed rounded-3xl text-center text-slate-400">
                You haven't followed anyone yet. Build your team!
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
