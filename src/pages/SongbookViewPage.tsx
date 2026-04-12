import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../components/ui/button';
import { Settings, Type, Columns, Hash, Music, ArrowLeft, Edit, Printer, ExternalLink } from 'lucide-react';
import { calculateSteps, KEYS } from '../lib/transpose';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ChordProViewer } from '../components/ChordProViewer';

const PaginatedContent = ({ 
  content, 
  columns, 
  pageCount, 
  startPage, 
  getPageNumberAlignment,
  settingsPopover
}: any) => {
  const pages = [];
  for (let p = 0; p < pageCount; p++) {
    const pageNum = startPage + p;
    pages.push(
      <div key={p} className="bg-background md:bg-white md:shadow-lg mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page relative w-full md:w-[210mm] h-[297mm] print:w-[210mm] print:h-[297mm] p-4 md:p-12 print:py-[15mm] print:px-[15mm] flex flex-col print:!bg-none overflow-hidden group">
        
        {p === 0 && settingsPopover}

        <div className="relative w-full h-full overflow-hidden">
           <div 
             style={{
               position: 'absolute',
               top: 0,
               left: `calc(-${p} * (100% + 8mm))`,
               width: '100%',
               height: '100%',
               columnCount: columns,
               columnGap: '8mm',
               columnFill: 'auto'
             }}
           >
             {content}
           </div>
        </div>

        <div className={`absolute bottom-[15mm] text-muted-foreground print:text-black ${getPageNumberAlignment(pageNum)}`}>
          {pageNum}
        </div>
      </div>
    );
  }
  return <>{pages}</>;
};

