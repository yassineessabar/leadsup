# Leadsup - Lead Management Platform

A modern lead management application built with Next.js, TypeScript, and Supabase.

## Features

- 🔐 Authentication (Login/Signup)
- 📊 Dashboard with lead analytics
- 👥 Lead management
- 📈 Performance tracking
- 💳 Subscription management
- 🎨 Modern UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
cd leadsup
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Set up Supabase database:

Create the following tables in your Supabase project:

**users table:**
- id (uuid, primary key)
- email (text, unique)
- password_hash (text)
- first_name (text)
- last_name (text)
- company (text)
- title (text)
- phone_number (text)
- created_at (timestamp)
- subscription_type (text, default: 'free')
- subscription_status (text, default: 'active')

**user_sessions table:**
- id (uuid, primary key)
- user_id (uuid, foreign key to users.id)
- session_token (text, unique)
- expires_at (timestamp)
- created_at (timestamp, default: now())

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
leadsup/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   └── ...               # Feature components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
└── public/               # Static assets
```

## Tech Stack

- **Framework:** Next.js 15
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Database:** Supabase
- **Authentication:** Custom JWT-based auth
- **Charts:** Recharts
- **Icons:** Lucide React

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

This project is private and proprietary.