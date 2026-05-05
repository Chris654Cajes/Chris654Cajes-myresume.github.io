/**
 * edit-functionality.js — Resume & Cover Letter Editor
 * Requires app.js (AppCore) to be loaded first.
 */
(function () {
    'use strict';

    /* ===================== CONFIG ===================== */
    const CONFIG = {
        // SHA-256 of "CJAndBigSmoke"
        // Avoids plaintext password in source. Move auth to server-side in production.
        EDIT_HASH: '9110d238211b5d209740190e7c6b7b3daae4c835783d175e4dcd0943976e18fd',
        VALIDATION: { minText: 5, maxText: 5000, minSkill: 2, maxSkills: 100, minDuty: 3, maxDuties: 20 }
    };

    /* ===================== STATE ===================== */
    let isAuth = false;
    let workingData = null;

    /* ===================== UTILS ===================== */
    function esc(str) { return AppCore ? AppCore.escHtml(str || '') : String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
    function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

    async function sha256(msg) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    function toast(msg, type) {
        type = type || 'info';
        let c = document.getElementById('_tc');
        if (!c) {
            c = document.createElement('div');
            c.id = '_tc';
            c.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;min-width:280px;max-width:480px;';
            document.body.appendChild(c);
        }
        const colors = {success:'#22c55e',error:'#ef4444',info:'#3b82f6',warning:'#f59e0b'};
        const el = document.createElement('div');
        el.style.cssText = `padding:11px 18px;border-radius:10px;color:#fff;font-weight:500;font-size:0.85rem;margin-bottom:8px;background:${colors[type]||colors.info};box-shadow:0 4px 16px rgba(0,0,0,0.25);opacity:0;transform:translateY(-8px);transition:all 0.28s ease;white-space:pre-wrap;`;
        el.textContent = msg;
        c.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateY(0)'; });
        setTimeout(() => { el.style.opacity='0'; setTimeout(() => el.remove(), 280); }, 3500);
    }

    /* ===================== PDF LIB LOADER ===================== */
    function loadPdfLib() {
        return new Promise((resolve, reject) => {
            if (typeof PDFLib !== 'undefined') { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    /* ===================== PDF: RESUME ===================== */
    async function generateResumePDF(data) {
        await loadPdfLib();
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const doc = await PDFDocument.create();
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        const reg  = await doc.embedFont(StandardFonts.Helvetica);
        const BLACK = rgb(0,0,0), GREY = rgb(0.4,0.4,0.4);
        const W=612, H=792, M=40, COL=W-M*2, LH=14;

        let page = doc.addPage([W,H]);
        let y = H - M;

        function newPage() { page = doc.addPage([W,H]); y = H - M; }
        function chk(n) { if (y < M + n) newPage(); }

        function drawWrapped(text, { font=reg, size=10, color=BLACK, indent=0 } = {}) {
            const words = String(text||'').split(' ');
            let line = '';
            words.forEach(word => {
                const test = line ? line+' '+word : word;
                if (font.widthOfTextAtSize(test, size) > COL - indent && line) {
                    chk(LH+4);
                    page.drawText(line, {x:M+indent, y, size, font, color});
                    y -= LH; line = word;
                } else { line = test; }
            });
            if (line) { chk(LH+4); page.drawText(line, {x:M+indent, y, size, font, color}); y -= LH; }
        }

        function section(title) {
            chk(32); y -= 8;
            page.drawText(title, {x:M, y, size:12, font:bold, color:BLACK}); y -= LH;
            page.drawLine({start:{x:M,y:y+4},end:{x:W-M,y:y+4},thickness:1,color:BLACK}); y -= 10;
        }

        const pi = data.personalInfo || {};

        // Header
        chk(60);
        page.drawText((pi.name||'').toUpperCase(), {x:M, y, size:18, font:bold, color:BLACK}); y -= LH+2;
        if (pi.title) { page.drawText(pi.title, {x:M, y, size:11, font:reg, color:GREY}); y -= LH+4; }
        const contact = [pi.email,pi.phone,pi.location,pi.wfh].filter(Boolean).join(' | ');
        if (contact) { page.drawText(contact, {x:M, y, size:9, font:reg, color:GREY}); y -= LH; }
        if (pi.linkedin) { page.drawText('LinkedIn: '+pi.linkedin, {x:M, y, size:9, font:reg, color:GREY}); y -= LH+6; }
        else { y -= 4; }

        // Summary
        if (data.summary && data.summary.trim()) {
            section('PROFESSIONAL SUMMARY');
            drawWrapped(data.summary, {size:10}); y -= 4;
        }

        // Skills
        const sk = data.skills || {};
        const groups = [['Languages & Frameworks',sk.primaryStack],['Databases & Tools',sk.databases],['Frontend & Mobile',sk.frontend],['Multimedia & Creative',sk.multimedia]];
        const hasSkills = groups.some(([,arr]) => arr && arr.length);
        if (hasSkills) {
            section('TECHNICAL SKILLS');
            groups.forEach(([label, arr]) => {
                if (arr && arr.length) {
                    chk(22); page.drawText(label+':', {x:M, y, size:10, font:bold, color:BLACK}); y -= LH;
                    drawWrapped(arr.join(', '), {size:9}); y -= 4;
                }
            });
        }

        // Experience
        if ((data.experience||[]).length) {
            section('PROFESSIONAL EXPERIENCE');
            data.experience.forEach(exp => {
                chk(50);
                page.drawText(exp.position||'', {x:M, y, size:10, font:bold, color:BLACK}); y -= LH;
                const meta = [exp.duration,exp.location].filter(Boolean).join(' | ');
                if (meta) { page.drawText(meta, {x:M, y, size:9, font:reg, color:GREY}); y -= LH+2; }
                (exp.duties||[]).forEach(duty => {
                    chk(LH+6);
                    page.drawText('\u2022', {x:M+10, y, size:9, font:reg, color:BLACK});
                    drawWrapped(duty, {size:9, indent:20});
                });
                y -= 6;
            });
        }

        // Projects
        const projs = (data.projects||[]).filter(p => p.title && p.title.trim());
        if (projs.length) {
            section('PROJECTS & PORTFOLIO');
            projs.forEach(p => {
                chk(30);
                page.drawText(p.title||'', {x:M, y, size:10, font:bold, color:BLACK}); y -= LH;
                if (p.description) drawWrapped(p.description, {size:9});
                if (p.link || p.linkText) { page.drawText(p.linkText||p.link||'', {x:M, y, size:9, font:reg, color:GREY}); y -= LH; }
                y -= 4;
            });
        }

        // Education
        if ((data.education||[]).length) {
            section('EDUCATION');
            data.education.forEach(edu => {
                chk(28);
                page.drawText(edu.degree||'', {x:M, y, size:10, font:bold, color:BLACK}); y -= LH;
                page.drawText(edu.school||'', {x:M, y, size:9, font:reg, color:GREY}); y -= LH+4;
            });
        }

        // Strengths
        if (data.strengths && data.strengths.trim()) {
            section('STRENGTHS & PREFERENCES');
            data.strengths.split('\n').forEach(line => {
                if (line.trim()) drawWrapped(line, {size:9});
                else y -= 5;
            });
        }

        return doc;
    }

    /* ===================== PDF: COVER LETTER ===================== */
    async function generateCoverLetterPDF(content) {
        await loadPdfLib();
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const doc = await PDFDocument.create();
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        const reg  = await doc.embedFont(StandardFonts.Helvetica);
        const BLACK = rgb(0,0,0);
        const W=612, H=792, M=50, COL=W-M*2, LH=15;

        let page = doc.addPage([W,H]);
        let y = H - M;
        let firstLine = true;

        function chk(n) { if (y < M+n) { page = doc.addPage([W,H]); y = H - M; } }

        const lines = (content||'').split('\n');
        lines.forEach(rawLine => {
            if (!rawLine.trim()) { y -= 9; return; }
            const font = firstLine ? bold : reg;
            const size = firstLine ? 12 : 11;
            firstLine = false;
            const words = rawLine.split(' ');
            let line = '';
            words.forEach(word => {
                const test = line ? line+' '+word : word;
                if (font.widthOfTextAtSize(test, size) > COL && line) {
                    chk(LH+4); page.drawText(line, {x:M, y, size, font, color:BLACK}); y -= LH; line = word;
                } else { line = test; }
            });
            if (line) { chk(LH+4); page.drawText(line, {x:M, y, size, font, color:BLACK}); y -= LH; }
        });
        return doc;
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 200);
    }

    function updateDownloadLink(id, blob, filename) {
        const el = document.getElementById(id);
        if (el) { el.href = URL.createObjectURL(blob); el.download = filename; }
    }

    /* ===================== VALIDATION ===================== */
    function validateAll(data) {
        const errs = [];
        if (!data.summary || data.summary.trim().length < 10) errs.push('Summary is too short (min 10 chars)');
        if (!data.strengths || data.strengths.trim().length < 5) errs.push('Strengths is too short');
        (data.experience||[]).forEach((exp,i) => {
            if (!exp.position.trim()) errs.push(`Experience ${i+1}: position required`);
            if (!exp.duration.trim()) errs.push(`Experience ${i+1}: duration required`);
            if (!exp.location.trim()) errs.push(`Experience ${i+1}: location required`);
            if (!(exp.duties||[]).length) errs.push(`Experience ${i+1}: at least one duty required`);
        });
        (data.education||[]).forEach((edu,i) => {
            if (!edu.degree.trim()) errs.push(`Education ${i+1}: degree required`);
            if (!edu.school.trim()) errs.push(`Education ${i+1}: school required`);
        });
        return errs;
    }

    /* ===================== EDITOR STYLES ===================== */
    function injectStyles() {
        if (document.getElementById('_eStyles')) return;
        const s = document.createElement('style');
        s.id = '_eStyles';
        s.textContent = `
        ._ec{background:rgba(0,0,0,0.06);border:1px solid var(--border);border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1.2rem;}
        ._ect{color:var(--accent);font-weight:700;margin-bottom:1rem;font-size:0.88rem;}
        ._sc{background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;padding:1rem;margin-bottom:10px;}
        ._i{width:100%;padding:8px 12px;background:rgba(0,0,0,0.12);border:1px solid var(--border);border-radius:7px;color:var(--text-main);font-size:0.875rem;margin-bottom:8px;font-family:inherit;line-height:1.5;outline:none;transition:border-color 0.2s;box-sizing:border-box;}
        ._i:focus{border-color:var(--accent);}
        textarea._i{resize:vertical;}
        ._lbl{display:block;font-size:0.77rem;font-weight:600;color:var(--text-dim);margin-bottom:4px;}
        ._badd{width:100%;background:rgba(34,197,94,0.1);color:#22c55e;border:1px dashed #22c55e;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;transition:background 0.2s;font-size:0.84rem;}
        ._badd:hover{background:rgba(34,197,94,0.2);}
        ._bdel{background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:5px 11px;cursor:pointer;font-size:0.8rem;transition:background 0.2s;}
        ._bdel:hover{background:rgba(239,68,68,0.2);}
        `;
        document.head.appendChild(s);
    }

    /* ===================== BUILD EDITOR HTML ===================== */
    function buildEditorHTML() {
        const d = workingData;
        const pi = d.personalInfo || {};
        return `
        <div class="_ec">
            <div class="_ect"><i class="fas fa-id-card me-2"></i>Personal Information</div>
            <div class="row g-2">
                <div class="col-md-6"><label class="_lbl">Full Name</label><input class="_i" id="ei-name" value="${esc(pi.name)}" placeholder="Full Name*"></div>
                <div class="col-md-6"><label class="_lbl">Professional Title</label><input class="_i" id="ei-title" value="${esc(pi.title)}" placeholder="Title*"></div>
                <div class="col-md-6"><label class="_lbl">Email</label><input class="_i" id="ei-email" type="email" value="${esc(pi.email)}" placeholder="Email*"></div>
                <div class="col-md-6"><label class="_lbl">Phone</label><input class="_i" id="ei-phone" type="tel" value="${esc(pi.phone)}" placeholder="Phone*"></div>
                <div class="col-md-6"><label class="_lbl">Location</label><input class="_i" id="ei-location" value="${esc(pi.location)}" placeholder="Location"></div>
                <div class="col-md-6"><label class="_lbl">WFH Preference</label><input class="_i" id="ei-wfh" value="${esc(pi.wfh)}" placeholder="e.g. Open to Permanent WFH"></div>
                <div class="col-12"><label class="_lbl">LinkedIn URL</label><input class="_i" id="ei-linkedin" type="url" value="${esc(pi.linkedin)}" placeholder="https://linkedin.com/in/..."></div>
            </div>
        </div>
        <div class="_ec">
            <div class="_ect"><i class="fas fa-user me-2"></i>Professional Summary</div>
            <textarea class="_i" id="ei-summary" rows="4">${esc(d.summary)}</textarea>
        </div>
        <div class="_ec">
            <div class="_ect"><i class="fas fa-code me-2"></i>Technical Skills</div>
            ${skillsEditor('primaryStack','Primary Stack & Backend')}
            <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">
            ${skillsEditor('databases','Databases & Tools')}
            <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">
            ${skillsEditor('frontend','Frontend & Mobile')}
            <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">
            ${skillsEditor('multimedia','Multimedia & Creative')}
        </div>
        <div class="_ec">
            <div class="_ect"><i class="fas fa-briefcase me-2"></i>Professional Experience</div>
            <div id="_expList"></div>
            <button class="_badd" onclick="_E.addExp()"><i class="fas fa-plus me-1"></i>Add Experience</button>
        </div>
        <div class="_ec">
            <div class="_ect"><i class="fas fa-folder-open me-2"></i>Projects & Portfolio</div>
            <div id="_projList"></div>
            <button class="_badd" onclick="_E.addProj()"><i class="fas fa-plus me-1"></i>Add Project</button>
        </div>
        <div class="_ec">
            <div class="_ect"><i class="fas fa-graduation-cap me-2"></i>Education</div>
            <div id="_eduList"></div>
            <button class="_badd" onclick="_E.addEdu()"><i class="fas fa-plus me-1"></i>Add Education</button>
        </div>
        <div class="_ec">
            <div class="_ect"><i class="fas fa-star me-2"></i>Strengths & Preferences</div>
            <textarea class="_i" id="ei-strengths" rows="4">${esc(d.strengths)}</textarea>
        </div>`;
    }

    function skillsEditor(type, label) {
        const arr = ((workingData.skills||{})[type]||[]);
        return `<div style="margin-bottom:0.5rem;">
            <label class="_lbl">${esc(label)}</label>
            <div id="_sk-${type}" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                ${arr.map((s,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(var(--accent-rgb),0.1);color:var(--accent);border:1px solid rgba(var(--accent-rgb),0.3);border-radius:6px;padding:3px 10px;font-size:0.78rem;">${esc(s)}<button onclick="_E.remSkill('${type}',${i})" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:1rem;line-height:1;">&times;</button></span>`).join('')}
            </div>
            <div style="display:flex;gap:6px;">
                <input class="_i" id="_ns-${type}" placeholder="Add skill..." style="margin:0;flex:1;" onkeydown="if(event.key==='Enter'){event.preventDefault();_E.addSkill('${type}');}">
                <button onclick="_E.addSkill('${type}')" style="background:var(--accent);color:#fff;border:none;padding:8px 14px;border-radius:7px;cursor:pointer;font-weight:600;flex-shrink:0;"><i class="fas fa-plus"></i></button>
            </div>
        </div>`;
    }

    function reRenderSkills(type) {
        const c = document.getElementById('_sk-'+type);
        if (!c) return;
        const arr = ((workingData.skills||{})[type]||[]);
        c.innerHTML = arr.map((s,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(var(--accent-rgb),0.1);color:var(--accent);border:1px solid rgba(var(--accent-rgb),0.3);border-radius:6px;padding:3px 10px;font-size:0.78rem;">${esc(s)}<button onclick="_E.remSkill('${type}',${i})" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:1rem;line-height:1;">&times;</button></span>`).join('');
    }

    function renderExpList() {
        const el = document.getElementById('_expList'); if (!el) return;
        el.innerHTML = '';
        workingData.experience.forEach((exp, i) => {
            const d = document.createElement('div'); d.className = '_sc';
            d.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <strong style="color:var(--accent);">Position ${i+1}</strong>
                    <button class="_bdel" onclick="_E.remExp(${i})"><i class="fas fa-trash"></i> Remove</button>
                </div>
                <input class="_i" placeholder="Position / Title*" value="${esc(exp.position)}" oninput="workingData.experience[${i}].position=this.value">
                <input class="_i" placeholder="Duration (e.g. Jan 2020 – Dec 2022)*" value="${esc(exp.duration)}" oninput="workingData.experience[${i}].duration=this.value">
                <input class="_i" placeholder="Location*" value="${esc(exp.location)}" oninput="workingData.experience[${i}].location=this.value">
                <label class="_lbl">Duties*</label>
                <div id="_dts-${i}"></div>
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <input class="_i" id="_nd-${i}" placeholder="Add duty..." style="margin:0;flex:1;" onkeydown="if(event.key==='Enter'){event.preventDefault();_E.addDuty(${i});}">
                    <button onclick="_E.addDuty(${i})" style="background:var(--accent);color:#fff;border:none;padding:8px 14px;border-radius:7px;cursor:pointer;font-weight:600;flex-shrink:0;"><i class="fas fa-plus"></i></button>
                </div>`;
            el.appendChild(d);
            renderDuties(i);
        });
    }

    function renderDuties(ei) {
        const el = document.getElementById('_dts-'+ei); if (!el) return;
        el.innerHTML = (workingData.experience[ei].duties||[]).map((d,di)=>`
            <div style="display:flex;gap:6px;margin-bottom:6px;">
                <input class="_i" style="margin:0;flex:1;" value="${esc(d)}" oninput="workingData.experience[${ei}].duties[${di}]=this.value" placeholder="Duty...">
                <button class="_bdel" onclick="_E.remDuty(${ei},${di})" style="padding:6px 10px;flex-shrink:0;"><i class="fas fa-trash"></i></button>
            </div>`).join('');
    }

    function renderProjList() {
        const el = document.getElementById('_projList'); if (!el) return;
        el.innerHTML = '';
        workingData.projects.forEach((p, i) => {
            const d = document.createElement('div'); d.className = '_sc';
            d.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <strong style="color:var(--accent);">Project ${i+1}</strong>
                    <button class="_bdel" onclick="_E.remProj(${i})"><i class="fas fa-trash"></i> Remove</button>
                </div>
                <input class="_i" placeholder="Project Title*" value="${esc(p.title)}" oninput="workingData.projects[${i}].title=this.value">
                <textarea class="_i" rows="2" oninput="workingData.projects[${i}].description=this.value">${esc(p.description)}</textarea>
                <input class="_i" placeholder="URL (optional)" type="url" value="${esc(p.link)}" oninput="workingData.projects[${i}].link=this.value">
                <input class="_i" placeholder="Link label (optional)" value="${esc(p.linkText)}" oninput="workingData.projects[${i}].linkText=this.value">`;
            el.appendChild(d);
        });
    }

    function renderEduList() {
        const el = document.getElementById('_eduList'); if (!el) return;
        el.innerHTML = '';
        workingData.education.forEach((edu, i) => {
            const d = document.createElement('div'); d.className = '_sc';
            d.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <strong style="color:var(--accent);">Education ${i+1}</strong>
                    <button class="_bdel" onclick="_E.remEdu(${i})"><i class="fas fa-trash"></i> Remove</button>
                </div>
                <input class="_i" placeholder="Degree*" value="${esc(edu.degree)}" oninput="workingData.education[${i}].degree=this.value">
                <input class="_i" placeholder="School / University*" value="${esc(edu.school)}" oninput="workingData.education[${i}].school=this.value">`;
            el.appendChild(d);
        });
    }

    /* Editor action object - referenced by inline onclick */
    window.workingData = null;
    window._E = {
        addSkill(type) {
            const inp = document.getElementById('_ns-'+type);
            const v = inp ? inp.value.trim() : '';
            if (!v || v.length < CONFIG.VALIDATION.minSkill) { toast('Skill too short (min '+CONFIG.VALIDATION.minSkill+' chars).','error'); return; }
            if (((workingData.skills||{})[type]||[]).length >= CONFIG.VALIDATION.maxSkills) { toast('Max skills reached.','error'); return; }
            workingData.skills[type].push(v);
            if (inp) inp.value = '';
            reRenderSkills(type);
        },
        remSkill(type, i) { workingData.skills[type].splice(i,1); reRenderSkills(type); },
        addExp() { workingData.experience.push({position:'',duration:'',location:'',duties:[]}); renderExpList(); },
        remExp(i) { workingData.experience.splice(i,1); renderExpList(); },
        addDuty(ei) {
            const inp = document.getElementById('_nd-'+ei);
            const v = inp ? inp.value.trim() : '';
            if (!v || v.length < CONFIG.VALIDATION.minDuty) { toast('Duty too short.','error'); return; }
            if ((workingData.experience[ei].duties||[]).length >= CONFIG.VALIDATION.maxDuties) { toast('Max duties reached.','error'); return; }
            workingData.experience[ei].duties.push(v);
            if (inp) inp.value = '';
            renderDuties(ei);
        },
        remDuty(ei,di) { workingData.experience[ei].duties.splice(di,1); renderDuties(ei); },
        addProj() { workingData.projects.push({title:'',description:'',link:'',linkText:''}); renderProjList(); },
        remProj(i) { workingData.projects.splice(i,1); renderProjList(); },
        addEdu() { workingData.education.push({degree:'',school:''}); renderEduList(); },
        remEdu(i) { workingData.education.splice(i,1); renderEduList(); }
    };

    function collectForm() {
        const pi = workingData.personalInfo;
        const g = id => (document.getElementById(id)||{}).value;
        pi.name     = g('ei-name')     || pi.name;
        pi.title    = g('ei-title')    || pi.title;
        pi.email    = g('ei-email')    || pi.email;
        pi.phone    = g('ei-phone')    || pi.phone;
        pi.location = g('ei-location') || pi.location;
        pi.wfh      = g('ei-wfh')      || pi.wfh;
        pi.linkedin = g('ei-linkedin') || pi.linkedin;
        workingData.summary   = g('ei-summary')   || workingData.summary;
        workingData.strengths = g('ei-strengths') || workingData.strengths;
    }

    /* ===================== MODAL HELPERS ===================== */
    function makeModal(id, bdId, titleHTML, bodyId, footHTML, maxW) {
        const bd = document.createElement('div');
        bd.id = bdId;
        bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);z-index:10000;opacity:0;visibility:hidden;transition:opacity 0.32s,visibility 0.32s;';
        document.body.appendChild(bd);

        const m = document.createElement('div');
        m.id = id;
        m.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.92);width:95%;max-width:${maxW||1000}px;max-height:92vh;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;z-index:10001;opacity:0;visibility:hidden;transition:all 0.32s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.45);`;
        m.innerHTML = `
            <div style="padding:1.2rem 1.7rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(var(--accent-rgb),0.08),transparent);flex-shrink:0;">
                <h4 style="margin:0;color:var(--accent);font-weight:700;font-size:1.05rem;">${titleHTML}</h4>
                <button onclick="_closeM('${id}','${bdId}')" style="background:none;border:none;color:var(--text-dim);font-size:1.5rem;cursor:pointer;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='none'">&times;</button>
            </div>
            <div id="${bodyId}" style="flex:1;overflow-y:auto;padding:1.4rem 1.7rem;"></div>
            <div style="padding:1.2rem 1.7rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;background:rgba(0,0,0,0.04);flex-shrink:0;flex-wrap:wrap;">
                ${footHTML}
            </div>`;
        document.body.appendChild(m);
        bd.addEventListener('click', () => window._closeM(id, bdId));
        return m;
    }

    window._openM = function(id, bdId) {
        const m = document.getElementById(id), bd = document.getElementById(bdId);
        if (m && bd) { bd.style.opacity='1'; bd.style.visibility='visible'; m.style.opacity='1'; m.style.visibility='visible'; m.style.transform='translate(-50%,-50%) scale(1)'; }
    };
    window._closeM = function(id, bdId) {
        const m = document.getElementById(id), bd = document.getElementById(bdId);
        if (m && bd) { bd.style.opacity='0'; bd.style.visibility='hidden'; m.style.opacity='0'; m.style.visibility='hidden'; m.style.transform='translate(-50%,-50%) scale(0.92)'; }
    };

    /* ===================== OPEN EDITORS ===================== */
    window.openResumeEditor = function () {
        if (!isAuth) { toast('Please sign in first.','error'); return; }
        workingData = deepClone(AppCore.getResumeData());
        window.workingData = workingData;
        const body = document.getElementById('_rmBody');
        if (body) { body.innerHTML = buildEditorHTML(); renderExpList(); renderProjList(); renderEduList(); }
        window._openM('_rm','_rmBd');
    };

    window.openCLEditor = function () {
        if (!isAuth) { toast('Please sign in first.','error'); return; }
        const ta = document.getElementById('_clTA');
        if (ta) ta.value = AppCore.getCoverLetterContent() || defaultCL();
        window._openM('_cl','_clBd');
    };

    function defaultCL() {
        const d = AppCore.getResumeData() || {};
        const pi = d.personalInfo || {};
        return `${pi.name||'Christopher Lee Cajes'}
${[pi.email,pi.phone,pi.location].filter(Boolean).join(' | ')}

[Date]

Hiring Manager
[Company Name]
[Company Address]

Dear Hiring Manager,

I am writing to express my interest in the [Position] role at [Company Name]. With over 8 years of professional experience specializing in C#, ASP.NET Core, and full-stack development, I am confident in my ability to contribute significantly to your team.

Throughout my career, I have developed enterprise-level applications, secure REST APIs, and robust backend systems for various industries including banking and finance. My technical expertise spans multiple programming languages and frameworks, allowing me to adapt quickly to different technology stacks and project requirements.

What sets me apart is my commitment to code quality, system stability, and fostering positive team collaboration. I thrive in remote work environments and am passionate about creating solutions that drive business success.

I would welcome the opportunity to discuss how my background and enthusiasm would be an excellent match for this position. Thank you for considering my application.

Sincerely,
${pi.name||'Christopher Lee Cajes'}`;
    }

    /* ===================== SAVE ACTIONS ===================== */
    window.saveResume = async function () {
        collectForm();
        const errs = validateAll(workingData);
        if (errs.length) { toast('Fix these:\n'+errs.slice(0,3).join('\n'),'error'); return; }
        AppCore.setResumeData(deepClone(workingData));
        toast('Generating PDF…','info');
        try {
            const pdfDoc = await generateResumePDF(workingData);
            const blob = new Blob([await pdfDoc.save()], {type:'application/pdf'});
            const fn = 'Resume - Christopher Lee Cajes.pdf';
            downloadBlob(blob, fn);
            updateDownloadLink('downloadResumeBtn', blob, fn);
            toast('✓ Resume saved & PDF downloaded!','success');
            window._closeM('_rm','_rmBd');
        } catch(e) { toast('PDF error: '+e.message,'error'); }
    };

    window.saveCoverLetter = async function () {
        const ta = document.getElementById('_clTA');
        const content = ta ? ta.value : '';
        if (!content.trim() || content.trim().length < 50) { toast('Cover letter too short (min 50 chars).','error'); return; }
        AppCore.saveCoverLetterContent(content);
        toast('Generating PDF…','info');
        try {
            const pdfDoc = await generateCoverLetterPDF(content);
            const blob = new Blob([await pdfDoc.save()], {type:'application/pdf'});
            const fn = 'Cover Letter - Christopher Lee Cajes.pdf';
            downloadBlob(blob, fn);
            updateDownloadLink('downloadCoverLetterBtn', blob, fn);
            toast('✓ Cover letter saved & PDF downloaded!','success');
            window._closeM('_cl','_clBd');
        } catch(e) { toast('PDF error: '+e.message,'error'); }
    };

    /* ===================== AUTH ===================== */
    function createAuthModal() {
        if (document.getElementById('_authM')) return;
        const bd = document.createElement('div');
        bd.id = '_authBd';
        bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);backdrop-filter:blur(10px);z-index:20000;opacity:0;visibility:hidden;transition:opacity 0.3s,visibility 0.3s;';
        document.body.appendChild(bd);

        const m = document.createElement('div');
        m.id = '_authM';
        m.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);width:90%;max-width:360px;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;z-index:20001;padding:2rem;opacity:0;visibility:hidden;transition:all 0.38s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 25px 60px rgba(0,0,0,0.5);';
        m.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;">
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#ef4444,#b91c1c);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-lock" style="color:#fff;font-size:1rem;"></i>
                </div>
                <div>
                    <h4 style="margin:0;color:var(--text-main);font-size:1rem;font-weight:700;">Authentication</h4>
                    <p style="margin:0;color:var(--text-dim);font-size:0.78rem;">Enter password to edit</p>
                </div>
            </div>
            <input type="password" id="_authInp" placeholder="Password"
                style="width:100%;padding:10px 13px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;outline:none;margin-bottom:1rem;transition:border-color 0.2s;box-sizing:border-box;"
                onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
            <p id="_authErr" style="color:#ef4444;font-size:0.78rem;display:none;margin-bottom:0.75rem;"></p>
            <div style="display:flex;gap:10px;">
                <button onclick="_cancelAuth()" style="flex:1;padding:9px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);cursor:pointer;font-weight:600;transition:all 0.2s;">Cancel</button>
                <button onclick="_submitAuth()" style="flex:2;padding:9px;background:linear-gradient(135deg,#ef4444,#b91c1c);border:none;border-radius:8px;color:#fff;cursor:pointer;font-weight:600;box-shadow:0 4px 12px rgba(239,68,68,0.3);">Sign In</button>
            </div>`;
        document.body.appendChild(m);

        setTimeout(() => {
            bd.style.opacity='1'; bd.style.visibility='visible';
            m.style.opacity='1'; m.style.visibility='visible'; m.style.transform='translate(-50%,-50%) scale(1)';
            const inp = document.getElementById('_authInp');
            if (inp) inp.focus();
        }, 10);

        bd.addEventListener('click', () => window._cancelAuth());
        const inp2 = document.getElementById('_authInp');
        if (inp2) {
            inp2.addEventListener('keydown', e => {
                if (e.key === 'Enter') window._submitAuth();
                if (e.key === 'Escape') window._cancelAuth();
            });
        }
    }

    window._cancelAuth = function () {
        const b = document.getElementById('_authBd'), m = document.getElementById('_authM');
        if (b) { b.style.opacity='0'; b.style.visibility='hidden'; }
        if (m) { m.style.opacity='0'; m.style.visibility='hidden'; setTimeout(()=>{ b&&b.remove(); m&&m.remove(); },350); }
    };

    window._submitAuth = async function () {
        const inp = document.getElementById('_authInp');
        const errEl = document.getElementById('_authErr');
        if (!inp) return;
        const hash = await sha256(inp.value);
        if (hash === CONFIG.EDIT_HASH) {
            isAuth = true;
            window._cancelAuth();
            document.getElementById('_authBtn').style.display = 'none';
            document.getElementById('_editRBtn').style.display = 'flex';
            document.getElementById('_editCLBtn').style.display = 'flex';
            document.getElementById('_authBadge').style.display = 'flex';
            toast('✓ Authenticated!','success');
        } else {
            inp.style.borderColor = '#ef4444';
            inp.value = '';
            if (errEl) { errEl.textContent = 'Incorrect password.'; errEl.style.display = 'block'; }
            setTimeout(() => { inp.style.borderColor = 'var(--border)'; }, 2000);
        }
    };

    /* ===================== SETUP ===================== */
    function setup() {
        injectStyles();

        // Floating auth button
        const authBtn = document.createElement('button');
        authBtn.id = '_authBtn';
        authBtn.innerHTML = '<i class="fas fa-lock me-1"></i> Sign In to Edit';
        authBtn.style.cssText = 'position:fixed;right:20px;top:20px;z-index:9999;border:none;border-radius:50px;padding:10px 22px;font-weight:600;font-size:0.82rem;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 15px rgba(239,68,68,0.3);display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;';
        authBtn.onclick = createAuthModal;
        document.body.appendChild(authBtn);

        // Edit Resume button
        const editRBtn = document.createElement('button');
        editRBtn.id = '_editRBtn';
        editRBtn.innerHTML = '<i class="fas fa-pen me-1"></i> Edit Resume';
        editRBtn.style.cssText = 'position:fixed;right:20px;top:20px;z-index:9999;border:none;border-radius:50px;padding:10px 22px;font-weight:600;font-size:0.82rem;cursor:pointer;transition:all 0.3s;display:none;align-items:center;gap:8px;background:linear-gradient(135deg,var(--accent),#0ea5e9);color:#fff;box-shadow:0 4px 15px rgba(var(--accent-rgb),0.3);';
        editRBtn.onclick = openResumeEditor;
        document.body.appendChild(editRBtn);

        // Edit Cover Letter button
        const editCLBtn = document.createElement('button');
        editCLBtn.id = '_editCLBtn';
        editCLBtn.innerHTML = '<i class="fas fa-file-alt me-1"></i> Edit Cover Letter';
        editCLBtn.style.cssText = 'position:fixed;right:20px;top:72px;z-index:9999;border:none;border-radius:50px;padding:10px 22px;font-weight:600;font-size:0.82rem;cursor:pointer;transition:all 0.3s;display:none;align-items:center;gap:8px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;box-shadow:0 4px 15px rgba(168,85,247,0.3);';
        editCLBtn.onclick = openCLEditor;
        document.body.appendChild(editCLBtn);

        // Auth badge
        const badge = document.createElement('div');
        badge.id = '_authBadge';
        badge.innerHTML = '<i class="fas fa-check-circle me-1"></i> Authenticated';
        badge.style.cssText = 'position:fixed;right:20px;top:126px;z-index:9999;display:none;align-items:center;gap:6px;padding:5px 12px;background:rgba(34,197,94,0.1);border:1px solid #22c55e;border-radius:20px;font-size:0.75rem;color:#22c55e;';
        document.body.appendChild(badge);

        // Resume modal
        makeModal('_rm','_rmBd',
            '<i class="fas fa-pen-to-square me-2"></i>Edit Resume',
            '_rmBody',
            `<button onclick="_closeM('_rm','_rmBd')" style="padding:9px 22px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);cursor:pointer;font-weight:600;">Cancel</button>
             <button onclick="saveResume()" style="padding:9px 22px;background:linear-gradient(135deg,var(--accent),#0ea5e9);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;"><i class="fas fa-save me-1"></i>Save & Generate PDF</button>`
        );

        // Cover Letter modal
        makeModal('_cl','_clBd',
            '<i class="fas fa-file-alt me-2"></i>Edit Cover Letter',
            '_clBody',
            `<button onclick="_closeM('_cl','_clBd')" style="padding:9px 22px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);cursor:pointer;font-weight:600;">Cancel</button>
             <button onclick="saveCoverLetter()" style="padding:9px 22px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;"><i class="fas fa-save me-1"></i>Save & Generate PDF</button>`,
            800
        );

        const clBody = document.getElementById('_clBody');
        if (clBody) {
            clBody.innerHTML = `
                <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-dim);margin-bottom:6px;">
                    <i class="fas fa-info-circle me-1"></i> Plain text. Line breaks are preserved in the PDF.
                </label>
                <textarea id="_clTA" class="_i" style="min-height:420px;font-family:monospace;font-size:0.875rem;line-height:1.7;" placeholder="Your cover letter..."></textarea>`;
        }

        // ESC key closes any open modal
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                window._closeM('_rm','_rmBd');
                window._closeM('_cl','_clBd');
                window._cancelAuth && window._cancelAuth();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', setup);

})();

