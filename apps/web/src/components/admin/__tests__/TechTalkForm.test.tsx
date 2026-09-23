import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TechTalkForm } from '@/components/admin/TechTalkForm';
import {
  createTechTalk,
  updateTechTalk,
  publishTechTalk,
} from '@/lib/api/techTalks';
import type { TechTalkDetail } from '@/lib/api/techTalks';

jest.mock('@/lib/api/techTalks', () => ({
  createTechTalk: jest.fn(),
  updateTechTalk: jest.fn(),
  publishTechTalk: jest.fn(),
}));

jest.mock('@/lib/hooks/useToast', () => ({
  useToast: () => ({
    toast: { visible: false, message: '', type: 'success' },
    showToast: jest.fn(),
  }),
}));

jest.mock('@/components/shared/Toast', () => ({
  Toast: () => <div data-testid="toast" />,
}));

jest.mock('@/components/shared/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <button type="button" onClick={onCancel} data-testid="confirm-cancel">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} data-testid="confirm-accept">
          Publish
        </button>
      </div>
    ) : null,
}));

const mockCreateTechTalk = createTechTalk as jest.Mock;
const mockUpdateTechTalk = updateTechTalk as jest.Mock;
const mockPublishTechTalk = publishTechTalk as jest.Mock;

const mockInitialData: TechTalkDetail = {
  id: 'talk-1',
  title: 'Existing Talk',
  description: 'Existing description',
  presenters: ['Alice'],
  tags: ['cloud'],
  eventDate: '2026-09-01T10:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: 'dQw4w9WgXcQ',
  status: 'draft',
  createdBy: 'admin',
  deletedAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Title'), 'Deploying with confidence');
  await user.type(screen.getByLabelText('Presenters'), 'Alice{enter}');

  fireEvent.change(screen.getByLabelText('Event Date'), {
    target: { value: '2026-09-15T14:30' },
  });

  await user.type(screen.getByLabelText('YouTube Video ID'), 'dQw4w9WgXcQ');
}

function expectErrorInsideFieldContainer(
  input: HTMLElement,
  testId: string
): void {
  const errorEl = screen.getByTestId(testId);
  const container = input.closest('div');

  expect(errorEl).toBeInTheDocument();
  expect(container).not.toBeNull();
  expect(container).toContainElement(input);
  expect(container).toContainElement(errorEl);
}

