'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronRight, Clock, BarChart, Home } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  difficulty: string;
}

export default function RCAListingPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProblems() {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('is_active', true);
      
      if (data) setProblems(data);
      setLoading(false);
    }
    fetchProblems();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-indigo-600 flex items-center gap-1">
            <Home size={14} /> Home
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">RCA Simulations</span>
        </nav>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">RCA Simulations</h1>
        <p className="text-slate-600 mb-8">Select a case to begin your root cause analysis practice.</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {problems.map((problem) => (
              <div key={problem.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{problem.title}</h2>
                    <p className="text-slate-600 mb-4">{problem.description}</p>
                    
                    <div className="flex gap-4 text-sm font-medium text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={16} /> {problem.time_limit_minutes} mins
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart size={16} /> {problem.difficulty}
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/rca/${problem.id}`}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    View Details <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

