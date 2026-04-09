import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, Search } from 'lucide-react';

export function SongsPage() {
  const [user] = useAuthState(auth);
  const [songs, setSongs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.email === 'xbures29@gmail.com') {
        setIsAdmin(true);
      } else {
        // We could fetch the user doc here, but for now we'll just rely on the fallback
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const songsMap = new Map<string, any>();

    const updateSongs = () => {
      const sorted = Array.from(songsMap.values()).sort((a, b) => a.title.localeCompare(b.title));
      setSongs(sorted);
    };

    if (isAdmin) {
      const q = query(collection(db, 'songs'));
      unsubs.push(onSnapshot(q, (snapshot) => {
        snapshot.docs.forEach(doc => songsMap.set(doc.id, { id: doc.id, ...doc.data() }));
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') songsMap.delete(change.doc.id);
        });
        updateSongs();
      }, console.error));
    } else {
      // Fetch public songs
      const qPublic = query(collection(db, 'songs'), where('isPublic', '==', true));
      unsubs.push(onSnapshot(qPublic, (snapshot) => {
        snapshot.docs.forEach(doc => songsMap.set(doc.id, { id: doc.id, ...doc.data() }));
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') songsMap.delete(change.doc.id);
        });
        updateSongs();
      }, console.error));

      // Fetch user's own songs if logged in
      if (user) {
        const qOwned = query(collection(db, 'songs'), where('ownerId', '==', user.uid));
        unsubs.push(onSnapshot(qOwned, (snapshot) => {
          snapshot.docs.forEach(doc => songsMap.set(doc.id, { id: doc.id, ...doc.data() }));
          snapshot.docChanges().forEach(change => {
            if (change.type === 'removed') songsMap.delete(change.doc.id);
          });
          updateSongs();
        }, console.error));
      }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [user, isAdmin]);

  const filteredSongs = songs.filter(s => 
    (s.title.toLowerCase().includes(search.toLowerCase()) || 
     s.author.toLowerCase().includes(search.toLowerCase()) ||
     (s.genre && s.genre.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Songs</h1>
        {user && (
          <Link to="/song/new">
            <Button><Plus className="w-4 h-4 mr-2" /> New Song</Button>
          </Link>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by title, author, or genre..." 
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map(song => (
          <Link key={song.id} to={`/song/${song.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{song.title}</CardTitle>
                <div className="text-sm text-muted-foreground">{song.author}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mt-2">
                  {song.genre && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full">{song.genre}</span>
                  )}
                  {!song.isPublic && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">Private</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredSongs.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No songs found.
          </div>
        )}
      </div>
    </div>
  );
}
