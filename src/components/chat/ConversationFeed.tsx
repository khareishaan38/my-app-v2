'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage, { ChatMessageType } from './ChatMessage';
import { Loader2 } from 'lucide-react';

interface ConversationFeedProps {
    messages: ChatMessageType[];
    isTyping?: boolean;
}

export default function ConversationFeed({ messages, isTyping }: ConversationFeedProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                >
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center">
                        <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                    <div className="bg-slate-100 rounded-3xl rounded-tl-lg px-6 py-4">
                        <div className="flex gap-1">
                            <motion.span
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                className="w-2 h-2 bg-slate-400 rounded-full"
                            />
                            <motion.span
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                className="w-2 h-2 bg-slate-400 rounded-full"
                            />
                            <motion.span
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                className="w-2 h-2 bg-slate-400 rounded-full"
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
