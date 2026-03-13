import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { AppRole } from '../types/database';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: AppRole | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const resolveSession = async (s: Session | null) => {
            if (cancelled) return;

            setSession(s);
            setUser(s?.user ?? null);

            if (s?.user) {
                try {
                    const { data } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('id', s.user.id)
                        .single();
                    if (!cancelled) setRole((data?.role as AppRole) ?? null);
                } catch {
                    if (!cancelled) setRole(null);
                }
            } else {
                if (!cancelled) setRole(null);
            }

            if (!cancelled) setLoading(false);
        };

        // onAuthStateChange fires immediately with the current session
        // (INITIAL_SESSION on first mount, SIGNED_IN on StrictMode re-mount)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (!initialized.current) {
                initialized.current = true;
                resolveSession(s);
            } else if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED') {
                resolveSession(s);
            }
        });

        // Safety: if nothing fires in 2 seconds, force-resolve with no session
        const timer = setTimeout(() => {
            if (!initialized.current && !cancelled) {
                initialized.current = true;
                setLoading(false);
            }
        }, 2000);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
    }, []);

    const signOut = useCallback(async () => {
        setRole(null);
        setUser(null);
        setSession(null);
        await supabase.auth.signOut();
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};


