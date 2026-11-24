// Versión Local-Portable: gestión de usuarios en localStorage
const LOCAL_KEY = 'sgcn_users';

const defaultUsers = [
    { id: 1, username: 'admin', email: 'admin@sgcn.local', first_name: 'Administrador', last_name: 'Local', role: 'admin', is_active: true },
    { id: 2, username: 'analista', email: 'analista@sgcn.local', first_name: 'Analista', last_name: 'Local', role: 'analista', is_active: true },
];

const getAll = () => {
    try {
        const stored = sessionStorage.getItem(LOCAL_KEY);
        return stored ? JSON.parse(stored) : defaultUsers;
    } catch {
        return defaultUsers;
    }
};

const save = (users) => {
    sessionStorage.setItem(LOCAL_KEY, JSON.stringify(users));
};

export const getUsers = async () => {
    return getAll();
};

export const createUser = async (userData) => {
    const users = getAll();
    const newUser = { ...userData, id: Date.now() };
    users.push(newUser);
    save(users);
    return newUser;
};

export const updateUser = async (id, userData) => {
    const users = getAll();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...userData };
        save(users);
        return users[idx];
    }
    throw new Error('Usuario no encontrado');
};

export const deleteUser = async (id) => {
    const users = getAll().filter(u => u.id !== id);
    save(users);
    return { success: true };
};

export const changePassword = async (id, password) => {
    // En modo local no se valida la contraseña real
    console.log(`[Local] Contraseña actualizada para usuario ${id}`);
    return { success: true };
};
