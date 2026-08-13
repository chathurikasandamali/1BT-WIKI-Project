interface YoutubeEmbedProps {
  videoId: string | null;
  title: string;
}

function isValidYoutubeVideoId(value: string | null): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(value);
}

export function YoutubeEmbed({ videoId, title }: YoutubeEmbedProps) {
  if (!isValidYoutubeVideoId(videoId)) {
    return (
      <div
        data-testid="techtalk-video-unavailable"
        className="aspect-video flex items-center justify-center bg-brand-surface border border-brand-border rounded text-brand-text-secondary text-sm"
      >
        No video available for this Tech Talk.
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded">
      <iframe
        data-testid="techtalk-video-embed"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        className="w-full h-full rounded"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
