'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
    placeholder?: string;
}

export default function SearchBar({ placeholder = 'Search problems...' }: SearchBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');

    // Sync state with URL on mount
    useEffect(() => {
        setQuery(searchParams.get('q') || '');
    }, [searchParams]);

    const updateSearchParams = useCallback((newQuery: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newQuery.trim()) {
            params.set('q', newQuery.trim());
        } else {
            params.delete('q');
        }
        router.push(`/rca?${params.toString()}`);
    }, [router, searchParams]);

    // Debounced search (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentUrlQuery = searchParams.get('q') || '';
            if (query !== currentUrlQuery) {
                updateSearchParams(query);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, searchParams, updateSearchParams]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSearchParams(query);
    };

    const handleClear = () => {
        setQuery('');
        updateSearchParams('');
    };

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 w-full">
            <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-10 py-3 rounded-2xl border-2 border-slate-200 focus:border-slate-900 outline-none transition-all text-sm font-bold text-slate-900 placeholder:text-slate-400"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={16} className="text-slate-400" />
                    </button>
                )}
            </div>
            <button
                type="submit"
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg"
            >
                Search
            </button>
        </form>
    );
}
