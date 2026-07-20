import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, MapPin, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink dark:bg-cream text-cream dark:text-ink border-t-4 border-ink dark:border-cream relative transition-colors duration-200">
      
      {/* Top: styling divider bar */}
      <div className="relative h-[4px] bg-ink/20 dark:bg-cream/15 border-b border-ink dark:border-cream" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1 space-y-4 text-left">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-accent-amber flex items-center justify-center border-2 border-ink rounded-md flex-shrink-0">
                <Globe className="h-4 w-4 text-ink" />
              </div>
              <span className="text-xl font-display font-black text-cream dark:text-ink uppercase tracking-tight">
                SkillSphere
              </span>
            </div>
            <p className="text-xs font-sans text-cream/60 dark:text-ink/65 leading-relaxed max-w-[200px]">
              A hyperlocal freelance marketplace connecting talent and opportunity in your city.
            </p>
            {/* Decorative dots */}
            <div className="flex items-center space-x-1 pt-2">
              {[0, 1, 2, 3].map(i => (
                <React.Fragment key={i}>
                  <div className={`w-2.5 h-2.5 border-2 border-ink dark:border-cream rounded-md flex-shrink-0 ${
                    i === 0 ? 'bg-accent-coral' : i === 3 ? 'bg-accent-teal' : 'bg-transparent border-cream/20 dark:border-ink/20'
                  }`} />
                  {i < 3 && <div className="flex-grow h-[1px] bg-cream/15 dark:bg-ink/15" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-display font-extrabold uppercase tracking-widest text-accent-amber">Platform</h4>
            <ul className="space-y-2">
              {[
                { label: 'Browse Gigs', to: '/gigs' },
                { label: 'Post a Gig', to: '/client-dashboard' },
                { label: 'Find Freelancers', to: '/gigs' },
                { label: 'Register Now', to: '/register' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-xs font-sans text-cream/60 dark:text-ink/65 hover:text-cream dark:hover:text-ink hover:underline transition-colors font-bold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-display font-extrabold uppercase tracking-widest text-accent-teal">Top Categories</h4>
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
                  <span className="text-xs font-sans text-cream/60 dark:text-ink/65 font-bold">{cat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-display font-extrabold uppercase tracking-widest text-accent-pink">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-xs text-cream/60 dark:text-ink/65 font-sans font-bold">
                <MapPin className="h-3.5 w-3.5 text-accent-teal flex-shrink-0 mt-0.5" />
                <span>Hyperlocal. Pan-India.</span>
              </li>
              <li className="flex items-start space-x-2 text-xs text-cream/60 dark:text-ink/65 font-sans font-bold">
                <Mail className="h-3.5 w-3.5 text-accent-teal flex-shrink-0 mt-0.5" />
                <span>hello@skillsphere.in</span>
              </li>
            </ul>

            <div className="border-2 border-ink dark:border-cream rounded-lg p-3 mt-4 space-y-1.5 bg-cream/5 dark:bg-ink/5 text-left">
              <p className="text-[9px] font-mono text-cream/60 dark:text-ink/60 uppercase tracking-widest font-bold">Platform Status</p>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded bg-accent-teal border-2 border-ink dark:border-cream animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-mono text-accent-teal font-extrabold uppercase">All Systems Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-cream/15 dark:border-ink/15 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <p className="text-[10px] font-mono text-cream/40 dark:text-ink/40 uppercase tracking-wider font-bold">
            © {year} SkillSphere · Built in India
          </p>
          <div className="flex items-center space-x-4">
            {['Privacy', 'Terms', 'Careers'].map(item => (
              <Link key={item} to="/register" className="text-[10px] font-mono text-cream/40 dark:text-ink/40 hover:text-cream/80 dark:hover:text-ink/80 uppercase tracking-wider transition-colors font-bold">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
