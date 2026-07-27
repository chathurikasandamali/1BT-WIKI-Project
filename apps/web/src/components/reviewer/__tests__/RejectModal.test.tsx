import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectModal } from '@/components/reviewer/RejectModal';

describe('RejectModal', () => {
  const defaultProps = {
    isOpen: true,
    articleId: 'art-123',
    articleTitle: 'Test Article Title',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and feedback input inside ConfirmationModal when open', () => {
    render(<RejectModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Reject Article' })).toBeInTheDocument();
    expect(screen.getByText(/Test Article Title/)).toBeInTheDocument();
    expect(screen.getByTestId('reject-feedback-input')).toBeInTheDocument();
  });

  it('blocks submit and shows validation error when feedback is under 10 characters', async () => {
    render(<RejectModal {...defaultProps} />);
    const user = userEvent.setup();

    const input = screen.getByTestId('reject-feedback-input');
    await user.type(input, 'Short');

    const confirmBtn = screen.getByRole('button', { name: 'Reject Article' });
    await user.click(confirmBtn);

    expect(screen.getByTestId('reject-feedback-error')).toHaveTextContent(
      'Rejection feedback must be at least 10 characters'
    );
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with trimmed text when feedback is at least 10 characters', async () => {
    render(<RejectModal {...defaultProps} />);
    const user = userEvent.setup();

    const input = screen.getByTestId('reject-feedback-input');
    await user.type(input, '  This article needs major revisions and more sources.  ');

    const confirmBtn = screen.getByRole('button', { name: 'Reject Article' });
    await user.click(confirmBtn);

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      'This article needs major revisions and more sources.'
    );
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    render(<RejectModal {...defaultProps} />);
    const user = userEvent.setup();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
