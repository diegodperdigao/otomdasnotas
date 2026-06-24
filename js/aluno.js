// ========================================
// Área do Mentorado — O Tom das Notas
// Tabs: Plano (resources, notes, certificate), Agenda, Chat, Notifications
// ========================================
(function () {
    'use strict';

    const LEADS_KEY = 'otomdasnotas_leads';
    const PLANS_KEY = 'otomdasnotas_plans';
    const SESSION_KEY = 'otomdasnotas_session';
    const MEETINGS_KEY = 'otomdasnotas_meetings';
    const CHAT_KEY = 'otomdasnotas_chat';
    const NOTIF_KEY = 'otomdasnotas_notifications';
    const USERS_KEY = 'otomdasnotas_users';

    function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } }
    function save(k, d) { localStorage.setItem(k, JSON.stringify(d)); }
    function savePlans() { save(PLANS_KEY, plans); if (typeof DB !== 'undefined') DB.saveAll('plans', plans); }
    function saveChat() { save(CHAT_KEY, chatMessages); if (typeof DB !== 'undefined') DB.saveAll('chat', chatMessages); }
    function saveNotifs() { save(NOTIF_KEY, notifications); if (typeof DB !== 'undefined') DB.saveAll('notifications', notifications); }
    function esc(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function timeAgo(d) { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s/60)+'min'; if (s < 86400) return Math.floor(s/3600)+'h'; return new Date(d).toLocaleDateString('pt-BR'); }
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    let leads = load(LEADS_KEY) || [];
    let plans = load(PLANS_KEY) || [];
    let meetings = load(MEETINGS_KEY) || [];
    let chatMessages = load(CHAT_KEY) || [];
    let notifications = load(NOTIF_KEY) || [];
    let users = load(USERS_KEY) || [];

    const loginScreen = document.getElementById('alunoLogin');
    const portal = document.getElementById('alunoPortal');
    const loginForm = document.getElementById('alunoLoginForm');
    const loginError = document.getElementById('alunoLoginError');

    let currentClientId = null;
    let cloudLoaded = false;

    // Try to load users and leads from Firebase before anything else
    async function ensureCloudData() {
        if (cloudLoaded) return;
        if (typeof DB === 'undefined' || !DB.FIREBASE_ENABLED) return;
        try {
            var r = await Promise.all([DB.load('users'), DB.load('leads')]);
            if (r[0] && r[0].length > 0) users = r[0];
            if (r[1] && r[1].length > 0) leads = r[1];
            cloudLoaded = true;
        } catch(e) { console.warn('[Aluno] Cloud data load failed:', e.message); }
    }

    // Check existing session
    const session = load(SESSION_KEY);
    if (session && session.role === 'aluno') {
        if (session.clientId) {
            currentClientId = session.clientId;
            enterPortal();
        } else if (session.email) {
            var lead = leads.find(l => (l.email || '').toLowerCase() === session.email.toLowerCase());
            if (lead) {
                currentClientId = lead.id;
                save(SESSION_KEY, { role: 'aluno', email: session.email, clientId: lead.id, time: Date.now() });
                enterPortal();
            }
        }
    }

    // Login
    function doLogin(email, pass) {
        var user = users.find(function(u) { return u.email.toLowerCase() === email && u.role === 'aluno'; });
        if (!user) {
            loginError.textContent = 'E-mail não encontrado. Verifique com seu consultor.';
            return;
        }
        if (user.password !== pass) {
            loginError.textContent = 'Senha incorreta.';
            return;
        }
        var lead = user.leadId ? leads.find(function(l) { return l.id === user.leadId; }) : leads.find(function(l) { return (l.email||'').toLowerCase() === email; });
        if (!lead) { loginError.textContent = 'Nenhum perfil vinculado. Contate seu consultor.'; return; }
        currentClientId = lead.id;
        save(SESSION_KEY, { role: 'aluno', email: email, clientId: currentClientId, time: Date.now() });
        loginError.textContent = '';
        enterPortal();
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('alunoEmail').value.trim().toLowerCase();
        var pass = document.getElementById('alunoPassword').value;
        if (!email || !pass) { loginError.textContent = 'Preencha todos os campos.'; return; }

        // Try login with local data first
        if (users.length > 0) {
            doLogin(email, pass);
            return;
        }

        // No local data — try loading from Firebase
        loginError.textContent = 'Carregando...';
        ensureCloudData().then(function() {
            loginError.textContent = '';
            doLogin(email, pass);
        }).catch(function() {
            loginError.textContent = 'Erro ao carregar dados. Tente novamente.';
        });
    });

    document.getElementById('btnAlunoLogout').addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    });

    function enterPortal() {
        loginScreen.style.display = 'none';
        portal.style.display = 'flex';
        renderAll();
    }

    // ========== TABS ==========
    document.querySelectorAll('.aluno-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.aluno-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.aluno-tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');
        });
    });

    // ========== RENDER ALL ==========
    function renderAll() {
        renderPlan();
        renderAgenda();
        renderChat();
        renderNotifications();
        renderFeed();
    }

    // ========== PLAN ==========
    function renderPlan() {
        const client = leads.find(l => l.id === currentClientId);
        if (!client) return;

        document.getElementById('alunoAvatar').textContent = client.name.charAt(0);
        document.getElementById('alunoName').textContent = client.name;
        document.getElementById('alunoGreeting').textContent = 'Olá, ' + client.name.split(' ')[0] + '!';

        const plan = plans.find(p => p.clientId === currentClientId);
        const noPlan = document.getElementById('alunoNoPlan');
        const welcome = document.getElementById('alunoWelcome');
        const stats = document.querySelector('.aluno-stats');
        const planSection = document.querySelector('.aluno-plan-section');
        const certBanner = document.getElementById('certificateBanner');

        if (!plan) {
            noPlan.style.display = 'block'; welcome.style.display = 'none';
            stats.style.display = 'none'; planSection.style.display = 'none';
            certBanner.style.display = 'none';
            return;
        }

        noPlan.style.display = 'none'; welcome.style.display = 'flex';
        stats.style.display = 'grid'; planSection.style.display = 'block';

        document.getElementById('alunoPlanTitle').textContent = plan.title;
        document.getElementById('alunoPlanObjective').textContent = plan.objective || '';

        const total = plan.steps.length;
        const done = plan.steps.filter(s => s.done).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statDone').textContent = done;
        document.getElementById('statPending').textContent = total - done;

        // Progress ring
        const circ = 2 * Math.PI * 52;
        document.getElementById('ringFill').style.strokeDashoffset = circ - (pct / 100) * circ;
        document.getElementById('ringValue').textContent = pct + '%';

        // Certificate banner
        certBanner.style.display = pct === 100 ? 'flex' : 'none';

        // Steps
        const container = document.getElementById('alunoSteps');
        container.innerHTML = plan.steps.map((step, idx) => {
            const resIcons = { video:'fa-play-circle', article:'fa-newspaper', podcast:'fa-podcast' };
            const resLabels = { video:'Vídeo', article:'Matéria', podcast:'Podcast' };
            const resourcesHtml = (step.resources && step.resources.length > 0) ?
                '<div class="step-resources">' + step.resources.map((r, ri) =>
                    '<span class="step-resource-link" data-step="'+idx+'" data-res="'+ri+'"><i class="fas '+resIcons[r.type]+'"></i> '+(r.title||resLabels[r.type])+'</span>'
                ).join('') + '</div>' : '';

            const notesHtml = '<div class="step-notes"><div class="step-notes-label">Suas anotações</div>' +
                '<textarea data-step="'+idx+'" placeholder="Escreva suas notas...">'+(esc(step.notes||''))+'</textarea></div>';

            return '<div class="aluno-step '+(step.done?'done':'')+'" data-idx="'+idx+'">' +
                '<div class="step-check" title="'+(step.done?'Desmarcar':'Concluir')+'"><i class="fas fa-check"></i></div>' +
                '<div class="step-content">' +
                '<div class="step-number">Etapa '+(idx+1)+' de '+total+'</div>' +
                '<div class="step-title">'+esc(step.text)+'</div>' +
                '<div class="step-meta"><span><i class="fas fa-clock"></i> '+step.days+' dias</span>' +
                (step.done?'<span><i class="fas fa-check-circle"></i> Concluído</span>':'<span><i class="fas fa-hourglass-half"></i> Pendente</span>') +
                '</div>' + resourcesHtml + notesHtml +
                '</div></div>';
        }).join('');

        // Bind check clicks
        container.querySelectorAll('.step-check').forEach(el => {
            el.addEventListener('click', function() {
                const idx = parseInt(this.closest('.aluno-step').dataset.idx);
                plan.steps[idx].done = !plan.steps[idx].done;
                plan.updatedAt = new Date().toISOString();
                savePlans();
                renderPlan();
            });
        });

        // Bind resource clicks
        container.querySelectorAll('.step-resource-link').forEach(el => {
            el.addEventListener('click', function() {
                const step = plan.steps[parseInt(this.dataset.step)];
                const res = step.resources[parseInt(this.dataset.res)];
                openResourceViewer(res);
            });
        });

        // Bind notes
        container.querySelectorAll('.step-notes textarea').forEach(el => {
            el.addEventListener('blur', function() {
                const idx = parseInt(this.dataset.step);
                plan.steps[idx].notes = this.value;
                plan.updatedAt = new Date().toISOString();
                savePlans();
            });
        });
    }

    // ========== RESOURCE VIEWER ==========
    const resOverlay = document.getElementById('resourceOverlay');
    document.getElementById('resourceClose').addEventListener('click', () => resOverlay.classList.remove('active'));
    resOverlay.addEventListener('click', e => { if (e.target === resOverlay) resOverlay.classList.remove('active'); });

    function openResourceViewer(res) {
        const icons = { video:'fa-play-circle', article:'fa-newspaper', podcast:'fa-podcast' };
        const labels = { video:'Vídeo', article:'Matéria', podcast:'Podcast' };
        document.getElementById('resourceTitle').innerHTML = '<i class="fas '+icons[res.type]+'"></i> '+(res.title||labels[res.type]);
        const content = document.getElementById('resourceContent');

        // Check if YouTube
        const ytMatch = res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (res.type === 'video' && ytMatch) {
            content.innerHTML = '<iframe src="https://www.youtube.com/embed/'+ytMatch[1]+'" allowfullscreen></iframe>';
        } else {
            content.innerHTML = '<p style="margin-bottom:12px">'+esc(res.title||'')+'</p>' +
                '<a href="'+esc(res.url)+'" target="_blank"><i class="fas fa-external-link-alt"></i> Abrir conteúdo</a>';
        }
        resOverlay.classList.add('active');
    }

    // ========== CERTIFICATE ==========
    const certOverlay = document.getElementById('certOverlay');
    document.getElementById('certClose').addEventListener('click', () => certOverlay.classList.remove('active'));
    certOverlay.addEventListener('click', e => { if (e.target === certOverlay) certOverlay.classList.remove('active'); });

    document.getElementById('btnViewCertificate').addEventListener('click', function() {
        const client = leads.find(l => l.id === currentClientId);
        const plan = plans.find(p => p.clientId === currentClientId);
        if (!client || !plan) return;
        document.getElementById('certName').textContent = client.name;
        document.getElementById('certPlan').textContent = plan.title;
        document.getElementById('certDate').textContent = new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
        certOverlay.classList.add('active');
    });

    // ========== AGENDA ==========
    function renderAgenda() {
        const container = document.getElementById('alunoMeetings');
        const myMeetings = meetings.filter(m => m.clientId === currentClientId).sort((a,b) => a.date.localeCompare(b.date));
        if (myMeetings.length === 0) { container.innerHTML = '<p class="empty-state">Nenhum encontro agendado pelo seu consultor.</p>'; return; }

        container.innerHTML = myMeetings.map(m => {
            const d = new Date(m.date + 'T00:00');
            return '<div class="meeting-card"><div class="meeting-date-box"><div class="meeting-date-day">'+d.getDate()+'</div><div class="meeting-date-month">'+MONTHS[d.getMonth()]+'</div></div>' +
                '<div class="meeting-info"><div class="meeting-title">'+esc(m.title)+'</div>' +
                '<div class="meeting-detail"><i class="fas fa-clock"></i> '+m.time+'</div>' +
                '<span class="meeting-type-badge '+m.type+'"><i class="fas fa-'+(m.type==='online'?'video':'map-marker-alt')+'"></i> '+m.type+'</span>' +
                (m.link?'<a href="'+esc(m.link)+'" target="_blank" class="meeting-link"><i class="fas fa-video"></i> Acessar reunião</a>':'') +
                (m.details?'<div class="meeting-detail" style="margin-top:6px"><i class="fas fa-info-circle"></i> '+esc(m.details)+'</div>':'') +
                '</div></div>';
        }).join('');
    }

    // ========== CHAT ==========
    const chatForm = document.getElementById('alunoChatForm');
    function renderChat() {
        const container = document.getElementById('alunoChatMessages');
        const msgs = chatMessages.filter(m => m.clientId === currentClientId);
        if (msgs.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhuma mensagem ainda. Envie a primeira!</p>';
        } else {
            container.innerHTML = msgs.map(m =>
                '<div class="chat-msg '+(m.senderRole==='aluno'?'sent':'received')+'">'+esc(m.text)+'<span class="chat-msg-time">'+timeAgo(m.time)+'</span></div>'
            ).join('');
            container.scrollTop = container.scrollHeight;
        }
    }

    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('alunoChatText');
        const text = input.value.trim();
        if (!text) return;
        chatMessages.push({ id: Date.now().toString(), clientId: currentClientId, senderRole: 'aluno', text, time: new Date().toISOString() });
        saveChat();
        input.value = '';
        renderChat();
    });

    // ========== NOTIFICATIONS ==========
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBadge = document.getElementById('notifBadge');

    notifBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => { notifDropdown.style.display = 'none'; });
    notifDropdown.addEventListener('click', e => e.stopPropagation());

    document.getElementById('notifClearAll').addEventListener('click', function() {
        notifications = notifications.filter(n => n.clientId !== currentClientId);
        saveNotifs();
        renderNotifications();
    });

    function renderNotifications() {
        const myNotifs = notifications.filter(n => n.clientId === currentClientId && !n.read);
        const badge = document.getElementById('notifBadge');
        badge.style.display = myNotifs.length > 0 ? 'flex' : 'none';
        badge.textContent = myNotifs.length;

        const list = document.getElementById('notifList');
        if (myNotifs.length === 0) { list.innerHTML = '<p class="empty-state" style="padding:16px;font-size:.78rem">Sem notificações.</p>'; return; }

        const iconMap = { meeting:'notif-meeting fas fa-calendar-alt', content:'notif-content fas fa-file-alt', chat:'notif-chat fas fa-comment' };
        list.innerHTML = myNotifs.map(n => {
            const cls = iconMap[n.type] || 'fas fa-bell';
            return '<div class="notif-item"><div class="notif-item-icon '+(n.type?'notif-'+n.type:'')+'"><i class="'+cls.split(' ').slice(1).join(' ')+'"></i></div>' +
                '<div><div class="notif-item-text">'+esc(n.message)+'</div><div class="notif-item-time">'+timeAgo(n.time)+'</div></div></div>';
        }).join('');
    }

    // ========== COMMUNITY FEED ==========
    const FEED_KEY = 'otomdasnotas_feed';
    let feedPosts = load(FEED_KEY) || [];
    function saveFeed() { save(FEED_KEY, feedPosts); try { if (typeof DB !== 'undefined' && DB.FIREBASE_ENABLED) DB.saveAll('feed', feedPosts); } catch(e) {} }

    const CAT_LABELS = { oportunidade:'Oportunidade', ideia:'Ideia', dica:'Dica', discussao:'Discussão', evento:'Evento' };
    const CAT_ICONS = { oportunidade:'fa-briefcase', ideia:'fa-lightbulb', dica:'fa-star', discussao:'fa-comments', evento:'fa-calendar' };

    function getClientName() {
        var client = leads.find(l => l.id === currentClientId);
        return client ? client.name : 'Mentorado';
    }

    window._alunoVote = function(id, dir) {
        var p = feedPosts.find(x => x.id === id);
        if (!p) return;
        var voter = currentClientId || 'anon';
        if (!p.upvotes) p.upvotes = [];
        if (!p.downvotes) p.downvotes = [];
        p.upvotes = p.upvotes.filter(v => v !== voter);
        p.downvotes = p.downvotes.filter(v => v !== voter);
        if (dir === 'up') p.upvotes.push(voter);
        else p.downvotes.push(voter);
        saveFeed(); renderFeed();
    };
    window._alunoAddComment = function(id, text) {
        var p = feedPosts.find(x => x.id === id);
        if (!p || !text) return;
        if (!p.comments) p.comments = [];
        p.comments.push({ id: Date.now().toString(), author: getClientName(), text: text, time: new Date().toISOString() });
        saveFeed(); renderFeed();
    };
    window._alunoToggleComments = function(id) {
        var el = document.getElementById('fc-' + id);
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };
    window._alunoNewPost = function() {
        var title = prompt('Título da publicação:');
        if (!title) return;
        var content = prompt('Conteúdo:');
        if (!content) return;
        var category = prompt('Categoria (oportunidade, ideia, dica, discussao, evento):', 'ideia') || 'ideia';
        feedPosts.unshift({
            id: Date.now().toString(), author: getClientName(), authorRole: 'aluno', authorId: currentClientId,
            category: category, title: title, content: content, link: '',
            upvotes: [], comments: [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
        saveFeed(); renderFeed();
    };

    function renderFeed() {
        var container = document.getElementById('alunoFeedContainer');
        if (!container) return;
        var voter = currentClientId || 'anon';
        var clientName = getClientName();

        var newPostBtn = '<button class="btn btn-primary" onclick="window._alunoNewPost()" style="margin-bottom:16px"><i class="fas fa-plus"></i> Nova Publicação</button>';

        if (feedPosts.length === 0) {
            container.innerHTML = newPostBtn + '<p class="empty-state">Nenhuma publicação ainda. Seja o primeiro a publicar!</p>';
            return;
        }

        container.innerHTML = newPostBtn + feedPosts.map(function(p) {
            var initial = (p.author || '?').charAt(0);
            var catClass = 'cat-' + p.category;
            var catLabel = CAT_LABELS[p.category] || p.category;
            var catIcon = CAT_ICONS[p.category] || 'fa-tag';
            var upCount = (p.upvotes || []).length;
            var downCount = (p.downvotes || []).length;
            var score = upCount - downCount;
            var commentCount = (p.comments || []).length;
            var isUpvoted = (p.upvotes || []).indexOf(voter) !== -1;
            var isDownvoted = (p.downvotes || []).indexOf(voter) !== -1;

            return '<div class="feed-post">' +
                '<div class="feed-post-header">' +
                    '<div class="feed-post-avatar">' + initial + '</div>' +
                    '<div class="feed-post-meta"><span class="feed-post-author">' + esc(p.author) + '</span><span class="feed-post-time"> · ' + timeAgo(p.createdAt) + '</span></div>' +
                    '<span class="feed-post-category ' + catClass + '"><i class="fas ' + catIcon + '"></i> ' + catLabel + '</span>' +
                '</div>' +
                '<div class="feed-post-title">' + esc(p.title) + '</div>' +
                '<div class="feed-post-body">' + esc(p.content) + '</div>' +
                (p.link ? '<a href="' + esc(p.link) + '" target="_blank" class="feed-post-link"><i class="fas fa-external-link-alt"></i> Abrir link</a>' : '') +
                '<div class="feed-reactions">' +
                    '<button class="feed-react-btn ' + (isUpvoted ? 'active' : '') + '" onclick="window._alunoVote(\'' + p.id + '\',\'up\')"><i class="fas fa-arrow-up"></i></button>' +
                    '<span class="feed-score">' + score + '</span>' +
                    '<button class="feed-react-btn ' + (isDownvoted ? 'active down' : '') + '" onclick="window._alunoVote(\'' + p.id + '\',\'down\')"><i class="fas fa-arrow-down"></i></button>' +
                    '<button class="feed-comment-btn" onclick="window._alunoToggleComments(\'' + p.id + '\')"><i class="fas fa-comment-dots"></i> ' + commentCount + ' comentário' + (commentCount !== 1 ? 's' : '') + '</button>' +
                '</div>' +
                '<div class="feed-comments" id="fc-' + p.id + '" style="display:none">' +
                    (commentCount > 0 ? '<div class="feed-comments-list">' + p.comments.map(function(c) {
                        return '<div class="feed-comment"><div class="feed-comment-avatar">' + (c.author || '?').charAt(0) + '</div><div class="feed-comment-body"><span class="feed-comment-author">' + esc(c.author) + '</span><div class="feed-comment-text">' + esc(c.text) + '</div><span class="feed-comment-time">' + timeAgo(c.time) + '</span></div></div>';
                    }).join('') + '</div>' : '') +
                    '<form class="feed-comment-form" onsubmit="event.preventDefault();var inp=this.querySelector(\'input\');window._alunoAddComment(\'' + p.id + '\',inp.value);inp.value=\'\';"><input type="text" placeholder="Escreva um comentário..." required><button type="submit"><i class="fas fa-paper-plane"></i></button></form>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    // ========== CLOUD SYNC (loads when Firebase becomes available) ==========
    function loadCloudData() {
        try {
            if (typeof DB === 'undefined' || !DB.FIREBASE_ENABLED) return;
            (function() {
                Promise.all([DB.load('plans'), DB.load('meetings'), DB.load('chat'), DB.load('notifications'), DB.load('feed'), DB.load('users'), DB.load('leads')])
                .then(function(r) {
                    if (r[0] && r[0].length > 0) plans = r[0];
                    if (r[1] && r[1].length > 0) meetings = r[1];
                    if (r[2] && r[2].length > 0) chatMessages = r[2];
                    if (r[3] && r[3].length > 0) notifications = r[3];
                    if (r[4] && r[4].length > 0) feedPosts = r[4];
                    if (r[5] && r[5].length > 0) users = r[5];
                    if (r[6] && r[6].length > 0) leads = r[6];
                    cloudLoaded = true;
                    if (currentClientId) renderAll();
                }).catch(function(e) { console.warn('[Aluno] Cloud load failed:', e.message); });
            })();
            try {
                DB.onSnapshot('chat', function(data) { chatMessages = data; if (currentClientId) renderChat(); });
                DB.onSnapshot('notifications', function(data) { notifications = data; if (currentClientId) renderNotifications(); });
            } catch(e2) {}
        } catch(e) { console.warn('[Aluno] Cloud init skipped:', e.message); }
    }

    // Try cloud sync now (if Firebase already loaded) and also when it becomes ready later
    loadCloudData();
    window._onFirebaseReady = function() { loadCloudData(); };
})();
