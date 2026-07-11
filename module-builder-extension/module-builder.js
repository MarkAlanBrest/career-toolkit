// Canvas AI Module Builder — content script
// Bring-your-own-Claude-API-key module/page/quiz builder, inserted directly via the Canvas API.

(function () {
    "use strict";
    console.log("[CMB] script starting");

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
    const UNSPLASH_KEY_DEFAULT = "";
    // No shipped default here (unlike Unsplash) — YouTube Data API quota is a
    // strict 10,000 units/day per Google Cloud project, and search costs 100
    // units/call. A single shared key would get exhausted almost immediately
    // once more than a couple of teachers used it. BYOK only.
    const YOUTUBE_KEY = "AIgrader_YoutubeKey";
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

    const ACTIVITY_TYPES = ["flashcard","quickcheck","termreveal","truefalse","readcheck","matching",
        "whatwouldyoudo","finderror","spothazard","mysterymachine","decisionpoint","whathappensnext","buildprocess","beattheexpert","commonmistake","protip"];

    // How many items "Build All" generates at once. Anthropic tolerates several
    // concurrent requests fine; keep this modest to avoid tripping rate limits.
    const BUILD_ALL_CONCURRENCY = 3;

    // group values map to the 3 Add Items categories rendered in renderLayout:
    // "content" (informational pages), "activity" (ungraded interactive practice),
    // "assignment" (graded, submittable).
    const ITEM_TYPES = {
        intro:{label:"Intro Page",icon:"\u{1F4D8}",group:"content",desc:"Welcome/overview page that kicks off the module."},
        content:{label:"Content Page",icon:"\u{1F4C4}",group:"content",desc:"General-purpose lesson content \u2014 the default page type."},
        video:{label:"Video Page",icon:"\u{1F3AC}",group:"content",desc:"Embeds a video (paste a link or search YouTube) with supporting text."},
        reading:{label:"Reading Page",icon:"\u{1F4D6}",group:"content",desc:"Framed as reading material for the topic."},
        activity:{label:"Activity Page",icon:"\u{1F3AF}",group:"content",desc:"Generic hands-on activity page \u2014 same template as Content Page, different label."},
        summary:{label:"Summary Page",icon:"\u{1F4CB}",group:"content",desc:"Wrap-up / review page, usually at the end of a module."},
        resource:{label:"Resource Page",icon:"\u{1F517}",group:"content",desc:"Curated list of links and resources."},

        flashcard:{label:"Flashcard Deck",icon:"\u{1F0CF}",group:"activity",desc:"Flippable term/definition cards \u2014 click a card to flip it."},
        quickcheck:{label:"Quick Check",icon:"\u2705",group:"activity",desc:"Multiple-choice practice \u2014 click a choice to check it, right there. No grade recorded."},
        termreveal:{label:"Vocab Builder",icon:"\u{1F4DA}",group:"activity",desc:"Click-to-expand vocabulary list with definitions and examples."},
        truefalse:{label:"True / False",icon:"\u2696\uFE0F",group:"activity",desc:"True/False statements \u2014 click to reveal the answer and explanation."},
        readcheck:{label:"Read + Check",icon:"\u{1F4D0}",group:"activity",desc:"Content page with comprehension questions embedded between sections \u2014 read, answer, keep reading."},
        matching:{label:"Matching",icon:"\u{1F517}",group:"activity",desc:"Term-to-definition matching \u2014 click a definition to check if it's the right match."},
        whatwouldyoudo:{label:"What Would You Do?",icon:"\u{1F3AD}",group:"activity",desc:"Students are presented with a realistic workplace situation that requires them to make a decision before revealing the recommended response. Instead of simply recalling facts, they think through the situation as if they were on the job, compare their choice to industry best practices, and learn why one response is better than the others. This activity develops critical thinking and decision-making skills that are essential in the skilled trades."},
        finderror:{label:"Find the Error",icon:"\u{1F50D}",group:"activity",desc:"Students examine a statement, diagram, procedure, calculation, or workplace scenario that contains one intentional mistake. Before revealing the answer, they identify the error and consider why it is incorrect. This activity encourages careful observation, reinforces proper procedures, and develops troubleshooting skills by teaching students to recognize common mistakes they may encounter in the workplace."},
        spothazard:{label:"Spot the Hazard",icon:"\u{1F575}\ufe0f",group:"activity",desc:"Students inspect a photograph, illustration, or workplace description to identify potential safety hazards before revealing the correct answers. Hazards are explained one by one, helping students understand not only what is unsafe but also why it creates a risk. This activity strengthens situational awareness and promotes a safety-first mindset by encouraging students to actively evaluate their work environment."},
        mysterymachine:{label:"Mystery Machine",icon:"\u{1F9E9}",group:"activity",desc:"Students are given a set of equipment symptoms, operating conditions, or clues describing a machine problem. Using the available information, they determine the most likely cause before revealing the solution and explanation. This activity mirrors real-world troubleshooting by requiring students to think logically, eliminate possibilities, and diagnose problems like experienced technicians."},
        decisionpoint:{label:"Decision Point",icon:"\u{1F6A6}",group:"activity",desc:"Students reach a critical point in a workplace scenario where they must choose the best course of action before revealing the outcome. Each decision demonstrates the consequences of good and poor choices, helping students understand not only what to do but also why their decisions matter. This activity builds confidence by allowing students to practice making job-related decisions in a safe learning environment."},
        whathappensnext:{label:"What Happens Next?",icon:"\u26a1",group:"activity",desc:"Students are presented with the beginning of a process, procedure, or workplace event and are asked to predict what will happen next before revealing the answer. By making a prediction first, students become more engaged with the material and develop a stronger understanding of cause-and-effect relationships. This activity reinforces learning through curiosity and critical thinking rather than memorization."},
        buildprocess:{label:"Build the Process",icon:"\u{1F3D7}\ufe0f",group:"activity",desc:"Students work through a procedure by revealing each step one at a time instead of viewing the entire process at once. As each stage is uncovered, they think about what should happen next before continuing. This approach transforms a standard procedure into an interactive learning experience that improves comprehension, reinforces sequencing, and helps students remember important processes."},
        beattheexpert:{label:"Beat the Expert",icon:"\u{1F3C6}",group:"activity",desc:"Students answer a practical question or solve a workplace problem before comparing their reasoning to how an experienced professional would approach the same situation. Rather than simply revealing the correct answer, the activity explains the thought process behind the expert's decision. This helps students develop professional judgment and gain insight into how experienced tradespeople think."},
        commonmistake:{label:"Common Mistake",icon:"\u{1F6AB}",group:"activity",desc:"Students explore one of the most frequent mistakes made by beginners in a particular skill or procedure. The activity explains why the mistake occurs, the problems it can create, and how experienced professionals avoid it. Learning from common errors helps students recognize and prevent those mistakes before they occur in real-world situations."},
        protip:{label:"Pro Tip",icon:"\u{1F4A1}",group:"activity",desc:"Students discover practical advice, shortcuts, and industry best practices commonly used by experienced professionals but often overlooked in textbooks. These tips provide valuable real-world insight that helps students work more efficiently, safely, and professionally. By connecting classroom learning to workplace experience, this activity gives students knowledge they can immediately apply on the job."},
        icebreaker:{label:"Ice Breaker",icon:"\u{1F9CA}",group:"activity",desc:"Light warm-up prompt or poll-style question to open a module."},
        discussion:{label:"Discussion Prompt",icon:"\u{1F4AC}",group:"activity",desc:"Ungraded discussion topic for open reflection \u2014 students can reply/thread."},

        knowledge:{label:"Knowledge Assignment",icon:"\u{1F4DD}",group:"assignment",desc:"A Knowledge Assignment evaluates the student's understanding of concepts, terminology, procedures, safety requirements, industry standards, tools, materials, and processes covered in the lesson. These assignments measure comprehension rather than physical skill and are typically completed online or on paper. The AI may generate multiple-choice, true/false, matching, fill-in-the-blank, short answer, sequencing, labeling diagrams, calculations, or scenario-based questions."},
        research:{label:"Research Assignment",icon:"\u{1F52C}",group:"assignment",desc:"A Research Assignment requires students to investigate information beyond the course materials using reliable sources. Students collect, evaluate, summarize, and present information while developing research, critical thinking, and communication skills. Assignments may involve researching OSHA standards, building codes, manufacturers, new technologies, materials, careers, equipment, or industry best practices."},
        creative:{label:"Creative Assignment",icon:"\u{1F4E6}",group:"assignment",desc:"A Creative Assignment encourages students to apply course concepts by interacting with the real world. Rather than simply answering questions, students demonstrate understanding through photographs, videos, sketches, presentations, models, digital media, or other creative products. These assignments often require students to identify, document, explain, or compare real examples found in homes, businesses, construction sites, or everyday environments."},
        labproject:{label:"Lab Project",icon:"\u{1F6E0}",group:"assignment",desc:"A Lab Project requires students to demonstrate competency by physically performing a trade-related skill using proper tools, equipment, materials, and safety procedures. The assignment focuses on applying knowledge in a realistic work environment while producing a quality result that meets industry expectations. Students typically submit photographs, videos, measurements, or instructor verification as evidence of completion."},
        troubleshooting:{label:"Troubleshooting Assignment",icon:"\u{1F50D}",group:"assignment",desc:"A Troubleshooting Assignment develops diagnostic and problem-solving skills by presenting students with equipment failures, construction defects, installation errors, or workplace problems. Students analyze symptoms, identify possible causes, determine the most likely solution, and explain the reasoning behind their decisions. These assignments simulate the decision-making required in real-world technical careers."},
        inspection:{label:"Inspection Assignment",icon:"\u{1F4CB}",group:"assignment",desc:"An Inspection Assignment requires students to evaluate equipment, materials, structures, tools, or work areas against established standards, codes, specifications, or safety regulations. Students identify deficiencies, document observations, determine compliance, and recommend corrective actions. Inspection assignments reinforce attention to detail and quality assurance skills commonly used throughout the skilled trades."},
        blueprint:{label:"Blueprint / Diagram Assignment",icon:"\u{1F4D0}",group:"assignment",desc:"A Blueprint or Diagram Assignment develops the student's ability to read, interpret, and apply technical drawings, blueprints, schematics, wiring diagrams, piping layouts, exploded views, or construction plans. Students may identify components, determine dimensions, follow symbols, trace systems, or answer questions based on technical documentation commonly used in industry."},
        demonstration:{label:"Demonstration Assignment",icon:"\u{1F3A5}",group:"assignment",desc:"A Demonstration Assignment requires students to explain and demonstrate a specific skill, procedure, or operation through a recorded video, live presentation, narrated slideshow, or instructor observation. Students must not only perform the task correctly but also demonstrate an understanding of why each step is performed and how it contributes to safe and effective job performance."},
        estimating:{label:"Estimating / Job Planning Assignment",icon:"\u{1F4B2}",group:"assignment",desc:"An Estimating or Job Planning Assignment develops planning and organizational skills by requiring students to prepare for a job before work begins. Students calculate material quantities, estimate labor, determine equipment needs, prepare cost estimates, develop project schedules, select tools, or create work plans based on project requirements. These assignments mirror the planning activities performed by technicians, foremen, and contractors."},
        scenario:{label:"Workplace Scenario Assignment",icon:"\u{1F9E9}",group:"assignment",desc:"A Workplace Scenario Assignment presents students with realistic job-site situations requiring professional judgment and decision-making. Students evaluate information, apply technical knowledge, prioritize actions, consider safety, communicate effectively, and justify their decisions. Scenarios may involve customer interactions, safety concerns, equipment failures, ethical situations, scheduling conflicts, or other workplace challenges that have multiple reasonable solutions."},
        gradeddiscussion:{label:"Graded Discussion",icon:"\u{1F5E3}\uFE0F",group:"assignment",desc:"Same as Discussion Prompt, but with points attached \u2014 shows up in the gradebook."},
    };

    const ITEM_CATEGORIES = [
        ["content", "\u{1F4C4} Content"],
        ["activity", "\u{1F3AE} Activity Learning"],
        ["assignment", "\u{1F4DD} Assignments"]
    ];

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

    let overlayEl = null;

    const state = {
        step: "setup",
        apiKey: "",
        unsplashKey: "",
        youtubeKey: "",
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

    try { state.youtubeKey = localStorage.getItem(YOUTUBE_KEY) || ""; } catch(e) {}

    function curMod() { return state.modules[state.currentModuleIndex] || null; }
    function esc(s){var d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}
    function uid(){return "cmb_"+Date.now().toString(36)+"_"+Math.random().toString(36).substr(2,6);}
    function saveApiKey(k){try{localStorage.setItem(APIKEY_KEY,k);}catch(e){}}
    function saveUnsplashKey(k){try{localStorage.setItem(UNSPLASH_KEY,k);}catch(e){}}
    function saveYoutubeKey(k){try{localStorage.setItem(YOUTUBE_KEY,k);}catch(e){}}

    function slugify(s){
        return (s||"untitled").toLowerCase()
            .replace(/[^a-z0-9\s-]/g,"")
            .replace(/\s+/g,"-")
            .replace(/-+/g,"-")
            .replace(/^-|-$/g,"")
            .substring(0,50)||"item";
    }

    // Prefer a teacher title, then an AI-generated document/HTML title. This
    // prevents generic Canvas names such as "Content Page 2" after deployment.
    function canvasItemTitle(item,data,index){
        var info=ITEM_TYPES[item.type]||{label:"Item"};
        if(data&&data.itemTitle&&String(data.itemTitle).trim())return String(data.itemTitle).trim();
        if(data&&data.generatedPdfSchema&&data.generatedPdfSchema.title)return String(data.generatedPdfSchema.title).trim();
        if(data&&data.generatedAnswerKey&&data.generatedAnswerKey.title)return String(data.generatedAnswerKey.title).trim();
        if(data&&data.generatedHTML){try{var doc=new DOMParser().parseFromString(data.generatedHTML,"text/html"),h=doc.querySelector("h1,h2");if(h&&h.textContent&&h.textContent.trim())return h.textContent.trim();}catch(e){}}
        return info.label+" "+(index+1);
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

    // Paginated GET, following the Link "next" header — for list endpoints
    // (users, assignments, submissions) that can span multiple pages.
    async function canvasAPIAll(path){
        var courseId = getCourseId();
        if(!courseId) throw new Error("Could not determine course ID from URL. Navigate to a course page first.");
        var url = "/api/v1/courses/" + courseId + path + (path.indexOf("?") >= 0 ? "&" : "?") + "per_page=100";
        var results = [];
        while(url){
            var resp = await fetch(url, { credentials: "same-origin" });
            if(!resp.ok){
                var errText = ""; try{ errText = await resp.text(); }catch(e){}
                throw new Error("Canvas API error " + resp.status + ": " + errText);
            }
            var data = await resp.json();
            results = results.concat(data);
            var link = resp.headers.get("Link") || "";
            var nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
            url = nextMatch ? nextMatch[1] : null;
        }
        return results;
    }

    // Sends a Canvas Conversations message. Not scoped under /courses/:id
    // like the rest of the API, and Canvas wants this one form-encoded
    // (with recipients[]= etc.) rather than JSON.
    async function sendCanvasMessage(courseId, recipientId, subject, body){
        var formData = new URLSearchParams();
        formData.append("recipients[]", String(recipientId));
        formData.append("subject", subject);
        formData.append("body", body);
        formData.append("force_new", "true");
        formData.append("group_conversation", "false");
        formData.append("context_code", "course_" + courseId);
        formData.append("mode", "sync");
        var resp = await fetch("/api/v1/conversations", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRF-Token": getCSRFToken(),
                "X-Requested-With": "XMLHttpRequest"
            },
            body: formData.toString()
        });
        var responseText = await resp.text();
        if(!resp.ok) throw new Error("Canvas API error " + resp.status + ": " + responseText);
        try{ return JSON.parse(responseText); }catch(e){ return responseText; }
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

    // 3-step Canvas Files API upload: register the upload (get a pre-signed
    // target), POST the bytes there, then confirm. Used to attach a
    // generated PDF to a course so it can be linked from an assignment's
    // description. Step 2 deliberately carries no auth headers/credentials
    // — the pre-signed upload_params already carry what's needed, and the
    // target may be a different origin (e.g. S3) where extra headers would
    // trigger an unwanted CORS preflight.
    async function canvasUploadFile(filename, blob, contentType){
        var step1 = await canvasAPI("POST", "/files", {
            name: filename,
            size: blob.size,
            content_type: contentType || "application/pdf",
            parent_folder_path: "module builder pdfs",
            on_duplicate: "rename"
        });

        var form = new FormData();
        Object.keys(step1.upload_params || {}).forEach(function(k){
            form.append(k, step1.upload_params[k]);
        });
        form.append("file", blob, filename);

        var step2 = await fetch(step1.upload_url, { method: "POST", body: form });

        if(step2.status === 201 || step2.status === 200){
            var body = await step2.json().catch(function(){ return null; });
            if(body && body.id) return body;
        }
        var loc = step2.headers.get("Location");
        if(loc){
            var confirmResp = await fetch(loc, { credentials: "same-origin" });
            if(!confirmResp.ok) throw new Error("File upload confirmation failed: " + confirmResp.status);
            return confirmResp.json();
        }
        throw new Error("File upload did not return a file object or redirect Location.");
    }

    // pointValue optional — when set, Canvas creates a linked assignment so
    // the discussion is graded (shows in the gradebook) instead of a plain
    // ungraded discussion topic.
    async function createDiscussionTopic(title, html, pointValue){
        var body = { title: title, message: html, published: false, discussion_type: "threaded" };
        if(pointValue){
            body.assignment = { points_possible: parseFloat(pointValue) || 100, grading_type: "points" };
        }
        return canvasAPI("POST", "/discussion_topics", body);
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
            totalSteps += state.modules[mi].items.length;
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
                    if(itemInfo.group === "assignment" && item.type !== "gradeddiscussion"){
                        // Every one of the 10 PDF-based assignment types
                        // (Knowledge through Workplace Scenario) ships the
                        // same way: render the fillable PDF, upload it to
                        // Canvas Files, and use a short instructions banner
                        // (plus the hidden criteria marker) as the
                        // assignment description. Knowledge Assignment's
                        // criteria come from its typed-question answer key;
                        // every other type's criteria come straight from
                        // its generic schema, since the AI-generated schema
                        // already IS the answer key for those.
                        var assignTitle = canvasItemTitle(item,data,i);
                        var pts = data.pointValue || "100";
                        var criteria = null;
                        var assignHtml;

                        if(data.generatedPdfSchema){
                            var pdfBytes = await renderAssignmentPdf(data.generatedPdfSchema, data);
                            var pdfFile = await canvasUploadFile(assignTitle + ".pdf", new Blob([pdfBytes], {type:"application/pdf"}), "application/pdf");
                            assignHtml = renderAssignmentPdfDescription(pdfFile.id, courseId, data);
                            if(item.type === "knowledge" && data.generatedAnswerKey){
                                criteria = formatKnowledgeCriteria(data.generatedAnswerKey);
                                criteria.answerFields = pdfSchemaFieldList(data.generatedPdfSchema);
                            } else if(item.type !== "knowledge"){
                                criteria = formatAssignmentCriteria(data.generatedPdfSchema);
                            }
                            if(criteria){
                                // Embed the answer key in the assignment's
                                // own content (hidden from students) so it
                                // survives a Canvas course copy or a
                                // hand-off to another teacher, not just in
                                // this browser's storage.
                                assignHtml = cmbEmbedCriteriaMarker(assignHtml, criteria);
                            }
                        } else {
                            assignHtml = "<p>Assignment content not yet generated.</p>";
                        }

                        var assignment = await createAssignment(assignTitle, assignHtml, pts);
                        report("Created assignment: " + assignTitle);
                        await addModuleItem(canvasMod.id, "Assignment", assignment.id, assignTitle, insertPosition);
                        results.modules[results.modules.length-1].items.push({ title: assignTitle, status: "inserted", type: item.type });

                        // Also pre-fill the AI Grader's Grading Criteria for
                        // this exact assignment ID in this browser, so AI
                        // Grade already knows the correct answers the first
                        // time this teacher opens SpeedGrader for it.
                        if(criteria){
                            sgSaveCriteriaFor(courseId, assignment.id, criteria);
                        }

                    } else if(item.type === "discussion" || item.type === "gradeddiscussion"){
                        var discTitle = canvasItemTitle(item,data,i);
                        var discHtml = data.generatedHTML || "<p>Discussion prompt not yet generated.</p>";
                        var discPts = item.type === "gradeddiscussion" ? (data.pointValue || "100") : null;
                        var topic = await createDiscussionTopic(discTitle, discHtml, discPts);
                        report("Created discussion: " + discTitle);
                        await addModuleItem(canvasMod.id, "Discussion", topic.id, discTitle, insertPosition);
                        results.modules[results.modules.length-1].items.push({ title: discTitle, status: "inserted", type: item.type });

                    } else {
                        var pageTitle = canvasItemTitle(item,data,i);
                        var pageHtml = data.generatedHTML || "<p>Content not yet generated.</p>";
                        var page = await createPage(pageTitle, pageHtml);
                        report("Created page: " + pageTitle);
                        await addModuleItem(canvasMod.id, "Page", page.url, pageTitle, insertPosition);
                        results.modules[results.modules.length-1].items.push({ title: pageTitle, status: "inserted", type: "page" });
                    }
                } catch(err){
                    var errTitle = itemInfo.label + " " + itemNum;
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
        if(item.type==="discussion"){
            state.itemData[item.id]={contentType:"discussion",pageStyle:"custom",customColor:"#1e3a5f",layout:"standard",pageElements:{emojiIcons:true,sectionDividers:true,tipBoxes:true,imagePlaceholders:false,collapsible:false,quoteBoxes:false,alertBoxes:false},textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build"};
        }else if(item.type==="gradeddiscussion"){
            state.itemData[item.id]={contentType:"discussion",pageStyle:"custom",customColor:"#1e3a5f",layout:"standard",pointValue:"",dueDate:"",pageElements:{emojiIcons:true,sectionDividers:true,tipBoxes:true,imagePlaceholders:false,collapsible:false,quoteBoxes:false,alertBoxes:false},textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build"};
        }else if(ITEM_TYPES[item.type] && ITEM_TYPES[item.type].group==="assignment"){
            // Shared shape for every PDF-based assignment type (Knowledge
            // through Workplace Scenario) — see renderPdfAssignmentBuilder.
            var shape={contentType:"pdfassignment",pageStyle:"custom",customColor:"#1e3a5f",
                pointValue:"",dueDate:"",textContent:"",uploadedFile:"",uploadedName:"",
                referenceImageData:"",referenceImageType:"",referenceImageName:"",referenceImageSource:"",referenceImageAttribution:"",imageKeyword:"",
                generatedAnswerKey:null,generatedPdfSchema:null,subView:"build"};
            if(item.type==="knowledge"){
                shape.typeCounts={mc:4,tf:2,matching:0,ordering:0,short:2,fillblank:0,labeling:0,calculation:0,scenario:0};
            }
            state.itemData[item.id]=shape;
        }else if(item.type==="video"){
            state.itemData[item.id]={contentType:"page",pageStyle:"custom",customColor:"#1e3a5f",layout:"standard",videoUrl:"",videoQuery:"",videoResults:null,videoPreviewIndex:null,pageElements:{emojiIcons:true,sectionDividers:true,tipBoxes:true,imagePlaceholders:false,collapsible:false,quoteBoxes:false,alertBoxes:false},textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build"};
        }else if(ACTIVITY_TYPES.indexOf(item.type)>=0){
            var defCounts={flashcard:8,quickcheck:5,termreveal:10,truefalse:7,readcheck:3,matching:8,
                whatwouldyoudo:5,finderror:6,spothazard:5,mysterymachine:5,decisionpoint:5,whathappensnext:6,buildprocess:6,beattheexpert:5,commonmistake:6,protip:8};
            state.itemData[item.id]={contentType:"activity",activityType:item.type,pageStyle:"custom",count:defCounts[item.type]||6,includeImages:false,textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build",aiEngine:"detailed"};
        }else{
            state.itemData[item.id]={contentType:"page",pageStyle:"custom",customColor:"#1e3a5f",layout:"standard",pageElements:{emojiIcons:true,sectionDividers:true,tipBoxes:true,imagePlaceholders:false,collapsible:false,quoteBoxes:false,alertBoxes:false},textContent:"",uploadedFile:"",uploadedName:"",generatedHTML:"",subView:"build"};
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

    // Analyzes whatever source material is attached to this module and asks
    // the AI to recommend which items to build — and in what mix — rather
    // than the teacher hand-picking every item. The key judgment call: is
    // the uploaded material something students will read directly (a
    // chapter, an article — needs few content pages, since the reading IS
    // the content) or something that isn't itself readable material (a test,
    // an answer key, bare notes — needs more content pages built to actually
    // teach what the source implies)?
    function buildLayoutSuggestionPrompt(mod, pastedText){
        var catalog = Object.keys(ITEM_TYPES).map(function(k){
            var t = ITEM_TYPES[k];
            return "- "+k+" (\""+t.label+"\"): "+(t.desc||"");
        }).join("\n");

        var p = "You are an instructional designer planning the structure of ONE Canvas LMS module from source material a teacher just uploaded.\n\n";
        p += "AVAILABLE ITEM TYPES (recommend ONLY using these exact keys):\n"+catalog+"\n\n";
        p += "HOW TO DECIDE:\n";
        p += "- First, identify what KIND of document this is (e.g. \"a textbook chapter students will read in full\", \"a test/exam with questions\", \"an answer key\", \"sparse lecture notes or an outline\", \"a worksheet\", \"a short article\").\n";
        p += "- If the material is substantial reading students will consume directly (a book chapter, an article, full lecture notes) — recommend FEWER content pages, since the reading itself already covers the material. Use an intro page that tells students to read the provided material, then complete the activities, and lean on activity/assessment items (Quick Check, Vocab Builder, Read + Check, etc.) to check understanding of that reading instead of re-explaining it in content pages.\n";
        p += "- If the material is sparse, or is itself assessment material (a test, an exam, an answer key) rather than something meant to be read as-is — recommend MORE content pages, since those pages need to actually reconstruct and teach the underlying material the source implies, with nothing already there for students to read directly.\n";
        p += "- Recommend a sensible total of 4-8 items for one module. Always start with an Intro Page unless the material clearly doesn't call for one. Don't pad the list — only include a Discussion, Ice Breaker, Assignment, or assessment item if it genuinely fits this material.\n\n";
        p += "SOURCE MATERIAL:\n";
        if(pastedText && pastedText.trim()) p += pastedText.trim()+"\n\n";
        p += getModuleSourceContext();
        p += "\n\nReturn ONLY valid JSON, no markdown, no explanations outside the JSON:\n";
        p += '{"documentType":"short description of what this material is","reasoning":"1-2 sentences on why this layout fits","items":["intro","reading","quickcheck","assignment"]}';
        return p;
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

    // ========== YOUTUBE VIDEO SEARCH ==========
    // Powers the "Recommend Videos" button on Video Page items — searches
    // real, embeddable YouTube videos so a teacher can pick one instead of
    // hunting for a link themselves.

    function youtubeSearch(query){
        return new Promise(function(resolve,reject){
            if(!state.youtubeKey){reject(new Error("No YouTube API key configured — add one in Setup."));return;}
            chrome.runtime.sendMessage({type:"CMB_YOUTUBE_SEARCH",payload:{youtubeKey:state.youtubeKey,query:query}},function(resp){
                if(chrome.runtime.lastError){reject(new Error(chrome.runtime.lastError.message));return;}
                if(!resp||resp.error){reject(new Error((resp&&resp.error)||"No results"));return;}
                resolve(resp.results||[]);
            });
        });
    }

    // ISO 8601 duration ("PT5M32S") -> "5:32"
    function formatYoutubeDuration(iso){
        if(!iso) return "";
        var m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if(!m) return "";
        var h = parseInt(m[1]||0,10), min = parseInt(m[2]||0,10), s = parseInt(m[3]||0,10);
        var mm = h ? String(min).padStart(2,"0") : String(min);
        var ss = String(s).padStart(2,"0");
        return h ? (h+":"+mm+":"+ss) : (mm+":"+ss);
    }

    // Unsplash's API terms require pinging download_location whenever a photo
    // is actually used, separate from the search call itself. Fire-and-forget.
    function triggerUnsplashDownload(location){
        if(!location||!state.unsplashKey) return;
        chrome.runtime.sendMessage({type:"CMB_UNSPLASH_DOWNLOAD",payload:{unsplashKey:state.unsplashKey,location:location}},function(){});
    }

    // dir is "left"/"right" (floats the image, text wraps around it) or "" (full-width block).
    function imagePlaceholderTag(keyword,dir){
        var floatStyle = dir ? ("float:"+dir+";max-width:320px;margin:"+(dir==="left"?"4px 20px 12px 0":"4px 0 12px 20px")+";") : "width:100%;";
        return '<div style="'+floatStyle+'background:linear-gradient(135deg,#1A2028,#2E3A42);border:2px dashed #4A5A64;min-height:180px;display:flex;align-items:center;justify-content:center;color:#5A6A74;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Image: '+esc(keyword)+'</div>';
    }

    function unsplashPhotoTag(photo,keyword,dir){
        var wrapStyle = dir ? ("float:"+dir+";max-width:320px;margin:"+(dir==="left"?"4px 20px 12px 0":"4px 0 12px 20px")+";") : "margin:24px 0;";
        return '<figure style="'+wrapStyle+'">'
            +'<img src="'+photo.url+'" alt="'+esc(keyword)+'" style="width:100%;max-width:100%;height:auto;display:block;border-radius:4px;">'
            +'<figcaption style="font-family:Arial,sans-serif;font-size:11px;color:#94A3B8;margin-top:6px;text-align:'+(dir?'left':'right')+';">Photo by <a href="'+photo.profile+'" target="_blank" rel="noopener">'+esc(photo.name)+'</a> on <a href="https://unsplash.com/?utm_source=canvas_module_builder&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a></figcaption>'
            +'</figure>';
    }

    // Replaces every "[[IMAGE: keyword]]" (or "[[IMAGE-LEFT: ...]]" /
    // "[[IMAGE-RIGHT: ...]]" for a floated, text-wrapped image) marker in the
    // HTML with a real Unsplash photo (falls back to a placeholder box
    // per-keyword on error or if no Unsplash key is configured).
    async function resolveImageMarkers(html){
        if(!html || html.indexOf("[[IMAGE")<0) return html;
        var re=/\[\[IMAGE(-LEFT|-RIGHT)?:\s*([^\]]+?)\s*\]\]/g;
        var keywords=[]; var m;
        while((m=re.exec(html))){ if(keywords.indexOf(m[2])<0) keywords.push(m[2]); }
        var photos={};
        for(var i=0;i<keywords.length;i++){
            var kw=keywords[i];
            try{
                photos[kw]=await unsplashSearch(kw);
                triggerUnsplashDownload(photos[kw].downloadLocation);
            }catch(err){
                photos[kw]=null;
            }
        }
        return html.replace(re,function(full,dirRaw,keyword){
            var dir = dirRaw ? dirRaw.replace("-","").toLowerCase() : "";
            var photo = photos[keyword];
            return photo ? unsplashPhotoTag(photo,keyword,dir) : imagePlaceholderTag(keyword,dir);
        });
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
        var info=ITEM_TYPES[item.type];
        if(info && info.group==="assignment" && item.type!=="gradeddiscussion") return !!d.generatedPdfSchema;
        return !!d.generatedHTML;
    }

    // Runs the actual generation for one item — same logic as each builder's
    // own Generate button, just without touching the DOM.
    async function generateOneItem(item, d, mod){
        var info=ITEM_TYPES[item.type];
        if(info && info.group==="assignment" && item.type!=="gradeddiscussion"){
            if(item.type==="knowledge"){
                var total=Object.values(d.typeCounts||{}).reduce(function(s,v){return s+v;},0);
                if(!total) throw new Error("No question types selected");
            }
            if(!itemHasSource(d,mod)) throw new Error("No source material");
            if(!d.referenceImageData && d.imageKeyword && d.imageKeyword.trim()){
                try{
                    var photo=await unsplashSearch(d.imageKeyword.trim());
                    var img=await fetchImageBytes(photo.url);
                    d.referenceImageData=uint8ToBase64(img.bytes);
                    d.referenceImageType=img.type;
                    d.referenceImageSource="unsplash";
                    d.referenceImageAttribution=photo.name;
                    triggerUnsplashDownload(photo.downloadLocation);
                }catch(imgErr){ /* not fatal — proceed without an image */ }
            }
            if(item.type==="knowledge"){
                var raw=await callClaude(buildKnowledgeAnswerKeyPrompt(d),contentModel(d),TOKENS_LONG);
                var cleaned=raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
                var s=cleaned.indexOf("{"), e=cleaned.lastIndexOf("}");
                if(s===-1||e===-1) throw new Error("Could not find JSON in response");
                var parsed=JSON.parse(cleaned.slice(s,e+1));
                if(!parsed.questions||!parsed.questions.length) throw new Error("No questions returned");
                d.generatedAnswerKey=parsed;
                d.generatedPdfSchema=knowledgeAnswerKeyToPdfSchema(parsed,d);
            }else{
                var raw2=await callClaude(buildAssignmentPdfPrompt(d,item.type),contentModel(d),TOKENS_LONG);
                var cleaned2=raw2.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
                var s2=cleaned2.indexOf("{"), e2=cleaned2.lastIndexOf("}");
                if(s2===-1||e2===-1) throw new Error("Could not find JSON in response");
                var parsedSchema=JSON.parse(cleaned2.slice(s2,e2+1));
                d.generatedAnswerKey=null;
                d.generatedPdfSchema=sanitizeAssignmentSchema(parsedSchema);
            }
            d.subView="result";
            return;
        }
        if(!itemHasSource(d,mod)) throw new Error("No source material");
        var html;
        if(ACTIVITY_TYPES.indexOf(item.type)>=0){
            html=await callClaude(buildActivityPrompt(d,item.type),contentModel(d),activityMaxTokens(item.type));
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
    // Builds a real, deterministic embed for a pasted video URL instead of
    // letting the AI guess at iframe syntax — YouTube/Vimeo get a proper
    // player embed, anything else falls back to a "Watch Video" link.
    function buildVideoEmbedHtml(url){
        var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
        var vimeo = url.match(/vimeo\.com\/(\d+)/);
        if(yt){
            return '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:0 0 20px;"><iframe src="https://www.youtube.com/embed/'+yt[1]+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>';
        }
        if(vimeo){
            return '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:0 0 20px;"><iframe src="https://player.vimeo.com/video/'+vimeo[1]+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>';
        }
        return '<p style="margin:0 0 20px;"><a href="'+esc(url)+'" target="_blank" rel="noopener" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:13px;">▶ Watch Video</a></p>';
    }

    function buildContentPrompt(itemData, itemType){
        var isA = itemData.contentType === "assignment";
        var tk = itemData.pageStyle || "custom";
        var layout = itemData.layout || "standard";

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

        if(itemData.videoUrl && itemData.videoUrl.trim()){
            p += "VIDEO EMBED (insert this exact block, verbatim, as the first thing inside the body wrapper, before any section content):\n";
            p += buildVideoEmbedHtml(itemData.videoUrl.trim()) + "\n\n";
        }

        p += "BODY WRAPPER (holds every section below):\n";
        if(layout === "twocol"){
            p += '<div style="max-width:1000px;margin:0 auto;padding:32px 28px;font-family:Arial,sans-serif;display:grid;grid-template-columns:2fr 1fr;gap:32px;align-items:start;">\n';
            p += "LAYOUT: two columns.\n";
            p += "- LEFT column (this div takes the first grid slot): the main sections below (headings, paragraphs, bullet lists)\n";
            p += '- RIGHT column (second grid slot, style="background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:8px;padding:18px 20px;"): a short "Key Points" or "Quick Facts" sidebar — a bold mini-heading plus 3-6 brief bullet takeaways drawn from the same content\n';
            p += "- Do not add @media queries (Canvas strips <style> blocks) — the grid alone is enough\n\n";
        } else if(layout === "imagewrap"){
            p += '<div style="max-width:820px;margin:0 auto;padding:32px 28px;font-family:Arial,sans-serif;">...sections...</div>\n';
            p += "LAYOUT: image with wrapped text.\n";
            p += "- Early in the body (right after the first section heading), insert exactly ONE marker on its own line: [[IMAGE-LEFT: 2-4 word keyword]] or [[IMAGE-RIGHT: 2-4 word keyword]] — this becomes a real floated photo that the following paragraphs wrap around\n";
            p += "- Write at least 2 full paragraphs of body text immediately after the marker so the text-wrap is actually visible\n";
            p += "- Do not write an <img> tag yourself — only the marker\n\n";
        } else if(layout === "grid"){
            p += '<div style="max-width:960px;margin:0 auto;padding:32px 28px;font-family:Arial,sans-serif;">...sections...</div>\n';
            p += "LAYOUT: card grid.\n";
            p += '- After the intro paragraph, lay out the bulk of the content as a card grid: <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:20px 0;"> containing 3-6 cards\n';
            p += '- Each card: <div style="background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:10px;padding:16px 18px;"> with a bold mini-heading (font-family:Georgia,serif;font-size:15px;font-weight:700;color:' + theme.primary + ') plus 1-2 sentences below it\n';
            p += "- Use the grid instead of long paragraphs for the main content — a short intro paragraph before the grid is fine\n\n";
        } else {
            p += '<div style="max-width:860px;margin:0 auto;padding:32px 28px;font-family:Arial,sans-serif;">...sections...</div>\n\n';
        }

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
            if(itemType === "research"){
                var rels = itemData.researchElements || {};
                var citeLabels = {apa:"APA",mla:"MLA",chicago:"Chicago"};
                var citeLabel = citeLabels[itemData.citationStyle] || "APA";
                var minSources = itemData.sourceCount || "3";
                if(rels.thesisStatement) extras.push('A "Thesis Statement" callout explaining students must state a clear, arguable thesis/claim before writing: <div style="background:#fff;border-left:4px solid ' + theme.accent + ';padding:12px 16px;margin:16px 0;"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:' + theme.accent + ';margin-bottom:4px;">THESIS STATEMENT</div><p style="margin:0;font-size:13px;color:' + theme.text + ';">[guidance on what makes a strong thesis for this topic]</p></div>');
                if(rels.sourceList) extras.push('A "Source Requirements" section stating a minimum of ' + minSources + ' credible sources are required, with 1-2 sentences on what counts as a credible source for this topic');
                if(rels.outline) extras.push('An "Outline Structure" section as a numbered list of the sections/paragraphs students should draft before writing the full paper (e.g. Introduction, Body Point 1, Body Point 2, Counterargument, Conclusion — tailored to this topic)');
                if(rels.citations) extras.push('A "Citation Format" section explaining ' + citeLabel + ' in-text citation and works-cited/reference-page requirements, with one short example citation in ' + citeLabel + ' format');
                if(rels.draftCheckpoint) extras.push('A "Draft Checkpoint" callout noting a rough draft milestone is expected before the final submission');
            }
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

    // ========== PRACTICE PACKET ==========
    // A mixed-type question packet (multiple choice, true/false, matching,
    // ordering, short answer) that's genuinely gradable: the AI returns a
    // structured answer key (not HTML), which we render into a student-
    // facing page ourselves (guaranteeing the displayed questions and the
    // stored key always match), plus a Completion Certificate section the
    // student fills in and hands in as their submission. The answer key
    // also gets saved into the AI Grader's Grading Criteria for this exact
    // assignment right after it's created in Canvas — so when the teacher
    // opens SpeedGrader and clicks AI Grade, it already knows the correct
    // answers instead of the teacher having to type them in again.

    var PACKET_TYPE_LABELS = { mc:"Multiple Choice", tf:"True / False", matching:"Matching", ordering:"Ordering", short:"Short Answer" };

    function buildKnowledgeAnswerKeyPrompt(itemData){
        var counts = itemData.typeCounts || {};
        var lines = [];
        if(counts.mc>0) lines.push("- "+counts.mc+" Multiple Choice — 4 choices (A-D), exactly one correct");
        if(counts.tf>0) lines.push("- "+counts.tf+" True/False");
        if(counts.matching>0) lines.push("- "+counts.matching+" Matching pairs (one single matching set with this many term/definition pairs)");
        if(counts.ordering>0) lines.push("- "+counts.ordering+" Ordering/sequencing tasks (a short list of steps or events the student must put in the correct order)");
        if(counts.short>0) lines.push("- "+counts.short+" Short Answer — open-ended, needs a model answer for the teacher's reference, not auto-scorable with certainty");
        if(counts.fillblank>0) lines.push("- "+counts.fillblank+" Fill-in-the-Blank (a sentence with one or more blanks to fill in)");
        if(counts.labeling>0) lines.push("- "+counts.labeling+" Labeling-a-Diagram tasks (student identifies/labels marked parts of a reference image — ONLY use this if a reference image is available, see note below)");
        if(counts.calculation>0) lines.push("- "+counts.calculation+" Calculation problems (a numeric problem with one correct numeric answer)");
        if(counts.scenario>0) lines.push("- "+counts.scenario+" Scenario-based questions (a short realistic situation requiring judgment — no single exact-match answer)");

        var p = "You are writing a graded Knowledge Assignment for a Canvas LMS trade-school course, based on the source material below. Generate a STRUCTURED ANSWER KEY as JSON — do NOT write any HTML or page layout, that will be built separately from your JSON.\n\n";
        p += "QUESTION MIX NEEDED:\n"+lines.join("\n")+"\n\n";
        p += "Return ONLY valid JSON in this exact shape, no markdown, no explanation outside the JSON:\n";
        p += '{\n';
        p += '  "title": "Short assignment title",\n';
        p += '  "questions": [\n';
        p += '    {"type":"mc","prompt":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correct":"B","points":5,"explanation":"why B is correct"},\n';
        p += '    {"type":"tf","prompt":"...","correct":true,"points":3,"explanation":"why"},\n';
        p += '    {"type":"matching","terms":["Term A","Term B","Term C"],"definitions":["Definition matching Term A","Definition matching Term B","Definition matching Term C"],"pointsEach":2},\n';
        p += '    {"type":"ordering","prompt":"What are these steps/events, in the CORRECT order","steps":["First step","Second step","Third step"],"points":5},\n';
        p += '    {"type":"short","prompt":"...","modelAnswer":"a strong reference answer, for the teacher only","points":5},\n';
        p += '    {"type":"fillblank","prompt":"A sentence with ___ blanks like this ___","blanks":["answer for blank 1","answer for blank 2"],"points":4},\n';
        p += '    {"type":"labeling","prompt":"Label the parts marked on the diagram","labels":[{"marker":"A","answer":"circuit breaker"},{"marker":"B","answer":"neutral bus bar"}],"points":6},\n';
        p += '    {"type":"calculation","prompt":"...","answer":"42","unit":"amps","tolerance":"±1","points":5},\n';
        p += '    {"type":"scenario","prompt":"A short realistic situation...","modelAnswer":"what a strong response should cover, for the teacher only","points":5}\n';
        p += '  ]\n';
        p += '}\n\n';
        p += "RULES:\n";
        p += "- Match the exact question-type counts listed above. Generate exactly one \"matching\" entry total (with all "+ (counts.matching||0) +" pairs inside its terms/definitions arrays), and exactly one \"ordering\" entry total per requested task — if more than one ordering task is requested, return that many separate \"ordering\" entries.\n";
        p += "- For \"matching\" and \"ordering\": list terms/definitions/steps in their CORRECT matching order — the display will shuffle them, not you.\n";
        p += "- For \"labeling\": only generate this type if a reference image was actually provided (see below) — the markers (A, B, C...) must correspond to points genuinely visible on that image. If no reference image is available, do not generate any \"labeling\" questions even if requested.\n";
        p += "- For \"calculation\": the problem must be solvable from the source material/given numbers — include units and a tolerance if the answer isn't a single exact integer.\n";
        p += "- Base every question directly on the source material below — do not invent unrelated content.\n";
        p += "- Valid JSON only, no trailing commas.\n\n";
        if(itemData.referenceImageData || itemData.referenceImageKeyword){
            p += "A REFERENCE IMAGE IS AVAILABLE for this assignment (a diagram/photo the teacher provided or an AI-searched stand-in) — labeling questions are appropriate.\n\n";
        }
        p += "SOURCE MATERIAL:\n";
        if(itemData.textContent && itemData.textContent.trim()) p += itemData.textContent+"\n\n";
        if(itemData.uploadedFile) p += "FILE ("+itemData.uploadedName+"):\n"+itemData.uploadedFile+"\n\n";
        p += getModuleSourceContext();
        return p;
    }

    function shuffleArray(arr){
        var a = arr.slice();
        for(var i=a.length-1;i>0;i--){
            var j = Math.floor(Math.random()*(i+1));
            var tmp=a[i]; a[i]=a[j]; a[j]=tmp;
        }
        return a;
    }


    // Turns the same structured answer key into the Grading Criteria text
    // the AI Grader reads — used right after the assignment is created in
    // Canvas, keyed to its real assignment id (see insertAllContent).
    function formatKnowledgeCriteria(parsed){
        var total = 0;
        var lines = [];
        var manualLines = [];
        (parsed.questions||[]).forEach(function(q, i){
            if(q.type==="mc"){
                total += q.points||0;
                lines.push((i+1)+". [Multiple Choice] Correct: "+q.correct+(q.explanation?(" — "+q.explanation):""));
            }else if(q.type==="tf"){
                total += q.points||0;
                lines.push((i+1)+". [True/False] Correct: "+(q.correct?"True":"False")+(q.explanation?(" — "+q.explanation):""));
            }else if(q.type==="matching"){
                var pts=(q.pointsEach||1)*(q.terms||[]).length;
                total += pts;
                lines.push((i+1)+". [Matching] "+(q.terms||[]).map(function(t,ti){ return t+" = "+q.definitions[ti]; }).join("; "));
            }else if(q.type==="ordering"){
                total += q.points||0;
                lines.push((i+1)+". [Ordering] Correct order: "+(q.steps||[]).join(" → "));
            }else if(q.type==="short"){
                total += q.points||0;
                manualLines.push((i+1)+". "+q.prompt+" — Model answer: "+q.modelAnswer);
            }else if(q.type==="fillblank"){
                total += q.points||0;
                lines.push((i+1)+". [Fill in the Blank] Correct: "+(q.blanks||[]).join(", "));
            }else if(q.type==="labeling"){
                total += q.points||0;
                lines.push((i+1)+". [Labeling] "+(q.labels||[]).map(function(l){ return l.marker+" = "+l.answer; }).join("; "));
            }else if(q.type==="calculation"){
                total += q.points||0;
                lines.push((i+1)+". [Calculation] Correct: "+q.answer+(q.unit?(" "+q.unit):"")+(q.tolerance?(" (tolerance "+q.tolerance+")"):""));
            }else if(q.type==="scenario"){
                total += q.points||0;
                manualLines.push((i+1)+". "+q.prompt+" — Model answer: "+q.modelAnswer);
            }
        });
        var answerKey = lines.join("\n");
        if(manualLines.length) answerKey += "\n\nShort-answer/scenario items (use judgment, not exact-match scoring):\n"+manualLines.join("\n");
        return {
            pointsPossible: total,
            answerKey: answerKey,
            aiNotes: "Auto-generated from this Knowledge Assignment's answer key. Multiple choice, true/false, matching, ordering, fill-in-the-blank, labeling, and calculation items have exact correct answers above and can be scored with confidence. Short-answer and scenario items need your judgment — use the model answers only as a reference point."
        };
    }

    // Generic-schema counterpart to formatKnowledgeCriteria — used by every
    // assignment type EXCEPT Knowledge Assignment. For these types the
    // AI-generated PDF schema already IS the answer key: fields with a
    // correctAnswer are confidently scoreable, fields with only a
    // rubricNote (e.g. Workplace Scenario, Creative) need judgment, not
    // exact-match grading. Shares field naming with pdfSchemaFieldList so
    // criteria text and an extracted submission's field values always
    // refer to the same fields the same way.
    function formatAssignmentCriteria(schema){
        var fields = pdfSchemaFieldList(schema);
        var total = 0;
        var answerLines = [];
        var judgmentLines = [];
        var seenTableNote = {};
        fields.forEach(function(f){
            if(f.points) total += f.points;
            // Table cells all inherit the same field-level correctAnswer/
            // rubricNote, so repeating it once per cell just adds noise —
            // collapse to one summary line per table instead.
            var tableMatch = /^(field_\d+)_r\d+_c\d+$/.exec(f.name);
            if(tableMatch){
                var key = tableMatch[1]+"|"+(f.correctAnswer||"")+"|"+(f.rubricNote||"");
                if(seenTableNote[key]) return;
                seenTableNote[key] = true;
                var tableLabel = (f.label||"").split(" — ")[0];
                if(f.correctAnswer){ answerLines.push(tableLabel+" (table) — Correct: "+f.correctAnswer); }
                else if(f.rubricNote){ judgmentLines.push(tableLabel+" (table) — "+f.rubricNote); }
                return;
            }
            if(f.correctAnswer){
                answerLines.push(f.label+" — Correct: "+f.correctAnswer);
            }else if(f.rubricNote){
                judgmentLines.push(f.label+" — "+f.rubricNote);
            }
        });
        var answerKey = answerLines.join("\n");
        if(judgmentLines.length){
            if(answerKey) answerKey += "\n\n";
            answerKey += "Items needing your judgment (no exact-match target):\n"+judgmentLines.join("\n");
        }
        return {
            pointsPossible: total,
            answerKey: answerKey,
            aiNotes: "Auto-generated from this assignment's question schema. Fields with a stated correct answer can be scored with confidence; items marked for judgment need your review — use any notes only as a reference point.",
            answerFields: fields
        };
    }

    // ════════════════════════════════════════════════════════════════
    // PDF ASSIGNMENT ENGINE
    // Turns a generic {title, instructions, sections:[...]} schema into a
    // real fillable PDF via pdf-lib. Static content (headings, paragraphs,
    // lists) is drawn as plain non-editable text/graphics; only the items
    // listed in a section's `fields` become actual AcroForm fields — so
    // "locked instructions, editable answers" falls straight out of which
    // draw calls are used, no special lock flag needed. Shared by every
    // assignment-group item type: Practice Packet routes its existing
    // answer-key JSON through knowledgeAnswerKeyToPdfSchema() first; other
    // types build this schema directly via buildAssignmentPdfPrompt().
    // pdf-lib has no auto-flow, so pagination is computed by hand via the
    // cursor helpers below.
    // ════════════════════════════════════════════════════════════════

    var PDF_PAGE_W = 612, PDF_PAGE_H = 792; // US Letter, in points
    var PDF_MARGIN = 54;
    var PDF_CONTENT_W = PDF_PAGE_W - PDF_MARGIN*2;
    var PDF_FIELD_LINE_H = 18;

    function hexToRgb01(hex){
        var h = (hex||"#1e3a5f").replace("#","");
        if(h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
        return PDFLib.rgb((r||0)/255, (g||0)/255, (b||0)/255);
    }

    // Wraps text to fit maxWidth using the font's real glyph widths —
    // required since pdf-lib draws single lines only, no auto-wrap.
    function pdfWrapText(font, text, size, maxWidth){
        var words = String(text||"").split(/\s+/).filter(Boolean);
        var lines = [], cur = "";
        words.forEach(function(w){
            var trial = cur ? (cur+" "+w) : w;
            if(font.widthOfTextAtSize(trial, size) > maxWidth && cur){ lines.push(cur); cur = w; }
            else{ cur = trial; }
        });
        if(cur) lines.push(cur);
        return lines.length ? lines : [""];
    }

    function pdfNewCursor(pdfDoc, font, fontBold){
        return { pdfDoc: pdfDoc, font: font, fontBold: fontBold,
            page: pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]), y: PDF_PAGE_H - PDF_MARGIN };
    }

    function pdfEnsureRoom(cursor, height){
        if(cursor.y - height < PDF_MARGIN){
            cursor.page = cursor.pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
            cursor.y = PDF_PAGE_H - PDF_MARGIN;
        }
    }

    function pdfDrawParagraph(cursor, text, opts){
        opts = opts || {};
        var size = opts.size || 11;
        var font = opts.bold ? cursor.fontBold : cursor.font;
        var color = opts.color || PDFLib.rgb(0.07,0.09,0.15);
        var lineHeight = size * 1.4;
        pdfWrapText(font, text, size, PDF_CONTENT_W).forEach(function(line){
            pdfEnsureRoom(cursor, lineHeight);
            cursor.page.drawText(line, { x: PDF_MARGIN, y: cursor.y-size, size: size, font: font, color: color });
            cursor.y -= lineHeight;
        });
    }

    function pdfDrawList(cursor, items){
        var size = 11, font = cursor.font, lineHeight = size * 1.4;
        (items||[]).forEach(function(item){
            pdfWrapText(font, item, size, PDF_CONTENT_W - 16).forEach(function(line, li){
                pdfEnsureRoom(cursor, lineHeight);
                cursor.page.drawText((li===0?"•  ":"    ")+line, { x: PDF_MARGIN, y: cursor.y-size, size: size, font: font, color: PDFLib.rgb(0.07,0.09,0.15) });
                cursor.y -= lineHeight;
            });
        });
    }

    // Draws one field's label plus its actual fillable AcroForm object.
    // `seq` gives every field a unique, stable name within the document.
    function pdfDrawField(cursor, form, field, seq){
        var labelLines = pdfWrapText(cursor.font, field.label||"", 10.5, PDF_CONTENT_W);
        pdfEnsureRoom(cursor, labelLines.length*13 + PDF_FIELD_LINE_H + 10);
        labelLines.forEach(function(line){
            cursor.page.drawText(line, { x: PDF_MARGIN, y: cursor.y-10, size: 10.5, font: cursor.fontBold, color: PDFLib.rgb(0.2,0.25,0.35) });
            cursor.y -= 13;
        });
        cursor.y -= 4;

        var name = "field_"+seq;
        if(field.type === "checkbox"){
            form.createCheckBox(name).addToPage(cursor.page, { x: PDF_MARGIN, y: cursor.y-14, width: 14, height: 14, borderWidth: 1, borderColor: PDFLib.rgb(0.6,0.65,0.7) });
            cursor.y -= PDF_FIELD_LINE_H;
        } else if(field.type === "table"){
            var cols = field.columns || ["Column 1","Column 2"];
            var rows = field.rows || 3;
            var colW = PDF_CONTENT_W/cols.length;
            cols.forEach(function(colName, ci){
                cursor.page.drawText(colName, { x: PDF_MARGIN+ci*colW+4, y: cursor.y-10, size: 9, font: cursor.fontBold, color: PDFLib.rgb(0.2,0.25,0.35) });
            });
            cursor.y -= 16;
            for(var r=0; r<rows; r++){
                pdfEnsureRoom(cursor, PDF_FIELD_LINE_H+4);
                cursor.page.drawRectangle({ x: PDF_MARGIN, y: cursor.y-16, width: PDF_CONTENT_W, height: 16, borderWidth: 0.75, borderColor: PDFLib.rgb(0.75,0.78,0.82) });
                cols.forEach(function(colName, ci){
                    var cellField = form.createTextField(name+"_r"+r+"_c"+ci);
                    cellField.addToPage(cursor.page, { x: PDF_MARGIN+ci*colW+2, y: cursor.y-15, width: colW-4, height: 14, borderWidth: 0 });
                    cellField.setFontSize(9);
                    if(ci>0) cursor.page.drawLine({ start:{x:PDF_MARGIN+ci*colW,y:cursor.y-16}, end:{x:PDF_MARGIN+ci*colW,y:cursor.y}, thickness:0.75, color: PDFLib.rgb(0.75,0.78,0.82) });
                });
                cursor.y -= 16;
            }
        } else {
            var multiline = field.type === "long";
            var lines = Math.max(1, Math.min(multiline?10:1, field.lines || (multiline?4:1)));
            var boxH = lines * PDF_FIELD_LINE_H;
            pdfEnsureRoom(cursor, boxH);
            var tf = form.createTextField(name);
            if(multiline) tf.enableMultiline();
            tf.addToPage(cursor.page, { x: PDF_MARGIN, y: cursor.y-boxH, width: PDF_CONTENT_W, height: boxH, borderWidth: 1, borderColor: PDFLib.rgb(0.75,0.78,0.82) });
            tf.setFontSize(11);
            cursor.y -= boxH;
        }
        cursor.y -= 10;
    }

    function base64ToUint8(base64){
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for(var i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function uint8ToBase64(bytes){
        var binary = "";
        for(var i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    // Downloads an Unsplash search result's photo as real bytes (unlike
    // unsplashSearch, which only returns a URL for an <img src>) — used as
    // the AI-search fallback when a teacher doesn't upload their own
    // reference image. Sniffs the format from Content-Type, falling back
    // to magic-byte detection if the header is missing/ambiguous.
    async function fetchImageBytes(url){
        var resp = await fetch(url);
        if(!resp.ok) throw new Error("Could not download image (HTTP "+resp.status+")");
        var bytes = new Uint8Array(await resp.arrayBuffer());
        var ct = resp.headers.get("content-type")||"";
        var type = ct.indexOf("png")!==-1 ? "png" : (ct.indexOf("jpeg")!==-1||ct.indexOf("jpg")!==-1) ? "jpg" : null;
        if(!type){
            type = (bytes[0]===0x89 && bytes[1]===0x50) ? "png" : "jpg";
        }
        return { bytes: bytes, type: type };
    }

    // Draws an already-embedded pdf-lib image (from pdfDoc.embedPng/embedJpg),
    // scaled to fit the content width and capped at a max height so a very
    // tall/narrow image can't blow out the page — called wherever a
    // section flags useReferenceImage:true.
    function pdfDrawImage(cursor, img){
        var drawW = PDF_CONTENT_W;
        var drawH = img.height * (PDF_CONTENT_W / img.width);
        var maxH = 420;
        if(drawH > maxH){ drawH = maxH; drawW = img.width * (maxH / img.height); }
        pdfEnsureRoom(cursor, drawH + 10);
        var x = PDF_MARGIN + (PDF_CONTENT_W - drawW)/2;
        cursor.page.drawImage(img, { x: x, y: cursor.y - drawH, width: drawW, height: drawH });
        cursor.y -= (drawH + 10);
    }

    function pdfResolveTheme(itemData){
        var tk = itemData.pageStyle || "custom";
        if(tk === "custom"){
            var c = itemData.customColor || "#1e3a5f";
            return Object.assign({}, PAGE_THEMES.custom, { primary: c, secondary: c, headerBg: c, accent: c });
        }
        return PAGE_THEMES[tk] || PAGE_THEMES.custom;
    }

    // The one shared renderer every assignment-group PDF goes through.
    // Returns raw PDF bytes (Uint8Array) — never held in app state, only
    // regenerated on demand at preview/insert time from the JSON schema.
    async function renderAssignmentPdf(schema, itemData){
        var pdfDoc = await PDFLib.PDFDocument.create();
        var form = pdfDoc.getForm();
        var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        var fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        var theme = pdfResolveTheme(itemData);
        var primaryRgb = hexToRgb01(theme.primary);
        var bannerTextColor = isDarkColor(theme.primary) ? PDFLib.rgb(1,1,1) : PDFLib.rgb(0.07,0.09,0.15);

        // Resolve the reference image (if any) ONCE, up front — never
        // re-embed the same bytes per section, even if multiple sections
        // somehow flagged useReferenceImage.
        var refImg = null;
        if(itemData.referenceImageData){
            var refBytes = base64ToUint8(itemData.referenceImageData);
            refImg = itemData.referenceImageType === "png" ? await pdfDoc.embedPng(refBytes) : await pdfDoc.embedJpg(refBytes);
        }

        var cursor = pdfNewCursor(pdfDoc, font, fontBold);
        cursor.page.drawRectangle({ x: 0, y: cursor.y-46, width: PDF_PAGE_W, height: 70, color: primaryRgb });
        cursor.page.drawText(schema.title || "Assignment", { x: PDF_MARGIN, y: cursor.y-18, size: 20, font: fontBold, color: bannerTextColor });
        cursor.y -= 60;
        if(schema.instructions){
            pdfDrawParagraph(cursor, schema.instructions, { color: PDFLib.rgb(0.25,0.28,0.32) });
            cursor.y -= 6;
        }

        var seq = 0;
        (schema.sections||[]).forEach(function(section){
            pdfEnsureRoom(cursor, 30);
            cursor.page.drawText(section.heading||"", { x: PDF_MARGIN, y: cursor.y-14, size: 14, font: fontBold, color: primaryRgb });
            cursor.y -= 26;
            if(section.staticText){
                (Array.isArray(section.staticText) ? section.staticText : [section.staticText]).forEach(function(t){
                    pdfDrawParagraph(cursor, t);
                    cursor.y -= 4;
                });
            }
            if(section.staticList && section.staticList.length){
                pdfDrawList(cursor, section.staticList);
                cursor.y -= 4;
            }
            if(section.useReferenceImage && refImg){
                pdfDrawImage(cursor, refImg);
            }
            (section.fields||[]).forEach(function(f){ seq++; pdfDrawField(cursor, form, f, seq); });
            cursor.y -= 8;
        });

        return pdfDoc.save();
    }

    // Reproduces renderAssignmentPdf's exact field-naming order (including
    // the per-cell field_N_rR_cC expansion for table fields) WITHOUT
    // actually rendering anything — this is the single source of truth for
    // "what does field_7 mean", used both to build AI Grader criteria text
    // and (in SpeedGrader) to turn extracted raw field values back into
    // readable "label: answer" lines. If this ever drifts out of sync with
    // pdfDrawField's own seq/name logic, field correlation breaks silently,
    // so keep the two in lockstep on any future change to either.
    function pdfSchemaFieldList(schema){
        var list = [];
        var seq = 0;
        (schema.sections||[]).forEach(function(section){
            (section.fields||[]).forEach(function(f){
                seq++;
                var name = "field_"+seq;
                if(f.type === "table"){
                    var cols = f.columns || ["Column 1","Column 2"];
                    var rows = f.rows || 3;
                    for(var r=0; r<rows; r++){
                        cols.forEach(function(colName, ci){
                            list.push({ name: name+"_r"+r+"_c"+ci, label: (f.label||"")+" — "+colName+" (row "+(r+1)+")", correctAnswer: f.correctAnswer, rubricNote: f.rubricNote, points: f.points });
                        });
                    }
                } else {
                    list.push({ name: name, label: f.label||"", correctAnswer: f.correctAnswer, rubricNote: f.rubricNote, points: f.points });
                }
            });
        });
        return list;
    }

    // Short, colorful assignment description that replaces the old full-
    // content HTML for PDF-based assignment types: a "download, fill it
    // out, save, submit" banner plus the download link. The hidden AI
    // Grader criteria marker (cmbEmbedCriteriaMarker) gets appended to
    // whatever this returns, exactly as it did to the old full-content
    // HTML — this function doesn't know or care about that, so nothing
    // about the criteria-follows-assignment mechanism changes.
    function renderAssignmentPdfDescription(fileId, courseId, itemData){
        var theme = pdfResolveTheme(itemData);
        var downloadUrl = "/courses/"+courseId+"/files/"+fileId+"/download?download_frd=1";
        var h = '<div style="background:linear-gradient(135deg,'+theme.primary+','+(theme.accent||theme.primary)+');border-radius:12px;padding:24px 28px;margin-bottom:18px;font-family:Arial,sans-serif;color:#fff;">';
        h += '<div style="font-size:20px;font-weight:700;margin-bottom:10px;">📄 Your Assignment is a Fillable PDF</div>';
        h += '<ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;">';
        h += '<li><strong>Download</strong> the PDF below.</li>';
        h += '<li><strong>Fill it out</strong> — type directly into the boxes (opens automatically in Chrome\'s built-in PDF viewer).</li>';
        h += '<li><strong>Save</strong> your filled-in copy (Ctrl+S / the download icon in the PDF viewer).</li>';
        h += '<li><strong>Submit</strong> the saved PDF here using the file upload below.</li>';
        h += '</ol></div>';
        h += '<p style="text-align:center;margin:18px 0;">';
        h += '<a href="'+downloadUrl+'" target="_blank" rel="noopener" style="display:inline-block;background:'+theme.primary+';color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">📥 Download Your Assignment (PDF)</a>';
        h += '</p>';
        return h;
    }

    // Converts Practice Packet's existing (unchanged) answer-key JSON into
    // the shared PDF schema — a pure-JS adapter, no AI call, no changes to
    // buildKnowledgeAnswerKeyPrompt or formatKnowledgeCriteria.
    function knowledgeAnswerKeyToPdfSchema(parsed, itemData){
        var sections = [];
        (parsed.questions||[]).forEach(function(q, i){
            var n = i+1;
            if(q.type==="mc"){
                var choiceLines = (q.choices||[]).map(function(c){ return c.label+". "+c.text; });
                sections.push({ heading: n+". Multiple Choice", staticText: q.prompt||"", staticList: choiceLines,
                    fields: [{ type:"short", label:"Your answer (A/B/C/D)" }] });
            } else if(q.type==="tf"){
                sections.push({ heading: n+". True / False", staticText: q.prompt||"",
                    fields: [{ type:"short", label:"Write True or False" }] });
            } else if(q.type==="matching"){
                var terms = q.terms||[];
                var defs = shuffleArray((q.definitions||[]).map(function(d,di){ return String.fromCharCode(65+di)+". "+d; }));
                sections.push({ heading: n+". Matching", staticText: "Match each term to its definition.",
                    staticList: terms.map(function(t,ti){ return (ti+1)+". "+t; }).concat(defs),
                    fields: terms.map(function(t,ti){ return { type:"short", label:"Term "+(ti+1)+" ("+t+") — matching letter" }; }) });
            } else if(q.type==="ordering"){
                var shuffled = shuffleArray((q.steps||[]).map(function(s,si){ return String.fromCharCode(65+si)+". "+s; }));
                sections.push({ heading: n+". Ordering", staticText: q.prompt||"Put these steps in the correct order.", staticList: shuffled,
                    fields: [{ type:"short", label:"Correct order (e.g. C, A, D, B)" }] });
            } else if(q.type==="short"){
                sections.push({ heading: n+". Short Answer", staticText: q.prompt||"",
                    fields: [{ type:"long", label:"Your answer", lines:4 }] });
            } else if(q.type==="fillblank"){
                var blanks = q.blanks||[];
                sections.push({ heading: n+". Fill in the Blank", staticText: q.prompt||"",
                    fields: blanks.map(function(b,bi){ return { type:"short", label:"Blank "+(bi+1) }; }) });
            } else if(q.type==="labeling"){
                var labels = q.labels||[];
                sections.push({ heading: n+". Label the Diagram", staticText: q.prompt||"Identify each marked part of the diagram below.",
                    useReferenceImage: true,
                    fields: labels.map(function(l){ return { type:"short", label:"Label "+(l.marker||"?") }; }) });
            } else if(q.type==="calculation"){
                sections.push({ heading: n+". Calculation", staticText: q.prompt||"",
                    fields: [
                        { type:"long", label:"Show your work", lines:3 },
                        { type:"short", label:"Final answer"+(q.unit?" ("+q.unit+")":"") }
                    ] });
            } else if(q.type==="scenario"){
                sections.push({ heading: n+". Scenario", staticText: q.prompt||"",
                    fields: [{ type:"long", label:"Your response", lines:5 }] });
            }
        });
        return {
            title: parsed.title || itemData.quizTitle || "Practice Packet",
            instructions: "Answer every item below by filling in the boxes, then save this PDF and submit it.",
            sections: sections
        };
    }

    // ════════════════════════════════════════════════════════════════
    // ENGINE 2: GENERIC PDF ASSIGNMENT PROMPT
    // Every assignment-group type except Knowledge Assignment (which keeps
    // its own typed-question engine above) generates the shared PDF schema
    // DIRECTLY — the JSON Claude returns already IS both the student-facing
    // document AND the answer key (via correctAnswer/rubricNote per field),
    // no separate adapter step needed. One shared prompt builder with
    // per-type guidance text, reusing the exact same JSON-only discipline
    // and defensive parsing already proven on Practice Packet.
    // ════════════════════════════════════════════════════════════════

    const ASSIGNMENT_TYPE_GUIDANCE = {
        research: "This is a Research Assignment: students investigate information beyond the course materials using reliable sources (e.g. OSHA standards, building codes, manufacturers, new technologies, materials, careers, equipment, industry best practices). Include a section for the research question/topic, a source-tracking section (a \"table\" field is ideal — columns like Source, Type, Key Finding), and a findings-summary section (\"long\" fields). Most fields should carry a rubricNote (there's rarely one exact correct answer to research), but if the assignment asks students to look up a specific fact (a code number, a spec value), give that field a correctAnswer instead.",
        creative: "This is a Creative Assignment: students demonstrate understanding by identifying, documenting, explaining, or comparing REAL examples they find in homes, businesses, construction sites, or everyday environments (photos, videos, sketches, models — produced OUTSIDE this PDF and attached separately as additional files alongside this completed form, so do not ask the student to embed media in the form itself). This PDF should be a completion/reflection form: a checklist of what to document, and \"short\"/\"long\" fields asking the student to describe what they found and explain how it connects to course concepts. Use rubricNote on nearly every field — this type is judged qualitatively, not answer-key graded.",
        labproject: "This is a Lab Project: students physically perform a trade-related skill using proper tools, equipment, materials, and safety procedures, then submit photographs, videos, measurements, or instructor verification as evidence (attached separately, not embedded in this PDF). Include a Safety/PPE section (checkbox fields, each with a correctAnswer of \"checked\" for required items), a Tools & Materials staticList, a numbered Procedure (staticText, no fields needed unless verifying a step was completed — use checkbox), an Observations/Measurements section (a \"table\" field works well, correctAnswer per expected reading if known), and a Reflection section (\"long\" fields with rubricNote).",
        troubleshooting: "This is a Troubleshooting Assignment: students are given a specific equipment failure, construction defect, installation error, or workplace problem (describe a concrete, realistic scenario in staticText) and must analyze symptoms, identify possible causes, determine the most likely solution, and explain their reasoning. Include a \"short\" field for the most likely root cause (correctAnswer, since a scenario you write has a definite intended answer) and \"long\" fields for symptom analysis and reasoning (rubricNote, since a student can reach the right conclusion via different valid reasoning paths).",
        inspection: "This is an Inspection Assignment: students evaluate equipment, materials, structures, tools, or work areas against stated standards, codes, specifications, or safety regulations, identify deficiencies, document observations, determine compliance, and recommend corrective actions. Favor checkbox/table fields for compliance checks (correctAnswer where the standard gives an objective pass/fail), and \"long\" fields for documented deficiencies and recommended corrective actions (rubricNote, since wording varies but the substance should match).",
        blueprint: "This is a Blueprint/Diagram Assignment: students read, interpret, and apply a technical drawing, blueprint, schematic, wiring diagram, piping layout, exploded view, or construction plan. THE ACTUAL DIAGRAM IS PROVIDED SEPARATELY and will be inserted into this PDF automatically wherever a section sets \"useReferenceImage\":true — set that flag on the ONE section where students should look at the diagram to answer questions (do not describe or attempt to draw the diagram yourself in staticText). Ask students to identify components, determine dimensions, follow symbols, or trace systems shown in that image — these have definite correct answers, so give most fields a correctAnswer.",
        demonstration: "This is a Demonstration Assignment: students explain and demonstrate a specific skill or procedure via a recorded video, live presentation, or narrated slideshow (produced and attached separately, not embedded in this PDF). This PDF should be a companion reflection form: \"long\" fields asking the student to explain WHY each step is performed and how it contributes to safe/effective job performance (rubricNote — this is about understanding, not a single correct wording), plus a self-checklist (checkbox) confirming each required step was demonstrated.",
        estimating: "This is an Estimating/Job Planning Assignment: students calculate material quantities, estimate labor, determine equipment needs, prepare cost estimates, develop schedules, or create work plans for a described job. Favor \"table\" fields for material/quantity/cost breakdowns and \"short\" fields for specific calculated totals — give these a correctAnswer (these are numeric calculations with a right answer given the job description you provide). Use \"long\" fields with rubricNote only for open-ended planning narrative (e.g. \"describe your project schedule\").",
        scenario: "This is a Workplace Scenario Assignment: students are given a realistic job-site situation (describe it concretely in staticText — a customer interaction, safety concern, equipment failure, ethical situation, scheduling conflict, etc.) requiring professional judgment, and must evaluate information, prioritize actions, consider safety, and justify their decision. These almost always have MULTIPLE reasonable solutions, not one correct answer — use \"long\" fields with rubricNote describing what a strong response should demonstrate (e.g. \"should prioritize safety, communicate clearly with the customer, and justify the choice\"), not a correctAnswer."
    };

    function buildAssignmentPdfPrompt(itemData, itemType){
        var guidance = ASSIGNMENT_TYPE_GUIDANCE[itemType] || "";
        var p = "You are writing a real Canvas LMS trade-school assignment as a fillable PDF form. Generate a STRUCTURED SCHEMA as JSON — do NOT write any HTML or page layout, a separate renderer builds the actual PDF from your JSON.\n\n";
        p += guidance + "\n\n";
        if(itemData.pointValue) p += "Total points for this assignment: "+itemData.pointValue+" — distribute this across fields via each field's \"points\" (optional, only where scoring by field makes sense).\n\n";
        p += "Return ONLY valid JSON in this exact shape, no markdown, no explanation outside the JSON:\n";
        p += '{\n';
        p += '  "title": "Short assignment title",\n';
        p += '  "instructions": "1-3 sentence student-facing instructions for the whole assignment",\n';
        p += '  "sections": [\n';
        p += '    {\n';
        p += '      "heading": "Section title",\n';
        p += '      "staticText": "Locked instructional/scenario text (string, or array of strings for multiple paragraphs) — students cannot edit this",\n';
        p += '      "staticList": ["Optional locked bullet list item", "..."],\n';
        p += '      "useReferenceImage": false,\n';
        p += '      "fields": [\n';
        p += '        {"type":"short","label":"...","correctAnswer":"...","points":5},\n';
        p += '        {"type":"long","label":"...","lines":4,"rubricNote":"what a strong answer should cover","points":5},\n';
        p += '        {"type":"checkbox","label":"...","correctAnswer":"checked"},\n';
        p += '        {"type":"table","label":"...","columns":["Col A","Col B"],"rows":3,"correctAnswer":"..."}\n';
        p += '      ]\n';
        p += '    }\n';
        p += '  ]\n';
        p += '}\n\n';
        p += "RULES:\n";
        p += "- Fields must use ONLY these 4 types: \"short\" (one line), \"long\" (multi-line, set \"lines\"), \"checkbox\", \"table\" (set \"columns\" and \"rows\"). No other field type exists.\n";
        p += "- Every field that has one definite correct answer should carry \"correctAnswer\" (a plain string describing it). Every field that needs a teacher's/AI's judgment instead should carry \"rubricNote\" (what a strong answer should demonstrate) — not both.\n";
        p += "- \"staticText\"/\"staticList\" are locked, non-editable content — put all instructions, scenario descriptions, and reference information there, never in a field's label alone.\n";
        p += "- Set \"useReferenceImage\":true on at most one section, only if this assignment type genuinely needs a reference image (e.g. Blueprint/Diagram) and only where that image should visually appear.\n";
        p += "- 3-6 sections total is typical. Do not pad with filler sections.\n";
        p += "- Base everything on the source material below — do not invent unrelated content.\n";
        p += "- Valid JSON only, no trailing commas.\n\n";
        p += "SOURCE MATERIAL:\n";
        if(itemData.textContent && itemData.textContent.trim()) p += itemData.textContent+"\n\n";
        if(itemData.uploadedFile) p += "FILE ("+itemData.uploadedName+"):\n"+itemData.uploadedFile+"\n\n";
        p += getModuleSourceContext();
        return p;
    }

    var ASSIGNMENT_SCHEMA_FIELD_TYPES = ["short","long","checkbox","table"];

    // Defends against a malformed Engine 2 response — the model must only
    // ever use the 4 supported field types, but nothing stops it from
    // inventing one. Any field with an unrecognized type is dropped before
    // it ever reaches renderAssignmentPdf, rather than failing later at
    // render time or silently producing a broken/unfillable field.
    function sanitizeAssignmentSchema(schema){
        schema = schema || {};
        var sections = Array.isArray(schema.sections) ? schema.sections : [];
        var cleanSections = sections.map(function(section){
            var fields = Array.isArray(section.fields) ? section.fields : [];
            var cleanFields = fields.filter(function(f){
                return f && ASSIGNMENT_SCHEMA_FIELD_TYPES.indexOf(f.type) !== -1;
            }).map(function(f){
                var out = { type: f.type, label: f.label || "" };
                if(f.type === "long") out.lines = Math.max(1, Math.min(10, parseInt(f.lines,10) || 4));
                if(f.type === "table"){
                    out.columns = Array.isArray(f.columns) && f.columns.length ? f.columns : ["Column 1","Column 2"];
                    out.rows = Math.max(1, Math.min(10, parseInt(f.rows,10) || 3));
                }
                if(f.correctAnswer) out.correctAnswer = String(f.correctAnswer);
                if(f.rubricNote) out.rubricNote = String(f.rubricNote);
                if(f.points) out.points = parseFloat(f.points) || undefined;
                return out;
            });
            return {
                heading: section.heading || "",
                staticText: section.staticText,
                staticList: Array.isArray(section.staticList) ? section.staticList : undefined,
                useReferenceImage: !!section.useReferenceImage,
                fields: cleanFields
            };
        });
        return { title: schema.title || "Assignment", instructions: schema.instructions || "", sections: cleanSections };
    }

    // ========== ACTIVITY PROMPT ==========

    // Shared single-card template for the "scenario, then one click reveals
    // the answer" activities (What Would You Do?, Find the Error, Mystery
    // Machine, What Happens Next?, Beat the Expert, Common Mistake, Pro
    // Tip) — they all share one structure and only differ in labels/
    // framing, so this is the one place that HTML lives.
    function activitySingleRevealCard(pri, setupLabel, revealLabel){
        var h = '<details style="margin-bottom:14px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">\n';
        h += '  <summary style="list-style:none;cursor:pointer;background:#f8fafc;padding:18px 22px;">\n';
        h += '    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:'+pri+';margin-bottom:8px;">'+setupLabel+'</div>\n';
        h += '    <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1e293b;line-height:1.5;">[SETUP TEXT]</div>\n';
        h += '  </summary>\n';
        h += '  <div style="padding:18px 22px;border-top:1px solid #e5e7eb;background:#fff;">\n';
        h += '    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#166534;margin-bottom:8px;">'+revealLabel+'</div>\n';
        h += '    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#374151;">[REVEAL TEXT]</div>\n';
        h += '  </div>\n</details>\n';
        return h;
    }

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
            p += "Generate a self-check practice quiz for a Canvas LMS page using nested <details>/<summary> tags — NO <style> blocks or JavaScript (Canvas strips <style> tags on save, which would break this activity entirely). Each answer choice must be its OWN independently-clickable <details> so a student can click just one choice and see whether THAT choice is right or wrong, without the other choices or the correct answer being revealed first. Use the EXACT HTML structure below — only fill in content.\n\n";
            p += "Generate exactly " + count + " questions, each with 4 answer choices (1 correct, 3 plausible distractors).\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">Quick Check</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Click an answer choice to check it. No grade is recorded — this is practice only.</p>\n\n';
            p += "<!-- Generate " + count + " questions using this exact template. Each of the 4 choices is its own <details> — do NOT wrap the whole question in one outer <details>: -->\n";
            p += '<div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden;">\n';
            p += '  <div style="background:#f8fafc;padding:16px 20px;font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1e293b;border-bottom:1px solid #e5e7eb;">1. [QUESTION TEXT]</div>\n';
            p += '  <div style="padding:12px 20px;background:#fff;">\n';
            p += '    <details style="margin-bottom:6px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:8px 12px;border-radius:6px;background:#f9fafb;color:#374151;font-size:14px;">[CHOICE TEXT]</summary>\n';
            p += '      <div style="padding:8px 12px;margin-top:2px;border-radius:6px;background:#f0fdf4;color:#166534;font-weight:700;font-size:13px;">✓ Correct! [one-sentence explanation]</div>\n';
            p += '    </details>\n';
            p += '    <details style="margin-bottom:6px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:8px 12px;border-radius:6px;background:#f9fafb;color:#374151;font-size:14px;">[CHOICE TEXT]</summary>\n';
            p += '      <div style="padding:8px 12px;margin-top:2px;border-radius:6px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:13px;">✗ Not quite — the correct answer is [CORRECT CHOICE TEXT]. [one-sentence explanation]</div>\n';
            p += '    </details>\n';
            p += '    <!-- repeat the wrong-choice <details> pattern above for the other 2 wrong choices -->\n';
            p += '  </div>\n</div>\n\n';
            p += "CRITICAL RULES:\n- Generate exactly " + count + " questions in this exact order, numbered 1, 2, 3...\n- Each question has exactly 4 choices, each its own separate <details> (NOT nested inside each other) — 1 correct choice using the green ✓ feedback div, 3 wrong choices using the red ✗ feedback div that names the correct answer\n- Vary which position (1st, 2nd, 3rd, 4th) the correct choice appears in across questions\n- Do NOT wrap multiple choices or the whole question in a single outer <details> — each choice must expand independently\n- Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or any CSS class names — inline style attributes only\n- Return ONLY valid HTML, no markdown, every tag closed\n\n";

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
            p += "INLINE QUESTION BLOCK (use this exact structure — each answer choice is its OWN independently-clickable <details>, so a student can click just one choice and see whether THAT choice is right or wrong, without the other choices or the correct answer being revealed first. Do NOT wrap the whole question in one outer <details>):\n";
            p += '<div style="background:#f8fafc;border:2px solid ' + pri + ';border-radius:10px;padding:22px 26px;margin:32px 0;">\n';
            p += '  <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + pri + ';margin-bottom:12px;">✦ CHECK YOUR UNDERSTANDING</div>\n';
            p += '  <div style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#1e293b;margin-bottom:12px;">[QUESTION — directly tests the section just read]</div>\n';
            p += '  <details style="margin-bottom:6px;border-radius:6px;overflow:hidden;">\n';
            p += '    <summary style="list-style:none;cursor:pointer;padding:8px 12px;border-radius:6px;background:#fff;border:1px solid #e5e7eb;color:#374151;font-size:14px;">[CHOICE TEXT]</summary>\n';
            p += '    <div style="padding:8px 12px;margin-top:2px;border-radius:6px;background:#dcfce7;color:#166534;font-weight:700;font-size:13px;">✓ Correct! [one-sentence reinforcement of the concept]</div>\n';
            p += '  </details>\n';
            p += '  <details style="margin-bottom:6px;border-radius:6px;overflow:hidden;">\n';
            p += '    <summary style="list-style:none;cursor:pointer;padding:8px 12px;border-radius:6px;background:#fff;border:1px solid #e5e7eb;color:#374151;font-size:14px;">[CHOICE TEXT]</summary>\n';
            p += '    <div style="padding:8px 12px;margin-top:2px;border-radius:6px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:13px;">✗ Not quite — the correct answer is [CORRECT CHOICE TEXT].</div>\n';
            p += '  </details>\n';
            p += '  <!-- repeat the wrong-choice <details> pattern above for the other wrong choice -->\n';
            p += '</div>\n\n';
            p += "RULES: Generate exactly " + count + " question blocks embedded at natural content breaks. Each question tests the section immediately before it. Each question has exactly 3 choices, each its own separate <details> (NOT nested inside each other) — 1 correct choice using the green ✓ feedback div, 2 wrong choices using the red ✗ feedback div that names the correct answer. Vary which position the correct choice appears in across questions. Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or CSS class names — inline style attributes only. Return ONLY valid HTML, every tag closed.\n\n";

        } else if(itemType === "matching"){
            var letters = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"];
            p += "Generate a matching activity for Canvas LMS using nested <details>/<summary> tags — NO <style> blocks or JavaScript (Canvas strips <style> tags on save, which would break this activity entirely). Each candidate definition must be its OWN independently-clickable <details> so a student can click just one definition and see whether THAT ONE is the correct match, without the correct answer or the other options being revealed first.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;padding:36px 24px;">\n';
            p += '<div style="background:' + pri + ';padding:36px 40px;margin-bottom:32px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#fff;margin:0 0 8px;">Matching Activity</h2>\n';
            p += '<p style="font-family:Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.75);margin:0;">For each term, click a definition to check if it’s the right match.</p>\n';
            p += '</div>\n\n';
            p += "<!-- Generate " + count + " term blocks. For each: letter badge (A, B, C...), the term, then 4 candidate definitions (1 correct + 3 distractors borrowed from OTHER terms' definitions in this set), each its own separately-clickable <details>. Do NOT wrap the whole term block in one outer <details>: -->\n\n";
            p += '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px;background:#fff;">\n';
            p += '  <div style="background:#f8fafc;padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb;">\n';
            p += '    <span style="background:' + pri + ';color:#fff;font-family:Arial,sans-serif;font-size:12px;font-weight:700;padding:4px 11px;border-radius:4px;flex-shrink:0;">[A/B/C...]</span>\n';
            p += '    <span style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#1e293b;">[TERM]</span>\n';
            p += '  </div>\n';
            p += '  <div style="padding:12px 20px;">\n';
            p += '    <details style="margin-bottom:6px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:8px 12px;border-radius:6px;background:#f9fafb;color:#374151;font-size:13px;">[CANDIDATE DEFINITION]</summary>\n';
            p += '      <div style="padding:8px 12px;margin-top:2px;border-radius:6px;background:#f0fdf4;color:#166534;font-weight:700;font-size:13px;">✓ Correct match!</div>\n';
            p += '    </details>\n';
            p += '    <details style="margin-bottom:6px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:8px 12px;border-radius:6px;background:#f9fafb;color:#374151;font-size:13px;">[CANDIDATE DEFINITION — a distractor borrowed from another term]</summary>\n';
            p += '      <div style="padding:8px 12px;margin-top:2px;border-radius:6px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:13px;">✗ Not this one — that definition belongs to a different term.</div>\n';
            p += '    </details>\n';
            p += '    <!-- repeat the distractor <details> pattern above for the other 2 distractors -->\n';
            p += '  </div>\n</div>\n\n';
            p += "CRITICAL RULES:\n";
            p += "- Generate exactly " + count + " term blocks, lettered " + letters.slice(0, count).join(", ") + "\n";
            p += "- Each term has exactly 4 candidate definitions, each its own separate <details> (NOT nested inside each other) — 1 correct using the green ✓ feedback div, 3 distractors (borrowed from other terms' definitions in this same set) using the red ✗ feedback div\n";
            p += "- Vary which position (1st, 2nd, 3rd, 4th) the correct definition appears in across terms\n";
            p += "- Do NOT wrap multiple candidate definitions or the whole term block in a single outer <details> — each definition must expand independently\n";
            p += "- Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or CSS class names — inline style attributes only\n";
            p += "- Return ONLY valid HTML, no markdown, every tag closed\n\n";

        } else if(itemType === "whatwouldyoudo"){
            p += "Generate a 'What Would You Do?' decision-making activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " realistic workplace situations from the source material, each requiring a decision.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🎭 What Would You Do?</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Read the situation, decide what you\'d do, then click to see the recommended response.</p>\n\n';
            p += "<!-- Generate " + count + " situations using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "THE SITUATION", "RECOMMENDED RESPONSE");
            p += "\nRULES: Generate exactly " + count + " situations. [SETUP TEXT] is a specific, realistic on-the-job scenario requiring a decision — end it with a question like \"What would you do?\". [REVEAL TEXT] gives the recommended response AND briefly explains why it's better than the other reasonable options a technician might consider. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "finderror"){
            p += "Generate a 'Find the Error' activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " items, each containing one intentional mistake, from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🔍 Find the Error</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Look for the mistake before revealing what it is and how to fix it.</p>\n\n';
            p += "<!-- Generate " + count + " items using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "SPOT THE MISTAKE", "WHAT'S WRONG");
            p += "\nRULES: Generate exactly " + count + " items. [SETUP TEXT] is a statement, procedure, calculation, or workplace scenario containing exactly ONE intentional mistake, written so it reads as fully correct at first glance — do not telegraph the error. [REVEAL TEXT] identifies the specific error, explains why it's incorrect, and gives the corrected version. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "mysterymachine"){
            p += "Generate a 'Mystery Machine' diagnostic activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " equipment-problem mysteries from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🧩 Mystery Machine</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Use the clues to diagnose the problem before revealing the solution.</p>\n\n';
            p += "<!-- Generate " + count + " mysteries using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "THE SYMPTOMS", "DIAGNOSIS");
            p += "\nRULES: Generate exactly " + count + " mysteries. [SETUP TEXT] lists equipment symptoms, operating conditions, or clues describing a machine problem. [REVEAL TEXT] gives the most likely cause and explains the diagnostic reasoning step by step, like an experienced technician thinking it through. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "decisionpoint"){
            p += "Generate a 'Decision Point' activity for Canvas LMS using nested <details>/<summary> tags — NO <style> blocks or JavaScript. Each possible action must be its OWN independently-clickable <details> so a student can click just one option and see its outcome, without the other options being revealed first.\n\n";
            p += "Generate exactly " + count + " workplace decision points, each with exactly 3 possible actions to choose from.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🚦 Decision Point</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">You\'ve reached a critical decision. Click an action to see what happens.</p>\n\n';
            p += "<!-- Generate " + count + " decision points using this exact template. Each action is its own <details> — do NOT wrap the whole scenario in one outer <details>: -->\n";
            p += '<div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;overflow:hidden;">\n';
            p += '  <div style="background:#f8fafc;padding:18px 22px;border-bottom:1px solid #e5e7eb;">\n';
            p += '    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + pri + ';margin-bottom:8px;">DECISION POINT</div>\n';
            p += '    <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1e293b;">[SCENARIO — a critical moment requiring a choice]</div>\n';
            p += '  </div>\n';
            p += '  <div style="padding:14px 20px;background:#fff;">\n';
            p += '    <details style="margin-bottom:8px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:10px 14px;border-radius:6px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:14px;font-weight:600;">[BEST ACTION]</summary>\n';
            p += '      <div style="padding:10px 14px;margin-top:2px;border-radius:6px;background:#f0fdf4;color:#166534;font-size:13px;">✓ [OUTCOME — the good result of this choice, and why it was the right call]</div>\n';
            p += '    </details>\n';
            p += '    <details style="margin-bottom:8px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:10px 14px;border-radius:6px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;font-size:14px;">[RISKIER ACTION]</summary>\n';
            p += '      <div style="padding:10px 14px;margin-top:2px;border-radius:6px;background:#fef9c3;color:#854d0e;font-size:13px;">⚠ [OUTCOME — a less ideal result, explaining the tradeoff or risk]</div>\n';
            p += '    </details>\n';
            p += '    <details style="border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:10px 14px;border-radius:6px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;font-size:14px;">[POOR ACTION]</summary>\n';
            p += '      <div style="padding:10px 14px;margin-top:2px;border-radius:6px;background:#fef2f2;color:#991b1b;font-size:13px;">✗ [OUTCOME — the negative consequence of this choice, and what should happen instead]</div>\n';
            p += '    </details>\n';
            p += '  </div>\n</div>\n\n';
            p += "CRITICAL RULES:\n- Generate exactly " + count + " decision points in this exact order\n- Each has exactly 3 possible actions, each its own separate <details> (NOT nested) — 1 best choice (green), 1 riskier/imperfect choice (yellow), 1 poor choice (red)\n- Vary which position the best action appears in across decision points\n- Do NOT wrap the actions or whole scenario in one outer <details> — each action must expand independently\n- Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or CSS class names — inline style attributes only\n- Return ONLY valid HTML, no markdown, every tag closed\n\n";

        } else if(itemType === "spothazard"){
            p += "Generate a 'Spot the Hazard' safety activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript. Each area/element to check must be its OWN independently-clickable <details>.\n\n";
            p += "Generate exactly " + count + " workplace scenes to inspect, each described in text with 4-5 specific areas/elements a student can check for hazards.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🕵️ Spot the Hazard</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Read the scene, then click each area to check it for hazards.</p>\n\n';
            p += "<!-- Generate " + count + " scenes using this exact template. Each area is its own <details>: -->\n";
            p += '<div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;overflow:hidden;">\n';
            p += '  <div style="background:#f8fafc;padding:18px 22px;border-bottom:1px solid #e5e7eb;">\n';
            p += '    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + pri + ';margin-bottom:8px;">THE SCENE</div>\n';
            p += '    <div style="font-family:Georgia,serif;font-size:15px;color:#1e293b;line-height:1.6;">[DESCRIPTION of the workplace scene/setup — describe what a student would see]</div>\n';
            p += '  </div>\n';
            p += '  <div style="padding:14px 20px;background:#fff;">\n';
            p += '    <details style="margin-bottom:8px;border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:10px 14px;border-radius:6px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;font-size:14px;">[SPECIFIC AREA/ELEMENT TO CHECK]</summary>\n';
            p += '      <div style="padding:10px 14px;margin-top:2px;border-radius:6px;background:#fef2f2;color:#991b1b;font-size:13px;font-weight:600;">⚠ HAZARD — [explanation of what is unsafe and why it creates a risk]</div>\n';
            p += '    </details>\n';
            p += '    <details style="border-radius:6px;overflow:hidden;">\n';
            p += '      <summary style="list-style:none;cursor:pointer;padding:10px 14px;border-radius:6px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;font-size:14px;">[SPECIFIC AREA/ELEMENT THAT IS ACTUALLY SAFE]</summary>\n';
            p += '      <div style="padding:10px 14px;margin-top:2px;border-radius:6px;background:#f0fdf4;color:#166534;font-size:13px;font-weight:600;">✓ SAFE — [brief note on why this one is not a hazard]</div>\n';
            p += '    </details>\n';
            p += '    <!-- generate 4-5 total areas per scene, mixing real hazards and safe items -->\n';
            p += '  </div>\n</div>\n\n';
            p += "CRITICAL RULES:\n- Generate exactly " + count + " scenes\n- Each scene has 4-5 specific areas/elements to check, each its own separate <details> (NOT nested) — mix real hazards (red, ⚠) with genuinely safe items (green, ✓) so students must actually evaluate each one, not just click everything\n- Base hazards on real safety concerns relevant to the trade in the source material\n- Do NOT use <style> tags, <script> tags, onclick, radio/checkbox inputs, or CSS class names — inline style attributes only\n- Return ONLY valid HTML, no markdown, every tag closed\n\n";

        } else if(itemType === "whathappensnext"){
            p += "Generate a 'What Happens Next?' prediction activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " process/event openings from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">⚡ What Happens Next?</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Predict what happens next, then click to find out.</p>\n\n';
            p += "<!-- Generate " + count + " items using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "THE SETUP", "WHAT HAPPENS");
            p += "\nRULES: Generate exactly " + count + " items. [SETUP TEXT] describes the beginning of a process, procedure, or workplace event, stopping right before a key outcome — leave the reader genuinely uncertain what comes next. [REVEAL TEXT] explains what happens next and the cause-and-effect reasoning behind it. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "buildprocess"){
            p += "Generate a 'Build the Process' sequential-reveal activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript. Break ONE procedure into sequential steps, each its own <details>, revealed one at a time in order.\n\n";
            p += "Generate exactly " + count + " sequential steps for ONE complete procedure from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🏗 Build the Process</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Before opening each step, think about what should happen next. Then click to reveal it and continue.</p>\n\n';
            p += "<!-- Generate " + count + " steps IN ORDER using this exact template: -->\n";
            p += '<details style="margin-bottom:10px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">\n';
            p += '  <summary style="list-style:none;cursor:pointer;background:' + pri + ';color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px;">\n';
            p += '    <span style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:3px;flex-shrink:0;">STEP [N]</span>\n';
            p += '    <span style="font-family:Georgia,serif;font-size:15px;font-weight:700;">What happens next?</span>\n';
            p += '  </summary>\n';
            p += '  <div style="padding:16px 20px;background:#fff;">\n';
            p += '    <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#374151;margin:0;">[STEP DESCRIPTION — the specific action performed at this stage of the procedure]</p>\n';
            p += '  </div>\n</details>\n\n';
            p += "RULES: Generate exactly " + count + " steps for ONE single procedure, in the correct sequential order (replace [N] with 1, 2, 3...). Each step's revealed text should describe exactly what happens at that stage — specific and actionable, not vague. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "beattheexpert"){
            p += "Generate a 'Beat the Expert' activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " practical problems from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🏆 Beat the Expert</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Work through the problem yourself, then see how an expert would approach it.</p>\n\n';
            p += "<!-- Generate " + count + " problems using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "THE PROBLEM", "THE EXPERT'S APPROACH");
            p += "\nRULES: Generate exactly " + count + " problems. [SETUP TEXT] presents a practical question or workplace problem to solve. [REVEAL TEXT] explains how an experienced professional would approach the same situation and the reasoning behind their decision — not just the final answer, but the thought process. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "commonmistake"){
            p += "Generate a 'Common Mistake' activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " frequent beginner mistakes from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">🚫 Common Mistake</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">See a mistake beginners often make, why it happens, and how pros avoid it.</p>\n\n';
            p += "<!-- Generate " + count + " items using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "THE MISTAKE", "WHY IT MATTERS");
            p += "\nRULES: Generate exactly " + count + " items. [SETUP TEXT] names/describes one specific mistake commonly made by beginners in a particular skill or procedure. [REVEAL TEXT] explains why the mistake happens, the problems it causes, and how experienced professionals avoid it. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";

        } else if(itemType === "protip"){
            p += "Generate a 'Pro Tip' activity for Canvas LMS using <details>/<summary> tags — NO <style> blocks or JavaScript.\n\n";
            p += "Generate exactly " + count + " practical, real-world tips from the source material.\n\n";
            p += '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:36px 24px;">\n';
            p += '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:' + theme.text + ';margin:0 0 6px;">💡 Pro Tip</h2>\n';
            p += '<p style="font-size:13px;color:#6B7280;margin:0 0 24px;">Discover a trick of the trade you won\'t find in a textbook.</p>\n\n';
            p += "<!-- Generate " + count + " tips using this exact template: -->\n";
            p += activitySingleRevealCard(pri, "THINK YOU KNOW THIS ONE?", "PRO TIP");
            p += "\nRULES: Generate exactly " + count + " tips. [SETUP TEXT] is a short teaser question related to a real skill or task from the source material. [REVEAL TEXT] gives one practical piece of advice, shortcut, or industry best practice that experienced professionals use but textbooks often overlook, and explains why it helps. Do NOT use <style> tags, <script> tags, onclick, or CSS class names — inline style attributes only. Return ONLY valid HTML, no markdown, every tag closed.\n\n";
        }

        if(itemData.includeImages){
            p += "IMAGES: For any term/question/card above that is a concrete, visual, physical thing — a tool, object, animal, place, diagram-able structure (e.g. \"pipe wrench\", \"mitochondria\", \"circuit breaker\") — insert exactly one marker on its own line, right inside that item's revealed content: [[IMAGE: 2-4 word keyword specific to that exact term]]. Do NOT add a marker for abstract or non-visual concepts (e.g. \"supply and demand\", \"justice\", \"irony\") — skip those entirely. Do not write an <img> tag yourself, only the marker. Use your judgment per item — not every item needs one.\n\n";
        }

        p += "SOURCE MATERIAL:\n";
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
    .cmb-add-cat-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94A3B8;margin:4px 0 6px;}
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
    .cmb-video-results{max-height:360px;overflow-y:auto;margin-top:12px;display:flex;flex-direction:column;gap:8px;}
    .cmb-video-card{padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;}
    .cmb-video-row{display:flex;align-items:center;gap:10px;}
    .cmb-video-thumb-wrap{position:relative;flex-shrink:0;width:120px;height:68px;border-radius:6px;overflow:hidden;background:#f1f5f9;}
    .cmb-video-thumb{width:100%;height:100%;object-fit:cover;display:block;}
    .cmb-video-play{cursor:pointer;}
    .cmb-video-playicon{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;background:rgba(0,0,0,0.15);text-shadow:0 1px 3px rgba(0,0,0,0.6);opacity:0;transition:opacity .15s;}
    .cmb-video-play:hover .cmb-video-playicon{opacity:1;}
    .cmb-video-dur{position:absolute;bottom:3px;right:3px;background:rgba(0,0,0,0.75);color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;}
    .cmb-video-info{flex:1;min-width:0;}
    .cmb-video-title{font-size:12px;font-weight:600;color:#1E293B;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .cmb-video-channel{font-size:11px;color:#94A3B8;margin-top:2px;}
    .cmb-video-use{flex-shrink:0;white-space:nowrap;}
    .cmb-video-player{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-top:10px;border-radius:6px;}
    .cmb-video-player iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;}
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

    /* ── MANUAL EDITOR ── */
    #cmb-manual-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:30px 20px;font-family:system-ui,-apple-system,sans-serif;}
    #cmb-manual-panel{background:#F8FAFC;border-radius:20px;max-width:760px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 60px);}
    .cmb-wys-toolbar{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;}
    .cmb-wys-btn{padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;background:#fff;color:#475569;font-size:12px;font-weight:700;cursor:pointer;}
    .cmb-wys-btn:hover{background:#F5F3FF;border-color:#7C3AED;color:#7C3AED;}
    .cmb-wys-editor{min-height:260px;border:1px solid #CBD5E1;border-radius:8px;padding:14px;font-size:14px;line-height:1.7;color:#1E293B;background:#fff;overflow-y:auto;}
    .cmb-wys-editor:focus{outline:none;border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,0.12);}

    /* ── QUIZ BUILDER ── */
    #cmb-quiz-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;}
    #cmb-quiz-panel{background:#F8FAFC;border-radius:20px;max-width:1280px;width:100%;height:calc(100vh - 48px);box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;}
    .cmb-qb-cols{flex:1;min-height:0;display:grid;grid-template-columns:320px 1fr 300px;}
    .cmb-qb-col{overflow-y:auto;min-height:0;}
    .cmb-qb-col.left{background:#fff;border-right:1px solid #E2E8F0;}
    .cmb-qb-col.mid{background:#F1F5F9;border-right:1px solid #E2E8F0;}
    .cmb-qb-col.right{background:#fff;}
    .cmb-qb-colhdr{padding:12px 16px 10px;border-bottom:1px solid #E2E8F0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748B;position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;background:inherit;}
    .cmb-qb-colbody{padding:14px 16px;}
    .cmb-qb-empty{display:flex;align-items:center;justify-content:center;height:240px;color:#94A3B8;font-size:13px;text-align:center;line-height:1.7;}
    .cmb-qb-selall{font-size:11px;background:none;border:none;color:#7C3AED;cursor:pointer;font-weight:700;}
    .cmb-qb-gcard{background:#fff;border:2px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;}
    .cmb-qb-gcard.sel{border-color:#7C3AED;}
    .cmb-qb-ghdr{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;}
    .cmb-qb-cbox{width:18px;height:18px;border-radius:4px;border:2px solid #CBD5E1;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;}
    .cmb-qb-gcard.sel .cmb-qb-cbox{border-color:#7C3AED;background:#7C3AED;}
    .cmb-qb-gtitle{font-weight:700;font-size:13px;color:#1E293B;flex:1;}
    .cmb-qb-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;white-space:nowrap;flex-shrink:0;}
    .cmb-qb-vtabs{display:flex;gap:4px;margin:0 0 8px 26px;flex-wrap:wrap;}
    .cmb-qb-vtab{padding:3px 10px;border-radius:20px;border:1px solid #CBD5E1;background:#F8FAFC;color:#64748B;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;}
    .cmb-qb-vtab.active{border-color:#7C3AED;background:#F5F3FF;color:#7C3AED;font-weight:700;}
    .cmb-qb-vbody{margin-left:26px;font-size:13px;line-height:1.55;color:#1E293B;}
    .cmb-qb-ans{display:flex;gap:6px;align-items:flex-start;font-size:12px;padding:4px 8px;border-radius:6px;margin-bottom:3px;background:#F8FAFC;border:1px solid #F1F5F9;}
    .cmb-qb-ans.correct{background:#F0FDF4;border-color:#86EFAC;}
    .cmb-qb-expl{margin-top:8px;font-size:11px;color:#64748B;padding-top:8px;border-top:1px solid #F1F5F9;line-height:1.5;}
    .cmb-qb-queue-item{display:flex;align-items:flex-start;gap:6px;padding:7px 0;border-bottom:1px solid #F1F5F9;font-size:12px;}
    .cmb-qb-queue-item .rm{background:none;border:none;color:#94A3B8;cursor:pointer;font-size:11px;flex-shrink:0;padding:0;margin-top:2px;}
    #cmb-alerts-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;}
    #cmb-alerts-panel{background:#F8FAFC;border-radius:20px;max-width:760px;width:100%;max-height:calc(100vh - 48px);box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;}
    .cmb-alerts-body{flex:1;overflow-y:auto;min-height:0;padding:20px 24px;}
    .cmb-al-student{background:#fff;border:2px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:10px;}
    .cmb-al-student.sel{border-color:#7C3AED;}
    .cmb-al-shdr{display:flex;align-items:center;gap:10px;}
    .cmb-al-cbox{width:18px;height:18px;border-radius:4px;border:2px solid #CBD5E1;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;}
    .cmb-al-student.sel .cmb-al-cbox{border-color:#7C3AED;background:#7C3AED;color:#fff;}
    .cmb-al-name{font-weight:700;font-size:13px;color:#1E293B;flex:1;}
    .cmb-al-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;white-space:nowrap;}
    .cmb-al-badge.missing{background:#FEE2E2;color:#991B1B;}
    .cmb-al-badge.lowgrade{background:#FFEDD5;color:#9A3412;}
    .cmb-al-badge.upcoming{background:#FEF3C7;color:#92400E;}
    .cmb-al-detail{margin:8px 0 0 28px;font-size:12px;color:#64748B;line-height:1.6;}
    .cmb-al-preview{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;font-size:12px;}
    .cmb-al-preview .to{font-weight:700;color:#1E293B;margin-bottom:4px;}
    .cmb-al-preview .subj{color:#475569;margin-bottom:8px;}
    .cmb-al-preview .body{white-space:pre-wrap;color:#334155;line-height:1.6;}
    #cmb-sch-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;}
    #cmb-sch-panel{background:#F8FAFC;border-radius:20px;max-width:1400px;width:100%;height:calc(100vh - 48px);box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;}
    .cmb-sch-controls{background:#394B58;padding:0 8px;display:flex;align-items:center;gap:2px;position:relative;z-index:5;height:42px;flex-shrink:0;}
    .cmb-sch-brand{color:#fff;font-weight:700;font-size:13px;padding:0 10px 0 8px;white-space:nowrap;}
    .cmb-sch-dd-wrap{position:relative;}
    .cmb-sch-dd-btn{background:none;border:none;color:#fff;font-size:12px;font-weight:600;padding:9px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;border-radius:6px;}
    .cmb-sch-dd-btn:hover,.cmb-sch-dd-btn.open{background:rgba(255,255,255,0.12);}
    .cmb-sch-close-btn{background:rgba(255,255,255,0.12);border:none;color:#fff;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:13px;}
    .cmb-sch-close-btn:hover{background:rgba(255,255,255,0.22);}
    .cmb-sch-dd-panel{display:none;position:absolute;top:100%;left:0;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.2);padding:16px;min-width:260px;z-index:10;}
    .cmb-sch-dd-panel.open{display:block;}
    .cmb-sch-dd-panel .cmb-sch-ctrl{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
    .cmb-sch-dd-panel .cmb-sch-ctrl:last-child{margin-bottom:0;}
    .cmb-sch-ctrl label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94A3B8;}
    .cmb-sch-ctrl input{border:1px solid #CBD5E1;border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;width:100%;}
    .cmb-sch-wd-row{display:flex;gap:3px;}
    .cmb-sch-wd-btn{width:28px;height:28px;border-radius:6px;border:1px solid #CBD5E1;background:#fff;color:#64748B;font-size:11px;cursor:pointer;}
    .cmb-sch-wd-btn.on{background:#7C3AED;border-color:#7C3AED;color:#fff;font-weight:700;}
    .cmb-sch-ctrl-btns{margin-left:auto;display:flex;gap:8px;padding:8px 0;}
    .cmb-sch-layout{flex:1;min-height:0;display:flex;}
    .cmb-sch-left{width:280px;flex-shrink:0;border-right:1px solid #E2E8F0;background:#fff;display:flex;flex-direction:column;min-height:0;}
    .cmb-sch-right{flex:1;min-width:0;background:#F1F5F9;display:flex;flex-direction:column;min-height:0;}
    .cmb-sch-colhdr{padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748B;border-bottom:1px solid #E2E8F0;background:#fff;}
    .cmb-sch-left-body{flex:1;overflow-y:auto;padding:12px;}
    .cmb-sch-board{flex:1;overflow:auto;padding:12px;display:flex;gap:12px;align-items:flex-start;}
    .cmb-sch-dropzone{min-height:60px;border-radius:8px;padding:4px;transition:background .1s;}
    .cmb-sch-drop-active{background:#EDE9FE;outline:2px dashed #7C3AED;}
    .cmb-sch-dz-label{font-size:11px;color:#94A3B8;text-align:center;padding:8px;}
    .cmb-sch-unscheduled-zone{border:2px dashed #CBD5E1;margin-bottom:12px;}
    .cmb-sch-modgroup{margin-bottom:14px;}
    .cmb-sch-modname{font-size:11px;font-weight:700;color:#7C3AED;margin-bottom:6px;}
    .cmb-sch-tile{background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;margin-bottom:8px;cursor:grab;box-shadow:0 1px 2px rgba(0,0,0,.04);}
    .cmb-sch-tile:active{cursor:grabbing;}
    .cmb-sch-tile-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
    .cmb-sch-tile-pill{font-size:9px;font-weight:700;color:#fff;padding:2px 7px;border-radius:10px;text-transform:uppercase;}
    .cmb-sch-tile-draft{font-size:9px;font-weight:700;color:#92400E;background:#FEF3C7;padding:2px 7px;border-radius:10px;}
    .cmb-sch-tile-title{font-size:12px;font-weight:600;color:#1E293B;line-height:1.35;margin-bottom:4px;}
    .cmb-sch-tile-foot{display:flex;justify-content:space-between;align-items:center;font-size:10px;}
    .cmb-sch-tile-link{color:#7C3AED;text-decoration:none;}
    .cmb-sch-tile-ovr{cursor:pointer;color:#94A3B8;}
    .cmb-sch-ovr-panel{margin-top:8px;padding-top:8px;border-top:1px solid #F1F5F9;display:flex;flex-direction:column;gap:6px;}
    .cmb-sch-ovr-panel label{font-size:9px;color:#94A3B8;text-transform:uppercase;}
    .cmb-sch-ovr-input{width:100%;border:1px solid #E2E8F0;border-radius:4px;padding:3px 6px;font-size:11px;}
    .cmb-sch-ovr-reset{background:none;border:none;color:#7C3AED;font-size:10px;cursor:pointer;padding:0;text-align:left;}
    .cmb-sch-datecol{width:200px;flex-shrink:0;background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px;min-height:120px;}
    .cmb-sch-datehead{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#334155;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #F1F5F9;}
    .cmb-sch-holiday{font-size:9px;background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:8px;font-weight:700;}
    .cmb-sch-datecount{margin-left:auto;background:#E2E8F0;color:#475569;border-radius:10px;padding:1px 7px;font-size:10px;}
    #cmb-sg-toolbar{position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#1B303D;height:44px;display:flex;align-items:center;gap:4px;padding:0 10px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.25);}
    #cmb-sg-tab{position:fixed;top:0;right:16px;z-index:2147483000;background:#1B303D;color:#fff;border:none;border-radius:0 0 8px 8px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer;font-family:system-ui,sans-serif;}
    .cmb-sg-brand{color:#fff;font-weight:700;font-size:12px;padding:0 8px;white-space:nowrap;opacity:0.85;}
    .cmb-sg-wrap{position:relative;}
    .cmb-sg-btn{background:none;border:none;color:#fff;font-size:12px;font-weight:600;padding:8px 10px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:5px;position:relative;}
    .cmb-sg-btn:hover{background:#EAF3FB;color:#0B6FB0;}
    .cmb-sg-badge{background:#EF4444;color:#fff;font-size:9px;font-weight:700;border-radius:10px;padding:1px 6px;margin-left:2px;}
    .cmb-sg-menu{display:none;position:absolute;top:100%;left:0;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.2);padding:6px;min-width:180px;z-index:10;}
    .cmb-sg-menu.open{display:block;}
    .cmb-sg-menu-item{display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:none;border-radius:6px;font-size:12px;font-weight:500;color:#1E293B;cursor:pointer;}
    .cmb-sg-menu-item:hover{background:#F5F3FF;color:#7C3AED;}
    #cmb-sg-overlay{position:fixed;inset:0;z-index:2147483100;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;}
    #cmb-sg-drawer{background:#fff;border-radius:14px;box-shadow:0 25px 60px rgba(0,0,0,0.3);max-height:calc(100vh - 80px);display:flex;flex-direction:column;overflow:hidden;width:520px;}
    #cmb-sg-drawer.cmb-sg-sz-md{width:720px;}
    #cmb-sg-drawer.cmb-sg-sz-lg{width:900px;}
    #cmb-sg-drawer.cmb-sg-sz-xl{width:1000px;}
    .cmb-sg-dhdr{background:#1B303D;color:#fff;padding:16px 20px;display:flex;align-items:flex-start;gap:10px;flex-shrink:0;}
    .cmb-sg-dhdr-title{font-size:16px;font-weight:700;flex:1;}
    .cmb-sg-dhdr-sub{font-size:11px;opacity:0.7;margin-top:2px;font-weight:400;}
    .cmb-sg-dhelp-btn{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;font-weight:700;flex-shrink:0;}
    .cmb-sg-dclose{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:13px;flex-shrink:0;}
    .cmb-sg-dhelp-panel{background:#EFF8FF;color:#0B4F73;padding:12px 20px;font-size:12px;line-height:1.6;border-bottom:1px solid #D6EBFA;flex-shrink:0;}
    .cmb-sg-dbody{padding:18px 20px;overflow-y:auto;flex:1;min-height:0;}
    .cmb-sg-mbody-split{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
    .cmb-sg-fgrp{margin-bottom:14px;}
    .cmb-sg-flabel{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#6B7280;margin-bottom:5px;display:block;}
    .cmb-sg-input,.cmb-sg-textarea,.cmb-sg-select{width:100%;border:1px solid #CBD5E1;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;}
    .cmb-sg-textarea{resize:vertical;min-height:70px;}
    .cmb-sg-dfoot{padding:14px 20px;border-top:1px solid #E2E8F0;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;}
    .cmb-sg-abtn{padding:9px 18px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;}
    .cmb-sg-abtn-primary{background:#0770B8;color:#fff;}
    .cmb-sg-abtn-secondary{background:#F1F5F9;color:#475569;}
    .cmb-sg-abtn-success{background:#127A1B;color:#fff;}
    .cmb-sg-abtn[disabled]{opacity:0.5;cursor:not-allowed;}
    .cmb-sg-status{font-size:12px;padding:8px 12px;border-radius:8px;margin-bottom:12px;}
    .cmb-sg-status-info{background:#EFF6FF;color:#1D4ED8;}
    .cmb-sg-status-success{background:#F0FDF4;color:#166534;}
    .cmb-sg-status-error{background:#FEF2F2;color:#B91C1C;}
    .cmb-sg-status-warn{background:#FFFBEB;color:#92400E;}
    .cmb-sg-tchbox{background:#FFFBEB;border-left:4px solid #F59E0B;padding:10px 14px;border-radius:6px;font-size:12px;color:#92400E;margin-bottom:12px;}
    .cmb-sg-qitem{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:6px;cursor:pointer;}
    .cmb-sg-qitem:hover{background:#F8FAFC;border-color:#0770B8;}
    .cmb-sg-qname{font-size:13px;font-weight:600;color:#1E293B;}
    .cmb-sg-qmeta{font-size:11px;color:#94A3B8;}
    .cmb-sg-snippet{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:8px;}
    .cmb-sg-snippet-text{flex:1;font-size:12px;color:#334155;line-height:1.5;}
    .cmb-sg-check-row{border-left:4px solid #CBD5E1;padding:10px 14px;margin-bottom:8px;border-radius:0 8px 8px 0;background:#F8FAFC;}
    .cmb-sg-check-row.flagged{border-left-color:#EF4444;background:#FEF2F2;}
    .cmb-sg-check-row.complete{border-left-color:#22C55E;}
    .cmb-sg-check-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;}
    .cmb-sg-check-title{font-size:13px;font-weight:700;color:#1E293B;}
    .cmb-sg-check-detail{font-size:11px;color:#64748B;margin-top:2px;}
    .cmb-sg-check-inline{font-size:11px;color:#475569;margin-top:6px;padding-left:14px;border-left:2px solid #E2E8F0;}
    .cmb-sg-reload-banner{position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#F59E0B;color:#1c1917;text-align:center;padding:10px;font-size:13px;font-weight:600;font-family:system-ui,sans-serif;}
    #cmb-cs-toolbar{display:block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;background:#fff;border-bottom:1px solid #c7cdd1;position:relative;z-index:9000;user-select:none;color:#394B58;box-sizing:border-box;}
    #cmb-cs-row-bottom{height:40px;display:flex;align-items:center;gap:2px;padding:0 8px;background:#fff;flex-wrap:nowrap;}
    #cmb-cs-row-props{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #E2E8F0;background:#fff;border-bottom:2px solid #3B82F6;}
    #cmb-cs-row-props.open{display:flex;}
    #cmb-cs-props-label{font-size:11px;font-weight:700;color:#0770B8;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;padding-right:4px;border-right:1px solid #ddd;margin-right:4px;}
    #cmb-cs-props-insert{margin-left:auto;padding:6px 18px;background:#0770B8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;white-space:nowrap;transition:background .15s;}
    #cmb-cs-props-insert:hover{background:#055b9a;}
    #cmb-cs-props-cancel{padding:6px 12px;background:#fff;color:#666;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;transition:background .15s;}
    #cmb-cs-props-cancel:hover{background:#f5f5f5;}
    .cmb-cs-prop{display:flex;align-items:center;gap:5px;font-size:12px;color:#555;}
    .cmb-cs-prop label{white-space:nowrap;font-size:11px;color:#888;}
    .cmb-cs-prop input[type=number]{width:52px;padding:4px 6px;border:1px solid #ccc;border-radius:3px;font-size:12px;font-family:inherit;}
    .cmb-cs-prop select{padding:4px 6px;border:1px solid #ccc;border-radius:3px;font-size:12px;font-family:inherit;background:#fff;}
    .cmb-cs-prop-swatches{display:flex;gap:4px;align-items:center;flex-wrap:wrap;}
    .cmb-cs-prop-swatch{width:22px;height:22px;border-radius:4px;border:2px solid transparent;cursor:pointer;padding:0;transition:border-color .1s,transform .1s;flex-shrink:0;}
    .cmb-cs-prop-swatch:hover{transform:scale(1.15);}
    .cmb-cs-prop-swatch.active{border-color:#333 !important;box-shadow:0 0 0 1px #fff inset;}
    .cmb-cs-prop-sep{width:1px;height:20px;background:#e0e0e0;flex-shrink:0;}
    .cmb-cs-sep{width:1px;height:20px;background:#dde1e4;margin:0 4px;flex-shrink:0;}
    .cmb-cs-group{position:relative;}
    .cmb-cs-brand{display:flex;align-items:center;gap:6px;padding-right:8px;border-right:1px solid #dde1e4;margin-right:4px;flex-shrink:0;white-space:nowrap;}
    .cmb-cs-mark{color:#0B6FB0;font-size:14px;line-height:1;}
    .cmb-cs-name{font-size:12px;font-weight:700;color:#394B58;letter-spacing:.01em;white-space:nowrap;}
    .cmb-cs-btn{display:flex;align-items:center;gap:4px;height:30px;background:#fff;border:1px solid #d5dbe0;border-radius:4px;padding:5px 9px;cursor:pointer;font-size:13px;font-weight:700;color:#394B58;white-space:nowrap;transition:background .12s,color .12s,border-color .12s;font-family:inherit;line-height:1.4;flex-shrink:0;box-sizing:border-box;}
    .cmb-cs-btn:hover,.cmb-cs-btn.open{background:#EAF3FB;border-color:#B8DAF0;color:#0B6FB0;}
    .cmb-cs-panel{display:none;position:absolute;top:calc(100% + 2px);left:0;background:#fff;border:1px solid #c7cdd1;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,.13);min-width:180px;z-index:9999;overflow:hidden;}
    .cmb-cs-panel.open{display:block;}
    .cmb-cs-item{display:block;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid #f0f0f0;border-radius:0;padding:7px 14px;font-size:13px;font-weight:400;color:#2d3b45;cursor:pointer;transition:background .1s;font-family:inherit;}
    .cmb-cs-item:last-child{border-bottom:none;}
    .cmb-cs-item:hover{background:#e8f0f8;color:#0770B8;}
    .cmb-cs-mega-panel{min-width:220px;max-height:420px;overflow-y:auto;}
    .cmb-cs-menu-section{padding:10px 14px 4px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;}
    .cmb-cs-spacer{margin-left:auto;}
    .cmb-cs-reopen{display:none;position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:9000;align-items:center;gap:6px;padding:6px 14px;border:none;border-radius:20px;background:#394B58;color:#fff;font:600 12px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.2);white-space:nowrap;}
    .cmb-cs-reopen:hover{background:#2d3b45;}
    .cmb-cs-icon-panel{min-width:300px;padding:0;}
    .cmb-cs-icon-tabs{display:flex;border-bottom:1px solid #eee;}
    .cmb-cs-icon-tab{flex:1;padding:7px 4px;border:none;background:none;cursor:pointer;font-size:11px;color:#666;border-bottom:2px solid transparent;font-family:inherit;}
    .cmb-cs-icon-tab.active{color:#0770B8;border-bottom-color:#0770B8;}
    .cmb-cs-icon-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:8px;max-height:200px;overflow-y:auto;}
    .cmb-cs-icon-btn{border:none;background:none;cursor:pointer;font-size:18px;padding:4px;border-radius:3px;line-height:1;transition:background .1s;}
    .cmb-cs-icon-btn:hover{background:#e8f0fb;}
    .cmb-cs-res-item{display:flex;align-items:center;gap:10px;padding:10px 14px;text-decoration:none;color:#222;border-bottom:1px solid #f0f0f0;font-size:13px;transition:background .1s;}
    .cmb-cs-res-item:last-child{border-bottom:none;}
    .cmb-cs-res-item:hover{background:#e8f0fb;color:#0770B8;}
    #cmb-cs-notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(60px);background:#333;color:#fff;padding:10px 20px;border-radius:4px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;opacity:0;transition:opacity .2s,transform .2s;z-index:999999;pointer-events:none;}
    #cmb-cs-notice.show{opacity:1;transform:translateX(-50%) translateY(0);}
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
            h+='<div style="font-size:11px;color:#065F46;margin-top:4px;">Modules, pages, assignments, and discussions will be inserted directly into this course.</div></div>';
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
        h+='<div class="cmb-card"><label class="cmb-label">YouTube Data API Key (optional)</label>';
        h+='<input type="password" class="cmb-input" id="cmb-youtubekey" placeholder="Leave blank to skip the Recommend Videos search" value="'+esc(state.youtubeKey)+'">';
        h+='<div style="font-size:11px;color:#94A3B8;margin-top:4px;">Lets the Video Page builder search and recommend real YouTube videos. Each person needs their own key — this is not shared, so your search limit is yours alone.</div>';
        h+='<div class="cmb-import-steps" style="margin-top:10px;">';
        h+='<h4>🔑 Get a free YouTube API key</h4><ol>';
        h+='<li>Go to <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank">console.cloud.google.com/apis/library/youtube.googleapis.com</a></li>';
        h+='<li>Sign in with any Google account. If asked, create a new project (any name works).</li>';
        h+='<li>Click <strong>Enable</strong> on the "YouTube Data API v3" page that loads.</li>';
        h+='<li>Go to <strong>APIs &amp; Services &rarr; Credentials</strong> (left sidebar).</li>';
        h+='<li>Click <strong>+ Create Credentials &rarr; API Key</strong>. Copy the key it generates.</li>';
        h+='<li>Paste that key into the field above.</li>';
        h+='</ol>';
        h+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid #bbf7d0;font-size:12px;color:#065F46;"><strong>Cost: Free.</strong> No billing or credit card required. Google gives every key 10,000 free units/day, and a video search costs 100 units — about 100 searches per day, resetting daily.</div>';
        h+='</div></div>';
        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-primary" id="cmb-next-layout">Next: Design Modules &rarr;</button></div>';
        body.innerHTML=h;
        body.querySelector("#cmb-apikey").addEventListener("input",function(e){state.apiKey=e.target.value;saveApiKey(state.apiKey);});
        body.querySelector("#cmb-unsplashkey").addEventListener("input",function(e){state.unsplashKey=e.target.value;saveUnsplashKey(state.unsplashKey);});
        body.querySelector("#cmb-youtubekey").addEventListener("input",function(e){state.youtubeKey=e.target.value;saveYoutubeKey(state.youtubeKey);});
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
        h+='<div class="cmb-card"><label class="cmb-label">🪄 AI Layout Suggestion</label>';
        h+='<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Reads your source material above and recommends which items to build — e.g. fewer content pages if you uploaded a full chapter students will read directly, more content pages if you uploaded a test or sparse notes with nothing to read as-is.</div>';
        h+='<button class="cmb-btn cmb-btn-ai" id="cmb-recommend-layout">🪄 Recommend Layout</button>';
        if(mod.aiLayoutNote){
            h+='<div style="margin-top:10px;padding:10px 12px;background:#F5F3FF;border-radius:8px;font-size:12px;color:#4C1D95;"><strong>'+esc(mod.aiLayoutNote.documentType)+'</strong> — '+esc(mod.aiLayoutNote.reasoning)+'</div>';
        }
        h+='</div>';
        h+='<div class="cmb-card"><label class="cmb-label">Add Items</label>';
        ITEM_CATEGORIES.forEach(function(cat){
            var catKey=cat[0], catLabel=cat[1];
            var typesInCat=Object.keys(ITEM_TYPES).filter(function(k){ return ITEM_TYPES[k].group===catKey; });
            if(!typesInCat.length) return;
            h+='<div class="cmb-add-cat-label">'+catLabel+'</div><div class="cmb-add-bar">';
            typesInCat.forEach(function(k){
                var ai=ITEM_TYPES[k];
                h+='<button class="cmb-add-btn" data-type="'+k+'" title="'+esc(ai.desc||"")+'">'+ai.icon+' '+ai.label+'</button>';
            });
            h+='</div>';
        });
        h+='</div>';
        h+='</div>';
        h+='<div class="cmb-layout-side">';
        h+='<div class="cmb-card"><label class="cmb-label">Current Layout ('+mod.items.length+' items)</label>';
        if(mod.items.length>0){
            h+='<ul class="cmb-layout-list">';
            for(var j=0;j<mod.items.length;j++){
                var it=mod.items[j],info=ITEM_TYPES[it.type]||{label:it.type,icon:"?"};
                h+='<li class="cmb-layout-item" data-idx="'+j+'" draggable="true" title="'+esc(info.desc||"")+'"><span class="icon">'+info.icon+'</span><span class="lbl">'+esc(info.label)+'</span><button class="rm" data-idx="'+j+'">&times;</button></li>';
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
        body.querySelector("#cmb-recommend-layout").addEventListener("click", async function(){
            var m = curMod();
            var pastedText = body.querySelector("#cmb-srcpaste").value.trim();
            if(!m.sources.length && !pastedText){
                state.status="Upload or paste source material first.";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;
            }
            if(m.items.length && !confirm("This replaces your current "+m.items.length+" item(s) with an AI-recommended layout. Continue?")) return;
            var btn=this; btn.disabled=true; btn.textContent="Analyzing...";
            state.status="Analyzing source material...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
            try{
                var raw = await callClaude(buildLayoutSuggestionPrompt(m, pastedText), AI_MODEL_CONTENT_FAST, 800);
                var cleaned = raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
                var s2 = cleaned.indexOf("{"), e2 = cleaned.lastIndexOf("}");
                if(s2===-1||e2===-1) throw new Error("Could not find JSON in response");
                var parsed = JSON.parse(cleaned.slice(s2,e2+1));
                var validItems = (parsed.items||[]).filter(function(k){ return !!ITEM_TYPES[k]; });
                if(!validItems.length) throw new Error("No valid items returned — try again");
                m.items = validItems.map(function(k){ var item={id:uid(),type:k}; initItemData(item); return item; });
                m.aiLayoutNote = { documentType: parsed.documentType||"", reasoning: parsed.reasoning||"" };
                state.status="✓ "+validItems.length+" item"+(validItems.length!==1?"s":"")+" suggested — review and edit below.";state.statusType="success";
                render();
            }catch(err){
                state.status="Error: "+err.message;state.statusType="error";
                btn.disabled=false; btn.textContent="🪄 Recommend Layout";
                renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
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
            var done=isItemBuilt(ai.item,d);
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
        renderContentBuilder(container,item,dd);
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
            matching:"AI generates " + d.count + " term-definition pairs as a self-checking exercise — select the right definition for each term to see instant ✓/✗ feedback.",
            whatwouldyoudo:"AI writes " + d.count + " realistic workplace situations — students decide what they'd do, then reveal the recommended response and why it beats the alternatives.",
            finderror:"AI writes " + d.count + " statements/procedures/calculations each containing one intentional mistake — students spot it before revealing the error and the fix.",
            spothazard:"AI writes " + d.count + " workplace scenes to inspect for safety hazards — click each area to check it, with hazards explained one by one.",
            mysterymachine:"AI writes " + d.count + " equipment-symptom mysteries — students diagnose the most likely cause before revealing the solution and explanation.",
            decisionpoint:"AI writes " + d.count + " critical workplace decision points — each possible action reveals its own outcome, good or bad.",
            whathappensnext:"AI writes " + d.count + " process/event openings — students predict what happens next before revealing the answer and the cause-and-effect reasoning.",
            buildprocess:"AI writes a procedure as " + d.count + " sequential steps, revealed one at a time — students think about what comes next before uncovering each stage.",
            beattheexpert:"AI writes " + d.count + " practical problems — students reason it out, then reveal how an experienced professional would approach the same situation.",
            commonmistake:"AI writes " + d.count + " frequent beginner mistakes — why they happen, what they cause, and how professionals avoid them.",
            protip:"AI writes " + d.count + " practical, real-world tips and shortcuts experienced professionals use but textbooks often skip."
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
        var countLabel={flashcard:"Cards",quickcheck:"Questions",termreveal:"Terms",truefalse:"Statements",readcheck:"Inline Questions",matching:"Term Pairs",
            whatwouldyoudo:"Situations",finderror:"Items",spothazard:"Scenes",mysterymachine:"Mysteries",decisionpoint:"Decision Points",
            whathappensnext:"Scenarios",buildprocess:"Steps",beattheexpert:"Problems",commonmistake:"Mistakes",protip:"Tips"};
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

        // Include Images toggle — opt-in since it costs Unsplash calls; the
        // AI decides per-item whether a photo actually helps (concrete/
        // visual things like tools get one, abstract concepts don't).
        var imagesOn = !!d.includeImages;
        h+='<div class="cmb-el-toggle'+(imagesOn?' on':'')+'" id="cmb-act-images-toggle" style="margin-bottom:16px;"><div class="dot"></div><div><div style="font-weight:500;">Include Images</div><div style="font-size:10px;color:#94A3B8;">AI adds a real photo next to concrete/visual terms (e.g. a tool, an animal) — skips abstract ones</div></div></div>';

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
        container.querySelector("#cmb-act-images-toggle").addEventListener("click",function(){ d.includeImages=!d.includeImages; render(); });
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
        if(ITEM_TYPES[item.type] && ITEM_TYPES[item.type].group==="assignment" && item.type!=="gradeddiscussion"){renderPdfAssignmentBuilder(container,item,d);return;}
        var info=ITEM_TYPES[item.type]||{label:"Page",icon:"?"};
        if(d.subView==="result"&&d.generatedHTML){renderContentResult(container,item,d);return;}
        var isGradedDiscussion=item.type==="gradeddiscussion";
        var showPointsDue=isGradedDiscussion;

        var h='<h2 class="cmb-h2">'+info.icon+' Build: '+esc(info.label)+'</h2>';
        h+='<p class="cmb-desc">Configure and generate this '+(isGradedDiscussion?"graded discussion":"page")+' with AI.</p>';

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

        // ── Layout picker ────────────────────────────────────────────────────
        h+='<div class="cmb-card"><label class="cmb-label">Layout</label>';
        h+='<div style="font-size:11px;color:#64748B;margin-bottom:8px;">How the content is structured on the page.</div>';
        h+='<select class="cmb-select" id="cmb-layout">';
        [["standard","Standard — single column"],["twocol","Two-Column — content + sidebar"],["imagewrap","Image + Text Wrap"],["grid","Grid — card layout"]].forEach(function(o){
            h+='<option value="'+o[0]+'"'+((d.layout||"standard")===o[0]?' selected':'')+'>'+o[1]+'</option>';
        });
        h+='</select></div>';

        if(item.type==="video"){
            h+='<div class="cmb-card"><label class="cmb-label">Video</label>';
            h+='<div style="font-size:11px;color:#64748B;margin-bottom:8px;">Paste a YouTube/Vimeo link or any video URL, or search YouTube below — it will be embedded near the top of the page.</div>';
            h+='<input type="text" class="cmb-input" id="cmb-video-url" value="'+esc(d.videoUrl||"")+'" placeholder="https://www.youtube.com/watch?v=...">';
            h+='<div style="display:flex;gap:8px;margin-top:10px;">';
            h+='<input type="text" class="cmb-input" style="flex:1;" id="cmb-video-query" value="'+esc(d.videoQuery||"")+'" placeholder="Search topic, e.g. photosynthesis for kids">';
            h+='<button class="cmb-btn cmb-btn-ai" id="cmb-video-search" style="white-space:nowrap;">🔍 Recommend Videos</button>';
            h+='</div>';
            if(!state.youtubeKey){
                h+='<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">';
                h+='<div style="font-size:11px;color:#94A3B8;flex:1;min-width:200px;">Needs a free YouTube API key — get one at <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank">console.cloud.google.com</a> (enable "YouTube Data API v3", create an API key under Credentials — free, no billing needed).</div>';
                h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-video-enterkey" style="white-space:nowrap;">🔑 Enter Key</button>';
                h+='</div>';
            }
            if(d.videoResults && d.videoResults.length){
                h+='<div class="cmb-video-results">';
                d.videoResults.forEach(function(v,vi){
                    var dur=formatYoutubeDuration(v.duration);
                    var isPreview=d.videoPreviewIndex===vi;
                    h+='<div class="cmb-video-card">';
                    h+='<div class="cmb-video-row">';
                    h+='<div class="cmb-video-thumb-wrap cmb-video-play" data-vi="'+vi+'">'+(v.thumbnail?'<img src="'+esc(v.thumbnail)+'" class="cmb-video-thumb">':'')+'<span class="cmb-video-playicon">'+(isPreview?'✕':'▶')+'</span>'+(dur?'<span class="cmb-video-dur">'+dur+'</span>':'')+'</div>';
                    h+='<div class="cmb-video-info"><div class="cmb-video-title">'+esc(v.title)+'</div><div class="cmb-video-channel">'+esc(v.channel)+'</div></div>';
                    h+='<button class="cmb-btn cmb-btn-secondary cmb-video-use" data-vi="'+vi+'">Use this video</button>';
                    h+='</div>';
                    if(isPreview){
                        h+='<div class="cmb-video-player"><iframe src="https://www.youtube.com/embed/'+esc(v.videoId)+'" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>';
                    }
                    h+='</div>';
                });
                h+='</div>';
            } else if(d.videoResults){
                h+='<div style="font-size:12px;color:#94A3B8;margin-top:10px;">No results — try a different search.</div>';
            }
            h+='</div>';
        }

        var elMap=PAGE_EL;
        var elDataKey="pageElements";
        if(!d[elDataKey]) d[elDataKey]={};
        var elData=d[elDataKey];
        h+='<div class="cmb-card"><label class="cmb-label">Elements</label><div class="cmb-el-grid">';
        var elKeys=Object.keys(elMap);
        for(var j=0;j<elKeys.length;j++){
            var ek=elKeys[j],ev=elMap[ek];
            h+='<div class="cmb-el-toggle'+(elData[ek]?' on':'')+'" data-el="'+ek+'"><div class="dot"></div><div><div style="font-weight:500;">'+ev[0]+'</div><div style="font-size:10px;color:#94A3B8;">'+ev[1]+'</div></div></div>';
        }
        h+='</div>';
        if(showPointsDue){
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
        container.querySelector("#cmb-layout").addEventListener("change",function(e){d.layout=e.target.value;});
        var videoInput=container.querySelector("#cmb-video-url");
        if(videoInput) videoInput.addEventListener("input",function(e){d.videoUrl=e.target.value;});
        var videoQueryInput=container.querySelector("#cmb-video-query");
        if(videoQueryInput) videoQueryInput.addEventListener("input",function(e){d.videoQuery=e.target.value;});
        var videoEnterKeyBtn=container.querySelector("#cmb-video-enterkey");
        if(videoEnterKeyBtn){
            videoEnterKeyBtn.addEventListener("click",function(){
                var key=prompt("Paste your YouTube Data API key:", state.youtubeKey||"");
                if(key===null) return;
                key=key.trim();
                if(!key) return;
                state.youtubeKey=key;
                saveYoutubeKey(key);
                state.status="YouTube API key saved!";state.statusType="success";
                render();
            });
        }
        var videoSearchBtn=container.querySelector("#cmb-video-search");
        if(videoSearchBtn){
            videoSearchBtn.addEventListener("click",async function(){
                var query=(d.videoQuery||d.textContent||"").trim();
                if(!query){state.status="Enter a search topic first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
                if(!state.youtubeKey){state.status="Add a YouTube API key in Setup first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
                state.status="Searching YouTube...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                videoSearchBtn.disabled=true;videoSearchBtn.textContent="Searching...";
                try{
                    d.videoResults=await youtubeSearch(query);
                    state.status=d.videoResults.length+" videos found";state.statusType="success";
                    render();
                }catch(err){
                    state.status="Error: "+err.message;state.statusType="error";
                    videoSearchBtn.disabled=false;videoSearchBtn.textContent="🔍 Recommend Videos";
                    renderStatus(overlayEl.querySelector("#cmb-panel"));
                }
            });
        }
        container.querySelectorAll(".cmb-video-use").forEach(function(btn){
            btn.addEventListener("click",function(){
                var vi=parseInt(btn.dataset.vi,10);
                var v=d.videoResults[vi];
                d.videoUrl="https://www.youtube.com/watch?v="+v.videoId;
                render();
            });
        });
        container.querySelectorAll(".cmb-video-play").forEach(function(el){
            el.addEventListener("click",function(){
                var vi=parseInt(el.dataset.vi,10);
                d.videoPreviewIndex=(d.videoPreviewIndex===vi)?null:vi;
                render();
            });
        });
        container.querySelectorAll(".cmb-el-toggle[data-el]").forEach(function(el){
            el.addEventListener("click",function(){
                var key=el.dataset.el;
                d[elDataKey][key]=!d[elDataKey][key];
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
            if(!d.textContent&&!d.uploadedFile&&!d.videoUrl&&!(curMod()&&curMod().sources.length)){state.status="Add some content first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
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

    var KNOWLEDGE_QTYPES = [
        ["mc","Multiple Choice"],["tf","True / False"],["matching","Matching (pairs)"],
        ["ordering","Ordering (sequence)"],["short","Short Answer"],["fillblank","Fill in the Blank"],
        ["labeling","Labeling a Diagram"],["calculation","Calculation"],["scenario","Scenario-Based"]
    ];

    // Shared builder for every "assignment"-group PDF type (all 10 —
    // Knowledge through Workplace Scenario). Only the Generate button's
    // logic differs by type: Knowledge routes through the typed-question
    // engine (buildKnowledgeAnswerKeyPrompt -> knowledgeAnswerKeyToPdfSchema),
    // everything else generates the generic schema directly
    // (buildAssignmentPdfPrompt -> sanitizeAssignmentSchema). Both engines
    // converge on the same d.generatedPdfSchema, which is all
    // insertAllContent and the preview below ever need to know about.
    function renderPdfAssignmentBuilder(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Assignment",icon:"?"};
        if(d.subView==="result"&&d.generatedPdfSchema){renderPdfAssignmentResult(container,item,d);return;}
        var isKnowledge=item.type==="knowledge";

        var h='<h2 class="cmb-h2">'+info.icon+' Build: '+esc(info.label)+'</h2>';
        h+='<p class="cmb-desc">Ships as a real fillable PDF — students download it, fill it out, save it, and submit it back. '+(isKnowledge?"Auto-scorable question types get graded with confidence; open-ended ones get flagged for your judgment.":"AI Grader criteria are generated alongside it automatically.")+'</p>';

        // ── Theme picker ─────────────────────────────────────────────────
        h+='<div class="cmb-card"><label class="cmb-label">Page Style</label>';
        h+='<div style="font-size:11px;color:#64748B;margin-bottom:10px;">Controls the PDF\'s banner color.</div>';
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
        h+='</div>';
        if(d.pageStyle==="custom"){
            h+='<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">';
            h+='<label class="cmb-label" style="margin:0;">Primary Color</label>';
            h+='<input type="color" class="cmb-color-input" id="cmb-custom-color" value="'+(d.customColor||"#1e3a5f")+'">';
            h+='</div>';
        }
        h+='</div>';

        // ── Question Mix (Knowledge only) ────────────────────────────────
        if(isKnowledge){
            h+='<div class="cmb-card"><label class="cmb-label">Question Mix</label>';
            KNOWLEDGE_QTYPES.forEach(function(t){
                h+='<div class="cmb-qmix-row"><span class="qlabel">'+t[1]+'</span><div class="qcount">';
                h+='<button data-qtype="'+t[0]+'" data-dir="down">-</button><span>'+(d.typeCounts[t[0]]||0)+'</span><button data-qtype="'+t[0]+'" data-dir="up">+</button>';
                h+='</div></div>';
            });
            h+='<div style="font-size:11px;color:#94A3B8;margin-top:8px;">Multiple Choice, True/False, Matching, Ordering, Fill-in-the-Blank, Labeling, and Calculation are auto-scored with confidence. Short Answer and Scenario need your judgment — the AI Grader will show you a model answer for reference.</div>';
            h+='</div>';
        }

        // ── Points / Due Date ─────────────────────────────────────────────
        h+='<div style="display:flex;gap:10px;">';
        h+='<div class="cmb-card" style="flex:1;"><label class="cmb-label">Points</label><input type="text" class="cmb-input" id="cmb-pa-pts" value="'+esc(d.pointValue||"")+'" placeholder="100"></div>';
        h+='<div class="cmb-card" style="flex:1;"><label class="cmb-label">Due Date</label><input type="text" class="cmb-input" id="cmb-pa-due" value="'+esc(d.dueDate||"")+'" placeholder="e.g. Friday 11:59pm"></div>';
        h+='</div>';

        // ── Reference Image ───────────────────────────────────────────────
        h+='<div class="cmb-card"><label class="cmb-label">Reference Image (optional)</label>';
        h+='<div style="font-size:12px;color:#64748B;margin-bottom:8px;">For assignments that need students to look at a real diagram, blueprint, or photo (e.g. Blueprint/Diagram, or a Knowledge labeling question) — '+(item.type==="blueprint"?"<strong>required for this type</strong>. ":"")+'<strong>uploading your own is strongly preferred and most accurate</strong>; AI keyword search below is a fallback, not guaranteed to match a real technical diagram.</div>';
        h+='<div class="cmb-file-row"><input type="file" id="cmb-pa-img" accept="image/png,image/jpeg" style="font-size:12px;">';
        if(d.referenceImageName) h+='<div class="cmb-file-chip">'+esc(d.referenceImageName)+' <span class="x" id="cmb-pa-img-rm">&times;</span></div>';
        h+='</div>';
        h+='<div style="margin-top:8px;"><label class="cmb-label" style="font-size:11px;">Fallback AI search keyword (used only if no image is uploaded)</label>';
        h+='<input type="text" class="cmb-input" id="cmb-pa-imgkw" value="'+esc(d.imageKeyword||"")+'" placeholder="e.g. residential electrical panel"></div>';
        h+='</div>';

        // ── Source material ───────────────────────────────────────────────
        h+='<div class="cmb-card"><label class="cmb-label">Source Material</label>';
        h+='<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Describe the topic or paste notes — the assignment is grounded in this material.</div>';
        h+='<div class="cmb-file-row"><input type="file" id="cmb-pa-file" accept=".pdf,.docx,.pptx,.txt" style="font-size:12px;">';
        if(d.uploadedName) h+='<div class="cmb-file-chip">'+esc(d.uploadedName)+' <span class="x" id="cmb-pa-rmfile">&times;</span></div>';
        h+='</div><textarea class="cmb-textarea" id="cmb-pa-text" rows="4" placeholder="Paste content for the assignment to be based on...">'+esc(d.textContent||"")+'</textarea>';
        if(curMod()&&curMod().sources.length){
            h+='<div style="margin-top:8px;font-size:12px;color:#059669;">✓ Module source material will also be used.</div>';
        }
        h+='</div>';

        h+='<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" id="cmb-pa-gen">✨ Generate '+esc(info.label)+'</button></div>';
        container.innerHTML=h;

        container.querySelectorAll(".cmb-theme-swatch").forEach(function(sc){
            sc.addEventListener("click",function(){d.pageStyle=sc.dataset.style;render();});
        });
        var cc=container.querySelector("#cmb-custom-color");
        if(cc) cc.addEventListener("input",function(e){d.customColor=e.target.value;});

        container.querySelectorAll(".cmb-qmix-row button").forEach(function(btn){
            btn.addEventListener("click",function(){
                var qt=btn.dataset.qtype,dir=btn.dataset.dir;
                d.typeCounts[qt]=Math.max(0,(d.typeCounts[qt]||0)+(dir==="up"?1:-1));
                render();
            });
        });

        container.querySelector("#cmb-pa-pts").addEventListener("input",function(e){d.pointValue=e.target.value;});
        container.querySelector("#cmb-pa-due").addEventListener("input",function(e){d.dueDate=e.target.value;});

        container.querySelector("#cmb-pa-img").addEventListener("change",function(e){
            if(!e.target.files.length) return;
            var f=e.target.files[0];
            var reader=new FileReader();
            reader.onload=function(ev){
                var dataUrl=ev.target.result;
                var m=/^data:image\/(png|jpe?g);base64,(.*)$/.exec(dataUrl);
                if(!m){ state.status="Only PNG/JPEG images are supported"; state.statusType="error"; renderStatus(overlayEl.querySelector("#cmb-panel")); return; }
                d.referenceImageData=m[2];
                d.referenceImageType=m[1]==="png"?"png":"jpg";
                d.referenceImageName=f.name;
                d.referenceImageSource="upload";
                d.referenceImageAttribution="";
                render();
            };
            reader.readAsDataURL(f);
        });
        var rmImg=container.querySelector("#cmb-pa-img-rm");
        if(rmImg) rmImg.addEventListener("click",function(){
            d.referenceImageData="";d.referenceImageType="";d.referenceImageName="";d.referenceImageSource="";d.referenceImageAttribution="";
            render();
        });
        container.querySelector("#cmb-pa-imgkw").addEventListener("input",function(e){d.imageKeyword=e.target.value;});

        container.querySelector("#cmb-pa-text").addEventListener("input",function(e){d.textContent=e.target.value;});
        container.querySelector("#cmb-pa-file").addEventListener("change",async function(e){
            if(!e.target.files.length)return;
            var f=e.target.files[0];
            try{
                state.status="Parsing "+f.name+"...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
                d.uploadedFile=await parseFile(f);d.uploadedName=f.name;
                state.status="File loaded: "+f.name;state.statusType="success";render();
            }catch(err){state.status="Error: "+err.message;state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));}
        });
        var rmf=container.querySelector("#cmb-pa-rmfile");
        if(rmf) rmf.addEventListener("click",function(){d.uploadedFile="";d.uploadedName="";render();});

        container.querySelector("#cmb-pa-gen").addEventListener("click",async function(){
            if(!state.apiKey){state.status="Enter API key first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            if(isKnowledge){
                var total=Object.values(d.typeCounts).reduce(function(s,v){return s+v;},0);
                if(!total){state.status="Add at least one question type";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            }
            if(!d.textContent&&!d.uploadedFile&&!(curMod()&&curMod().sources.length)){state.status="Add some source material first";state.statusType="error";renderStatus(overlayEl.querySelector("#cmb-panel"));return;}
            state.status="Generating...";state.statusType="loading";renderStatus(overlayEl.querySelector("#cmb-panel"));
            var btn=container.querySelector("#cmb-pa-gen");btn.disabled=true;btn.textContent="Generating...";
            try{
                if(!d.referenceImageData && d.imageKeyword && d.imageKeyword.trim()){
                    try{
                        var photo=await unsplashSearch(d.imageKeyword.trim());
                        var img=await fetchImageBytes(photo.url);
                        d.referenceImageData=uint8ToBase64(img.bytes);
                        d.referenceImageType=img.type;
                        d.referenceImageSource="unsplash";
                        d.referenceImageAttribution=photo.name;
                        triggerUnsplashDownload(photo.downloadLocation);
                    }catch(imgErr){ /* not fatal — proceed without an image */ }
                }
                if(isKnowledge){
                    var raw=await callClaude(buildKnowledgeAnswerKeyPrompt(d),contentModel(d),TOKENS_LONG);
                    var cleaned=raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
                    var s=cleaned.indexOf("{"), e=cleaned.lastIndexOf("}");
                    if(s===-1||e===-1) throw new Error("Could not find JSON in response");
                    var parsed=JSON.parse(cleaned.slice(s,e+1));
                    if(!parsed.questions||!parsed.questions.length) throw new Error("No questions returned");
                    d.generatedAnswerKey=parsed;
                    d.generatedPdfSchema=knowledgeAnswerKeyToPdfSchema(parsed,d);
                }else{
                    var raw2=await callClaude(buildAssignmentPdfPrompt(d,item.type),contentModel(d),TOKENS_LONG);
                    var cleaned2=raw2.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
                    var s2=cleaned2.indexOf("{"), e2=cleaned2.lastIndexOf("}");
                    if(s2===-1||e2===-1) throw new Error("Could not find JSON in response");
                    var parsedSchema=JSON.parse(cleaned2.slice(s2,e2+1));
                    d.generatedAnswerKey=null;
                    d.generatedPdfSchema=sanitizeAssignmentSchema(parsedSchema);
                }
                d.subView="result";
                state.status=info.label+" generated!";state.statusType="success";render();
            }catch(err){
                state.status="Error: "+err.message;state.statusType="error";
                btn.disabled=false;btn.textContent="✨ Generate "+esc(info.label);
                renderStatus(overlayEl.querySelector("#cmb-panel"));
            }
        });
    }

    // Previews the ACTUAL rendered PDF (not a separate HTML mock) so what
    // the teacher reviews here is exactly what students will download —
    // rendered locally via renderAssignmentPdf and shown as a blob: URL,
    // nothing uploaded to Canvas yet at this point.
    function renderPdfAssignmentResult(container,item,d){
        if(d._pdfPreviewUrl){ try{ URL.revokeObjectURL(d._pdfPreviewUrl); }catch(e){} d._pdfPreviewUrl=null; }
        var info=ITEM_TYPES[item.type]||{label:"Assignment",icon:"?"};
        var h='<h2 class="cmb-h2">'+info.icon+' '+esc(info.label)+' - Result</h2>';
        h+='<p class="cmb-desc">This is the actual fillable PDF students will download, fill out, and submit — locked instructions, only the highlighted boxes are editable.</p>';
        h+='<div id="cmb-pa-preview" style="border:1px solid #e5e7eb;border-radius:8px;min-height:500px;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:13px;">Rendering preview…</div>';
        h+='<div class="cmb-btn-row">';
        h+='<button class="cmb-btn cmb-btn-ai" id="cmb-pa-regen">Regenerate</button>';
        h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-pa-back">Back to Settings</button>';
        h+='</div>';
        container.innerHTML=h;
        var wrap=container.querySelector("#cmb-pa-preview");
        renderAssignmentPdf(d.generatedPdfSchema, d).then(function(bytes){
            var blob=new Blob([bytes],{type:"application/pdf"});
            var url=URL.createObjectURL(blob);
            d._pdfPreviewUrl=url;
            wrap.style.minHeight="";
            wrap.innerHTML='<iframe src="'+url+'" style="width:100%;height:600px;border:none;border-radius:8px;"></iframe>';
        }).catch(function(err){
            wrap.textContent="Could not render preview: "+err.message;
        });
        container.querySelector("#cmb-pa-regen").addEventListener("click",function(){d.subView="build";render();});
        container.querySelector("#cmb-pa-back").addEventListener("click",function(){d.subView="build";render();});
    }

    function renderContentResult(container,item,d){
        var info=ITEM_TYPES[item.type]||{label:"Page",icon:"?"};
        var h='<h2 class="cmb-h2">'+info.icon+' '+esc(info.label)+' - Result</h2>';
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
                else{showCodeTab(contentDiv,d);}
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
        container.innerHTML='<iframe class="cmb-preview-frame" id="cmb-pframe" sandbox=""></iframe>';
        var frame=container.querySelector("#cmb-pframe");
        frame.srcdoc='<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:16px;font-family:Georgia,serif;">'+html+'</body></html>';
    }

    function showCodeTab(container,itemData){
        container.innerHTML='<textarea class="cmb-code-area" aria-label="Editable generated HTML">'+esc(itemData.generatedHTML)+'</textarea>';
        container.querySelector(".cmb-code-area").addEventListener("input",function(e){itemData.generatedHTML=e.target.value;});
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
                var done=isItemBuilt(it,d);
                if(done)modReady++;
                var modeTag=(d.longContent&&done)?' <span style="font-size:10px;background:#EDE9FE;color:#6D28D9;padding:1px 5px;border-radius:3px;">LONG</span>':'';
                h+='<div class="cmb-insert-item"><span class="icon">'+info.icon+'</span>';
                h+='<span style="flex:1;">'+esc(canvasItemTitle(it,d,i))+modeTag+'</span>';
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
        h+='<li>It creates all <strong>pages, assignments, and discussions</strong> with full content.</li>';
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

    // ========== QUIZ BUILDER ==========
    // Ported from Canvas Enhancer's Content Studio Quiz Maker: topic-driven AI
    // generation of question groups (each with N interchangeable variants for
    // randomization), a review/select workflow, and a queue that exports
    // straight into Canvas as a Classic Quiz or a New Quiz (LTI). Uses the
    // module's own callClaude()/canvasAPI() BYOK plumbing instead of Canvas
    // Enhancer's licensed backend.
    function openQuizBuilder(module){
        if(document.getElementById("cmb-quiz-overlay")) return;
        var canvasModuleId = getCanvasModuleId(module);
        var canvasModuleName = getCanvasModuleName(module);

        var qst = {
            topic:"", subject:"general", difficulty:"medium",
            typeCounts:{ mc:5, tf:3, short:2, essay:0 },
            includeExplanations:true,
            variantsPerQ:1,
            textContent:"", uploadedFile:"", uploadedName:"",
            groups:[], checked:[], queue:[],
            quizTitle:"Quiz", engine:"classic"
        };
        var activeVariant = [];
        var allSelected = false;

        var TYPE_LABELS={mc:"Multiple Choice",tf:"True / False",short:"Short Answer",essay:"Essay"};
        var TYPE_BADGE={mc:"background:#EDE9FE;color:#6D28D9",tf:"background:#F0FDF4;color:#166534",short:"background:#FEF3C7;color:#92400E",essay:"background:#F1F5F9;color:#475569"};

        var overlay = document.createElement("div");
        overlay.id = "cmb-quiz-overlay";
        overlay.innerHTML =
            '<div id="cmb-quiz-panel">' +
              '<div class="cmb-topbar"><div><h1>\u{1F9E9} Quiz Builder</h1><div class="cmb-topbar-sub">'+esc(canvasModuleName)+'</div></div><button class="cmb-close" id="cmb-quiz-close">Close</button></div>' +
              '<div class="cmb-qb-cols">' +
                '<div class="cmb-qb-col left"><div class="cmb-qb-colhdr">Builder</div><div class="cmb-qb-colbody" id="cmb-qb-left"></div></div>' +
                '<div class="cmb-qb-col mid"><div class="cmb-qb-colhdr">Questions<button class="cmb-qb-selall" id="cmb-qb-selall" style="display:none;">Select all</button></div><div class="cmb-qb-colbody" id="cmb-qb-mid"><div class="cmb-qb-empty">Generate questions on the left<br>to review and select them here.</div></div></div>' +
                '<div class="cmb-qb-col right"><div class="cmb-qb-colhdr">Quiz <span id="cmb-qb-count" style="background:#E2E8F0;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700;margin-left:6px;color:#1E293B;">0</span></div><div class="cmb-qb-colbody" id="cmb-qb-right"></div></div>' +
              '</div>' +
              '<div class="cmb-status" id="cmb-quiz-status" style="display:none;"></div>' +
            '</div>';
        document.body.appendChild(overlay);

        function close(){ overlay.remove(); }
        overlay.querySelector("#cmb-quiz-close").addEventListener("click", close);
        overlay.addEventListener("click", function(e){ if(e.target === overlay) close(); });

        function setStatus(msg, type){
            var el = overlay.querySelector("#cmb-quiz-status");
            el.style.display = "block";
            var colors = {success:"#166534",error:"#b91c1c",loading:"#1d4ed8"};
            var bgs = {success:"#f0fdf4",error:"#fef2f2",loading:"#eff6ff"};
            el.style.color = colors[type] || "#6b7280";
            el.style.background = bgs[type] || "#f9fafb";
            el.textContent = msg;
        }

        var left = overlay.querySelector("#cmb-qb-left");
        var mid = overlay.querySelector("#cmb-qb-mid");
        var right = overlay.querySelector("#cmb-qb-right");
        var selAllBtn = overlay.querySelector("#cmb-qb-selall");
        var countBadge = overlay.querySelector("#cmb-qb-count");

        // ── LEFT: settings ──
        function renderLeft(){
            var lh = '';
            lh += '<div class="cmb-card"><label class="cmb-label">Topic</label><textarea class="cmb-textarea" id="cmb-qb-topic" rows="3" placeholder="e.g. The American Civil War">'+esc(qst.topic)+'</textarea></div>';
            lh += '<div class="cmb-card"><label class="cmb-label">Source Material (optional)</label>';
            lh += '<div class="cmb-file-row"><input type="file" id="cmb-qb-file" accept=".pdf,.docx,.pptx,.txt" style="font-size:12px;">';
            if(qst.uploadedName){ lh += '<div class="cmb-file-chip">'+esc(qst.uploadedName)+' <span class="x" id="cmb-qb-rmfile">&times;</span></div>'; }
            lh += '</div><textarea class="cmb-textarea" id="cmb-qb-content" rows="3" placeholder="Or paste content to base questions on...">'+esc(qst.textContent)+'</textarea></div>';
            lh += '<div class="cmb-card"><label class="cmb-label">Settings</label>';
            lh += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">';
            lh += '<div><div style="font-size:12px;color:#64748B;margin-bottom:4px;">Subject</div><select class="cmb-select" id="cmb-qb-subject">';
            [["general","General / Any"],["math","Mathematics"],["science","Science"],["history","History / Social Studies"],["english","English / Language Arts"],["foreign_lang","Foreign Language"],["cs","Computer Science"],["other","Other"]].forEach(function(o){
                lh += '<option value="'+o[0]+'"'+(o[0]===qst.subject?' selected':'')+'>'+o[1]+'</option>';
            });
            lh += '</select></div>';
            lh += '<div><div style="font-size:12px;color:#64748B;margin-bottom:4px;">Difficulty</div><select class="cmb-select" id="cmb-qb-difficulty">';
            [["easy","Easy"],["medium","Medium"],["hard","Hard"],["mixed","Mixed"]].forEach(function(o){
                lh += '<option value="'+o[0]+'"'+(o[0]===qst.difficulty?' selected':'')+'>'+o[1]+'</option>';
            });
            lh += '</select></div></div>';
            lh += '<div style="margin-bottom:8px;"><div style="font-size:12px;color:#64748B;margin-bottom:4px;">Variants per question</div><select class="cmb-select" id="cmb-qb-variants">';
            [["1","1 — unique questions"],["2","2 — pairs (A & B)"],["3","3 — triplets (A, B & C)"]].forEach(function(o){
                lh += '<option value="'+o[0]+'"'+(o[0]===String(qst.variantsPerQ)?' selected':'')+'>'+o[1]+'</option>';
            });
            lh += '</select></div>';
            lh += '<div class="cmb-el-grid">';
            lh += '<div class="cmb-el-toggle'+(qst.includeExplanations?' on':'')+'" id="cmb-qb-expl-toggle"><span class="dot"></span>Explanations</div>';
            lh += '</div></div>';
            lh += '<div class="cmb-card"><label class="cmb-label">Question Types</label>';
            [["mc","Multiple Choice"],["tf","True / False"],["short","Short Answer"],["essay","Essay"]].forEach(function(t){
                lh += '<div class="cmb-qmix-row"><span class="qlabel">'+t[1]+'</span><div class="qcount">';
                lh += '<button data-qtype="'+t[0]+'" data-dir="down">-</button><span id="cmb-qb-count-'+t[0]+'">'+qst.typeCounts[t[0]]+'</span><button data-qtype="'+t[0]+'" data-dir="up">+</button>';
                lh += '</div></div>';
            });
            lh += '<div style="margin-top:8px;font-size:11px;color:#64748B;text-align:right;" id="cmb-qb-total">Total: '+Object.values(qst.typeCounts).reduce(function(s,v){return s+v;},0)+' questions</div>';
            lh += '</div>';
            lh += '<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" style="width:100%;justify-content:center;" id="cmb-qb-gen">✨ Generate Questions</button></div>';
            left.innerHTML = lh;

            left.querySelector("#cmb-qb-topic").addEventListener("input", function(e){ qst.topic = e.target.value; });
            left.querySelector("#cmb-qb-content").addEventListener("input", function(e){ qst.textContent = e.target.value; });
            left.querySelector("#cmb-qb-file").addEventListener("change", async function(e){
                if(!e.target.files.length) return;
                var f = e.target.files[0];
                try{
                    setStatus("Parsing "+f.name+"...", "loading");
                    qst.uploadedFile = await parseFile(f);
                    qst.uploadedName = f.name;
                    setStatus("File loaded: "+f.name, "success");
                    renderLeft();
                }catch(err){ setStatus("Error: "+err.message, "error"); }
            });
            var rmFileBtn = left.querySelector("#cmb-qb-rmfile");
            if(rmFileBtn) rmFileBtn.addEventListener("click", function(){ qst.uploadedFile=""; qst.uploadedName=""; renderLeft(); });
            left.querySelector("#cmb-qb-subject").addEventListener("change", function(e){ qst.subject = e.target.value; });
            left.querySelector("#cmb-qb-difficulty").addEventListener("change", function(e){ qst.difficulty = e.target.value; });
            left.querySelector("#cmb-qb-variants").addEventListener("change", function(e){ qst.variantsPerQ = parseInt(e.target.value, 10); });
            left.querySelector("#cmb-qb-expl-toggle").addEventListener("click", function(){
                qst.includeExplanations = !qst.includeExplanations;
                this.classList.toggle("on", qst.includeExplanations);
            });
            left.querySelectorAll(".cmb-qmix-row button").forEach(function(btn){
                btn.addEventListener("click", function(){
                    var qt = btn.dataset.qtype, dir = btn.dataset.dir;
                    qst.typeCounts[qt] = Math.max(0, qst.typeCounts[qt] + (dir === "up" ? 1 : -1));
                    left.querySelector("#cmb-qb-count-"+qt).textContent = qst.typeCounts[qt];
                    left.querySelector("#cmb-qb-total").textContent = "Total: " + Object.values(qst.typeCounts).reduce(function(s,v){return s+v;},0) + " questions";
                });
            });
            left.querySelector("#cmb-qb-gen").addEventListener("click", generateQuestions);
        }
        renderLeft();

        // ── MID: question review/select ──
        function renderQuestions(){
            if(!qst.groups.length){ mid.innerHTML = '<div class="cmb-qb-empty">Generate questions on the left<br>to review and select them here.</div>'; selAllBtn.style.display = "none"; return; }
            selAllBtn.style.display = "inline-block";
            var totalQ = qst.groups.reduce(function(s,g){return s+g.variants.length;},0);
            var h = '<div style="font-size:12px;color:#64748B;margin-bottom:12px;">'+qst.groups.length+' group'+(qst.groups.length!==1?'s':'')+' · '+totalQ+' total question'+(totalQ!==1?'s':'')+'</div>';
            qst.groups.forEach(function(g, gi){
                if(activeVariant[gi] === undefined) activeVariant[gi] = 0;
                var sel = !!qst.checked[gi];
                var firstQ = g.variants[0] || {};
                var bc = TYPE_BADGE[firstQ.type] || TYPE_BADGE.mc;
                h += '<div class="cmb-qb-gcard'+(sel?' sel':'')+'" data-gi="'+gi+'">';
                h += '<div class="cmb-qb-ghdr"><div class="cmb-qb-cbox">'+(sel?'✓':'')+'</div>';
                h += '<div class="cmb-qb-gtitle">Group '+(gi+1)+(g.concept?' — '+esc(g.concept):'')+'</div>';
                h += '<span class="cmb-qb-badge" style="'+bc+'">'+(TYPE_LABELS[firstQ.type]||'?')+'</span></div>';
                if(g.variants.length > 1){
                    h += '<div class="cmb-qb-vtabs">';
                    g.variants.forEach(function(v, vi){
                        h += '<button type="button" class="cmb-qb-vtab'+(activeVariant[gi]===vi?' active':'')+'" data-gi="'+gi+'" data-vi="'+vi+'">Version '+String.fromCharCode(65+vi)+'</button>';
                    });
                    h += '</div>';
                }
                var q = g.variants[activeVariant[gi]] || g.variants[0] || {};
                h += '<div class="cmb-qb-vbody">'+esc(q.text||'');
                if(q.type === "mc" && q.choices && q.choices.length){
                    q.choices.forEach(function(c){
                        h += '<div class="cmb-qb-ans'+(c.correct?' correct':'')+'"><strong>'+esc(c.label)+'.</strong> '+esc(c.text)+'</div>';
                    });
                } else if(q.type === "tf"){
                    var isTrue = q.answer === true || q.answer === "true";
                    h += '<div class="cmb-qb-ans correct" style="display:inline-block;">Answer: '+(isTrue?'True':'False')+'</div>';
                } else if(q.type === "short"){
                    h += '<div class="cmb-qb-ans correct" style="display:inline-block;">Answer: '+esc(q.answer||'')+'</div>';
                } else {
                    h += '<div class="cmb-qb-ans" style="display:inline-block;">Manually graded</div>';
                }
                if(qst.includeExplanations && q.explanation){ h += '<div class="cmb-qb-expl">\u{1F4A1} '+esc(q.explanation)+'</div>'; }
                h += '</div></div>';
            });
            mid.innerHTML = h;
            mid.querySelectorAll(".cmb-qb-gcard").forEach(function(card){
                card.addEventListener("click", function(e){
                    if(e.target.closest(".cmb-qb-vtab")) return;
                    var gi = parseInt(card.dataset.gi, 10);
                    qst.checked[gi] = !qst.checked[gi];
                    updateAddBtn(); renderQuestions();
                });
            });
            mid.querySelectorAll(".cmb-qb-vtab").forEach(function(tab){
                tab.addEventListener("click", function(e){
                    e.stopPropagation();
                    activeVariant[parseInt(tab.dataset.gi,10)] = parseInt(tab.dataset.vi,10);
                    renderQuestions();
                });
            });
        }
        selAllBtn.addEventListener("click", function(){
            allSelected = !allSelected;
            qst.checked = qst.groups.map(function(){ return allSelected; });
            selAllBtn.textContent = allSelected ? "Deselect all" : "Select all";
            updateAddBtn(); renderQuestions();
        });

        // ── RIGHT: quiz queue + export ──
        var rh = '';
        rh += '<div class="cmb-card"><label class="cmb-label">Quiz Title</label><input type="text" class="cmb-input" id="cmb-qb-title" value="'+esc(qst.quizTitle)+'"></div>';
        rh += '<div class="cmb-card"><label class="cmb-label">Quiz Engine</label><select class="cmb-select" id="cmb-qb-engine">';
        rh += '<option value="classic"'+(qst.engine==='classic'?' selected':'')+'>Classic Quizzes</option>';
        rh += '<option value="new"'+(qst.engine==='new'?' selected':'')+'>New Quizzes (LTI)</option>';
        rh += '</select></div>';
        rh += '<button class="cmb-btn cmb-btn-secondary" style="width:100%;justify-content:center;margin-bottom:12px;" id="cmb-qb-addsel" disabled>+ Add Selected to Quiz</button>';
        rh += '<div id="cmb-qb-queue"></div>';
        rh += '<div id="cmb-qb-export" style="display:none;margin-top:12px;">';
        rh += '<button class="cmb-btn cmb-btn-success" style="width:100%;justify-content:center;" id="cmb-qb-create">✓ Create Quiz in Canvas</button>';
        rh += '<div id="cmb-qb-export-status"></div>';
        rh += '<button class="cmb-btn cmb-btn-secondary" style="width:100%;justify-content:center;margin-top:6px;" id="cmb-qb-clear">Clear all questions</button>';
        rh += '</div>';
        right.innerHTML = rh;

        var addSelBtn = right.querySelector("#cmb-qb-addsel");
        var queueEl = right.querySelector("#cmb-qb-queue");
        var exportEl = right.querySelector("#cmb-qb-export");
        var exportStatusEl = right.querySelector("#cmb-qb-export-status");

        right.querySelector("#cmb-qb-title").addEventListener("input", function(e){ qst.quizTitle = e.target.value; });
        right.querySelector("#cmb-qb-engine").addEventListener("change", function(e){ qst.engine = e.target.value; });

        function updateAddBtn(){
            var n = qst.checked.filter(Boolean).length;
            addSelBtn.disabled = n === 0;
            addSelBtn.textContent = n > 0 ? ("+ Add " + n + " Group" + (n!==1?'s':'') + " to Quiz") : "+ Add Selected to Quiz";
        }

        function renderQueue(){
            countBadge.textContent = qst.queue.length;
            if(!qst.queue.length){
                queueEl.innerHTML = '<div style="text-align:center;padding:20px 8px;color:#94A3B8;font-size:12px;line-height:1.8;">No questions yet.<br>Select questions in the middle column<br>and click <strong>Add Selected</strong>.</div>';
                exportEl.style.display = "none";
                return;
            }
            exportEl.style.display = "block";
            var totalQ = qst.queue.reduce(function(s,g){return s+g.variants.length;},0);
            var h = '<div style="font-size:11px;color:#94A3B8;margin-bottom:8px;">'+qst.queue.length+' groups · '+totalQ+' total questions</div>';
            var TYPE_SHORT={mc:'MC',tf:'T/F',short:'SA',essay:'Essay'};
            qst.queue.forEach(function(g, i){
                var firstQ = g.variants[0] || {};
                var bc = TYPE_BADGE[firstQ.type] || TYPE_BADGE.mc;
                var label = (g.concept || firstQ.text || "").slice(0, 50);
                h += '<div class="cmb-qb-queue-item"><span style="font-weight:700;color:#94A3B8;min-width:16px;">'+(i+1)+'.</span>';
                h += '<span class="cmb-qb-badge" style="'+bc+'">'+(TYPE_SHORT[firstQ.type]||'?')+'</span>';
                h += '<span style="flex:1;">'+esc(label)+'</span>';
                h += '<button type="button" class="rm" data-i="'+i+'">✕</button></div>';
            });
            queueEl.innerHTML = h;
            queueEl.querySelectorAll(".rm").forEach(function(btn){
                btn.addEventListener("click", function(){ qst.queue.splice(parseInt(btn.dataset.i,10), 1); renderQueue(); });
            });
        }
        renderQueue();

        addSelBtn.addEventListener("click", function(){
            var toAdd = qst.groups.filter(function(_,i){ return qst.checked[i]; });
            if(!toAdd.length) return;
            qst.queue.push.apply(qst.queue, toAdd);
            qst.checked = qst.groups.map(function(){ return false; });
            allSelected = false; selAllBtn.textContent = "Select all";
            updateAddBtn(); renderQuestions(); renderQueue();
        });
        right.querySelector("#cmb-qb-clear").addEventListener("click", function(){ qst.queue = []; renderQueue(); });

        // ── GENERATE ──
        function generateQuestions(){
            var hasSource = !!(qst.textContent.trim() || qst.uploadedFile);
            if(!qst.topic.trim() && !hasSource){ setStatus("Enter a topic or add source material first.", "error"); return; }
            var totalQ = Object.values(qst.typeCounts).reduce(function(s,v){return s+v;},0);
            if(!totalQ){ setStatus("Set at least one question type count above zero.", "error"); return; }
            var genBtn = left.querySelector("#cmb-qb-gen");
            genBtn.disabled = true; genBtn.textContent = "Generating…";
            setStatus("Generating " + (totalQ * qst.variantsPerQ) + " questions…", "loading");

            var typeLabels={mc:'Multiple Choice (4 options A–D, exactly one correct)',tf:'True/False (answer is boolean)',short:'Short Answer (single word, number, or short phrase)',essay:'Essay (open-ended, no answer key)'};
            var diffMap={easy:'easy',medium:'medium difficulty',hard:'challenging/hard',mixed:'a mix of easy, medium, and hard'};
            var useGroups = qst.variantsPerQ > 1;
            var typeCountLines = Object.entries(qst.typeCounts).filter(function(e){return e[1]>0;}).map(function(e){return e[1]+' '+typeLabels[e[0]];}).join('\n');
            var qSchema = '{\n      "type": "mc|tf|short|essay",\n      "text": "Question text",\n      "choices": [{"label":"A","text":"option","correct":false},{"label":"B","text":"option","correct":true},{"label":"C","text":"option","correct":false},{"label":"D","text":"option","correct":false}],\n      "answer": null,\n      "answer_alts": [],\n      "explanation": "Why the answer is correct"\n    }';
            var topicDesc = qst.topic.trim() ? ('about: "'+qst.topic.trim()+'"') : 'based on the source material below';
            var sourceBlock = '';
            if(qst.textContent.trim()) sourceBlock += 'SOURCE MATERIAL:\n' + qst.textContent.trim() + '\n\n';
            if(qst.uploadedFile) sourceBlock += 'FILE ('+qst.uploadedName+'):\n' + qst.uploadedFile + '\n\n';
            var prompt;
            if(useGroups){
                prompt = 'You are an expert quiz designer for Canvas LMS. Generate exactly '+totalQ+' question GROUPS '+topicDesc+'\n\n' +
                    'Each group tests the same concept but uses completely different wording, numbers, or scenarios for each variant — designed so different students get equivalent but non-identical questions.\n' +
                    'Subject: '+(qst.subject==='general'?'general':qst.subject)+'\nDifficulty: '+(diffMap[qst.difficulty]||'medium')+'\nVariants per group: '+qst.variantsPerQ+'\nQuestion type breakdown (exact counts):\n'+typeCountLines+'\n'+
                    (qst.includeExplanations?'Include a brief explanation for each correct answer.':'Do not include explanations.')+'\n\n' +
                    sourceBlock +
                    'Return ONLY valid JSON — no markdown, no code fences:\n{\n  "groups": [\n    {\n      "concept": "Concept name under 6 words",\n      "variants": ['+qSchema+','+qSchema+']\n    }\n  ]\n}\n\n' +
                    'Critical rules:\n- Each group must have exactly '+qst.variantsPerQ+' variants\n- All variants in a group must be the same question type\n- mc: exactly 4 choices (A–D), exactly one correct:true\n- tf: answer must be boolean true or false\n- short: answer is a string; include answer_alts for alternate forms\n- essay: answer is null\n- Match the exact question type counts listed above\n- Total groups: exactly '+totalQ;
            } else {
                prompt = 'You are an expert quiz designer for Canvas LMS. Generate questions '+topicDesc+'\n\n' +
                    'Subject: '+(qst.subject==='general'?'general':qst.subject)+'\nDifficulty: '+(diffMap[qst.difficulty]||'medium')+'\nQuestion type breakdown (exact counts):\n'+typeCountLines+'\n'+
                    (qst.includeExplanations?'Include a brief explanation for each correct answer.':'Do not include explanations.')+'\n\n' +
                    sourceBlock +
                    'Return ONLY valid JSON — no markdown, no code fences:\n{ "questions": ['+qSchema+'] }\n\n' +
                    'Critical rules:\n- mc: exactly 4 choices (A–D), exactly one correct:true\n- tf: answer must be boolean true or false\n- short: answer is a string; include answer_alts for alternate forms\n- essay: answer is null\n- Match the exact question type counts listed above\n- Total: exactly '+totalQ+' questions';
            }

            callClaude(prompt, AI_MODEL_QUIZ, 12000).then(function(raw){
                genBtn.disabled = false; genBtn.textContent = "✨ Generate Questions";
                raw = (raw||'').replace(/```json\s*/gi,'').replace(/```/g,'').trim();
                var s = raw.indexOf('{'), e = raw.lastIndexOf('}');
                if(s === -1 || e === -1){ setStatus("Could not find JSON in response", "error"); return; }
                try{
                    var parsed = JSON.parse(raw.slice(s, e+1));
                    if(parsed.groups && parsed.groups.length){
                        qst.groups = parsed.groups;
                    } else if(parsed.questions && parsed.questions.length){
                        qst.groups = parsed.questions.map(function(q){ return { concept: (q.text||'').slice(0,50), variants:[q] }; });
                    } else {
                        setStatus("No questions returned", "error"); return;
                    }
                    qst.checked = qst.groups.map(function(){ return false; });
                    allSelected = false; selAllBtn.textContent = "Select all";
                    activeVariant.length = 0;
                    renderQuestions();
                    var totalGen = qst.groups.reduce(function(s,g){return s+g.variants.length;},0);
                    setStatus(qst.groups.length+" group"+(qst.groups.length!==1?'s':'')+" ("+totalGen+" questions) generated — select to add.", "success");
                }catch(err){ setStatus("Parse error: "+err.message, "error"); }
            }).catch(function(err){
                genBtn.disabled = false; genBtn.textContent = "✨ Generate Questions";
                setStatus(err.message || "Error generating questions — try again", "error");
            });
        }

        // ── CREATE QUIZ IN CANVAS ──
        function showExportStatus(msg, type){
            var colors = {error:'color:#991b1b;background:#fef2f2;border:1px solid #fca5a5', success:'color:#166534;background:#f0fdf4;border:1px solid #86efac', loading:'color:#1e40af;background:#eff6ff;border:1px solid #93c5fd'};
            exportStatusEl.innerHTML = '<div style="padding:8px 12px;border-radius:6px;font-size:12px;margin-top:8px;line-height:1.5;'+(colors[type]||colors.loading)+'">'+msg+'</div>';
        }

        function buildClassicQuestion(q, pos, groupId){
            var TYPE_MAP={mc:'multiple_choice_question',tf:'true_false_question',short:'short_answer_question',essay:'essay_question'};
            var body = { question_name:'Q'+pos, question_text: esc(q.text||''), question_type: TYPE_MAP[q.type]||'short_answer_question', points_possible: q.type==='essay'?5:1, position: pos };
            if(groupId) body.quiz_group_id = groupId;
            if(q.type === 'mc'){ body.answers = (q.choices||[]).map(function(c){ return { answer_text:c.text, answer_weight:c.correct?100:0, answer_comments:(c.correct&&q.explanation)?q.explanation:'' }; }); }
            else if(q.type === 'tf'){ var isTrue = q.answer===true||q.answer==='true'; body.answers=[{answer_text:'True',answer_weight:isTrue?100:0},{answer_text:'False',answer_weight:isTrue?0:100}]; }
            else if(q.type === 'short'){ var alts=[q.answer].concat(q.answer_alts||[]).filter(function(a){return a!==null&&a!==undefined&&a!=='';}); body.answers=alts.map(function(a){return {answer_text:String(a),answer_weight:100};}); }
            return body;
        }

        async function createClassicQuiz(){
            var totalQ = qst.queue.reduce(function(s,g){return s+g.variants.length;},0);
            showExportStatus("Creating quiz…", "loading");
            var quiz = await canvasAPI("POST", "/quizzes", { quiz:{ title: qst.quizTitle||"Quiz", quiz_type:"assignment", published:false, show_correct_answers:true } });
            var qid = quiz.id;
            showExportStatus("Quiz created — adding "+totalQ+" questions…", "loading");
            var pos = 1;
            for(var gi=0; gi<qst.queue.length; gi++){
                var g = qst.queue[gi];
                var useGroup = g.variants.length > 1;
                var groupId = null;
                if(useGroup){
                    var grpResp = await canvasAPI("POST", "/quizzes/"+qid+"/groups", { quiz_groups:[{ name: g.concept||("Group "+(gi+1)), pick_count:1, question_points:1 }] });
                    groupId = (grpResp && grpResp.quiz_groups && grpResp.quiz_groups[0]) ? grpResp.quiz_groups[0].id : null;
                }
                for(var vi=0; vi<g.variants.length; vi++){
                    await canvasAPI("POST", "/quizzes/"+qid+"/questions", { question: buildClassicQuestion(g.variants[vi], pos++, groupId) });
                }
            }
            if(canvasModuleId) await addModuleItem(canvasModuleId, "Quiz", qid, qst.quizTitle||"Quiz", null);
            var url = window.location.origin + "/courses/" + getCourseId() + "/quizzes/" + qid;
            var note = qst.queue.some(function(g){return g.variants.length>1;}) ? " (groups randomized — each student gets 1 variant per group)" : "";
            showExportStatus("✓ Quiz created"+note+"! <a href=\""+url+"\" target=\"_blank\" style=\"color:#7C3AED;font-weight:600;\">Open in Canvas ↗</a>", "success");
        }

        async function quizLtiAPI(method, path, body){
            var url = window.location.origin + "/api/quiz/v1/courses/" + getCourseId() + path;
            var opts = { method: method, headers:{ "Content-Type":"application/json", "Accept":"application/json", "X-CSRF-Token": getCSRFToken() }, credentials:"same-origin" };
            if(body && (method === "POST" || method === "PUT")) opts.body = JSON.stringify(body);
            var resp = await fetch(url, opts);
            if(!resp.ok){ var errText=""; try{ errText = await resp.text(); }catch(e){} throw new Error("Canvas API error "+resp.status+": "+errText); }
            if(resp.status === 204) return null;
            return resp.json();
        }

        async function createNewQuizLTI(){
            var totalQ = qst.queue.reduce(function(s,g){return s+g.variants.length;},0);
            showExportStatus("Creating New Quiz…", "loading");
            var quiz = await quizLtiAPI("POST", "/quizzes", { quiz:{ title: qst.quizTitle||"Quiz", quiz_type:"practice_quiz" } });
            var qid = quiz.id;
            showExportStatus("Quiz created — adding "+totalQ+" questions…", "loading");
            var typeSlug={mc:'choice',tf:'true_false',short:'short_answer',essay:'essay'};
            function buildItem(q, pos){
                var entry = { entry_type:'Item', position:pos, item_body:'<p>'+esc(q.text||'')+'</p>', interaction_type_slug: typeSlug[q.type]||'short_answer', scoring_data:{ value:q.type==='essay'?5:1 }, answer_feedback:{} };
                if(q.type === 'mc'){
                    entry.interaction_data = { choices:(q.choices||[]).map(function(c,i){ return { id:'c'+i, item_body:'<p>'+esc(c.text||'')+'</p>', position:i+1 }; }) };
                    var ci = (q.choices||[]).findIndex(function(c){return c.correct;});
                    entry.scoring_data.correct_answer = ci>=0 ? [{type:'choice',value:'c'+ci}] : [];
                    entry.scoring_algorithm = 'Equivalence';
                } else if(q.type === 'tf'){
                    entry.interaction_data = { true_choice:{item_body:'<p>True</p>'}, false_choice:{item_body:'<p>False</p>'} };
                    entry.scoring_data.correct_answer = q.answer ? 'true' : 'false';
                    entry.scoring_algorithm = 'Equivalence';
                } else if(q.type === 'short'){
                    entry.interaction_data = {};
                    entry.scoring_data.correct_answer = [q.answer].concat(q.answer_alts||[]).filter(Boolean);
                    entry.scoring_algorithm = 'TextMatch';
                } else {
                    entry.interaction_data = {}; entry.scoring_algorithm = 'None';
                }
                return entry;
            }
            var pos = 1;
            for(var gi=0; gi<qst.queue.length; gi++){
                var g = qst.queue[gi];
                for(var vi=0; vi<g.variants.length; vi++){
                    await quizLtiAPI("POST", "/quizzes/" + qid + "/items", { item: buildItem(g.variants[vi], pos++) });
                }
            }
            var url = window.location.origin + "/courses/" + getCourseId() + "/quizzes/" + qid;
            showExportStatus("✓ Quiz created! <a href=\""+url+"\" target=\"_blank\" style=\"color:#7C3AED;font-weight:600;\">Open in Canvas ↗</a>", "success");
        }

        right.querySelector("#cmb-qb-create").addEventListener("click", async function(){
            if(!qst.queue.length){ showExportStatus("Add questions to the quiz first.", "error"); return; }
            if(!getCourseId()){ showExportStatus("Navigate to a Canvas course first.", "error"); return; }
            var btn = right.querySelector("#cmb-qb-create");
            btn.disabled = true; btn.textContent = "Creating…";
            try{
                if(qst.engine === "classic") await createClassicQuiz(); else await createNewQuizLTI();
                btn.textContent = "✓ Quiz Created";
            }catch(err){
                showExportStatus("Error: "+esc(err.message), "error");
                btn.disabled = false; btn.textContent = "✓ Create Quiz in Canvas";
            }
        });
    }

    function isModulesPage(){
        // Some courses set Modules as their home page, so the URL is just
        // /courses/123 with no "/modules" segment at all — detect the actual
        // modules container in the DOM as a fallback for that case.
        if(/\/courses\/\d+\/modules/.test(window.location.pathname)) return true;
        return !!document.getElementById("context_modules");
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
    // One "AI Builder" button injected into each module's own header toolbar.
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

    // ── MODULE ALERTS ────────────────────────────────────────────────────────
    // Scans the whole course (not just one module — due dates don't respect
    // module boundaries, and a student's missing-work backlog can live in an
    // earlier module) for missing and upcoming work within a rolling date
    // window, then lets the teacher message flagged students. Logic ported
    // from the Canvas Content Studio email tool's proven missing/upcoming
    // detection and Conversations-sending code.

    function getMissingAssignments(submissions, daysBack){
        var cutoff = new Date(Date.now() - daysBack*24*60*60*1000);
        var now = new Date();
        return submissions.filter(function(s){
            if(!s.assignment) return false;
            var due = s.assignment.due_at ? new Date(s.assignment.due_at) : null;
            if(!due || due < cutoff || due > now) return false;
            return s.workflow_state === "unsubmitted" || s.missing;
        });
    }

    function getUpcomingAssignments(assignments, daysForward){
        var now = new Date();
        var future = new Date(now.getTime() + daysForward*24*60*60*1000);
        return assignments.filter(function(a){
            if(!a.due_at) return false;
            var due = new Date(a.due_at);
            return due >= now && due <= future;
        });
    }

    function formatAssignmentList(assignments){
        if(!assignments.length) return "(none)";
        return assignments.map(function(a){
            var due = a.due_at ? new Date(a.due_at).toLocaleDateString() : "No due date";
            return "  - " + (a.name || "Unnamed") + " (Due: " + due + ")";
        }).join("\n");
    }

    // Graded submissions scoring below `threshold` percent, due within the
    // same daysBack window used for missing work.
    function getLowGradeSubmissions(submissions, daysBack, threshold){
        var cutoff = new Date(Date.now() - daysBack*24*60*60*1000);
        var now = new Date();
        return submissions.filter(function(s){
            if(!s.assignment) return false;
            var due = s.assignment.due_at ? new Date(s.assignment.due_at) : null;
            if(!due || due < cutoff || due > now) return false;
            if(s.score === null || s.score === undefined) return false;
            var possible = s.assignment.points_possible;
            if(!possible || possible <= 0) return false;
            return (s.score / possible) * 100 < threshold;
        }).map(function(s){
            return { name: s.assignment.name || "Unnamed", score: s.score, possible: s.assignment.points_possible, pct: Math.round((s.score / s.assignment.points_possible) * 100) };
        });
    }

    function formatLowGradeList(items){
        if(!items.length) return "(none)";
        return items.map(function(g){
            return "  - " + g.name + " (Score: " + g.score + "/" + g.possible + " = " + g.pct + "%)";
        }).join("\n");
    }

    function renderAlertTemplate(template, vars){
        var text = template;
        Object.keys(vars).forEach(function(key){
            text = text.replace(new RegExp("\\{\\{"+key+"\\}\\}", "g"), vars[key] || "");
        });
        return text;
    }

    var DEFAULT_ALERT_SUBJECT = "Checking in on {{courseName}}";
    var DEFAULT_ALERT_BODY = "Hi {{studentName}},\n\nA quick check-in on your work in {{courseName}}.\n\n{{missingSection}}\n\n{{upcomingSection}}\n\n{{lowGradeSection}}\n\nPlease reach out if you have questions or need help getting caught up.\n\nBest,\n{{teacherName}}";

    function openModuleAlerts(){
        if(document.getElementById("cmb-alerts-overlay")) return;
        var courseId = getCourseId();

        var ast = {
            daysBack: 10, daysForward: 10, gradeThreshold: 60,
            students: [], courseName: "", teacherName: "",
            subject: DEFAULT_ALERT_SUBJECT, bodyTemplate: DEFAULT_ALERT_BODY,
            step: "settings"
        };

        var overlay = document.createElement("div");
        overlay.id = "cmb-alerts-overlay";
        overlay.innerHTML =
            '<div id="cmb-alerts-panel">' +
              '<div class="cmb-topbar"><div><h1>📊 Course Alerts</h1><div class="cmb-topbar-sub">Missing work, low grades &amp; upcoming due dates</div></div><button class="cmb-close" id="cmb-alerts-close">Close</button></div>' +
              '<div class="cmb-alerts-body" id="cmb-alerts-body"></div>' +
              '<div class="cmb-status" id="cmb-alerts-status" style="display:none;"></div>' +
            '</div>';
        document.body.appendChild(overlay);

        function close(){ overlay.remove(); }
        overlay.querySelector("#cmb-alerts-close").addEventListener("click", close);
        overlay.addEventListener("click", function(e){ if(e.target === overlay) close(); });

        var body = overlay.querySelector("#cmb-alerts-body");

        function setStatus(msg, type){
            var el = overlay.querySelector("#cmb-alerts-status");
            el.style.display = "block";
            var colors = {success:"#166534",error:"#b91c1c",loading:"#1d4ed8"};
            var bgs = {success:"#f0fdf4",error:"#fef2f2",loading:"#eff6ff"};
            el.style.color = colors[type] || "#6b7280";
            el.style.background = bgs[type] || "#f9fafb";
            el.textContent = msg;
        }

        function renderSettings(){
            var h = '<p class="cmb-desc">Scans the whole course for missing work, low grades, and upcoming work in the window below, then lets you message flagged students.</p>';
            h += '<div class="cmb-card"><label class="cmb-label">Check window</label>';
            h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">';
            h += '<div><div style="font-size:12px;color:#64748B;margin-bottom:4px;">Days back (missing &amp; grades)</div><input type="number" class="cmb-input" id="cmb-al-back" value="'+ast.daysBack+'" min="1" max="90"></div>';
            h += '<div><div style="font-size:12px;color:#64748B;margin-bottom:4px;">Days forward (upcoming)</div><input type="number" class="cmb-input" id="cmb-al-fwd" value="'+ast.daysForward+'" min="1" max="90"></div>';
            h += '<div><div style="font-size:12px;color:#64748B;margin-bottom:4px;">Grade below (%)</div><input type="number" class="cmb-input" id="cmb-al-threshold" value="'+ast.gradeThreshold+'" min="1" max="100"></div>';
            h += '</div></div>';
            h += '<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-ai" style="width:100%;justify-content:center;" id="cmb-al-scan">🔍 Scan Course</button></div>';
            body.innerHTML = h;
            body.querySelector("#cmb-al-back").addEventListener("input", function(e){ ast.daysBack = parseInt(e.target.value,10) || 10; });
            body.querySelector("#cmb-al-fwd").addEventListener("input", function(e){ ast.daysForward = parseInt(e.target.value,10) || 10; });
            body.querySelector("#cmb-al-threshold").addEventListener("input", function(e){ ast.gradeThreshold = parseInt(e.target.value,10) || 60; });
            body.querySelector("#cmb-al-scan").addEventListener("click", runScan);
        }

        async function runScan(){
            if(!courseId){ setStatus("Navigate to a Canvas course page first.", "error"); return; }
            body.innerHTML = '<div class="cmb-qb-empty">Scanning course…</div>';
            setStatus("Loading roster and assignments…", "loading");
            try{
                var courseInfo = await canvasAPI("GET", "").catch(function(){ return null; });
                ast.courseName = (courseInfo && courseInfo.name) || document.title.replace(/\s*[-|].*$/, "") || "the course";
                var profile = await fetch("/api/v1/users/self/profile", {credentials:"same-origin"}).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
                ast.teacherName = (profile && (profile.short_name || profile.name)) || "";

                var students = await canvasAPIAll("/users?enrollment_type[]=student&include[]=email");
                var allAssignments = await canvasAPIAll("/assignments?order_by=due_at");
                var upcoming = getUpcomingAssignments(allAssignments, ast.daysForward);

                var results = [];
                for(var i=0;i<students.length;i++){
                    var stu = students[i];
                    setStatus("Checking " + (i+1) + " / " + students.length + " students…", "loading");
                    var subs = await canvasAPIAll("/students/submissions?student_ids[]="+stu.id+"&include[]=assignment");
                    var missing = getMissingAssignments(subs, ast.daysBack);
                    var lowGrades = getLowGradeSubmissions(subs, ast.daysBack, ast.gradeThreshold);
                    if(!missing.length && !lowGrades.length) continue;
                    results.push({
                        id: stu.id,
                        name: stu.name || stu.sortable_name || ("Student " + stu.id),
                        missing: missing.map(function(s){ return s.assignment; }),
                        lowGrades: lowGrades,
                        upcoming: upcoming,
                        checked: true
                    });
                }
                results.sort(function(a,b){ return (b.missing.length+b.lowGrades.length) - (a.missing.length+a.lowGrades.length); });
                ast.students = results;
                if(!results.length){ setStatus("No students with missing work or grades below " + ast.gradeThreshold + "% in the past " + ast.daysBack + " days.", "success"); }
                else{ setStatus(results.length + " student" + (results.length!==1?"s":"") + " flagged.", "success"); }
                renderList();
            }catch(err){
                setStatus("Error: " + err.message, "error");
                renderSettings();
            }
        }

        function selectedStudents(){
            return ast.students.filter(function(s){ return s.checked; });
        }

        // Opens a clean, styleless-app print view of every currently
        // flagged student — independent of who's checked for messaging,
        // since this is meant as a record/handout, not a send list.
        function printAlertList(){
            var win = window.open("", "_blank");
            if(!win){ setStatus("Your browser blocked the print window — allow pop-ups for this site and try again.", "error"); return; }
            var today = new Date().toLocaleDateString();
            var h = '<!doctype html><html><head><title>Course Alerts — '+esc(ast.courseName)+'</title>';
            h += '<style>';
            h += 'body{font-family:Arial,sans-serif;color:#111827;padding:32px;max-width:900px;margin:0 auto;}';
            h += 'h1{font-size:20px;margin:0 0 4px;}';
            h += '.meta{font-size:12px;color:#6b7280;margin-bottom:20px;}';
            h += '.student{margin-bottom:22px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;page-break-inside:avoid;}';
            h += '.student h3{font-size:15px;margin:0 0 6px;}';
            h += '.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;margin-left:6px;}';
            h += '.badge.missing{background:#fee2e2;color:#991b1b;}';
            h += '.badge.lowgrade{background:#ffedd5;color:#9a3412;}';
            h += '.badge.upcoming{background:#fef3c7;color:#92400e;}';
            h += 'table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}';
            h += 'th{text-align:left;background:#f8fafc;padding:5px 8px;font-weight:700;color:#475569;}';
            h += 'td{padding:5px 8px;border-bottom:1px solid #f1f5f9;}';
            h += '.section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;margin:10px 0 2px;}';
            h += '@media print{ body{padding:0;} }';
            h += '</style></head><body>';
            h += '<h1>📊 Course Alerts — '+esc(ast.courseName)+'</h1>';
            h += '<div class="meta">Generated '+today+' · Missing work &amp; grades: past '+ast.daysBack+' days, below '+ast.gradeThreshold+'% · Upcoming: next '+ast.daysForward+' days · '+ast.students.length+' student'+(ast.students.length!==1?'s':'')+' flagged</div>';
            ast.students.forEach(function(stu){
                h += '<div class="student"><h3>'+esc(stu.name);
                if(stu.missing.length) h += '<span class="badge missing">'+stu.missing.length+' missing</span>';
                if(stu.lowGrades.length) h += '<span class="badge lowgrade">'+stu.lowGrades.length+' below '+ast.gradeThreshold+'%</span>';
                if(stu.upcoming.length) h += '<span class="badge upcoming">'+stu.upcoming.length+' upcoming</span>';
                h += '</h3>';
                if(stu.missing.length){
                    h += '<div class="section-label">Missing</div><table><tr><th>Assignment</th><th>Due</th></tr>';
                    stu.missing.forEach(function(a){ h += '<tr><td>'+esc(a.name||"Unnamed")+'</td><td>'+(a.due_at?new Date(a.due_at).toLocaleDateString():"—")+'</td></tr>'; });
                    h += '</table>';
                }
                if(stu.lowGrades.length){
                    h += '<div class="section-label">Low Grades</div><table><tr><th>Assignment</th><th>Score</th></tr>';
                    stu.lowGrades.forEach(function(g){ h += '<tr><td>'+esc(g.name)+'</td><td>'+g.score+'/'+g.possible+' ('+g.pct+'%)</td></tr>'; });
                    h += '</table>';
                }
                h += '</div>';
            });
            h += '</body></html>';
            win.document.write(h);
            win.document.close();
            win.focus();
            win.print();
        }

        function renderList(){
            var h = '';
            if(!ast.students.length){
                h += '<div class="cmb-qb-empty">No students with missing work or low grades in this window.<br>Try widening the settings.</div>';
                h += '<div class="cmb-btn-row"><button class="cmb-btn cmb-btn-secondary" id="cmb-al-rescan">&larr; Back to settings</button></div>';
                body.innerHTML = h;
                body.querySelector("#cmb-al-rescan").addEventListener("click", renderSettings);
                return;
            }
            h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">';
            h += '<div style="font-size:12px;color:#64748B;">'+ast.students.length+' student'+(ast.students.length!==1?'s':'')+' flagged. Uncheck any you don\'t want to message.</div>';
            h += '<button class="cmb-btn cmb-btn-secondary" id="cmb-al-print" style="white-space:nowrap;">🖨️ Print List</button>';
            h += '</div>';
            ast.students.forEach(function(stu, si){
                h += '<div class="cmb-al-student'+(stu.checked?' sel':'')+'" data-si="'+si+'">';
                h += '<div class="cmb-al-shdr"><div class="cmb-al-cbox">'+(stu.checked?'✓':'')+'</div>';
                h += '<div class="cmb-al-name">'+esc(stu.name)+'</div>';
                if(stu.missing.length) h += '<span class="cmb-al-badge missing">'+stu.missing.length+' missing</span>';
                if(stu.lowGrades.length) h += '<span class="cmb-al-badge lowgrade">'+stu.lowGrades.length+' below '+ast.gradeThreshold+'%</span>';
                if(stu.upcoming.length) h += '<span class="cmb-al-badge upcoming">'+stu.upcoming.length+' upcoming</span>';
                h += '</div>';
                if(stu.missing.length) h += '<div class="cmb-al-detail">'+esc(formatAssignmentList(stu.missing)).replace(/\n/g,'<br>')+'</div>';
                if(stu.lowGrades.length) h += '<div class="cmb-al-detail">'+esc(formatLowGradeList(stu.lowGrades)).replace(/\n/g,'<br>')+'</div>';
                h += '</div>';
            });
            h += '<div class="cmb-card"><label class="cmb-label">Message Subject</label><input type="text" class="cmb-input" id="cmb-al-subject" value="'+esc(ast.subject)+'"></div>';
            h += '<div class="cmb-card"><label class="cmb-label">Message Body</label>';
            h += '<div style="font-size:11px;color:#94A3B8;margin-bottom:6px;">Placeholders: {{studentName}} {{courseName}} {{teacherName}} {{missingSection}} {{upcomingSection}} {{lowGradeSection}}</div>';
            h += '<textarea class="cmb-textarea" id="cmb-al-body" rows="8">'+esc(ast.bodyTemplate)+'</textarea></div>';
            h += '<div class="cmb-btn-row">';
            h += '<button class="cmb-btn cmb-btn-secondary" id="cmb-al-rescan2">&larr; Back to settings</button>';
            h += '<button class="cmb-btn cmb-btn-ai" id="cmb-al-preview">Preview Messages &rarr;</button>';
            h += '</div>';
            body.innerHTML = h;

            body.querySelectorAll(".cmb-al-student").forEach(function(row){
                row.addEventListener("click", function(){
                    var si = parseInt(row.dataset.si, 10);
                    ast.students[si].checked = !ast.students[si].checked;
                    renderList();
                });
            });
            body.querySelector("#cmb-al-subject").addEventListener("input", function(e){ ast.subject = e.target.value; });
            body.querySelector("#cmb-al-body").addEventListener("input", function(e){ ast.bodyTemplate = e.target.value; });
            body.querySelector("#cmb-al-rescan2").addEventListener("click", renderSettings);
            body.querySelector("#cmb-al-print").addEventListener("click", printAlertList);
            body.querySelector("#cmb-al-preview").addEventListener("click", function(){
                if(!selectedStudents().length){ setStatus("Select at least one student first.", "error"); return; }
                renderPreview();
            });
        }

        function buildMessageFor(stu){
            var missingSection = stu.missing.length > 0
                ? ("Missing Assignments (past " + ast.daysBack + " days):\n" + formatAssignmentList(stu.missing))
                : "You have no missing assignments. Great work!";
            var upcomingSection = stu.upcoming.length > 0
                ? ("Upcoming Assignments (next " + ast.daysForward + " days):\n" + formatAssignmentList(stu.upcoming))
                : "No upcoming assignments in the next " + ast.daysForward + " days.";
            var lowGradeSection = stu.lowGrades.length > 0
                ? ("Scores Below " + ast.gradeThreshold + "% (past " + ast.daysBack + " days):\n" + formatLowGradeList(stu.lowGrades) + "\n\nIf you have questions about any of these, please reach out to me.")
                : "No scores below " + ast.gradeThreshold + "% in the past " + ast.daysBack + " days.";
            var vars = {
                studentName: stu.name, courseName: ast.courseName, teacherName: ast.teacherName,
                missingSection: missingSection, upcomingSection: upcomingSection, lowGradeSection: lowGradeSection
            };
            return {
                subject: renderAlertTemplate(ast.subject, vars),
                body: renderAlertTemplate(ast.bodyTemplate, vars)
            };
        }

        function renderPreview(){
            var selected = selectedStudents();
            var h = '<div style="font-size:12px;color:#64748B;margin-bottom:10px;">Review before sending — nothing is sent yet.</div>';
            selected.forEach(function(stu){
                var msg = buildMessageFor(stu);
                h += '<div class="cmb-al-preview"><div class="to">To: '+esc(stu.name)+'</div>';
                h += '<div class="subj">Subject: '+esc(msg.subject)+'</div>';
                h += '<div class="body">'+esc(msg.body)+'</div></div>';
            });
            h += '<div class="cmb-btn-row">';
            h += '<button class="cmb-btn cmb-btn-secondary" id="cmb-al-back">&larr; Back to edit</button>';
            h += '<button class="cmb-btn cmb-btn-success" id="cmb-al-send">✓ Send '+selected.length+' Message'+(selected.length!==1?'s':'')+'</button>';
            h += '</div>';
            h += '<div id="cmb-al-send-progress" style="display:none;">';
            h += '<div class="cmb-progress-bar"><div class="cmb-progress-fill" id="cmb-al-progress-fill" style="width:0%;"></div></div>';
            h += '<div class="cmb-progress-log" id="cmb-al-progress-log"></div>';
            h += '</div>';
            body.innerHTML = h;
            body.querySelector("#cmb-al-back").addEventListener("click", renderList);
            body.querySelector("#cmb-al-send").addEventListener("click", async function(){
                var btn = body.querySelector("#cmb-al-send");
                btn.disabled = true; btn.textContent = "Sending…";
                var progressArea = body.querySelector("#cmb-al-send-progress");
                var progressFill = body.querySelector("#cmb-al-progress-fill");
                var progressLog = body.querySelector("#cmb-al-progress-log");
                progressArea.style.display = "block";
                var sent = 0, errors = [];
                for(var i=0;i<selected.length;i++){
                    var stu = selected[i];
                    var msg = buildMessageFor(stu);
                    var line = document.createElement("div");
                    try{
                        await sendCanvasMessage(courseId, stu.id, msg.subject, msg.body);
                        sent++;
                        line.className = "success";
                        line.textContent = "[" + (i+1) + "/" + selected.length + "] Sent to " + stu.name;
                    }catch(err){
                        errors.push(stu.name + ": " + err.message);
                        line.className = "error";
                        line.textContent = "[" + (i+1) + "/" + selected.length + "] ERROR — " + stu.name + ": " + err.message;
                    }
                    progressLog.appendChild(line);
                    progressLog.scrollTop = progressLog.scrollHeight;
                    progressFill.style.width = Math.round(((i+1)/selected.length)*100) + "%";
                }
                if(errors.length){
                    setStatus(sent + " sent, " + errors.length + " failed.", errors.length===selected.length?"error":"success");
                }else{
                    setStatus("✓ All " + sent + " messages sent.", "success");
                }
                btn.textContent = "✓ Sent";
            });
        }

        renderSettings();
    }

    // ── SCHEDULER ────────────────────────────────────────────────────────────
    // Drag-and-drop due-date planning board: pulls every module-linked
    // Assignment/Quiz/graded Discussion, lets a teacher drag them onto date
    // columns (generated from a start date + selected weekdays), then
    // publishes due/open/close (and quiz answer-reveal) dates to Canvas in
    // one batch. Ported from the standalone Assignment Scheduler tool.

    function schedToDateKey(d){
        var y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
        return y+"-"+m+"-"+day;
    }
    function schedFromDateKey(key){
        var parts=key.split("-").map(Number);
        return new Date(parts[0], parts[1]-1, parts[2], 12, 0, 0); // noon-anchored, dodges TZ/DST shifting
    }
    function schedAddDays(dateKey, days){
        var d=schedFromDateKey(dateKey);
        d.setDate(d.getDate()+days);
        return schedToDateKey(d);
    }
    function schedCombineDateAndTime(dateKey, timeStr){
        var parts=dateKey.split("-").map(Number);
        var t=(timeStr||"23:59").split(":").map(Number);
        return new Date(parts[0], parts[1]-1, parts[2], t[0]||0, t[1]||0, 0).toISOString();
    }

    function schedEasterDateKey(year){
        // Meeus/Jones/Butcher Gregorian Easter algorithm
        var a=year%19, b=Math.floor(year/100), c=year%100, d=Math.floor(b/4), e=b%4;
        var f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
        var i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
        var m=Math.floor((a+11*h+22*l)/451);
        var month=Math.floor((h+l-7*m+114)/31);
        var day=((h+l-7*m+114)%31)+1;
        return schedToDateKey(new Date(year, month-1, day, 12, 0, 0));
    }
    function schedNthWeekday(year, month, weekday, n){
        var d=new Date(year, month, 1, 12, 0, 0);
        var offset=(weekday - d.getDay() + 7)%7;
        d.setDate(1+offset+7*(n-1));
        return schedToDateKey(d);
    }
    function schedLastWeekday(year, month, weekday){
        var d=new Date(year, month+1, 0, 12, 0, 0);
        var offset=(d.getDay()-weekday+7)%7;
        d.setDate(d.getDate()-offset);
        return schedToDateKey(d);
    }
    function getHolidayName(dateKey){
        var year=parseInt(dateKey.split("-")[0],10);
        var easter=schedEasterDateKey(year);
        var thanksgiving=schedNthWeekday(year,10,4,4);
        var map={};
        map[year+"-01-01"]="New Year's Day";
        map[schedNthWeekday(year,0,1,3)]="MLK Day";
        map[schedNthWeekday(year,1,1,3)]="Presidents Day";
        map[schedAddDays(easter,-2)]="Good Friday";
        map[easter]="Easter";
        map[schedLastWeekday(year,4,1)]="Memorial Day";
        map[year+"-06-19"]="Juneteenth";
        map[year+"-07-04"]="Independence Day";
        map[schedNthWeekday(year,8,1,1)]="Labor Day";
        map[schedNthWeekday(year,9,1,2)]="Indigenous Peoples Day";
        map[year+"-11-11"]="Veterans Day";
        map[thanksgiving]="Thanksgiving";
        map[schedAddDays(thanksgiving,1)]="Day After Thanksgiving";
        map[year+"-12-25"]="Christmas";
        return map[dateKey]||null;
    }

    // Only assignments linked into a module are schedulable — quizzes/graded
    // discussions are matched back to their parent Assignment record so
    // everything shares one due-date/points identity, same as Canvas itself.
    function schedBuildItems(modules, assignments, quizzes){
        var quizByAssignmentId={};
        quizzes.forEach(function(q){ if(q.assignment_id) quizByAssignmentId[q.assignment_id]=q; });

        var moduleNamesByAssignmentId={};
        modules.forEach(function(mod){
            (mod.items||[]).forEach(function(mi){
                var aid=null;
                if(mi.type==="Assignment") aid=mi.content_id;
                else if(mi.type==="Quiz"){
                    var q=quizzes.find(function(qq){ return qq.id===mi.content_id; });
                    if(q && q.assignment_id) aid=q.assignment_id;
                } else if(mi.type==="Discussion"){
                    var matchedA=assignments.find(function(a){ return a.discussion_topic && a.discussion_topic.id===mi.content_id; });
                    if(matchedA) aid=matchedA.id;
                }
                if(aid!=null){
                    if(!moduleNamesByAssignmentId[aid]) moduleNamesByAssignmentId[aid]=[];
                    if(moduleNamesByAssignmentId[aid].indexOf(mod.name)<0) moduleNamesByAssignmentId[aid].push(mod.name);
                }
            });
        });

        var items=[];
        assignments.forEach(function(a){
            var moduleNames=moduleNamesByAssignmentId[a.id];
            if(!moduleNames || !moduleNames.length) return;
            var quiz=quizByAssignmentId[a.id];
            var type=quiz ? "Test" : ((a.submission_types||[]).indexOf("discussion_topic")>=0 ? "Discussion" : "Assignment");
            items.push({
                id:"assignment-"+a.id, assignmentId:a.id, quizId: quiz?quiz.id:null,
                title:a.name, type:type, moduleNames:moduleNames, primaryModuleName:moduleNames[0],
                currentDueAt:a.due_at, published:a.published, htmlUrl:a.html_url
            });
        });
        return items;
    }

    async function schedLoadCourseData(sch){
        var moduleList = await canvasAPIAll("/modules");
        for(var i=0;i<moduleList.length;i++){
            moduleList[i].items = await canvasAPIAll("/modules/"+moduleList[i].id+"/items");
        }
        var assignments = await canvasAPIAll("/assignments?include[]=discussion_topic");
        var quizzes = await canvasAPIAll("/quizzes");
        sch.modules = moduleList;
        sch.items = schedBuildItems(moduleList, assignments, quizzes);
        sch.schedule = {};
        sch.items.forEach(function(it){
            if(it.currentDueAt) sch.schedule[it.id]=schedToDateKey(new Date(it.currentDueAt));
        });
    }

    function schedGetGeneratedDates(sch){
        var keys=[];
        var cur=sch.settings.startDate;
        var guard=0;
        while(keys.length<sch.slotCount && guard<500){
            guard++;
            if(sch.settings.weekdays.indexOf(schedFromDateKey(cur).getDay())>=0) keys.push(cur);
            cur=schedAddDays(cur,1);
        }
        Object.keys(sch.schedule).forEach(function(itemId){
            var dk=sch.schedule[itemId];
            if(dk && keys.indexOf(dk)<0) keys.push(dk);
        });
        keys.sort();
        return keys;
    }

    function schedGetItemSetting(sch, itemId, key){
        var ov=sch.itemOverrides[itemId];
        if(ov && ov[key]!=null && ov[key]!=="") return ov[key];
        return sch.settings[key];
    }

    async function schedPublish(sch, onProgress){
        var scheduledItems = sch.items.filter(function(it){ return !!sch.schedule[it.id]; });
        var results={ succeeded:[], errors:[] };
        for(var i=0;i<scheduledItems.length;i++){
            var it=scheduledItems[i];
            var dateKey=sch.schedule[it.id];
            var dueAt=schedCombineDateAndTime(dateKey, sch.settings.dueTime);
            var openBefore=parseInt(schedGetItemSetting(sch,it.id,"openDaysBefore"),10)||0;
            var closeAfter=parseInt(schedGetItemSetting(sch,it.id,"closeDaysAfter"),10)||0;
            try{
                var body={ assignment:{ due_at: dueAt } };
                if(openBefore) body.assignment.unlock_at=schedCombineDateAndTime(schedAddDays(dateKey,-openBefore), "00:00");
                if(closeAfter) body.assignment.lock_at=schedCombineDateAndTime(schedAddDays(dateKey,closeAfter), sch.settings.dueTime);
                await canvasAPI("PUT", "/assignments/"+it.assignmentId, body);
                if(it.quizId){
                    var answersAfter=parseInt(schedGetItemSetting(sch,it.id,"answersDaysAfter"),10)||0;
                    var quizBody={ quiz:{ due_at: dueAt, show_correct_answers:true } };
                    if(answersAfter) quizBody.quiz.show_correct_answers_at=schedCombineDateAndTime(schedAddDays(dateKey,answersAfter), sch.settings.dueTime);
                    await canvasAPI("PUT", "/quizzes/"+it.quizId, quizBody);
                }
                results.succeeded.push(it.title);
            }catch(err){
                results.errors.push(it.title+": "+err.message);
            }
            if(onProgress) onProgress(i+1, scheduledItems.length, it.title);
        }
        return results;
    }

    function openScheduler(){
        if(document.getElementById("cmb-sch-overlay")) return;
        var courseId=getCourseId();
        if(!courseId){ alert("Navigate to a Canvas course page first."); return; }

        var STORAGE_KEY="AIgrader_SchedulerSettings_"+courseId;
        var sch={
            settings:{ startDate: schedToDateKey(new Date()), weekdays:[1,3], dueTime:"23:59", openDaysBefore:0, closeDaysAfter:0, answersDaysAfter:0 },
            slotCount:14, modules:[], items:[], schedule:{}, itemOverrides:{}, draggedItemId:null
        };
        var savedSchedule=null;
        try{
            var saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
            if(saved){
                sch.settings=Object.assign(sch.settings, saved.settings||{});
                sch.slotCount=saved.slotCount||sch.slotCount;
                sch.itemOverrides=saved.itemOverrides||{};
                savedSchedule=saved.schedule||null;
            }
        }catch(e){}

        function persist(){
            try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({settings:sch.settings, slotCount:sch.slotCount, itemOverrides:sch.itemOverrides, schedule:sch.schedule})); }catch(e){}
        }

        var overlay=document.createElement("div");
        overlay.id="cmb-sch-overlay";
        overlay.innerHTML =
            '<div id="cmb-sch-panel">' +
              '<div class="cmb-sch-controls" id="cmb-sch-controls"></div>' +
              '<div class="cmb-status" id="cmb-sch-status" style="display:none;"></div>' +
              '<div class="cmb-sch-layout">' +
                '<div class="cmb-sch-left"><div class="cmb-sch-colhdr">Course Items</div><div class="cmb-sch-left-body" id="cmb-sch-left-body"></div></div>' +
                '<div class="cmb-sch-right"><div class="cmb-sch-colhdr">Schedule Board</div><div class="cmb-sch-board" id="cmb-sch-board"></div></div>' +
              '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        function close(){ overlay.remove(); document.removeEventListener("click", closeAllDropdowns); }
        overlay.addEventListener("click", function(e){ if(e.target===overlay) close(); });

        function setStatus(msg,type){
            var el=overlay.querySelector("#cmb-sch-status");
            el.style.display="block";
            var colors={success:"#166534",error:"#b91c1c",loading:"#1d4ed8"};
            var bgs={success:"#f0fdf4",error:"#fef2f2",loading:"#eff6ff"};
            el.style.color=colors[type]||"#6b7280"; el.style.background=bgs[type]||"#f9fafb";
            el.textContent=msg;
        }

        function renderTile(it){
            var typeColors={Assignment:"#7C3AED",Test:"#0EA5E9",Discussion:"#10B981"};
            var color=typeColors[it.type]||"#7C3AED";
            var ov=sch.itemOverrides[it.id]||{};
            var hasOverride = ov.openDaysBefore!=null || ov.closeDaysAfter!=null || ov.answersDaysAfter!=null;
            var h='<div class="cmb-sch-tile" draggable="true" data-item="'+it.id+'">';
            h+='<div class="cmb-sch-tile-top"><span class="cmb-sch-tile-pill" style="background:'+color+';">'+esc(it.type)+'</span>';
            h+=(it.published?'':'<span class="cmb-sch-tile-draft">Draft</span>');
            h+='</div>';
            h+='<div class="cmb-sch-tile-title">'+esc(it.title)+'</div>';
            h+='<div class="cmb-sch-tile-foot"><a href="'+esc(it.htmlUrl||"#")+'" target="_blank" class="cmb-sch-tile-link">Open ↗</a>';
            h+='<span class="cmb-sch-tile-ovr" data-item="'+it.id+'">'+(hasOverride?'⚙ override':'⚙')+'</span></div>';
            h+='<div class="cmb-sch-ovr-panel" data-item="'+it.id+'" style="display:none;">';
            h+='<div><label>Opens (days before)</label><input type="number" class="cmb-sch-ovr-input" data-item="'+it.id+'" data-key="openDaysBefore" value="'+(ov.openDaysBefore!=null?ov.openDaysBefore:"")+'" placeholder="'+sch.settings.openDaysBefore+'"></div>';
            h+='<div><label>Locks (days after)</label><input type="number" class="cmb-sch-ovr-input" data-item="'+it.id+'" data-key="closeDaysAfter" value="'+(ov.closeDaysAfter!=null?ov.closeDaysAfter:"")+'" placeholder="'+sch.settings.closeDaysAfter+'"></div>';
            if(it.quizId) h+='<div><label>Answers (days after)</label><input type="number" class="cmb-sch-ovr-input" data-item="'+it.id+'" data-key="answersDaysAfter" value="'+(ov.answersDaysAfter!=null?ov.answersDaysAfter:"")+'" placeholder="'+sch.settings.answersDaysAfter+'"></div>';
            h+='<button class="cmb-sch-ovr-reset" data-item="'+it.id+'">Reset to default</button>';
            h+='</div></div>';
            return h;
        }

        function wireTiles(container){
            container.querySelectorAll(".cmb-sch-tile").forEach(function(tile){
                tile.addEventListener("dragstart",function(){ sch.draggedItemId=tile.dataset.item; });
            });
            container.querySelectorAll(".cmb-sch-tile-ovr").forEach(function(btn){
                btn.addEventListener("click",function(e){
                    e.stopPropagation();
                    var panel=container.querySelector('.cmb-sch-ovr-panel[data-item="'+btn.dataset.item+'"]');
                    if(panel) panel.style.display = panel.style.display==="none" ? "block" : "none";
                });
            });
            container.querySelectorAll(".cmb-sch-ovr-input").forEach(function(inp){
                inp.addEventListener("change",function(){
                    var itemId=inp.dataset.item, key=inp.dataset.key;
                    if(!sch.itemOverrides[itemId]) sch.itemOverrides[itemId]={};
                    if(inp.value==="") delete sch.itemOverrides[itemId][key];
                    else sch.itemOverrides[itemId][key]=parseInt(inp.value,10);
                    persist();
                });
            });
            container.querySelectorAll(".cmb-sch-ovr-reset").forEach(function(btn){
                btn.addEventListener("click",function(){
                    delete sch.itemOverrides[btn.dataset.item];
                    persist(); renderLeft(); renderBoard();
                });
            });
        }

        function wireDropzone(dz, dropKey){
            if(!dz) return;
            dz.addEventListener("dragover",function(e){ e.preventDefault(); dz.classList.add("cmb-sch-drop-active"); });
            dz.addEventListener("dragleave",function(){ dz.classList.remove("cmb-sch-drop-active"); });
            dz.addEventListener("drop",function(e){
                e.preventDefault();
                dz.classList.remove("cmb-sch-drop-active");
                var itemId=sch.draggedItemId;
                if(!itemId) return;
                if(dropKey==="unscheduled") delete sch.schedule[itemId];
                else sch.schedule[itemId]=dropKey;
                sch.draggedItemId=null;
                persist();
                renderLeft(); renderBoard();
            });
        }

        function renderLeft(){
            var el=overlay.querySelector("#cmb-sch-left-body");
            var unscheduled=sch.items.filter(function(it){ return !sch.schedule[it.id]; });
            var byModule={};
            unscheduled.forEach(function(it){
                var m=it.primaryModuleName||"(No Module)";
                if(!byModule[m]) byModule[m]=[];
                byModule[m].push(it);
            });
            var h='<div class="cmb-sch-dropzone cmb-sch-unscheduled-zone" data-drop="unscheduled">';
            h+='<div class="cmb-sch-dz-label">Drop here to unschedule</div></div>';
            if(!sch.items.length){
                h+='<div class="cmb-qb-empty">No module-linked assignments, quizzes, or graded discussions found in this course.</div>';
            }else if(!unscheduled.length){
                h+='<div class="cmb-qb-empty">Everything is scheduled — check the board.</div>';
            }else{
                Object.keys(byModule).sort().forEach(function(modName){
                    h+='<div class="cmb-sch-modgroup"><div class="cmb-sch-modname">📦 '+esc(modName)+'</div>';
                    byModule[modName].forEach(function(it){ h+=renderTile(it); });
                    h+='</div>';
                });
            }
            el.innerHTML=h;
            wireTiles(el);
            wireDropzone(el.querySelector('[data-drop="unscheduled"]'), "unscheduled");
        }

        function renderBoard(){
            var el=overlay.querySelector("#cmb-sch-board");
            var dateKeys=schedGetGeneratedDates(sch);
            var h='';
            dateKeys.forEach(function(dk){
                var itemsOnDate=sch.items.filter(function(it){ return sch.schedule[it.id]===dk; });
                var holiday=getHolidayName(dk);
                var label=schedFromDateKey(dk).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
                h+='<div class="cmb-sch-datecol">';
                h+='<div class="cmb-sch-datehead">'+label+(holiday?'<span class="cmb-sch-holiday">'+esc(holiday)+'</span>':'')+'<span class="cmb-sch-datecount">'+itemsOnDate.length+'</span></div>';
                h+='<div class="cmb-sch-dropzone" data-drop="'+dk+'">';
                itemsOnDate.forEach(function(it){ h+=renderTile(it); });
                h+='</div></div>';
            });
            el.innerHTML=h;
            wireTiles(el);
            el.querySelectorAll(".cmb-sch-dropzone").forEach(function(dz){ wireDropzone(dz, dz.dataset.drop); });
        }

        function closeAllDropdowns(){
            overlay.querySelectorAll(".cmb-sch-dd-panel.open").forEach(function(p){ p.classList.remove("open"); });
            overlay.querySelectorAll(".cmb-sch-dd-btn.open").forEach(function(b){ b.classList.remove("open"); });
        }

        function renderControls(){
            var c=overlay.querySelector("#cmb-sch-controls");
            var h='';
            h+='<div class="cmb-sch-brand">📅 Scheduler</div>';

            h+='<div class="cmb-sch-dd-wrap"><button type="button" class="cmb-sch-dd-btn" id="cmb-sch-dd-schedule-btn">Schedule ▾</button>';
            h+='<div class="cmb-sch-dd-panel" id="cmb-sch-dd-schedule-panel">';
            h+='<div class="cmb-sch-ctrl"><label>Start Date</label><input type="date" id="cmb-sch-startdate" value="'+sch.settings.startDate+'"></div>';
            h+='<div class="cmb-sch-ctrl"><label>Due Time</label><input type="time" id="cmb-sch-duetime" value="'+sch.settings.dueTime+'"></div>';
            h+='<div class="cmb-sch-ctrl"><label>Days</label><div class="cmb-sch-wd-row">';
            ["Su","Mo","Tu","We","Th","Fr","Sa"].forEach(function(lbl,idx){
                h+='<button type="button" class="cmb-sch-wd-btn'+(sch.settings.weekdays.indexOf(idx)>=0?' on':'')+'" data-wd="'+idx+'">'+lbl+'</button>';
            });
            h+='</div></div>';
            h+='</div></div>';

            h+='<div class="cmb-sch-dd-wrap"><button type="button" class="cmb-sch-dd-btn" id="cmb-sch-dd-window-btn">⏱ Window ▾</button>';
            h+='<div class="cmb-sch-dd-panel" id="cmb-sch-dd-window-panel">';
            h+='<div class="cmb-sch-ctrl"><label>Open (days before)</label><input type="number" id="cmb-sch-openbefore" value="'+sch.settings.openDaysBefore+'" min="0"></div>';
            h+='<div class="cmb-sch-ctrl"><label>Close (days after)</label><input type="number" id="cmb-sch-closeafter" value="'+sch.settings.closeDaysAfter+'" min="0"></div>';
            h+='<div class="cmb-sch-ctrl"><label>Answers (days after)</label><input type="number" id="cmb-sch-answersafter" value="'+sch.settings.answersDaysAfter+'" min="0"></div>';
            h+='</div></div>';

            h+='<div class="cmb-sch-ctrl-btns">';
            h+='<button class="cmb-btn cmb-btn-secondary" id="cmb-sch-moredates">+ Dates</button>';
            h+='<button class="cmb-btn cmb-btn-success" id="cmb-sch-publish">✓ Publish</button>';
            h+='<button class="cmb-sch-close-btn" id="cmb-sch-close">✕</button>';
            h+='</div>';
            c.innerHTML=h;
            c.querySelector("#cmb-sch-close").addEventListener("click", close);

            function toggleDropdown(btn, panel){
                var wasOpen=panel.classList.contains("open");
                closeAllDropdowns();
                if(!wasOpen){ panel.classList.add("open"); btn.classList.add("open"); }
            }
            var scheduleBtn=c.querySelector("#cmb-sch-dd-schedule-btn"), schedulePanel=c.querySelector("#cmb-sch-dd-schedule-panel");
            var windowBtn=c.querySelector("#cmb-sch-dd-window-btn"), windowPanel=c.querySelector("#cmb-sch-dd-window-panel");
            scheduleBtn.addEventListener("click",function(e){ e.stopPropagation(); toggleDropdown(scheduleBtn, schedulePanel); });
            windowBtn.addEventListener("click",function(e){ e.stopPropagation(); toggleDropdown(windowBtn, windowPanel); });
            c.querySelectorAll(".cmb-sch-dd-panel").forEach(function(p){ p.addEventListener("click",function(e){ e.stopPropagation(); }); });

            c.querySelector("#cmb-sch-startdate").addEventListener("change",function(e){ sch.settings.startDate=e.target.value; persist(); renderBoard(); });
            c.querySelector("#cmb-sch-duetime").addEventListener("change",function(e){ sch.settings.dueTime=e.target.value; persist(); });
            c.querySelectorAll(".cmb-sch-wd-btn").forEach(function(btn){
                btn.addEventListener("click",function(){
                    var wd=parseInt(btn.dataset.wd,10);
                    var idx=sch.settings.weekdays.indexOf(wd);
                    if(idx>=0) sch.settings.weekdays.splice(idx,1); else sch.settings.weekdays.push(wd);
                    persist(); renderControls(); renderBoard();
                    var reopenBtn=c.querySelector("#cmb-sch-dd-schedule-btn"), reopenPanel=c.querySelector("#cmb-sch-dd-schedule-panel");
                    reopenPanel.classList.add("open"); reopenBtn.classList.add("open");
                });
            });
            c.querySelector("#cmb-sch-openbefore").addEventListener("input",function(e){ sch.settings.openDaysBefore=parseInt(e.target.value,10)||0; persist(); });
            c.querySelector("#cmb-sch-closeafter").addEventListener("input",function(e){ sch.settings.closeDaysAfter=parseInt(e.target.value,10)||0; persist(); });
            c.querySelector("#cmb-sch-answersafter").addEventListener("input",function(e){ sch.settings.answersDaysAfter=parseInt(e.target.value,10)||0; persist(); });
            c.querySelector("#cmb-sch-moredates").addEventListener("click",function(){ sch.slotCount+=6; persist(); renderBoard(); });
            c.querySelector("#cmb-sch-publish").addEventListener("click", doPublish);
        }
        document.addEventListener("click", closeAllDropdowns);

        function doPublish(){
            var scheduledCount=Object.keys(sch.schedule).length;
            if(!scheduledCount){ setStatus("Nothing is scheduled yet — drag items onto a date first.", "error"); return; }
            if(!confirm("Publish due dates for "+scheduledCount+" scheduled item(s) to Canvas? This updates real due/open/close dates.")) return;
            var btn=overlay.querySelector("#cmb-sch-publish");
            btn.disabled=true; btn.textContent="Publishing...";
            setStatus("Publishing 0/"+scheduledCount+"...", "loading");
            schedPublish(sch, function(done,total,title){
                setStatus("Publishing "+done+"/"+total+"... ("+title+")", "loading");
            }).then(function(results){
                btn.disabled=false; btn.textContent="✓ Publish";
                if(results.errors.length){
                    setStatus(results.succeeded.length+" published, "+results.errors.length+" failed: "+results.errors.join("; "), results.succeeded.length?"success":"error");
                }else{
                    setStatus("✓ Published "+results.succeeded.length+" item(s) to Canvas.", "success");
                }
            }).catch(function(err){
                btn.disabled=false; btn.textContent="✓ Publish";
                setStatus("Error: "+err.message, "error");
            });
        }

        renderControls();
        setStatus("Loading course items…", "loading");
        schedLoadCourseData(sch).then(function(){
            if(savedSchedule){
                var validIds=sch.items.map(function(it){ return it.id; });
                Object.keys(savedSchedule).forEach(function(itemId){
                    if(validIds.indexOf(itemId)>=0) sch.schedule[itemId]=savedSchedule[itemId];
                });
            }
            setStatus(sch.items.length+" schedulable item"+(sch.items.length!==1?"s":"")+" loaded.", "success");
            renderLeft();
            renderBoard();
        }).catch(function(err){
            setStatus("Error loading course data: "+err.message, "error");
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // SPEEDGRADER: AI GRADER + CHEATING DETECTION AUDIT
    // Self-mounting toolbar on Canvas's native SpeedGrader page — ported from
    // the standalone AI Grader/Audit tool. Adapted to BYOK: AI calls go
    // through this extension's own callClaude()/background.js proxy (no
    // external metering server), and file attachments are parsed with the
    // already-bundled pdf.js/mammoth/jszip parseFile() instead of an
    // external parse endpoint — a real improvement, not just a port.
    // ══════════════════════════════════════════════════════════════════════

    const SG_CRITERIA_KEY = "AIgrader_SG_Criteria";
    const SG_SNIPPETS_KEY = "AIgrader_SG_Snippets";
    const SG_SNIPPET_VER_KEY = "AIgrader_SG_SnippetVer";
    const SG_TEACHER_NAME_KEY = "AIgrader_SG_TeacherName";
    const SG_MODEL_KEY = "AIgrader_SG_Model";
    const SG_FILTER_PUB_KEY = "AIgrader_SG_FilterPublished";
    const SG_FILTER_DASH_KEY = "AIgrader_SG_FilterDashboard";
    const SG_SNIPPET_VER = "1";
    const SG_DEFAULT_SNIPPETS = [
        "Great job identifying the key concepts here — your explanation is clear and well organized.",
        "Nice work! Your argument is well supported with specific evidence from the text.",
        "You're on the right track, but this section needs more detail to fully support your claim.",
        "Please double-check your calculations in this section — the setup is correct but the final answer is off.",
        "This is a strong start. Try expanding your conclusion to tie your points back to the main question.",
        "I'd like to see more original analysis here rather than restating the source material.",
        "Solid effort overall — watch for run-on sentences and proofread before your next submission.",
        "This meets the requirements, but going forward try to include at least one counterargument.",
        "Excellent use of vocabulary and examples — this shows a deep understanding of the material.",
        "This submission is missing a required section — please review the assignment instructions and resubmit if allowed.",
        "Your formatting/citations don't match the required style — please review the citation guide for next time.",
        "Thoughtful reflection — I can tell you put real effort into connecting this to your own experience."
    ];

    var sgState = {
        courseId:"", assignmentId:"", studentId:"",
        assignmentName:"", studentName:"", subText:"", attachments:[],
        fetchSeq:0, lastKey:"", queueBadgeCount:0
    };

    function sgIsSpeedGraderPage(){ return /speed_grader/.test(window.location.href); }

    function sgGetUrlParts(){
        var params = new URLSearchParams(window.location.search);
        var m = window.location.pathname.match(/\/courses\/(\d+)/);
        return { courseId: m?m[1]:"", assignmentId: params.get("assignment_id")||"", studentId: params.get("student_id")||"" };
    }

    // Sets a value on a React-controlled <input>/<textarea> the "React-safe"
    // way — a plain `.value =` assignment gets silently ignored by React's
    // internal value-tracking, so this grabs the native prototype setter and
    // calls it directly, then fires the synthetic events React listens for.
    function sgSetValue(el, value){
        var proto = el.tagName==="TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        var setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", {bubbles:true}));
        el.dispatchEvent(new Event("change", {bubbles:true}));
    }

    function sgHtml(value){
        var lines=(value||"").split(/\n{2,}/);
        return lines.map(function(p){ return "<p>"+esc(p).replace(/\n/g,"<br>")+"</p>"; }).join("");
    }

    function sgToast(msg, ok){
        var el=document.createElement("div");
        el.textContent=msg;
        el.style.cssText="position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:2147483647;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,0.25);background:"+(ok?"#127A1B":"#C0392B")+";font-family:system-ui,sans-serif;";
        document.body.appendChild(el);
        setTimeout(function(){ el.remove(); }, 2800);
    }

    function sgIsVisible(el){
        if(!el) return false;
        var st=window.getComputedStyle(el);
        if(st.display==="none"||st.visibility==="hidden") return false;
        var r=el.getBoundingClientRect();
        return r.width>0 && r.height>0;
    }

    // Scrapes whatever SpeedGrader is currently rendering as a submission
    // preview — used as a fallback when the API doesn't give us usable text
    // (e.g. Canvas already rendered a doc preview in an iframe).
    function sgVisibleSubmissionText(){
        var selectors=["#iframe_holder iframe","#submission_preview iframe","#speedgrader_iframe",
            'iframe[src*="/submissions/"]','iframe[title*="submission" i]',"#iframe_holder",
            "#submission_preview","#document_preview","#preview_frame",".submission_preview",
            ".submission-details",".submission_body",'[data-testid*="submission" i]'];
        for(var i=0;i<selectors.length;i++){
            var el=document.querySelector(selectors[i]);
            if(!el || !sgIsVisible(el)) continue;
            var text="";
            if(el.tagName==="IFRAME"){
                try{ text=(el.contentDocument && el.contentDocument.body && el.contentDocument.body.innerText) || ""; }catch(e){ text=""; }
            }else{
                text=el.innerText || el.textContent || "";
            }
            text=text.replace(/ /g," ").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
            if(text.length>20) return text;
        }
        return "";
    }

    // Content scripts silently keep running with a dead chrome.runtime
    // connection after the extension is reloaded/updated — sendMessage then
    // throws or fails silently instead of resolving. Checking this before
    // every message avoids grading failures looking like mysterious API
    // errors mid-session.
    function sgContextAlive(){ return !!(chrome && chrome.runtime && chrome.runtime.id); }

    function sgShowReloadBanner(){
        if(document.getElementById("cmb-sg-reload-banner")) return;
        var b=document.createElement("div");
        b.id="cmb-sg-reload-banner";
        b.className="cmb-sg-reload-banner";
        b.innerHTML='⚠ This extension was updated or reloaded. Refresh the page to continue grading. <button style="margin-left:10px;padding:4px 12px;border-radius:6px;border:none;background:#1c1917;color:#fff;cursor:pointer;font-weight:700;" id="cmb-sg-reload-btn">Reload Page</button>';
        document.body.appendChild(b);
        b.querySelector("#cmb-sg-reload-btn").addEventListener("click", function(){ window.location.reload(); });
    }

    function sgSendClaude(prompt, maxTokens){
        if(!sgContextAlive()){ sgShowReloadBanner(); return Promise.reject(new Error("reload-needed")); }
        if(!state.apiKey){ return Promise.reject(new Error("No Claude API key configured — add one in AI Content > Setup.")); }
        return callClaude(prompt, contentModel({aiEngine:(localStorage.getItem(SG_MODEL_KEY)==="fast"?"fast":"detailed")}), maxTokens||1500);
    }

    // ── Drawer shell (one reused container, fully rebuilt per open) ──
    var sgOverlayEl=null;

    function sgShowDrawer(mode, ctx){
        if(!sgOverlayEl){
            sgOverlayEl=document.createElement("div");
            sgOverlayEl.id="cmb-sg-overlay";
            document.body.appendChild(sgOverlayEl);
            sgOverlayEl.addEventListener("click", function(e){ if(e.target===sgOverlayEl) sgCloseDrawer(); });
        }
        sgOverlayEl.style.display="flex";
        var sizeClass = mode==="criteria" ? "cmb-sg-sz-lg" : (mode==="audit" ? "cmb-sg-sz-xl" : (mode==="needs" ? "" : "cmb-sg-sz-md"));
        sgOverlayEl.innerHTML = '<div id="cmb-sg-drawer" class="'+sizeClass+'"></div>';
        var drawer=sgOverlayEl.querySelector("#cmb-sg-drawer");
        var renderers={ ai:sgRenderAiDrawer, needs:sgRenderQueueDrawer, criteria:sgRenderCriteriaDrawer, comments:sgRenderCommentsDrawer, audit:sgRenderAuditDrawer };
        if(renderers[mode]) renderers[mode](drawer, ctx||{});
    }

    function sgCloseDrawer(){
        if(sgOverlayEl) sgOverlayEl.style.display="none";
    }

    // Shared header for every drawer: dark bar, title/subtitle, a "?" toggle
    // that reveals a plain-English explanation panel, and a close button.
    function sgMakeHeader(drawer, icon, title, subtitle, helpHtml){
        var h='<div class="cmb-sg-dhdr">';
        h+='<div style="flex:1;"><div class="cmb-sg-dhdr-title">'+icon+' '+esc(title)+'</div>';
        if(subtitle) h+='<div class="cmb-sg-dhdr-sub">'+esc(subtitle)+'</div>';
        h+='</div>';
        if(helpHtml) h+='<button class="cmb-sg-dhelp-btn" id="cmb-sg-help-toggle">?</button>';
        h+='<button class="cmb-sg-dclose" id="cmb-sg-drawer-close">✕</button>';
        h+='</div>';
        if(helpHtml) h+='<div class="cmb-sg-dhelp-panel" id="cmb-sg-help-panel" style="display:none;">'+helpHtml+'</div>';
        drawer.insertAdjacentHTML("beforeend", h);
        drawer.querySelector("#cmb-sg-drawer-close").addEventListener("click", sgCloseDrawer);
        var helpBtn=drawer.querySelector("#cmb-sg-help-toggle");
        if(helpBtn){
            helpBtn.addEventListener("click", function(){
                var p=drawer.querySelector("#cmb-sg-help-panel");
                p.style.display = p.style.display==="none" ? "block" : "none";
            });
        }
    }

    function sgCloseAllMenus(){
        document.querySelectorAll(".cmb-sg-menu.open").forEach(function(m){ m.classList.remove("open"); });
    }

    function mountSpeedGraderToolbar(){
        if(!sgIsSpeedGraderPage()){
            var existing=document.getElementById("cmb-sg-toolbar");
            if(existing){ existing.remove(); var tab=document.getElementById("cmb-sg-tab"); if(tab) tab.remove(); document.body.classList.remove("cmb-sg-page-mode"); }
            return;
        }
        if(document.getElementById("cmb-sg-toolbar") || document.getElementById("cmb-sg-tab")) return;

        var bar=document.createElement("div");
        bar.id="cmb-sg-toolbar";
        bar.innerHTML =
            '<div class="cmb-sg-brand">◆ AI Grading</div>' +
            '<div class="cmb-sg-wrap"><button type="button" class="cmb-sg-btn" id="cmb-sg-grading-btn">✏️ Grading ▾<span class="cmb-sg-badge" id="cmb-sg-queue-badge" style="display:none;"></span></button>' +
              '<div class="cmb-sg-menu" id="cmb-sg-grading-menu">' +
                '<button class="cmb-sg-menu-item" data-mode="needs">📋 Grade Queue</button>' +
                '<button class="cmb-sg-menu-item" data-mode="ai">✨ AI Grade</button>' +
                '<button class="cmb-sg-menu-item" data-mode="criteria">🎯 Grading Criteria</button>' +
              '</div></div>' +
            '<button type="button" class="cmb-sg-btn" id="cmb-sg-comments-btn">💬 Comments</button>' +
            '<button type="button" class="cmb-sg-btn" id="cmb-sg-audit-btn">🔎 Audit</button>' +
            '<button type="button" class="cmb-sg-btn" id="cmb-sg-settings-btn" style="margin-left:auto;">⚙ Settings</button>' +
            '<button type="button" class="cmb-sg-btn" id="cmb-sg-collapse-btn">— Hide</button>';
        document.body.insertBefore(bar, document.body.firstChild);
        document.body.classList.add("cmb-sg-page-mode");

        var gradingBtn=bar.querySelector("#cmb-sg-grading-btn"), gradingMenu=bar.querySelector("#cmb-sg-grading-menu");
        gradingBtn.addEventListener("click", function(e){
            e.stopPropagation();
            var wasOpen=gradingMenu.classList.contains("open");
            sgCloseAllMenus();
            if(!wasOpen) gradingMenu.classList.add("open");
        });
        gradingMenu.querySelectorAll(".cmb-sg-menu-item").forEach(function(item){
            item.addEventListener("click", function(){ sgCloseAllMenus(); sgShowDrawer(item.dataset.mode); });
        });
        bar.querySelector("#cmb-sg-comments-btn").addEventListener("click", function(){ sgShowDrawer("comments"); });
        bar.querySelector("#cmb-sg-audit-btn").addEventListener("click", function(){ sgShowDrawer("audit"); });
        bar.querySelector("#cmb-sg-settings-btn").addEventListener("click", function(){
            var name=prompt("Your name, for the sign-off on AI-drafted feedback:", localStorage.getItem(SG_TEACHER_NAME_KEY)||"");
            if(name!==null){ try{ localStorage.setItem(SG_TEACHER_NAME_KEY, name.trim()); }catch(e){} }
        });
        bar.querySelector("#cmb-sg-collapse-btn").addEventListener("click", function(){
            bar.remove();
            var tab=document.createElement("button");
            tab.id="cmb-sg-tab";
            tab.textContent="AI Grading ▾";
            tab.addEventListener("click", function(){ tab.remove(); document.getElementById("cmb-sg-toolbar")||mountSpeedGraderToolbar(); });
            document.body.appendChild(tab);
            document.body.classList.remove("cmb-sg-page-mode");
        });
        document.addEventListener("click", sgCloseAllMenus);

        setTimeout(function(){ sgLoadQueue(false); }, 2000);
        sgOnNavChange(true);
    }

    // SpeedGrader is an SPA — switching students/assignments doesn't reload
    // the page, so URL params are the only reliable signal. Polling + a
    // MutationObserver on the student-name display cover cases where
    // Canvas's own switcher doesn't fire a history event.
    function sgOnNavChange(force){
        var parts=sgGetUrlParts();
        var key=parts.courseId+"|"+parts.assignmentId+"|"+parts.studentId;
        if(!force && key===sgState.lastKey) return;
        sgState.lastKey=key;
        sgState.courseId=parts.courseId; sgState.assignmentId=parts.assignmentId; sgState.studentId=parts.studentId;
        sgState.subText=""; sgState.attachments=[]; sgState.assignmentName=""; sgState.studentName="";
        sgFetchSubmission();
    }

    // ── Submission context ──

    async function sgFetchSubmission(){
        var parts={ courseId:sgState.courseId, assignmentId:sgState.assignmentId, studentId:sgState.studentId };
        if(!parts.courseId || !parts.assignmentId || !parts.studentId) return null;
        var seq=++sgState.fetchSeq;
        var assignmentName="", studentName="", subText="", attachments=[];
        try{
            var a=await canvasAPI("GET","/assignments/"+parts.assignmentId);
            assignmentName=a.name||"";
            var critKey=parts.courseId+"_"+parts.assignmentId;
            var existingCrit=sgLoadCriteria()[critKey];
            if((!existingCrit || !Object.keys(existingCrit).length) && a.description){
                var recovered=cmbExtractCriteriaMarker(a.description);
                if(recovered) sgSaveCriteriaFor(parts.courseId, parts.assignmentId, recovered);
            }
        }catch(e){}
        try{
            var prof=await fetch("/api/v1/users/"+parts.studentId+"/profile",{credentials:"same-origin"}).then(function(r){return r.ok?r.json():null;});
            if(prof) studentName=prof.short_name||prof.name||"";
        }catch(e){}
        if(!studentName){
            var nameEl=document.querySelector("#student_carousel_name, .student_selection option:checked, #students_selectmenu-button .ui-selectmenu-text");
            studentName=(nameEl&&(nameEl.textContent||nameEl.value)||"").trim();
        }
        try{
            var sub=await canvasAPI("GET","/assignments/"+parts.assignmentId+"/submissions/"+parts.studentId+"?include[]=attachments");
            if(sub.submission_type==="online_text_entry" && sub.body){
                var scratch=document.createElement("div"); scratch.innerHTML=sub.body;
                subText=(scratch.textContent||scratch.innerText||"").trim();
            }else if(sub.submission_type==="online_upload" && sub.attachments && sub.attachments.length){
                attachments=sub.attachments.map(function(att){
                    return { id:att.id, filename:decodeURIComponent(att.filename||att.display_name||"file").replace(/\+/g," "), mimeType:att["content-type"]||att.content_type||"", url:att.url||att.preview_url };
                });
                subText="[File upload: "+attachments.map(function(a){return a.filename;}).join(", ")+"]";
            }else if(sub.submission_type==="online_url" && sub.url){
                subText="[URL submission: "+sub.url+"]";
            }
        }catch(e){}
        if(!subText && !attachments.length){
            var visible=sgVisibleSubmissionText();
            if(visible) subText=visible;
        }
        if(seq!==sgState.fetchSeq || sgState.courseId!==parts.courseId || sgState.assignmentId!==parts.assignmentId || sgState.studentId!==parts.studentId) return null;
        sgState.assignmentName=assignmentName; sgState.studentName=studentName; sgState.subText=subText; sgState.attachments=attachments;
        return sgState;
    }

    // Extracts text from a submitted file attachment using this extension's
    // own bundled parsers (pdf.js/mammoth/jszip) — no external parse server
    // needed, unlike the original tool this was ported from.
    async function sgParseAttachmentText(att){
        var resp=await fetch(att.url, {credentials:"same-origin"});
        if(!resp.ok) throw new Error("Could not download "+att.filename);
        var blob=await resp.blob();
        var fileObj=new File([blob], att.filename, {type:att.mimeType||blob.type||""});
        return await parseFile(fileObj);
    }

    // pdf.js's getTextContent() (used by parseFile/parsePDF above) only
    // walks the page's content stream — an AcroForm field's actual VALUE
    // lives in the widget annotation's /V entry and appearance stream,
    // neither of which is part of that content stream. So for a submitted
    // fillable PDF, parseFile would see only the locked instructions/
    // questions text, never what the student actually typed. pdf-lib (also
    // already vendored) CAN load an existing PDF and read form field values
    // directly — this is that path, used FIRST for PDF attachments, with
    // parseFile kept as the fallback for PDFs with no fields at all (e.g. a
    // flattened/"printed to PDF" submission, which has real page text but
    // zero AcroForm fields).
    async function sgExtractPdfFormValues(bytes){
        var doc;
        try{ doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true, throwOnInvalidObject:false}); }
        catch(e){ return null; }
        var fields;
        try{ fields = doc.getForm().getFields(); }catch(e){ return {hasFields:false, values:{}}; }
        if(!fields.length) return {hasFields:false, values:{}};
        var values = {};
        fields.forEach(function(f){
            var name = f.getName();
            try{
                if(f instanceof PDFLib.PDFCheckBox){ values[name] = f.isChecked() ? "[X]" : "[ ]"; }
                else if(f instanceof PDFLib.PDFTextField){ values[name] = f.getText() || ""; }
            }catch(e){ values[name] = ""; }
        });
        return {hasFields:true, values:values};
    }

    // ── Grading Criteria (per-assignment rubric/answer key) storage ──
    //
    // Criteria live in localStorage for speed, but localStorage never leaves
    // this one browser. When a course is copied (Canvas Course Copy/Blueprint,
    // or handed to a different teacher), the copy gets new assignment IDs and
    // the new teacher's browser has never seen this key at all — so the
    // criteria silently "disappear" even though nothing was ever actually
    // deleted. To survive that, we also embed a hidden, self-describing copy
    // of the criteria directly inside the assignment's own description HTML
    // (a Canvas-copies-everything fact we can lean on) using a
    // "screenreader-only" div — the same visually-hidden-but-real-content
    // pattern Canvas's own RCE output uses, so it isn't stripped by Canvas's
    // HTML sanitizer and never renders for students. Whoever next opens
    // SpeedGrader for that assignment — same teacher, new browser, or a
    // completely different teacher on a copied course — recovers it
    // automatically the first time (see sgFetchSubmission).

    function sgCriteriaKey(){ return sgState.courseId+"_"+sgState.assignmentId; }

    function sgLoadCriteria(){
        try{ return JSON.parse(localStorage.getItem(SG_CRITERIA_KEY)||"{}"); }catch(e){ return {}; }
    }

    function sgGetCriteria(){
        var all=sgLoadCriteria();
        return all[sgCriteriaKey()]||{};
    }

    function cmbB64Encode(str){ return btoa(unescape(encodeURIComponent(str))); }
    function cmbB64Decode(str){ return decodeURIComponent(escape(atob(str))); }

    var CMB_CRITERIA_RE=/<div[^>]*data-cmb-criteria="1"[^>]*>([\s\S]*?)<\/div>/;

    // Strips any existing marker (so re-syncing doesn't pile up duplicates)
    // and appends a fresh one carrying the current criteria.
    function cmbEmbedCriteriaMarker(html, criteria){
        var stripped=(html||"").replace(CMB_CRITERIA_RE,"").trimEnd();
        var payload=cmbB64Encode(JSON.stringify(criteria||{}));
        return stripped+'\n<div class="screenreader-only" data-cmb-criteria="1">'+payload+"</div>";
    }

    function cmbExtractCriteriaMarker(html){
        var m=CMB_CRITERIA_RE.exec(html||"");
        if(!m) return null;
        try{ return JSON.parse(cmbB64Decode(m[1].trim())); }catch(e){ return null; }
    }

    // Generalized version of the criteria save, keyed by explicit
    // courseId/assignmentId rather than the SpeedGrader-only sgState — used
    // by Module Builder to pre-fill an answer key right after creating an
    // assignment, so AI Grade already knows the correct answers the first
    // time a teacher opens SpeedGrader for it.
    function sgSaveCriteriaFor(courseId, assignmentId, patch){
        var all=sgLoadCriteria();
        var k=courseId+"_"+assignmentId;
        all[k]=Object.assign({}, all[k]||{}, patch);
        try{ localStorage.setItem(SG_CRITERIA_KEY, JSON.stringify(all)); }catch(e){}
    }

    // Best-effort push of the current criteria into the live assignment's
    // description so it travels with the course on the next copy. Silent on
    // failure — the localStorage copy still works fine for this browser
    // either way, this is just the durability layer on top.
    async function sgSyncCriteriaToAssignment(courseId, assignmentId){
        if(!courseId || !assignmentId) return;
        var criteria=sgLoadCriteria()[courseId+"_"+assignmentId];
        if(!criteria) return;
        try{
            var a=await canvasAPI("GET","/assignments/"+assignmentId);
            var newDesc=cmbEmbedCriteriaMarker(a.description||"", criteria);
            await canvasAPI("PUT","/assignments/"+assignmentId, {assignment:{description:newDesc}});
        }catch(e){}
    }

    var sgCriteriaSyncTimer=null;
    function sgSaveCriteriaField(key, value){
        var patch={}; patch[key]=value;
        var courseId=sgState.courseId, assignmentId=sgState.assignmentId;
        sgSaveCriteriaFor(courseId, assignmentId, patch);
        clearTimeout(sgCriteriaSyncTimer);
        sgCriteriaSyncTimer=setTimeout(function(){ sgSyncCriteriaToAssignment(courseId, assignmentId); }, 1500);
    }

    function sgComposeCriteriaText(c){
        var parts=[];
        if(c.pointsPossible) parts.push("Points Possible: "+c.pointsPossible);
        if(c.difficulty) parts.push("Difficulty: "+c.difficulty);
        if(c.rubric) parts.push("Rubric:\n"+c.rubric);
        if(c.answerKey) parts.push("Answer Key:\n"+c.answerKey);
        if(c.suggestedComments) parts.push("Suggested Comments:\n"+c.suggestedComments);
        if(c.aiNotes) parts.push("Additional Instructions:\n"+c.aiNotes);
        return parts.join("\n\n");
    }

    // Hard cap on submission text so cost/context stay bounded regardless of
    // how large a document a student submits — keeps the beginning and end
    // (where intros/conclusions live) rather than truncating from the end.
    var SG_PROMPT_MAX=80000, SG_PROMPT_HEAD=56000, SG_PROMPT_TAIL=22000;
    function sgSubmissionForPrompt(text){
        text=text||"";
        if(text.length<=SG_PROMPT_MAX) return text;
        var omitted=text.length-SG_PROMPT_HEAD-SG_PROMPT_TAIL;
        return "[Beginning]\n"+text.slice(0,SG_PROMPT_HEAD).trimEnd()+
            "\n\n[Submission exceeds the length limit — "+omitted+" characters omitted from the middle]\n\n[End]\n"+
            text.slice(text.length-SG_PROMPT_TAIL).trimStart();
    }

    function sgBuildPrompt(ctx, criteriaText){
        var tot=parseInt((criteriaText.match(/Points Possible:\s*(\d+)/i)||[])[1]||"100",10);
        var fn=(ctx.studentName||"").split(" ")[0]||"the student";
        var teacherName=(localStorage.getItem(SG_TEACHER_NAME_KEY)||"").trim();
        var closing=teacherName||"Your Teacher";
        var p="Grade this student assignment.\n";
        if(ctx.assignmentName) p+="Assignment: "+ctx.assignmentName+"\n";
        p+="\n";
        p+= criteriaText ? (criteriaText+"\n\n") : ("Grade fairly. Total points: "+tot+"\n\n");
        p+="SUBMISSION:\n"+sgSubmissionForPrompt(ctx.subText)+"\n\n";
        p+="Respond in EXACTLY this format:\n";
        p+="SCORE: [number]/"+tot+"\n";
        p+="FEEDBACK:\n";
        p+="- TEACHER CHECK: [private note to the teacher only; items to verify manually]\n";
        p+='- [Begin with "'+fn+'," and give an overall summary]\n';
        p+="- [Specific finding]\n";
        p+="- [Another finding]\n";
        p+='- [End the final bullet with a closing line: "'+closing+'"]\n\n';
        p+="Use 3-5 bullets. First must be TEACHER CHECK. Last bullet must end with the closing.";
        return p;
    }

    // Regex-parses the model's free-text SCORE:/FEEDBACK:/TEACHER CHECK:
    // response — no structured-output mode is used, so this contract must
    // stay in sync with the prompt wording above if either changes.
    function sgParseAi(text){
        var score=(text.match(/SCORE:\s*([0-9]+(?:\.[0-9]+)?)/i)||[])[1]||"";
        var comments="", teacherCheck="";
        var feedbackMatch=text.match(/FEEDBACK:\s*([\s\S]*)/i);
        var commentsMatch=text.match(/COMMENTS?:\s*([\s\S]*?)(?:TEACHER CHECK:|$)/i);
        if(feedbackMatch){
            var lines=feedbackMatch[1].split("\n");
            var pub=[];
            lines.forEach(function(line){
                var trimmed=line.trim();
                if(/^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:/i.test(trimmed)){
                    if(!teacherCheck) teacherCheck=trimmed.replace(/^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:\s*/i,"").trim();
                }else if(trimmed){
                    pub.push(trimmed.replace(/^[-*•]\s*/,""));
                }
            });
            comments=pub.join("\n").trim();
        }else if(commentsMatch){
            comments=commentsMatch[1].trim();
            teacherCheck=((text.match(/TEACHER CHECK:\s*([\s\S]*)/i)||[])[1]||"").trim();
        }else{
            comments=text.replace(/SCORE:[^\n]*/i,"").replace(/TEACHER CHECK:[\s\S]*/i,"").trim();
        }
        return { score:score, comments:comments, teacherCheck:teacherCheck };
    }

    // ── Inserting into SpeedGrader's native DOM (the fragile part) ──

    var SG_GRADE_SELECTORS=["input.grading_value","#grading-box-extended input",'input[data-testid="grading-box-extended-grade-input"]',
        'input[data-testid*="grade" i]',"#grade_container input","#grading_box input","#student_and_assignment_grade input",
        ".grading-box input","input.grade",'input[name*="grade" i]','input[id*="grade" i]','input[aria-label*="grade" i]'];

    function sgInsertGrade(value){
        for(var i=0;i<SG_GRADE_SELECTORS.length;i++){
            var el=document.querySelector(SG_GRADE_SELECTORS[i]);
            if(el && !el.disabled && !el.readOnly){ sgSetValue(el,value); sgToast("Score inserted",true); return true; }
        }
        sgToast("Could not find the grade box — click inside it first", false);
        return false;
    }

    function sgFindTinyMceEditor(){
        var tiny=window.tinymce||window.tinyMCE;
        if(!tiny) return null;
        if(tiny.activeEditor) return tiny.activeEditor;
        var ids=["speed_grader_comment_textarea","speedgrader_textarea","grading_comment","comment_textarea"];
        for(var i=0;i<ids.length;i++){ var ed=tiny.get&&tiny.get(ids[i]); if(ed) return ed; }
        if(tiny.editors && tiny.editors.length) return tiny.editors[tiny.editors.length-1];
        return null;
    }

    var SG_COMMENT_SELECTORS=["#speed_grader_comment_textarea","#speedgrader_textarea",'textarea[name="comment[text_comment]"]',
        "#grading_comment","#comment_textarea",'textarea[data-testid*="comment" i]','textarea[aria-label*="comment" i]',
        'textarea[placeholder*="comment" i]',"#comments_container textarea","#submission_comment_form textarea",
        ".submission-comment-form textarea","#right_side textarea","#right_side_inner textarea",
        '[contenteditable="true"][aria-label*="comment" i]','[contenteditable="true"][data-testid*="comment" i]',".tox-edit-area [contenteditable=\"true\"]"];

    function sgOpenCommentEditorIfCollapsed(){
        var opener=document.querySelector('button[data-testid*="add-comment" i], button[aria-label*="add comment" i], button[title*="add comment" i], a[aria-label*="add comment" i], a[title*="add comment" i], .add_comment_link, #add_a_comment');
        if(opener) opener.click();
    }

    function sgTryInsertComment(value, append){
        var tiny=sgFindTinyMceEditor();
        if(tiny){
            var existing=append ? (tiny.getContent({format:"text"})||"") : "";
            var next=existing ? (existing+"\n\n"+value) : value;
            tiny.setContent(sgHtml(next));
            tiny.fire("input"); tiny.fire("change"); tiny.save();
            return true;
        }
        var iframes=document.querySelectorAll('iframe[id$="_ifr"], iframe.tox-edit-area__iframe');
        for(var i=0;i<iframes.length;i++){
            var frame=iframes[i];
            try{
                var body=frame.contentDocument && frame.contentDocument.body;
                if(body && body.isContentEditable){
                    var existingHtml = append ? body.innerHTML : "";
                    body.innerHTML = existingHtml + sgHtml(value);
                    body.dispatchEvent(new Event("input",{bubbles:true}));
                    body.focus();
                    return true;
                }
            }catch(e){}
        }
        for(var s=0;s<SG_COMMENT_SELECTORS.length;s++){
            var el=document.querySelector(SG_COMMENT_SELECTORS[s]);
            if(!el || el.closest("#cmb-sg-toolbar") || !sgIsVisible(el)) continue;
            if(el.isContentEditable){
                var cur = append ? (el.innerHTML||"") : "";
                el.innerHTML = cur + sgHtml(value);
                el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:value}));
                el.dispatchEvent(new Event("change",{bubbles:true}));
            }else{
                if(el.disabled||el.readOnly) continue;
                var newVal = append ? ((el.value||"")+"\n\n"+value) : value;
                sgSetValue(el,newVal);
            }
            return true;
        }
        var textareas=document.querySelectorAll("textarea");
        for(var t=0;t<textareas.length;t++){
            var ta=textareas[t];
            if(ta.disabled||ta.readOnly||!sgIsVisible(ta)||ta.closest("#cmb-sg-toolbar")) continue;
            var v = append ? ((ta.value||"")+"\n\n"+value) : value;
            sgSetValue(ta,v);
            return true;
        }
        return false;
    }

    function sgInsertComment(value, append){
        sgOpenCommentEditorIfCollapsed();
        var attempt=0;
        function tryOnce(){
            attempt++;
            if(sgTryInsertComment(value, append)){ sgToast("Comment inserted", true); return; }
            if(attempt<4){ setTimeout(tryOnce, attempt*400); }
            else{ sgToast("Could not find comment box — click inside it first", false); }
        }
        tryOnce();
    }

    var SG_GRADING_MODELS=[["detailed","Sonnet — richer feedback"],["fast","Haiku — faster"]];

    function sgRenderAiDrawer(drawer){
        var helpHtml="Reads the current student's submission (typed text, an uploaded file, or whatever Canvas is already previewing), sends it to Claude along with anything you've set in Grading Criteria, and drafts a score and feedback comment for you to review. Nothing is inserted into Canvas until you click Insert — you're always in control of what actually gets submitted.";
        sgMakeHeader(drawer, "✨", "AI Grade", (sgState.studentName||"Student")+" — "+(sgState.assignmentName||"Assignment"), helpHtml);
        var h='<div class="cmb-sg-dbody" id="cmb-sg-ai-body">';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Model</label><select class="cmb-sg-select" id="cmb-sg-model-select">';
        SG_GRADING_MODELS.forEach(function(m){
            h+='<option value="'+m[0]+'"'+((localStorage.getItem(SG_MODEL_KEY)||"detailed")===m[0]?" selected":"")+'>'+m[1]+"</option>";
        });
        h+='</select></div>';
        h+='<div class="cmb-sg-btn-row" style="margin-bottom:14px;"><button class="cmb-sg-abtn cmb-sg-abtn-primary" id="cmb-sg-run-btn" style="width:100%;">✨ Grade This Submission</button></div>';
        h+='<div id="cmb-sg-ai-status"></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Score</label><input type="text" class="cmb-sg-input" id="cmb-sg-score-input" placeholder="e.g. 85"></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Draft Feedback</label><textarea class="cmb-sg-textarea" id="cmb-sg-draft-input" rows="8" placeholder="Feedback will appear here after grading..."></textarea></div>';
        h+='<div id="cmb-sg-teacher-box" style="display:none;"></div>';
        h+='</div>';
        h+='<div class="cmb-sg-dfoot">';
        h+='<button class="cmb-sg-abtn cmb-sg-abtn-secondary" id="cmb-sg-insert-score-btn">Insert Score</button>';
        h+='<button class="cmb-sg-abtn cmb-sg-abtn-success" id="cmb-sg-insert-comment-btn">Insert Comment</button>';
        h+='</div>';
        drawer.insertAdjacentHTML("beforeend", h);

        var statusEl=drawer.querySelector("#cmb-sg-ai-status");
        function setAiStatus(msg,type){ statusEl.innerHTML = msg ? '<div class="cmb-sg-status cmb-sg-status-'+type+'">'+esc(msg)+'</div>' : ""; }

        drawer.querySelector("#cmb-sg-model-select").addEventListener("change",function(e){
            try{ localStorage.setItem(SG_MODEL_KEY, e.target.value); }catch(err){}
        });

        var runBtn=drawer.querySelector("#cmb-sg-run-btn");
        runBtn.addEventListener("click", async function(){
            runBtn.disabled=true; runBtn.textContent="Grading...";
            drawer.querySelector("#cmb-sg-score-input").value="";
            drawer.querySelector("#cmb-sg-draft-input").value="";
            drawer.querySelector("#cmb-sg-teacher-box").style.display="none";
            setAiStatus("Loading submission…","info");
            try{
                var criteria=sgGetCriteria();
                var criteriaText=sgComposeCriteriaText(criteria);
                var fresh=await sgFetchSubmission().catch(function(){return null;});
                var c=fresh||sgState;
                if(!c.subText && !c.attachments.length){
                    var visible=sgVisibleSubmissionText();
                    if(visible) c=Object.assign({},c,{subText:visible});
                }
                if(!c.subText && (!c.attachments||!c.attachments.length)){
                    throw new Error("No submission found — make sure a submission is loaded in SpeedGrader");
                }
                if(c.attachments && c.attachments.length && (!c.subText || c.subText.indexOf("[File upload:")===0)){
                    // For fillable-PDF assignments, a student's actual typed
                    // answers live in AcroForm field values, not the page's
                    // text content stream — pdf.js (used below) can't see
                    // them at all. Try pdf-lib field extraction on every PDF
                    // attachment FIRST, ahead of the "visible preview"
                    // shortcut below (Canvas's own rendered preview is just
                    // as blind to form field values, so it must not win the
                    // race here). Only falls through to the old path when a
                    // PDF has no fields at all (e.g. a flattened/printed
                    // submission, which has real page text instead).
                    var fieldParts=[];
                    for(var pi=0; pi<c.attachments.length; pi++){
                        var patt=c.attachments[pi];
                        if(!/\.pdf$/i.test(patt.filename||"")) continue;
                        try{
                            setAiStatus("Checking "+patt.filename+" for fillable form fields…","info");
                            var pResp=await fetch(patt.url,{credentials:"same-origin"});
                            var pBytes=new Uint8Array(await pResp.arrayBuffer());
                            var pExtracted=await sgExtractPdfFormValues(pBytes);
                            if(pExtracted && pExtracted.hasFields){
                                var pLines=[];
                                var pAnswerFields=criteria.answerFields;
                                if(pAnswerFields && pAnswerFields.length){
                                    pAnswerFields.forEach(function(af){
                                        var av=pExtracted.values[af.name];
                                        pLines.push(af.label+": "+((av&&String(av).trim())?av:"(blank)"));
                                    });
                                }else{
                                    Object.keys(pExtracted.values).forEach(function(vk){ pLines.push(vk+": "+pExtracted.values[vk]); });
                                }
                                fieldParts.push("["+patt.filename+" — student's filled-in answers]\n"+pLines.join("\n"));
                            }
                        }catch(e){ /* fall through to the normal handling below for this attachment */ }
                    }
                    if(fieldParts.length){
                        c=Object.assign({},c,{subText:fieldParts.join("\n\n")});
                    }else{
                        var visible2=sgVisibleSubmissionText();
                        if(visible2 && visible2.length>200){
                            c=Object.assign({},c,{subText:"[Visible preview]\n"+visible2});
                        }else{
                            var parts=[];
                            for(var i=0;i<c.attachments.length;i++){
                                var att=c.attachments[i];
                                setAiStatus("Reading "+att.filename+"…","info");
                                try{
                                    var text=await sgParseAttachmentText(att);
                                    parts.push("["+att.filename+"]\n"+text);
                                }catch(err){
                                    var fb=sgVisibleSubmissionText();
                                    if(fb && fb.length>200){ parts.push("["+att.filename+"]\n"+fb); }
                                    else{ throw new Error("Could not read "+att.filename+": "+err.message); }
                                }
                            }
                            c=Object.assign({},c,{subText:parts.join("\n\n")});
                        }
                    }
                }
                setAiStatus(criteriaText?("Generating "+(criteria.pointsPossible?("/"+criteria.pointsPossible):"")+" score and feedback…"):"No grading criteria set for this assignment — grading generically. Set criteria in the Grading Criteria tab for better results.", criteriaText?"info":"warn");
                var prompt=sgBuildPrompt(c, criteriaText);
                var raw=await sgSendClaude(prompt, 1500);
                var text=(raw||"").trim();
                if(!text) throw new Error("Empty response — check your Claude API key in AI Content > Setup");
                var p=sgParseAi(text);
                drawer.querySelector("#cmb-sg-score-input").value=p.score;
                drawer.querySelector("#cmb-sg-draft-input").value=p.comments;
                if(p.teacherCheck){
                    var tb=drawer.querySelector("#cmb-sg-teacher-box");
                    tb.style.display="block";
                    tb.className="cmb-sg-tchbox";
                    tb.textContent="⚠ Teacher check: "+p.teacherCheck;
                }
                setAiStatus(p.score?("Suggested score: "+p.score):"Graded — review the feedback below.", "success");
            }catch(err){
                if(err.message==="reload-needed"){ setAiStatus("", ""); }
                else setAiStatus("Error: "+err.message, "error");
            }
            runBtn.disabled=false; runBtn.textContent="✨ Grade This Submission";
        });

        drawer.querySelector("#cmb-sg-insert-score-btn").addEventListener("click", function(){
            var v=drawer.querySelector("#cmb-sg-score-input").value.trim();
            if(!v){ sgToast("No score to insert", false); return; }
            sgInsertGrade(v);
        });
        drawer.querySelector("#cmb-sg-insert-comment-btn").addEventListener("click", function(){
            var v=drawer.querySelector("#cmb-sg-draft-input").value.trim();
            if(!v){ sgToast("No feedback to insert", false); return; }
            sgInsertComment(v, false);
        });
    }

    function sgRenderCriteriaDrawer(drawer){
        var c=sgGetCriteria();
        var helpHtml="Set a rubric, answer key, or point value once per assignment — every AI Grade run for every student on this assignment will use it. Fields save automatically as you type, no separate Save button needed.";
        sgMakeHeader(drawer, "🎯", "Grading Criteria", sgState.assignmentName||"Assignment", helpHtml);
        var h='<div class="cmb-sg-dbody"><div class="cmb-sg-mbody-split">';
        h+='<div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Points Possible</label><input type="number" class="cmb-sg-input" id="cmb-sg-c-points" value="'+esc(c.pointsPossible||"")+'"></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Difficulty</label><select class="cmb-sg-select" id="cmb-sg-c-difficulty">';
        [["standard","Standard"],["easy","Easy"],["challenging","Challenging"],["advanced","Advanced"]].forEach(function(o){
            h+='<option value="'+o[0]+'"'+((c.difficulty||"standard")===o[0]?" selected":"")+'>'+o[1]+"</option>";
        });
        h+='</select></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Suggested Comments</label><textarea class="cmb-sg-textarea" id="cmb-sg-c-suggested" rows="4">'+esc(c.suggestedComments||"")+'</textarea></div>';
        h+='</div><div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Rubric</label><textarea class="cmb-sg-textarea" id="cmb-sg-c-rubric" rows="4">'+esc(c.rubric||"")+'</textarea></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Answer Key</label><textarea class="cmb-sg-textarea" id="cmb-sg-c-answerkey" rows="4">'+esc(c.answerKey||"")+'</textarea></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Additional Instructions</label><textarea class="cmb-sg-textarea" id="cmb-sg-c-notes" rows="3">'+esc(c.aiNotes||"")+'</textarea></div>';
        h+='</div></div></div>';
        h+='<div class="cmb-sg-dfoot"><button class="cmb-sg-abtn cmb-sg-abtn-secondary" id="cmb-sg-c-done">Done</button></div>';
        drawer.insertAdjacentHTML("beforeend", h);

        var fieldMap=[["cmb-sg-c-points","pointsPossible"],["cmb-sg-c-difficulty","difficulty"],["cmb-sg-c-suggested","suggestedComments"],
            ["cmb-sg-c-rubric","rubric"],["cmb-sg-c-answerkey","answerKey"],["cmb-sg-c-notes","aiNotes"]];
        fieldMap.forEach(function(pair){
            var el=drawer.querySelector("#"+pair[0]);
            var evt=el.tagName==="SELECT"?"change":"input";
            el.addEventListener(evt, function(){ sgSaveCriteriaField(pair[1], el.value); });
        });
        drawer.querySelector("#cmb-sg-c-done").addEventListener("click", sgCloseDrawer);
    }

    // ── Comment Snippets ──

    function sgLoadSnippets(){
        if(localStorage.getItem(SG_SNIPPET_VER_KEY)!==SG_SNIPPET_VER){
            try{
                localStorage.setItem(SG_SNIPPETS_KEY, SG_DEFAULT_SNIPPETS.join("\n\n"));
                localStorage.setItem(SG_SNIPPET_VER_KEY, SG_SNIPPET_VER);
            }catch(e){}
        }
        var raw=localStorage.getItem(SG_SNIPPETS_KEY)||SG_DEFAULT_SNIPPETS.join("\n\n");
        return raw.split(/\n\s*\n/).map(function(s){return s.trim();}).filter(Boolean);
    }

    function sgSaveSnippets(list){
        try{ localStorage.setItem(SG_SNIPPETS_KEY, list.join("\n\n")); }catch(e){}
    }

    function sgRenderCommentsDrawer(drawer){
        var helpHtml="Reusable feedback phrases you write once and insert with one click while grading. Click a snippet to insert it into the comment box (appending to anything already there), or edit/delete it from the list.";
        sgMakeHeader(drawer, "💬", "Comment Snippets", null, helpHtml);
        function draw(){
            var snippets=sgLoadSnippets();
            var h='';
            if(!snippets.length){
                h+='<div style="font-size:12px;color:#94A3B8;">No snippets yet — add one below.</div>';
            }else{
                snippets.forEach(function(s,i){
                    h+='<div class="cmb-sg-snippet"><div class="cmb-sg-snippet-text">'+esc(s)+'</div>';
                    h+='<button class="cmb-sg-abtn cmb-sg-abtn-success" style="padding:5px 10px;font-size:11px;" data-i="'+i+'" data-act="use">Insert</button>';
                    h+='<button class="cmb-sg-abtn cmb-sg-abtn-secondary" style="padding:5px 10px;font-size:11px;" data-i="'+i+'" data-act="del">✕</button></div>';
                });
            }
            h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Add a snippet</label><textarea class="cmb-sg-textarea" id="cmb-sg-snip-new" rows="2" placeholder="Type a reusable comment..."></textarea></div>';
            h+='<button class="cmb-sg-abtn cmb-sg-abtn-primary" id="cmb-sg-snip-add">+ Add Snippet</button> ';
            h+='<button class="cmb-sg-abtn cmb-sg-abtn-secondary" id="cmb-sg-snip-reset">Reset to Defaults</button>';
            drawer.querySelector("#cmb-sg-dbody-mount").innerHTML=h;

            drawer.querySelectorAll('[data-act="use"]').forEach(function(btn){
                btn.addEventListener("click", function(){ sgInsertComment(snippets[parseInt(btn.dataset.i,10)], true); });
            });
            drawer.querySelectorAll('[data-act="del"]').forEach(function(btn){
                btn.addEventListener("click", function(){
                    snippets.splice(parseInt(btn.dataset.i,10),1);
                    sgSaveSnippets(snippets);
                    draw();
                });
            });
            drawer.querySelector("#cmb-sg-snip-add").addEventListener("click", function(){
                var ta=drawer.querySelector("#cmb-sg-snip-new");
                var v=ta.value.trim();
                if(!v) return;
                snippets.push(v);
                sgSaveSnippets(snippets);
                draw();
            });
            drawer.querySelector("#cmb-sg-snip-reset").addEventListener("click", function(){
                if(!confirm("Reset to the built-in default snippets? This replaces your current list.")) return;
                try{ localStorage.setItem(SG_SNIPPETS_KEY, SG_DEFAULT_SNIPPETS.join("\n\n")); }catch(e){}
                draw();
            });
        }
        drawer.insertAdjacentHTML("beforeend", '<div class="cmb-sg-dbody" id="cmb-sg-dbody-mount"></div>');
        draw();
    }

    // ── Needs-Grading Queue ──

    async function sgCanvasAPIAllFor(courseId, path){
        var url = "/api/v1/courses/" + courseId + path + (path.indexOf("?") >= 0 ? "&" : "?") + "per_page=100";
        var results = [];
        while(url){
            var resp = await fetch(url, { credentials: "same-origin" });
            if(!resp.ok) throw new Error("Canvas API error " + resp.status);
            results = results.concat(await resp.json());
            var link = resp.headers.get("Link") || "";
            var nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
            url = nextMatch ? nextMatch[1] : null;
        }
        return results;
    }

    async function sgRootAPIAll(path){
        var url = "/api/v1"+path+(path.indexOf("?")>=0?"&":"?")+"per_page=100";
        var results=[];
        while(url){
            var resp=await fetch(url, {credentials:"same-origin"});
            if(!resp.ok) throw new Error("Canvas API error "+resp.status);
            results=results.concat(await resp.json());
            var link=resp.headers.get("Link")||"";
            var nextMatch=link.match(/<([^>]+)>;\s*rel="next"/);
            url=nextMatch?nextMatch[1]:null;
        }
        return results;
    }

    async function sgFetchCourseQueue(courseId){
        var assignments, subs;
        try{
            var res = await Promise.all([
                sgCanvasAPIAllFor(courseId, "/assignments?order_by=due_at"),
                sgCanvasAPIAllFor(courseId, "/students/submissions?student_ids[]=all&include[]=user")
            ]);
            assignments=res[0]; subs=res[1];
        }catch(e){ return { assignmentMap:{}, subs:[] }; }
        var assignmentMap={};
        assignments.forEach(function(a){ if(Number(a.needs_grading_count||0)>0) assignmentMap[a.id]=a; });
        var filteredSubs=subs.filter(function(s){
            if(!assignmentMap[s.assignment_id]) return false;
            if(s.workflow_state!=="submitted") return false;
            var name=(s.user&&(s.user.name||s.user.sortable_name))||"";
            if(/^test student$/i.test(name)) return false;
            return true;
        });
        return { assignmentMap:assignmentMap, subs:filteredSubs };
    }

    function sgSetQueueBadge(count){
        var badge=document.getElementById("cmb-sg-queue-badge");
        if(!badge) return;
        if(count>0){ badge.textContent=String(count); badge.style.display="inline-block"; }
        else{ badge.style.display="none"; }
    }

    function sgRenderCourseSection(container, courseName, subs, assignmentMap, courseId){
        var h='<div style="font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.04em;margin:14px 0 8px;">'+esc(courseName)+'</div>';
        if(!subs.length){
            h+='<div style="font-size:12px;color:#94A3B8;margin-bottom:8px;">All caught up here.</div>';
        }else{
            subs.forEach(function(s,i){
                var a=assignmentMap[s.assignment_id];
                var name=(s.user&&(s.user.name||s.user.sortable_name))||("Student "+s.user_id);
                h+='<div class="cmb-sg-qitem" data-i="'+i+'" data-cid="'+courseId+'" data-aid="'+s.assignment_id+'" data-uid="'+s.user_id+'"><div><div class="cmb-sg-qname">'+esc(name)+'</div><div class="cmb-sg-qmeta">'+esc(a?a.name:"Assignment")+'</div></div><div class="cmb-sg-qmeta">→</div></div>';
            });
        }
        var wrap=document.createElement("div");
        wrap.innerHTML=h;
        container.appendChild(wrap);
        wrap.querySelectorAll(".cmb-sg-qitem").forEach(function(row){
            row.addEventListener("click", function(){
                location.href = location.origin+"/courses/"+row.dataset.cid+"/gradebook/speed_grader?assignment_id="+row.dataset.aid+"&student_id="+row.dataset.uid;
            });
        });
    }

    async function sgLoadQueue(showInDrawer, drawer){
        var courseId=sgState.courseId||getCourseId();
        if(!courseId) return;
        var current=await sgFetchCourseQueue(courseId);
        sgSetQueueBadge(current.subs.length);
        if(!showInDrawer || !drawer) return;

        var body=drawer.querySelector("#cmb-sg-queue-body");
        body.innerHTML='<div style="font-size:12px;color:#94A3B8;">Loading…</div>';
        var container=document.createElement("div");
        sgRenderCourseSection(container, "This Course", current.subs, current.assignmentMap, courseId);

        var filterPublished = localStorage.getItem(SG_FILTER_PUB_KEY)!=="false";
        var filterDashboard = localStorage.getItem(SG_FILTER_DASH_KEY)!=="false";
        var grandTotal=current.subs.length;

        try{
            var allCourses=await sgRootAPIAll("/courses?enrollment_type=teacher");
            var otherCourses=allCourses.filter(function(c){ return String(c.id)!==String(courseId); });
            if(filterPublished) otherCourses=otherCourses.filter(function(c){ return c.workflow_state==="available"; });
            if(filterDashboard){
                try{
                    var favs=await sgRootAPIAll("/users/self/favorites/courses");
                    var favIds={}; favs.forEach(function(c){ favIds[c.id]=true; });
                    otherCourses=otherCourses.filter(function(c){ return favIds[c.id]; });
                }catch(e){}
            }
            otherCourses=otherCourses.slice(0,10);
            var results=await Promise.all(otherCourses.map(function(c){
                return sgFetchCourseQueue(c.id).then(function(r){ return {course:c, r:r}; }).catch(function(){ return {course:c, r:{assignmentMap:{},subs:[]}}; });
            }));
            results.forEach(function(item){
                if(item.r.subs.length){
                    sgRenderCourseSection(container, item.course.name, item.r.subs, item.r.assignmentMap, item.course.id);
                    grandTotal+=item.r.subs.length;
                }
            });
        }catch(e){}

        body.innerHTML="";
        var summary=document.createElement("div");
        summary.style.cssText="font-size:12px;color:#475569;margin-bottom:8px;";
        summary.textContent = grandTotal>0 ? (grandTotal+" student"+(grandTotal!==1?"s":"")+" need grading across all courses.") : "All caught up — nothing needs grading.";
        body.appendChild(summary);
        body.appendChild(container);
        sgSetQueueBadge(grandTotal);
    }

    function sgRenderQueueDrawer(drawer){
        var helpHtml="Shows every student submission still waiting to be graded — for this course, and optionally across your other courses too. Click any row to jump straight into that student's SpeedGrader.";
        sgMakeHeader(drawer, "📋", "Grade Queue", null, helpHtml);
        var h='<div class="cmb-sg-dbody">';
        h+='<div style="display:flex;gap:16px;margin-bottom:12px;font-size:12px;color:#475569;">';
        h+='<label><input type="checkbox" id="cmb-sg-filter-pub" '+(localStorage.getItem(SG_FILTER_PUB_KEY)!=="false"?"checked":"")+'> Published only</label>';
        h+='<label><input type="checkbox" id="cmb-sg-filter-dash" '+(localStorage.getItem(SG_FILTER_DASH_KEY)!=="false"?"checked":"")+'> Dashboard only</label>';
        h+='</div>';
        h+='<div id="cmb-sg-queue-body"></div>';
        h+='</div>';
        drawer.insertAdjacentHTML("beforeend", h);
        drawer.querySelector("#cmb-sg-filter-pub").addEventListener("change", function(e){
            try{ localStorage.setItem(SG_FILTER_PUB_KEY, String(e.target.checked)); }catch(err){}
            sgLoadQueue(true, drawer);
        });
        drawer.querySelector("#cmb-sg-filter-dash").addEventListener("change", function(e){
            try{ localStorage.setItem(SG_FILTER_DASH_KEY, String(e.target.checked)); }catch(err){}
            sgLoadQueue(true, drawer);
        });
        sgLoadQueue(true, drawer);
    }

    // ══════════════════════════════════════════════════════════════════════
    // CHEATING DETECTION AUDIT
    // Six independent checks over one assignment's submissions: text
    // similarity, submission timing/filename patterns, and (if quiz-linked)
    // tab-switching, completion speed, and wrong-answer matching. Instructor
    // review tool only — never claims to determine misconduct itself.
    // ══════════════════════════════════════════════════════════════════════

    var SG_STOPWORDS=["the","and","that","with","this","from","have","were","been","they","their","there",
        "what","when","where","which","would","could","should","about","because"];

    function sgNormalizeText(text){
        return (text||"").toLowerCase().replace(/https?:\/\/\S+/g,"").replace(/[^a-z0-9\s']/g," ").replace(/\s+/g," ").trim();
    }
    function sgTokensFor(text){
        return sgNormalizeText(text).split(" ").filter(function(w){
            return w.length>3 && SG_STOPWORDS.indexOf(w)<0;
        });
    }
    function sgShingles(tokens, size){
        size=size||5;
        var out=new Set();
        for(var i=0;i<=tokens.length-size;i++) out.add(tokens.slice(i,i+size).join(" "));
        return out;
    }
    function sgCompareDocs(a,b){
        var shared=[];
        a.shingles.forEach(function(item){ if(b.shingles.has(item)) shared.push(item); });
        var unionSize=a.shingles.size+b.shingles.size-shared.length || 1;
        return { similarity: shared.length/unionSize, sharedCount: shared.length, samples: shared.slice(0,8) };
    }

    function sgHtmlToText(html){
        var d=document.createElement("div");
        d.innerHTML=html||"";
        return (d.textContent||d.innerText||"").trim();
    }

    async function sgSubmissionTextForAudit(sub){
        if(sub.submission_type==="online_text_entry" && sub.body) return sgHtmlToText(sub.body);
        if(sub.submission_type==="online_url" && sub.url) return "URL submission: "+sub.url;
        if(sub.attachments && sub.attachments.length){
            var parts=[];
            var atts=sub.attachments.slice(0,3);
            for(var i=0;i<atts.length;i++){
                try{
                    var att=atts[i];
                    var fileObj=await (async function(){
                        var resp=await fetch(att.url, {credentials:"same-origin"});
                        if(!resp.ok) throw new Error("download failed");
                        var blob=await resp.blob();
                        return new File([blob], att.filename||att.display_name||"file", {type:att["content-type"]||att.content_type||blob.type||""});
                    })();
                    parts.push(await parseFile(fileObj));
                }catch(e){ /* unreadable attachment — skip it, don't fail the whole submission */ }
            }
            return parts.join("\n\n");
        }
        return "";
    }

    async function sgFetchQuizSubmissions(courseId, quizId){
        var resp=await fetch("/api/v1/courses/"+courseId+"/quizzes/"+quizId+"/submissions?include[]=submission_data&include[]=user&per_page=100", {credentials:"same-origin"});
        if(!resp.ok) throw new Error("Could not load quiz submissions");
        var data=await resp.json();
        var usersById={};
        (data.users||[]).forEach(function(u){ usersById[u.id]=u; });
        (data.quiz_submissions||[]).forEach(function(qs){
            var u=usersById[qs.user_id];
            qs._name=(u&&(u.sortable_name||u.name))||("Student "+qs.user_id);
        });
        return data.quiz_submissions||[];
    }

    async function sgFetchQuizEvents(courseId, quizId, submissionId){
        try{
            var resp=await fetch("/api/v1/courses/"+courseId+"/quizzes/"+quizId+"/submissions/"+submissionId+"/events", {credentials:"same-origin"});
            if(!resp.ok) return null;
            var data=await resp.json();
            return data.quiz_submission_events||data.events||[];
        }catch(e){ return null; }
    }

    var SG_CHECK_LABELS={
        read:"Submission Reading", similarity:"Submission Similarity", timing:"Timing & File Patterns",
        quizBlur:"Quiz Tab Switching", quizSpeed:"Quiz Completion Speed", quizAnswers:"Quiz Answer Matching"
    };

    function sgNewCheckState(){
        var s={};
        Object.keys(SG_CHECK_LABELS).forEach(function(k){ s[k]={ label:SG_CHECK_LABELS[k], status:"pending", detail:"" }; });
        return s;
    }

    // Generic filename exclusion — too common to be meaningful evidence.
    var SG_GENERIC_FILENAME=/^(submission|assignment|document|homework|essay|paper)\.(docx?|pdf|xlsx?)$/i;

    function sgRunTimingCheck(submittedSubmissions){
        var timeClusters=[], sameFilename=[];
        var byWindow={};
        submittedSubmissions.forEach(function(s){
            if(!s.submitted_at) return;
            var t=Date.parse(s.submitted_at); if(isNaN(t)) return;
            var key=Math.floor(t/120000);
            if(!byWindow[key]) byWindow[key]=[];
            byWindow[key].push({name:(s.user&&(s.user.name||s.user.sortable_name))||("Student "+s.user_id), submittedAt:s.submitted_at});
        });
        Object.keys(byWindow).forEach(function(key){
            if(byWindow[key].length>=3){
                timeClusters.push({ type:"timeCluster", names:byWindow[key].map(function(x){return x.name;}), submittedAt:byWindow[key][0].submittedAt, detail:byWindow[key].length+" submissions within the same 2-minute window" });
            }
        });
        var byFilename={};
        submittedSubmissions.forEach(function(s){
            (s.attachments||[]).forEach(function(att){
                var fn=(att.filename||att.display_name||"").toLowerCase().trim();
                if(!fn || SG_GENERIC_FILENAME.test(fn)) return;
                if(!byFilename[fn]) byFilename[fn]=[];
                var name=(s.user&&(s.user.name||s.user.sortable_name))||("Student "+s.user_id);
                if(byFilename[fn].indexOf(name)<0) byFilename[fn].push(name);
            });
        });
        Object.keys(byFilename).forEach(function(fn){
            if(byFilename[fn].length>=2){
                sameFilename.push({ type:"sameFilename", filename:fn, names:byFilename[fn], detail:byFilename[fn].length+" students submitted a file named \""+fn+"\"" });
            }
        });
        return timeClusters.concat(sameFilename);
    }

    function sgRunAnswerMatchCheck(quizSubs){
        var hasAnswerData=quizSubs.some(function(s){ return Array.isArray(s.submission_data) && s.submission_data.length; });
        if(!hasAnswerData) return { unavailable:true, pairs:[] };
        var wrongMaps=quizSubs.map(function(s){
            var m={};
            (s.submission_data||[]).forEach(function(q){
                if(q.correct===false && q.answer!=null) m[q.question_id]=q.answer;
            });
            return { name:s._name, m:m };
        });
        var pairs=[];
        for(var i=0;i<wrongMaps.length;i++){
            for(var j=i+1;j<wrongMaps.length;j++){
                var a=wrongMaps[i], b=wrongMaps[j], shared=0;
                Object.keys(a.m).forEach(function(qid){
                    if(b.m.hasOwnProperty(qid) && String(a.m[qid])===String(b.m[qid])) shared++;
                });
                if(shared>=2) pairs.push({ aName:a.name, bName:b.name, matchCount:shared });
            }
        }
        pairs.sort(function(x,y){ return y.matchCount-x.matchCount; });
        return { unavailable:false, pairs:pairs };
    }

    async function sgRunAudit(courseId, assignmentId, assignmentName, onProgress){
        var checkState=sgNewCheckState();
        function setCheck(id, status, detail){ checkState[id]={ label:SG_CHECK_LABELS[id], status:status, detail:detail||"" }; if(onProgress) onProgress(checkState); }

        setCheck("read","running");
        var assignment;
        try{ assignment=await canvasAPI("GET","/assignments/"+assignmentId); }catch(e){ assignment={}; }

        var allSubs;
        try{ allSubs=await sgCanvasAPIAllFor(courseId, "/assignments/"+assignmentId+"/submissions?include[]=user&include[]=attachments"); }
        catch(e){ allSubs=[]; }
        var submittedSubmissions=allSubs.filter(function(s){ return s.workflow_state!=="unsubmitted"; });
        var candidates=submittedSubmissions.filter(function(s){ return s.body || s.url || (s.attachments&&s.attachments.length); });

        var docs=[];
        for(var i=0;i<candidates.length;i++){
            var sub=candidates[i];
            var name=(sub.user&&(sub.user.name||sub.user.sortable_name))||("Student "+sub.user_id);
            if(onProgress) onProgress(checkState, "Reading "+name+"'s submission…");
            var text=await sgSubmissionTextForAudit(sub).catch(function(){ return ""; });
            var toks=sgTokensFor(text);
            if(toks.length>=40) docs.push({ name:name, tokens:toks, shingles:sgShingles(toks,5) });
        }
        setCheck("read", docs.length?"complete":"skipped", "Read "+docs.length+" usable submission"+(docs.length!==1?"s":"")+" from "+submittedSubmissions.length+" Canvas submission"+(submittedSubmissions.length!==1?"s":"")+".");

        setCheck("similarity","running");
        var flags=[];
        for(var a=0;a<docs.length;a++){
            for(var b=a+1;b<docs.length;b++){
                var cmp=sgCompareDocs(docs[a],docs[b]);
                if(cmp.similarity>=0.22 || cmp.sharedCount>=18){
                    flags.push({ aName:docs[a].name, bName:docs[b].name, similarity:cmp.similarity, sharedCount:cmp.sharedCount, samples:cmp.samples });
                }
            }
        }
        flags.sort(function(x,y){ return (y.similarity-x.similarity) || (y.sharedCount-x.sharedCount); });
        setCheck("similarity", flags.length?"flagged":"complete", flags.length?(flags.length+" pair"+(flags.length!==1?"s":"")+" flagged for review."):"No unusually similar submissions found.");

        setCheck("timing","running");
        var timingFlags = submittedSubmissions.length ? sgRunTimingCheck(submittedSubmissions) : [];
        setCheck("timing", !submittedSubmissions.length?"skipped":(timingFlags.length?"flagged":"complete"), timingFlags.length?(timingFlags.length+" pattern"+(timingFlags.length!==1?"s":"")+" flagged."):"No unusual timing/filename patterns found.");

        var quizBlurFlags=[], quizSpeedFlags=[], quizAnswerPairs=[];
        if(!assignment.quiz_id){
            setCheck("quizBlur","skipped","This Canvas assignment is not linked to a quiz.");
            setCheck("quizSpeed","skipped","This Canvas assignment is not linked to a quiz.");
            setCheck("quizAnswers","skipped","This Canvas assignment is not linked to a quiz.");
        }else{
            setCheck("quizBlur","running"); setCheck("quizSpeed","running"); setCheck("quizAnswers","running");
            var quizInfo=null, quizSubs=[];
            try{
                var qRes=await Promise.all([
                    fetch("/api/v1/courses/"+courseId+"/quizzes/"+assignment.quiz_id, {credentials:"same-origin"}).then(function(r){return r.ok?r.json():null;}),
                    sgFetchQuizSubmissions(courseId, assignment.quiz_id)
                ]);
                quizInfo=qRes[0]; quizSubs=qRes[1];
            }catch(e){}

            // Quiz Tab Switching
            var blurUnavailable=false;
            for(var qi=0;qi<quizSubs.length;qi++){
                var events=await sgFetchQuizEvents(courseId, assignment.quiz_id, quizSubs[qi].id);
                if(events===null){ if(qi===0){ blurUnavailable=true; } break; }
                var blurCount=events.filter(function(e){return e.event_type==="page_blurred";}).length;
                if(blurCount>=3) quizBlurFlags.push({ name:quizSubs[qi]._name, blurCount:blurCount });
            }
            setCheck("quizBlur", blurUnavailable?"unavailable":(quizBlurFlags.length?"flagged":"complete"),
                blurUnavailable?"Tab-switch event data is not available for this quiz.":(quizBlurFlags.length?(quizBlurFlags.length+" student(s) flagged for repeated tab switching."):"No excessive tab switching found."));

            // Quiz Completion Speed
            var timeLimitMinutes=quizInfo&&quizInfo.time_limit;
            if(!timeLimitMinutes){
                setCheck("quizSpeed","skipped","This quiz has no time limit configured.");
            }else{
                quizSubs.forEach(function(s){
                    if(s.time_spent!=null && s.finished_at && s.quiz_points_possible){
                        var ratio=s.time_spent/(timeLimitMinutes*60);
                        var scoreRatio=(s.score||0)/s.quiz_points_possible;
                        if(ratio<0.25 && scoreRatio>0.65){
                            quizSpeedFlags.push({ name:s._name, timeSpent:s.time_spent, pct:Math.round(ratio*100), score:s.score, possible:s.quiz_points_possible, scorePct:Math.round(scoreRatio*100) });
                        }
                    }
                });
                setCheck("quizSpeed", quizSpeedFlags.length?"flagged":"complete", quizSpeedFlags.length?(quizSpeedFlags.length+" student(s) finished unusually fast with a high score."):"No unusually fast high-scoring completions found.");
            }

            // Quiz Answer Matching
            var answerResult=sgRunAnswerMatchCheck(quizSubs);
            quizAnswerPairs=answerResult.pairs;
            setCheck("quizAnswers", answerResult.unavailable?"unavailable":(quizAnswerPairs.length?"flagged":"complete"),
                answerResult.unavailable?"Per-question answer data is not available for this quiz.":(quizAnswerPairs.length?(quizAnswerPairs.length+" pair(s) flagged for matching wrong answers."):"No matching wrong-answer patterns found."));
        }

        return {
            assignmentName: assignmentName||assignment.name||"Assignment", createdAt: Date.now(),
            checked: docs.length, total: submittedSubmissions.length,
            docs: docs.map(function(d){ return {name:d.name, tokens:d.tokens.length}; }),
            flags: flags, timingFlags: timingFlags, quizBlurFlags: quizBlurFlags,
            quizSpeedFlags: quizSpeedFlags, quizAnswerPairs: quizAnswerPairs,
            checks: checkState
        };
    }

    // In-memory only (like the original) — persists across drawer close/
    // reopen for the lifetime of this page, cleared on navigation/reload.
    var sgAuditCache={};

    function sgCheckColors(status){
        var map={
            flagged:{color:"#EF4444",label:"Flagged"}, complete:{color:"#22C55E",label:"Clear"},
            running:{color:"#3B82F6",label:"Checking…"}, unavailable:{color:"#94A3B8",label:"Not available"},
            skipped:{color:"#CBD5E1",label:"N/A"}
        };
        return map[status]||{color:"#CBD5E1",label:"Waiting"};
    }

    var SG_CHECK_EXPLAIN={
        similarity:"Compares every pair of submissions for unusually high overlap in 5-word phrases. Common causes of overlap that are NOT misconduct: shared prompt/template text, quoting the same source material, or authorized group work.",
        timing:"Flags 3+ submissions turned in within the same 2-minute window, or the same non-generic filename shared by 2+ students.",
        quizBlur:"Flags students whose quiz attempt recorded 3 or more tab-switch/focus-loss events. Accessibility tools, screen readers, or a second monitor can trigger false positives.",
        quizSpeed:"Flags students who finished in under 25% of the allotted time while scoring over 65% — unusually fast for a high score.",
        quizAnswers:"Flags pairs of students who chose the exact same WRONG answer on 2 or more questions — a strong signal since coincidentally matching wrong answers is statistically unlikely."
    };

    function sgGetInlineRows(checkId, report){
        var rows=[];
        if(checkId==="similarity"){
            report.flags.slice(0,8).forEach(function(f){ rows.push(f.aName+" ↔ "+f.bName+" — "+Math.round(f.similarity*100)+"% overlap · "+f.sharedCount+" shared phrases"); });
        }else if(checkId==="timing"){
            report.timingFlags.slice(0,8).forEach(function(f){
                var names=f.names.slice(0,3).join(", ")+(f.names.length>3?(" +"+(f.names.length-3)+" more"):"");
                rows.push((f.type==="sameFilename"?("Same filename: "+f.filename):"Submitted in same 2-minute window")+" — "+names);
            });
        }else if(checkId==="quizBlur"){
            report.quizBlurFlags.slice(0,8).forEach(function(f){ rows.push(f.name+" — "+f.blurCount+" tab switches recorded"); });
        }else if(checkId==="quizSpeed"){
            report.quizSpeedFlags.slice(0,8).forEach(function(f){ rows.push(f.name+" — "+f.pct+"% of time used · "+f.scorePct+"% score"); });
        }else if(checkId==="quizAnswers"){
            report.quizAnswerPairs.slice(0,8).forEach(function(f){ rows.push(f.aName+" ↔ "+f.bName+" — "+f.matchCount+" matching wrong answers"); });
        }
        return rows;
    }

    function sgRenderAuditDrawer(drawer, ctx){
        var courseId=sgState.courseId, assignmentId=sgState.assignmentId, assignmentName=sgState.assignmentName||"Assignment";
        var helpHtml="Runs six independent checks over this assignment's submissions and flags anything worth a closer look — text similarity, submission timing, and (for quizzes) tab-switching, completion speed, and wrong-answer matching. This tool does not determine whether misconduct occurred — only you can make that judgment after reviewing the flagged items.";
        sgMakeHeader(drawer, "🔎", "Cheating Detection Audit", assignmentName, helpHtml);
        drawer.insertAdjacentHTML("beforeend", '<div class="cmb-sg-dbody" id="cmb-sg-audit-body"></div><div class="cmb-sg-dfoot"><button class="cmb-sg-abtn cmb-sg-abtn-secondary" id="cmb-sg-audit-rerun">↻ Re-run</button><button class="cmb-sg-abtn cmb-sg-abtn-primary" id="cmb-sg-audit-print">🖨 Print Full Report</button></div>');
        var body=drawer.querySelector("#cmb-sg-audit-body");

        function renderList(report, running){
            var h='';
            var totalFlags=report.flags.length+report.timingFlags.length+report.quizBlurFlags.length+report.quizSpeedFlags.length+report.quizAnswerPairs.length;
            h+='<div class="cmb-sg-status '+(totalFlags?"cmb-sg-status-error":"cmb-sg-status-success")+'">'+(totalFlags?(totalFlags+" item"+(totalFlags!==1?"s":"")+" flagged for review."):"✓ All clear.")+'</div>';
            Object.keys(report.checks).forEach(function(id){
                var c=report.checks[id];
                if(!running && (c.status==="skipped"||c.status==="unavailable")) return;
                var colors=sgCheckColors(c.status);
                h+='<div class="cmb-sg-check-row '+c.status+'"><span class="cmb-sg-check-dot" style="background:'+colors.color+';"></span><span class="cmb-sg-check-title">'+esc(c.label)+'</span> <span style="font-size:11px;color:'+colors.color+';font-weight:700;">'+colors.label+'</span>';
                if(c.detail) h+='<div class="cmb-sg-check-detail">'+esc(c.detail)+'</div>';
                if(c.status==="flagged"){
                    var rows=sgGetInlineRows(id, report);
                    rows.forEach(function(r){ h+='<div class="cmb-sg-check-inline">'+esc(r)+'</div>'; });
                    h+='<button class="cmb-sg-abtn cmb-sg-abtn-secondary" style="margin-top:8px;padding:5px 10px;font-size:11px;" data-checkid="'+id+'">Open full report →</button>';
                }
                h+='</div>';
            });
            body.innerHTML=h;
            body.querySelectorAll("[data-checkid]").forEach(function(btn){
                btn.addEventListener("click", function(){ sgOpenFullAuditReport(report, [btn.dataset.checkid]); });
            });
        }

        function run(){
            body.innerHTML='<div style="font-size:12px;color:#94A3B8;">Running checks…</div>';
            sgRunAudit(courseId, assignmentId, assignmentName, function(checkState, progressMsg){
                if(progressMsg) body.innerHTML='<div style="font-size:12px;color:#94A3B8;">'+esc(progressMsg)+'</div>';
            }).then(function(report){
                sgAuditCache[assignmentId]=report;
                renderList(report, false);
            }).catch(function(err){
                body.innerHTML='<div class="cmb-sg-status cmb-sg-status-error">Audit failed: '+esc(err.message)+'</div>';
            });
        }

        if(sgAuditCache[assignmentId]){ renderList(sgAuditCache[assignmentId], false); }
        else{ run(); }

        drawer.querySelector("#cmb-sg-audit-rerun").addEventListener("click", function(){ delete sgAuditCache[assignmentId]; run(); });
        drawer.querySelector("#cmb-sg-audit-print").addEventListener("click", function(){
            var report=sgAuditCache[assignmentId];
            if(!report){ sgToast("Run the audit first", false); return; }
            var includeIds=Object.keys(report.checks).filter(function(id){ var s=report.checks[id].status; return s!=="skipped"&&s!=="unavailable"&&s!=="pending"; });
            sgOpenFullAuditReport(report, includeIds);
        });
    }

    function sgCheckReportRows(checkId, report){
        if(checkId==="similarity"){
            return report.flags.map(function(f){
                return "<tr><td>"+esc(f.aName)+" ↔ "+esc(f.bName)+"</td><td>"+Math.round(f.similarity*100)+"%</td><td>"+f.sharedCount+"</td><td>"+esc((f.samples||[]).slice(0,3).join("; "))+"</td></tr>";
            }).join("");
        }
        if(checkId==="timing"){
            return report.timingFlags.map(function(f){
                return "<tr><td>"+(f.type==="sameFilename"?"Same filename":"Same time window")+"</td><td>"+esc(f.names.join(", "))+"</td><td>"+esc(f.detail)+"</td></tr>";
            }).join("");
        }
        if(checkId==="quizBlur"){
            return report.quizBlurFlags.map(function(f){ return "<tr><td>"+esc(f.name)+"</td><td>"+f.blurCount+" tab switches</td></tr>"; }).join("");
        }
        if(checkId==="quizSpeed"){
            return report.quizSpeedFlags.map(function(f){ return "<tr><td>"+esc(f.name)+"</td><td>"+f.pct+"% of time</td><td>"+f.scorePct+"% score ("+f.score+"/"+f.possible+")</td></tr>"; }).join("");
        }
        if(checkId==="quizAnswers"){
            return report.quizAnswerPairs.map(function(f){ return "<tr><td>"+esc(f.aName)+" ↔ "+esc(f.bName)+"</td><td>"+f.matchCount+" matching wrong answers</td></tr>"; }).join("");
        }
        return "";
    }

    var SG_CHECK_WHATTODO={
        similarity:"Open both submissions in SpeedGrader and read them side by side. Check whether: (1) the shared phrases come from the prompt or a provided template, (2) both students cited the same source, (3) collaboration was explicitly permitted, or (4) the overlap is unexplained.",
        timing:"Check whether these students sit near each other, worked together with permission, or simply share a common file-naming habit — a shared filename alone is not proof of copying.",
        quizBlur:"Cross-reference with the Quiz Completion Speed check. A student who switched tabs but took a normal amount of time and scored typically is less concerning than one who also finished unusually fast.",
        quizSpeed:"Consider whether the student may have already seen these questions (e.g. a practice version) or is simply strong in this subject — use this as one signal, not proof on its own.",
        quizAnswers:"This is one of the strongest signals in this audit — coincidentally picking the exact same wrong answer on 2+ multi-option questions is statistically improbable by chance. Compare seating charts and submission times for corroboration."
    };

    var SG_CHECK_TABLE_HEAD={
        similarity:"<tr><th>Pair</th><th>Overlap</th><th>Shared Phrases</th><th>Sample</th></tr>",
        timing:"<tr><th>Type</th><th>Students</th><th>Detail</th></tr>",
        quizBlur:"<tr><th>Student</th><th>Detail</th></tr>",
        quizSpeed:"<tr><th>Student</th><th>Time Used</th><th>Score</th></tr>",
        quizAnswers:"<tr><th>Pair</th><th>Detail</th></tr>"
    };

    // Builds a standalone printable HTML document and opens it via
    // window.open — "PDF export" is just the browser's native Print dialog
    // with "Save as PDF," no PDF library involved, same as the original.
    function sgOpenFullAuditReport(report, checkIds){
        var win=window.open("", "_blank");
        if(!win){ sgToast("Pop-up blocked — allow pop-ups to view the report", false); return; }
        var totalFlags=report.flags.length+report.timingFlags.length+report.quizBlurFlags.length+report.quizSpeedFlags.length+report.quizAnswerPairs.length;
        var h='<!doctype html><html><head><title>Audit Report — '+esc(report.assignmentName)+'</title><style>';
        h+='body{font-family:Arial,sans-serif;color:#111827;max-width:900px;margin:0 auto;padding:32px;}';
        h+='.hdr{background:#1B303D;color:#fff;padding:24px 28px;border-radius:10px;margin-bottom:20px;}';
        h+='.hdr h1{margin:0 0 6px;font-size:20px;} .hdr .meta{font-size:12px;opacity:0.75;}';
        h+='.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-top:10px;}';
        h+='.disclaimer{background:#FFFBEB;border-left:4px solid #F59E0B;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:12px;color:#92400E;}';
        h+='.section{border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:16px;break-inside:avoid;}';
        h+='.section h2{font-size:14px;margin:0 0 4px;} .status-badge{font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px;}';
        h+='.explain{font-size:12px;color:#64748B;margin:6px 0 10px;}';
        h+='table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;} th{background:#F8FAFC;text-align:left;padding:6px 8px;} td{padding:6px 8px;border-bottom:1px solid #F1F5F9;}';
        h+='.whattodo{font-size:11px;color:#475569;margin-top:8px;font-style:italic;}';
        h+='.print-btn{background:#0770B8;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:20px;}';
        h+='@media print{.print-btn{display:none;} body{background:#fff;}}';
        h+='</style></head><body>';
        h+='<button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>';
        h+='<div class="hdr"><h1>Cheating Detection Audit — '+esc(report.assignmentName)+'</h1>';
        h+='<div class="meta">Generated '+new Date(report.createdAt).toLocaleString()+' · '+report.checked+' of '+report.total+' submissions analyzed</div>';
        h+='<div class="badge" style="background:'+(totalFlags?"#EF4444":"#22C55E")+';">'+(totalFlags?(totalFlags+" item(s) flagged"):"All clear")+'</div></div>';
        h+='<div class="disclaimer">⚠ <strong>Important — Teacher Verification Required.</strong> This report is for instructor review only. It does not determine whether academic misconduct occurred. Only the instructor can make that determination after reviewing the flagged items directly. Use professional judgment before taking any action.</div>';
        checkIds.forEach(function(id){
            var c=report.checks[id];
            if(!c) return;
            var colors=sgCheckColors(c.status);
            h+='<div class="section"><h2>'+esc(c.label)+' <span class="status-badge" style="background:'+colors.color+'22;color:'+colors.color+';">'+colors.label+'</span></h2>';
            if(SG_CHECK_EXPLAIN[id]) h+='<div class="explain">What this check does: '+esc(SG_CHECK_EXPLAIN[id])+'</div>';
            if(c.detail) h+='<div class="explain">'+esc(c.detail)+'</div>';
            if(c.status==="flagged"){
                h+='<table>'+(SG_CHECK_TABLE_HEAD[id]||"")+sgCheckReportRows(id, report)+'</table>';
                if(SG_CHECK_WHATTODO[id]) h+='<div class="whattodo">What to do: '+esc(SG_CHECK_WHATTODO[id])+'</div>';
            }
            h+='</div>';
        });
        h+='</body></html>';
        win.document.open(); win.document.write(h); win.document.close();
    }

    // ══════════════════════════════════════════════════════════════════════
    // CONTENT STUDIO — manual page-building toolbar
    // Docks above Canvas's own Rich Content Editor (any Page/Assignment/
    // Announcement/Discussion/Syllabus edit screen) and drops pre-styled
    // HTML snippets in at the cursor. Ported from the Canvas Enhancer
    // Content Studio toolbar, with AI Assist and Quiz Maker stripped —
    // AI Content and Quiz Builder already cover AI generation in this tool,
    // so Content Studio here is purely the manual/no-AI option.
    // ══════════════════════════════════════════════════════════════════════

    function csIsEditorPage(){
        var path = window.location.pathname;
        if(!/\/courses\/\d+\b/.test(path)) return false;
        return !/^\/(?:accounts|admin|profile|users|login|logout)\b/.test(path);
    }

    var CS_COLORS = [
        { name:'Ocean Blue',   p:'#0770B8', l:'#e3f2fd' },
        { name:'Forest Green', p:'#2e7d32', l:'#e8f5e9' },
        { name:'Crimson',      p:'#b71c1c', l:'#fce4ec' },
        { name:'Purple',       p:'#6a1b9a', l:'#f3e5f5' },
        { name:'Orange',       p:'#e65100', l:'#fff3e0' },
        { name:'Teal',         p:'#00695c', l:'#e0f2f1' },
        { name:'Slate',        p:'#37474f', l:'#f5f5f5' },
        { name:'Gold',         p:'#f9a825', l:'#fffde7' },
        { name:'Dark',         p:'#212121', l:'#f5f5f5' },
    ];

    var CS_FONT_FAMILIES = [
        { label:'Default (Arial)',  value:'Arial, sans-serif' },
        { label:'Georgia',          value:'Georgia, serif' },
        { label:'Trebuchet',        value:'"Trebuchet MS", sans-serif' },
        { label:'Verdana',          value:'Verdana, sans-serif' },
        { label:'Times New Roman',  value:'"Times New Roman", serif' },
        { label:'Monospace',        value:'"Courier New", monospace' },
    ];

    var CS_FONT_SIZES = ['10px','12px','14px','16px','18px','20px','24px','28px','32px','36px','48px'];

    var CS_ICONS = {
        Education: ['📚','📖','✏️','🎓','🏫','📝','📐','🔬','🧪','🧮','🗂','📋','🖊','📏','🗒','💻','🖥','⌨','🖱','📡','🔭','🧬','🧫','🧲','⚗','🏛','📜','🗺','🧭','🎒','🖼','🖋','📌','🗝','🔍'],
        Time:      ['⏰','📅','⏱','🗓','📆','🕐','🕑','🕔','🕗','🕙','⌛','⏳','🕛','🕧','⌚','⏲','🔔','📬','🔁','🔄','⏯','⏮','⏭','⏩','⏪','⏫','⏬','🔛','🔜','🔚','🔙','▶','⏸','⏹'],
        Status:    ['✅','❌','⚠️','🚫','❓','❗','💡','🔔','🔕','💯','🔒','🔓','🔑','⭐','🌟','🆕','🆗','🆘','🆙','🔴','🟡','🟢','🔵','🟣','⚫','⚪','🔺','🔻','📌','📍','🚩','🏁','🔖','💬','🗯','💭','✔','✗','ℹ'],
        People:    ['👤','👥','🧑‍🏫','🧑‍🎓','👩‍💼','👨‍💻','🤝','👋','🙋','🙌','👏','💪','🧠','👁','👂','🫀','🤲','☝','✌','🤞','👍','👎','🫶','🙏','✊','👊','🤜','🤛','🫱','🫲','👨‍👩‍👧','👨‍👩‍👦','🧑‍🤝‍🧑'],
        Files:     ['📁','📂','📄','📊','📈','📉','💾','📎','🔗','📌','📍','🗃','🗄','📦','📥','📤','📧','📨','📩','🗑','🗞','📰','📃','📑','📒','📓','📔','📕','📗','📘','📙','🗒','📐','✂','🖨'],
        Symbols:   ['⭐','🏆','🎯','💡','🔑','🎉','✨','🚀','💎','🔥','⚡','🌈','🎨','🎵','🎤','🏅','🥇','🎖','🏵','🎗','🎀','🎁','💝','💠','🔮','🪄','✴','❇','🌀','💫','🪐','🌐','☀','🌙','🌊','🍀'],
        Arrows:    ['→','←','↑','↓','↔','↕','↗','↘','↙','↖','➡','⬅','⬆','⬇','↩','↪','↺','↻','⇒','⇐','⇑','⇓','⇔','⇕','➤','➥','➦','⇧','⇩','⇦','▶','◀','▲','▼','⟵','⟶','⟷','⤴','⤵','↬'],
        Shapes:    ['■','□','▪','▫','◼','◻','▲','△','▶','▷','◀','◁','◆','◇','●','○','◉','◎','★','☆','⬛','⬜','⬡','⬢','⬣','🔶','🔷','🔸','🔹','🔺','🔻','🟥','🟧','🟨','🟩','🟦','🟪','⚫','⚪','🔘','🔲','🔳','▰','▱'],
        Math:      ['➕','➖','✖️','➗','±','=','≠','≈','≡','<','>','≤','≥','∝',
                    '²','³','⁴','ⁿ','√','∛','∜','%','‰',
                    'π','Σ','Δ','Ω','θ','φ','λ','μ','α','β','γ','ε','ρ','σ',
                    '∞','∫','∂','∇','∴','∵','∀','∃',
                    '∈','∉','⊂','⊃','⊆','⊇','∪','∩','∅',
                    '→','←','↔','⇒','⇐','⇔',
                    '°','′','″','∠','⊥','∥','≅','∼',
                    '½','⅓','¼','¾','⅔','⅛','⅜','⅝','⅞'],
    };

    var CS_GENERATORS = {
        checklist: function(p){
            var n = Math.min(Math.max(parseInt(p.n)||5,2),30);
            var lis=''; for(var i=0;i<n;i++) lis+='<li style="padding:6px 0;border-bottom:1px solid #f0f0f0;">☐ Item '+(i+1)+'</li>';
            return '<ul style="list-style:none;padding:0;margin:1em 0;">'+lis+'</ul>';
        },
        steps: function(p){
            var n = Math.min(Math.max(parseInt(p.n)||4,2),20);
            var lis=''; for(var i=0;i<n;i++) lis+='<li style="padding:6px 0;"><strong>Step '+(i+1)+':</strong> Description here.</li>';
            return '<ul style="list-style:none;padding:0;margin:1em 0;">'+lis+'</ul>';
        },
        table: function(p){
            var rows=Math.min(Math.max(parseInt(p.rows)||3,1),15);
            var cols=Math.min(Math.max(parseInt(p.cols)||3,2),8);
            var color=p.color||'#0770B8';
            var hdrs=''; for(var c=0;c<cols;c++) hdrs+='<th style="padding:10px 12px;text-align:left;">Column '+String.fromCharCode(65+c)+'</th>';
            var dataRows='';
            for(var r=0;r<rows;r++){
                var cells=''; for(var c2=0;c2<cols;c2++) cells+='<td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td>';
                dataRows+='<tr'+(r%2===0?' style="background:#f9f9f9;"':'')+'>'+cells+'</tr>';
            }
            return '<table style="width:100%;border-collapse:collapse;margin:1em 0;"><thead><tr style="background:'+color+';color:#fff;">'+hdrs+'</tr></thead><tbody>'+dataRows+'</tbody></table>';
        },
        faq: function(p){
            var n=Math.min(Math.max(parseInt(p.n)||4,2),15);
            var color=p.color||'#0770B8';
            var out=''; for(var i=0;i<n;i++) out+='<details style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin-bottom:4px;"><summary style="font-weight:bold;cursor:pointer;color:'+color+';">Question '+(i+1)+'?</summary><div style="margin-top:10px;">Answer '+(i+1)+'.</div></details>';
            return '<div style="margin:1em 0;">'+out+'</div>';
        },
        schedule: function(p){
            var weeks=Math.min(Math.max(parseInt(p.weeks)||8,2),30);
            var color=p.color||'#0770B8';
            var rows=''; for(var i=0;i<weeks;i++) rows+='<tr'+(i%2===0?' style="background:#f9f9f9;"':'')+'><td style="padding:9px 12px;border-bottom:1px solid #eee;font-weight:bold;">'+(i+1)+'</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Topic here</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Assignment here</td></tr>';
            return '<table style="width:100%;border-collapse:collapse;margin:1em 0;"><thead><tr style="background:'+color+';color:#fff;"><th style="padding:10px 12px;text-align:left;">Week</th><th style="padding:10px 12px;text-align:left;">Topic</th><th style="padding:10px 12px;text-align:left;">Due</th></tr></thead><tbody>'+rows+'</tbody></table>';
        },
        columns: function(p){
            var parts=(p.split||'50/50').split('/').map(Number);
            var cells=parts.map(function(w){ return '<td style="width:'+w+'%;padding:12px;vertical-align:top;border:1px solid #ddd;">Content here.</td>'; }).join('');
            return '<table style="width:100%;border-collapse:collapse;margin:1em 0;"><tr>'+cells+'</tr></table>';
        },
        cards: function(p){
            var rows  = Math.min(Math.max(parseInt(p.rows)||2,1),6);
            var cols  = Math.min(Math.max(parseInt(p.cols)||3,1),6);
            var style = p.cardStyle || 'shadow';
            var pad   = p.padding   || '16px';
            var gap   = parseInt(p.gap)||12;
            var minH  = p.minH      || '200px';
            var color = p.color     || '#0770B8';
            var bg    = p.bgcolor   || '';
            var pct   = (100/cols).toFixed(2);
            var css;
            switch(style){
                case 'shadow':   css='background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12);border-top:3px solid '+color+';'; break;
                case 'bordered': css='background:#fff;border:1px solid '+color+';border-radius:8px;'; break;
                case 'outlined': css='background:#fff;border:2px solid '+color+';border-radius:8px;'; break;
                case 'filled':   css='background:'+color+';color:#fff;border-radius:8px;'; break;
                case 'minimal':  css='background:#f9f9f9;border-left:3px solid '+color+';border-radius:0 4px 4px 0;'; break;
                default:         css='background:#fff;border:1px solid '+color+';border-radius:8px;';
            }
            var containerStyle = bg
                ? ('width:100%;border-collapse:separate;border-spacing:'+gap+'px;margin:1em 0;table-layout:fixed;background:'+bg+';padding:'+Math.ceil(gap/2)+'px;border-radius:8px;box-sizing:border-box;')
                : ('width:100%;border-collapse:separate;border-spacing:'+gap+'px;margin:1em 0;table-layout:fixed;');
            var cell = '<td style="'+css+'padding:'+pad+';min-height:'+minH+';vertical-align:top;width:'+pct+'%;box-sizing:border-box;">Content here.</td>';
            var html = '<table style="'+containerStyle+'">';
            for(var r=0;r<rows;r++){ var rowCells=''; for(var c=0;c<cols;c++) rowCells+=cell; html+='<tr>'+rowCells+'</tr>'; }
            html+='</table>';
            return html;
        },
    };

    var CS_COMPONENTS = {
        dividers:{label:'Dividers',icon:'—',items:[
            {label:'Simple line',   props:['color'], html:'<hr style="border:none;border-top:1px solid {{P}};margin:1em 0;">'},
            {label:'Bold line',     props:['color'], html:'<hr style="border:none;border-top:3px solid {{P}};margin:1em 0;">'},
            {label:'Dashed line',   props:['color'], html:'<hr style="border:none;border-top:2px dashed {{P}};margin:1em 0;">'},
            {label:'Double line',   props:['color'], html:'<hr style="border:none;border-top:4px double {{P}};margin:1em 0;">'},
            {label:'Colored bar',   props:['color'], html:'<hr style="border:none;height:4px;background:{{P}};margin:1em 0;">'},
            {label:'Gradient bar',  props:['color'], html:'<hr style="border:none;height:4px;background:linear-gradient(to right,{{P}},{{P}}55);margin:1em 0;">'},
        ]},
        headers:{label:'Headers',icon:'H',items:[
            {label:'Section banner',   props:['color','size','font','width','align','vpad'], html:'<div style="background:{{L}};border-left:5px solid {{P}};padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;color:#1a1a1a;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>'},
            {label:'Solid banner',     props:['color','size','font','width','align','vpad'], html:'<div style="background:{{P}};color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>'},
            {label:'Gradient banner',  props:['color','size','font','width','align','vpad'], html:'<div style="background:linear-gradient(to right,{{P}},{{P}}99);color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>'},
            {label:'Underline header', props:['color','size','font','width','align','vpad'], html:'<h2 style="border-bottom:2px solid {{P}};padding:{{VPAD}} 0 4px;color:{{P}};font-size:{{SIZE}};font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</h2>'},
            {label:'Dark banner',      props:['size','font','width','align','vpad'],         html:'<div style="background:#212121;color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>'},
            {label:'Warning banner',   props:['size','font','width','align','vpad'],         html:'<div style="background:#7B1900;color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">⚠ Important Notice</div>'},
        ]},
        callouts:{label:'Callouts',icon:'📌',items:[
            {label:'Tip',          props:['size','font','width','vpad'], html:'<div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#2e7d32;">💡 Tip</strong><br>Add your tip here.</div>'},
            {label:'Warning',      props:['size','font','width','vpad'], html:'<div style="background:#fff3e0;border-left:5px solid #e65100;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#e65100;">⚠️ Warning</strong><br>Add your warning here.</div>'},
            {label:'Important',    props:['size','font','width','vpad'], html:'<div style="background:#fce4ec;border-left:5px solid #b71c1c;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#b71c1c;">❗ Important</strong><br>Add your note here.</div>'},
            {label:'Note',         props:['size','font','width','vpad'], html:'<div style="background:#e3f2fd;border-left:5px solid #1565c0;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#1565c0;">📝 Note</strong><br>Add your note here.</div>'},
            {label:'Custom',       props:['color','size','font','width','vpad'], html:'<div style="background:{{L}};border-left:5px solid {{P}};padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:{{P}};">📌 Callout</strong><br>Add your content here.</div>'},
            {label:'Did You Know', props:['size','font','width','vpad'], html:'<div style="background:#fffde7;border-left:5px solid #f9a825;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#f57f17;">🤔 Did You Know?</strong><br>Add your fun fact here.</div>'},
            {label:'Do Not',       props:['size','font','width','vpad'], html:'<div style="background:#f3e5f5;border-left:5px solid #6a1b9a;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#6a1b9a;">🚫 Do Not</strong><br>Describe what to avoid here.</div>'},
            {label:'Success',      props:['size','font','width','vpad'], html:'<div style="background:#e8f5e9;border-left:5px solid #1b5e20;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#1b5e20;">✅ Success</strong><br>Add your success message here.</div>'},
        ]},
        lists:{label:'Lists',icon:'☑',items:[
            {label:'Checklist', props:['size','width'], generate:'checklist', fields:[{id:'n',label:'Items',type:'number',default:5,min:2,max:30}]},
            {label:'Steps',     props:['size','width'], generate:'steps',     fields:[{id:'n',label:'Steps',type:'number',default:4,min:2,max:20}]},
            {label:'Icon list ✅',   props:['size','font','width'], html:'<ul style="list-style:none;padding:0;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span>✅</span><span>Item one</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span>✅</span><span>Item two</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;"><span>✅</span><span>Item three</span></li></ul>'},
            {label:'Icon list ▶',   props:['color','size','font','width'], html:'<ul style="list-style:none;padding:0;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};">▶</span><span>Item one</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};">▶</span><span>Item two</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;"><span style="color:{{P}};">▶</span><span>Item three</span></li></ul>'},
            {label:'Badge labels',    props:['color','size','font'], html:'<p style="margin:1em 0;font-size:{{SIZE}};"><span style="background:{{P}};color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;margin-right:6px;font-family:{{FONT}};">Label A</span><span style="background:#2e7d32;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;margin-right:6px;">Label B</span><span style="background:#e65100;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;">Label C</span></p>'},
            {label:'Progress tracker',props:['color','size','font','width'], html:'<div style="margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:{{P}};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">1</span><span>Step one</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:{{P}};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">2</span><span>Step two</span></div><div style="display:flex;align-items:center;gap:8px;"><span style="background:#ccc;color:#333;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">3</span><span style="color:#999;">Step three</span></div></div>'},
        ]},
        layouts:{label:'Layouts',icon:'⊞',items:[
            {label:'Custom columns', props:['size','font','width'], generate:'columns', fields:[{id:'split',label:'Split',type:'select',options:['50/50','67/33','33/67','33/33/33','25/75','75/25'],default:'50/50'}]},
            {label:'Two columns',   props:['size','font','width'], html:'<table style="width:{{WIDTH}};border-collapse:collapse;margin:1em 0;"><tr><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column one content here.</td><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column two content here.</td></tr></table>'},
            {label:'Three columns', props:['size','font','width'], html:'<table style="width:{{WIDTH}};border-collapse:collapse;margin:1em 0;"><tr><td style="width:33%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column one.</td><td style="width:33%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column two.</td><td style="width:34%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column three.</td></tr></table>'},
            {label:'Image + text',  props:['size','font','width'], html:'<table style="width:{{WIDTH}};border-collapse:collapse;border:1px solid #ddd;margin:1em 0;"><tr><td style="width:200px;background:#e0e0e0;padding:16px;text-align:center;color:#666;vertical-align:middle;">[Image]</td><td style="padding:16px;vertical-align:top;font-family:{{FONT}};font-size:{{SIZE}};"><strong>Card Title</strong><br><br>Card description goes here.</td></tr></table>'},
            {label:'Collapsible',   props:['color','size','font','width'], html:'<details open style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><summary style="font-weight:bold;cursor:pointer;color:{{P}};">Click to expand ▾</summary><div style="margin-top:12px;padding:10px 12px;border:2px dashed #ccc;border-radius:4px;min-height:48px;cursor:text;">Hidden content goes here.</div></details>'},
        ]},
        cards:{label:'Cards',icon:'▭',items:[
            {label:'Card grid', props:['color','bgcolor'], generate:'cards', fields:[
                {id:'cols',      label:'Columns', type:'number', default:3,  min:1, max:6},
                {id:'rows',      label:'Rows',    type:'number', default:2,  min:1, max:6},
                {id:'cardStyle', label:'Style',   type:'select', default:'shadow',  options:['shadow','bordered','outlined','filled','minimal']},
                {id:'minH',      label:'Height',  type:'select', default:'200px',   options:['120px','160px','200px','250px','300px','400px']},
                {id:'padding',   label:'Padding', type:'select', default:'16px',    options:['8px','12px','16px','24px','32px']},
                {id:'gap',       label:'Gap',     type:'select', default:'12',      options:['4','8','12','16','24']},
            ]},
            {label:'Instructor Bio',  props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:18px 20px;"><strong style="font-size:1.15em;display:block;">Instructor Name</strong><span style="opacity:.85;font-size:.9em;">Course Title · Department</span></div><div style="padding:18px 20px;display:flex;gap:16px;align-items:flex-start;"><div style="min-width:72px;height:72px;background:#e8e8e8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2em;flex-shrink:0;">👤</div><div><p style="margin:0 0 10px;">Brief bio or welcome statement. Share your background, research interests, or why you love this subject.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.9em;color:#555;"><span>📧 email@university.edu</span><span>📍 Office: Bldg 000</span><span>⏰ Hours: Mon/Wed 2–4pm</span><span>📞 (000) 000-0000</span></div></div></div></div>'},
            {label:'Tips',            props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">💡 Tips for Success</strong></div><div style="padding:16px 18px;"><ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};font-size:1.1em;flex-shrink:0;">✓</span><span><strong>Stay organized.</strong> Keep track of due dates and set reminders early.</span></li><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};font-size:1.1em;flex-shrink:0;">✓</span><span><strong>Ask questions.</strong> There are no silly questions — reach out early and often.</span></li><li style="display:flex;gap:10px;padding:8px 0;"><span style="color:{{P}};font-size:1.1em;flex-shrink:0;">✓</span><span><strong>Participate.</strong> Engage with your classmates and share your perspective.</span></li></ul></div></div>'},
            {label:'Welcome',         props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:linear-gradient(135deg,{{P}},{{P}}bb);color:#fff;padding:22px 24px;"><strong style="font-size:1.3em;display:block;margin-bottom:4px;">Welcome to [Course Name]!</strong><span style="opacity:.85;font-size:.92em;">We\'re glad you\'re here.</span></div><div style="padding:18px 20px;"><p style="margin:0 0 12px;">Hello and welcome! I\'m [Your Name] and I\'m thrilled to have you in this course. This semester we\'ll explore [topic] together and I\'m excited for the journey ahead.</p><p style="margin:0;color:#555;font-size:.9em;">Feel free to reach out any time — my door (and inbox) is always open.</p></div></div>'},
            {label:'Office Hours',    props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">⏰ Office Hours</strong></div><div style="padding:16px 18px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-weight:bold;width:140px;">Monday</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;">2:00 – 4:00 PM · Room 000</td></tr><tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-weight:bold;">Wednesday</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;">2:00 – 4:00 PM · Room 000</td></tr><tr><td style="padding:7px 0;font-weight:bold;">By Appointment</td><td style="padding:7px 0;">Email to schedule a Zoom or in-person meeting</td></tr></table></div></div>'},
            {label:'Due Date',        props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">📅 Important Dates</strong></div><div style="padding:16px 18px;"><div style="display:flex;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><div style="background:{{P}};color:#fff;border-radius:6px;padding:8px 12px;text-align:center;min-width:52px;flex-shrink:0;"><div style="font-size:1.3em;font-weight:bold;line-height:1;">01</div><div style="font-size:.7em;text-transform:uppercase;opacity:.9;">Month</div></div><div><strong style="display:block;">Assignment Name</strong><span style="font-size:.85em;color:#666;">Due by 11:59 PM — Submit via Canvas</span></div></div><div style="display:flex;align-items:center;gap:14px;padding:8px 0;"><div style="background:{{P}};color:#fff;border-radius:6px;padding:8px 12px;text-align:center;min-width:52px;flex-shrink:0;"><div style="font-size:1.3em;font-weight:bold;line-height:1;">15</div><div style="font-size:.7em;text-transform:uppercase;opacity:.9;">Month</div></div><div><strong style="display:block;">Final Project</strong><span style="font-size:.85em;color:#666;">Due by 11:59 PM — Submit via Canvas</span></div></div></div></div>'},
            {label:'Course Policies', props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">📋 Course Policies</strong></div><div style="padding:16px 18px;"><ul style="list-style:none;padding:0;margin:0;"><li style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><strong>Late Work:</strong> Policy description here.</li><li style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><strong>Attendance:</strong> Policy description here.</li><li style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><strong>Academic Integrity:</strong> Policy description here.</li><li style="padding:8px 0;"><strong>Communication:</strong> Expect a response within 24–48 hours via Canvas Inbox.</li></ul></div></div>'},
            {label:'Grading Breakdown',props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">📊 Grading Breakdown</strong></div><div style="padding:0 18px 14px;"><table style="width:100%;border-collapse:collapse;margin-top:4px;"><thead><tr style="border-bottom:2px solid #eee;"><th style="padding:10px 8px 8px 0;text-align:left;color:#555;font-size:.9em;">Category</th><th style="padding:10px 8px 8px;text-align:center;color:#555;font-size:.9em;">Weight</th><th style="padding:10px 0 8px 8px;text-align:center;color:#555;font-size:.9em;">Points</th></tr></thead><tbody><tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 8px 8px 0;">Assignments</td><td style="padding:8px;text-align:center;">40%</td><td style="padding:8px 0 8px 8px;text-align:center;">400</td></tr><tr style="border-bottom:1px solid #f0f0f0;background:#f9f9f9;"><td style="padding:8px 8px 8px 0;">Quizzes</td><td style="padding:8px;text-align:center;">30%</td><td style="padding:8px 0 8px 8px;text-align:center;">300</td></tr><tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 8px 8px 0;">Participation</td><td style="padding:8px;text-align:center;">20%</td><td style="padding:8px 0 8px 8px;text-align:center;">200</td></tr><tr style="font-weight:bold;background:#f0f4f8;"><td style="padding:8px 8px 8px 0;">Final Exam</td><td style="padding:8px;text-align:center;">10%</td><td style="padding:8px 0 8px 8px;text-align:center;">100</td></tr></tbody></table></div></div>'},
            {label:'Submit Checklist', props:['color','size','font','width'], html:'<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">✅ Before You Submit</strong></div><div style="padding:16px 18px;"><ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement one — describe what to check here.</span></li><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement two — describe what to check here.</span></li><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement three — describe what to check here.</span></li><li style="display:flex;gap:10px;padding:8px 0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement four — describe what to check here.</span></li></ul></div></div>'},
            {label:'Pull quote',      props:['color','size','font','width'], html:'<blockquote style="border-left:4px solid {{P}};margin:1em 0;padding:14px 18px;background:{{L}};font-style:italic;color:#333;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};border-radius:0 6px 6px 0;">"Add your quote or key point here."<br><cite style="font-style:normal;font-size:.85em;color:#666;margin-top:8px;display:block;">— Source</cite></blockquote>'},
            {label:'Button link',     props:['color','size','font','align'], html:'<p style="margin:1em 0;text-align:{{ALIGN}};"><a href="#" style="display:inline-block;background:{{P}};color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:{{FONT}};font-size:{{SIZE}};">Button Label</a></p>'},
        ]},
    };

    var csPendingItem = null;

    function csInsertHTML(html){
        if(window.tinymce && tinymce.activeEditor){
            var ed = tinymce.activeEditor;
            var sid = 'cmb-cs-cur-' + Date.now();
            ed.insertContent(html + '<p id="'+sid+'"><br data-mce-bogus="1"></p>');
            var target = ed.dom.get(sid);
            if(target){ ed.selection.setCursorLocation(target, 0); ed.dom.setAttrib(target, 'id', null); }
            return;
        }
        var frames = document.querySelectorAll('iframe.tox-edit-area__iframe');
        for(var i=0;i<frames.length;i++){
            try{
                var doc = frames[i].contentDocument;
                if(doc && doc.querySelector('body#tinymce')){ doc.execCommand('insertHTML', false, html+'<p><br></p>'); return; }
            }catch(e){}
        }
        navigator.clipboard.writeText(html)
            .then(function(){ csShowNotice('HTML copied — paste into editor'); })
            .catch(function(){ csShowNotice('Could not access clipboard — copy the HTML manually'); });
    }

    function csShowNotice(msg){
        var n = document.getElementById('cmb-cs-notice');
        if(!n){ n = document.createElement('div'); n.id = 'cmb-cs-notice'; document.body.appendChild(n); }
        n.textContent = msg; n.classList.add('show');
        setTimeout(function(){ n.classList.remove('show'); }, 3000);
    }

    function csCloseAllPanels(){
        document.querySelectorAll('.cmb-cs-panel.open').forEach(function(p){ p.classList.remove('open'); });
        document.querySelectorAll('.cmb-cs-btn.open').forEach(function(b){ b.classList.remove('open'); });
    }

    function csApplyProps(html, props){
        var c = props.color || CS_COLORS[0];
        return html
            .replace(/\{\{P\}\}/g, c.p)
            .replace(/\{\{L\}\}/g, c.l)
            .replace(/\{\{FONT\}\}/g, props.font || 'inherit')
            .replace(/\{\{SIZE\}\}/g, props.size || '14px')
            .replace(/\{\{WIDTH\}\}/g, props.width || '100%')
            .replace(/\{\{ALIGN\}\}/g, props.align || 'left')
            .replace(/\{\{VPAD\}\}/g, props.vpad || '12px');
    }

    function csMakePropSep(){ var d=document.createElement('div'); d.className='cmb-cs-prop-sep'; return d; }

    function csClosePropsRow(rowProps){ rowProps.classList.remove('open'); rowProps.innerHTML=''; csPendingItem=null; }

    function csBuildPropsRow(rowProps, item, onInsert){
        rowProps.innerHTML = '';
        var show = new Set(item.props || ['color','size','font','width','align']);
        var props = { color:CS_COLORS[0], font:'inherit', size:'14px', width:'100%', align:'left', vpad:'12px' };

        var lbl = document.createElement('span');
        lbl.id = 'cmb-cs-props-label'; lbl.textContent = item.label;
        rowProps.appendChild(lbl);

        var first = true;
        function sep(){ if(!first) rowProps.appendChild(csMakePropSep()); first=false; }

        if(show.has('color')){
            sep();
            var wrap = document.createElement('div'); wrap.className='cmb-cs-prop';
            var cl = document.createElement('label'); cl.textContent='Color:'; wrap.appendChild(cl);
            var sw = document.createElement('div'); sw.className='cmb-cs-prop-swatches';
            CS_COLORS.forEach(function(c){
                var b = document.createElement('button'); b.type='button';
                b.className = 'cmb-cs-prop-swatch'+(c===props.color?' active':'');
                b.style.background=c.p; b.title=c.name;
                b.onclick=function(){ props.color=c; sw.querySelectorAll('.cmb-cs-prop-swatch').forEach(function(s){s.classList.remove('active');}); b.classList.add('active'); };
                sw.appendChild(b);
            });
            wrap.appendChild(sw); rowProps.appendChild(wrap);
        }

        if(show.has('bgcolor')){
            sep();
            var wrap2 = document.createElement('div'); wrap2.className='cmb-cs-prop';
            var cl2 = document.createElement('label'); cl2.textContent='Container BG:'; wrap2.appendChild(cl2);
            var sw2 = document.createElement('div'); sw2.className='cmb-cs-prop-swatches';
            props.bgcolor = null;
            var noneBtn = document.createElement('button'); noneBtn.type='button';
            noneBtn.className='cmb-cs-prop-swatch active';
            noneBtn.style.background='linear-gradient(135deg,#fff 50%,#ccc 50%)';
            noneBtn.title='None';
            noneBtn.onclick=function(){ props.bgcolor=null; sw2.querySelectorAll('.cmb-cs-prop-swatch').forEach(function(s){s.classList.remove('active');}); noneBtn.classList.add('active'); if(rowProps._refreshPreview) rowProps._refreshPreview(); };
            sw2.appendChild(noneBtn);
            CS_COLORS.forEach(function(c){
                var b = document.createElement('button'); b.type='button';
                b.className='cmb-cs-prop-swatch';
                b.style.background=c.l; b.title=c.name;
                b.onclick=function(){ props.bgcolor=c.l; sw2.querySelectorAll('.cmb-cs-prop-swatch').forEach(function(s){s.classList.remove('active');}); b.classList.add('active'); if(rowProps._refreshPreview) rowProps._refreshPreview(); };
                sw2.appendChild(b);
            });
            wrap2.appendChild(sw2); rowProps.appendChild(wrap2);
        }

        if(show.has('width')){
            sep();
            var wrapW = document.createElement('div'); wrapW.className='cmb-cs-prop';
            var wl = document.createElement('label'); wl.textContent='Width:'; wrapW.appendChild(wl);
            var selW = document.createElement('select');
            ['100%','90%','75%','66%','50%','400px','500px','600px','700px'].forEach(function(w){
                var o=document.createElement('option'); o.value=w; o.textContent=w; selW.appendChild(o);
            });
            selW.value='100%'; selW.onchange=function(){ props.width=selW.value; };
            wrapW.appendChild(selW); rowProps.appendChild(wrapW);
        }

        if(show.has('align')){
            sep();
            var wrapA = document.createElement('div'); wrapA.className='cmb-cs-prop';
            var al = document.createElement('label'); al.textContent='Align:'; wrapA.appendChild(al);
            var alignWrap = document.createElement('div'); alignWrap.style.cssText='display:flex;gap:3px;';
            [['left','⫷'],['center','≡'],['right','⫸']].forEach(function(pair){
                var val=pair[0], icon=pair[1];
                var b = document.createElement('button'); b.type='button';
                b.title = val.charAt(0).toUpperCase()+val.slice(1);
                b.style.cssText = 'padding:3px 7px;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;background:'+(val==='left'?'#e8f0fb':'#fff')+';';
                b.textContent = icon;
                b.onclick=function(){
                    props.align=val;
                    alignWrap.querySelectorAll('button').forEach(function(x){x.style.background='#fff';});
                    b.style.background='#e8f0fb';
                };
                alignWrap.appendChild(b);
            });
            wrapA.appendChild(alignWrap); rowProps.appendChild(wrapA);
        }

        if(show.has('size')){
            sep();
            var wrapS = document.createElement('div'); wrapS.className='cmb-cs-prop';
            var sl = document.createElement('label'); sl.textContent='Size:'; wrapS.appendChild(sl);
            var selS = document.createElement('select');
            CS_FONT_SIZES.forEach(function(s){ var o=document.createElement('option'); o.value=s; o.textContent=s; selS.appendChild(o); });
            selS.value='14px'; selS.onchange=function(){ props.size=selS.value; };
            wrapS.appendChild(selS); rowProps.appendChild(wrapS);
        }

        if(show.has('font')){
            sep();
            var wrapF = document.createElement('div'); wrapF.className='cmb-cs-prop';
            var fl = document.createElement('label'); fl.textContent='Font:'; wrapF.appendChild(fl);
            var selF = document.createElement('select');
            CS_FONT_FAMILIES.forEach(function(f){ var o=document.createElement('option'); o.value=f.value; o.textContent=f.label; o.style.fontFamily=f.value; selF.appendChild(o); });
            selF.onchange=function(){ props.font=selF.value; };
            wrapF.appendChild(selF); rowProps.appendChild(wrapF);
        }

        if(show.has('vpad')){
            sep();
            var wrapV = document.createElement('div'); wrapV.className='cmb-cs-prop';
            var vl = document.createElement('label'); vl.textContent='Height:'; wrapV.appendChild(vl);
            var selV = document.createElement('select');
            [['S','8px'],['M','12px'],['L','24px'],['XL','40px']].forEach(function(pair){
                var o=document.createElement('option'); o.value=pair[1]; o.textContent=pair[0]; selV.appendChild(o);
            });
            selV.value='12px'; selV.onchange=function(){ props.vpad=selV.value; };
            wrapV.appendChild(selV); rowProps.appendChild(wrapV);
        }

        if(item.fields && item.fields.length){
            sep();
            item.fields.forEach(function(field){
                var wrap = document.createElement('div'); wrap.className='cmb-cs-prop';
                var fl = document.createElement('label'); fl.textContent=field.label+':'; wrap.appendChild(fl);
                if(field.type==='select'){
                    var sel = document.createElement('select');
                    (field.options||[]).forEach(function(opt){ var o=document.createElement('option'); o.value=opt; o.textContent=opt; sel.appendChild(o); });
                    if(field.default) sel.value=field.default;
                    sel.onchange=function(){ props[field.id]=sel.value; if(rowProps._refreshPreview) rowProps._refreshPreview(); };
                    props[field.id] = field.default || (field.options||[])[0];
                    wrap.appendChild(sel);
                }else{
                    var inp = document.createElement('input');
                    inp.type = field.type||'text'; inp.value = field.default!==undefined?field.default:'';
                    if(field.min!==undefined) inp.min=field.min;
                    if(field.max!==undefined) inp.max=field.max;
                    inp.oninput=function(){ props[field.id]=inp.value; if(rowProps._refreshPreview) rowProps._refreshPreview(); };
                    props[field.id] = field.default!==undefined?String(field.default):'';
                    wrap.appendChild(inp);
                }
                rowProps.appendChild(wrap);
            });
        }

        if(item.generate==='cards'){
            sep();
            var previewWrap = document.createElement('div'); previewWrap.className='cmb-cs-prop';
            var pl = document.createElement('label'); pl.textContent='Preview:'; previewWrap.appendChild(pl);
            var grid = document.createElement('div'); grid.style.cssText='display:flex;flex-direction:column;gap:3px;';
            function refreshPreview(){
                var r = Math.min(parseInt(props.rows)||2, 6);
                var c = Math.min(parseInt(props.cols)||3, 6);
                var s = props.cardStyle || 'shadow';
                var col = (props.color||CS_COLORS[0]).p || '#0770B8';
                var bgc = props.bgcolor || '';
                grid.innerHTML = '';
                grid.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding:3px;border-radius:3px;'+(bgc?('background:'+bgc+';'):'');
                for(var row=0; row<Math.min(r,4); row++){
                    var rowDiv = document.createElement('div'); rowDiv.style.cssText='display:flex;gap:3px;';
                    for(var ci=0; ci<Math.min(c,5); ci++){
                        var cell = document.createElement('div');
                        var cs = 'width:18px;height:28px;border-radius:3px;box-sizing:border-box;flex-shrink:0;';
                        if(s==='shadow') cs += 'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);border-top:2px solid '+col+';';
                        else if(s==='bordered') cs += 'background:#fff;border:1px solid '+col+';';
                        else if(s==='outlined') cs += 'background:#fff;border:2px solid '+col+';';
                        else if(s==='filled') cs += 'background:'+col+';';
                        else cs += 'background:#f0f0f0;border-left:2px solid '+col+';';
                        cell.style.cssText = cs;
                        rowDiv.appendChild(cell);
                    }
                    if(c>5){ var m=document.createElement('span'); m.textContent='…'; m.style.cssText='font-size:10px;line-height:28px;color:#888;'; rowDiv.appendChild(m); }
                    grid.appendChild(rowDiv);
                }
                if(r>4){ var m2=document.createElement('div'); m2.textContent='…'; m2.style.cssText='font-size:10px;color:#888;text-align:center;'; grid.appendChild(m2); }
                var lbl2=document.createElement('div'); lbl2.style.cssText='font-size:10px;color:#666;margin-top:2px;';
                lbl2.textContent=r+'×'+c+' = '+(r*c)+' cards'; grid.appendChild(lbl2);
            }
            refreshPreview();
            rowProps._refreshPreview = refreshPreview;
            previewWrap.appendChild(grid); rowProps.appendChild(previewWrap);
        }

        var cancelBtn = document.createElement('button');
        cancelBtn.id = 'cmb-cs-props-cancel'; cancelBtn.textContent = '✕ Cancel';
        cancelBtn.onclick = function(){ csClosePropsRow(rowProps); };
        rowProps.appendChild(cancelBtn);

        var insertBtn = document.createElement('button');
        insertBtn.id = 'cmb-cs-props-insert'; insertBtn.textContent = 'Insert ↵';
        insertBtn.onclick = function(){ csClosePropsRow(rowProps); onInsert(props); };
        rowProps.appendChild(insertBtn);

        rowProps.classList.add('open');
    }

    function csHandleItemClick(item, rowProps){
        csCloseAllPanels();
        if(item.html==='VIDEO_DIALOG'){ csBuildVideoPropsRow(rowProps); return; }
        csPendingItem = item;
        csBuildPropsRow(rowProps, item, function(props){
            if(item.generate){
                var genProps = Object.assign({}, props, { color: (props.color&&props.color.p)||props.color||'#0770B8', n:props.n, rows:props.rows, cols:props.cols, weeks:props.weeks, split:props.split });
                var html = CS_GENERATORS[item.generate](genProps);
                if(props.width && props.width!=='100%'){ html = '<div style="width:'+props.width+';">'+html+'</div>'; }
                csInsertHTML(html);
            }else{
                csInsertHTML(csApplyProps(item.html, props));
            }
        });
    }

    function csGetEmbedUrl(url){
        var m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if(m) return 'https://www.youtube.com/embed/'+m[1];
        m = url.match(/vimeo\.com\/(\d+)/);
        if(m) return 'https://player.vimeo.com/video/'+m[1];
        return null;
    }

    function csBuildIconPanel(rowProps){
        var panel=document.createElement('div'); panel.className='cmb-cs-icon-panel';
        var tabs=document.createElement('div'); tabs.className='cmb-cs-icon-tabs';
        var grid=document.createElement('div'); grid.className='cmb-cs-icon-grid';
        var cats=Object.keys(CS_ICONS); var activeTab=cats[0];
        function renderGrid(cat){
            grid.innerHTML='';
            CS_ICONS[cat].forEach(function(icon){
                var btn=document.createElement('button'); btn.className='cmb-cs-icon-btn'; btn.type='button'; btn.textContent=icon; btn.title=icon;
                btn.onclick=function(){ csCloseAllPanels(); csBuildIconPropsRow(rowProps, icon); };
                grid.appendChild(btn);
            });
        }
        cats.forEach(function(cat){
            var tab=document.createElement('button'); tab.className='cmb-cs-icon-tab'+(cat===activeTab?' active':''); tab.type='button'; tab.textContent=cat;
            tab.onclick=function(e){
                e.stopPropagation(); activeTab=cat;
                tabs.querySelectorAll('.cmb-cs-icon-tab').forEach(function(t){t.classList.remove('active');});
                tab.classList.add('active'); renderGrid(cat);
            };
            tabs.appendChild(tab);
        });
        renderGrid(activeTab); panel.appendChild(tabs); panel.appendChild(grid);
        return panel;
    }

    function csBuildIconPropsRow(rowProps, icon){
        rowProps.innerHTML = '';
        var iconSize = '1em';
        var lbl=document.createElement('span'); lbl.id='cmb-cs-props-label'; lbl.textContent=icon+' Icon'; rowProps.appendChild(lbl);
        rowProps.appendChild(csMakePropSep());
        var wrap=document.createElement('div'); wrap.className='cmb-cs-prop';
        var sl=document.createElement('label'); sl.textContent='Size:'; wrap.appendChild(sl);
        var sizeWrap=document.createElement('div'); sizeWrap.style.cssText='display:flex;gap:3px;';
        [{label:'S',val:'1em'},{label:'M',val:'1.5em'},{label:'L',val:'2em'},{label:'XL',val:'3em'}].forEach(function(s){
            var b=document.createElement('button'); b.type='button'; b.textContent=s.label;
            b.style.cssText='padding:3px 8px;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;background:'+(s.val===iconSize?'#e8f0fb':'#fff')+';font-family:inherit;';
            b.onclick=function(){ iconSize=s.val; sizeWrap.querySelectorAll('button').forEach(function(x){x.style.background='#fff';}); b.style.background='#e8f0fb'; };
            sizeWrap.appendChild(b);
        });
        wrap.appendChild(sizeWrap); rowProps.appendChild(wrap);
        var cancelBtn=document.createElement('button'); cancelBtn.id='cmb-cs-props-cancel'; cancelBtn.textContent='✕ Cancel';
        cancelBtn.onclick=function(){ csClosePropsRow(rowProps); }; rowProps.appendChild(cancelBtn);
        var insertBtn=document.createElement('button'); insertBtn.id='cmb-cs-props-insert'; insertBtn.textContent='Insert ↵';
        insertBtn.onclick=function(){ csClosePropsRow(rowProps); csInsertHTML('<span style="font-size:'+iconSize+';">'+icon+'</span>'); };
        rowProps.appendChild(insertBtn);
        rowProps.classList.add('open');
    }

    function csBuildVideoPropsRow(rowProps){
        rowProps.innerHTML = '';
        var videoPb = '56.25%';
        var lbl=document.createElement('span'); lbl.id='cmb-cs-props-label'; lbl.textContent='🎬 Video'; rowProps.appendChild(lbl);
        rowProps.appendChild(csMakePropSep());
        var wrap1=document.createElement('div'); wrap1.className='cmb-cs-prop';
        var ul=document.createElement('label'); ul.textContent='URL:'; wrap1.appendChild(ul);
        var urlInput=document.createElement('input'); urlInput.type='text'; urlInput.placeholder='YouTube or Vimeo URL';
        urlInput.style.cssText='width:280px;padding:4px 8px;border:1px solid #ccc;border-radius:3px;font-size:12px;font-family:inherit;';
        wrap1.appendChild(urlInput); rowProps.appendChild(wrap1);
        rowProps.appendChild(csMakePropSep());
        var wrap2=document.createElement('div'); wrap2.className='cmb-cs-prop';
        var sl=document.createElement('label'); sl.textContent='Size:'; wrap2.appendChild(sl);
        var sizeWrap=document.createElement('div'); sizeWrap.style.cssText='display:flex;gap:3px;';
        [{label:'Small',val:'45%'},{label:'Medium',val:'56.25%'},{label:'Large',val:'66%'}].forEach(function(s){
            var b=document.createElement('button'); b.type='button'; b.textContent=s.label;
            b.style.cssText='padding:3px 8px;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;background:'+(s.val===videoPb?'#e8f0fb':'#fff')+';font-family:inherit;';
            b.onclick=function(){ videoPb=s.val; sizeWrap.querySelectorAll('button').forEach(function(x){x.style.background='#fff';}); b.style.background='#e8f0fb'; };
            sizeWrap.appendChild(b);
        });
        wrap2.appendChild(sizeWrap); rowProps.appendChild(wrap2);
        var cancelBtn=document.createElement('button'); cancelBtn.id='cmb-cs-props-cancel'; cancelBtn.textContent='✕ Cancel';
        cancelBtn.onclick=function(){ csClosePropsRow(rowProps); }; rowProps.appendChild(cancelBtn);
        var insertBtn=document.createElement('button'); insertBtn.id='cmb-cs-props-insert'; insertBtn.textContent='Insert ↵';
        insertBtn.onclick=function(){
            var url=urlInput.value.trim();
            if(!url){ csShowNotice('Enter a video URL'); return; }
            var embedUrl=csGetEmbedUrl(url);
            if(!embedUrl){ csShowNotice('Unsupported URL — use YouTube or Vimeo'); return; }
            csClosePropsRow(rowProps);
            csInsertHTML('<div style="position:relative;padding-bottom:'+videoPb+';height:0;overflow:hidden;margin:1em 0;border-radius:4px;background:#000;"><iframe src="'+embedUrl+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>');
        };
        rowProps.appendChild(insertBtn);
        rowProps.classList.add('open');
        setTimeout(function(){ urlInput.focus(); }, 50);
    }

    function csBuildResourcesPanel(){
        var panel=document.createElement('div');
        [{icon:'🖼',label:'Unsplash — Free Photos',url:'https://unsplash.com'},{icon:'📷',label:'Pexels — Free Stock',url:'https://pexels.com'},{icon:'🎨',label:'Pixabay — Images & Video',url:'https://pixabay.com'},{icon:'🔣',label:'Flaticon — Icons',url:'https://flaticon.com'},{icon:'🎬',label:'Coverr — Free Video',url:'https://coverr.co'},{icon:'✏️',label:'Canva — Design Tool',url:'https://canva.com'},{icon:'🔤',label:'Google Fonts',url:'https://fonts.google.com'}].forEach(function(r){
            var a=document.createElement('a'); a.className='cmb-cs-res-item'; a.href=r.url; a.target='_blank'; a.rel='noopener noreferrer';
            a.innerHTML='<span style="font-size:1.2em;">'+r.icon+'</span>'+r.label; panel.appendChild(a);
        });
        return panel;
    }

    var csToolbarHidden = false;
    var csReopenBtn = null;

    function csBuildToolbar(){
        if(document.getElementById('cmb-cs-toolbar')) return;
        var toolbar = document.createElement('div'); toolbar.id = 'cmb-cs-toolbar';

        var rowProps = document.createElement('div'); rowProps.id = 'cmb-cs-row-props';

        function makeTopGroup(label, panelEl){
            var group=document.createElement('div'); group.className='cmb-cs-group';
            var btn=document.createElement('button'); btn.className='cmb-cs-btn'; btn.type='button';
            btn.textContent=label; panelEl.className += ' cmb-cs-panel';
            btn.onclick=function(e){
                e.stopPropagation();
                var isOpen=panelEl.classList.contains('open');
                csCloseAllPanels();
                if(!isOpen){ panelEl.classList.add('open'); btn.classList.add('open'); }
            };
            group.appendChild(btn); group.appendChild(panelEl); return group;
        }

        var rowBottom = document.createElement('div'); rowBottom.id = 'cmb-cs-row-bottom';

        var brand=document.createElement('div'); brand.className='cmb-cs-brand';
        brand.innerHTML='<span class="cmb-cs-mark">◆</span><span class="cmb-cs-name">Content Studio</span>';
        rowBottom.appendChild(brand);

        function buildCategoryPanel(keys){
            var panel=document.createElement('div'); panel.className='cmb-cs-mega-panel';
            keys.forEach(function(key){
                var cat=CS_COMPONENTS[key]; if(!cat) return;
                var heading=document.createElement('div'); heading.className='cmb-cs-menu-section'; heading.textContent=(cat.icon?cat.icon+'  ':'')+cat.label;
                panel.appendChild(heading);
                cat.items.forEach(function(item){
                    var entry=document.createElement('button'); entry.className='cmb-cs-item'; entry.type='button'; entry.textContent=item.label;
                    entry.onclick=function(e){ e.stopPropagation(); csCloseAllPanels(); csHandleItemClick(item, rowProps); };
                    panel.appendChild(entry);
                });
            });
            return panel;
        }

        rowBottom.appendChild(makeTopGroup('Insert  ▾', buildCategoryPanel(['headers','callouts','lists','dividers'])));
        rowBottom.appendChild(makeTopGroup('Layouts  ▾', buildCategoryPanel(['layouts','cards'])));
        rowBottom.appendChild(makeTopGroup('Icons  ▾', csBuildIconPanel(rowProps)));

        var videoBtn=document.createElement('button'); videoBtn.className='cmb-cs-btn'; videoBtn.type='button'; videoBtn.textContent='🎬 Video';
        videoBtn.onclick=function(e){ e.stopPropagation(); csCloseAllPanels(); csBuildVideoPropsRow(rowProps); };
        rowBottom.appendChild(videoBtn);

        rowBottom.appendChild(makeTopGroup('🔗 Resources  ▾', csBuildResourcesPanel()));

        var rightSep=document.createElement('div'); rightSep.className='cmb-cs-sep cmb-cs-spacer';
        rowBottom.appendChild(rightSep);

        var helpBtn=document.createElement('button'); helpBtn.className='cmb-cs-btn'; helpBtn.type='button';
        helpBtn.textContent='? Help'; helpBtn.title='How Content Studio works';
        helpBtn.onclick=function(e){
            e.stopPropagation(); csCloseAllPanels();
            csShowNotice('Insert, Layouts, and Icons drop styled components into the Canvas editor at your cursor. Pick a block, adjust it in the row below, then click Insert.');
        };
        rowBottom.appendChild(helpBtn);

        var hideBtn=document.createElement('button'); hideBtn.className='cmb-cs-btn'; hideBtn.type='button'; hideBtn.textContent='✕'; hideBtn.title='Hide toolbar';
        hideBtn.onclick=function(e){
            e.stopPropagation(); csCloseAllPanels(); toolbar.remove();
            csReopenBtn.style.display='flex'; csToolbarHidden=true;
        };
        rowBottom.appendChild(hideBtn);

        toolbar.appendChild(rowBottom);
        toolbar.appendChild(rowProps);

        toolbar.addEventListener('mousedown', function(e){
            if(e.target.closest('#cmb-cs-row-props')) return;
            e.preventDefault();
        });
        document.addEventListener('click', csCloseAllPanels);

        var rce = document.querySelector('.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce');
        if(rce) rce.parentNode.insertBefore(toolbar, rce);
        else document.body.appendChild(toolbar);
    }

    function csEnsureReopenButton(){
        if(csReopenBtn) return;
        csReopenBtn = document.createElement('button');
        csReopenBtn.id = 'cmb-cs-reopen';
        csReopenBtn.className = 'cmb-cs-reopen';
        csReopenBtn.type = 'button';
        csReopenBtn.innerHTML = '<span>◆</span><span>Content Studio</span>';
        csReopenBtn.addEventListener('click', function(){
            csReopenBtn.style.display = 'none';
            csToolbarHidden = false;
            csBuildToolbar();
        });
        document.body.appendChild(csReopenBtn);
    }

    var CS_RCE_SEL = '.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce';
    function csTick(){
        csEnsureReopenButton();
        if(!csToolbarHidden && csIsEditorPage() && document.querySelector(CS_RCE_SEL) && !document.getElementById('cmb-cs-toolbar')){
            csBuildToolbar();
        }
    }

    // Each menu item is [label, handler]. Handler receives the module element.
    var MODULE_MENU_ITEMS = [
        ["✨ AI Content", function(module){
            selectCanvasModule(module);
            openOverlay();
        }],
        ["🧩 Quiz Builder", function(module){
            openQuizBuilder(module);
        }],
        ["📊 Course Alerts", function(){
            openModuleAlerts();
        }],
        ["📅 Scheduler", function(){
            openScheduler();
        }]
    ];

    function closeAllModuleMenus(){
        document.querySelectorAll(".cmb-module-menu").forEach(function(m){ m.style.display = "none"; });
    }

    function injectModuleToolbarButtons(){
        if(!isModulesPage())return;
        findCanvasModules().forEach(function(module){
            var toolbar = findModuleToolbar(module);
            if(!toolbar)return;
            // Check the button is actually still there, not just a flag on the module
            // container — Canvas re-renders a module's header on its own (drag-reorder,
            // publish-state changes, progress updates), which wipes injected children,
            // but a flag stored on the outer module element would survive that re-render
            // and wrongly think the button still exists.
            if(toolbar.querySelector(".cmb-module-toolbar-wrap"))return;

            var wrap = document.createElement("span");
            wrap.className = "cmb-module-toolbar-wrap";
            wrap.style.cssText = "position:relative;display:inline-block;margin-left:8px;";

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cmb-module-toolbar-btn";
            btn.textContent = "AI Builder ▾";
            btn.title = "Canvas AI Module Builder";

            var menu = document.createElement("div");
            menu.className = "cmb-module-menu";

            MODULE_MENU_ITEMS.forEach(function(entry){
                var item = document.createElement("button");
                item.type = "button";
                item.className = "cmb-module-menu-item";
                item.textContent = entry[0];
                item.addEventListener("click",function(e){
                    e.preventDefault();
                    e.stopPropagation();
                    closeAllModuleMenus();
                    entry[1](module);
                });
                menu.appendChild(item);
            });

            btn.addEventListener("click",function(e){
                e.preventDefault();
                e.stopPropagation();
                var isOpen = menu.style.display === "block";
                closeAllModuleMenus();
                menu.style.display = isOpen ? "none" : "block";
            });
            menu.addEventListener("click",function(e){ e.stopPropagation(); });

            wrap.appendChild(btn);
            wrap.appendChild(menu);
            toolbar.appendChild(wrap);
        });
    }

    function init(){
        GM_addStyle(CSS);
        GM_addStyle(".cmb-module-toolbar-btn{padding:4px 10px;background:#7C3AED;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:700;line-height:1.4;}.cmb-module-toolbar-btn:hover{background:#6D28D9;}.cmb-module-menu{display:none;position:absolute;top:100%;left:0;margin-top:4px;z-index:2147483640;min-width:180px;background:#fff;border:1px solid #d5dbe0;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);overflow:hidden;}.cmb-module-menu-item{display:block;width:100%;text-align:left;padding:8px 12px;border:0;border-top:1px solid #f1f5f9;background:#fff;color:#1E293B;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;}.cmb-module-menu-item:first-child{border-top:0;}.cmb-module-menu-item:hover{background:#F5F3FF;color:#7C3AED;}");
        document.addEventListener("click", closeAllModuleMenus);
        function onPageChange(){
            injectModuleToolbarButtons();
            // SpeedGrader is an SPA — re-mount if Canvas tore the toolbar out
            // of the DOM (student-switch re-renders can do this), and
            // re-check nav context in case the URL's assignment/student
            // params changed without a full reload.
            mountSpeedGraderToolbar();
            if(sgIsSpeedGraderPage()) sgOnNavChange(false);
            // Content Studio docks above Canvas's RCE on any page/assignment/
            // announcement/discussion/syllabus edit screen — re-check every
            // tick since Canvas can tear the RCE (and our toolbar) out on
            // re-render, same as the module buttons and SpeedGrader toolbar.
            if(!sgIsSpeedGraderPage()) csTick();
        }
        onPageChange();
        new MutationObserver(onPageChange).observe(document.body,{childList:true,subtree:true});
        window.addEventListener("popstate", onPageChange);
        setInterval(onPageChange, 1500);
        console.log("[CMB] init complete");
    }

    function waitAndLaunch(tries){
        if(tries===undefined)tries=0;
        if(tries>40)return;
        if(document.body){init();}else{setTimeout(function(){waitAndLaunch(tries+1);},250);}
    }

    if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){waitAndLaunch(0);});}
    else{waitAndLaunch(0);}

    console.log("[CMB] script fully parsed");
})();
