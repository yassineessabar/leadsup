"use client"

import { Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function PrivacyPage() {
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
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-gray-600">Last updated: January 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Loop Review ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our review management platform and related services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">2. Information We Collect</h2>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Name and contact information (email, phone number)</li>
                <li>Company/business details</li>
                <li>Payment and billing information</li>
                <li>Reviews and feedback data</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Log data and analytics</li>
                <li>Device and browser information</li>
                <li>IP address and location data</li>
                <li>Platform usage patterns</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>To provide and maintain our services</li>
              <li>To process transactions and send related information</li>
              <li>To send review requests on your behalf</li>
              <li>To communicate with you about updates and features</li>
              <li>To analyze and improve our services</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 leading-relaxed">
              We do not sell, trade, or rent your personal information. We may share your information in the following situations:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>With service providers who assist in our operations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>In connection with a business transfer or merger</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>256-bit SSL encryption for data transmission</li>
              <li>Secure data centers with regular security audits</li>
              <li>Access controls and authentication measures</li>
              <li>Regular security training for our team</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">6. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Access and receive a copy of your data</li>
              <li>Correct or update inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">7. GDPR Compliance</h2>
            <p className="text-gray-600 leading-relaxed">
              For users in the European Economic Area (EEA), we comply with the General Data Protection Regulation (GDPR). We process data based on:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Your consent</li>
              <li>Contract fulfillment</li>
              <li>Legal obligations</li>
              <li>Legitimate interests</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">8. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Loop Review</strong><br />
                Email: privacy@loopreview.com<br />
                Address: [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}