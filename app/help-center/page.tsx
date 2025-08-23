"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface FormData {
  name: string
  email: string
  subject: string
  message: string
  reportType: 'bug' | 'support' | 'feedback'
}

export default function HelpCenterPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    reportType: 'bug'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'bug' | 'support'>('bug')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage('')

    // Validate form
    if (!formData.name || !formData.email || !formData.message) {
      setSubmitMessage('Please fill in all required fields')
      setIsSubmitting(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setSubmitMessage('Please enter a valid email address')
      setIsSubmitting(false)
      return
    }

    try {
      // Send email using Resend API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'heroxanime1@gmail.com',
          subject: formData.subject || `${formData.reportType.charAt(0).toUpperCase() + formData.reportType.slice(1)} Report from ${formData.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ff914d; border-bottom: 2px solid #ff914d; padding-bottom: 10px;">
                New ${formData.reportType.charAt(0).toUpperCase() + formData.reportType.slice(1)} Report
              </h2>
              
              <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #333;">Contact Information</h3>
                <p><strong>Name:</strong> ${formData.name}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Report Type:</strong> ${formData.reportType.charAt(0).toUpperCase() + formData.reportType.slice(1)}</p>
                ${formData.subject ? `<p><strong>Subject:</strong> ${formData.subject}</p>` : ''}
              </div>

              <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #333;">Message</h3>
                <p style="line-height: 1.6; white-space: pre-wrap;">${formData.message}</p>
              </div>

              <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                  This message was sent from the H Anime Help Center at ${new Date().toLocaleString()}
                </p>
              </div>
            </div>
          `,
          apiKey: 're_DvVKmpSR_C5xME71dXVwX8qZe7CPmTNpZ'
        })
      })

      if (response.ok) {
        setSubmitMessage('Message sent successfully! We\'ll get back to you within 24-48 hours.')
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          reportType: 'bug'
        })
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      setSubmitMessage('Failed to send message. Please try again or contact us directly at heroxanime1@gmail.com')
      console.error('Error sending email:', error)
    }

    setIsSubmitting(false)
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
          <h1 className="text-xl font-bold text-white">Help Center</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-3">How can we help you?</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Get support, report bugs, or send us feedback. We're here to make your anime experience better.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-900 rounded-lg p-1 mb-6">
          <button
            onClick={() => {
              setActiveTab('bug')
              setFormData(prev => ({ ...prev, reportType: 'bug' }))
            }}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'bug' 
                ? 'bg-[#ff914d] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Report Bug
          </button>
          <button
            onClick={() => {
              setActiveTab('support')
              setFormData(prev => ({ ...prev, reportType: 'support' }))
            }}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'support' 
                ? 'bg-[#ff914d] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Get Support
          </button>
        </div>

        {/* Contact Form */}
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {activeTab === 'bug' ? 'Report a Bug' : 'Get Support'}
            </h3>
            <p className="text-gray-400 text-sm">
              {activeTab === 'bug' 
                ? 'Found something that isn\'t working right? Let us know so we can fix it.'
                : 'Need help with something? Having trouble with the app? We\'re here to help.'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] placeholder-gray-500"
                  required
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Subject <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder={activeTab === 'bug' ? "Brief description of the bug" : "What do you need help with?"}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] placeholder-gray-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                {activeTab === 'bug' ? 'Bug Details' : 'Message'} <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder={activeTab === 'bug' 
                  ? "Please describe the bug in detail:\n- What were you trying to do?\n- What happened instead?\n- What device/browser are you using?\n- Any error messages you saw?"
                  : "Please describe your issue or question in detail. The more information you provide, the better we can help you."
                }
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff914d] placeholder-gray-500 resize-none"
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Be as detailed as possible to help us understand and resolve your issue quickly.
              </p>
            </div>

            {/* Submit Message */}
            {submitMessage && (
              <div className={`text-sm p-3 rounded-lg ${
                submitMessage.includes('successfully') 
                  ? "bg-green-900/20 text-green-400 border border-green-900/30" 
                  : "bg-red-900/20 text-red-400 border border-red-900/30"
              }`}>
                {submitMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#ff914d] hover:bg-[#e8823d] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending Message...
                </>
              ) : (
                `Send ${activeTab === 'bug' ? 'Bug Report' : 'Support Request'}`
              )}
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="mt-6 bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Direct Contact</h3>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm mb-1">Email us directly:</p>
              <p className="text-[#ff914d] font-mono text-sm">heroxanime1@gmail.com</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Response time:</p>
              <p className="text-white text-sm">We typically respond within 24-48 hours</p>
            </div>
          </div>
        </div>

        {/* FAQ Hint */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Looking for quick answers? Check out our FAQ section for common questions and solutions.
          </p>
        </div>
      </div>
    </div>
  )
}