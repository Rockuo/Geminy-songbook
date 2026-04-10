import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Trash2, Users, Plus } from 'lucide-react';

export function GroupsPage() {
  const [user] = useAuthState(auth);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    
    const qGroups = query(collection(db, 'groups'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubGroups();
      unsubUsers();
    };
  }, [user]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName) return;
    const newRef = doc(collection(db, 'groups'));
    await setDoc(newRef, {
      name: newGroupName,
      description: newGroupDesc,
      ownerId: user.uid,
      createdAt: Date.now()
    });
    setNewGroupName('');
    setNewGroupDesc('');
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      await deleteDoc(doc(db, 'groups', groupId));
      if (selectedGroup?.id === groupId) setSelectedGroup(null);
    }
  };

  const toggleUserInGroup = async (userId: string, currentGroupIds: string[], groupId: string) => {
    const isMember = currentGroupIds.includes(groupId);
    const newGroupIds = isMember 
      ? currentGroupIds.filter(id => id !== groupId)
      : [...currentGroupIds, groupId];
      
    await setDoc(doc(db, 'users', userId), { groupIds: newGroupIds }, { merge: true });
  };

  if (!user) return <div className="p-8">Please log in to manage groups.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Groups Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Create Group</h2>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group Name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description" />
            </div>
            <Button onClick={handleCreateGroup} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">All Groups</h2>
            {groups.length === 0 && <p className="text-muted-foreground text-sm">No groups found.</p>}
            {groups.map(g => (
              <div 
                key={g.id} 
                className={`p-3 rounded border cursor-pointer transition-colors ${selectedGroup?.id === g.id ? 'bg-primary/10 border-primary' : 'bg-card hover:border-primary/50'}`}
                onClick={() => setSelectedGroup(g)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.description}</div>
                  </div>
                  {g.ownerId === user.uid && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedGroup ? (
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-semibold">{selectedGroup.name} Members</h2>
              </div>
              
              <div className="space-y-4">
                {users.map(u => {
                  const isMember = (u.groupIds || []).includes(selectedGroup.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <Button 
                        variant={isMember ? "destructive" : "outline"} 
                        size="sm"
                        onClick={() => toggleUserInGroup(u.id, u.groupIds || [], selectedGroup.id)}
                      >
                        {isMember ? 'Remove' : 'Add to Group'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-12 text-muted-foreground">
              Select a group to manage its members
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
