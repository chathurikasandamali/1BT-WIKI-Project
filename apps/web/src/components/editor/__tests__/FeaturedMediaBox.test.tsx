import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeaturedMediaBox } from '../FeaturedMediaBox';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';

jest.mock('@/components/editor/EditorDraftContext', () => ({
  useEditorDraft: jest.fn(),
}));

describe('FeaturedMediaBox', () => {
  const mockUploadImage = jest.fn();
  const mockSetFeaturedImageUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditorDraft as jest.Mock).mockReturnValue({
      uploadImage: mockUploadImage,
      featuredImageUrl: null,
      setFeaturedImageUrl: mockSetFeaturedImageUrl,
    });
  });

  it('renders upload placeholder when no image is featured', () => {
    render(<FeaturedMediaBox />);
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.getByText('Display in main feed')).toBeInTheDocument();
  });

  it('renders featured image when featuredImageUrl is present', () => {
    (useEditorDraft as jest.Mock).mockReturnValue({
      uploadImage: mockUploadImage,
      featuredImageUrl: 'https://featured.com/img.png',
      setFeaturedImageUrl: mockSetFeaturedImageUrl,
    });
    render(<FeaturedMediaBox />);
    const img = screen.getByAltText('Featured');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://featured.com/img.png');
  });

  it('removes image when remove button is clicked', async () => {
    (useEditorDraft as jest.Mock).mockReturnValue({
      uploadImage: mockUploadImage,
      featuredImageUrl: 'https://featured.com/img.png',
      setFeaturedImageUrl: mockSetFeaturedImageUrl,
    });
    render(<FeaturedMediaBox />);
    
    const removeBtn = screen.getByTitle('Remove image');
    await userEvent.click(removeBtn);
    
    expect(mockSetFeaturedImageUrl).toHaveBeenCalledWith(null);
  });

  it('handles successful image upload', async () => {
    mockUploadImage.mockResolvedValue('https://uploaded.com/featured.png');
    render(<FeaturedMediaBox />);
    
    const file = new File(['dummy'], 'dummy.png', { type: 'image/png' });
    // The input is hidden via sr-only but wrapped in a label
    // getByLabelText on 'Upload Image' might not work directly if the text is in a span, 
    // but there's an input inside the label. We can find the file input directly.
    // Instead of label, we can select the input type file.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await userEvent.upload(fileInput, file);
    
    expect(mockUploadImage).toHaveBeenCalledWith(file);
    await waitFor(() => {
      expect(mockSetFeaturedImageUrl).toHaveBeenCalledWith('https://uploaded.com/featured.png');
    });
  });

  it('handles failed image upload', async () => {
    mockUploadImage.mockRejectedValue(new Error('Upload failed!'));
    render(<FeaturedMediaBox />);
    
    const file = new File(['dummy'], 'dummy.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed!')).toBeInTheDocument();
      expect(mockSetFeaturedImageUrl).not.toHaveBeenCalled();
    });
  });

  it('toggles distribution checkboxes', async () => {
    render(<FeaturedMediaBox />);
    
    const displayCheckbox = screen.getByLabelText('Display in main feed');
    const pinCheckbox = screen.getByLabelText('Pin to top of blog');
    
    // Default: display is checked, pin is unchecked
    expect(displayCheckbox).toBeChecked();
    expect(pinCheckbox).not.toBeChecked();
    
    await userEvent.click(displayCheckbox);
    expect(displayCheckbox).not.toBeChecked();
    
    await userEvent.click(pinCheckbox);
    expect(pinCheckbox).toBeChecked();
  });
});
