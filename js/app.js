// ========================================
// O Tom das Notas — CRM Music Business
// Gestão Comercial para Economia Criativa
// ========================================

(function () {
    'use strict';

    // ========== DATA STORE ==========
    const STORAGE_KEY = 'otomdasnotas_leads';
    const ACTIVITY_KEY = 'otomdasnotas_activities';

    const STAGES = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento'];

    const STAGE_LABELS = {
        prospeccao: 'Prospecção',
        qualificacao: 'Qualificação',
        proposta: 'Proposta',
        negociacao: 'Negociação',
        fechamento: 'Fechamento'
    };

    const SEGMENT_LABELS = {
        instrumentista: 'Instrumentista',
        cantor: 'Cantor(a) / Vocalista',
        produtor: 'Produtor Musical',
        banda: 'Banda / Grupo',
        educador: 'Educador Musical',
        estudio: 'Estúdio / Gravadora'
    };

    const SEGMENT_COLORS = {
        instrumentista: '#1A1A1A',
        cantor: '#404040',
        produtor: '#666666',
        banda: '#888888',
        educador: '#AAAAAA',
        estudio: '#555555'
    };

    const SOURCE_ICONS = {
        instagram: 'fab fa-instagram',
        linkedin: 'fab fa-linkedin',
        indicacao: 'fas fa-user-friends',
        site: 'fas fa-globe',
        evento: 'fas fa-calendar-alt',
        outro: 'fas fa-ellipsis-h'
    };

    const SOURCE_LABELS = {
        instagram: 'Instagram',
        linkedin: 'LinkedIn',
        indicacao: 'Indicação',
        site: 'Site',
        evento: 'Evento / Show',
        outro: 'Outro'
    };

    // Social selling sources (for KPI)
    const SOCIAL_SOURCES = ['instagram', 'linkedin'];

    // ========== STATE ==========
    let leads = loadLeads();
    let activities = loadActivities();
    let editingLeadId = null;
    let viewingLeadId = null;

    function loadLeads() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveLeads() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    }

    function loadActivities() {
        try {
            return JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveActivities() {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
    }

    function addActivity(text, icon, type) {
        activities.unshift({
            id: Date.now(),
            text,
            icon: icon || 'fas fa-info-circle',
            type: type || 'system',
            time: new Date().toISOString()
        });
        if (activities.length > 50) activities = activities.slice(0, 50);
        saveActivities();
    }

    function generateId() {
        return 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    // ========== NAVIGATION ==========
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const pageTitle = document.getElementById('pageTitle');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    const sectionTitles = {
        dashboard: 'Dashboard',
        pipeline: 'Pipeline de Vendas',
        leads: 'Gestão de Leads',
        about: 'Sobre'
    };

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.dataset.section;
            switchSection(section);
            if (window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });

    function switchSection(sectionName) {
        navItems.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
        const activeSection = document.getElementById(`section-${sectionName}`);

        if (activeNav) activeNav.classList.add('active');
        if (activeSection) activeSection.classList.add('active');
        if (pageTitle) pageTitle.textContent = sectionTitles[sectionName] || '';
    }

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // ========== MODAL HANDLERS ==========
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const btnNewLead = document.getElementById('btnNewLead');
    const btnCancelLead = document.getElementById('btnCancelLead');
    const leadForm = document.getElementById('leadForm');
    const modalTitle = document.getElementById('modalTitle');

    const detailOverlay = document.getElementById('modalDetailOverlay');
    const detailClose = document.getElementById('detailClose');

    function openLeadModal(lead) {
        editingLeadId = lead ? lead.id : null;
        modalTitle.innerHTML = lead
            ? '<i class="fas fa-edit"></i> Editar Lead'
            : '<i class="fas fa-user-plus"></i> Novo Lead';

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

    function closeLeadModal() {
        modalOverlay.classList.remove('active');
        editingLeadId = null;
        leadForm.reset();
    }

    function openDetailModal(lead) {
        viewingLeadId = lead.id;
        document.getElementById('detailTitle').innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(lead.name)}`;

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Segmento</span>
                <span class="detail-value">${SEGMENT_LABELS[lead.segment] || lead.segment}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">E-mail</span>
                <span class="detail-value">${escapeHtml(lead.email) || '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Telefone</span>
                <span class="detail-value">${escapeHtml(lead.phone) || '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Etapa</span>
                <span class="detail-value"><span class="stage-badge ${lead.stage}">${STAGE_LABELS[lead.stage]}</span></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Valor</span>
                <span class="detail-value">${lead.value ? formatCurrency(lead.value) : '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Origem</span>
                <span class="detail-value"><i class="${SOURCE_ICONS[lead.source] || ''}"></i> ${SOURCE_LABELS[lead.source] || lead.source}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Instrumento</span>
                <span class="detail-value">${escapeHtml(lead.instrument) || '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Observações</span>
                <span class="detail-value">${escapeHtml(lead.notes) || '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Criado em</span>
                <span class="detail-value">${formatDate(lead.createdAt)}</span>
            </div>
        `;

        const advanceBtn = document.getElementById('btnAdvanceLead');
        const stageIndex = STAGES.indexOf(lead.stage);
        advanceBtn.style.display = stageIndex < STAGES.length - 1 ? '' : 'none';

        detailOverlay.classList.add('active');
    }

    function closeDetailModal() {
        detailOverlay.classList.remove('active');
        viewingLeadId = null;
    }

    btnNewLead.addEventListener('click', () => openLeadModal(null));
    modalClose.addEventListener('click', closeLeadModal);
    btnCancelLead.addEventListener('click', closeLeadModal);
    detailClose.addEventListener('click', closeDetailModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeLeadModal();
    });

    detailOverlay.addEventListener('click', (e) => {
        if (e.target === detailOverlay) closeDetailModal();
    });

    // ========== FORM SUBMIT ==========
    leadForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const leadData = {
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
            const index = leads.findIndex(l => l.id === editingLeadId);
            if (index !== -1) {
                leads[index] = { ...leads[index], ...leadData, updatedAt: new Date().toISOString() };
                addActivity(`<strong>${escapeHtml(leadData.name)}</strong> foi atualizado`, 'fas fa-edit', 'edit');
            }
        } else {
            const newLead = {
                id: generateId(),
                ...leadData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            leads.push(newLead);
            addActivity(`<strong>${escapeHtml(leadData.name)}</strong> adicionado em <strong>${STAGE_LABELS[leadData.stage]}</strong>`, 'fas fa-user-plus', 'new');
        }

        saveLeads();
        closeLeadModal();
        renderAll();
    });

    // ========== DETAIL ACTIONS ==========
    document.getElementById('btnEditLead').addEventListener('click', () => {
        const lead = leads.find(l => l.id === viewingLeadId);
        if (lead) {
            closeDetailModal();
            openLeadModal(lead);
        }
    });

    document.getElementById('btnDeleteLead').addEventListener('click', () => {
        const lead = leads.find(l => l.id === viewingLeadId);
        if (lead && confirm(`Deseja realmente excluir "${lead.name}"?`)) {
            leads = leads.filter(l => l.id !== viewingLeadId);
            saveLeads();
            addActivity(`<strong>${escapeHtml(lead.name)}</strong> foi removido`, 'fas fa-trash', 'delete');
            closeDetailModal();
            renderAll();
        }
    });

    document.getElementById('btnAdvanceLead').addEventListener('click', () => {
        const lead = leads.find(l => l.id === viewingLeadId);
        if (lead) {
            const currentIndex = STAGES.indexOf(lead.stage);
            if (currentIndex < STAGES.length - 1) {
                const oldStage = STAGE_LABELS[lead.stage];
                lead.stage = STAGES[currentIndex + 1];
                lead.updatedAt = new Date().toISOString();
                saveLeads();
                addActivity(
                    `<strong>${escapeHtml(lead.name)}</strong> avançou de <strong>${oldStage}</strong> para <strong>${STAGE_LABELS[lead.stage]}</strong>`,
                    'fas fa-arrow-right',
                    'advance'
                );
                closeDetailModal();
                renderAll();
            }
        }
    });

    // ========== RENDER FUNCTIONS ==========

    function renderAll() {
        renderKPIs();
        renderFunnel();
        renderActivities();
        renderSegments();
        renderGoals();
        renderPipeline();
        renderLeadsTable();
    }

    function renderKPIs() {
        const total = leads.length;
        const conversions = leads.filter(l => l.stage === 'fechamento').length;
        const rate = total > 0 ? Math.round((conversions / total) * 100) : 0;
        const revenue = leads.filter(l => l.stage === 'fechamento').reduce((sum, l) => sum + (l.value || 0), 0);
        const socialSelling = leads.filter(l => SOCIAL_SOURCES.includes(l.source)).length;

        animateValue('kpiTotalLeads', total);
        animateValue('kpiConversions', conversions);
        document.getElementById('kpiConversionRate').textContent = rate + '%';
        document.getElementById('kpiRevenue').textContent = formatCurrency(revenue);
        animateValue('kpiSocialSelling', socialSelling);
    }

    function animateValue(elementId, target) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;

        let start = current;
        const step = target > current ? 1 : -1;
        const interval = setInterval(() => {
            start += step;
            el.textContent = start;
            if (start === target) clearInterval(interval);
        }, 40);
    }

    function renderFunnel() {
        const chart = document.getElementById('funnelChart');
        const counts = {};
        STAGES.forEach(s => counts[s] = leads.filter(l => l.stage === s).length);
        const maxCount = Math.max(...Object.values(counts), 1);

        chart.innerHTML = STAGES.map(stage => {
            const count = counts[stage];
            const height = Math.max((count / maxCount) * 160, 20);
            return `
                <div class="funnel-bar-wrapper">
                    <div class="funnel-bar ${stage}" style="height: ${height}px;">
                        <span class="funnel-bar-value">${count}</span>
                    </div>
                    <span class="funnel-bar-label">${STAGE_LABELS[stage]}</span>
                </div>
            `;
        }).join('');
    }

    function renderActivities() {
        const list = document.getElementById('activityList');
        if (activities.length === 0) {
            list.innerHTML = '<p class="empty-state">Nenhuma atividade registrada.</p>';
            return;
        }

        const typeClass = {
            'new': 'act-new',
            'advance': 'act-advance',
            'edit': 'act-edit',
            'delete': 'act-delete',
            'system': 'act-system'
        };

        list.innerHTML = activities.slice(0, 10).map(a => `
            <div class="activity-item">
                <div class="activity-icon ${typeClass[a.type] || typeClass[a.color ? '' : 'system'] || 'act-system'}">
                    <i class="${a.icon}"></i>
                </div>
                <span class="activity-text">${a.text}</span>
                <span class="activity-time">${timeAgo(a.time)}</span>
            </div>
        `).join('');
    }

    function renderSegments() {
        const chart = document.getElementById('segmentChart');
        const counts = {};
        leads.forEach(l => {
            counts[l.segment] = (counts[l.segment] || 0) + 1;
        });

        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const maxSegment = entries.length > 0 ? entries[0][1] : 1;

        if (entries.length === 0) {
            chart.innerHTML = '<p class="empty-state">Sem dados de segmento.</p>';
            return;
        }

        chart.innerHTML = entries.map(([segment, count]) => {
            const pct = Math.round((count / maxSegment) * 100);
            return `
                <div class="segment-item">
                    <div class="segment-color" style="background: ${SEGMENT_COLORS[segment] || '#666'}"></div>
                    <span class="segment-name">${SEGMENT_LABELS[segment] || segment}</span>
                    <div class="segment-bar-bg">
                        <div class="segment-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="segment-value">${count}</span>
                </div>
            `;
        }).join('');
    }

    function renderGoals() {
        const totalLeads = leads.length;
        const proposals = leads.filter(l => STAGES.indexOf(l.stage) >= 2).length;
        const closed = leads.filter(l => l.stage === 'fechamento').length;

        updateGoal('goalLeads', totalLeads, 20);
        updateGoal('goalProposals', proposals, 10);
        updateGoal('goalClosed', closed, 5);
    }

    function updateGoal(prefix, current, target) {
        const text = document.getElementById(prefix + 'Text');
        const bar = document.getElementById(prefix + 'Bar');
        if (!text || !bar) return;
        const pct = Math.min(Math.round((current / target) * 100), 100);
        text.textContent = `${current}/${target}`;
        bar.style.width = pct + '%';
    }

    function renderPipeline() {
        STAGES.forEach(stage => {
            const container = document.getElementById('cards' + capitalize(stage));
            const count = document.getElementById('count' + capitalize(stage));
            const stageLeads = leads.filter(l => l.stage === stage);

            count.textContent = stageLeads.length;

            if (stageLeads.length === 0) {
                container.innerHTML = '<p class="empty-state" style="padding: 24px 0; font-size: 0.78rem;">Nenhum lead nesta etapa</p>';
                return;
            }

            container.innerHTML = stageLeads.map(lead => `
                <div class="lead-card" data-id="${lead.id}" onclick="window._openDetail('${lead.id}')">
                    <div class="lead-card-header">
                        <span class="lead-card-name">${escapeHtml(lead.name)}</span>
                        ${lead.value ? `<span class="lead-card-value">${formatCurrency(lead.value)}</span>` : ''}
                    </div>
                    <div class="lead-card-segment">
                        <i class="fas fa-music"></i> ${SEGMENT_LABELS[lead.segment] || lead.segment}
                        ${lead.instrument ? ` — ${escapeHtml(lead.instrument)}` : ''}
                    </div>
                    <div class="lead-card-footer">
                        <span class="lead-card-source">
                            <i class="${SOURCE_ICONS[lead.source] || 'fas fa-link'}"></i>
                            ${SOURCE_LABELS[lead.source] || lead.source}
                        </span>
                        <div class="lead-card-actions">
                            ${STAGES.indexOf(lead.stage) < STAGES.length - 1 ? `
                            <button onclick="event.stopPropagation(); window._advanceLead('${lead.id}')" title="Avançar etapa">
                                <i class="fas fa-arrow-right"></i>
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        });
    }

    function renderLeadsTable() {
        const tbody = document.getElementById('leadsTableBody');
        const searchTerm = document.getElementById('searchLeads').value.toLowerCase();
        const filterSegment = document.getElementById('filterSegment').value;
        const filterStage = document.getElementById('filterStage').value;

        let filtered = leads.filter(l => {
            if (searchTerm) {
                const match = l.name.toLowerCase().includes(searchTerm)
                    || (l.email || '').toLowerCase().includes(searchTerm)
                    || (l.instrument || '').toLowerCase().includes(searchTerm);
                if (!match) return false;
            }
            if (filterSegment && l.segment !== filterSegment) return false;
            if (filterStage && l.stage !== filterStage) return false;
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${leads.length === 0 ? 'Nenhum lead cadastrado. Clique em "Novo Lead" para iniciar a prospecção.' : 'Nenhum lead encontrado com os filtros atuais.'}</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(lead => `
            <tr>
                <td><strong>${escapeHtml(lead.name)}</strong></td>
                <td>${SEGMENT_LABELS[lead.segment] || lead.segment}</td>
                <td>${escapeHtml(lead.email || lead.phone) || '—'}</td>
                <td><span class="stage-badge ${lead.stage}">${STAGE_LABELS[lead.stage]}</span></td>
                <td>${lead.value ? formatCurrency(lead.value) : '—'}</td>
                <td><i class="${SOURCE_ICONS[lead.source] || ''}" style="margin-right:4px;opacity:0.6"></i>${SOURCE_LABELS[lead.source] || lead.source}</td>
                <td>
                    <div class="table-actions">
                        <button onclick="window._openDetail('${lead.id}')" title="Ver detalhes"><i class="fas fa-eye"></i></button>
                        <button onclick="window._editLead('${lead.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button onclick="window._deleteLead('${lead.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ========== GLOBAL ACTION HANDLERS ==========
    window._openDetail = function (id) {
        const lead = leads.find(l => l.id === id);
        if (lead) openDetailModal(lead);
    };

    window._editLead = function (id) {
        const lead = leads.find(l => l.id === id);
        if (lead) openLeadModal(lead);
    };

    window._deleteLead = function (id) {
        const lead = leads.find(l => l.id === id);
        if (lead && confirm(`Deseja realmente excluir "${lead.name}"?`)) {
            leads = leads.filter(l => l.id !== id);
            saveLeads();
            addActivity(`<strong>${escapeHtml(lead.name)}</strong> foi removido`, 'fas fa-trash', 'delete');
            renderAll();
        }
    };

    window._advanceLead = function (id) {
        const lead = leads.find(l => l.id === id);
        if (lead) {
            const idx = STAGES.indexOf(lead.stage);
            if (idx < STAGES.length - 1) {
                const oldStage = STAGE_LABELS[lead.stage];
                lead.stage = STAGES[idx + 1];
                lead.updatedAt = new Date().toISOString();
                saveLeads();
                addActivity(
                    `<strong>${escapeHtml(lead.name)}</strong> avançou de <strong>${oldStage}</strong> para <strong>${STAGE_LABELS[lead.stage]}</strong>`,
                    'fas fa-arrow-right',
                    'advance'
                );
                renderAll();
            }
        }
    };

    // ========== FILTERS ==========
    document.getElementById('searchLeads').addEventListener('input', renderLeadsTable);
    document.getElementById('filterSegment').addEventListener('change', renderLeadsTable);
    document.getElementById('filterStage').addEventListener('change', renderLeadsTable);

    // ========== UTILS ==========
    function formatCurrency(value) {
        return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function timeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'agora';
        if (diff < 3600) return Math.floor(diff / 60) + 'min';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd';
        return date.toLocaleDateString('pt-BR');
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== PHONE MASK ==========
    document.getElementById('leadPhone').addEventListener('input', function (e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 6) {
            v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
        } else if (v.length > 2) {
            v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        } else if (v.length > 0) {
            v = `(${v}`;
        }
        e.target.value = v;
    });

    // ========== SEED DATA ==========
    function seedDemoData() {
        if (leads.length > 0) return;

        const demoLeads = [
            // Prospecção — leads identificados via Social Selling
            { name: 'Lucas Mendes', email: 'lucas.mendes@email.com', phone: '(11) 98765-4321', segment: 'instrumentista', stage: 'prospeccao', value: 1500, source: 'instagram', instrument: 'Guitarra', notes: 'Guitarrista profissional com 12k seguidores. Busca aumentar presença digital e monetizar conteúdo educacional.' },
            { name: 'Juliana Ferreira', email: 'ju.ferreira@email.com', phone: '(85) 99567-8901', segment: 'cantor', stage: 'prospeccao', value: 3000, source: 'instagram', instrument: 'Vocal / Sertanejo', notes: 'Cantora regional com público fiel. Quer expandir para streaming e criar estratégia de lançamento.' },
            { name: 'Studio Som Criativo', email: 'contato@somcriativo.com', phone: '(11) 93456-7890', segment: 'estudio', stage: 'prospeccao', value: 8000, source: 'linkedin', instrument: 'Gravação e Mixagem', notes: 'Estúdio com 5 anos de mercado. Precisa atrair artistas independentes e criar pacotes comerciais.' },

            // Qualificação — leads que demonstraram interesse real
            { name: 'Ana Clara Souza', email: 'anaclara@email.com', phone: '(21) 99876-5432', segment: 'cantor', stage: 'qualificacao', value: 2500, source: 'linkedin', instrument: 'Vocal / MPB', notes: 'Cantora com 50k seguidores no Instagram. Quer monetizar shows e criar funil de vendas para merch.' },
            { name: 'Rafael Costa', email: 'rafa.costa@email.com', phone: '(21) 97890-1234', segment: 'instrumentista', stage: 'qualificacao', value: 1800, source: 'instagram', instrument: 'Baixo Elétrico', notes: 'Baixista session musician. Quer criar marca pessoal e vender cursos online de técnicas avançadas.' },

            // Proposta — consultoria comercial apresentada
            { name: 'Banda Frequência', email: 'mgmt@frequencia.com.br', phone: '(31) 97654-3210', segment: 'banda', stage: 'proposta', value: 5000, source: 'indicacao', instrument: 'Rock Alternativo', notes: 'Banda com 3 álbuns lançados. Proposta de estruturação comercial para turnê nacional e monetização digital.' },

            // Negociação — ajustando termos do contrato
            { name: 'Pedro Oliveira', email: 'pedro.prod@email.com', phone: '(41) 99123-4567', segment: 'produtor', stage: 'negociacao', value: 3500, source: 'site', instrument: 'Beatmaker / Produção', notes: 'Produtor quer vender beats online. Negociando pacote de consultoria com funil de vendas + automação.' },

            // Fechamento — contrato assinado
            { name: 'Maria Eduarda Lima', email: 'meduarda@email.com', phone: '(51) 98234-5678', segment: 'educador', stage: 'fechamento', value: 2000, source: 'evento', instrument: 'Piano / Teoria Musical', notes: 'Professora particular. Contrato fechado para criação de curso online + estratégia de captação de alunos.' },
        ];

        demoLeads.forEach(data => {
            leads.push({
                id: generateId(),
                ...data,
                createdAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
                updatedAt: new Date().toISOString()
            });
        });

        saveLeads();

        addActivity('<strong>CRM</strong> inicializado — dados de demonstração carregados', 'fas fa-rocket', 'system');
        addActivity('<strong>Maria Eduarda Lima</strong> — contrato fechado (Curso Online)', 'fas fa-check-circle', 'advance');
        addActivity('<strong>Pedro Oliveira</strong> entrou em negociação (Funil de Beats)', 'fas fa-comments', 'advance');
        addActivity('<strong>Banda Frequência</strong> recebeu proposta comercial (Turnê)', 'fas fa-file-alt', 'advance');
        addActivity('<strong>Ana Clara Souza</strong> qualificada via LinkedIn', 'fab fa-linkedin', 'new');
    }

    // ========== INIT ==========
    seedDemoData();
    renderAll();

})();
