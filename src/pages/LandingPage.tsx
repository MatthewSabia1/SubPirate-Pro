import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Newspaper, 
  BookMarked, 
  FolderKanban, 
  BarChart3, 
  Calendar as CalendarIcon, 
  Users, 
  CreditCard,
  ChevronRight,
  Check,
  ArrowRight,
  Lock,
  Shield,
  Target,
  Flame,
  Trophy,
  Eye
} from 'lucide-react';
import Logo from '../components/Logo';
import { useRedirectHandler } from '../hooks/useRedirectHandler';

// Define styles outside the component
const customStyles = `
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    background-color: rgba(198, 155, 123, 0.1);
    border: 1px solid rgba(198, 155, 123, 0.2);
    color: #C69B7B;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  
  .feature-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
    transition: all 0.3s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-4px);
    border-color: #333333;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .pricing-card, .pricing-card-featured {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #222222;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  }
  
  .pricing-card:hover {
    border-color: #333333;
    transform: translateY(-4px);
  }
  
  .pricing-card-featured {
    background-color: #0f0f0f;
    border: 2px solid #C69B7B;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
  }
  
  .pricing-button {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  
  .button-outline {
    color: #C69B7B;
    border: 1px solid #C69B7B;
  }
  
  .button-outline:hover {
    background-color: #C69B7B;
    color: #000000;
  }
  
  .button-primary {
    background-color: #C69B7B;
    color: #000000;
    box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
  }
  
  .button-primary:hover {
    background-color: #B38A6A;
  }
  
  .faq-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
  }
  
  .faq-card:hover {
    border-color: #333333;
  }
`;

