import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { TechTalkForm } from '@/components/admin/TechTalkForm';
import { ArrowLeftIcon } from '@/components/shared/icons/ArrowLeftIcon';

export default function CreateTechTalkPage(): React.JSX.Element {
    return (
        <RoleGuard allowedRoles={['Admin']}>
            <div className="p-8 max-w-5xl mx-auto">
                <div className="mb-6">
                    <Link
                        href="/admin/tech-talks"
                        className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
                        data-testid="back-to-admin-list-link"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        Back to Tech Talk Management
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-brand-text-primary">Create Tech Talk</h1>
                    <p className="mt-1 text-sm text-brand-text-secondary">Fill in the details below to create a new Tech Talk.</p>
                </div>
                <TechTalkForm />
            </div>
        </RoleGuard>
    );
}