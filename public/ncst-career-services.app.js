(function () {
    'use strict';

    if (window.__NCST_CAREER_SERVICES__) return;

    function init() {
        if (!document.body) {
            requestAnimationFrame(init);
            return;
        }
        window.__NCST_CAREER_SERVICES__ = true;

    const EMBEDDED = window.NCST_CAREER_SERVICES_EMBEDDED === true;
    const USE_SERVER_API =
        EMBEDDED || typeof GM_xmlhttpRequest !== 'function';
    const API_BASE = window.NCST_CAREER_SERVICES_API_BASE || '';

    const DB_NAME = 'NCSTCareerServices';
    const STORE_NAME = 'settings';
    const HANDLE_KEY = 'resumeFolder';
    const CLAUDE_KEY_STORAGE = 'ncstClaudeApiKey';
    const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
    const CLAUDE_TIMEOUT_MS = 45000;
    const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
    const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search';
    const GEOCODE_CACHE_KEY = 'ncstGeocodeCacheV2';
    const GEOCODE_TIMEOUT_MS = 10000;
    const GEOCODE_THROTTLE_MS = 1100;
    const EARTH_RADIUS_MILES = 3958.8;

    let allResumes = [];
    let folderHandle = null;
    let selectedResumes = new Set();
    let currentQuery = '';
    let lastDeepScanHtml = '';
    let lastCandidateSummaries = [];
    let distanceMiles = null;
    let distanceOrigin = '';
    let distanceCoords = {};
    let lastLiveGeocodeAt = 0;

    // =========================================================
    // FLOATING BUTTON (Outlook Tampermonkey only)
    // =========================================================

    let button = null;

    if (!EMBEDDED) {
        button = document.createElement('button');

        button.textContent = '📄';
        button.title = 'Resume Search';

        Object.assign(button.style, {
            position: 'fixed',
            right: '62px',
            bottom: '18px',
            zIndex: '2147483646',
            width: '38px',
            height: '38px',
            padding: '0',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: '#1f2937',
            border: 'none',
            borderRadius: '0',
            fontSize: '26px',
            fontWeight: '400',
            lineHeight: '1',
            cursor: 'pointer',
            boxShadow: 'none',
            fontFamily: 'Segoe UI, Arial, sans-serif'
        });

        document.body.appendChild(button);
    }

    // =========================================================
    // PANEL
    // =========================================================

    const panel = document.createElement('div');

    Object.assign(
        panel.style,
        EMBEDDED
            ? {
                display: 'block',
                position: 'relative',
                width: '100%',
                minHeight: '100vh',
                maxHeight: 'none',
                overflowY: 'auto',
                background: '#f9fafb',
                border: 'none',
                borderRadius: '0',
                zIndex: '1',
                padding: '16px',
                boxSizing: 'border-box',
                boxShadow: 'none',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                color: '#111827'
            }
            : {
                display: 'none',
                position: 'fixed',
                right: '20px',
                bottom: '70px',
                width: '470px',
                maxWidth: 'calc(100vw - 40px)',
                maxHeight: '70vh',
                overflowY: 'auto',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                zIndex: '999999',
                padding: '16px',
                boxSizing: 'border-box',
                boxShadow: '0 8px 30px rgba(0,0,0,.25)',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                color: '#111827'
            }
    );

    document.body.appendChild(panel);

    if (button) {
        button.addEventListener('click', async () => {
            panel.style.display =
                panel.style.display === 'none'
                    ? 'block'
                    : 'none';

            if (panel.style.display === 'block') {
                await initialize();
            }
        });
    }

    function closePanel() {
        if (EMBEDDED) {
            return;
        }

        panel.style.display = 'none';
    }

    if (EMBEDDED) {
        initialize();
    }

    // =========================================================
    // INITIALIZE
    // =========================================================

    async function initialize() {
        renderLoading('Checking resume folder...');

        try {
            folderHandle = await getStoredHandle();

            if (!folderHandle) {
                renderConnect();
                return;
            }

            const permission =
                await folderHandle.queryPermission({
                    mode: 'read'
                });

            if (permission !== 'granted') {
                renderReconnect();
                return;
            }

            await scanFolder();

        } catch (error) {
            console.error('NCST Resume Search:', error);
            renderConnect();
        }
    }

    // =========================================================
    // FOLDER CONNECTION
    // =========================================================

    function renderConnect() {
        panel.innerHTML = `
            ${header('NCST Resume Search')}

            <div style="padding:20px 8px;text-align:center;">

                <div style="
                    font-size:16px;
                    font-weight:600;
                    margin-bottom:8px;
                ">
                    Resume Folder Not Connected
                </div>

                <div style="
                    font-size:13px;
                    color:#6b7280;
                    line-height:1.5;
                    margin-bottom:16px;
                ">
                    Select the main folder containing the resumes.
                    All subfolders will be searched automatically.
                </div>

                <button
                    id="resume-connect"
                    style="${primaryButton()} width:100%;padding:10px;"
                >
                    Select Resume Folder
                </button>

            </div>
        `;

        document.getElementById('resume-close').onclick =
            closePanel;

        document.getElementById('resume-connect').onclick =
            connectFolder;
    }

    function renderReconnect() {
        panel.innerHTML = `
            ${header('NCST Resume Search')}

            <div style="padding:20px 8px;text-align:center;">

                <div style="
                    font-size:16px;
                    font-weight:600;
                    margin-bottom:8px;
                ">
                    Resume Folder Needs Permission
                </div>

                <div style="
                    font-size:13px;
                    color:#6b7280;
                    margin-bottom:16px;
                ">
                    The folder is remembered, but Edge needs
                    permission to access it again.
                </div>

                <button
                    id="resume-permission"
                    style="${primaryButton()} width:100%;padding:10px;"
                >
                    Reconnect Resume Folder
                </button>

                <button
                    id="resume-change"
                    style="${secondaryButton()} width:100%;margin-top:8px;"
                >
                    Choose Different Folder
                </button>

            </div>
        `;

        document.getElementById('resume-close').onclick =
            closePanel;

        document.getElementById('resume-permission').onclick =
            requestStoredPermission;

        document.getElementById('resume-change').onclick =
            connectFolder;
    }

    async function connectFolder() {
        if (!window.showDirectoryPicker) {
            showMessage(
                'Browser Not Supported',
                'Folder access is not supported by this browser. ' +
                'Use Microsoft Edge or Google Chrome.'
            );
            return;
        }

        try {
            folderHandle =
                await window.showDirectoryPicker({
                    mode: 'read'
                });

            await storeHandle(folderHandle);

            selectedResumes.clear();

            await scanFolder();

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(error);
                showMessage(
                    'Folder Error',
                    'Unable to open the selected resume folder.\n\n' +
                    (error && error.message ? error.message : String(error))
                );
            }
        }
    }

    async function requestStoredPermission() {
        try {
            const result =
                await folderHandle.requestPermission({
                    mode: 'read'
                });

            if (result === 'granted') {
                await scanFolder();
            } else {
                showMessage(
                    'Permission Needed',
                    'Folder permission was not granted.',
                    renderReconnect
                );
            }

        } catch (error) {
            console.error(error);
            renderConnect();
        }
    }

    // =========================================================
    // SCAN FOLDERS
    // =========================================================

    async function scanFolder() {
        renderLoading('Scanning resumes...');

        allResumes = [];

        try {
            await scanDirectory(folderHandle, '');

            allResumes.sort(
                (a, b) => a.name.localeCompare(b.name)
            );

            renderSearch();

        } catch (error) {
            console.error(error);

            showMessage(
                'Scan Error',
                'The resume folder could not be scanned. ' +
                'Try reconnecting the folder.\n\n' +
                (error && error.message ? error.message : String(error)),
                renderReconnect
            );
        }
    }

    async function scanDirectory(directoryHandle, path) {
        for await (const entry of directoryHandle.values()) {

            const entryPath =
                path
                    ? `${path}/${entry.name}`
                    : entry.name;

            if (entry.kind === 'directory') {
                await scanDirectory(entry, entryPath);
                continue;
            }

            if (!isResumeFile(entry.name)) {
                continue;
            }

            allResumes.push({
                id: entryPath,
                name: entry.name,
                path: entryPath,
                handle: entry,
                parsed: parseFilename(entry.name)
            });
        }
    }

    function isResumeFile(filename) {
        const lower = filename.toLowerCase();

        return (
            lower.endsWith('.pdf') ||
            lower.endsWith('.doc') ||
            lower.endsWith('.docx')
        );
    }

    // =========================================================
    // PARSE NCST FILENAME
    // =========================================================

    function parseFilename(filename) {
        const base =
            filename
                .replace(/\.(pdf|doc|docx)$/i, '')
                .trim();

        const result = {
            original: base,
            program: '',
            lastName: '',
            firstName: '',
            location: '',
            state: '',
            gradMonth: '',
            gradYear: ''
        };

        const firstSpace = base.indexOf(' ');

        if (firstSpace === -1) {
            return result;
        }

        result.program =
            base.substring(0, firstSpace).trim();

        const remaining =
            base.substring(firstSpace + 1).trim();

        const commaIndex =
            remaining.indexOf(',');

        if (commaIndex === -1) {
            return result;
        }

        result.lastName =
            remaining.substring(0, commaIndex).trim();

        let afterLast =
            remaining.substring(commaIndex + 1).trim();

        const dateMatch =
            afterLast.match(
                /\s(\d{1,2})\s(\d{2,4})$/
            );

        if (dateMatch) {
            result.gradMonth = dateMatch[1];

            result.gradYear =
                dateMatch[2].length === 2
                    ? `20${dateMatch[2]}`
                    : dateMatch[2];

            afterLast =
                afterLast.substring(
                    0,
                    dateMatch.index
                ).trim();
        }

        const stateMatch =
            afterLast.match(
                /,\s*([A-Za-z]{2})$/
            );

        if (stateMatch) {
            result.state =
                stateMatch[1].toUpperCase();

            afterLast =
                afterLast.substring(
                    0,
                    stateMatch.index
                ).trim();
        }

        const parts =
            afterLast.split(/\s+/);

        if (parts.length) {
            result.firstName = parts[0];

            result.location =
                parts.slice(1).join(' ');
        }

        return result;
    }

    // =========================================================
    // SEARCH SCREEN
    // =========================================================

    function renderSearch() {
        panel.innerHTML = `
            ${header('NCST Resume Search')}

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                background:#f3f4f6;
                padding:8px 10px;
                border-radius:7px;
                margin-bottom:10px;
            ">

                <div>
                    <div style="
                        font-size:10px;
                        color:#6b7280;
                    ">
                        CONNECTED FOLDER
                    </div>

                    <div style="
                        font-weight:600;
                        font-size:12px;
                    ">
                        ${escapeHtml(folderHandle.name)}
                    </div>
                </div>

                <div style="
                    font-size:12px;
                    font-weight:600;
                ">
                    ${allResumes.length} resumes
                </div>

            </div>

            <input
                id="resume-search"
                placeholder="Search program, name, city, state, graduation..."
                value="${escapeHtml(currentQuery)}"
                style="${inputStyle()} margin-bottom:6px;"
            >

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:8px;
            ">

                <div style="
                    font-size:10px;
                    color:#6b7280;
                ">
                    Example: AT Youngstown 2026
                </div>

                <button
                    id="resume-clear-search"
                    style="
                        border:none;
                        background:none;
                        font-size:10px;
                        cursor:pointer;
                        text-decoration:underline;
                    "
                >
                    Clear Search
                </button>

            </div>

            <div style="
                display:flex;
                gap:6px;
                margin-bottom:6px;
            ">

                <input
                    id="resume-distance-location"
                    placeholder="Distance from: city, state or ZIP"
                    value="${escapeHtml(distanceOrigin)}"
                    style="${inputStyle()} flex:2;"
                >

                <input
                    id="resume-distance-miles"
                    type="number"
                    min="1"
                    placeholder="Miles"
                    value="${distanceMiles !== null ? distanceMiles : ''}"
                    style="${inputStyle()} flex:1;"
                >

                <button
                    id="resume-distance-apply"
                    style="${secondaryButton()}"
                >
                    Apply
                </button>

            </div>

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:8px;
            ">

                <div
                    id="resume-distance-status"
                    style="
                        font-size:10px;
                        color:#6b7280;
                    "
                >
                    ${
                        distanceMiles !== null && distanceOrigin
                            ? `Showing resumes within ${distanceMiles} mi of ${escapeHtml(distanceOrigin)}`
                            : ''
                    }
                </div>

                ${
                    distanceMiles !== null && distanceOrigin
                        ? `
                        <button
                            id="resume-distance-clear"
                            style="
                                border:none;
                                background:none;
                                font-size:10px;
                                cursor:pointer;
                                text-decoration:underline;
                            "
                        >
                            Clear Distance
                        </button>
                        `
                        : ''
                }

            </div>

            <div id="resume-selection-bar"></div>

            <div id="resume-results"></div>

            <div style="
                border-top:1px solid #e5e7eb;
                margin-top:10px;
                padding-top:8px;
                display:flex;
                gap:8px;
            ">

                <button
                    id="resume-rescan"
                    style="${secondaryButton()} flex:1;"
                >
                    Rescan
                </button>

                <button
                    id="resume-folder"
                    style="${secondaryButton()} flex:1;"
                >
                    Change Folder
                </button>

            </div>
        `;

        document.getElementById('resume-close').onclick =
            closePanel;

        document.getElementById('resume-rescan').onclick =
            scanFolder;

        document.getElementById('resume-folder').onclick =
            connectFolder;

        document.getElementById('resume-clear-search').onclick =
            () => {
                currentQuery = '';
                document.getElementById('resume-search').value = '';
                displayResults('');
            };

        document.getElementById('resume-distance-apply').onclick =
            applyDistanceFilter;

        const distanceClear =
            document.getElementById('resume-distance-clear');

        if (distanceClear) {
            distanceClear.onclick = () => {
                distanceMiles = null;
                distanceOrigin = '';
                renderSearch();
            };
        }

        const distanceLocationInput =
            document.getElementById('resume-distance-location');

        const distanceMilesInput =
            document.getElementById('resume-distance-miles');

        [distanceLocationInput, distanceMilesInput].forEach(input => {
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    applyDistanceFilter();
                }
            });
        });

        const search =
            document.getElementById('resume-search');

        search.addEventListener('input', () => {
            currentQuery = search.value;
            displayResults(currentQuery);
        });

        displayResults(currentQuery);
    }

    // =========================================================
    // FILTER RESULTS
    // =========================================================

    function getMatches(query) {
        const terms =
            query
                .toLowerCase()
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (!terms.length) {
            return allResumes;
        }

        return allResumes.filter(resume => {

            const searchable = [
                resume.name,
                resume.path,
                resume.parsed.program,
                resume.parsed.lastName,
                resume.parsed.firstName,
                resume.parsed.location,
                resume.parsed.state,
                resume.parsed.gradMonth,
                resume.parsed.gradYear
            ]
                .join(' ')
                .toLowerCase();

            return terms.every(
                term => searchable.includes(term)
            );
        });
    }

    function applyDistanceToMatches(matches) {
        if (distanceMiles === null) {
            return matches;
        }

        return matches
            .filter(
                resume =>
                    Object.prototype.hasOwnProperty.call(
                        distanceCoords,
                        resume.id
                    )
            )
            .sort(
                (a, b) =>
                    distanceCoords[a.id] - distanceCoords[b.id]
            );
    }

    // =========================================================
    // RESULTS
    // =========================================================

    function displayResults(query) {
        const results =
            document.getElementById('resume-results');

        if (!results) {
            return;
        }

        const matches = applyDistanceToMatches(getMatches(query));

        renderSelectionBar();

        results.innerHTML = `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:7px;
            ">

                <div style="
                    font-size:11px;
                    color:#6b7280;
                ">
                    ${matches.length}
                    matching resume${matches.length === 1 ? '' : 's'}
                </div>

                ${
                    matches.length
                        ? `
                        <button
                            id="resume-select-results"
                            style="
                                border:none;
                                background:none;
                                cursor:pointer;
                                font-size:10px;
                                text-decoration:underline;
                            "
                        >
                            Select Results
                        </button>
                        `
                        : ''
                }

            </div>
        `;

        if (!matches.length) {
            results.insertAdjacentHTML(
                'beforeend',
                `
                <div style="
                    text-align:center;
                    padding:18px;
                    color:#6b7280;
                    font-size:12px;
                ">
                    No matching resumes found.
                </div>
                `
            );

            return;
        }

        matches.slice(0, 100).forEach(resume => {

            const p = resume.parsed;

            const displayName =
                `${p.firstName} ${p.lastName}`.trim()
                || resume.name;

            const location =
                [p.location, p.state]
                    .filter(Boolean)
                    .join(', ');

            const card =
                document.createElement('div');

            card.style.cssText = `
                border:1px solid #e5e7eb;
                border-radius:7px;
                padding:9px;
                margin-bottom:6px;
            `;

            card.innerHTML = `
                <div style="
                    display:flex;
                    align-items:flex-start;
                    gap:9px;
                ">

                    <input
                        type="checkbox"
                        class="resume-checkbox"
                        ${selectedResumes.has(resume.id) ? 'checked' : ''}
                        style="
                            margin-top:4px;
                            width:16px;
                            height:16px;
                            cursor:pointer;
                        "
                    >

                    <div style="
                        flex:1;
                        min-width:0;
                    ">

                        <div style="
                            font-weight:700;
                            font-size:13px;
                        ">
                            ${escapeHtml(displayName)}
                        </div>

                        <div style="
                            font-size:11px;
                            margin-top:2px;
                        ">
                            ${escapeHtml(p.program)}
                            ${
                                location
                                    ? ` • ${escapeHtml(location)}`
                                    : ''
                            }
                        </div>

                        ${
                            p.gradMonth
                                ? `
                                <div style="
                                    font-size:10px;
                                    color:#6b7280;
                                    margin-top:2px;
                                ">
                                    Graduation:
                                    ${escapeHtml(p.gradMonth)}/${escapeHtml(p.gradYear)}
                                </div>
                                `
                                : ''
                        }

                        ${
                            distanceMiles !== null &&
                            Object.prototype.hasOwnProperty.call(distanceCoords, resume.id)
                                ? `
                                <div style="
                                    font-size:10px;
                                    color:#4f46e5;
                                    font-weight:600;
                                    margin-top:2px;
                                ">
                                    ${distanceCoords[resume.id].toFixed(1)} mi from ${escapeHtml(distanceOrigin)}
                                </div>
                                `
                                : ''
                        }

                    </div>

                    <button
                        class="resume-open"
                        style="${secondaryButton()}"
                    >
                        Open
                    </button>

                </div>
            `;

            const checkbox =
                card.querySelector('.resume-checkbox');

            checkbox.onchange = () => {

                if (checkbox.checked) {
                    selectedResumes.add(resume.id);
                } else {
                    selectedResumes.delete(resume.id);
                }

                renderSelectionBar();
            };

            card.querySelector('.resume-open').onclick =
                () => openResume(resume);

            results.appendChild(card);
        });

        const selectResults =
            document.getElementById('resume-select-results');

        if (selectResults) {
            selectResults.onclick = () => {

                matches
                    .slice(0, 100)
                    .forEach(
                        resume =>
                            selectedResumes.add(resume.id)
                    );

                displayResults(currentQuery);
            };
        }
    }

    // =========================================================
    // SELECTION BAR
    // =========================================================

    function renderSelectionBar() {
        const bar =
            document.getElementById('resume-selection-bar');

        if (!bar) {
            return;
        }

        const count = selectedResumes.size;

        if (!count) {
            bar.innerHTML = '';
            return;
        }

        bar.innerHTML = `
            <div style="
                background:#eef2ff;
                border:1px solid #c7d2fe;
                border-radius:7px;
                padding:8px;
                margin-bottom:9px;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:8px;
            ">

                <strong style="font-size:11px;">
                    ${count}
                    resume${count === 1 ? '' : 's'}
                    selected
                </strong>

                <div style="display:flex;gap:5px;">

                    <button
                        id="resume-clear-selection"
                        style="${secondaryButton()}"
                    >
                        Clear
                    </button>

                    <button
                        id="resume-deep-scan"
                        style="${secondaryButton()}"
                    >
                        Deep Scan
                    </button>

                    <button
                        id="resume-attach"
                        style="${primaryButton()}"
                    >
                        ${EMBEDDED ? 'Download Selected' : 'Attach Selected'}
                    </button>

                </div>

            </div>
        `;

        document.getElementById(
            'resume-clear-selection'
        ).onclick = () => {

            selectedResumes.clear();

            displayResults(currentQuery);
        };

        document.getElementById(
            'resume-deep-scan'
        ).onclick =
            deepScanSelectedResumes;

        document.getElementById(
            'resume-attach'
        ).onclick =
            EMBEDDED
                ? downloadSelectedResumes
                : attachSelectedResumes;
    }

    // =========================================================
    // DEEP SCAN WITH CLAUDE
    // =========================================================

    async function deepScanSelectedResumes() {
        if (!selectedResumes.size) {
            showMessage('Selection Required', 'Select at least one resume.', renderSearch);
            return;
        }

        let apiKey = localStorage.getItem(CLAUDE_KEY_STORAGE) || '';

        if (!apiKey && !USE_SERVER_API) {
            apiKey = prompt(
                'Enter the Claude API key for this browser.\n\n' +
                'It will be stored locally in this browser so you do not have to enter it each time.'
            ) || '';

            apiKey = apiKey.trim();

            if (!apiKey) {
                return;
            }

            localStorage.setItem(CLAUDE_KEY_STORAGE, apiKey);
        }

        const selected =
            allResumes.filter(
                resume =>
                    selectedResumes.has(resume.id)
            );

        const deepButton =
            document.getElementById('resume-deep-scan');

        if (deepButton) {
            deepButton.disabled = true;
            deepButton.textContent = 'Preparing...';
        }

        try {
            const candidateSummaries = [];
            const priorSummaries = [];

            for (let i = 0; i < selected.length; i++) {
                const resume = selected[i];

                if (deepButton) {
                    deepButton.textContent =
                        `Scanning ${i + 1} of ${selected.length}...`;
                }

                const file = await resume.handle.getFile();

                const summary = await analyzeResumeWithClaude(
                    apiKey,
                    resume,
                    file,
                    priorSummaries
                );

                candidateSummaries.push({
                    resume,
                    summary
                });

                priorSummaries.push({
                    headline: summary.headline,
                    summary: summary.summary
                });
            }

            lastDeepScanHtml =
                buildEmployerEmailHtml(candidateSummaries);

            lastCandidateSummaries = candidateSummaries;

            renderDeepScanPreview(candidateSummaries);

        } catch (error) {
            console.error('NCST Deep Scan Error:', error);

            const message =
                error && error.message
                    ? error.message
                    : String(error);

            if (
                message.includes('401') ||
                message.toLowerCase().includes('authentication')
            ) {
                localStorage.removeItem(CLAUDE_KEY_STORAGE);
            }

            showMessage(
                'Deep Scan Error',
                'Deep Scan could not be completed.\n\n' +
                message,
                renderSearch
            );

        } finally {
            const currentButton =
                document.getElementById('resume-deep-scan');

            if (currentButton) {
                currentButton.disabled = false;
                currentButton.textContent = 'Deep Scan';
            }
        }
    }

    async function analyzeResumeWithClaude(apiKey, resume, file, priorSummaries) {
        const lower = file.name.toLowerCase();

        let content;

        if (lower.endsWith('.pdf')) {
            const base64 = await fileToBase64(file);

            content = [
                {
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: base64
                    }
                },
                {
                    type: 'text',
                    text: buildDeepScanPrompt(resume, priorSummaries)
                }
            ];
        } else if (lower.endsWith('.docx')) {
            const extractedText =
                await withTimeout(
                    extractDocxText(file),
                    20000,
                    'Reading DOCX file: ' + file.name
                );

            content = [
                {
                    type: 'text',
                    text:
                        buildDeepScanPrompt(resume, priorSummaries) +
                        '\n\nRESUME CONTENT:\n' +
                        extractedText
                }
            ];
        } else if (lower.endsWith('.doc')) {
            throw new Error(
                'Legacy .doc files cannot be deep-scanned directly in the browser. ' +
                'Save this resume as PDF or DOCX first: ' +
                file.name
            );
        } else {
            throw new Error(
                'Unsupported resume type: ' + file.name
            );
        }

        const response =
            await callClaudeApi(apiKey, content, resume.name);

        const raw = response.responseText;

        if (response.status < 200 || response.status >= 300) {
            throw new Error(
                `Claude API ${response.status}: ${raw}`
            );
        }

        let data;

        try {
            data = JSON.parse(raw);
        } catch {
            throw new Error(
                'Claude returned an unreadable response.'
            );
        }

        const text =
            (data.content || [])
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n')
                .trim();

        if (!text) {
            throw new Error(
                'Claude did not return a resume summary.'
            );
        }

        return parseClaudeResumeResponse(text, resume);
    }

    // Outlook's Content-Security-Policy blocks direct fetch() calls to
    // api.anthropic.com from page-context script. GM_xmlhttpRequest runs
    // from Tampermonkey's own privileged context instead, which is not
    // subject to the page's CSP.
    function callClaudeApi(apiKey, content, resumeName) {
        if (USE_SERVER_API) {
            return fetch(API_BASE + '/api/resume-search/deep-scan', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    content,
                    resumeName
                })
            }).then(async response => {
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        `Deep scan failed (${response.status}) for ${resumeName}`
                    );
                }

                return {
                    status: data.status ?? response.status,
                    responseText: data.responseText ?? ''
                };
            });
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: ANTHROPIC_API_URL,
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                data: JSON.stringify({
                    model: CLAUDE_MODEL,
                    max_tokens: 1200,
                    temperature: 0.7,
                    messages: [
                        {
                            role: 'user',
                            content
                        }
                    ]
                }),
                timeout: CLAUDE_TIMEOUT_MS,
                onload: response => resolve(response),
                onerror: () => reject(
                    new Error(
                        'Network error contacting the Claude API for ' + resumeName
                    )
                ),
                ontimeout: () => reject(
                    new Error(
                        'Claude API request timed out after ' +
                        (CLAUDE_TIMEOUT_MS / 1000) +
                        ' seconds for ' + resumeName
                    )
                )
            });
        });
    }

    // =========================================================
    // DISTANCE SEARCH (GEOCODING)
    // =========================================================

    function loadGeocodeCache() {
        try {
            const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    function saveGeocodeCache(cache) {
        try {
            localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
            console.warn('NCST: Could not save geocode cache.', error);
        }
    }

    function normalizeLocationQuery(query) {
        return query.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    const US_STATE_NAMES = {
        AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
        CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
        FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
        IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
        KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
        MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
        MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
        NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
        NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
        OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
        SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
        VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
        WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia'
    };

    function resolveStateName(state) {
        const code = state.trim().toUpperCase();
        return US_STATE_NAMES[code] || state.trim();
    }

    // Same-named cities exist in multiple states (e.g. Warren, OH vs.
    // Warren, MI - a plain free-text search can match the wrong one).
    // Structured city/state parameters disambiguate correctly; a ZIP or
    // an unparseable query falls back to a US-biased free-text search.
    function buildGeocodeUrl(query) {
        const params = new URLSearchParams({
            format: 'json',
            limit: '1',
            countrycodes: 'us'
        });

        const zipMatch = query.trim().match(/^\d{5}(-\d{4})?$/);
        const cityStateMatch = query.match(/^(.+?),\s*([A-Za-z .]{2,})$/);

        if (zipMatch) {
            params.set('postalcode', zipMatch[0].slice(0, 5));
        } else if (cityStateMatch) {
            params.set('city', cityStateMatch[1].trim());
            params.set('state', resolveStateName(cityStateMatch[2]));
        } else {
            params.set('q', query);
        }

        return GEOCODE_URL + '?' + params.toString();
    }

    // Nominatim (OpenStreetMap) is a free geocoder with no API key, but
    // its usage policy caps requests at ~1/second and Outlook's CSP blocks
    // a plain fetch() to it - so this goes through GM_xmlhttpRequest (like
    // the Claude API call) and caches every result in localStorage so a
    // city is only ever looked up once.
    function geocodeLocation(query) {
        const key = normalizeLocationQuery(query);

        if (!key) {
            return Promise.resolve(null);
        }

        const cache = loadGeocodeCache();

        if (Object.prototype.hasOwnProperty.call(cache, key)) {
            return Promise.resolve(cache[key]);
        }

        return new Promise((resolve, reject) => {
            if (USE_SERVER_API) {
                fetch(
                    API_BASE +
                    '/api/resume-search/geocode?query=' +
                    encodeURIComponent(query),
                    {
                        headers: {
                            Accept: 'application/json'
                        }
                    }
                )
                    .then(async response => {
                        if (!response.ok) {
                            const data = await response.json().catch(() => ({}));
                            throw new Error(
                                data.error ||
                                'Location lookup failed for "' + query + '".'
                            );
                        }

                        return response.json();
                    })
                    .then(data => {
                        let coords = null;

                        if (Array.isArray(data) && data.length) {
                            coords = {
                                lat: parseFloat(data[0].lat),
                                lon: parseFloat(data[0].lon)
                            };
                        }

                        const updatedCache = loadGeocodeCache();
                        updatedCache[key] = coords;
                        saveGeocodeCache(updatedCache);

                        resolve(coords);
                    })
                    .catch(error => reject(error));

                return;
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: buildGeocodeUrl(query),
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NCST-Career-Services-ResumeTool/1.0'
                },
                timeout: GEOCODE_TIMEOUT_MS,
                onload: response => {
                    let coords = null;

                    try {
                        const data = JSON.parse(response.responseText);

                        if (Array.isArray(data) && data.length) {
                            coords = {
                                lat: parseFloat(data[0].lat),
                                lon: parseFloat(data[0].lon)
                            };
                        }
                    } catch (error) {
                        reject(
                            new Error(
                                'Could not read location data for "' + query + '".'
                            )
                        );
                        return;
                    }

                    const updatedCache = loadGeocodeCache();
                    updatedCache[key] = coords;
                    saveGeocodeCache(updatedCache);

                    resolve(coords);
                },
                onerror: () => reject(
                    new Error(
                        'Network error looking up location "' + query + '".'
                    )
                ),
                ontimeout: () => reject(
                    new Error(
                        'Location lookup timed out for "' + query + '".'
                    )
                )
            });
        });
    }

    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function haversineMiles(lat1, lon1, lat2, lon2) {
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_MILES * c;
    }

    // Only throttles actual network lookups (cache hits skip the delay
    // entirely) so repeat searches stay fast while respecting Nominatim's
    // ~1 request/second usage policy on first-time lookups.
    async function geocodeWithThrottle(query) {
        const key = normalizeLocationQuery(query);
        const cache = loadGeocodeCache();

        if (Object.prototype.hasOwnProperty.call(cache, key)) {
            return cache[key];
        }

        const elapsed = Date.now() - lastLiveGeocodeAt;

        if (lastLiveGeocodeAt && elapsed < GEOCODE_THROTTLE_MS) {
            await sleep(GEOCODE_THROTTLE_MS - elapsed);
        }

        lastLiveGeocodeAt = Date.now();

        return geocodeLocation(query);
    }

    async function applyDistanceFilter() {
        const locationInput =
            document.getElementById('resume-distance-location');

        const milesInput =
            document.getElementById('resume-distance-miles');

        const statusEl =
            document.getElementById('resume-distance-status');

        const applyButton =
            document.getElementById('resume-distance-apply');

        const origin = locationInput.value.trim();
        const miles = parseFloat(milesInput.value);

        if (!origin) {
            showMessage(
                'Distance Search',
                'Enter a city, state, or ZIP to search from.',
                renderSearch
            );
            return;
        }

        if (!miles || miles <= 0) {
            showMessage(
                'Distance Search',
                'Enter how many miles to search within.',
                renderSearch
            );
            return;
        }

        if (applyButton) {
            applyButton.disabled = true;
            applyButton.textContent = 'Locating...';
        }

        try {
            if (statusEl) {
                statusEl.textContent = 'Looking up "' + origin + '"...';
            }

            const originCoords = await geocodeWithThrottle(origin);

            if (!originCoords) {
                throw new Error(
                    'Could not find a location for "' + origin +
                    '". Try a different city, state, or ZIP.'
                );
            }

            // Only geocode resumes matching the current text search, to
            // keep the number of lookups (and wait time) reasonable.
            const candidates = getMatches(currentQuery);

            const resumesByLocation = new Map();

            candidates.forEach(resume => {
                const p = resume.parsed || {};

                const locationText =
                    [p.location, p.state]
                        .filter(Boolean)
                        .join(', ');

                if (!locationText) {
                    return;
                }

                if (!resumesByLocation.has(locationText)) {
                    resumesByLocation.set(locationText, []);
                }

                resumesByLocation.get(locationText).push(resume);
            });

            const locationEntries =
                Array.from(resumesByLocation.entries());

            const withinRange = {};

            for (let i = 0; i < locationEntries.length; i++) {
                const [locationText, resumes] = locationEntries[i];

                if (applyButton) {
                    applyButton.textContent =
                        `Locating ${i + 1}/${locationEntries.length}...`;
                }

                if (statusEl) {
                    statusEl.textContent =
                        `Looking up "${locationText}" (${i + 1} of ${locationEntries.length})...`;
                }

                const coords =
                    await geocodeWithThrottle(locationText);

                if (!coords) {
                    continue;
                }

                const distance =
                    haversineMiles(
                        originCoords.lat,
                        originCoords.lon,
                        coords.lat,
                        coords.lon
                    );

                if (distance <= miles) {
                    resumes.forEach(resume => {
                        withinRange[resume.id] = distance;
                    });
                }
            }

            distanceMiles = miles;
            distanceOrigin = origin;
            distanceCoords = withinRange;

            renderSearch();

        } catch (error) {
            console.error('NCST Distance Search Error:', error);

            showMessage(
                'Distance Search Error',
                error && error.message ? error.message : String(error),
                renderSearch
            );

        } finally {
            if (applyButton) {
                applyButton.disabled = false;
                applyButton.textContent = 'Apply';
            }
        }
    }

    function buildDeepScanPrompt(resume, priorSummaries) {
        const p = resume.parsed || {};

        const priorSummariesBlock =
            priorSummaries && priorSummaries.length
                ? `
This summary will appear in the same employer email as these
already-written candidate summaries. Make this one read distinctly
from them - vary your opening sentence and overall phrasing so the
email doesn't feel like a template was filled in repeatedly. Still
base everything only on THIS candidate's resume.

Previously written summaries in this batch:
${priorSummaries
    .map((item, i) =>
        `${i + 1}. ${item.headline ? item.headline + ' - ' : ''}${item.summary}`
    )
    .join('\n')}
`
                : '';

        return `
You are assisting the Career Services department at New Castle School of Trades (NCST).

Deeply review the attached resume and create a factual, employer-facing candidate summary.

IMPORTANT RULES:
- Use ONLY information actually supported by the resume.
- Never invent experience, certifications, skills, licenses, dates, employers, accomplishments, or qualifications.
- Do not make assumptions based only on the student's program.
- Focus on information useful to an employer.
- Give practical skills and certifications strong attention.
- Mention relevant employment or hands-on experience when present.
- Keep the tone professional and positive, but not exaggerated.
- Do not include sensitive personal details such as street address, phone number, email address, age, race, religion, disability, marital status, or other protected/personal information.
- Do not evaluate personality or make hiring decisions.
- If a category is not supported by the resume, leave it empty.
- Write like a person, not a template. Avoid generic filler phrases
  such as "results-driven", "highly motivated", "proven track record",
  "strong foundation in", "demonstrates strong skills in", or opening
  every summary with the candidate's name or "This candidate...".
  Let the resume's actual details (specific tools, certifications,
  employers, projects) drive the wording instead of boilerplate.
${priorSummariesBlock}
Filename metadata may contain:
Program: ${p.program || ''}
Candidate: ${[p.firstName, p.lastName].filter(Boolean).join(' ')}
Location: ${[p.location, p.state].filter(Boolean).join(', ')}
Graduation: ${[p.gradMonth, p.gradYear].filter(Boolean).join('/')}

Return ONLY valid JSON in this exact structure:
{
  "candidateName": "",
  "program": "",
  "headline": "",
  "summary": "",
  "skills": [],
  "certifications": [],
  "experienceHighlights": [],
  "educationHighlights": []
}

Writing guidance:
- headline: one short professional line, phrased in your own words for this candidate.
- summary: approximately 2-4 concise sentences written for an employer.
- skills: strongest concrete skills demonstrated by the resume.
- certifications: only certifications/licenses actually stated.
- experienceHighlights: short factual highlights of relevant work or hands-on experience.
- educationHighlights: relevant education/training explicitly shown.
`.trim();
    }

    function parseClaudeResumeResponse(text, resume) {
        let cleaned =
            text
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```$/i, '')
                .trim();

        try {
            const parsed = JSON.parse(cleaned);

            return normalizeClaudeSummary(
                parsed,
                resume
            );
        } catch (error) {
            console.warn(
                'Claude JSON parse failed. Raw response:',
                text
            );

            return normalizeClaudeSummary(
                {
                    candidateName:
                        `${resume.parsed.firstName} ${resume.parsed.lastName}`.trim(),
                    program: resume.parsed.program || '',
                    headline: '',
                    summary: text,
                    skills: [],
                    certifications: [],
                    experienceHighlights: [],
                    educationHighlights: []
                },
                resume
            );
        }
    }

    function normalizeClaudeSummary(data, resume) {
        const p = resume.parsed || {};

        return {
            candidateName:
                cleanText(data.candidateName) ||
                `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
                resume.name,
            program:
                cleanText(data.program) ||
                p.program ||
                '',
            headline:
                cleanText(data.headline),
            summary:
                cleanText(data.summary),
            skills:
                cleanStringArray(data.skills),
            certifications:
                cleanStringArray(data.certifications),
            experienceHighlights:
                cleanStringArray(data.experienceHighlights),
            educationHighlights:
                cleanStringArray(data.educationHighlights)
        };
    }

    function cleanText(value) {
        if (typeof value !== 'string') {
            return '';
        }

        return value.trim();
    }

    function cleanStringArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .filter(item => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean)
            .slice(0, 12);
    }

    async function fileToBase64(file) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        let binary = '';
        const chunkSize = 0x8000;

        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(
                ...bytes.subarray(
                    i,
                    Math.min(i + chunkSize, bytes.length)
                )
            );
        }

        return btoa(binary);
    }

    // DOCX files are ZIP archives. Outlook's Trusted Types policy blocks
    // loading external script libraries (like mammoth.js from a CDN), so
    // this reads word/document.xml directly using only built-in browser APIs.
    async function extractDocxText(file) {
        const buffer = await file.arrayBuffer();

        const xmlText =
            await readZipEntryAsText(
                buffer,
                'word/document.xml',
                file.name
            );

        const text =
            extractTextFromDocumentXml(xmlText, file.name);

        if (!text) {
            throw new Error(
                'No readable text was found in ' +
                file.name
            );
        }

        return text;
    }

    async function readZipEntryAsText(buffer, entryName, fileLabel) {
        const bytes = new Uint8Array(buffer);
        const view = new DataView(buffer);

        const EOCD_SIG = 0x06054b50;
        const CD_SIG = 0x02014b50;
        const LOCAL_SIG = 0x04034b50;

        let eocdOffset = -1;

        const minOffset =
            Math.max(0, bytes.length - 22 - 65535);

        for (let i = bytes.length - 22; i >= minOffset; i--) {
            if (view.getUint32(i, true) === EOCD_SIG) {
                eocdOffset = i;
                break;
            }
        }

        if (eocdOffset === -1) {
            throw new Error(
                'Could not read this DOCX file (invalid ZIP structure): ' +
                fileLabel
            );
        }

        const centralDirCount =
            view.getUint16(eocdOffset + 10, true);

        const centralDirOffset =
            view.getUint32(eocdOffset + 16, true);

        let entryOffset = centralDirOffset;

        let targetLocalOffset = -1;
        let targetCompressedSize = -1;
        let targetMethod = -1;

        for (let i = 0; i < centralDirCount; i++) {
            if (view.getUint32(entryOffset, true) !== CD_SIG) {
                break;
            }

            const method = view.getUint16(entryOffset + 10, true);
            const compressedSize = view.getUint32(entryOffset + 20, true);
            const nameLength = view.getUint16(entryOffset + 28, true);
            const extraLength = view.getUint16(entryOffset + 30, true);
            const commentLength = view.getUint16(entryOffset + 32, true);
            const localHeaderOffset = view.getUint32(entryOffset + 42, true);

            const nameBytes =
                bytes.subarray(
                    entryOffset + 46,
                    entryOffset + 46 + nameLength
                );

            const name = new TextDecoder('utf-8').decode(nameBytes);

            if (name === entryName) {
                targetLocalOffset = localHeaderOffset;
                targetCompressedSize = compressedSize;
                targetMethod = method;
                break;
            }

            entryOffset +=
                46 + nameLength + extraLength + commentLength;
        }

        if (targetLocalOffset === -1) {
            throw new Error(
                'This DOCX file does not contain readable document text: ' +
                fileLabel
            );
        }

        if (view.getUint32(targetLocalOffset, true) !== LOCAL_SIG) {
            throw new Error(
                'Could not read this DOCX file (corrupt entry): ' +
                fileLabel
            );
        }

        const localNameLength =
            view.getUint16(targetLocalOffset + 26, true);

        const localExtraLength =
            view.getUint16(targetLocalOffset + 28, true);

        const dataStart =
            targetLocalOffset + 30 + localNameLength + localExtraLength;

        const compressedBytes =
            bytes.slice(dataStart, dataStart + targetCompressedSize);

        let entryBytes;

        if (targetMethod === 0) {
            entryBytes = compressedBytes;
        } else if (targetMethod === 8) {
            try {
                entryBytes = inflateRawSync(compressedBytes);
            } catch (error) {
                throw new Error(
                    'Could not decompress this DOCX file (' + fileLabel + '): ' +
                    (error && error.message ? error.message : String(error))
                );
            }
        } else {
            throw new Error(
                'Unsupported DOCX compression method in ' + fileLabel
            );
        }

        return new TextDecoder('utf-8').decode(entryBytes);
    }

    // Minimal, self-contained raw DEFLATE (RFC 1951) decompressor.
    // The browser's built-in DecompressionStream was found to hang
    // indefinitely on some DOCX files inside Outlook's environment, so
    // this avoids that API entirely - it can only finish or throw.
    function inflateRawSync(input) {
        let pos = 0;
        let bitPos = 0;

        function readBit() {
            if (pos >= input.length) {
                throw new Error('DEFLATE stream ended unexpectedly');
            }

            const bit = (input[pos] >> bitPos) & 1;

            bitPos++;

            if (bitPos === 8) {
                bitPos = 0;
                pos++;
            }

            return bit;
        }

        function readBits(n) {
            let value = 0;

            for (let i = 0; i < n; i++) {
                value |= readBit() << i;
            }

            return value;
        }

        function alignToByte() {
            if (bitPos !== 0) {
                bitPos = 0;
                pos++;
            }
        }

        const MAXBITS = 15;

        function buildHuffman(lengths) {
            const count = new Array(MAXBITS + 1).fill(0);

            for (const len of lengths) {
                count[len]++;
            }

            count[0] = 0;

            const offs = new Array(MAXBITS + 1).fill(0);

            for (let i = 1; i < MAXBITS; i++) {
                offs[i + 1] = offs[i] + count[i];
            }

            const symbols = new Array(lengths.length).fill(0);

            for (let i = 0; i < lengths.length; i++) {
                if (lengths[i]) {
                    symbols[offs[lengths[i]]++] = i;
                }
            }

            return { count, symbols };
        }

        function decodeSymbol(tree) {
            let code = 0;
            let first = 0;
            let index = 0;

            for (let len = 1; len <= MAXBITS; len++) {
                code |= readBit();

                const count = tree.count[len];

                if (code - first < count) {
                    return tree.symbols[index + (code - first)];
                }

                index += count;
                first += count;
                first <<= 1;
                code <<= 1;
            }

            throw new Error('Invalid Huffman code in DOCX data');
        }

        const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
        const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
        const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
        const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
        const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

        const output = [];

        function inflateBlockData(litTree, distTree) {
            while (true) {
                const sym = decodeSymbol(litTree);

                if (sym < 256) {
                    output.push(sym);
                    continue;
                }

                if (sym === 256) {
                    return;
                }

                const lengthIndex = sym - 257;

                const length =
                    LENGTH_BASE[lengthIndex] +
                    readBits(LENGTH_EXTRA[lengthIndex]);

                const distSym = decodeSymbol(distTree);

                const distance =
                    DIST_BASE[distSym] +
                    readBits(DIST_EXTRA[distSym]);

                const start = output.length - distance;

                for (let i = 0; i < length; i++) {
                    output.push(output[start + i]);
                }
            }
        }

        function fixedTrees() {
            const litLengths = new Array(288);

            for (let i = 0; i < 144; i++) litLengths[i] = 8;
            for (let i = 144; i < 256; i++) litLengths[i] = 9;
            for (let i = 256; i < 280; i++) litLengths[i] = 7;
            for (let i = 280; i < 288; i++) litLengths[i] = 8;

            const distLengths = new Array(30).fill(5);

            return {
                lit: buildHuffman(litLengths),
                dist: buildHuffman(distLengths)
            };
        }

        function dynamicTrees() {
            const hlit = readBits(5) + 257;
            const hdist = readBits(5) + 1;
            const hclen = readBits(4) + 4;

            const clLengths = new Array(19).fill(0);

            for (let i = 0; i < hclen; i++) {
                clLengths[CODE_LENGTH_ORDER[i]] = readBits(3);
            }

            const clTree = buildHuffman(clLengths);

            const lengths = [];

            while (lengths.length < hlit + hdist) {
                const sym = decodeSymbol(clTree);

                if (sym < 16) {
                    lengths.push(sym);
                } else if (sym === 16) {
                    const repeat = readBits(2) + 3;
                    const prev = lengths[lengths.length - 1];

                    for (let i = 0; i < repeat; i++) lengths.push(prev);
                } else if (sym === 17) {
                    const repeat = readBits(3) + 3;

                    for (let i = 0; i < repeat; i++) lengths.push(0);
                } else {
                    const repeat = readBits(7) + 11;

                    for (let i = 0; i < repeat; i++) lengths.push(0);
                }
            }

            return {
                lit: buildHuffman(lengths.slice(0, hlit)),
                dist: buildHuffman(lengths.slice(hlit, hlit + hdist))
            };
        }

        let final = 0;

        do {
            final = readBits(1);
            const type = readBits(2);

            if (type === 0) {
                alignToByte();

                const len = input[pos] | (input[pos + 1] << 8);
                pos += 4;

                for (let i = 0; i < len; i++) {
                    output.push(input[pos++]);
                }
            } else if (type === 1) {
                const trees = fixedTrees();
                inflateBlockData(trees.lit, trees.dist);
            } else if (type === 2) {
                const trees = dynamicTrees();
                inflateBlockData(trees.lit, trees.dist);
            } else {
                throw new Error('Invalid DEFLATE block type in DOCX data');
            }
        } while (!final);

        return new Uint8Array(output);
    }

    // Word's document.xml has occasionally tripped up the browser's strict
    // DOMParser (e.g. XML declaration/namespace quirks from different Word
    // versions), so text runs are pulled out with a pattern match instead
    // of a full XML parse - simpler and more forgiving for this purpose.
    function extractTextFromDocumentXml(xmlText, fileLabel) {
        if (!xmlText || xmlText.indexOf('<') === -1) {
            throw new Error(
                'Decompressing this DOCX produced no readable XML data. ' +
                'The file may be corrupted: ' + fileLabel
            );
        }

        const TEXT_RUN_PATTERN = /<w:t[^>]*>([\s\S]*?)<\/w:t>/gi;

        function textFromChunk(chunk) {
            let line = '';
            let match;

            TEXT_RUN_PATTERN.lastIndex = 0;

            while ((match = TEXT_RUN_PATTERN.exec(chunk)) !== null) {
                line += decodeXmlEntities(match[1]);
            }

            return line;
        }

        const paragraphChunks =
            xmlText.split(/<w:p[ >]/i);

        const lines = [];

        for (const chunk of paragraphChunks) {
            const line = textFromChunk(chunk).trim();

            if (line) {
                lines.push(line);
            }
        }

        if (lines.length) {
            return lines.join('\n').trim();
        }

        // Fallback: paragraph splitting found nothing usable - grab every
        // text run in document order instead.
        return textFromChunk(xmlText).trim();
    }

    function decodeXmlEntities(text) {
        return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, '\'')
            .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
            .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
            .replace(/&amp;/g, '&');
    }

    function buildEmployerEmailHtml(candidateSummaries) {
        const sections =
            candidateSummaries
                .map(item =>
                    buildCandidateEmailSection(
                        item.summary
                    )
                )
                .join('');

        return `
            <div style="
                font-family:Segoe UI,Arial,sans-serif;
                font-size:14px;
                line-height:1.55;
                color:#242424;
            ">
                <p>
                    Below are candidate summaries for your review.
                    The selected resumes are available to attach separately.
                </p>

                ${sections}

                <p style="margin-top:18px;">
                    Please let me know if you would like additional information
                    about any of these candidates.
                </p>
            </div>
        `;
    }

    function buildCandidateEmailSection(summary) {
        const skills =
            summary.skills.length
                ? `
                    <div style="margin-top:8px;">
                        <strong>Key Skills:</strong>
                        ${summary.skills
                            .map(escapeHtml)
                            .join(' • ')}
                    </div>
                `
                : '';

        const certifications =
            summary.certifications.length
                ? `
                    <div style="margin-top:5px;">
                        <strong>Certifications:</strong>
                        ${summary.certifications
                            .map(escapeHtml)
                            .join(' • ')}
                    </div>
                `
                : '';

        const experience =
            summary.experienceHighlights.length
                ? `
                    <div style="margin-top:5px;">
                        <strong>Experience Highlights:</strong>
                        ${summary.experienceHighlights
                            .map(escapeHtml)
                            .join(' • ')}
                    </div>
                `
                : '';

        return `
            <div style="
                margin:16px 0;
                padding:14px 0;
                border-top:1px solid #d9d9d9;
            ">
                <div style="
                    font-size:16px;
                    font-weight:700;
                    margin-bottom:2px;
                ">
                    ${escapeHtml(summary.candidateName)}
                </div>

                ${
                    summary.program
                        ? `
                        <div style="
                            color:#616161;
                            margin-bottom:6px;
                        ">
                            ${escapeHtml(summary.program)}
                        </div>
                        `
                        : ''
                }

                ${
                    summary.headline
                        ? `
                        <div style="
                            font-weight:600;
                            margin-bottom:6px;
                        ">
                            ${escapeHtml(summary.headline)}
                        </div>
                        `
                        : ''
                }

                <div>
                    ${escapeHtml(summary.summary)}
                </div>

                ${skills}
                ${certifications}
                ${experience}
            </div>
        `;
    }

    function renderDeepScanPreview(candidateSummaries) {
        panel.innerHTML = `
            ${header('AI Resume Deep Scan')}

            <div style="
                background:#f3f4f6;
                border-radius:7px;
                padding:9px 10px;
                margin-bottom:10px;
                font-size:11px;
                color:#4b5563;
                line-height:1.45;
            ">
                Claude analyzed
                <strong>${candidateSummaries.length}</strong>
                selected resume${candidateSummaries.length === 1 ? '' : 's'}.
                ${EMBEDDED
                    ? 'Copy the employer email HTML below, or paste it into Outlook manually.'
                    : 'Review the summary before inserting it into Outlook.'}
            </div>

            <div
                id="resume-ai-preview"
                style="
                    border:1px solid #e5e7eb;
                    border-radius:7px;
                    padding:12px;
                    background:#fff;
                    max-height:45vh;
                    overflow:auto;
                "
            >
                ${lastDeepScanHtml}
            </div>

            <div style="
                display:flex;
                gap:7px;
                margin-top:10px;
            ">
                <button
                    id="resume-ai-back"
                    style="${secondaryButton()} flex:1;"
                >
                    Back
                </button>

                <button
                    id="resume-ai-key"
                    style="${secondaryButton()} flex:1;"
                >
                    ${USE_SERVER_API ? 'About AI' : 'Change API Key'}
                </button>

                <button
                    id="resume-ai-insert"
                    style="${primaryButton()} flex:1;"
                >
                    ${EMBEDDED ? 'Copy Email HTML' : 'Insert into Email'}
                </button>
            </div>
        `;

        document.getElementById(
            'resume-close'
        ).onclick =
            closePanel;

        document.getElementById(
            'resume-ai-back'
        ).onclick =
            renderSearch;

        document.getElementById(
            'resume-ai-key'
        ).onclick =
            USE_SERVER_API
                ? () => showMessage(
                    'AI Deep Scan',
                    'Deep Scan uses NCST Career Services AI on this dashboard.\n\n' +
                    'In Outlook, install the Tampermonkey script to insert summaries and attach resumes directly.',
                    showDeepScanPreview
                )
                : changeClaudeApiKey;

        document.getElementById(
            'resume-ai-insert'
        ).onclick =
            EMBEDDED
                ? copyDeepScanHtml
                : insertSummaryIntoOutlook;
    }

    function changeClaudeApiKey() {
        const current =
            localStorage.getItem(
                CLAUDE_KEY_STORAGE
            ) || '';

        const next =
            prompt(
                'Enter the Claude API key to use for Deep Scan:',
                current
            );

        if (next === null) {
            return;
        }

        const cleaned = next.trim();

        if (!cleaned) {
            localStorage.removeItem(
                CLAUDE_KEY_STORAGE
            );

            showMessage(
                'API Key',
                'Claude API key removed.',
                showDeepScanPreview
            );

            return;
        }

        localStorage.setItem(
            CLAUDE_KEY_STORAGE,
            cleaned
        );

        showMessage(
            'API Key',
            'Claude API key updated.',
            showDeepScanPreview
        );
    }

    function copyDeepScanHtml() {
        if (!lastDeepScanHtml) {
            showMessage(
                'Nothing to Copy',
                'There is no AI summary to copy.',
                showDeepScanPreview
            );
            return;
        }

        const blob = new Blob([lastDeepScanHtml], { type: 'text/html' });

        const copyPlain = async () => {
            const temp = document.createElement('div');
            temp.innerHTML = lastDeepScanHtml;
            const text = temp.textContent || temp.innerText || '';
            await navigator.clipboard.writeText(text);
        };

        if (navigator.clipboard && window.ClipboardItem) {
            navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blob,
                    'text/plain': new Blob(
                        [
                            (() => {
                                const temp = document.createElement('div');
                                temp.innerHTML = lastDeepScanHtml;
                                return temp.textContent || temp.innerText || '';
                            })()
                        ],
                        { type: 'text/plain' }
                    )
                })
            ]).then(() => {
                showMessage(
                    'Copied',
                    'Employer email HTML copied to clipboard.\n\nPaste into Outlook or your email draft.',
                    showDeepScanPreview
                );
            }).catch(() => {
                copyPlain().then(() => {
                    showMessage(
                        'Copied',
                        'Summary text copied to clipboard.',
                        showDeepScanPreview
                    );
                }).catch(error => {
                    showMessage(
                        'Copy Error',
                        error && error.message
                            ? error.message
                            : String(error),
                        showDeepScanPreview
                    );
                });
            });
        } else {
            copyPlain().then(() => {
                showMessage(
                    'Copied',
                    'Summary text copied to clipboard.',
                    showDeepScanPreview
                );
            }).catch(error => {
                showMessage(
                    'Copy Error',
                    error && error.message
                        ? error.message
                        : String(error),
                    showDeepScanPreview
                );
            });
        }
    }

    function insertSummaryIntoOutlook() {
        if (!lastDeepScanHtml) {
            showMessage(
                'Nothing to Insert',
                'There is no AI summary to insert.',
                showDeepScanPreview
            );
            return;
        }

        const editor =
            findOutlookComposeEditor();

        if (!editor) {
            showMessage(
                'Outlook Not Found',
                'I could not find an open Outlook message body.\n\n' +
                'Open a New Message or Reply, then click Insert into Email again.',
                showDeepScanPreview
            );

            return;
        }

        try {
            editor.focus();

            const spacer =
                editor.innerHTML.trim()
                    ? '<div><br></div>'
                    : '';

            editor.insertAdjacentHTML(
                'beforeend',
                spacer + lastDeepScanHtml
            );

            editor.dispatchEvent(
                new InputEvent(
                    'input',
                    {
                        bubbles: true,
                        composed: true,
                        inputType: 'insertText',
                        data: null
                    }
                )
            );

            editor.dispatchEvent(
                new Event(
                    'change',
                    {
                        bubbles: true,
                        composed: true
                    }
                )
            );

            panel.style.display = 'none';

        } catch (error) {
            console.error(
                'NCST Outlook Insert Error:',
                error
            );

            showMessage(
                'Outlook Insert Error',
                'The summary was created, but Outlook did not accept the insertion.\n\n' +
                error.message,
                showDeepScanPreview
            );
        }
    }

    function findOutlookComposeEditor() {
        const selectors = [
            'div[contenteditable="true"][role="textbox"][aria-label*="Message body" i]',
            'div[contenteditable="true"][aria-label*="message body" i]',
            'div[contenteditable="true"][role="textbox"]'
        ];

        const candidates = [];

        selectors.forEach(selector => {
            document
                .querySelectorAll(selector)
                .forEach(element => {
                    if (
                        isVisibleElement(element) &&
                        !candidates.includes(element)
                    ) {
                        candidates.push(element);
                    }
                });
        });

        if (!candidates.length) {
            return null;
        }

        const messageBody =
            candidates.find(element => {
                const label =
                    (
                        element.getAttribute('aria-label') ||
                        ''
                    ).toLowerCase();

                return label.includes(
                    'message body'
                );
            });

        if (messageBody) {
            return messageBody;
        }

        return candidates[
            candidates.length - 1
        ];
    }

    function isVisibleElement(element) {
        if (!element) {
            return false;
        }

        const style =
            window.getComputedStyle(element);

        const rect =
            element.getBoundingClientRect();

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    // =========================================================
    // ATTACH SELECTED
    // =========================================================

    async function downloadSelectedResumes() {
        if (!selectedResumes.size) {
            showMessage(
                'Selection Required',
                'Select at least one resume.',
                renderSearch
            );
            return;
        }

        const selected =
            allResumes.filter(
                resume =>
                    selectedResumes.has(resume.id)
            );

        const attachButton =
            document.getElementById('resume-attach');

        if (attachButton) {
            attachButton.disabled = true;
            attachButton.textContent = 'Downloading...';
        }

        try {
            for (const resume of selected) {
                const file = await resume.handle.getFile();
                const url = URL.createObjectURL(file);
                const link = document.createElement('a');
                link.href = url;
                link.download = file.name;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            }
        } catch (error) {
            console.error('NCST Download Error:', error);

            showMessage(
                'Download Error',
                'Unable to download selected resumes.\n\n' +
                (error && error.message ? error.message : String(error)),
                renderSearch
            );
        } finally {
            if (attachButton) {
                attachButton.disabled = false;
                attachButton.textContent = 'Download Selected';
            }
        }
    }

    async function attachSelectedResumes() {

        if (!selectedResumes.size) {
            showMessage('Selection Required', 'Select at least one resume.', renderSearch);
            return;
        }

        const selected =
            allResumes.filter(
                resume =>
                    selectedResumes.has(resume.id)
            );

        const attachButton =
            document.getElementById('resume-attach');

        if (attachButton) {
            attachButton.disabled = true;
            attachButton.textContent = 'Attaching...';
        }

        try {

            const files = [];

            for (const resume of selected) {

                const original =
                    await resume.handle.getFile();

                const file =
                    new File(
                        [original],
                        original.name,
                        {
                            type:
                                getResumeMimeType(
                                    original.name
                                ),
                            lastModified:
                                original.lastModified
                        }
                    );

                files.push(file);
            }

            const inputs =
                [
                    ...document.querySelectorAll(
                        'input[type="file"]'
                    )
                ];

            console.log(
                'NCST: Outlook file inputs found:',
                inputs.length
            );

            inputs.forEach(
                (input, index) => {
                    console.log(
                        `NCST input ${index}`,
                        {
                            accept:
                                input.getAttribute(
                                    'accept'
                                ),
                            multiple:
                                input.multiple,
                            disabled:
                                input.disabled,
                            outerHTML:
                                input.outerHTML
                        }
                    );
                }
            );

            const fileInput =
                chooseDocumentFileInput(
                    inputs
                );

            if (!fileInput) {

                panel.style.display = 'block';

                showMessage(
                    'Outlook Not Found',
                    'I could not find Outlook’s document attachment control.\n\n' +
                    'Open a New Message or Reply first, then try Attach Selected again.',
                    renderSearch
                );

                return;
            }

            console.log(
                'NCST: Using attachment input:',
                fileInput
            );

            if (
                files.length > 1 &&
                !fileInput.multiple
            ) {

                for (const file of files) {

                    await attachOneFile(
                        fileInput,
                        file
                    );

                    await sleep(900);
                }

            } else {

                const transfer =
                    new DataTransfer();

                files.forEach(
                    file =>
                        transfer.items.add(file)
                );

                fileInput.files =
                    transfer.files;

                fireFileEvents(
                    fileInput
                );
            }

            await sleep(1200);

            selectedResumes.clear();

            panel.style.display =
                'none';

            console.log(
                `NCST: Attached ${files.length} resume(s).`
            );

        } catch (error) {

            console.error(
                'NCST Resume Attachment Error:',
                error
            );

            panel.style.display =
                'block';

            showMessage(
                'Attachment Error',
                'The resume was found, but Outlook did not accept the attachment.\n\n' +
                error.message,
                renderSearch
            );

        } finally {

            if (attachButton) {
                attachButton.disabled = false;
                attachButton.textContent =
                    'Attach Selected';
            }
        }
    }

    // =========================================================
    // FIND CORRECT OUTLOOK FILE INPUT
    // =========================================================

    function chooseDocumentFileInput(inputs) {

        const candidates =
            inputs.filter(input => {

                if (input.disabled) {
                    return false;
                }

                const accept =
                    (
                        input.getAttribute(
                            'accept'
                        ) || ''
                    )
                        .toLowerCase()
                        .trim();

                if (!accept) {
                    return true;
                }

                if (
                    accept.includes('.pdf') ||
                    accept.includes('.doc') ||
                    accept.includes('.docx') ||
                    accept.includes('application/pdf') ||
                    accept.includes('application/msword') ||
                    accept.includes('officedocument') ||
                    accept.includes('*/*')
                ) {
                    return true;
                }

                if (
                    accept.includes('image/')
                ) {
                    return false;
                }

                return false;
            });

        console.log(
            'NCST: Document-capable inputs:',
            candidates.length
        );

        if (!candidates.length) {
            return null;
        }

        const multiple =
            candidates.find(
                input => input.multiple
            );

        if (multiple) {
            return multiple;
        }

        return candidates[
            candidates.length - 1
        ];
    }

    // =========================================================
    // ATTACH ONE FILE
    // =========================================================

    async function attachOneFile(
        input,
        file
    ) {

        const transfer =
            new DataTransfer();

        transfer.items.add(file);

        input.files =
            transfer.files;

        fireFileEvents(input);
    }

    function fireFileEvents(input) {

        input.dispatchEvent(
            new Event(
                'input',
                {
                    bubbles: true,
                    composed: true
                }
            )
        );

        input.dispatchEvent(
            new Event(
                'change',
                {
                    bubbles: true,
                    composed: true
                }
            )
        );
    }

    // =========================================================
    // MIME TYPES
    // =========================================================

    function getResumeMimeType(filename) {

        const lower =
            filename.toLowerCase();

        if (lower.endsWith('.pdf')) {
            return 'application/pdf';
        }

        if (lower.endsWith('.docx')) {
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        if (lower.endsWith('.doc')) {
            return 'application/msword';
        }

        return 'application/octet-stream';
    }

    // =========================================================
    // OPEN RESUME
    // =========================================================

    async function openResume(resume) {

        try {

            const file =
                await resume.handle.getFile();

            const url =
                URL.createObjectURL(file);

            window.open(
                url,
                '_blank'
            );

            setTimeout(
                () =>
                    URL.revokeObjectURL(url),
                60000
            );

        } catch (error) {

            console.error(error);

            showMessage(
                'Open Error',
                'Unable to open this resume.\n\n' +
                (error && error.message ? error.message : String(error)),
                renderSearch
            );
        }
    }

    // =========================================================
    // INDEXEDDB
    // =========================================================

    function openDatabase() {

        return new Promise(
            (resolve, reject) => {

                const request =
                    indexedDB.open(
                        DB_NAME,
                        1
                    );

                request.onupgradeneeded =
                    event => {

                        const db =
                            event.target.result;

                        if (
                            !db.objectStoreNames.contains(
                                STORE_NAME
                            )
                        ) {
                            db.createObjectStore(
                                STORE_NAME
                            );
                        }
                    };

                request.onsuccess =
                    () =>
                        resolve(
                            request.result
                        );

                request.onerror =
                    () =>
                        reject(
                            request.error
                        );
            }
        );
    }

    async function storeHandle(handle) {

        const db =
            await openDatabase();

        return new Promise(
            (resolve, reject) => {

                const transaction =
                    db.transaction(
                        STORE_NAME,
                        'readwrite'
                    );

                transaction
                    .objectStore(STORE_NAME)
                    .put(
                        handle,
                        HANDLE_KEY
                    );

                transaction.oncomplete =
                    () => resolve();

                transaction.onerror =
                    () =>
                        reject(
                            transaction.error
                        );
            }
        );
    }

    async function getStoredHandle() {

        const db =
            await openDatabase();

        return new Promise(
            (resolve, reject) => {

                const transaction =
                    db.transaction(
                        STORE_NAME,
                        'readonly'
                    );

                const request =
                    transaction
                        .objectStore(STORE_NAME)
                        .get(HANDLE_KEY);

                request.onsuccess =
                    () =>
                        resolve(
                            request.result ||
                            null
                        );

                request.onerror =
                    () =>
                        reject(
                            request.error
                        );
            }
        );
    }

    // =========================================================
    // UI HELPERS
    // =========================================================

    function header(title) {

        return `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:10px;
            ">

                <div>
                    <div style="
                        font-size:16px;
                        font-weight:700;
                    ">
                        ${escapeHtml(title)}
                    </div>

                    <div style="
                        font-size:10px;
                        color:#6b7280;
                    ">
                        Career Services
                    </div>
                </div>

                <button
                    id="resume-close"
                    style="
                        border:none;
                        background:none;
                        font-size:20px;
                        cursor:pointer;
                        ${EMBEDDED ? 'display:none;' : ''}
                    "
                >
                    ×
                </button>

            </div>
        `;
    }

    function safeBack() {
        if (folderHandle && allResumes.length) {
            renderSearch();
        } else {
            renderConnect();
        }
    }

    function showDeepScanPreview() {
        renderDeepScanPreview(lastCandidateSummaries);
    }

    function showMessage(title, message, onBack) {
        const back = onBack || safeBack;

        panel.innerHTML = `
            ${header(title)}

            <div style="
                font-size:12px;
                color:#6b7280;
                margin-bottom:8px;
            ">
                Select the text below (or use the Copy button)
                to copy this message.
            </div>

            <textarea
                id="resume-msg-text"
                readonly
                style="
                    width:100%;
                    box-sizing:border-box;
                    height:140px;
                    padding:8px 9px;
                    border:1px solid #d1d5db;
                    border-radius:6px;
                    font-size:12px;
                    font-family:Consolas,monospace;
                    resize:vertical;
                "
            >${escapeHtml(message)}</textarea>

            <div style="
                display:flex;
                gap:7px;
                margin-top:10px;
            ">
                <button
                    id="resume-msg-copy"
                    style="${secondaryButton()} flex:1;"
                >
                    Copy
                </button>

                <button
                    id="resume-msg-back"
                    style="${primaryButton()} flex:1;"
                >
                    OK
                </button>
            </div>
        `;

        document.getElementById('resume-close').onclick =
            closePanel;

        document.getElementById('resume-msg-back').onclick =
            back;

        const textarea =
            document.getElementById('resume-msg-text');

        const copyButton =
            document.getElementById('resume-msg-copy');

        copyButton.onclick = async () => {
            textarea.focus();
            textarea.select();

            try {
                await navigator.clipboard.writeText(message);
                copyButton.textContent = 'Copied!';
            } catch (error) {
                document.execCommand('copy');
                copyButton.textContent = 'Copied!';
            }

            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 1500);
        };
    }

    function renderLoading(message) {

        panel.innerHTML = `
            ${header('NCST Resume Search')}

            <div style="
                text-align:center;
                padding:20px;
                color:#6b7280;
                font-size:13px;
            ">
                ${escapeHtml(message)}
            </div>
        `;

        document.getElementById(
            'resume-close'
        ).onclick =
            closePanel;
    }

    function sleep(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );
    }

    function withTimeout(promise, ms, label) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(
                    new Error(
                        'Timed out after ' + (ms / 1000) +
                        's: ' + label
                    )
                );
            }, ms);

            promise.then(
                value => {
                    clearTimeout(timer);
                    resolve(value);
                },
                error => {
                    clearTimeout(timer);
                    reject(error);
                }
            );
        });
    }

    function escapeHtml(value) {

        const div =
            document.createElement('div');

        div.textContent =
            value ?? '';

        return div.innerHTML;
    }

    function inputStyle() {

        return `
            width:100%;
            box-sizing:border-box;
            padding:8px 9px;
            border:1px solid #d1d5db;
            border-radius:6px;
            font-size:13px;
        `;
    }

    function primaryButton() {

        return `
            border:none;
            background:#1f2937;
            color:#fff;
            border-radius:6px;
            padding:7px 10px;
            cursor:pointer;
            font-size:11px;
            font-weight:600;
        `;
    }

    function secondaryButton() {

        return `
            border:1px solid #d1d5db;
            background:#fff;
            color:#374151;
            border-radius:6px;
            padding:6px 9px;
            cursor:pointer;
            font-size:11px;
        `;
    }

    }

    init();
})();