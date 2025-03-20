import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ShoppingBag, DollarSign, Users, ArrowUpRight } from 'lucide-react';

interface Order {
  id: string;
  price: number;
  customer: string;
  timestamp: number;
  product: string;
}

interface DashboardData {
  totalSales: number;
  ordersToday: number;
  averageOrder: number;
  salesData: { time: string; sales: number }[];
  recentOrders: Order[];
}

const products = [
  'Bamboo Toothbrush', 
  'Eco Water Bottle', 
  'Cotton Tote', 
  'Reusable Straw', 
  'Yoga Mat'
];

const customerNames = [
  'J.H.', 'S.J.', 'A.C.', 'T.W.', 'M.L.',
  'J.P.', 'K.B.', 'C.K.', 'R.T.', 'Q.D.'
];

const ShopifyDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    ordersToday: 0,
    averageOrder: 0,
    salesData: Array.from({ length: 12 }, (_, i) => ({
      time: i.toString(),
      sales: Math.floor(Math.random() * 200) + 50
    })),
    recentOrders: []
  });

  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a random price between $9.97 and $246.84
  const generateRandomPrice = (): number => {
    return Number((Math.random() * (246.84 - 9.97) + 9.97).toFixed(2));
  };

  // Generate a random product
  const getRandomProduct = (): string => {
    return products[Math.floor(Math.random() * products.length)];
  };

  // Generate a random customer name
  const getRandomCustomer = (): string => {
    return customerNames[Math.floor(Math.random() * customerNames.length)];
  };

  // Generate a new order
  const generateOrder = (): Order => {
    return {
      id: Math.random().toString(36).substring(2, 6).toUpperCase(),
      price: generateRandomPrice(),
      customer: getRandomCustomer(),
      timestamp: Date.now(),
      product: getRandomProduct()
    };
  };

  // Update dashboard with new data
  const updateDashboard = () => {
    // Add a new order
    const newOrder = generateOrder();
    
    setDashboardData(prev => {
      // Update total sales
      const newTotalSales = prev.totalSales + newOrder.price;
      
      // Update recent orders (keep only most recent 2)
      const newRecentOrders = [newOrder, ...prev.recentOrders].slice(0, 2);
      
      // Update average order value
      const newAverageOrder = newTotalSales / (prev.ordersToday + 1);
      
      // Update sales data
      const newSalesData = [...prev.salesData];
      const index = Math.floor(Math.random() * newSalesData.length);
      newSalesData[index].sales += newOrder.price;
      
      return {
        totalSales: Number(newTotalSales.toFixed(2)),
        ordersToday: prev.ordersToday + 1,
        averageOrder: Number(newAverageOrder.toFixed(2)),
        salesData: newSalesData,
        recentOrders: newRecentOrders
      };
    });
  };

  // Start animation and updates when component mounts
  useEffect(() => {
    // Initial update
    updateDashboard();
    
    // Set up interval for animated updates
    animationRef.current = setInterval(() => {
      updateDashboard();
    }, 3000); // Update every 3 seconds
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // Format number with commas and 2 decimal places
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="mx-auto mt-8 mb-16">
      <div className="subreddit-browser w-full max-w-2xl mx-auto" style={{ height: '465px', overflow: 'hidden' }}>
        <div className="subreddit-header">
          <div className="browser-dots">
            <div className="browser-dot bg-red-500"></div>
            <div className="browser-dot bg-yellow-500"></div>
            <div className="browser-dot bg-green-500"></div>
          </div>
          <div className="browser-address">
            admin.shopify.com/store/dashboard
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-[#f6f6f7] dark:bg-gray-900" style={{ height: '430px' }}>
          {/* Header */}
          <div className="h-14 bg-white dark:bg-gray-800 border-b border-[#e1e3e5] dark:border-gray-700 px-4 flex items-center">
            <div className="text-[#212b36] dark:text-white flex items-center">
              <div className="mr-2 text-[#95bf47]">
                <svg width="26" height="26" viewBox="0 0 109.5 124.5" fill="currentColor">
                  <path d="M74.7,14.8c0-0.6-0.5-0.9-0.9-0.9c-0.4,0-7.2,0.2-7.2,0.2c-5.4,0-10,4.4-11.3,10.8c0,0-3,9.5-3.3,10.4 c-0.1,0.3-0.3,0.2-0.3,0C52,35.3,45.4,14.5,45.4,14.5c-0.7-2.1-2-2.9-3.7-2.9c-2.1,0-8.6,0.7-12,1.7C29.1,13.6,29,14,29,14.4 c0,0.2,0.2,1.5,0.3,2c0.9,7.9,6.8,42.3,7.9,58.1c0,0.7,0.5,1.2,1.2,1.2h1.8c1.8-0.1,2.4-1,2.9-2.1c0.9-1.9,2.5-5.5,3.5-7.8h21.7 c0.9,2.1,2.2,5.3,3.4,7.6c0.9,1.7,1.9,2.3,4,2.3h6.1c0.7,0,1.1-0.6,0.9-1.2C82.7,73.3,74.8,16.8,74.7,14.8z M48.2,55.8 c1.8-4.3,4.3-10.9,6.9-17.4c3.3,9.5,7.1,16.1,9.1,17.4H48.2z"/>
                </svg>
              </div>
              <h2 className="font-semibold text-base">Dashboard</h2>
            </div>
          </div>
          
          {/* Dashboard Content */}
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-[#212b36] dark:text-white text-base font-medium mb-2">Today's Activity</h3>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <motion.div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[#637381] dark:text-gray-400 text-xs font-normal">Total sales</p>
                      <div className="bg-[#e6f9f1] dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex items-center">
                        <ArrowUpRight size={10} className="text-[#008060] dark:text-emerald-400 mr-0.5" />
                        <span className="text-[10px] font-medium text-[#008060] dark:text-emerald-400">24%</span>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <h3 className="text-[#212b36] dark:text-white text-lg font-semibold">{formatCurrency(dashboardData.totalSales)}</h3>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[#637381] dark:text-gray-400 text-xs font-normal">Orders</p>
                      <div className="bg-[#e6f9f1] dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex items-center">
                        <ArrowUpRight size={10} className="text-[#008060] dark:text-emerald-400 mr-0.5" />
                        <span className="text-[10px] font-medium text-[#008060] dark:text-emerald-400">18%</span>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <h3 className="text-[#212b36] dark:text-white text-lg font-semibold">{dashboardData.ordersToday}</h3>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[#637381] dark:text-gray-400 text-xs font-normal">Avg. order value</p>
                      <div className="bg-[#e6f9f1] dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex items-center">
                        <ArrowUpRight size={10} className="text-[#008060] dark:text-emerald-400 mr-0.5" />
                        <span className="text-[10px] font-medium text-[#008060] dark:text-emerald-400">5%</span>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <h3 className="text-[#212b36] dark:text-white text-lg font-semibold">{formatCurrency(dashboardData.averageOrder)}</h3>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Sales Chart */}
              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-4"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="px-4 py-3 border-b border-[#e1e3e5] dark:border-gray-700">
                  <h3 className="text-[#212b36] dark:text-white text-sm font-medium">Sales over time</h3>
                </div>
                <div className="p-2 pt-4 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.salesData}>
                      <CartesianGrid stroke="#e1e3e5" strokeDasharray="3 3" vertical={false} />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#008060" 
                        strokeWidth={2.5} 
                        dot={false}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
              
              {/* Recent Orders */}
              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="px-4 py-3 border-b border-[#e1e3e5] dark:border-gray-700">
                  <h3 className="text-[#212b36] dark:text-white text-sm font-medium">Recent orders</h3>
                </div>
                <div>
                  {dashboardData.recentOrders.length > 0 ? (
                    dashboardData.recentOrders.map((order, index) => (
                      <motion.div 
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 * index }}
                        className="px-4 py-3 border-b border-[#e1e3e5] dark:border-gray-700 last:border-0 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded bg-[#f6f6f7] dark:bg-gray-700 flex items-center justify-center mr-3">
                            <ShoppingBag size={14} className="text-[#637381] dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[#212b36] dark:text-white text-sm font-medium">{order.product}</p>
                            <p className="text-[#637381] dark:text-gray-400 text-xs">#{order.id} • {order.customer}</p>
                          </div>
                        </div>
                        <div className="text-[#212b36] dark:text-white text-sm font-medium">
                          {formatCurrency(order.price)}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-[#637381] dark:text-gray-400 text-sm">
                      No orders yet today
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifyDashboard;