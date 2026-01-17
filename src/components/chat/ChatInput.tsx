'use client';

import { useState, KeyboardEvent, useRef } from 'react';
import { Send, Loader2, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Debounce delay to prevent rapid consecutive sends
const SEND_DEBOUNCE_MS = 2000;

interface ChatInputProps {
    onSend: (message: string, isHint: boolean) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
}

export default function ChatInput({ onSend, disabled, isLoading, placeholder }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const lastSendTime = useRef<number>(0);

    const handleSend = (isHint: boolean = false) => {
        const now = Date.now();
        const timeSinceLastSend = now - lastSendTime.current;

        // Prevent rapid consecutive sends (debounce)
        if (timeSinceLastSend < SEND_DEBOUNCE_MS && lastSendTime.current !== 0) {
            console.warn(`Send blocked: only ${timeSinceLastSend}ms since last send`);
            return;
        }

        if (message.trim() && !disabled && !isLoading) {
            lastSendTime.current = now;
            onSend(message.trim(), isHint);
            setMessage('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t bg-white p-4"
        >
            <div className="max-w-3xl mx-auto">
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={disabled || isLoading}
                            placeholder={placeholder || "Type your debugging reasoning..."}
                            rows={2}
                            className="w-full resize-none rounded-2xl border-2 border-slate-200 px-5 py-4 pr-24 text-slate-900 
                                focus:border-indigo-400 focus:outline-none transition-colors
                                disabled:bg-slate-50 disabled:text-slate-400
                                placeholder:text-slate-300"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        {/* Hint Button */}
                        <button
                            onClick={() => handleSend(true)}
                            disabled={!message.trim() || disabled || isLoading}
                            title="Ask for a hint (won't be scored)"
                            className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 
                                disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <HelpCircle size={20} />
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={() => handleSend(false)}
                            disabled={!message.trim() || disabled || isLoading}
                            className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 
                                disabled:opacity-40 disabled:cursor-not-allowed transition-all
                                shadow-lg shadow-indigo-200"
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Helper Text */}
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>Press Enter to submit your reasoning</span>
                    <span>Use the ? button to ask for hints</span>
                </div>
            </div>
        </motion.div>
    );
}