describe('TechTalkForm field-level validation display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows each validation error below its related field instead of a top-of-page banner', async () => {
    const user = userEvent.setup();

    render(<TechTalkForm />);

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    const titleInput = screen.getByLabelText('Title');
    const presentersInput = screen.getByLabelText('Presenters');
    const eventDateInput = screen.getByLabelText('Event Date');

    expectErrorInsideFieldContainer(titleInput, 'title-error');
    expectErrorInsideFieldContainer(presentersInput, 'presenters-error');
    expectErrorInsideFieldContainer(eventDateInput, 'eventDate-error');

    expect(screen.getByTestId('title-error')).toHaveTextContent(
      'Title is required'
    );
    expect(screen.getByTestId('presenters-error')).toHaveTextContent(
      'At least one presenter is required'
    );
    expect(screen.getByTestId('eventDate-error')).toHaveTextContent(
      'Event date is required'
    );

    expect(createTechTalk).not.toHaveBeenCalled();
    expect(updateTechTalk).not.toHaveBeenCalled();
  });

  it('associates field errors with their inputs via aria-invalid and aria-describedby', async () => {
    const user = userEvent.setup();

    render(<TechTalkForm />);

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    const titleInput = screen.getByLabelText('Title');

    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAttribute('aria-describedby', 'title-error');
    expect(screen.getByLabelText('Presenters')).toHaveAttribute(
      'aria-describedby',
      'presenters-error'
    );
    expect(screen.getByLabelText('Event Date')).toHaveAttribute(
      'aria-describedby',
      'eventDate-error'
    );
    expect(screen.getByLabelText('YouTube Video ID')).toHaveAttribute(
      'aria-describedby',
      'youtubeVideoId-error'
    );
    expect(screen.getByLabelText('Description')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('shows the YouTube Video ID format error below its field without flagging valid fields', async () => {
    render(<TechTalkForm />);

    const user = userEvent.setup();

    await fillValidForm(user);

    const youtubeInput = screen.getByLabelText('YouTube Video ID');

    await user.clear(youtubeInput);
    await user.type(youtubeInput, 'invalid-id!');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expectErrorInsideFieldContainer(youtubeInput, 'youtubeVideoId-error');
    expect(screen.getByTestId('youtubeVideoId-error')).toHaveTextContent(
      'Enter a valid 11-character YouTube Video ID'
    );
    expect(youtubeInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('title-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('presenters-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eventDate-error')).not.toBeInTheDocument();
    expect(createTechTalk).not.toHaveBeenCalled();
  });

  it('shows the YouTube Video ID required error below its field when it is empty', async () => {
    render(<TechTalkForm />);

    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Title'), 'Deploying with confidence');
    await user.type(screen.getByLabelText('Presenters'), 'Alice{enter}');

    fireEvent.change(screen.getByLabelText('Event Date'), {
      target: { value: '2026-09-15T14:30' },
    });

    await user.type(
      screen.getByLabelText('YouTube Video ID'),
      '   '
    );

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    const youtubeInput = screen.getByLabelText('YouTube Video ID');

    expectErrorInsideFieldContainer(youtubeInput, 'youtubeVideoId-error');
    expect(screen.getByTestId('youtubeVideoId-error')).toHaveTextContent(
      'YouTube Video ID is required'
    );
    expect(youtubeInput).toHaveAttribute('aria-invalid', 'true');
    expect(createTechTalk).not.toHaveBeenCalled();
  });

  it('clears a field error once the user edits that field', async () => {
    const user = userEvent.setup();

    render(<TechTalkForm />);

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(screen.getByTestId('title-error')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'New title');

    expect(screen.queryByTestId('title-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('presenters-error')).toBeInTheDocument();
  });

  it('still creates a Tech Talk when the form is valid', async () => {
    mockCreateTechTalk.mockResolvedValue(mockInitialData);

    render(<TechTalkForm />);

    const user = userEvent.setup();

    await fillValidForm(user);
    await user.type(screen.getByLabelText('Tags'), 'devops{enter}');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(createTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(createTechTalk).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deploying with confidence',
        presenters: ['Alice'],
        tags: ['devops'],
        publishImmediately: false,
      }),
      undefined
    );

    expect(screen.queryByTestId('title-error')).not.toBeInTheDocument();
  });

  it('still updates an existing Tech Talk in edit mode', async () => {
    mockUpdateTechTalk.mockResolvedValue(mockInitialData);

    render(<TechTalkForm initialData={mockInitialData} />);

    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Renamed talk');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(updateTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(updateTechTalk).toHaveBeenCalledWith(
      'talk-1',
      expect.objectContaining({ title: 'Renamed talk' }),
      undefined
    );
    expect(createTechTalk).not.toHaveBeenCalled();
  });

  it('keeps the publish confirmation flow intact and publishes after confirm', async () => {
    mockCreateTechTalk.mockResolvedValue(mockInitialData);
    mockPublishTechTalk.mockResolvedValue(mockInitialData);

    render(<TechTalkForm />);

    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /save & publish/i }));

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('confirm-accept'));

    await waitFor(() => {
      expect(createTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(createTechTalk).toHaveBeenCalledWith(
      expect.objectContaining({ publishImmediately: true }),
      undefined
    );
    expect(publishTechTalk).not.toHaveBeenCalled();
  });

  it('does not open the publish confirmation modal when validation fails', async () => {
    render(<TechTalkForm />);

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /save & publish/i }));

    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('title-error')).toBeInTheDocument();
    expect(createTechTalk).not.toHaveBeenCalled();
  });
});

describe('TechTalkForm slides attachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function getSlidesInput(): HTMLInputElement {
    return screen.getByLabelText('Slides (PDF, PPT, PPTX)') as HTMLInputElement;
  }

  function selectSlidesFile(): File {
    const file = new File(['slide-content'], 'SRS Document - 1BT WIKI.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(getSlidesInput(), { target: { files: [file] } });

    return file;
  }

  it('shows the selected filename and a remove attachment button once a file is chosen', () => {
    render(<TechTalkForm />);

    const file = selectSlidesFile();

    expect(getSlidesInput().files).toHaveLength(1);
    expect(getSlidesInput().files?.[0]).toBe(file);
    expect(
      screen.getByRole('button', { name: /remove attachment/i })
    ).toBeInTheDocument();
  });

  it('clears the selected file and returns the input to its no-file state when the remove button is clicked', () => {
    render(<TechTalkForm />);

    selectSlidesFile();

    const removeButton = screen.getByRole('button', {
      name: /remove attachment/i,
    });

    fireEvent.click(removeButton);

    const slidesInput = getSlidesInput();

    expect(slidesInput.value).toBe('');
    expect(
      screen.queryByRole('button', { name: /remove attachment/i })
    ).not.toBeInTheDocument();
  });

  it('does not submit the removed slides file with the Tech Talk', async () => {
    mockCreateTechTalk.mockResolvedValue(mockInitialData);

    render(<TechTalkForm />);

    const user = userEvent.setup();

    selectSlidesFile();
    fireEvent.click(
      screen.getByRole('button', { name: /remove attachment/i })
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(createTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(createTechTalk).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Deploying with confidence' }),
      undefined
    );
  });

  it('still submits an attached slides file when it is not removed', async () => {
    mockCreateTechTalk.mockResolvedValue(mockInitialData);

    render(<TechTalkForm />);

    const user = userEvent.setup();

    const file = selectSlidesFile();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(createTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(createTechTalk).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Deploying with confidence' }),
      file
    );
  });

  it('allows reselecting the same file after it was removed', () => {
    render(<TechTalkForm />);

    const firstSelection = selectSlidesFile();
    fireEvent.click(
      screen.getByRole('button', { name: /remove attachment/i })
    );

    fireEvent.change(getSlidesInput(), {
      target: { files: [firstSelection] },
    });

    expect(getSlidesInput().files).toHaveLength(1);
    expect(getSlidesInput().files?.[0]).toBe(firstSelection);
    expect(
      screen.getByRole('button', { name: /remove attachment/i })
    ).toBeInTheDocument();
  });

  it('keeps field validation working independently of the slides attachment', async () => {
    render(<TechTalkForm />);

    const user = userEvent.setup();

    selectSlidesFile();
    fireEvent.click(
      screen.getByRole('button', { name: /remove attachment/i })
    );

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(screen.getByTestId('title-error')).toBeInTheDocument();
    expect(createTechTalk).not.toHaveBeenCalled();
  });
});

