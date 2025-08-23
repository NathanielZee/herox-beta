"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface User {
  username: string
  email: string
  password: string
}

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      // Redirect to auth if not logged in
      router.push("/auth")
    }
  }, [router])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    if (!user) {
      setMessage("User not found. Please log in again.")
      setIsLoading(false)
      return
    }

    // Verify current password
    if (currentPassword !== user.password) {
      setMessage("Current password is incorrect")
      setIsLoading(false)
      return
    }

    // Validate new password
    if (newPassword.length < 6) {
      setMessage("New password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords don't match")
      setIsLoading(false)
      return
    }

    if (newPassword === currentPassword) {
      setMessage("New password must be different from current password")
      setIsLoading(false)
      return
    }

    // Simulate API call delay
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Update user data in localStorage
      const updatedUser = {
        ...user,
        password: newPassword
      }

      localStorage.setItem("user", JSON.stringify(updatedUser))
      setUser(updatedUser)

      // Also update in any user database/registry you might have
      const existingUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      const updatedUsers = existingUsers.map((regUser: User) => 
        regUser.email === user.email 
          ? { ...regUser, password: newPassword }
          : regUser
      )
      localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers))

      setMessage("Password updated successfully! Please use your new password for future logins.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Auto redirect to profile after 2 seconds
      setTimeout(() => {
        router.push("/profile")
      }, 2000)

    } catch (error) {
      setMessage("Failed to update password. Please try again.")
    }

    setIsLoading(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff914d] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-1">
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <Image src="/logo.png" alt="H Anime Logo" width={32} height={32} className="object-contain" />
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* User Info */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-1">Account</h3>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-6">Change Password</h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Current Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] pr-12 placeholder-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] pr-12 placeholder-gray-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Password must be at least 6 characters long
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Confirm New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] pr-12 placeholder-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-2">
                <p className="text-gray-400 text-xs">Password strength:</p>
                <div className="flex gap-1">
                  <div className={`h-1 rounded-full flex-1 ${newPassword.length >= 6 ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                  <div className={`h-1 rounded-full flex-1 ${newPassword.length >= 8 ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                  <div className={`h-1 rounded-full flex-1 ${newPassword.length >= 10 && /[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`text-sm p-3 rounded-lg ${
                message.includes("successfully") 
                  ? "bg-green-900/20 text-green-400 border border-green-900/30" 
                  : "bg-red-900/20 text-red-400 border border-red-900/30"
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-[#ff914d] hover:bg-[#e8823d] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating Password...
                </div>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              🔒 Security Note
            </h4>
            <p className="text-gray-400 text-sm">
              After updating your password, you'll need to use the new password for all future logins. 
              Make sure to remember or save your new password securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}