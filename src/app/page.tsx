import React from 'react';
import Link from 'next/link';
import { Lightbulb, FileText, BarChart3, ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Master Product Management through <span className="text-indigo-600">Practice.</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          The "Leetcode" for PMs. Sharpen your RCA, PRD, and Data skills with real-world scenarios.
        </p>
      </section>

      {/* Modules Grid */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        
        {/* RCA Simulations - ACTIVE */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all group">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6 text-indigo-600">
            <Lightbulb size={24} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">RCA Simulations</h3>
          <p className="text-slate-600 mb-6">Master Root Cause Analysis by investigating sudden metric drops and technical incidents.</p>
          <Link href="/rca" className="inline-flex items-center font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Start Practicing <ChevronRight size={18} />
          </Link>
        </div>

        {/* PRD Playground - COMING SOON */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded">COMING SOON</div>
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6 text-slate-400">
            <FileText size={24} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">PRD Playground</h3>
          <p className="text-slate-600 mb-6">Draft detailed requirements and get feedback on your prioritization and edge-case thinking.</p>
        </div>

        {/* Data Gym - COMING SOON */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded">COMING SOON</div>
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6 text-slate-400">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Data Gym</h3>
          <p className="text-slate-600 mb-6">Identify patterns in dashboards and extract actionable insights from raw product data.</p>
        </div>

      </div>
    </main>
  );
}

