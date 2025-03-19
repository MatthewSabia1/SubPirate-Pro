import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ShoppingBag, 
  BarChart, 
  Globe, 
  Zap, 
  DollarSign, 
  TrendingUp,
  ChevronRight,
  Check,
  ArrowRight,
  Shield,
  Rocket,
  Star,
  Tag,
  Users,
  LineChart,
  Smartphone,
  Calendar as CalendarIcon,
  Target,
  Eye,
  Flame
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
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #10B981;
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
    border-color: rgba(16, 185, 129, 0.2);
    box-shadow: 0 10px 30px -15px rgba(16, 185, 129, 0.15);
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
    border: 2px solid #10B981;
    box-shadow: 0 10px 30px -15px rgba(16, 185, 129, 0.2);
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
    color: #10B981;
    border: 1px solid #10B981;
  }
  
  .button-outline:hover {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10B981;
  }
  
  .button-primary {
    background-image: linear-gradient(to right, #10B981, #0694A2);
    color: white;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
  }
  
  .button-primary:hover {
    background-image: linear-gradient(to right, #0D9488, #0891B2);
  }
  
  .faq-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
  }
  
  .faq-card:hover {
    border-color: rgba(16, 185, 129, 0.2);
  }

  .product-card {
    position: relative;
    overflow: hidden;
    border-radius: 0.75rem;
    background: #0f0f0f;
    border: 1px solid #222222;
    transition: all 0.3s ease;
  }
  
  .product-card:hover {
    transform: translateY(-4px);
    border-color: rgba(16, 185, 129, 0.2);
    box-shadow: 0 10px 30px -15px rgba(16, 185, 129, 0.15);
  }
  
  .subreddit-browser {
    background-color: #0f0f0f;
    border-radius: 1rem;
    border: 1px solid #222;
    overflow: hidden;
    max-width: 100%;
  }
  
  .subreddit-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #121212;
    border-bottom: 1px solid #222;
  }
  
  .browser-dots {
    display: flex;
    gap: 0.5rem;
    margin-right: 1rem;
  }
  
  .browser-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .browser-address {
    flex: 1;
    background-color: #191919;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    color: #aaa;
  }
  
  .subreddit-content {
    padding: 1rem;
  }
  
  .subreddit-post {
    padding: 1rem;
    border: 1px solid #222;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    background-color: #0a0a0a;
  }
  
  .post-title {
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: #10B981;
  }
  
  .post-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #aaa;
  }
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  
  .metric-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
    text-align: center;
  }
  
  .metric-value {
    font-size: 2.5rem;
    font-weight: bold;
    color: #10B981;
    margin-bottom: 0.5rem;
  }
  
  .metric-label {
    color: #aaa;
    font-size: 0.875rem;
  }
