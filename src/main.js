import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createIntro3D, createBackground3D, createGallery3D, createAssemble3D } from './three-scene.js'

gsap.registerPlugin(ScrollTrigger)

const REDUCED = window.matchMedia('(prefers-reduced-motion:reduce)').matches
const FINE = window.matchMedia('(hover:hover) and (pointer:fine)').matches
const body = document.body

function splitLines() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent
    el.textContent = ''
    text.split(' ').forEach((w, i, arr) => {
      const s = document.createElement('span')
      s.className = 'word'
      s.style.display = 'inline-block'
      s.style.willChange = 'transform'
      s.textContent = w + (i < arr.length - 1 ? ' ' : '')
      el.appendChild(s)
    })
  })
  gsap.set('[data-split] .word', { yPercent: 115 })
}

function splitChars(el) {
  const nodes = [...el.childNodes]
  el.textContent = ''
  nodes.forEach((node) => {
    if (node.nodeName === 'BR') { el.appendChild(document.createElement('br')); return }
    ;(node.textContent || '').split('').forEach((ch) => {
      if (ch === ' ') { el.appendChild(document.createTextNode(' ')); return }
      const s = document.createElement('span')
      s.className = 'rvl-char'
      s.textContent = ch
      el.appendChild(s)
    })
  })
  return el.querySelectorAll('.rvl-char')
}

function walkWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode)
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment()
    node.textContent.split(/(\s+)/).forEach((tok) => {
      if (/^\s+$/.test(tok) || tok === '') { frag.appendChild(document.createTextNode(tok)); return }
      const s = document.createElement('span')
      s.className = node.parentNode.closest('.hl') ? 'word is-hl' : 'word'
      s.textContent = tok
      frag.appendChild(s)
    })
    node.parentNode.replaceChild(frag, node)
  })
}

if (REDUCED) {
  body.classList.add('no-motion')
  body.classList.remove('loading')
  document.getElementById('intro')?.remove()
  initConsent()
  wireAnchors(null)
} else {
  boot()
}

