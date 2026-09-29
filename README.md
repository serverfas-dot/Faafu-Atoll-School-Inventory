# School Inventory Management System

A comprehensive inventory management system for schools with stock tracking, request management, and admin controls.

## Features

- **Stock Management**: Track stock in and stock out operations
- **Request System**: Public request form with approval workflow
- **Inventory Tracking**: Real-time stock levels and item management
- **Reports**: Generate detailed inventory reports
- **User Roles**: Admin and Super Admin with different permissions
- **Bulk Operations**: Select and delete multiple records at once (Super Admin only)
- **Authentication**: Secure login with password change functionality

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Storage)
- **Hosting**: Netlify

## Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## Deploy to Netlify

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy (3 steps)

1. **Build the project**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag the `dist` folder to [Netlify](https://app.netlify.com/)

3. **Set Environment Variables in Netlify**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (See DEPLOYMENT.md for the actual values)

## Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── StockInPage.tsx
│   │   ├── StockOutPage.tsx
│   │   ├── RequestsPage.tsx
│   │   ├── ApprovalsPage.tsx
│   │   ├── SuperAdminPanel.tsx
│   │   └── ...
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/              # Utilities
│   │   └── supabase.ts
│   ├── App.tsx
│   └── main.tsx
├── public/               # Static assets
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
├── netlify.toml         # Netlify configuration
├── DEPLOYMENT.md        # Deployment guide
└── README.md           # This file
```

## Default Login

After setting up the database, create admin users through the Super Admin Panel or use the setup-admins edge function.

## Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Features by Role

### Super Admin
- Full access to all features
- Delete records from Stock In/Out
- Bulk delete operations
- User management
- View all reports

### Admin
- View all records
- Add new stock entries
- Approve/reject requests
- Generate reports
- Cannot delete records

## Database

The system uses Supabase with the following main tables:

- `items` - Inventory items
- `stock_in` - Stock incoming records
- `stock_out` - Stock outgoing records
- `stock_requests` - Request submissions
- `profiles` - User profiles
- `suppliers` - Supplier information

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## License

MIT
