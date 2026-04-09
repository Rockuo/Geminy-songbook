import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';

export function Auth() {
  const [user, loading] = useAuthState(auth);

  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  if (loading) return <div className="text-sm">Loading...</div>;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
        <Button variant="outline" size="sm" onClick={() => signOut(auth)}>Sign Out</Button>
      </div>
    );
  }

  return <Button size="sm" onClick={login}>Sign In</Button>;
}
