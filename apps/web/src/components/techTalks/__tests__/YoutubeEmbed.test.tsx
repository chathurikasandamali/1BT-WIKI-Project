import { render, screen } from '@testing-library/react';
import { YoutubeEmbed } from '@/components/techTalks/YoutubeEmbed';

describe('YoutubeEmbed', () => {
  it('renders iframe with correct src when videoId is provided', () => {
    render(<YoutubeEmbed videoId="dQw4w9WgXcQ" title="Test Video" />);

    const iframe = screen.getByTestId('techtalk-video-embed');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
    expect(iframe).toHaveAttribute('title', 'Test Video');
  });

  it('renders unavailable fallback when videoId is null', () => {
    render(<YoutubeEmbed videoId={null} title="No Video" />);

    expect(screen.getByTestId('techtalk-video-unavailable')).toHaveTextContent(
      'No video available for this Tech Talk.'
    );
    expect(screen.queryByTestId('techtalk-video-embed')).not.toBeInTheDocument();
  });
});
