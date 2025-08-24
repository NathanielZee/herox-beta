// components/PayStackGooglePay.tsx
'use client'
import React, { useEffect, useState } from 'react'

interface PayStackGooglePayProps {
  amount: number // Amount in Naira (e.g., 2000 for ₦2000)
  planName: string
  planId: string
  userEmail: string
  onSuccess: (response: any) => void
  onError: (error: any) => void
  onClose?: () => void
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export const PayStackGooglePay: React.FC<PayStackGooglePayProps> = ({
  amount,
  planName,
  planId,
  userEmail,
  onSuccess,
  onError,
  onClose
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Load PayStack script
    const loadPayStack = () => {
      if (window.PaystackPop) {
        setIsLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      script.onload = () => {
        console.log('✅ PayStack script loaded successfully')
        setIsLoaded(true)
      }
      script.onerror = () => {
        console.error('❌ Failed to load PayStack script')
        onError('Failed to load payment system')
      }
      document.body.appendChild(script)
    }

    loadPayStack()
  }, [onError])

  const handlePayStackPayment = () => {
    if (!isLoaded || !window.PaystackPop) {
      onError('Payment system not ready. Please try again.')
      return
    }

    // Check environment variables
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    if (!publicKey) {
      console.error('❌ PayStack public key not found')
      onError('Payment configuration error. Please check your setup.')
      return
    }

    console.log('🚀 Starting PayStack payment:', {
      amount,
      planName,
      planId,
      userEmail,
      publicKey: publicKey.substring(0, 10) + '...'
    })

    setIsProcessing(true)

    // Generate unique reference
    const reference = `herox_premium_${planId}_${Date.now()}`
    console.log('🔑 Generated reference:', reference)

    // PayStack configuration
    const handler = window.PaystackPop.setup({
      key: publicKey, // Your PayStack public key
      email: userEmail,
      amount: amount * 100, // PayStack expects amount in kobo (multiply by 100)
      currency: 'NGN', // Nigerian Naira
      ref: reference, // Unique reference
      label: `${planName} Subscription`, // What user sees
      
      // Metadata for tracking
      metadata: {
        custom_fields: [
          {
            display_name: 'Plan',
            variable_name: 'plan',
            value: planName
          },
          {
            display_name: 'Plan ID',
            variable_name: 'plan_id', 
            value: planId
          }
        ]
      },

      callback: function(response: any) {
        console.log('💰 PayStack payment callback received:', response)
        setIsProcessing(false)
        
        if (!response.reference) {
          console.error('❌ No reference in PayStack response')
          onError('Payment failed: No reference received')
          return
        }

        console.log('🔍 Verifying payment with backend...')
        
        // Verify payment on your backend (recommended)
        fetch('/api/verify-paystack-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: response.reference,
            planId: planId
          })
        })
        .then(res => {
          console.log('📡 Verification response status:', res.status)
          return res.json()
        })
        .then(data => {
          console.log('📋 Verification response data:', data)
          
          if (data.success) {
            console.log('✅ Payment verified successfully')
            onSuccess({
              reference: response.reference,
              planId: planId,
              planName: planName,
              amount: amount,
              paymentMethod: 'paystack_googlepay'
            })
          } else {
            console.error('❌ Payment verification failed:', data.error)
            onError(`Payment verification failed: ${data.error}`)
          }
        })
        .catch(error => {
          console.error('💥 Verification fetch error:', error)
          onError('Payment verification failed: Network error')
        })
      },

      onClose: function() {
        console.log('🚪 PayStack payment window closed')
        setIsProcessing(false)
        if (onClose) onClose()
      }
    })

    try {
      console.log('🪟 Opening PayStack iframe...')
      handler.openIframe()
    } catch (error) {
      console.error('💥 Error opening PayStack iframe:', error)
      setIsProcessing(false)
      onError('Failed to open payment window')
    }
  }

  return (
    <button
      onClick={handlePayStackPayment}
      disabled={!isLoaded || isProcessing}
      className="w-full p-4 rounded-xl border-2 border-gray-700 hover:border-yellow-400 transition-all flex items-center gap-4 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Google Pay Icon */}
      <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
        <span className="text-black font-bold text-xs">G Pay</span>
      </div>
      
      <div className="flex-1 text-left">
        <p className="text-white font-medium">
          {isProcessing ? 'Processing...' : 'Google Pay'}
        </p>
        <p className="text-gray-400 text-sm">
          {isProcessing ? 'Please wait...' : 'Quick & secure payment'}
        </p>
      </div>

      {isProcessing && (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent"></div>
      )}
    </button>
  )
}

// Pricing conversion utility (USD to NGN)
export const convertToNaira = (usdAmount: number): number => {
  // You should fetch real exchange rates, but for now using approximate rate
  const exchangeRate = 1600 // 1 USD = 1600 NGN (update this)
  return Math.round(usdAmount * exchangeRate)
}

// Component for the entire payment selection
interface PaymentMethodSelectorProps {
  selectedTier: {
    id: string
    name: string
    price: number
    duration: string
  }
  userEmail: string
  onClose: () => void
  onSuccess: (data: any) => void
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedTier,
  userEmail, 
  onClose,
  onSuccess
}) => {
  const nairaAmount = convertToNaira(selectedTier.price)

  const handlePayStackSuccess = (data: any) => {
    console.log('🎉 Payment successful, creating premium data...')
    
    // Create premium status
    const premiumData = {
      isPremium: true,
      tier: selectedTier.id,
      purchaseDate: new Date().toISOString(),
      expiryDate: calculateExpiryDate(selectedTier.id),
      paymentMethod: 'paystack',
      paymentReference: data.reference
    }
    
    // Save to localStorage
    localStorage.setItem('premium_status', JSON.stringify(premiumData))
    console.log('💾 Premium status saved to localStorage')
    
    // Show success message
    alert(`🎉 Payment successful! Welcome to ${selectedTier.name}!`)
    
    onSuccess(premiumData)
    onClose()
  }

  const handlePayStackError = (error: string) => {
    console.error('❌ PayStack error:', error)
    alert(`❌ Payment failed: ${error}`)
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

  console.log('💰 PaymentMethodSelector rendered:', {
    selectedTier: selectedTier.name,
    usdAmount: selectedTier.price,
    nairaAmount,
    userEmail
  })

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black rounded-2xl border border-yellow-400 p-6 w-full max-w-sm mx-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Complete Payment</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-900 rounded-full transition-colors"
          >
            <span className="w-5 h-5 text-gray-400">✕</span>
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <p className="text-gray-300 text-sm">Selected Plan:</p>
          <p className="text-white font-bold">{selectedTier.name}</p>
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg" style={{ color: "#FFFF00" }}>
              ${selectedTier.price}{selectedTier.duration}
            </p>
            <p className="text-gray-400 text-sm">
              ≈ ₦{nairaAmount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <PayStackGooglePay
            amount={nairaAmount}
            planName={selectedTier.name}
            planId={selectedTier.id}
            userEmail={userEmail}
            onSuccess={handlePayStackSuccess}
            onError={handlePayStackError}
            onClose={onClose}
          />
        </div>

        <p className="text-gray-400 text-xs text-center">
          🔒 Secured by PayStack • Instant activation
        </p>
      </div>
    </div>
  )
}