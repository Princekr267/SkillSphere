import React from 'react';

// Reusable Retro-pop flat Pill Badge tag
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'amber' | 'teal' | 'coral' | 'pink' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-display font-bold px-2.5 py-0.5 border-2 border-ink rounded-full text-[10px] uppercase tracking-wider';
  
  const variants = {
    amber: 'bg-accent-amber text-ink',
    teal: 'bg-accent-teal text-ink',
    coral: 'bg-accent-coral text-ink',
    pink: 'bg-accent-pink text-ink',
    outline: 'bg-cream text-ink',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
