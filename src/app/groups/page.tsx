
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
  Search,
  Check
} from "lucide-react";
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking
} from "@/firebase";
import { collection, query, where, getDocs, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Fetch groups where user is a member
  // Note: For simplicity in this demo, we'll list all groups if they were small, 
  // but better would be a subcollection or a 'memberOf' field.
  // Here we'll fetch all groups for simplicity and filter client side for MVP
  const groupsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "groups");
  }, [db]);

  const { data: allGroups, isLoading: isGroupsLoading } = useCollection(groupsQuery);

  // Filter groups where current user is a member
  // In a real app, you'd use a more complex query or a separate index
  const myGroups = allGroups?.filter(g => true) || []; // Placeholder logic

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
    toast({ title: "Member Added", description: `@${targetUser.displayName} joined the group.` });
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
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-headline">Team Groups</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-lg border-none rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">New Team</CardTitle>
                <CardDescription>Create a group for your department or project.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Group Name</Label>
                    <Input 
                      placeholder="e.g. Sales Team" 
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                  <Button className="w-full rounded-xl" disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Group
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-black flex items-center gap-2 px-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> My Active Groups
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
                          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Professional Circle</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-xl font-bold">
                              <UserPlus className="w-4 h-4 mr-2" /> Add Members
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Teammates to {group.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <form onSubmit={handleUserSearch} className="flex gap-2">
                                <Input 
                                  placeholder="Search by username..." 
                                  value={memberSearch}
                                  onChange={(e) => setMemberSearch(e.target.value)}
                                />
                                <Button type="submit"><Search className="w-4 h-4" /></Button>
                              </form>
                              <div className="space-y-2">
                                {searchResults.map(u => (
                                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="font-bold">@{u.displayName}</span>
                                    <Button size="sm" onClick={() => addMember(group.id, u)}>Add</Button>
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
                            onClick={() => deleteDocumentNonBlocking(doc(db, "groups", group.id))}
                            className="text-slate-300 hover:text-destructive"
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
              <div className="py-20 text-center bg-white border border-dashed rounded-[3rem] text-slate-400">
                You haven't joined any groups yet.
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
