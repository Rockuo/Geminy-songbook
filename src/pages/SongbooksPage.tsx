import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, Search, Book } from 'lucide-react';

export function SongbooksPage() {
  const [user] = useAuthState(auth);
  const [songbooks, setSongbooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.email === 'xbures29@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const sbMap = new Map<string, any>();

    const updateSongbooks = () => {
      const sorted = Array.from(sbMap.values()).sort((a, b) => a.title.localeCompare(b.title));
      setSongbooks(sorted);
    };

    if (isAdmin) {
      const q = query(collection(db, 'songbooks'));
      unsubs.push(onSnapshot(q, (snapshot) => {
        snapshot.docs.forEach(doc => sbMap.set(doc.id, { id: doc.id, ...doc.data() }));
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') sbMap.delete(change.doc.id);
        });
        updateSongbooks();
      }, console.error));
    } else {
      // Fetch public songbooks
      const qPublic = query(collection(db, 'songbooks'), where('isPublic', '==', true));
      unsubs.push(onSnapshot(qPublic, (snapshot) => {
        snapshot.docs.forEach(doc => sbMap.set(doc.id, { id: doc.id, ...doc.data() }));
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') sbMap.delete(change.doc.id);
        });
        updateSongbooks();
      }, console.error));

      // Fetch user's own songbooks if logged in
      if (user) {
        const qOwned = query(collection(db, 'songbooks'), where('ownerId', '==', user.uid));
        unsubs.push(onSnapshot(qOwned, (snapshot) => {
          snapshot.docs.forEach(doc => sbMap.set(doc.id, { id: doc.id, ...doc.data() }));
          snapshot.docChanges().forEach(change => {
            if (change.type === 'removed') sbMap.delete(change.doc.id);
          });
          updateSongbooks();
        }, console.error));
      }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [user, isAdmin]);

  const filteredSongbooks = songbooks.filter(s => 
    (s.title.toLowerCase().includes(search.toLowerCase()) || 
     (s.description && s.description.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Songbooks</h1>
        {user && (
          <Link to="/songbook/new">
            <Button><Plus className="w-4 h-4 mr-2" /> New Songbook</Button>
          </Link>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search songbooks..." 
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongbooks.map(sb => (
          <Link key={sb.id} to={`/songbook/${sb.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Book className="w-4 h-4 text-primary" />
                  {sb.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground line-clamp-2 mb-2">{sb.description}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-secondary px-2 py-1 rounded-full">{sb.songs?.length || 0} songs</span>
                  {!sb.isPublic && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">Private</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredSongbooks.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No songbooks found.
          </div>
        )}
      </div>
    </div>
  );
}
