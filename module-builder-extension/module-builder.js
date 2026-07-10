// Canvas AI Module Builder — content script
// Bring-your-own-Claude-API-key module/page/quiz builder, inserted directly via the Canvas API.

(function () {
    "use strict";

    if (window.__CANVAS_MODULE_BUILDER__) return;
    window.__CANVAS_MODULE_BUILDER__ = true;
    if (window.top !== window.self) return;

    function GM_addStyle(css){
        var el = document.createElement("style");
        el.textContent = css;
        (document.head || document.documentElement).appendChild(el);
    }

    const APIKEY_KEY = "AIgrader_APIKey";
    const UNSPLASH_KEY = "AIgrader_UnsplashKey";
    // Personal default Unsplash Access Key — used only if no key has been saved yet.
    // Don't share this file publicly (e.g. a public GitHub repo) with this left in.
    const UNSPLASH_KEY_DEFAULT = "TC22qvOXtRU4QhE3x7JmucTZ9_SSp5G3f06Lz010hAU";
    const AI_MODEL_CONTENT = "claude-sonnet-4-6";
    const AI_MODEL_CONTENT_FAST = "claude-haiku-4-5-20251001";
    const AI_MODEL_QUIZ = "claude-haiku-4-5-20251001";

    // Per-item engine choice: "detailed" (Sonnet, default) or "fast" (Haiku)
    function contentModel(itemData){ return itemData.aiEngine==="fast" ? AI_MODEL_CONTENT_FAST : AI_MODEL_CONTENT; }

    // Most activity types are short, repetitive blocks (cards, T/F statements)
    // that fit comfortably in 5000 tokens. "readcheck" generates a full content
    // page (hero + several sections) PLUS multiple question blocks interleaved —
    // needs more room or the response gets cut off mid-HTML.
    function activityMaxTokens(itemType){ return itemType === "readcheck" ? 8000 : 5000; }

    // ── TOKEN LIMITS ──────────────────────────────────────────────────────────
    // Default is 6000 so normal pages never get cut off.
    // Long Content Mode doubles this to 12000 for expanded, detailed pages.
    const TOKENS_DEFAULT = 6000;
    const TOKENS_LONG    = 12000;

    const ACTIVITY_TYPES = ["flashcard","quickcheck","termreveal","truefalse","readcheck","matching"];

    // How many items "Build All" generates at once. Anthropic tolerates several
    // concurrent requests fine; keep this modest to avoid tripping rate limits.
    const BUILD_ALL_CONCURRENCY = 3;
    const QUIZ_VERSION_COUNT = 2;

    const ITEM_TYPES = {
        intro:{label:"Intro Page",icon:"\u{1F4D8}",group:"page"},
        content:{label:"Content Page",icon:"\u{1F4C4}",group:"page"},
        video:{label:"Video Page",icon:"\u{1F3AC}",group:"page"},
        reading:{label:"Reading Page",icon:"\u{1F4D6}",group:"page"},
        activity:{label:"Activity Page",icon:"\u{1F3AF}",group:"page"},
        discussion:{label:"Discussion Prompt",icon:"\u{1F4AC}",group:"page"},
        summary:{label:"Summary Page",icon:"\u{1F4CB}",group:"page"},
        resource:{label:"Resource Page",icon:"\u{1F517}",group:"page"},
        assignment:{label:"Assignment",icon:"\u{1F4DD}",group:"assessment"},
        quiz:{label:"Quiz",icon:"\u{1F4DD}",group:"assessment"},
        miniquiz:{label:"Mini Quiz",icon:"\u270F\uFE0F",group:"assessment"},
        flashcard:{label:"Flashcard Deck",icon:"\u{1F0CF}",group:"activity"},
        quickcheck:{label:"Quick Check",icon:"\u2705",group:"activity"},
        termreveal:{label:"Vocab Builder",icon:"\u{1F4DA}",group:"activity"},
        truefalse:{label:"True / False",icon:"\u2696\uFE0F",group:"activity"},
        readcheck:{label:"Read + Check",icon:"\u{1F4D0}",group:"hybrid"},
        matching:{label:"Matching",icon:"\u{1F517}",group:"hybrid"},
        labproject:{label:"Lab Project",icon:"\u{1F6E0}",group:"lab"},
    };

    const PAGE_THEMES = {
        custom:{
            name:"\u{1F3EB} School Colors", emoji:"🏫",
            swatchBg:"#1e3a5f", swatchAcc:"#2563eb",
            preview:"Customize to your school palette",
            primary:"#1e3a5f",secondary:"#2563eb",bg:"#f0f7ff",
            headerBg:"#dbeafe",accent:"#3b82f6",text:"#111827",
            cardBg:"#eff6ff",border:"#bfdbfe"
        },
        forestGreen:{
            name:"🌲 Forest Green", emoji:"🌲",
            swatchBg:"#1B5E20", swatchAcc:"#76B041",
            preview:"Rich green, gold accents, structured",
            primary:"#1B5E20",secondary:"#33691E",bg:"#F5F7F2",
            headerBg:"#1B5E20",accent:"#76B041",text:"#2C3E2C",
            cardBg:"#FFFFFF",border:"#C8D8B8",
            gold:"#F9A825",
            heroStyle:"dark-hero",
            calloutStyle:"left-border-accent",
            fontStyle:"monospace-data"
        },
        slateGray:{
            name:"🏗️ Slate Gray", emoji:"🏗️",
            swatchBg:"#2E3A42", swatchAcc:"#E8B84B",
            preview:"Industrial gray, gold data panels",
            primary:"#2E3A42",secondary:"#5A6472",bg:"#F2F4F5",
            headerBg:"#2E3A42",accent:"#5A6472",text:"#2A3038",
            cardBg:"#FFFFFF",border:"#C8D0D8",
            gold:"#E8B84B",
            heroStyle:"dark-hero",
            calloutStyle:"left-border-cool",
            fontStyle:"technical"
        },
        navyBlue:{
            name:"⚓ Navy Blue", emoji:"⚓",
            swatchBg:"#1B3A6B", swatchAcc:"#F4A261",
            preview:"Navy, sky blue, gold — sharp & professional",
            primary:"#1B3A6B",secondary:"#2E86AB",bg:"#F0F4F8",
            headerBg:"#1B3A6B",accent:"#2E86AB",text:"#1E2D40",
            cardBg:"#FFFFFF",border:"#B8CCE0",
            gold:"#F4A261",
            heroStyle:"dark-hero",
            calloutStyle:"left-border-cool",
            fontStyle:"professional"
        },
    };

    const DOK_MAP = {
        easy:{levels:[1,2],label:"Easy (DOK 1-2)",desc:"Recall & basic concepts"},
        medium:{levels:[2,3],label:"Medium (DOK 2-3)",desc:"Apply & analyze"},
        hard:{levels:[3,4],label:"Hard (DOK 3-4)",desc:"Strategic & extended thinking"}
    };

    const PAGE_EL = {
        emojiIcons:["Emoji Icons","Add relevant emojis to section headers"],
        sectionDividers:["Section Dividers","Visual breaks between sections"],
        tipBoxes:["Tip / Reminder Boxes","Highlighted boxes for important info"],
        imagePlaceholders:["Image Placeholders","Boxes where images can be inserted"],
        collapsible:["Collapsible Sections","Click-to-expand content areas"],
        quoteBoxes:["Quote / Highlight","Styled callout boxes"],
        alertBoxes:["Warning / Alert Boxes","Red/yellow alert boxes"],
    };

    const ASSIGN_EL = {
        numberedSteps:["Numbered Steps","Step-by-step directions"],
        checklist:["Checklist","Checkbox list students can follow"],
        rubricTable:["Rubric Table","Grading criteria table"],
        pointValue:["Point Value","Show total points"],
        dueDate:["Due Date","Show due date prominently"],
        videoEmbed:["Video Embed Placeholder","Box for a YouTube/video link"],
        watchFirst:["Watch Before You Begin","Video reminder at the top"],
    };

    const LAB_EL = {
        safetyBox:["Safety / PPE","Required PPE and hazard warnings"],
        toolsList:["Tools & Materials","Equipment and supplies checklist"],
        procedure:["Step-by-Step Procedure","Numbered procedural steps"],
        observations:["Observation Table","Data recording table"],
        reflections:["Reflection Questions","Post-lab comprehension questions"],
        checklist:["Completion Checklist","Student self-check before submission"],
        rubricTable:["Rubric Table","Grading criteria"],
    };

    let overlayEl = null;

    const state = {
        step: "setup",
        apiKey: "",
        unsplashKey: "",
        modules: [],
        currentModuleIndex: 0,
        currentItemIndex: 0,
        itemData: {},
        selectedCanvasModule: null,
        status: "",
        statusType: "idle",
        insertProgress: null,
    };

    try { state.apiKey = localStorage.getItem(APIKEY_KEY) || ""; } catch(e) {}
    if(state.apiKey) state.step = "layout"; // skip setup screen once a key is already saved

    try { state.unsplashKey = localStorage.getItem(UNSPLASH_KEY) || ""; } catch(e) {}
    if(!state.unsplashKey) state.unsplashKey = UNSPLASH_KEY_DEFAULT;

    function curMod() { return state.modules[state.currentModuleIndex] || null; }
    function esc(s){var d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}
    function uid(){return "cmb_"+Date.now().toString(36)+"_"+Math.random().toString(36).substr(2,6);}
    function saveApiKey(k){try{localStorage.setItem(APIKEY_KEY,k);}catch(e){}}
    function saveUnsplashKey(k){try{localStorage.setItem(UNSPLASH_KEY,k);}catch(e){}}

    function slugify(s){
        return (s||"untitled").toLowerCase()
            .replace(/[^a-z0-9\s-]/g,"")
            .replace(/\s+/g,"-")
            .replace(/-+/g,"-")
            .replace(/^-|-$/g,"")
            .substring(0,50)||"item";
    }

    // WCAG relative luminance — used to decide whether a background needs
    // white or dark text. A fixed per-theme "dark-hero" flag isn't enough
    // because the "custom" (School Colors) theme lets the user pick any
    // header color, including dark ones, at runtime.
    function relativeLuminance(hex){
        hex = (hex || "").replace("#", "");
        if(hex.length === 3) hex = hex.split("").map(function(c){ return c + c; }).join("");
        var r = parseInt(hex.substr(0, 2), 16) / 255;
        var g = parseInt(hex.substr(2, 2), 16) / 255;
        var b = parseInt(hex.substr(4, 2), 16) / 255;
        function lin(c){ return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    }
    function isDarkColor(hex){
        var l = relativeLuminance(hex);
        return !isNaN(l) && l < 0.5;
    }

    // ========== COURSE ID EXTRACTION ==========

    function getCourseId(){
        var m = window.location.pathname.match(/\/courses\/(\d+)/);
        return m ? m[1] : null;
    }

    function getCanvasModuleId(moduleEl){
        if(!moduleEl)return null;
        var direct = moduleEl.getAttribute("data-module-id") || moduleEl.dataset.moduleId;
        if(direct)return String(direct);
        var childWithId = moduleEl.querySelector("[data-module-id]");
        if(childWithId && childWithId.getAttribute("data-module-id")) return String(childWithId.getAttribute("data-module-id"));
        var moduleLink = moduleEl.querySelector('a[href*="/modules/"]');
        if(moduleLink){
            var hrefMatch = (moduleLink.getAttribute("href") || "").match(/\/modules\/(\d+)/);
            if(hrefMatch)return hrefMatch[1];
        }
        var id = moduleEl.id || "";
        var match = id.match(/(?:context_)?module[_-](\d+)/) || id.match(/(\d+)/);
        return match ? match[1] : null;
    }

    function getCanvasModuleName(moduleEl){
        if(!moduleEl)return "Current Module";
        var titleEl =
            moduleEl.querySelector(".ig-header-title") ||
            moduleEl.querySelector(".ig-title") ||
            moduleEl.querySelector(".name") ||
            moduleEl.querySelector(".context_module_title") ||
            moduleEl.querySelector("h2,h3");
        var title = titleEl ? titleEl.textContent : "";
        title = (title || moduleEl.getAttribute("aria-label") || "Current Module")
            .replace(/\s+/g," ")
            .replace(/\bAI Builder\b/g,"")
            .trim();
        return title || "Current Module";
    }

    function selectCanvasModule(moduleEl){
        var moduleId = getCanvasModuleId(moduleEl);
        var moduleName = getCanvasModuleName(moduleEl);
        var previousId = state.selectedCanvasModule && state.selectedCanvasModule.id;
        state.selectedCanvasModule = { id: moduleId, title: moduleName };
        if(previousId !== moduleId || state.modules.length !== 1){
            state.modules = [{ id: uid(), canvasModuleId: moduleId, title: moduleName, sources: [], items: [] }];
            state.currentModuleIndex = 0;
            state.currentItemIndex = 0;
            state.itemData = {};
            state.status = "";
            state.statusType = "idle";
            state.step = state.apiKey ? "layout" : "setup";
        } else if(state.modules[0]){
            state.modules[0].canvasModuleId = moduleId;
            state.modules[0].title = moduleName;
        }
    }

    // Used for the toolbar's "+ New Module" option — builds a fresh module
    // with no canvasModuleId, so insertAllContent() creates a brand new
    // Canvas module instead of appending into an existing one.
    function selectNewModule(){
        var wasNew = state.selectedCanvasModule && state.selectedCanvasModule.id === null;
        state.selectedCanvasModule = { id: null, title: "New Module" };
        if(!wasNew || state.modules.length !== 1){
            state.modules = [{ id: uid(), canvasModuleId: null, title: "New Module", sources: [], items: [] }];
            state.currentModuleIndex = 0;
            state.currentItemIndex = 0;
            state.itemData = {};
            state.status = "";
            state.statusType = "idle";
            state.step = state.apiKey ? "layout" : "setup";
        }
    }

    function ensureSingleCanvasModule(){
        var selected = state.selectedCanvasModule || {};
        if(state.modules.length === 0){
            state.modules.push({ id: uid(), canvasModuleId: selected.id || null, title: selected.title || "Current Module", sources: [], items: [] });
        }
        if(state.modules.length > 1) state.modules = [state.modules[0]];
        state.currentModuleIndex = 0;
        state.modules[0].canvasModuleId = selected.id || state.modules[0].canvasModuleId || null;
        state.modules[0].title = selected.title || state.modules[0].title || "Current Module";
    }

    // ========== CANVAS API HELPERS ==========

    function getCSRFToken(){
        var match = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
        if(match) return decodeURIComponent(match[1]);
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute("content") : "";
    }

    async function canvasAPI(method, path, body){
        var courseId = getCourseId();
        if(!courseId) throw new Error("Could not determine course ID from URL. Navigate to a course page first.");
        var url = "/api/v1/courses/" + courseId + path;
        var opts = {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-Token": getCSRFToken()
            },
            credentials: "same-origin"
        };
        if(body && (method === "POST" || method === "PUT")){
            opts.body = JSON.stringify(body);
        }
        var resp = await fetch(url, opts);
        if(!resp.ok){
            var errText = "";
            try { errText = await resp.text(); } catch(e){}
            throw new Error("Canvas API error " + resp.status + ": " + errText);
        }
        if(resp.status === 204) return null;
        return resp.json();
    }

    // ========== CANVAS API: CREATE FUNCTIONS ==========

    async function createModule(title, position){
        return canvasAPI("POST", "/modules", {
            module: { name: title, position: position, workflow_state: "active" }
        });
    }

    async function createPage(title, html){
        return canvasAPI("POST", "/pages", {
            wiki_page: { title: title, body: html, editing_roles: "teachers", published: false }
        });
    }

    async function createAssignment(title, html, pointValue){
        return canvasAPI("POST", "/assignments", {
            assignment: {
                name: title, description: html,
                submission_types: ["online_text_entry", "online_upload"],
                points_possible: parseFloat(pointValue) || 100,
                grading_type: "points", published: false
            }
        });
    }

    async function createQuiz(title, pointsPossible){
        return canvasAPI("POST", "/quizzes", {
            quiz: {
                title: title, quiz_type: "assignment", points_possible: pointsPossible,
                shuffle_answers: true, show_correct_answers: true,
                allowed_attempts: -1, scoring_policy: "keep_highest", published: false
            }
        });
    }

    async function createQuestionGroup(quizId, name, pickCount, pointsPerQuestion){
        return canvasAPI("POST", "/quizzes/" + quizId + "/groups", {
            quiz_groups: [{ name: name, pick_count: pickCount, question_points: pointsPerQuestion }]
        });
    }

    async function createQuizQuestion(quizId, groupId, questionData){
        var payload = {
            question: {
                question_name: (questionData.question || "").slice(0, 60),
                question_text: "<p>" + esc(questionData.question || "") + "</p>",
                question_type: questionData._type,
                points_possible: questionData._points,
                quiz_group_id: groupId
            }
        };
        if(questionData._type === "multiple_choice_question" || questionData._type === "true_false_question"){
            payload.question.answers = (questionData.answers || []).map(function(a){
                return { answer_text: a.text, answer_weight: a.correct ? 100 : 0 };
            });
        }
        if(questionData._type === "short_answer_question" && questionData.answers && questionData.answers.length){
            payload.question.answers = questionData.answers.filter(function(a){return a.correct;}).map(function(a){
                return { answer_text: a.text, answer_weight: 100 };
            });
        }
        return canvasAPI("POST", "/quizzes/" + quizId + "/questions", payload);
    }

    async function addModuleItem(moduleId, itemType, contentIdOrUrl, title, position){
        var item = { module_item: { title: title, type: itemType } };
        if(position != null) item.module_item.position = position;
        if(itemType === "Page"){ item.module_item.page_url = contentIdOrUrl; }
        else { item.module_item.content_id = contentIdOrUrl; }
        return canvasAPI("POST", "/modules/" + moduleId + "/items", item);
    }

    // ========== INSERT ALL CONTENT ==========

    async function insertAllContent(progressCallback){
        var courseId = getCourseId();
        if(!courseId) throw new Error("Navigate to a Canvas course page first.");

        var totalSteps = 0;
        var completedSteps = 0;

        for(var mi = 0; mi < state.modules.length; mi++){
            totalSteps++;
            var mod = state.modules[mi];
            for(var i = 0; i < mod.items.length; i++){
                var item = mod.items[i];
                var data = state.itemData[item.id] || {};
                totalSteps++;
                if((item.type === "quiz" || item.type === "miniquiz") && data.generatedQuestions){
                    var groups = data.generatedQuestions.groups || [];
                    for(var g = 0; g < groups.length; g++){
                        totalSteps++;
                        totalSteps += (groups[g].questions || []).length;
                    }
                }
            }
        }

        function report(msg){ completedSteps++; if(progressCallback) progressCallback(completedSteps, totalSteps, msg); }

        var results = { modules: [], errors: [] };

        for(var mi = 0; mi < state.modules.length; mi++){
            var mod = state.modules[mi];
            var modTitle = mod.title || ("Module " + (mi + 1));
            var canvasMod;
            var useExistingModule = !!mod.canvasModuleId;
            try {
                if(useExistingModule){
                    canvasMod = { id: mod.canvasModuleId, name: modTitle };
                    report("Using module: " + modTitle);
                } else {
                    canvasMod = await createModule(modTitle, mi + 1);
                    report("Created module: " + modTitle);
                }
            } catch(err) {
                results.errors.push("Module '" + modTitle + "': " + err.message);
                report("ERROR creating module: " + modTitle);
                continue;
            }

            results.modules.push({ title: modTitle, id: canvasMod.id, items: [] });
            var itemPosition = 0;

            for(var i = 0; i < mod.items.length; i++){
                var item = mod.items[i];
                var data = state.itemData[item.id] || {};
                var itemInfo = ITEM_TYPES[item.type] || {label:"Item", icon:"?"};
                var itemNum = i + 1;
                itemPosition++;
                var insertPosition = useExistingModule ? null : itemPosition;

                try {
                    if(item.type === "quiz" || item.type === "miniquiz"){
                        var qTitle = data.quizTitle || (itemInfo.label + " " + itemNum);
                        if(!data.generatedQuestions || !data.generatedQuestions.groups){
                            report("Skipped (not built): " + qTitle);
                            results.modules[results.modules.length-1].items.push({ title: qTitle, status: "skipped" });
                            continue;
                        }
                        var groups = data.generatedQuestions.groups || [];
                        var totalPts = groups.reduce(function(sum, g){
                            return sum + (g.type==="mc"?1 : g.type==="tf"?1 : g.type==="sa"?5 : 10);
                        }, 0);
                        var quiz = await createQuiz(qTitle, totalPts);
                        report("Created quiz: " + qTitle);
                        for(var gi = 0; gi < groups.length; gi++){
                            var grp = groups[gi];
                            var pts = grp.type==="mc"?1 : grp.type==="tf"?1 : grp.type==="sa"?5 : 10;
                            var qType = grp.type==="mc"?"multiple_choice_question" :
                                        grp.type==="tf"?"true_false_question" :
                                        grp.type==="essay"?"essay_question" : "short_answer_question";
                            var groupResp = await createQuestionGroup(quiz.id, "Group " + (gi+1) + ": " + (grp.concept || grp.type), 1, pts);
                            var groupId = groupResp.quiz_groups ? groupResp.quiz_groups[0].id : (groupResp.id || null);
                            report("Created question group " + (gi+1) + " in " + qTitle);
                            var qs = grp.questions || [];
                            for(var qi = 0; qi < qs.length; qi++){
                                var q = qs[qi];
                                q._type = qType; q._points = pts;
                                await createQuizQuestion(quiz.id, groupId, q);
                                report("Added question V" + (qi+1) + " to group " + (gi+1));
                            }
                        }
                        await addModuleItem(canvasMod.id, "Quiz", quiz.id, qTitle, insertPosition);
                        results.modules[results.modules.length-1].items.push({ title: qTitle, status: "inserted", type: "quiz" });

                    } else if(item.type === "assignment"){
                        var assignTitle = itemInfo.label + " " + itemNum;
                        var assignHtml = data.generatedHTML || "<p>Assignment content not yet generated.</p>";
                        var pts = data.pointValue || "100";
                        var assignment = await createAssignment(assignTitle, assignHtml, pts);
                        report("Created assignment: " + assignTitle);
                        await addModuleItem(canvasMod.id, "Assignment", assignment.id, assignTitle, insertPosition);
                        results.modules[results.modules.length-1].items.push({ title: assignTitle, status: "inserted", type: "assignment" });

                    } else {
                        var pageTitle = itemInfo.label + " " + itemNum;
                        var pageHtml = data.generatedHTML || "<p>Content not yet generated.</p>";
                        var page = await createPage(pageTitle, pageHtml);
                        report("Created page: " + pageTitle);
                        await addModuleItem(canvasMod.id, "Page", page.url, pageTitle, insertPosition);
                        results.modules[results.modules.length-1].items.push({ title: pageTitle, status: "inserted", type: "page" });
                    }
                } catch(err){
                    var errTitle = (item.type === "quiz" || item.type === "miniquiz") ? (data.quizTitle || itemInfo.label) :
                                   item.type === "assignment" ? (itemInfo.label + " " + itemNum) : (itemInfo.label + " " + itemNum);
                    results.errors.push(errTitle + ": " + err.message);
                    report("ERROR: " + errTitle);
                    results.modules[results.modules.length-1].items.push({ title: errTitle, status: "error", error: err.message });
                }
            }
        }
        return results;
    }

    // ========== FILE PARSING ==========
    // pdf.js / mammoth / jszip are bundled locally (manifest.json content_scripts,
    // loaded before this file) rather than fetched from cdnjs at runtime — Chrome/Edge
    // Web Store policy prohibits extensions from fetching and executing remote code.

    async function parsePDF(file){
        var pdfLib = pdfjsLib;
        if(!pdfLib.GlobalWorkerOptions.workerSrc){
            pdfLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.min.js");
        }
        return new Promise(function(res,rej){
            var r=new FileReader();
            r.onload=async function(e){
                try{
                    var ta=new Uint8Array(e.target.result);
                    var pdf=await pdfLib.getDocument({data:ta}).promise;
                    var t="";
                    for(var i=1;i<=pdf.numPages;i++){var pg=await pdf.getPage(i);var c=await pg.getTextContent();t+=c.items.map(function(x){return x.str;}).join(" ")+"\n\n";}
                    res(t.trim());
                }catch(err){rej(err);}
            };
            r.onerror=rej; r.readAsArrayBuffer(file);
        });
    }

    async function parseDOCX(file){
        return new Promise(function(res,rej){
            var r=new FileReader();
            r.onload=async function(e){
                try{var result=await mammoth.extractRawText({arrayBuffer:e.target.result});res(result.value.trim());}catch(err){rej(err);}
            };
            r.onerror=rej; r.readAsArrayBuffer(file);
        });
    }

    function xmlDecode(s){
        return s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
    }

    async function parsePPTX(file){
        var buffer = await file.arrayBuffer();
        var zip = await JSZip.loadAsync(buffer);
        var slideNames = Object.keys(zip.files).filter(function(name){
            return /^ppt\/slides\/slide\d+\.xml$/.test(name);
        }).sort(function(a,b){
            return parseInt(a.match(/slide(\d+)\.xml/)[1],10) - parseInt(b.match(/slide(\d+)\.xml/)[1],10);
        });
        var slidesText = [];
        for(var i=0;i<slideNames.length;i++){
            var xml = await zip.files[slideNames[i]].async("string");
            var texts = [];
            var re = /<a:t>([^<]*)<\/a:t>/g;
            var m;
            while((m = re.exec(xml))){ texts.push(xmlDecode(m[1])); }
            if(texts.length) slidesText.push("Slide "+(i+1)+": "+texts.join(" "));
        }
        return slidesText.join("\n\n");
    }

    function withTimeout(promise, ms, label){
        return new Promise(function(resolve, reject){
            var timer = setTimeout(function(){
                reject(new Error((label||"Operation")+" timed out after "+Math.round(ms/1000)+"s — the file may be too large or corrupted."));
            }, ms);
            promise.then(function(v){ clearTimeout(timer); resolve(v); }, function(err){ clearTimeout(timer); reject(err); });
        });
    }

    async function parseFile(file){
        var n=file.name.toLowerCase();
        if(n.endsWith(".pdf"))return withTimeout(parsePDF(file), 120000, "Parsing "+file.name);
        if(n.endsWith(".docx"))return withTimeout(parseDOCX(file), 120000, "Parsing "+file.name);
        if(n.endsWith(".pptx"))return withTimeout(parsePPTX(file), 120000, "Parsing "+file.name);
        return new Promise(function(res,rej){var r=new FileReader();r.onload=function(e){res(e.target.result);};r.onerror=rej;r.readAsText(file);});
    }

    // ========== ITEM DATA INIT ==========

    function initItemData(item){
        if(state.itemData[item.id])return;
        if(item.type==="quiz"||item.type==="miniquiz"){
            var m=item.type==="miniquiz";
            state.itemData[item.id]={quizTitle:m?"Mini Quiz":"Quiz",difficulty:"medium",mcCount:m?3:5,tfCount:m?2:3,saCount:m?0:2,essayCount:0,textContent:"",uploadedFile:"",uploadedName:"",generatedQuestions:null,subView:"build"};
        }else if(item.type==="assignment"){
            state.itemData[item.id]={contentType:"assignment",pageStyle:"custom",customColor:"#1e3a5f",assignmentElements:{numberedSteps:true,checklist:false,rubricTable:false,pointValue:false,dueDate:false,videoEmbed:false,watchFirst:false},pointValue:"",dueDate:"",textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build"};
        }else if(item.type==="flashcard"||item.type==="quickcheck"||item.type==="termreveal"||item.type==="truefalse"||item.type==="readcheck"||item.type==="matching"){
            var defCounts={flashcard:8,quickcheck:5,termreveal:10,truefalse:7,readcheck:3,matching:8};
            state.itemData[item.id]={contentType:"activity",activityType:item.type,pageStyle:"custom",count:defCounts[item.type]||6,textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build",aiEngine:"detailed"};
        }else if(item.type==="labproject"){
            state.itemData[item.id]={contentType:"lab",pageStyle:"custom",labElements:{safetyBox:true,toolsList:true,procedure:true,observations:true,reflections:true,checklist:true,rubricTable:false},labNumber:"",estimatedTime:"",skillLevel:"beginner",pointValue:"",textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build",longContent:false,aiEngine:"detailed"};
        }else{
            state.itemData[item.id]={contentType:"page",pageStyle:"custom",customColor:"#1e3a5f",pageElements:{emojiIcons:true,sectionDividers:true,tipBoxes:true,imagePlaceholders:false,collapsible:false,quoteBoxes:false,alertBoxes:false},textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build"};
        }
    }

    // ========== CLAUDE API ==========

    function callClaude(prompt,model,maxTok){
        return new Promise(function(resolve,reject){
            if(!state.apiKey){reject(new Error("No API key"));return;}
            chrome.runtime.sendMessage({
                type:"CMB_CLAUDE",
                payload:{apiKey:state.apiKey,model:model||AI_MODEL_CONTENT,max_tokens:maxTok||TOKENS_DEFAULT,messages:[{role:"user",content:prompt}]}
            },function(resp){
                if(chrome.runtime.lastError){reject(new Error(chrome.runtime.lastError.message));return;}
                if(!resp||resp.error){reject(new Error((resp&&resp.error)||"Request failed"));return;}
                resolve(resp.text||"");
            });
        });
    }

    function getModuleSourceContext(){
        var mod=curMod();
        if(!mod||!mod.sources||!mod.sources.length)return "";
        return "\n\nMODULE SOURCE MATERIAL:\n"+mod.sources.map(function(s){return "--- "+s.name+" ---\n"+s.text.substring(0,8000);}).join("\n\n");
    }

    // Claude sometimes wraps HTML output in a ```html ... ``` fence despite
    // being told not to — strip it before the content is used or inserted.
    function stripMarkdownFence(text){
        if(!text) return text;
        var t = text.trim();
        t = t.replace(/^```[a-zA-Z]*\r?\n/,"");
        t = t.replace(/\r?\n?```\s*$/,"");
        return t.trim();
    }

    // ========== UNSPLASH IMAGES ==========
    // Generated pages can ask for a real photo by emitting a
    // "[[IMAGE: search keyword]]" marker. resolveImageMarkers() swaps each
    // marker for a real Unsplash photo (with required attribution) if an
    // Unsplash Access Key is configured, or a placeholder box otherwise.

    function unsplashSearch(keyword){
        return new Promise(function(resolve,reject){
            if(!state.unsplashKey){reject(new Error("No Unsplash key configured"));return;}
            chrome.runtime.sendMessage({type:"CMB_UNSPLASH_SEARCH",payload:{unsplashKey:state.unsplashKey,keyword:keyword}},function(resp){
                if(chrome.runtime.lastError){reject(new Error(chrome.runtime.lastError.message));return;}
                if(!resp||resp.error){reject(new Error((resp&&resp.error)||("No results for \""+keyword+"\"")));return;}
                resolve(resp);
            });
        });
    }

    // Unsplash's API terms require pinging download_location whenever a photo
    // is actually used, separate from the search call itself. Fire-and-forget.
    function triggerUnsplashDownload(location){
        if(!location||!state.unsplashKey) return;
        chrome.runtime.sendMessage({type:"CMB_UNSPLASH_DOWNLOAD",payload:{unsplashKey:state.unsplashKey,location:location}},function(){});
    }

    function imagePlaceholderTag(keyword){
        return '<div style="background:linear-gradient(135deg,#1A2028,#2E3A42);border:2px dashed #4A5A64;min-height:180px;display:flex;align-items:center;justify-content:center;color:#5A6A74;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Image: '+esc(keyword)+'</div>';
    }

    function unsplashPhotoTag(photo,keyword){
        return '<figure style="margin:24px 0;">'
            +'<img src="'+photo.url+'" alt="'+esc(keyword)+'" style="width:100%;max-width:100%;height:auto;display:block;border-radius:4px;">'
            +'<figcaption style="font-family:Arial,sans-serif;font-size:11px;color:#94A3B8;margin-top:6px;text-align:right;">Photo by <a href="'+photo.profile+'" target="_blank" rel="noopener">'+esc(photo.name)+'</a> on <a href="https://unsplash.com/?utm_source=canvas_module_builder&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a></figcaption>'
            +'</figure>';
    }

    // Replaces every "[[IMAGE: keyword]]" marker in the HTML with a real
    // Unsplash photo (falls back to a placeholder box per-keyword on error
    // or if no Unsplash key is configured).
    async function resolveImageMarkers(html){
        if(!html || html.indexOf("[[IMAGE:")<0) return html;
        var re=/\[\[IMAGE:\s*([^\]]+?)\s*\]\]/g;
        var keywords=[]; var m;
        while((m=re.exec(html))){ if(keywords.indexOf(m[1])<0) keywords.push(m[1]); }
        var replacements={};
        for(var i=0;i<keywords.length;i++){
            var kw=keywords[i];
            try{
                var photo=await unsplashSearch(kw);
                replacements[kw]=unsplashPhotoTag(photo,kw);
                triggerUnsplashDownload(photo.downloadLocation);
            }catch(err){
                replacements[kw]=imagePlaceholderTag(kw);
            }
        }
        return html.replace(re,function(full,keyword){ return replacements[keyword]; });
    }

    // Runs after every HTML generation call — strips markdown fences and
    // resolves any image markers into real photos or placeholders.
    async function finalizeGeneratedHTML(html){
        return await resolveImageMarkers(stripMarkdownFence(html));
    }

    // ========== AUTO-FILL FROM SOURCE ==========
    // Given the module's uploaded source material and the full item layout,
    // asks the AI to write a short content brief for ONE item — what that
    // specific item should cover — so items don't duplicate each other.

    function buildAutoFillPrompt(item, allItems, itemIndex, mod){
        var itemInfo = ITEM_TYPES[item.type] || {label:item.type};
        var layoutDesc = allItems.map(function(it,idx){
            var info = ITEM_TYPES[it.type] || {label:it.type};
            return (idx+1)+". "+info.label+(idx===itemIndex?"  ← WRITE THE BRIEF FOR THIS ONE":"");
        }).join("\n");
        var p = "You are helping build a Canvas LMS module from uploaded source material. Below is the full module layout (in order) and the complete source material.\n\n";
        p += "Write a focused content brief for ONE specific item in the layout — 2-4 sentences describing exactly what that item should cover, drawn from the source material. Do NOT duplicate content that other items in the layout are better suited to cover (e.g. don't repeat the intro's overview in a content page, don't restate quiz-worthy facts in a summary page).\n\n";
        p += "MODULE LAYOUT:\n"+layoutDesc+"\n\n";
        p += "ITEM TO WRITE A BRIEF FOR: #"+(itemIndex+1)+" — "+itemInfo.label+"\n\n";
        p += "SOURCE MATERIAL:\n";
        if(mod && mod.sources && mod.sources.length){
            p += mod.sources.map(function(s){return "--- "+s.name+" ---\n"+s.text.substring(0,12000);}).join("\n\n");
        }
        p += "\n\nReturn ONLY the content brief — plain text, 2-4 sentences, no markdown, no headers, no preamble.";
        return p;
    }

    // Runs automatically when leaving the Layout screen — fills
    // every item's textContent (if empty) across every module that has source
    // material uploaded, so no per-item button click is required.
    async function autoFillAllModules(){
        var panel = overlayEl.querySelector("#cmb-panel");
        for(var mi=0; mi<state.modules.length; mi++){
            var mod = state.modules[mi];
            if(!mod.sources || !mod.sources.length) continue;
            for(var ii=0; ii<mod.items.length; ii++){
                var item = mod.items[ii];
                var d = state.itemData[item.id];
                if(!d || (d.textContent && d.textContent.trim())) continue;
                var info = ITEM_TYPES[item.type] || {label:item.type};
                state.status = "Analyzing source — "+(mod.title||"Module "+(mi+1))+": "+info.label+" ("+(ii+1)+"/"+mod.items.length+")...";
                state.statusType = "loading"; renderStatus(panel);
                try{
                    var brief = await callClaude(buildAutoFillPrompt(item, mod.items, ii, mod), AI_MODEL_CONTENT_FAST, 400);
                    d.textContent = brief.trim();
                }catch(err){
                    // Skip this item on failure — user can still fill it in manually or retry via the per-item button.
                }
            }
        }
    }

    // ========== BUILD ALL ==========
    // Generates every not-yet-built item across every module, running several
    // Claude calls concurrently instead of forcing the user to click into each
    // item and wait for it one at a time.

    function itemHasSource(d, mod){
        return !!(d.textContent || d.uploadedFile || (mod && mod.sources && mod.sources.length));
    }

    function isItemBuilt(item, d){
        if(!d) return false;
        return (item.type==="quiz"||item.type==="miniquiz") ? !!d.generatedQuestions : !!d.generatedHTML;
    }

    // Runs the actual generation for one item — same logic as each builder's
    // own Generate button, just without touching the DOM.
    async function generateOneItem(item, d, mod){
        if(item.type==="quiz"||item.type==="miniquiz"){
            var total=d.mcCount+d.tfCount+d.saCount+d.essayCount;
            if(total===0) throw new Error("No question types selected");
            var raw=await callClaude(buildQuizPrompt(d),AI_MODEL_QUIZ,8192);
            var cleaned=raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
            d.generatedQuestions=JSON.parse(cleaned);d.subView="preview";
            return;
        }
        if(!itemHasSource(d,mod)) throw new Error("No source material");
        var html;
        if(ACTIVITY_TYPES.indexOf(item.type)>=0){
            html=await callClaude(buildActivityPrompt(d,item.type),contentModel(d),activityMaxTokens(item.type));
        }else if(item.type==="labproject"){
            var maxTok=d.longContent?TOKENS_LONG:TOKENS_DEFAULT;
            html=await callClaude(buildLabPrompt(d,item.type),contentModel(d),maxTok);
        }else{
            html=await callClaude(buildContentPrompt(d,item.type),AI_MODEL_CONTENT_FAST,TOKENS_DEFAULT);
        }
        d.generatedHTML=await finalizeGeneratedHTML(html);d.subView="result";
    }

    // Builds every unbuilt item across all modules, up to BUILD_ALL_CONCURRENCY
    // at a time. Resolves with {builtCount, failed:[{label,error}]}.
    function buildAllItems(onProgress){
        var pending=[];
        for(var mi=0;mi<state.modules.length;mi++){
            var mod=state.modules[mi];
            for(var i=0;i<mod.items.length;i++){
                var item=mod.items[i];
                if(!state.itemData[item.id]) initItemData(item);
                var d=state.itemData[item.id];
                if(!isItemBuilt(item,d)) pending.push({item:item,d:d,mod:mod});
            }
        }
        var total=pending.length, doneCount=0, failed=[];
        if(total===0) return Promise.resolve({builtCount:0,failed:[]});
        return new Promise(function(resolve){
            var idx=0, active=0;
            function settle(){
                if(idx>=pending.length && active===0){ resolve({builtCount:doneCount,failed:failed}); return; }
                while(active<BUILD_ALL_CONCURRENCY && idx<pending.length){
                    (function(entry){
                        active++;
                        generateOneItem(entry.item, entry.d, entry.mod)
                            .then(function(){ doneCount++; })
                            .catch(function(err){
                                var info=ITEM_TYPES[entry.item.type]||{label:entry.item.type};
                                failed.push({label:info.label,error:err.message});
                            })
                            .then(function(){
                                active--;
                                if(onProgress) onProgress(doneCount+failed.length,total,failed.length);
                                settle();
                            });
                    })(pending[idx]);
                    idx++;
                }
            }
            settle();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildContentPrompt — fixed, hardcoded template. No per-page layout
    // decisions are left to the model, so output stays simple and consistent.
    // ─────────────────────────────────────────────────────────────────────────
    function buildContentPrompt(itemData, itemType){
        var isA = itemData.contentType === "assignment";
        var tk = itemData.pageStyle || "custom";

        var theme;
        if(tk === "custom"){
            theme = Object.assign({}, PAGE_THEMES.custom, {
                primary: itemData.customColor || "#1e3a5f",
                secondary: itemData.customColor || "#1e3a5f",
                headerBg: itemData.customColor || "#1e3a5f"
            });
        } else {
            theme = PAGE_THEMES[tk] || PAGE_THEMES.custom;
        }

        var els = isA ? (itemData.assignmentElements || {}) : (itemData.pageElements || {});
        var typeLabel = ITEM_TYPES[itemType] ? ITEM_TYPES[itemType].label : "Content Page";

        // Decide header text color from the ACTUAL header background color,
        // not a fixed per-theme flag — the "custom" theme's headerBg is
        // whatever the user picked (including the dark navy default), so a
        // static "dark-hero" flag misses it and leaves near-black text on a
        // dark background.
        var isDarkHeader = isDarkColor(theme.headerBg);
        var heroText = isDarkHeader ? "#FFFFFF" : theme.text;
        var heroSubStyle = isDarkHeader ? "color:rgba(255,255,255,0.75);" : ("color:" + theme.text + ";opacity:.75;");

        var p = "Generate a clean, simple Canvas LMS " + (isA ? "assignment" : "page") + ". Follow the fixed template below exactly — do not redesign it, add decorative elements, or invent new styles. Consistency matters more than creativity here.\n\n";
        p += "PAGE TYPE: " + typeLabel + "\n\n";

        p += "FIXED TEMPLATE (use these exact inline styles, fill in the bracketed content):\n\n";
        p += "HEADER (once, at the top):\n";
        p += '<div style="background:' + theme.headerBg + ';padding:28px 32px;border-bottom:3px solid ' + theme.accent + ';">\n';
        p += '<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:' + heroText + ';margin:0 0 6px;">[TITLE]</h1>\n';
        p += '<p style="font-family:Arial,sans-serif;font-size:14px;' + heroSubStyle + 'margin:0;">[ONE-SENTENCE SUBTITLE]</p>\n';
        p += '</div>\n\n';
        p += "BODY WRAPPER (holds every section below):\n";
        p += '<div style="max-width:860px;margin:0 auto;padding:32px 28px;font-family:Arial,sans-serif;">...sections...</div>\n\n';
        p += "PER SECTION (use 1-3 sections, as many as the content needs):\n";
        p += '<h2 style="font-family:Georgia,serif;font-size:19px;font-weight:700;color:' + theme.primary + ';border-bottom:1px solid ' + theme.border + ';padding-bottom:6px;margin:24px 0 10px;">[SECTION TITLE]</h2>\n';
        p += '<p style="font-size:14px;line-height:1.7;color:' + theme.text + ';margin:0 0 14px;">[1-2 paragraphs, 2-4 sentences each]</p>\n\n';
        p += "BULLET LIST (use whenever you'd otherwise list several related items — steps, examples, criteria — inside a paragraph):\n";
        p += '<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.7;color:' + theme.text + ';"><li style="margin-bottom:4px;">[item]</li></ul>\n\n';

        var extras = [];
        if(isA){
            if(els.watchFirst) extras.push('A one-line "watch before you begin" note at the top of the body: <p style="font-size:13px;font-style:italic;color:' + theme.text + ';margin:0 0 14px;">[reminder]</p>');
            if(els.numberedSteps) extras.push('Directions as numbered steps, each: <div style="display:flex;gap:12px;margin-bottom:10px;"><span style="background:' + theme.primary + ';color:#fff;font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:2px 9px;border-radius:3px;flex-shrink:0;">[N]</span><p style="margin:0;font-size:14px;line-height:1.6;color:' + theme.text + ';">[step]</p></div>');
            if(els.checklist) extras.push('A checklist, each item: <div style="font-size:14px;margin-bottom:6px;">☐ [item]</div>');
            if(els.rubricTable) extras.push('A simple rubric table: <table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:' + theme.primary + ';color:#fff;"><th style="padding:8px;text-align:left;">Criteria</th><th style="padding:8px;text-align:left;">Points</th></tr>[data rows, padding:8px, border-bottom:1px solid ' + theme.border + ']</table>');
            if(els.videoEmbed) extras.push('A video placeholder box: <div style="background:#f1f5f9;border:1px dashed ' + theme.border + ';padding:20px;text-align:center;font-size:13px;color:#64748B;">Video link goes here</div>');
            if(els.pointValue && itemData.pointValue) extras.push('Show total points near the top: "' + itemData.pointValue + ' points"');
            if(els.dueDate && itemData.dueDate) extras.push('Show the due date near the top: "Due ' + itemData.dueDate + '"');
        } else {
            if(els.tipBoxes) extras.push('At most one tip callout: <div style="background:#fff;border-left:4px solid ' + theme.accent + ';padding:12px 16px;margin:16px 0;"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:' + theme.accent + ';margin-bottom:4px;">TIP</div><p style="margin:0;font-size:13px;color:' + theme.text + ';">[text]</p></div>');
            if(els.quoteBoxes) extras.push("At most one highlight box, same markup as the tip callout above but labeled to fit the content");
            if(els.alertBoxes) extras.push("At most one alert box, same markup as the tip callout above but border-left-color:#BF360C and the label in red");
            if(els.collapsible) extras.push("One or two collapsible sections using <details><summary>[question]</summary><p>[answer]</p></details>, no extra styling");
            if(els.sectionDividers) extras.push('A plain rule between sections: <hr style="border:none;border-top:1px solid ' + theme.border + ';margin:24px 0;">');
            if(els.emojiIcons) extras.push("One relevant emoji before each section title, inside the H2 text");
            if(els.imagePlaceholders) extras.push("Where a real photo would help, insert a marker on its own line: [[IMAGE: 2-4 word keyword]] — do not write an <img> tag yourself, 1 marker max");
        }
        if(extras.length){
            p += "OPTIONAL ELEMENTS (use the exact markup given, nothing extra):\n";
            for(var i=0;i<extras.length;i++) p += "- " + extras[i] + "\n";
            p += "\n";
        }

        p += "RULES\n";
        p += "- Use ONLY the elements above — no hero images, stat panels, gradients, summary boxes, or extra decorative blocks\n";
        p += "- Write 2-5 paragraphs of real content total (not per section) — organize into 1-3 sections as needed. Don't pad it out, but don't leave it thin either.\n";
        p += "- Use the bullet list markup whenever you'd otherwise cram several related items into one paragraph\n";
        p += "- Do not invent new colors, fonts, or layout structures\n\n";

        p += "CONTENT\n";
        if(itemData.textContent && itemData.textContent.trim()) p += itemData.textContent + "\n\n";
        if(itemData.uploadedFile) p += "FILE (" + itemData.uploadedName + "):\n" + itemData.uploadedFile + "\n\n";
        p += getModuleSourceContext();

        p += "\n\nHTML REQUIREMENTS\n";
        p += "- Return ONLY the HTML body content, no explanations, no markdown\n";
        p += "- Do NOT include <html>, <head>, or <body> tags — body content only\n";
        p += "- Use ONLY inline CSS styles — no <style> tags, no external stylesheets, no Google Fonts\n";
        p += "- Web-safe fonts only: Georgia (headings), Arial (body)\n";
        p += "- No JavaScript, no CSS variables — plain hex colors only\n";
        p += "- Every HTML tag you open must be closed before the response ends\n";
        p += "- Ready to paste directly into Canvas Rich Content Editor\n";

        return p;
    }

    // ========== QUIZ BUILDER PROMPT ==========

    function buildQuizPrompt(itemData){
        var dok=DOK_MAP[itemData.difficulty||"medium"];
        var p="You are an expert educator creating a Canvas LMS quiz with randomized question groups.\n\n";
        p+="QUIZ CONFIGURATION\nTitle: "+(itemData.quizTitle||"Quiz")+"\n";
        p+="Difficulty: "+dok.label+" - "+dok.desc+"\nDOK Levels: "+dok.levels.join(" and ")+"\n\nQUESTION GROUPS NEEDED:\n";
        if(itemData.mcCount>0)p+="- "+itemData.mcCount+" Multiple Choice x"+QUIZ_VERSION_COUNT+" versions = "+(itemData.mcCount*QUIZ_VERSION_COUNT)+" MC total\n";
        if(itemData.tfCount>0)p+="- "+itemData.tfCount+" True/False x"+QUIZ_VERSION_COUNT+" versions = "+(itemData.tfCount*QUIZ_VERSION_COUNT)+" TF total\n";
        if(itemData.saCount>0)p+="- "+itemData.saCount+" Short Answer x"+QUIZ_VERSION_COUNT+" versions = "+(itemData.saCount*QUIZ_VERSION_COUNT)+" SA total\n";
        if(itemData.essayCount>0)p+="- "+itemData.essayCount+" Essay x"+QUIZ_VERSION_COUNT+" versions = "+(itemData.essayCount*QUIZ_VERSION_COUNT)+" Essay total\n";
        p+="\nIMPORTANT - How groups work:\nEach group has exactly "+QUIZ_VERSION_COUNT+" versions of the SAME concept but worded differently.\nCanvas randomly picks ONE version from each group per student.\n\nCONTENT\n";
        if(itemData.textContent&&itemData.textContent.trim())p+=itemData.textContent+"\n\n";
        if(itemData.uploadedFile)p+="FILE ("+itemData.uploadedName+"):\n"+itemData.uploadedFile+"\n\n";
        p+=getModuleSourceContext();
        p+='\n\nRESPONSE FORMAT\nReturn ONLY a valid JSON object, no explanations, no markdown.\n\n{"quizTitle":"'+(itemData.quizTitle||"Quiz")+'","groups":[{"groupNumber":1,"type":"mc","concept":"Description","dokLevel":1,"questions":[{"version":1,"question":"Q?","answers":[{"text":"A","correct":true},{"text":"B","correct":false},{"text":"C","correct":false},{"text":"D","correct":false}]}]}]}\n\n';
        p+="RULES:\n- MC: exactly 4 choices, 1 correct\n- TF: exactly 2 answers: True and False\n- SA: no answers array\n- Essay: no answers array\n- Each group: exactly "+QUIZ_VERSION_COUNT+" question versions\n- Valid JSON only\n";
        return p;
    }

    // ========== ACTIVITY PROMPT ==========

    function buildActivityPrompt(itemData, itemType){
        var count = itemData.count || 6;
        var tk = itemData.pageStyle || "custom";
        var theme = PAGE_THEMES[tk] || PAGE_THEMES.custom;
        var pri = theme.primary;
        var p = "";

        if(itemType === "flashcard"){
            p += "Generate an interactive flashcard deck for a Canvas LMS page using <details>/<summary> tags — NO <style> blocks or JavaScript (Canvas strips <style> tags on save, which would break this activity entirely). Use the EXACT HTML structure below — only replace [PLACEHOLDERS] with real content from the source material.\n\n";
            p += "Generate exactly " + count + " cards.\n\n";
            p += "COMPLETE HTML TO OUTPUT:\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:920px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">Flashcard Review</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 20px;">Click any card to reveal its definition. (' + count + ' cards)</p>\n';
            p += '<div style="display:flex;flex-wrap:wrap;gap:14px;">\n';
            p += "<!-- Generate " + count + " cards using this exact template: -->\n";
            p += '<details style="width:240px;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.15);">\n';
            p += '  <summary style="list-style:none;cursor:pointer;background:' + pri + ';color:#fff;padding:18px;min-height:60px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Georgia,serif;font-size:16px;font-weight:700;line-height:1.3;">[TERM]</summary>\n';
            p += '  <div style="background:#fff;border:2px solid ' + pri + ';border-top:none;padding:16px 18px;">\n';
            p += '    <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#1e293b;">[DEFINITION — 1-2 clear sentences]</div>\n';
            p += '    <div style="font-family:Arial,sans-serif;font-size:11px;color:#6B7280;margin-top:8px;font-style:italic;">[SHORT EXAMPLE or context]</div>\n';
            p += '  </div>\n</details>\n';
            p += '</div></div>\n\n';
            p += "RULES: Generate exactly " + count + " <details> cards. Fill in [TERM], [DEFINITION], [SHORT EXAMPLE] from source material. Terms: 1-6 words. Definitions: 1-2 sentences. Examples: brief. Do NOT use <style> tags, <script> tags, onclick, or any CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "quickcheck"){
            p += "Generate a self-check practice quiz for a Canvas LMS page using <details>/<summary> tags — NO <style> blocks or JavaScript (Canvas strips <style> tags on save, which would break this activity entirely). Each question expands on click to reveal the correct answer highlighted among the choices, plus a one-sentence explanation. Use the EXACT HTML structure below — only fill in content.\n\n";
            p += "Generate exactly " + count + " questions, each with 4 answer choices (1 correct, 3 plausible distractors).\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">Quick Check</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Think it through, then click a question to reveal the correct answer. No grade is recorded — this is practice only.</p>\n\n';
            p += "<!-- Generate " + count + " questions using this exact template: -->\n";
            p += '<details style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden;">\n';
            p += '  <summary style="list-style:none;cursor:pointer;background:#f8fafc;padding:16px 20px;font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1e293b;">1. [QUESTION TEXT]</summary>\n';
            p += '  <div style="padding:16px 20px;background:#fff;border-top:1px solid #e5e7eb;">\n';
            p += '    <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#f0fdf4;color:#166534;font-weight:700;font-size:14px;">✓ [CORRECT CHOICE]</div>\n';
            p += '    <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#f9fafb;color:#6b7280;font-size:14px;">[WRONG CHOICE A]</div>\n';
            p += '    <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#f9fafb;color:#6b7280;font-size:14px;">[WRONG CHOICE B]</div>\n';
            p += '    <div style="padding:8px 12px;border-radius:6px;background:#f9fafb;color:#6b7280;font-size:14px;">[WRONG CHOICE C]</div>\n';
            p += '    <div style="font-size:12px;color:#374151;margin-top:10px;font-style:italic;">[ONE-SENTENCE EXPLANATION of why the correct choice is right]</div>\n';
            p += '  </div>\n</details>\n\n';
            p += "CRITICAL RULES:\n- Generate exactly " + count + " <details> questions in this exact order\n- Each has exactly 4 choices: 3 wrong + 1 correct, position of the correct choice's div in the markup can vary\n- Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or any CSS class names — inline style attributes only\n- Return ONLY valid HTML, no markdown, every tag closed\n\n";

        } else if(itemType === "termreveal"){
            p += "Generate an interactive vocabulary builder page for Canvas LMS using <details>/<summary> tags — no JavaScript or style blocks needed. Use the exact structure below.\n\n";
            p += "Generate exactly " + count + " vocabulary terms from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">Vocabulary Builder</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Click any term to expand its definition and examples. Review each one before moving on.</p>\n\n';
            p += "<!-- Generate " + count + " items using this exact template: -->\n";
            p += '<details style="margin-bottom:10px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">\n';
            p += '  <summary style="background:' + pri + ';color:#fff;padding:14px 20px;cursor:pointer;font-family:Georgia,serif;font-size:16px;font-weight:700;list-style:none;display:flex;align-items:center;gap:10px;">\n';
            p += '    <span style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.7;font-weight:400;flex-shrink:0;">TERM</span>\n';
            p += '    [TERM]\n';
            p += '  </summary>\n';
            p += '  <div style="padding:18px 22px;background:#fff;">\n';
            p += '    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1e293b;margin:0 0 10px;"><strong>Definition:</strong> [CLEAR DEFINITION — 1-2 sentences]</p>\n';
            p += '    <p style="font-family:Arial,sans-serif;font-size:14px;color:#374151;margin:0 0 8px;"><strong>Example:</strong> [CONCRETE EXAMPLE]</p>\n';
            p += '    <p style="font-family:Arial,sans-serif;font-size:12px;color:#6B7280;margin:0;font-style:italic;">[USAGE TIP, RELATED TERM, OR MEMORY AID]</p>\n';
            p += '  </div>\n</details>\n';
            p += '</div>\n\n';
            p += "RULES: Generate exactly " + count + " <details> items. Fill all [PLACEHOLDERS] with real content. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "truefalse"){
            p += "Generate an interactive True/False practice activity for Canvas LMS using <details>/<summary> tags. Use the exact structure below.\n\n";
            p += "Generate exactly " + count + " statements from the source material. Mix true and false statements roughly evenly.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">True or False?</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Read each statement and decide — then click to reveal the answer and explanation.</p>\n\n';
            p += "<!-- Generate " + count + " items. For TRUE: verdictBg=#dcfce7, verdictColor=#166534, verdict=TRUE. For FALSE: verdictBg=#fee2e2, verdictColor=#991b1b, verdict=FALSE -->\n";
            p += '<details style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">\n';
            p += '  <summary style="background:#f8fafc;padding:16px 20px;cursor:pointer;list-style:none;display:flex;align-items:flex-start;gap:14px;border-left:4px solid ' + pri + ';">\n';
            p += '    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:' + pri + ';flex-shrink:0;padding-top:2px;">T / F?</span>\n';
            p += '    <span style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1e293b;line-height:1.4;">[STATEMENT — written as a declarative sentence, no giveaways]</span>\n';
            p += '  </summary>\n';
            p += '  <div style="padding:16px 20px;border-top:1px solid #e5e7eb;background:#fff;display:flex;align-items:flex-start;gap:14px;">\n';
            p += '    <span style="background:[verdictBg];color:[verdictColor];font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:4px 12px;border-radius:4px;flex-shrink:0;letter-spacing:.5px;">[TRUE or FALSE]</span>\n';
            p += '    <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;margin:0;">[CLEAR EXPLANATION — why it is true or false, with the correct fact]</p>\n';
            p += '  </div>\n</details>\n';
            p += '</div>\n\n';
            p += "RULES: Generate exactly " + count + " <details> items. Replace [verdictBg], [verdictColor], [TRUE or FALSE] based on the actual answer. Mix approximately half true and half false. Statements should be specific and substantive — not trick questions. Return ONLY valid HTML, no markdown.\n\n";
        } else if(itemType === "readcheck"){
            p += "Generate a hybrid 'Read + Check' Canvas page: a polished content page with " + count + " comprehension questions embedded inline between content sections — NOT at the end. Students read a section, hit a question, keep reading. Think textbook with built-in checks. Use <details>/<summary> for each question — NO <style> blocks or JavaScript (Canvas strips <style> tags on save, which would break this activity entirely).\n\n";
            p += "PAGE LAYOUT:\n";
            p += "1. Hero banner: background:" + pri + "; color:#fff; padding:40px 44px 36px; font-family:Georgia,serif;\n";
            p += "   - Eyebrow label (10px, letter-spacing:2px, uppercase, color:rgba(255,255,255,0.6))\n";
            p += "   - H1 title (34px, font-weight:700, color:#fff, margin-bottom:12px)\n";
            p += "   - Subtitle paragraph (16px, color:rgba(255,255,255,0.75))\n";
            p += "2. Content area: max-width:900px; margin:0 auto; padding:44px 32px; font-family:Arial,sans-serif;\n";
            p += "3. Sections: H2 headings (font-family:Georgia,serif; 22px; font-weight:700; color:" + theme.text + "; border-bottom:2px solid #e5e7eb; padding-bottom:8px; margin:32px 0 14px)\n";
            p += "4. Body text: font-size:15px; line-height:1.75; color:" + theme.text + "; margin-bottom:16px;\n\n";
            p += "INLINE QUESTION BLOCK (use this exact structure — click the question to expand and reveal the answer):\n";
            p += '<div style="background:#f8fafc;border:2px solid ' + pri + ';border-radius:10px;padding:22px 26px;margin:32px 0;">\n';
            p += '  <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + pri + ';margin-bottom:12px;">✦ CHECK YOUR UNDERSTANDING</div>\n';
            p += '  <details>\n';
            p += '    <summary style="list-style:none;cursor:pointer;font-family:Georgia,serif;font-size:17px;font-weight:700;color:#1e293b;">[QUESTION — directly tests the section just read]</summary>\n';
            p += '    <div style="margin-top:14px;">\n';
            p += '      <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#dcfce7;color:#166534;font-weight:700;font-size:14px;">✓ [CORRECT CHOICE]</div>\n';
            p += '      <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#fff;border:1px solid #e5e7eb;color:#6b7280;font-size:14px;">[WRONG CHOICE A]</div>\n';
            p += '      <div style="padding:8px 12px;border-radius:6px;background:#fff;border:1px solid #e5e7eb;color:#6b7280;font-size:14px;">[WRONG CHOICE B]</div>\n';
            p += '      <div style="font-size:12px;color:#374151;margin-top:10px;font-style:italic;">[one-sentence reinforcement of the concept]</div>\n';
            p += '    </div>\n  </details>\n</div>\n\n';
            p += "RULES: Generate exactly " + count + " question blocks embedded at natural content breaks. Each question tests the section immediately before it. Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or CSS class names — inline style attributes only. Return ONLY valid HTML, every tag closed.\n\n";

        } else if(itemType === "matching"){
            var letters = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"];
            p += "Generate a matching activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript (Canvas strips <style> tags on save, which would break this activity entirely). For each term, clicking expands to reveal the correct definition highlighted among distractor definitions borrowed from other terms in the set.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;padding:36px 24px;">\n';
            p += '<div style="background:' + pri + ';padding:36px 40px;margin-bottom:32px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#fff;margin:0 0 8px;">Matching Activity</h2>\n';
            p += '<p style="font-family:Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.75);margin:0;">Click each term to reveal its correct definition.</p>\n';
            p += '</div>\n\n';
            p += "<!-- Generate " + count + " term blocks. For each: letter badge (A, B, C...), the term, then reveal 1 correct definition + 3 distractors drawn from OTHER terms' definitions in the set. -->\n\n";
            p += '<details style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px;background:#fff;">\n';
            p += '  <summary style="list-style:none;cursor:pointer;background:#f8fafc;padding:16px 20px;display:flex;align-items:center;gap:12px;">\n';
            p += '    <span style="background:' + pri + ';color:#fff;font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:4px 11px;border-radius:4px;flex-shrink:0;">[A/B/C...]</span>\n';
            p += '    <span style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#1e293b;">[TERM]</span>\n';
            p += '  </summary>\n';
            p += '  <div style="padding:14px 20px;border-top:1px solid #e5e7eb;">\n';
            p += '    <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#f0fdf4;color:#166534;font-weight:700;font-size:13px;">✓ [CORRECT DEFINITION]</div>\n';
            p += '    <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#f9fafb;color:#6b7280;font-size:13px;">[DISTRACTOR — from another term]</div>\n';
            p += '    <div style="padding:8px 12px;margin-bottom:6px;border-radius:6px;background:#f9fafb;color:#6b7280;font-size:13px;">[DISTRACTOR]</div>\n';
            p += '    <div style="padding:8px 12px;border-radius:6px;background:#f9fafb;color:#6b7280;font-size:13px;">[DISTRACTOR]</div>\n';
            p += '  </div>\n</details>\n';
            p += '</div>\n\n';
            p += "CRITICAL RULES:\n";
            p += "- Generate exactly " + count + " term blocks, lettered " + letters.slice(0, count).join(", ") + "\n";
            p += "- Each term: 1 correct definition + 3 distractors borrowed from other terms' definitions in this same set\n";
            p += "- Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or CSS class names — inline style attributes only\n";
            p += "- Return ONLY valid HTML, no markdown, every tag closed\n\n";
        }

        p += "SOURCE MATERIAL:\n";
        if(itemData.textContent && itemData.textContent.trim()) p += itemData.textContent + "\n\n";
        if(itemData.uploadedFile) p += "FILE (" + itemData.uploadedName + "):\n" + itemData.uploadedFile + "\n\n";
        p += getModuleSourceContext();
        return p;
    }

    // ========== LAB PROJECT PROMPT ==========

    function buildLabPrompt(itemData, itemType){
        var tk = itemData.pageStyle || "custom";
        var theme = PAGE_THEMES[tk] || PAGE_THEMES.custom;
        var pri = theme.primary;
        var gold = theme.gold || "#E8B84B";
        var textColor = theme.text || "#2A3038";
        var borderColor = theme.border || "#C8D0D8";
        var els = itemData.labElements || {};
        var isLong = !!itemData.longContent;
        var skillLabel = {beginner:"Beginner / Entry Level",intermediate:"Intermediate",advanced:"Advanced / Journeyman"}[itemData.skillLevel||"beginner"] || "Beginner";

        var p = "You are an expert vocational/trade school curriculum designer. Generate a complete, professional lab project page for Canvas LMS. This is for a trade school — safety-conscious, clearly procedural, practical. Use ONLY inline CSS (Canvas strips <style> blocks and external stylesheets). Return ONLY valid HTML body content — no <html>/<head>/<body> tags, no markdown, every tag closed.\n\n";

        p += "LAB CONFIGURATION:\n";
        if(itemData.labNumber) p += "Lab Number: " + itemData.labNumber + "\n";
        if(itemData.estimatedTime) p += "Estimated Time: " + itemData.estimatedTime + "\n";
        p += "Skill Level: " + skillLabel + "\n";
        if(itemData.pointValue) p += "Points: " + itemData.pointValue + "\n";
        p += "\n";

        p += "REQUIRED PAGE STRUCTURE (generate in this exact order):\n\n";

        p += "1. SAFETY STRIP — always at the very top:\n";
        p += '   <div style="background:#F59E0B;color:#1c1917;padding:10px 24px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">⚠ SAFETY NOTICE — Review ALL safety requirements before beginning this lab</div>\n\n';

        p += "2. LAB HEADER:\n";
        p += "   Outer div: background:" + pri + "; padding:40px 44px 36px;\n";
        if(itemData.labNumber) p += "   Eyebrow: 'LAB " + itemData.labNumber + "' — font-size:10px; letter-spacing:3px; text-transform:uppercase; color:" + gold + "; font-family:Arial,sans-serif; font-weight:700; margin-bottom:10px;\n";
        p += "   H1: derive a specific descriptive lab title from the source — Georgia serif; font-size:34px; color:#fff; margin-bottom:12px\n";
        p += "   Subtitle: brief purpose statement; font-size:15px; color:rgba(255,255,255,0.75); max-width:620px\n";
        p += "   Metadata pills (display:flex; gap:12px; margin-top:16px): background:rgba(255,255,255,0.12); padding:4px 14px; font-size:12px; color:#fff; font-family:Arial,sans-serif;\n";
        p += "   Pills: " + (itemData.estimatedTime ? '"⏱ '+itemData.estimatedTime+'"' : '"⏱ Estimated Time: [derive]"') + ", \"📊 " + skillLabel + '"' + (itemData.pointValue ? ', "📋 '+itemData.pointValue+' pts"' : '') + "\n\n";

        p += "3. CONTENT AREA: max-width:920px; margin:0 auto; padding:48px 32px; font-family:Arial,sans-serif;\n";
        p += "   H2 sections: font-family:Georgia,serif; font-size:22px; font-weight:700; color:" + textColor + "; border-bottom:2px solid " + borderColor + "; padding-bottom:8px; margin:36px 0 16px;\n";
        p += "   Body text: font-size:15px; line-height:1.75; color:" + textColor + "; margin-bottom:14px;\n";
        p += "   Cards: background:#fff; border:1px solid " + borderColor + "; padding:22px 26px; margin-bottom:18px;\n\n";

        p += "4. LEARNING OBJECTIVES (always include):\n";
        p += "   3-5 specific, measurable objectives using action verbs (Identify, Demonstrate, Calculate, Connect, Apply, Assemble, etc.)\n\n";

        if(els.safetyBox){
            p += "5. SAFETY & PPE (red-left-border callout):\n";
            p += "   background:#fff; border-left:5px solid #DC2626; padding:18px 22px; margin:24px 0;\n";
            p += "   Title: '⚠ REQUIRED SAFETY EQUIPMENT' — font-size:10px; font-weight:700; color:#DC2626; letter-spacing:2px; text-transform:uppercase; margin-bottom:12px;\n";
            p += "   List each required PPE item specific to this trade (safety glasses, gloves, arc flash PPE, respirator — only what applies)\n";
            p += "   Below PPE list: HAZARD NOTES with specific dangers relevant to this task (electrical, chemical, pinch points, hot surfaces, etc.)\n\n";
        }

        if(els.toolsList){
            p += "6. TOOLS & MATERIALS:\n";
            p += "   Two-column grid: display:grid; grid-template-columns:1fr 1fr; gap:20px\n";
            p += "   Left col — Tools/Equipment; Right col — Materials/Supplies\n";
            p += "   Each item: <div style='padding:6px 0;border-bottom:1px solid " + borderColor + ";font-size:14px;font-family:Arial,sans-serif;'>☐ [specific item with spec/size/rating]</div>\n";
            p += "   Be specific to the trade (e.g. electrical: 14 AWG THHN, 20A AFCI breaker; welding: 0.030 ER70S-6 wire, auto-darkening helmet)\n\n";
        }

        p += "7. PROCEDURE — most critical section, always include:\n";
        p += "   Use div-based numbered steps (not <ol>) so badges render correctly in Canvas.\n";
        p += "   Each step:\n";
        p += "   <div style='display:flex;align-items:flex-start;gap:14px;margin-bottom:16px;'>\n";
        p += "     <span style='background:" + pri + ";color:#fff;font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:3px 10px;border-radius:2px;flex-shrink:0;min-width:28px;text-align:center;'>01</span>\n";
        p += "     <div><p style='margin:0 0 4px;font-size:15px;line-height:1.7;color:" + textColor + ";'>[imperative instruction — Measure and cut..., Connect the..., Verify that...]</p></div>\n";
        p += "   </div>\n";
        p += "   Number with leading zeros (01, 02, 03...). Group into phases if over 8 steps (Phase 1: Setup, Phase 2: Assembly, Phase 3: Testing, Phase 4: Cleanup).\n";
        p += "   For safety-critical steps, add below the instruction: <span style='background:#FEF3C7;color:#92400E;font-size:12px;font-weight:700;padding:2px 10px;border-radius:3px;'>⚠ [specific warning]</span>\n";
        p += "   Generate " + (isLong ? "12-20 detailed steps" : "8-12 clear, specific steps") + "\n\n";

        if(els.observations){
            p += "8. OBSERVATIONS & DATA RECORDING:\n";
            p += "   One intro sentence, then a table: width:100%; border-collapse:collapse; margin:16px 0;\n";
            p += "   Header row: background:" + pri + "; color:#fff; padding:10px 14px; font-size:12px; font-weight:700; text-align:left;\n";
            p += "   Data rows: border-bottom:1px solid " + borderColor + "; padding:12px 14px; alternating #fff/#F8FAFC\n";
            p += "   4-6 rows relevant to the task (e.g. electrical: Measurement Point | Expected Value | Measured Value | Pass/Fail)\n\n";
        }

        if(els.reflections){
            p += "9. REFLECTION QUESTIONS:\n";
            p += "   3-5 post-lab questions mixing comprehension and application\n";
            p += "   Each: <div style='background:#F8FAFC;border:1px solid " + borderColor + ";padding:16px 20px;margin-bottom:12px;'><p style='font-family:Georgia,serif;font-size:16px;font-weight:700;color:" + textColor + ";margin:0 0 10px;'>[N]. [Question]</p><div style='border-bottom:1px solid " + borderColor + ";padding-bottom:40px;font-size:12px;color:#94A3B8;font-family:Arial,sans-serif;'>Answer here</div></div>\n\n";
        }

        if(els.checklist){
            p += "10. BEFORE YOU SUBMIT checklist (gold callout):\n";
            p += "    background:#fff; border-left:5px solid " + gold + "; padding:18px 22px; margin:24px 0;\n";
            p += "    Title: '✓ BEFORE YOU SUBMIT' — font-size:10px; font-weight:700; color:" + gold + "; letter-spacing:2px; text-transform:uppercase; margin-bottom:12px;\n";
            p += "    5-8 items specific to this lab (e.g. 'All measurements recorded', 'Tools cleaned and returned', 'Workspace cleared')\n";
            p += "    Each: <div style='padding:5px 0;font-size:14px;font-family:Arial,sans-serif;'>☐ [item]</div>\n\n";
        }

        if(els.rubricTable){
            p += "11. GRADING RUBRIC:\n";
            p += "    Table: width:100%; border-collapse:collapse; font-size:13px; margin-top:12px;\n";
            p += "    Columns: Criteria | Excellent (4) | Proficient (3) | Developing (2) | Beginning (1)\n";
            p += "    Header: background:" + pri + "; color:#fff; padding:10px 14px; text-align:left;\n";
            p += "    4-5 criteria rows; alternating #fff/#F8FAFC; padding:10px 14px; border-bottom:1px solid " + borderColor + ";\n\n";
        }

        p += "DESIGN RULES:\n";
        p += "- Use " + pri + " for all headers, step badges, table headers\n";
        p += "- Use #DC2626 ONLY for safety/PPE callouts — nowhere else\n";
        p += "- Use " + gold + " for the completion checklist callout\n";
        p += "- Use #F59E0B for the safety strip at top\n";
        p += "- Georgia serif for H1/H2; Arial for all body text, badges, and UI\n";
        p += "- No border-radius above 4px — technical document, not a consumer app\n";
        p += "- No decorative gradients\n";
        p += "- ONLY inline CSS — no <style> tags\n";
        p += "- Return ONLY valid HTML body content — every tag closed\n\n";

        p += "SOURCE MATERIAL / LAB TOPIC:\n";
        if(itemData.textContent && itemData.textContent.trim()) p += itemData.textContent + "\n\n";
        if(itemData.uploadedFile) p += "FILE (" + itemData.uploadedName + "):\n" + itemData.uploadedFile + "\n\n";
        p += getModuleSourceContext();
        return p;
    }

    // ========== CSS STYLES ==========

    var CSS = `
    #cmb-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:30px 20px;font-family:system-ui,-apple-system,sans-serif;}
    #cmb-panel{background:#F8FAFC;border-radius:20px;max-width:1100px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 60px);}
    .cmb-topbar{background:linear-gradient(135deg,#7C3AED,#4C1D95);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;}
    .cmb-topbar h1{margin:0;font-size:18px;font-weight:700;}
    .cmb-topbar-sub{font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px;}
    .cmb-close{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;}
    .cmb-close:hover{background:rgba(255,255,255,0.25);}
    .cmb-stepbar{display:flex;gap:4px;padding:16px 24px 0;}
    .cmb-stepdot{flex:1;height:4px;border-radius:4px;background:#E2E8F0;transition:background 0.3s;}
    .cmb-stepdot.active{background:#7C3AED;}
    .cmb-stepdot.done{background:#10B981;}
    .cmb-body{flex:1;overflow-y:auto;padding:20px 24px 24px;}
    .cmb-status{padding:10px 24px;font-size:13px;border-top:1px solid #e5e7eb;}
    .cmb-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
    .cmb-h2{font-size:18px;font-weight:700;color:#1E293B;margin:0 0 4px;}
    .cmb-desc{font-size:13px;color:#64748B;margin:0 0 16px;}
    .cmb-label{display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:4px;}
    .cmb-input,.cmb-select,.cmb-textarea{width:100%;padding:9px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;color:#1E293B;background:#fff;box-sizing:border-box;font-family:inherit;}
    .cmb-input:focus,.cmb-select:focus,.cmb-textarea:focus{outline:none;border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,0.12);}
    .cmb-textarea{resize:vertical;min-height:80px;}
    .cmb-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:transform 0.15s;}
    .cmb-btn:hover{transform:translateY(-1px);}
    .cmb-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
    .cmb-btn-primary{background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;box-shadow:0 4px 14px rgba(124,58,237,0.3);}
    .cmb-btn-secondary{background:#fff;color:#475569;border:1px solid #CBD5E1;}
    .cmb-btn-success{background:linear-gradient(135deg,#10B981,#059669);color:#fff;}
    .cmb-btn-ai{background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;box-shadow:0 4px 14px rgba(245,158,11,0.3);}
    .cmb-btn-danger{background:#fff;color:#EF4444;border:1px solid #FCA5A5;}
    .cmb-btn-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}
    .cmb-layout-wrap{display:flex;gap:16px;align-items:flex-start;}
    .cmb-layout-main{flex:1;min-width:0;}
    .cmb-layout-side{width:280px;flex-shrink:0;position:sticky;top:0;}
    .cmb-layout-list{list-style:none;padding:0;margin:0 0 16px;}
    .cmb-layout-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:6px;cursor:grab;}
    .cmb-layout-item:hover{box-shadow:0 2px 8px rgba(0,0,0,0.08);}
    .cmb-layout-item .icon{font-size:18px;}
    .cmb-layout-item .lbl{flex:1;font-size:13px;font-weight:500;}
    .cmb-layout-item .rm{color:#ef4444;cursor:pointer;font-size:16px;border:none;background:none;padding:4px;}
    .cmb-add-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
    .cmb-add-btn{font-size:11px;padding:5px 10px;border-radius:6px;cursor:pointer;border:1px solid #CBD5E1;background:#fff;color:#475569;}
    .cmb-add-btn:hover{background:#F5F3FF;border-color:#7C3AED;color:#7C3AED;}
    .cmb-build-wrap{display:flex;gap:16px;min-height:500px;}
    .cmb-sidebar{width:220px;flex-shrink:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;overflow-y:auto;max-height:600px;}
    .cmb-sidebar-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;color:#475569;border:1px solid transparent;margin-bottom:4px;transition:all 0.15s;}
    .cmb-sidebar-item:hover{background:#F5F3FF;}
    .cmb-sidebar-item.active{background:#F5F3FF;border-color:#7C3AED;color:#7C3AED;}
    .cmb-sidebar-item .icon{font-size:14px;}
    .cmb-sidebar-item .done-badge{font-size:10px;margin-left:auto;}
    .cmb-content-area{flex:1;min-width:0;}
    .cmb-el-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
    .cmb-el-toggle{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:12px;transition:border-color 0.2s;}
    .cmb-el-toggle:hover{border-color:#a78bfa;}
    .cmb-el-toggle.on{border-color:#7C3AED;background:#F5F3FF;}
    .cmb-el-toggle .dot{width:8px;height:8px;border-radius:50%;background:#CBD5E1;}
    .cmb-el-toggle.on .dot{background:#7C3AED;}

    /* ── LONG CONTENT TOGGLE ── */
    .cmb-long-toggle{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:border-color 0.2s,background 0.2s;margin-bottom:12px;}
    .cmb-long-toggle:hover{border-color:#a78bfa;}
    .cmb-long-toggle.on{border-color:#7C3AED;background:#F5F3FF;}
    .cmb-long-pill{width:36px;height:20px;border-radius:10px;background:#CBD5E1;position:relative;transition:background 0.2s;flex-shrink:0;}
    .cmb-long-pill.on{background:#7C3AED;}
    .cmb-long-pill::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left 0.2s;}
    .cmb-long-pill.on::after{left:19px;}
    .cmb-long-info{flex:1;}
    .cmb-long-title{font-size:13px;font-weight:700;color:#1E293B;}
    .cmb-long-sub{font-size:11px;color:#64748B;margin-top:2px;}
    .cmb-long-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:#EDE9FE;color:#6D28D9;}
    .cmb-long-toggle.on .cmb-long-badge{background:#7C3AED;color:#fff;}

    /* ── AI ENGINE TOGGLE ── */
    .cmb-engine-toggle{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:border-color 0.2s,background 0.2s;margin-bottom:12px;}
    .cmb-engine-toggle:hover{border-color:#38bdf8;}
    .cmb-engine-toggle.on{border-color:#0284C7;background:#F0F9FF;}
    .cmb-engine-pill{width:36px;height:20px;border-radius:10px;background:#CBD5E1;position:relative;transition:background 0.2s;flex-shrink:0;}
    .cmb-engine-pill.on{background:#0284C7;}
    .cmb-engine-pill::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left 0.2s;}
    .cmb-engine-pill.on::after{left:19px;}
    .cmb-engine-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:#E0F2FE;color:#0369A1;}
    .cmb-engine-toggle.on .cmb-engine-badge{background:#0284C7;color:#fff;}

    /* ── THEME SWATCH GRID ── */
    .cmb-theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:12px;}
    .cmb-theme-swatch{border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;font-size:12px;background:#fff;}
    .cmb-theme-swatch:hover{border-color:#a78bfa;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
    .cmb-theme-swatch.sel{border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,0.18);}
    .cmb-swatch-bar{height:48px;display:flex;align-items:center;justify-content:center;gap:0;position:relative;}
    .cmb-swatch-main{flex:2;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;}
    .cmb-swatch-stripe{flex:1;height:100%;}
    .cmb-swatch-info{padding:8px 10px;}
    .cmb-swatch-name{font-weight:700;color:#1E293B;font-size:12px;line-height:1.2;margin-bottom:2px;}
    .cmb-swatch-preview{font-size:10px;color:#64748B;line-height:1.3;}

    .cmb-file-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
    .cmb-file-chip{background:#EDE9FE;color:#6D28D9;padding:4px 10px;border-radius:6px;font-size:11px;display:flex;align-items:center;gap:4px;}
    .cmb-file-chip .x{cursor:pointer;font-weight:bold;}
    .cmb-tab-bar{display:flex;gap:0;margin-bottom:0;border-bottom:2px solid #e5e7eb;}
    .cmb-tab{padding:8px 16px;cursor:pointer;font-size:13px;font-weight:500;color:#64748B;border-bottom:2px solid transparent;margin-bottom:-2px;}
    .cmb-tab.active{color:#7C3AED;border-bottom-color:#7C3AED;}
    .cmb-preview-frame{width:100%;min-height:400px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;background:#fff;}
    .cmb-code-area{width:100%;min-height:400px;font-family:monospace;font-size:12px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;padding:10px;box-sizing:border-box;resize:vertical;}
    .cmb-diff-grid{display:flex;gap:8px;margin-bottom:12px;}
    .cmb-diff-btn{flex:1;padding:10px;border-radius:10px;cursor:pointer;text-align:center;font-weight:600;font-size:13px;border:2px solid #e5e7eb;background:#fff;transition:border-color 0.2s;}
    .cmb-diff-btn:hover{border-color:#a78bfa;}
    .cmb-diff-btn.sel{border-color:#7C3AED;background:#F5F3FF;}
    .cmb-qmix-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;}
    .cmb-qmix-row .qlabel{flex:1;font-size:13px;font-weight:500;}
    .cmb-qmix-row .qcount{display:flex;align-items:center;gap:6px;}
    .cmb-qmix-row .qcount button{width:24px;height:24px;border-radius:6px;border:1px solid #CBD5E1;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;}
    .cmb-qmix-row .qcount button:hover{background:#F5F3FF;}
    .cmb-qmix-row .qcount span{min-width:20px;text-align:center;font-weight:600;font-size:14px;}
    .cmb-group-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;overflow:hidden;}
    .cmb-group-header{padding:10px 14px;font-size:13px;font-weight:600;color:#fff;display:flex;justify-content:space-between;align-items:center;}
    .cmb-group-body{padding:12px 14px;}
    .cmb-q-block{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;}
    .cmb-q-block:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
    .cmb-ver-badge{font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;color:#fff;}
    .cmb-q-text{width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;font-size:12px;min-height:40px;resize:vertical;font-family:inherit;margin:6px 0;}
    .cmb-ans-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:12px;}
    .cmb-ans-dot{width:14px;height:14px;border-radius:50%;border:2px solid #CBD5E1;cursor:pointer;flex-shrink:0;}
    .cmb-ans-dot.correct{background:#10B981;border-color:#10B981;}
    .cmb-ans-input{flex:1;border:1px solid #e5e7eb;border-radius:4px;padding:4px 6px;font-size:12px;}
    .cmb-insert-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}
    .cmb-insert-item .icon{font-size:16px;}
    .cmb-insert-item .status{font-size:11px;padding:2px 6px;border-radius:4px;}
    .cmb-insert-item .status.ready{background:#D1FAE5;color:#065F46;}
    .cmb-insert-item .status.empty{background:#FEE2E2;color:#991B1B;}
    .cmb-insert-item .status.inserting{background:#DBEAFE;color:#1E40AF;}
    .cmb-insert-item .status.done{background:#D1FAE5;color:#065F46;}
    .cmb-insert-item .status.error{background:#FEE2E2;color:#991B1B;}
    .cmb-color-input{width:60px;height:30px;border:none;border-radius:6px;cursor:pointer;padding:0;}
    .cmb-import-steps{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-top:12px;}
    .cmb-import-steps h4{margin:0 0 8px;font-size:13px;font-weight:700;color:#065F46;}
    .cmb-import-steps ol{margin:0;padding-left:18px;}
    .cmb-import-steps li{font-size:12px;color:#065F46;margin-bottom:4px;line-height:1.5;}
    .cmb-mod-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
    .cmb-mod-tab{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;border:1px solid #e2e8f0;background:#fff;color:#475569;transition:border-color 0.2s;}
    .cmb-mod-tab:hover{border-color:#a78bfa;}
    .cmb-mod-tab.active{border-color:#7C3AED;background:#F5F3FF;color:#7C3AED;}
    .cmb-mod-del{font-size:13px;font-weight:bold;color:#94a3b8;cursor:pointer;padding:0 2px;line-height:1;}
    .cmb-mod-del:hover{color:#ef4444;}
    .cmb-mod-divider{height:1px;background:#e5e7eb;margin:8px 0;}
    .cmb-progress-bar{width:100%;background:#E2E8F0;border-radius:8px;height:8px;overflow:hidden;margin:12px 0;}
    .cmb-progress-fill{height:100%;background:linear-gradient(90deg,#7C3AED,#10B981);border-radius:8px;transition:width 0.3s;}
    .cmb-progress-log{max-height:200px;overflow-y:auto;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;font-size:11px;font-family:monospace;color:#475569;margin-top:8px;}
    .cmb-progress-log div{padding:2px 0;}
    .cmb-progress-log .error{color:#EF4444;}
    .cmb-progress-log .success{color:#10B981;}
    `;

    // ========== RENDER SYSTEM ==========

    function render(){
        if(!overlayEl)return;
        var panel=overlayEl.querySelector("#cmb-panel");
        if(!panel)return;
        var body=panel.querySelector(".cmb-body");
        if(!body)return;
        renderTopbarModule();
        body.innerHTML="";
        renderStepBar(panel);
        switch(state.step){
            case "setup": renderSetup(body); break;
            case "layout": renderLayout(body); break;
            case "build": renderBuild(body); break;
            case "insert": renderInsert(body); break;
        }
        renderStatus(panel);
    }

    function renderTopbarModule(){
        var el=overlayEl.querySelector("#cmb-topbar-sub");
        if(!el)return;
        var mod=curMod();
        el.textContent=(mod && mod.title) || "";
    }

    function renderStepBar(panel){
        var bar=panel.querySelector(".cmb-stepbar");
        if(!bar)return;
        var steps=["setup","layout","build","insert"];
        var ci=steps.indexOf(state.step);
        bar.innerHTML="";
        for(var i=0;i<steps.length;i++){
            var d=document.createElement("div");
            d.className="cmb-stepdot"+(i<ci?" done":"")+(i===ci?" active":"");
            bar.appendChild(d);
        }
    }

    function renderStatus(panel){
        var el=panel.querySelector(".cmb-status");
        if(!el)return;
        if(!state.status){el.style.display="none";return;}
        el.style.display="block";
        var colors={success:"#166534",error:"#b91c1c",loading:"#1d4ed8",idle:"#6b7280"};
        var bgs={success:"#f0fdf4",error:"#fef2f2",loading:"#eff6ff",idle:"#f9fafb"};
        el.style.color=colors[state.statusType]||"#6b7280";
        el.style.background=bgs[state.statusType]||"#f9fafb";
        el.textContent=state.status;
    }

    // ========== SETUP VIEW ==========

    function renderSetup(body){
        var courseId = getCourseId();
        var h='<h2 class="cmb-h2">Setup</h2>';
        h+='<p class="cmb-desc">Enter your Claude API key to get started. Content will be inserted directly into your current Canvas course via the API.</p>';
        if(courseId){
            h+='<div class="cmb-card" style="background:#f0fdf4;border-color:#bbf7d0;"><div style="font-size:13px;color:#065F46;font-weight:600;">\u2705 Course Detected: ID ' + courseId + '</div>';
            h+='<div style="font-size:11px;color:#065F46;margin-top:4px;">Modules, pages, assignments, and quizzes will be inserted directly into this course.</div></div>';
        } else {
            h+='<div class="cmb-card" style="background:#fef2f2;border-color:#fca5a5;"><div style="font-size:13px;color:#991B1B;font-weight:600;">\u26A0\uFE0F No Course Detected</div>';
            h+='<div style="font-size:11px;color:#991B1B;margin-top:4px;">Navigate to a Canvas course page (e.g., /courses/12345) before inserting content.</div></div>';
        }
        h+='<div class="cmb-card"><label class="cmb-label">Claude API Key</label>';
        h+='<input type="password" class="cmb-input" id="cmb-apikey" placeholder="sk-ant-..." value="'+esc(state.apiKey)+'">';
        h+='<div style="font-size:11px;color:#94A3B8;margin-top:4px;">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com</a></div></div>';
        h+='<div class="cmb-card"><label class="cmb-label">Unsplash Access Key (optional)</label>';
        h+='<input type="password" class="cmb-input" id="cmb-unsplashkey" placeholder="Leave blank to use placeholder image boxes instead" value="'+esc(state.unsplashKey)+'">';
        h+='<div style="font-size:11px;color:#94A3B8;margin-top:4px;">Lets generated pages include real photos. Free key at <a href="https://unsplash.com/oauth/applications" target="_blank">unsplash.com/oauth/applications</a> (create an app, use its "Access Key"). Free tier is limited to 50 requests/hour.</div></div>';
        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-primary" id="cmb-next-layout">Next: Design Modules &rarr;</button></div>';
        body.innerHTML=h;
        body.querySelector("#cmb-apikey").addEventListener("input",function(e){state.apiKey=e.target.value;saveApiKey(state.apiKey);});
        body.querySelector("#cmb-unsplashkey").addEventListener("input",function(e){state.unsplashKey=e.target.value;saveUnsplashKey(state.unsplashKey);});
        body.querySelector("#cmb-next-layout").addEventListener("click",function(){
            if(!state.apiKey){state.status="Please enter your Claude API key first.";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            state.step="layout";render();
        });
    }

    // ========== LAYOUT VIEW ==========

    function renderLayout(body){
        ensureSingleCanvasModule();
        var mod=curMod();
        var h='<div class="cmb-layout-wrap">';
        h+='<div class="cmb-layout-main">';
        h+='<div class="cmb-card">';
        h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">';
        h+='<label class="cmb-label" style="margin:0;white-space:nowrap;">Source Material (optional)</label>';
        h+='<span style="font-size:12px;color:#64748B;">Upload PDF, DOCX, or TXT to guide AI for this module.</span>';
        h+='<input type="file" id="cmb-srcfile" accept=".pdf,.docx,.pptx,.txt,.md,.html" multiple style="font-size:12px;">';
        h+='</div>';
        h+='<div id="cmb-srclist" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
        for(var s=0;s<mod.sources.length;s++){
            h+='<div class="cmb-file-chip">'+esc(mod.sources[s].name)+' <span class="x" data-idx="'+s+'">&times;</span></div>';
        }
        h+='</div>';
        h+='<label class="cmb-label">Or paste text</label>';
        h+='<textarea class="cmb-textarea" id="cmb-srcpaste" rows="3" placeholder="Paste chapter text or notes..."></textarea>';
        h+='</div>';
        h+='<div class="cmb-card"><label class="cmb-label">Add Items</label><div class="cmb-add-bar">';
        var addTypes=Object.keys(ITEM_TYPES);
        for(var a=0;a<addTypes.length;a++){
            var ai=ITEM_TYPES[addTypes[a]];
            h+='<button class="cmb-add-btn" data-type="'+addTypes[a]+'">'+ai.icon+' '+ai.label+'</button>';
        }
        h+='</div></div>';
        h+='</div>';
        h+='<div class="cmb-layout-side">';
        h+='<div class="cmb-card"><label class="cmb-label">Current Layout ('+mod.items.length+' items)</label>';
        if(mod.items.length>0){
            h+='<ul class="cmb-layout-list">';
            for(var j=0;j<mod.items.length;j++){
                var it=mod.items[j],info=ITEM_TYPES[it.type]||{label:it.type,icon:"?"};
                h+='<li class="cmb-layout-item" data-idx="'+j+'" draggable="true"><span class="icon">'+info.icon+'</span><span class="lbl">'+esc(info.label)+'</span><button class="rm" data-idx="'+j+'">&times;</button></li>';
            }
            h+='</ul>';
        } else {
            h+='<div style="font-size:12px;color:#94a3b8;">No items yet — add some on the left.</div>';
        }
        h+='</div>';
        h+='</div>';
        h+='</div>';
        h+='<div class="cmb-btn-row">';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-back-setup">&larr; Back</button>';
        h+='<button class="cmb-btn cmb-btn-primary" id="cmb-next-build"'+(mod.items.length===0?' disabled':'')+'>Next: Build Items &rarr;</button>';
        h+='</div>';
        body.innerHTML=h;
        body.querySelectorAll(".cmb-mod-tab").forEach(function(tab){
            tab.addEventListener("click",function(e){
                if(e.target.classList.contains("cmb-mod-del"))return;
                state.currentModuleIndex=parseInt(tab.dataset.mod);render();
            });
        });
        body.querySelectorAll(".cmb-mod-del").forEach(function(btn){
            btn.addEventListener("click",function(e){
                e.stopPropagation();
                var idx=parseInt(btn.dataset.mod);
                state.modules.splice(idx,1);
                if(state.currentModuleIndex>=state.modules.length)state.currentModuleIndex=state.modules.length-1;
                render();
            });
        });
        var addModuleBtn=body.querySelector("#cmb-add-module");
        if(addModuleBtn) addModuleBtn.addEventListener("click",function(){
            state.modules.push({id:uid(),title:"Module "+(state.modules.length+1),sources:[],items:[]});
            state.currentModuleIndex=state.modules.length-1;render();
        });
        var modTitleInput=body.querySelector("#cmb-modtitle");
        if(modTitleInput) modTitleInput.addEventListener("input",function(e){curMod().title=e.target.value;});
        body.querySelector("#cmb-srcfile").addEventListener("change",async function(e){
            var files=e.target.files;
            var parseErrors=[];
            for(var i=0;i<files.length;i++){
                try{
                    state.status="Parsing "+files[i].name+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                    var text=await parseFile(files[i]);
                    if(!text||!text.trim()){throw new Error("No text could be extracted from this file.");}
                    curMod().sources.push({name:files[i].name,text:text});
                }catch(err){parseErrors.push(files[i].name+": "+err.message);}
            }
            if(parseErrors.length){
                state.status="Failed to parse "+parseErrors.length+" file(s) — "+parseErrors.join("; ");
                state.statusType="error";
            } else {
                state.status=curMod().sources.length+" source(s) loaded";state.statusType="success";
            }
            render();
        });
        body.querySelector("#cmb-srcpaste").addEventListener("blur",function(e){
            if(e.target.value.trim()){
                var mod2=curMod();
                var exists=mod2.sources.find(function(s){return s.name==="Pasted Text";});
                if(exists){exists.text=e.target.value;}else{mod2.sources.push({name:"Pasted Text",text:e.target.value});}
                state.status="Text saved";state.statusType="success";renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
        });
        body.querySelectorAll("#cmb-srclist .x").forEach(function(x){
            x.addEventListener("click",function(){curMod().sources.splice(parseInt(x.dataset.idx),1);render();});
        });
        body.querySelectorAll(".cmb-layout-item .rm").forEach(function(btn){
            btn.addEventListener("click",function(e){
                e.stopPropagation();
                var idx=parseInt(btn.dataset.idx);
                var removed=curMod().items.splice(idx,1)[0];
                if(removed)delete state.itemData[removed.id];render();
            });
        });
        body.querySelectorAll(".cmb-add-btn").forEach(function(btn){
            btn.addEventListener("click",function(){
                var item={id:uid(),type:btn.dataset.type};
                initItemData(item);curMod().items.push(item);render();
            });
        });
        var dragIdx=null;
        body.querySelectorAll(".cmb-layout-item").forEach(function(li){
            li.addEventListener("dragstart",function(){dragIdx=parseInt(li.dataset.idx);li.style.opacity="0.5";});
            li.addEventListener("dragend",function(){li.style.opacity="1";});
            li.addEventListener("dragover",function(e){e.preventDefault();});
            li.addEventListener("drop",function(e){
                e.preventDefault();
                var dropIdx=parseInt(li.dataset.idx);
                if(dragIdx!==null&&dragIdx!==dropIdx){
                    var arr=curMod().items;
                    var el=arr.splice(dragIdx,1)[0];
                    arr.splice(dropIdx,0,el);
                    render();
                }
            });
        });
        body.querySelector("#cmb-back-setup").addEventListener("click",function(){state.step="setup";render();});
        body.querySelector("#cmb-next-build").addEventListener("click",async function(){
            if(!curMod()||curMod().items.length===0)return;
            // Capture any pasted text that hasn't blurred out of the textarea yet.
            var pasteBox = body.querySelector("#cmb-srcpaste");
            if(pasteBox && pasteBox.value.trim()){
                var m2=curMod();
                var existing=m2.sources.find(function(s){return s.name==="Pasted Text";});
                if(existing){existing.text=pasteBox.value;}else{m2.sources.push({name:"Pasted Text",text:pasteBox.value});}
            }
            for(var x=0;x<state.modules.length;x++){
                for(var y=0;y<state.modules[x].items.length;y++){
                    initItemData(state.modules[x].items[y]);
                }
            }
            var hasSource = state.modules.some(function(m){return m.sources && m.sources.length;});
            if(hasSource && state.apiKey){
                var nextBtn = body.querySelector("#cmb-next-build");
                nextBtn.disabled = true; nextBtn.textContent = "Analyzing source material...";
                try{
                    await autoFillAllModules();
                }catch(err){
                    state.status="Auto-fill error: "+err.message+" — you can still fill items in manually.";
                    state.statusType="error";
                }
            }
            state.currentModuleIndex=0;state.currentItemIndex=0;state.step="build";render();
        });
    }

    // ========== BUILD VIEW ==========

    function renderBuild(body){
        var allItems=[];
        for(var mi=0;mi<state.modules.length;mi++){
            var mod=state.modules[mi];
            for(var i=0;i<mod.items.length;i++){
                allItems.push({moduleIndex:mi,itemIndex:i,item:mod.items[i],modTitle:mod.title||"Module "+(mi+1)});
            }
        }
        if(allItems.length===0){state.step="layout";render();return;}
        var remainingCount=0;
        for(var ri=0;ri<allItems.length;ri++){
            var rd=state.itemData[allItems[ri].item.id];
            if(!isItemBuilt(allItems[ri].item,rd)) remainingCount++;
        }
        var flatIdx=-1;
        for(var x=0;x<allItems.length;x++){
            if(allItems[x].moduleIndex===state.currentModuleIndex&&allItems[x].itemIndex===state.currentItemIndex){flatIdx=x;break;}
        }
        if(flatIdx<0){flatIdx=0;state.currentModuleIndex=allItems[0].moduleIndex;state.currentItemIndex=allItems[0].itemIndex;}
        var h='<div class="cmb-build-wrap">';
        h+='<div class="cmb-sidebar">';
        var lastMod=-1;
        for(var s=0;s<allItems.length;s++){
            var ai=allItems[s];
            if(ai.moduleIndex!==lastMod){
                if(lastMod>=0) h+='<div class="cmb-mod-divider"></div>';
                h+='<div style="font-size:11px;font-weight:700;color:#7C3AED;padding:4px 10px;margin-bottom:2px;">\u{1F4E6} '+esc(ai.modTitle)+'</div>';
                lastMod=ai.moduleIndex;
            }
            var info=ITEM_TYPES[ai.item.type]||{label:ai.item.type,icon:"?"};
            var d=state.itemData[ai.item.id]||{};
            var done=(ai.item.type==="quiz"||ai.item.type==="miniquiz")?!!d.generatedQuestions:!!d.generatedHTML;
            var isActive=s===flatIdx;
            h+='<div class="cmb-sidebar-item'+(isActive?' active':'')+'" data-flat="'+s+'"><span class="icon">'+info.icon+'</span>'+esc(info.label);
            if(done) h+='<span class="done-badge">\u2705</span>';
            h+='</div>';
        }
        h+='</div>';
        h+='<div class="cmb-content-area" id="cmb-item-content"></div>';
        h+='</div>';
        h+='<div class="cmb-btn-row">';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-back-layout">&larr; Back to Layout</button>';
        if(flatIdx>0) h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-prev-item">&larr; Previous</button>';
        if(flatIdx<allItems.length-1) h+='<button class="cmb-btn cmb-btn-primary" id="cmb-next-item">Next &rarr;</button>';
        if(remainingCount>0) h+='<button class="cmb-btn cmb-btn-ai" id="cmb-build-all">\u{1F680} Build All ('+remainingCount+' left)</button>';
        h+='<button class="cmb-btn cmb-btn-success" id="cmb-go-insert">Review & Insert into Canvas &rarr;</button>';
        h+='</div>';
        body.innerHTML=h;
        var currentItemObj=allItems[flatIdx];
        var container=body.querySelector("#cmb-item-content");
        var item=currentItemObj.item;
        var dd=state.itemData[item.id];
        if(!dd){initItemData(item);dd=state.itemData[item.id];}
        if(item.type==="quiz"||item.type==="miniquiz"){renderQuizBuilder(container,item,dd);}
        else{renderContentBuilder(container,item,dd);}
        body.querySelectorAll(".cmb-sidebar-item").forEach(function(si){
            si.addEventListener("click",function(){
                var fi=parseInt(si.dataset.flat);
                state.currentModuleIndex=allItems[fi].moduleIndex;
                state.currentItemIndex=allItems[fi].itemIndex;
                render();
            });
        });
        body.querySelector("#cmb-back-layout").addEventListener("click",function(){state.step="layout";render();});
        var prevBtn=body.querySelector("#cmb-prev-item");
        if(prevBtn) prevBtn.addEventListener("click",function(){
            state.currentModuleIndex=allItems[flatIdx-1].moduleIndex;
            state.currentItemIndex=allItems[flatIdx-1].itemIndex;render();
        });
        var nextBtn=body.querySelector("#cmb-next-item");
        if(nextBtn) nextBtn.addEventListener("click",function(){
            state.currentModuleIndex=allItems[flatIdx+1].moduleIndex;
            state.currentItemIndex=allItems[flatIdx+1].itemIndex;render();
        });
        body.querySelector("#cmb-go-insert").addEventListener("click",function(){state.step="insert";state.insertProgress=null;render();});
        var buildAllBtn=body.querySelector("#cmb-build-all");
        if(buildAllBtn) buildAllBtn.addEventListener("click",async function(){
            if(!state.apiKey){state.status="Enter API key first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            buildAllBtn.disabled=true;
            var panel=overlayEl.querySelector("#cmb-panel");
            state.status="Building 0/"+remainingCount+"...";state.statusType="loading";renderStatus(panel);
            var result=await buildAllItems(function(settled,total,failCount){
                buildAllBtn.textContent="\u{1F680} Building "+settled+"/"+total+(failCount?" ("+failCount+" failed)":"")+"...";
                state.status="Building "+settled+"/"+total+"..."+(failCount?" ("+failCount+" failed so far)":"");
                state.statusType="loading";renderStatus(panel);
            });
            if(result.failed.length){
                state.status="Built "+result.builtCount+"/"+remainingCount+" — "+result.failed.length+" failed: "+result.failed.map(function(f){return f.label+" ("+f.error+")";}).join("; ");
                state.statusType=result.builtCount>0?"success":"error";
            }else{
                state.status="✅ All "+result.builtCount+" item(s) built!";state.statusType="success";
            }
            render();
        });
    }

    // ========== CONTENT BUILDER ==========

    function renderActivityBuilder(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Activity",icon:"?"};
        if(d.subView==="result"&&d.generatedHTML){renderContentResult(container,item,d);return;}

        var descriptions={
            flashcard:"AI pulls key terms from your source material and builds a flippable card deck. Click any card to flip.",
            quickcheck:"AI writes " + d.count + " multiple-choice questions with instant right/wrong feedback. No grade recorded.",
            termreveal:"AI builds an expandable vocabulary list — click any term to reveal its definition and examples.",
            truefalse:"AI generates true/false statements with explanations revealed on click.",
            readcheck:"AI writes a full content page with " + d.count + " comprehension questions embedded inline between sections — students read, answer, keep reading. Like a textbook with built-in checks.",
            matching:"AI generates " + d.count + " term-definition pairs as a self-checking exercise — select the right definition for each term to see instant ✓/✗ feedback."
        };

        var h='<h2 class="cmb-h2">'+info.icon+' Build: '+esc(info.label)+'</h2>';
        h+='<p class="cmb-desc">'+esc(descriptions[item.type]||"")+'</p>';

        // ── AI Engine toggle ──────────────────────────────────────────────────
        var isFast=d.aiEngine==="fast";
        h+='<div class="cmb-engine-toggle'+(isFast?' on':'')+'" id="cmb-engine-toggle">';
        h+='<div class="cmb-engine-pill'+(isFast?' on':'')+'"></div>';
        h+='<div class="cmb-long-info">';
        h+='<div class="cmb-long-title">AI Engine</div>';
        h+='<div class="cmb-long-sub">'+(isFast
            ? 'Faster: Haiku — quicker generation, good for simple activities'
            : 'Detailed: Sonnet — slower, more polished output')+'</div>';
        h+='</div>';
        h+='<div class="cmb-engine-badge">'+(isFast?'FASTER':'DETAILED')+'</div>';
        h+='</div>';

        // Count control
        var countLabel={flashcard:"Cards",quickcheck:"Questions",termreveal:"Terms",truefalse:"Statements",readcheck:"Inline Questions",matching:"Term Pairs"};
        h+='<div class="cmb-card" style="display:flex;align-items:center;gap:20px;">';
        h+='<div><label class="cmb-label">Number of '+(countLabel[item.type]||"Items")+'</label>';
        h+='<div style="display:flex;align-items:center;gap:10px;margin-top:4px;">';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-act-down" style="padding:6px 14px;">-</button>';
        h+='<span style="font-size:20px;font-weight:700;color:#1E293B;min-width:30px;text-align:center;">'+d.count+'</span>';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-act-up" style="padding:6px 14px;">+</button>';
        h+='</div></div>';
        if(item.type==="flashcard"||item.type==="quickcheck"){
            h+='<div style="font-size:12px;color:#94A3B8;border-left:1px solid #e5e7eb;padding-left:20px;">Tip: 6–10 is ideal for a review session.<br>Too many can overwhelm students.</div>';
        }else if(item.type==="readcheck"){
            h+='<div style="font-size:12px;color:#94A3B8;border-left:1px solid #e5e7eb;padding-left:20px;">Tip: 2–4 questions works best.<br>Questions appear embedded between content sections.</div>';
        }else if(item.type==="matching"){
            h+='<div style="font-size:12px;color:#94A3B8;border-left:1px solid #e5e7eb;padding-left:20px;">Tip: 6–12 pairs is ideal.<br>Each term gets 4 choices — 1 correct + 3 distractors from the set.</div>';
        }
        h+='</div>';

        // Source material
        h+='<div class="cmb-card"><label class="cmb-label">Source Material</label>';
        h+='<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Describe the topic or paste notes. The AI will extract key terms / concepts from this.</div>';
        h+='<div class="cmb-file-row"><input type="file" id="cmb-act-file" accept=".pdf,.docx,.pptx,.txt" style="font-size:12px;">';
        if(d.uploadedName) h+='<div class="cmb-file-chip">'+esc(d.uploadedName)+' <span class="x" id="cmb-act-rmfile">&times;</span></div>';
        h+='</div>';
        h+='<textarea class="cmb-textarea" id="cmb-act-text" rows="4" placeholder="e.g. Chapter 4 key concepts: supply and demand, equilibrium, price elasticity...">'+esc(d.textContent||"")+'</textarea>';
        if(curMod()&&curMod().sources.length){
            h+='<div style="margin-top:8px;font-size:12px;color:#059669;">✓ Module source material will also be used.</div>';
        }
        h+='</div>';

        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" id="cmb-act-gen">✨ Generate '+info.label+'</button></div>';
        container.innerHTML=h;

        container.querySelector("#cmb-engine-toggle").addEventListener("click",function(){
            d.aiEngine=(d.aiEngine==="fast")?"detailed":"fast";render();
        });
        container.querySelector("#cmb-act-down").addEventListener("click",function(){if(d.count>2)d.count--;render();});
        container.querySelector("#cmb-act-up").addEventListener("click",function(){if(d.count<20)d.count++;render();});
        container.querySelector("#cmb-act-text").addEventListener("input",function(e){d.textContent=e.target.value;});
        container.querySelector("#cmb-act-file").addEventListener("change",async function(e){
            if(!e.target.files.length)return;
            var f=e.target.files[0];
            try{
                state.status="Parsing "+f.name+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                d.uploadedFile=await parseFile(f);d.uploadedName=f.name;
                state.status="File loaded: "+f.name;state.statusType="success";render();
            }catch(err){state.status="Error: "+err.message;state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));}
        });
        var rmf=container.querySelector("#cmb-act-rmfile");
        if(rmf)rmf.addEventListener("click",function(){d.uploadedFile="";d.uploadedName="";render();});

        container.querySelector("#cmb-act-gen").addEventListener("click",async function(){
            if(!state.apiKey){state.status="Enter API key first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            if(!d.textContent&&!d.uploadedFile&&!(curMod()&&curMod().sources.length)){state.status="Add some source material first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            state.status="Generating "+info.label+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
            var btn=container.querySelector("#cmb-act-gen");btn.disabled=true;btn.textContent="Generating...";
            try{
                var html=await callClaude(buildActivityPrompt(d,item.type),contentModel(d),activityMaxTokens(item.type));
                d.generatedHTML=await finalizeGeneratedHTML(html);d.subView="result";
                state.status=info.label+" generated!";state.statusType="success";render();
            }catch(err){
                state.status="Error: "+err.message;state.statusType="error";
                btn.disabled=false;btn.textContent="✨ Generate "+info.label;
                renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
        });
    }

    function renderContentBuilder(container,item,d){
        if(ACTIVITY_TYPES.indexOf(item.type)>=0){renderActivityBuilder(container,item,d);return;}
        if(item.type==="labproject"){renderLabBuilder(container,item,d);return;}
        var info=ITEM_TYPES[item.type]||{label:"Page",icon:"?"};
        if(d.subView==="result"&&d.generatedHTML){renderContentResult(container,item,d);return;}
        var isA=d.contentType==="assignment";

        var h='<h2 class="cmb-h2">'+info.icon+' Build: '+esc(info.label)+'</h2>';
        h+='<p class="cmb-desc">Configure and generate this '+(isA?"assignment":"page")+' with AI.</p>';

        // ── Theme picker ─────────────────────────────────────────────────────
        h+='<div class="cmb-card">';
        h+='<label class="cmb-label">Page Style</label>';
        h+='<div style="font-size:11px;color:#64748B;margin-bottom:10px;">Choose a visual style. The AI will apply this layout and color scheme to the generated page.</div>';
        h+='<div class="cmb-theme-grid">';
        var themeKeys=Object.keys(PAGE_THEMES);
        for(var i=0;i<themeKeys.length;i++){
            var tk=themeKeys[i],t=PAGE_THEMES[tk];
            var isSel=d.pageStyle===tk;
            h+='<div class="cmb-theme-swatch'+(isSel?' sel':'')+'" data-style="'+tk+'">';
            h+='<div class="cmb-swatch-bar" style="background-color:'+t.swatchBg+';">';
            h+='<div class="cmb-swatch-main" style="background-color:'+t.swatchBg+';">'+t.emoji+'</div>';
            h+='<div class="cmb-swatch-stripe" style="background-color:'+t.swatchAcc+';"></div>';
            h+='</div>';
            h+='<div class="cmb-swatch-info">';
            h+='<div class="cmb-swatch-name">'+esc(t.name.replace(/^.{1,4}\s/,''))+'</div>';
            h+='<div class="cmb-swatch-preview">'+esc(t.preview)+'</div>';
            h+='</div></div>';
        }
        h+='</div>';
        if(d.pageStyle==="custom"){
            h+='<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">';
            h+='<label class="cmb-label" style="margin:0;">Primary Color</label>';
            h+='<input type="color" class="cmb-color-input" id="cmb-custom-color" value="'+(d.customColor||"#1e3a5f")+'">';
            h+='</div>';
        }
        h+='</div>';

        h+='<div class="cmb-card"><label class="cmb-label">Elements</label><div class="cmb-el-grid">';
        var elMap=isA?ASSIGN_EL:PAGE_EL;
        var elData=isA?(d.assignmentElements||{}):(d.pageElements||{});
        var elKeys=Object.keys(elMap);
        for(var j=0;j<elKeys.length;j++){
            var ek=elKeys[j],ev=elMap[ek];
            h+='<div class="cmb-el-toggle'+(elData[ek]?' on':'')+'" data-el="'+ek+'"><div class="dot"></div><div><div style="font-weight:500;">'+ev[0]+'</div><div style="font-size:10px;color:#94A3B8;">'+ev[1]+'</div></div></div>';
        }
        h+='</div>';
        if(isA){
            h+='<div style="display:flex;gap:10px;margin-top:8px;">';
            h+='<div style="flex:1;"><label class="cmb-label">Points</label><input type="text" class="cmb-input" id="cmb-pts" value="'+esc(d.pointValue||"")+'" placeholder="100"></div>';
            h+='<div style="flex:1;"><label class="cmb-label">Due Date</label><input type="text" class="cmb-input" id="cmb-due" value="'+esc(d.dueDate||"")+'" placeholder="e.g. Friday 11:59pm"></div>';
            h+='</div>';
        }
        h+='</div>';
        h+='<div class="cmb-card"><label class="cmb-label">Content / Instructions</label>';
        h+='<div class="cmb-file-row"><input type="file" id="cmb-cfile" accept=".pdf,.docx,.pptx,.txt" style="font-size:12px;">';
        if(d.uploadedName){h+='<div class="cmb-file-chip">'+esc(d.uploadedName)+' <span class="x" id="cmb-rm-file">&times;</span></div>';}
        h+='</div><textarea class="cmb-textarea" id="cmb-ctext" rows="3" placeholder="Describe what this page should contain...">'+esc(d.textContent||"")+'</textarea></div>';

        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" id="cmb-gen-content">✨ Generate Content</button></div>';

        container.innerHTML=h;

        // ── Theme swatch handlers ─────────────────────────────────────────────
        container.querySelectorAll(".cmb-theme-swatch").forEach(function(sc){
            sc.addEventListener("click",function(){d.pageStyle=sc.dataset.style;render();});
        });
        var cc=container.querySelector("#cmb-custom-color");
        if(cc) cc.addEventListener("input",function(e){d.customColor=e.target.value;});
        container.querySelectorAll(".cmb-el-toggle").forEach(function(el){
            el.addEventListener("click",function(){
                var key=el.dataset.el;
                if(isA){d.assignmentElements[key]=!d.assignmentElements[key];}
                else{d.pageElements[key]=!d.pageElements[key];}
                render();
            });
        });
        var ptsInput=container.querySelector("#cmb-pts");
        if(ptsInput) ptsInput.addEventListener("input",function(e){d.pointValue=e.target.value;});
        var dueInput=container.querySelector("#cmb-due");
        if(dueInput) dueInput.addEventListener("input",function(e){d.dueDate=e.target.value;});
        container.querySelector("#cmb-ctext").addEventListener("input",function(e){d.textContent=e.target.value;});
        container.querySelector("#cmb-cfile").addEventListener("change",async function(e){
            if(!e.target.files.length)return;
            var f=e.target.files[0];
            try{
                state.status="Parsing "+f.name+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                d.uploadedFile=await parseFile(f);d.uploadedName=f.name;
                state.status="File loaded: "+f.name;state.statusType="success";render();
            }catch(err){state.status="Error: "+err.message;state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));}
        });
        var rmFile=container.querySelector("#cmb-rm-file");
        if(rmFile)rmFile.addEventListener("click",function(){d.uploadedFile="";d.uploadedName="";render();});

        container.querySelector("#cmb-gen-content").addEventListener("click",async function(){
            if(!state.apiKey){state.status="Enter API key first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            if(!d.textContent&&!d.uploadedFile&&!(curMod()&&curMod().sources.length)){state.status="Add some content first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            state.status="Generating content...";
            state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
            var btn=container.querySelector("#cmb-gen-content");btn.disabled=true;btn.textContent="Generating...";
            try{
                var html=await callClaude(buildContentPrompt(d,item.type),AI_MODEL_CONTENT_FAST,TOKENS_DEFAULT);
                d.generatedHTML=await finalizeGeneratedHTML(html);d.subView="result";
                state.status="Content generated!";state.statusType="success";render();
            }catch(err){
                state.status="Error: "+err.message;state.statusType="error";
                btn.disabled=false;btn.textContent="✨ Generate Content";
                renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
        });
    }

    function renderLabBuilder(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Lab Project",icon:"\u{1F6E0}"};
        if(d.subView==="result"&&d.generatedHTML){renderContentResult(container,item,d);return;}
        var isLong=!!d.longContent;
        var h='<h2 class="cmb-h2">'+info.icon+' Build: '+esc(info.label)+'</h2>';
        h+='<p class="cmb-desc">AI generates a complete trade school lab sheet — safety strip, PPE requirements, tools list, step-by-step procedure with numbered badges, data table, and reflection questions.</p>';

        // Long Content toggle
        h+='<div class="cmb-long-toggle'+(isLong?' on':'')+'" id="cmb-long-toggle">';
        h+='<div class="cmb-long-pill'+(isLong?' on':'')+'"></div>';
        h+='<div class="cmb-long-info"><div class="cmb-long-title">Long Content Mode</div>';
        h+='<div class="cmb-long-sub">'+(isLong?'Expanded: ~12,000 token budget — detailed multi-phase procedure':'Standard: ~6,000 token budget — complete lab with all sections')+'</div></div>';
        h+='<div class="cmb-long-badge">'+(isLong?'LONG':'STANDARD')+'</div></div>';

        // AI Engine toggle
        var isFast=d.aiEngine==="fast";
        h+='<div class="cmb-engine-toggle'+(isFast?' on':'')+'" id="cmb-engine-toggle">';
        h+='<div class="cmb-engine-pill'+(isFast?' on':'')+'"></div>';
        h+='<div class="cmb-long-info"><div class="cmb-long-title">AI Engine</div>';
        h+='<div class="cmb-long-sub">'+(isFast?'Faster: Haiku — quicker generation, good for simple labs':'Detailed: Sonnet — slower, more polished lab sheet')+'</div></div>';
        h+='<div class="cmb-engine-badge">'+(isFast?'FASTER':'DETAILED')+'</div></div>';

        // Theme picker
        h+='<div class="cmb-card"><label class="cmb-label">Page Style</label>';
        h+='<div style="font-size:11px;color:#64748B;margin-bottom:10px;">Controls the header and accent colors of the lab sheet. Slate Gray and Navy Blue work well for trade school contexts.</div>';
        h+='<div class="cmb-theme-grid">';
        var themeKeys=Object.keys(PAGE_THEMES);
        for(var i=0;i<themeKeys.length;i++){
            var tk=themeKeys[i],t=PAGE_THEMES[tk];
            var isSel=d.pageStyle===tk;
            h+='<div class="cmb-theme-swatch'+(isSel?' sel':'')+'" data-style="'+tk+'">';
            h+='<div class="cmb-swatch-bar" style="background-color:'+t.swatchBg+';"><div class="cmb-swatch-main" style="background-color:'+t.swatchBg+';">'+t.emoji+'</div>';
            h+='<div class="cmb-swatch-stripe" style="background-color:'+t.swatchAcc+';"></div></div>';
            h+='<div class="cmb-swatch-info"><div class="cmb-swatch-name">'+esc(t.name.replace(/^.{1,4}\s/,''))+'</div>';
            h+='<div class="cmb-swatch-preview">'+esc(t.preview)+'</div></div></div>';
        }
        h+='</div></div>';

        // Lab details
        h+='<div class="cmb-card"><label class="cmb-label">Lab Details</label>';
        h+='<div style="display:flex;gap:10px;margin-bottom:12px;">';
        h+='<div style="flex:1;"><label class="cmb-label">Lab Number</label><input type="text" class="cmb-input" id="cmb-lab-num" value="'+esc(d.labNumber||"")+'" placeholder="e.g. 3.2"></div>';
        h+='<div style="flex:1;"><label class="cmb-label">Estimated Time</label><input type="text" class="cmb-input" id="cmb-lab-time" value="'+esc(d.estimatedTime||"")+'" placeholder="e.g. 45 minutes"></div>';
        h+='<div style="flex:1;"><label class="cmb-label">Points</label><input type="text" class="cmb-input" id="cmb-lab-pts" value="'+esc(d.pointValue||"")+'" placeholder="100"></div>';
        h+='</div>';
        h+='<label class="cmb-label">Skill Level</label><div style="display:flex;gap:8px;margin-top:4px;">';
        var levels=[["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"]];
        for(var j=0;j<levels.length;j++){
            h+='<div class="cmb-diff-btn'+(d.skillLevel===levels[j][0]?' sel':'')+'" data-skill="'+levels[j][0]+'" style="flex:1;text-align:center;">'+levels[j][1]+'</div>';
        }
        h+='</div></div>';

        // Lab elements
        h+='<div class="cmb-card"><label class="cmb-label">Include in Lab Sheet</label><div class="cmb-el-grid">';
        var labElKeys=Object.keys(LAB_EL);
        var labEls=d.labElements||{};
        for(var k=0;k<labElKeys.length;k++){
            var ek=labElKeys[k],ev=LAB_EL[ek];
            h+='<div class="cmb-el-toggle'+(labEls[ek]?' on':'')+'" data-el="'+ek+'"><div class="dot"></div><div><div style="font-weight:500;">'+ev[0]+'</div><div style="font-size:10px;color:#94A3B8;">'+ev[1]+'</div></div></div>';
        }
        h+='</div></div>';

        // Source material
        h+='<div class="cmb-card"><label class="cmb-label">Lab Topic / Source Material</label>';
        h+='<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Describe the lab — the trade skill, task, or equipment. Upload a spec sheet, lab manual, or paste notes. Be specific: trade type, tools, materials, what students will do.</div>';
        h+='<div class="cmb-file-row"><input type="file" id="cmb-lab-file" accept=".pdf,.docx,.pptx,.txt" style="font-size:12px;">';
        if(d.uploadedName) h+='<div class="cmb-file-chip">'+esc(d.uploadedName)+' <span class="x" id="cmb-lab-rmfile">&times;</span></div>';
        h+='</div>';
        h+='<textarea class="cmb-textarea" id="cmb-lab-text" rows="4" placeholder="e.g. Students will wire a 20-amp 240V circuit following NEC code — covering AFCI breakers, proper termination, and load calculations. Students will use a multimeter to verify continuity and polarity before energizing.">'+esc(d.textContent||"")+'</textarea>';
        if(curMod()&&curMod().sources.length) h+='<div style="margin-top:8px;font-size:12px;color:#059669;">✓ Module source material will also be used.</div>';
        h+='</div>';

        var tokenCount=isLong?TOKENS_LONG:TOKENS_DEFAULT;
        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" id="cmb-lab-gen">\u{1F527} Generate Lab Sheet ('+tokenCount.toLocaleString()+' tokens)</button></div>';

        container.innerHTML=h;

        container.querySelector("#cmb-long-toggle").addEventListener("click",function(){d.longContent=!d.longContent;render();});
        container.querySelector("#cmb-engine-toggle").addEventListener("click",function(){d.aiEngine=(d.aiEngine==="fast")?"detailed":"fast";render();});
        container.querySelectorAll(".cmb-theme-swatch").forEach(function(sc){sc.addEventListener("click",function(){d.pageStyle=sc.dataset.style;render();});});
        container.querySelector("#cmb-lab-num").addEventListener("input",function(e){d.labNumber=e.target.value;});
        container.querySelector("#cmb-lab-time").addEventListener("input",function(e){d.estimatedTime=e.target.value;});
        container.querySelector("#cmb-lab-pts").addEventListener("input",function(e){d.pointValue=e.target.value;});
        container.querySelectorAll("[data-skill]").forEach(function(btn){btn.addEventListener("click",function(){d.skillLevel=btn.dataset.skill;render();});});
        container.querySelectorAll(".cmb-el-toggle").forEach(function(el){el.addEventListener("click",function(){d.labElements[el.dataset.el]=!d.labElements[el.dataset.el];render();});});
        container.querySelector("#cmb-lab-text").addEventListener("input",function(e){d.textContent=e.target.value;});
        container.querySelector("#cmb-lab-file").addEventListener("change",async function(e){
            if(!e.target.files.length)return;
            var f=e.target.files[0];
            try{
                state.status="Parsing "+f.name+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                d.uploadedFile=await parseFile(f);d.uploadedName=f.name;
                state.status="File loaded: "+f.name;state.statusType="success";render();
            }catch(err){state.status="Error: "+err.message;state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));}
        });
        var rmf=container.querySelector("#cmb-lab-rmfile");
        if(rmf)rmf.addEventListener("click",function(){d.uploadedFile="";d.uploadedName="";render();});
        container.querySelector("#cmb-lab-gen").addEventListener("click",async function(){
            if(!state.apiKey){state.status="Enter API key first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            if(!d.textContent&&!d.uploadedFile&&!(curMod()&&curMod().sources.length)){state.status="Describe the lab topic first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            var maxTok=d.longContent?TOKENS_LONG:TOKENS_DEFAULT;
            state.status="Generating lab sheet...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
            var btn=container.querySelector("#cmb-lab-gen");btn.disabled=true;btn.textContent="Generating...";
            try{
                var html=await callClaude(buildLabPrompt(d,item.type),contentModel(d),maxTok);
                d.generatedHTML=await finalizeGeneratedHTML(html);d.subView="result";
                state.status="Lab sheet generated!";state.statusType="success";render();
            }catch(err){
                state.status="Error: "+err.message;state.statusType="error";
                btn.disabled=false;btn.textContent="\u{1F527} Generate Lab Sheet";
                renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
        });
    }

    function renderContentResult(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Page",icon:"?"};
        var h='<h2 class="cmb-h2">'+info.icon+' '+esc(info.label)+' - Result</h2>';
        if(item.type==="labproject"){
            var isLong=!!d.longContent;
            h+='<div style="margin-bottom:10px;font-size:12px;color:#64748B;">Generated in <strong>'+(isLong?'Long Content Mode (~12k tokens)':'Standard Mode (~6k tokens)')+'</strong></div>';
        }
        h+='<div class="cmb-tab-bar"><div class="cmb-tab active" data-tab="preview">Preview</div><div class="cmb-tab" data-tab="code">HTML Code</div></div>';
        h+='<div id="cmb-result-content"></div>';
        h+='<div class="cmb-btn-row">';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-copy-html">Copy HTML</button>';
        h+='<button class="cmb-btn cmb-btn-ai" id="cmb-regen">Regenerate</button>';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-back-build">Back to Settings</button>';
        h+='</div>';
        container.innerHTML=h;
        var contentDiv=container.querySelector("#cmb-result-content");
        showPreviewTab(contentDiv,d.generatedHTML);
        container.querySelectorAll(".cmb-tab").forEach(function(tab){
            tab.addEventListener("click",function(){
                container.querySelectorAll(".cmb-tab").forEach(function(t){t.classList.remove("active");});
                tab.classList.add("active");
                if(tab.dataset.tab==="preview"){showPreviewTab(contentDiv,d.generatedHTML);}
                else{showCodeTab(contentDiv,d.generatedHTML);}
            });
        });
        container.querySelector("#cmb-copy-html").addEventListener("click",function(){
            navigator.clipboard.writeText(d.generatedHTML).then(function(){
                state.status="HTML copied!";state.statusType="success";renderStatus(overlayEl.querySelector("#cmb-panel"));
            });
        });
        container.querySelector("#cmb-regen").addEventListener("click",function(){d.subView="build";render();});
        container.querySelector("#cmb-back-build").addEventListener("click",function(){d.subView="build";render();});
    }

    function showPreviewTab(container,html){
        container.innerHTML='<iframe class="cmb-preview-frame" id="cmb-pframe"></iframe>';
        var frame=container.querySelector("#cmb-pframe");
        frame.onload=function(){
            try{var doc=frame.contentDocument||frame.contentWindow.document;doc.open();doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:16px;font-family:Georgia,serif;">'+html+'</body></html>');doc.close();}catch(e){}
        };
        frame.src="about:blank";
    }

    function showCodeTab(container,html){
        container.innerHTML='<textarea class="cmb-code-area">'+esc(html)+'</textarea>';
    }

    // ========== QUIZ BUILDER ==========

    function renderQuizBuilder(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Quiz",icon:"?"};
        if(d.subView==="preview"&&d.generatedQuestions){renderQuizPreview(container,item,d);return;}
        var h='<h2 class="cmb-h2">'+info.icon+' Build: '+esc(info.label)+'</h2>';
        h+='<p class="cmb-desc">Configure and generate quiz questions. Questions will be inserted directly into Canvas as a Classic Quiz with question groups.</p>';
        h+='<div class="cmb-card"><label class="cmb-label">Quiz Title</label>';
        h+='<input type="text" class="cmb-input" id="cmb-quiz-title" value="'+esc(d.quizTitle||"")+'" placeholder="Enter quiz title"></div>';
        h+='<div class="cmb-card"><label class="cmb-label">Difficulty Level</label><div class="cmb-diff-grid">';
        var diffs=[["easy","Easy","DOK 1-2","#10B981"],["medium","Medium","DOK 2-3","#F59E0B"],["hard","Hard","DOK 3-4","#EF4444"]];
        for(var i=0;i<diffs.length;i++){
            var df=diffs[i];
            h+='<div class="cmb-diff-btn'+(d.difficulty===df[0]?' sel':'')+'" data-diff="'+df[0]+'" style="'+(d.difficulty===df[0]?'border-color:'+df[3]+';background:'+df[3]+'15':'')+'">';
            h+='<div style="font-weight:700;">'+df[1]+'</div><div style="font-size:11px;color:#6b7280;">'+df[2]+'</div></div>';
        }
        h+='</div></div>';
        h+='<div class="cmb-card"><label class="cmb-label">Question Mix</label>';
        h+='<div style="font-size:11px;color:#64748B;margin-bottom:8px;">Each question generates '+QUIZ_VERSION_COUNT+' versions for randomized groups.</div>';
        var qTypes=[["mc","Multiple Choice",d.mcCount],["tf","True / False",d.tfCount],["sa","Short Answer",d.saCount],["essay","Essay",d.essayCount]];
        for(var j=0;j<qTypes.length;j++){
            var qt=qTypes[j];
            h+='<div class="cmb-qmix-row"><span class="qlabel">'+qt[1]+'</span><div class="qcount">';
            h+='<button data-qtype="'+qt[0]+'" data-dir="down">-</button><span>'+qt[2]+'</span><button data-qtype="'+qt[0]+'" data-dir="up">+</button>';
            h+='<span style="font-size:10px;color:#9ca3af;margin-left:4px;">= '+(qt[2]*QUIZ_VERSION_COUNT)+' versions</span></div></div>';
        }
        var total=d.mcCount+d.tfCount+d.saCount+d.essayCount;
        h+='<div style="margin-top:8px;font-size:12px;font-weight:600;color:#7C3AED;">Total: '+total+' questions &times; '+QUIZ_VERSION_COUNT+' = '+(total*QUIZ_VERSION_COUNT)+' versions</div></div>';
        h+='<div class="cmb-card"><label class="cmb-label">Quiz Content (optional)</label>';
        h+='<div class="cmb-file-row"><input type="file" id="cmb-qfile" accept=".pdf,.docx,.pptx,.txt" style="font-size:12px;">';
        if(d.uploadedName){h+='<div class="cmb-file-chip">'+esc(d.uploadedName)+' <span class="x" id="cmb-qrm-file">&times;</span></div>';}
        h+='</div><textarea class="cmb-textarea" id="cmb-qtext" rows="3" placeholder="Paste content for quiz generation...">'+esc(d.textContent||"")+'</textarea></div>';
        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" id="cmb-gen-quiz">\u2728 Generate '+(total*QUIZ_VERSION_COUNT)+' Questions</button></div>';
        container.innerHTML=h;
        container.querySelector("#cmb-quiz-title").addEventListener("input",function(e){d.quizTitle=e.target.value;});
        container.querySelectorAll(".cmb-diff-btn").forEach(function(db){
            db.addEventListener("click",function(){d.difficulty=db.dataset.diff;render();});
        });
        container.querySelectorAll(".cmb-qmix-row button").forEach(function(btn){
            btn.addEventListener("click",function(){
                var qt=btn.dataset.qtype,dir=btn.dataset.dir;
                var key=qt==="mc"?"mcCount":qt==="tf"?"tfCount":qt==="sa"?"saCount":"essayCount";
                if(dir==="up")d[key]++;else if(d[key]>0)d[key]--;render();
            });
        });
        container.querySelector("#cmb-qtext").addEventListener("input",function(e){d.textContent=e.target.value;});
        container.querySelector("#cmb-qfile").addEventListener("change",async function(e){
            if(!e.target.files.length)return;
            var f=e.target.files[0];
            try{
                state.status="Parsing "+f.name+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                d.uploadedFile=await parseFile(f);d.uploadedName=f.name;
                state.status="File loaded: "+f.name;state.statusType="success";render();
            }catch(err){state.status="Error: "+err.message;state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));}
        });
        var rmf=container.querySelector("#cmb-qrm-file");
        if(rmf)rmf.addEventListener("click",function(){d.uploadedFile="";d.uploadedName="";render();});
        container.querySelector("#cmb-gen-quiz").addEventListener("click",async function(){
            if(!state.apiKey){state.status="Enter API key first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            if(!d.textContent&&!d.uploadedFile&&!(curMod()&&curMod().sources.length)){state.status="Add some content first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            var total2=d.mcCount+d.tfCount+d.saCount+d.essayCount;
            if(total2===0){state.status="Add at least one question";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            state.status="Generating "+(total2*QUIZ_VERSION_COUNT)+" questions...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
            var btn2=container.querySelector("#cmb-gen-quiz");btn2.disabled=true;btn2.textContent="Generating...";
            try{
                var raw=await callClaude(buildQuizPrompt(d),AI_MODEL_QUIZ,8192);
                var cleaned=raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
                d.generatedQuestions=JSON.parse(cleaned);d.subView="preview";
                state.status="Questions generated!";state.statusType="success";render();
            }catch(err){
                state.status="Error: "+err.message;state.statusType="error";
                btn2.disabled=false;btn2.textContent="\u2728 Generate "+(total2*QUIZ_VERSION_COUNT)+" Questions";
                renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
        });
    }

    function renderQuizPreview(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Quiz",icon:"?"};
        var data=d.generatedQuestions;
        var groups=data.groups||[];
        var h='<h2 class="cmb-h2">'+info.icon+' '+esc(d.quizTitle||info.label)+' - Preview</h2>';
        h+='<p class="cmb-desc">'+groups.length+' question groups, '+QUIZ_VERSION_COUNT+' versions each. Click answers to toggle correct.</p>';
        var typeColors={mc:"#7C3AED",tf:"#0EA5E9",sa:"#F59E0B",essay:"#EF4444"};
        var typeLabels={mc:"Multiple Choice",tf:"True/False",sa:"Short Answer",essay:"Essay"};
        var verColors=["#7C3AED","#0EA5E9","#10B981"];
        for(var i=0;i<groups.length;i++){
            var g=groups[i];
            var tc=typeColors[g.type]||"#6b7280";
            h+='<div class="cmb-group-card">';
            h+='<div class="cmb-group-header" style="background:'+tc+';">Group '+(i+1)+': '+(typeLabels[g.type]||g.type)+' <span style="font-size:11px;opacity:0.8;">DOK '+g.dokLevel+' | '+esc(g.concept||"")+'</span></div>';
            h+='<div class="cmb-group-body">';
            var qs=g.questions||[];
            for(var j=0;j<qs.length;j++){
                var q=qs[j];
                h+='<div class="cmb-q-block">';
                h+='<span class="cmb-ver-badge" style="background:'+verColors[j%3]+'">V'+(j+1)+'</span>';
                h+='<textarea class="cmb-q-text" data-gi="'+i+'" data-qi="'+j+'">'+esc(q.question||"")+'</textarea>';
                if(q.answers&&q.answers.length){
                    for(var k=0;k<q.answers.length;k++){
                        var a=q.answers[k];
                        h+='<div class="cmb-ans-row">';
                        h+='<div class="cmb-ans-dot'+(a.correct?" correct":"")+'" data-gi="'+i+'" data-qi="'+j+'" data-ai="'+k+'"></div>';
                        h+='<input type="text" class="cmb-ans-input" data-gi="'+i+'" data-qi="'+j+'" data-ai="'+k+'" value="'+esc(a.text||"")+'">';
                        h+='</div>';
                    }
                }
                h+='</div>';
            }
            h+='</div></div>';
        }
        h+='<div class="cmb-btn-row">';
        h+='<button class="cmb-btn cmb-btn-ai" id="cmb-regen-quiz">Regenerate</button>';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-back-quiz">Back to Settings</button>';
        h+='</div>';
        container.innerHTML=h;
        container.querySelectorAll(".cmb-q-text").forEach(function(ta){
            ta.addEventListener("input",function(){
                var gi=parseInt(ta.dataset.gi),qi=parseInt(ta.dataset.qi);
                if(data.groups[gi]&&data.groups[gi].questions[qi])data.groups[gi].questions[qi].question=ta.value;
            });
        });
        container.querySelectorAll(".cmb-ans-input").forEach(function(inp){
            inp.addEventListener("input",function(){
                var gi=parseInt(inp.dataset.gi),qi=parseInt(inp.dataset.qi),ai=parseInt(inp.dataset.ai);
                if(data.groups[gi]&&data.groups[gi].questions[qi]&&data.groups[gi].questions[qi].answers[ai])data.groups[gi].questions[qi].answers[ai].text=inp.value;
            });
        });
        container.querySelectorAll(".cmb-ans-dot").forEach(function(dot){
            dot.addEventListener("click",function(){
                var gi=parseInt(dot.dataset.gi),qi=parseInt(dot.dataset.qi),ai=parseInt(dot.dataset.ai);
                var q=data.groups[gi]&&data.groups[gi].questions[qi];
                if(!q||!q.answers)return;
                var gtype=data.groups[gi].type;
                if(gtype==="mc"||gtype==="tf"){q.answers.forEach(function(a){a.correct=false;});q.answers[ai].correct=true;}
                else{q.answers[ai].correct=!q.answers[ai].correct;}
                var block=dot.closest(".cmb-q-block");
                block.querySelectorAll(".cmb-ans-dot").forEach(function(dd,idx){dd.classList.toggle("correct",q.answers[idx]&&q.answers[idx].correct);});
            });
        });
        container.querySelector("#cmb-regen-quiz").addEventListener("click",function(){d.subView="build";d.generatedQuestions=null;render();});
        container.querySelector("#cmb-back-quiz").addEventListener("click",function(){d.subView="build";render();});
    }

    // ========== INSERT VIEW ==========

    function renderInsert(body){
        var courseId = getCourseId();
        ensureSingleCanvasModule();
        var currentModule = curMod();
        var h='<h2 class="cmb-h2">Review & Add to Current Module</h2>';
        if(!courseId){
            h+='<div class="cmb-card" style="background:#fef2f2;border-color:#fca5a5;">';
            h+='<div style="font-size:13px;color:#991B1B;font-weight:600;">\u26A0\uFE0F No Course Detected</div>';
            h+='<div style="font-size:12px;color:#991B1B;margin-top:4px;">Navigate to a Canvas course page before inserting content.</div>';
            h+='</div>';
        } else {
            h+='<p class="cmb-desc">Items will be created in <strong>Course ' + courseId + '</strong> and added to <strong>' + esc((currentModule && currentModule.title) || "the current module") + '</strong>.</p>';
        }
        for(var m=0;m<state.modules.length;m++){
            var mod=state.modules[m];
            h+='<div class="cmb-card">';
            h+='<label class="cmb-label">\u{1F4E6} Current Module: '+esc(mod.title||'Untitled')+'</label>';
            h+='<div style="margin-top:8px;">';
            var modReady=0;
            for(var i=0;i<mod.items.length;i++){
                var it=mod.items[i],info=ITEM_TYPES[it.type]||{label:it.type,icon:"?"};
                var d=state.itemData[it.id]||{};
                var done=(it.type==="quiz"||it.type==="miniquiz")?!!d.generatedQuestions:!!d.generatedHTML;
                if(done)modReady++;
                var modeTag=(d.longContent&&done)?' <span style="font-size:10px;background:#EDE9FE;color:#6D28D9;padding:1px 5px;border-radius:3px;">LONG</span>':'';
                h+='<div class="cmb-insert-item"><span class="icon">'+info.icon+'</span>';
                h+='<span style="flex:1;">'+esc(info.label+(it.type==="quiz"||it.type==="miniquiz"?" \u2014 "+(d.quizTitle||""):""))+modeTag+'</span>';
                h+='<span class="status '+(done?"ready":"empty")+'">'+(done?"\u2713 Ready":"Not Built")+'</span></div>';
            }
            if(mod.items.length===0){h+='<div style="font-size:12px;color:#94a3b8;">No items.</div>';}
            h+='</div>';
            if(modReady<mod.items.length&&mod.items.length>0){
                h+='<div style="margin-top:8px;padding:6px 10px;background:#fef9c3;border-radius:6px;font-size:12px;color:#713f12;">\u26A0\uFE0F '+(mod.items.length-modReady)+' unbuilt item(s) will be inserted as placeholders.</div>';
            }
            h+='</div>';
        }
        h+='<div class="cmb-btn-row">';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-back-build2">&larr; Back to Build</button>';
        h+='<button class="cmb-btn cmb-btn-success" id="cmb-insert-all"'+(courseId?'':' disabled')+' style="font-size:15px;padding:12px 28px;">\u{1F680} Insert into Canvas</button>';
        h+='</div>';
        h+='<div id="cmb-insert-progress" style="display:none;">';
        h+='<div class="cmb-card" style="margin-top:16px;">';
        h+='<label class="cmb-label" id="cmb-progress-label">Inserting...</label>';
        h+='<div class="cmb-progress-bar"><div class="cmb-progress-fill" id="cmb-progress-fill" style="width:0%;"></div></div>';
        h+='<div class="cmb-progress-log" id="cmb-progress-log"></div>';
        h+='</div></div>';
        h+='<div id="cmb-insert-results" style="display:none;"></div>';
        h+='<div class="cmb-import-steps">';
        h+='<h4>\u{1F680} How Direct API Insert Works</h4><ol>';
        h+='<li>Click <strong>Insert into Canvas</strong> above.</li>';
        h+='<li>The script uses the <strong>current Canvas module</strong> you opened from.</li>';
        h+='<li>It creates all <strong>pages, assignments, and quizzes</strong> with full content.</li>';
        h+='<li>Each new item is added to the current module automatically.</li>';
        h+='<li>Go to <strong>Modules</strong> in your course \u2014 everything will be there (unpublished)!</li>';
        h+='</ol></div>';
        body.innerHTML=h;
        body.querySelector("#cmb-back-build2").addEventListener("click",function(){state.step="build";render();});
        body.querySelector("#cmb-insert-all").addEventListener("click",async function(){
            var btn = body.querySelector("#cmb-insert-all");
            btn.disabled = true; btn.textContent = "Inserting...";
            var progressArea = body.querySelector("#cmb-insert-progress");
            var progressLabel = body.querySelector("#cmb-progress-label");
            var progressFill = body.querySelector("#cmb-progress-fill");
            var progressLog = body.querySelector("#cmb-progress-log");
            var resultsArea = body.querySelector("#cmb-insert-results");
            progressArea.style.display = "block";
            resultsArea.style.display = "none";
            progressLog.innerHTML = "";
            state.status = "Inserting content into Canvas...";
            state.statusType = "loading";
            renderStatus(overlayEl.querySelector("#cmb-panel"));
            try {
                var results = await insertAllContent(function(completed, total, msg){
                    var pct = Math.round((completed / total) * 100);
                    progressFill.style.width = pct + "%";
                    progressLabel.textContent = "Inserting... " + completed + " / " + total + " steps (" + pct + "%)";
                    var logLine = document.createElement("div");
                    logLine.className = msg.startsWith("ERROR") ? "error" : "success";
                    logLine.textContent = "[" + completed + "/" + total + "] " + msg;
                    progressLog.appendChild(logLine);
                    progressLog.scrollTop = progressLog.scrollHeight;
                });
                progressFill.style.width = "100%";
                progressLabel.textContent = "Insertion complete!";
                var rh = '<div class="cmb-card" style="margin-top:16px;background:#f0fdf4;border-color:#bbf7d0;">';
                rh += '<h3 style="margin:0 0 8px;color:#065F46;">\u2705 Insertion Complete!</h3>';
                for(var r = 0; r < results.modules.length; r++){
                    var rm = results.modules[r];
                    rh += '<div style="margin-bottom:8px;"><strong>\u{1F4E6} ' + esc(rm.title) + '</strong> (Module ID: ' + rm.id + ')<ul style="margin:4px 0 0 16px;font-size:12px;">';
                    for(var ri = 0; ri < rm.items.length; ri++){
                        var rItem = rm.items[ri];
                        var statusIcon = rItem.status === "inserted" ? "\u2713" : rItem.status === "skipped" ? "\u23ED" : "\u2717";
                        var statusColor = rItem.status === "inserted" ? "#065F46" : rItem.status === "skipped" ? "#92400E" : "#991B1B";
                        rh += '<li style="color:' + statusColor + ';">' + statusIcon + ' ' + esc(rItem.title) + ' (' + rItem.status + ')';
                        if(rItem.error) rh += ' \u2014 ' + esc(rItem.error);
                        rh += '</li>';
                    }
                    rh += '</ul></div>';
                }
                if(results.errors.length > 0){
                    rh += '<div style="margin-top:12px;padding:8px;background:#fef2f2;border-radius:6px;font-size:12px;color:#991B1B;">';
                    rh += '<strong>Errors:</strong><ul style="margin:4px 0 0 16px;">';
                    for(var ei = 0; ei < results.errors.length; ei++){
                        rh += '<li>' + esc(results.errors[ei]) + '</li>';
                    }
                    rh += '</ul></div>';
                }
                rh += '<div style="margin-top:12px;font-size:13px;color:#065F46;">Go to your course\'s <strong>Modules</strong> page to see all inserted content. Items are created as <strong>unpublished</strong> \u2014 publish them when ready!</div>';
                rh += '</div>';
                resultsArea.innerHTML = rh;
                resultsArea.style.display = "block";
                state.status = "\u2705 All content inserted into Canvas! Check your Modules page.";
                state.statusType = "success";
            } catch(err){
                state.status = "Insert error: " + err.message;
                state.statusType = "error";
                btn.disabled = false;
                btn.textContent = "\u{1F680} Insert into Canvas";
            }
            renderStatus(overlayEl.querySelector("#cmb-panel"));
        });
    }

    // ========== OVERLAY ==========

    function openOverlay(){
        if(overlayEl)return;
        if(!state.selectedCanvasModule) selectNewModule();
        ensureSingleCanvasModule();
        overlayEl=document.createElement("div");
        overlayEl.id="cmb-overlay";
        overlayEl.innerHTML='<div id="cmb-panel"><div class="cmb-topbar"><div><h1>Canvas AI Module Builder</h1><div class="cmb-topbar-sub" id="cmb-topbar-sub"></div></div><button class="cmb-close" id="cmb-close-btn">Close</button></div><div class="cmb-stepbar"></div><div class="cmb-body"></div><div class="cmb-status" style="display:none;"></div></div>';
        document.body.appendChild(overlayEl);
        overlayEl.querySelector("#cmb-close-btn").addEventListener("click",closeOverlay);
        overlayEl.addEventListener("click",function(e){if(e.target===overlayEl)closeOverlay();});
        render();
    }

    function closeOverlay(){
        if(overlayEl){overlayEl.remove();overlayEl=null;}
    }

    function isModulesPage(){
        return /\/courses\/\d+\/modules/.test(window.location.pathname);
    }

    function findCanvasModules(){
        var seen = new Set();
        var modules = [];
        function add(el){
            if(!el || !(el instanceof HTMLElement) || seen.has(el)) return;
            if(!looksLikeModuleContainer(el)) return;
            seen.add(el);
            modules.push(el);
        }
        [
            ".context_module",
            "[id^='context_module_']",
            "[data-testid='module-container']",
            "[data-testid='context-module']",
            "[data-testid='module']"
        ].forEach(function(sel){
            document.querySelectorAll(sel).forEach(add);
        });
        document.querySelectorAll(".ig-header,.context_module_header,.ig-header__layout,[data-testid='module-header']").forEach(function(header){
            add(header.closest(".context_module,[id^='context_module_'],[data-testid='module-container'],[data-testid='context-module'],[data-testid='module'],section,li,div[role='region']") || header.parentElement);
        });
        return modules;
    }

    function looksLikeModuleContainer(el){
        if(isModuleItemRow(el)) return false;
        if(el.matches(".context_module,[id^='context_module_'],[data-testid='module-container'],[data-testid='context-module'],[data-testid='module']")) return true;
        var hasTitle = !!el.querySelector(".ig-header-title,.context_module_title,.ig-title,h2,h3");
        var hasHeader = !!el.querySelector(".ig-header,.context_module_header,.ig-header__layout,[data-testid='module-header']");
        var hasActions = !!el.querySelector(".ig-header-admin,.ig-header__admin,.ig-header__actions,[role='toolbar'],[data-testid='module-menu-trigger']");
        var hasModuleLink = !!Array.from(el.querySelectorAll('a[href*="/modules/"]')).find(function(link){
            return !/\/modules\/items\//.test(link.getAttribute("href") || "");
        });
        return hasTitle && (hasHeader || hasActions || hasModuleLink);
    }

    function isModuleItemRow(el){
        return el.matches(".context_module_item,[id^='context_module_item_'],[data-module-item-id],[data-testid='module-item'],.ig-row") ||
            !!(el.closest(".context_module_item,[id^='context_module_item_'],[data-module-item-id],[data-testid='module-item']") && !el.matches(".context_module,[id^='context_module_']"));
    }

    // ── PER-MODULE BUTTON ────────────────────────────────────────────────────
    // One "AI Builder" button injected into each module's own header toolbar
    // on the Modules page, opening the builder scoped to that module.
    function findModuleToolbar(module){
        var header =
            module.querySelector(".ig-header") ||
            module.querySelector(".ig-header__layout") ||
            module.querySelector(".context_module_header") ||
            module.querySelector("[data-testid='module-header']") ||
            module.querySelector("h2,h3")?.parentElement;
        if(!(header instanceof HTMLElement) || isModuleItemRow(header)) return null;

        var toolbar =
            header.querySelector(".ig-header-admin") ||
            header.querySelector(".ig-header__admin") ||
            header.querySelector(".ig-header__actions") ||
            header.querySelector('[role="toolbar"]');
        if(toolbar && !isModuleItemRow(toolbar)) return toolbar;

        var trigger = header.querySelector(".al-trigger,[data-testid='module-menu-trigger'],button[aria-haspopup='true']");
        if(trigger && trigger.parentElement && !isModuleItemRow(trigger.parentElement)) return trigger.parentElement;

        return header;
    }

    function injectModuleToolbarButtons(){
        if(!isModulesPage())return;
        findCanvasModules().forEach(function(module){
            var toolbar = findModuleToolbar(module);
            if(!toolbar)return;
            // Check the button is actually still there, not just a flag on the module
            // container — Canvas re-renders a module's header on its own (drag-reorder,
            // publish-state changes, progress updates), which wipes injected children,
            // but the outer module element (and any flag stored on it) survives that
            // re-render, so a flag-only check would think the button still exists.
            if(toolbar.querySelector(".cmb-module-toolbar-btn"))return;

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cmb-module-toolbar-btn";
            btn.textContent = "AI Builder";
            btn.title = "Open Canvas AI Module Builder";
            btn.addEventListener("click",function(e){
                e.preventDefault();
                e.stopPropagation();
                selectCanvasModule(module);
                openOverlay();
            });
            toolbar.appendChild(btn);
        });
    }

    function init(){
        GM_addStyle(CSS);
        GM_addStyle(".cmb-module-toolbar-btn{margin-left:8px;padding:4px 10px;background:#7C3AED;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:700;line-height:1.4;}.cmb-module-toolbar-btn:hover{background:#6D28D9;}");
        injectModuleToolbarButtons();
        new MutationObserver(injectModuleToolbarButtons).observe(document.body,{childList:true,subtree:true});
        window.addEventListener("popstate", injectModuleToolbarButtons);
        setInterval(injectModuleToolbarButtons, 1500);
    }

    function waitAndLaunch(tries){
        if(tries===undefined)tries=0;
        if(tries>40)return;
        if(document.body){init();}else{setTimeout(function(){waitAndLaunch(tries+1);},250);}
    }

    if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){waitAndLaunch(0);});}
    else{waitAndLaunch(0);}

})();