`;

const EComLandingPage = () => {
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
            <a href="#features" className="hover:text-[#10B981] transition-colors">Features</a>
            <a href="#demo" className="hover:text-[#10B981] transition-colors">Demo</a>
            <a href="#pricing" className="hover:text-[#10B981] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#10B981] transition-colors">FAQ</a>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-5 py-2 rounded-md border border-[#333333] text-sm font-medium hover:bg-[#111111] transition-all">
              Login
            </Link>
            <Link to="/login" className="px-5 py-2 rounded-md bg-gradient-to-r from-[#10B981] to-[#0694A2] hover:from-[#0D9488] hover:to-[#0891B2] text-white font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all">
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.png')] opacity-5 z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-[120px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left order-2 md:order-1">
              <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/5 rounded-full">
                <ShoppingBag size={14} className="text-emerald-400 mr-2" />
                <span className="text-sm text-emerald-400 font-bold tracking-wide">FOR SHOPIFY & DROPSHIPPING OWNERS</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Turn Reddit into your <span className="text-emerald-400 italic">Highest ROI</span> Traffic Channel
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Stop wasting your ad budget. Our AI finds the perfect subreddits for each product in your Shopify store, creates viral posts, and schedules them at peak times—all while tracking actual conversions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/login" className="px-8 py-4 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group">
                  <span>CONNECT YOUR SHOPIFY STORE</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#demo" className="px-8 py-4 rounded-md border border-gray-700 text-white text-base font-medium hover:bg-gray-800/50 transition-all">
                  See How It Works
                </a>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center text-sm">
                  <ShoppingBag size={14} className="text-emerald-400 mr-2" />
                  <span><span className="text-white font-bold">4,300+</span> stores</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check size={14} className="text-emerald-400 mr-2" />
                  <span><span className="text-white font-bold">14-day</span> free trial</span>
                </div>
              </div>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="absolute -top-8 -right-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-[50px] z-0"></div>
              <div className="relative">
                <div className="absolute -top-6 -left-6 w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-2xl transform rotate-3"></div>
                <div className="relative bg-[#0c0c0c] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                  <div className="p-3 border-b border-gray-800 flex items-center">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="mx-auto bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-400">
                      reddit.com/r/ProductRecommendations
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={16} className="text-teal-400" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-emerald-400">Looking for eco-friendly water bottles that actually keep drinks cold</div>
                          <div className="text-sm text-gray-400 mt-1">Posted by u/eco_conscious_shopper · 4h ago</div>
                          <div className="text-gray-300 mt-3 text-sm">
                            I've tried so many water bottles that claim to keep drinks cold for 24+ hours but they never deliver. Any recommendations for ones that actually work? Bonus points if they're sustainable and eco-friendly.
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <TrendingUp size={12} />
                              <span>247 upvotes</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={12} />
                              <span>43 comments</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-12 pl-1 border-l-2 border-gray-800">
                        <div className="pl-3">
                          <div className="text-sm font-medium text-emerald-400">u/your_store_name</div>
                          <div className="text-gray-300 mt-2 text-sm">
                            Our CoolEco bottles maintain temperature for 36+ hours in extreme conditions. We use recycled stainless steel and plant a tree for every purchase. Happy to send you a sample to test!
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <TrendingUp size={12} />
                              <span>132 upvotes</span>
                            </div>
                          </div>
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

      {/* Social Proof Bar */}
      <section className="py-8 bg-[#090909]">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-between items-center gap-8">
            <div className="text-center flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-emerald-400">$23.4M+</div>
              <div className="text-gray-400 text-sm">Revenue Generated</div>
            </div>
            <div className="text-center flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-emerald-400">4,300+</div>
              <div className="text-gray-400 text-sm">Shopify Stores</div>
            </div>
            <div className="text-center flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-emerald-400">370%</div>
              <div className="text-gray-400 text-sm">Average ROI</div>
            </div>
            <div className="text-center flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-emerald-400">9.2M+</div>
              <div className="text-gray-400 text-sm">Monthly Visitors</div>
            </div>
            <div className="text-center flex-1 min-w-[140px]">
              <div className="text-2xl font-bold text-emerald-400">3.4%</div>
              <div className="text-gray-400 text-sm">Conversion Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">SHOPIFY SUPERPOWERS</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Free Traffic For <span className="text-emerald-400">Every Product</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Connect your Shopify store and watch as our AI automatically finds the perfect subreddits for each product, creates engaging content, and drives high-converting traffic.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card group flex flex-col">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Zap className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Shopify Product Scanner</h3>
              <p className="text-gray-400 mb-4 flex-grow">
                Our AI analyzes your entire product catalog and matches each item to the perfect subreddits based on audience interests, purchase intent, and moderation patterns.
              </p>
              <div className="flex items-center text-emerald-400 mt-auto">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Match products to subreddits <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="feature-card group flex flex-col">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Rocket className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Viral Content Generator</h3>
              <p className="text-gray-400 mb-4 flex-grow">
                Transform product descriptions into natural, engaging Reddit posts that drive traffic without triggering spam filters. Our templates are proven to generate clicks and conversions.
              </p>
              <div className="flex items-center text-emerald-400 mt-auto">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Create viral product mentions <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="feature-card group flex flex-col">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <CalendarIcon className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Peak Time Scheduler</h3>
              <p className="text-gray-400 mb-4 flex-grow">
                Post when your target audience is most active. Our system identifies optimal posting windows for each subreddit when visibility is highest but competition is lowest.
              </p>
              <div className="flex items-center text-emerald-400 mt-auto">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Schedule for maximum impact <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="feature-card group flex flex-col">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Shield className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Account Protection System</h3>
              <p className="text-gray-400 mb-4 flex-grow">
                Never worry about account bans. Our moderation analysis rates each subreddit's spam detection patterns to ensure your accounts remain safe while maximizing visibility.
              </p>
              <div className="flex items-center text-emerald-400 mt-auto">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Keep your accounts safe <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="feature-card group flex flex-col">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Target className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Competitor Product Tracking</h3>
              <p className="text-gray-400 mb-4 flex-grow">
                Discover where competing products are gaining traction. Monitor which subreddits competitors are targeting and what messaging is driving the most engagement and sales.
              </p>
              <div className="flex items-center text-emerald-400 mt-auto">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Track competitor strategies <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="feature-card group flex flex-col">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <BarChart className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Shopify Conversion Tracking</h3>
              <p className="text-gray-400 mb-4 flex-grow">
                See exactly which Reddit posts drive sales. Our Shopify integration tracks the complete path from Reddit post to purchase, showing you which subreddits and content convert best.
              </p>
              <div className="flex items-center text-emerald-400 mt-auto">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Measure your exact ROI <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works / Demo Section */}
      <section id="demo" className="py-20 bg-[#070707]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">SIMPLE & POWERFUL</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How SubPirate <span className="text-emerald-400">Works</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Connect your Shopify store in 2 clicks and let our AI drive free, targeted traffic to your products. It's that simple.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="subreddit-browser">
                <div className="subreddit-header">
                  <div className="browser-dots">
                    <div className="browser-dot bg-red-500"></div>
                    <div className="browser-dot bg-yellow-500"></div>
                    <div className="browser-dot bg-green-500"></div>
                  </div>
                  <div className="browser-address">
                    https://app.subpirate.com/dashboard
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex mb-4 items-center">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mr-3">
                      <ShoppingBag size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold">AeroFit Smart Water Bottle</h4>
                      <div className="text-xs text-gray-500">Connected from your Shopify store</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <div className="text-sm font-medium text-white">Recommended Subreddits for This Product:</div>
                    
                    <div className="bg-[#0f0f0f] rounded-lg p-3 border border-gray-800 flex justify-between items-center">
                      <div>
                        <div className="text-emerald-400 font-medium">r/HydroHomies</div>
                        <div className="text-xs text-gray-400 mt-1">923k members • High safety score • 4.8% conversion rate</div>
                      </div>
                      <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium py-1.5 px-3 rounded-md transition-colors">
                        Create Post
                      </button>
                    </div>
                    
                    <div className="bg-[#0f0f0f] rounded-lg p-3 border border-gray-800 flex justify-between items-center">
                      <div>
                        <div className="text-emerald-400 font-medium">r/fitness</div>
                        <div className="text-xs text-gray-400 mt-1">8.3M members • Medium safety score • 3.2% conversion rate</div>
                      </div>
                      <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium py-1.5 px-3 rounded-md transition-colors">
                        Create Post
                      </button>
                    </div>
                    
                    <div className="bg-[#0f0f0f] rounded-lg p-3 border border-gray-800 flex justify-between items-center">
                      <div>
                        <div className="text-emerald-400 font-medium">r/ZeroWaste</div>
                        <div className="text-xs text-gray-400 mt-1">589k members • Very high safety score • 5.7% conversion rate</div>
                      </div>
                      <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium py-1.5 px-3 rounded-md transition-colors">
                        Create Post
                      </button>
                    </div>
                    
                    <div className="text-center mt-4">
                      <button className="text-xs text-emerald-400 hover:underline">View 12 more matching subreddits</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6">1. Connect Your Shopify Store</h3>
              <p className="text-gray-300 mb-8">
                With just 2 clicks, our system scans your entire product catalog and begins matching each product to the perfect subreddits for maximum engagement and conversion.
              </p>
              
              <h3 className="text-2xl font-bold mb-6">2. Select Products to Promote</h3>
              <p className="text-gray-300 mb-8">
                Choose which products you want to focus on. Our AI will analyze each product and identify the most receptive subreddits, potential engagement rates, and expected ROI.
              </p>
              
              <h3 className="text-2xl font-bold mb-6">3. Create & Schedule Reddit Posts</h3>
              <p className="text-gray-300 mb-8">
                Use our viral post templates specifically designed for each subreddit's audience, or let our AI automatically generate and schedule posts for maximum visibility and engagement.
              </p>
              
              <h3 className="text-2xl font-bold mb-6">4. Track Conversions & ROI</h3>
              <p className="text-gray-300 mb-4">
                Our Shopify integration tracks the complete customer journey from Reddit post to purchase, showing you exactly which subreddits and content types drive the most revenue.
              </p>
              
              <Link to="/login" className="inline-flex items-center px-6 py-3 mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-md font-bold transition-all group">
                <span>Start 14-Day Free Trial</span>
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 md:p-10">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Track Real Results with Shopify Integration</h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Unlike traditional Reddit marketing, our platform shows you exactly which subreddits and posts drive actual sales and revenue.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="metric-card">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Eye className="text-emerald-400" size={24} />
                </div>
                <div className="metric-value">9.2M+</div>
                <div className="metric-label">Monthly Visitors</div>
              </div>
              
              <div className="metric-card">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="text-emerald-400" size={24} />
                </div>
                <div className="metric-value">312K+</div>
                <div className="metric-label">New Customers</div>
              </div>
              
              <div className="metric-card">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="text-emerald-400" size={24} />
                </div>
                <div className="metric-value">$23.4M+</div>
                <div className="metric-label">Generated Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">SUCCESS STORIES</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Shopify Stores <span className="text-emerald-400">Love Us</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              See how eCommerce businesses like yours are using SubPirate to drive traffic and sales from Reddit.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="product-card p-6">
              <div className="mb-4 flex items-center">
                <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center text-xl font-bold text-emerald-400 mr-4">A</div>
                <div>
                  <div className="font-bold">Alex T.</div>
                  <div className="text-sm text-gray-400">Outdoor Gear Shopify Store</div>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-emerald-400 fill-emerald-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                "I was spending $4,800/month on Facebook ads with diminishing results. SubPirate found perfect subreddits for each of my products. My traffic costs dropped by 82% and conversion rates increased by 3.1x. Best marketing decision I've made in years."
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-gray-800">
                <div>$92,400 revenue increase in 6 months</div>
                <div className="flex items-center">
                  <TrendingUp size={14} className="text-emerald-400 mr-1" />
                  <span className="text-emerald-400">412% ROI</span>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="product-card p-6">
              <div className="mb-4 flex items-center">
                <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center text-xl font-bold text-emerald-400 mr-4">S</div>
                <div>
                  <div className="font-bold">Sarah K.</div>
                  <div className="text-sm text-gray-400">Eco-Friendly Products Store</div>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-emerald-400 fill-emerald-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                "As a small eco-friendly store, our ad budget was tiny. SubPirate helped us find passionate communities on Reddit that actually care about sustainability. Now we're getting 3,200+ visitors monthly from Reddit with a 5.7% conversion rate!"
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-gray-800">
                <div>$38,700 revenue increase in 3 months</div>
                <div className="flex items-center">
                  <TrendingUp size={14} className="text-emerald-400 mr-1" />
                  <span className="text-emerald-400">297% ROI</span>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="product-card p-6">
              <div className="mb-4 flex items-center">
                <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center text-xl font-bold text-emerald-400 mr-4">J</div>
                <div>
                  <div className="font-bold">Jamie M.</div>
                  <div className="text-sm text-gray-400">Dropshipping Agency Owner</div>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-emerald-400 fill-emerald-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                "We manage 7 different dropshipping stores. SubPirate's ability to match each product to the right subreddits and automatically create viral post ideas has been a game-changer. Our Reddit traffic converts 3.2x better than Instagram."
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-gray-800">
                <div>$214,500 combined revenue increase</div>
                <div className="flex items-center">
                  <TrendingUp size={14} className="text-emerald-400 mr-1" />
                  <span className="text-emerald-400">378% ROI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[#070707]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">SHOPIFY PRICING</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Invest in <span className="text-emerald-400">Reddit Traffic</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Shopify stores using SubPirate see an average of 370% ROI within the first month. Stop wasting ad budget and start driving high-intent traffic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="pricing-card">
              <h3 className="text-xl font-semibold mb-2">Product Launch</h3>
              <div className="text-emerald-400 text-4xl font-bold mb-2">$29<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 mb-6">Perfect for new Shopify stores or single-product dropshippers.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">3</span> products analyzed for subreddit matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">50</span> subreddit recommendations per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">15</span> viral post templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">1</span> Reddit account protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Basic</span> Shopify integration</span>
                </li>
              </ul>
              
              <Link to="/login" className="pricing-button button-outline">
                Start Free Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="pricing-card-featured relative">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-semibold mb-2">Store Growth</h3>
              <div className="text-emerald-400 text-4xl font-bold mb-2">$79<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 mb-6">For established Shopify stores with multiple products.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">25</span> products analyzed for subreddit matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> subreddit recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> viral post templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">5</span> Reddit account protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Full</span> Shopify integration with sales tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Automated</span> post scheduling & publishing</span>
                </li>
              </ul>
              
              <Link to="/login" className="pricing-button button-primary">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <h3 className="text-xl font-semibold mb-2">eCommerce Agency</h3>
              <div className="text-emerald-400 text-4xl font-bold mb-2">$199<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 mb-6">For agencies managing multiple Shopify stores.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> products & stores</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Custom</span> product-subreddit matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">AI</span> content writer for Reddit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Unlimited</span> Reddit account management</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">Multi-store</span> analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><span className="font-bold text-white">White label</span> client reporting</span>
                </li>
              </ul>
              
              <Link to="/login" className="pricing-button button-outline">
                Schedule Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[300px] -left-[300px] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] opacity-70"></div>
          <div className="absolute -bottom-[300px] -right-[300px] w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px] opacity-70"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-0 overflow-hidden rounded-2xl border border-[#222] bg-gradient-to-br from-black to-[#0c0c0c]">
              {/* Left content */}
              <div className="lg:col-span-3 p-8 md:p-16 flex flex-col justify-center">
                <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-red-500/20 bg-red-500/5 rounded-full max-w-max">
                  <Flame size={14} className="text-red-500 mr-2" />
                  <span className="text-sm text-red-500 font-semibold tracking-wide">SHOPIFY STORE OWNERS ONLY</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                  While you read this, your <span className="text-emerald-400 italic">competitors</span> are capturing Reddit traffic <span className="text-emerald-400 italic">for free</span>
                </h2>
                <p className="text-lg text-gray-300 mb-10 max-w-2xl">
                  Every day, successful Shopify stores are using SubPirate to drive traffic and sales from Reddit. Connect your store today and start tapping into Reddit's 52 million daily active users.
                </p>
                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">2-click Shopify integration</span> - Connect your store in under 60 seconds
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">14-day free trial</span> - See actual traffic and sales before you pay
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">370% average ROI</span> - Higher than Facebook or Google ads
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-5">
                  <Link to="/login" className="px-8 py-5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base font-bold shadow-2xl shadow-emerald-500/10 transition-all transform hover:scale-105 flex items-center justify-center gap-2 group">
                    <span>Connect Your Shopify Store</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link to="#pricing" className="px-8 py-5 rounded-lg border-2 border-[#333] hover:border-emerald-500/30 text-white text-base font-bold transition-all flex items-center justify-center hover:bg-[#0c0c0c]">
                    View Pricing Details
                  </Link>
                </div>
              </div>
              
              {/* Right content - social proof/testimonials */}
              <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-[#222] bg-[#0a0a0a] p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-xl font-semibold mb-6 text-white">Store Success Stories</h3>
                
                <div className="space-y-6">
                  {/* Testimonial 1 */}
                  <div className="rounded-xl bg-black/60 border border-[#222] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      "I was spending $3,500/month on Facebook ads with declining results. SubPirate found the perfect subreddits for each of my products. Now I'm getting 12,000+ visitors monthly from Reddit with a 4.2% conversion rate!"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-emerald-400">A</div>
                      <div>
                        <p className="text-white text-sm font-medium">Alex T.</p>
                        <p className="text-gray-400 text-xs">Shopify Store Owner</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Testimonial 2 */}
                  <div className="rounded-xl bg-black/60 border border-[#222] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      "We manage 6 different dropshipping stores. SubPirate automatically matches each product to the perfect subreddits, creates viral post ideas, and schedules them. Our Reddit traffic converts 3x better than Instagram traffic, with much lower acquisition costs."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-emerald-400">J</div>
                      <div>
                        <p className="text-white text-sm font-medium">Jamie K.</p>
                        <p className="text-gray-400 text-xs">Dropshipping Agency Owner</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-black/40 rounded-lg p-4 border border-[#222]">
                      <p className="text-3xl font-bold text-emerald-400">370%</p>
                      <p className="text-gray-400 text-xs">Average ROI</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 border border-[#222]">
                      <p className="text-3xl font-bold text-emerald-400">4,300+</p>
                      <p className="text-gray-400 text-xs">Shopify Stores</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">FREQUENTLY ASKED</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Common <span className="text-emerald-400">Questions</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything Shopify and dropshipping store owners need to know about Reddit marketing.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How does SubPirate find the right subreddits for my products?</h3>
              <p className="text-gray-400">
                Our AI analyzes your Shopify products and matches them to relevant subreddits based on user interests, post history, and purchase intent. For each product, we identify communities where similar products have been well-received, communities where users are actively seeking solutions your product provides, and communities with favorable moderation patterns that won't ban your account. This triple-verification process ensures you're only posting where you'll get positive engagement.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">Won't I get banned for promoting my products on Reddit?</h3>
              <p className="text-gray-400">
                Direct promotion often leads to bans, which is why SubPirate's approach is different. Our system analyzes each subreddit's moderation patterns and provides guidelines for natural, value-focused content that doesn't trigger spam filters. We show you exactly how to position your products as helpful solutions rather than advertisements. Our users' accounts typically last 5-7x longer than those attempting traditional promotion, while generating significantly more traffic and sales.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How does the Shopify integration work?</h3>
              <p className="text-gray-400">
                Our Shopify integration takes just two clicks to set up. Once connected, SubPirate automatically imports your product catalog, analyzes each product, and begins identifying ideal subreddit matches. The integration also enables conversion tracking, allowing you to see exactly which Reddit posts are driving sales and for which products. This data helps continuously improve your targeting and content strategy for maximum ROI.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How soon will I see traffic from Reddit to my Shopify store?</h3>
              <p className="text-gray-400">
                Most store owners see their first significant traffic spike within 48-72 hours of implementing our recommendations. Our data shows that 82% of users experience meaningful traffic increases within the first week, with an average of 319% traffic growth in the first 30 days. The key factors that influence speed of results are: how closely you follow our content recommendations, the number of products you're promoting, and your niche's popularity on Reddit.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How does SubPirate compare to paid Reddit advertising?</h3>
              <p className="text-gray-400">
                Official Reddit ads typically cost $2-5 per click with conversion rates below 1%. SubPirate users report an average cost per visitor of $0.07-0.12 (based on subscription cost divided by traffic) with conversion rates averaging 2.7-4.2%. This dramatic difference occurs because our organic approach targets high-intent users in specific communities, rather than broadly targeting demographics. Additionally, users trust authentic posts from community members over obvious advertisements.
              </p>
            </div>
            
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">Can I use this for multiple Shopify stores or dropshipping businesses?</h3>
              <p className="text-gray-400">
                Absolutely! Our Store Growth plan supports up to 25 products which can be spread across multiple stores, while our eCommerce Agency plan offers unlimited product analysis and store connections. Many of our users are agencies or serial entrepreneurs managing 5-10 different stores across various niches. The platform is specifically designed to handle multiple stores efficiently, with separate tracking and recommendations for each.
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
              <h3 className="text-2xl md:text-4xl font-bold mb-6">Stop Wasting Money on Expensive Ads</h3>
              <p className="text-gray-500 text-sm mb-8 max-w-2xl mx-auto">
                Connect your Shopify store today and start driving high-converting traffic from Reddit's 52 million daily active users. Our 14-day free trial gives you time to see results before you pay.
              </p>
              <Link to="/login" className="inline-flex items-center px-8 py-4 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base font-bold shadow-xl shadow-emerald-500/10 transition-all transform hover:scale-105 gap-2">
                CONNECT YOUR SHOPIFY STORE
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
                The ultimate Reddit marketing platform for Shopify stores and dropshipping businesses. Find the perfect subreddits for each product and drive high-converting traffic without expensive ads.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-4.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-gray-500 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">About Us</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Success Stories</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Press</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li><a href="#features" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Features</a></li>
                  <li><a href="#pricing" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Pricing</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">ROI Calculator</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Knowledge Base</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">GDPR Compliance</a></li>
                  <li><a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[#222222] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">© 2023 SubPirate. All rights reserved. Results may vary. This platform is designed for educational purposes.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Status</a>
              <span className="text-gray-700">•</span>
              <a href="#" className="text-gray-500 hover:text-emerald-400 transition-colors text-sm">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EComLandingPage;
