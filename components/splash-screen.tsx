"use client"

import { Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onClose: () => void
}

const LOGO_TEXT = "Herox"

export function SplashScreen({ onClose }: SplashScreenProps) {
  const [typed, setTyped] = useState("")
  const [showText, setShowText] = useState(false)

  useEffect(() => {
    setTyped("")
    setShowText(false)
    const startDelay = 1200 // Wait for other content to appear (ms)
    const letterDelay = 260 // Slower and smoother: was 120, now 260ms
    setTimeout(() => {
      setShowText(true)
      let current = 0
      const interval = setInterval(() => {
        setTyped(LOGO_TEXT.slice(0, current + 1))
        current++
        if (current === LOGO_TEXT.length) clearInterval(interval)
      }, letterDelay)
    }, startDelay)
  }, [])

  return (
    <div className="fixed inset-0 z-50 min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/background.jpeg')`
        }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 via-black/70 to-transparent" />
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-1"></div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="px-6 pb-4"
        >
          <div className="max-w-sm mx-auto">
            {/* Logo and Animated Logo Text */}
            <div className="flex items-center justify-center mb-1 min-h-[2.2rem]">
              <motion.img
                src="/logo.png"
                alt="Herox Logo"
                className="w-10 h-10 object-contain"
                initial={{ x: 0 }}
                animate={{ x: showText ? -8 : 0 }} // less shift for closer look
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
              <motion.h1
                className="text-[#ff914d] text-2xl font-bold ml-0.5" // even closer
                initial={{ opacity: 0 }}
                animate={{ opacity: showText ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{ minWidth: "0.1ch" }}
              >
                {typed}
              </motion.h1>
            </div>
            {/* Tagline */}
            <motion.p
              className="text-white text-base mb-3 leading-relaxed text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              All your favorite anime. All in one place.
            </motion.p>
            {/* Buttons */}
            <motion.div
              className="space-y-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1 }}
            >
              <button
                onClick={() => window.location.href = '/premium'}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1.5 px-4 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                EXPLORE FREE TRIAL
              </button>
              <button
                onClick={() => window.location.href = '/auth'}
                className="w-full bg-transparent border-2 border-[#ff914d] text-[#ff914d] font-bold py-1.5 px-4 transition-all duration-300 hover:bg-[#ff914d]/10"
              >
                LOG IN
              </button>
              <div className="text-center pt-0.5">
                <span className="text-gray-300 text-xs font-normal">or </span>
                <button
                  onClick={() => window.location.href = '/auth?mode=register'}
                  className="text-[#ff914d] font-normal text-xs hover:text-[#e8823d] transition-colors"
                >
                  Create Account
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}



