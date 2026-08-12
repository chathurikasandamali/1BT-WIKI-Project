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

  it('displays error on failed file upload', async () => {
    mockUploadImage.mockRejectedValue(new Error('Upload failed randomly'));
    render(<ImageEmbedModal isOpen={true} onClose={mockOnClose} />);
    
    await userEvent.click(screen.getByRole('button', { name: /upload file/i }));
    
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = screen.getByLabelText(/click to upload or drag and drop/i);
    
    await userEvent.upload(input, file);
    
    expect(mockUploadImage).toHaveBeenCalledWith(file);
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed randomly')).toBeInTheDocument();
      expect(mockInsertEditorImage).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
