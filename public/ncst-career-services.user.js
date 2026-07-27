// ==UserScript==
// @name         NCST Career Services
// @namespace    ncstrades.edu
// @version      0.20
// @description  Loads NCST Career Services tools from career-toolkit
// @match        https://outlook.office.com/*
// @match        https://outlook.office365.com/*
// @match        https://outlook.cloud.microsoft/*
// @homepageURL  https://career-toolkit-ruby.vercel.app/employer-portal
// @updateURL    https://career-toolkit-ruby.vercel.app/ncst-career-services.user.js
// @downloadURL  https://career-toolkit-ruby.vercel.app/ncst-career-services.user.js
// @grant        GM_xmlhttpRequest
// @connect      career-toolkit-ruby.vercel.app
// @connect      api.anthropic.com
// @connect      nominatim.openstreetmap.org
// ==/UserScript==

(function () {
    'use strict';

    if (window.__NCST_CAREER_SERVICES__) return;
    window.__NCST_CAREER_SERVICES__ = true;

    const APP_URL = 'https://career-toolkit-ruby.vercel.app/ncst-career-services.app.js';

    GM_xmlhttpRequest({
        method: 'GET',
        url: APP_URL,
        onload(response) {
            if (response.status !== 200) {
                console.error('NCST Career Services: could not load app from', APP_URL);
                return;
            }
            eval(response.responseText);
        },
        onerror() {
            console.error('NCST Career Services: network error loading app from', APP_URL);
        },
    });
})();
