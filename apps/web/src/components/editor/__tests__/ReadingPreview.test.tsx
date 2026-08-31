import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingPreview } from '../ReadingPreview';
import { MOCK_TITLE, MOCK_AUTHOR_NAME } from '@/components/editor/mock';

// Mock GSAP
jest.mock('gsap', () => ({
  fromTo: jest.fn(),
}));

describe('ReadingPreview', () => {
  it('renders correctly with desktop viewport by default', () => {
    render(<ReadingPreview />);
    
    // Header title and author should be visible
    expect(screen.getByText(MOCK_TITLE)).toBeInTheDocument();
    expect(screen.getByText(MOCK_AUTHOR_NAME)).toBeInTheDocument();
    
    // Check if the container has max-w-4xl (desktop default)
    const article = screen.getByRole('article');
    expect(article).toHaveClass('max-w-4xl');
  });

  it('changes viewport to tablet', async () => {
    render(<ReadingPreview />);
    const tabletButton = screen.getByRole('button', { name: /tablet/i });
    
    await userEvent.click(tabletButton);
    
    const article = screen.getByRole('article');
    expect(article).toHaveClass('max-w-2xl');
    expect(article).not.toHaveClass('max-w-4xl');
  });

  it('changes viewport to mobile', async () => {
    render(<ReadingPreview />);
    const mobileButton = screen.getByRole('button', { name: /mobile/i });
    
    await userEvent.click(mobileButton);
    
    const article = screen.getByRole('article');
    expect(article).toHaveClass('max-w-sm');
    expect(article).not.toHaveClass('max-w-4xl');
  });
});
