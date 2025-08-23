// contexts/PremiumContext.tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Crown } from 'lucide-react';
import { 
  PremiumStatus, 
  getPremiumStatus, 
  setPremiumStatus as savePremiumStatus,
  removePremiumStatus,
  canDownload,
  canBulkDownload,
  hasPremiumFeature,
  getPremiumDaysRemaining,
  addDownloadRecord
} from '@/lib/premium';

interface PremiumContextType {
  premiumStatus: PremiumStatus;
  isLoading: boolean;
  // Actions
  updatePremiumStatus: (status: PremiumStatus) => void;
  clearPremiumStatus: () => void;
  // Checkers
  checkCanDownload: () => { canDownload: boolean; reason?: string; downloadsLeft?: number };
  checkCanBulkDownload: () => { canBulkDownload: boolean; reason?: string };
  checkHasPremiumFeature: (feature: string) => boolean;
  recordDownload: (animeId: number, episode: number) => void;
  // Utils
  getDaysRemaining: () => number | null;
  isPremium: boolean;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ isPremium: false });
  const [isLoading, setIsLoading] = useState(true);

  // Load premium status on mount
  useEffect(() => {
    const loadPremiumStatus = () => {
      try {
        const status = getPremiumStatus();
        setPremiumStatus(status);
      } catch (error) {
        console.error('Error loading premium status:', error);
        setPremiumStatus({ isPremium: false });
      } finally {
        setIsLoading(false);
      }
    };

    loadPremiumStatus();
  }, []);

  // Update premium status
  const updatePremiumStatus = (status: PremiumStatus) => {
    setPremiumStatus(status);
    savePremiumStatus(status);
  };

  // Clear premium status
  const clearPremiumStatus = () => {
    setPremiumStatus({ isPremium: false });
    removePremiumStatus();
  };

  // Check download permission
  const checkCanDownload = () => {
    return canDownload();
  };

  // Check bulk download permission
  const checkCanBulkDownload = () => {
    return canBulkDownload();
  };

  // Check premium feature
  const checkHasPremiumFeature = (feature: string) => {
    return hasPremiumFeature(feature as any);
  };

  // Record a download
  const recordDownload = (animeId: number, episode: number) => {
    addDownloadRecord(animeId, episode);
  };

  // Get remaining days
  const getDaysRemaining = () => {
    return getPremiumDaysRemaining();
  };

  const contextValue: PremiumContextType = {
    premiumStatus,
    isLoading,
    updatePremiumStatus,
    clearPremiumStatus,
    checkCanDownload,
    checkCanBulkDownload,
    checkHasPremiumFeature,
    recordDownload,
    getDaysRemaining,
    isPremium: premiumStatus.isPremium
  };

  return (
    <PremiumContext.Provider value={contextValue}>
      {children}
    </PremiumContext.Provider>
  );
};

// Custom hook to use premium context
export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

// HOC for premium-protected components
export const withPremium = <P extends object>(
  Component: React.ComponentType<P>,
  requiredFeature?: string
) => {
  const PremiumProtectedComponent: React.FC<P> = (props) => {
    const { isPremium, checkHasPremiumFeature } = usePremium();
    
    if (requiredFeature && !isPremium && !checkHasPremiumFeature(requiredFeature)) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#ff914d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-[#ff914d]" />
            </div>
            <h3 className="text-white font-bold mb-2">Premium Feature</h3>
            <p className="text-gray-400 text-sm mb-4">
              This feature requires a Premium subscription
            </p>
            <button 
              onClick={() => window.location.href = '/premium'}
              className="bg-[#ff914d] hover:bg-[#e8823d] text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
  
  PremiumProtectedComponent.displayName = `withPremium(${Component.displayName || Component.name})`;
  return PremiumProtectedComponent;
};