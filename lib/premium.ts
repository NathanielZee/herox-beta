// lib/premium.ts
export interface PremiumStatus {
    isPremium: boolean;
    tier?: 'weekly' | 'monthly' | 'yearly';
    purchaseDate?: string;
    expiryDate?: string;
    features?: string[];
  }
  
  export interface PremiumTier {
    id: 'weekly' | 'monthly' | 'yearly';
    name: string;
    features: string[];
    limits: {
      downloads: number | 'unlimited';
      bulkDownload: boolean;
      hdQuality: boolean;
      adFree: boolean;
    };
  }
  
  export const PREMIUM_TIERS: Record<string, PremiumTier> = {
    weekly: {
      id: 'weekly',
      name: 'Premium Weekly',
      features: [
        'Unlimited Downloads',
        'Bulk Download All Episodes',
        'HD Quality (1080p)',
        'Ad-Free Experience',
        'Priority Support'
      ],
      limits: {
        downloads: 'unlimited',
        bulkDownload: true,
        hdQuality: true,
        adFree: true
      }
    },
    monthly: {
      id: 'monthly',
      name: 'Premium Monthly',
      features: [
        'All Weekly Features',
        '4K Quality Available',
        'Download Queue Management',
        'Early Access to New Episodes',
        'Premium Support'
      ],
      limits: {
        downloads: 'unlimited',
        bulkDownload: true,
        hdQuality: true,
        adFree: true
      }
    },
    yearly: {
      id: 'yearly',
      name: 'Premium Yearly',
      features: [
        'All Monthly Features',
        'Offline Sync Across Devices',
        'Custom Download Schedules',
        'Premium Community Access',
        'Beta Feature Access',
        'Exclusive Content Library'
      ],
      limits: {
        downloads: 'unlimited',
        bulkDownload: true,
        hdQuality: true,
        adFree: true
      }
    }
  };

  export const FREE_TIER_LIMITS = {
    downloads: 3, // 3 downloads per day for free users
    bulkDownload: false,
    hdQuality: false,
    adFree: false
  };
  
  // Get premium status from localStorage
  export const getPremiumStatus = (): PremiumStatus => {
    if (typeof window === 'undefined') {
      return { isPremium: false };
    }
  
    try {
      const stored = localStorage.getItem('premium_status');
      if (!stored) {
        return { isPremium: false };
      }
  
      const status: PremiumStatus = JSON.parse(stored);
      
      // Check if premium has expired
      if (status.expiryDate && new Date(status.expiryDate) < new Date()) {
        // Premium expired, remove it
        localStorage.removeItem('premium_status');
        return { isPremium: false };
      }
  
      return status;
    } catch (error) {
      console.error('Error parsing premium status:', error);
      return { isPremium: false };
    }
  };
  
  // Set premium status
  export const setPremiumStatus = (status: PremiumStatus): void => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('premium_status', JSON.stringify(status));
  };
  
  // Remove premium status
  export const removePremiumStatus = (): void => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('premium_status');
  };
  
  // Check if user can download (for free users, check daily limit)
  export const canDownload = (): { canDownload: boolean; reason?: string; downloadsLeft?: number } => {
    const premiumStatus = getPremiumStatus();
    
    if (premiumStatus.isPremium) {
      return { canDownload: true };
    }
  
    // For free users, check daily download limit
    const today = new Date().toDateString();
    const downloadHistory = getDownloadHistory();
    const todayDownloads = downloadHistory.filter(d => new Date(d.date).toDateString() === today);
  
    const downloadsLeft = FREE_TIER_LIMITS.downloads - todayDownloads.length;
  
    if (downloadsLeft <= 0) {
      return { 
        canDownload: false, 
        reason: 'Daily download limit reached. Upgrade to Premium for unlimited downloads.',
        downloadsLeft: 0
      };
    }
  
    return { canDownload: true, downloadsLeft };
  };
  
  // Check if user can bulk download
  export const canBulkDownload = (): { canBulkDownload: boolean; reason?: string } => {
    const premiumStatus = getPremiumStatus();
    
    if (premiumStatus.isPremium) {
      return { canBulkDownload: true };
    }
  
    return { 
      canBulkDownload: false, 
      reason: 'Bulk download is a Premium feature. Upgrade to download entire seasons at once.' 
    };
  };
  
  // Download history management (for free tier limits)
  interface DownloadRecord {
    date: string;
    animeId: number;
    episode: number;
  }
  
  export const getDownloadHistory = (): DownloadRecord[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const history = localStorage.getItem('download_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  };
  
  export const addDownloadRecord = (animeId: number, episode: number): void => {
    if (typeof window === 'undefined') return;
    
    const history = getDownloadHistory();
    const newRecord: DownloadRecord = {
      date: new Date().toISOString(),
      animeId,
      episode
    };
    
    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredHistory = history.filter(
      record => new Date(record.date) > thirtyDaysAgo
    );
    
    filteredHistory.push(newRecord);
    localStorage.setItem('download_history', JSON.stringify(filteredHistory));
  };
  
  // Premium feature checker
  export const hasPremiumFeature = (feature: keyof typeof FREE_TIER_LIMITS): boolean => {
    const premiumStatus = getPremiumStatus();
    return premiumStatus.isPremium;
  };
  
  // Get remaining days for premium subscription
  export const getPremiumDaysRemaining = (): number | null => {
    const premiumStatus = getPremiumStatus();
    
    if (!premiumStatus.isPremium || !premiumStatus.expiryDate) {
      return null;
    }
  
    const now = new Date();
    const expiry = new Date(premiumStatus.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Premium upgrade prompt messages
  export const getPremiumPromptMessage = (feature: 'download' | 'bulkDownload' | 'hdQuality'): string => {
    const messages = {
      download: 'You\'ve reached your daily download limit. Upgrade to Premium for unlimited downloads!',
      bulkDownload: 'Bulk download entire seasons at once with Premium! Save time and get all episodes with one click.',
      hdQuality: 'Unlock HD and 4K quality with Premium for the best viewing experience!'
    };
  
    return messages[feature];
  };