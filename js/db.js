// ========================================
// DB Layer — O Tom das Notas
// Firestore + localStorage sync (safe fallback)
// ========================================

var DB = (function() {
    'use strict';

    function localGet(key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch(e) { return []; }
    }
    function localSet(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    }

    var COLLECTIONS = {
        leads: 'otomdasnotas_leads',
        plans: 'otomdasnotas_plans',
        users: 'otomdasnotas_users',
        meetings: 'otomdasnotas_meetings',
        submissions: 'otomdasnotas_submissions',
        chat: 'otomdasnotas_chat',
        notifications: 'otomdasnotas_notifications',
        activities: 'otomdasnotas_activities'
    };

    function getDb() {
        return (typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED && db) ? db : null;
    }

    return {
        async load(collection) {
            var firedb = getDb();
            if (!firedb) return localGet(COLLECTIONS[collection]);
            try {
                var snap = await firedb.collection(collection).get();
                var data = snap.docs.map(function(doc) { var d = doc.data(); d._docId = doc.id; return d; });
                localSet(COLLECTIONS[collection], data);
                return data;
            } catch(err) {
                console.warn('[DB] Read failed:', err.message);
                return localGet(COLLECTIONS[collection]);
            }
        },

        async saveAll(collection, items) {
            localSet(COLLECTIONS[collection], items);
            var firedb = getDb();
            if (!firedb) return;
            try {
                var batch = firedb.batch();
                items.forEach(function(item) {
                    if (!item.id) return;
                    batch.set(firedb.collection(collection).doc(item.id), JSON.parse(JSON.stringify(item)), { merge: true });
                });
                await batch.commit();
            } catch(err) {
                console.warn('[DB] Batch write failed:', err.message);
            }
        },

        async add(collection, item) {
            var items = localGet(COLLECTIONS[collection]);
            items.push(item);
            localSet(COLLECTIONS[collection], items);
            var firedb = getDb();
            if (!firedb || !item.id) return;
            try {
                await firedb.collection(collection).doc(item.id).set(JSON.parse(JSON.stringify(item)));
            } catch(err) {
                console.warn('[DB] Add failed:', err.message);
            }
        },

        async remove(collection, id) {
            var items = localGet(COLLECTIONS[collection]).filter(function(x) { return x.id !== id; });
            localSet(COLLECTIONS[collection], items);
            var firedb = getDb();
            if (!firedb) return;
            try {
                await firedb.collection(collection).doc(id).delete();
            } catch(err) {
                console.warn('[DB] Delete failed:', err.message);
            }
        },

        onSnapshot(collection, callback) {
            var firedb = getDb();
            if (!firedb) return function() {};
            try {
                return firedb.collection(collection).onSnapshot(function(snap) {
                    var data = snap.docs.map(function(doc) { var d = doc.data(); d._docId = doc.id; return d; });
                    localSet(COLLECTIONS[collection], data);
                    callback(data);
                }, function(err) {
                    console.warn('[DB] Snapshot error:', err.message);
                });
            } catch(err) {
                console.warn('[DB] Snapshot setup failed:', err.message);
                return function() {};
            }
        },

        async syncToCloud() {
            var firedb = getDb();
            if (!firedb) return;
            console.log('[DB] Syncing local data to Firestore...');
            var keys = Object.keys(COLLECTIONS);
            for (var i = 0; i < keys.length; i++) {
                var name = keys[i];
                var local = localGet(COLLECTIONS[name]);
                if (local.length > 0) {
                    try {
                        var batch = firedb.batch();
                        local.forEach(function(item) {
                            if (!item.id) return;
                            batch.set(firedb.collection(name).doc(item.id), JSON.parse(JSON.stringify(item)), { merge: true });
                        });
                        await batch.commit();
                        console.log('[DB] Synced', name, ':', local.length);
                    } catch(err) {
                        console.warn('[DB] Sync failed for', name, ':', err.message);
                    }
                }
            }
        },

        get FIREBASE_ENABLED() {
            return typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED;
        },

        COLLECTIONS: COLLECTIONS
    };
})();
