
"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  ArrowLeft, 
  UserPlus, 
  Users, 
  Send, 
  CalendarDays,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function HowItWorksPage() {
  const steps = [
    {
      title: "Join the Hub",
      description: "Create your professional identity. Schedily acts as your coordination portal, searchable by colleagues within your organization.",
      icon: <UserPlus className="w-10 h-10 text-primary" />,
      tag: "STEP 01"
    },
    {
      title: "Launch Team Circles",
      description: "Create department groups (e.g., 'Dublin Tech Ops') and invite teammates. Circles share a unified knowledge hub and chat.",
      icon: <Users className="w-10 h-10 text-accent" />,
      tag: "STEP 02"
    },
    {
      title: "Tag & Dispatch",
      description: "Create a shift or meeting and 'Tag' a colleague. The task is instantly dispatched to their mailbox and AI-notified.",
      icon: <Send className="w-10 h-10 text-emerald-500" />,
      tag: "STEP 03"
    },
    {
      title: "Universal Sync",
      description: "One-click export of your entire professional schedule from the Schedily portal to your native device calendar.",
      icon: <CalendarDays className="w-10 h-10 text-amber-500" />,
      tag: "STEP 04"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-body">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="text-primary-foreground w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black font-headline tracking-tighter text-primary">
              Schedily
            </h1>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="font-bold text-slate-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Schedily Hub
            </Button>
          </Link>
        </div>
      </header>

      <main className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-24 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">
              Guide to Professional Synergy
            </div>
            <h2 className="text-5xl md:text-7xl font-black font-headline text-slate-900 tracking-tight leading-none">
              How Schedily <br />
              <span className="text-primary">Syncs Your Life.</span>
            </h2>
            <p className="text-slate-500 text-xl font-medium leading-relaxed">
              We've engineered a four-stage process to eliminate scheduling conflicts and maximize team performance through the Schedily Portal.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 mb-32">
            {steps.map((step, index) => (
              <div key={index} className="p-12 bg-white border border-slate-100 rounded-[3.5rem] shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:border-primary/20 transition-all">
                <div className="absolute top-0 right-0 p-8">
                  <span className="text-slate-100 font-black text-6xl select-none group-hover:text-primary/10 transition-colors">0{index + 1}</span>
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    {step.icon}
                  </div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{step.tag}</span>
                  <h4 className="text-3xl font-black text-slate-900">{step.title}</h4>
                  <p className="text-slate-500 font-medium leading-relaxed text-lg">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <section className="bg-slate-900 text-white rounded-[4rem] p-12 md:p-24 text-center space-y-12">
            <h3 className="text-4xl md:text-6xl font-black font-headline tracking-tight">
              Ready to <span className="text-primary">Dispatch</span> Your First Shift?
            </h3>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/login?tab=signup">
                <Button size="lg" className="h-20 px-16 rounded-[2rem] text-2xl font-black bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40">
                  Launch Your Hub
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="ghost" className="h-20 px-10 rounded-[2rem] text-xl font-black hover:bg-white/10 text-white">
                  About Schedily <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="pt-12 flex flex-wrap justify-center gap-12 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-slate-400">Enterprise Ready</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-slate-400">Professional Privacy</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-slate-400">Real-Time Alerts</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-20 border-t bg-slate-50">
        <div className="container mx-auto px-4 text-center space-y-6">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            © 2025 Schedily Hub. Developed by Sheraz Hussain for SYNC TECH Solutions.
          </p>
        </div>
      </footer>
    </div>
  );
}
