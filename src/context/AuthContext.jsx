import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user_name');
        const savedRole = localStorage.getItem('role');

        if (savedUser) {
            setUser({ name: savedUser, role: savedRole });
        }
        setLoading(false);
    }, []);

    const login = async (username) => {
        if (!username || username.trim() === '') {
            return { success: false, message: 'Por favor, ingrese un nombre.' };
        }

        const role = (username.toLowerCase() === 'admin' || username.toLowerCase() === 'administrador') ? 'admin' : 'analista';
        const fullName = username.trim();

        saveAuthData(fullName, role);
        return { success: true };
    };

    const saveAuthData = (name, role) => {
        localStorage.setItem('user_name', name);
        localStorage.setItem('role', role);
        setUser({ name, role });
    };

    const logout = async () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
