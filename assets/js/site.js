/* LicenseIQ marketing site: navigation, reveal animations, counters, the
   savings estimator and the demo-request form. Plain script, no build step. */
(function () {
  'use strict';

  // Every demo request opens an email to this address. Change it here and in
  // the mailto: links in the HTML.
  const DEMO_EMAIL = 'alireza-farhidzadeh@hcltech.com';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const integer = new Intl.NumberFormat('en-US');

  /* ---------- Header ---------- */
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  if (toggle && header) {
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
    header.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length && 'IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Animated counters ----------
     <span data-count="1378800" data-format="money-compact">$0</span> */
  const formatCount = (value, format) => {
    switch (format) {
      case 'money': return money.format(value);
      case 'money-compact': return value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : money.format(value);
      case 'percent': return `${value.toFixed(1)}%`;
      case 'plus': return `${integer.format(Math.round(value))}+`;
      default: return integer.format(Math.round(value));
    }
  };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const format = el.dataset.format || 'int';
    if (reducedMotion || !isFinite(target)) { el.textContent = formatCount(target, format); return; }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = formatCount(target * easeOut(p), format);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { runCounter(entry.target); io.unobserve(entry.target); } });
    }, { threshold: 0.4 });
    counters.forEach((el) => io.observe(el));
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Savings estimator ----------
     Two transparent assumptions, both shown on the page:
     - an idle license averages 0.6 FUE (idle accounts span all three tiers)
     - moving a user from Advanced (1 FUE) to Core (0.2 FUE) frees 0.8 FUE */
  const calc = document.getElementById('calc');
  if (calc) {
    const users = calc.querySelector('#calc-users');
    const price = calc.querySelector('#calc-price');
    const idle = calc.querySelector('#calc-idle');
    const over = calc.querySelector('#calc-over');
    const out = {
      users: calc.querySelector('#out-users'),
      idle: calc.querySelector('#out-idle'),
      over: calc.querySelector('#out-over'),
      total: calc.querySelector('#out-total'),
      idleMoney: calc.querySelector('#out-idle-money'),
      overMoney: calc.querySelector('#out-over-money'),
      idleBar: calc.querySelector('#bar-idle'),
      overBar: calc.querySelector('#bar-over'),
      fue: calc.querySelector('#out-fue'),
      threeYear: calc.querySelector('#out-3y'),
    };
    const IDLE_FUE = 0.6;
    const DOWNGRADE_FUE = 0.8;
    const update = () => {
      const n = Number(users.value);
      const p = Math.max(0, Number(price.value) || 0);
      const idleShare = Number(idle.value) / 100;
      const overShare = Number(over.value) / 100;
      const idleUsers = n * idleShare;
      const overUsers = (n - idleUsers) * overShare;
      const idleFue = idleUsers * IDLE_FUE;
      const overFue = overUsers * DOWNGRADE_FUE;
      const idleMoney = idleFue * p;
      const overMoney = overFue * p;
      const total = idleMoney + overMoney;
      out.users.textContent = integer.format(n);
      out.idle.textContent = `${idle.value}%`;
      out.over.textContent = `${over.value}%`;
      out.total.textContent = money.format(total);
      out.idleMoney.textContent = money.format(idleMoney);
      out.overMoney.textContent = money.format(overMoney);
      const max = Math.max(idleMoney, overMoney, 1);
      out.idleBar.style.width = `${(idleMoney / max) * 100}%`;
      out.overBar.style.width = `${(overMoney / max) * 100}%`;
      out.fue.textContent = `${integer.format(Math.round(idleFue + overFue))} FUE`;
      out.threeYear.textContent = money.format(total * 3);
    };
    [users, price, idle, over].forEach((el) => el.addEventListener('input', update));
    update();
  }

  /* ---------- Demo request form → prefilled email ---------- */
  const form = document.getElementById('demo-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const company = (data.get('company') || '').toString().trim();
      const size = (data.get('size') || '').toString();
      const timing = (data.get('timing') || '').toString();
      const subject = `LicenseIQ demo request${company ? ` – ${company}` : ''}`;
      const body = [
        'Hello,',
        '',
        "I'd like to see a LicenseIQ demo.",
        '',
        `Name: ${name}`,
        `Company: ${company}`,
        `SAP users (approx.): ${size}`,
        `Next renewal: ${timing}`,
        '',
        'Preferred times:',
        '',
      ].join('\n');
      window.location.href = `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------- FAQ: one answer open at a time ---------- */
  const faq = document.querySelector('.faq');
  if (faq) {
    faq.addEventListener('toggle', (e) => {
      if (!e.target.open) return;
      faq.querySelectorAll('details[open]').forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