function boot() {
  splitLines()
  const world = { bg3d: null, gallery3d: null, assemble3d: null }

  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)

  if (FINE) {
    const cursor = document.getElementById('cursor')
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' })
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' })
    window.addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY) }, { passive: true })
    document.querySelectorAll('a,button,.btn,[data-magnet]').forEach((el) => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hot'))
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hot'))
    })
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        cursor.dataset.label = el.dataset.cursor
        cursor.classList.add('is-label')
      })
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-label'))
    })

    document.querySelectorAll('[data-magnet]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1,0.4)' })
      const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1,0.4)' })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        mx((e.clientX - r.left - r.width / 2) * 0.4)
        my((e.clientY - r.top - r.height / 2) * 0.4)
      })
      el.addEventListener('pointerleave', () => { mx(0); my(0) })
    })
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' })
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' })
      gsap.set(el, { transformPerspective: 900 })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        rx(((e.clientY - r.top) / r.height - 0.5) * -8)
        ry(((e.clientX - r.left) / r.width - 0.5) * 8)
      })
      el.addEventListener('pointerleave', () => { rx(0); ry(0) })
    })
  }

  const progress = document.getElementById('progress')
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => gsap.set(progress, { scaleX: self.progress }),
  })

  const nav = document.getElementById('nav')
  ScrollTrigger.create({
    start: 'top -200',
    onUpdate: (self) => nav.classList.toggle('hide', self.direction === 1 && self.scroll() > 260),
  })

  const marquees = [
    { el: document.getElementById('marqueeTrack'), dur: 26, dir: -1, ease: 'none' },
    { el: document.getElementById('marqueeFoot'), dur: 22, dir: -1, ease: 'steps(60)' },
    { el: document.getElementById('quotesRow'), dur: 44, dir: -1, ease: 'none' },
  ].filter((m) => m.el)
  marquees.forEach(({ el, dur, dir, ease }) => {
    el.innerHTML += el.innerHTML
    const inner = document.createElement('span')
    inner.style.display = 'inline-flex'
    while (el.firstChild) inner.appendChild(el.firstChild)
    el.appendChild(inner)
    gsap.to(el, { xPercent: 50 * dir, duration: dur, ease, repeat: -1 })
    const skew = gsap.quickTo(inner, 'skewX', { duration: 0.45, ease: 'power3' })
    let idle
    lenis.on('scroll', ({ velocity }) => {
      skew(gsap.utils.clamp(-14, 14, velocity * 0.6))
      clearTimeout(idle)
      idle = setTimeout(() => skew(0), 120)
    })
  })

  const heroReveal = () => {
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to('.hero__title .word', { yPercent: 0, duration: 1, stagger: 0.06 })
      .to('.hero [data-fade]', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.7')
      .from('.hero__floaters i', { opacity: 0, scale: 0, duration: 0.6, stagger: 0.08 }, '-=0.8')
  }
  gsap.set('.hero [data-fade]', { y: 24 })

  gsap.utils.toArray('[data-fade]').forEach((el) => {
    if (el.closest('.hero')) return
    gsap.fromTo(el, { opacity: 0, y: 28 }, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
  })

  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2
    const scene = el.closest('[data-parallax-scene]') || el
    gsap.to(el, {
      yPercent: -speed * 26, ease: 'none',
      scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true },
    })
  })

  const mText = document.getElementById('manifestoText')
  if (mText) {
    walkWords(mText)
    gsap.to('#manifestoText .word:not(.is-hl)', {
      color: '#f4f1ea', stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: mText, start: 'top 75%', end: 'bottom 75%', scrub: true },
    })
  }

  const caps = gsap.utils.toArray('#galleryNow .gcap')
  if (document.querySelector('.gallery')) {
    ScrollTrigger.create({
      trigger: '.gallery', start: 'top top', end: () => '+=' + window.innerHeight * 3.4,
      pin: '.gallery__pin', scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (self) => {
        world.gallery3d?.setProgress(self.progress)
        world.gallery3d?.setVelocity(gsap.utils.clamp(-1.5, 1.5, self.getVelocity() / 1800))
        if (caps.length) {
          const active = Math.round(self.progress * (caps.length - 1))
          caps.forEach((c, i) => c.classList.toggle('is-on', i === active))
        }
      },
    })
    gsap.from('.gallery__intro > *', {
      yPercent: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '.gallery', start: 'top 70%' },
    })
  }

  gsap.utils.toArray('.section-head h2, .assemble__copy h2, .depth__content h2, .gallery__intro h2').forEach((h) => {
    const chars = splitChars(h)
    gsap.set(h, { perspective: 600 })
    gsap.from(chars, {
      yPercent: 120, rotateX: -80, opacity: 0, transformOrigin: '50% 100%',
      duration: 0.9, ease: 'power4.out', stagger: 0.028,
      scrollTrigger: { trigger: h, start: 'top 85%' },
    })
  })

  gsap.utils.toArray('.section-head p, .svc p, .step p, .manifesto__text, .assemble__copy p, .depth__content p').forEach((p) => {
    gsap.fromTo(p, { filter: 'blur(10px)', opacity: 0, y: 16 },
      { filter: 'blur(0px)', opacity: 1, y: 0, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: p, start: 'top 90%' } })
  })

  if (FINE) {
    gsap.utils.toArray('.svc, .quote, .step').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${e.clientX - r.left}px`)
        card.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    })
  }

  const stepsLine = document.querySelector('.steps__line')
  if (stepsLine) {
    ScrollTrigger.create({
      trigger: '.steps', start: 'top 70%', end: 'bottom 80%', scrub: true,
      onUpdate: (self) => stepsLine.style.setProperty('--p', self.progress.toFixed(3)),
    })
  }

  gsap.to('.aurora i', {
    xPercent: (i) => (i % 2 ? 18 : -20), yPercent: (i) => (i % 2 ? -16 : 22),
    scale: 1.25, duration: (i) => 14 + i * 4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.5,
  })
  gsap.to('.aurora', { rotate: 20, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1.5 } })

  const clock = document.querySelector('#clock b')
  if (clock) {
    const fmt = new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
    })
    const tick = () => { clock.textContent = fmt.format(new Date()) }
    tick()
    setInterval(tick, 1000)
  }

  gsap.to('.fl', {
    rotation: (i) => (i % 2 ? 360 : -360), duration: 5, ease: 'steps(18)', repeat: -1,
    stagger: { each: 0.4, from: 'random' },
  })

  gsap.utils.toArray('.services__grid, .steps, .faq__list, .numbers__grid, .quotes').forEach((el) => {
    gsap.fromTo(el,
      { rotateX: 14, y: 60, opacity: 0.35, transformPerspective: 1400, transformOrigin: 'center top' },
      { rotateX: 0, y: 0, opacity: 1, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 55%', scrub: true } })
  })

  if (document.getElementById('assembleStage')) {
    ScrollTrigger.create({
      trigger: '.assemble', start: 'top top', end: () => '+=' + window.innerHeight * 1.8,
      pin: '.assemble__pin', scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (self) => world.assemble3d?.setProgress(self.progress),
    })
  }

  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count)
    const suffix = el.dataset.suffix || ''
    const obj = { v: 0 }
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.firstChild.textContent = Math.round(obj.v) },
        onComplete: () => { el.textContent = Math.round(end) + suffix },
      }),
    })
  })

  gsap.to('.contact__big .word', {
    yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.06,
    scrollTrigger: { trigger: '.contact', start: 'top 75%' },
  })

  document.querySelectorAll('.faq__item').forEach((item) => {
    const panel = item.querySelector('.faq__body')
    gsap.set(panel, { height: 0 })
    item.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault()
      const isOpen = item.hasAttribute('open')
      document.querySelectorAll('.faq__item[open]').forEach((o) => {
        if (o === item) return
        o.removeAttribute('open')
        gsap.to(o.querySelector('.faq__body'), { height: 0, duration: 0.4, ease: 'power3.inOut' })
      })
      if (isOpen) {
        gsap.to(panel, { height: 0, duration: 0.4, ease: 'power3.inOut', onComplete: () => item.removeAttribute('open') })
      } else {
        item.setAttribute('open', '')
        gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.45, ease: 'power3.out' })
      }
    })
  })

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/0123456789'
  document.querySelectorAll('[data-scramble]').forEach((el) => {
    const final = el.textContent
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', once: true,
      onEnter: () => {
        let frame = 0
        const total = 28
        const tick = () => {
          const p = frame / total
          el.textContent = final.split('').map((ch, i) => {
            if (ch === ' ') return ' '
            return i / final.length < p ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
          }).join('')
          if (frame++ < total) requestAnimationFrame(tick)
          else el.textContent = final
        }
        tick()
      },
    })
  })

  if (document.querySelector('.numbers')) {
    ScrollTrigger.create({
      trigger: '.numbers', start: 'top top', end: '+=' + window.innerHeight * 0.6,
      pin: '.numbers__pin', pinSpacing: true, invalidateOnRefresh: true,
    })
  }

  wireAnchors(lenis)
  initConsent()

  function startWorld() {
    try {
      const sceneCanvas = document.getElementById('scene')
      if (sceneCanvas && !world.bg3d) {
        world.bg3d = createBackground3D(sceneCanvas)
        ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => world.bg3d.setScroll(s.progress) })
      }
    } catch (err) {
      console.warn('[dexyn] 3D background unavailable:', err)
      document.getElementById('scene')?.remove()
    }
    try {
      const glCanvas = document.getElementById('galleryGL')
      if (glCanvas && !world.gallery3d) {
        world.gallery3d = createGallery3D(glCanvas, [
          '/work/solvra.svg', '/work/chile20.svg', '/work/norte.svg',
          '/work/aurora.svg', '/work/meridia.svg', '/work/kudo.svg',
        ])
        world.gallery3d.setReveal(1)
      }
    } catch (err) {
      console.warn('[dexyn] 3D gallery unavailable:', err)
      document.getElementById('galleryGL')?.remove()
      document.querySelector('.gallery')?.classList.add('gallery--flat')
    }
    try {
      const aCanvas = document.getElementById('assembleGL')
      if (aCanvas && !world.assemble3d) world.assemble3d = createAssemble3D(aCanvas)
    } catch (err) {
      console.warn('[dexyn] 3D assemble unavailable:', err)
      document.getElementById('assembleGL')?.remove()
    }

    const gate = (sel, scene) => {
      const node = document.querySelector(sel)
      if (!node || !scene?.setActive) return
      new IntersectionObserver(([e]) => scene.setActive(e.isIntersecting), { rootMargin: '20% 0px' }).observe(node)
    }
    gate('.gallery', world.gallery3d)
    gate('.assemble', world.assemble3d)

    ScrollTrigger.refresh()
  }

  runIntro(() => {
    heroReveal()
    ScrollTrigger.refresh()
    requestAnimationFrame(() => requestAnimationFrame(startWorld))
  })

  window.addEventListener('load', () => ScrollTrigger.refresh())
}

function runIntro(done) {
  const intro = document.getElementById('intro')
  if (!intro) { body.classList.remove('loading'); done(); return }
  const num = document.getElementById('introNum')
  const wordEl = document.getElementById('introWord')
  const words = ['Cargando', 'Modelando', 'Puliendo el detalle', 'Casi']
  const counter = { v: 0 }
  const reveal = { v: 0 }

  let stage3d = null
  try {
    const stageCanvas = document.getElementById('introStage')
    if (stageCanvas) stage3d = createIntro3D(stageCanvas)
  } catch (err) {
    console.warn('[dexyn] 3D intro unavailable:', err)
  }

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    clearTimeout(failsafe)
    tl.kill()
    stage3d?.dispose()
    intro.remove()
    body.classList.remove('loading')
    done()
  }
  const failsafe = setTimeout(finish, 6000)

  const tl = gsap.timeline({ onComplete: finish, onStart: () => stage3d?.start() })

  tl.to(counter, {
    v: 100, duration: 1.9, ease: 'power1.inOut',
    onUpdate: () => {
      const p = Math.round(counter.v)
      num.textContent = p
      wordEl.textContent = words[Math.min(words.length - 1, Math.floor(p / 26))]
    },
  }, 0)
    .to('.intro__inner', { opacity: 0, y: -16, duration: 0.4, ease: 'power2.in' }, '+=0.1')
    .to(reveal, { v: 1, duration: 0.7, ease: 'power3.in', onUpdate: () => stage3d?.setReveal(reveal.v) }, '-=0.2')
    .to('.intro__stage', { opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.25')
    .to('.intro__panels span', { yPercent: -102, duration: 0.7, ease: 'power4.inOut', stagger: 0.08 }, '-=0.15')
    .set(intro, { pointerEvents: 'none' })
}

function wireAnchors(lenis) {
  const curtain = document.getElementById('curtain')
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      if (!id || id.length < 2) return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      if (REDUCED || !curtain) {
        target.scrollIntoView({ behavior: 'smooth' })
        return
      }
      gsap.timeline()
        .to(curtain, { scaleY: 1, transformOrigin: 'bottom', duration: 0.45, ease: 'power4.in' })
        .add(() => { lenis ? lenis.scrollTo(target, { immediate: true, force: true }) : target.scrollIntoView() })
        .to(curtain, { scaleY: 0, transformOrigin: 'top', duration: 0.55, ease: 'power4.out' }, '+=0.05')
    })
  })
}

function initConsent() {
  const el = document.getElementById('cookie')
  if (!el) return
  const KEY = 'dexyn.consent'
  let stored = null
  try { stored = localStorage.getItem(KEY) } catch { stored = null }

  const apply = (value) => {
    try { localStorage.setItem(KEY, value) } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent('dexyn:consent', { detail: value }))
  }

  if (stored === 'granted' || stored === 'denied') {
    document.dispatchEvent(new CustomEvent('dexyn:consent', { detail: stored }))
    return
  }

  el.hidden = false
  gsap.set(el, { yPercent: 140 })
  const show = () => {
    if (REDUCED) { gsap.set(el, { yPercent: 0 }); return }
    gsap.to(el, { yPercent: 0, duration: 0.8, ease: 'power4.out' })
  }
  body.classList.contains('loading') ? setTimeout(show, 3400) : show()

  el.querySelectorAll('[data-consent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      apply(btn.dataset.consent)
      if (REDUCED) { el.hidden = true; return }
      gsap.to(el, { y: '140%', duration: 0.5, ease: 'power3.in', onComplete: () => { el.hidden = true } })
    })
  })
}
