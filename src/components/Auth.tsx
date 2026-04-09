import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect } from 'react';
import allowedUsers from '../allowedUsers.json';

export function Auth() {
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (user && user.email && !allowedUsers.includes(user.email)) {
      signOut(auth);
      alert("Sorry, your email is not authorized to use this application.");
    }
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email && !allowedUsers.includes(result.user.email)) {
        await signOut(auth);
        alert("Sorry, your email is not authorized to use this application.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="text-sm">Loading...</div>;

  if (user && user.email && allowedUsers.includes(user.email)) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
        <Button variant="outline" size="sm" onClick={() => signOut(auth)}>Sign Out</Button>
      </div>
    );
  }

  return <Button size="sm" onClick={login}>Sign In</Button>;
}
