import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageEmbedModal } from '../ImageEmbedModal';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';

// Mock the context
jest.mock('@/components/editor/EditorDraftContext', () => ({
  useEditorDraft: jest.fn(),
}));

// Mock GSAP to avoid animation issues in tests
jest.mock('gsap', () => ({
  to: jest.fn(),
  fromTo: jest.fn(),
}));

jest.mock('@gsap/react', () => ({
  useGSAP: (cb: () => void) => cb(),
}));

describe('ImageEmbedModal', () => {
  const mockUploadImage = jest.fn();
  const mockInsertEditorImage = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditorDraft as jest.Mock).mockReturnValue({
      uploadImage: mockUploadImage,
      insertEditorImage: mockInsertEditorImage,
    });
  });

  it('renders tabs correctly when open', () => {
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Embed Image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preset stock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /web url/i })).toBeInTheDocument();
  });

  it('handles URL embedding via button click', async () => {
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);
    
    // Switch to URL tab
    await userEvent.click(screen.getByRole('button', { name: /web url/i }));
    
    const input = screen.getByPlaceholderText('https://example.com/image.jpg');
    await userEvent.type(input, 'https://test.com/img.png');
    
    const embedButton = screen.getByRole('button', { name: /embed image/i });
    await userEvent.click(embedButton);
    
    expect(mockInsertEditorImage).toHaveBeenCalledWith('https://test.com/img.png');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles URL embedding via Enter key', async () => {
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);
    
    await userEvent.click(screen.getByRole('button', { name: /web url/i }));
    
    const input = screen.getByPlaceholderText('https://example.com/image.jpg');
    await userEvent.type(input, 'https://test.com/img.png{Enter}');
    
    expect(mockInsertEditorImage).toHaveBeenCalledWith('https://test.com/img.png');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles successful file upload', async () => {
    mockUploadImage.mockResolvedValue('https://uploaded.com/img.png');
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);
    
    await userEvent.click(screen.getByRole('button', { name: /upload file/i }));
    
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = screen.getByLabelText(/click to upload or drag and drop/i);
    
    await userEvent.upload(input, file);
    
    expect(mockUploadImage).toHaveBeenCalledWith(file);
    
    await waitFor(() => {
      expect(mockInsertEditorImage).toHaveBeenCalledWith('https://uploaded.com/img.png');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows a friendly error when no new attachment is returned', async () => {
    mockUploadImage.mockRejectedValue(
      new Error('Image upload succeeded but no new attachment was returned')
    );
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);

    await userEvent.click(screen.getByRole('button', { name: /upload file/i }));

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = screen.getByLabelText(/click to upload or drag and drop/i);

    await userEvent.upload(input, file);

    expect(mockUploadImage).toHaveBeenCalledWith(file);

    await waitFor(() => {
      expect(
        screen.getByText('We couldn’t upload this image. Please try again.')
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          'Image upload succeeded but no new attachment was returned'
        )
      ).not.toBeInTheDocument();
      expect(mockInsertEditorImage).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
    });
  });

  it('does not expose TypeError details on failed file upload', async () => {
    const technicalMessage = 'Cannot read properties of undefined';
    mockUploadImage.mockRejectedValue(new TypeError(technicalMessage));
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);

    await userEvent.click(screen.getByRole('button', { name: /upload file/i }));
    const input = screen.getByLabelText(/click to upload or drag and drop/i);
    await userEvent.upload(
      input,
      new File(['hello'], 'hello.png', { type: 'image/png' })
    );

    await waitFor(() => {
      expect(
        screen.getByText('We couldn’t upload this image. Please try again.')
      ).toBeInTheDocument();
      expect(screen.queryByText(technicalMessage)).not.toBeInTheDocument();
      expect(mockInsertEditorImage).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it.each([
    'Image size cannot exceed 5MB',
    'Only jpeg, png, webp, and gif images are allowed',
  ])('keeps actionable validation error unchanged: %s', async (message) => {
    mockUploadImage.mockRejectedValue(new Error(message));
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);

    await userEvent.click(screen.getByRole('button', { name: /upload file/i }));
    const input = screen.getByLabelText(/click to upload or drag and drop/i);
    await userEvent.upload(
      input,
      new File(['hello'], 'hello.png', { type: 'image/png' })
    );

    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(
        screen.queryByText('We couldn’t upload this image. Please try again.')
      ).not.toBeInTheDocument();
      expect(mockInsertEditorImage).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
