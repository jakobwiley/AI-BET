import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for generating a simple placeholder SVG with text
 * @param req Request object with query parameters:
 *   - text: The text to display (defaults to "TM")
 *   - color: The text color (defaults to "white")
 *   - bgColor: The background color (defaults to "#1a1a1a")
 * @returns SVG image as a response
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get('text') || 'TM';
  const color = searchParams.get('color') || 'white';
  const bgColor = searchParams.get('bgColor') || '#1a1a1a';

  // Create an SVG placeholder with the team initials
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${bgColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="32" 
        fill="${color}"
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}

/**
 * Generate a deterministic color based on input text
 */
function generateRandomColor(input: string): string {
  // Simple hash function to generate a consistent color for the same input
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
} 