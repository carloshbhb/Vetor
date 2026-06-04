import { NextResponse } from 'next/server';
import { 
  getPinterestConfig, 
  createPin, 
  generatePinTitle, 
  generatePinDescription, 
  generatePinImageUrl,
  schedulePin,
  getScheduledPins
} from '@/lib/pinterest';
import { getAllReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pins = await getScheduledPins();
    return NextResponse.json({ pins });
  } catch (error) {
    console.error('Failed to fetch scheduled pins:', error);
    return NextResponse.json({ pins: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewId, scheduleAt } = body;

    const config = await getPinterestConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Pinterest não configurado. Configure o access token e board.' },
        { status: 400 }
      );
    }

    // Get review data
    const reviews = await getAllReviews();
    const review = reviews.find(r => r.id === reviewId);

    if (!review) {
      return NextResponse.json(
        { error: 'Review não encontrado' },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';

    // Generate pin content
    const title = generatePinTitle(review.product, review.category, review.hero.overallScore);
    const description = generatePinDescription(
      review.product,
      review.category,
      review.hero.overallScore,
      review.pros,
      review.cons,
      review.slug
    );
    const imageUrl = generatePinImageUrl(
      review.product,
      review.hero.overallScore,
      review.imageUrl
    );
    const link = `${siteUrl}/review/${review.slug}?utm_source=pinterest&utm_campaign=auto`;

    if (scheduleAt) {
      // Schedule for later
      const scheduledPin = await schedulePin({
        reviewId: review.id,
        reviewSlug: review.slug,
        title,
        description,
        imageUrl,
        scheduledAt: scheduleAt,
      });

      return NextResponse.json({
        success: true,
        scheduled: true,
        pin: scheduledPin,
      });
    }

    // Create pin immediately
    const pin = await createPin({
      boardId: config.boardId,
      title,
      description,
      link,
      imageUrl,
      altText: `Review ${review.product} - Vetor Blog`,
    }, config.accessToken);

    return NextResponse.json({
      success: true,
      scheduled: false,
      pin,
    });
  } catch (error) {
    console.error('Failed to create Pinterest pin:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pin: ' + String(error) },
      { status: 500 }
    );
  }
}
