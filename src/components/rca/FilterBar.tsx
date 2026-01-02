'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, ChevronDown, X, Clock, BarChart3, CheckCircle } from 'lucide-react';

interface FilterOption {
    value: string;
    label: string;
}

const DIFFICULTY_OPTIONS: FilterOption[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
];

const TIME_OPTIONS: FilterOption[] = [
    { value: '10', label: '10 mins' },
    { value: '15', label: '15 mins' },
    { value: '20', label: '20 mins' },
];

const STATUS_OPTIONS: FilterOption[] = [
    { value: 'attempted', label: 'Attempted' },
    { value: 'never_attempted', label: 'Never Attempted' },
    { value: 'in_progress', label: 'In Progress' },
];

type FilterCategory = 'difficulty' | 'time' | 'status';

export default function FilterBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [openDropdown, setOpenDropdown] = useState<FilterCategory | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Parse current filters from URL
    const getFilters = (key: FilterCategory): string[] => {
        const param = searchParams.get(key);
        return param ? param.split(',') : [];
    };

    const difficultyFilters = getFilters('difficulty');
    const timeFilters = getFilters('time');
    const statusFilters = getFilters('status');

    const hasActiveFilters = difficultyFilters.length > 0 || timeFilters.length > 0 || statusFilters.length > 0;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateFilter = (category: FilterCategory, value: string, checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString());
        const current = getFilters(category);

        let updated: string[];
        if (checked) {
            updated = [...current, value];
        } else {
            updated = current.filter(v => v !== value);
        }

        if (updated.length > 0) {
            params.set(category, updated.join(','));
        } else {
            params.delete(category);
        }

        router.push(`/rca?${params.toString()}`);
    };

    const clearAllFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('difficulty');
        params.delete('time');
        params.delete('status');
        router.push(`/rca?${params.toString()}`);
    };

    const renderDropdown = (category: FilterCategory, options: FilterOption[], icon: React.ReactNode, label: string) => {
        const selectedValues = getFilters(category);
        const isOpen = openDropdown === category;

        return (
            <div className="relative">
                <button
                    onClick={() => setOpenDropdown(isOpen ? null : category)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-sm font-bold ${selectedValues.length > 0
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                >
                    {icon}
                    {label}
                    {selectedValues.length > 0 && (
                        <span className="bg-white text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {selectedValues.length}
                        </span>
                    )}
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-2 min-w-[180px] z-50">
                        {options.map(option => (
                            <label
                                key={option.value}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={(e) => updateFilter(category, option.value, e.target.checked)}
                                    className="w-4 h-4 rounded text-slate-900"
                                />
                                <span className="text-sm font-bold text-slate-700">{option.label}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={dropdownRef} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
                <Filter size={16} />
                Filter By:
            </div>

            {renderDropdown('difficulty', DIFFICULTY_OPTIONS, <BarChart3 size={16} />, 'Difficulty')}
            {renderDropdown('time', TIME_OPTIONS, <Clock size={16} />, 'Time')}
            {renderDropdown('status', STATUS_OPTIONS, <CheckCircle size={16} />, 'Status')}

            {hasActiveFilters && (
                <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                    <X size={14} />
                    Clear All
                </button>
            )}
        </div>
    );
}
