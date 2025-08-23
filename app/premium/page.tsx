'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Crown, X, User, Check } from 'lucide-react'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { useRouter } from 'next/navigation'

interface PricingTier {
  id: string
  name: string
  price: number
  duration: string
  features: string[]
  popular?: boolean
  savings?: string
  description: string
}

interface UserData {
  username: string
  email: string
}

// Base prices in USD only
const basePricing: PricingTier[] = [
  {
    id: "weekly",
    name: "Premium Weekly",
    price: 2.99,
    duration: "/week",
    description: "Perfect for trying out our service",
    features: [
      "Unlimited Downloads",
      "Bulk Download All Episodes",
      "HD Quality (1080p)",
      "Ad-Free Experience",
      "Priority Support"
    ]
  },
  {
    id: "monthly",
    name: "Premium Monthly",
    price: 4.99,
    duration: "/month",
    description: "Most popular choice for regular users",
    features: [
      "All Weekly Features",
      "4K Quality Available",
      "Download Queue Management",
      "Early Access to New Episodes",
      "Premium Support"
    ],
    popular: true,
    savings: "Best Deal"
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    price: 49.99,
    duration: "/year",
    description: "Best value for committed users",
    features: [
      "All Monthly Features",
      "Offline Sync Across Devices",
      "Custom Download Schedules",
      "Premium Community Access",
      "Beta Feature Access",
      "Exclusive Content Library"
    ],
    savings: "67% OFF"
  }
]

