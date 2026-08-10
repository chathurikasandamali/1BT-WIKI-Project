import { RoleGuard } from '@/components/auth/RoleGuard';
import { TechTalkForm } from '@/components/admin/TechTalkForm';

export default function CreateTechTalkPage(): React.JSX.Element {
    return (
        <RoleGuard allowedRoles={['Admin']}>
            <TechTalkForm />
        </RoleGuard>
    );
}