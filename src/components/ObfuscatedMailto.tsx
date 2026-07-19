/**
 * ObfuscatedMailto
 * Renders a mailto link that assembles the email address only at click time,
 * preventing the plain address from appearing in initial HTML or accessibility trees.
 */

// Address parts, kept split so the plain string never appears in source or
// initial DOM.
const EMAIL_PARTS = ['gallant', '_mod5v', '@', 'icloud', '.com'];

interface ObfuscatedMailtoProps {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function ObfuscatedMailto({
  label,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
}: ObfuscatedMailtoProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Assemble address only on click
    const address = EMAIL_PARTS.join('');
    window.location.href = `mailto:${address}`;
  };

  return (
    <a
      href="#"
      onClick={handleClick}
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </a>
  );
}
