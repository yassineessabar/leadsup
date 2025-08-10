"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Menu, X, ChevronRight, Globe, ChevronDown, Rocket, BarChart, HelpCircle, Store, Users, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const collections = [
  {
    id: "getting-started",
    title: "Getting started with LoopDev",
    description: "Step by step guide on how to get started with LoopDev",
    icon: Rocket,
    articles: 9,
    href: "#"
  },
  {
    id: "analytics",
    title: "Understanding your analytics",
    description: "Learn how to leverage your analytics",
    icon: BarChart,
    articles: 8,
    href: "#"
  },
  {
    id: "how-to",
    title: "How-to's",
    description: "Instructional guides on LoopDev features",
    icon: HelpCircle,
    articles: 89,
    href: "#"
  },
  {
    id: "earn",
    title: "Earn with LoopDev",
    description: "Tips & tricks on how to monetize with LoopDev",
    icon: Store,
    articles: 21,
    href: "#"
  },
  {
    id: "account",
    title: "Account support",
    description: "Questions about LoopDev billing and account setup",
    icon: Users,
    articles: 36,
    href: "#"
  },
  {
    id: "security",
    title: "Security and Policies",
    description: "Learn about LoopDev's policies and security",
    icon: Shield,
    articles: 10,
    href: "#"
  }
]

