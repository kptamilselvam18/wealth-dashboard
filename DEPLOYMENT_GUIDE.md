# Wealth Dashboard - Deployment Guide

## Project Overview
This is a personal investment & wealth tracking dashboard application built with Next.js 16.3.4, React 19.2.8, and TypeScript. The application allows users to track their entire financial portfolio in one place including:
- Indian stocks
- Fixed deposits (FDs)
- Mutual funds (MFs)
- Gold & Silver
- Liabilities (coming soon)

## Features Implemented
1. **Authentication**: Google OAuth + email/password
2. **Dashboard**: Net worth, investments, cash, liabilities cards
3. **Asset Management**: Add/edit/delete investments
4. **Transaction Management**: Buy, Sell, Dividend, Interest, SIP, Deposit, Withdrawal
5. **Financial Calculations**: 
   - Net Worth = Assets - Liabilities
   - P&L = Current Value - Invested Value
   - XIRR for mutual funds
   - Portfolio allocation percentages
6. **Live Price Fetching**: Mock API for stocks, MF NAVs, gold/silver prices
7. **Analytics**: Performance chart, asset allocation breakdown
8. **Unit Tests**: Financial calculation functions

## File Structure
```
wealth-dashboard/
├── prisma/                     # Database schema
│   └── schema.prisma
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx            # Root redirect
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   ├── middleware.ts       # Auth middleware
│   │   ├── dashboard/          # Dashboard page
│   │   ├── portfolio/          # Portfolio page
│   │   ├── transactions/       # Transactions page
│   │   ├── analytics/          # Analytics page
│   │   ├── profile/            # Profile page
│   │   └── api/                # API routes
│   ├── components/             # Reusable components
│   ├── lib/                    # Utility functions
│   ├── utils/                  # Financial calculations
│   └── tests/                  # Test files
├── vercel.json                 # Vercel deployment config
├── .env.example               # Environment variables template
└── package.json
```

## Setup Instructions

### 1. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Resend for email/password auth
RESEND_API_KEY="your-resend-api-key"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Deployment to Vercel

### Prerequisites
1. Vercel account
2. GitHub/GitLab/Bitbucket repository
3. PostgreSQL database (Vercel Postgres, Neon, or Supabase)

### Steps

1. **Push your code to a git repository**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin master
```

2. **Create a PostgreSQL database**
   - For Vercel: Use Vercel Postgres integration
   - For external: Use Neon, Supabase, or similar
   - Get your database connection string

3. **Configure Environment Variables in Vercel Dashboard**
   - Go to your Vercel project settings
   - Add these environment variables:
     ```
     DATABASE_URL=<your-postgres-connection-string>
     NEXTAUTH_URL=<your-vercel-app-url>
     NEXTAUTH_SECRET=<your-secret-key>
     GOOGLE_CLIENT_ID=<your-google-client-id>
     GOOGLE_CLIENT_SECRET=<your-google-client-secret>
     ```

4. **Deploy**
   - Vercel will automatically detect the Next.js app
   - Build command: `npx prisma generate && next build`
   - Deploy command: `next start`

### vercel.json Configuration
The project includes a `vercel.json` file with the following configuration:
```json
{
  "buildCommand": "npx prisma generate && next build",
  "devCommand": "npx prisma db push && next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXTAUTH_URL": "@nextauth_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "DATABASE_URL": "@database_url",
    "GOOGLE_CLIENT_ID": "@google_client_id",
    "GOOGLE_CLIENT_SECRET": "@google_client_secret"
  }
}
```

## Testing
Run the financial calculation tests:
```bash
npm test
```
or
```bash
npx vitest
```

## Production Considerations
1. **Replace mock price API**: Integrate with real financial data providers like:
   - Alpha Vantage
   - Yahoo Finance API
   - Google Finance
   - NSE/BSE APIs for Indian stocks

2. **Enhance security**:
   - Implement rate limiting
   - Add input validation
   - Use HTTPS in production
   - Implement proper CORS policies

3. **Scaling considerations**:
   - For larger user bases, consider Vercel's serverless functions limits
   - Consider migrating to a dedicated backend for complex calculations

## Troubleshooting

### Common Issues

1. **Prisma Client Generation Errors**
   ```bash
   npx prisma generate
   ```

2. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Ensure database is accessible from Vercel/serverless functions
   - Check firewall settings for external databases

3. **Authentication Issues**
   - Verify Google OAuth credentials are correct
   - Check redirect URIs in Google Cloud Console
   - Ensure NEXTAUTH_URL matches your deployment URL

4. **Build Failures**
   - Check for TypeScript errors
   - Verify all imports are correct
   - Ensure environment variables are set during build

## Next Steps for Enhancement
1. Add goals feature
2. Implement insights and notifications
3. Add support for additional asset classes (ETFs, bonds, NPS, PPF, EPF)
4. Implement real-time price updates via WebSockets
5. Add export functionality (PDF/CSV reports)
6. Implement dark/light theme persistence
7. Add data backup/restore functionality
8. Implement multi-currency support
9. Add advanced charting with libraries like Chart.js or Recharts
10. Implement role-based access for family/shared accounts

---
*Built with Next.js, React, TypeScript, Prisma, and Tailwind CSS*