import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, getDocs, where, or, documentId } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ChordProViewer } from '../components/ChordProViewer';
import { ArrowLeft, Save, Trash2, Info } from 'lucide-react';
import { KEYS, GERMAN_KEYS } from '../lib/transpose';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

const DEFAULT_LYRICS = `{sov}
{comment: Verse 1}
[C]Lorem ipsum dolor sit [G]amet,
[Am]consectetur adipiscing [F]elit.
[C]Sed do eiusmod tempor [G]incididunt
[F]ut labore et dolore magna [C]aliqua.
{eov}

{soc}
{comment: Chorus 1}
[F]Oh, lorem [C]ipsum,
[G]Dolor sit [Am]amet!
[F]We sing the [C]placeholder
[G]Until the end of [C]time.
{eoc}

{sov}
{comment: Verse 2}
[C]Ut enim ad minim [G]veniam,
[Am]quis nostrud exercitation [F]ullamco
[C]laboris nisi ut aliquip [G]ex ea
[F]commodo [C]consequat.
{eov}

{soc}
{comment: Chorus 1}
[F]Oh, lorem [C]ipsum,
[G]Dolor sit [Am]amet!
[F]We sing the [C]placeholder
[G]Until the end of [C]time.
{eoc}

{sov}
{comment: Verse 3}
[C]Duis aute irure dolor in [G]reprehenderit
[Am]in voluptate velit esse [F]cillum dolore
[C]eu fugiat nulla [G]pariatur.
[F]Excepteur sint [C]occaecat.
{eov}

{soc}
{comment: Chorus 2}
[F]Oh, lorem [C]ipsum,
[G]Dolor sit [Am]amet!
[F]We sing the [C]placeholder
[G]And now we fade [C]away...
{eoc}`;

