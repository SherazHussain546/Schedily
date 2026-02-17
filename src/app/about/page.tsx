"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  Target, 
  Users, 
  Lock,
  Globe,
  Star
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-body">
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
              <ArrowLeft className="w-4 h-4 mr-2" /> Hub
            </Button>
          </Link>
        </div>
      </header>

      <main className="py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-20 space-y-6">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-widest text-[10px]">
              Our Professional Vision
            </Badge>
            <h2 className="text-5xl md:text-7xl font-black font-headline text-slate-900 tracking-tight leading-[0.95]">
              Redefining <span className="text-primary">Team Sync.</span>
            </h2>
            <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Schedily was born from a simple observation: professional coordination should feel as intuitive as social interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary border border-slate-100">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">The Mission</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                To empower retail teams, medical departments, and project squads with an effortless "Tag and Dispatch" ecosystem. We bridge the gap between static calendars and dynamic professional lives.
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-accent border border-slate-100">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">Security by Design</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Engineered by SYNC TECH Solutions, Schedily treats your coordination data with enterprise-grade respect. Role-based access control ensures that sensitive shift data stays within authorized circles.
              </p>
            </div>
          </div>

          <section className="bg-primary text-primary-foreground p-12 md:p-20 rounded-[3.5rem] relative overflow-hidden mb-24">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center font-black text-xl">SH</div>
                <div>
                  <h4 className="text-xl font-black">Sheraz Hussain</h4>
                  <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Lead Engineer, SYNC TECH Solutions</p>
                </div>
              </div>
              <blockquote className="text-2xl md:text-4xl font-black font-headline leading-tight italic">
                "Schedily isn't just a calendar; it's a social network for productivity. We built it to handle the speed of modern business, specifically for teams in Dublin and beyond who need real-time synchronization."
              </blockquote>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            <div className="text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
              <h5 className="font-black text-slate-900 mb-2">High Speed</h5>
              <p className="text-slate-500 text-sm font-medium">Instant dispatch alerts and real-time syncing.</p>
            </div>
            <div className="text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <Users className="w-8 h-8 text-accent mx-auto mb-4" />
              <h5 className="font-black text-slate-900 mb-2">Team-Centric</h5>
              <p className="text-slate-500 text-sm font-medium">Built for collaborative professional circles.</p>
            </div>
            <div className="text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <Globe className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
              <h5 className="font-black text-slate-900 mb-2">Universal Sync</h5>
              <p className="text-slate-500 text-sm font-medium">Native integration with all major calendars.</p>
            </div>
          </div>

          <div className="text-center space-y-8">
            <h3 className="text-4xl font-black text-slate-900">Ready to join the synergy?</h3>
            <Link href="/login">
              <Button size="lg" className="rounded-2xl h-16 px-12 font-black shadow-xl shadow-primary/20">
                Create Your Profile
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-20 bg-slate-900 text-white border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
            © 2025 SYNC TECH Solutions. Developed by Sheraz Hussain.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
