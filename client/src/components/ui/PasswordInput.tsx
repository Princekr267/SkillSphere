import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput: React.FC<PasswordInputProps> = ({ className = '', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submissions or triggers
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative w-full">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={`pr-12 py-3 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={toggleShowPassword}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink transition-colors focus:outline-none z-20 cursor-pointer"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
