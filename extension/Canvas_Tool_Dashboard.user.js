// ==UserScript==
// @name         Canvas Tool Dashboard (Compact Premium UI + AI Popups + Backup/Restore)
// @namespace    http://tampermonkey.net/
// @version      4.5.0
// @description  Collapsible bottom toolbar with compact clean UI, AI popups, multi-note sticky notes, PPT Narrator, and per-script Backup/Restore
// @match        https://*.instructure.com/*
// @match        *://canvas.*.edu/*
// @match        *://canvas.*.com/*
// @grant        GM_addStyle
// @grant        GM_listValues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.openai.com
// @connect      api.anthropic.com
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    const hostWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

    if (hostWindow.__CANVAS_DASHBOARD__) return;
    hostWindow.__CANVAS_DASHBOARD__ = true;
    if (window.top !== window.self) return;

    const _queue = [];
    let _domReady = false;
    const _tools = [];

    const STICKY_NOTES_KEY = "cvd_sticky_notes_v2";
    const STICKY_ACTIVE_KEY = "cvd_sticky_active_v1";
    let stickySaveTimer = null;
    let stickyNotes = [];
    let stickyActiveId = null;

    const PN_OPENAI_KEY_STORE = "cvd_pn_openai_key";
    const PN_ANTHROPIC_KEY_STORE = "cvd_pn_anthropic_key";
    const PN_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    let pnSelectedFile = null;

    hostWindow.CanvasDash = {
        register(tool) {
            if (_domReady) _addTool(tool);
            else _queue.push(tool);
        }
    };

    /* ---------------- AI TOOLS ---------------- */

    const popup = url =>
        window.open(url, "_blank", "width=600,height=750,left=80,top=80");

    const BUILTIN_TOOLS = [
        { id: "open-chatgpt", name: "ChatGPT", shortLabel: "CG", color: "#10a37f", description: "Open ChatGPT", run: () => popup("https://chat.openai.com"), dot: true },
        { id: "open-claude", name: "Claude", shortLabel: "CL", color: "#c96442", description: "Open Claude AI", run: () => popup("https://claude.ai/new"), dot: true },
        { id: "open-copilot", name: "Copilot", shortLabel: "CP", color: "#2563eb", description: "Open Microsoft Copilot", run: () => popup("https://copilot.microsoft.com"), dot: true },
        { id: "open-gemini", name: "Gemini", shortLabel: "GM", color: "#8b5cf6", description: "Open Google Gemini", run: () => popup("https://gemini.google.com"), dot: true },
        { id: "open-sticky-notes", name: "Notes", color: "#f4b400", description: "Open sticky notes", run: () => openStickyNotes() },
        { id: "open-ppt-narrator", name: "Narrator", shortLabel: "PN", color: "#0f766e", description: "Turn PowerPoint speaker notes into auto-playing narration audio", run: () => openPptNarrator() },
        { id: "open-scorm-builder", name: "SCORM", shortLabel: "SC", color: "#0ea5e9", description: "Open Career Toolkit SCORM Builder", run: () => popup("https://career-toolkit-ruby.vercel.app/masterypath/builder"), dot: true }
    ];

    /* ---------------- STYLES ---------------- */

    GM_addStyle(`
        #cvd-bar, #cvd-bar * {
            box-sizing: border-box !important;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
        }

        #cvd-bar {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            pointer-events: none !important;
        }

        #cvd-tab {
            pointer-events: all !important;
            background: #ffffff !important;
            color: #4b5563 !important;
            border: 1px solid #d1d5db !important;
            border-bottom: none !important;
            border-radius: 9px 9px 0 0 !important;
            padding: 3px 10px !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            box-shadow: 0 -2px 6px rgba(0,0,0,0.06) !important;
        }

        #cvd-tab-arrow {
            font-size: 8px !important;
            opacity: 0.6 !important;
            transition: transform 0.25s !important;
        }

        #cvd-bar.collapsed #cvd-tab-arrow {
            transform: rotate(180deg) !important;
        }

        #cvd-panel {
            pointer-events: all !important;
            width: 100% !important;
            background: rgba(248, 249, 250, 0.98) !important;
            border-top: 1px solid #e5e7eb !important;
            padding: 5px 10px !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            overflow-x: auto !important;
            height: 36px !important;
            transition: height 0.25s ease, opacity 0.2s ease, padding 0.25s ease !important;
        }

        #cvd-bar.collapsed #cvd-panel {
            height: 0 !important;
            opacity: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            pointer-events: none !important;
        }

        .cvd-divider {
            width: 1px !important;
            height: 16px !important;
            background: #d1d5db !important;
            flex-shrink: 0 !important;
            opacity: 0.75 !important;
        }

        .cvd-btn {
            pointer-events: all !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 10px !important;
            height: 24px !important;
            border-radius: 999px !important;
            border: none !important;
            background: var(--cvd-color) !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.12) !important;
            position: relative !important;
        }

        .cvd-btn:hover {
            filter: brightness(1.08) !important;
        }

        .cvd-btn.cvd-dot {
            width: 24px !important;
            min-width: 24px !important;
            height: 24px !important;
            padding: 0 !important;
            border-radius: 50% !important;
            box-shadow: 0 0 0 2px #ffffff, 0 1px 4px rgba(0,0,0,0.18) !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            letter-spacing: 0.02em !important;
        }

        .cvd-btn.cvd-dot .cvd-label {
            display: inline !important;
        }

        #cvd-empty {
            color: #9ca3af !important;
            font-size: 11px !important;
            font-style: italic !important;
            white-space: nowrap !important;
            line-height: 1 !important;
        }

        .cvd-tip {
            display: none !important;
            position: fixed !important;
            background: #111827 !important;
            color: #f3f4f6 !important;
            font-size: 11px !important;
            padding: 5px 8px !important;
            border-radius: 6px !important;
            max-width: 180px !important;
            text-align: center !important;
            z-index: 2147483647 !important;
        }

        .cvd-btn:hover .cvd-tip {
            display: block !important;
        }

        /* ---- BACKUP MODAL ---- */
        #ct-backup-modal {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.45);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2147483647;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #ct-backup-content {
            background: white;
            border-radius: 10px;
            padding: 22px;
            width: 500px;
            max-width: 95vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
        }

        #ct-backup-content h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }

        #ct-backup-content p {
            font-size: 13px;
            color: #6b7280;
            margin: 6px 0 18px;
        }

        .ct-backup-row {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
        }

        .ct-backup-row-info {
            flex: 1;
            min-width: 0;
        }

        .ct-backup-row-info strong {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #111827;
        }

        .ct-backup-row-info span {
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-top: 2px;
        }

        .ct-backup-row-btns {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }

        .ct-backup-btn {
            font-size: 12px;
            padding: 5px 12px;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            background: white;
            cursor: pointer;
            color: #374151;
            font-weight: 500;
            transition: background 0.15s;
        }

        .ct-backup-btn:hover {
            background: #f3f4f6;
        }

        #ct-backup-footer {
            margin-top: 16px;
            padding-top: 14px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #ct-backup-footer span {
            font-size: 12px;
            color: #9ca3af;
        }

        #ct-backup-close-btn {
            font-size: 13px;
            padding: 6px 16px;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            background: white;
            cursor: pointer;
            color: #374151;
            font-weight: 500;
        }

        #ct-backup-close-btn:hover {
            background: #f3f4f6;
        }

        #ct-backup-x {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #6b7280;
            line-height: 1;
            padding: 0;
        }

        /* ---- STICKY NOTES MODAL ---- */
        #cvd-notes-modal {
            position: fixed;
            inset: 0;
            background: rgba(17, 24, 39, 0.36);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2147483647;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #cvd-notes-content {
            width: 580px;
            max-width: calc(100vw - 24px);
            background: linear-gradient(180deg, #fff7b8, #fde68a);
            border: 1px solid #eab308;
            border-radius: 14px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.22);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        #cvd-notes-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        #cvd-notes-title-label {
            font-size: 14px;
            font-weight: 700;
            color: #78350f;
        }

        #cvd-notes-status {
            font-size: 11px;
            color: #92400e;
            min-height: 16px;
        }

        #cvd-notes-close {
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 999px;
            background: rgba(255,255,255,0.55);
            color: #78350f;
            font-size: 16px;
            cursor: pointer;
            line-height: 1;
            flex-shrink: 0;
        }

        #cvd-notes-body {
            display: flex;
            gap: 8px;
            align-items: stretch;
        }

        #cvd-notes-sidebar {
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: 130px;
            flex-shrink: 0;
            max-height: 320px;
            overflow-y: auto;
        }

        .cvd-note-tab {
            background: rgba(255,255,255,0.45);
            border: 1px solid rgba(146,64,14,0.18);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 11px;
            font-weight: 600;
            color: #78350f;
            cursor: pointer;
            text-align: left;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: background 0.12s;
        }

        .cvd-note-tab:hover {
            background: rgba(255,255,255,0.65);
        }

        .cvd-note-tab.active {
            background: rgba(255,255,255,0.82);
            border-color: #d97706;
        }

        #cvd-notes-add {
            background: rgba(255,255,255,0.3);
            border: 1px dashed rgba(146,64,14,0.35);
            border-radius: 8px;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 600;
            color: #92400e;
            cursor: pointer;
            text-align: center;
            transition: background 0.12s;
        }

        #cvd-notes-add:hover {
            background: rgba(255,255,255,0.55);
        }

        #cvd-notes-editor {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        #cvd-notes-notetitle {
            border: 1px solid rgba(146,64,14,0.22);
            border-radius: 8px;
            background: rgba(255,255,255,0.48);
            padding: 5px 10px;
            font-size: 12px;
            font-weight: 600;
            color: #451a03;
            outline: none;
            width: 100%;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #cvd-notes-notetitle:focus {
            border-color: #d97706;
        }

        #cvd-notes-text {
            width: 100%;
            min-height: 230px;
            resize: vertical;
            border: 1px solid rgba(146,64,14,0.18);
            border-radius: 10px;
            background: rgba(255,255,255,0.42);
            padding: 12px;
            font-size: 13px;
            line-height: 1.45;
            color: #451a03;
            outline: none;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #cvd-notes-text:focus {
            border-color: #d97706;
            box-shadow: 0 0 0 3px rgba(245,158,11,0.18);
        }

        #cvd-notes-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        #cvd-notes-meta {
            font-size: 11px;
            color: #92400e;
        }

        #cvd-notes-actions {
            display: flex;
            gap: 8px;
        }

        .cvd-notes-btn {
            border: 1px solid rgba(146,64,14,0.18);
            background: rgba(255,255,255,0.65);
            color: #78350f;
            font-size: 12px;
            font-weight: 600;
            border-radius: 8px;
            padding: 6px 10px;
            cursor: pointer;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .cvd-notes-btn:hover {
            background: rgba(255,255,255,0.82);
        }

        .cvd-notes-btn.danger {
            color: #b91c1c;
            border-color: rgba(185,28,28,0.25);
        }

        .cvd-notes-btn.danger:hover {
            background: rgba(254,226,226,0.75);
        }

        /* ---- DELETE CONFIRM OVERLAY ---- */
        #cvd-delete-confirm {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(17,24,39,0.45);
            justify-content: center;
            align-items: center;
            z-index: 2147483648;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #cvd-delete-confirm-box {
            background: white;
            border-radius: 12px;
            padding: 22px 24px;
            width: 320px;
            max-width: 90vw;
            box-shadow: 0 8px 32px rgba(0,0,0,0.22);
            text-align: center;
        }

        #cvd-delete-confirm-box h4 {
            margin: 0 0 8px;
            font-size: 15px;
            font-weight: 700;
            color: #111827;
        }

        #cvd-delete-confirm-box p {
            margin: 0 0 18px;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
        }

        #cvd-delete-confirm-box .cvd-confirm-btns {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        #cvd-delete-confirm-box button {
            padding: 7px 20px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid #d1d5db;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #cvd-confirm-cancel {
            background: white;
            color: #374151;
        }

        #cvd-confirm-cancel:hover {
            background: #f3f4f6;
        }

        #cvd-confirm-delete {
            background: #dc2626;
            color: white;
            border-color: #dc2626;
        }

        #cvd-confirm-delete:hover {
            background: #b91c1c;
        }

        /* ---- PPT NARRATOR MODAL ---- */
        #cvd-pn-modal {
            position: fixed;
            inset: 0;
            background: rgba(17, 24, 39, 0.45);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2147483647;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        #cvd-pn-content {
            background: white;
            border-radius: 12px;
            width: 520px;
            max-width: 95vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 16px 40px rgba(0,0,0,0.22);
            padding: 20px;
        }

        #cvd-pn-content h3 {
            margin: 0 0 4px;
            font-size: 16px;
            font-weight: 700;
            color: #111827;
        }

        #cvd-pn-content p.cvd-pn-desc {
            font-size: 12.5px;
            color: #6b7280;
            line-height: 1.5;
            margin: 0 0 16px;
        }

        .cvd-pn-label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: .5px;
            margin-bottom: 6px;
        }

        .cvd-pn-field {
            margin-bottom: 14px;
        }

        .cvd-pn-input, .cvd-pn-select {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #111827;
            outline: none;
            box-sizing: border-box;
            background: #fff;
        }

        #cvd-pn-error {
            display: none;
            background: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 13px;
            color: #dc2626;
            margin-bottom: 14px;
        }

        #cvd-pn-generate {
            background: #0f766e;
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
        }

        #cvd-pn-generate:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #cvd-pn-stage {
            font-size: 12px;
            color: #6b7280;
            margin-top: 10px;
        }

        #cvd-pn-results {
            margin-top: 16px;
            padding-top: 14px;
            border-top: 1px solid #e5e7eb;
            display: none;
        }

        #cvd-pn-results-title {
            font-weight: 700;
            font-size: 13px;
            color: #111827;
            margin-bottom: 8px;
        }

        .cvd-pn-result-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 5px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        #cvd-pn-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #6b7280;
            line-height: 1;
            padding: 0;
        }
    `);

    /* ---------------- UI BUILD ---------------- */

    function buildBar() {
        const bar = document.createElement("div");
        bar.id = "cvd-bar";

        const tab = document.createElement("button");
        tab.id = "cvd-tab";
        tab.innerHTML = `<span>Canvas</span><span id="cvd-tab-arrow">▲</span>`;
        tab.addEventListener("click", toggleBar);
        bar.appendChild(tab);

        const panel = document.createElement("div");
        panel.id = "cvd-panel";

        BUILTIN_TOOLS.forEach(t => panel.appendChild(makeButton(t)));

        panel.appendChild(makeDivider());

        const empty = document.createElement("span");
        empty.id = "cvd-empty";
        empty.textContent = "Install a script";
        panel.appendChild(empty);

        panel.appendChild(makeDivider());

        const backupBtn = document.createElement("button");
        backupBtn.className = "cvd-btn";
        backupBtn.style.setProperty("--cvd-color", "#374151");
        backupBtn.textContent = "Backup";
        backupBtn.onclick = () => {
            document.getElementById("ct-backup-modal").style.display = "flex";
        };
        panel.appendChild(backupBtn);

        bar.appendChild(panel);
        document.body.appendChild(bar);

        buildBackupModal();
        buildStickyNotesModal();
        buildDeleteConfirmModal();
        buildPptNarratorModal();

        if (localStorage.getItem("cvd_collapsed") === "1") {
            bar.classList.add("collapsed");
        }
    }

    /* ---------------- BACKUP MODAL ---------------- */

    const BACKUP_SCRIPTS = [
        {
            id: "aigrader",
            name: "AIgrader - Claude Edition",
            description: "All graded submissions and grade scale settings",
            keys: ["AIgrader_DB_v5", "AIgrader_GradeSettings_v1"]
        },
        {
            id: "api-key",
            name: "Shared Claude API Key",
            description: "Your Claude API key - used by AIgrader, AI Module Builder, Content Builder, and QTI Generator",
            keys: ["AIgrader_APIKey"]
        },
        {
            id: "email-storage",
            name: "Canvas Email Storage Center",
            description: "All saved and archived emails",
            keys: ["canvasEmailStorage_v4"]
        },
        {
            id: "email-system",
            name: "Canvas Email System",
            description: "Email templates, teacher name, date window settings, last selected course, and any pending draft",
            keys: [
                "ces_templates",
                "ces_teacher_name",
                "ces_days_forward",
                "ces_days_back",
                "ces_last_course",
                "ces_compose_pending"
            ]
        },
        {
            id: "teacher-eval",
            name: "Canvas Teacher Evaluation Tool",
            description: "Evaluation rubric configuration and display settings",
            keys: ["cte_settings"]
        },
        {
            id: "sticky-notes",
            name: "Canvas Sticky Notes",
            description: "Saved notes from the dashboard sticky note app",
            keys: [STICKY_NOTES_KEY, STICKY_ACTIVE_KEY]
        },
        {
            id: "ppt-narrator",
            name: "PPT Narrator",
            description: "Saved OpenAI/Anthropic API keys used by the PPT Narrator tool",
            keys: [PN_OPENAI_KEY_STORE, PN_ANTHROPIC_KEY_STORE]
        }
    ];

    function buildBackupModal() {
        const modal = document.createElement("div");
        modal.id = "ct-backup-modal";

        const content = document.createElement("div");
        content.id = "ct-backup-content";

        const headerRow = document.createElement("div");
        headerRow.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
        headerRow.innerHTML = `<h3>Backup & Restore</h3><button id="ct-backup-x">&#x2715;</button>`;
        content.appendChild(headerRow);

        const subtitle = document.createElement("p");
        subtitle.textContent = "Each script stores its own data. Download a backup or restore from a file individually.";
        content.appendChild(subtitle);

        BACKUP_SCRIPTS.forEach(script => {
            content.appendChild(makeBackupRow(script));
        });

        const footer = document.createElement("div");
        footer.id = "ct-backup-footer";
        footer.innerHTML = `
            <span>Restoring only affects the keys in that script's backup file.</span>
            <button id="ct-backup-close-btn">Close</button>
        `;
        content.appendChild(footer);

        modal.appendChild(content);
        document.body.appendChild(modal);

        document.getElementById("ct-backup-x").onclick = () => modal.style.display = "none";
        document.getElementById("ct-backup-close-btn").onclick = () => modal.style.display = "none";
        modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
    }

    function makeBackupRow({ id, name, description, keys }) {
        const row = document.createElement("div");
        row.className = "ct-backup-row";

        const info = document.createElement("div");
        info.className = "ct-backup-row-info";
        info.innerHTML = `<strong>${name}</strong><span>${description}</span>`;

        const btns = document.createElement("div");
        btns.className = "ct-backup-row-btns";

        const dlBtn = document.createElement("button");
        dlBtn.className = "ct-backup-btn";
        dlBtn.textContent = "Download";
        dlBtn.onclick = async () => {
            const data = {};
            for (const key of keys) {
                const val = await GM_getValue(key, undefined);
                if (val !== undefined) data[key] = val;
            }
            if (Object.keys(data).length === 0) {
                alert(`No saved data found for "${name}".`);
                return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `backup-${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const restoreBtn = document.createElement("button");
        restoreBtn.className = "ct-backup-btn";
        restoreBtn.textContent = "Restore";
        restoreBtn.onclick = () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    let count = 0;
                    for (const key of keys) {
                        if (key in parsed) {
                            await GM_setValue(key, parsed[key]);
                            count++;
                        }
                    }
                    if (count === 0) {
                        alert(`No matching data for "${name}" found in that file.`);
                    } else {
                        alert(`Restored ${count} setting(s) for "${name}". Reload Canvas to apply.`);
                    }
                } catch {
                    alert("Could not read file - make sure it is a valid JSON backup.");
                }
            };
            input.click();
        };

        btns.appendChild(dlBtn);
        btns.appendChild(restoreBtn);
        row.appendChild(info);
        row.appendChild(btns);
        return row;
    }

    /* ---------------- STICKY NOTES MULTI-NOTE ---------------- */

    function makeStickyId() {
        return "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    }

    function buildStickyNotesModal() {
        const modal = document.createElement("div");
        modal.id = "cvd-notes-modal";
        modal.innerHTML = `
            <div id="cvd-notes-content">
                <div id="cvd-notes-header">
                    <div id="cvd-notes-title-label">Sticky Notes</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span id="cvd-notes-status"></span>
                        <button id="cvd-notes-close" aria-label="Close sticky notes">&#x2715;</button>
                    </div>
                </div>
                <div id="cvd-notes-body">
                    <div id="cvd-notes-sidebar">
                        <button id="cvd-notes-add">+ New Note</button>
                    </div>
                    <div id="cvd-notes-editor">
                        <input id="cvd-notes-notetitle" type="text" placeholder="Note title..." maxlength="40" />
                        <textarea id="cvd-notes-text" placeholder="Jot down reminders, course notes, links, or anything you want to keep handy..."></textarea>
                    </div>
                </div>
                <div id="cvd-notes-footer">
                    <span id="cvd-notes-meta">0 characters</span>
                    <div id="cvd-notes-actions">
                        <button id="cvd-notes-delete" class="cvd-notes-btn danger">Delete Note</button>
                        <button id="cvd-notes-save" class="cvd-notes-btn">Save</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#cvd-notes-close").onclick = closeStickyNotes;
        modal.querySelector("#cvd-notes-save").onclick = () => saveStickyNotes(true);
        modal.querySelector("#cvd-notes-add").onclick = addNewNote;
        modal.querySelector("#cvd-notes-delete").onclick = promptDeleteNote;

        modal.querySelector("#cvd-notes-notetitle").addEventListener("input", () => {
            updateActiveNoteTitle();
            scheduleStickyAutosave();
        });

        modal.querySelector("#cvd-notes-text").addEventListener("input", () => {
            updateStickyMeta();
            scheduleStickyAutosave();
        });

        modal.addEventListener("click", e => {
            if (e.target === modal) closeStickyNotes();
        });
    }

    function buildDeleteConfirmModal() {
        const modal = document.createElement("div");
        modal.id = "cvd-delete-confirm";
        modal.innerHTML = `
            <div id="cvd-delete-confirm-box">
                <h4>Delete this note?</h4>
                <p id="cvd-delete-confirm-msg">This note will be permanently deleted and cannot be recovered.</p>
                <div class="cvd-confirm-btns">
                    <button id="cvd-confirm-cancel">Cancel</button>
                    <button id="cvd-confirm-delete">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#cvd-confirm-cancel").onclick = () => {
            modal.style.display = "none";
        };
        modal.querySelector("#cvd-confirm-delete").onclick = async () => {
            modal.style.display = "none";
            await deleteActiveNote();
        };
        modal.addEventListener("click", e => {
            if (e.target === modal) modal.style.display = "none";
        });
    }

    function promptDeleteNote() {
        if (stickyNotes.length === 0) return;
        const note = stickyNotes.find(n => n.id === stickyActiveId);
        const title = note ? (note.title || "Untitled Note") : "this note";
        const msg = document.getElementById("cvd-delete-confirm-msg");
        if (msg) msg.textContent = `"${title}" will be permanently deleted and cannot be recovered.`;
        document.getElementById("cvd-delete-confirm").style.display = "flex";
    }

    async function deleteActiveNote() {
        if (!stickyActiveId) return;
        stickyNotes = stickyNotes.filter(n => n.id !== stickyActiveId);

        if (stickyNotes.length === 0) {
            // Always keep at least one note
            const fresh = { id: makeStickyId(), title: "Note 1", text: "", updated: Date.now() };
            stickyNotes.push(fresh);
        }

        stickyActiveId = stickyNotes[0].id;
        await persistStickyNotes();
        renderStickyUI();
        setStickyStatus("Note deleted");
    }

    async function openStickyNotes() {
        const modal = document.getElementById("cvd-notes-modal");
        if (!modal) return;

        const raw = await GM_getValue(STICKY_NOTES_KEY, null);
        const savedActive = await GM_getValue(STICKY_ACTIVE_KEY, null);

        if (raw && Array.isArray(raw) && raw.length > 0) {
            stickyNotes = raw;
        } else {
            // Migrate from old single-note format or start fresh
            let legacyText = "";
            if (raw && typeof raw === "string") legacyText = raw;
            stickyNotes = [{ id: makeStickyId(), title: "Note 1", text: legacyText, updated: Date.now() }];
        }

        stickyActiveId = (savedActive && stickyNotes.find(n => n.id === savedActive))
            ? savedActive
            : stickyNotes[0].id;

        renderStickyUI();
        setStickyStatus("Loaded");
        modal.style.display = "flex";
        requestAnimationFrame(() => {
            const ta = document.getElementById("cvd-notes-text");
            if (ta) ta.focus();
        });
    }

    function closeStickyNotes() {
        if (stickySaveTimer) {
            clearTimeout(stickySaveTimer);
            stickySaveTimer = null;
            persistStickyNotes();
        }
        const modal = document.getElementById("cvd-notes-modal");
        if (modal) modal.style.display = "none";
    }

    function renderStickyUI() {
        renderSidebar();
        loadActiveNoteIntoEditor();
    }

    function renderSidebar() {
        const sidebar = document.getElementById("cvd-notes-sidebar");
        if (!sidebar) return;

        // Remove old tabs (keep the Add button)
        const addBtn = document.getElementById("cvd-notes-add");
        sidebar.innerHTML = "";
        sidebar.appendChild(addBtn);

        stickyNotes.forEach(note => {
            const tab = document.createElement("button");
            tab.className = "cvd-note-tab" + (note.id === stickyActiveId ? " active" : "");
            tab.textContent = note.title || "Untitled";
            tab.title = note.title || "Untitled";
            tab.onclick = () => {
                flushEditorToNote();
                stickyActiveId = note.id;
                GM_setValue(STICKY_ACTIVE_KEY, stickyActiveId);
                renderStickyUI();
            };
            sidebar.insertBefore(tab, addBtn);
        });
    }

    function loadActiveNoteIntoEditor() {
        const note = stickyNotes.find(n => n.id === stickyActiveId);
        const titleInput = document.getElementById("cvd-notes-notetitle");
        const textarea = document.getElementById("cvd-notes-text");
        if (!note || !titleInput || !textarea) return;
        titleInput.value = note.title || "";
        textarea.value = note.text || "";
        updateStickyMeta();
    }

    function flushEditorToNote() {
        if (!stickyActiveId) return;
        const note = stickyNotes.find(n => n.id === stickyActiveId);
        if (!note) return;
        const titleInput = document.getElementById("cvd-notes-notetitle");
        const textarea = document.getElementById("cvd-notes-text");
        if (titleInput) note.title = titleInput.value.trim() || "Untitled";
        if (textarea) note.text = textarea.value;
        note.updated = Date.now();
    }

    function updateActiveNoteTitle() {
        if (!stickyActiveId) return;
        const note = stickyNotes.find(n => n.id === stickyActiveId);
        const titleInput = document.getElementById("cvd-notes-notetitle");
        if (!note || !titleInput) return;
        note.title = titleInput.value.trim() || "Untitled";
        // Update sidebar tab label live
        const tabs = document.querySelectorAll(".cvd-note-tab");
        tabs.forEach(tab => {
            if (tab.dataset && tab.title === note.title) return;
        });
        renderSidebar();
    }

    function addNewNote() {
        flushEditorToNote();
        const num = stickyNotes.length + 1;
        const fresh = { id: makeStickyId(), title: `Note ${num}`, text: "", updated: Date.now() };
        stickyNotes.push(fresh);
        stickyActiveId = fresh.id;
        renderStickyUI();
        scheduleStickyAutosave();
        const ta = document.getElementById("cvd-notes-text");
        if (ta) ta.focus();
    }

    function scheduleStickyAutosave() {
        setStickyStatus("Saving...");
        if (stickySaveTimer) clearTimeout(stickySaveTimer);
        stickySaveTimer = setTimeout(() => {
            flushEditorToNote();
            persistStickyNotes(false);
        }, 400);
    }

    async function saveStickyNotes(showLabel) {
        if (stickySaveTimer) {
            clearTimeout(stickySaveTimer);
            stickySaveTimer = null;
        }
        flushEditorToNote();
        await persistStickyNotes(showLabel);
    }

    async function persistStickyNotes(showLabel) {
        await GM_setValue(STICKY_NOTES_KEY, stickyNotes);
        await GM_setValue(STICKY_ACTIVE_KEY, stickyActiveId);
        updateStickyMeta();
        if (showLabel === true) setStickyStatus("Saved");
        else if (showLabel === false) setStickyStatus("Autosaved");
    }

    function updateStickyMeta() {
        const textarea = document.getElementById("cvd-notes-text");
        const meta = document.getElementById("cvd-notes-meta");
        if (!textarea || !meta) return;
        const count = textarea.value.length;
        meta.textContent = `${count} character${count === 1 ? "" : "s"} · ${stickyNotes.length} note${stickyNotes.length === 1 ? "" : "s"}`;
    }

    function setStickyStatus(text) {
        const status = document.getElementById("cvd-notes-status");
        if (!status) return;
        status.textContent = text || "";
    }

    /* ═══════════════════════════════════════════════════════════
       PPT NARRATOR — reads each slide's speaker notes from an uploaded .pptx,
       generates narration audio (Anthropic to polish the wording, OpenAI TTS
       for the audio), and embeds it back into the file as an auto-playing,
       auto-advancing object so PowerPoint's own Export to Video picks it up.
       Everything runs locally in this tab via GM_xmlhttpRequest — no server.
       ═══════════════════════════════════════════════════════════ */

    const PN_REL_TYPE_NOTES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide";
    const PN_REL_TYPE_AUDIO = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio";
    const PN_REL_TYPE_MEDIA = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/media";
    const PN_REL_TYPE_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
    // 1x1 transparent PNG — the audio icon's appearance doesn't matter, only that a valid image
    // relationship exists (PowerPoint's audio object is always a <p:pic> shape backed by one).
    const PN_ICON_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    // JSZip is loaded lazily (only when PPT Narrator is actually opened) rather than via
    // @require — a @require'd script must load successfully before Tampermonkey runs ANY of
    // this file, which would take the whole toolbar down with it if that one CDN request is
    // slow, blocked by an ad-blocker, or blocked by Canvas's own CSP.
    let pnJSZipPromise = null;
    function pnLoadJSZip() {
        // A dynamically injected <script> tag executes in the real page's global scope
        // (hostWindow/unsafeWindow), not this userscript's own sandboxed `window` — same reason
        // this file defines hostWindow at the top for CanvasDash.
        if (hostWindow.JSZip) return Promise.resolve(hostWindow.JSZip);
        if (pnJSZipPromise) return pnJSZipPromise;
        pnJSZipPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            script.onload = () => hostWindow.JSZip ? resolve(hostWindow.JSZip) : reject(new Error("JSZip loaded but window.JSZip is missing."));
            script.onerror = () => { pnJSZipPromise = null; reject(new Error("Could not load JSZip from the CDN — check your network/ad-blocker.")); };
            document.head.appendChild(script);
        });
        return pnJSZipPromise;
    }

    function pnGmRequest(opts) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: opts.method || "GET",
                url: opts.url,
                headers: opts.headers || {},
                data: opts.data,
                responseType: opts.responseType || "text",
                onload: (resp) => resolve(resp),
                onerror: () => reject(new Error("Network request failed: " + opts.url)),
                ontimeout: () => reject(new Error("Request timed out: " + opts.url)),
            });
        });
    }

    function pnBase64ToUint8Array(b64) {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
    }

    function pnDecodeXmlEntities(s) {
        return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
    }

    async function pnReadText(zip, path) {
        const file = zip.file(path);
        if (!file) return null;
        return file.async("string");
    }

    async function pnGetSlideSizeEmu(zip) {
        const xml = await pnReadText(zip, "ppt/presentation.xml");
        const m = xml && xml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
        if (m) return { cx: parseInt(m[1], 10), cy: parseInt(m[2], 10) };
        return { cx: 9144000, cy: 6858000 };
    }

    function pnListSlidePaths(zip) {
        const paths = [];
        zip.forEach((relPath) => {
            if (/^ppt\/slides\/slide\d+\.xml$/.test(relPath)) paths.push(relPath);
        });
        paths.sort((a, b) => {
            const na = parseInt(a.match(/slide(\d+)\.xml$/)[1], 10);
            const nb = parseInt(b.match(/slide(\d+)\.xml$/)[1], 10);
            return na - nb;
        });
        return paths;
    }

    function pnSlideNumberFromPath(slidePath) {
        return parseInt(slidePath.match(/slide(\d+)\.xml$/)[1], 10);
    }

    function pnRelsPathFor(slidePath) {
        const parts = slidePath.split("/");
        const filename = parts.pop();
        return [...parts, "_rels", `${filename}.rels`].join("/");
    }

    async function pnGetRelationships(zip, relsPath) {
        const xml = await pnReadText(zip, relsPath);
        if (!xml) return [];
        const rels = [];
        const re = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/g;
        let m;
        while ((m = re.exec(xml))) rels.push({ id: m[1], type: m[2], target: m[3] });
        return rels;
    }

    function pnResolveRelTarget(slidePath, target) {
        const stack = slidePath.split("/").slice(0, -1);
        for (const part of target.split("/")) {
            if (part === "..") stack.pop();
            else if (part !== ".") stack.push(part);
        }
        return stack.join("/");
    }

    async function pnGetSlideNotesText(zip, slidePath) {
        const rels = await pnGetRelationships(zip, pnRelsPathFor(slidePath));
        const notesRel = rels.find(r => r.type === PN_REL_TYPE_NOTES);
        if (!notesRel) return "";
        const notesPath = pnResolveRelTarget(slidePath, notesRel.target);
        const xml = await pnReadText(zip, notesPath);
        if (!xml) return "";
        const paragraphs = [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map(pMatch =>
            [...pMatch[1].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(t => pnDecodeXmlEntities(t[1])).join("")
        );
        return paragraphs.filter(p => p.trim()).join("\n").trim();
    }

    function pnNextRelId(rels) {
        let max = 0;
        for (const r of rels) {
            const m = r.id.match(/^rId(\d+)$/);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        return `rId${max + 1}`;
    }

    function pnNextShapeId(slideXml) {
        let max = 1;
        const re = /<p:cNvPr\b[^>]*\bid="(\d+)"/g;
        let m;
        while ((m = re.exec(slideXml))) max = Math.max(max, parseInt(m[1], 10));
        return max + 1;
    }

    async function pnEnsureContentTypeDefault(zip, extension, contentType) {
        const path = "[Content_Types].xml";
        const xml = (await pnReadText(zip, path)) || "";
        if (new RegExp(`<Default\\b[^>]*Extension="${extension}"`, "i").test(xml)) return;
        zip.file(path, xml.replace("</Types>", `<Default Extension="${extension}" ContentType="${contentType}"/></Types>`));
    }

    // Embeds an MP3 into the slide as an audio object set to play automatically when the slide
    // starts, and sets the slide's auto-advance time to the audio's duration — the combination
    // PowerPoint's own Export to Video reads to bake narration into the output.
    async function pnEmbedAutoplayAudio(zip, slidePath, audioBytes, durationSeconds, slideSize) {
        const slideNumber = pnSlideNumberFromPath(slidePath);
        const relsPath = pnRelsPathFor(slidePath);
        let slideXml = (await pnReadText(zip, slidePath)) || "";
        let relsXml = (await pnReadText(zip, relsPath)) || "";
        const rels = await pnGetRelationships(zip, relsPath);

        const hasExistingTiming = /<p:timing>/.test(slideXml);

        await pnEnsureContentTypeDefault(zip, "mp3", "audio/mpeg");
        await pnEnsureContentTypeDefault(zip, "png", "image/png");

        const iconMediaPath = "ppt/media/ce-narration-icon.png";
        if (!zip.file(iconMediaPath)) {
            zip.file(iconMediaPath, pnBase64ToUint8Array(PN_ICON_PNG_BASE64));
        }
        zip.file(`ppt/media/ce-narration-audio${slideNumber}.mp3`, audioBytes);

        const rIdAudio = pnNextRelId(rels);
        const audioNum = parseInt(rIdAudio.slice(3), 10);
        const rIdMedia = `rId${audioNum + 1}`;
        const rIdIcon = `rId${audioNum + 2}`;

        const newRels = [
            `<Relationship Id="${rIdAudio}" Type="${PN_REL_TYPE_AUDIO}" Target="../media/ce-narration-audio${slideNumber}.mp3"/>`,
            `<Relationship Id="${rIdMedia}" Type="${PN_REL_TYPE_MEDIA}" Target="../media/ce-narration-audio${slideNumber}.mp3"/>`,
            `<Relationship Id="${rIdIcon}" Type="${PN_REL_TYPE_IMAGE}" Target="../media/ce-narration-icon.png"/>`,
        ].join("");
        relsXml = relsXml.replace("</Relationships>", `${newRels}</Relationships>`);

        const shapeId = pnNextShapeId(slideXml);
        const iconSize = 457200;
        const margin = 91440;
        const x = Math.max(0, slideSize.cx - iconSize - margin);
        const y = Math.max(0, slideSize.cy - iconSize - margin);
        const durMs = Math.max(1, Math.round(durationSeconds * 1000));

        const picXml = "<p:pic>"
            + "<p:nvPicPr>"
            + `<p:cNvPr id="${shapeId}" name="Narration Audio ${slideNumber}"/>`
            + '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>'
            + "<p:nvPr>"
            + `<a:audioFile r:link="${rIdAudio}"/>`
            + '<p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">'
            + `<p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${rIdMedia}"/>`
            + "</p:ext></p:extLst>"
            + "</p:nvPr>"
            + "</p:nvPicPr>"
            + `<p:blipFill><a:blip r:embed="${rIdIcon}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
            + "<p:spPr>"
            + `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${iconSize}" cy="${iconSize}"/></a:xfrm>`
            + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            + "</p:spPr>"
            + "</p:pic>";

        slideXml = slideXml.replace("</p:spTree>", `${picXml}</p:spTree>`);

        if (hasExistingTiming) {
            zip.file(slidePath, slideXml);
            zip.file(relsPath, relsXml);
            return { slideNumber, ok: false, warning: "Slide already had animation timing — narration added as click-to-play instead of automatic." };
        }

        const timingXml = "<p:timing><p:tnLst><p:par>"
            + '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">'
            + '<p:childTnLst><p:seq concurrent="1" nextAc="seek">'
            + '<p:cTn id="2" dur="indefinite" nodeType="mainSeq">'
            + '<p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>'
            + '<p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>'
            + `<p:childTnLst><p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect">`
            + '<p:stCondLst><p:cond delay="0"/></p:stCondLst>'
            + '<p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)">'
            + `<p:cBhvr><p:cTn id="6" dur="${durMs}" fill="hold"/><p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl></p:cBhvr>`
            + "</p:cmd></p:childTnLst>"
            + "</p:cTn></p:par></p:childTnLst>"
            + "</p:cTn></p:par></p:childTnLst>"
            + "</p:cTn></p:par></p:childTnLst>"
            + "</p:cTn></p:seq></p:childTnLst>"
            + "</p:cTn>"
            + "</p:par></p:tnLst><p:bldLst/></p:timing>";

        const transitionXml = `<p:transition advClick="0" advTm="${durMs}"/>`;

        const transitionRe = /<p:transition\b[^>]*\/>|<p:transition\b[^>]*>[\s\S]*?<\/p:transition>/;
        if (transitionRe.test(slideXml)) {
            slideXml = slideXml.replace(transitionRe, transitionXml);
        } else {
            slideXml = slideXml.replace("</p:cSld>", `</p:cSld>${transitionXml}`);
        }
        slideXml = slideXml.replace(transitionXml, `${transitionXml}${timingXml}`);

        zip.file(slidePath, slideXml);
        zip.file(relsPath, relsXml);

        return { slideNumber, ok: true };
    }

    async function pnPolishNarration(rawNotes, apiKey) {
        if (!apiKey) return rawNotes;
        try {
            const resp = await pnGmRequest({
                method: "POST",
                url: "https://api.anthropic.com/v1/messages",
                headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
                data: JSON.stringify({
                    model: "claude-haiku-4-5",
                    max_tokens: 600,
                    messages: [{
                        role: "user",
                        content: "Rewrite these presentation speaker notes into natural, spoken narration for a slide, as if a presenter were reading them aloud. Keep the same information, facts, and order — do not add anything new, and do not add a greeting or sign-off. Return ONLY the narration text, no preamble, no quotes around it.\n\nSpeaker notes:\n" + rawNotes,
                    }],
                }),
            });
            if (resp.status < 200 || resp.status >= 300) return rawNotes;
            const data = JSON.parse(resp.responseText);
            const text = data && data.content && data.content[0] && data.content[0].text;
            return typeof text === "string" && text.trim() ? text.trim() : rawNotes;
        } catch {
            return rawNotes;
        }
    }

    async function pnGenerateTTS(text, voice, apiKey) {
        if (!apiKey) throw new Error("No OpenAI API key provided.");
        const resp = await pnGmRequest({
            method: "POST",
            url: "https://api.openai.com/v1/audio/speech",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            data: JSON.stringify({ model: "tts-1", voice, input: text, response_format: "mp3" }),
            responseType: "arraybuffer",
        });
        if (resp.status < 200 || resp.status >= 300) {
            let msg = `OpenAI TTS failed (HTTP ${resp.status})`;
            try { msg += ": " + JSON.parse(resp.responseText).error.message; } catch {}
            throw new Error(msg);
        }
        return resp.response; // ArrayBuffer
    }

    // Native browser API — no library needed to measure MP3 duration.
    async function pnGetAudioDurationSeconds(arrayBuffer) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        try {
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
            return audioBuffer.duration;
        } finally {
            ctx.close();
        }
    }

    function buildPptNarratorModal() {
        const modal = document.createElement("div");
        modal.id = "cvd-pn-modal";
        modal.innerHTML = `
            <div id="cvd-pn-content">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                    <h3>PPT Narrator</h3>
                    <button id="cvd-pn-close" aria-label="Close PPT Narrator">&#x2715;</button>
                </div>
                <p class="cvd-pn-desc">
                    Choose a .pptx. Each slide's speaker notes are converted to narration audio and
                    embedded into that slide, set to play automatically and advance the slide when it
                    finishes — so PowerPoint's own <strong>Export to Video</strong> picks it up
                    correctly. Everything runs locally in this tab — nothing is uploaded anywhere
                    except directly to OpenAI/Anthropic.
                </p>
                <div class="cvd-pn-field">
                    <label class="cvd-pn-label">OpenAI API Key</label>
                    <input id="cvd-pn-openai-key" class="cvd-pn-input" type="password" placeholder="sk-...">
                </div>
                <div class="cvd-pn-field">
                    <label class="cvd-pn-label">Anthropic API Key (for polishing notes into natural narration)</label>
                    <input id="cvd-pn-anthropic-key" class="cvd-pn-input" type="password" placeholder="sk-ant-...">
                </div>
                <div class="cvd-pn-field">
                    <label class="cvd-pn-label">PowerPoint file</label>
                    <input id="cvd-pn-file" type="file" accept=".pptx" style="font-size:13px;">
                    <div id="cvd-pn-file-info" style="font-size:12px;color:#6b7280;margin-top:6px;"></div>
                </div>
                <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;">
                    <div style="flex:1;min-width:150px;">
                        <label class="cvd-pn-label">Voice</label>
                        <select id="cvd-pn-voice" class="cvd-pn-select">
                            ${PN_VOICES.map(v => `<option value="${v}">${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}
                        </select>
                    </div>
                    <div style="flex:1;min-width:200px;display:flex;align-items:flex-end;">
                        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#111827;cursor:pointer;">
                            <input id="cvd-pn-polish" type="checkbox" checked> Polish notes into natural spoken narration
                        </label>
                    </div>
                </div>
                <div id="cvd-pn-error"></div>
                <button id="cvd-pn-generate">Generate Narrated PPTX</button>
                <div id="cvd-pn-stage"></div>
                <div id="cvd-pn-results">
                    <div id="cvd-pn-results-title">Per-slide results</div>
                    <div id="cvd-pn-results-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const openaiInput = modal.querySelector("#cvd-pn-openai-key");
        const anthropicInput = modal.querySelector("#cvd-pn-anthropic-key");

        modal.querySelector("#cvd-pn-close").onclick = () => { modal.style.display = "none"; };
        modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

        openaiInput.addEventListener("change", () => GM_setValue(PN_OPENAI_KEY_STORE, openaiInput.value.trim()));
        anthropicInput.addEventListener("change", () => GM_setValue(PN_ANTHROPIC_KEY_STORE, anthropicInput.value.trim()));

        modal.querySelector("#cvd-pn-file").addEventListener("change", (e) => {
            const f = e.target.files[0];
            const infoEl = modal.querySelector("#cvd-pn-file-info");
            if (!f) { pnSelectedFile = null; infoEl.textContent = ""; return; }
            if (!/\.pptx$/i.test(f.name)) {
                pnShowError("Please choose a .pptx file.");
                pnSelectedFile = null; infoEl.textContent = "";
                return;
            }
            pnSelectedFile = f;
            infoEl.textContent = `${f.name} — ${(f.size / 1024 / 1024).toFixed(1)} MB`;
            pnHideError();
        });

        modal.querySelector("#cvd-pn-generate").addEventListener("click", pnRunGenerate);
    }

    function pnShowError(msg) {
        const errEl = document.getElementById("cvd-pn-error");
        errEl.textContent = msg;
        errEl.style.display = "block";
    }
    function pnHideError() {
        document.getElementById("cvd-pn-error").style.display = "none";
    }
    function pnSetStage(text) {
        document.getElementById("cvd-pn-stage").textContent = text;
    }
    function pnRenderResults(results) {
        const rc = document.getElementById("cvd-pn-results");
        const list = document.getElementById("cvd-pn-results-list");
        rc.style.display = "block";
        list.innerHTML = results.map(r => {
            const ok = r.status.startsWith("narrated");
            const skipped = r.status.startsWith("skipped");
            const color = ok ? "#15803d" : skipped ? "#6b7280" : "#dc2626";
            return `<div class="cvd-pn-result-row"><span style="color:#111827;font-weight:600;">Slide ${r.slide}</span><span style="color:${color};">${r.status}</span></div>`;
        }).join("");
    }

    async function pnRunGenerate() {
        pnHideError();
        document.getElementById("cvd-pn-results").style.display = "none";
        const openaiKey = document.getElementById("cvd-pn-openai-key").value.trim();
        const anthropicKey = document.getElementById("cvd-pn-anthropic-key").value.trim();
        const voice = document.getElementById("cvd-pn-voice").value;
        const polish = document.getElementById("cvd-pn-polish").checked;
        const btn = document.getElementById("cvd-pn-generate");

        if (!pnSelectedFile) { pnShowError("Choose a .pptx file first."); return; }
        if (!openaiKey) { pnShowError("Enter your OpenAI API key first."); return; }
        if (polish && !anthropicKey) { pnShowError('Enter your Anthropic API key, or uncheck "Polish notes."'); return; }

        btn.disabled = true;

        try {
            pnSetStage("Loading PPTX library…");
            const JSZip = await pnLoadJSZip();

            pnSetStage("Reading file…");
            const fileBuffer = await pnSelectedFile.arrayBuffer();
            let zip;
            try {
                zip = await JSZip.loadAsync(fileBuffer);
            } catch {
                throw new Error("Could not read this file — is it a valid .pptx?");
            }

            const slidePaths = pnListSlidePaths(zip);
            if (!slidePaths.length) throw new Error("No slides found in this file.");
            const slideSize = await pnGetSlideSizeEmu(zip);

            const results = [];
            for (let i = 0; i < slidePaths.length; i++) {
                const slidePath = slidePaths[i];
                const slideNumber = pnSlideNumberFromPath(slidePath);
                pnSetStage(`Processing slide ${i + 1} of ${slidePaths.length}…`);
                const rawNotes = (await pnGetSlideNotesText(zip, slidePath)).trim();
                if (!rawNotes) { results.push({ slide: slideNumber, status: "skipped — no speaker notes" }); continue; }
                try {
                    const narration = polish ? await pnPolishNarration(rawNotes, anthropicKey) : rawNotes;
                    const audioArrayBuffer = await pnGenerateTTS(narration, voice, openaiKey);
                    const duration = await pnGetAudioDurationSeconds(audioArrayBuffer).catch(() => Math.max(3, narration.split(/\s+/).length / 2.5));
                    const embed = await pnEmbedAutoplayAudio(zip, slidePath, new Uint8Array(audioArrayBuffer), duration, slideSize);
                    results.push({ slide: slideNumber, status: embed.ok ? "narrated (auto-play)" : (embed.warning || "embedded") });
                } catch (err) {
                    results.push({ slide: slideNumber, status: `failed — ${err.message}` });
                }
                pnRenderResults(results);
            }

            pnSetStage("Building final file…");
            const outBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
            const url = URL.createObjectURL(outBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = pnSelectedFile.name.replace(/\.pptx$/i, "") + "-narrated.pptx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            pnSetStage("Done — file downloaded.");
        } catch (err) {
            pnShowError(err.message || "Something went wrong.");
            pnSetStage("");
        } finally {
            btn.disabled = false;
        }
    }

    async function openPptNarrator() {
        const modal = document.getElementById("cvd-pn-modal");
        if (!modal) return;
        document.getElementById("cvd-pn-openai-key").value = await GM_getValue(PN_OPENAI_KEY_STORE, "");
        document.getElementById("cvd-pn-anthropic-key").value = await GM_getValue(PN_ANTHROPIC_KEY_STORE, "");
        modal.style.display = "flex";
    }

    /* ---------------- TOOLBAR HELPERS ---------------- */

    function toggleBar() {
        const bar = document.getElementById("cvd-bar");
        bar.classList.toggle("collapsed");
        localStorage.setItem("cvd_collapsed", bar.classList.contains("collapsed") ? "1" : "0");
    }

    function makeDivider() {
        const el = document.createElement("div");
        el.className = "cvd-divider";
        return el;
    }

    function makeButton(tool) {
        const btn = document.createElement("button");
        btn.className = tool.dot ? "cvd-btn cvd-dot" : "cvd-btn";
        btn.style.setProperty("--cvd-color", tool.color || "#2563eb");
        btn.setAttribute("aria-label", tool.name);
        btn.title = tool.name;

        const labelSpan = document.createElement("span");
        labelSpan.className = "cvd-label";
        labelSpan.textContent = tool.dot ? (tool.shortLabel || tool.name.slice(0, 2).toUpperCase()) : tool.name;
        btn.appendChild(labelSpan);

        if (tool.description) {
            const tip = document.createElement("div");
            tip.className = "cvd-tip";
            tip.textContent = tool.description;
            btn.appendChild(tip);

            btn.addEventListener("mouseenter", () => {
                requestAnimationFrame(() => {
                    const br = btn.getBoundingClientRect();
                    const th = tip.offsetHeight || 36;
                    const tw = 180;
                    let left = br.left + br.width / 2 - tw / 2;
                    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
                    tip.style.left = left + "px";
                    tip.style.top = (br.top - th - 8) + "px";
                });
            });
        }

        btn.addEventListener("click", () => {
            try { tool.run(); }
            catch (e) { console.error("[CanvasDash]", tool.name, e); }
        });

        return btn;
    }

    function _addTool(tool) {
        if (tool.id && _tools.find(t => t.id === tool.id)) return;
        _tools.push(tool);

        const panel = document.getElementById("cvd-panel");
        if (!panel) return;

        const empty = document.getElementById("cvd-empty");
        if (empty) empty.remove();

        const backupBtn = panel.lastElementChild;
        const dividerBeforeBackup = backupBtn && backupBtn.previousElementSibling;

        if (dividerBeforeBackup && dividerBeforeBackup.classList.contains("cvd-divider")) {
            panel.insertBefore(makeButton(tool), dividerBeforeBackup);
        } else {
            panel.appendChild(makeButton(tool));
        }
    }

    /* ---------------- INIT ---------------- */

    function init() {
        buildBar();
        _domReady = true;
        _queue.forEach(_addTool);
        _queue.length = 0;
    }

    function waitForBody() {
        if (document.body) init();
        else requestAnimationFrame(waitForBody);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        waitForBody();
    }

})();
