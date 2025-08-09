"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"

const helpCollections = [
  {
    title: "Getting started with Loop",
    description: "Step by step guide on how to get started with Loop",
    articles: 9
  },
  {
    title: "Understanding your analytics",
    description: "Learn how to leverage your analytics",
    articles: 8
  },
  {
    title: "How-to's",
    description: "Instructional guides on Loop features",
    articles: 89
  },
  {
    title: "Earn with Loop",
    description: "Tips & tricks on how to monetize with Loop",
    articles: 21
  },
  {
    title: "Account support",
    description: "Questions about Loop billing and account setup",
    articles: 35
  },
  {
    title: "Security and Policies",
    description: "Learn about Loop's policies and security",
    articles: 10
  }
]

export default function HelpChatbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("help")

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white rounded-full p-4 shadow-lg hover:bg-gray-800 transition-colors"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Main Container */}
      <div tabIndex={-1} role="region" aria-label="Intercom messenger" className="flex flex-col h-full">
        <main id="spaces-help" data-testid="spaces-help" className="flex flex-col h-full">

          {/* Header */}
          <div id="intercom-header-placeholder" className="flex-shrink-0">
            <div className="bg-white border-b border-gray-100">
              <div className="px-4 py-3">
                <nav className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div data-testid="header-left-area"></div>
                    <h1 className="text-lg font-medium text-gray-900">Help</h1>
                    <div data-testid="header-right-area">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none w-6 h-6 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <div role="button" tabIndex={0} className="relative cursor-text">
                      <input
                        aria-label="Search for help"
                        className="w-full px-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value=""
                        readOnly
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                          <circle cx="7.5" cy="7.5" r="4.625" stroke="currentColor" strokeWidth="1.75"></circle>
                          <path d="M13.3813 14.6187C13.723 14.9604 14.277 14.9604 14.6187 14.6187C14.9604 14.277 14.9604 13.723 14.6187 13.3813L13.3813 14.6187ZM10.3813 11.6187L13.3813 14.6187L14.6187 13.3813L11.6187 10.3813L10.3813 11.6187Z" fill="currentColor"></path>
                        </svg>
                        <p className="ml-2 text-gray-500 text-sm">Search for help</p>
                      </div>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <div className="h-full">
                  <div style={{minHeight: '113px'}}></div>
                  <div className="px-4">
                    <section className="pb-4">
                      <div className="h-full">
                        <div className="h-full overflow-y-auto" tabIndex={0}>
                          <div className="space-y-4">
                            <div>
                              <div>
                                <header className="mb-4">
                                  <h2 className="text-sm font-medium text-gray-700">6 collections</h2>
                                </header>

                                <ul className="space-y-0">
                                  {helpCollections.map((collection, index) => (
                                    <li key={index}>
                                      <div
                                        data-testid="collection-card"
                                        role="button"
                                        tabIndex={0}
                                        className="flex items-start justify-between p-4 hover:bg-gray-50 cursor-pointer rounded-lg group transition-colors"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 mb-1">
                                            {collection.title}
                                          </p>
                                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                            {collection.description}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            <span>{collection.articles} articles</span>
                                          </p>
                                        </div>
                                        <div className="flex-shrink-0 ml-3">
                                          <div className="w-4 h-4 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-600 group-hover:text-blue-700">
                                              <path d="M5.42773 4.70898C5.46387 4.85254 5.53809 4.98828 5.65039 5.10059L8.54932 8L5.64893 10.9004C5.31689 11.2324 5.31689 11.7705 5.64893 12.1025C5.98096 12.4336 6.51904 12.4336 6.85107 12.1025L10.3516 8.60059C10.5591 8.39355 10.6367 8.10449 10.585 7.83691C10.5537 7.67578 10.4761 7.52246 10.3516 7.39844L6.85254 3.89941C6.52051 3.56738 5.98242 3.56738 5.65039 3.89941C5.43066 4.11816 5.35645 4.42871 5.42773 4.70898Z" fill="currentColor"></path>
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Tab Bar */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white">
            <div role="tablist" data-testid="spaces-tab-bar" className="flex">
              <button
                role="tab"
                aria-current="false"
                aria-controls="spaces-home"
                aria-label="Home"
                aria-expanded="false"
                data-testid="home"
                tabIndex={-1}
                className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                  activeTab === "home" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("home")}
              >
                <div className="w-6 h-6 mb-1 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeWidth="1.7" d="M2.85 9.35c0-.423.218-.85.635-1.143l7.496-5.172h.001a1.84 1.84 0 0 1 2.036 0l7.495 5.17.002.002c.417.293.635.72.635 1.142V19.7c0 .73-.676 1.45-1.65 1.45h-15c-.974 0-1.65-.72-1.65-1.45z"></path>
                    <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" d="M17.25 15A7.86 7.86 0 0 1 12 17.002 7.86 7.86 0 0 1 6.75 15"></path>
                  </svg>
                </div>
                <span className="text-xs font-medium">Home</span>
              </button>

              <button
                role="tab"
                aria-current="false"
                aria-controls="spaces-messages"
                aria-label="Messages"
                aria-expanded="false"
                data-testid="messages"
                tabIndex={-1}
                className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                  activeTab === "messages" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("messages")}
              >
                <div className="w-6 h-6 mb-1 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="currentColor" d="M19 2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4.586l-3.707 3.707A1 1 0 0 1 9 21V18H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h14z"></path>
                  </svg>
                </div>
                <span className="text-xs font-medium">Messages</span>
              </button>

              <button
                role="tab"
                aria-current="true"
                aria-controls="spaces-help"
                aria-label="Help"
                aria-expanded="true"
                data-testid="help"
                tabIndex={0}
                className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                  activeTab === "help" ? "text-blue-600 border-t-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("help")}
              >
                <div className="w-6 h-6 mb-1 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="currentColor" fillRule="evenodd" d="M22.5 12c0 5.799-4.701 10.5-10.5 10.5S1.5 17.799 1.5 12 6.201 1.5 12 1.5 22.5 6.201 22.5 12M11.926 7.85a1.56 1.56 0 0 0-1.465 1.02.85.85 0 1 1-1.594-.588 3.26 3.26 0 1 1 5.547 3.233l-.019.022-.02.021-1.075 1.105-.006.006-.006.006c-.319.315-.512.534-.512.94v.363a.85.85 0 0 1-1.7 0v-.364c0-1.144.664-1.8 1.003-2.134l.009-.008 1.046-1.076a1.56 1.56 0 0 0-1.208-2.546m0 9.917a.884.884 0 1 0 0-1.767.884.884 0 0 0 0 1.767" clipRule="evenodd"></path>
                  </svg>
                </div>
                <span className="text-xs font-medium">Help</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}