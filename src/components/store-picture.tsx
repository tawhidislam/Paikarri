import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Upload } from 'lucide-react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { signedImage } from '@/lib/catalog';
import { prepareImageUpload } from '@/lib/image-upload';
import { randomUUID } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { Business } from '@/lib/models';
import { Notice } from './shared';
import { Button } from './ui/button';
import './store-picture.css';

export function StoreAvatar({
  business,
  name = business.name,
  className = '',
}: {
  business: Pick<Business, 'name'> & { profile_image_path?: string | null };
  name?: string;
  className?: string;
}) {
  const tr = useT();
  const [failed, setFailed] = useState<string>();
  const image = useQuery({
    queryKey: ['store-image', business.profile_image_path],
    enabled: !!business.profile_image_path,
    queryFn: () => signedImage(business.profile_image_path!, 'store-images'),
    staleTime: 240000,
    refetchInterval: 240000,
    refetchOnWindowFocus: 'always',
    retry: 1,
  });
  return (
    <div className={`store-avatar ${className}`}>
      {image.data && !image.isError && failed !== image.data ? (
        <img
          src={image.data}
          alt={`${tr('Store picture')}: ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(image.data)}
        />
      ) : (
        <span aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function StorePictureEditor({ business }: { business: Business }) {
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const [saved, setSaved] = useState('');
  const [size, setSize] = useState<{ before: number; after: number }>();
  const save = useMutation({
    mutationFn: async (file: File | null) => {
      setSaved('');
      setSize(undefined);
      const previous = business.profile_image_path ?? null;
      let path: string | null = null;
      let compression: { before: number; after: number } | undefined;
      if (file) {
        const prepared = await prepareImageUpload(file, 'store-images');
        compression = { before: file.size, after: prepared.size };
        path = `${session!.user.id}/${business.id}/${randomUUID()}.webp`;
        const uploaded = await db().storage.from('store-images').upload(path, prepared, {
          contentType: 'image/webp',
          upsert: false,
          cacheControl: '300',
        });
        if (uploaded.error) throw uploaded.error;
      }
      const result = await db().rpc('set_store_picture', {
        target: business.id,
        expected_path: previous,
        new_path: path,
      });
      if (result.error) {
        if (path) await db().storage.from('store-images').remove([path]);
        throw result.error;
      }
      if (previous) await db().storage.from('store-images').remove([previous]);
      return { compression, removed: !file };
    },
    onSuccess: async ({ compression, removed }) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['own-business'] }),
        cache.invalidateQueries({ queryKey: ['businesses'] }),
        cache.invalidateQueries({ queryKey: ['homepage-suppliers'] }),
        cache.invalidateQueries({ queryKey: ['admin-supplier'] }),
      ]);
      setSize(compression);
      setSaved(tr(removed ? 'Store picture removed.' : 'Store picture saved.'));
    },
  });
  return (
    <section className="panel store-picture-editor" aria-label={tr('Store profile picture')}>
      <StoreAvatar business={business} className="store-editor-avatar" />
      <div className="store-picture-content">
        <h2>
          <ImagePlus size={19} />
          {tr('Store profile picture')}
        </h2>
        <p>
          {tr(
            'Upload your store logo or business picture. It appears on your public storefront and supplier cards.',
          )}
        </p>
        <p className="store-picture-help">
          {tr(
            'JPEG, PNG or WebP up to 20 MB. Optimized to WebP, at most 512px and 256 KB before upload.',
          )}
        </p>
        <div className="store-picture-actions">
          <label className={`upload-input ${save.isPending ? 'is-pending' : ''}`}>
            <Upload size={16} />
            {tr(
              save.isPending
                ? 'Optimizing & uploading…'
                : business.profile_image_path
                  ? 'Replace store picture'
                  : 'Upload store picture',
            )}
            <input
              type="file"
              aria-label={tr('Choose store picture')}
              accept="image/jpeg,image/png,image/webp"
              disabled={save.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) save.mutate(file);
              }}
            />
          </label>
          {business.profile_image_path && (
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => save.mutate(null)}
            >
              {tr('Remove picture')}
            </Button>
          )}
        </div>
        <Notice error={save.error} success={saved} />
        {size && (
          <p className="store-picture-help">
            {tr('Upload size')}: {Math.ceil(size.before / 1024)} KB →{' '}
            {Math.max(1, Math.ceil(size.after / 1024))} KB
          </p>
        )}
      </div>
    </section>
  );
}
