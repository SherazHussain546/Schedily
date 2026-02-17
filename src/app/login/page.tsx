
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  Loader2, 
  ArrowLeft, 
  User, 
  Building, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2
} from "lucide-react";
import { 
  useAuth, 
  useUser, 
  useFirestore, 
  initiateEmailSignIn, 
  initiateEmailSignUp, 
  initiateAnonymousSignIn, 
  errorEmitter 
} from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("Normal Account");
  const [organization, setOrganization] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [signupStep, setSignupStep] = useState(1);

  // Determine initial tab from search params
  const initialTab = searchParams?.tab === "signup" ? "signup" : "login";

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  // Listen for authentication errors
  useEffect(() => {
    const handleAuthError = (err: { code: string; message: string }) => {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: err.message || "An unexpected error occurred. Please check your credentials.",
      });
    };

    errorEmitter.on('auth-error', handleAuthError);
    return () => errorEmitter.off('auth-error', handleAuthError);
  }, []);

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    initiateEmailSignIn(auth, email, password);
  };

  const checkUsernameUniqueness = async (name: string) => {
    if (!db) return true;
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", name.trim()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupStep < 3) {
      await nextStep();
      return;
    }

    if (!email || !password || !username || !firstName || !lastName || !organization) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please complete all steps of the profile setup.",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Redundant check before final submission
    const isUnique = await checkUsernameUniqueness(username);
    if (!isUnique) {
      setIsLoading(false);
      setSignupStep(1);
      toast({
        variant: "destructive",
        title: "Username Taken",
        description: "That professional handle was claimed during your session. Please choose another.",
      });
      return;
    }

    initiateEmailSignUp(auth, db, email, password, {
      username,
      firstName,
      lastName,
      position,
      organization
    });
  };

  const handleAnonymousSignIn = () => {
    setIsLoading(true);
    initiateAnonymousSignIn(auth);
  };

  const nextStep = async () => {
    if (signupStep === 1) {
      if (!firstName || !lastName || !username) {
        toast({ variant: "destructive", title: "Wait!", description: "Tell us who you are first." });
        return;
      }

      setIsCheckingUsername(true);
      try {
        const isUnique = await checkUsernameUniqueness(username);
        if (!isUnique) {
          toast({
            variant: "destructive",
            title: "Handle Already Taken",
            description: `@${username} is already active in the network. Please pick a unique handle.`,
          });
          return;
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Sync Error", description: "Failed to verify identity. Try again." });
        return;
      } finally {
        setIsCheckingUsername(false);
      }
    }

    if (signupStep === 2 && !organization) {
      toast({ variant: "destructive", title: "Wait!", description: "Where do you work?" });
      return;
    }

    setSignupStep(s => s + 1);
  };

  const prevStep = () => setSignupStep(s => s - 1);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressValue = (signupStep / 3) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-body">
      <div className="mb-8 flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity group">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
            <Sparkles className="text-primary-foreground w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter text-primary">
            Schedily
          </h1>
        </Link>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Professional Sync Hub</h2>
        <p className="text-slate-500 mt-2 font-medium">Coordinate, Tag, and Dispatch with ease.</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="pb-0">
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 rounded-2xl p-1 h-14">
              <TabsTrigger value="login" className="rounded-xl font-black text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">LOGIN</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl font-black text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">JOIN NETWORK</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-1 mb-6">
                <CardTitle className="text-2xl font-black text-slate-900">Welcome Back</CardTitle>
                <CardDescription className="font-medium">Access your professional schedule.</CardDescription>
              </div>
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Professional Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="email-login"
                      type="email" 
                      placeholder="name@company.com" 
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-primary font-bold" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login" className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Pass-Key</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="password-login"
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-primary font-bold"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                  Sign In to Hub
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black text-slate-900">Join Schedily</CardTitle>
                    <CardDescription className="font-medium">Step {signupStep} of 3: Professional Onboarding</CardDescription>
                  </div>
                  <Badge className="bg-primary/5 text-primary border-primary/10 font-black">STEP {signupStep}</Badge>
                </div>
                <Progress value={progressValue} className="h-2 rounded-full bg-slate-100" />
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-6">
                {signupStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                        <Input 
                          placeholder="e.g. Sheraz" 
                          className="h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                        <Input 
                          placeholder="e.g. Hussain" 
                          className="h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Username (Network Handle)</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="e.g. sheraz_sync" 
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {signupStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Your Organization</Label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="e.g. SYNC TECH Solutions" 
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Current Position</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="Normal Account" className="font-bold">Normal Account</SelectItem>
                          <SelectItem value="Team Lead" className="font-bold">Team Lead</SelectItem>
                          <SelectItem value="Department Manager" className="font-bold">Department Manager</SelectItem>
                          <SelectItem value="Consultant" className="font-bold">Professional Consultant</SelectItem>
                          <SelectItem value="Executive" className="font-bold">Executive Operations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {signupStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Login Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="email" 
                          placeholder="name@example.com" 
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Secure Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {signupStep > 1 && (
                    <Button type="button" variant="outline" onClick={prevStep} className="h-14 px-6 rounded-2xl border-slate-200 font-black">
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <Button type="submit" className="flex-1 h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95" disabled={isLoading || isCheckingUsername}>
                    {signupStep < 3 ? (
                      isCheckingUsername ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Validating...</> : <>Continue <ChevronRight className="w-5 h-5 ml-2" /></>
                    ) : (
                      isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Registration</>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-8 px-8">
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-white px-4 text-slate-400">Collaboration Engine</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full h-14 rounded-2xl font-black text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors border border-dashed border-slate-200" onClick={handleAnonymousSignIn} disabled={isLoading}>
            Quick Exploration (Guest)
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-6 p-8 bg-slate-50/50 border-t border-slate-100">
          <Link href="/" className="text-sm text-slate-500 hover:text-primary transition-colors flex items-center gap-2 font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to SYNC TECH Portal
          </Link>
        </CardFooter>
      </Card>
      
      <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
        © {new Date().getFullYear()} Schedily Hub. Developed by SYNC TECH Solutions.
      </p>
      <Toaster />
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
