import { useState } from 'react';
import { navigate } from '../chrome/route';
import { useT } from '../i18n/i18n';

/** On the closing card: keep the finished visit in the library, then go and see it there. */
export function SaveToLibrary({ save }: { save: () => Promise<unknown> }) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  async function keep() {
    setState('saving');
    try {
      await save();
      setState('saved');
    } catch {
      setState('failed');
    }
  }

  if (state === 'saved') {
    return (
      <>
        <p className="closing-saved">{t('Saved to your library.')}</p>
        <button type="button" onClick={() => navigate('/library')}>{t('Open library')}</button>
      </>
    );
  }
  return (
    <>
      <button type="button" className="closing-save" disabled={state === 'saving'} onClick={keep}>
        {state === 'saving' ? t('Saving…') : t('Save to library')}
      </button>
      {state === 'failed' && <p role="alert">{t('This browser could not save it. Try again from the menu.')}</p>}
    </>
  );
}
