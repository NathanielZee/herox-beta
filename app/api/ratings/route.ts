// app/api/ratings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/ratings?animeId=123&episode=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const animeId = searchParams.get('animeId')
  const episode = searchParams.get('episode')

  if (!animeId || !episode) {
    return NextResponse.json({ error: 'Missing animeId or episode' }, { status: 400 })
  }

  try {
    const { data: ratings, error } = await supabaseAdmin
      .from('ratings')
      .select('*')
      .eq('anime_id', parseInt(animeId))
      .eq('episode_number', parseInt(episode))

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
    }

    // Calculate average rating
    const totalRatings = ratings?.length || 0
    const averageRating = totalRatings > 0 
      ? Math.round((ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10) / 10
      : 0

    return NextResponse.json({ 
      ratings: ratings || [],
      averageRating,
      totalRatings 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}

// POST /api/ratings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, rating, animeId, episodeNumber } = body

    if (!username || !rating || !animeId || !episodeNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate rating
    const ratingNum = parseInt(rating)
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Use upsert to replace existing rating or create new one
    const { data: newRating, error } = await supabaseAdmin
      .from('ratings')
      .upsert([
        {
          username: username.trim(),
          rating: ratingNum,
          anime_id: parseInt(animeId),
          episode_number: parseInt(episodeNumber)
        }
      ], {
        onConflict: 'username,anime_id,episode_number'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }
    
    return NextResponse.json({ rating: newRating })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }
}