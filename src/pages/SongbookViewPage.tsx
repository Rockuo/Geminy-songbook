import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../components/ui/button';
import { ArrowLeft, Edit, Printer, ExternalLink } from 'lucide-react';
import { ChordProViewer } from '../components/ChordProViewer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export function SongbookViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  
  const [songbook, setSongbook] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      const sbDoc = await getDoc(doc(db, 'songbooks', id));
      if (sbDoc.exists()) {
        const sbData = sbDoc.data();
        setSongbook({ id: sbDoc.id, ...sbData });
        
        const q = query(collection(db, 'songs'));
        const snapshot = await getDocs(q);
        const allSongs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const sbSongs = (sbData.songs || [])
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => allSongs.find(as => as.id === s.songId))
          .filter(Boolean);
          
        setSongs(sbSongs);
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

  if (loading) return <div className="p-8">Loading...</div>;
  if (!songbook) return <div className="p-8">Songbook not found</div>;

  const isOwner = user && songbook.ownerId === user.uid;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
          {isOwner && (
            <Link to={`/songbook/${id}/edit`}>
              <Button size="sm">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-16 print:space-y-0">
        {/* Title Page */}
        <div className="flex flex-col items-center justify-center py-20 print:h-screen print:py-0 border-b print:border-b-0 break-after-page">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center">{songbook.title}</h1>
          <p className="text-xl md:text-2xl text-muted-foreground text-center max-w-2xl">{songbook.description}</p>
        </div>

        {/* Table of Contents */}
        <div className="py-8 border-b print:border-b-0 break-after-page">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Table of Contents</h2>
          <ul className="space-y-3 text-lg max-w-2xl mx-auto">
            {songs.map((song, i) => (
              <li key={song.id} className="flex justify-between border-b border-dashed border-border pb-2">
                <span className="font-medium">{i + 1}. {song.title}</span>
                <span className="text-muted-foreground">{song.author}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Songs */}
        <div className="space-y-24 print:space-y-0">
          {songs.map((song, i) => (
            <div key={song.id} className="print:break-after-page print:pt-8">
              <div className="mb-6">
                <h2 className="text-3xl font-bold">{i + 1}. {song.title}</h2>
                <p className="text-xl text-muted-foreground">{song.author}</p>
              </div>
              <ChordProViewer text={song.lyrics} />
            </div>
          ))}
        </div>
        
        {songs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground print:hidden">
            No songs in this songbook.
          </div>
        )}
      </div>
    </div>
  );
}
