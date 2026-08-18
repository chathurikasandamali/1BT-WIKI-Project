import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextEditor } from '../RichTextEditor';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { POPULAR_TAGS } from '@/components/editor/data';

jest.mock('@/components/editor/EditorDraftContext', () => ({
  useEditorDraft: jest.fn(),
}));

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    isActive: jest.fn().mockReturnValue(false),
    can: jest.fn().mockReturnValue({ undo: jest.fn().mockReturnValue(true), redo: jest.fn().mockReturnValue(true) }),
    chain: jest.fn().mockReturnValue({
      focus: jest.fn().mockReturnValue({
        toggleBold: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleItalic: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleStrike: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleCode: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleHeading: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleBulletList: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleOrderedList: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleBlockquote: jest.fn().mockReturnValue({ run: jest.fn() }),
        undo: jest.fn().mockReturnValue({ run: jest.fn() }),
        redo: jest.fn().mockReturnValue({ run: jest.fn() }),
      })
    }),
    state: { doc: { textContent: 'Mock content' } },
  })),
  EditorContent: () => <div data-testid="tiptap-content">EditorContent</div>,
}));

describe('RichTextEditor', () => {
  const mockSetTitle = jest.fn();
  const mockSetTags = jest.fn();
  const mockRegisterEditor = jest.fn();
  const mockHandleTitleBlur = jest.fn();
  const mockNotifyContentChanged = jest.fn();
  const mockOnOpenImageEmbed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditorDraft as jest.Mock).mockReturnValue({
      title: 'Initial Title',
      setTitle: mockSetTitle,
      tags: ['React'],
      setTags: mockSetTags,
      registerEditor: mockRegisterEditor,
      handleTitleBlur: mockHandleTitleBlur,
      notifyContentChanged: mockNotifyContentChanged,
      initialBody: null,
    });
  });

  it('renders correctly with title and tags', () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    
    expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument(); // Tag
    expect(screen.getByTestId('tiptap-content')).toBeInTheDocument();
  });

  it('calls setTitle on title input change', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    const titleInput = screen.getByPlaceholderText('Enter an inspiring title...');
    
    await userEvent.type(titleInput, '!');
    expect(mockSetTitle).toHaveBeenCalled();
  });

  it('calls handleTitleBlur on title input blur', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    const titleInput = screen.getByPlaceholderText('Enter an inspiring title...');
    
    fireEvent.blur(titleInput);
    expect(mockHandleTitleBlur).toHaveBeenCalled();
  });

  it('removes a tag when remove button is clicked', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    
    // Find the X button inside the tag element.
    // We have one tag "React". The X icon is an svg in a button next to it.
    // The closest button next to 'React' text.
    // Find the X button inside the tag element.
    // The first button in the tags list (which doesn't have text) is the remove button for "React"
    // Since there are many buttons, let's target by finding the parent container or relying on structure
    // actually, let's query the specific button using a class or nearby text
    const reactTag = screen.getByText('React').parentElement;
    const removeBtn = reactTag!.querySelector('button');
    
    await userEvent.click(removeBtn!);
    
    expect(mockSetTags).toHaveBeenCalledWith([]);
  });

  it('adds a tag on pressing Enter in the tag input', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    const tagInput = screen.getByPlaceholderText('Add tag...');
    
    await userEvent.type(tagInput, 'NextJS{Enter}');
    
    expect(mockSetTags).toHaveBeenCalledWith(['React', 'NextJS']);
  });

  it('does not add duplicate tags', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    const tagInput = screen.getByPlaceholderText('Add tag...');
    
    await userEvent.type(tagInput, 'React{Enter}');
    
    // Shouldn't call setTags or maybe call it but the implementation prevents it
    // Wait, the component checks if (!tags.includes(tagToAdd)) before calling setTags
    expect(mockSetTags).not.toHaveBeenCalled();
  });

  it('adds a popular tag when clicked', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    
    // Find a popular tag that is not 'React'
    const popularTagToClick = POPULAR_TAGS.find(t => t !== 'React')!;
    const popularTagBtn = screen.getByRole('button', { name: popularTagToClick });
    
    await userEvent.click(popularTagBtn);
    
    expect(mockSetTags).toHaveBeenCalledWith(['React', popularTagToClick]);
  });

  it('calls onOpenImageEmbed when the Embed Image button is clicked', async () => {
    render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    
    const embedBtn = screen.getByRole('button', { name: /embed image/i });
    await userEvent.click(embedBtn);
    
    expect(mockOnOpenImageEmbed).toHaveBeenCalled();
  });
  
  it('registers and unregisters the editor on mount and unmount', () => {
    const { unmount } = render(<RichTextEditor onOpenImageEmbed={mockOnOpenImageEmbed} />);
    
    expect(mockRegisterEditor).toHaveBeenCalledWith(expect.anything());
    
    unmount();
    expect(mockRegisterEditor).toHaveBeenCalledWith(null);
  });
});
