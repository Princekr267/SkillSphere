import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-grow bg-paper flex flex-col items-center justify-center p-6 text-center font-sans">
      
      {/* Route Line decorative Dead End motif */}
      <div className="w-full max-w-xs relative mb-8">
        <div className="h-[2px] bg-line-gray w-full" />
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper px-3">
          <div className="h-10 w-10 rounded-full bg-signal-coral/10 border-2 border-signal-coral flex items-center justify-center text-signal-coral">
            <Ban className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      </div>

      <span className="text-[10px] font-mono text-signal-coral uppercase tracking-widest block mb-1">
        ERROR CODE: 404
      </span>
      
      <h1 className="text-3xl font-black font-display text-ink uppercase tracking-tight mb-2">
        Route Terminated
      </h1>
      
      <p className="text-sm text-slate font-sans max-w-sm leading-relaxed mb-8">
        The waypoint node you are trying to reach does not exist or has been shifted in the platform network.
      </p>

      <button
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 px-5 py-2.5 rounded-sm bg-ink text-paper text-xs font-bold font-display uppercase tracking-widest hover:bg-ink/90 transition-colors shadow-none"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};
export default NotFound;
