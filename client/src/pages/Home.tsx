import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Globe, Shield, MessageSquare, Calendar, MapPin, DollarSign,
  ArrowRight, CheckCircle2, Zap, Users, Sparkles, Building,
  Clock, Award, HelpCircle, ChevronDown, ChevronUp, Sliders,
  Check, Briefcase, FileText, Lock, Calculator, Search,
  Compass, Star, RefreshCw, Send, CheckCheck, FileCode, CheckCircle
} from 'lucide-react';

export const Home: React.FC = () => {
  const { user, token } = useAuth();

  // Role toggle state for "How It Works"
  const [activeRoleTab, setActiveRoleTab] = useState<'client' | 'freelancer'>('client');

  // Interactive Radius Playground State
  const [radiusValue, setRadiusValue] = useState<number>(25);

  // Interactive Escrow Simulator Stage State (1 to 4)
  const [escrowStage, setEscrowStage] = useState<number>(1);

  // Interactive Earnings Calculator State
  const [hourlyRate, setHourlyRate] = useState<number>(1200);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(25);

  // Interactive Skill Matcher Filter State
  const [selectedSkill, setSelectedSkill] = useState<string>('React & Frontend');

  // Interactive FAQ Open State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Categories list
  const CATEGORIES = [
    { name: 'Technology & Development', icon: '💻', count: '140+ Gigs', bg: 'bg-accent-teal/15', border: 'border-accent-teal' },
    { name: 'Design & Creative', icon: '🎨', count: '95+ Gigs', bg: 'bg-accent-pink/15', border: 'border-accent-pink' },
    { name: 'Home & Trades', icon: '🛠️', count: '60+ Gigs', bg: 'bg-accent-amber/15', border: 'border-accent-amber' },
    { name: 'Writing & Translation', icon: '✍️', count: '45+ Gigs', bg: 'bg-accent-coral/15', border: 'border-accent-coral' },
    { name: 'Marketing & Sales', icon: '📈', count: '80+ Gigs', bg: 'bg-accent-teal/15', border: 'border-accent-teal' },
    { name: 'Teaching & Tutoring', icon: '📚', count: '50+ Gigs', bg: 'bg-accent-amber/15', border: 'border-accent-amber' },
  ];

  // Dynamic simulation data based on radius
  const getRadiusData = (r: number) => {
    if (r <= 10) {
      return {
        label: 'Ultra-Local Neighborhood',
        talentCount: 18,
        avgResponse: '~8 mins',
        tag: 'Walkable / Same Ward',
        badgeColor: 'bg-accent-teal',
        mockFreelancers: ['Priya S. (0.8km)', 'Vikram R. (1.4km)', 'Ananya D. (2.1km)'],
      };
    }
    if (r <= 30) {
      return {
        label: 'City & Metro Region',
        talentCount: 74,
        avgResponse: '~15 mins',
        tag: 'Within City Limits',
        badgeColor: 'bg-accent-amber',
        mockFreelancers: ['Rahul V. (4.2km)', 'Sneha M. (8.6km)', 'Arjun K. (14.1km)'],
      };
    }
    if (r <= 60) {
      return {
        label: 'Extended District Radius',
        talentCount: 160,
        avgResponse: '~25 mins',
        tag: 'Suburbs & Adjacent Towns',
        badgeColor: 'bg-accent-pink',
        mockFreelancers: ['Karan N. (28km)', 'Meera T. (34km)', 'Rohan P. (45km)'],
      };
    }
    return {
      label: 'Full Country (Pan-India)',
      talentCount: 950,
      avgResponse: '~35 mins',
      tag: 'Remote & Nationwide',
      badgeColor: 'bg-accent-coral',
      mockFreelancers: ['Deepak S. (Bangalore)', 'Aditi G. (Mumbai)', 'Harsh B. (Delhi NCR)'],
    };
  };

  const radiusInfo = getRadiusData(radiusValue);

  // Escrow simulator stages data
  const ESCROW_STAGES = [
    {
      stage: 1,
      title: '1. Deposit to Vault',
      badge: 'Escrow Locked',
      badgeColor: 'bg-accent-amber',
      vaultBalance: '₹25,000',
      payoutStatus: 'Secured in Vault',
      desc: 'Client accepts bid and deposits ₹25,000. Freelancer sees guaranteed funds before beginning work.',
      icon: <Lock className="h-5 w-5 text-accent-amber" />,
    },
    {
      stage: 2,
      title: '2. Milestone Submitted',
      badge: 'Proof Uploaded',
      badgeColor: 'bg-accent-teal',
      vaultBalance: '₹25,000',
      payoutStatus: 'Under Review',
      desc: 'Freelancer finishes task, uploads code/deliverables, and submits progress log on the dashboard.',
      icon: <FileCode className="h-5 w-5 text-accent-teal" />,
    },
    {
      stage: 3,
      title: '3. Client Inspection',
      badge: 'Client Verifying',
      badgeColor: 'bg-accent-pink',
      vaultBalance: '₹25,000',
      payoutStatus: 'Approval Pending',
      desc: 'Client tests the deliverables, requests any final touch-ups, or approves directly via live chat.',
      icon: <CheckCircle className="h-5 w-5 text-accent-pink" />,
    },
    {
      stage: 4,
      title: '4. Instant Release',
      badge: 'Funds Released',
      badgeColor: 'bg-accent-teal',
      vaultBalance: '₹0 (Disbursed)',
      payoutStatus: 'Transferred to Freelancer',
      desc: 'Escrow automatically transfers ₹25,000 to the freelancer and prompts mutual 5-star reputation reviews.',
      icon: <Zap className="h-5 w-5 text-accent-teal" />,
    },
  ];

  // Skill presets for Interactive Skill Explorer
  const SKILL_PRESETS = [
    {
      name: 'React & Frontend',
      matchScore: '99% Match',
      matchedCandidate: 'Aarav Sharma',
      role: 'Senior React / TypeScript Developer',
      rating: '4.9 ★ (34 reviews)',
      rate: '₹1,200/hr',
      distance: '2.4 km away',
      skills: ['React', 'TypeScript', 'Tailwind', 'Socket.io'],
    },
    {
      name: 'UI/UX & Branding',
      matchScore: '97% Match',
      matchedCandidate: 'Sneha Patel',
      role: 'Product Designer & Design Systems',
      rating: '5.0 ★ (48 reviews)',
      rate: '₹1,500/hr',
      distance: '4.1 km away',
      skills: ['Figma', 'Prototyping', 'Design Systems', 'Mobile UX'],
    },
    {
      name: 'Node & APIs',
      matchScore: '98% Match',
      matchedCandidate: 'Karthik Raja',
      role: 'Backend Architect & MongoDB Specialist',
      rating: '4.8 ★ (29 reviews)',
      rate: '₹1,100/hr',
      distance: '3.7 km away',
      skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'Docker'],
    },
    {
      name: 'Electrical & Trades',
      matchScore: '96% Match',
      matchedCandidate: 'Ramesh Verma',
      role: 'Certified Commercial & Domestic Electrician',
      rating: '4.9 ★ (62 reviews)',
      rate: '₹500/hr',
      distance: '1.2 km away',
      skills: ['Wiring', 'Appliance Setup', 'Inspections', 'Safety Audit'],
    },
    {
      name: 'Content & Copywriting',
      matchScore: '95% Match',
      matchedCandidate: 'Divya Iyer',
      role: 'SEO Copywriter & Technical Writer',
      rating: '4.9 ★ (41 reviews)',
      rate: '₹800/hr',
      distance: '5.0 km away',
      skills: ['SEO Copy', 'Technical Docs', 'Email Campaigns', 'Blogs'],
    },
  ];

  const currentSkillData = SKILL_PRESETS.find(s => s.name === selectedSkill) || SKILL_PRESETS[0];

  // Calculated Earnings
  const monthlyEarnings = Math.round(hourlyRate * hoursPerWeek * 4.33);
  const annualEarnings = Math.round(monthlyEarnings * 12);

  const clientSteps = [
    {
      step: '01',
      title: 'Post Your Task in 60 Seconds',
      description: 'Define what you need done, set your budget (fixed or hourly), required skills, and desired local radius (5km to all-India).',
      badge: 'Smart Geolocation',
      icon: <Briefcase className="h-5 w-5 text-accent-teal" />,
    },
    {
      step: '02',
      title: 'Compare Verified Nearby Bids',
      description: 'Receive applications from local freelancers. Check their star rating, proximity distance, past client reviews, and verified portfolios.',
      badge: 'Transparent Profiles',
      icon: <Users className="h-5 w-5 text-accent-amber" />,
    },
    {
      step: '03',
      title: 'Live Chat & Milestone Tracking',
      description: 'Negotiate details in real-time encrypted socket chat with instant attachments. Break projects into milestones with automated deadline alerts.',
      badge: 'End-to-End Sockets',
      icon: <MessageSquare className="h-5 w-5 text-accent-pink" />,
    },
    {
      step: '04',
      title: 'Protected Escrow & Release',
      description: 'Deposit funds securely into escrow. Your money is protected and only released when you inspect and approve the completed deliverables.',
      badge: '100% Escrow Guarded',
      icon: <Shield className="h-5 w-5 text-accent-coral" />,
    },
  ];

  const freelancerSteps = [
    {
      step: '01',
      title: 'Set Your Skills & Availability',
      description: 'Build your retro-pop profile, list your certifications, upload your resume CV, and configure your weekly availability booking calendar.',
      badge: 'Custom Calendar',
      icon: <Award className="h-5 w-5 text-accent-amber" />,
    },
    {
      step: '02',
      title: 'Find Hyperlocal Opportunities',
      description: 'Discover jobs matched to your physical city or explore pan-India gigs with real-time distance indicators and transparent budgets.',
      badge: 'Zero Spam Listings',
      icon: <MapPin className="h-5 w-5 text-accent-teal" />,
    },
    {
      step: '03',
      title: 'Bid & Direct Counter-Offer',
      description: 'Submit competitive proposals with estimated days. Use our interactive counter-negotiation engine to agree on the final fair price.',
      badge: 'Fair Bidding',
      icon: <DollarSign className="h-5 w-5 text-accent-coral" />,
    },
    {
      step: '04',
      title: 'Guaranteed Payouts & Ratings',
      description: 'Submit milestone proofs and get paid safely through escrow. Accumulate verified 5-star client ratings to unlock higher-tier jobs.',
      badge: 'Secure Escrow Pay',
      icon: <Zap className="h-5 w-5 text-accent-pink" />,
    },
  ];

  const faqs = [
    {
      q: 'How does SkillSphere’s Escrow Protection protect my money?',
      a: 'When a client accepts a proposal, funds are deposited into a secure simulated escrow vault. The freelancer knows the money is guaranteed before starting work, and the client knows the funds are never released until they verify and approve the final work.'
    },
    {
      q: 'What is Hyperlocal matching and how does the distance radius work?',
      a: 'SkillSphere uses MongoDB 2dsphere indexing and GPS geolocation. Clients can limit gigs to 5km, 25km, 50km, or choose Full Country India. Freelancers within that exact radius are notified and prioritized on the discovery map.'
    },
    {
      q: 'Can I negotiate the budget after submitting a proposal?',
      a: 'Yes! SkillSphere features a two-way counter-negotiation engine. If a client wants adjustments, either party can counter-propose a new amount with custom notes until both agree, and the gig budget updates automatically.'
    },
    {
      q: 'How does the Live Chat work?',
      a: 'Our chat is powered directly by Socket.io. You get instantaneous messaging, live online/offline presence indicators, typing indicators, read receipts, and file attachments up to 5MB with live image previews.'
    },
    {
      q: 'Can companies manage multiple members on SkillSphere?',
      a: 'Yes! Clients can register verified organizations, manage team members, generate shareable invite keys, and post gigs under their official business identity.'
    },
  ];

  const dashboardRoute = user
    ? user.role === 'super_admin'
      ? '/admin'
      : user.role === 'client'
      ? '/client-dashboard'
      : '/freelancer-dashboard'
    : '/register';

  return (
    <div className="w-full bg-cream font-sans text-ink transition-colors duration-200">

      {/* ── HERO SECTION ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 border-b-4 border-ink">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-accent-amber/20 border-2 border-ink rounded-full text-xs font-mono font-black text-ink mb-6 shadow-retro-sm animate-pulse-glow">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-teal border border-ink animate-ping" />
            <span className="uppercase tracking-wider">HYPERLOCAL FREELANCE MARKETPLACE · INDIA</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-display uppercase tracking-tight text-ink leading-[1.05]">
                Hire Local Talent. <br />
                <span className="bg-accent-amber px-2 py-0.5 border-2 border-ink shadow-retro inline-block my-1 text-ink transform -rotate-1 hover:rotate-0 transition-transform cursor-pointer">
                  Guaranteed
                </span>{' '}
                Escrow Pay.
              </h1>

              <p className="text-sm sm:text-base text-ink/75 font-sans leading-relaxed max-w-2xl font-bold">
                Connect with verified freelance experts in your neighborhood or across India.
                Fast bids, real-time socket chat, custom calendar booking, and 100% escrow protection.
              </p>

              {/* Action Buttons with Micro-interactions */}
              <div className="flex flex-wrap gap-4 pt-2">
                {token && user ? (
                  <Link to={dashboardRoute}>
                    <Button variant="primary" size="lg" className="shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-retro-sm transition-all py-3.5 px-6 font-display font-black text-sm uppercase">
                      <span>Go to Your Dashboard</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register?role=client">
                      <Button variant="coral" size="lg" className="shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-retro-sm transition-all py-3.5 px-6 font-display font-black text-sm uppercase">
                        <span>Post a Gig</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link to="/register?role=freelancer">
                      <Button variant="primary" size="lg" className="shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-retro-sm transition-all py-3.5 px-6 font-display font-black text-sm uppercase">
                        <span>Join as Freelancer</span>
                        <Sparkles className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" size="lg" className="py-3.5 px-5 font-display font-bold text-sm uppercase bg-cream hover:bg-accent-amber/20 transition-colors">
                        <span>Sign In</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Key Trust Signals */}
              <div className="pt-6 border-t-2 border-ink/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="p-2.5 bg-cream border-2 border-ink rounded-xl shadow-retro-sm hover:shadow-retro transition-shadow">
                  <span className="text-xl sm:text-2xl font-black font-mono text-ink block">₹0</span>
                  <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest font-bold">Platform Fee</span>
                </div>
                <div className="p-2.5 bg-cream border-2 border-ink rounded-xl shadow-retro-sm hover:shadow-retro transition-shadow">
                  <span className="text-xl sm:text-2xl font-black font-mono text-accent-teal block">100%</span>
                  <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest font-bold">Escrow Guard</span>
                </div>
                <div className="p-2.5 bg-cream border-2 border-ink rounded-xl shadow-retro-sm hover:shadow-retro transition-shadow">
                  <span className="text-xl sm:text-2xl font-black font-mono text-accent-coral block">&lt; 15m</span>
                  <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest font-bold">Local Response</span>
                </div>
                <div className="p-2.5 bg-cream border-2 border-ink rounded-xl shadow-retro-sm hover:shadow-retro transition-shadow">
                  <span className="text-xl sm:text-2xl font-black font-mono text-ink block">25km+</span>
                  <span className="text-[10px] font-mono text-ink/60 uppercase tracking-widest font-bold">Geo Matching</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic with Floating Badges & Animations */}
            <div className="lg:col-span-5 relative">
              
              {/* Floating Badge 1 (Top Right) */}
              <div className="absolute -top-6 -right-2 z-20 animate-float hidden sm:flex items-center space-x-2 bg-accent-teal text-ink px-3 py-1.5 border-2 border-ink rounded-xl shadow-retro-sm font-mono text-xs font-black uppercase">
                <Shield className="h-4 w-4" />
                <span>₹25,000 Protected</span>
              </div>

              {/* Floating Badge 2 (Bottom Left) */}
              <div className="absolute -bottom-6 -left-4 z-20 animate-float-delayed hidden sm:flex items-center space-x-2 bg-accent-pink text-ink px-3 py-1.5 border-2 border-ink rounded-xl shadow-retro-sm font-mono text-xs font-black uppercase">
                <MapPin className="h-4 w-4" />
                <span>Nearby: 2.4 km away</span>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-accent-teal border-2 border-ink rounded-2xl transform translate-x-3 translate-y-3"></div>

                <Card className="relative p-6 bg-accent-amber/10 border-2 border-ink rounded-2xl space-y-5 text-left shadow-retro hover:rotate-1 transition-transform">
                  
                  <div className="flex items-center justify-between border-b-2 border-ink pb-4 bg-cream p-3 rounded-xl border border-ink/20 shadow-retro-sm">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-9 w-9 bg-accent-amber border-2 border-ink rounded-lg flex items-center justify-center font-bold text-ink shadow-retro-sm">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-black font-display text-sm text-ink uppercase">Live Gig Matching</h4>
                        <span className="text-[10px] font-mono text-accent-teal font-bold uppercase tracking-wider">● 3 Near Candidates</span>
                      </div>
                    </div>
                    <Badge variant="teal" className="text-[9px] font-mono shadow-none uppercase font-bold">
                      Open Request
                    </Badge>
                  </div>

                  {/* Mock active gig */}
                  <div className="p-3.5 bg-cream border-2 border-ink rounded-xl space-y-2 shadow-retro-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-ink/60">Fullstack React & Node App</span>
                      <span className="text-xs font-mono font-black text-ink">₹18,500</span>
                    </div>
                    <p className="text-xs text-ink/75 font-sans font-bold leading-relaxed">
                      Need experienced frontend engineer to build real-time dashboard with Socket.io & Tailwind.
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Badge variant="outline" className="text-[8px] font-mono bg-cream">React</Badge>
                      <Badge variant="outline" className="text-[8px] font-mono bg-cream">Node.js</Badge>
                      <Badge variant="outline" className="text-[8px] font-mono bg-cream">Within 15km</Badge>
                    </div>
                  </div>

                  {/* Mock live proposal match */}
                  <div className="p-3 bg-cream border-2 border-ink rounded-xl space-y-2 shadow-retro-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-full bg-accent-pink border border-ink flex items-center justify-center text-xs font-black font-display text-ink">
                          A
                        </div>
                        <div>
                          <p className="text-xs font-black font-display text-ink uppercase leading-tight">Aarav Sharma</p>
                          <p className="text-[9px] font-mono text-ink/60">4.9 ★ · 2.4 km away</p>
                        </div>
                      </div>
                      <Badge variant="coral" className="text-[8px] font-mono shadow-none uppercase font-bold">
                        Bid: ₹17,000
                      </Badge>
                    </div>
                    <p className="text-[11px] font-mono text-ink/70">
                      "I can deliver this in 3 days. Ready for live milestone checks."
                    </p>
                  </div>

                  {/* Escrow badge */}
                  <div className="flex items-center justify-between p-2.5 bg-cream border-2 border-ink rounded-lg text-xs font-mono font-bold text-ink shadow-retro-sm">
                    <span className="flex items-center space-x-1.5">
                      <Shield className="h-4 w-4 text-accent-teal" />
                      <span>Funds Protected in Escrow</span>
                    </span>
                    <span className="text-[9px] uppercase bg-accent-teal text-ink px-2 py-0.5 border border-ink rounded font-mono font-bold">Verified</span>
                  </div>

                </Card>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTERACTIVE LIVE ESCROW FLOW SIMULATOR (NEW) ────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-left mb-10">
            <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
              Live Interactive Demo
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-ink">
              Simulated Escrow Protection Vault
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-sans mt-2 max-w-xl font-bold">
              Click through the 4 interactive stages below to experience how SkillSphere safeguards every rupee between client and freelancer.
            </p>
          </div>

          {/* Interactive Stepper Navigation Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {ESCROW_STAGES.map((st) => {
              const isSelected = escrowStage === st.stage;
              return (
                <button
                  key={st.stage}
                  onClick={() => setEscrowStage(st.stage)}
                  className={`p-3.5 rounded-xl border-2 border-ink text-left font-display font-black text-xs uppercase tracking-tight transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-accent-amber text-ink shadow-retro translate-y-[-2px]'
                      : 'bg-cream text-ink/70 hover:bg-accent-amber/15 hover:text-ink shadow-retro-sm'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`w-5 h-5 rounded-full border border-ink flex items-center justify-center text-[10px] font-mono ${isSelected ? 'bg-ink text-cream' : 'bg-cream text-ink'}`}>
                      {st.stage}
                    </span>
                    <span className="truncate">{st.title.split('. ')[1]}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-ink" />}
                </button>
              );
            })}
          </div>

          {/* Active Stage Interactive Showcase Card */}
          {(() => {
            const currentStage = ESCROW_STAGES.find(s => s.stage === escrowStage) || ESCROW_STAGES[0];
            return (
              <Card className="p-6 sm:p-8 border-2 border-ink shadow-retro bg-accent-teal/10 text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
                
                {/* Stage Info */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className={`${currentStage.badgeColor} border-2 border-ink text-ink font-mono font-black text-xs uppercase shadow-retro-sm`}>
                      {currentStage.badge}
                    </Badge>
                    <span className="text-xs font-mono text-ink/60 font-bold">Stage {currentStage.stage} of 4</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-ink">
                    {currentStage.title}
                  </h3>

                  <p className="text-sm font-sans text-ink/80 leading-relaxed font-bold">
                    {currentStage.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs">
                    <div className="p-3 bg-cream border-2 border-ink rounded-lg shadow-retro-sm">
                      <span className="text-[9px] uppercase font-bold text-ink/50 block">Vault Balance</span>
                      <span className="text-base font-black text-ink">{currentStage.vaultBalance}</span>
                    </div>
                    <div className="p-3 bg-cream border-2 border-ink rounded-lg shadow-retro-sm">
                      <span className="text-[9px] uppercase font-bold text-ink/50 block">Payout Status</span>
                      <span className="text-base font-black text-accent-teal">{currentStage.payoutStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Vault UI Card */}
                <div className="lg:col-span-5">
                  <div className="p-6 bg-cream border-2 border-ink rounded-2xl space-y-4 shadow-retro">
                    <div className="flex items-center justify-between pb-3 border-b-2 border-ink">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-accent-amber border-2 border-ink rounded-lg flex items-center justify-center">
                          {currentStage.icon}
                        </div>
                        <span className="text-xs font-mono font-bold uppercase">SkillSphere Escrow Guard</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse"></span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-ink/10">
                        <span className="text-ink/60">Gig Contract:</span>
                        <span className="font-bold">E-Commerce App v2</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-ink/10">
                        <span className="text-ink/60">Agreed Amount:</span>
                        <span className="font-bold">₹25,000</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-ink/10">
                        <span className="text-ink/60">Dispute Shield:</span>
                        <span className="text-accent-teal font-bold">ACTIVE (24/7)</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEscrowStage(prev => (prev < 4 ? prev + 1 : 1))}
                        className="w-full py-2.5 bg-accent-amber border-2 border-ink rounded-lg text-xs font-display font-black uppercase tracking-wider shadow-retro-sm hover:shadow-retro cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>{currentStage.stage < 4 ? 'Next Stage →' : 'Restart Demo ↺'}</span>
                      </button>
                    </div>
                  </div>
                </div>

              </Card>
            );
          })()}

        </div>
      </section>

      {/* ── INTERACTIVE EARNINGS & PROJECT BUDGET CALCULATOR (NEW) ─────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-left mb-10">
            <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
              Earnings & Budget Estimator
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-ink">
              Interactive Freelance Calculator
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-sans mt-2 max-w-xl font-bold">
              Adjust your hourly rate and weekly time commitment to see potential take-home earnings on SkillSphere.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="p-6 border-2 border-ink shadow-retro bg-accent-pink/10 space-y-6">
                
                {/* Rate Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-display uppercase tracking-widest text-ink">
                      Hourly Rate:
                    </label>
                    <span className="px-3 py-1 bg-accent-teal border-2 border-ink rounded-lg font-mono font-black text-sm text-ink shadow-retro-sm">
                      ₹{hourlyRate.toLocaleString()} / hr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="4000"
                    step="100"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full h-3 bg-ink/10 border-2 border-ink rounded-lg appearance-none cursor-pointer accent-accent-teal"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-ink/50 font-bold">
                    <span>₹300/hr (Entry)</span>
                    <span>₹1,500/hr (Mid)</span>
                    <span>₹4,000/hr (Expert)</span>
                  </div>
                </div>

                {/* Hours Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-display uppercase tracking-widest text-ink">
                      Hours Worked per Week:
                    </label>
                    <span className="px-3 py-1 bg-accent-pink border-2 border-ink rounded-lg font-mono font-black text-sm text-ink shadow-retro-sm">
                      {hoursPerWeek} hrs / week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="w-full h-3 bg-ink/10 border-2 border-ink rounded-lg appearance-none cursor-pointer accent-accent-pink"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-ink/50 font-bold">
                    <span>5 hrs (Side Gig)</span>
                    <span>25 hrs (Part-time)</span>
                    <span>40+ hrs (Full-time)</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex gap-2 flex-wrap pt-2">
                  <button
                    onClick={() => { setHourlyRate(800); setHoursPerWeek(15); }}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-cream border border-ink rounded-lg hover:bg-accent-amber/20 cursor-pointer"
                  >
                    Side Hustle
                  </button>
                  <button
                    onClick={() => { setHourlyRate(1500); setHoursPerWeek(30); }}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-cream border border-ink rounded-lg hover:bg-accent-teal/20 cursor-pointer"
                  >
                    Pro Freelancer
                  </button>
                  <button
                    onClick={() => { setHourlyRate(2500); setHoursPerWeek(40); }}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-cream border border-ink rounded-lg hover:bg-accent-pink/20 cursor-pointer"
                  >
                    Agency Expert
                  </button>
                </div>

              </Card>
            </div>

            {/* Right Earnings Output Card */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-8 bg-accent-amber border-thick border-ink rounded-2xl shadow-retro space-y-6 text-left relative overflow-hidden">
                
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-ink/70 block mb-1">
                    Estimated Monthly Take-Home
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-ink tracking-tight">
                    ₹{monthlyEarnings.toLocaleString()}
                  </div>
                  <span className="text-xs font-mono font-bold text-ink/75 mt-1 block">
                    (₹{annualEarnings.toLocaleString()} annualized projection)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t-2 border-ink font-mono text-xs text-ink">
                  <div className="p-3 bg-cream/90 border-2 border-ink rounded-xl shadow-retro-sm">
                    <span className="text-[9px] uppercase font-bold text-ink/60 block">Platform Commission</span>
                    <span className="text-sm font-black text-accent-teal">₹0 (Free)</span>
                  </div>
                  <div className="p-3 bg-cream/90 border-2 border-ink rounded-xl shadow-retro-sm">
                    <span className="text-[9px] uppercase font-bold text-ink/60 block">Escrow Guarantee</span>
                    <span className="text-sm font-black text-ink">100% Payout</span>
                  </div>
                </div>

                <Link to="/register?role=freelancer" className="block pt-2">
                  <Button variant="coral" size="md" className="w-full py-3.5 shadow-retro hover:shadow-retro-sm font-display font-black text-xs uppercase tracking-wider text-ink">
                    <span>Start Earning on SkillSphere →</span>
                  </Button>
                </Link>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── INTERACTIVE SKILL MATCHER EXPLORER (NEW) ──────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-left mb-10">
            <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
              Real-Time Matcher
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-ink">
              Instant Skill & Proximity Matcher
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-sans mt-2 max-w-xl font-bold">
              Select any skill below to see how our engine pairs you with verified nearby candidates.
            </p>
          </div>

          {/* Skill Filter Chips */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            {SKILL_PRESETS.map((sk) => {
              const isSelected = selectedSkill === sk.name;
              return (
                <button
                  key={sk.name}
                  onClick={() => setSelectedSkill(sk.name)}
                  className={`px-4 py-2 rounded-xl border-2 border-ink text-xs font-display font-black uppercase tracking-wider transition-all shadow-retro-sm cursor-pointer ${
                    isSelected
                      ? 'bg-accent-teal text-ink shadow-retro translate-y-[-2px]'
                      : 'bg-cream text-ink/70 hover:bg-accent-teal/15 hover:text-ink'
                  }`}
                >
                  {sk.name}
                </button>
              );
            })}
          </div>

          {/* Active Candidate Match Preview Card */}
          <Card className="p-6 sm:p-8 border-2 border-ink shadow-retro bg-accent-amber/10 text-left grid grid-cols-1 md:grid-cols-12 gap-6 items-center animate-fade-in">
            
            <div className="md:col-span-8 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-14 w-14 bg-cream border-2 border-ink rounded-xl flex items-center justify-center font-display text-2xl font-black text-ink shadow-retro-sm">
                  {currentSkillData.matchedCandidate.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black font-display uppercase text-ink">
                      {currentSkillData.matchedCandidate}
                    </h3>
                    <Badge variant="teal" className="text-[9px] font-mono shadow-none uppercase font-black">
                      {currentSkillData.matchScore}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-ink/65 font-bold">{currentSkillData.role}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-mono text-ink/70 bg-cream p-2.5 rounded-lg border border-ink/20 shadow-retro-sm">
                <span className="flex items-center space-x-1">
                  <Star className="h-3.5 w-3.5 text-accent-amber fill-accent-amber" />
                  <strong className="text-ink">{currentSkillData.rating}</strong>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-accent-teal" />
                  <strong>{currentSkillData.distance}</strong>
                </span>
                <span className="flex items-center space-x-1">
                  <DollarSign className="h-3.5 w-3.5 text-accent-coral" />
                  <strong className="text-ink">{currentSkillData.rate}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentSkillData.skills.map((s, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] font-mono bg-cream border-ink">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col justify-center space-y-3 border-t md:border-t-0 md:border-l-2 border-ink/10 pt-4 md:pt-0 md:pl-6">
              <div className="p-3 bg-cream border-2 border-ink rounded-xl text-center font-mono text-xs shadow-retro-sm">
                <span className="text-[9px] uppercase text-ink/60 block font-bold">Proximity Match</span>
                <span className="font-black text-accent-teal text-sm">Ready for Same-Day Booking</span>
              </div>
              <Link to="/gigs" className="w-full">
                <Button variant="coral" size="md" className="w-full py-2.5 shadow-retro-sm font-display font-black text-xs uppercase">
                  <span>Explore Similar Gigs →</span>
                </Button>
              </Link>
            </div>

          </Card>

        </div>
      </section>

      {/* ── INTERACTIVE HYPERLOCAL RADIUS SIMULATOR ────────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-left mb-10">
            <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
              Interactive Radius Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-ink">
              Test How Hyperlocal Proximity Works
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-sans mt-2 max-w-xl font-bold">
              Drag the radius slider to see how SkillSphere filters candidates and gigs from your immediate ward to pan-India.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Slider Control Panel */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="p-6 border-2 border-ink shadow-retro bg-accent-teal/10 space-y-6">
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-display uppercase tracking-widest text-ink">
                    Search Radius:
                  </span>
                  <span className="px-3 py-1 bg-accent-amber border-2 border-ink rounded-lg font-mono font-black text-sm text-ink shadow-retro-sm">
                    {radiusValue >= 75 ? 'Full Country (All India)' : `${radiusValue} km`}
                  </span>
                </div>

                {/* Range Input */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="5"
                    value={radiusValue}
                    onChange={(e) => setRadiusValue(Number(e.target.value))}
                    className="w-full h-3 bg-ink/10 border-2 border-ink rounded-lg appearance-none cursor-pointer accent-accent-teal"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-ink/50 font-bold">
                    <span>5 km (Local)</span>
                    <span>25 km (City)</span>
                    <span>50 km (Metro)</span>
                    <span>Pan-India</span>
                  </div>
                </div>

                {/* Live Output Statistics */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-cream border-2 border-ink rounded-lg text-left shadow-retro-sm">
                    <span className="text-[9px] font-mono uppercase text-ink/60 font-bold block">Available Talent</span>
                    <span className="text-xl font-black font-mono text-ink">{radiusInfo.talentCount}+ Experts</span>
                  </div>
                  <div className="p-3 bg-cream border-2 border-ink rounded-lg text-left shadow-retro-sm">
                    <span className="text-[9px] font-mono uppercase text-ink/60 font-bold block">Estimated Response</span>
                    <span className="text-xl font-black font-mono text-accent-teal">{radiusInfo.avgResponse}</span>
                  </div>
                </div>

                <div className="p-3 bg-cream border-2 border-ink rounded-lg text-xs font-sans font-bold flex items-center space-x-2 shadow-retro-sm">
                  <Sliders className="h-4 w-4 text-accent-teal flex-shrink-0" />
                  <span>Coverage Scope: <strong className="text-ink uppercase font-mono">{radiusInfo.label}</strong></span>
                </div>

              </Card>
            </div>

            {/* Visual Live Representation */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-6 bg-accent-coral/10 border-2 border-ink rounded-2xl shadow-retro space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-display uppercase tracking-widest text-ink flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-accent-coral" />
                    <span>Live Geolocation Simulation</span>
                  </span>
                  <Badge variant="outline" className={`${radiusInfo.badgeColor} text-ink font-mono text-[9px] font-bold shadow-none`}>
                    {radiusInfo.tag}
                  </Badge>
                </div>

                <p className="text-xs font-sans text-ink/75 leading-relaxed font-bold">
                  {radiusValue <= 25 ? (
                    <>
                      Targeting candidates within <strong>{radiusValue}km</strong> ensures quick on-site collaboration, shared timezones, same-day meetings, and higher accountability.
                    </>
                  ) : (
                    <>
                      Expanding to <strong>{radiusValue >= 75 ? 'Pan-India' : `${radiusValue}km`}</strong> opens access to specialized niche technical skills, flexible pricing tiers, and 24/7 remote collaboration.
                    </>
                  )}
                </p>

                <div className="space-y-2 pt-2">
                  <div className="p-2.5 bg-cream border-2 border-ink rounded-lg flex items-center justify-between text-xs font-mono shadow-retro-sm">
                    <span className="font-bold">⚡ Instant Distance Calculation</span>
                    <span className="text-accent-teal font-bold">Auto-calculated</span>
                  </div>
                  <div className="p-2.5 bg-cream border-2 border-ink rounded-lg flex items-center justify-between text-xs font-mono shadow-retro-sm">
                    <span className="font-bold">🔒 Escrow Lock Upon Hire</span>
                    <span className="text-accent-amber font-bold">100% Protected</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── HOW SKILLSPHERE WORKS (DUAL TRACK STEPPER) ────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
                Zero Confusion Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-ink">
                How SkillSphere Works
              </h2>
            </div>

            {/* Interactive Role Switcher Tabs */}
            <div className="inline-flex p-1.5 bg-ink/10 border-2 border-ink rounded-xl shadow-retro-sm">
              <button
                onClick={() => setActiveRoleTab('client')}
                className={`px-4 py-2 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeRoleTab === 'client'
                    ? 'bg-accent-teal text-ink border-2 border-ink shadow-retro-sm'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                For Clients (Hire Talent)
              </button>
              <button
                onClick={() => setActiveRoleTab('freelancer')}
                className={`px-4 py-2 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeRoleTab === 'freelancer'
                    ? 'bg-accent-amber text-ink border-2 border-ink shadow-retro-sm'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                For Freelancers (Earn Money)
              </button>
            </div>
          </div>

          {/* Stepper Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(activeRoleTab === 'client' ? clientSteps : freelancerSteps).map((st, idx) => {
              const cardBgColors = ['bg-accent-teal/10', 'bg-accent-amber/10', 'bg-accent-pink/10', 'bg-accent-coral/10'];
              return (
                <Card key={idx} className={`p-6 border-2 border-ink shadow-retro text-left flex flex-col justify-between space-y-4 hover:translate-y-[-3px] transition-transform ${cardBgColors[idx % cardBgColors.length]}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="h-9 w-9 bg-cream border-2 border-ink rounded-lg flex items-center justify-center font-mono font-black text-sm text-ink shadow-retro-sm">
                        {st.step}
                      </span>
                      <Badge variant="outline" className="text-[8px] font-mono uppercase bg-cream border-ink">
                        {st.badge}
                      </Badge>
                    </div>
                    <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                      {st.title}
                    </h3>
                    <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                      {st.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-ink/10 flex items-center space-x-2 text-xs font-mono text-ink/60 font-bold">
                    {st.icon}
                    <span>Step {idx + 1} of 4</span>
                  </div>
                </Card>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── CORE BENEFITS & WHY SKILLSPHERE ────────────────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-left mb-12">
            <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
              Built Different
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-ink">
              Why Users Love SkillSphere
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-sans mt-2 max-w-xl font-bold">
              We replaced complicated enterprise clutter with fast, transparent, hyperlocal freelancing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            
            {/* Benefit 1 */}
            <Card className="p-6 border-2 border-ink shadow-retro space-y-3 hover:translate-y-[-3px] transition-transform bg-accent-teal/10">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink shadow-retro-sm">
                <Shield className="h-5 w-5 text-accent-teal" />
              </div>
              <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                Simulated Escrow Protection
              </h3>
              <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                No ghosting, no unpaid invoices. Client funds are locked in escrow when a gig starts and only released when deliverables meet approval.
              </p>
            </Card>

            {/* Benefit 2 */}
            <Card className="p-6 border-2 border-ink shadow-retro space-y-3 hover:translate-y-[-3px] transition-transform bg-accent-amber/10">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink shadow-retro-sm">
                <MapPin className="h-5 w-5 text-accent-amber" />
              </div>
              <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                Hyperlocal Proximity Filters
              </h3>
              <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                Discover talent in your exact town, city or ward. Filter by 5km, 25km, 50km, or expand to all of India with a single click.
              </p>
            </Card>

            {/* Benefit 3 */}
            <Card className="p-6 border-2 border-ink shadow-retro space-y-3 hover:translate-y-[-3px] transition-transform bg-accent-pink/10">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink shadow-retro-sm">
                <MessageSquare className="h-5 w-5 text-accent-pink" />
              </div>
              <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                Real-Time Socket Live Chat
              </h3>
              <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                Chat instantaneously with online presence, typing indicators, read receipts, and direct image/PDF document uploads up to 5MB.
              </p>
            </Card>

            {/* Benefit 4 */}
            <Card className="p-6 border-2 border-ink shadow-retro space-y-3 hover:translate-y-[-3px] transition-transform bg-accent-coral/10">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink shadow-retro-sm">
                <Calendar className="h-5 w-5 text-accent-coral" />
              </div>
              <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                Availability Calendar & Slots
              </h3>
              <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                Freelancers define their active weekly hours. Clients can book appointment slots directly linked to their active gig contracts.
              </p>
            </Card>

            {/* Benefit 5 */}
            <Card className="p-6 border-2 border-ink shadow-retro space-y-3 hover:translate-y-[-3px] transition-transform bg-accent-teal/10">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink shadow-retro-sm">
                <Building className="h-5 w-5 text-accent-teal" />
              </div>
              <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                Company & Multi-Member Teams
              </h3>
              <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                Register verified corporate organizations, invite colleagues with unique access keys, and hire under unified company branding.
              </p>
            </Card>

            {/* Benefit 6 */}
            <Card className="p-6 border-2 border-ink shadow-retro space-y-3 hover:translate-y-[-3px] transition-transform bg-accent-amber/10">
              <div className="h-10 w-10 bg-cream border-2 border-ink rounded-lg flex items-center justify-center text-ink shadow-retro-sm">
                <Clock className="h-5 w-5 text-accent-amber" />
              </div>
              <h3 className="text-base font-black font-display uppercase tracking-tight text-ink">
                Milestone & 24h Deadline Alerts
              </h3>
              <p className="text-xs text-ink/75 font-sans leading-relaxed font-bold">
                Break complex jobs into clear milestone goals with automated 24-hour deadline reminder notifications to keep work on schedule.
              </p>
            </Card>

          </div>

        </div>
      </section>

      {/* ── TOP CATEGORIES EXPLORER ────────────────────────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
                Explore Skills
              </span>
              <h2 className="text-3xl font-black font-display uppercase tracking-tight text-ink">
                Popular Categories
              </h2>
            </div>
            <Link to="/gigs">
              <Button variant="outline" size="sm" className="font-display uppercase tracking-wider font-bold bg-cream">
                <span>View All Gigs</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={i}
                to={`/gigs?category=${encodeURIComponent(cat.name)}`}
                className="group"
              >
                <div className={`p-4 rounded-xl border-2 border-ink ${cat.bg} shadow-retro-sm hover:shadow-retro hover:translate-y-[-3px] transition-all text-left flex flex-col justify-between h-36`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <h4 className="font-black font-display text-xs text-ink uppercase leading-tight line-clamp-2">
                      {cat.name}
                    </h4>
                    <span className="text-[9px] font-mono text-ink/60 uppercase font-bold mt-1 block">
                      {cat.count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ── INTERACTIVE FAQ SECTION ────────────────────────────────────────────── */}
      <section className="py-16 bg-cream border-b-4 border-ink text-left">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-left mb-10">
            <span className="text-[10px] font-mono font-bold text-ink/60 uppercase tracking-widest block mb-1">
              Clear Answers
            </span>
            <h2 className="text-3xl font-black font-display uppercase tracking-tight text-ink">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-ink/70 font-sans mt-1.5 font-bold">
              Everything you need to know before posting or bidding on your first gig.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <Card
                  key={index}
                  className="p-5 border-2 border-ink shadow-retro-sm hover:shadow-retro cursor-pointer transition-all bg-accent-amber/10"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-black font-display text-sm text-ink uppercase tracking-tight">
                      {faq.q}
                    </h4>
                    <div className="h-7 w-7 rounded-lg bg-cream border-2 border-ink flex items-center justify-center flex-shrink-0 shadow-retro-sm">
                      {isOpen ? <ChevronUp className="h-4 w-4 text-ink" /> : <ChevronDown className="h-4 w-4 text-ink" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-ink/20 text-xs font-sans text-ink/85 leading-relaxed font-bold animate-fade-in bg-cream p-3 rounded-lg border-2 border-ink shadow-retro-sm">
                      {faq.a}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── FINAL CALL TO ACTION ────────────────────────────────────────────────── */}
      <section className="py-16 bg-cream text-left">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 bg-accent-amber border-thick border-ink rounded-2xl shadow-retro text-left space-y-6 relative overflow-hidden">
            
            <div className="space-y-3 relative z-10 max-w-2xl">
              <Badge variant="outline" className="bg-cream border-2 border-ink text-ink font-mono font-bold text-xs uppercase px-3 py-1 shadow-retro-sm">
                Ready to Start?
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-ink leading-tight">
                Join India's Fastest Growing Local Gig Network.
              </h2>
              <p className="text-xs sm:text-sm text-ink/80 font-sans font-bold leading-relaxed">
                Whether you need a job done today or want to monetize your skills nearby, SkillSphere gives you the tools, protection, and speed to succeed.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 relative z-10 pt-2">
              <Link to="/register">
                <Button variant="coral" size="lg" className="shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-retro-sm transition-all py-3.5 px-6 font-display font-black text-sm uppercase">
                  <span>Create Free Account</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/gigs">
                <Button variant="outline" size="lg" className="bg-cream shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-retro-sm transition-all py-3.5 px-6 font-display font-black text-sm uppercase">
                  <span>Browse Gigs First</span>
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
