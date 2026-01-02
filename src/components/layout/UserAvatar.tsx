'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface UserAvatarProps {
    user: SupabaseUser | null;
    supabase: SupabaseClient;
    isLoading?: boolean;
}

export default function UserAvatar({ user, supabase, isLoading = false }: UserAvatarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const avatarUrl = user?.user_metadata?.avatar_url;
    const fullName = user?.user_metadata?.full_name || user?.email || 'User';
    const firstName = fullName.split(' ')[0];
    const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on Esc key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setShowSignOutModal(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const menuItems = [
        { label: 'My Profile', href: '/profile', icon: User },
        { label: 'Settings', href: '/settings', icon: Settings },
    ];

    // Skeleton loader
    if (isLoading) {
        return (
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                <div className="w-20 h-4 rounded bg-slate-200 animate-pulse hidden sm:block" />
            </div>
        );
    }

    return (
        <>
            <div ref={dropdownRef} className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                    {/* Avatar */}
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={fullName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {initials}
                        </div>
                    )}
                    {/* Name (hidden on mobile) */}
                    <span className="hidden sm:block max-w-[120px] truncate text-sm font-bold text-slate-700">
                        {firstName}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${isActive
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {item.label}
                                </Link>
                            );
                        })}
                        <hr className="my-2 border-slate-100" />
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowSignOutModal(true);
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                )}
            </div>

            {/* Sign Out Confirmation Modal */}
            {showSignOutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Out?</h3>
                        <p className="text-slate-500 mb-6">Are you sure you want to sign out of your account?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSignOutModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
