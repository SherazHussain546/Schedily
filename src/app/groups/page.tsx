
"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Trash2,
  UserPlus,
  Search
} from "lucide-react";
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, query, where, getDocs, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function GroupsPage(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);

  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Fetch groups to display in the management hub
  const groupsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // For MVP, we'll list groups created by the user or all discoverable groups
    // In a scaled app, we'd query by membership via collection group or user profile field
    return collection(db, "groups");
  }, [db, user]);

  const { data: allGroups, isLoading: isGroupsLoading } = useCollection(groupsQuery);

  // Filter groups where current user is the owner or (if we had the data) a member
  const myGroups = allGroups?.filter(g => g.ownerId === user?.uid) || [];

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user || !db) return;

    setIsCreating(true);
    try {
      const groupRef = doc(collection(db, "groups"));
      const groupId = groupRef.id;

      await setDoc(groupRef, {
        name: newGroupName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      const memberRef = doc(db, "groups", groupId, "members", user.uid);
      await setDoc(memberRef, {
        userId: user.uid,
        displayName: user.displayName || "Owner",
        role: "owner"
      });

      setNewGroupName("");
      toast({ title: "Group Created", description: `"${newGroupName}" is now active.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to create group" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberSearch.trim() || !db) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayName", "==", memberSearch.trim()));
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: "User not found", description: "Search for an exact professional username." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Search failed" });
    }
  };

  const addMember = (groupId: string, targetUser: any) => {
    if (!db) return;
    const memberRef = doc(db, "groups", groupId, "members", targetUser.id);
    setDocumentNonBlocking(memberRef, {
      userId: targetUser.id,
      displayName: targetUser.displayName,
      role: "member"
    });
    toast({ title: "Member Added", description: `@${targetUser.displayName} added to group.` });
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
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Hub
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-headline">Team Management</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-lg border-none rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Start New Team</CardTitle>
                <CardDescription>Coordinate an entire department or circle.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Department Name</Label>
                    <Input 
                      placeholder="e.g. Dublin Tech Ops" 
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <Button className="w-full rounded-xl h-12 font-bold" disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Launch Group
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-black flex items-center gap-2 px-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Managed Circles
            </h3>
            
            {isGroupsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
              </div>
            ) : myGroups.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {myGroups.map((group: any) => (
                  <Card key={group.id} className="shadow-sm border border-slate-100 rounded-3xl hover:border-primary/20 transition-all overflow-hidden">
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-900">{group.name}</h4>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Group ID: {group.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-xl font-bold text-primary hover:bg-primary/5">
                              <UserPlus className="w-4 h-4 mr-2" /> Invite
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle>Invite Teammate to {group.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <form onSubmit={handleUserSearch} className="flex gap-2">
                                <Input 
                                  placeholder="Search by username..." 
                                  value={memberSearch}
                                  onChange={(e) => setMemberSearch(e.target.value)}
                                  className="rounded-xl"
                                />
                                <Button type="submit" className="rounded-xl"><Search className="w-4 h-4" /></Button>
                              </form>
                              <div className="space-y-2 max-h-[300px] overflow-auto">
                                {searchResults.map(u => (
                                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black text-primary border">
                                        {u.displayName?.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-bold text-sm">@{u.displayName}</span>
                                    </div>
                                    <Button size="sm" className="rounded-xl font-bold h-8" onClick={() => addMember(group.id, u)}>Add</Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {group.ownerId === user.uid && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if(confirm("Permanently delete this professional circle?")) {
                                deleteDocumentNonBlocking(doc(db, "groups", group.id));
                              }
                            }}
                            className="text-slate-300 hover:text-destructive rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-white border border-dashed rounded-[3rem] text-slate-400 font-medium">
                You haven't launched any professional circles yet.
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