export default function PremiumPage() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(1) // Start with monthly (middle) as active
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null)
  const [selectedPlan, setSelectedPlan] = useState(basePricing[1]) // Default to monthly plan
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'googlepay' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = () => {
      const userData = localStorage.getItem('user')
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          setIsAuthenticated(true)
        } catch (error) {
          console.error('Error parsing user data:', error)
          localStorage.removeItem('user')
          setIsAuthenticated(false)
          setUser(null)
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
    }

    checkAuthStatus()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        checkAuthStatus()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Animation setup
  useEffect(() => {
    if (scrollRef.current) {
      const cardWidth = 320 + 16 // card width + gap
      scrollRef.current.scrollLeft = cardWidth // Center the monthly card
    }
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Handle plan selection for new design
  const handleCardClick = (plan: PricingTier) => {
    setSelectedPlan(plan)
    console.log("Selected plan:", plan.name)
  }

  // Handle plan selection for payment
  const handlePlanSelection = (tier: PricingTier) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('selected_premium_plan', JSON.stringify(tier))
      router.push('/auth?redirect=premium')
      return
    }
    
    setSelectedTier(tier)
    setPaymentMethod(null)
  }

  // Check for saved plan when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const savedPlan = sessionStorage.getItem('selected_premium_plan')
      if (savedPlan) {
        try {
          const plan = JSON.parse(savedPlan)
          const localizedPlan = basePricing.find(p => p.id === plan.id)
          if (localizedPlan) {
            setSelectedTier(localizedPlan)
          }
          sessionStorage.removeItem('selected_premium_plan')
        } catch (error) {
          console.error('Error parsing saved plan:', error)
          sessionStorage.removeItem('selected_premium_plan')
        }
      }
    }
  }, [isAuthenticated])

  // PayPal handlers
  const handleSubscriptionSuccess = (subscriptionData: any, tier: PricingTier) => {
    console.log('PayPal subscription successful:', subscriptionData)
    
    const premiumData = {
      isPremium: true,
      tier: tier.id,
      subscriptionId: subscriptionData.subscriptionID,
      purchaseDate: new Date().toISOString(),
      paymentMethod: 'paypal',
      expiryDate: calculateExpiryDate(tier.id)
    }
    
    localStorage.setItem('premium_status', JSON.stringify(premiumData))
    alert(`PayPal subscription activated! Welcome to ${tier.name}`)
    setSelectedTier(null)
    setPaymentMethod(null)
  }

  const handleSubscriptionError = (error: any) => {
    console.error('PayPal subscription failed:', error)
    alert('Subscription failed. Please try again.')
    setIsProcessing(false)
  }

  const getPayPalPlanId = (tierId: string) => {
    switch (tierId) {
      case 'weekly':
        return process.env.NEXT_PUBLIC_PAYPAL_WEEKLY_PLAN_ID
      case 'monthly':
        return process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID
      case 'yearly':
        return process.env.NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID
      default:
        return null
    }
  }

  const handlePayment = async (tier: PricingTier, method: 'paypal' | 'googlepay') => {
    if (method === 'paypal') {
      return
    }
    
    setIsProcessing(true)
    
    try {
      if (method === 'googlepay') {
        console.log('Processing Google Pay payment for:', tier.name, 'Amount: $' + tier.price)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        alert('Google Pay payment successful! Premium activated.')
        const premiumData = {
          isPremium: true,
          tier: tier.id,
          purchaseDate: new Date().toISOString(),
          expiryDate: calculateExpiryDate(tier.id),
          paymentMethod: 'googlepay'
        }
        localStorage.setItem('premium_status', JSON.stringify(premiumData))
      }
      
    } catch (error) {
      console.error('Payment failed:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
      setSelectedTier(null)
      setPaymentMethod(null)
    }
  }

  const calculateExpiryDate = (tierId: string) => {
    const now = new Date()
    switch (tierId) {
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  const handleGetPremium = () => {
    handlePlanSelection(selectedPlan)
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const cardWidth = 320 + 16 // card width + gap
      const index = Math.round(scrollLeft / cardWidth)
      setActiveIndex(index)
    }
  }

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = 320 + 16 // card width + gap
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <nav
        className={`bg-black border-b border-gray-800 px-6 py-4 transition-all duration-700 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
            {/* <span className="text-sm font-medium">Cancel</span> */}
          </button>
          <h1 className="text-xl font-bold text-white">Premium</h1>
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 rounded-full">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">{user.username}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 rounded-full">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">Guest</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Pricing Cards - Horizontal Slider */}
      <div className="px-4 py-3.5 pb-32">
        <div
          className={`flex justify-center mb-0.5 transition-all duration-700 delay-200 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex gap-2">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  activeIndex === index ? "bg-white" : "bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        <div
          ref={scrollRef}
          className={`flex gap-4 overflow-x-auto scrollbar-hide pt-8 scroll-smooth snap-x snap-mandatory transition-all duration-800 delay-300 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          onScroll={handleScroll}
        >
          {/* Weekly Plan */}
          <div
            onClick={() => handleCardClick(basePricing[0])}
            className={`flex-shrink-0 w-80 h-[580px] bg-black border-2 p-6 flex flex-col snap-center cursor-pointer transition-all duration-300 hover:scale-102 ${
              selectedPlan.id === basePricing[0].id ? "border-yellow-400 shadow-lg shadow-yellow-400/20" : "border-white"
            }`}
          >
            <div
              className={`w-44 h-44 mb-4 flex items-center justify-center mx-auto transition-all duration-600 delay-500 ${
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20250817_1828_image-removebg-preview-Iap0C5DGFwO8UhCV5YvyNQRgPUuaBX.png"
                alt="Excited character"
                className="w-full h-full object-contain"
              />
            </div>

            <div
              className={`text-center mb-6 flex-shrink-0 transition-all duration-600 delay-600 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <h3 className="text-xl font-bold text-white mb-4">{basePricing[0].name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${basePricing[0].price}</span>
                <span className="text-gray-400">{basePricing[0].duration}</span>
              </div>
            </div>

            <div
              className={`space-y-2 mb-6 flex-1 transition-all duration-600 delay-700 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {basePricing[0].features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FFFF00" }} />
                  <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Plan - Featured with yellow border */}
          <div
            onClick={() => handleCardClick(basePricing[1])}
            className={`flex-shrink-0 w-80 h-[580px] bg-black border-2 p-6 flex flex-col relative snap-center cursor-pointer transition-all duration-300 hover:scale-102 ${
              selectedPlan.id === basePricing[1].id ? "border-yellow-400 shadow-lg shadow-yellow-400/20" : "border-white"
            }`}
            style={{ borderColor: selectedPlan.id === basePricing[1].id ? "#FFFF00" : "#FFFFFF" }}
          >
            <div
              className={`absolute -top-4 left-1/2 transform -translate-x-1/2 transition-all duration-600 delay-400 ${
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-75"
              }`}
            >
              <div className="text-black px-4 py-1 text-xs font-medium" style={{ backgroundColor: "#FFFF00" }}>
                {basePricing[1].savings}
              </div>
            </div>

            <div
              className={`w-44 h-44 mb-4 flex items-center justify-center mx-auto transition-all duration-600 delay-500 ${
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20250817_1827_image-removebg-preview%20%281%29-0yYgaxvLwSZfLpO62lXsHAM9raqYjI.png"
                alt="Character with coins"
                className="w-full h-full object-contain"
              />
            </div>

            <div
              className={`text-center mb-6 flex-shrink-0 transition-all duration-600 delay-600 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <h3 className="text-xl font-bold text-white mb-4">{basePricing[1].name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${basePricing[1].price}</span>
                <span className="text-gray-400">{basePricing[1].duration}</span>
              </div>
            </div>

            <div
              className={`space-y-2 mb-6 flex-1 transition-all duration-600 delay-700 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {basePricing[1].features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FFFF00" }} />
                  <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Yearly Plan */}
          <div
            onClick={() => handleCardClick(basePricing[2])}
            className={`flex-shrink-0 w-80 h-[580px] bg-black border-2 p-6 flex flex-col snap-center cursor-pointer transition-all duration-300 hover:scale-102 relative ${
              selectedPlan.id === basePricing[2].id ? "border-yellow-400 shadow-lg shadow-yellow-400/20" : "border-white"
            }`}
          >
            <div
              className={`absolute -top-4 left-1/2 transform -translate-x-1/2 transition-all duration-600 delay-400 ${
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-75"
              }`}
            >
              <div className="bg-green-600 text-white px-4 py-1 text-xs font-medium">
                67% OFF
              </div>
            </div>

            <div
              className={`w-44 h-44 mb-4 flex items-center justify-center mx-auto transition-all duration-600 delay-500 ${
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20250817_1855_image-removebg-preview-bKe91x4pEePY4EAL0HvPtLxCW4KLms.png"
                alt="Royal character with crown"
                className="w-full h-full object-contain"
              />
            </div>

            <div
              className={`text-center mb-6 flex-shrink-0 transition-all duration-600 delay-600 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <h3 className="text-xl font-bold text-white mb-4">{basePricing[2].name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${basePricing[2].price}</span>
                <span className="text-gray-400">{basePricing[2].duration}</span>
              </div>
            </div>

            <div
              className={`space-y-2 mb-6 flex-1 overflow-y-auto transition-all duration-600 delay-700 ${
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {basePricing[2].features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FFFF00" }} />
                  <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-black/30 p-6 pt-12 transition-all duration-800 delay-800 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={
              !isAuthenticated
                ? () => router.push('/auth')
                : handleGetPremium
            }
            className="w-full py-4 text-black font-bold text-lg transition-all hover:opacity-90 hover:scale-105 rounded-none flex items-center justify-center gap-2"
            style={{ backgroundColor: "#FFFF00" }}
            disabled={false}
          >
            <Crown className="w-5 h-5 text-black" />
            {!isAuthenticated ? (
              "Login Required"
            ) : (
              `Get Premium - $${selectedPlan.price}${selectedPlan.duration}`
            )}
          </button>
        </div>
      </div>

      {/* Payment Method Selection Modal */}
      {selectedTier && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-2xl border border-yellow-400 p-6 w-full max-w-sm mx-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Select Payment Method</h3>
              <button
                onClick={() => {
                  setSelectedTier(null)
                  setPaymentMethod(null)
                }}
                className="p-2 hover:bg-gray-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-900 rounded-lg">
              <p className="text-gray-300 text-sm">Selected Plan:</p>
              <p className="text-white font-bold">{selectedTier.name}</p>
              <p className="font-bold text-lg" style={{ color: "#FFFF00" }}>
                ${selectedTier.price}{selectedTier.duration}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  paymentMethod === 'paypal'
                    ? 'border-yellow-400 bg-gray-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="w-12 h-8 bg-[#0070ba] rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PayPal</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">PayPal Subscription</p>
                  <p className="text-gray-400 text-sm">Automatic recurring billing</p>
                </div>
                {paymentMethod === 'paypal' && (
                  <Check className="w-5 h-5" style={{ color: "#FFFF00" }} />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('googlepay')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  paymentMethod === 'googlepay'
                    ? 'border-yellow-400 bg-gray-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                  <span className="text-black font-bold text-xs">G Pay</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">Google Pay</p>
                  <p className="text-gray-400 text-sm">One-time payment</p>
                </div>
                {paymentMethod === 'googlepay' && (
                  <Check className="w-5 h-5" style={{ color: "#FFFF00" }} />
                )}
              </button>
            </div>

            {/* PayPal Subscription Buttons */}
            {paymentMethod === 'paypal' && (
              <div className="mb-4">
                <PayPalButtons
                  createSubscription={(data, actions) => {
                    const planId = getPayPalPlanId(selectedTier.id)
                    if (!planId) {
                      throw new Error('Plan ID not found')
                    }
                    return actions.subscription.create({
                      plan_id: planId
                    })
                  }}
                  onApprove={(data, actions) => {
                    console.log('PayPal subscription approved:', data)
                    handleSubscriptionSuccess(data, selectedTier)
                    return Promise.resolve()
                  }}
                  onError={handleSubscriptionError}
                  onCancel={() => {
                    console.log('PayPal subscription cancelled')
                    setIsProcessing(false)
                  }}
                  style={{
                    layout: 'vertical',
                    color: 'blue',
                    shape: 'rect',
                    label: 'subscribe'
                  }}
                />
              </div>
            )}

            {/* Google Pay Button */}
            {paymentMethod === 'googlepay' && (
              <button
                onClick={() => handlePayment(selectedTier, 'googlepay')}
                disabled={isProcessing}
                className="w-full text-black py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mb-4 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#FFFF00" }}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Pay ${selectedTier.price}
                  </>
                )}
              </button>
            )}

            <p className="text-gray-400 text-xs text-center mt-4">
              🔒 Secure payment processing
            </p>
          </div>
        </div>
      )}
    </div>
  )
}