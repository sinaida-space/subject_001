import { useEffect } from 'react';

// The actual cursor is a plain CSS-recolored arrow (see index.css,
// `body.has-custom-cursor`) — a static image the browser paints itself, not
// a JS-driven blob. This component's only job is flagging that class on
// fine-pointer devices; touch/coarse pointers keep the native cursor.
export default function CustomCursor() {
  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    if (!mql.matches) return;
    document.body.classList.add('has-custom-cursor');
    return () => document.body.classList.remove('has-custom-cursor');
  }, []);

  return null;
}
