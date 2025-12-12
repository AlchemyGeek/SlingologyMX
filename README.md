# SlingologyMX

Aircraft maintenance tracking and compliance management system for experimental aircraft owners.

## Overview

SlingologyMX is a web-based application designed to help experimental aircraft owners manage:
- **Maintenance Logs** - Track all maintenance activities with detailed records
- **Directives & Bulletins** - Monitor compliance with ADs, Service Bulletins, and manufacturer alerts
- **Aircraft Counters** - Track Hobbs, Tach, and component total times
- **Subscriptions** - Manage aviation-related subscriptions and renewals
- **Notifications** - Date-based and counter-based maintenance reminders

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| State | TanStack Query |

## Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or bun
- Supabase account (for backend services)

## Local Development

```bash
# Clone the repository
git clone <repository-url>
cd slingologymx

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
├── integrations/       # Supabase client & types
├── lib/                # Utility functions
├── pages/              # Route pages
└── assets/             # Static assets

supabase/
├── config.toml         # Supabase configuration
├── functions/          # Edge functions
└── migrations/         # Database migrations

docs/
└── FUNCTIONAL_SPEC.md  # Detailed feature documentation
```

## Database Schema

Key tables:
- `profiles` - User profile information
- `user_roles` - Role-based access control
- `aircraft_counters` - Current counter values
- `aircraft_counter_history` - Counter change history
- `notifications` - Date and counter-based reminders
- `subscriptions` - Aviation subscription tracking
- `maintenance_logs` - Maintenance records
- `directives` - AD/SB/SI tracking
- `aircraft_directive_status` - Per-aircraft compliance status
- `maintenance_directive_compliance` - Compliance events

All tables implement Row-Level Security (RLS) policies.

## Deployment

### Self-Hosted

1. **Database Setup**
   - Create a Supabase project
   - Run migrations from `supabase/migrations/`
   - Configure authentication settings

2. **Frontend Deployment**
   ```bash
   npm run build
   ```
   Deploy the `dist/` folder to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.)

3. **Edge Functions**
   Deploy edge functions to your Supabase project:
   ```bash
   supabase functions deploy
   ```

### Environment Configuration

Ensure these are configured in your hosting environment:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Authentication

The app uses Supabase Auth with:
- Email/password authentication
- Email verification required
- Self-service password reset
- Admin-controlled signup toggle

## User Roles

| Role | Capabilities |
|------|-------------|
| Regular Member | Full access to personal records |
| Admin | User management, system settings, all user data |

## Documentation

See [docs/FUNCTIONAL_SPEC.md](docs/FUNCTIONAL_SPEC.md) for complete feature documentation.

## License

This project is licensed under the Apache License, Version 2.0.
See the LICENSE file for details.
