// AI Grader for Canvas — content script
// Standalone SpeedGrader toolbar (AI Grade, Grading Criteria, Comment
// Snippets, Cheating Detection Audit) split out of Canvas AI Module Builder
// for teachers who only need grading, not the module-building tools.
// Bring-your-own-Claude-API-key — no backend, no licensing server.

(function () {
    "use strict";
    console.log("[AIGrader] script starting");

    if (window.__CANVAS_AI_GRADER__) return;
    window.__CANVAS_AI_GRADER__ = true;
    if (window.top !== window.self) return;

    function GM_addStyle(css){
        var el = document.createElement("style");
        el.textContent = css;
        (document.head || document.documentElement).appendChild(el);
    }

    const APIKEY_KEY = "AIgrader_APIKey";
    const AI_MODEL_CONTENT = "claude-sonnet-4-6";
    const AI_MODEL_CONTENT_FAST = "claude-haiku-4-5-20251001";
    const TOKENS_DEFAULT = 6000;
    function contentModel(itemData){ return itemData.aiEngine==="fast" ? AI_MODEL_CONTENT_FAST : AI_MODEL_CONTENT; }

    var state = { apiKey: "" };
    try { state.apiKey = localStorage.getItem(APIKEY_KEY) || ""; } catch(e) {}
    function saveApiKey(k){ try{ localStorage.setItem(APIKEY_KEY, k); }catch(e){} state.apiKey = k; }

    function esc(s){var d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}

    // ========== COURSE ID EXTRACTION ==========
    function getCourseId(){
        var m = window.location.pathname.match(/\/courses\/(\d+)/);
        return m ? m[1] : null;
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

    // ========== CSS STYLES ==========
    const CSS = `
    #cmb-sg-toolbar{position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#1B303D;height:44px;display:flex;align-items:center;gap:4px;padding:0 10px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.25);}
    /* Toolbar is position:fixed (so it stays put while SpeedGrader's own
       panes scroll internally) which would otherwise sit on top of Canvas's
       fixed header — push the whole page down by the toolbar's height so
       nothing is covered. */
    body.cmb-sg-page-mode{padding-top:44px !important;}
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
    `;
    GM_addStyle(CSS);

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
        var renderers={ ai:sgRenderAiDrawer, needs:sgRenderQueueDrawer, criteria:sgRenderCriteriaDrawer, comments:sgRenderCommentsDrawer, audit:sgRenderAuditDrawer, settings:sgRenderSettingsDrawer };
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
        if(!state.apiKey) sgShowDrawer("settings");

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
        bar.querySelector("#cmb-sg-settings-btn").addEventListener("click", function(){ sgShowDrawer("settings"); });
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


    // ── Settings (API key + teacher name) ──
    // The full Module Builder has a dedicated Setup screen for this; the
    // standalone grader has no other UI, so it lives in its own drawer here.
    function sgRenderSettingsDrawer(drawer){
        var helpHtml="Your Claude API key is required for AI Grade — get one at console.anthropic.com and paste it here. It's stored only in this browser (localStorage), never sent anywhere except directly to Anthropic when you run AI Grade.";
        sgMakeHeader(drawer, "⚙", "Settings", null, helpHtml);
        var h='<div class="cmb-sg-dbody">';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Claude API Key</label><input type="password" class="cmb-sg-input" id="cmb-sg-set-apikey" value="'+esc(state.apiKey||"")+'" placeholder="sk-ant-..."></div>';
        h+='<div class="cmb-sg-fgrp"><label class="cmb-sg-flabel">Your Name</label><input type="text" class="cmb-sg-input" id="cmb-sg-set-teacher" value="'+esc(localStorage.getItem(SG_TEACHER_NAME_KEY)||"")+'" placeholder="Used to sign off AI-drafted feedback"></div>';
        h+='</div><div class="cmb-sg-dfoot"><button class="cmb-sg-abtn cmb-sg-abtn-secondary" id="cmb-sg-set-done">Done</button></div>';
        drawer.insertAdjacentHTML("beforeend", h);
        drawer.querySelector("#cmb-sg-set-apikey").addEventListener("input", function(e){ saveApiKey(e.target.value.trim()); });
        drawer.querySelector("#cmb-sg-set-teacher").addEventListener("input", function(e){
            try{ localStorage.setItem(SG_TEACHER_NAME_KEY, e.target.value.trim()); }catch(err){}
        });
        drawer.querySelector("#cmb-sg-set-done").addEventListener("click", sgCloseDrawer);
    }

    // ========== BOOTSTRAP ==========
    // Trimmed to just the SpeedGrader toolbar — no module/quiz builder, no
    // Content Studio, unlike the full Canvas AI Module Builder this was
    // split out of.
    function init(){
        function onPageChange(){
            // SpeedGrader is an SPA — re-mount if Canvas tore the toolbar out
            // of the DOM (student-switch re-renders can do this), and
            // re-check nav context in case the URL's assignment/student
            // params changed without a full reload.
            mountSpeedGraderToolbar();
            if(sgIsSpeedGraderPage()) sgOnNavChange(false);
        }
        onPageChange();
        new MutationObserver(onPageChange).observe(document.body,{childList:true,subtree:true});
        window.addEventListener("popstate", onPageChange);
        setInterval(onPageChange, 1500);
        console.log("[AIGrader] init complete");
    }

    function waitAndLaunch(tries){
        if(tries===undefined)tries=0;
        if(tries>40)return;
        if(document.body){init();}else{setTimeout(function(){waitAndLaunch(tries+1);},250);}
    }

    if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){waitAndLaunch(0);});}
    else{waitAndLaunch(0);}

    console.log("[AIGrader] script fully parsed");
})();
