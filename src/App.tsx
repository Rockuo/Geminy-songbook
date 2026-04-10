import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Auth } from './components/Auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Music } from 'lucide-react';

import { SongsPage } from './pages/SongsPage';
import { SongEditorPage } from './pages/SongEditorPage';
import { SongbooksPage } from './pages/SongbooksPage';
import { SongbookEditorPage } from './pages/SongbookEditorPage';
import { SongbookViewPage } from './pages/SongbookViewPage';
import { GroupsPage } from './pages/GroupsPage';

export default function App() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: user.displayName || 'Unknown',
        photoUrl: user.photoURL || '',
        role: 'user'
      }, { merge: true }).catch(console.error);
    }
  }, [user]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="text-xl font-bold flex items-center gap-2">
                <Music className="w-6 h-6 text-primary" />
                Songbook
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link to="/" className="text-sm font-medium hover:text-primary">Songs</Link>
                <Link to="/songbooks" className="text-sm font-medium hover:text-primary">Songbooks</Link>
                <Link to="/groups" className="text-sm font-medium hover:text-primary">Groups</Link>
              </nav>
            </div>
            <Auth />
          </div>
        </header>
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<SongsPage />} />
            <Route path="/song/new" element={<SongEditorPage />} />
            <Route path="/song/:id" element={<SongEditorPage />} />
            <Route path="/songbooks" element={<SongbooksPage />} />
            <Route path="/songbook/new" element={<SongbookEditorPage />} />
            <Route path="/songbook/:id/edit" element={<SongbookEditorPage />} />
            <Route path="/songbook/:id" element={<SongbookViewPage />} />
            <Route path="/groups" element={<GroupsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
