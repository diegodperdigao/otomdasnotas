// ========================================
// Área do Aluno — O Tom das Notas
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

    function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
    function save(k, d) { localStorage.setItem(k, JSON.stringify(d)); }
    function esc(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function timeAgo(d) { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s/60)+'min'; if (s < 86400) return Math.floor(s/3600)+'h'; return new Date(d).toLocaleDateString('pt-BR'); }
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const leads = load(LEADS_KEY) || [];
    let plans = load(PLANS_KEY) || [];
    let meetings = load(MEETINGS_KEY) || [];
    let chatMessages = load(CHAT_KEY) || [];
    let notifications = load(NOTIF_KEY) || [];
    const users = load(USERS_KEY) || [];

    const loginScreen = document.getElementById('alunoLogin');
    const portal = document.getElementById('alunoPortal');
    const loginForm = document.getElementById('alunoLoginForm');
    const loginError = document.getElementById('alunoLoginError');

    let currentClientId = null;

    // Check existing session
    const session = load(SESSION_KEY);
    if (session && session.role === 'aluno' && session.clientId) {
        currentClientId = session.clientId;
        enterPortal();
    }

    // Login
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('alunoEmail').value.trim().toLowerCase();
        const pass = document.getElementById('alunoPassword').value;
        if (!email || !pass) { loginError.textContent = 'Preencha todos os campos.'; return; }

        // Check in users table first
        const user = users.find(u => u.email.toLowerCase() === email && u.role === 'aluno');
        if (user) {
            if (user.password !== pass) { loginError.textContent = 'Senha incorreta.'; return; }
            const lead = user.leadId ? leads.find(l => l.id === user.leadId) : leads.find(l => (l.email||'').toLowerCase() === email);
            if (!lead) { loginError.textContent = 'Nenhum perfil de cliente vinculado.'; return; }
            currentClientId = lead.id;
        } else {
            // Fallback: match by lead email (demo mode)
            const lead = leads.find(l => (l.email || '').toLowerCase() === email);
            if (!lead) { loginError.textContent = 'E-mail não encontrado.'; return; }
            currentClientId = lead.id;
        }

        save(SESSION_KEY, { role: 'aluno', email, clientId: currentClientId, time: Date.now() });
        loginError.textContent = '';
        enterPortal();
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
                save(PLANS_KEY, plans);
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
                save(PLANS_KEY, plans);
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
        save(CHAT_KEY, chatMessages);
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
        save(NOTIF_KEY, notifications);
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
})();
