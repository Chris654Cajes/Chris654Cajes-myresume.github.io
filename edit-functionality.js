/**
 * Complete Resume & Cover Letter Editor
 * Professional PDF Generation with Full Editing Capabilities
 * 
 * IMPORTANT: Change the PASSWORD below to your own secure password!
 */

(function() {
    'use strict';

    // Configuration
    var EDIT_PASSWORD = 'CheeseBurgerApocalypseCoachL4D2';
    var isAuthenticated = false;

    // Resume data structure
    var resumeData = {
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
        strengths: ''
    };

    // Load pdf-lib library dynamically
    function loadPdfLib() {
        return new Promise(function(resolve, reject) {
            if (typeof PDFLib !== 'undefined') {
                resolve();
                return;
            }
            var script = document.createElement('script');
            script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Toast notification function
    function showToast(message, type) {
        type = type || 'info';
        var container = document.getElementById('toastContainer') || createToastContainer();
        var toast = document.createElement('div');
        var colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
        toast.style.cssText = 'padding:12px 24px;border-radius:8px;color:white;font-weight:500;opacity:0;transform:translateY(-20px);transition:all 0.3s ease;margin-bottom:8px;background:' + (colors[type] || colors.info);
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
        setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 3000);
    }

    function createToastContainer() {
        var container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10002;';
        document.body.appendChild(container);
        return container;
    }

    // Load resume data from page
    function loadResumeDataFromPage() {
        // Summary
        var summaryEl = document.getElementById('summary');
        if (summaryEl) {
            resumeData.summary = summaryEl.querySelector('p').textContent.trim();
        }

        // Skills
        var skillsEl = document.getElementById('stack');
        if (skillsEl) {
            var badges = skillsEl.querySelectorAll('.skill-badge');
            var primaryStackDiv = skillsEl.querySelectorAll('.col-md-6')[0];
            var databasesDiv = skillsEl.querySelectorAll('.col-md-6')[1];
            var frontendDiv = skillsEl.querySelectorAll('.col-md-6')[2];
            var multimediaDiv = skillsEl.querySelectorAll('.col-md-6')[3];

            if (primaryStackDiv) {
                resumeData.skills.primaryStack = Array.from(primaryStackDiv.querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
            }
            if (databasesDiv) {
                resumeData.skills.databases = Array.from(databasesDiv.querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
            }
            if (frontendDiv) {
                resumeData.skills.frontend = Array.from(frontendDiv.querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
            }
            if (multimediaDiv) {
                resumeData.skills.multimedia = Array.from(multimediaDiv.querySelectorAll('.skill-badge')).map(b => b.textContent.trim());
            }
        }

        // Experience
        var expEl = document.getElementById('experience');
        if (expEl) {
            var expItems = expEl.querySelectorAll('.exp-item');
            resumeData.experience = Array.from(expItems).map(function(item) {
                var title = item.querySelector('h6');
                var duration = item.querySelector('.small.text-accent');
                var location = item.querySelector('.small.text-dim');
                var duties = item.querySelectorAll('li');

                return {
                    position: title ? title.textContent.trim() : '',
                    duration: duration ? duration.textContent.trim() : '',
                    location: location ? location.textContent.trim() : '',
                    duties: Array.from(duties).map(li => li.textContent.trim())
                };
            });
        }

        // Education
        var eduEl = document.getElementById('education');
        if (eduEl) {
            var eduItems = eduEl.querySelectorAll('.mb-3');
            resumeData.education = Array.from(eduItems).map(function(item) {
                var degree = item.querySelector('h6');
                var school = item.querySelector('.text-accent');
                return {
                    degree: degree ? degree.textContent.trim() : '',
                    school: school ? school.textContent.trim() : ''
                };
            }).filter(e => e.degree);
        }

        // Strengths
        var strengthsEl = document.getElementById('strengths');
        if (strengthsEl) {
            resumeData.strengths = strengthsEl.querySelector('.small.text-dim').textContent.trim();
        }
    }

    // Create edit buttons
    function createEditButtons() {
        var authBtn = document.createElement('button');
        authBtn.id = 'authBtn';
        authBtn.innerHTML = '<i class="fas fa-lock"></i> Sign In to Edit';
        authBtn.style.cssText = 'position:fixed;right:20px;top:20px;z-index:9999;border:none;border-radius:50px;padding:12px 24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(239,68,68,0.3);display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;';
        authBtn.onclick = handlePasswordAuth;
        document.body.appendChild(authBtn);

        var editResumeBtn = document.createElement('button');
        editResumeBtn.id = 'editResumeBtn';
        editResumeBtn.innerHTML = '<i class="fas fa-pen"></i> Edit Resume';
        editResumeBtn.style.cssText = 'position:fixed;right:20px;top:20px;z-index:9999;border:none;border-radius:50px;padding:12px 24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(56,189,248,0.3);display:none;align-items:center;gap:8px;background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:white;';
        editResumeBtn.onclick = function() { openEditModal('resume'); };
        document.body.appendChild(editResumeBtn);

        var editCoverLetterBtn = document.createElement('button');
        editCoverLetterBtn.id = 'editCoverLetterBtn';
        editCoverLetterBtn.innerHTML = '<i class="fas fa-pen"></i> Edit Cover Letter';
        editCoverLetterBtn.style.cssText = 'position:fixed;right:20px;top:80px;z-index:9999;border:none;border-radius:50px;padding:12px 24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(168,85,247,0.3);display:none;align-items:center;gap:8px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:white;';
        editCoverLetterBtn.onclick = function() { openEditModal('coverletter'); };
        document.body.appendChild(editCoverLetterBtn);

        var userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.style.cssText = 'position:fixed;right:20px;top:140px;z-index:9999;display:none;align-items:center;gap:8px;padding:6px 12px;background:rgba(34,197,94,0.1);border:1px solid #22c55e;border-radius:20px;font-size:0.75rem;color:#22c55e;';
        userInfo.innerHTML = '<i class="fas fa-check-circle"></i><span>Authenticated</span>';
        document.body.appendChild(userInfo);
    }

    // Create modals
    function createModals() {
        var resumeBackdrop = document.createElement('div');
        resumeBackdrop.id = 'resumeModalBackdrop';
        resumeBackdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:10000;opacity:0;visibility:hidden;transition:all 0.4s ease;';
        resumeBackdrop.onclick = function() { closeEditModal('resume'); };
        document.body.appendChild(resumeBackdrop);

        var resumeModal = document.createElement('div');
        resumeModal.id = 'resumeModal';
        resumeModal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);width:95%;max-width:1000px;max-height:90vh;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;z-index:10001;opacity:0;visibility:hidden;transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
        resumeModal.innerHTML = getResumeModalContent();
        document.body.appendChild(resumeModal);

        var clBackdrop = document.createElement('div');
        clBackdrop.id = 'coverLetterModalBackdrop';
        clBackdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:10000;opacity:0;visibility:hidden;transition:all 0.4s ease;';
        clBackdrop.onclick = function() { closeEditModal('coverletter'); };
        document.body.appendChild(clBackdrop);

        var clModal = document.createElement('div');
        clModal.id = 'coverLetterModal';
        clModal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);width:95%;max-width:900px;max-height:90vh;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;z-index:10001;opacity:0;visibility:hidden;transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
        clModal.innerHTML = getCoverLetterModalContent();
        document.body.appendChild(clModal);
    }

    function getResumeModalContent() {
        return '<div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(168,85,247,0.1));">' +
            '<h4 style="margin:0;color:var(--accent);font-weight:700;display:flex;align-items:center;gap:10px;"><i class="fas fa-pen-to-square"></i> Edit Resume</h4>' +
            '<button onclick="closeEditModal(\'resume\')" style="background:none;border:none;color:var(--text-dim);font-size:1.5rem;cursor:pointer;transition:all 0.3s ease;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>' +
            '</div>' +
            '<div id="resumeModalBody" style="flex:1;padding:2rem;overflow-y:auto;"></div>' +
            '<div style="padding:1.5rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:12px;background:rgba(0,0,0,0.05);">' +
            '<button onclick="closeEditModal(\'resume\')" style="background:transparent;color:var(--text-dim);border:1px solid var(--border);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;">Cancel</button>' +
            '<button onclick="saveResume()" style="background:linear-gradient(135deg,var(--accent),#0ea5e9);color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-save" style="margin-right:8px;"></i>Save</button>' +
            '</div>';
    }

    function getCoverLetterModalContent() {
        return '<div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(168,85,247,0.1));">' +
            '<h4 style="margin:0;color:var(--accent);font-weight:700;display:flex;align-items:center;gap:10px;"><i class="fas fa-file-alt"></i> Edit Cover Letter</h4>' +
            '<button onclick="closeEditModal(\'coverletter\')" style="background:none;border:none;color:var(--text-dim);font-size:1.5rem;cursor:pointer;transition:all 0.3s ease;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>' +
            '</div>' +
            '<div style="flex:1;padding:2rem;overflow-y:auto;">' +
            '<div style="margin-bottom:1.5rem;">' +
            '<label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.85rem;color:var(--text-dim);">Cover Letter Content</label>' +
            '<textarea id="coverLetterContent" style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;min-height:400px;resize:vertical;font-family:monospace;line-height:1.6;"></textarea>' +
            '</div></div>' +
            '<div style="padding:1.5rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:12px;background:rgba(0,0,0,0.05);">' +
            '<button onclick="closeEditModal(\'coverletter\')" style="background:transparent;color:var(--text-dim);border:1px solid var(--border);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;">Cancel</button>' +
            '<button onclick="saveCoverLetter()" style="background:linear-gradient(135deg,var(--accent),#0ea5e9);color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.3s ease;"><i class="fas fa-save" style="margin-right:8px;"></i>Save</button>' +
            '</div>';
    }

    // Password authentication
    function handlePasswordAuth() {
        var password = prompt('Enter edit password:');
        if (password === EDIT_PASSWORD) {
            isAuthenticated = true;
            loadResumeDataFromPage();
            document.getElementById('authBtn').style.display = 'none';
            document.getElementById('editResumeBtn').style.display = 'flex';
            document.getElementById('editCoverLetterBtn').style.display = 'flex';
            document.getElementById('userInfo').style.display = 'flex';
            showToast('Successfully authenticated!', 'success');
        } else if (password !== null) {
            showToast('Incorrect password!', 'error');
        }
    }

    // Modal functions
    window.openEditModal = function(type) {
        if (!isAuthenticated) { showToast('Please sign in first.', 'error'); return; }
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

    window.loadResumeEditor = function() {
        var body = document.getElementById('resumeModalBody');
        var html = '';

        // Professional Summary
        html += '<div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">' +
            '<h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-user" style="margin-right:8px;"></i>Professional Summary</h6>' +
            '<textarea id="editSummary" style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;min-height:100px;resize:vertical;font-family:inherit;line-height:1.6;">' + escapeHtml(resumeData.summary) + '</textarea>' +
            '</div>';

        // Skills Section
        html += '<div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">' +
            '<h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-code" style="margin-right:8px;"></i>Core Technical Skills</h6>' +
            getSkillsEditor('primaryStack', 'Primary Stack (C#, ASP.NET Core, etc.)') +
            '<hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">' +
            getSkillsEditor('databases', 'Databases & Tools') +
            '<hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">' +
            getSkillsEditor('frontend', 'Frontend & Mobile') +
            '<hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">' +
            getSkillsEditor('multimedia', 'Multimedia & Creative') +
            '</div>';

        // Experience Section
        html += '<div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">' +
            '<h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-briefcase" style="margin-right:8px;"></i>Professional Experience</h6>' +
            '<div id="experienceList">' + getExperienceEditor() + '</div>' +
            '<button onclick="addExperience()" style="background:var(--accent);color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;margin-top:1rem;font-size:0.85rem;"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Experience</button>' +
            '</div>';

        // Education Section
        html += '<div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">' +
            '<h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-graduation-cap" style="margin-right:8px;"></i>Education</h6>' +
            '<div id="educationList">' + getEducationEditor() + '</div>' +
            '<button onclick="addEducation()" style="background:var(--accent);color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;margin-top:1rem;font-size:0.85rem;"><i class="fas fa-plus" style="margin-right:6px;"></i>Add Education</button>' +
            '</div>';

        // Strengths
        html += '<div style="margin-bottom:2rem;padding:1.5rem;background:rgba(0,0,0,0.05);border-radius:12px;border:1px solid var(--border);">' +
            '<h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-star" style="margin-right:8px;"></i>Strengths & Preferences</h6>' +
            '<textarea id="editStrengths" style="width:100%;padding:10px 14px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:0.9rem;min-height:100px;resize:vertical;font-family:inherit;line-height:1.6;">' + escapeHtml(resumeData.strengths) + '</textarea>' +
            '</div>';

        body.innerHTML = html;
    };

    window.addExperience = function() {
        resumeData.experience.push({
            position: '',
            duration: '',
            location: '',
            duties: ['']
        });
        document.getElementById('experienceList').innerHTML = getExperienceEditor();
    };

    window.addEducation = function() {
        resumeData.education.push({
            degree: '',
            school: ''
        });
        document.getElementById('educationList').innerHTML = getEducationEditor();
    };

    window.removeExperience = function(index) {
        resumeData.experience.splice(index, 1);
        document.getElementById('experienceList').innerHTML = getExperienceEditor();
    };

    window.removeEducation = function(index) {
        resumeData.education.splice(index, 1);
        document.getElementById('educationList').innerHTML = getEducationEditor();
    };

    window.addDuty = function(expIndex) {
        resumeData.experience[expIndex].duties.push('');
        document.getElementById('experienceList').innerHTML = getExperienceEditor();
    };

    window.removeDuty = function(expIndex, dutyIndex) {
        resumeData.experience[expIndex].duties.splice(dutyIndex, 1);
        document.getElementById('experienceList').innerHTML = getExperienceEditor();
    };

    window.updateExperienceField = function(index, field, value) {
        resumeData.experience[index][field] = value;
    };

    window.updateExperienceDuty = function(expIndex, dutyIndex, value) {
        resumeData.experience[expIndex].duties[dutyIndex] = value;
    };

    window.updateEducationField = function(index, field, value) {
        resumeData.education[index][field] = value;
    };

    window.addSkill = function(category) {
        resumeData.skills[category].push('');
        var html = getSkillsEditor(category, getCategoryLabel(category));
        var allSkillsHtml = '';
        var categories = ['primaryStack', 'databases', 'frontend', 'multimedia'];
        var skillsDiv = document.querySelector('[id^="skills_"]').parentElement.parentElement;

        categories.forEach(function(cat, idx) {
            allSkillsHtml += getSkillsEditor(cat, getCategoryLabel(cat));
            if (idx < categories.length - 1) {
                allSkillsHtml += '<hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">';
            }
        });
        skillsDiv.innerHTML = allSkillsHtml;
    };

    window.removeSkill = function(category, index) {
        resumeData.skills[category].splice(index, 1);
        var html = getSkillsEditor(category, getCategoryLabel(category));
        var categories = ['primaryStack', 'databases', 'frontend', 'multimedia'];
        var allSkillsHtml = '';

        categories.forEach(function(cat, idx) {
            allSkillsHtml += getSkillsEditor(cat, getCategoryLabel(cat));
            if (idx < categories.length - 1) {
                allSkillsHtml += '<hr style="margin:1rem 0;border:none;border-top:1px solid var(--border);">';
            }
        });

        var skillsContainer = document.querySelector('h6').parentElement;
        var oldContent = skillsContainer.innerHTML;
        var startIdx = oldContent.indexOf('<h6');
        var endIdx = startIdx + '<h6 style="color:var(--accent);margin-bottom:1rem;font-weight:600;"><i class="fas fa-code" style="margin-right:8px;"></i>Core Technical Skills</h6>'.length;
        var beforeContent = oldContent.substring(0, endIdx);
        var afterIdx = oldContent.lastIndexOf('<button onclick="addExperience');
        var afterContent = oldContent.substring(afterIdx);
        
        skillsContainer.innerHTML = beforeContent + allSkillsHtml + afterContent;
    };

    window.updateSkill = function(category, index, value) {
        resumeData.skills[category][index] = value;
    };

    function getCategoryLabel(category) {
        var labels = {
            primaryStack: 'Primary Stack (C#, ASP.NET Core, etc.)',
            databases: 'Databases & Tools',
            frontend: 'Frontend & Mobile',
            multimedia: 'Multimedia & Creative'
        };
        return labels[category] || category;
    }

    function getSkillsEditor(category, label) {
        var html = '<div style="margin-bottom:1rem;">' +
            '<label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.85rem;color:var(--text-dim);">' + label + '</label>' +
            '<div id="skills_' + category + '" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:0.5rem;">';

        resumeData.skills[category].forEach(function(skill, idx) {
            html += '<div style="display:flex;gap:4px;align-items:center;">' +
                '<input type="text" value="' + escapeHtml(skill) + '" onchange="updateSkill(\'' + category + '\', ' + idx + ', this.value)" style="padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.85rem;flex:1;min-width:150px;">' +
                '<button onclick="removeSkill(\'' + category + '\', ' + idx + ')" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-trash"></i></button>' +
                '</div>';
        });

        html += '</div>' +
            '<button onclick="addSkill(\'' + category + '\')" style="background:var(--accent);color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-plus" style="margin-right:4px;"></i>Add Skill</button>' +
            '</div>';

        return html;
    }

    function getExperienceEditor() {
        var html = '';
        resumeData.experience.forEach(function(exp, idx) {
            html += '<div style="margin-bottom:1.5rem;padding:1rem;background:rgba(0,0,0,0.1);border-radius:8px;border:1px solid var(--border);">' +
                '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">' +
                '<h6 style="margin:0;color:var(--text-main);font-size:0.9rem;">Experience #' + (idx + 1) + '</h6>' +
                '<button onclick="removeExperience(' + idx + ')" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-trash"></i> Remove</button>' +
                '</div>' +
                '<div style="margin-bottom:0.8rem;">' +
                '<label style="display:block;margin-bottom:0.3rem;font-weight:500;font-size:0.8rem;color:var(--text-dim);">Position / Title</label>' +
                '<input type="text" value="' + escapeHtml(exp.position) + '" onchange="updateExperienceField(' + idx + ', \'position\', this.value)" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.9rem;">' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:0.8rem;">' +
                '<div>' +
                '<label style="display:block;margin-bottom:0.3rem;font-weight:500;font-size:0.8rem;color:var(--text-dim);">Duration (e.g. Nov 2025 – Feb 2026)</label>' +
                '<input type="text" value="' + escapeHtml(exp.duration) + '" onchange="updateExperienceField(' + idx + ', \'duration\', this.value)" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.9rem;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;margin-bottom:0.3rem;font-weight:500;font-size:0.8rem;color:var(--text-dim);">Location</label>' +
                '<input type="text" value="' + escapeHtml(exp.location) + '" onchange="updateExperienceField(' + idx + ', \'location\', this.value)" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.9rem;">' +
                '</div>' +
                '</div>' +
                '<div style="margin-bottom:0.8rem;">' +
                '<label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.8rem;color:var(--text-dim);">Duties & Achievements</label>' +
                '<div id="duties_' + idx + '" style="display:flex;flex-direction:column;gap:6px;margin-bottom:0.5rem;">';

            exp.duties.forEach(function(duty, dutyIdx) {
                html += '<div style="display:flex;gap:4px;align-items:flex-start;">' +
                    '<textarea onchange="updateExperienceDuty(' + idx + ', ' + dutyIdx + ', this.value)" style="flex:1;padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.85rem;min-height:50px;resize:vertical;font-family:inherit;">'+escapeHtml(duty)+'</textarea>' +
                    '<button onclick="removeDuty(' + idx + ', ' + dutyIdx + ')" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:0.8rem;margin-top:6px;white-space:nowrap;"><i class="fas fa-trash"></i></button>' +
                    '</div>';
            });

            html += '</div>' +
                '<button onclick="addDuty(' + idx + ')" style="background:var(--accent);color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-plus" style="margin-right:4px;"></i>Add Duty</button>' +
                '</div>' +
                '</div>';
        });
        return html;
    }

    function getEducationEditor() {
        var html = '';
        resumeData.education.forEach(function(edu, idx) {
            html += '<div style="margin-bottom:1rem;padding:1rem;background:rgba(0,0,0,0.1);border-radius:8px;border:1px solid var(--border);">' +
                '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.8rem;">' +
                '<h6 style="margin:0;color:var(--text-main);font-size:0.9rem;">Education #' + (idx + 1) + '</h6>' +
                '<button onclick="removeEducation(' + idx + ')" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-trash"></i> Remove</button>' +
                '</div>' +
                '<div style="margin-bottom:0.8rem;">' +
                '<label style="display:block;margin-bottom:0.3rem;font-weight:500;font-size:0.8rem;color:var(--text-dim);">Degree</label>' +
                '<input type="text" value="' + escapeHtml(edu.degree) + '" onchange="updateEducationField(' + idx + ', \'degree\', this.value)" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.9rem;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;margin-bottom:0.3rem;font-weight:500;font-size:0.8rem;color:var(--text-dim);">School / University</label>' +
                '<input type="text" value="' + escapeHtml(edu.school) + '" onchange="updateEducationField(' + idx + ', \'school\', this.value)" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:4px;color:var(--text-main);font-size:0.9rem;">' +
                '</div>' +
                '</div>';
        });
        return html;
    }

    window.loadCoverLetterContent = function() {
        var textarea = document.getElementById('coverLetterContent');
        textarea.value = 'Christopher Lee Cajes\nPhilippines\nclcajes@gmail.com | +63 968 581 6796\n\n[Date]\n\n[Hiring Manager]\n[Company Name]\n[Company Address]\n\nDear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Software Developer position at [Company Name]. With over 8 years of professional experience in C#, ASP.NET Core, and full-stack development, I am confident in my ability to contribute significantly to your development team and drive impactful results.\n\nThroughout my career, I have specialized in building enterprise-grade applications, developing secure REST APIs, and supporting business-critical systems. My expertise spans across multiple technologies including ASP.NET Core Web & API development, WinForms desktop applications, SQL Server database management, and modern frontend frameworks like React and Vue.js. I pride myself on maintaining high code quality standards, ensuring system stability, and fostering positive team collaboration.\n\nIn my current role at [Current Company], I have successfully developed and maintained numerous ASP.NET Core applications, implemented complex REST API solutions, and collaborated effectively with cross-functional teams to deliver robust solutions that meet client requirements. I am particularly passionate about clean code practices, continuous learning, and working in environments that emphasize work-life balance and positive culture.\n\nAs someone who is highly adaptable, a fast learner, and open to feedback, I am confident that my technical skills, problem-solving abilities, and dedication to excellence make me an excellent fit for your team. I am particularly interested in this opportunity because of [Company Name]\'s focus on [specific company details/mission], and I am excited about the possibility of contributing to such meaningful work.\n\nThank you for considering my application. I would welcome the opportunity to discuss how my background, skills, and enthusiasm can contribute to your team\'s success. Please feel free to contact me at clcajes@gmail.com or +63 968 581 6796.\n\nSincerely,\n\nChristopher Lee Cajes';
    };

    window.saveResume = function() {
        // Update page data
        document.getElementById('editSummary') && (resumeData.summary = document.getElementById('editSummary').value);
        document.getElementById('editStrengths') && (resumeData.strengths = document.getElementById('editStrengths').value);

        showToast('Generating professional resume PDF...', 'info');
        generateResumePDF();
        closeEditModal('resume');
    };

    window.saveCoverLetter = function() {
        showToast('Generating professional cover letter PDF...', 'info');
        var content = document.getElementById('coverLetterContent').value;
        generateCoverLetterPDF(content);
        closeEditModal('coverletter');
    };

    async function generateResumePDF() {
        try {
            await loadPdfLib();
            var pdfDoc = await PDFLib.PDFDocument.create();
            
            // Page setup
            var page = pdfDoc.addPage([612, 792]); // Letter size
            var { width, height } = page.getSize();
            var margin = 40;
            var accentColor = PDFLib.rgb(56, 189, 248);
            var textColor = PDFLib.rgb(0, 0, 0);
            var darkGray = PDFLib.rgb(60, 60, 60);
            var lightGray = PDFLib.rgb(120, 120, 120);

            // Embed fonts
            var timesRomanBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
            var timesRomanFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);

            var currentY = height - margin;
            var lineHeight = 14;
            var columnWidth = width - (margin * 2);

            // Helper functions
            function drawText(text, font, size, color, x, maxWidth) {
                x = x || margin;
                maxWidth = maxWidth || columnWidth;
                color = color || textColor;

                var words = text.split(' ');
                var line = '';
                var lines = [];

                words.forEach(function(word) {
                    var testLine = line + (line ? ' ' : '') + word;
                    if (testLine.length * size * 0.5 > maxWidth && line) {
                        lines.push(line);
                        line = word;
                    } else {
                        line = testLine;
                    }
                });
                if (line) lines.push(line);

                lines.forEach(function(l) {
                    if (currentY < margin) {
                        page = pdfDoc.addPage([612, 792]);
                        currentY = height - margin;
                    }
                    page.drawText(l, { x: x, y: currentY, size: size, font: font, color: color });
                    currentY -= lineHeight;
                });

                return currentY;
            }

            function drawSection(title) {
                if (currentY < margin + 40) {
                    page = pdfDoc.addPage([612, 792]);
                    currentY = height - margin;
                }
                currentY -= 8;
                page.drawText(title, { x: margin, y: currentY, size: 12, font: timesRomanBoldFont, color: accentColor });
                currentY -= lineHeight;
                page.drawLine({
                    start: { x: margin, y: currentY + 4 },
                    end: { x: width - margin, y: currentY + 4 },
                    thickness: 1,
                    color: PDFLib.rgb(200, 200, 200)
                });
                currentY -= 10;
            }

            // Header
            page.drawText('CHRISTOPHER LEE CAJES', {
                x: margin,
                y: currentY,
                size: 18,
                font: timesRomanBoldFont,
                color: accentColor
            });
            currentY -= lineHeight + 2;

            page.drawText('Senior Software Developer', {
                x: margin,
                y: currentY,
                size: 11,
                font: timesRomanFont,
                color: lightGray
            });
            currentY -= lineHeight + 8;

            // Contact Info
            var contactInfo = 'Email: clcajes@gmail.com | Phone: +63 968 581 6796 | Philippines | Open to Permanent WFH';
            page.drawText(contactInfo, {
                x: margin,
                y: currentY,
                size: 9,
                font: timesRomanFont,
                color: lightGray
            });
            currentY -= lineHeight + 8;

            // Professional Summary
            if (resumeData.summary) {
                drawSection('PROFESSIONAL SUMMARY');
                drawText(resumeData.summary, timesRomanFont, 10, darkGray);
                currentY -= 4;
            }

            // Skills
            var hasAnySkill = resumeData.skills.primaryStack.length || resumeData.skills.databases.length || 
                             resumeData.skills.frontend.length || resumeData.skills.multimedia.length;
            if (hasAnySkill) {
                drawSection('TECHNICAL SKILLS');

                if (resumeData.skills.primaryStack.length) {
                    page.drawText('Languages & Frameworks:', {
                        x: margin,
                        y: currentY,
                        size: 10,
                        font: timesRomanBoldFont,
                        color: darkGray
                    });
                    currentY -= lineHeight;
                    drawText(resumeData.skills.primaryStack.join(', '), timesRomanFont, 9, lightGray);
                    currentY -= 6;
                }

                if (resumeData.skills.databases.length) {
                    page.drawText('Databases & Tools:', {
                        x: margin,
                        y: currentY,
                        size: 10,
                        font: timesRomanBoldFont,
                        color: darkGray
                    });
                    currentY -= lineHeight;
                    drawText(resumeData.skills.databases.join(', '), timesRomanFont, 9, lightGray);
                    currentY -= 6;
                }

                if (resumeData.skills.frontend.length) {
                    page.drawText('Frontend & Mobile:', {
                        x: margin,
                        y: currentY,
                        size: 10,
                        font: timesRomanBoldFont,
                        color: darkGray
                    });
                    currentY -= lineHeight;
                    drawText(resumeData.skills.frontend.join(', '), timesRomanFont, 9, lightGray);
                    currentY -= 6;
                }

                if (resumeData.skills.multimedia.length) {
                    page.drawText('Multimedia & Creative:', {
                        x: margin,
                        y: currentY,
                        size: 10,
                        font: timesRomanBoldFont,
                        color: darkGray
                    });
                    currentY -= lineHeight;
                    drawText(resumeData.skills.multimedia.join(', '), timesRomanFont, 9, lightGray);
                    currentY -= 6;
                }
            }

            // Experience
            if (resumeData.experience.length) {
                drawSection('PROFESSIONAL EXPERIENCE');

                resumeData.experience.forEach(function(exp) {
                    if (currentY < margin + 80) {
                        page = pdfDoc.addPage([612, 792]);
                        currentY = height - margin;
                    }

                    page.drawText(exp.position, {
                        x: margin,
                        y: currentY,
                        size: 10,
                        font: timesRomanBoldFont,
                        color: darkGray
                    });
                    currentY -= lineHeight;

                    var durationLocation = exp.duration + (exp.location ? ' | ' + exp.location : '');
                    page.drawText(durationLocation, {
                        x: margin,
                        y: currentY,
                        size: 9,
                        font: timesRomanFont,
                        color: lightGray
                    });
                    currentY -= lineHeight + 4;

                    exp.duties.forEach(function(duty) {
                        if (duty.trim()) {
                            if (currentY < margin + 40) {
                                page = pdfDoc.addPage([612, 792]);
                                currentY = height - margin;
                            }
                            page.drawText('• ', { x: margin + 10, y: currentY, size: 9, font: timesRomanFont, color: darkGray });
                            var textX = margin + 25;
                            var maxDutyWidth = columnWidth - 25;
                            var words = duty.split(' ');
                            var line = '';
                            var lines = [];

                            words.forEach(function(word) {
                                var testLine = line + (line ? ' ' : '') + word;
                                if (testLine.length * 9 * 0.5 > maxDutyWidth && line) {
                                    lines.push(line);
                                    line = word;
                                } else {
                                    line = testLine;
                                }
                            });
                            if (line) lines.push(line);

                            lines.forEach(function(l) {
                                page.drawText(l, { x: textX, y: currentY, size: 9, font: timesRomanFont, color: darkGray });
                                currentY -= lineHeight;
                            });
                        }
                    });
                    currentY -= 6;
                });
            }

            // Education
            if (resumeData.education.length) {
                drawSection('EDUCATION');

                resumeData.education.forEach(function(edu) {
                    if (currentY < margin + 40) {
                        page = pdfDoc.addPage([612, 792]);
                        currentY = height - margin;
                    }
                    page.drawText(edu.degree, {
                        x: margin,
                        y: currentY,
                        size: 10,
                        font: timesRomanBoldFont,
                        color: darkGray
                    });
                    currentY -= lineHeight;

                    page.drawText(edu.school, {
                        x: margin,
                        y: currentY,
                        size: 9,
                        font: timesRomanFont,
                        color: lightGray
                    });
                    currentY -= lineHeight + 6;
                });
            }

            var pdfBytes = await pdfDoc.save();
            var blob = new Blob([pdfBytes], { type: 'application/pdf' });
            downloadFile(blob, 'Resume - Christopher Lee Cajes.pdf');
            showToast('Resume PDF saved successfully!', 'success');
        } catch (error) {
            console.error('Error generating resume PDF:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    async function generateCoverLetterPDF(content) {
        try {
            await loadPdfLib();
            var pdfDoc = await PDFLib.PDFDocument.create();
            var page = pdfDoc.addPage([612, 792]);
            var { width, height } = page.getSize();
            var margin = 50;
            var currentY = height - margin;
            var lineHeight = 14;

            var timesRomanBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
            var timesRomanFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);

            var textColor = PDFLib.rgb(0, 0, 0);
            var accentColor = PDFLib.rgb(56, 189, 248);
            var lightGray = PDFLib.rgb(120, 120, 120);

            var lines = content.split('\n');

            lines.forEach(function(line) {
                if (currentY < margin + 50) {
                    page = pdfDoc.addPage([612, 792]);
                    currentY = height - margin;
                }

                if (!line.trim()) {
                    currentY -= 8;
                    return;
                }

                var fontSize = 11;
                var font = timesRomanFont;
                var color = textColor;

                if (line.includes('Christopher Lee Cajes')) {
                    fontSize = 12;
                    font = timesRomanBoldFont;
                    color = accentColor;
                } else if (line.includes('Dear') || line.includes('Sincerely')) {
                    font = timesRomanFont;
                    color = textColor;
                } else if (line.match(/\[.*\]/)) {
                    color = lightGray;
                }

                var words = line.split(' ');
                var currentLine = '';
                var maxWidth = width - (margin * 2);

                words.forEach(function(word) {
                    var testLine = currentLine + (currentLine ? ' ' : '') + word;
                    if (testLine.length * fontSize * 0.5 > maxWidth && currentLine) {
                        page.drawText(currentLine, {
                            x: margin,
                            y: currentY,
                            size: fontSize,
                            font: font,
                            color: color
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
                        x: margin,
                        y: currentY,
                        size: fontSize,
                        font: font,
                        color: color
                    });
                    currentY -= lineHeight;
                }
            });

            var pdfBytes = await pdfDoc.save();
            var blob = new Blob([pdfBytes], { type: 'application/pdf' });
            downloadFile(blob, 'Cover Letter - Christopher Lee Cajes.pdf');
            showToast('Cover Letter PDF saved successfully!', 'success');
        } catch (error) {
            console.error('Error generating cover letter PDF:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    function downloadFile(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        createEditButtons();
        createModals();
    });
})();