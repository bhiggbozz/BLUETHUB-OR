export function PendingLessonApprovals() {
  return (
    <div className="bg-white rounded-md border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Pending lesson approvals
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Lessons awaiting your review
          </p>
        </div>
      </div>

      {/* Empty state */}
      <div className="py-10 text-center">
        <p className="text-xs text-gray-400">No pending lesson approvals.</p>
      </div>
    </div>
  )
}