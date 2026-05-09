# PersonalHub - Next.js TypeScript Edition

A modern, full-featured personal digital hub built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase.

## Features

✨ **Personal Hub Applications:**
- 📝 **Notes** - Create, edit, and sync notes in real-time
- 🎵 **Music** - Upload, organize, and play your music collection
- 🖼️ **Gallery** - Create folders and manage your photo collection
- 💌 **Letters** - Compose and save personal letters

🔐 **Authentication:**
- Secure authentication with Supabase
- Email/password signup and login
- Session persistence
- Auto-refresh token management

💾 **Real-time Sync:**
- Real-time database subscriptions via Supabase
- Instant updates across devices
- Automatic data synchronization

📱 **Progressive Web App (PWA):**
- Installable on mobile and desktop
- Offline capability with service worker
- App manifest and icons

## Tech Stack

- **Framework:** Next.js 16.2.6
- **UI Library:** React 19.2.4
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database & Auth:** Supabase
- **Icons:** FontAwesome 6.5.0
- **Fonts:** Poppins, Mali Google Fonts

## Getting Started

### Prerequisites

- Node.js 18+ or npm 10+
- Supabase account with:
  - Authentication enabled
  - Database tables created (notes, music, gallery_folders, gallery_images, letters)
  - Storage buckets: `music-files`, `gallery-images`
  - Row Level Security (RLS) policies configured

### Installation

1. **Clone and setup:**
   ```bash
   cd personalhub-next
   npm install
   ```

2. **Configure Supabase:**
   - Update `src/lib/supabase.ts` with your Supabase credentials:
     ```typescript
     const SUPABASE_URL = 'your-project-url';
     const SUPABASE_ANON_KEY = 'your-anon-key';
     ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   - Visit `http://localhost:3000`

### Database Setup

Create the following tables in your Supabase database:

**notes**
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**music**
```sql
CREATE TABLE music (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**gallery_folders**
```sql
CREATE TABLE gallery_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**gallery_images**
```sql
CREATE TABLE gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES gallery_folders(id) ON DELETE CASCADE,
  title TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**letters**
```sql
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  recipient TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### RLS Policies

Enable Row Level Security and add policies:

```sql
-- For all tables, allow users to access only their own data
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE music ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Example for notes table
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);
```

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with navbar
│   │   ├── page.tsx            # Home dashboard
│   │   ├── notes/page.tsx       # Notes app
│   │   ├── music/page.tsx       # Music player
│   │   ├── gallery/page.tsx     # Image gallery
│   │   └── letters/page.tsx     # Letters composer
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Login/signup page
│   └── globals.css             # Global styles
├── components/
│   ├── Navbar.tsx              # Navigation bar
│   ├── AuthGuard.tsx           # Auth protection
│ └── ...
├── contexts/
│   └── AuthContext.tsx         # Authentication context
├── lib/
│   └── supabase.ts             # Supabase client & APIs
└── hooks/
    └── useLocalStorage.ts      # Custom hooks
```

## Available Scripts

```bash
# Development
npm run dev           # Start dev server at localhost:3000

# Production
npm run build         # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

## Features in Detail

### 📝 Notes
- Create and edit rich text notes
- Real-time synchronization
- Auto-save functionality
- Search and organize notes

### 🎵 Music
- Upload audio files to Supabase Storage
- Music player with play/pause controls
- Previous/next track navigation
- Delete tracks
- Beautiful music visualization bar

### 🖼️ Gallery
- Create and organize folders
- Upload images to folders
- View images in grid layout
- Delete individual images or folders
- Real-time folder updates

### 💌 Letters
- Compose personal letters
- Add recipient information (optional)
- Download letters as text files
- Full letter history
- Edit and delete letters

## Authentication Flow

1. **Login/Signup:** Users enter email and password
2. **Session:** Stored in browser with auto-refresh
3. **Protected Routes:** AuthGuard ensures logged-in users only
4. **Logout:** Clears session and redirects to login

## Real-time Features

All app data uses Supabase Real Replication:
- Changes sync instantly across tabs/devices
- Subscriptions auto-update UI
- Automatic reconnection on network issues

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 12+, Chrome Mobile)

## Performance Optimizations

- ✅ Image optimization with Next.js Image component
- ✅ Lazy loading for routes
- ✅ Tailwind CSS tree-shaking
- ✅ Font optimization with Google Fonts
- ✅ Efficient real-time subscriptions

## Security

- 🔐 All credentials use environment variables
- 🔐 Supabase RLS policies enforce data privacy
- 🔐 Server-side auth token handling
- 🔐 HTTPS/SSL encryption in production
- 🔐 XSS and CSRF protection via Next.js

## Deployment

### Vercel (Recommended)
```bash
# Push to Git
git push origin main

# Vercel auto-deploys on push
```

### Docker
```bash
docker build -t personalhub-next .
docker run -p 3000:3000 personalhub-next
```

### Self-hosted
```bash
npm run build
npm start
```

## Troubleshooting

**"Database connection error"**
- Verify Supabase URL and keys in `src/lib/supabase.ts`
- Check table names match exactly

**"Auth not working"**
- Ensure Supabase Auth is enabled
- Check email confirmation settings

**"Real-time not updating"**
- Verify RLS policies are correct
- Check browser console for errors
- Restart dev server

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use for personal or commercial projects

## Support

For issues and questions:
- Check existing issues on GitHub
- Review Supabase documentation
- Consult Next.js docs

---

**Built with ❤️ as a personal digital sanctuary**
