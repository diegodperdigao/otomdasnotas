// ========================================
// DB Layer — O Tom das Notas
// Firestore + localStorage sync
// Se Firebase não estiver configurado, usa só localStorage
// ========================================

const DB = (function() {
    'use strict';

    // ========== LOCAL STORAGE HELPERS ==========
    function localGet(key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch { return []; }
    }
    function localSet(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // ========== COLLECTION NAMES ==========
    const COLLECTIONS = {
        leads: 'otomdasnotas_leads',
        plans: 'otomdasnotas_plans',
        users: 'otomdasnotas_users',
        meetings: 'otomdasnotas_meetings',
        submissions: 'otomdasnotas_submissions',
        chat: 'otomdasnotas_chat',
        notifications: 'otomdasnotas_notifications',
        activities: 'otomdasnotas_activities'
    };

    // ========== FIRESTORE OPERATIONS ==========

    // Get all docs from a collection
    async function fireGet(collection) {
        if (!FIREBASE_ENABLED) return localGet(COLLECTIONS[collection]);
        try {
            const snap = await db.collection(collection).get();
            const data = snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
            // Cache locally
            localSet(COLLECTIONS[collection], data);
            return data;
        } catch (err) {
            console.warn('[DB] Firestore read failed, using local:', err.message);
            return localGet(COLLECTIONS[collection]);
        }
    }

    // Save (add or update) a single doc
    async function fireSave(collection, item) {
        if (!FIREBASE_ENABLED) return;
        try {
            await db.collection(collection).doc(item.id).set(item, { merge: true });
        } catch (err) {
            console.warn('[DB] Firestore write failed:', err.message);
        }
    }

    // Delete a doc
    async function fireDelete(collection, id) {
        if (!FIREBASE_ENABLED) return;
        try {
            await db.collection(collection).doc(id).delete();
        } catch (err) {
            console.warn('[DB] Firestore delete failed:', err.message);
        }
    }

    // Batch save entire array (for initial sync or bulk updates)
    async function fireSaveAll(collection, items) {
        if (!FIREBASE_ENABLED) return;
        try {
            const batch = db.batch();
            items.forEach(item => {
                const ref = db.collection(collection).doc(item.id);
                batch.set(ref, item, { merge: true });
            });
            await batch.commit();
        } catch (err) {
            console.warn('[DB] Firestore batch write failed:', err.message);
        }
    }

    // ========== PUBLIC API ==========
    // Each method syncs both localStorage and Firestore

    return {
        // Load collection (Firestore first, localStorage fallback)
        async load(collection) {
            if (FIREBASE_ENABLED) {
                return await fireGet(collection);
            }
            return localGet(COLLECTIONS[collection]);
        },

        // Save entire array (localStorage + Firestore)
        async saveAll(collection, items) {
            localSet(COLLECTIONS[collection], items);
            await fireSaveAll(collection, items);
        },

        // Add single item
        async add(collection, item) {
            const items = localGet(COLLECTIONS[collection]);
            items.push(item);
            localSet(COLLECTIONS[collection], items);
            await fireSave(collection, item);
        },

        // Update single item
        async update(collection, item) {
            const items = localGet(COLLECTIONS[collection]);
            const idx = items.findIndex(x => x.id === item.id);
            if (idx !== -1) items[idx] = item;
            localSet(COLLECTIONS[collection], items);
            await fireSave(collection, item);
        },

        // Delete single item
        async remove(collection, id) {
            let items = localGet(COLLECTIONS[collection]);
            items = items.filter(x => x.id !== id);
            localSet(COLLECTIONS[collection], items);
            await fireDelete(collection, id);
        },

        // Get from local cache (sync, for immediate reads)
        getLocal(collection) {
            return localGet(COLLECTIONS[collection]);
        },

        // Save to local only (for quick operations)
        setLocal(collection, items) {
            localSet(COLLECTIONS[collection], items);
        },

        // Listen to real-time changes (Firestore only)
        onSnapshot(collection, callback) {
            if (!FIREBASE_ENABLED) return () => {};
            return db.collection(collection).onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
                localSet(COLLECTIONS[collection], data);
                callback(data);
            }, err => {
                console.warn('[DB] Snapshot error:', err.message);
            });
        },

        // Auth helpers
        async loginWithEmail(email, password) {
            if (!FIREBASE_ENABLED) return { success: true, uid: 'local_' + email };
            try {
                const result = await auth.signInWithEmailAndPassword(email, password);
                return { success: true, uid: result.user.uid, email: result.user.email };
            } catch (err) {
                // If user doesn't exist, try creating
                if (err.code === 'auth/user-not-found') {
                    try {
                        const result = await auth.createUserWithEmailAndPassword(email, password);
                        return { success: true, uid: result.user.uid, email: result.user.email, created: true };
                    } catch (createErr) {
                        return { success: false, error: createErr.message };
                    }
                }
                return { success: false, error: err.message };
            }
        },

        async logout() {
            if (FIREBASE_ENABLED) {
                try { await auth.signOut(); } catch {}
            }
        },

        // Initial sync: push local data to Firestore (run once on first Firebase config)
        async syncToCloud() {
            if (!FIREBASE_ENABLED) return;
            console.log('[DB] Syncing local data to Firestore...');
            for (const [name, key] of Object.entries(COLLECTIONS)) {
                const local = localGet(key);
                if (local.length > 0) {
                    await fireSaveAll(name, local);
                    console.log('[DB] Synced', name, ':', local.length, 'items');
                }
            }
            console.log('[DB] Sync complete!');
        },

        FIREBASE_ENABLED,
        COLLECTIONS
    };
})();
