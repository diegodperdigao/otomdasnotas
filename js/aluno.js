// ========================================
// Área do Mentorado — O Tom das Notas
// Tabs: Plano (resources, notes, certificate), Agenda, Chat, Notifications
// ========================================
window._alunoLoaded = true;
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
    const FEED_KEY = 'otomdasnotas_feed';
    let feedPosts = load(FEED_KEY) || [];

    const loginScreen = document.getElementById('alunoLogin');
    const portal = document.getElementById('alunoPortal');
    const loginForm = document.getElementById('alunoLoginForm');
    const loginError = document.getElementById('alunoLoginError');

    let currentClientId = null;
    let cloudLoaded = false;

    var jsStatus = document.getElementById('jsStatus');
    if (jsStatus) jsStatus.style.display = 'none';

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

    function doLogin(email, pass) {
        var user = users.find(function(u) { return u.email.toLowerCase() === email && u.role === 'aluno'; });
        if (!user) { loginError.textContent = 'E-mail não encontrado. Verifique com seu consultor.'; return; }
        if (user.password !== pass) { loginError.textContent = 'Senha incorreta.'; return; }
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
        if (users.length > 0) { doLogin(email, pass); return; }
        loginError.textContent = 'Carregando...';
        ensureCloudData().then(function() { loginError.textContent = ''; doLogin(email, pass); }).catch(function() { loginError.textContent = 'Erro ao carregar dados. Tente novamente.'; });
    });

    document.getElementById('btnAlunoLogout').addEventListener('click', function() { localStorage.removeItem(SESSION_KEY); window.location.href = 'index.html'; });

    function enterPortal() { loginScreen.style.display = 'none'; portal.style.display = 'flex'; renderAll(); }

    document.querySelectorAll('.aluno-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.aluno-tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.aluno-tab-content').forEach(function(c) { c.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    function renderAll() { renderPlan(); renderAgenda(); renderChat(); renderNotifications(); renderFeed(); }

    function renderPlan() {
        var client = leads.find(function(l) { return l.id === currentClientId; });
        if (!client) return;
        document.getElementById('alunoAvatar').textContent = client.name.charAt(0);
        document.getElementById('alunoName').textContent = client.name;
        document.getElementById('alunoGreeting').textContent = 'Olá, ' + client.name.split(' ')[0] + '!';
        var plan = plans.find(function(p) { return p.clientId === currentClientId; });
        var noPlan = document.getElementById('alunoNoPlan');
        var welcome = document.getElementById('alunoWelcome');
        var stats = document.querySelector('.aluno-stats');
        var planSection = document.querySelector('.aluno-plan-section');
        var certBanner = document.getElementById('certificateBanner');
        if (!plan) { noPlan.style.display='block'; welcome.style.display='none'; stats.style.display='none'; planSection.style.display='none'; certBanner.style.display='none'; return; }
        noPlan.style.display='none'; welcome.style.display='flex'; stats.style.display='grid'; planSection.style.display='block';
        document.getElementById('alunoPlanTitle').textContent = plan.title;
        document.getElementById('alunoPlanObjective').textContent = plan.objective || '';
        var total = plan.steps.length;
        var done = plan.steps.filter(function(s){return s.done;}).length;
        var pct = total > 0 ? Math.round((done/total)*100) : 0;
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statDone').textContent = done;
        document.getElementById('statPending').textContent = total - done;
        var circ = 2 * Math.PI * 52;
        document.getElementById('ringFill').style.strokeDashoffset = circ - (pct/100)*circ;
        document.getElementById('ringValue').textContent = pct + '%';
        certBanner.style.display = pct === 100 ? 'flex' : 'none';
        var container = document.getElementById('alunoSteps');
        container.innerHTML = plan.steps.map(function(step, idx) {
            var resIcons = {video:'fa-play-circle',article:'fa-newspaper',podcast:'fa-podcast'};
            var resLabels = {video:'Vídeo',article:'Matéria',podcast:'Podcast'};
            var resourcesHtml = (step.resources && step.resources.length > 0) ? '<div class="step-resources">' + step.resources.map(function(r,ri){return '<span class="step-resource-link" data-step="'+idx+'" data-res="'+ri+'"><i class="fas '+resIcons[r.type]+'"></i> '+(r.title||resLabels[r.type])+'</span>';}).join('') + '</div>' : '';
            var notesHtml = '<div class="step-notes"><div class="step-notes-label">Suas anotações</div><textarea data-step="'+idx+'" placeholder="Escreva suas notas...">'+(esc(step.notes||''))+'</textarea></div>';
            return '<div class="aluno-step '+(step.done?'done':'')+'" data-idx="'+idx+'"><div class="step-check" title="'+(step.done?'Desmarcar':'Concluir')+'"><i class="fas fa-check"></i></div><div class="step-content"><div class="step-number">Etapa '+(idx+1)+' de '+total+'</div><div class="step-title">'+esc(step.text)+'</div><div class="step-meta"><span><i class="fas fa-clock"></i> '+step.days+' dias</span>'+(step.done?'<span><i class="fas fa-check-circle"></i> Concluído</span>':'<span><i class="fas fa-hourglass-half"></i> Pendente</span>')+'</div>'+resourcesHtml+notesHtml+'</div></div>';
        }).join('');
        container.querySelectorAll('.step-check').forEach(function(el) {
            el.addEventListener('click', function() { var idx=parseInt(this.closest('.aluno-step').dataset.idx); plan.steps[idx].done=!plan.steps[idx].done; plan.updatedAt=new Date().toISOString(); savePlans(); renderPlan(); });
        });
        container.querySelectorAll('.step-resource-link').forEach(function(el) {
            el.addEventListener('click', function() { var step=plan.steps[parseInt(this.dataset.step)]; var res=step.resources[parseInt(this.dataset.res)]; openResourceViewer(res); });
        });
        container.querySelectorAll('.step-notes textarea').forEach(function(el) {
            el.addEventListener('blur', function() { var idx=parseInt(this.dataset.step); plan.steps[idx].notes=this.value; plan.updatedAt=new Date().toISOString(); savePlans(); });
        });
    }

    var resOverlay = document.getElementById('resourceOverlay');
    document.getElementById('resourceClose').addEventListener('click', function() { resOverlay.classList.remove('active'); });
    resOverlay.addEventListener('click', function(e) { if (e.target === resOverlay) resOverlay.classList.remove('active'); });
    function openResourceViewer(res) {
        var icons = {video:'fa-play-circle',article:'fa-newspaper',podcast:'fa-podcast'};
        var labels = {video:'Vídeo',article:'Matéria',podcast:'Podcast'};
        document.getElementById('resourceTitle').innerHTML = '<i class="fas '+icons[res.type]+'"></i> '+(res.title||labels[res.type]);
        var content = document.getElementById('resourceContent');
        var ytMatch = res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (res.type === 'video' && ytMatch) { content.innerHTML = '<iframe src="https://www.youtube.com/embed/'+ytMatch[1]+'" allowfullscreen></iframe>'; }
        else { content.innerHTML = '<p style="margin-bottom:12px">'+esc(res.title||'')+'</p><a href="'+esc(res.url)+'" target="_blank"><i class="fas fa-external-link-alt"></i> Abrir conteúdo</a>'; }
        resOverlay.classList.add('active');
    }

    var certOverlay = document.getElementById('certOverlay');
    document.getElementById('certClose').addEventListener('click', function() { certOverlay.classList.remove('active'); });
    certOverlay.addEventListener('click', function(e) { if (e.target === certOverlay) certOverlay.classList.remove('active'); });
    document.getElementById('btnViewCertificate').addEventListener('click', function() {
        var client = leads.find(function(l){return l.id===currentClientId;}); var plan = plans.find(function(p){return p.clientId===currentClientId;});
        if (!client || !plan) return;
        document.getElementById('certName').textContent = client.name;
        document.getElementById('certPlan').textContent = plan.title;
        document.getElementById('certDate').textContent = new Date().toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'});
        certOverlay.classList.add('active');
    });

    function renderAgenda() {
        var container = document.getElementById('alunoMeetings');
        var myMeetings = meetings.filter(function(m){return m.clientId===currentClientId;}).sort(function(a,b){return a.date.localeCompare(b.date);});
        if (myMeetings.length === 0) { container.innerHTML = '<p class="empty-state">Nenhum encontro agendado pelo seu consultor.</p>'; return; }
        container.innerHTML = myMeetings.map(function(m) {
            var d = new Date(m.date + 'T00:00');
            return '<div class="meeting-card"><div class="meeting-date-box"><div class="meeting-date-day">'+d.getDate()+'</div><div class="meeting-date-month">'+MONTHS[d.getMonth()]+'</div></div><div class="meeting-info"><div class="meeting-title">'+esc(m.title)+'</div><div class="meeting-detail"><i class="fas fa-clock"></i> '+m.time+'</div><span class="meeting-type-badge '+m.type+'"><i class="fas fa-'+(m.type==='online'?'video':'map-marker-alt')+'"></i> '+m.type+'</span>'+(m.link?'<a href="'+esc(m.link)+'" target="_blank" class="meeting-link"><i class="fas fa-video"></i> Acessar reunião</a>':'')+(m.details?'<div class="meeting-detail" style="margin-top:6px"><i class="fas fa-info-circle"></i> '+esc(m.details)+'</div>':'')+'</div></div>';
        }).join('');
    }

    var chatForm = document.getElementById('alunoChatForm');
    function renderChat() {
        var container = document.getElementById('alunoChatMessages');
        var msgs = chatMessages.filter(function(m){return m.clientId===currentClientId;});
        if (msgs.length === 0) { container.innerHTML = '<p class="empty-state">Nenhuma mensagem ainda. Envie a primeira!</p>'; }
        else { container.innerHTML = msgs.map(function(m){return '<div class="chat-msg '+(m.senderRole==='aluno'?'sent':'received')+'">'+esc(m.text)+'<span class="chat-msg-time">'+timeAgo(m.time)+'</span></div>';}).join(''); container.scrollTop = container.scrollHeight; }
    }
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault(); var input=document.getElementById('alunoChatText'); var text=input.value.trim(); if(!text) return;
        chatMessages.push({id:Date.now().toString(),clientId:currentClientId,senderRole:'aluno',text:text,time:new Date().toISOString()}); saveChat(); input.value=''; renderChat();
    });

    var notifBtn = document.getElementById('notifBtn');
    var notifDropdown = document.getElementById('notifDropdown');
    notifBtn.addEventListener('click', function(e) { e.stopPropagation(); notifDropdown.style.display = notifDropdown.style.display==='none'?'block':'none'; });
    document.addEventListener('click', function() { notifDropdown.style.display = 'none'; });
    notifDropdown.addEventListener('click', function(e) { e.stopPropagation(); });
    document.getElementById('notifClearAll').addEventListener('click', function() { notifications=notifications.filter(function(n){return n.clientId!==currentClientId;}); saveNotifs(); renderNotifications(); });
    function renderNotifications() {
        var myNotifs = notifications.filter(function(n){return n.clientId===currentClientId && !n.read;});
        var badge = document.getElementById('notifBadge');
        badge.style.display = myNotifs.length > 0 ? 'flex' : 'none'; badge.textContent = myNotifs.length;
        var list = document.getElementById('notifList');
        if (myNotifs.length === 0) { list.innerHTML = '<p class="empty-state" style="padding:16px;font-size:.78rem">Sem notificações.</p>'; return; }
        var iconMap = {meeting:'notif-meeting fas fa-calendar-alt',content:'notif-content fas fa-file-alt',chat:'notif-chat fas fa-comment'};
        list.innerHTML = myNotifs.map(function(n) { var cls=iconMap[n.type]||'fas fa-bell'; return '<div class="notif-item"><div class="notif-item-icon '+(n.type?'notif-'+n.type:'')+'"><i class="'+cls.split(' ').slice(1).join(' ')+'"></i></div><div><div class="notif-item-text">'+esc(n.message)+'</div><div class="notif-item-time">'+timeAgo(n.time)+'</div></div></div>'; }).join('');
    }

    // ========== COMMUNITY FEED ==========
    function saveFeed() { save(FEED_KEY, feedPosts); try { if (typeof DB !== 'undefined' && DB.FIREBASE_ENABLED) DB.saveAll('feed', feedPosts); } catch(e) {} }
    var CAT_LABELS = {oportunidade:'Oportunidade',ideia:'Ideia',dica:'Dica',discussao:'Discussão',evento:'Evento'};
    var CAT_ICONS = {oportunidade:'fa-briefcase',ideia:'fa-lightbulb',dica:'fa-star',discussao:'fa-comments',evento:'fa-calendar'};
    function getClientName() { var client=leads.find(function(l){return l.id===currentClientId;}); return client?client.name:'Mentorado'; }
    window._alunoVote = function(id, dir) { var p=feedPosts.find(function(x){return x.id===id;}); if(!p) return; var voter=currentClientId||'anon'; if(!p.upvotes) p.upvotes=[]; if(!p.downvotes) p.downvotes=[]; p.upvotes=p.upvotes.filter(function(v){return v!==voter;}); p.downvotes=p.downvotes.filter(function(v){return v!==voter;}); if(dir==='up') p.upvotes.push(voter); else p.downvotes.push(voter); saveFeed(); renderFeed(); };
    window._alunoAddComment = function(id, text) { var p=feedPosts.find(function(x){return x.id===id;}); if(!p||!text) return; if(!p.comments) p.comments=[]; p.comments.push({id:Date.now().toString(),author:getClientName(),text:text,time:new Date().toISOString()}); saveFeed(); renderFeed(); };
    window._alunoToggleComments = function(id) { var el=document.getElementById('fc-'+id); if(el) el.style.display=el.style.display==='none'?'block':'none'; };
    window._alunoNewPost = function() { var title=prompt('Título da publicação:'); if(!title) return; var content=prompt('Conteúdo:'); if(!content) return; var category=prompt('Categoria (oportunidade, ideia, dica, discussao, evento):','ideia')||'ideia'; feedPosts.unshift({id:Date.now().toString(),author:getClientName(),authorRole:'aluno',authorId:currentClientId,category:category,title:title,content:content,link:'',upvotes:[],comments:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}); saveFeed(); renderFeed(); };
    function renderFeed() {
        var container = document.getElementById('alunoFeedContainer'); if (!container) return;
        var voter = currentClientId || 'anon';
        var newPostBtn = '<button class="btn btn-primary" onclick="window._alunoNewPost()" style="margin-bottom:16px"><i class="fas fa-plus"></i> Nova Publicação</button>';
        if (feedPosts.length === 0) { container.innerHTML = newPostBtn + '<p class="empty-state">Nenhuma publicação ainda.</p>'; return; }
        container.innerHTML = newPostBtn + feedPosts.map(function(p) {
            var initial=(p.author||'?').charAt(0); var catClass='cat-'+p.category; var catLabel=CAT_LABELS[p.category]||p.category; var catIcon=CAT_ICONS[p.category]||'fa-tag';
            var upCount=(p.upvotes||[]).length; var downCount=(p.downvotes||[]).length; var score=upCount-downCount; var commentCount=(p.comments||[]).length;
            var isUpvoted=(p.upvotes||[]).indexOf(voter)!==-1; var isDownvoted=(p.downvotes||[]).indexOf(voter)!==-1;
            return '<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">'+initial+'</div><div class="feed-post-meta"><span class="feed-post-author">'+esc(p.author)+'</span><span class="feed-post-time"> · '+timeAgo(p.createdAt)+'</span></div><span class="feed-post-category '+catClass+'"><i class="fas '+catIcon+'"></i> '+catLabel+'</span></div><div class="feed-post-title">'+esc(p.title)+'</div><div class="feed-post-body">'+esc(p.content)+'</div>'+(p.link?'<a href="'+esc(p.link)+'" target="_blank" class="feed-post-link"><i class="fas fa-external-link-alt"></i> Abrir link</a>':'')+'<div class="feed-reactions"><button class="feed-react-btn '+(isUpvoted?'active':'')+'" onclick="window._alunoVote(\''+p.id+'\',\'up\')"><i class="fas fa-arrow-up"></i></button><span class="feed-score">'+score+'</span><button class="feed-react-btn '+(isDownvoted?'active down':'')+'" onclick="window._alunoVote(\''+p.id+'\',\'down\')"><i class="fas fa-arrow-down"></i></button><button class="feed-comment-btn" onclick="window._alunoToggleComments(\''+p.id+'\')"><i class="fas fa-comment-dots"></i> '+commentCount+' comentário'+(commentCount!==1?'s':'')+'</button></div><div class="feed-comments" id="fc-'+p.id+'" style="display:none">'+(commentCount>0?'<div class="feed-comments-list">'+p.comments.map(function(c){return '<div class="feed-comment"><div class="feed-comment-avatar">'+(c.author||'?').charAt(0)+'</div><div class="feed-comment-body"><span class="feed-comment-author">'+esc(c.author)+'</span><div class="feed-comment-text">'+esc(c.text)+'</div><span class="feed-comment-time">'+timeAgo(c.time)+'</span></div></div>';}).join('')+'</div>':'')+'<form class="feed-comment-form" onsubmit="event.preventDefault();var inp=this.querySelector(\'input\');window._alunoAddComment(\''+p.id+'\',inp.value);inp.value=\'\';"><input type="text" placeholder="Escreva um comentário..." required><button type="submit"><i class="fas fa-paper-plane"></i></button></form></div></div>';
        }).join('');
    }

    function loadCloudData() {
        try {
            if (typeof DB === 'undefined' || !DB.FIREBASE_ENABLED) return;
            Promise.all([DB.load('plans'),DB.load('meetings'),DB.load('chat'),DB.load('notifications'),DB.load('feed'),DB.load('users'),DB.load('leads')])
            .then(function(r) {
                if(r[0]&&r[0].length>0) plans=r[0]; if(r[1]&&r[1].length>0) meetings=r[1]; if(r[2]&&r[2].length>0) chatMessages=r[2];
                if(r[3]&&r[3].length>0) notifications=r[3]; if(r[4]&&r[4].length>0) feedPosts=r[4]; if(r[5]&&r[5].length>0) users=r[5]; if(r[6]&&r[6].length>0) leads=r[6];
                cloudLoaded=true; if(currentClientId) renderAll();
            }).catch(function(e){console.warn('[Aluno] Cloud load failed:',e.message);});
            try{DB.onSnapshot('chat',function(data){chatMessages=data;if(currentClientId)renderChat();});DB.onSnapshot('notifications',function(data){notifications=data;if(currentClientId)renderNotifications();});}catch(e2){}
        } catch(e) { console.warn('[Aluno] Cloud init skipped:', e.message); }
    }
    loadCloudData();
    window._onFirebaseReady = function() { loadCloudData(); };
})();
