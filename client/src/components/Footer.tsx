import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, MapPin, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-paper border-t-2 border-route-teal">
      
      {/* Top: route line motif */}
      <div className="relative h-1 bg-line-gray overflow-hidden">
        <div className="absolute inset-0 bg-route-teal animate-draw-line origin-left" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-route-teal flex items-center justify-center rounded-sm flex-shrink-0">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-black font-display text-paper uppercase tracking-tight">
                SkillSphere
              </span>
            </div>
            <p className="text-xs font-sans text-paper/60 leading-relaxed max-w-[200px]">
              A hyperlocal freelance marketplace connecting talent and opportunity in your city.
            </p>
            {/* Decorative route line with dots */}
            <div className="flex items-center space-x-1 pt-2">
              {[0, 1, 2, 3].map(i => (
                <React.Fragment key={i}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-signal-coral' : i === 3 ? 'bg-route-teal' : 'bg-paper/25'}`} />
                  {i < 3 && <div className="flex-grow h-[1px] bg-paper/15" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-route-teal">Platform</h4>
            <ul className="space-y-2">
              {[
                { label: 'Browse Gigs', to: '/gigs' },
                { label: 'Post a Gig', to: '/client-dashboard' },
                { label: 'Find Freelancers', to: '/gigs' },
                { label: 'Register Now', to: '/register' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-xs font-sans text-paper/60 hover:text-paper transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-route-teal">Top Categories</h4>
            <ul className="space-y-2">
              {[
                'Technology & Development',
                'Design & Creative',
                'Home & Trades',
                'Teaching & Tutoring',
                'Writing & Translation',
                'Marketing & Sales',
              ].map(cat => (
                <li key={cat}>
                  <span className="text-xs font-sans text-paper/60">{cat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold font-display uppercase tracking-widest text-route-teal">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-xs text-paper/60 font-sans">
                <MapPin className="h-3.5 w-3.5 text-route-teal flex-shrink-0 mt-0.5" />
                <span>Hyperlocal. Pan-India.</span>
              </li>
              <li className="flex items-start space-x-2 text-xs text-paper/60 font-sans">
                <Mail className="h-3.5 w-3.5 text-route-teal flex-shrink-0 mt-0.5" />
                <span>hello@skillsphere.in</span>
              </li>
            </ul>

            <div className="border border-paper/10 rounded-sm p-3 mt-4 space-y-1.5">
              <p className="text-[9px] font-mono text-slate uppercase tracking-widest">Platform Status</p>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-route-teal animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-mono text-route-teal">All Systems Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-paper/10 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <p className="text-[10px] font-mono text-paper/40 uppercase tracking-wider">
            © {year} SkillSphere · Built in India
          </p>
          <div className="flex items-center space-x-4">
            {['Privacy', 'Terms', 'Careers'].map(item => (
              <Link key={item} to="/register" className="text-[10px] font-mono text-paper/40 hover:text-paper/80 uppercase tracking-wider transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
