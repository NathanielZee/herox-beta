"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLogin, setIsLogin] = useState(true)

  // Check URL parameter to determine if we should show registration form
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'register') {
      setIsLogin(false) // Show registration form
    }
  }, [searchParams])
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Function to get random profile and cover images
  const getRandomImages = () => {
    const profileImageNumber = Math.floor(Math.random() * 8) + 1 // 1-8
    const coverImageNumber = Math.floor(Math.random() * 5) + 1 // 1-5
    
    return {
      profileImage: `/profile/${profileImageNumber}.jpg`, // or .png depending on your file format
      coverImage: `/cover/${coverImageNumber}-cover.jpg` // or .png depending on your file format
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isLogin) {
        // Login logic
        const users = JSON.parse(localStorage.getItem("users") || "[]")
        const user = users.find(
          (u: any) => (u.email === formData.email || u.username === formData.email) && u.password === formData.password,
        )

        if (user) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              username: user.username,
              email: user.email,
              profileImage: user.profileImage,
              coverImage: user.coverImage,
            }),
          )
          // Redirect to home page instead of profile
          router.push("/")
        } else {
          setError("Invalid credentials")
        }
      } else {
        // Register logic
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords don't match")
          return
        }

        const users = JSON.parse(localStorage.getItem("users") || "[]")

        // Check if user already exists
        const existingUser = users.find((u: any) => u.email === formData.email || u.username === formData.username)

        if (existingUser) {
          setError("User already exists")
          return
        }

        // Get random images for new user
        const randomImages = getRandomImages()

        // Add new user with random profile and cover images
        const newUser = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          profileImage: randomImages.profileImage,
          coverImage: randomImages.coverImage,
        }
        users.push(newUser)
        localStorage.setItem("users", JSON.stringify(users))
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: newUser.username,
            email: newUser.email,
            profileImage: newUser.profileImage,
            coverImage: newUser.coverImage,
          }),
        )

        // Redirect to home page instead of profile
        router.push("/")
      }
    } catch (error) {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="px-6 py-8"
      >
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image src="/logo.png" alt="H Anime Logo" width={80} height={80} className="object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-8">{isLogin ? "Welcome Back" : "Create Account"}</h1>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff914d]"
                  placeholder="Enter your username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isLogin ? "Email or Username" : "Email"}
              </label>
              <input
                type={isLogin ? "text" : "email"}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff914d]"
                placeholder={isLogin ? "Enter email or username" : "Enter your email"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff914d] pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff914d]"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff914d] hover:bg-[#e8823d] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button onClick={() => setIsLogin(!isLogin)} className="text-[#ff914d] hover:underline text-sm">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}