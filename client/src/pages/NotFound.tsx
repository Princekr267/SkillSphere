import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Ban } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-grow bg-cream flex flex-col items-center justify-center p-6 text-center font-sans animate-fade-in transition-colors duration-200">
      
      {/* Route Line decorative Dead End motif */}
      <div className="w-full max-w-xs relative mb-8">
        <div className="h-[4px] bg-ink w-full" />
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cream px-3">
          <div className="h-10 w-10 bg-cream border-2 border-accent-coral flex items-center justify-center text-accent-coral rounded-lg shadow-retro-sm">
            <Ban className="h-5 w-5" />
          </div>
        </div>
      </div>

      <span className="text-[10px] font-mono text-accent-coral uppercase tracking-widest font-bold block mb-1">
        ERROR CODE: 404
      </span>
      
      <h1 className="text-3xl font-black font-display text-ink uppercase tracking-tight mb-2">
        Route Terminated
      </h1>
      
      <p className="text-sm text-ink/65 font-sans max-w-sm leading-relaxed mb-8 font-bold">
        The waypoint node you are trying to reach does not exist or has been shifted in the platform network.
      </p>

      <Button
        onClick={() => navigate('/')}
        variant="primary"
        size="md"
        className="flex items-center space-x-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Button>
    </div>
  );
};
export default NotFound;
