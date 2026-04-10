import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ArrowLeft, Save, Trash2, Plus, X } from 'lucide-react';

export function SongbookEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [layoutSettings, setLayoutSettings] = useState<any>({});
  
  const [availableSongs, setAvailableSongs] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  
  const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserGroupIds(userDoc.data().groupIds || []);
            setIsAdmin(userDoc.data().role === 'admin');
          } else {
            setIsAdmin(user.email === 'xbures29@gmail.com');
          }
        } catch (e) {
          console.error("Error loading user", e);
        }
      }

      let allSongs: any[] = [];
      
      try {
        const publicQuery = query(collection(db, 'songs'), where('isPublic', '==', true));
        const publicSnapshot = await getDocs(publicQuery);
        const publicSongs = publicSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        let ownedSongs: any[] = [];
        let groupSongs: any[] = [];
        if (user) {
          const ownedQuery = query(collection(db, 'songs'), where('ownerId', '==', user.uid));
          const ownedSnapshot = await getDocs(ownedQuery);
          ownedSongs = ownedSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Fetch user's groups to get group songs
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userGroupIds = userDoc.data().groupIds || [];
            if (userGroupIds.length > 0) {
              const chunks = [];
              for (let i = 0; i < userGroupIds.length; i += 10) {
                chunks.push(userGroupIds.slice(i, i + 10));
              }
              for (const chunk of chunks) {
                const groupQuery = query(collection(db, 'songs'), where('groupIds', 'array-contains-any', chunk));
                const groupSnapshot = await getDocs(groupQuery);
                groupSongs = [...groupSongs, ...groupSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))];
              }
            }
          }
        }
        
        // Merge and deduplicate
        const songMap = new Map();
        [...publicSongs, ...ownedSongs, ...groupSongs].forEach(s => songMap.set(s.id, s));
        allSongs = Array.from(songMap.values());
      } catch (e) {
        console.error("Error loading available songs", e);
        try {
          const q = query(collection(db, 'songs'));
          const snapshot = await getDocs(q);
          allSongs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (adminError) {
          console.error("Admin fallback failed", adminError);
        }
      }

      setAvailableSongs(allSongs);

      try {
        const qGroups = query(collection(db, 'groups'));
        const groupsSnap = await getDocs(qGroups);
        setAvailableGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Could not load groups", e);
      }

      if (id) {
        const sbDoc = await getDoc(doc(db, 'songbooks', id));
        if (sbDoc.exists()) {
          const data = sbDoc.data();
          setTitle(data.title);
          setDescription(data.description || '');
          setIsPublic(data.isPublic);
          setGroupIds(data.groupIds || []);
          setSongs(data.songs || []);
          setOwnerId(data.ownerId);
          setLayoutSettings({
            defaultColumns: data.defaultColumns,
            defaultFontSize: data.defaultFontSize,
            defaultShowChords: data.defaultShowChords,
            defaultHeaderFontSize: data.defaultHeaderFontSize,
            defaultSubheaderFontSize: data.defaultSubheaderFontSize,
            defaultTocFontSize: data.defaultTocFontSize
          });
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, user]);

  const handleSave = async () => {
    if (!user) return;
    if (!title) return alert('Title is required.');

    const sbId = id || doc(collection(db, 'songbooks')).id;
    const sbRef = doc(db, 'songbooks', sbId);
    
    const normalizedSongs = songs.map((s, i) => ({ ...s, order: i }));

    const data: any = {
      title,
      description,
      isPublic,
      groupIds,
      songs: normalizedSongs,
      updatedAt: Date.now()
    };

    if (layoutSettings.defaultColumns !== undefined) data.defaultColumns = layoutSettings.defaultColumns;
    if (layoutSettings.defaultFontSize !== undefined) data.defaultFontSize = layoutSettings.defaultFontSize;
    if (layoutSettings.defaultShowChords !== undefined) data.defaultShowChords = layoutSettings.defaultShowChords;
    if (layoutSettings.defaultHeaderFontSize !== undefined) data.defaultHeaderFontSize = layoutSettings.defaultHeaderFontSize;
    if (layoutSettings.defaultSubheaderFontSize !== undefined) data.defaultSubheaderFontSize = layoutSettings.defaultSubheaderFontSize;
    if (layoutSettings.defaultTocFontSize !== undefined) data.defaultTocFontSize = layoutSettings.defaultTocFontSize;

    if (!id) {
      data.ownerId = user.uid;
      data.createdAt = Date.now();
    }

    try {
      await setDoc(sbRef, data, { merge: true });
      navigate(`/songbook/${sbId}`);
    } catch (error) {
      console.error(error);
      alert('Error saving songbook');
    }
  };

  const handleDelete = async () => {
    if (!id || !user) return;
    if (confirm('Are you sure you want to delete this songbook?')) {
      try {
        await deleteDoc(doc(db, 'songbooks', id));
        navigate('/songbooks');
      } catch (error) {
        console.error(error);
      }
    }
  };

  const addSong = (songId: string) => {
    if (songs.find(s => s.songId === songId)) return;
    setSongs([...songs, { songId, order: songs.length }]);
  };

  const removeSong = (songId: string) => {
    setSongs(songs.filter(s => s.songId !== songId));
  };

  const moveSong = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= songs.length) return;
    const newSongs = [...songs];
    const temp = newSongs[index];
    newSongs[index] = newSongs[index + direction];
    newSongs[index + direction] = temp;
    setSongs(newSongs);
  };

  const sortByAuthor = () => {
    const newSongs = [...songs].sort((a, b) => {
      const songA = availableSongs.find(s => s.id === a.songId);
      const songB = availableSongs.find(s => s.id === b.songId);
      return (songA?.author || '').localeCompare(songB?.author || '');
    });
    setSongs(newSongs);
  };

  const sortByTitle = () => {
    const newSongs = [...songs].sort((a, b) => {
      const songA = availableSongs.find(s => s.id === a.songId);
      const songB = availableSongs.find(s => s.id === b.songId);
      return (songA?.title || '').localeCompare(songB?.title || '');
    });
    setSongs(newSongs);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const isOwner = user && (!id || ownerId === user.uid);
  const hasSharedGroup = userGroupIds.some(gId => groupIds.includes(gId));
  const canEdit = !id || isOwner || isAdmin || hasSharedGroup;

  const toggleGroup = (groupId: string) => {
    if (groupIds.includes(groupId)) {
      setGroupIds(groupIds.filter(id => id !== groupId));
    } else {
      setGroupIds([...groupIds, groupId]);
    }
  };

  if (!canEdit && id) {
    // Redirect to view page if they can't edit
    navigate(`/songbook/${id}`);
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/songbooks')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">{id ? 'Edit Songbook' : 'New Songbook'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {id && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Songbook Title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
              Make Public
            </label>
          </div>

          {availableGroups.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to Groups</Label>
              <div className="flex flex-wrap gap-2">
                {availableGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer bg-background border px-2 py-1 rounded hover:bg-muted/50">
                    <input 
                      type="checkbox" 
                      checked={groupIds.includes(g.id)} 
                      onChange={() => toggleGroup(g.id)} 
                      className="rounded" 
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Songs in Songbook</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={sortByTitle}>Sort by Title</Button>
                <Button variant="outline" size="sm" onClick={sortByAuthor}>Sort by Author</Button>
              </div>
            </div>
            
            <div className="space-y-2 border rounded-md p-4 bg-muted/20 min-h-[200px]">
              {songs.length === 0 && <div className="text-muted-foreground text-center py-8">No songs added yet.</div>}
              {songs.map((s, index) => {
                const song = availableSongs.find(as => as.id === s.songId);
                if (!song) return null;
                return (
                  <div key={s.songId} className="flex items-center justify-between bg-card p-3 rounded border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button disabled={index === 0} onClick={() => moveSong(index, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                        <button disabled={index === songs.length - 1} onClick={() => moveSong(index, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                      </div>
                      <div>
                        <div className="font-medium">{song.title}</div>
                        <div className="text-xs text-muted-foreground">{song.author}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSong(s.songId)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Available Songs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-1">
              {availableSongs.filter(s => !songs.find(ss => ss.songId === s.id)).map(song => (
                <div key={song.id} className="flex items-center justify-between bg-card p-3 rounded border hover:border-primary transition-colors">
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">{song.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{song.author}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => addSong(song.id)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
