import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from '../components/App';
import cssText from '../styles.css?inline';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function injectStyles() {
  if (document.getElementById('crp-styles')) return;
  const style = document.createElement('style');
  style.id = 'crp-styles';
  style.textContent = cssText;
  document.head.appendChild(style);
}

function currentCourseId() {
  return window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
}

function isCanvasCoursePage() {
  if (!currentCourseId()) return false;
  if (/(instructure|canvas|canvaslms)\.com$/i.test(window.location.hostname)) return true;
  return !!(
    document.querySelector('meta[name="csrf-token"]') &&
    (document.querySelector('#breadcrumbs') ||
      document.querySelector('.ic-app-nav-toggle-and-crumbs') ||
      document.querySelector('[data-testid="breadcrumbs"]') ||
      document.querySelector('#content'))
  );
}

function openReports() {
  const courseId = currentCourseId();
  if (!courseId) {
    window.alert('Open Canvas Reports Pro from inside a Canvas course.');
    return;
  }
  if (!host) {
    host = document.createElement('div');
    host.id = 'crp-host';
    document.body.appendChild(host);
    root = createRoot(host);
  }
  root?.render(<App courseId={courseId} onClose={closeReports} />);
}

function closeReports() {
  root?.render(<></>);
}

function injectReportsButton() {
  if (!isCanvasCoursePage()) return;
  if (document.getElementById('crp-launcher')) return;
  const existingMessageButton = document.getElementById('ces-launcher-group');
  const canvasHeader =
    existingMessageButton?.parentElement ||
    document.querySelector('.ic-app-nav-toggle-and-crumbs') ||
    document.querySelector('#breadcrumbs')?.parentElement ||
    document.querySelector('[data-testid="breadcrumbs"]')?.parentElement ||
    document.querySelector('header[role="banner"]') ||
    document.querySelector('#header');

  const button = document.createElement('button');
  button.id = 'crp-launcher';
  button.type = 'button';
  button.textContent = 'Reports';
  button.title = 'Canvas Reports Pro';
  button.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'height:36px',
    'border:1px solid #c7cdd1',
    'border-radius:3px',
    'background:#fff',
    'color:#2d3b45',
    'font:700 13px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
    'line-height:34px',
    'padding:0 12px',
    'cursor:pointer',
    'margin-left:6px',
  ].join(';');
  button.addEventListener('click', openReports);

  if (existingMessageButton) {
    existingMessageButton.insertAdjacentElement('afterend', button);
    return;
  }

  if (canvasHeader) {
    canvasHeader.appendChild(button);
    if (getComputedStyle(canvasHeader).display === 'block') {
      (canvasHeader as HTMLElement).style.display = 'flex';
      (canvasHeader as HTMLElement).style.alignItems = 'center';
    }
    return;
  }

  button.style.position = 'fixed';
  button.style.top = '10px';
  button.style.right = '220px';
  button.style.zIndex = '99998';
  document.body.appendChild(button);
}

injectReportsButton();
injectStyles();
new MutationObserver(injectReportsButton).observe(document.body, { childList: true, subtree: true });
