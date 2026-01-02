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
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3 w-full">
            <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-400 focus:bg-white outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={14} className="text-gray-400" />
                    </button>
                )}
            </div>
            <button
                type="submit"
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-all shadow-sm"
            >
                Search
            </button>
        </form>
    );
}
