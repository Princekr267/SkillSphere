import React from 'react';

// Reusable Retro-pop Button with tactile click interaction
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'coral' | 'pink' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-display font-bold tracking-wider uppercase border-2 border-ink transition-all active:translate-x-[2px] active:translate-y-[2px] shadow-retro-sm active:shadow-none outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary: 'bg-accent-amber text-ink hover:bg-accent-amber/90',
    secondary: 'bg-accent-teal text-ink hover:bg-accent-teal/90',
    coral: 'bg-accent-coral text-ink hover:bg-accent-coral/90',
    pink: 'bg-accent-pink text-ink hover:bg-accent-pink/90',
    outline: 'bg-cream text-ink hover:bg-ink hover:text-cream dark:hover:text-cream-dark',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] rounded-md',
    md: 'px-5 py-2.5 text-xs rounded-lg',
    lg: 'px-7 py-3 text-sm rounded-xl',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
