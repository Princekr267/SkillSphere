import React from 'react';

// Reusable Retro-pop Card component with flat offset borders
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
  variant?: 'default' | 'cream' | 'amber' | 'teal' | 'pink' | 'coral';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverLift = false,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantBgs: Record<string, string> = {
    default: 'bg-cream',
    cream: 'bg-cream',
    amber: 'bg-accent-amber/25 dark:bg-accent-amber/20',
    teal: 'bg-accent-teal/25 dark:bg-accent-teal/20',
    pink: 'bg-accent-pink/25 dark:bg-accent-pink/20',
    coral: 'bg-accent-coral/25 dark:bg-accent-coral/20',
  };

  const bgClass = className.includes('bg-') ? '' : variantBgs[variant] || 'bg-cream';
  const liftStyles = hoverLift ? 'transition-all duration-200 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-retro' : '';

  const overflowClass = className.includes('overflow-') ? '' : 'overflow-hidden';

  return (
    <div
      className={`${bgClass} border-2 border-ink rounded-xl p-3.5 sm:p-6 shadow-retro text-ink text-left min-w-0 max-w-full ${overflowClass} ${liftStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
