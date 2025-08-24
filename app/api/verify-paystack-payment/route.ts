// app/api/verify-paystack-payment/route.ts
import { NextResponse } from 'next/server'

// Add GET handler for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'PayStack verification API is working!',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const { reference, planId } = await request.json()

    console.log('🔍 Verification request received:', { reference, planId })

    if (!reference || !planId) {
      console.error('❌ Missing required fields:', { reference, planId })
      return NextResponse.json({ 
        success: false, 
        error: 'Missing payment reference or plan ID' 
      }, { status: 400 })
    }

    // Check if PayStack secret key exists
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      console.error('❌ PayStack secret key not found in environment variables')
      return NextResponse.json({ 
        success: false, 
        error: 'PayStack configuration error' 
      }, { status: 500 })
    }

    console.log('🔑 Using PayStack secret key:', secretKey.substring(0, 10) + '...')

    // Verify payment with PayStack
    console.log('📡 Verifying payment with PayStack...')
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('📊 PayStack response status:', paystackResponse.status)

    const paystackData = await paystackResponse.json()
    console.log('📋 PayStack response data:', JSON.stringify(paystackData, null, 2))

    if (!paystackResponse.ok) {
      console.error('❌ PayStack API error:', {
        status: paystackResponse.status,
        statusText: paystackResponse.statusText,
        data: paystackData
      })
      return NextResponse.json({ 
        success: false, 
        error: `PayStack API error: ${paystackData.message || 'Unknown error'}`,
        details: paystackData
      }, { status: 400 })
    }

    // Check if payment was successful
    if (paystackData.status && paystackData.data && paystackData.data.status === 'success') {
      console.log('✅ Payment verified successfully:', {
        reference,
        amount: paystackData.data.amount / 100,
        customer: paystackData.data.customer?.email || 'No email'
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified successfully',
        data: {
          reference,
          amount: paystackData.data.amount / 100,
          currency: paystackData.data.currency,
          customer: paystackData.data.customer?.email || 'No email'
        }
      })
    } else {
      console.error('❌ Payment status check failed:', {
        paystackStatus: paystackData.status,
        dataStatus: paystackData.data?.status,
        message: paystackData.message
      })
      
      return NextResponse.json({ 
        success: false, 
        error: `Payment verification failed: ${paystackData.message || 'Payment was not successful'}`,
        details: {
          paystackStatus: paystackData.status,
          dataStatus: paystackData.data?.status,
          message: paystackData.message
        }
      }, { status: 400 })
    }

  } catch (error) {
    console.error('💥 Payment verification error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}