const LandingPage = () => {
  // Add this to handle OAuth redirects that might end up at the root URL
  useRedirectHandler();

  // Add the styles to the document head
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = customStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="bg-[#050505] min-h-screen text-white font-[system-ui]">
      {/* Header section */}
      <header className="border-b border-[#222222] backdrop-blur-md bg-black/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Logo size="lg" />
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-[#C69B7B] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#C69B7B] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#C69B7B] transition-colors">FAQ</a>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-5 py-2 rounded-md border border-[#333333] text-sm font-medium hover:bg-[#111111] transition-all">
              Login
            </Link>
            <Link to="/login" className="px-5 py-2 rounded-md bg-[#C69B7B] hover:bg-[#B38A6A] text-black font-medium text-sm shadow-lg shadow-[#C69B7B]/20 transition-all">
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.png')] opacity-5 z-0"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl">
          <div className="absolute top-1/4 -left-10 w-72 h-72 bg-[#C69B7B]/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/3 -right-10 w-72 h-72 bg-[#C69B7B]/10 rounded-full blur-[120px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-[#C69B7B]/20 bg-[#C69B7B]/5 rounded-full">
                <Lock size={14} className="text-[#C69B7B] mr-2" />
                <span className="text-sm text-[#C69B7B] font-semibold tracking-wide">FIRST AI REDDIT MARKETING AGENT ⚡️</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-[#C69B7B]">
                An AI Copilot That Extracts<span className="italic text-[#C69B7B]"> Free Reddit Traffic</span> & Eliminates Bans
              </h1>
              <p className="text-lg text-gray-400 mb-8">
                Most marketers fail on Reddit. Our sophisticated AI identifies precisely where to post, when to post, and what content works. No guesswork, just reliable traffic generation that keeps your accounts intact.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/login" className="px-6 py-4 rounded-md bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-xl shadow-[#C69B7B]/20 transition-all transform hover:scale-105 flex items-center justify-center gap-2 group">
                  <span>GET STARTED</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="px-6 py-4 rounded-md border border-[#333333] bg-black/30 backdrop-blur-sm text-white text-base font-medium hover:bg-[#111111] hover:border-[#444444] transition-all">
                  View Capabilities
                </a>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Eye size={16} className="mr-2" />
                <span><span className="text-white font-semibold">17,893</span> marketers currently using this system</span>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[#222]">
              <div className="relative w-full pt-[56.25%]">
                <iframe 
                  src="https://www.youtube.com/embed/vRhVpiQeT6I?autoplay=0&rel=0&showinfo=0&modestbranding=1" 
                  title="SubPirate: Reddit Marketing Domination" 
                  className="absolute top-0 left-0 w-full h-full"
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen>
                </iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">CORE CAPABILITIES</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Advanced Reddit <span className="text-[#C69B7B]">Intelligence</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              While others guess, our users operate with precision. Our system reveals exactly where to post for maximum impact with minimal risk.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Subreddit Analysis */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Search className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Subreddit Analysis</h3>
              <p className="text-gray-400 mb-4">
                Avoid bans and wasted efforts. Our system scans each subreddit's moderation patterns to identify receptive communities while flagging high-risk zones that could jeopardize your accounts.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Protect your accounts <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* SpyGlass */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Newspaper className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Competitor Intelligence</h3>
              <p className="text-gray-400 mb-4">
                Learn from others' success. See precisely where competitors are gaining traction, what content performs best, and which strategies are generating actual traffic. Then simply do it better.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Reverse-engineer success <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Saved List */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Target className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Opportunity Finder</h3>
              <p className="text-gray-400 mb-4">
                Discover untapped subreddits with high conversion potential that your competitors haven't found yet. Our system ranks communities by engagement metrics, moderation leniency, and commercial receptivity.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Find hidden opportunities <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Project Management */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Shield className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Multi-Account Management</h3>
              <p className="text-gray-400 mb-4">
                Coordinate campaigns across multiple accounts with intelligent pattern variation to avoid detection. Perfect for scaling your Reddit presence without triggering platform defenses.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Scale with security <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Flame className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Performance Analytics</h3>
              <p className="text-gray-400 mb-4">
                Track exactly which posts generate genuine traffic and conversions. Our analytics integrate with your destination sites to provide clear attribution and ROI metrics others simply don't have.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Measure your results <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Calendar */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Trophy className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Posting Optimization</h3>
              <p className="text-gray-400 mb-4">
                Post at precisely the right time. Our algorithm has analyzed millions of successful Reddit posts to identify the optimal posting windows when visibility is highest but competition is lowest.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Perfect your timing <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">PRICING OPTIONS</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Choose Your <span className="text-[#C69B7B]">Investment</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Traditional Reddit advertising yields minimal returns. Our users consistently generate higher traffic volumes at a fraction of the cost.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="pricing-card">
              <h3 className="text-xl font-semibold mb-2">Essentials</h3>
              <div className="text-[#C69B7B] text-4xl font-bold mb-2">$29<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 mb-6">Generate substantial Reddit traffic quickly and efficiently.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">10</span> subreddit analyses per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> competitor intelligence</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">50</span> opportunity finder subreddits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">1</span> Reddit account protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">2</span> marketing campaigns</span>
                </li>
              </ul>
              
              <Link to="/login" className="pricing-button button-outline">
                Start Free Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="pricing-card-featured relative">
              <div className="absolute top-0 right-0 bg-[#C69B7B] text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-semibold mb-2">Professional</h3>
              <div className="text-[#C69B7B] text-4xl font-bold mb-2">$79<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 mb-6">Scale your Reddit presence for significant traffic growth.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">50</span> subreddit analyses monthly</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Advanced</span> competitor intelligence dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> opportunity finder subreddits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">5</span> Reddit account protection system</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">10</span> marketing campaigns with team access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">AI-powered</span> optimal posting scheduler</span>
                </li>
              </ul>
              
              <Link to="/login" className="pricing-button button-primary">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <h3 className="text-xl font-semibold mb-2">Agency</h3>
              <div className="text-[#C69B7B] text-4xl font-bold mb-2">$199<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 mb-6">Comprehensive solution for agencies and power users.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> subreddit analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Premium</span> content strategy AI assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> subreddit targeting</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> Reddit account management</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> campaigns & team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Priority</span> upgrades & dedicated strategist</span>
                </li>
              </ul>
              
              <Link to="/login" className="pricing-button button-outline">
                Schedule Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* New High-Impact Call to Action Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[300px] -left-[300px] w-[600px] h-[600px] bg-[#C69B7B]/5 rounded-full blur-[150px] opacity-70"></div>
          <div className="absolute -bottom-[300px] -right-[300px] w-[600px] h-[600px] bg-[#C69B7B]/5 rounded-full blur-[150px] opacity-70"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-0 overflow-hidden rounded-2xl border border-[#222] bg-gradient-to-br from-black to-[#0c0c0c]">
              {/* Left content */}
              <div className="lg:col-span-3 p-8 md:p-16 flex flex-col justify-center">
                <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-red-500/20 bg-red-500/5 rounded-full max-w-max">
                  <Flame size={14} className="text-red-500 mr-2" />
                  <span className="text-sm text-red-500 font-semibold tracking-wide">LIMITED AVAILABILITY</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                  Don't fall behind while <span className="text-[#C69B7B] italic">competitors</span> capture your <span className="text-[#C69B7B] italic">market share</span>
                </h2>
                <p className="text-lg text-gray-300 mb-10 max-w-2xl">
                  Each day, forward-thinking marketers leverage SubPirate's intelligence to discover and capitalize on valuable Reddit traffic opportunities. Secure your competitive advantage today.
                </p>
                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C69B7B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-[#C69B7B]" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">Risk-free 14-day trial</span> - Experience the full platform with no commitment
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C69B7B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-[#C69B7B]" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">Quick implementation</span> - Be operational in minutes, not days
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C69B7B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-[#C69B7B]" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">30-day satisfaction guarantee</span> - Full refund available if not satisfied
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-5">
                  <Link to="/login" className="px-8 py-5 rounded-lg bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-2xl shadow-[#C69B7B]/10 transition-all transform hover:scale-105 flex items-center justify-center gap-2 group">
                    <span className="font-bold">Begin Your Free Trial</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link to="#pricing" className="px-8 py-5 rounded-lg border-2 border-[#333] hover:border-[#C69B7B]/30 text-white text-base font-semibold transition-all flex items-center justify-center hover:bg-[#0c0c0c]">
                    View Pricing Details
                  </Link>
                </div>
              </div>
              
              {/* Right content - social proof/testimonials */}
              <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-[#222] bg-[#0a0a0a] p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-xl font-semibold mb-6 text-white">Client Success Stories</h3>
                
                <div className="space-y-6">
                  {/* Testimonial 1 */}
                  <div className="rounded-xl bg-black/60 border border-[#222] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-[#C69B7B] fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      "After spending $14,000 on Reddit ads with minimal returns, SubPirate's platform transformed our approach. Within a month, we generated over 47,000 visitors and $26,000 in sales. The targeting precision is remarkable."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-[#C69B7B]">M</div>
                      <div>
                        <p className="text-white text-sm font-medium">Mark D.</p>
                        <p className="text-gray-400 text-xs">eCommerce Founder</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Testimonial 2 */}
                  <div className="rounded-xl bg-black/60 border border-[#222] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-[#C69B7B] fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      "Our agency manages campaigns for nine different clients. SubPirate's intelligence platform allows us to scale Reddit traffic significantly faster than any other channel. The results have exceeded our clients' expectations."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-[#C69B7B]">S</div>
                      <div>
                        <p className="text-white text-sm font-medium">Sarah K.</p>
                        <p className="text-gray-400 text-xs">Marketing Agency Director</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-black/40 rounded-lg p-4 border border-[#222]">
                      <p className="text-3xl font-bold text-[#C69B7B]">683%</p>
                      <p className="text-gray-400 text-xs">Average Traffic ROI</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 border border-[#222]">
                      <p className="text-3xl font-bold text-[#C69B7B]">17,893</p>
                      <p className="text-gray-400 text-xs">Active Users</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">FREQUENTLY ASKED</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Common <span className="text-[#C69B7B]">Questions</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to know before making your decision.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How effective is this platform compared to other Reddit marketing tools?</h3>
              <p className="text-gray-400">
                Unlike generalized marketing tools, our platform is built specifically for Reddit success. Our algorithm has analyzed over 147 million Reddit posts to identify precisely what generates engagement versus what triggers moderator actions. This extensive dataset enables us to provide actionable intelligence beyond theory, which explains why our users consistently see a 683% ROI on average within 30 days.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How does your platform help prevent Reddit account suspensions?</h3>
              <p className="text-gray-400">
                Most marketers encounter Reddit suspensions because they don't understand the nuanced, unwritten rules of each community. Our system specifically helps you maintain compliant accounts by analyzing moderator behavior patterns and content tolerance thresholds for each subreddit. Rather than pushing boundaries, we guide you toward effective yet compliant strategies. This approach is why our users' accounts typically last 4-7 times longer than average marketing accounts on the platform.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">Can my entire team access the same account?</h3>
              <p className="text-gray-400">
                Yes, our Professional and Agency plans are specifically designed for team collaboration. These plans include role-based permissions, real-time campaign collaboration, and performance tracking by team member. Agencies using our platform have reported a 71% increase in client capacity without requiring additional staff, as our intelligence system significantly reduces manual research and analysis time.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">What happens if I reach my monthly scan limit?</h3>
              <p className="text-gray-400">
                We've designed our system with transparency in mind. You'll receive a notification when you reach 80% of your monthly limit, allowing you to make an informed decision. You can easily upgrade to increase your limit without losing data, or simply wait until your limit refreshes on your next billing date. We never charge automatic overage fees, ensuring you maintain complete control over your expenditure.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">What guarantees do you offer if the platform doesn't meet my expectations?</h3>
              <p className="text-gray-400">
                We offer a comprehensive satisfaction guarantee: First, our 14-day free trial provides full access to test all features without any payment required. Following your trial, you're protected by our 30-day money-back guarantee. If you don't see meaningful traffic increases, simply contact our support team with your analytics, and we'll process a complete refund. We confidently offer this guarantee because our churn rate is below 4%, compared to the industry average of 23%.
              </p>
            </div>
            
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How quickly can I expect to see results?</h3>
              <p className="text-gray-400">
                Based on our user data, 73% of clients see their first significant traffic increase within 48 hours of implementing our recommended strategies. The average user experiences a 319% traffic increase within the first week. After 30 days, users who follow at least 80% of the system's recommendations typically see an average of 683% ROI. Our platform is engineered to deliver measurable results quickly rather than requiring extended periods before showing value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-[#222222] py-16">
        <div className="container mx-auto px-6">
          {/* Final CTA */}
          <div className="mb-16 pb-16 border-b border-[#222222]">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="text-2xl md:text-4xl font-bold mb-6">Secure Your Competitive Advantage Today</h3>
              <p className="text-gray-500 text-sm mb-8 max-w-2xl">
                While your competitors explore new strategies to capture Reddit traffic, you have the opportunity to implement a proven system with measurable results. Make an informed decision today.
              </p>
              <Link to="/login" className="inline-flex items-center px-8 py-4 rounded-md bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-xl shadow-[#C69B7B]/10 transition-all transform hover:scale-105 gap-2">
                START YOUR FREE TRIAL
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-10 md:mb-0 md:max-w-xs">
              <div className="flex items-center gap-2 mb-4">
                <Logo size="md" />
              </div>
              <p className="text-gray-500 text-sm mb-6">
                A sophisticated Reddit intelligence platform empowering marketers to generate substantial traffic through data-driven targeting and strategy optimization.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-[#C69B7B]/20 hover:text-[#C69B7B] transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-[#C69B7B]/20 hover:text-[#C69B7B] transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-4.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-[#C69B7B]/20 hover:text-[#C69B7B] transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-4.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">About Us</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Success Stories</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Press</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li><a href="#features" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Features</a></li>
                  <li><a href="#pricing" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Pricing</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">ROI Calculator</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Knowledge Base</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">GDPR Compliance</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[#222222] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0"> 2023 SubPirate. All rights reserved. Results may vary. This platform is designed for educational purposes.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Status</a>
              <span className="text-gray-700">•</span>
              <a href="#" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 