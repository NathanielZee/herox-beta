// components/PremiumModal.tsx
'use client'

import React from 'react';
import { X, Crown, Download, Zap, Shield, Star, ArrowRight, Sparkles } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: 'download' | 'bulkDownload' | 'hdQuality' | 'adFree';
  customMessage?: string;
  downloadsLeft?: number;
}

const featureDetails = {
  download: {
    icon: Download,
    title: 'Unlimited Downloads',
    description: 'Download as many episodes as you want without daily limits',
    color: 'text-[#ff914d]',
    bgColor: 'bg-[#ff914d]/20'
  },
  bulkDownload: {
    icon: Zap,
    title: 'Bulk Download',
    description: 'Download entire seasons with just one click',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20'
  },
  hdQuality: {
    icon: Star,
    title: 'HD & 4K Quality',
    description: 'Experience anime in crystal clear high definition',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20'
  },
  adFree: {
    icon: Shield,
    title: 'Ad-Free Experience',
    description: 'Enjoy uninterrupted streaming and downloads',
    color: 'text-green-400',
    bgColor: 'bg-green-400/20'
  }
};

const premiumFeatures = [
  { icon: Download, text: 'Unlimited Downloads', highlight: true },
  { icon: Zap, text: 'Bulk Download All Episodes', highlight: true },
  { icon: Star, text: 'HD & 4K Quality', highlight: false },
  { icon: Shield, text: 'Ad-Free Experience', highlight: false },
  { icon: Sparkles, text: 'Early Access to New Episodes', highlight: false },
  { icon: Crown, text: 'Premium Support', highlight: false }
];

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  feature = 'download',
  customMessage,
  downloadsLeft
}) => {
  if (!isOpen) return null;

  const featureDetail = featureDetails[feature];
  const Icon = featureDetail.icon;

  const handleUpgradeClick = () => {
    onClose();
    window.location.href = '/premium';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-xs mx-auto shadow-2xl relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff914d]/10 via-purple-600/5 to-blue-600/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative p-3 pb-1">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 hover:bg-gray-800 rounded-full transition-colors z-10"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          {/* Feature Icon */}
          <div className={`inline-flex items-center justify-center w-10 h-10 ${featureDetail.bgColor} rounded-xl mb-1`}>
            <Icon className={`w-5 h-5 ${featureDetail.color}`} />
          </div>

          <h2 className="text-base font-bold text-white mb-0.5">
            {featureDetail.title}
          </h2>
          <p className="text-gray-300 text-xs mb-1">
            {customMessage || featureDetail.description}
          </p>

          {/* Downloads remaining for free users */}
          {downloadsLeft !== undefined && downloadsLeft > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-1 mb-1">
              <p className="text-amber-300 text-xs">
                ⚡ <span className="font-bold">{downloadsLeft}</span> download{downloadsLeft === 1 ? '' : 's'} left today
              </p>
            </div>
          )}

          {/* Daily limit reached */}
          {downloadsLeft === 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1 mb-1">
              <p className="text-red-300 text-xs">
                🚫 Daily download limit reached.
              </p>
            </div>
          )}
        </div>

        {/* Premium Features List */}
        <div className="px-3 pb-1">
          <h3 className="text-white font-bold mb-1 flex items-center gap-2 text-sm">
            <Crown className="w-4 h-4 text-[#ff914d]" />
            Premium Features
          </h3>
          <div className="space-y-0.5">
            {premiumFeatures.map((feat, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-2 p-1 rounded-lg transition-colors ${
                  feat.highlight && (feature === 'download' || feature === 'bulkDownload') 
                    ? 'bg-[#ff914d]/10 border border-[#ff914d]/20' 
                    : 'hover:bg-gray-800/30'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                  feat.highlight && (feature === 'download' || feature === 'bulkDownload')
                    ? 'bg-[#ff914d]/20'
                    : 'bg-gray-800'
                }`}>
                  <feat.icon className={`w-4 h-4 ${
                    feat.highlight && (feature === 'download' || feature === 'bulkDownload')
                      ? 'text-[#ff914d]'
                      : 'text-gray-300'
                  }`} />
                </div>
                <span className={`text-xs ${
                  feat.highlight && (feature === 'download' || feature === 'bulkDownload')
                    ? 'text-white font-medium'
                    : 'text-gray-300'
                }`}>
                  {feat.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="px-3 pb-1">
          <div className="bg-gray-800/50 rounded-xl p-1 border border-gray-700">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-gray-300 text-xs">Premium Monthly</span>
              <div className="flex items-center gap-1">
                <span className="text-[#ff914d] font-bold text-sm">$4.99</span>
                <span className="text-gray-400 text-xs">/month</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>Cancel anytime</span>
              <span>7-day free trial</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 pt-1">
          <button
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-[#ff914d] to-orange-600 hover:from-[#e8823d] hover:to-orange-700 text-white py-2 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#ff914d]/25 mb-1 text-sm"
          >
            <Crown className="w-5 h-5" />
            Upgrade to Premium
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded-xl font-medium transition-colors text-xs"
          >
            Maybe Later
          </button>
        </div>

        {/* Trust indicators */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-center gap-2 text-[9px] text-gray-500">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>No Ads</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Instant Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
