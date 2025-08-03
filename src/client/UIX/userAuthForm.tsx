import { useEffect, useState } from "preact/hooks";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ggadibwftkzimypfrstb.supabase.co';
// This key is safe to use in a browser if you have enabled Row Level Security (RLS) for your tables and configured policies.
const SUPABASE_ANON_KEY = 'sb_publishable_sDxu_1fzPsMtB7I2QFfb6w_7uydIEpb';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function UserAuthForm( { loadGameScene } ) {
    const [menuState, setMenuState] = useState("login");
    const [authComplete, setAuthComplete] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data, error } = await supabase.auth.getSession();
                        if (error) {
                console.error("Error fetching session:", error);
                return;
            }
            if (data?.session) {
                console.log("Session found:", data.session);
                setAuthComplete(true);
            }
        };
        checkSession();
    }, []);

    if (authComplete) {
        loadGameScene();
        console.log("Authentication complete, loading game scene...", supabase);
        return <div>Authentication Complete! Loading Game...</div>;
    }

    return (
        <div className="auth-container">
            {menuState == "login" ? (
                <LoginForm onSuccess={() => setAuthComplete(true)} />
            ) : (
                <RegisterForm onSuccess={() => setMenuState("login")} />
            )}
            <button className="switchform-button">
                {menuState == "login" ? "Need an account?" : "Already have an account?"}
                <span onClick={() => setMenuState(menuState == "login" ? "register" : "login")}>{menuState == "login" ? "Register" : "Login"}</span>
            </button>
            <div className="oath-providers">
                <button className="oauth-button" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
                    Login with Google
                </button>
                <button className="oauth-button" onClick={() => supabase.auth.signInWithOAuth({ provider: 'facebook' })}>
                    Login with Facebook
                </button>
                <button className="oauth-button" onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord' })}>
                    Login with Discord
                </button>
            </div>
        </div>
    );
}

export function LoginForm( { onSuccess } ) {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            })
            if (error) throw error;
            onSuccess?.(data);
            console.log("Login successful:", data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <form className="login-form" onSubmit={handleSubmit}>
            <label> Contact <input 
            type="text"
            placeholder="Email / Phone" 
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })} />
            </label>
            <label> Password <input 
            type="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={(e) => setFormData({ ...formData, password: (e.target as HTMLInputElement).value })} />
            </label>
            {loading && <div className="loading">Loading...</div>}
            {error && <div className="error">{error}</div>}
            <button type="submit">Login</button>
        </form>
    );
}

export function RegisterForm( { onSuccess } ) {
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        password: "",
        dob: "",
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate form data
            if (!formData.email || !formData.username || !formData.password || !formData.dob) {
                throw new Error("All fields are required.");
            }
            if (formData.password.length < 8) {
                throw new Error("Password must be at least 8 characters long.");
            }
            if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
                throw new Error("Username can only contain letters, numbers, and underscores.");
            }
            if (new Date(formData.dob) > new Date()) {
                throw new Error("Date of Birth cannot be in the future.");
            }
            if (new Date(formData.dob) < new Date("1900-01-01")) {
                throw new Error("Date of Birth must be after January 1, 1900.");
            }
            if(new Date(formData.dob) > new Date(Date.now() - 12 * 365 * 24 * 60 * 60 * 1000)) {
                throw new Error("You must be at least 12 years old to register.");
            }
            if (formData.username.length < 3 || formData.username.length > 20) {
                throw new Error("Username must be between 3 and 20 characters long.");
            }

            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    // This maps to the auth.users.raw_user_meta_data column.
                    data: {
                        username: formData.username,
                        dob: formData.dob,
                    }
                }
                //options: {
                //    emailRedirectTo: `${window.location.origin}/` // subject to change
                //}
            });
            if (error) throw error;
            onSuccess?.();
            console.log("Registration successful:", data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="register-form" onSubmit={handleSubmit}>
            <label>Email <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })} /></label>
            <label>Username <input type="text" placeholder="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: (e.target as HTMLInputElement).value })} /></label>
            <label>Password <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: (e.target as HTMLInputElement).value })} /></label>
            <label>Date of Birth <input type="date" placeholder="Date of Birth" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: (e.target as HTMLInputElement).value })} /></label>
            {loading && <div className="loading">Loading...</div>}
            {error && <div className="error">{error}</div>}
            <button type="submit">Register</button>
        </form>
    );
}