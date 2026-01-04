'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Loader2, AlertCircle } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface DocumentFile {
    name: string;
    id: string;
    created_at: string;
    metadata: Record<string, any> | null;
}

interface DocumentListProps {
    userId: string;
    supabase: SupabaseClient;
    isEditable: boolean;
    refreshTrigger?: number;
}

export default function DocumentList({ userId, supabase, isEditable, refreshTrigger }: DocumentListProps) {
    const [files, setFiles] = useState<DocumentFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: listError } = await supabase.storage
                .from('portfolios')
                .list(userId, {
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (listError) throw listError;
            setFiles(data || []);
        } catch (err: any) {
            console.error('Error fetching files:', err);
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchFiles();
    }, [userId, supabase, refreshTrigger]);

    const handleDownload = async (fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('portfolios')
                .createSignedUrl(`${userId}/${fileName}`, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err: any) {
            console.error('Download error:', err);
            alert('Failed to download file');
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        setDeleting(fileName);
        try {
            const { error } = await supabase.storage
                .from('portfolios')
                .remove([`${userId}/${fileName}`]);

            if (error) throw error;
            setFiles(files.filter(f => f.name !== fileName));
        } catch (err: any) {
            console.error('Delete error:', err);
            alert('Failed to delete file');
        } finally {
            setDeleting(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getDisplayName = (fileName: string) => {
        // Remove timestamp prefix added during upload
        return fileName.replace(/^\d+-/, '').replace(/_/g, ' ');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-slate-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-700 text-sm">
                <AlertCircle size={16} />
                {error}
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="text-center py-8">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">No documents uploaded yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {files.map((file) => (
                <div
                    key={file.id || file.name}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                                {getDisplayName(file.name)}
                            </p>
                            <p className="text-xs text-slate-400">
                                {file.metadata?.size ? formatFileSize(file.metadata.size) : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleDownload(file.name)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download"
                        >
                            <Download size={18} />
                        </button>
                        {isEditable && (
                            <button
                                onClick={() => handleDelete(file.name)}
                                disabled={deleting === file.name}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                            >
                                {deleting === file.name ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Trash2 size={18} />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
