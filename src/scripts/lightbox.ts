import { showDialog } from './dialogs';

interface Item {
  src: string;
  caption: string;
}

/** Full-screen photo viewer. Slides are a native scroll-snap strip, so swiping is the browser's own. */
export function initLightbox() {
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (!dlg) return;
  const track = dlg.querySelector<HTMLElement>('.lb-track')!;
  const caption = dlg.querySelector<HTMLElement>('.lb-caption')!;
  const count = dlg.querySelector<HTMLElement>('.lb-count')!;
  let items: Item[] = [];
  let index = 0;

  const slides = () => track.children as HTMLCollectionOf<HTMLElement>;

  function show(i: number) {
    index = Math.max(0, Math.min(items.length - 1, i));
    caption.textContent = items[index]?.caption ?? '';
    count.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    // load this photo and its neighbours
    for (let j = index - 1; j <= index + 1; j++) {
      const img = slides()[j]?.querySelector('img');
      if (img && !img.src) img.src = img.dataset.src!;
    }
  }

  function open(list: Item[], start: number) {
    items = list;
    track.replaceChildren(
      ...list.map((it) => {
        const fig = document.createElement('figure');
        fig.className = 'lb-slide';
        const img = document.createElement('img');
        img.alt = it.caption;
        img.decoding = 'async';
        img.dataset.src = it.src;
        fig.append(img);
        return fig;
      }),
    );
    showDialog(dlg!);
    show(start);
    track.scrollTo({ left: start * track.clientWidth, behavior: 'instant' });
    track.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-lightbox]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const set = a.dataset.lightbox!;
    const anchors = [...document.querySelectorAll<HTMLAnchorElement>(`a[data-lightbox="${CSS.escape(set)}"]`)].sort(
      (x, y) => Number(x.dataset.index) - Number(y.dataset.index),
    );
    open(
      anchors.map((x) => ({ src: x.href, caption: x.dataset.caption ?? '' })),
      anchors.indexOf(a),
    );
  });

  let ticking = false;
  track.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== index) show(i);
      });
    },
    { passive: true },
  );

  const step = (dir: number) => track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
  dlg.querySelector('.lb-prev')!.addEventListener('click', () => step(-1));
  dlg.querySelector('.lb-next')!.addEventListener('click', () => step(1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  dlg.addEventListener('close', () => track.replaceChildren());
}
