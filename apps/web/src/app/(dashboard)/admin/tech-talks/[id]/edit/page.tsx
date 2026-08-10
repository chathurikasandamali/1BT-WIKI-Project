'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { getTechTalkById } from '@/lib/api/techTalks';
import type { TechTalkDetail } from '@/lib/api/techTalks';
import { TechTalkForm } from '@/components/admin/TechTalkForm';

function EditTechTalkContent(): React.JSX.Element {
    const params = useParams();
    const id = (params?.id as string) || '';
    const [techTalk, setTechTalk] = useState<TechTalkDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            return;
        }

        const controller = new AbortController();

        const fetchTechTalk = async () => {
            try {
                setLoading(true);

                const data = await getTechTalkById(id, {
                    signal: controller.signal,
                });

                setTechTalk(data);
                setError(null);
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }

                setError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load Tech Talk'
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchTechTalk();

        return () => {
            controller.abort();
        };
    }, [id]);


    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
                <p className="text-sm text-brand-text-secondary">Loading Tech Talk...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm">
                    {error}
                </div>
            </div>
        );
    }

    if (!techTalk) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="py-20 text-center text-sm text-brand-text-secondary">
                    Tech Talk not found
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-brand-text-primary">Edit Tech Talk</h1>
                <p className="mt-1 text-sm text-brand-text-secondary">Update the details for this Tech Talk.</p>
            </div>

            <TechTalkForm initialData={techTalk} />
        </div>
    );
}

export default function EditTechTalkPage(): React.JSX.Element {
    return (
        <RoleGuard allowedRoles={['Admin']}>
            <EditTechTalkContent />
        </RoleGuard>
    );
}