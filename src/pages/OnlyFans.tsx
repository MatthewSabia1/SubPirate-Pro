import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  DollarSign, 
  Users, 
  Rocket, 
  Zap, 
  Eye, 
  Target, 
  Shield, 
  Camera, 
  TrendingUp,
  ChevronRight,
  Check,
  ArrowRight,
  Clock,
  Instagram,
  Flame,
  Star,
  Trophy,
  Twitter,
  Youtube
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
    background-color: rgba(236, 72, 153, 0.1);
    border: 1px solid rgba(236, 72, 153, 0.2);
    color: #EC4899;
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
    height: 100%;
  }
  
  .feature-card:hover {
    transform: translateY(-4px);
    border-color: rgba(236, 72, 153, 0.2);
    box-shadow: 0 10px 30px -15px rgba(236, 72, 153, 0.15);
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
    border: 2px solid #EC4899;
    box-shadow: 0 10px 30px -15px rgba(236, 72, 153, 0.2);
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
    color: #EC4899;
    border: 1px solid #EC4899;
  }
  
  .button-outline:hover {
    background-color: rgba(236, 72, 153, 0.1);
    color: #EC4899;
  }
  
  .button-primary {
    background-image: linear-gradient(to right, #EC4899, #8B5CF6);
    color: white;
    box-shadow: 0 4px 14px rgba(236, 72, 153, 0.25);
  }
  
  .button-primary:hover {
    background-image: linear-gradient(to right, #DB2777, #7C3AED);
  }
  
  .faq-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
  }
  
  .faq-card:hover {
    border-color: rgba(236, 72, 153, 0.2);
  }

  .creator-card {
    position: relative;
    overflow: hidden;
    border-radius: 0.75rem;
    background: #0f0f0f;
    border: 1px solid #222222;
    transition: all 0.3s ease;
  }
  
  .creator-card:hover {
    transform: translateY(-4px);
    border-color: rgba(236, 72, 153, 0.2);
    box-shadow: 0 10px 30px -15px rgba(236, 72, 153, 0.15);
  }
  
  .creator-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 0.75rem 0.75rem 0 0;
  }
  
  .creator-info {
    padding: 1.5rem;
  }
  
  .creator-stats {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  
  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #EC4899;
    font-size: 0.875rem;
  }
