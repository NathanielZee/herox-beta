// app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/comments?animeId=123&episode=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const animeId = searchParams.get('animeId')
  const episode = searchParams.get('episode')

  if (!animeId || !episode) {
    return NextResponse.json({ error: 'Missing animeId or episode' }, { status: 400 })
  }

  try {
    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('anime_id', parseInt(animeId))
      .eq('episode_number', parseInt(episode))
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }
    
    return NextResponse.json({ comments: comments || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST /api/comments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, message, animeId, episodeNumber } = body

    if (!username || !message || !animeId || !episodeNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate message length
    if (message.trim().length === 0 || message.length > 500) {
      return NextResponse.json({ error: 'Message must be between 1 and 500 characters' }, { status: 400 })
    }

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert([
        {
          username: username.trim(),
          message: message.trim(),
          anime_id: parseInt(animeId),
          episode_number: parseInt(episodeNumber)
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 })
    }
    
    return NextResponse.json({ comment })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 })
  }
}