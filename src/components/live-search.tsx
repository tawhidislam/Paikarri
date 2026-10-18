import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { growthDb } from '@/lib/growth';
import { useAuth } from '@/lib/auth';
import { ArrowRight, Search, X, LoaderCircle, Tags } from 'lucide-react';
import { normalizeSearch, searchHref, searchSuggestions } from '@/lib/search';
import { configured } from '@/lib/supabase';
import { useLocale, useT } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { formatQuantity, formatUnit } from '@/lib/units';
import { ProductImage } from './product-card';
import './live-search.css';
function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return index < 0 ? (
    <>{text}</>
  ) : (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
export function LiveSearch({ onNavigate }: { onNavigate: () => void }) {
  const { locale, t } = useLocale();
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const routeQuery =
    location.pathname === '/products' ? (new URLSearchParams(location.search).get('q') ?? '') : '';
  const [q, setQ] = useState(routeQuery);
  // A lazy route can commit after the visitor has already started another query.
  const pendingNavigation = useRef<{ edited: boolean } | null>(null);
  const unsubmittedEdit = useRef(false);
  const editQuery = (value: string) => {
    unsubmittedEdit.current = true;
    if (pendingNavigation.current) pendingNavigation.current.edited = true;
    setQ(value);
  };
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const composition = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const term = normalizeSearch(q);
  const enough = [...term].length >= 2;
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(timer);
  }, [term]);
  useLayoutEffect(() => {
    const pending = pendingNavigation.current;
    pendingNavigation.current = null;
    // Category links can also suspend while their lazy route loads. Preserve a
    // fresh, focused edit made during that navigation, but always honor history.
    if (
      navigationType !== 'POP' &&
      (pending?.edited || (unsubmittedEdit.current && document.activeElement === input.current))
    )
      return;
    unsubmittedEdit.current = false;
    setOpen(false);
    setActive(null);
    setQ(routeQuery);
  }, [location.key, routeQuery, navigationType]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!form.current?.contains(e.target as Node)) {
        setOpen(false);
        setActive(null);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const suggestions = useQuery({
    queryKey: ['search-suggestions', debounced],
    enabled: configured && open && enough && term === debounced && !composing,
    queryFn: ({ signal }) => searchSuggestions(debounced, signal),
    staleTime: 15000,
    gcTime: 60000,
    retry: 1,
  });
  const settled = term === debounced && !composing;
  const data = settled && enough && !suggestions.isError ? suggestions.data : undefined;
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const history = useQuery({
    queryKey: ['search-history', session?.user.id],
    enabled: !!session && open && !term,
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('search_history', {});
      if (error) throw error;
      return z.array(z.string()).max(10).parse(data);
    },
  });
  const saveSearch = (href: string) => {
    const search = new URL(href, window.location.origin).searchParams.get('q');
    if (session && search && normalizeSearch(search).length >= 2) {
      void growthDb()
        .rpc('search_history', { operation: 'record', query_text: normalizeSearch(search) })
        .then(({ error }) => {
          if (!error)
            void cache.invalidateQueries({ queryKey: ['search-history', session.user.id] });
        });
    }
  };
  const options = [
    ...(!term
      ? (history.data ?? []).map((query) => ({
          href: searchHref(query),
          kind: 'history' as const,
          query,
        }))
      : []),
    ...products.map((p) => ({ href: `/products/${p.id}`, kind: 'product' as const, product: p })),
    ...categories.map((c) => ({
      href: `/products?category=${encodeURIComponent(c.slug)}`,
      kind: 'category' as const,
      category: c,
    })),
    ...(term ? [{ href: searchHref(term), kind: 'all' as const }] : []),
  ];
  const activeIndex = options.findIndex((o) => o.href === active);
  const busy = enough && (!settled || suggestions.isFetching);
  const visible = open && !composing;
  const go = (href: string) => {
    saveSearch(href);
    unsubmittedEdit.current = false;
    pendingNavigation.current = { edited: false };
    setOpen(false);
    setActive(null);
    onNavigate();
    navigate(href);
  };
  return (
    <form
      className="header-search live-search"
      role="search"
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!composition.current) go(searchHref(q));
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setActive(null);
        }
      }}
    >
      <Search size={19} aria-hidden="true" />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label={t.search}
        placeholder={t.search}
        autoComplete="off"
        maxLength={160}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={visible}
        aria-controls={visible ? `${id}-list` : undefined}
        aria-activedescendant={
          visible && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        value={q}
        onChange={(e) => {
          editQuery(e.target.value);
          setActive(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onCompositionStart={() => {
          composition.current = true;
          setComposing(true);
        }}
        onCompositionEnd={(e) => {
          composition.current = false;
          setComposing(false);
          editQuery(e.currentTarget.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || composition.current) {
            if (e.key === 'Enter') e.preventDefault();
            return;
          }
          if (e.key === 'Escape') {
            if (open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setActive(null);
            }
            return;
          }
          if (e.key === 'Tab') {
            setOpen(false);
            setActive(null);
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            if (options.length) {
              const next =
                e.key === 'ArrowDown'
                  ? (activeIndex + 1) % options.length
                  : activeIndex <= 0
                    ? options.length - 1
                    : activeIndex - 1;
              setActive(options[next].href);
              requestAnimationFrame(() =>
                document
                  .getElementById(`${id}-option-${next}`)
                  ?.scrollIntoView({ block: 'nearest' }),
              );
            }
            return;
          }
          if (e.key === 'Enter' && open && activeIndex >= 0) {
            e.preventDefault();
            go(options[activeIndex].href);
          }
        }}
      />
      {q && (
        <button
          className="live-search-clear"
          type="button"
          aria-label={tr('Clear search')}
          onClick={() => {
            editQuery('');
            setActive(null);
            setOpen(true);
            input.current?.focus();
          }}
        >
          <X size={17} />
        </button>
      )}
      <button className="live-search-submit" type="submit">
        {t.searchButton}
      </button>
      {visible && (
        <div className="live-search-panel">
          <div className="live-search-heading">
            <span>{tr('Search suggestions')}</span>
            <button
              type="button"
              aria-label={tr('Close search suggestions')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                input.current?.focus();
                setOpen(false);
                setActive(null);
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="live-search-status" role="status" aria-live="polite">
            {!enough ? (
              <>
                <Search size={16} />
                {tr(
                  term
                    ? 'Type at least two characters'
                    : 'Search products, categories or suppliers',
                )}
              </>
            ) : busy ? (
              <>
                <LoaderCircle size={16} className="live-search-spinner" />
                {tr('Searching products…')}
              </>
            ) : suggestions.isError ? (
              <>{tr('Suggestions are temporarily unavailable.')}</>
            ) : products.length || categories.length ? (
              <>
                {products.length.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}{' '}
                {tr('product suggestions')} · {categories.length} {tr('category suggestions')}
              </>
            ) : (
              tr('No matches. Try another name or search all products.')
            )}
          </div>
          {enough && settled && suggestions.isError && (
            <button
              type="button"
              className="live-search-retry"
              onClick={() => void suggestions.refetch()}
            >
              {tr('Try again')}
            </button>
          )}
          <ul
            role="listbox"
            id={`${id}-list`}
            aria-label={tr('Search suggestions')}
            aria-busy={busy}
          >
            {options.map((o, index) => (
              <li key={o.href} role="presentation">
                <Link
                  to={o.href}
                  tabIndex={-1}
                  role="option"
                  aria-selected={active === o.href}
                  id={`${id}-option-${index}`}
                  className={`live-search-option ${o.kind === 'all' ? 'live-search-all' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActive(o.href)}
                  onClick={() => {
                    saveSearch(o.href);
                    pendingNavigation.current = { edited: false };
                    setOpen(false);
                    setActive(null);
                    onNavigate();
                  }}
                >
                  {o.kind === 'product' ? (
                    <>
                      <span className="live-search-thumb">
                        <ProductImage path={o.product.image ?? undefined} alt="" />
                      </span>
                      <span className="live-search-product">
                        <strong>
                          <Highlight
                            text={
                              locale === 'bn' && o.product.name_bn
                                ? o.product.name_bn
                                : o.product.name
                            }
                            query={term}
                          />
                        </strong>
                        <small>
                          {locale === 'bn' && o.product.supplier_name_bn
                            ? o.product.supplier_name_bn
                            : o.product.supplier_name}
                        </small>
                        <small>
                          {tr('Minimum order')}:{' '}
                          {formatQuantity(o.product.moq, o.product.unit, locale)}
                        </small>
                      </span>
                      <span className="live-search-price">
                        <strong>{money(o.product.price, locale)}</strong>
                        <small>/ {formatUnit(o.product.unit, 1, locale)}</small>
                      </span>
                    </>
                  ) : o.kind === 'category' ? (
                    <>
                      <span className="live-search-category-icon">
                        <Tags size={18} />
                      </span>
                      <span className="live-search-product">
                        <strong>
                          <Highlight
                            text={
                              locale === 'bn' && o.category.name_bn
                                ? o.category.name_bn
                                : o.category.name
                            }
                            query={term}
                          />
                        </strong>
                        <small>{t.categories}</small>
                      </span>
                      <ArrowRight size={16} />
                    </>
                  ) : (
                    <>
                      <Search size={17} />
                      <span>
                        {tr(o.kind === 'history' ? 'Recent search' : 'Search all products')}
                        <strong>“{o.kind === 'history' ? o.query : term}”</strong>
                      </span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {!term && history.data?.length ? (
            <button
              type="button"
              className="live-search-retry"
              onClick={() => {
                void growthDb()
                  .rpc('search_history', { operation: 'clear' })
                  .then(({ error }) => {
                    if (!error) cache.setQueryData(['search-history', session?.user.id], []);
                  });
              }}
            >
              {tr('Clear search history')}
            </button>
          ) : null}
          <div className="live-search-hint">
            {tr('Use arrow keys to explore, Enter to select, Escape to close.')}
          </div>
        </div>
      )}
    </form>
  );
}
