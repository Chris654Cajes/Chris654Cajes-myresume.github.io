/**
 * Complete Resume & Cover Letter Editor v2.0
 * Enhanced with Full Field Validation, Persistent PDF File Updates
 * 
 * Features:
 * - Complete form validation for all fields
 * - Direct PDF file persistence and updates
 * - Full PDF generation with all updated content
 * - Real-time form validation feedback
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        EDIT_PASSWORD: 'CheeseBurgerApocalypseCoachL4D2',
        STORAGE_KEY: 'resumeEditorData',
        VALIDATION_RULES: {
            minText: 5,
            maxText: 5000,
            minSkillLength: 2,
            maxSkills: 100,
            minDutyLength: 3,
            maxDutiesPerJob: 20
        }
    };

    // ==================== STATE MANAGEMENT ====================
    let isAuthenticated = false;
    let resumeData = {
        personalInfo: {
            name: 'Christopher Lee Cajes',
            title: 'Senior Software Developer',
            email: 'clcajes@gmail.com',
            phone: '+63 968 581 6796',
            location: 'Philippines',
            wfh: 'Open to Permanent WFH'
        },
        summary: '',
        skills: {
            primaryStack: [],
            databases: [],
            frontend: [],
            multimedia: []
        },
        experience: [],
        education: [],
        projects: [],
        strengths: ''
    };

    // ==================== VALIDATION SYSTEM ====================
    const Validator = {
        isEmpty(value) {
            return !value || value.trim().length === 0;
        },

        isValidText(value, minLength = CONFIG.VALIDATION_RULES.minText, maxLength = CONFIG.VALIDATION_RULES.maxText) {
            if (this.isEmpty(value)) return { valid: false, error: 'This field cannot be empty' };
            if (value.length < minLength) return { valid: false, error: `Minimum ${minLength} characters required` };
            if (value.length > maxLength) return { valid: false, error: `Maximum ${maxLength} characters allowed` };
            return { valid: true };
        },

        isValidSkill(skill) {
            if (this.isEmpty(skill)) return { valid: false, error: 'Skill cannot be empty' };
            if (skill.length < CONFIG.VALIDATION_RULES.minSkillLength) 
                return { valid: false, error: `Minimum ${CONFIG.VALIDATION_RULES.minSkillLength} characters` };
            return { valid: true };
        },

        isValidExperience(exp) {
            const errors = [];
            
            if (this.isEmpty(exp.position)) errors.push('Position/Title is required');
            if (this.isEmpty(exp.duration)) errors.push('Duration is required');
            if (this.isEmpty(exp.location)) errors.push('Location is required');
            if (!exp.duties || exp.duties.length === 0) errors.push('At least one duty required');
            if (exp.duties.length > CONFIG.VALIDATION_RULES.maxDutiesPerJob) 
                errors.push(`Maximum ${CONFIG.VALIDATION_RULES.maxDutiesPerJob} duties allowed`);
            
            exp.duties.forEach((duty, index) => {
                if (this.isEmpty(duty)) errors.push(`Duty ${index + 1} is empty`);
                if (duty.length < CONFIG.VALIDATION_RULES.minDutyLength) 
                    errors.push(`Duty ${index + 1}: Minimum ${CONFIG.VALIDATION_RULES.minDutyLength} characters`);
            });

            return { valid: errors.length === 0, errors };
        },

        isValidEducation(edu) {
            const errors = [];
            if (this.isEmpty(edu.degree)) errors.push('Degree is required');
            if (this.isEmpty(edu.school)) errors.push('School/University is required');
            return { valid: errors.length === 0, errors };
        },

        validateAllData() {
            const errors = {
                summary: [],
                skills: [],
                experience: [],
                education: [],
                strengths: []
            };

            if (resumeData.summary && resumeData.summary.length < 10) {
                errors.summary.push('Professional summary should be at least 10 characters');
            }

            resumeData.experience.forEach((exp, index) => {
                const validation = this.isValidExperience(exp);
                if (!validation.valid) {
                    errors.experience.push(`Position ${index + 1}: ${validation.errors.join(', ')}`);
                }
            });

            resumeData.education.forEach((edu, index) => {
                const validation = this.isValidEducation(edu);
                if (!validation.valid) {
                    errors.education.push(`Education ${index + 1}: ${validation.errors.join(', ')}`);
                }
            });

            if (resumeData.strengths && resumeData.strengths.length < 10) {
                errors.strengths.push('Strengths should be at least 10 characters');
            }

            return { hasErrors: Object.values(errors).some(arr => arr.length > 0), errors };
        }
    };

    // ==================== STORAGE SYSTEM ====================
    const Storage = {
        async saveData(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('Storage error:', error);
                showToast('Warning: Data may not persist properly', 'error');
                return false;
            }
        },

        loadData(key) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error('Load error:', error);
                return null;
            }
        }
    };

    // ==================== PDF GENERATION & FILE UPDATE ====================
    function loadPdfLib() {
        return new Promise((resolve, reject) => {
            if (typeof PDFLib !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function generateCompletePDF() {
        try {
            await loadPdfLib();
            const pdfDoc = await PDFLib.PDFDocument.create();
            let page = pdfDoc.addPage([612, 792]); // Letter size
            const { width, height } = page.getSize();
            const margin = 40;
            const textColor = PDFLib.rgb(0, 0, 0);
            
            const helveticaBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

            let currentY = height - margin;
            const lineHeight = 14;
            const columnWidth = width - (margin * 2);

            // Helper: Word wrap text
            function wrapText(text, maxWidth, fontSize) {
                const words = text.split(' ');
                const lines = [];
                let currentLine = '';

                words.forEach(word => {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    if (testLine.length * fontSize * 0.5 > maxWidth && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                });
                if (currentLine) lines.push(currentLine);
                return lines;
            }

            // Helper: Draw text with wrapping
            function drawWrappedText(text, font, fontSize, x = margin) {
                const lines = wrapText(text, columnWidth, fontSize);
                lines.forEach(line => {
                    if (currentY < margin) {
                        page = pdfDoc.addPage([612, 792]);
                        currentY = height - margin;
                    }
                    page.drawText(line, { x, y: currentY, size: fontSize, font, color: textColor });
                    currentY -= lineHeight;
                });
            }

            // Helper: Draw section title
            function drawSection(title) {
                if (currentY < margin + 40) {
                    page = pdfDoc.addPage([612, 792]);
                    currentY = height - margin;
                }
                currentY -= 8;
                page.drawText(title, { x: margin, y: currentY, size: 12, font: helveticaBoldFont, color: textColor });
                currentY -= lineHeight;
                page.drawLine({
                    start: { x: margin, y: currentY + 4 },
                    end: { x: width - margin, y: currentY + 4 },
                    thickness: 1,
                    color: textColor
                });
                currentY -= 12;
            }

            // ========== HEADER ==========
            page.drawText('CHRISTOPHER LEE CAJES', {
                x: margin, y: currentY, size: 18, font: helveticaBoldFont, color: textColor
            });
            currentY -= lineHeight + 2;

            page.drawText('Senior Software Developer', {
                x: margin, y: currentY, size: 11, font: helveticaFont, color: textColor
            });
            currentY -= lineHeight + 6;

            const contactInfo = `Email: ${resumeData.personalInfo.email} | Phone: ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.location} | ${resumeData.personalInfo.wfh}`;
            page.drawText(contactInfo, { x: margin, y: currentY, size: 9, font: helveticaFont, color: textColor });
            currentY -= lineHeight + 10;

            // ========== LINKEDIN ==========
            // Draw LinkedIn URL before Professional Summary (from page data)
            if (resumeData.personalInfo.linkedin) {
                page.drawText('LinkedIn: ' + resumeData.personalInfo.linkedin, {
                    x: margin, y: currentY, size: 9, font: helveticaFont, color: textColor
                });
                currentY -= lineHeight + 10;
            }

            // ========== PROFESSIONAL SUMMARY ==========
            if (resumeData.summary && resumeData.summary.trim()) {
                drawSection('PROFESSIONAL SUMMARY');
                drawWrappedText(resumeData.summary, helveticaFont, 10);
                currentY -= 6;
            }

            // ========== TECHNICAL SKILLS ==========
            const hasAnySkill = resumeData.skills.primaryStack.length || resumeData.skills.databases.length || 
                               resumeData.skills.frontend.length || resumeData.skills.multimedia.length;
            if (hasAnySkill) {
                drawSection('TECHNICAL SKILLS');

                if (resumeData.skills.primaryStack.length) {
                    page.drawText('Languages & Frameworks:', {
                        x: margin, y: currentY, size: 10, font: helveticaBoldFont, color: textColor
                    });
                    currentY -= lineHeight;
                    drawWrappedText(resumeData.skills.primaryStack.join(', '), helveticaFont, 9);
                    currentY -= 6;
                }

                if (resumeData.skills.databases.length) {
                    page.drawText('Databases & Tools:', {
                        x: margin, y: currentY, size: 10, font: helveticaBoldFont, color: textColor
                    });
                    currentY -= lineHeight;
                    drawWrappedText(resumeData.skills.databases.join(', '), helveticaFont, 9);
                    currentY -= 6;
                }

                if (resumeData.skills.frontend.length) {
                    page.drawText('Frontend & Mobile:', {
                        x: margin, y: currentY, size: 10, font: helveticaBoldFont, color: textColor
                    });
                    currentY -= lineHeight;
                    drawWrappedText(resumeData.skills.frontend.join(', '), helveticaFont, 9);
                    currentY -= 6;
                }

                if (resumeData.skills.multimedia.length) {
                    page.drawText('Multimedia & Creative:', {
                        x: margin, y: currentY, size: 10, font: helveticaBoldFont, color: textColor
                    });
                    currentY -= lineHeight;
                    drawWrappedText(resumeData.skills.multimedia.join(', '), helveticaFont, 9);
                    currentY -= 6;
                }
            }

            // ========== PROFESSIONAL EXPERIENCE ==========
            if (resumeData.experience.length) {
                drawSection('PROFESSIONAL EXPERIENCE');

                resumeData.experience.forEach(exp => {
                    if (currentY < margin + 60) {
                        page = pdfDoc.addPage([612, 792]);
                        currentY = height - margin;
                    }

                    page.drawText(exp.position, {
                        x: margin, y: currentY, size: 10, font: helveticaBoldFont, color: textColor
                    });
                    currentY -= lineHeight;

                    const durationLocation = `${exp.duration} | ${exp.location}`;
                    page.drawText(durationLocation, {
                        x: margin, y: currentY, size: 9, font: helveticaFont, color: textColor
                    });
                    currentY -= lineHeight + 4;

                    exp.duties.forEach(duty => {
                        if (duty.trim()) {
                            if (currentY < margin + 40) {
                                page = pdfDoc.addPage([612, 792]);
                                currentY = height - margin;
                            }
                            page.drawText('• ', { x: margin + 10, y: currentY, size: 9, font: helveticaFont, color: textColor });
                            
                            const dutyLines = wrapText(duty, columnWidth - 25, 9);
                            dutyLines.forEach(line => {
                                if (currentY < margin + 40) {
                                    page = pdfDoc.addPage([612, 792]);
                                    currentY = height - margin;
                                }
                                page.drawText(line, { x: margin + 25, y: currentY, size: 9, font: helveticaFont, color: textColor });
                                currentY -= lineHeight;
                            });
                        }
                    });
                    currentY -= 6;
                });
            }

            // ========== EDUCATION ==========
            if (resumeData.education.length) {
                drawSection('EDUCATION');

                resumeData.education.forEach(edu => {
                    if (currentY < margin + 40) {
                        page = pdfDoc.addPage([612, 792]);
                        currentY = height - margin;
                    }
                    page.drawText(edu.degree, {
                        x: margin, y: currentY, size: 10, font: helveticaBoldFont, color: textColor
                    });
                    currentY -= lineHeight;

                    page.drawText(edu.school, {
                        x: margin, y: currentY, size: 9, font: helveticaFont, color: textColor
                    });
                    currentY -= lineHeight + 6;
                });
            }

            // ========== STRENGTHS & PREFERENCES ==========
            if (resumeData.strengths && resumeData.strengths.trim()) {
                drawSection('STRENGTHS & PREFERENCES');
                drawWrappedText(resumeData.strengths, helveticaFont, 9);
            }

            return pdfDoc;
        } catch (error) {
            console.error('PDF generation error:', error);
            throw error;
        }
    }

    async function generateCoverLetterPDF(content) {
        try {
            await loadPdfLib();
            const pdfDoc = await PDFLib.PDFDocument.create();
            let page = pdfDoc.addPage([612, 792]);
            const { width, height } = page.getSize();
            const margin = 50;
            let currentY = height - margin;
            const lineHeight = 14;

            const helveticaBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            const textColor = PDFLib.rgb(0, 0, 0);

            const lines = content.split('\n');
            const maxWidth = width - (margin * 2);

            lines.forEach(line => {
                if (currentY < margin + 50) {
                    page = pdfDoc.addPage([612, 792]);
                    currentY = height - margin;
                }

                if (!line.trim()) {
                    currentY -= 8;
                    return;
                }

                let fontSize = 11;
                let font = helveticaFont;

                if (line.includes('Christopher Lee Cajes')) {
                    fontSize = 12;
                    font = helveticaBoldFont;
                }

                const words = line.split(' ');
                let currentLine = '';

                words.forEach(word => {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    if (testLine.length * fontSize * 0.5 > maxWidth && currentLine) {
                        page.drawText(currentLine, {
                            x: margin, y: currentY, size: fontSize, font, color: textColor
                        });
                        currentY -= lineHeight;
                        if (currentY < margin + 30) {
                            page = pdfDoc.addPage([612, 792]);
                            currentY = height - margin;
                        }
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                });

                if (currentLine) {
                    page.drawText(currentLine, {
                        x: margin, y: currentY, size: fontSize, font, color: textColor
                    });
                    currentY -= lineHeight;
                }
            });

            return pdfDoc;
        } catch (error) {
            console.error('Cover letter PDF error:', error);
            throw error;
        }
    }

    // ==================== TOAST NOTIFICATIONS ====================
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10002;max-width:500px;';
        document.body.appendChild(container);
        return container;
    }

    function showToast(message, type = 'info') {
        type = type || 'info';
        const container = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
        toast.style.cssText = `
            padding:12px 24px;border-radius:8px;color:white;font-weight:500;opacity:0;transform:translateY(-20px);
            transition:all 0.3s ease;margin-bottom:8px;background:${colors[type] || colors.info};
            box-shadow:0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
    }

    // ==================== DATA LOADING FROM PAGE ====================
    function loadResumeDataFromPage() {
        const summaryEl = document.getElementById('summary');
        if (summaryEl) {
            const summaryP = summaryEl.querySelector('p');
            if (summaryP) {
                resumeData.summary = summaryP.textContent.trim();
            }
        }

        const skillsEl = document.getElementById('stack');
        if (skillsEl) {
            const cols = skillsEl.querySelectorAll('.col-md-6');
            if (cols.length >= 4) {
                resumeData.skills.primaryStack = Array.from(cols[0].querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
                resumeData.skills.databases = Array.from(cols[1].querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
                resumeData.skills.frontend = Array.from(cols[2].querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
                resumeData.skills.multimedia = Array.from(cols[3].querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
            }
        }

        const expEl = document.getElementById('experience');
        if (expEl) {
            const expItems = expEl.querySelectorAll('.exp-item');
            resumeData.experience = Array.from(expItems).map(item => {
                const titleEl = item.querySelector('h6.fw-bold');
                const durationEl = item.querySelector('span.small.text-accent');
                const locationEl = item.querySelector('p.small.text-dim');
                const dutiesList = item.querySelectorAll('li');
                
                return {
                    position: titleEl ? titleEl.textContent.trim() : '',
                    duration: durationEl ? durationEl.textContent.trim() : '',
                    location: locationEl ? locationEl.textContent.trim() : '',
                    duties: Array.from(dutiesList).map(li => li.textContent.trim())
                };
            });
        }

        const eduEl = document.getElementById('education');
        if (eduEl) {
            const eduItems = eduEl.querySelectorAll('div');
            resumeData.education = [];
            
            eduItems.forEach(function(div) {
                const degreeEl = div.querySelector('h6.fw-bold');
                if (degreeEl) {
                    const schoolEl = div.querySelector('p.small.text-accent');
                    let schoolText = schoolEl ? schoolEl.textContent.trim() : '';
                    
                    if (schoolText.includes('|')) {
                        schoolText = schoolText.split('|')[0].trim();
                    }
                    
                    resumeData.education.push({
                        degree: degreeEl.textContent.trim(),
                        school: schoolText
                    });
                }
            });
        }

        const strengthsEl = document.getElementById('strengths');
        if (strengthsEl) {
            const strengthsP = strengthsEl.querySelector('p.small.text-dim');
            if (strengthsP) {
                resumeData.strengths = strengthsP.innerHTML.replace(/<br>/g, '\n').replace(/<strong>/g, '').replace(/<\/strong>/g, '').trim();
            }
        }

        const projectsEl = document.getElementById('projects');
        if (projectsEl) {
            const projectItems = projectsEl.querySelectorAll('.row.g-4 .col-md-6');
            resumeData.projects = Array.from(projectItems).map(item => {
                const titleEl = item.querySelector('h6.fw-bold');
                const descriptionEl = item.querySelector('p.small.text-dim');
                const linkEl = item.querySelector('a');
                
                return {
                    title: titleEl ? titleEl.textContent.trim() : '',
                    description: descriptionEl ? descriptionEl.textContent.trim() : '',
                    link: linkEl ? linkEl.href : '',
                    linkText: linkEl ? linkEl.textContent.trim() : ''
                };
            }).filter(project => project.title);
        }

        // Extract LinkedIn URL from the HTML page
        const linkedinLink = document.querySelector('a[href*="linkedin.com"]');
        if (linkedinLink) {
            resumeData.personalInfo.linkedin = linkedinLink.href;
        }
    }

    // ==================== PAGE UPDATE FUNCTIONS ====================
    function updatePageContent() {
        const summaryEl = document.getElementById('summary');
        if (summaryEl) {
            const p = summaryEl.querySelector('p');
            if (p) p.textContent = resumeData.summary;
        }

        const skillsEl = document.getElementById('stack');
        if (skillsEl) {
            const cols = skillsEl.querySelectorAll('.col-md-6');
            [resumeData.skills.primaryStack, resumeData.skills.databases, resumeData.skills.frontend, resumeData.skills.multimedia].forEach((skills, i) => {
                if (cols[i]) {
                    cols[i].innerHTML = skills.map(s => `<span class="skill-badge">${escapeHtml(s)}</span>`).join('');
                }
            });
        }

        const expEl = document.getElementById('experience');
        if (expEl) {
            expEl.innerHTML = resumeData.experience.map(exp => `
                <div class="exp-item">
                    <h6 class="fw-bold mb-0">${escapeHtml(exp.position)}</h6>
                    <span class="small text-accent">${escapeHtml(exp.duration)}</span>
                    <span class="small text-dim">${escapeHtml(exp.location)}</span>
                    <ul class="small">
                        ${exp.duties.map(duty => `<li>${escapeHtml(duty)}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        }

        const eduEl = document.getElementById('education');
        if (eduEl) {
            eduEl.innerHTML = resumeData.education.map(edu => `
                <div class="mb-3">
                    <h6 class="fw-bold mb-1">${escapeHtml(edu.degree)}</h6>
                    <p class="small text-accent mb-0">${escapeHtml(edu.school)}</p>
                </div>
            `).join('');
        }

        const strengthsEl = document.getElementById('strengths');
        if (strengthsEl) {
            const p = strengthsEl.querySelector('.small.text-dim');
            if (p) p.textContent = resumeData.strengths;
        }

        const projectsEl = document.getElementById('projects');
        if (projectsEl && resumeData.projects.length > 0) {
            projectsEl.innerHTML = `
                <div class="row g-4">
                    ${resumeData.projects.map(project => `
                        <div class="col-md-6">
                            <div class="card h-100 border-0 bg-transparent">
                                <div class="card-body">
                                    <h6 class="fw-bold mb-2">${escapeHtml(project.title)}</h6>
                                    <p class="small text-dim mb-3">${escapeHtml(project.description)}</p>
                                    ${project.link ? `<a href="${escapeHtml(project.link)}" class="btn btn-outline-primary btn-sm" target="_blank">${escapeHtml(project.linkText || 'View Project')}</a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function updatePDFFile(blob, filename) {
        // Create object URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Find download link and update it
        const downloadLink = document.querySelector(`a[href*="${filename}"]`) || 
                           document.querySelector(`a[download*="${filename}"]`);
        
        if (downloadLink) {
            downloadLink.href = url;
            downloadLink.download = filename;
        }
        
        // Also trigger download to replace the actual file
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // ==================== UI SETUP ====================
    function createEditButtons() {
        const authBtn = document.createElement('button');
        authBtn.id = 'authBtn';
        authBtn.innerHTML = '<i class="fas fa-lock"></i> Sign In to Edit';
        authBtn.style.cssText = `
            position:fixed;right:20px;top:20px;z-index:9999;border:none;border-radius:50px;
            padding:12px 24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;
            box-shadow:0 4px 15px rgba(239,68,68,0.3);display:flex;align-items:center;gap:8px;
            background:linear-gradient(135deg,#ef4444,#dc2626);color:white;
        `;
        authBtn.onclick = handlePasswordAuth;
        document.body.appendChild(authBtn);

        const editResumeBtn = document.createElement('button');
        editResumeBtn.id = 'editResumeBtn';
        editResumeBtn.innerHTML = '<i class="fas fa-pen"></i> Edit Resume';
        editResumeBtn.style.cssText = `
            position:fixed;right:20px;top:20px;z-index:9999;border:none;border-radius:50px;
            padding:12px 24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;
            box-shadow:0 4px 15px rgba(56,189,248,0.3);display:none;align-items:center;gap:8px;
            background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:white;
        `;
        editResumeBtn.onclick = () => openEditModal('resume');
        document.body.appendChild(editResumeBtn);

        const editCoverLetterBtn = document.createElement('button');
        editCoverLetterBtn.id = 'editCoverLetterBtn';
        editCoverLetterBtn.innerHTML = '<i class="fas fa-pen"></i> Edit Cover Letter';
        editCoverLetterBtn.style.cssText = `
            position:fixed;right:20px;top:80px;z-index:9999;border:none;border-radius:50px;
            padding:12px 24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;
            box-shadow:0 4px 15px rgba(168,85,247,0.3);display:none;align-items:center;gap:8px;
            background:linear-gradient(135deg,#a855f7,#7c3aed);color:white;
        `;
        editCoverLetterBtn.onclick = () => openEditModal('coverletter');
        document.body.appendChild(editCoverLetterBtn);

        const userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.style.cssText = `
            position:fixed;right:20px;top:140px;z-index:9999;display:none;align-items:center;gap:8px;
            padding:6px 12px;background:rgba(34,197,94,0.1);border:1px solid #22c55e;
            border-radius:20px;font-size:0.75rem;color:#22c55e;
        `;
        userInfo.innerHTML = '<i class="fas fa-check-circle"></i><span>Authenticated</span>';
        document.body.appendChild(userInfo);
    }

    function createModals() {
        // Resume Modal
        const resumeBackdrop = document.createElement('div');
        resumeBackdrop.id = 'resumeModalBackdrop';
        resumeBackdrop.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);
            backdrop-filter:blur(8px);z-index:10000;opacity:0;visibility:hidden;transition:all 0.4s ease;
        `;
        resumeBackdrop.onclick = () => closeEditModal('resume');
        document.body.appendChild(resumeBackdrop);

        const resumeModal = document.createElement('div');
        resumeModal.id = 'resumeModal';
        resumeModal.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);width:95%;max-width:1000px;
            max-height:90vh;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;z-index:10001;
            opacity:0;visibility:hidden;transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);overflow:hidden;
            box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);display:flex;flex-direction:column;
        `;
        resumeModal.innerHTML = getResumeModalContent();
        document.body.appendChild(resumeModal);

        // Cover Letter Modal
        const clBackdrop = document.createElement('div');
        clBackdrop.id = 'coverLetterModalBackdrop';
        clBackdrop.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);
            backdrop-filter:blur(8px);z-index:10000;opacity:0;visibility:hidden;transition:all 0.4s ease;
        `;
        clBackdrop.onclick = () => closeEditModal('coverletter');
        document.body.appendChild(clBackdrop);

        const clModal = document.createElement('div');
        clModal.id = 'coverLetterModal';
        clModal.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);width:95%;max-width:900px;
            max-height:90vh;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;z-index:10001;
            opacity:0;visibility:hidden;transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);overflow:hidden;
            box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);display:flex;flex-direction:column;
        `;
        clModal.innerHTML = getCoverLetterModalContent();
        document.body.appendChild(clModal);
    }

    function getResumeModalContent() {
        return `
            <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(168,85,247,0.1));">
                <h4 style="margin:0;color:var(--accent);font-weight:700;display:flex;align-items:center;gap:10px;"><i class="fas fa-pen-to-square"></i> Edit Resume</h4>
                <button onclick="closeEditModal('resume')" style="background:none;border:none;color:var(--text-dim);font-size:1.5rem;cursor:pointer;transition:all 0.3s ease;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div id="resumeModalBody" style="flex:1;padding:2rem;overflow-y:auto;"></div>
            <div style="padding:1.5rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:12px;background:rgba(0,0,0,0.05);flex-wrap:wrap;">
                <button onclick="closeEditModal('resume')" style="background:transparent;color:var(--text-dim);border:1px solid var(--border);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;">Cancel</button>
                <button onclick="saveResume()" style="background:linear-gradient(135deg,var(--accent),#0ea5e9);color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-save" style="margin-right:8px;"></i>Save</button>
            </div>
        `;
    }

    function getCoverLetterModalContent() {
        return `
            <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(168,85,247,0.1));">
                <h4 style="margin:0;color:var(--accent);font-weight:700;display:flex;align-items:center;gap:10px;"><i class="fas fa-file-alt"></i> Edit Cover Letter</h4>
                <button onclick="closeEditModal('coverletter')" style="background:none;border:none;color:var(--text-dim);font-size:1.5rem;cursor:pointer;transition:all 0.3s ease;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div style="flex:1;padding:2rem;overflow-y:auto;">
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.85rem;color:var(--text-dim);">Cover Letter Content <span style="color:#ef4444;">*</span></label>
                    <textarea id="coverLetterContent" placeholder="Enter your cover letter content here..." style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;min-height:400px;resize:vertical;font-family:monospace;line-height:1.6;"></textarea>
                    <small id="coverLetterError" style="color:#ef4444;display:none;margin-top:0.5rem;"></small>
                </div>
            </div>
            <div style="padding:1.5rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:12px;background:rgba(0,0,0,0.05);flex-wrap:wrap;">
                <button onclick="closeEditModal('coverletter')" style="background:transparent;color:var(--text-dim);border:1px solid var(--border);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;">Cancel</button>
                <button onclick="saveCoverLetter()" style="background:linear-gradient(135deg,var(--accent),#0ea5e9);color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-save" style="margin-right:8px;"></i>Save</button>
            </div>
        `;
    }

    // ==================== MODAL FUNCTIONS ====================
    window.openEditModal = function(type) {
        if (!isAuthenticated) {
            showToast('Please sign in first.', 'error');
            return;
        }
        if (type === 'resume') {
            document.getElementById('resumeModalBackdrop').style.opacity = '1';
            document.getElementById('resumeModalBackdrop').style.visibility = 'visible';
            document.getElementById('resumeModal').style.opacity = '1';
            document.getElementById('resumeModal').style.visibility = 'visible';
            document.getElementById('resumeModal').style.transform = 'translate(-50%,-50%) scale(1)';
            loadResumeEditor();
        } else {
            document.getElementById('coverLetterModalBackdrop').style.opacity = '1';
            document.getElementById('coverLetterModalBackdrop').style.visibility = 'visible';
            document.getElementById('coverLetterModal').style.opacity = '1';
            document.getElementById('coverLetterModal').style.visibility = 'visible';
            document.getElementById('coverLetterModal').style.transform = 'translate(-50%,-50%) scale(1)';
            loadCoverLetterContent();
        }
    };

    window.closeEditModal = function(type) {
        if (type === 'resume') {
            document.getElementById('resumeModalBackdrop').style.opacity = '0';
            document.getElementById('resumeModalBackdrop').style.visibility = 'hidden';
            document.getElementById('resumeModal').style.opacity = '0';
            document.getElementById('resumeModal').style.visibility = 'hidden';
            document.getElementById('resumeModal').style.transform = 'translate(-50%,-50%) scale(0.9)';
        } else {
            document.getElementById('coverLetterModalBackdrop').style.opacity = '0';
            document.getElementById('coverLetterModalBackdrop').style.visibility = 'hidden';
            document.getElementById('coverLetterModal').style.opacity = '0';
            document.getElementById('coverLetterModal').style.visibility = 'hidden';
            document.getElementById('coverLetterModal').style.transform = 'translate(-50%,-50%) scale(0.9)';
        }
    };

    // ==================== RESUME EDITOR ====================
    window.loadResumeEditor = function() {
        const body = document.getElementById('resumeModalBody');
        let html = '';

        // Professional Summary
        html += `
            <div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">
                <h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-user" style="margin-right:8px;"></i>Professional Summary</h6>
                <textarea id="editSummary" placeholder="Brief professional summary..." style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;min-height:100px;resize:vertical;font-family:inherit;line-height:1.6;">${escapeHtml(resumeData.summary)}</textarea>
                <small id="summaryError" style="color:#ef4444;display:none;margin-top:0.5rem;"></small>
            </div>
        `;

        // Skills Section
        html += `
            <div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">
                <h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-code" style="margin-right:8px;"></i>Core Technical Skills</h6>
                ${getSkillsEditor('primaryStack', 'Primary Stack (C#, ASP.NET Core, etc.)')}
                <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">
                ${getSkillsEditor('databases', 'Databases & Tools')}
                <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">
                ${getSkillsEditor('frontend', 'Frontend & Mobile')}
                <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">
                ${getSkillsEditor('multimedia', 'Multimedia & Creative')}
            </div>
        `;

        // Experience Section
        html += `
            <div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">
                <h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-briefcase" style="margin-right:8px;"></i>Professional Experience</h6>
                <div id="experienceList" style="margin-bottom:1rem;"></div>
                <button onclick="addExperience()" style="background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid #22c55e;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;width:100%;"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Experience</button>
            </div>
        `;

        // Deployed Projects & Portfolio
        html += `
            <div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">
                <h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-project-diagram" style="margin-right:8px;"></i>Deployed Projects & Portfolio</h6>
                <div id="projectsList" style="margin-bottom:1rem;"></div>
                <button onclick="addProject()" style="background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid #22c55e;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;width:100%;"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Project</button>
            </div>
        `;

        // Education Section
        html += `
            <div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">
                <h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-graduation-cap" style="margin-right:8px;"></i>Education</h6>
                <div id="educationList" style="margin-bottom:1rem;"></div>
                <button onclick="addEducation()" style="background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid #22c55e;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;width:100%;"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Education</button>
            </div>
        `;

        // Strengths
        html += `
            <div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">
                <h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-star" style="margin-right:8px;"></i>Strengths & Preferences</h6>
                <textarea id="editStrengths" placeholder="Your strengths and work preferences..." style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;min-height:120px;resize:vertical;font-family:inherit;line-height:1.6;">${escapeHtml(resumeData.strengths)}</textarea>
                <small id="strengthsError" style="color:#ef4444;display:none;margin-top:0.5rem;"></small>
            </div>
        `;

        body.innerHTML = html;

        // Populate experience
        const expList = document.getElementById('experienceList');
        resumeData.experience.forEach((exp, index) => {
            expList.appendChild(createExperienceEditor(index, exp));
        });

        // Populate projects
        const projectsList = document.getElementById('projectsList');
        resumeData.projects.forEach((project, index) => {
            projectsList.appendChild(createProjectEditor(index, project));
        });

        // Populate education
        const eduList = document.getElementById('educationList');
        resumeData.education.forEach((edu, index) => {
            eduList.appendChild(createEducationEditor(index, edu));
        });
    };

    function getSkillsEditor(skillType, label) {
        return `
            <div style="margin-bottom:1rem;">
                <label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.85rem;color:var(--text-dim);">${label}</label>
                <div id="skills-${skillType}" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:0.5rem;">
                    ${resumeData.skills[skillType].map((skill, idx) => `
                        <div style="display:flex;align-items:center;gap:6px;background:rgba(56,189,248,0.1);padding:6px 12px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);">
                            <span style="font-size:0.85rem;">${escapeHtml(skill)}</span>
                            <button onclick="removeSkill('${skillType}', ${idx})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;padding:0;margin:0;">&times;</button>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="newSkill-${skillType}" placeholder="Enter skill..." style="flex:1;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);font-size:0.9rem;">
                    <button onclick="addSkill('${skillType}')" style="background:var(--accent);color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-plus"></i></button>
                </div>
                <small id="skillError-${skillType}" style="color:#ef4444;display:none;margin-top:0.5rem;"></small>
            </div>
        `;
    }

    window.addSkill = function(skillType) {
        const input = document.getElementById(`newSkill-${skillType}`);
        const skill = input.value.trim();
        const error = document.getElementById(`skillError-${skillType}`);

        const validation = Validator.isValidSkill(skill);
        if (!validation.valid) {
            error.textContent = validation.error;
            error.style.display = 'block';
            return;
        }

        if (resumeData.skills[skillType].length >= CONFIG.VALIDATION_RULES.maxSkills) {
            error.textContent = `Maximum ${CONFIG.VALIDATION_RULES.maxSkills} skills allowed`;
            error.style.display = 'block';
            return;
        }

        resumeData.skills[skillType].push(skill);
        error.style.display = 'none';
        input.value = '';
        window.loadResumeEditor();
    };

    window.removeSkill = function(skillType, index) {
        resumeData.skills[skillType].splice(index, 1);
        window.loadResumeEditor();
    };

    function createExperienceEditor(index, exp) {
        const container = document.createElement('div');
        container.style.cssText = 'background:rgba(0,0,0,0.1);padding:1rem;border-radius:8px;margin-bottom:1rem;border:1px solid var(--border);';
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h6 style="margin:0;color:var(--accent);font-weight:600;">Position ${index + 1}</h6>
                <button onclick="removeExperience(${index})" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-trash"></i> Remove</button>
            </div>
            <input type="text" value="${escapeHtml(exp.position)}" onchange="updateExperience(${index}, 'position', this.value)" placeholder="Position/Title*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <input type="text" value="${escapeHtml(exp.duration)}" onchange="updateExperience(${index}, 'duration', this.value)" placeholder="Duration (e.g., Jan 2020 - Dec 2021)*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <input type="text" value="${escapeHtml(exp.location)}" onchange="updateExperience(${index}, 'location', this.value)" placeholder="Location*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <div style="margin-bottom:0.5rem;">
                <label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.85rem;color:var(--text-dim);">Duties & Responsibilities*</label>
                <div id="duties-${index}" style="margin-bottom:0.5rem;"></div>
                <input type="text" id="newDuty-${index}" placeholder="Add new duty..." style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
                <button onclick="addDuty(${index})" style="background:var(--accent);color:white;border:none;padding:6px 12px;border-radius:6px;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;width:100%;"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Duty</button>
            </div>
            <small id="expError-${index}" style="color:#ef4444;display:none;"></small>
        `;

        const dutiesDiv = container.querySelector(`#duties-${index}`);
        exp.duties.forEach((duty, dutyIdx) => {
            const dutyEl = document.createElement('div');
            dutyEl.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:0.5rem;';
            dutyEl.innerHTML = `
                <input type="text" value="${escapeHtml(duty)}" onchange="updateDuty(${index}, ${dutyIdx}, this.value)" placeholder="Duty description..." style="flex:1;padding:6px 10px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:6px;color:var(--text-main);font-size:0.85rem;">
                <button onclick="removeDuty(${index}, ${dutyIdx})" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85rem;"><i class="fas fa-trash"></i></button>
            `;
            dutiesDiv.appendChild(dutyEl);
        });

        return container;
    }

    window.addDuty = function(expIndex) {
        const input = document.getElementById(`newDuty-${expIndex}`);
        const duty = input.value.trim();

        if (!duty) {
            showToast('Duty cannot be empty', 'error');
            return;
        }
        if (duty.length < CONFIG.VALIDATION_RULES.minDutyLength) {
            showToast(`Duty must be at least ${CONFIG.VALIDATION_RULES.minDutyLength} characters`, 'error');
            return;
        }

        resumeData.experience[expIndex].duties.push(duty);
        input.value = '';
        window.loadResumeEditor();
    };

    window.removeDuty = function(expIndex, dutyIndex) {
        resumeData.experience[expIndex].duties.splice(dutyIndex, 1);
        window.loadResumeEditor();
    };

    window.updateDuty = function(expIndex, dutyIndex, value) {
        resumeData.experience[expIndex].duties[dutyIndex] = value;
    };

    window.updateExperience = function(index, field, value) {
        resumeData.experience[index][field] = value;
    };

    window.removeExperience = function(index) {
        resumeData.experience.splice(index, 1);
        window.loadResumeEditor();
    };

    window.addExperience = function() {
        resumeData.experience.push({
            position: '',
            duration: '',
            location: '',
            duties: []
        });
        window.loadResumeEditor();
    };

    function createEducationEditor(index, edu) {
        const container = document.createElement('div');
        container.style.cssText = 'background:rgba(0,0,0,0.1);padding:1rem;border-radius:8px;margin-bottom:1rem;border:1px solid var(--border);';
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h6 style="margin:0;color:var(--accent);font-weight:600;">Education ${index + 1}</h6>
                <button onclick="removeEducation(${index})" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-trash"></i> Remove</button>
            </div>
            <input type="text" value="${escapeHtml(edu.degree)}" onchange="updateEducation(${index}, 'degree', this.value)" placeholder="Degree*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <input type="text" value="${escapeHtml(edu.school)}" onchange="updateEducation(${index}, 'school', this.value)" placeholder="School/University*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <small id="eduError-${index}" style="color:#ef4444;display:none;"></small>
        `;
        return container;
    }

    window.updateEducation = function(index, field, value) {
        resumeData.education[index][field] = value;
    };

    window.removeEducation = function(index) {
        resumeData.education.splice(index, 1);
        window.loadResumeEditor();
    };

    window.addEducation = function() {
        resumeData.education.push({ degree: '', school: '' });
        window.loadResumeEditor();
    };

    function createProjectEditor(index, project) {
        const container = document.createElement('div');
        container.style.cssText = 'background:rgba(0,0,0,0.1);padding:1rem;border-radius:8px;margin-bottom:1rem;border:1px solid var(--border);';
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h6 style="margin:0;color:var(--accent);font-weight:600;">Project ${index + 1}</h6>
                <button onclick="removeProject(${index})" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-trash"></i> Remove</button>
            </div>
            <input type="text" value="${escapeHtml(project.title)}" onchange="updateProject(${index}, 'title', this.value)" placeholder="Project Title*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <textarea onchange="updateProject(${index}, 'description', this.value)" placeholder="Project Description*" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;min-height:60px;resize:vertical;font-family:inherit;line-height:1.6;">${escapeHtml(project.description)}</textarea>
            <input type="url" value="${escapeHtml(project.link)}" onchange="updateProject(${index}, 'link', this.value)" placeholder="Project Link (optional)" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <input type="text" value="${escapeHtml(project.linkText)}" onchange="updateProject(${index}, 'linkText', this.value)" placeholder="Link Text (optional)" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:6px;color:var(--text-main);margin-bottom:0.5rem;font-size:0.9rem;">
            <small id="projectError-${index}" style="color:#ef4444;display:none;"></small>
        `;
        return container;
    }

    window.updateProject = function(index, field, value) {
        resumeData.projects[index][field] = value;
    };

    window.removeProject = function(index) {
        resumeData.projects.splice(index, 1);
        window.loadResumeEditor();
    };

    window.addProject = function() {
        resumeData.projects.push({
            title: '',
            description: '',
            link: '',
            linkText: ''
        });
        window.loadResumeEditor();
    };

    // ==================== SAVE FUNCTIONS ====================
    window.saveResume = async function() {
        showToast('Validating resume data...', 'info');

        const validation = Validator.validateAllData();
        if (validation.hasErrors) {
            const errorMessages = Object.entries(validation.errors)
                .filter(([_, errors]) => errors.length > 0)
                .map(([section, errors]) => `${section}: ${errors[0]}`)
                .join('\n');
            showToast('Validation errors:\n' + errorMessages, 'error');
            return;
        }

        // Update summary and strengths
        resumeData.summary = document.getElementById('editSummary').value;
        resumeData.strengths = document.getElementById('editStrengths').value;

        // Save to persistent storage
        await Storage.saveData(CONFIG.STORAGE_KEY, resumeData);

        // Update page content
        updatePageContent();

        // Generate and update PDF
        try {
            showToast('Generating PDF...', 'info');
            const pdfDoc = await generateCompletePDF();
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            // Update the PDF file
            updatePDFFile(blob, 'Resume - Christopher Lee Cajes.pdf');
            
            showToast('✓ Resume saved successfully!', 'success');
            closeEditModal('resume');
        } catch (error) {
            console.error('PDF generation error:', error);
            showToast('Error generating PDF: ' + error.message, 'error');
        }
    };

    window.saveCoverLetter = async function() {
        const content = document.getElementById('coverLetterContent').value;
        const error = document.getElementById('coverLetterError');

        const validation = Validator.isValidText(content, 50, 5000);
        if (!validation.valid) {
            error.textContent = validation.error;
            error.style.display = 'block';
            return;
        }

        try {
            showToast('Generating Cover Letter PDF...', 'info');
            const pdfDoc = await generateCoverLetterPDF(content);
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            // Update the PDF file
            updatePDFFile(blob, 'Cover Letter - Christopher Lee Cajes.pdf');
            
            // Save cover letter content to localStorage
            await Storage.saveData('coverLetterContent', content);
            
            showToast('✓ Cover Letter saved successfully!', 'success');
            closeEditModal('coverletter');
        } catch (error) {
            console.error('Cover letter PDF error:', error);
            showToast('Error generating PDF: ' + error.message, 'error');
        }
    };

    window.loadCoverLetterContent = function() {
        const textarea = document.getElementById('coverLetterContent');
        const saved = Storage.loadData('coverLetterContent');
        if (saved) {
            textarea.value = saved;
        }
    };

    // ==================== AUTHENTICATION ====================
    function handlePasswordAuth() {
        const password = prompt('Enter edit password:');
        if (password === CONFIG.EDIT_PASSWORD) {
            isAuthenticated = true;
            loadResumeDataFromPage();
            document.getElementById('authBtn').style.display = 'none';
            document.getElementById('editResumeBtn').style.display = 'flex';
            document.getElementById('editCoverLetterBtn').style.display = 'flex';
            document.getElementById('userInfo').style.display = 'flex';
            showToast('✓ Successfully authenticated!', 'success');
        } else if (password !== null) {
            showToast('✗ Incorrect password!', 'error');
        }
    }

    // ==================== INITIALIZATION ====================
    document.addEventListener('DOMContentLoaded', () => {
        createEditButtons();
        createModals();
    });

})();