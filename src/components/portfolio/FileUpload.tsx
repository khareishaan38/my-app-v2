'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface FileUploadProps {
    userId: string;
    supabase: SupabaseClient;
    onUploadComplete: () => void;
}

const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({ userId, supabase, onUploadComplete }: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Only PDF and Word documents are allowed';
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'File size must be less than 10MB';
        }
        return null;
    };

    const uploadFile = async (file: File) => {
        const error = validateFile(file);
        if (error) {
            setStatus({ type: 'error', message: error });
            return;
        }

        setUploading(true);
        setStatus(null);

        try {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('portfolios')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            setStatus({ type: 'success', message: 'File uploaded successfully!' });
            onUploadComplete();
        } catch (err: any) {
            console.error('Upload error:', err);
            setStatus({ type: 'error', message: err.message || 'Failed to upload file' });
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    return (
        <div className="space-y-4">
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                    ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                />

                <div className="flex flex-col items-center gap-3">
                    {uploading ? (
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                    ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                            <Upload size={24} className="text-slate-500" />
                        </div>
                    )}
                    <div>
                        <p className="font-bold text-slate-900">
                            {uploading ? 'Uploading...' : 'Drop file here or click to upload'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            PDF, DOC, DOCX up to 10MB
                        </p>
                    </div>
                </div>
            </div>

            {status && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${status.type === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                    {status.type === 'success' ? (
                        <CheckCircle size={16} />
                    ) : (
                        <AlertCircle size={16} />
                    )}
                    {status.message}
                </div>
            )}
        </div>
    );
}
