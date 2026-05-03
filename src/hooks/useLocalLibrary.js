import { useCallback, useEffect, useState } from 'react';

const KEY = 'atomicgen.library.v1';

function read() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function write(items) {
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
        /* quota */
    }
}

function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Multi-slot localStorage-backed library so users can keep more than one
// in-progress test. Independent of the single auto-save draft slot.
export default function useLocalLibrary() {
    const [items, setItems] = useState(read);

    // Stay in sync if another tab modifies the library.
    useEffect(() => {
        const handler = (e) => {
            if (e.key === KEY) setItems(read());
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const save = useCallback((name, inputs) => {
        setItems((prev) => {
            const now = new Date().toISOString();
            const cleanedName = (name && name.trim()) || `Untitled — ${now.slice(0, 16).replace('T', ' ')}`;
            const next = [
                { id: uuid(), name: cleanedName, inputs, savedAt: now },
                ...prev,
            ];
            write(next);
            return next;
        });
    }, []);

    const remove = useCallback((id) => {
        setItems((prev) => {
            const next = prev.filter((x) => x.id !== id);
            write(next);
            return next;
        });
    }, []);

    const rename = useCallback((id, newName) => {
        setItems((prev) => {
            const next = prev.map((x) =>
                x.id === id ? { ...x, name: (newName && newName.trim()) || x.name } : x
            );
            write(next);
            return next;
        });
    }, []);

    return { items, save, remove, rename };
}
