import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatImageUrl } from '@/lib/chat-images';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
export function ChatImage({ id, monitorAccess }: { id: string; monitorAccess?: string }) {
  const tr = useT();
  const [broken, setBroken] = useState(false);
  const { session } = useAuth();
  const image = useQuery({
    queryKey: ['chat-image', session?.user.id, id, monitorAccess],
    queryFn: () => chatImageUrl(id, monitorAccess),
    staleTime: 240000,
    refetchInterval: 240000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  if (image.isPending) return <p role="status">{tr('Loading image…')}</p>;
  if (image.error || !image.data || broken)
    return (
      <button
        type="button"
        className="chat-image-retry"
        onClick={async () => {
          await image.refetch();
          setBroken(false);
        }}
      >
        {tr('Retry image')}
      </button>
    );
  return (
    <a
      className="chat-image-link"
      href={image.data.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tr('Open full image')}
    >
      <img
        src={image.data.url}
        alt={tr('Shared chat image')}
        width={image.data.width}
        height={image.data.height}
        loading="lazy"
        onError={() => setBroken(true)}
        onLoad={(e) => {
          e.currentTarget.hidden = false;
        }}
      />
      <span>{tr('Open full image')}</span>
    </a>
  );
}
