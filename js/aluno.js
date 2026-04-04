// ========================================
// Área do Aluno — O Tom das Notas
// Student portal: view plan, check off steps
// ========================================
(function () {
    'use strict';

    const LEADS_KEY = 'otomdasnotas_leads';
    const PLANS_KEY = 'otomdasnotas_plans';
    const SESSION_KEY = 'otomdasnotas_session';

    function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function esc(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    // Check session
    const session = load(SESSION_KEY);
    if (!session || session.role !== 'aluno') {
        // No valid aluno session — show login screen with select
    }

    const leads = load(LEADS_KEY) || [];
    let plans = load(PLANS_KEY) || [];

    const loginScreen = document.getElementById('alunoLogin');
    const portal = document.getElementById('alunoPortal');
    const alunoSelect = document.getElementById('alunoSelect');

    let currentClientId = null;

    // Populate select — only show leads that have plans
    const clientsWithPlans = new Set(plans.map(p => p.clientId));
    leads.forEach(l => {
        if (!clientsWithPlans.has(l.id)) return; // only show clients with plans
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        alunoSelect.appendChild(opt);
    });

    document.getElementById('btnAlunoEnter').addEventListener('click', () => {
        const id = alunoSelect.value;
        if (!id) return;
        currentClientId = id;
        enterPortal();
    });

    document.getElementById('btnAlunoLogout').addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    });

    function enterPortal() {
        loginScreen.style.display = 'none';
        portal.style.display = 'flex';
        renderPortal();
    }

    function renderPortal() {
        const client = leads.find(l => l.id === currentClientId);
        if (!client) return;

        // User info
        document.getElementById('alunoAvatar').textContent = client.name.charAt(0);
        document.getElementById('alunoName').textContent = client.name;
        document.getElementById('alunoGreeting').textContent = 'Olá, ' + client.name.split(' ')[0] + '!';

        // Find plan for this client
        const plan = plans.find(p => p.clientId === currentClientId);

        const noPlanEl = document.getElementById('alunoNoPlan');
        const welcomeEl = document.getElementById('alunoWelcome');
        const statsEl = document.querySelector('.aluno-stats');
        const planSection = document.querySelector('.aluno-plan-section');

        if (!plan) {
            noPlanEl.style.display = 'block';
            welcomeEl.style.display = 'none';
            statsEl.style.display = 'none';
            planSection.style.display = 'none';
            return;
        }

        noPlanEl.style.display = 'none';
        welcomeEl.style.display = 'flex';
        statsEl.style.display = 'grid';
        planSection.style.display = 'block';

        // Plan info
        document.getElementById('alunoPlanTitle').textContent = plan.title;
        document.getElementById('alunoPlanObjective').textContent = plan.objective || '';

        // Stats
        const total = plan.steps.length;
        const done = plan.steps.filter(s => s.done).length;
        const pending = total - done;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statDone').textContent = done;
        document.getElementById('statPending').textContent = pending;

        // Progress ring
        const circ = 2 * Math.PI * 52;
        const offset = circ - (pct / 100) * circ;
        document.getElementById('ringFill').style.strokeDashoffset = offset;
        document.getElementById('ringValue').textContent = pct + '%';

        // Steps
        const stepsContainer = document.getElementById('alunoSteps');
        stepsContainer.innerHTML = plan.steps.map((step, idx) => {
            return '<div class="aluno-step ' + (step.done ? 'done' : '') + '" data-idx="' + idx + '">' +
                '<div class="step-check" title="' + (step.done ? 'Desmarcar' : 'Marcar como concluído') + '"><i class="fas fa-check"></i></div>' +
                '<div class="step-content">' +
                    '<div class="step-number">Etapa ' + (idx + 1) + ' de ' + total + '</div>' +
                    '<div class="step-title">' + esc(step.text) + '</div>' +
                    '<div class="step-meta"><span><i class="fas fa-clock"></i> ' + step.days + ' dias</span>' +
                    (step.done ? '<span><i class="fas fa-check-circle"></i> Concluído</span>' : '<span><i class="fas fa-hourglass-half"></i> Pendente</span>') +
                    '</div>' +
                '</div></div>';
        }).join('');

        // Bind step check clicks
        stepsContainer.querySelectorAll('.step-check').forEach(check => {
            check.addEventListener('click', function () {
                const stepEl = this.closest('.aluno-step');
                const idx = parseInt(stepEl.dataset.idx);
                plan.steps[idx].done = !plan.steps[idx].done;
                plan.updatedAt = new Date().toISOString();
                save(PLANS_KEY, plans);
                renderPortal();
            });
        });
    }
})();
