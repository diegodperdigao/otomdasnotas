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
    function saveLeads() { save(STORAGE_KEY, leads); }
    function saveActivities() { save(ACTIVITY_KEY, activities); }
    function genId() { return 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
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

    // ========== HUB / APP NAVIGATION ==========
    const hub = document.getElementById('hub');
    const app = document.getElementById('app');
    const hubCards = document.querySelectorAll('.hub-card');
    const sidebarBrand = document.getElementById('sidebarBrand');
    const backToHub = document.getElementById('backToHub');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.section');

    const titles = { dashboard:'Painel Geral', pipeline:'Pipeline de Vendas', leads:'Base de Contatos', planos:'Planos de Ação', about:'Sobre' };

    function showHub() { app.style.display = 'none'; hub.style.display = 'flex'; }
    function showApp(sec) { hub.style.display = 'none'; app.style.display = 'flex'; switchSection(sec || 'dashboard'); }

    hubCards.forEach(c => c.addEventListener('click', function(e) { e.preventDefault(); showApp(this.dataset.section); }));
    sidebarBrand.addEventListener('click', showHub);
    backToHub.addEventListener('click', function(e) { e.preventDefault(); showHub(); });

    navItems.forEach(item => item.addEventListener('click', function(e) {
        e.preventDefault();
        switchSection(this.dataset.section);
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
    }));

    // Card links inside dashboard (e.g. "Ver todos")
    document.querySelectorAll('.card-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) { e.preventDefault(); switchSection(this.dataset.section); });
    });

    function switchSection(name) {
        navItems.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        const nav = document.querySelector(`.sidebar-nav [data-section="${name}"]`);
        const sec = document.getElementById(`section-${name}`);
        if (nav) nav.classList.add('active');
        if (sec) sec.classList.add('active');
    }

    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target))
            sidebar.classList.remove('open');
    });

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
    function savePlans() { save(PLANS_KEY, plans); }
    let editingPlanId = null;

    const planOverlay = document.getElementById('modalPlanOverlay');
    const planForm = document.getElementById('planForm');
    const planModalTitle = document.getElementById('planModalTitle');
    const planStepsEditor = document.getElementById('planStepsEditor');

    function openPlanModal(plan) {
        editingPlanId = plan ? plan.id : null;
        planModalTitle.innerHTML = plan ? '<i class="fas fa-edit"></i> Editar Plano' : '<i class="fas fa-clipboard-list"></i> Novo Plano de Ação';

        // Populate client select
        const sel = document.getElementById('planClient');
        sel.innerHTML = '<option value="">Selecione um lead...</option>' + leads.map(l => '<option value="' + l.id + '"' + (plan && plan.clientId === l.id ? ' selected' : '') + '>' + esc(l.name) + ' — ' + (SEGMENT_LABELS[l.segment]||'') + '</option>').join('');

        document.getElementById('planTitle').value = plan ? plan.title : '';
        document.getElementById('planObjective').value = plan ? plan.objective : '';

        // Steps
        planStepsEditor.innerHTML = '';
        const steps = plan ? plan.steps : [{ text: '', days: 7 }];
        steps.forEach(s => addStepRow(s.text, s.days));

        planOverlay.classList.add('active');
    }
    function closePlanModal() { planOverlay.classList.remove('active'); editingPlanId = null; planForm.reset(); }

    function addStepRow(text, days) {
        const row = document.createElement('div');
        row.className = 'plan-step-row';
        row.innerHTML = '<input type="text" class="plan-step-input" placeholder="Descrição da etapa..." value="' + esc(text||'') + '" required>' +
            '<input type="number" class="plan-step-days" placeholder="Dias" min="1" value="' + (days||7) + '" title="Prazo em dias">' +
            '<button type="button" class="btn-icon btn-remove-step" title="Remover"><i class="fas fa-times"></i></button>';
        row.querySelector('.btn-remove-step').addEventListener('click', () => {
            if (planStepsEditor.children.length > 1) row.remove();
        });
        planStepsEditor.appendChild(row);
    }

    document.getElementById('btnAddStep').addEventListener('click', () => addStepRow('', 7));
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
        const steps = Array.from(stepRows).map(row => ({
            text: row.querySelector('.plan-step-input').value.trim(),
            days: parseInt(row.querySelector('.plan-step-days').value) || 7,
            done: false
        })).filter(s => s.text);

        if (!clientId || !title || steps.length === 0) return;

        if (editingPlanId) {
            const i = plans.findIndex(p => p.id === editingPlanId);
            if (i !== -1) {
                // Preserve done status of existing steps
                const oldSteps = plans[i].steps;
                steps.forEach((s, idx) => { if (oldSteps[idx]) s.done = oldSteps[idx].done; });
                plans[i] = { ...plans[i], clientId, title, objective, steps, updatedAt: new Date().toISOString() };
            }
        } else {
            plans.push({ id: genId(), clientId, title, objective, steps, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
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
    function renderAll() { renderKPIs(); renderFunnel(); renderActivities(); renderSegments(); renderGoals(); renderPipeline(); renderLeadsTable(); renderPlans(); }

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
                { text: 'Definir nicho e público-alvo do curso', days: 3, done: true },
                { text: 'Criar perfil profissional no Instagram', days: 5, done: true },
                { text: 'Gravar 3 aulas piloto para validação', days: 14, done: true },
                { text: 'Montar página de vendas com depoimentos', days: 7, done: false },
                { text: 'Configurar funil de e-mail marketing', days: 5, done: false },
                { text: 'Lançar campanha de captação de alunos', days: 7, done: false },
                { text: 'Analisar métricas e otimizar conversão', days: 10, done: false },
            ],
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
            updatedAt: new Date().toISOString()
        });
        savePlans();
    }

    // ========== INIT ==========
    seed();
    seedPlans();
    renderAll();
})();
