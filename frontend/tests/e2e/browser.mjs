/**
 * A minimal Chrome DevTools Protocol driver.
 *
 * Used by the end-to-end tests to drive a real browser: navigate, evaluate
 * JavaScript, click, type and capture screenshots. Node 22 ships a global
 * WebSocket, so this needs no dependencies.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BROWSER = process.env.BROWSER || '/snap/bin/brave';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask the operating system for a free port.
 *
 * A fixed port is a trap: when a previous browser is still holding it, the
 * new browser cannot bind it and the driver silently attaches to the OLD
 * browser - with its old cookies and its old session - so the test reports
 * results for a browser it never started.
 */
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

export class Browser {
  constructor(port = 0) {
    this.port = port;
    this.process = null;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async launch({ headless = true } = {}) {
    this.userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afia-e2e-'));
    const port = this.port || (await freePort());
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${this.userDataDir}`,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--window-size=1440,1000',
    ];
    if (headless) args.push('--headless=new');
    args.push('about:blank');

    // Detached, so the whole browser process group can be killed together.
    this.process = spawn(BROWSER, args, { stdio: 'ignore', detached: true });

    let target = null;
    for (let i = 0; i < 100; i += 1) {
      await sleep(300);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
        if (target) {
          this.port = port;
          break;
        }
      } catch {
        /* not up yet */
      }
    }
    if (!target) throw new Error('The browser did not expose a debugging target.');

    this.ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.consoleErrors.push(
          message.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
        );
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(
          message.params.exceptionDetails?.exception?.description ||
            message.params.exceptionDetails?.text ||
            'unknown error'
        );
      }
      // window.confirm() blocks until it is answered, so every confirmation
      // is accepted automatically.
      if (message.method === 'Page.javascriptDialogOpening') {
        this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
    });

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
    return this;
  }

  send(method, params = {}, timeout = 60000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, timeout);
    });
  }

  async goto(url, { waitFor = null, timeout = 20000 } = {}) {
    await this.send('Page.navigate', { url });
    await this.waitForLoad(timeout);
    if (waitFor) await this.waitForSelector(waitFor, timeout);
  }

  waitForLoad(timeout = 20000) {
    return new Promise((resolve) => {
      const started = Date.now();
      const poll = async () => {
        const { result } = await this.send('Runtime.evaluate', {
          expression: 'document.readyState',
          returnByValue: true,
        });
        if (result.value === 'complete' || Date.now() - started > timeout) resolve();
        else setTimeout(poll, 200);
      };
      poll();
    });
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      // Async, so an expression can await a fetch inside the page.
      expression: `(async function(){ ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) {
      throw new Error(
        exceptionDetails.exception?.description || exceptionDetails.text || 'evaluation failed'
      );
    }
    return result.value;
  }

  async waitForSelector(selector, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const found = await this.evaluate(
        `return !!document.querySelector(${JSON.stringify(selector)});`
      );
      if (found) return true;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for "${selector}"`);
  }

  async waitForText(text, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const found = await this.evaluate(
        `return (document.body.textContent || '').includes(${JSON.stringify(text)});`
      );
      if (found) return true;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for the text "${text}"`);
  }

  async type(selector, value) {
    await this.evaluate(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('No element ' + ${JSON.stringify(selector)});
      // Textareas have their own value setter; calling the input setter on a
      // textarea is an illegal invocation.
      const proto = el instanceof window.HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    `);
  }

  async click(selector) {
    await this.evaluate(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('No element ' + ${JSON.stringify(selector)});
      el.click();
      return true;
    `);
  }

  /** Click the first element whose trimmed text matches. */
  async clickByText(text, selector = 'button, a') {
    const clicked = await this.evaluate(`
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
      const match = nodes.find((n) => (n.innerText || '').trim().includes(${JSON.stringify(text)}));
      if (!match) return false;
      match.click();
      return true;
    `);
    if (!clicked) throw new Error(`No clickable element with the text "${text}"`);
  }

  /** Click a button inside the open dialog. */
  async clickInDialog(text) {
    const clicked = await this.evaluate(`
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const button = Array.from(dialog.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim().includes(${JSON.stringify(text)}));
      if (!button) return false;
      button.click();
      return true;
    `);
    if (!clicked) throw new Error(`No button with the text "${text}" in the dialog`);
  }

  async text() {
    // textContent, not innerText: innerText depends on layout and can come
    // back empty in a headless browser that has not painted. The <noscript>
    // fallback is removed first so it does not pollute the result.
    const raw = await this.evaluate(`
      var ns = document.querySelector('noscript');
      if (ns) ns.remove();
      return document.body.textContent || '';
    `);
    return raw.replace(/\s+/g, ' ').trim();
  }

  async screenshot(filePath, { fullPage = true } = {}) {
    // A screenshot is evidence, not a check: if the machine is too busy to
    // paint one, the run continues and says so.
    try {
      return await this.capture(filePath, { fullPage });
    } catch (err) {
      console.log(`  (screenshot ${path.basename(filePath)} not captured: ${err.message})`);
      return null;
    }
  }

  async capture(filePath, { fullPage = true } = {}) {
    const params = { format: 'png' };
    if (fullPage) {
      const metrics = await this.send('Page.getLayoutMetrics');
      const size = metrics.cssContentSize || metrics.contentSize;
      params.clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
      params.captureBeyondViewport = true;
    }
    const { data } = await this.send('Page.captureScreenshot', params);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return filePath;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
  }

  async close() {
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    // The browser spawns child processes and the snap wrapper is not the
    // browser, so the whole process group is signalled.
    if (this.process?.pid) {
      for (const signal of ['SIGTERM', 'SIGKILL']) {
        try {
          process.kill(-this.process.pid, signal);
        } catch {
          /* the group may already be gone */
        }
        await sleep(400);
        try {
          process.kill(-this.process.pid, 0);
        } catch {
          break; // the group is gone
        }
      }
    }
    try {
      fs.rmSync(this.userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export { sleep };
export default Browser;
