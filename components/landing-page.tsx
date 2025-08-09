"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Mail, Target, ArrowRight } from "lucide-react"
import Link from "next/link"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="font-bold text-xl">LeadsUp</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Generate More Leads.
            <br />
            <span className="text-blue-600">Convert Better.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your lead generation with LeadsUp. Capture, qualify, and convert leads automatically 
            with AI-powered automation. Boost sales and grow your business.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to grow your business
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Lead Capture</CardTitle>
                <CardDescription>
                  Capture leads from multiple sources automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Website forms, social media, and landing pages all in one place.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Lead Scoring</CardTitle>
                <CardDescription>
                  Automatically qualify and score your leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  AI-powered scoring helps you focus on the best opportunities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Email Automation</CardTitle>
                <CardDescription>
                  Nurture leads with personalized sequences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Automated follow-ups that convert prospects into customers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Track performance and optimize results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Detailed insights to improve your conversion rates.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center bg-blue-600 rounded-2xl text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to grow your business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using LeadsUp to generate more leads and increase sales.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </section>

        {/* Footer */}
        <footer className="py-12 text-center text-gray-600">
          <p>&copy; 2024 LeadsUp. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}