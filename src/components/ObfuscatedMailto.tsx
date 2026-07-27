/**
 * ObfuscatedMailto
 * Renders a mailto link that assembles the email address only at click time,
 * preventing the plain address from appearing in initial HTML or accessibility trees.
 */

interface ObfuscatedMailtoProps {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  /** Overrides the default (Sinaida's) address. Assembled at click time only, same as the default. */
  address?: string;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function ObfuscatedMailto({
  label,
  className,
  style,
  address,
  onMouseEnter,
  onMouseLeave,
}: ObfuscatedMailtoProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Assemble address only on click, mirroring ContactSection.tsx pattern
    const resolved = address ?? ['gallant', '_mod5v', '@', 'icloud', '.com'].join('');
    window.location.href = `mailto:${resolved}`;
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
