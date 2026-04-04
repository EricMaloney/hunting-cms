import { SubmissionForm } from '@/components/submissions/SubmissionForm'

export default function SubmitPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit New Content</h1>
        <p className="text-gray-500 mt-1">
          Upload images or videos for display on Huntington Steel digital signage screens.
        </p>
      </div>

      <SubmissionForm />
    </div>
  )
}
