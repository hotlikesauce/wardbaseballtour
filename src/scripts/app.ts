import { wireDialogs } from './dialogs';
import { initLightbox } from './lightbox';
import { initClips } from './clips';
import type { JourneyMap, MapData, ParkPoint, ChapterInfo } from './map';

wireDialogs();
initLightbox();
initClips();

const shell = document.querySelector<HTMLElement>('.map-shell');
const mapEl = document.getElementById('map');
const articles = [...document.querySelectorAll<HTMLElement>('.chapter')];

if (shell && mapEl && articles.length) {
  const hudYear = shell.querySelector<HTMLElement>('.hud-year')!;
  const hudTitle = shell.querySelector<HTMLElement>('.hud-title')!;
  const hudCount = shell.querySelector<HTMLElement>('.hud-count')!;
  const status = shell.querySelector<HTMLElement>('.map-status')!;
  const tourBtn = shell.querySelector<HTMLButtonElement>('[data-action="tour"]')!;

  const articleById = new Map(articles.map((a) => [a.dataset.trip!, a]));
  let jm: JourneyMap | null = null;
  let data: MapData | null = null;
  let current: string | null = null;
  let touring = false;
  let tourGen = 0; // only ever goes up; a running tour quits when this moves past its token
  let focusTimer = 0;

  /* ---------- HUD ---------- */
  const parksSoFar = new Map<string, number>();
  const fillHud = (chapters: ChapterInfo[]) => {
    const seen = new Set<number>();
    for (const c of chapters) {
      c.q.forEach((q) => seen.add(q));
      parksSoFar.set(c.id, seen.size);
    }
  };

  function hud(c: ChapterInfo | null) {
    if (!c) {
      hudYear.textContent = 'All';
      hudTitle.textContent = 'trips';
      hudCount.textContent = data ? `${data.chapters.length} trips` : '';
      return;
    }
    hudYear.textContent = c.kind === 'home' ? 'HOU' : String(c.year);
    hudTitle.textContent = c.title;
    hudCount.textContent =
      c.kind === 'bonus' ? 'Not part of the 30' :
      c.kind === 'epilogue' ? 'Not part of the 30' :
      `${parksSoFar.get(c.id) ?? 0} of 30 parks`;
  }

  const chapterInfo = (id: string) => data?.chapters.find((c) => c.id === id) ?? null;

  /* ---------- scroll → map ---------- */
  function activate(id: string) {
    if (id === current) return;
    current = id;
    for (const a of articles) a.classList.toggle('is-active', a.dataset.trip === id);
    if (touring || !jm) return;
    clearTimeout(focusTimer);
    // let fast scrolling settle before flying the camera
    focusTimer = window.setTimeout(() => {
      if (touring) return;
      jm?.focus(id);
      hud(chapterInfo(id));
    }, 160);
  }

  const wide = matchMedia('(min-width: 1024px)');
  let io: IntersectionObserver | null = null;
  function observe() {
    io?.disconnect();
    // a thin trigger line: just under the pinned map on phones, mid-screen on desktop
    const rootMargin = wide.matches ? '-45% 0px -54% 0px' : '-60% 0px -39% 0px';
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) activate((e.target as HTMLElement).dataset.trip!);
      },
      { rootMargin },
    );
    articles.forEach((a) => io!.observe(a));
  }
  observe();
  wide.addEventListener('change', observe);

  /* ---------- map → page ---------- */
  function goTo(tripId: string, parkId?: string) {
    const article = articleById.get(tripId);
    if (!article) return;
    const target = parkId ? article.querySelector<HTMLElement>(`.stop[data-park="${parkId}"]`) ?? article : article;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (target !== article) {
      target.classList.remove('flash');
      void target.offsetWidth;
      target.classList.add('flash');
    }
  }

  function onPark(p: ParkPoint) {
    stopTour(false);
    const trip = current && p.trips.includes(current) ? current : p.trips[0];
    if (trip === current) jm?.flyToPark(p.id);
    goTo(trip, p.id);
  }

  /* ---------- tour ---------- */
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function tour() {
    if (!jm || !data) return;
    clearTimeout(focusTimer);
    const token = ++tourGen;
    touring = true;
    tourBtn.setAttribute('aria-pressed', 'true');
    for (const c of data.chapters) {
      if (tourGen !== token) return;
      const ms = jm.focus(c.id);
      hud(c);
      await sleep(Math.max(2400, ms + 1000));
    }
    if (tourGen === token) stopTour(true);
  }

  function stopTour(finished: boolean) {
    if (!touring) return;
    touring = false;
    tourGen++;
    tourBtn.setAttribute('aria-pressed', 'false');
    if (!jm) return;
    if (finished) {
      jm.overview();
      hud(null);
    } else if (current) {
      jm.focus(current);
      hud(chapterInfo(current));
    }
  }

  shell.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action || !jm) return;
    clearTimeout(focusTimer);
    if (action === 'tour') return touring ? stopTour(false) : void tour();
    stopTour(false);
    if (action === 'replay') {
      // focus, not replay: after an overview the map has no trip selected to replay
      if (current) {
        jm.focus(current);
        hud(chapterInfo(current));
      }
    } else if (action === 'overview') {
      jm.overview();
      hud(null);
    }
  });

  // "Aerial" buttons in each stop
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-fly]');
    if (!btn || !jm) return;
    stopTour(false);
    const article = btn.closest<HTMLElement>('.chapter');
    if (article && article.dataset.trip !== current) {
      // select that trip (route, pins, HUD) first; the park fly-in then takes over the camera
      activate(article.dataset.trip!);
      clearTimeout(focusTimer);
      jm.focus(article.dataset.trip!);
      hud(chapterInfo(article.dataset.trip!));
    }
    jm.flyToPark(btn.dataset.fly!);
  });

  /* ---------- load the map when the journey gets close ---------- */
  const loader = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      loader.disconnect();
      shell.dataset.state = 'loading';
      try {
        const [{ createMap }, res] = await Promise.all([import('./map'), fetch('/map.json')]);
        data = (await res.json()) as MapData;
        fillHud(data.chapters);
        jm = await createMap(mapEl, shell, data, {
          onPark,
          onTrip: (id) => {
            stopTour(false);
            goTo(id);
          },
          onUserMove: () => stopTour(false),
        });
        shell.dataset.state = 'ready';
        if (current) {
          jm.focus(current);
          hud(chapterInfo(current));
        } else hud(null);
      } catch (err) {
        console.error(err);
        shell.dataset.state = 'error';
        status.textContent = 'The map couldn’t load here. Everything else still works.';
      }
    },
    { rootMargin: '900px 0px' },
  );
  loader.observe(shell);
}
