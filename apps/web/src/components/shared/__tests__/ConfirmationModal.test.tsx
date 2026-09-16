import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    to: jest.fn(),
    fromTo: jest.fn(),
  },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: (cb: () => void) => cb(),
}));

describe('ConfirmationModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Cancel and Confirm for the default variant', () => {
    render(
      <ConfirmationModal
        isOpen
        title="Change user role"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('hides Cancel and uses a single dismiss action for the warning variant', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationModal
        isOpen
        variant="warning"
        title="Cannot change role"
        message="This is the last active admin."
        confirmText="Got it"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Cannot change role')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
