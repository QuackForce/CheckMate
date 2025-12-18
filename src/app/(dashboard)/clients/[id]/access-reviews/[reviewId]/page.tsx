import { AccessReviewPageClient } from '@/components/access-reviews/access-review-page-client'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AccessReviewPage({
  params,
}: {
  params: { id: string; reviewId: string }
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Fetch the access review
  const review = await db.accessReview.findUnique({
    where: { id: params.reviewId },
    include: {
      Client: {
        select: { id: true, name: true },
      },
      AssignedTo: {
        select: { id: true, name: true, email: true },
      },
      CompletedBy: {
        select: { id: true, name: true, email: true },
      },
      AuditLog: {
        include: {
          User: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { timestamp: 'desc' },
      },
      TimerSession: {
        include: {
          User: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startTime: 'desc' },
      },
    },
  })

  if (!review) {
    return (
      <div className="flex-1 p-6">
        <div className="card p-12 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Review Not Found</h2>
          <p className="text-surface-400">
            The access review you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    )
  }

  // Verify the review belongs to the client
  if (review.clientId !== params.id) {
    redirect(`/clients/${review.clientId}/access-reviews/${params.reviewId}`)
  }

  // Format dates
  const reviewDate = formatDate(new Date(review.reviewDate))
  const dueDate = formatDate(new Date(review.dueDate))
  const cadence = review.cadence.replace('_', ' ')
  const subtitle = `${cadence} • Review: ${reviewDate} • Due: ${dueDate}`

  return <AccessReviewPageClient review={review} subtitle={subtitle} />
}

