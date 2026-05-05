/**
 * app.js — Resume Web App Core
 * Data is embedded directly to support file:// (no server required).
 * Handles: data loading, UI rendering, theme/color-picker, session persistence.
 */
(function () {
    'use strict';

    /* ===================== EMBEDDED DEFAULT DATA =====================
     * This is the source-of-truth default. Any saved edits in
     * localStorage take priority over this at runtime.
     * ================================================================ */
    const DEFAULT_DATA = {
        "personalInfo": {
            "name": "Christopher Lee Cajes",
            "title": "Senior Software Developer",
            "email": "clcajes@gmail.com",
            "phone": "+63 968 581 6796",
            "location": "Philippines",
            "wfh": "Open to Permanent WFH",
            "linkedin": "https://www.linkedin.com/in/christopher-lee-cajes-b063962b6/"
        },
        "summary": "Senior Software Developer with 8+ years of professional experience specializing in C#, ASP.NET Core (Web & API), WinForms, and SQL Server-based systems. Strong background in building enterprise and financial applications, developing secure REST APIs, and supporting business-critical systems. Proven ability to work effectively in structured teams and remote environments, with a focus on code quality, system stability, and positive work culture.",
        "skills": {
            "primaryStack": [
                "C#", "ASP.NET Core (Web & API)", "ASP.NET MVC / .NET Framework",
                "WinForms (Desktop)", "PHP Laravel", "Python", "Django", "Ruby",
                "Ruby on Rails", "C++", "TypeScript", "Java Spring Boot",
                "Java & GUI Development", "Node.js", "RESTful API Design",
                "Entity Framework", "Class Library Development", "Console Applications"
            ],
            "databases": [
                "SQL Server", "MySQL", "PostgreSQL", "Oracle DB", "SQLite",
                "Git / Source Control", "Visual Studio / VS Code", "Postman",
                "Blue Prism (RPA)", "Xcode (Swift)"
            ],
            "frontend": [
                "HTML / CSS", "Bootstrap", "Tailwind CSS", "JavaScript / jQuery",
                "TypeScript", "Vue.js", "AngularJS", "React JS (Working Knowledge)",
                "Node.js", "Android Studio (Java)", "Mobile UI/UX Implementation",
                "REST API Integration"
            ],
            "multimedia": [
                "Unity 3D", "Unreal Engine", "Autodesk Maya", "Blender", "Adobe Photoshop"
            ]
        },
        "experience": [
            {
                "position": "Systems Analyst II | Rizal Commercial Banking Corporation (RCBC)",
                "duration": "Nov 2025 – Feb 2026",
                "location": "Taguig City",
                "duties": [
                    "Developed and maintained ASP.NET Core Web applications supporting internal banking systems.",
                    "Built and enhanced C# console applications for internal automation and system support.",
                    "Collaborated with analysts and developers to ensure system reliability and compliance."
                ]
            },
            {
                "position": "Programmer / Analyst | Vertere Global Solutions Inc.",
                "duration": "Apr 2025 – Oct 2025",
                "location": "Taguig City",
                "duties": [
                    "Developed ASP.NET Core Web applications and APIs for business clients.",
                    "Participated in system analysis, implementation, and support of production applications.",
                    "Ensured clean code practices and proper data handling using SQL Server."
                ]
            },
            {
                "position": "Full Stack Web Developer | Quantrics Enterprises Inc.",
                "duration": "Nov 2023 – Feb 2025",
                "location": "Taytay, Rizal",
                "duties": [
                    "Developed web applications using ASP.NET Core API and React JS.",
                    "Implemented REST APIs consumed by frontend applications."
                ]
            },
            {
                "position": "Web Developer | Quantrics Enterprises Inc.",
                "duration": "Dec 2021 – Oct 2023",
                "location": "Taytay, Rizal",
                "duties": [
                    "Designed and developed responsive websites using HTML, CSS, Bootstrap, JavaScript, and jQuery.",
                    "Maintained and enhanced existing systems based on business requirements."
                ]
            },
            {
                "position": "Application Developer | Quantrics Enterprises Inc.",
                "duration": "Nov 2018 – Nov 2021",
                "location": "Taytay, Rizal",
                "duties": [
                    "Developed ASP.NET Core APIs to support automation and internal tools.",
                    "Implemented Robotic Process Automation (RPA) solutions using Blue Prism.",
                    "Integrated APIs with business processes to improve operational efficiency."
                ]
            },
            {
                "position": "Software Developer | Capital Power Global, Ltd.",
                "duration": "May 2017 – Aug 2018",
                "location": "Makati City",
                "duties": [
                    "Developed ASP.NET (Framework & Core) Web Applications and Web APIs.",
                    "Created C# Class Libraries to support modular and reusable codebases.",
                    "Designed and managed databases using SQL Server."
                ]
            }
        ],
        "education": [
            {
                "degree": "Master of Information Technology (Systems Development)",
                "school": "Ateneo de Naga University | March 2017"
            },
            {
                "degree": "Bachelor of Science in Information Technology",
                "school": "Ateneo de Naga University | March 2015"
            }
        ],
        "projects": [
            {
                "title": "La-Fierce - Social Media Mobile App",
                "description": "Created a full-featured social media application using Android Studio. Developed a robust backend using C# API and SQL Server for data management.",
                "link": "https://chris654cajes.github.io/lafierce.github.io/",
                "linkText": "App Introduction (Website)"
            },
            {
                "title": "La-Fierce - Admin",
                "description": "Created a separate administrative interface for managing the La-Fierce famous successful people.",
                "link": "",
                "linkText": "Platform: Windows Forms C#, Android & Website"
            },
            {
                "title": "SariKart - Online Grocery Shopping Mobile App",
                "description": "Mobile application developed using Android Studio (Java). Backend powered by ASP.NET Web API for product and order management.",
                "link": "",
                "linkText": ""
            },
            {
                "title": "Student Enrollment System - Minds That Matter Learning Center",
                "description": "Desktop application developed using VB.NET / WinForms. Implemented student records management and enrollment workflows.",
                "link": "",
                "linkText": ""
            },
            {
                "title": "Other Android Applications",
                "description": "There are more Android applications developed.",
                "link": "",
                "linkText": "Technologies: Android Studio"
            },
            {
                "title": "My Created Applications Portfolio Website",
                "description": "",
                "link": "http://www.my-creative-apps.somee.com/",
                "linkText": "Website"
            }
        ],
        "strengths": "Fast learner, highly adaptable, creative problem-solver, self-motivated, wellness-conscious, and open to feedback.\n\nWork Preferences: Permanent Work from Home, Philippines-based or offshore remote roles, emphasis on work-life balance and positive team culture."
    };

    /* ===================== CONSTANTS ===================== */
    const STORAGE_KEYS = {
        RESUME: 'resumeData_v3',
        COVER_LETTER: 'coverLetterContent_v3',
        THEME_MODE: 'themeMode_v3',
        THEME_ACCENT: 'themeAccent_v3',
        THEME_RGB: 'themeRGB_v3'
    };

    /* ===================== STATE ===================== */
    let resumeData = null;

    /* ===================== HELPERS ===================== */
    function escHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    }

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r},${g},${b}`;
    }

    /* ===================== STORAGE ===================== */
    const Store = {
        get(key) {
            try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
            catch { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); return true; }
            catch { return false; }
        }
    };

    /* ===================== DATA LOADING =====================
     * No fetch() — works from file:// without a web server.
     * Priority: localStorage saved edits → embedded DEFAULT_DATA.
     * ========================================================= */
    function loadResumeData() {
        const saved = Store.get(STORAGE_KEYS.RESUME);
        resumeData = (saved && saved.personalInfo) ? saved : JSON.parse(JSON.stringify(DEFAULT_DATA));
        renderAll();
    }

    /* ===================== RENDERERS ===================== */
    function renderAll() {
        if (!resumeData) return;
        renderSidebar();
        renderSummary();
        renderSkills();
        renderExperience();
        renderProjects();
        renderEducation();
        renderStrengths();
        window.__resumeData = resumeData;
    }

    function renderSidebar() {
        const pi = resumeData.personalInfo || {};
        setText('sidebar-name', pi.name || '');
        setText('sidebar-title', pi.title || '');
        setText('contact-email-text', pi.email || '');
        setText('contact-phone-text', pi.phone || '');
        setText('contact-location-text', pi.location || '');
        setText('contact-wfh-text', pi.wfh || '');

        const emailEl = document.getElementById('contact-email');
        if (emailEl) emailEl.href = 'mailto:' + (pi.email || '');

        const phoneEl = document.getElementById('contact-phone');
        if (phoneEl) phoneEl.href = 'tel:' + (pi.phone || '').replace(/\s/g, '');

        const linkedinEl = document.getElementById('contact-linkedin');
        if (linkedinEl) linkedinEl.href = pi.linkedin || '#';
    }

    function renderSummary() {
        setText('summary-content', resumeData.summary || '');
    }

    function renderSkills() {
        const skills = resumeData.skills || {};
        const map = {
            'skills-primaryStack': skills.primaryStack,
            'skills-databases':    skills.databases,
            'skills-frontend':     skills.frontend,
            'skills-multimedia':   skills.multimedia
        };
        for (const [id, arr] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el && Array.isArray(arr)) {
                el.innerHTML = arr.map(s => `<span class="skill-badge">${escHtml(s)}</span>`).join('');
            }
        }
    }

    function renderExperience() {
        const list = document.getElementById('experience-list');
        if (!list || !Array.isArray(resumeData.experience)) return;
        list.innerHTML = resumeData.experience.map(exp => `
            <div class="exp-item">
                <div class="d-flex justify-content-between flex-wrap">
                    <h6 class="fw-bold mb-0">${escHtml(exp.position)}</h6>
                    <span class="small text-accent">${escHtml(exp.duration)}</span>
                </div>
                <p class="small text-dim mb-2">${escHtml(exp.location)}</p>
                <ul class="small">
                    ${(exp.duties || []).map(d => `<li>${escHtml(d)}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }

    function renderProjects() {
        const list = document.getElementById('projects-list');
        if (!list || !Array.isArray(resumeData.projects)) return;
        list.innerHTML = resumeData.projects.map(p => `
            <div class="col-md-6">
                <h6 class="fw-bold mb-1">${escHtml(p.title)}</h6>
                <p class="small text-dim mb-2">${escHtml(p.description)}</p>
                ${p.link
                    ? `<a href="${escHtml(p.link)}" target="_blank" rel="noopener" class="text-accent small text-decoration-none">
                        ${escHtml(p.linkText || 'View Project')} <i class="fas fa-external-link-alt ms-1"></i>
                       </a>`
                    : (p.linkText ? `<p class="small text-dim mb-0">${escHtml(p.linkText)}</p>` : '')}
            </div>
        `).join('');
    }

    function renderEducation() {
        const list = document.getElementById('education-list');
        if (!list || !Array.isArray(resumeData.education)) return;
        list.innerHTML = resumeData.education.map(edu => `
            <div class="mb-3">
                <h6 class="fw-bold mb-1">${escHtml(edu.degree)}</h6>
                <p class="small text-accent mb-0">${escHtml(edu.school)}</p>
            </div>
        `).join('');
    }

    function renderStrengths() {
        const el = document.getElementById('strengths-content');
        if (!el) return;
        el.innerHTML = escHtml(resumeData.strengths || '').replace(/\n/g, '<br>');
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /* ===================== THEME SYSTEM ===================== */
    function applyAccent(hex, rgb) {
        document.documentElement.style.setProperty('--accent', hex);
        document.documentElement.style.setProperty('--accent-rgb', rgb);
    }

    function applyMode(mode) {
        document.body.setAttribute('data-theme', mode);
    }

    function setActiveThemeDot(dotEl) {
        document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
        if (dotEl) dotEl.classList.add('active');
    }

    function initTheme() {
        const savedMode   = Store.get(STORAGE_KEYS.THEME_MODE)   || 'dark';
        const savedAccent = Store.get(STORAGE_KEYS.THEME_ACCENT)  || '#38bdf8';
        const savedRgb    = Store.get(STORAGE_KEYS.THEME_RGB)     || '56,189,248';

        applyMode(savedMode);
        applyAccent(savedAccent, savedRgb);

        const picker = document.getElementById('customColorPicker');
        if (picker) picker.value = savedAccent;

        const matchingDot = document.querySelector(`.theme-dot[data-accent="${savedAccent}"]`);
        if (matchingDot) setActiveThemeDot(matchingDot);

        // Preset dot clicks
        const grid = document.getElementById('themeGrid');
        if (grid) {
            grid.addEventListener('click', function (e) {
                const dot = e.target.closest('.theme-dot');
                if (!dot) return;

                if (dot.dataset.mode) {
                    applyMode(dot.dataset.mode);
                    Store.set(STORAGE_KEYS.THEME_MODE, dot.dataset.mode);
                    setActiveThemeDot(dot);
                    return;
                }

                if (dot.dataset.accent) {
                    const hex = dot.dataset.accent;
                    const rgb = dot.dataset.rgb;
                    applyAccent(hex, rgb);
                    Store.set(STORAGE_KEYS.THEME_ACCENT, hex);
                    Store.set(STORAGE_KEYS.THEME_RGB, rgb);
                    if (picker) picker.value = hex;
                    setActiveThemeDot(dot);
                }
            });
        }

        // Custom color picker
        if (picker) {
            picker.addEventListener('input', function () {
                const hex = picker.value;
                const rgb = hexToRgb(hex);
                applyAccent(hex, rgb);
                Store.set(STORAGE_KEYS.THEME_ACCENT, hex);
                Store.set(STORAGE_KEYS.THEME_RGB, rgb);
                document.querySelectorAll('.theme-dot[data-accent]').forEach(d => d.classList.remove('active'));
            });
        }
    }

    /* ===================== PUBLIC API ===================== */
    window.AppCore = {
        getResumeData()           { return resumeData; },
        setResumeData(data)       { resumeData = data; renderAll(); Store.set(STORAGE_KEYS.RESUME, data); },
        resetToDefault()          { Store.set(STORAGE_KEYS.RESUME, null); resumeData = JSON.parse(JSON.stringify(DEFAULT_DATA)); renderAll(); },
        getCoverLetterContent()   { return Store.get(STORAGE_KEYS.COVER_LETTER); },
        saveCoverLetterContent(t) { Store.set(STORAGE_KEYS.COVER_LETTER, t); },
        escHtml,
        renderAll
    };

    /* ===================== BOOT ===================== */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        loadResumeData();
    });

})();
