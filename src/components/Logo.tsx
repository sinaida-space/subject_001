import logoImg from '@/assets/logo-sinaida.png';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logoImg} alt="Sinaida logo" className="h-8 w-8 invert" />
      <span className="font-display text-lg font-light tracking-widest text-foreground uppercase">
        sin<span className="text-primary">.</span>ai<span className="text-primary">.</span>da
      </span>
    </div>
  );
}
