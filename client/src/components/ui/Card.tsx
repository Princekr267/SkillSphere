import React from 'react';

// Reusable Retro-pop Card component with flat offset borders
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverLift = false,
  className = '',
  ...props
}) => {
  const liftStyles = hoverLift ? 'transition-all duration-200 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-retro' : '';
  return (
    <div
      className={`bg-cream border-2 border-ink rounded-xl p-6 shadow-retro text-ink text-left ${liftStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
