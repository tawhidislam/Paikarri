import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Minus, Plus, X } from 'lucide-react';
import { ProductImage, SaveProduct } from '../product-card';
import { useT } from '@/lib/i18n';
export function ProductGallery({
  images,
  name,
  id,
  selectedImage,
}: {
  images: { id: string; path: string }[];
  name: string;
  id: string;
  selectedImage?: string | null;
}) {
  const tr = useT();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const index = images.findIndex((i) => i.id === selectedImage);
    if (index >= 0) {
      setActive(index);
      setZoom(1);
    }
  }, [selectedImage, images]);
  const close = () => {
    dialog.current?.close();
    setZoom(1);
    trigger.current?.focus();
  };
  const move = (n: number) => {
    setActive((v) => (v + n + images.length) % images.length);
    setZoom(1);
  };
  useEffect(() => {
    const body = document.body;
    const d = dialog.current;
    const restore = () => {
      body.style.overflow = '';
      trigger.current?.focus();
    };
    d?.addEventListener('close', restore);
    return () => {
      d?.removeEventListener('close', restore);
      restore();
    };
  }, []);
  return (
    <div className="pd-gallery">
      <div className="detail-image">
        <ProductImage path={images[active]?.path} alt={name} />
        <SaveProduct id={id} />
        {!!images.length && (
          <button
            ref={trigger}
            className="pd-expand"
            onClick={() => {
              setZoom(1);
              document.body.style.overflow = 'hidden';
              if (!dialog.current?.open) {
                dialog.current?.showModal();
              }
            }}
            aria-label={tr('Open fullscreen gallery')}
          >
            <Expand size={19} />
            {tr('View images')}
          </button>
        )}
      </div>
      <div className="image-thumbs">
        {images.map((image, i) => (
          <button
            key={image.id}
            className={i === active ? 'active' : ''}
            onClick={() => {
              setActive(i);
              setZoom(1);
            }}
            aria-label={`${tr('View product image')} ${i + 1}`}
            aria-pressed={i === active}
          >
            <ProductImage path={image.path} alt={`${name} · ${i + 1}`} />
          </button>
        ))}
      </div>
      <dialog
        className="pd-lightbox"
        ref={dialog}
        aria-label={tr('Product image gallery')}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            move(e.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        <div className="pd-lightbox-toolbar">
          <span>
            {active + 1} / {images.length}
          </span>
          <button
            aria-label={tr('Zoom out')}
            disabled={zoom === 1}
            onClick={() => setZoom((v) => Math.max(1, v - 0.5))}
          >
            <Minus />
          </button>
          <button
            aria-label={tr('Zoom in')}
            disabled={zoom === 3}
            onClick={() => setZoom((v) => Math.min(3, v + 0.5))}
          >
            <Plus />
          </button>
          <button aria-label={tr('Close gallery')} onClick={close}>
            <X />
          </button>
        </div>
        <div className="pd-lightbox-stage">
          <div style={{ width: `${zoom * 100}%`, minHeight: '100%' }}>
            <ProductImage path={images[active]?.path} alt={`${name} · ${active + 1}`} />
          </div>
        </div>
        <div className="pd-lightbox-navigation">
          <button
            aria-label={tr('Previous image')}
            onClick={() => move(-1)}
            disabled={images.length < 2}
          >
            <ChevronLeft />
          </button>
          <span>{tr('Use arrow keys to browse')}</span>
          <button
            aria-label={tr('Next image')}
            onClick={() => move(1)}
            disabled={images.length < 2}
          >
            <ChevronRight />
          </button>
        </div>
      </dialog>
    </div>
  );
}
