import React from 'react';

// Reusable Retro-pop Input field with thick black outlines
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-4 py-2.5 bg-cream border-2 border-ink rounded-lg text-ink text-sm outline-none transition-colors focus:bg-accent-amber/10 focus:border-accent-amber placeholder:text-ink/40 ${className}`}
      {...props}
    />
  );
};
