import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ChordProViewer } from '../components/ChordProViewer';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

const DEFAULT_LYRICS = `{comment: Verse 1}
[C]Lorem ipsum dolor sit [G]amet,
[Am]consectetur adipiscing [F]elit.
[C]Sed do eiusmod tempor [G]incididunt
[F]ut labore et dolore magna [C]aliqua.

{comment: Chorus 1}
[F]Oh, lorem [C]ipsum,
[G]Dolor sit [Am]amet!
[F]We sing the [C]placeholder
[G]Until the end of [C]time.

{comment: Verse 2}
[C]Ut enim ad minim [G]veniam,
[Am]quis nostrud exercitation [F]ullamco
[C]laboris nisi ut aliquip [G]ex ea
[F]commodo [C]consequat.

{comment: Chorus 1}
[F]Oh, lorem [C]ipsum,
[G]Dolor sit [Am]amet!
[F]We sing the [C]placeholder
[G]Until the end of [C]time.

{comment: Verse 3}
[C]Duis aute irure dolor in [G]reprehenderit
[Am]in voluptate velit esse [F]cillum dolore
[C]eu fugiat nulla [G]pariatur.
[F]Excepteur sint [C]occaecat.

{comment: Chorus 2}
[F]Oh, lorem [C]ipsum,
[G]Dolor sit [Am]amet!
[F]We sing the [C]placeholder
[G]And now we fade [C]away...`;

export function SongEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  
  const [title, setTitle] = useState(id ? '' : 'Lorem Ipsum Song');
  const [author, setAuthor] = useState(id ? '' : 'Unknown Artist');
  const [genre, setGenre] = useState(id ? '' : 'Example');
  const [baseKey, setBaseKey] = useState(id ? '' : '');
  const [lyrics, setLyrics] = useState(id ? '' : DEFAULT_LYRICS);
  const [isPublic, setIsPublic] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState('');
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

      try {
        const qGroups = query(collection(db, 'groups'));
        const groupsSnap = await getDocs(qGroups);
        setAvailableGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Could not load groups", e);
      }

      if (id) {
        const snapshot = await getDoc(doc(db, 'songs', id));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTitle(data.title);
          setAuthor(data.author);
          setGenre(data.genre || '');
          setBaseKey(data.baseKey || '');
          setLyrics(data.lyrics);
          setIsPublic(data.isPublic);
          setGroupIds(data.groupIds || []);
          setOwnerId(data.ownerId);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!user) return;
    if (!title || !author || !lyrics) return alert('Title, author, and lyrics are required.');

    const songId = id || doc(collection(db, 'songs')).id;
    const songRef = doc(db, 'songs', songId);
    
    const data: any = {
      title,
      author,
      genre,
      baseKey,
      lyrics,
      isPublic,
      groupIds,
      updatedAt: Date.now()
    };

    if (!id) {
      data.ownerId = user.uid;
      data.createdAt = Date.now();
    }

    try {
      await setDoc(songRef, data, { merge: true });
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Error saving song');
    }
  };

  const handleDelete = async () => {
    if (!id || !user) return;
    if (confirm('Are you sure you want to delete this song?')) {
      try {
        await deleteDoc(doc(db, 'songs', id));
        navigate('/');
      } catch (error) {
        console.error(error);
      }
    }
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

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{id ? (canEdit ? 'Edit Song' : 'View Song') : 'New Song'}</h1>
            {!canEdit && (
              <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground">Read Only</span>
            )}
          </div>
        </div>
        {canEdit && (
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
        )}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Editor Pane */}
        {canEdit && (
          <div className="w-full md:w-1/2 border-r flex flex-col bg-muted/20 overflow-y-auto p-4 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song Title" />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Artist / Author" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Rock, Pop" />
              </div>
              <div className="space-y-2">
                <Label>Base Key</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={baseKey} 
                  onChange={e => setBaseKey(e.target.value)}
                >
                  <option value="">None</option>
                  {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer h-10">
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

            <div className="space-y-2 flex-1 flex flex-col">
              <Label>Lyrics & Chords (ChordPro format)</Label>
              <Textarea 
                className="flex-1 font-mono text-sm resize-none min-h-[300px]" 
                value={lyrics} 
                onChange={e => setLyrics(e.target.value)}
                placeholder="[C]Hello [G]world..."
              />
            </div>
          </div>
        )}

        {/* Preview Pane */}
        <div className={`w-full ${canEdit ? 'md:w-1/2' : ''} bg-background overflow-y-auto p-8`}>
          <div className="max-w-2xl mx-auto">
            {!canEdit && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-muted-foreground text-lg">{author}</p>
                <div className="flex gap-2 mt-2">
                  {genre && <span className="inline-block text-xs bg-secondary px-2 py-1 rounded-full">{genre}</span>}
                  {baseKey && <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Key: {baseKey}</span>}
                </div>
              </div>
            )}
            <ChordProViewer text={lyrics} />
          </div>
        </div>
      </div>
    </div>
  );
}