`;

const OnlyFansLandingPage = () => {
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
            <a href="#spyglass" className="hover:text-[#C69B7B] transition-colors">SpyGlass</a>
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
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.png')] opacity-5 z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-[120px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left order-2 md:order-1">
              <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-pink-500/20 bg-pink-500/5 rounded-full">
                <Rocket size={14} className="text-pink-400 mr-2" />
                <span className="text-sm text-pink-400 font-bold tracking-wide">FOR ONLYFANS CREATORS</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Grow Your OnlyFans With <span className="text-pink-400 italic">Automated</span> Reddit Marketing
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Stop wasting time on Reddit. Our AI posts your content to the best-converting subreddits 24/7, with optimized titles and timing to maximize subscribers while avoiding shadowbans.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/login" className="px-8 py-4 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-base font-bold shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2 group">
                  <span>GET MORE SUBSCRIBERS</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="px-8 py-4 rounded-md border border-gray-700 text-white text-base font-medium hover:bg-gray-800/50 transition-all">
                  See How It Works
                </a>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center text-sm">
                  <Users size={14} className="text-pink-400 mr-2" />
                  <span><span className="text-white font-bold">1,200+</span> creators</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check size={14} className="text-pink-400 mr-2" />
                  <span><span className="text-white font-bold">14-day</span> free trial</span>
                </div>
              </div>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="absolute -top-8 -right-8 w-48 h-48 bg-pink-500/10 rounded-full blur-[50px] z-0"></div>
              <div className="relative">
                <div className="absolute -top-6 -left-6 w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-2xl transform rotate-3"></div>
                <div className="relative bg-[#0c0c0c] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                  <div className="p-3 border-b border-gray-800 flex items-center">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-sm text-center text-gray-400 flex-grow">Auto-Posting Dashboard</div>
                  </div>
                  <div className="p-6 bg-[#0c0c0c]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-white">Active Campaigns</div>
                      <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full font-medium">3 Running</div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-pink-500/20 rounded-md flex items-center justify-center mr-3">
                              <Camera size={16} className="text-pink-400" />
                            </div>
                            <span className="font-medium">Fitness Content</span>
                          </div>
                          <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">Active</div>
                        </div>
                        <div className="text-xs text-gray-400 flex justify-between">
                          <span>Next post: 47 minutes</span>
                          <span>8 subreddits targeted</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-md flex items-center justify-center mr-3">
                              <Star size={16} className="text-purple-400" />
                            </div>
                            <span className="font-medium">Promo Campaign</span>
                          </div>
                          <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">Active</div>
                        </div>
                        <div className="text-xs text-gray-400 flex justify-between">
                          <span>Next post: 2 hours</span>
                          <span>5 subreddits targeted</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-pink-500/20 rounded-md flex items-center justify-center mr-3">
                              <Flame size={16} className="text-pink-400" />
                            </div>
                            <span className="font-medium">Launch Special</span>
                          </div>
                          <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">Active</div>
                        </div>
                        <div className="text-xs text-gray-400 flex justify-between">
                          <span>Next post: 3 hours</span>
                          <span>7 subreddits targeted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-16 bg-gray-900 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 mb-3 border border-pink-500/20 bg-pink-500/5 rounded-full">
              <Star size={14} className="text-pink-400 mr-2" />
              <span className="text-sm text-pink-400 font-medium">CREATOR STORIES</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Real Results from Real Creators</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Hear from creators who've used our tools to grow their Reddit presence and OnlyFans subscribers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-pink-500/30 transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1535324492437-d8dea70a38a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                alt="Creator profile" 
                className="w-full h-48 object-cover object-center"
              />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Sophie K.</h3>
                    <p className="text-sm text-gray-400">Fitness Content Creator</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg px-2 py-1">
                    <span className="text-xs text-green-400 font-medium">+68% Growth</span>
                  </div>
                </div>
                <div className="mt-4 text-gray-300 text-sm">
                  "I was struggling to find the right subreddits that wouldn't ban me. SubPirate's analysis tool helped me identify 6 new communities that are perfect for my fitness content, and my subscriber count has grown steadily since."
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center text-xs text-gray-400">
                    <TrendingUp size={14} className="mr-1 text-pink-400" />
                    <span>230 new subs/month</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <Clock size={14} className="mr-1 text-pink-400" />
                    <span>Using for 3 months</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-pink-500/30 transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1599842057874-37393e9342df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                alt="Creator profile" 
                className="w-full h-48 object-cover object-center"
              />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Alicia J.</h3>
                    <p className="text-sm text-gray-400">Cosplay Creator</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg px-2 py-1">
                    <span className="text-xs text-green-400 font-medium">+92% Growth</span>
                  </div>
                </div>
                <div className="mt-4 text-gray-300 text-sm">
                  "I used to get shadowbanned every few weeks and lose all my momentum. The heatmap feature shows me exactly when to post in each subreddit, and I haven't had a single ban in 4 months. My income is finally predictable."
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center text-xs text-gray-400">
                    <TrendingUp size={14} className="mr-1 text-pink-400" />
                    <span>185 new subs/month</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <Clock size={14} className="mr-1 text-pink-400" />
                    <span>Using for 4 months</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-pink-500/30 transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                alt="Creator profile" 
                className="w-full h-48 object-cover object-center"
              />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Zoe T.</h3>
                    <p className="text-sm text-gray-400">Content Agency Director</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg px-2 py-1">
                    <span className="text-xs text-green-400 font-medium">8 Models</span>
                  </div>
                </div>
                <div className="mt-4 text-gray-300 text-sm">
                  "As an agency, we needed a way to manage Reddit marketing for multiple models efficiently. SubPirate's dashboard lets us track performance across all accounts and quickly identify which subreddits work best for each creator's niche."
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center text-xs text-gray-400">
                    <TrendingUp size={14} className="mr-1 text-pink-400" />
                    <span>40% time saved</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <Clock size={14} className="mr-1 text-pink-400" />
                    <span>Using for 6 months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="py-24 relative bg-[#050505]">
        <div className="absolute inset-0 bg-[url('/hero-pattern.png')] opacity-5 z-0"></div>
        <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-[#080808] to-transparent"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 mb-3 border border-pink-500/20 bg-pink-500/5 rounded-full">
              <Zap size={14} className="text-pink-400 mr-2" />
              <span className="text-sm text-pink-400 font-bold">PLATFORM FEATURES</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Reddit Marketing <span className="text-pink-400">On Autopilot</span></h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Stop wasting hours on Reddit. Our all-in-one platform automates your marketing so you can focus on creating content.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Smart Auto Posting - NEW FEATURE */}
            <div className="feature-card group relative overflow-hidden">
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded">
                NEW
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <Rocket className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-400 transition-colors">Smart Auto Posting</h3>
              <p className="text-gray-400 mb-4">
                Connect your Reddit accounts and let our AI post for you 24/7. We'll automatically post your content to the right subreddits at peak times with optimized titles that convert.
              </p>
              <div className="flex items-center text-pink-400">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Automate your Reddit presence <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Subreddit Analysis */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <Search className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-400 transition-colors">Subreddit Risk Analysis</h3>
              <p className="text-gray-400 mb-4">
                Stop getting banned. Our AI scans each community's moderation patterns to identify safe subreddits and flags high-risk zones that could get your accounts shadowbanned.
              </p>
              <div className="flex items-center text-pink-400">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Protect your accounts <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* SpyGlass */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <Eye className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-400 transition-colors">Competitor Intelligence</h3>
              <p className="text-gray-400 mb-4">
                See exactly which subreddits your top competitors post in. Learn their strategies, posting frequency, and engagement patterns to outperform them.
              </p>
              <div className="flex items-center text-pink-400">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Steal winning strategies <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* AI Title Generator */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <Zap className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-400 transition-colors">AI Title Generator</h3>
              <p className="text-gray-400 mb-4">
                Our AI creates high-converting Reddit titles tailored to each subreddit's preferences. Get titles that grab attention, avoid spam filters, and drive clicks to your profile.
              </p>
              <div className="flex items-center text-pink-400">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Generate better titles <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Posting Heatmap */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <Clock className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-400 transition-colors">Peak Time Posting</h3>
              <p className="text-gray-400 mb-4">
                Post when your potential subscribers are most active. Our heat map shows the exact times each subreddit has the highest engagement for your content type.
              </p>
              <div className="flex items-center text-pink-400">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Perfect your timing <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                <TrendingUp className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-400 transition-colors">Conversion Tracking</h3>
              <p className="text-gray-400 mb-4">
                Track exactly which subreddits and posts drive subscribers to your OnlyFans. See metrics on engagement, click-through rates, and subscriber conversions.
              </p>
              <div className="flex items-center text-pink-400">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Measure your results <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/login" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-base font-bold shadow-xl shadow-pink-500/10 transition-all transform hover:scale-105 rounded-lg">
              GET STARTED FREE
              <ArrowRight size={18} className="ml-2" />
            </Link>
            <p className="text-gray-500 text-sm mt-4">No credit card required to get started</p>
          </div>
        </div>
      </section>

      {/* Smart Auto Posting Feature Highlight */}
      <section id="autopost" className="py-24 bg-[#080808] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#080808] z-0"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 mb-3 border border-pink-500/20 bg-pink-500/5 rounded-full">
              <Rocket size={14} className="text-pink-400 mr-2" />
              <span className="text-sm text-pink-400 font-bold">NEW FEATURE</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Hands-Free Reddit Marketing with <span className="text-pink-400">Smart Auto Posting</span></h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              Connect your Reddit accounts once and our AI handles everything: posting, titles, timing, and subreddit selection—24/7, 365 days a year.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div className="order-2 md:order-1">
              <div className="relative bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-xl p-6 pb-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/5 rounded-full blur-[60px]"></div>
                <img 
                  src="https://images.unsplash.com/photo-1551033406-611cf9a28f67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                  alt="Automated Reddit Posting" 
                  className="relative rounded-t-lg shadow-2xl mt-4"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold mb-6">Set It and Forget It Reddit Marketing</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-5">
                  <div className="bg-pink-500/10 p-3 rounded-lg">
                    <Zap size={24} className="text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Automated Content Posting</h4>
                    <p className="text-gray-300">Connect your Reddit accounts, upload your media, and our AI will post for you 24/7 to the best-converting subreddits at optimal times.</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="bg-pink-500/10 p-3 rounded-lg">
                    <Target size={24} className="text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">AI-Generated Titles That Convert</h4>
                    <p className="text-gray-300">Our AI analyzes millions of successful posts to generate high-converting titles for each subreddit that maximize clicks to your profile.</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="bg-pink-500/10 p-3 rounded-lg">
                    <Clock size={24} className="text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Smart Scheduling</h4>
                    <p className="text-gray-300">Posts are automatically scheduled for peak engagement times in each subreddit, ensuring maximum visibility and engagement.</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="bg-pink-500/10 p-3 rounded-lg">
                    <Shield size={24} className="text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Account Protection</h4>
                    <p className="text-gray-300">Our system respects each subreddit's rules and posting frequency limits to keep your accounts safe from shadowbans and suspensions.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <Link to="/login" className="inline-flex items-center px-7 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg shadow-xl shadow-pink-500/10 transition-all gap-2">
                  START FOR FREE
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SpyGlass Section */}
      <section id="spyglass" className="py-24 bg-[#0c0c0c] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -right-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/3 -left-20 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-[#0f0f0f] rounded-xl overflow-hidden border border-[#222222] shadow-2xl">
                <div className="border-b border-[#222222] p-3 flex items-center">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 text-center text-sm text-gray-400">Competitor Analysis</div>
                </div>
                <div className="p-5">
                  <div className="bg-[#111111] border border-[#222222] rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <Eye size={16} className="text-pink-400 mr-2" />
                      <span className="text-sm text-gray-300">Analyzing: u/fitnesscreator</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-3 hover:border-pink-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-[#151515] rounded-md mr-3 flex items-center justify-center text-xs text-gray-400">r/</div>
                          <span className="font-medium">FitGirlsGuide</span>
                        </div>
                        <div className="text-pink-400 text-xs font-medium px-2 py-1 bg-pink-500/10 rounded-md">34 posts</div>
                      </div>
                      <div className="flex items-center text-xs text-gray-400 justify-between">
                        <div className="flex items-center">
                          <Users size={14} className="mr-1" />
                          <span>478K members</span>
                        </div>
                        <div className="text-green-400 flex items-center">
                          <TrendingUp size={12} className="mr-1" />
                          <span>High conversion</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-3 hover:border-pink-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-[#151515] rounded-md mr-3 flex items-center justify-center text-xs text-gray-400">r/</div>
                          <span className="font-medium">OnlyFansAdvice</span>
                        </div>
                        <div className="text-pink-400 text-xs font-medium px-2 py-1 bg-pink-500/10 rounded-md">27 posts</div>
                      </div>
                      <div className="flex items-center text-xs text-gray-400 justify-between">
                        <div className="flex items-center">
                          <Users size={14} className="mr-1" />
                          <span>315K members</span>
                        </div>
                        <div className="text-yellow-400 flex items-center">
                          <TrendingUp size={12} className="mr-1" />
                          <span>Medium conversion</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-3 hover:border-pink-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-[#151515] rounded-md mr-3 flex items-center justify-center text-xs text-gray-400">r/</div>
                          <span className="font-medium">SellerCircleStage</span>
                        </div>
                        <div className="text-pink-400 text-xs font-medium px-2 py-1 bg-pink-500/10 rounded-md">22 posts</div>
                      </div>
                      <div className="flex items-center text-xs text-gray-400 justify-between">
                        <div className="flex items-center">
                          <Users size={14} className="mr-1" />
                          <span>87K members</span>
                        </div>
                        <div className="text-green-400 flex items-center">
                          <TrendingUp size={12} className="mr-1" />
                          <span>High conversion</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-3 hover:border-pink-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-[#151515] rounded-md mr-3 flex items-center justify-center text-xs text-gray-400">r/</div>
                          <span className="font-medium">FitnessMotivation</span>
                        </div>
                        <div className="text-pink-400 text-xs font-medium px-2 py-1 bg-pink-500/10 rounded-md">19 posts</div>
                      </div>
                      <div className="flex items-center text-xs text-gray-400 justify-between">
                        <div className="flex items-center">
                          <Users size={14} className="mr-1" />
                          <span>1.1M members</span>
                        </div>
                        <div className="text-red-400 flex items-center">
                          <Shield size={12} className="mr-1" />
                          <span>Risk: High</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center px-3 py-1.5 mb-4 border border-pink-500/20 bg-pink-500/5 rounded-full">
                <Eye size={14} className="text-pink-400 mr-2" />
                <span className="text-sm text-pink-400 font-bold">COMPETITOR INSIGHTS</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold mb-5">Copy Successful <span className="text-pink-400">Creators</span></h2>
              <p className="text-gray-300 mb-8">
                Stop guessing and start winning. See exactly which subreddits are driving subscribers for top OnlyFans creators in your niche, then target the same ones.
              </p>
              <div className="space-y-5 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Target size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Find Hot Subreddits</h3>
                    <p className="text-gray-400">
                      See which communities your competitors are posting in, sorted by member count and conversion rates.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Clock size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">See Best Posting Times</h3>
                    <p className="text-gray-400">
                      Learn exactly when your competitors post to maximize engagement and subscribers.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Shield size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Avoid Risky Subreddits</h3>
                    <p className="text-gray-400">
                      We automatically flag communities with high ban rates so you don't waste time on subreddits that will ban your accounts.
                    </p>
                  </div>
                </div>
              </div>
              <Link to="/login" className="inline-flex items-center px-7 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-base font-bold shadow-xl shadow-pink-500/10 transition-all gap-2">
                START SPYING FOR FREE
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-[#050505] relative">
        <div className="absolute inset-0 bg-[url('/hero-pattern.png')] opacity-[0.03] z-0"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 mb-3 border border-pink-500/20 bg-pink-500/5 rounded-full">
              <Star size={14} className="text-pink-400 mr-2" />
              <span className="text-sm text-pink-400 font-bold">CREATOR SUCCESS STORIES</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Real Results From <span className="text-pink-400">Real Creators</span></h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Here's what OnlyFans creators are saying about their subscriber growth with SubPirate
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all hover:-translate-y-1">
              <div className="flex items-center mb-5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-pink-400 fill-pink-400" />
                  ))}
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-5 leading-relaxed">
                "I wasted 3 months posting on Reddit with almost no results. With SubPirate's auto-posting, I'm getting 5-10 new subscribers DAILY without lifting a finger. The AI-generated titles convert way better than what I was writing myself."
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-pink-500/10">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 font-medium">KD</div>
                <div>
                  <p className="font-medium">Kelly D.</p>
                  <p className="text-xs text-pink-300/80">Fitness Creator • 32% subscriber growth</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all hover:-translate-y-1">
              <div className="flex items-center mb-5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-pink-400 fill-pink-400" />
                  ))}
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-5 leading-relaxed">
                "After getting shadowbanned 4 times, I was ready to give up on Reddit. The risk analysis tool showed me exactly which subreddits were safe to post in. Since using SubPirate, I haven't had a single ban and my subscriber count has doubled."
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-pink-500/10">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 font-medium">SB</div>
                <div>
                  <p className="font-medium">Sarah B.</p>
                  <p className="text-xs text-pink-300/80">Cosplay Creator • 112% revenue increase</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all hover:-translate-y-1">
              <div className="flex items-center mb-5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-pink-400 fill-pink-400" />
                  ))}
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-5 leading-relaxed">
                "Managing Reddit for 7 OnlyFans models used to take 40+ hours a week. With the auto-posting feature, it's fully automated and we're seeing better results than before. It literally paid for itself within the first week."
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-pink-500/10">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 font-medium">AR</div>
                <div>
                  <p className="font-medium">Ashley R.</p>
                  <p className="text-xs text-pink-300/80">Agency Owner • 7 creators managed</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/login" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-base font-bold shadow-xl shadow-pink-500/10 transition-all rounded-lg">
              JOIN THESE CREATORS
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#0c0c0c] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -right-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/3 -left-20 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 mb-3 border border-pink-500/20 bg-pink-500/5 rounded-full">
              <DollarSign size={14} className="text-pink-400 mr-2" />
              <span className="text-sm text-pink-400 font-bold">PRICING PLANS</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple Pricing, <span className="text-pink-400">Massive ROI</span></h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              All plans have a free tier to help you get started right away.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="pricing-card group">
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2">Starter</h3>
                <p className="text-gray-400 mb-6">For creators just getting started</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-bold text-white">$19</span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">5 hours</span> of auto-posting per day</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Basic</span> competitor research</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">1</span> Reddit account connection</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">AI</span> title generation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Basic</span> posting analytics</span>
                  </div>
                </div>
                
                <Link to="/login" className="pricing-button button-outline group-hover:bg-pink-500/5">
                  Start For Free
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="pricing-card-featured relative">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                BEST VALUE
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2">Pro Creator</h3>
                <p className="text-gray-400 mb-6">Most popular for full-time creators</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-bold text-white">$49</span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">24/7</span> unlimited auto-posting</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Advanced</span> competitor intelligence</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">3</span> Reddit account connections</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Advanced</span> AI title generation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Full</span> conversion analytics</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Priority</span> email support</span>
                  </div>
                </div>
                
                <Link to="/login" className="pricing-button button-primary">
                  Start For Free
                </Link>
              </div>
            </div>

            {/* Agency Plan */}
            <div className="pricing-card group">
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2">Agency</h3>
                <p className="text-gray-400 mb-6">For teams managing multiple creators</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-bold text-white">$99</span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">24/7</span> unlimited auto-posting</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Full</span> competitor intelligence suite</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">10</span> Reddit account connections</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Team</span> management dashboard</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Client</span> reporting tools</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-pink-400" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Dedicated</span> account manager</span>
                  </div>
                </div>
                
                <Link to="/login" className="pricing-button button-outline group-hover:bg-pink-500/5">
                  Start For Free
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex p-1 bg-[#0f0f0f] rounded-lg border border-[#222222] space-x-1 mb-8">
              <button className="px-5 py-2 bg-[#1a1a1a] text-white text-sm font-medium rounded">Monthly</button>
              <button className="px-5 py-2 text-gray-400 text-sm font-medium rounded hover:bg-[#1a1a1a]/30">Annual (Save 20%)</button>
            </div>
            <p className="text-gray-400 text-sm">All plans include limited access to all features. No credit card required. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#050505] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[300px] -left-[300px] w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-[150px] opacity-50"></div>
          <div className="absolute -bottom-[300px] -right-[300px] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] opacity-50"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-[#0a0a0a] to-[#111111] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
              <div className="grid lg:grid-cols-5 gap-0">
                {/* Left content */}
                <div className="lg:col-span-3 p-8 md:p-16 flex flex-col justify-center">
                  <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-pink-500/20 bg-pink-500/5 rounded-full max-w-max">
                    <Flame size={14} className="text-pink-400 mr-2" />
                    <span className="text-sm text-pink-400 font-bold tracking-wide">SPECIAL LAUNCH OFFER</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                    Your Competitors Are Already <span className="text-pink-400 italic">Stealing</span> Your Subscribers
                  </h2>
                  <p className="text-lg text-gray-300 mb-10">
                    Every day you're not using automated marketing, you're leaving money on the table. Don't get left behind while other creators take your potential subscribers.
                  </p>
                  <div className="space-y-6 mb-10">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={14} className="text-pink-400" />
                      </div>
                      <p className="text-gray-300">
                        <span className="font-bold text-white">Unlimited auto-posting</span> - Let AI do the work for you 24/7
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={14} className="text-pink-400" />
                      </div>
                      <p className="text-gray-300">
                        <span className="font-bold text-white">30-day money-back guarantee</span> - Risk-free testing
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={14} className="text-pink-400" />
                      </div>
                      <p className="text-gray-300">
                        <span className="font-bold text-white">Free setup support</span> - We'll help you get started
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-5">
                    <Link to="/login" className="px-8 py-5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-base font-bold shadow-2xl shadow-pink-500/20 transition-all transform hover:scale-105 flex items-center justify-center gap-2 group">
                      <span>START YOUR 14-DAY FREE TRIAL</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link to="#pricing" className="px-8 py-5 rounded-lg border border-[#333] hover:border-pink-500/20 text-white text-base font-medium transition-all flex items-center justify-center hover:bg-[#0c0c0c]">
                      Compare All Plans
                    </Link>
                  </div>
                </div>
                
                {/* Right content - results */}
                <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-[#222222] bg-[#0c0c0c] p-8 md:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-6">
                    <Trophy size={18} className="text-pink-400" />
                    <h3 className="text-xl font-semibold text-white">Creator Results</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Result stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 rounded-lg p-4 border border-[#222222]">
                        <p className="text-3xl font-bold text-pink-400">87%</p>
                        <p className="text-gray-400 text-xs">Average subscriber growth</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-4 border border-[#222222]">
                        <p className="text-3xl font-bold text-pink-400">1,200+</p>
                        <p className="text-gray-400 text-xs">Active creators</p>
                      </div>
                    </div>
                    
                    {/* Result cards */}
                    <div className="rounded-xl bg-black/40 border border-[#222222] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-gray-300 text-sm font-medium">Average Monthly Revenue</p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Before SubPirate</p>
                        <p className="text-gray-300 text-sm font-medium">$2,100</p>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 text-sm">After 30 Days</p>
                        <p className="text-pink-400 text-lg font-bold">$5,700</p>
                      </div>
                      <div className="h-2 w-full bg-[#222222] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-purple-600 w-[75%] rounded-full"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Based on average results from our Pro plan users</p>
                    </div>
                    
                    <div className="rounded-xl bg-black/40 border border-[#222222] p-5">
                      <p className="text-white text-sm mb-3 font-medium">Top Performing Subreddits:</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-pink-500/10 rounded-full flex items-center justify-center mr-2 text-pink-400 text-xs">r/</div>
                            <span className="text-sm text-gray-300">OnlyFans101</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">High ROI</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-pink-500/10 rounded-full flex items-center justify-center mr-2 text-pink-400 text-xs">r/</div>
                            <span className="text-sm text-gray-300">SellerCircleStage</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">High ROI</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-pink-500/10 rounded-full flex items-center justify-center mr-2 text-pink-400 text-xs">r/</div>
                            <span className="text-sm text-gray-300">FitNakedGirls</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">High ROI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-[#222222] py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="mb-8 md:mb-0">
              <Logo size="md" />
              <p className="text-gray-500 text-sm max-w-xs mt-4">
                Automated Reddit marketing for OnlyFans creators. Get more subscribers with less work.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link to="/login" className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg shadow-pink-500/10 transition-all">
                Get Started Free
              </Link>
            </div>
          </div>
          
          <div className="border-t border-[#222222] pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">© 2023 SubPirate. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Terms of Service</a>
              <a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-[#080808] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -right-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/3 -left-20 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 mb-3 border border-pink-500/20 bg-pink-500/5 rounded-full">
              <DollarSign size={14} className="text-pink-400 mr-2" />
              <span className="text-sm text-pink-400 font-bold">FREQUENTLY ASKED</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Common <span className="text-pink-400">Questions</span></h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Everything you need to know before getting started with SubPirate.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
              <h3 className="text-xl font-semibold mb-2">How does SubPirate help OnlyFans creators specifically?</h3>
              <p className="text-gray-300">
                SubPirate is uniquely designed for adult content creators by helping you identify the most receptive subreddits for your niche, analyzing when to post for maximum visibility, and protecting your accounts from bans. Our SpyGlass tool lets you see where successful OnlyFans creators in your niche are posting, giving you a roadmap to grow your subscriber base through Reddit marketing.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
              <h3 className="text-xl font-semibold mb-2">How can I avoid getting banned on Reddit while promoting my OnlyFans?</h3>
              <p className="text-gray-300">
                Reddit bans are the #1 challenge for OnlyFans creators. Our platform analyzes each subreddit's moderation patterns, rules, and historical actions to identify safe communities. We provide clear guidance on each subreddit's tolerance for promotional content, the right posting frequency, and content approach. Creators using our platform report 87% fewer account suspensions compared to their previous marketing efforts.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
              <h3 className="text-xl font-semibold mb-2">How does the SpyGlass competitor analysis tool work?</h3>
              <p className="text-gray-300">
                SpyGlass lets you enter any Reddit username of a successful OnlyFans creator in your niche. The tool analyzes their posting history to identify which subreddits they post in most frequently, which posts get the most engagement, and what posting patterns they follow. You can then build your own strategy based on proven tactics from top performers, rather than starting from scratch.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
              <h3 className="text-xl font-semibold mb-2">Do you help with content creation or just where to post?</h3>
              <p className="text-gray-300">
                While we don't create content for you, our AI analysis provides detailed recommendations on what type of content performs best in each subreddit. This includes optimal image styles, caption strategies, posting times, and title formats that drive the highest engagement. Many creators report that these insights significantly improve their conversion rates even with their existing content.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
              <h3 className="text-xl font-semibold mb-2">How is this different from promotion groups or shoutout networks?</h3>
              <p className="text-gray-300">
                Unlike promotion groups that typically reach only other creators, SubPirate helps you target actual potential subscribers through Reddit's vast user base of over 52 million daily active users. Our tools provide data-driven marketing intelligence rather than shallow cross-promotion. The result is higher-quality subscribers who convert to paying fans, not just more exposure to other creators selling their own content.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-pink-500/5 to-purple-600/5 rounded-xl border border-pink-500/20 p-6 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
              <h3 className="text-xl font-semibold mb-2">I manage multiple OnlyFans models. Can I use one account for all of them?</h3>
              <p className="text-gray-300">
                Yes, our Agency tier is specifically designed for management teams handling multiple OnlyFans creators. You'll get a centralized dashboard to track performance across all models, individual analytics for each creator, and the ability to apply successful strategies from one creator to others. Agencies using our platform report being able to manage 40% more models with the same staff resources.
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
              <h3 className="text-2xl md:text-4xl font-bold mb-6">Ready to Scale Your OnlyFans Revenue?</h3>
              <p className="text-gray-500 text-sm mb-8 max-w-2xl mx-auto">
                Join thousands of OnlyFans creators who have transformed their income with strategic Reddit marketing. Get started today with no commitment.
              </p>
              <Link to="/login" className="inline-flex items-center px-8 py-4 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-base font-semibold shadow-xl shadow-pink-500/10 transition-all transform hover:scale-105 gap-2">
                START FOR FREE
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
                AI-powered Reddit marketing intelligence platform for OnlyFans creators and agencies, helping grow subscriber bases through data-driven strategies.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-pink-500/20 hover:text-pink-400 transition-colors">
                  <Instagram size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-pink-500/20 hover:text-pink-400 transition-colors">
                  <Twitter size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-pink-500/20 hover:text-pink-400 transition-colors">
                  <Youtube size={18} />
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">About Us</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Success Stories</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Press</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li><a href="#features" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Features</a></li>
                  <li><a href="#pricing" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Pricing</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Creator Guide</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Blog</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Content Guidelines</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">DMCA</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[#222222] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">© 2023 SubPirate. All rights reserved. Not affiliated with OnlyFans or Reddit.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Status</a>
              <span className="text-gray-700">•</span>
              <a href="#" className="text-gray-500 hover:text-pink-400 transition-colors text-sm">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OnlyFansLandingPage;