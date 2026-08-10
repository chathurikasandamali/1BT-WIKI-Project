'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { RoleGuard } from '@/components/auth/RoleGuard';
import {
    getTechTalkById,
    type TechTalkDetail,
} from '@/lib/api/techTalks';
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

        let cancelled = false;

        const fetchTechTalk = async () => {
            try {
                setLoading(true);

                const data = await getTechTalkById(id);

                if (!cancelled) {
                    setTechTalk(data);
                    setError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : 'Failed to load Tech Talk'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchTechTalk();

        return () => {
            cancelled = true;
        };
    }, [id]);


    if (loading) {
        return <div>Loading Tech Talk...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    if (!techTalk) {
        return <div>Tech Talk not found</div>;
    }

    return (
        <div>
            <h1>Edit Tech Talk</h1>

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