import React from 'react';

// Class merger utility (simple tailwind merge alternative)
const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};

// 1. SketchCard
export interface SketchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tilt?: 'left' | 'right' | 'none';
  highlightColor?: 'yellow' | 'coral' | 'teal' | 'none';
}

export const SketchCard: React.FC<SketchCardProps> = ({
  children,
  className,
  tilt = 'none',
  highlightColor = 'none',
  ...props
}) => {
  const tiltClass = 
    tilt === 'left' ? 'rotate-[-0.6deg]' : 
    tilt === 'right' ? 'rotate-[0.6deg]' : '';
  
  const highlightClass = 
    highlightColor === 'yellow' ? 'marker-yellow' :
    highlightColor === 'coral' ? 'marker-coral' :
    highlightColor === 'teal' ? 'marker-teal' : '';

  return (
    <div
      className={cn(
        'sketch-card p-6 relative',
        tiltClass,
        highlightClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 2. SketchButton
export interface SketchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  thick?: boolean;
}

export const SketchButton: React.FC<SketchButtonProps> = ({
  children,
  className,
  variant = 'primary',
  thick = false,
  ...props
}) => {
  const baseClass = thick ? 'sketch-button-thick font-bold px-5 py-2.5' : 'sketch-button px-4 py-2 text-sm';
  
  const variantClass = 
    variant === 'primary' ? 'bg-route-teal text-white hover:bg-route-teal/90' :
    variant === 'secondary' ? 'bg-paper text-ink hover:bg-line-gray/20' :
    variant === 'accent' ? 'bg-transit-gold text-ink hover:bg-transit-gold/90' :
    variant === 'danger' ? 'bg-signal-coral text-white hover:bg-signal-coral/90' : '';

  return (
    <button
      className={cn(
        baseClass,
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// 3. SketchInput
export interface SketchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const SketchInput: React.FC<SketchInputProps> = ({
  className,
  label,
  error,
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col space-y-1 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-bold font-display uppercase tracking-widest text-ink block pl-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'sketch-input px-3 py-2 text-sm placeholder-slate/50 font-sans w-full',
          error ? 'border-signal-coral focus:border-signal-coral focus:box-shadow-0' : '',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-[11px] font-mono text-signal-coral pl-1">
          * {error}
        </span>
      )}
    </div>
  );
};

// 4. SketchBadge
export interface SketchBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'teal' | 'coral' | 'gold' | 'slate' | 'ink';
}

export const SketchBadge: React.FC<SketchBadgeProps> = ({
  children,
  className,
  color = 'slate',
  ...props
}) => {
  const colorClass = 
    color === 'teal' ? 'bg-route-teal/10 text-route-teal border-route-teal/40' :
    color === 'coral' ? 'bg-signal-coral/10 text-signal-coral border-signal-coral/40' :
    color === 'gold' ? 'bg-transit-gold/15 text-transit-gold border-transit-gold/40' :
    color === 'ink' ? 'bg-ink/5 text-ink border-ink/40' :
    'bg-slate/10 text-slate border-slate/40';

  return (
    <span
      className={cn(
        'sketch-badge inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold font-display uppercase tracking-wider',
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// 5. SVG Doodles for visual charm
export const DoodleUnderline: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 100 10" 
    preserveAspectRatio="none" 
    className={cn("w-full h-2 text-signal-coral pointer-events-none", className)}
  >
    <path 
      d="M 2 8 C 30 3, 60 2, 98 6 C 70 8, 40 8, 12 7" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
  </svg>
);

export const DoodleCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 50 50" 
    preserveAspectRatio="none" 
    className={cn("w-12 h-12 text-transit-gold pointer-events-none", className)}
  >
    <path 
      d="M 25 5 C 38 4, 46 15, 45 28 C 44 38, 30 47, 18 45 C 8 43, 4 30, 6 18 C 8 8, 20 4, 28 6 C 34 8, 37 12, 38 18" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

export const DoodleArrow: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 40 30" 
    preserveAspectRatio="none" 
    className={cn("w-10 h-8 text-route-teal pointer-events-none", className)}
  >
    <path 
      d="M 5 15 Q 18 6, 32 12 M 32 12 L 23 8 M 32 12 L 27 22" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

export const DoodleStar: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={cn("w-6 h-6 text-transit-gold pointer-events-none", className)}
  >
    <path 
      d="M 12 2 L 15 9 L 22 9 L 17 14 L 19 21 L 12 17 L 5 21 L 7 14 L 2 9 L 9 9 Z" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinejoin="round" 
      strokeLinecap="round" 
    />
  </svg>
);
