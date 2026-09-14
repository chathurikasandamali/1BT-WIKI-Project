import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectCommentModal } from '../RejectCommentModal';

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

describe('RejectCommentModal', () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and reason input inside ConfirmationModal when open', () => {
    render(<RejectCommentModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Reject Comment' })).toBeInTheDocument();
    expect(screen.getByTestId('reject-comment-reason-input')).toBeInTheDocument();
  });

  it('blocks submit and shows validation error when reason is under 10 characters', async () => {
    render(<RejectCommentModal {...defaultProps} />);
    const user = userEvent.setup();

    const input = screen.getByTestId('reject-comment-reason-input');
    await user.type(input, 'Short');

    const confirmBtn = screen.getByRole('button', { name: 'Reject Comment' });
    await user.click(confirmBtn);

    expect(screen.getByTestId('reject-comment-reason-error')).toHaveTextContent(
      'Rejection reason must be at least 10 characters'
    );
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with trimmed text when reason is at least 10 characters', async () => {
    render(<RejectCommentModal {...defaultProps} />);
    const user = userEvent.setup();

    const input = screen.getByTestId('reject-comment-reason-input');
    await user.type(input, '  This comment violates community guidelines.  ');

    const confirmBtn = screen.getByRole('button', { name: 'Reject Comment' });
    await user.click(confirmBtn);

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      'This comment violates community guidelines.'
    );
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    render(<RejectCommentModal {...defaultProps} />);
    const user = userEvent.setup();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
