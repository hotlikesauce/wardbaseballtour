/**
 * Open a modal <dialog> and give it a history entry, so the Android back button
 * (or a back swipe) closes the dialog instead of leaving the page.
 */
export function showDialog(dlg: HTMLDialogElement) {
  if (dlg.open) return;
  dlg.showModal();
  history.pushState({ dialog: dlg.id }, '');

  const onPop = () => {
    if (dlg.open) dlg.close();
  };
  window.addEventListener('popstate', onPop);
  dlg.addEventListener(
    'close',
    () => {
      window.removeEventListener('popstate', onPop);
      if (history.state?.dialog === dlg.id) history.back();
    },
    { once: true },
  );
}

/** Wire [data-close] buttons and backdrop clicks for every dialog on the page. */
export function wireDialogs() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    const closer = target.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
    else if (target instanceof HTMLDialogElement && target.open) target.close();
  });
}
