import { showDialog } from './dialogs';

interface Clip {
  title: string;
  desc?: string;
  duration?: string;
  thumb?: string;
  url: string;
}

/** MLB highlight player. Clip lists load on first use from /highlights.json. */
export function initClips() {
  const dlg = document.getElementById('clips') as HTMLDialogElement | null;
  if (!dlg) return;
  const title = dlg.querySelector<HTMLElement>('#clips-title')!;
  const video = dlg.querySelector<HTMLVideoElement>('video')!;
  const desc = dlg.querySelector<HTMLElement>('.cl-desc')!;
  const list = dlg.querySelector<HTMLOListElement>('.cl-list')!;
  let data: Promise<Record<string, Clip[]>> | null = null;
  let clips: Clip[] = [];
  let seq = 0; // bumps on every open and close, so a slow fetch can't start a clip in a closed dialog

  const load = () =>
    (data ??= fetch('/highlights.json').then((r) => {
      if (!r.ok) throw new Error(`highlights.json ${r.status}`);
      return r.json();
    }).catch((e) => {
      data = null; // let the next tap retry
      throw e;
    }));

  function play(i: number) {
    const clip = clips[i];
    if (!clip) return;
    video.src = clip.url;
    if (clip.thumb) video.poster = clip.thumb;
    desc.textContent = clip.desc ?? clip.title;
    list.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
    video.play().catch(() => {
      /* autoplay refused; the controls are right there */
    });
  }

  function render() {
    list.replaceChildren(
      ...clips.map((c, i) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = '';
        if (c.thumb) img.src = c.thumb;
        const t = document.createElement('span');
        t.className = 'cl-t';
        t.textContent = c.title;
        const d = document.createElement('span');
        d.className = 'cl-d';
        d.textContent = c.duration ?? '';
        b.append(img, t, d);
        b.addEventListener('click', () => play(i));
        li.append(b);
        return li;
      }),
    );
  }

  // Each clip rolls into the next
  video.addEventListener('ended', () => {
    const i = [...list.querySelectorAll('button')].findIndex((b) => b.getAttribute('aria-current') === 'true');
    if (i >= 0 && i < clips.length - 1) play(i + 1);
  });

  document.addEventListener('click', async (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('button[data-clips]');
    if (!btn) return;
    title.textContent = btn.dataset.title ?? 'Highlights';
    desc.textContent = 'Loading…';
    clips = [];
    list.replaceChildren();
    showDialog(dlg);
    const req = ++seq;
    try {
      const all = await load();
      if (req !== seq || !dlg.open) return;
      clips = all[btn.dataset.clips!] ?? [];
      render();
      play(0);
    } catch {
      if (req !== seq) return;
      desc.textContent = 'Couldn’t load the highlight list.';
    }
  });

  dlg.addEventListener('close', () => {
    seq++;
    video.pause();
    video.removeAttribute('src');
    video.removeAttribute('poster');
    video.load();
  });
}
