// ========================================
// O Tom das Notas — CRM Music Business
// All functionality: CRUD, Pipeline, KPIs, Filters, Modals
// ========================================
(function () {
    'use strict';

    const STORAGE_KEY = 'otomdasnotas_leads';
    const ACTIVITY_KEY = 'otomdasnotas_activities';
    const STAGES = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento'];
    const STAGE_LABELS = { prospeccao:'Prospecção', qualificacao:'Qualificação', proposta:'Proposta', negociacao:'Negociação', fechamento:'Fechamento' };
    const SEGMENT_LABELS = { instrumentista:'Instrumentista', cantor:'Cantor(a)', produtor:'Produtor Musical', banda:'Banda / Grupo', educador:'Educador Musical', estudio:'Estúdio / Gravadora' };
    const SOURCE_ICONS = { instagram:'fab fa-instagram', linkedin:'fab fa-linkedin', indicacao:'fas fa-user-friends', site:'fas fa-globe', evento:'fas fa-calendar-alt', outro:'fas fa-ellipsis-h' };
    const SOURCE_LABELS = { instagram:'Instagram', linkedin:'LinkedIn', indicacao:'Indicação', site:'Site', evento:'Evento / Show', outro:'Outro' };
    const SOCIAL_SOURCES = ['instagram', 'linkedin'];

    // State
    let leads = load(STORAGE_KEY) || [];
    let activities = load(ACTIVITY_KEY) || [];
    let editingLeadId = null;
    let viewingLeadId = null;

    function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function cloud(col, data) { try { if (typeof DB !== 'undefined' && DB.FIREBASE_ENABLED) DB.saveAll(col, data); } catch(e) {} }
    function saveLeads() { save(STORAGE_KEY, leads); cloud('leads', leads); }
    function saveActivities() { save(ACTIVITY_KEY, activities); cloud('activities', activities); }
    function genId() { return 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

    // ========== TOAST NOTIFICATIONS ==========
    function showToast(message, type) {
        type = type || 'info';
        var container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warn:'fa-exclamation-triangle', info:'fa-info-circle' };
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.innerHTML = '<i class="fas ' + (icons[type]||icons.info) + '"></i><span>' + message + '</span><button onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
        container.appendChild(toast);
        setTimeout(function() { toast.classList.add('toast-show'); }, 10);
        setTimeout(function() {
            toast.classList.remove('toast-show');
            setTimeout(function() { if (toast.parentElement) toast.remove(); }, 300);
        }, 4000);
    }
    function esc(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function fmt(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function fmtDate(d) { if (!d) return '—'; const x = new Date(d); return x.toLocaleDateString('pt-BR') + ' ' + x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    function timeAgo(d) { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s/60)+'min'; if (s < 86400) return Math.floor(s/3600)+'h'; if (s < 604800) return Math.floor(s/86400)+'d'; return new Date(d).toLocaleDateString('pt-BR'); }

    function addActivity(text, type) {
        activities.unshift({ id: Date.now(), text, type: type || 'system', time: new Date().toISOString() });
        if (activities.length > 50) activities = activities.slice(0, 50);
        saveActivities();
    }

    // ========== DOM REFS ==========
    const hub = document.getElementById('hub');
    const app = document.getElementById('app');
    const hubCards = document.querySelectorAll('.hub-card');
    const sidebarBrand = document.getElementById('sidebarBrand');
    const backToHub = document.getElementById('backToHub');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.section');

    const titles = { dashboard:'Painel Geral', pipeline:'Pipeline de Vendas', leads:'Base de Contatos', planos:'Planos de Ação', inscricoes:'Inscrições', agenda:'Agenda', mensagens:'Mensagens', usuarios:'Gestão de Usuários', about:'Sobre' };

    // ========== LOGIN / SESSION ==========
    const SESSION_KEY = 'otomdasnotas_session';
    const lpView = document.getElementById('lpView');
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    function getSession() { return load(SESSION_KEY); }
    function setSession(role, email) { save(SESSION_KEY, { role, email, time: Date.now() }); }
    function clearSession() { localStorage.removeItem(SESSION_KEY); }

    function hideAll() {
        lpView.style.display = 'none';
        loginScreen.style.display = 'none';
        hub.style.display = 'none';
        app.style.display = 'none';
    }

    // ========== HISTORY API ==========
    function pushState(view) {
        const state = { view };
        if (history.state && history.state.view === view) return;
        history.pushState(state, '', '#' + view);
    }

    window.addEventListener('popstate', function(e) {
        const state = e.state;
        if (!state || !state.view) { window.showLp(true); return; }
        switch (state.view) {
            case 'lp': window.showLp(true); break;
            case 'login': window.showLoginScreen(true); break;
            case 'hub': showHubFromHistory(); break;
            default:
                if (titles[state.view]) { showAppFromHistory(state.view); }
                else { window.showLp(true); }
        }
    });

    function showHubFromHistory() {
        const s = getSession();
        if (s && s.role === 'admin') { hideAll(); hub.style.display = 'flex'; renderAll(); }
        else { window.showLp(true); }
    }
    function showAppFromHistory(sec) {
        const s = getSession();
        if (s && s.role === 'admin') { hideAll(); app.style.display = 'flex'; switchSection(sec, true); }
        else { window.showLp(true); }
    }

    // Global functions (called from inline onclick in LP HTML)
    window.showLp = function(fromPopstate) {
        hideAll();
        lpView.style.display = 'block';
        window.scrollTo(0, 0);
        if (!fromPopstate) pushState('lp');
    };

    window.showLoginScreen = function(fromPopstate) {
        hideAll();
        loginScreen.style.display = 'flex';
        loginError.textContent = '';
        if (!fromPopstate) pushState('login');
    };

    function showHubAdmin(email) {
        hideAll();
        hub.style.display = 'flex';
        const label = document.getElementById('hubUserLabel');
        if (label) label.textContent = email || '';
        renderAll();
        pushState('hub');
    }

    function loginAs(role, email) {
        setSession(role, email || 'demo@otom.com');
        if (role === 'aluno') {
            window.location.href = 'aluno.html';
        } else {
            showHubAdmin(email || 'demo@otom.com');
        }
    }

    function logout() { clearSession(); window.showLp(false); }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('loginEmail').value.trim().toLowerCase();
        var pass = document.getElementById('loginPassword').value;
        if (!email || !pass) { loginError.textContent = 'Preencha todos os campos.'; return; }

        // Check if this email belongs to an aluno user
        var allUsers = load('otomdasnotas_users') || [];
        var user = allUsers.find(function(u) { return u.email.toLowerCase() === email; });

        if (user && user.role === 'aluno') {
            loginError.innerHTML = 'Este e-mail é de um aluno. <a href="aluno.html" style="color:var(--emerald-700);font-weight:700;text-decoration:underline">Acessar Área do Aluno</a>';
            return;
        }

        // Also check if email belongs to a lead (not an admin user)
        var allLeads = load('otomdasnotas_leads') || [];
        var isLead = allLeads.find(function(l) { return (l.email || '').toLowerCase() === email; });
        var isAdmin = user && user.role === 'admin';

        if (isLead && !isAdmin) {
            loginError.innerHTML = 'Este e-mail é de um cliente. <a href="aluno.html" style="color:var(--emerald-700);font-weight:700;text-decoration:underline">Acessar Área do Aluno</a>';
            return;
        }

        // Valid admin login
        if (user && user.password !== pass) {
            loginError.textContent = 'Senha incorreta.';
            return;
        }

        loginAs('admin', email);
    });

    document.getElementById('loginAsAdmin').addEventListener('click', function() { loginAs('admin', 'admin@otom.com'); });
    document.getElementById('loginAsAluno').addEventListener('click', function() { window.location.href = 'aluno.html'; });
    document.getElementById('btnLogout').addEventListener('click', logout);
    document.getElementById('sidebarLogout').addEventListener('click', function(e) { e.preventDefault(); logout(); });

    // ========== HUB / APP NAVIGATION ==========
    function showHub() { app.style.display = 'none'; hub.style.display = 'flex'; }
    function showApp(sec) { hideAll(); app.style.display = 'flex'; switchSection(sec || 'dashboard'); }

    hubCards.forEach(c => c.addEventListener('click', function(e) {
        if (!this.dataset.section) return;
        e.preventDefault(); showApp(this.dataset.section);
    }));
    sidebarBrand.addEventListener('click', showHub);
    backToHub.addEventListener('click', function(e) { e.preventDefault(); showHub(); });

    navItems.forEach(item => item.addEventListener('click', function(e) {
        e.preventDefault();
        switchSection(this.dataset.section);
        if (window.innerWidth <= 768) toggleSidebar(false);
    }));

    // Card links inside dashboard (e.g. "Ver todos")
    document.querySelectorAll('.card-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) { e.preventDefault(); switchSection(this.dataset.section); });
    });

    function switchSection(name, fromPopstate) {
        navItems.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        const nav = document.querySelector(`.sidebar-nav [data-section="${name}"]`);
        const sec = document.getElementById(`section-${name}`);
        if (nav) nav.classList.add('active');
        if (sec) sec.classList.add('active');
        if (!fromPopstate) pushState(name);
        // Refresh data when entering specific sections
        if (name === 'inscricoes') {
            renderSubmissions();
            // Also try fresh load from Firebase
            try {
                if (typeof DB !== 'undefined' && DB.FIREBASE_ENABLED) {
                    DB.load('submissions').then(function(data) {
                        if (data && data.length > 0) { submissions = data; renderSubmissions(); }
                    });
                }
            } catch(e) {}
        }
    }

    const sidebarOverlay = document.getElementById('sidebarOverlay');
    function toggleSidebar(open) {
        const isOpen = open !== undefined ? open : !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', isOpen);
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active', isOpen);
    }
    menuToggle.addEventListener('click', () => toggleSidebar());
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    // ========== GLOBAL SEARCH ==========
    const globalSearch = document.getElementById('globalSearch');
    globalSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            switchSection('leads');
            document.getElementById('searchLeads').value = this.value.trim();
            renderLeadsTable();
        }
    });

    // ========== MODALS ==========
    const modalOverlay = document.getElementById('modalOverlay');
    const detailOverlay = document.getElementById('modalDetailOverlay');
    const leadForm = document.getElementById('leadForm');
    const modalTitle = document.getElementById('modalTitle');

    function openLeadModal(lead) {
        editingLeadId = lead ? lead.id : null;
        modalTitle.innerHTML = lead ? '<i class="fas fa-edit"></i> Editar Lead' : '<i class="fas fa-user-plus"></i> Novo Lead';
        document.getElementById('leadName').value = lead ? lead.name : '';
        document.getElementById('leadEmail').value = lead ? lead.email : '';
        document.getElementById('leadPhone').value = lead ? lead.phone : '';
        document.getElementById('leadSegment').value = lead ? lead.segment : '';
        document.getElementById('leadStage').value = lead ? lead.stage : 'prospeccao';
        document.getElementById('leadValue').value = lead ? lead.value : '';
        document.getElementById('leadSource').value = lead ? lead.source : 'instagram';
        document.getElementById('leadInstrument').value = lead ? lead.instrument : '';
        document.getElementById('leadNotes').value = lead ? lead.notes : '';
        modalOverlay.classList.add('active');
    }
    function closeLeadModal() { modalOverlay.classList.remove('active'); editingLeadId = null; leadForm.reset(); }

    function openDetailModal(lead) {
        viewingLeadId = lead.id;
        document.getElementById('detailTitle').innerHTML = '<i class="fas fa-user"></i> ' + esc(lead.name);
        document.getElementById('detailContent').innerHTML = [
            ['Segmento', SEGMENT_LABELS[lead.segment] || lead.segment],
            ['E-mail', esc(lead.email) || '—'],
            ['Telefone', esc(lead.phone) || '—'],
            ['Etapa', '<span class="stage-badge '+lead.stage+'">'+STAGE_LABELS[lead.stage]+'</span>'],
            ['Valor', lead.value ? fmt(lead.value) : '—'],
            ['Origem', '<i class="'+(SOURCE_ICONS[lead.source]||'')+'"></i> '+(SOURCE_LABELS[lead.source]||lead.source)],
            ['Instrumento', esc(lead.instrument) || '—'],
            ['Observações', esc(lead.notes) || '—'],
            ['Criado em', fmtDate(lead.createdAt)],
        ].map(([l,v]) => '<div class="detail-row"><span class="detail-label">'+l+'</span><span class="detail-value">'+v+'</span></div>').join('');
        document.getElementById('btnAdvanceLead').style.display = STAGES.indexOf(lead.stage) < STAGES.length - 1 ? '' : 'none';
        detailOverlay.classList.add('active');
    }
    function closeDetailModal() { detailOverlay.classList.remove('active'); viewingLeadId = null; }

    // Button bindings
    document.getElementById('btnNewLead').addEventListener('click', () => openLeadModal(null));
    document.getElementById('btnNewLeadPipeline').addEventListener('click', () => openLeadModal(null));
    document.getElementById('btnNewLeadTable').addEventListener('click', () => openLeadModal(null));
    document.getElementById('modalClose').addEventListener('click', closeLeadModal);
    document.getElementById('btnCancelLead').addEventListener('click', closeLeadModal);
    document.getElementById('detailClose').addEventListener('click', closeDetailModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeLeadModal(); });
    detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) closeDetailModal(); });

    // Filter toggle
    document.getElementById('btnFilterToggle').addEventListener('click', function() {
        const f = document.getElementById('leadsFilters');
        f.style.display = f.style.display === 'none' ? 'flex' : (f.style.display === 'flex' ? 'none' : 'flex');
    });

    // ========== FORM SUBMIT ==========
    leadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('leadName').value.trim(),
            email: document.getElementById('leadEmail').value.trim(),
            phone: document.getElementById('leadPhone').value.trim(),
            segment: document.getElementById('leadSegment').value,
            stage: document.getElementById('leadStage').value,
            value: parseFloat(document.getElementById('leadValue').value) || 0,
            source: document.getElementById('leadSource').value,
            instrument: document.getElementById('leadInstrument').value.trim(),
            notes: document.getElementById('leadNotes').value.trim()
        };
        if (editingLeadId) {
            const i = leads.findIndex(l => l.id === editingLeadId);
            if (i !== -1) { leads[i] = { ...leads[i], ...data, updatedAt: new Date().toISOString() }; addActivity(esc(data.name) + ' foi atualizado', 'edit'); }
        } else {
            leads.push({ id: genId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            addActivity(esc(data.name) + ' adicionado em ' + STAGE_LABELS[data.stage], 'new');
        }
        saveLeads(); closeLeadModal(); renderAll();
    });

    // Detail actions
    document.getElementById('btnEditLead').addEventListener('click', () => {
        const l = leads.find(x => x.id === viewingLeadId);
        if (l) { closeDetailModal(); openLeadModal(l); }
    });
    document.getElementById('btnDeleteLead').addEventListener('click', () => {
        const l = leads.find(x => x.id === viewingLeadId);
        if (l && confirm('Excluir "' + l.name + '"?')) {
            leads = leads.filter(x => x.id !== viewingLeadId);
            saveLeads(); addActivity(esc(l.name) + ' removido', 'delete'); closeDetailModal(); renderAll();
        }
    });
    document.getElementById('btnAdvanceLead').addEventListener('click', () => {
        const l = leads.find(x => x.id === viewingLeadId);
        if (l) {
            const i = STAGES.indexOf(l.stage);
            if (i < STAGES.length - 1) {
                const old = STAGE_LABELS[l.stage];
                l.stage = STAGES[i + 1]; l.updatedAt = new Date().toISOString();
                saveLeads(); addActivity(esc(l.name) + ' avançou de ' + old + ' para ' + STAGE_LABELS[l.stage], 'advance');
                closeDetailModal(); renderAll();
            }
        }
    });

    // Global handlers
    window._view = id => { const l = leads.find(x => x.id === id); if (l) openDetailModal(l); };
    window._edit = id => { const l = leads.find(x => x.id === id); if (l) openLeadModal(l); };
    window._del = id => { const l = leads.find(x => x.id === id); if (l && confirm('Excluir "' + l.name + '"?')) { leads = leads.filter(x => x.id !== id); saveLeads(); addActivity(esc(l.name) + ' removido', 'delete'); renderAll(); } };
    window._advance = id => { const l = leads.find(x => x.id === id); if (l) { const i = STAGES.indexOf(l.stage); if (i < STAGES.length - 1) { const old = STAGE_LABELS[l.stage]; l.stage = STAGES[i+1]; l.updatedAt = new Date().toISOString(); saveLeads(); addActivity(esc(l.name) + ' avançou de ' + old + ' para ' + STAGE_LABELS[l.stage], 'advance'); renderAll(); } } };

    // Filters
    document.getElementById('searchLeads').addEventListener('input', renderLeadsTable);
    document.getElementById('filterSegment').addEventListener('change', renderLeadsTable);
    document.getElementById('filterStage').addEventListener('change', renderLeadsTable);

    // Phone mask
    document.getElementById('leadPhone').addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 6) v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
        else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
        else if (v.length > 0) v = '(' + v;
        e.target.value = v;
    });

    // ========== PLANS (Action Plans for clients) ==========
    const PLANS_KEY = 'otomdasnotas_plans';
    let plans = load(PLANS_KEY) || [];
    function savePlans() { save(PLANS_KEY, plans); cloud('plans', plans); }
    let editingPlanId = null;

    const planOverlay = document.getElementById('modalPlanOverlay');
    const planForm = document.getElementById('planForm');
    const planModalTitle = document.getElementById('planModalTitle');
    const planStepsEditor = document.getElementById('planStepsEditor');

    function openPlanModal(plan) {
        editingPlanId = plan ? plan.id : null;
        planModalTitle.innerHTML = plan ? '<i class="fas fa-edit"></i> Editar Plano' : '<i class="fas fa-clipboard-list"></i> Novo Plano de Ação';
        const sel = document.getElementById('planClient');
        sel.innerHTML = '<option value="">Selecione um lead...</option>' + leads.map(l => '<option value="' + l.id + '"' + (plan && plan.clientId === l.id ? ' selected' : '') + '>' + esc(l.name) + ' — ' + (SEGMENT_LABELS[l.segment]||'') + '</option>').join('');
        document.getElementById('planTitle').value = plan ? plan.title : '';
        document.getElementById('planObjective').value = plan ? plan.objective : '';
        planStepsEditor.innerHTML = '';
        const steps = plan ? plan.steps : [{ text: '', days: 7, resources: [] }];
        steps.forEach(s => addStepRow(s.text, s.days, s.resources));
        planOverlay.classList.add('active');
    }
    function closePlanModal() { planOverlay.classList.remove('active'); editingPlanId = null; planForm.reset(); }

    function addStepRow(text, days, resources) {
        const row = document.createElement('div');
        row.className = 'plan-step-row';
        row.innerHTML = '<div class="step-main">' +
            '<input type="text" class="plan-step-input" placeholder="Descrição da etapa..." value="'+esc(text||'')+'" required>' +
            '<input type="number" class="plan-step-days" placeholder="Dias" min="1" value="'+(days||7)+'" title="Prazo em dias">' +
            '<button type="button" class="btn-icon btn-add-resource" title="Adicionar conteúdo"><i class="fas fa-paperclip"></i></button>' +
            '<button type="button" class="btn-icon btn-remove-step" title="Remover"><i class="fas fa-times"></i></button></div>' +
            '<div class="step-resources-editor"></div>';
        row.querySelector('.btn-remove-step').addEventListener('click', () => {
            if (planStepsEditor.children.length > 1) row.remove();
        });
        row.querySelector('.btn-add-resource').addEventListener('click', () => {
            addResourceRow(row.querySelector('.step-resources-editor'), '', '', '');
        });
        planStepsEditor.appendChild(row);
        if (resources && resources.length > 0) {
            const resEditor = row.querySelector('.step-resources-editor');
            resources.forEach(r => addResourceRow(resEditor, r.type, r.title, r.url));
        }
    }

    function addResourceRow(container, type, title, url) {
        const row = document.createElement('div');
        row.className = 'step-resource-row';
        row.innerHTML = '<select class="res-type"><option value="video"'+(type==='video'?' selected':'')+'>Vídeo</option><option value="article"'+(type==='article'?' selected':'')+'>Matéria</option><option value="podcast"'+(type==='podcast'?' selected':'')+'>Podcast</option></select>' +
            '<input type="text" class="res-title" placeholder="Título" value="'+esc(title||'')+'">' +
            '<input type="url" class="res-url" placeholder="URL" value="'+esc(url||'')+'">' +
            '<button type="button" class="btn-icon" title="Remover"><i class="fas fa-times"></i></button>';
        row.querySelector('.btn-icon').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    document.getElementById('btnAddStep').addEventListener('click', () => addStepRow('', 7, []));
    document.getElementById('btnNewPlan').addEventListener('click', () => openPlanModal(null));
    document.getElementById('planModalClose').addEventListener('click', closePlanModal);
    document.getElementById('btnCancelPlan').addEventListener('click', closePlanModal);
    planOverlay.addEventListener('click', (e) => { if (e.target === planOverlay) closePlanModal(); });

    planForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const clientId = document.getElementById('planClient').value;
        const title = document.getElementById('planTitle').value.trim();
        const objective = document.getElementById('planObjective').value.trim();
        const stepRows = planStepsEditor.querySelectorAll('.plan-step-row');
        const steps = Array.from(stepRows).map(row => {
            const resources = Array.from(row.querySelectorAll('.step-resource-row')).map(r => ({
                type: r.querySelector('.res-type').value,
                title: r.querySelector('.res-title').value.trim(),
                url: r.querySelector('.res-url').value.trim()
            })).filter(r => r.url);
            return {
                text: row.querySelector('.plan-step-input').value.trim(),
                days: parseInt(row.querySelector('.plan-step-days').value) || 7,
                done: false,
                resources,
                notes: ''
            };
        }).filter(s => s.text);

        if (!clientId || !title || steps.length === 0) return;

        if (editingPlanId) {
            const i = plans.findIndex(p => p.id === editingPlanId);
            if (i !== -1) {
                const oldSteps = plans[i].steps;
                steps.forEach((s, idx) => { if (oldSteps[idx]) { s.done = oldSteps[idx].done; s.notes = oldSteps[idx].notes || ''; } });
                plans[i] = { ...plans[i], clientId, title, objective, steps, updatedAt: new Date().toISOString() };
            }
        } else {
            plans.push({ id: genId(), clientId, title, objective, steps, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            addNotification(clientId, 'content', 'Novo plano de ação criado: ' + title);
        }
        savePlans(); closePlanModal(); renderPlans();
    });

    window._editPlan = id => { const p = plans.find(x => x.id === id); if (p) openPlanModal(p); };
    window._delPlan = id => { const p = plans.find(x => x.id === id); if (p && confirm('Excluir este plano?')) { plans = plans.filter(x => x.id !== id); savePlans(); renderPlans(); } };

    function renderPlans() {
        const grid = document.getElementById('plansGrid');
        if (plans.length === 0) { grid.innerHTML = '<p class="empty-state">Nenhum plano criado. Clique em "Novo Plano" para começar.</p>'; return; }

        grid.innerHTML = plans.map(p => {
            const client = leads.find(l => l.id === p.clientId);
            const name = client ? client.name : 'Cliente removido';
            const seg = client ? (SEGMENT_LABELS[client.segment] || '') : '';
            const initial = name.charAt(0);
            const done = p.steps.filter(s => s.done).length;
            const total = p.steps.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return '<div class="plan-card">' +
                '<div class="plan-card-top"><div class="plan-card-client"><div class="plan-card-avatar">' + initial + '</div><div><div class="plan-card-name">' + esc(name) + '</div><div class="plan-card-segment">' + seg + '</div></div></div>' +
                '<div class="plan-card-actions"><button onclick="window._editPlan(\'' + p.id + '\')" title="Editar"><i class="fas fa-edit"></i></button><button onclick="window._delPlan(\'' + p.id + '\')" title="Excluir"><i class="fas fa-trash"></i></button></div></div>' +
                '<div class="plan-card-title">' + esc(p.title) + '</div>' +
                '<div class="plan-card-progress"><div class="progress-bar"><div class="progress-fill ok" style="width:' + pct + '%"></div></div><span class="plan-card-pct">' + pct + '%</span></div>' +
                '<div class="plan-card-footer"><span><i class="fas fa-list-check"></i> ' + done + '/' + total + ' etapas</span><span><i class="fas fa-calendar"></i> ' + new Date(p.createdAt).toLocaleDateString('pt-BR') + '</span></div></div>';
        }).join('');
    }

    // ========== RENDER ALL ==========
    function renderAll() { renderKPIs(); renderFunnel(); renderActivities(); renderSegments(); renderGoals(); renderPipeline(); renderLeadsTable(); renderPlans(); renderSubmissions(); renderUsers(); renderMeetings(); renderChatContacts(); }

    function renderKPIs() {
        const total = leads.length;
        const closed = leads.filter(l => l.stage === 'fechamento').length;
        const rate = total > 0 ? Math.round((closed / total) * 100) : 0;
        const rev = leads.filter(l => l.stage === 'fechamento').reduce((s, l) => s + (l.value || 0), 0);
        const social = leads.filter(l => SOCIAL_SOURCES.includes(l.source)).length;

        document.getElementById('kpiTotalLeads').textContent = total;
        document.getElementById('kpiConversions').textContent = closed;
        document.getElementById('kpiConversionRate').textContent = rate + '%';
        document.getElementById('kpiRevenue').textContent = fmt(rev);
        document.getElementById('kpiSocialSelling').textContent = social;

        // Pipeline badge
        const badge = document.getElementById('navBadgePipeline');
        if (badge) badge.textContent = total > 0 ? total : '';
    }

    function renderFunnel() {
        const chart = document.getElementById('funnelChart');
        const counts = {}; STAGES.forEach(s => counts[s] = leads.filter(l => l.stage === s).length);
        const max = Math.max(...Object.values(counts), 1);
        chart.innerHTML = STAGES.map(s => {
            const h = Math.max((counts[s] / max) * 160, 16);
            return '<div class="funnel-bar-wrapper"><div class="funnel-bar ' + s + '" style="height:' + h + 'px"><span class="funnel-bar-value">' + counts[s] + '</span></div><span class="funnel-bar-label">' + STAGE_LABELS[s] + '</span></div>';
        }).join('');
    }

    function renderActivities() {
        const list = document.getElementById('activityList');
        if (leads.length === 0) { list.innerHTML = '<p class="empty-state">Nenhum negócio registrado.</p>'; return; }

        // Show leads as "recent deals" style
        const sorted = [...leads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8);
        const badgeMap = { fechamento:'badge-won', negociacao:'badge-progress', proposta:'badge-pending', qualificacao:'badge-pending', prospeccao:'badge-pending' };
        list.innerHTML = sorted.map(l => {
            const initial = l.name.charAt(0);
            const badge = l.stage === 'fechamento' ? 'Ganho' : STAGE_LABELS[l.stage];
            const cls = badgeMap[l.stage] || 'badge-pending';
            return '<div class="activity-item" onclick="window._view(\'' + l.id + '\')" style="cursor:pointer">' +
                '<div class="activity-avatar">' + initial + '</div>' +
                '<div class="activity-info"><div class="activity-name">' + esc(l.name) + '</div><div class="activity-detail">' + (SEGMENT_LABELS[l.segment] || '') + '</div></div>' +
                '<div class="activity-right">' + (l.value ? '<div class="activity-value">' + fmt(l.value) + '</div>' : '') +
                '<span class="activity-badge ' + cls + '">' + badge + '</span></div></div>';
        }).join('');
    }

    function renderSegments() {
        const chart = document.getElementById('segmentChart');
        const counts = {}; leads.forEach(l => counts[l.segment] = (counts[l.segment] || 0) + 1);
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const max = entries.length > 0 ? entries[0][1] : 1;
        if (entries.length === 0) { chart.innerHTML = '<p class="empty-state">Sem dados.</p>'; return; }
        chart.innerHTML = entries.map(([seg, count]) => {
            const pct = Math.round((count / max) * 100);
            return '<div class="segment-item"><div class="segment-dot" style="background:var(--zinc-900)"></div><span class="segment-name">' + (SEGMENT_LABELS[seg] || seg) + '</span><div class="segment-bar-wrap"><div class="segment-bar-fill" style="width:' + pct + '%"></div></div><span class="segment-val">' + count + '</span></div>';
        }).join('');
    }

    function renderGoals() {
        const total = leads.length;
        const proposals = leads.filter(l => STAGES.indexOf(l.stage) >= 2).length;
        const closed = leads.filter(l => l.stage === 'fechamento').length;
        setGoal('goalLeads', total, 20); setGoal('goalProposals', proposals, 10); setGoal('goalClosed', closed, 5);
    }
    function setGoal(prefix, cur, target) {
        const t = document.getElementById(prefix + 'Text'), b = document.getElementById(prefix + 'Bar');
        if (t) t.textContent = cur + '/' + target;
        if (b) b.style.width = Math.min(Math.round((cur / target) * 100), 100) + '%';
    }

    function renderPipeline() {
        STAGES.forEach(stage => {
            const container = document.getElementById('cards' + cap(stage));
            const count = document.getElementById('count' + cap(stage));
            const stageLeads = leads.filter(l => l.stage === stage);
            count.textContent = stageLeads.length;
            if (stageLeads.length === 0) { container.innerHTML = '<p class="empty-state" style="padding:24px 0;font-size:.76rem">Nenhum lead</p>'; return; }
            container.innerHTML = stageLeads.map(l => {
                const showAdvance = STAGES.indexOf(l.stage) < STAGES.length - 1;
                return '<div class="lead-card" onclick="window._view(\'' + l.id + '\')">' +
                    '<div class="lead-card-top"><span class="lead-card-id">' + (SEGMENT_LABELS[l.segment] || '').split('/')[0].trim() + '</span></div>' +
                    '<div class="lead-card-name">' + esc(l.name) + '</div>' +
                    '<div class="lead-card-segment"><i class="' + (SOURCE_ICONS[l.source] || 'fas fa-link') + '"></i> ' + (SOURCE_LABELS[l.source] || l.source) + (l.instrument ? ' · ' + esc(l.instrument) : '') + '</div>' +
                    '<div class="lead-card-footer">' +
                    (l.value ? '<span class="lead-card-value">' + fmt(l.value) + '</span>' : '<span></span>') +
                    (showAdvance ? '<button class="lead-card-btn" onclick="event.stopPropagation();window._advance(\'' + l.id + '\')" title="Avançar"><i class="fas fa-arrow-right"></i></button>' : '') +
                    '</div></div>';
            }).join('');
        });
    }

    function renderLeadsTable() {
        const tbody = document.getElementById('leadsTableBody');
        const search = document.getElementById('searchLeads').value.toLowerCase();
        const fSeg = document.getElementById('filterSegment').value;
        const fStage = document.getElementById('filterStage').value;

        let filtered = leads.filter(l => {
            if (search) {
                const match = l.name.toLowerCase().includes(search) || (l.email||'').toLowerCase().includes(search) || (l.instrument||'').toLowerCase().includes(search);
                if (!match) return false;
            }
            if (fSeg && l.segment !== fSeg) return false;
            if (fStage && l.stage !== fStage) return false;
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">' + (leads.length === 0 ? 'Nenhum lead cadastrado.' : 'Nenhum resultado para os filtros.') + '</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(l => {
            const initial = l.name.charAt(0);
            return '<tr>' +
                '<td><div class="td-name"><div class="td-avatar">' + initial + '</div><strong>' + esc(l.name) + '</strong></div></td>' +
                '<td>' + (SEGMENT_LABELS[l.segment] || l.segment) + '</td>' +
                '<td><div class="td-contact">' +
                    (l.email ? '<span><i class="fas fa-envelope"></i>' + esc(l.email) + '</span>' : '') +
                    (l.phone ? '<span><i class="fas fa-phone"></i>' + esc(l.phone) + '</span>' : '') +
                    (!l.email && !l.phone ? '—' : '') +
                '</div></td>' +
                '<td><span class="stage-badge ' + l.stage + '">' + STAGE_LABELS[l.stage] + '</span></td>' +
                '<td>' + (l.value ? fmt(l.value) : '—') + '</td>' +
                '<td><i class="' + (SOURCE_ICONS[l.source]||'') + '" style="margin-right:4px;opacity:.5"></i>' + (SOURCE_LABELS[l.source]||l.source) + '</td>' +
                '<td><div class="table-actions">' +
                    '<button onclick="window._view(\'' + l.id + '\')" title="Ver"><i class="fas fa-eye"></i></button>' +
                    '<button onclick="window._edit(\'' + l.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>' +
                    '<button onclick="window._del(\'' + l.id + '\')" title="Excluir"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    }

    // ========== INSCRIPTIONS (from LP) ==========
    const SUBS_KEY = 'otomdasnotas_submissions';
    let submissions = load(SUBS_KEY) || [];
    function saveSubs() { save(SUBS_KEY, submissions); cloud('submissions', submissions); }
    let replyingSubId = null;

    const TEMPLATES = {
        welcome: {
            subject: 'Bem-vindo ao O Tom das Notas!',
            message: 'Olá {nome}!\n\nObrigado pelo seu interesse na consultoria O Tom das Notas.\n\nFicamos muito felizes em saber que você quer profissionalizar sua carreira como {segmento}.\n\nGostaria de agendar uma conversa inicial (gratuita) para entendermos melhor sua situação e como podemos ajudar?\n\nSugestão de horários:\n- [Dia/horário 1]\n- [Dia/horário 2]\n\nAguardamos seu retorno!\n\nAbraços,\nEquipe O Tom das Notas'
        },
        info: {
            subject: 'Mais informações sobre a consultoria',
            message: 'Olá {nome}!\n\nObrigado pela inscrição. Seguem mais detalhes sobre nossa consultoria:\n\nO que oferecemos:\n- Diagnóstico inicial gratuito da sua carreira\n- Plano de ação personalizado\n- Acompanhamento semanal com reuniões\n- Acesso à plataforma do aluno com conteúdos exclusivos\n- Chat direto com seu consultor\n\nInvestimento:\n- Consulte valores e condições na nossa conversa inicial.\n\nTem alguma dúvida? Responda este e-mail!\n\nAbraços,\nEquipe O Tom das Notas'
        },
        waitlist: {
            subject: 'Você está na nossa lista de espera',
            message: 'Olá {nome}!\n\nObrigado pelo interesse na consultoria O Tom das Notas.\n\nNo momento estamos com todas as vagas preenchidas, mas adicionamos você à nossa lista de espera prioritária.\n\nAssim que uma vaga abrir, você será o(a) primeiro(a) a ser contatado(a).\n\nEnquanto isso, acompanhe nossas dicas no Instagram!\n\nAbraços,\nEquipe O Tom das Notas'
        },
        reject: {
            subject: 'Sobre sua inscrição',
            message: 'Olá {nome}!\n\nObrigado pelo interesse na consultoria O Tom das Notas.\n\nApós analisar seu perfil, acreditamos que neste momento nosso programa pode não ser o melhor fit para suas necessidades.\n\nRecomendamos:\n- [Sugestão alternativa 1]\n- [Sugestão alternativa 2]\n\nDesejamos muito sucesso na sua carreira!\n\nAbraços,\nEquipe O Tom das Notas'
        }
    };

    const replyOverlay = document.getElementById('modalReplyOverlay');
    const replyForm = document.getElementById('replyForm');

    function openReplyModal(sub) {
        replyingSubId = sub.id;
        document.getElementById('replyModalTitle').innerHTML = '<i class="fas fa-reply"></i> Responder — ' + esc(sub.name);
        document.getElementById('replyInfo').innerHTML = '<div class="reply-info-grid">' +
            '<div><strong>Nome:</strong> '+esc(sub.name)+'</div>' +
            '<div><strong>E-mail:</strong> '+esc(sub.email)+'</div>' +
            '<div><strong>WhatsApp:</strong> '+esc(sub.phone)+'</div>' +
            '<div><strong>Segmento:</strong> '+(SEGMENT_LABELS[sub.segment]||sub.segment)+'</div>' +
            (sub.instrument?'<div><strong>Instrumento:</strong> '+esc(sub.instrument)+'</div>':'') +
            (sub.message?'<div class="reply-info-msg"><strong>Mensagem:</strong><br>'+esc(sub.message)+'</div>':'') +
            '</div>';
        document.getElementById('replyTemplate').value = '';
        document.getElementById('replySubject').value = '';
        document.getElementById('replyMessage').value = '';
        replyOverlay.classList.add('active');
    }
    function closeReplyModal() { replyOverlay.classList.remove('active'); replyingSubId = null; }

    document.getElementById('replyModalClose').addEventListener('click', closeReplyModal);
    replyOverlay.addEventListener('click', e => { if (e.target === replyOverlay) closeReplyModal(); });

    // Template selection
    document.getElementById('replyTemplate').addEventListener('change', function() {
        const tpl = TEMPLATES[this.value];
        if (!tpl) return;
        const sub = submissions.find(s => s.id === replyingSubId);
        if (!sub) return;
        const segLabel = SEGMENT_LABELS[sub.segment] || sub.segment;
        document.getElementById('replySubject').value = tpl.subject;
        document.getElementById('replyMessage').value = tpl.message.replace(/\{nome\}/g, sub.name.split(' ')[0]).replace(/\{segmento\}/g, segLabel);
    });

    // Send reply
    replyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const sub = submissions.find(s => s.id === replyingSubId);
        if (!sub) return;
        const subject = document.getElementById('replySubject').value.trim();
        const message = document.getElementById('replyMessage').value.trim();
        if (!message) return;
        sub.status = 'respondido';
        sub.replies = sub.replies || [];
        sub.replies.push({ subject, message, sentAt: new Date().toISOString() });
        saveSubs(); closeReplyModal(); renderSubmissions();
        showToast('Resposta registrada para ' + sub.name, 'success');
    });

    // Convert to Lead
    document.getElementById('btnConvertLead').addEventListener('click', function() {
        const sub = submissions.find(s => s.id === replyingSubId);
        if (!sub) return;
        // Check if lead already exists
        if (leads.find(l => l.email === sub.email)) {
            showToast('Um lead com este e-mail já existe.', 'warn');
            return;
        }
        leads.push({
            id: genId(), name: sub.name, email: sub.email, phone: sub.phone,
            segment: sub.segment, stage: 'prospeccao', value: 0, source: 'site',
            instrument: sub.instrument || '', notes: sub.message || '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
        saveLeads();
        sub.status = 'convertido';
        saveSubs();
        closeReplyModal();
        renderAll();
        showToast('Lead "' + sub.name + '" criado na etapa Prospecção!', 'success');
    });

    window._replySub = id => { const s = submissions.find(x => x.id === id); if (s) openReplyModal(s); };
    window._delSub = id => { if (confirm('Excluir esta inscrição?')) { submissions = submissions.filter(x => x.id !== id); saveSubs(); renderSubmissions(); showToast('Inscrição excluída', 'info'); } };
    window._markSub = function(id, status) {
        const s = submissions.find(x => x.id === id);
        if (s) {
            s.status = status; saveSubs(); renderSubmissions();
            var labels = { arquivado:'Inscrição arquivada', novo:'Inscrição restaurada', respondido:'Marcada como respondida' };
            showToast(labels[status] || 'Status atualizado', 'info');
        }
    };

    // Accept: convert to lead + send welcome email
    window._acceptSub = function(id) {
        const s = submissions.find(x => x.id === id);
        if (!s) return;
        // Convert to lead if not exists
        if (!leads.find(l => l.email === s.email)) {
            leads.push({
                id: genId(), name: s.name, email: s.email, phone: s.phone,
                segment: s.segment, stage: 'prospeccao', value: 0, source: 'site',
                instrument: s.instrument || '', notes: s.message || '',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            });
            saveLeads();
        }
        s.status = 'aceito';
        saveSubs();
        renderSubmissions();
        renderAll();
        showToast('Inscrição de ' + s.name + ' aceita!', 'success');
        sendAcceptEmail(s);
    };

    function sendAcceptEmail(sub) {
        if (typeof emailjs === 'undefined') {
            console.warn('[O Tom] EmailJS não carregou.');
            showToast('Inscrição aceita! E-mail não enviado — configure o EmailJS.', 'warn');
            return;
        }
        var templateParams = {
            to_name: sub.name.split(' ')[0],
            to_email: sub.email,
            from_name: 'O Tom das Notas',
            reply_to: sub.email,
            subject: 'Sua inscrição foi aceita! — O Tom das Notas',
            message: 'Olá ' + sub.name.split(' ')[0] + '! Sua inscrição na consultoria O Tom das Notas foi aceita! Em breve entraremos em contato para agendar seu diagnóstico gratuito.'
        };
        try {
            emailjs.send('service_fbj800w', 'template_gb30i8v', templateParams)
                .then(function(response) {
                    console.log('[O Tom] Email sent:', response.status);
                    showToast('E-mail de aceite enviado para ' + sub.email, 'success');
                })
                .catch(function(err) {
                    console.error('[O Tom] EmailJS error:', JSON.stringify(err));
                    showToast('Inscrição aceita! Falha no e-mail: ' + (err.text || err.message || 'erro desconhecido'), 'error');
                });
        } catch(e) {
            console.error('[O Tom] EmailJS exception:', e);
            showToast('Inscrição aceita! E-mail não enviado.', 'warn');
        }
    }

    function renderSubmissions() {
        // Always refresh from localStorage in case LP form submitted
        var freshSubs = load(SUBS_KEY);
        if (freshSubs && freshSubs.length > submissions.length) submissions = freshSubs;

        const list = document.getElementById('subsList');
        const badge = document.getElementById('navBadgeInscricoes');
        const newCount = submissions.filter(s => s.status === 'novo').length;
        if (badge) badge.textContent = newCount > 0 ? newCount : '';

        if (submissions.length === 0) { list.innerHTML = '<p class="empty-state">Nenhuma inscrição recebida.</p>'; return; }

        const statusLabels = { novo:'Novo', respondido:'Respondido', aceito:'Aceito', convertido:'Convertido', arquivado:'Arquivado' };
        const statusClass = { novo:'badge-new', respondido:'badge-replied', aceito:'badge-accepted', convertido:'badge-converted', arquivado:'badge-archived' };

        // Separate active and archived
        var active = submissions.filter(s => s.status !== 'arquivado');
        var archived = submissions.filter(s => s.status === 'arquivado');

        var html = '';

        if (active.length > 0) {
            html += active.map(renderSubCard).join('');
        } else {
            html += '<p class="empty-state">Nenhuma inscrição ativa.</p>';
        }

        if (archived.length > 0) {
            html += '<div class="sub-archive-section"><button class="btn btn-secondary btn-sm sub-archive-toggle" onclick="document.getElementById(\'archivedSubs\').style.display=document.getElementById(\'archivedSubs\').style.display===\'none\'?\'block\':\'none\'"><i class="fas fa-archive"></i> Arquivadas (' + archived.length + ')</button>' +
                '<div id="archivedSubs" style="display:none;margin-top:12px">' + archived.map(renderSubCard).join('') + '</div></div>';
        }

        list.innerHTML = html;
    }

    function renderSubCard(s) {
        var segLabel = SEGMENT_LABELS[s.segment] || s.segment;
        var statusLabels = { novo:'Novo', respondido:'Respondido', aceito:'Aceito', convertido:'Convertido', arquivado:'Arquivado' };
        var statusClass = { novo:'badge-new', respondido:'badge-replied', aceito:'badge-accepted', convertido:'badge-converted', arquivado:'badge-archived' };
        var isNew = s.status === 'novo';
        var isArchived = s.status === 'arquivado';

        return '<div class="sub-card' + (isArchived ? ' sub-archived' : '') + '">' +
            '<div class="sub-card-top">' +
                '<div class="sub-card-info"><div class="td-avatar">' + s.name.charAt(0) + '</div><div><strong>' + esc(s.name) + '</strong><br><span class="sub-card-meta">' + esc(s.email) + ' · ' + segLabel + '</span></div></div>' +
                '<span class="sub-status ' + (statusClass[s.status]||'') + '">' + (statusLabels[s.status]||s.status) + '</span>' +
            '</div>' +
            (s.phone ? '<div class="sub-card-contact"><i class="fas fa-phone"></i> ' + esc(s.phone) + '</div>' : '') +
            (s.message ? '<p class="sub-card-msg">' + esc(s.message) + '</p>' : '') +
            '<div class="sub-card-footer">' +
                '<span class="sub-card-date"><i class="fas fa-clock"></i> ' + new Date(s.createdAt).toLocaleDateString('pt-BR') + '</span>' +
                '<div class="sub-card-actions">' +
                    (isNew ? '<button onclick="window._acceptSub(\'' + s.id + '\')" class="btn btn-accept btn-sm"><i class="fas fa-check"></i> Aceitar</button>' : '') +
                    '<button onclick="window._replySub(\'' + s.id + '\')" class="btn btn-secondary btn-sm"><i class="fas fa-reply"></i> Responder</button>' +
                    (!isArchived ? '<button onclick="window._markSub(\'' + s.id + '\',\'arquivado\')" class="btn btn-secondary btn-sm"><i class="fas fa-archive"></i> Arquivar</button>' : '<button onclick="window._markSub(\'' + s.id + '\',\'novo\')" class="btn btn-secondary btn-sm"><i class="fas fa-undo"></i> Restaurar</button>') +
                    '<button onclick="window._delSub(\'' + s.id + '\')" class="btn btn-secondary btn-sm" title="Excluir"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>' +
            (s.replies && s.replies.length > 0 ? '<div class="sub-card-replies"><strong>Respostas:</strong>' + s.replies.map(r => '<div class="sub-reply"><span>' + esc(r.subject) + '</span><small>' + new Date(r.sentAt).toLocaleDateString('pt-BR') + '</small></div>').join('') + '</div>' : '') +
            '</div>';
    }

    // ========== USERS MANAGEMENT ==========
    const USERS_KEY = 'otomdasnotas_users';
    let users = load(USERS_KEY) || [];
    function saveUsers() { save(USERS_KEY, users); cloud('users', users); }
    let editingUserId = null;

    const userOverlay = document.getElementById('modalUserOverlay');
    const userForm = document.getElementById('userForm');

    function openUserModal(user) {
        editingUserId = user ? user.id : null;
        document.getElementById('userModalTitle').innerHTML = user ? '<i class="fas fa-edit"></i> Editar Usuário' : '<i class="fas fa-user-plus"></i> Novo Usuário';
        document.getElementById('userName').value = user ? user.name : '';
        document.getElementById('userEmail').value = user ? user.email : '';
        document.getElementById('userPassword').value = user ? user.password : '';
        document.getElementById('userRole').value = user ? user.role : 'admin';
        const leadSel = document.getElementById('userLeadId');
        leadSel.innerHTML = '<option value="">Nenhum</option>' + leads.map(l => '<option value="'+l.id+'"'+(user&&user.leadId===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('');
        toggleUserLeadGroup();
        userOverlay.classList.add('active');
    }
    function closeUserModal() { userOverlay.classList.remove('active'); editingUserId = null; userForm.reset(); }
    function toggleUserLeadGroup() {
        document.getElementById('userLeadGroup').style.display = document.getElementById('userRole').value === 'aluno' ? '' : 'none';
    }

    document.getElementById('btnNewUser').addEventListener('click', () => openUserModal(null));
    document.getElementById('userModalClose').addEventListener('click', closeUserModal);
    document.getElementById('btnCancelUser').addEventListener('click', closeUserModal);
    userOverlay.addEventListener('click', e => { if (e.target === userOverlay) closeUserModal(); });
    document.getElementById('userRole').addEventListener('change', toggleUserLeadGroup);

    userForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            password: document.getElementById('userPassword').value,
            role: document.getElementById('userRole').value,
            leadId: document.getElementById('userRole').value === 'aluno' ? document.getElementById('userLeadId').value : ''
        };
        if (editingUserId) {
            const i = users.findIndex(u => u.id === editingUserId);
            if (i !== -1) users[i] = { ...users[i], ...data };
        } else {
            users.push({ id: genId(), ...data, createdAt: new Date().toISOString() });
        }
        saveUsers(); closeUserModal(); renderUsers();
    });

    window._editUser = id => { const u = users.find(x => x.id === id); if (u) openUserModal(u); };
    window._delUser = id => { if (confirm('Excluir este usuário?')) { users = users.filter(x => x.id !== id); saveUsers(); renderUsers(); } };

    function renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (users.length === 0) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum usuário cadastrado.</td></tr>'; return; }
        tbody.innerHTML = users.map(u => {
            const lead = u.leadId ? leads.find(l => l.id === u.leadId) : null;
            return '<tr><td><strong>'+esc(u.name)+'</strong></td><td>'+esc(u.email)+'</td>' +
                '<td><span class="role-badge '+u.role+'">'+(u.role==='admin'?'Administrador':'Aluno')+'</span></td>' +
                '<td>'+(lead?esc(lead.name):'—')+'</td>' +
                '<td>'+new Date(u.createdAt).toLocaleDateString('pt-BR')+'</td>' +
                '<td><div class="table-actions"><button onclick="window._editUser(\''+u.id+'\')" title="Editar"><i class="fas fa-edit"></i></button>' +
                '<button onclick="window._delUser(\''+u.id+'\')" title="Excluir"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('');
    }

    // ========== MEETINGS ==========
    const MEETINGS_KEY = 'otomdasnotas_meetings';
    let meetings = load(MEETINGS_KEY) || [];
    function saveMeetings() { save(MEETINGS_KEY, meetings); cloud('meetings', meetings); }
    let editingMeetingId = null;

    const meetingOverlay = document.getElementById('modalMeetingOverlay');
    const meetingForm = document.getElementById('meetingForm');

    function openMeetingModal(m) {
        editingMeetingId = m ? m.id : null;
        document.getElementById('meetingModalTitle').innerHTML = m ? '<i class="fas fa-edit"></i> Editar Encontro' : '<i class="fas fa-calendar-plus"></i> Novo Encontro';
        const sel = document.getElementById('meetingClient');
        sel.innerHTML = '<option value="">Selecione...</option>' + leads.map(l => '<option value="'+l.id+'"'+(m&&m.clientId===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('');
        document.getElementById('meetingTitle').value = m ? m.title : '';
        document.getElementById('meetingDate').value = m ? m.date : '';
        document.getElementById('meetingTime').value = m ? m.time : '';
        document.getElementById('meetingType').value = m ? m.type : 'online';
        document.getElementById('meetingLink').value = m ? m.link : '';
        document.getElementById('meetingDetails').value = m ? m.details : '';
        meetingOverlay.classList.add('active');
    }
    function closeMeetingModal() { meetingOverlay.classList.remove('active'); editingMeetingId = null; meetingForm.reset(); }

    document.getElementById('btnNewMeeting').addEventListener('click', () => openMeetingModal(null));
    document.getElementById('meetingModalClose').addEventListener('click', closeMeetingModal);
    document.getElementById('btnCancelMeeting').addEventListener('click', closeMeetingModal);
    meetingOverlay.addEventListener('click', e => { if (e.target === meetingOverlay) closeMeetingModal(); });

    meetingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = {
            clientId: document.getElementById('meetingClient').value,
            title: document.getElementById('meetingTitle').value.trim(),
            date: document.getElementById('meetingDate').value,
            time: document.getElementById('meetingTime').value,
            type: document.getElementById('meetingType').value,
            link: document.getElementById('meetingLink').value.trim(),
            details: document.getElementById('meetingDetails').value.trim()
        };
        if (editingMeetingId) {
            const i = meetings.findIndex(m => m.id === editingMeetingId);
            if (i !== -1) meetings[i] = { ...meetings[i], ...data };
        } else {
            meetings.push({ id: genId(), ...data, createdAt: new Date().toISOString() });
            // Add notification for the client
            addNotification(data.clientId, 'meeting', 'Novo encontro agendado: ' + data.title + ' em ' + formatDateBR(data.date));
        }
        saveMeetings(); closeMeetingModal(); renderMeetings();
    });

    window._editMeeting = id => { const m = meetings.find(x => x.id === id); if (m) openMeetingModal(m); };
    window._delMeeting = id => { if (confirm('Excluir este encontro?')) { meetings = meetings.filter(x => x.id !== id); saveMeetings(); renderMeetings(); } };

    function formatDateBR(d) { if (!d) return ''; const [y,m,dd] = d.split('-'); return dd+'/'+m+'/'+y; }
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    function renderMeetings() {
        const list = document.getElementById('meetingsList');
        if (meetings.length === 0) { list.innerHTML = '<p class="empty-state">Nenhum encontro agendado.</p>'; return; }
        const sorted = [...meetings].sort((a,b) => a.date.localeCompare(b.date));
        list.innerHTML = sorted.map(m => {
            const client = leads.find(l => l.id === m.clientId);
            const d = new Date(m.date + 'T00:00');
            return '<div class="meeting-card"><div class="meeting-date-box"><div class="meeting-date-day">'+d.getDate()+'</div><div class="meeting-date-month">'+MONTHS[d.getMonth()]+'</div></div>' +
                '<div class="meeting-info"><div class="meeting-title">'+esc(m.title)+'</div>' +
                '<div class="meeting-detail"><i class="fas fa-user"></i> '+(client?esc(client.name):'—')+'</div>' +
                '<div class="meeting-detail"><i class="fas fa-clock"></i> '+m.time+'</div>' +
                '<span class="meeting-type-badge '+m.type+'"><i class="fas fa-'+(m.type==='online'?'video':'map-marker-alt')+'"></i> '+m.type+'</span>' +
                (m.link?'<a href="'+esc(m.link)+'" target="_blank" class="meeting-link"><i class="fas fa-video"></i> Acessar reunião</a>':'') +
                (m.details?'<div class="meeting-detail" style="margin-top:6px"><i class="fas fa-info-circle"></i> '+esc(m.details)+'</div>':'') +
                '</div><div class="meeting-actions"><button onclick="window._editMeeting(\''+m.id+'\')" title="Editar"><i class="fas fa-edit"></i></button><button onclick="window._delMeeting(\''+m.id+'\')" title="Excluir"><i class="fas fa-trash"></i></button></div></div>';
        }).join('');
    }

    // ========== NOTIFICATIONS ==========
    const NOTIF_KEY = 'otomdasnotas_notifications';
    let notifications = load(NOTIF_KEY) || [];
    function saveNotifications() { save(NOTIF_KEY, notifications); cloud('notifications', notifications); }
    function addNotification(clientId, type, message) {
        notifications.push({ id: genId(), clientId, type, message, read: false, time: new Date().toISOString() });
        saveNotifications();
    }

    // ========== CHAT (Admin side) ==========
    const CHAT_KEY = 'otomdasnotas_chat';
    let chatMessages = load(CHAT_KEY) || [];
    function saveChat() { save(CHAT_KEY, chatMessages); cloud('chat', chatMessages); }
    let activeChatClient = null;

    function renderChatContacts() {
        const list = document.getElementById('chatContactsList');
        // Show leads that have plans (active clients)
        const clientIds = [...new Set(plans.map(p => p.clientId))];
        if (clientIds.length === 0) { list.innerHTML = '<p class="empty-state" style="padding:20px;font-size:.78rem">Nenhum cliente com plano ativo.</p>'; return; }
        list.innerHTML = clientIds.map(cid => {
            const client = leads.find(l => l.id === cid);
            if (!client) return '';
            const msgs = chatMessages.filter(m => m.clientId === cid);
            const last = msgs.length > 0 ? msgs[msgs.length-1] : null;
            const unread = msgs.filter(m => m.senderRole === 'aluno' && !m.readByAdmin).length;
            return '<div class="chat-contact'+(activeChatClient===cid?' active':'')+'" data-cid="'+cid+'">' +
                '<div class="chat-contact-avatar">'+client.name.charAt(0)+'</div>' +
                '<div class="chat-contact-info"><div class="chat-contact-name">'+esc(client.name)+'</div>' +
                '<div class="chat-contact-last">'+(last?esc(last.text.substring(0,30)):'Sem mensagens')+'</div></div>' +
                (unread>0?'<div class="chat-contact-badge"></div>':'') +
                '</div>';
        }).join('');
        list.querySelectorAll('.chat-contact').forEach(el => {
            el.addEventListener('click', function() {
                activeChatClient = this.dataset.cid;
                renderChatContacts();
                renderChatWindow();
            });
        });
    }

    function renderChatWindow() {
        const main = document.getElementById('chatMain');
        if (!activeChatClient) { main.innerHTML = '<div class="chat-empty"><i class="fas fa-comments"></i><p>Selecione um contato</p></div>'; return; }
        const client = leads.find(l => l.id === activeChatClient);
        const msgs = chatMessages.filter(m => m.clientId === activeChatClient);
        // Mark as read by admin
        msgs.forEach(m => { if (m.senderRole === 'aluno') m.readByAdmin = true; });
        saveChat();

        main.innerHTML = '<div class="chat-header-bar"><div class="chat-contact-avatar" style="width:30px;height:30px;font-size:.7rem">'+client.name.charAt(0)+'</div><span>'+esc(client.name)+'</span></div>' +
            '<div class="chat-messages" id="chatMsgs">' + (msgs.length === 0 ? '<p class="empty-state">Nenhuma mensagem.</p>' :
            msgs.map(m => '<div class="chat-msg '+(m.senderRole==='admin'?'sent':'received')+'">'+esc(m.text)+'<span class="chat-msg-time">'+timeAgo(m.time)+'</span></div>').join('')) +
            '</div><form class="chat-input-bar" id="adminChatForm"><input type="text" id="adminChatText" placeholder="Mensagem..." required autocomplete="off"><button type="submit"><i class="fas fa-paper-plane"></i></button></form>';

        const msgsDiv = document.getElementById('chatMsgs');
        msgsDiv.scrollTop = msgsDiv.scrollHeight;

        document.getElementById('adminChatForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const text = document.getElementById('adminChatText').value.trim();
            if (!text) return;
            chatMessages.push({ id: genId(), clientId: activeChatClient, senderRole: 'admin', text, time: new Date().toISOString(), readByAdmin: true });
            saveChat();
            addNotification(activeChatClient, 'chat', 'Nova mensagem do consultor');
            renderChatWindow();
            renderChatContacts();
        });
    }


    // ========== SEED DATA ==========
    function seed() {
        if (leads.length > 0) return;
        const data = [
            { name:'Lucas Mendes', email:'lucas.mendes@email.com', phone:'(11) 98765-4321', segment:'instrumentista', stage:'prospeccao', value:1500, source:'instagram', instrument:'Guitarra', notes:'Guitarrista profissional com 12k seguidores.' },
            { name:'Juliana Ferreira', email:'ju.ferreira@email.com', phone:'(85) 99567-8901', segment:'cantor', stage:'prospeccao', value:3000, source:'instagram', instrument:'Vocal / Sertanejo', notes:'Cantora regional, quer expandir para streaming.' },
            { name:'Studio Som Criativo', email:'contato@somcriativo.com', phone:'(11) 93456-7890', segment:'estudio', stage:'prospeccao', value:8000, source:'linkedin', instrument:'Gravação e Mixagem', notes:'Estúdio com 5 anos de mercado.' },
            { name:'Ana Clara Souza', email:'anaclara@email.com', phone:'(21) 99876-5432', segment:'cantor', stage:'qualificacao', value:2500, source:'linkedin', instrument:'Vocal / MPB', notes:'Cantora com 50k seguidores, quer monetizar shows.' },
            { name:'Rafael Costa', email:'rafa.costa@email.com', phone:'(21) 97890-1234', segment:'instrumentista', stage:'qualificacao', value:1800, source:'instagram', instrument:'Baixo Elétrico', notes:'Baixista session musician.' },
            { name:'Banda Frequência', email:'mgmt@frequencia.com.br', phone:'(31) 97654-3210', segment:'banda', stage:'proposta', value:5000, source:'indicacao', instrument:'Rock Alternativo', notes:'Proposta de estruturação comercial para turnê.' },
            { name:'Pedro Oliveira', email:'pedro.prod@email.com', phone:'(41) 99123-4567', segment:'produtor', stage:'negociacao', value:3500, source:'site', instrument:'Beatmaker / Produção', notes:'Negociando consultoria com funil de vendas.' },
            { name:'Maria Eduarda Lima', email:'meduarda@email.com', phone:'(51) 98234-5678', segment:'educador', stage:'fechamento', value:2000, source:'evento', instrument:'Piano / Teoria Musical', notes:'Contrato fechado para curso online.' },
        ];
        data.forEach(d => leads.push({ id: genId(), ...d, createdAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(), updatedAt: new Date().toISOString() }));
        saveLeads();
    }

    // Seed plans
    function seedPlans() {
        if (plans.length > 0) return;
        // Find Maria Eduarda (fechamento) to give her a plan
        const maria = leads.find(l => l.name.includes('Maria Eduarda'));
        if (!maria) return;
        plans.push({
            id: genId(), clientId: maria.id,
            title: 'Profissionalização Digital — Curso Online',
            objective: 'Transformar aulas particulares de piano em um curso online escalável com funil de captação de alunos.',
            steps: [
                { text: 'Definir nicho e público-alvo do curso', days: 3, done: true, resources: [{ type:'video', title:'Como definir seu nicho musical', url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }], notes:'' },
                { text: 'Criar perfil profissional no Instagram', days: 5, done: true, resources: [{ type:'article', title:'Guia de Instagram para músicos', url:'https://example.com/guia-instagram' }], notes:'' },
                { text: 'Gravar 3 aulas piloto para validação', days: 14, done: true, resources: [], notes:'' },
                { text: 'Montar página de vendas com depoimentos', days: 7, done: false, resources: [{ type:'video', title:'Como criar uma página de vendas', url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }], notes:'' },
                { text: 'Configurar funil de e-mail marketing', days: 5, done: false, resources: [{ type:'podcast', title:'Marketing Digital para Músicos', url:'https://example.com/podcast' }], notes:'' },
                { text: 'Lançar campanha de captação de alunos', days: 7, done: false, resources: [], notes:'' },
                { text: 'Analisar métricas e otimizar conversão', days: 10, done: false, resources: [], notes:'' },
            ],
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
            updatedAt: new Date().toISOString()
        });
        savePlans();
    }

    // Seed users
    function seedUsers() {
        if (users.length > 0) return;
        const maria = leads.find(l => l.name.includes('Maria Eduarda'));
        users.push({ id: genId(), name: 'Admin', email: 'admin@otom.com', password: '1234', role: 'admin', leadId: '', createdAt: new Date().toISOString() });
        if (maria) users.push({ id: genId(), name: maria.name, email: maria.email, password: '1234', role: 'aluno', leadId: maria.id, createdAt: new Date().toISOString() });
        saveUsers();
    }

    // Seed meetings
    function seedMeetings() {
        if (meetings.length > 0) return;
        const maria = leads.find(l => l.name.includes('Maria Eduarda'));
        if (!maria) return;
        const today = new Date();
        const next = new Date(today); next.setDate(today.getDate() + 3);
        const fmt2 = d => d.toISOString().split('T')[0];
        meetings.push(
            { id: genId(), clientId: maria.id, title: 'Revisão do Plano de Ação', date: fmt2(next), time: '14:00', type: 'online', link: 'https://meet.google.com/abc-defg-hij', details: 'Revisão das 3 primeiras etapas concluídas', createdAt: new Date().toISOString() },
            { id: genId(), clientId: maria.id, title: 'Workshop de Gravação', date: fmt2(new Date(today.getTime() + 10*86400000)), time: '10:00', type: 'presencial', link: '', details: 'Estúdio Central, Sala 3 — Rua das Flores, 123', createdAt: new Date().toISOString() }
        );
        saveMeetings();
    }

    // ========== INIT ==========
    seed();
    seedPlans();
    seedUsers();
    seedMeetings();
    renderAll();

    // Cloud sync (safe - only runs if DB is available)
    try {
        if (typeof DB !== 'undefined' && DB.FIREBASE_ENABLED) {
            // Load from Firestore
            (async function() {
                try {
                    var results = await Promise.all([
                        DB.load('leads'), DB.load('plans'), DB.load('users'),
                        DB.load('meetings'), DB.load('submissions'), DB.load('chat'), DB.load('notifications')
                    ]);
                    if (results[0].length > 0) leads = results[0];
                    if (results[1].length > 0) plans = results[1];
                    if (results[2].length > 0) users = results[2];
                    if (results[3].length > 0) meetings = results[3];
                    if (results[4].length > 0) submissions = results[4];
                    if (results[5].length > 0) chatMessages = results[5];
                    if (results[6].length > 0) notifications = results[6];
                    renderAll();
                } catch(err) { console.warn('[O Tom] Cloud load failed:', err.message); }
            })();

            // Real-time listeners
            DB.onSnapshot('chat', function(data) { chatMessages = data; if (activeChatClient) { renderChatContacts(); renderChatWindow(); } });
            DB.onSnapshot('submissions', function(data) { submissions = data; renderSubmissions(); });

            // Sync seed data to cloud on first run
            var syncKey = 'otomdasnotas_cloud_synced';
            if (!localStorage.getItem(syncKey)) {
                DB.syncToCloud().then(function() { localStorage.setItem(syncKey, '1'); });
            }
        }
    } catch(e) { console.warn('[O Tom] Cloud init skipped:', e.message); }

    // LP form handling
    var lpFormEl = document.getElementById('lpForm');
    if (lpFormEl) {
        lpFormEl.addEventListener('submit', function(e) {
            e.preventDefault();
            var sub = {
                id: 'sub_' + Date.now(),
                name: document.getElementById('lpName').value.trim(),
                email: document.getElementById('lpEmail').value.trim(),
                phone: document.getElementById('lpPhone').value.trim(),
                segment: document.getElementById('lpSegment').value,
                instrument: document.getElementById('lpInstrument').value.trim(),
                message: document.getElementById('lpMessage').value.trim(),
                status: 'novo', createdAt: new Date().toISOString(), replies: []
            };
            submissions.push(sub); saveSubs();
            document.getElementById('lpFormWrapper').style.display = 'none';
            document.getElementById('lpFormSuccess').style.display = 'block';
        });
    }
    var lpPhoneEl = document.getElementById('lpPhone');
    if (lpPhoneEl) {
        lpPhoneEl.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 6) v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
            else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
            else if (v.length > 0) v = '(' + v;
            e.target.value = v;
        });
    }
    var lpMenuBtn = document.getElementById('lpMenuBtn');
    if (lpMenuBtn) {
        lpMenuBtn.addEventListener('click', function() {
            document.getElementById('lpNavLinks').classList.toggle('open');
        });
    }
    window.addEventListener('scroll', function() {
        var nav = document.getElementById('lpNav');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Check session on load
    const session = getSession();
    if (session && session.role === 'admin') {
        showHubAdmin(session.email);
    } else {
        window.showLp();
    }
})();
