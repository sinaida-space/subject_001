/**
 * ObfuscatedMailto
 * Renders a mailto link that assembles the email address only at click time,
 * preventing the plain address from appearing in initial HTML or accessibility trees.
 */

interface ObfuscatedMailtoProps {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Overrides the default (Sinaida's) address, as fragments joined at click time.
   * Fragments rather than a whole string on purpose: a complete address passed as
   * a prop stays out of the DOM but is still readable in plain text in the compiled
   * JS bundle, which is where scrapers look. Split it so no contiguous address exists
   * in the shipped output, e.g. ['name', '@', 'provider', '.com'].
   */
  addressParts?: string[];
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function ObfuscatedMailto({
  label,
  className,
  style,
  addressParts,
  onMouseEnter,
  onMouseLeave,
}: ObfuscatedMailtoProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Assemble address only on click, mirroring ContactSection.tsx pattern
    const resolved = (addressParts ?? ['gallant', '_mod5v', '@', 'icloud', '.com']).join('');
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
