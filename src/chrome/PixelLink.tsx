import { useId } from 'react';
import type { ReactNode } from 'react';
import { PixelIcon } from './PixelIcon';
import type { PixelIconName } from './PixelIcon';

/** A GENESIS-style pixel button that navigates. The visible label is the accessible name; the hint describes it. */
export function PixelLink({ href, icon, label, hint, tone = 'lime', main = false, disabled = false, children }: {
  href?: string; icon: PixelIconName; label: string; hint: ReactNode; tone?: 'lime' | 'violet' | 'pink';
  main?: boolean; disabled?: boolean; children?: ReactNode;
}) {
  const hintId = useId();
  const body = (
    <>
      <span className="ic"><PixelIcon name={icon} /></span>
      <span className="tx"><b>{label}</b><small id={hintId}>{hint}</small>{children}</span>
      <span className="ar" aria-hidden="true">&gt;&gt;</span>
    </>
  );
  const className = `pb pb-${tone}${main ? ' pb-main' : ''}`;
  return (
    <li>
      {disabled || !href
        ? <span className={className} aria-disabled="true" aria-label={label} aria-describedby={hintId}>{body}</span>
        : <a className={className} href={href} aria-label={label} aria-describedby={hintId}>{body}</a>}
    </li>
  );
}
