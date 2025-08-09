"use client"

import { FileText, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/?tab=settings')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#e66465] to-[#9198e5] flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              <p className="text-gray-600">Last updated: January 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">1. Agreement to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using Loop Review's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">2. Use of Services</h2>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800">Acceptable Use</h3>
              <p className="text-gray-600">You agree to use Loop Review for lawful purposes only and in accordance with these Terms. You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon intellectual property rights</li>
                <li>Transmit malicious code or interfere with the platform</li>
                <li>Attempt unauthorized access to any part of the service</li>
                <li>Use the service to send spam or unsolicited communications</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">3. Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for all activities under your account</li>
              <li>You must notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">4. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We reserve the right to modify pricing with 30 days notice</li>
              <li>You authorize us to charge your payment method on file</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">5. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              Loop Review and its original content, features, and functionality are owned by Loop Review and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">6. Content and Reviews</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>You retain ownership of content you submit</li>
              <li>You grant us a license to use your content for service operation</li>
              <li>You are responsible for the accuracy of review requests</li>
              <li>We do not endorse or verify user-generated content</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">7. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by law, Loop Review shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">8. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including breach of these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">9. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or platform notification. Continued use of the service after changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">10. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Loop Review</strong><br />
                Email: legal@loopreview.com<br />
                Address: [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}