import { NextRequest, NextResponse } from 'next/server';

const TENOR_API_KEY = process.env.TENOR_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'trending';
  const category = searchParams.get('category');

  if (!TENOR_API_KEY) {
    return NextResponse.json(
      { error: 'Tenor API key not configured' },
      { status: 500 }
    );
  }

  try {
    let url: string;
    
    // Generate a larger random offset to ensure different results
    const randomOffset = Math.floor(Math.random() * 200) + 1;
    
    if (type === 'search' && query) {
      // For search, add a random offset to get different results
      url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif&pos=${randomOffset}`;
    } else if (category) {
      // For category-based trending
      url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(category)}&key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif&pos=${randomOffset}`;
    } else {
      // For trending, use different search terms to get variety
      const trendingTerms = ['funny', 'cute', 'dance', 'happy', 'love', 'animals', 'food', 'sports', 'gaming', 'reaction'];
      const randomTerm = trendingTerms[Math.floor(Math.random() * trendingTerms.length)];
      url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(randomTerm)}&key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif&pos=${randomOffset}`;
    }

    console.log('Fetching GIFs with URL:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Tenor API Error:', response.status, errorData);
      return NextResponse.json(
        { error: `Tenor API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Fetched GIFs count:', data.results?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching GIFs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GIFs' },
      { status: 500 }
    );
  }
} 