describe('TechTalkForm edit-mode slides attachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockInitialDataWithSlides: TechTalkDetail = {
    ...mockInitialData,
    slidesUrl:
      'https://example.com/file/bucket/tech-talks/talk-1-SRS_Document___1BT_WIKI.pdf',
  };

  function getSlidesInput(): HTMLInputElement {
    return screen.getByLabelText('Slides (PDF, PPT, PPTX)') as HTMLInputElement;
  }

  function selectSlidesFile(): File {
    const file = new File(['slide-content'], 'Renamed Deck.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(getSlidesInput(), { target: { files: [file] } });

    return file;
  }

  it('does not put the existing attachment into the native file input', () => {
    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    const slidesInput = getSlidesInput();

    expect(slidesInput.value).toBe('');
    expect(slidesInput.files).toHaveLength(0);
  });

  it('displays the name of the existing attachment derived from the stored slides URL', () => {
    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    expect(screen.getByTestId('slides-filename')).toHaveTextContent(
      'SRS_Document___1BT_WIKI.pdf'
    );
    expect(
      screen.getByRole('button', { name: /remove attachment/i })
    ).toBeInTheDocument();
  });

  it('shows no-file-chosen state when editing a Tech Talk without an attachment', () => {
    render(<TechTalkForm initialData={mockInitialData} />);

    const slidesInput = getSlidesInput();

    expect(slidesInput.value).toBe('');
    expect(slidesInput.files).toHaveLength(0);
    expect(screen.queryByTestId('slides-filename')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /remove attachment/i })
    ).not.toBeInTheDocument();
  });

  it('lets a newly selected file replace the existing attachment while keeping the old name hidden', () => {
    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    const file = selectSlidesFile();

    expect(getSlidesInput().files?.[0]).toBe(file);
    expect(screen.queryByTestId('slides-filename')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /remove attachment/i })
    ).toBeInTheDocument();
  });

  it('removes the newly selected file and restores the existing attachment when trash is clicked with a new file present', () => {
    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    selectSlidesFile();

    fireEvent.click(
      screen.getByRole('button', { name: /remove attachment/i })
    );

    const slidesInput = getSlidesInput();

    expect(slidesInput.value).toBe('');
    expect(screen.queryByTestId('slides-filename')).toHaveTextContent(
      'SRS_Document___1BT_WIKI.pdf'
    );
  });

  it('submits an uploaded replacement file and does not send removeSlides', async () => {
    mockUpdateTechTalk.mockResolvedValue(mockInitialDataWithSlides);

    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    const user = userEvent.setup();

    const file = selectSlidesFile();

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(updateTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(updateTechTalk).toHaveBeenCalledWith(
      'talk-1',
      expect.not.objectContaining({ removeSlides: true }),
      file
    );
  });

  it('sends removeSlides when the existing attachment is removed', async () => {
    mockUpdateTechTalk.mockResolvedValue(mockInitialData);

    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    const user = userEvent.setup();

    fireEvent.click(
      screen.getByRole('button', { name: /remove attachment/i })
    );

    expect(screen.queryByTestId('slides-filename')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(updateTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(updateTechTalk).toHaveBeenCalledWith(
      'talk-1',
      expect.objectContaining({ removeSlides: true }),
      undefined
    );
  });

  it('preserves the existing attachment when saving without changes', async () => {
    mockUpdateTechTalk.mockResolvedValue(mockInitialDataWithSlides);

    render(<TechTalkForm initialData={mockInitialDataWithSlides} />);

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(updateTechTalk).toHaveBeenCalledTimes(1);
    });

    expect(updateTechTalk).toHaveBeenCalledWith(
      'talk-1',
      expect.not.objectContaining({ removeSlides: true }),
      undefined
    );
  });
});