export function SongbookViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  
  const [songbook, setSongbook] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Layout state
  const [defaultColumns, setDefaultColumns] = useState(2);
  const [defaultFontSize, setDefaultFontSize] = useState(14);
  const [defaultShowChords, setDefaultShowChords] = useState(true);
  const [defaultHeaderFontSize, setDefaultHeaderFontSize] = useState(30);
  const [defaultSubheaderFontSize, setDefaultSubheaderFontSize] = useState(20);
  const [defaultTocFontSize, setDefaultTocFontSize] = useState(18);
  const [pageNumberingStyle, setPageNumberingStyle] = useState<'standard' | 'reversed'>('standard');
  const [songOverrides, setSongOverrides] = useState<Record<string, any>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [pageStarts, setPageStarts] = useState<Record<string, number>>({});
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [tocPage, setTocPage] = useState(2);

  useEffect(() => {
    if (loading || !songbook) return;
    
    // Calculate page numbers after a short delay to allow rendering
    const timer = setTimeout(() => {
      const newPageStarts: Record<string, number> = {};
      const newPageCounts: Record<string, number> = {};
      
      let currentPage = 1; // Title page is 1
      newPageCounts['title'] = 1;
      currentPage += 1;

      setTocPage(currentPage);
      
      const tocEl = document.getElementById('measure-toc');
      if (tocEl) {
        const containerWidth = tocEl.clientWidth;
        const scrollWidth = tocEl.scrollWidth;
        if (containerWidth > 0) {
          const pages = Math.max(1, Math.ceil((scrollWidth - 2) / (containerWidth + 30)));
          newPageCounts['toc'] = pages;
          currentPage += pages;
        } else {
          newPageCounts['toc'] = 1;
          currentPage += 1;
        }
      } else {
        newPageCounts['toc'] = 1;
        currentPage += 1;
      }

      songs.forEach(song => {
        newPageStarts[song.id] = currentPage;
        const songEl = document.getElementById(`measure-song-${song.id}`);
        if (songEl) {
          const containerWidth = songEl.clientWidth;
          const scrollWidth = songEl.scrollWidth;
          if (containerWidth > 0) {
            const pages = Math.max(1, Math.ceil((scrollWidth - 2) / (containerWidth + 30)));
            newPageCounts[song.id] = pages;
            currentPage += pages;
          } else {
            newPageCounts[song.id] = 1;
            currentPage += 1;
          }
        } else {
          newPageCounts[song.id] = 1;
          currentPage += 1;
        }
      });
      
      setPageStarts(newPageStarts);
      setPageCounts(newPageCounts);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [songs, defaultColumns, defaultFontSize, defaultHeaderFontSize, defaultSubheaderFontSize, defaultTocFontSize, songOverrides, loading, songbook]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
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
        const sbDoc = await getDoc(doc(db, 'songbooks', id));
        if (sbDoc.exists()) {
          const sbData = sbDoc.data();
          setSongbook({ id: sbDoc.id, ...sbData });
          
          setDefaultColumns(sbData.defaultColumns || 2);
          setDefaultFontSize(sbData.defaultFontSize || 14);
          setDefaultShowChords(sbData.defaultShowChords ?? true);
          setDefaultHeaderFontSize(sbData.defaultHeaderFontSize || 30);
          setDefaultSubheaderFontSize(sbData.defaultSubheaderFontSize || 20);
          setDefaultTocFontSize(sbData.defaultTocFontSize || 18);
          setPageNumberingStyle(sbData.pageNumberingStyle || 'standard');
          
          const overrides: Record<string, any> = {};
          
          const sbSongs = [];
          for (const s of (sbData.songs || [])) {
            try {
              const songDoc = await getDoc(doc(db, 'songs', s.songId));
              if (songDoc.exists()) {
                sbSongs.push({ id: songDoc.id, ...songDoc.data(), order: s.order });
                overrides[songDoc.id] = {
                  columns: s.columns,
                  fontSize: s.fontSize,
                  showChords: s.showChords,
                  transposeTo: s.transposeTo,
                  headerFontSize: s.headerFontSize,
                  subheaderFontSize: s.subheaderFontSize
                };
              }
            } catch (e) {
              console.warn("Could not load song", s.songId, e);
            }
          }
          
          setSongOverrides(overrides);
          setSongs(sbSongs.sort((a, b) => a.order - b.order));
        }
      } catch (e) {
        console.error("Error loading songbook", e);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handlePrint = () => {
    if (window !== window.parent) {
      // We are in an iframe
      setShowPrintDialog(true);
    } else {
      window.print();
    }
  };

  const handleSaveLayout = async () => {
    if (!id || !canEdit) return;
    try {
      const updatedSongs = songs.map(s => {
        const override = songOverrides[s.id] || {};
        const songData: any = {
          songId: s.id,
          order: s.order
        };
        if (override.columns !== undefined) songData.columns = override.columns;
        if (override.fontSize !== undefined) songData.fontSize = override.fontSize;
        if (override.showChords !== undefined) songData.showChords = override.showChords;
        if (override.transposeTo !== undefined) songData.transposeTo = override.transposeTo;
        if (override.headerFontSize !== undefined) songData.headerFontSize = override.headerFontSize;
        if (override.subheaderFontSize !== undefined) songData.subheaderFontSize = override.subheaderFontSize;
        return songData;
      });
      
      await setDoc(doc(db, 'songbooks', id), {
        defaultColumns,
        defaultFontSize,
        defaultShowChords,
        defaultHeaderFontSize,
        defaultSubheaderFontSize,
        defaultTocFontSize,
        pageNumberingStyle,
        songs: updatedSongs
      }, { merge: true });
      
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Error saving layout", e);
      alert("Failed to save layout settings");
    }
  };

  const updateOverride = (songId: string, key: string, value: any) => {
    setSongOverrides(prev => ({
      ...prev,
      [songId]: {
        ...prev[songId],
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateGlobal = (key: string, value: any) => {
    if (key === 'columns') setDefaultColumns(value);
    if (key === 'fontSize') setDefaultFontSize(value);
    if (key === 'showChords') setDefaultShowChords(value);
    if (key === 'headerFontSize') setDefaultHeaderFontSize(value);
    if (key === 'subheaderFontSize') setDefaultSubheaderFontSize(value);
    if (key === 'tocFontSize') setDefaultTocFontSize(value);
    if (key === 'pageNumberingStyle') setPageNumberingStyle(value);
    setHasUnsavedChanges(true);
  };

  const getPageNumberAlignment = (pageNum: number) => {
    const isOdd = pageNum % 2 !== 0;
    if (pageNumberingStyle === 'standard') {
      // Standard: Odd = Right, Even = Left
      return isOdd ? 'right-8 md:right-12 print:right-8 text-right' : 'left-8 md:left-12 print:left-8 text-left';
    } else {
      // Reversed: Odd = Left, Even = Right
      return isOdd ? 'left-8 md:left-12 print:left-8 text-left' : 'right-8 md:right-12 print:right-8 text-right';
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!songbook) return <div className="p-8">Songbook not found</div>;

  const isOwner = user && songbook.ownerId === user.uid;
  const hasSharedGroup = userGroupIds.some(gId => (songbook.groupIds || []).includes(gId));
  const canEdit = isOwner || isAdmin || hasSharedGroup;

  const pageClass = "bg-background md:bg-white md:shadow-lg mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page relative w-full md:w-[210mm] h-[297mm] print:w-[210mm] print:h-[297mm] p-4 md:p-12 print:py-[15mm] print:px-[15mm] flex flex-col print:!bg-none";
  const pageStyle = {};

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl print:p-0 print:max-w-none print:m-0">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Printing from Preview</DialogTitle>
            <DialogDescription className="pt-4 space-y-4 text-base">
              <p>
                Because this app is running inside a preview window, the browser blocks the print dialog.
              </p>
              <p>
                To print or export to PDF, please open the app in a new tab using the <strong>Open in new tab</strong> button (usually an arrow icon <ExternalLink className="inline w-4 h-4" />) in the top right corner of the AI Studio preview window.
              </p>
              <p>
                Once opened in a new tab, the Print button will work normally!
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowPrintDialog(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="print:hidden flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/songbooks')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{songbook.title}</h1>
            <p className="text-muted-foreground">{songbook.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="print:hidden">
                <Settings className="w-4 h-4 mr-2" /> Layout
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Global Layout Settings</h4>
                <p className="text-sm text-muted-foreground">
                  These settings apply to all songs unless overridden.
                </p>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><Columns className="w-4 h-4"/> Columns</Label>
                      <span className="text-sm text-muted-foreground">{defaultColumns}</span>
                    </div>
                    <Slider 
                      value={[defaultColumns]} 
                      min={1} max={3} step={1}
                      onValueChange={(v) => updateGlobal('columns', Array.isArray(v) ? v[0] : v)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> Font Size</Label>
                      <span className="text-sm text-muted-foreground">{defaultFontSize}px</span>
                    </div>
                    <Slider 
                      value={[defaultFontSize]} 
                      min={10} max={24} step={1}
                      onValueChange={(v) => updateGlobal('fontSize', Array.isArray(v) ? v[0] : v)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> Header Size</Label>
                      <span className="text-sm text-muted-foreground">{defaultHeaderFontSize}px</span>
                    </div>
                    <Slider 
                      value={[defaultHeaderFontSize]} 
                      min={16} max={48} step={1}
                      onValueChange={(v) => updateGlobal('headerFontSize', Array.isArray(v) ? v[0] : v)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> Subheader Size</Label>
                      <span className="text-sm text-muted-foreground">{defaultSubheaderFontSize}px</span>
                    </div>
                    <Slider 
                      value={[defaultSubheaderFontSize]} 
                      min={12} max={36} step={1}
                      onValueChange={(v) => updateGlobal('subheaderFontSize', Array.isArray(v) ? v[0] : v)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> TOC Size</Label>
                      <span className="text-sm text-muted-foreground">{defaultTocFontSize}px</span>
                    </div>
                    <Slider 
                      value={[defaultTocFontSize]} 
                      min={12} max={32} step={1}
                      onValueChange={(v) => updateGlobal('tocFontSize', Array.isArray(v) ? v[0] : v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label className="flex items-center gap-2"><Hash className="w-4 h-4"/> Show Chords</Label>
                    <Switch 
                      checked={defaultShowChords} 
                      onCheckedChange={(v) => updateGlobal('showChords', v)} 
                    />
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="flex items-center gap-2">Page Numbering</Label>
                    <Select 
                      value={pageNumberingStyle} 
                      onValueChange={(v) => updateGlobal('pageNumberingStyle', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (Odd=Right, Even=Left)</SelectItem>
                        <SelectItem value="reversed">Reversed (Odd=Left, Even=Right)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {canEdit && (
            <Button size="sm" onClick={handleSaveLayout} disabled={!hasUnsavedChanges} className="print:hidden">
              Save Layout
            </Button>
          )}

          {canEdit && (
            <Link to={`/songbook/${id}/edit`} className="print:hidden">
              <Button size="sm">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-16 print:space-y-0 bg-muted/30 print:bg-transparent py-8 print:py-0">
        
        {/* Hidden Measurement Area */}
        <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
          <div 
            id="measure-toc" 
            className="w-[180mm] h-[267mm]"
            style={{ columnCount: 2, columnGap: '8mm', columnFill: 'auto' }}
          >
            <h2 className="font-bold mb-8" style={{ fontSize: `${defaultHeaderFontSize}px`, lineHeight: 1.2, columnSpan: 'all' }}>Table of Contents</h2>
            <ul className="space-y-3" style={{ fontSize: `${defaultTocFontSize}px` }}>
              {songs.map((song, i) => (
                <li key={song.id} className="flex justify-between border-b border-dashed border-border pb-2 break-inside-avoid">
                  <span className="font-medium pr-4">{song.title} <span className="text-muted-foreground font-normal text-sm ml-2">{song.author}</span></span>
                  <span className="font-bold">{pageStarts[song.id] || i + 3}</span>
                </li>
              ))}
            </ul>
          </div>

          {songs.map((song, i) => {
            const override = songOverrides[song.id] || {};
            const cols = override.columns ?? defaultColumns;
            const size = override.fontSize ?? defaultFontSize;
            const chords = override.showChords ?? defaultShowChords;
            const headerSize = override.headerFontSize ?? defaultHeaderFontSize;
            const subheaderSize = override.subheaderFontSize ?? defaultSubheaderFontSize;
            const transposeTo = override.transposeTo;
            
            let transposeSteps = 0;
            if (song.baseKey && transposeTo) {
              transposeSteps = calculateSteps(song.baseKey, transposeTo);
            }

            return (
              <div 
                key={song.id}
                id={`measure-song-${song.id}`}
                className="w-[180mm] h-[267mm]"
                style={{ columnCount: cols, columnGap: '8mm', columnFill: 'auto' }}
              >
                <div className="mb-6 break-inside-avoid" style={{ columnSpan: 'all' }}>
                  <h2 className="font-bold" style={{ fontSize: `${headerSize}px`, lineHeight: 1.2 }}>{song.title}</h2>
                  <p className="text-muted-foreground" style={{ fontSize: `${subheaderSize}px`, lineHeight: 1.2 }}>{song.author}</p>
                </div>
                <ChordProViewer 
                  text={song.lyrics} 
                  columns={1}
                  fontSize={size}
                  headerFontSize={headerSize}
                  subheaderFontSize={subheaderSize}
                  showChords={chords}
                  transposeSteps={transposeSteps}
                  targetKey={transposeTo || song.baseKey || 'C'}
                />
              </div>
            );
          })}
        </div>

        {/* Title Page */}
        <div id="page-title" className={`${pageClass} items-center justify-center`} style={pageStyle}>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center">{songbook.title}</h1>
          <p className="text-xl md:text-2xl text-muted-foreground text-center max-w-2xl">{songbook.description}</p>
        </div>

        {/* Table of Contents */}
        <PaginatedContent
          columns={2}
          pageCount={pageCounts['toc'] || 1}
          startPage={tocPage}
          getPageNumberAlignment={getPageNumberAlignment}
          content={
            <>
              <h2 className="font-bold mb-8" style={{ fontSize: `${defaultHeaderFontSize}px`, lineHeight: 1.2, columnSpan: 'all' }}>Table of Contents</h2>
              <ul className="space-y-3" style={{ fontSize: `${defaultTocFontSize}px` }}>
                {songs.map((song, i) => (
                  <li key={song.id} className="flex justify-between border-b border-dashed border-border pb-2 break-inside-avoid">
                    <span className="font-medium pr-4">{song.title} <span className="text-muted-foreground font-normal text-sm ml-2">{song.author}</span></span>
                    <span className="font-bold">{pageStarts[song.id] || i + 3}</span>
                  </li>
                ))}
              </ul>
            </>
          }
        />

        {/* Songs */}
        {songs.map((song, i) => {
            const override = songOverrides[song.id] || {};
            const cols = override.columns ?? defaultColumns;
            const size = override.fontSize ?? defaultFontSize;
            const chords = override.showChords ?? defaultShowChords;
            const headerSize = override.headerFontSize ?? defaultHeaderFontSize;
            const subheaderSize = override.subheaderFontSize ?? defaultSubheaderFontSize;
            const transposeTo = override.transposeTo;
            
            let transposeSteps = 0;
            if (song.baseKey && transposeTo) {
              transposeSteps = calculateSteps(song.baseKey, transposeTo);
            }

            const settingsPopover = (
              <div className="absolute top-4 right-4 z-10 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" /> Song Settings
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium leading-none">Song Overrides</h4>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><Columns className="w-4 h-4"/> Columns</Label>
                            <span className="text-sm text-muted-foreground">{cols}</span>
                          </div>
                          <Slider 
                            value={[cols]} 
                            min={1} max={3} step={1}
                            onValueChange={(v) => updateOverride(song.id, 'columns', Array.isArray(v) ? v[0] : v)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> Font Size</Label>
                            <span className="text-sm text-muted-foreground">{size}px</span>
                          </div>
                          <Slider 
                            value={[size]} 
                            min={10} max={24} step={1}
                            onValueChange={(v) => updateOverride(song.id, 'fontSize', Array.isArray(v) ? v[0] : v)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> Header Size</Label>
                            <span className="text-sm text-muted-foreground">{headerSize}px</span>
                          </div>
                          <Slider 
                            value={[headerSize]} 
                            min={16} max={48} step={1}
                            onValueChange={(v) => updateOverride(song.id, 'headerFontSize', Array.isArray(v) ? v[0] : v)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><Type className="w-4 h-4"/> Subheader Size</Label>
                            <span className="text-sm text-muted-foreground">{subheaderSize}px</span>
                          </div>
                          <Slider 
                            value={[subheaderSize]} 
                            min={12} max={36} step={1}
                            onValueChange={(v) => updateOverride(song.id, 'subheaderFontSize', Array.isArray(v) ? v[0] : v)} 
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Label className="flex items-center gap-2"><Hash className="w-4 h-4"/> Show Chords</Label>
                          <Switch 
                            checked={chords} 
                            onCheckedChange={(v) => updateOverride(song.id, 'showChords', v)} 
                          />
                        </div>
                        
                        {song.baseKey && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Music className="w-4 h-4"/> Transpose To</Label>
                            <Select 
                              value={transposeTo || song.baseKey} 
                              onValueChange={(v) => updateOverride(song.id, 'transposeTo', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Key" />
                              </SelectTrigger>
                              <SelectContent>
                                {KEYS.map(k => (
                                  <SelectItem key={k} value={k}>{k}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Base Key: {song.baseKey}</p>
                          </div>
                        )}
                        {!song.baseKey && (
                          <p className="text-xs text-muted-foreground italic">
                            Transposition unavailable because no base key is set for this song.
                          </p>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => {
                            const newOverrides = { ...songOverrides };
                            delete newOverrides[song.id];
                            setSongOverrides(newOverrides);
                            setHasUnsavedChanges(true);
                          }}
                        >
                          Reset to Defaults
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            );

            return (
              <PaginatedContent
                key={song.id}
                columns={cols}
                pageCount={pageCounts[song.id] || 1}
                startPage={pageStarts[song.id] || i + 3}
                getPageNumberAlignment={getPageNumberAlignment}
                settingsPopover={canEdit ? settingsPopover : null}
                content={
                  <>
                    <div className="mb-6 break-inside-avoid" style={{ columnSpan: 'all' }}>
                      <h2 className="font-bold" style={{ fontSize: `${headerSize}px`, lineHeight: 1.2 }}>{song.title}</h2>
                      <p className="text-muted-foreground" style={{ fontSize: `${subheaderSize}px`, lineHeight: 1.2 }}>{song.author}</p>
                    </div>
                    <ChordProViewer 
                      text={song.lyrics} 
                      columns={1}
                      fontSize={size}
                      headerFontSize={headerSize}
                      subheaderFontSize={subheaderSize}
                      showChords={chords}
                      transposeSteps={transposeSteps}
                      targetKey={transposeTo || song.baseKey || 'C'}
                    />
                  </>
                }
              />
            );
          })}
        {songs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground print:hidden">
            No songs in this songbook.
          </div>
        )}
      </div>
    </div>
  );
}