const popularArticles = [
  { title: "Understanding your Insights", href: "#" },
  { title: "I can't log in to my account. What should I do?", href: "#" },
  { title: "Highlight your links with Featured Layouts", href: "#" },
  { title: "Using Shop to promote affiliate recommendations", href: "#" },
  { title: "How to create and manage multiple LoopDevs", href: "#" },
  { title: "Create a QR code for your LoopDev", href: "#" }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="text-white" style={{ backgroundColor: 'rgb(87, 140, 255)' }}>
        <div className="relative flex flex-col mb-9 pb-9" style={{ minHeight: '245px' }}>
          {/* Top Bar */}
          <section className="relative flex w-full flex-col mb-6 pb-6">
            <div className="flex justify-center px-5 pt-6 leading-none sm:px-10">
              <div className="flex items-center w-full max-w-7xl">
                <div className="flex-1">
                  <Link href="/help">
                    <Image
                      src="/loop-logo.png"
                      alt="LoopDev Help Center"
                      width={144}
                      height={144}
                      className="h-8 w-auto"
                    />
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center font-semibold">
                  <div className="relative cursor-pointer">
                    <select className="peer absolute z-10 block h-6 w-full cursor-pointer opacity-0" aria-label="Change language" defaultValue="/en/">
                      <option value="/en/">English</option>
                    </select>
                    <div className="flex items-center gap-1 text-md hover:opacity-80 peer-hover:opacity-80">
                      <Globe className="h-4 w-4" />
                      English
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </nav>

                {/* Mobile Menu Button */}
                <button
                  className="flex items-center border-none bg-transparent px-1.5 md:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6 fill-current" />
                </button>
              </div>
            </div>
          </section>

          {/* Hero Section */}
          <section className="relative mx-5 flex h-full w-full flex-col items-center px-5 sm:px-10">
            <div className="flex h-full max-w-full flex-col w-full max-w-4xl justify-end">
              <h1 className="text-7xl mb-6 font-bold text-white text-start">How can we help you?</h1>

              {/* Search Bar */}
              <div className="w-full">
                <form action="/help" autoComplete="off">
                  <div className="flex w-full flex-col items-start">
                    <div className="relative flex w-full">
                      <label htmlFor="search-input" className="sr-only">Search for articles...</label>
                      <input
                        type="text"
                        id="search-input"
                        autoComplete="off"
                        className="peer w-full rounded-full border border-black/10 bg-white/20 p-4 ps-12 text-lg text-white shadow-sm outline-none transition ease-linear placeholder:text-white/70 hover:bg-white/30 hover:shadow-md focus:border-transparent focus:bg-white focus:text-black focus:shadow-lg placeholder:focus:text-gray-500"
                        placeholder="Search for articles..."
                        name="q"
                        aria-label="Search for articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="absolute inset-y-0 start-0 flex items-center fill-white peer-focus-visible:fill-gray-700 pointer-events-none ps-5">
                        <Search className="h-5 w-5 fill-inherit" />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50 md:hidden">
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white text-black">
              <div className="p-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" />
                </Button>
                <nav className="mt-8">
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Globe className="h-4 w-4" />
                    English
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="z-1 flex shrink-0 grow basis-auto justify-center px-5 sm:px-10">
        <section className="max-w-full w-full max-w-7xl">
          <section>
            <div className="flex flex-col gap-12 py-12">
              {/* Collections Grid */}
              <div className="grid auto-rows-auto gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-6 md:grid-cols-2" role="list">
                {collections.map((collection) => {
                  const Icon = collection.icon
                  return (
                    <Link
                      key={collection.id}
                      href={collection.href}
                      className="collection-link group/collection-summary flex grow overflow-hidden border border-solid border-gray-200 bg-white no-underline shadow-sm transition ease-linear rounded-xl hover:border-[rgb(87,140,255)] flex-col"
                    >
                      <div className="flex grow flex-col gap-4 p-5 sm:flex-col sm:p-6">
                        <div className="flex items-center rounded-lg bg-cover bg-center h-10 w-10 justify-center bg-gray-100">
                          <div className="h-6 w-6">
                            <Icon className="h-full w-full" style={{ color: 'rgb(87, 140, 255)' }} />
                          </div>
                        </div>
                        <div className="intercom-force-break flex w-full flex-1 flex-col text-gray-900 justify-between">
                          <div>
                            <div className="-mt-1 mb-0.5 line-clamp-2 text-md font-semibold leading-normal text-gray-900 transition ease-linear sm:line-clamp-1">
                              {collection.title}
                            </div>
                            <p className="mb-0 mt-0 line-clamp-3 text-md sm:line-clamp-2 text-gray-600">
                              {collection.description}
                            </p>
                          </div>
                          <div className="mt-4">
                            <div className="flex">
                              <span className="line-clamp-1 flex text-base text-gray-500">
                                {collection.articles} articles
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Popular Articles */}
              <section className="flex flex-col rounded-xl border border-solid border-gray-200 bg-white p-2 sm:p-3 shadow-sm">
                <header className="mb-1 px-3 pb-4 pt-2 font-primary text-xl font-bold leading-10 text-gray-900">
                  Popular articles
                </header>
                <div className="grid auto-rows-auto gap-x-4 sm:gap-x-6 md:grid-cols-1" role="list">
                  {popularArticles.map((article, index) => (
                    <Link
                      key={index}
                      href={article.href}
                      className="duration-250 group/article flex flex-row justify-between gap-2 py-2 no-underline transition ease-linear sm:rounded-lg sm:py-3 rounded-lg px-3"
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(87, 140, 255, 0.05)'; e.currentTarget.style.color = 'rgb(87, 140, 255)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'inherit'; }}
                    >
                      <div className="flex flex-col p-0">
                        <span className="m-0 text-md text-gray-900 font-regular">
                          {article.title}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col justify-center p-0">
                        <svg className="block h-4 w-4 -rotate-90" style={{ color: 'rgb(87, 140, 255)' }} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-24 shrink-0 bg-black px-0 py-12 text-left text-base text-white">
        <div className="shrink-0 grow basis-auto px-5 sm:px-10">
          <div className="mx-auto max-w-7xl sm:w-auto">
            <div>
              <div className="flex flex-col md:flex-row">
                <div className="mb-6 me-0 max-w-md shrink-0 sm:mb-0 sm:me-18 sm:w-auto">
                  <div className="align-middle text-lg text-white">
                    <Link className="no-underline" href="/">
                      <Image
                        src="/loop-logo.png"
                        alt="LoopDev Help Center"
                        width={120}
                        height={32}
                        className="max-h-8 contrast-80"
                      />
                    </Link>
                  </div>
                  <div className="mt-6 text-start text-base"></div>
                  <div className="mt-10">
                    <ul className="flex flex-wrap items-center gap-4 p-0 justify-start">
                      <li className="list-none align-middle">
                        <Link target="_blank" href="https://www.instagram.com/loopdev" rel="nofollow noreferrer noopener" className="no-underline">
                          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="white">
                            <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                          </svg>
                        </Link>
                      </li>
                      <li className="list-none align-middle">
                        <Link target="_blank" href="https://www.tiktok.com/@loopdev" rel="nofollow noreferrer noopener" className="no-underline">
                          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="white">
                            <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/>
                          </svg>
                        </Link>
                      </li>
                      <li className="list-none align-middle">
                        <Link target="_blank" href="https://www.twitter.com/loopdev" rel="nofollow noreferrer noopener" className="no-underline">
                          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="white">
                            <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
                          </svg>
                        </Link>
                      </li>
                      <li className="list-none align-middle">
                        <Link target="_blank" href="https://www.youtube.com/@loopdev" rel="nofollow noreferrer noopener" className="no-underline">
                          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="white">
                            <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.122C.002 7.343.01 6.6.064 5.78l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z"/>
                          </svg>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-18 flex grow flex-col md:mt-0 md:items-end">
                  <div className="grid grid-cols-2 gap-x-7 gap-y-14 md:flex md:flex-row md:flex-wrap">
                    <div className="w-1/2 sm:w-auto">
                      <div className="flex w-40 flex-col break-words">
                        <p className="mb-6 text-start font-semibold">Resources</p>
                        <ul className="p-0">
                          <li className="mb-4 list-none"><Link target="_blank" href="/auth/login" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">Log in</Link></li>
                          <li className="mb-4 list-none"><Link target="_blank" href="/marketplace" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">Marketplace</Link></li>
                          <li className="mb-4 list-none"><Link target="_blank" href="/app" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">LoopDev app</Link></li>
                          <li className="mb-4 list-none"><Link target="_blank" href="/blog" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">LoopDev blog</Link></li>
                        </ul>
                      </div>
                    </div>
                    <div className="w-1/2 sm:w-auto">
                      <div className="flex w-40 flex-col break-words">
                        <p className="mb-6 text-start font-semibold">Company</p>
                        <ul className="p-0">
                          <li className="mb-4 list-none"><Link target="_blank" href="/" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">Home</Link></li>
                          <li className="mb-4 list-none"><Link target="_blank" href="/terms" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">Terms</Link></li>
                          <li className="mb-4 list-none"><Link target="_blank" href="/privacy" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">Privacy</Link></li>
                          <li className="mb-4 list-none"><Link target="_blank" href="/about" rel="nofollow noreferrer noopener" className="no-underline opacity-80 hover:opacity-100">LoopDev</Link></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}