'use client';

import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';

export interface ChatMessageType {
    role: 'user' | 'dan';
    content: string;
    isEvaluation?: boolean;
    score?: number;
    maxScore?: number;
    questionIndex?: number;
}

interface ChatMessageProps {
    message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar */}
            <div className={`
                w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl
                ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}
            `}>
                {isUser ? (
                    <User size={20} className="text-white" />
                ) : (
                    <span className="animate-bounce">👨‍💻</span>
                )}
            </div>

            {/* Message Bubble */}
            <div className={`
                max-w-[75%] rounded-3xl px-6 py-4
                ${isUser
                    ? 'bg-indigo-600 text-white rounded-tr-lg'
                    : 'bg-slate-100 text-slate-800 rounded-tl-lg'
                }
            `}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                </p>

                {/* Score Badge for evaluations */}
                {message.isEvaluation && message.score !== undefined && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`
                            mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold
                            ${message.score === 3
                                ? 'bg-green-100 text-green-700'
                                : message.score >= 2
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                            }
                        `}
                    >
                        Score: {message.score}/{message.maxScore || 3}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
