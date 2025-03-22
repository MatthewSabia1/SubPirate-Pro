import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, RefreshCcw, Info, Loader2 } from 'lucide-react';
import Modal from './Modal';

interface RedditAccount {
  id: string;
  username: string;
  is_active: boolean;
  refresh_error?: string | null;
}

interface RedditConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  inactiveAccounts?: RedditAccount[];
  onReconnect?: (accountId: string) => void;
}

export default function RedditConnectModal({ 
  isOpen, 
  onClose, 
  onConnect, 
  inactiveAccounts = [], 
  onReconnect 
}: RedditConnectModalProps) {
  const [selectedTab, setSelectedTab] = useState<'connect' | 'reconnect'>(
    inactiveAccounts.length > 0 ? 'reconnect' : 'connect'
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectingAccounts, setReconnectingAccounts] = useState<Record<string, boolean>>({});

  // Update selected tab when inactive accounts change
  useEffect(() => {
    if (inactiveAccounts.length > 0) {
      setSelectedTab('reconnect');
    } else {
      setSelectedTab('connect');
    }
  }, [inactiveAccounts.length]);
  
  // Log when this modal is shown or hidden
  useEffect(() => {
    if (isOpen) {
      console.log('RedditConnectModal: Modal is now visible');
      // Reset loading states when modal is reopened
      setIsConnecting(false);
      setReconnectingAccounts({});
    } else {
      console.log('RedditConnectModal: Modal is now hidden');
    }
  }, [isOpen]);
  
  // Safely handle connect with loading state
  const handleConnect = () => {
    if (isConnecting) return;
    setIsConnecting(true);
    
    try {
      // Call the onConnect function provided by the parent
      onConnect();
      
      // Note: We're not immediately resetting the loading state to false here
      // because we expect the parent to close the modal or handle the result
      // The loading state will be reset either:
      // 1. When the modal closes (via the useEffect above)
      // 2. If an error occurs (in the catch block below)
      // This prevents the button from becoming clickable again during navigation
    } catch (error) {
      console.error('Error initiating Reddit connection:', error);
      setIsConnecting(false);
    }
    
    // Set a safety timeout to reset the loading state after 10 seconds
    // This is in case something goes wrong and the modal doesn't close properly
    const timer = setTimeout(() => {
      setIsConnecting(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  };
  
  // Safely handle reconnect with loading state
  const handleReconnect = (accountId: string) => {
    if (reconnectingAccounts[accountId]) return;

    setReconnectingAccounts(prev => ({
      ...prev,
      [accountId]: true
    }));
    
    try {
      if (onReconnect) {
        onReconnect(accountId);
        
        // Similar to connect, we don't reset immediately to prevent multiple clicks
        // The state will be reset when the modal closes or on error
        
        // Set a safety timeout to reset the loading state after 10 seconds
        const timer = setTimeout(() => {
          setReconnectingAccounts(prev => ({
            ...prev,
            [accountId]: false
          }));
        }, 10000);
        
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error(`Error reconnecting account ${accountId}:`, error);
      setReconnectingAccounts(prev => ({
        ...prev,
        [accountId]: false
      }));
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} disableBackdropClick={true}>
      <div className="relative bg-[#111111] rounded-xl max-w-md w-full mx-auto shadow-2xl border border-amber-600/30 overflow-hidden">
        {/* Decorative top accent - make it more noticeable with animation */}
        <div className="h-2 w-full bg-gradient-to-r from-[#FF4500] via-[#FF8C69] to-[#FF4500] bg-size-200 animate-gradient"></div>
        
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all duration-200"
            title="Dismiss (this will reappear on page navigation)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs for Connect/Reconnect */}
        {inactiveAccounts.length > 0 && (
          <div className="flex border-b border-gray-800 mt-4">
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                selectedTab === 'connect' 
                  ? 'text-white border-b-2 border-[#FF4500]' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setSelectedTab('connect')}
            >
              Connect New Account
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                selectedTab === 'reconnect' 
                  ? 'text-white border-b-2 border-[#FF4500]' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setSelectedTab('reconnect')}
            >
              Reconnect Accounts ({inactiveAccounts.length})
            </button>
          </div>
        )}

        <div className="p-8 pt-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[#FF4500] rounded-full flex items-center justify-center mb-8 shadow-lg transform transition-transform hover:scale-105 duration-300 relative">
              {/* Pulsing ring around the icon */}
              <div className="absolute inset-0 rounded-full border-2 border-[#FF4500] animate-ping opacity-75"></div>
              <svg viewBox="0 0 24 24" width="38" height="38" fill="white">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
            </div>
            
            {selectedTab === 'connect' && (
              <>
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Connect a Reddit Account</h2>
                
                <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 p-4 rounded-lg mb-4 border border-amber-500/30">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-sm text-left">
                    <span className="font-semibold">Required Action:</span> This message will continue to appear until you connect at least one active Reddit account.
                  </p>
                </div>
                
                <p className="text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
                  SubPirate requires a connected Reddit account to function. Without it, you won't be able to analyze subreddits, track posts, or view analytics.
                </p>

                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className={`flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#FF5722] text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 w-full shadow-md hover:shadow-xl transform ${
                    isConnecting ? 'opacity-75 cursor-not-allowed' : 'hover:-translate-y-0.5'
                  } focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:ring-opacity-50 pulse-attention`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Reddit Account'
                  )}
                </button>
              </>
            )}

            {selectedTab === 'reconnect' && (
              <>
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Reconnect Your Reddit Accounts</h2>
                
                <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 p-4 rounded-lg mb-4 border border-amber-500/30">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-sm text-left">
                    <span className="font-semibold">Authentication Required:</span> The accounts below need to be reconnected due to expired or invalid tokens.
                  </p>
                </div>

                <div className="w-full mb-8">
                  {inactiveAccounts.map(account => (
                    <div key={account.id} className="bg-[#1A1A1A] p-4 rounded-lg mb-3 border border-gray-800 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">u/{account.username}</span>
                        <span className="bg-red-800/30 text-red-400 text-xs px-2 py-1 rounded">Inactive</span>
                      </div>
                      {account.refresh_error && (
                        <div className="flex items-start gap-2 mb-3 text-xs text-gray-400">
                          <Info size={14} className="shrink-0 mt-0.5 text-gray-500" />
                          <span>{account.refresh_error}</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleReconnect(account.id)}
                        disabled={reconnectingAccounts[account.id]}
                        className={`flex items-center gap-2 bg-[#333333] hover:bg-[#444444] text-white text-sm py-2 px-4 rounded transition-colors w-full justify-center mt-2 ${
                          reconnectingAccounts[account.id] ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        {reconnectingAccounts[account.id] ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Reconnecting...
                          </>
                        ) : (
                          <>
                            <RefreshCcw size={14} />
                            Reconnect Account
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-gray-400 mb-6 text-sm">
                  You can also connect a new Reddit account if needed:
                </p>

                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className={`flex items-center justify-center gap-2 bg-[#2A2A2A] hover:bg-[#333333] text-white text-sm py-3 px-6 rounded-lg transition-all duration-300 w-full ${
                    isConnecting ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect New Account'
                  )}
                </button>
              </>
            )}
            
            <p className="text-gray-500 text-sm mt-4">
              You can temporarily dismiss this message, but it will reappear when you navigate to another page.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
} 