export function SongEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  
  const [title, setTitle] = useState(id ? '' : 'Lorem Ipsum Song');
  const [author, setAuthor] = useState(id ? '' : 'Unknown Artist');
  const [genre, setGenre] = useState(id ? '' : 'Example');
  const [baseKey, setBaseKey] = useState(id ? '' : '');
  const [baseNotation, setBaseNotation] = useState<'standard' | 'german'>('standard');
  const [lyrics, setLyrics] = useState(id ? '' : DEFAULT_LYRICS);
  const [isPublic, setIsPublic] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  
  const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [loading, setLoading] = useState(true);

  // Preview layout state
  const [previewColumns, setPreviewColumns] = useState(2);
  const [previewLyricsFontSize, setPreviewLyricsFontSize] = useState(14);
  const [previewChordsFontSize, setPreviewChordsFontSize] = useState(14);
  const [previewNumberVerses, setPreviewNumberVerses] = useState(false);
  const [previewPageCount, setPreviewPageCount] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      let localUserGroupIds: string[] = [];
      let localIsAdmin = false;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            localUserGroupIds = userDoc.data().groupIds || [];
            setUserGroupIds(localUserGroupIds);
            localIsAdmin = userDoc.data().role === 'admin';
            setIsAdmin(localIsAdmin);
          } else {
            localIsAdmin = user.email === 'xbures29@gmail.com';
            setIsAdmin(localIsAdmin);
          }
        } catch (e) {
          console.error("Error loading user", e);
        }
      }

      try {
        let qGroups;
        if (localIsAdmin) {
          qGroups = query(collection(db, 'groups'));
        } else if (user) {
          const conditions = [where('ownerId', '==', user.uid)];
          if (localUserGroupIds.length > 0) {
            conditions.push(where(documentId(), 'in', localUserGroupIds));
          }
          qGroups = query(collection(db, 'groups'), or(...conditions));
        }
        
        if (qGroups) {
          const groupsSnap = await getDocs(qGroups);
          setAvailableGroups(groupsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        }
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
          setBaseNotation(data.baseNotation || 'standard');
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

  useEffect(() => {
    const timer = setTimeout(() => {
      const songEl = document.getElementById('measure-preview-song');
      if (songEl) {
        const containerWidth = songEl.clientWidth;
        const scrollWidth = songEl.scrollWidth;
        if (containerWidth > 0) {
          const pages = Math.max(1, Math.ceil((scrollWidth - 2) / (containerWidth + 30)));
          setPreviewPageCount(pages);
        } else {
          setPreviewPageCount(1);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [lyrics, previewColumns, previewLyricsFontSize, previewChordsFontSize, previewNumberVerses, title, author]);

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
      baseNotation,
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Rock, Pop" />
              </div>
              <div className="space-y-2">
                <Label>Notation</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={baseNotation} 
                  onChange={e => setBaseNotation(e.target.value as 'standard' | 'german')}
                >
                  <option value="standard">Standard (B, Bb)</option>
                  <option value="german">German (H, B)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Base Key</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={baseKey} 
                  onChange={e => setBaseKey(e.target.value)}
                >
                  <option value="">None</option>
                  {(baseNotation === 'german' ? GERMAN_KEYS : KEYS).map(k => (
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
              <div className="flex items-center justify-between">
                <Label>Lyrics & Chords</Label>
                <Dialog>
                  <DialogTrigger render={<Button variant="ghost" size="sm" className="h-6 px-2 text-xs" />}>
                    <Info className="w-3 h-3 mr-1" /> Formatting Help
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Formatting Cheatsheet</DialogTitle>
                      <DialogDescription>
                        Use the following tags to format your song.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-1">Chords</h4>
                        <p className="text-muted-foreground">Place chords in square brackets inline with lyrics.</p>
                        <code className="bg-muted px-1 py-0.5 rounded text-xs block mt-1">
                          [C]Hello [G]world
                        </code>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Song Sections</h4>
                        <p className="text-muted-foreground">Wrap sections with start and end tags to format them.</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                          <li><code className="bg-muted px-1 py-0.5 rounded text-xs">{"{sov}"}</code> / <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{eov}"}</code> - Verse</li>
                          <li><code className="bg-muted px-1 py-0.5 rounded text-xs">{"{soc}"}</code> / <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{eoc}"}</code> - Chorus</li>
                          <li><code className="bg-muted px-1 py-0.5 rounded text-xs">{"{sob}"}</code> / <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{eob}"}</code> - Bridge</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Directives</h4>
                        <p className="text-muted-foreground">Add metadata or comments.</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                          <li><code className="bg-muted px-1 py-0.5 rounded text-xs">{"{title: Song Name}"}</code> or <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{t: Song Name}"}</code></li>
                          <li><code className="bg-muted px-1 py-0.5 rounded text-xs">{"{subtitle: Artist}"}</code> or <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{st: Artist}"}</code></li>
                          <li><code className="bg-muted px-1 py-0.5 rounded text-xs">{"{comment: Note}"}</code> or <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{c: Note}"}</code></li>
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
        <div className={`w-full ${canEdit ? 'md:w-1/2' : ''} bg-muted/30 overflow-y-auto p-4 md:p-8 relative flex flex-col items-center`}>
          
          {/* Settings Bar */}
          <div className="w-full max-w-[210mm] mb-4 bg-card p-4 rounded-lg border shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="text-sm font-medium">Print Preview ({previewPageCount} page{previewPageCount > 1 ? 's' : ''})</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Columns</Label>
                <select 
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={previewColumns}
                  onChange={e => setPreviewColumns(Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Lyrics Size</Label>
                <input 
                  type="number" 
                  className="h-8 w-16 rounded-md border border-input bg-background px-2 text-xs"
                  value={previewLyricsFontSize}
                  onChange={e => setPreviewLyricsFontSize(Number(e.target.value))}
                  min={8} max={32}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Chords Size</Label>
                <input 
                  type="number" 
                  className="h-8 w-16 rounded-md border border-input bg-background px-2 text-xs"
                  value={previewChordsFontSize}
                  onChange={e => setPreviewChordsFontSize(Number(e.target.value))}
                  min={8} max={32}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Number Verses</Label>
                <input 
                  type="checkbox" 
                  checked={previewNumberVerses}
                  onChange={e => setPreviewNumberVerses(e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
          </div>

          {/* Paginated Pages */}
          <div className="flex flex-col gap-8 w-full items-center">
            {Array.from({ length: previewPageCount }).map((_, p) => (
              <div key={p} 
                   className="bg-white shadow-lg relative w-full max-w-[210mm] overflow-hidden group block"
                   style={{ height: '297mm', boxSizing: 'border-box', flexShrink: 0 }}>
                
                <div className="absolute top-[15mm] left-[15mm] right-[15mm] bottom-[25mm] overflow-hidden">
                   <div 
                     style={{
                       position: 'absolute',
                       top: 0,
                       left: `calc(-${p} * (100% + 8mm))`,
                       width: '100%',
                       height: '100%',
                       columnCount: previewColumns,
                       columnGap: '8mm',
                       columnFill: 'auto'
                     }}
                   >
                    <div className="mb-6 break-inside-avoid" style={{ columnSpan: 'all', WebkitColumnSpan: 'all' }}>
                      <h2 className="font-bold" style={{ fontSize: '30px', lineHeight: 1.2 }}>{title || 'Untitled'}</h2>
                      <p className="text-muted-foreground" style={{ fontSize: '20px', lineHeight: 1.2 }}>{author || 'Unknown'}</p>
                    </div>
                    <ChordProViewer 
                      text={lyrics} 
                      columns={1}
                      lyricsFontSize={previewLyricsFontSize}
                      chordsFontSize={previewChordsFontSize}
                      headerFontSize={30}
                      subheaderFontSize={20}
                      numberVerses={previewNumberVerses}
                      sourceNotation={baseNotation} 
                      targetNotation={baseNotation}
                    />
                   </div>
                </div>

                <div className="absolute bottom-[10mm] left-[15mm] right-[15mm] text-muted-foreground text-center text-sm">
                  Page {p + 1} of {previewPageCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden container for measuring pagination */}
      <div className="absolute opacity-0 pointer-events-none -z-10" style={{ top: '-10000px', left: '-10000px' }}>
        <div 
          id="measure-preview-song"
          className="w-[180mm]"
          style={{ height: '257mm', columnCount: previewColumns, columnGap: '8mm', columnFill: 'auto' }}
        >
          <div className="mb-6 break-inside-avoid" style={{ columnSpan: 'all', WebkitColumnSpan: 'all' }}>
            <h2 className="font-bold" style={{ fontSize: '30px', lineHeight: 1.2 }}>{title || 'Untitled'}</h2>
            <p className="text-muted-foreground" style={{ fontSize: '20px', lineHeight: 1.2 }}>{author || 'Unknown'}</p>
          </div>
          <ChordProViewer 
            text={lyrics} 
            columns={1}
            lyricsFontSize={previewLyricsFontSize}
            chordsFontSize={previewChordsFontSize}
            headerFontSize={30}
            subheaderFontSize={20}
            numberVerses={previewNumberVerses}
            sourceNotation={baseNotation} 
            targetNotation={baseNotation}
          />
        </div>
      </div>
    </div>
  );
}
