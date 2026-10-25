const menuIcon = document.querySelector("#menu-icon");
const navbar = document.querySelector(".navbar");
const header = document.querySelector(".header");
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll("header nav a");
const contactForm = document.getElementById("contact-form");
const contactFormStatus = document.getElementById("contact-form-status");
const contactSubmitBtn = document.getElementById("contact-submit-btn");
const typingTextTarget = document.querySelector(".typing-text span");
const scrollProgress = document.getElementById("scroll-progress");
const certificatesVideo = document.querySelector(".certificates-video");
const externalConfig = window.CONFIG || {};
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const EMAILJS_PUBLIC_KEY = externalConfig.EMAILJS_PUBLIC_KEY || "Y90PJL1LsJaaMprKb";
const EMAILJS_SERVICE_ID = externalConfig.EMAILJS_SERVICE_ID || "service_4qxiy7t";
const EMAILJS_TEMPLATE_ID = externalConfig.EMAILJS_TEMPLATE_ID || "template_b8b6acj";

function setContactStatus(message, type) {
    if (!contactFormStatus) return;
    contactFormStatus.textContent = message;
    contactFormStatus.classList.remove("success", "error");
    if (type) {
        contactFormStatus.classList.add(type);
    }
}

function isEmailJsConfigured() {
    return ![EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID].some((value) =>
        String(value).startsWith("YOUR_")
    );
}

function initializeTypewriter() {
    if (!typingTextTarget) return;

    const words = [
        "AI Generalist",
        "Aspiring AI/ML Engineer",
        "Python Developer",
        "Full-Stack Developer",
        "GenAI Builder",
    ];

    // Reduced motion: show a static role instead of animating.
    if (prefersReducedMotion.matches) {
        typingTextTarget.textContent = words[0];
        return;
    }

    const typingSpeed = 90;
    const deletingSpeed = 50;
    const holdDelay = 1300;
    const nextWordDelay = 260;

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function tick() {
        const currentWord = words[wordIndex];

        if (isDeleting) {
            charIndex -= 1;
        } else {
            charIndex += 1;
        }

        typingTextTarget.textContent = currentWord.slice(0, charIndex);

        let timeout = isDeleting ? deletingSpeed : typingSpeed;

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            timeout = holdDelay;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            timeout = nextWordDelay;
        }

        window.setTimeout(tick, timeout);
    }

    typingTextTarget.textContent = "";
    window.setTimeout(tick, 400);
}

/* One-time section reveals + staggered child reveals.
   Reveal classes are only ever added by this script, so content stays
   fully visible when JavaScript is unavailable. */
function initializeSectionReveal() {
    const revealSections = Array.from(sections).filter((section) => section.id !== "home");
    const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));

    if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
        revealSections.forEach((section) => section.classList.add("is-visible"));
        return;
    }

    revealSections.forEach((section) => section.classList.add("scroll-reveal"));
    revealItems.forEach((item) => item.classList.add("reveal-pending"));

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible", "is-revealed");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.05,
            rootMargin: "0px 0px -40px 0px",
        }
    );

    revealSections.forEach((section) => observer.observe(section));
    revealItems.forEach((item) => observer.observe(item));
}

if (menuIcon && navbar) {
    const closeMobileMenu = () => {
        menuIcon.classList.remove("fa-xmark");
        menuIcon.classList.add("fa-bars");
        navbar.classList.remove("active");
        menuIcon.setAttribute("aria-expanded", "false");
        menuIcon.setAttribute("aria-label", "Open navigation menu");
    };

    menuIcon.addEventListener("click", () => {
        const isOpen = navbar.classList.toggle("active");
        menuIcon.classList.toggle("fa-xmark", isOpen);
        menuIcon.classList.toggle("fa-bars", !isOpen);
        menuIcon.setAttribute("aria-expanded", String(isOpen));
        menuIcon.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("click", (event) => {
        if (!navbar.classList.contains("active") || header.contains(event.target)) return;
        closeMobileMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMobileMenu();
    });
}

/* Scroll handling: header state, active section, reading progress.
   Section offsets are measured once (and on resize) so the scroll handler
   never reads layout after writing styles — no forced synchronous layout. */
let scrollTicking = false;
let documentMaxScroll = 0;
let sectionMetrics = [];

function measureLayout() {
    const doc = document.documentElement;
    documentMaxScroll = Math.max(doc.scrollHeight - window.innerHeight, 0);
    sectionMetrics = Array.from(sections).map((sec) => ({
        id: sec.getAttribute("id"),
        offset: sec.offsetTop,
        height: sec.offsetHeight,
    }));
    buildStackGeometry();
}

function updateScrollState() {
    const top = window.scrollY;

    const progress = documentMaxScroll > 0 ? Math.min(top / documentMaxScroll, 1) : 0;
    let activeId = null;

    for (const metric of sectionMetrics) {
        const start = metric.offset - 150;
        if (top >= start && top < start + metric.height) {
            activeId = metric.id;
            break;
        }
    }

    // All reads done — now apply writes.
    if (scrollProgress) {
        scrollProgress.style.transform = `scaleX(${progress})`;
    }

    if (header) {
        const stickyNow = top > 60;
        if (header.classList.contains("sticky") !== stickyNow) {
            header.classList.toggle("sticky", stickyNow);
            // Header padding changes with .sticky - re-measure the pill.
            placePill(pillAnchorLink);
        }
    }

    if (activeId) {
        let activeNavLink = null;
        navLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${activeId}`;
            link.classList.toggle("active", isActive);
            if (isActive) activeNavLink = link;
        });
        pinPill(activeNavLink);
    }

    applyStackFrames();

    scrollTicking = false;
}

/* ===== Motion upgrade: stacked-card scroll + sliding glass nav pill =====
   Progressive enhancement layered on the existing rAF scroll handler.
   Without JavaScript, under reduced motion, or below 996px the zones keep
   their normal grid/flow layout and the nav keeps plain links. When active,
   each zone becomes a single-column stack whose per-card transform is a
   pure function of scrollY - scrolling back reverses exactly, nothing is
   hijacked, and geometry is cached so the scroll handler never reads
   layout mid-frame. */

const stackZones = Array.from(document.querySelectorAll(".stack-zone"));
let stackFrames = [];
const STACK_PIN_OFFSET = 96; // px below the viewport top where cards pin
const STACK_HOLD_VH = 0.5; // extra scroll the last card holds before release

function stackChildren(zone) {
    return Array.from(zone.children).filter((child) =>
        child.matches(".project-card, .bar, .skills-category")
    );
}

function setupStacks() {
    const stacked = window.innerWidth > 995 && !prefersReducedMotion.matches;

    stackZones.forEach((zone) => {
        const children = stackChildren(zone);
        if (!children.length) return;

        if (stacked) {
            zone.classList.add("stack-active");
            // Spacing between cards sets the pin cadence: each card pins
            // one "step" (data-stack-step x viewport height) after the last.
            const stepTarget = (parseFloat(zone.dataset.stackStep) || 0.6) * window.innerHeight;
            const minGap = window.innerHeight * 0.14;
            children.forEach((child, index) => {
                // The stack owns visibility while active; the generic
                // reveal-pending state would fight the scroll transforms.
                child.classList.remove("reveal-pending");
                child.classList.add("is-revealed");
                child.style.zIndex = String(index + 1);
                child.style.marginTop =
                    index === 0
                        ? "0px"
                        : `${Math.max(stepTarget - child.offsetHeight, minGap).toFixed(0)}px`;
            });
        } else {
            zone.classList.remove("stack-active");
            children.forEach((child) => {
                child.style.marginTop = "";
                child.style.transform = "";
                child.style.zIndex = "";
                if (!child.classList.contains("is-revealed")) {
                    child.classList.add("reveal-pending");
                }
            });
        }
    });

    buildStackGeometry();
    applyStackFrames();
}

function buildStackGeometry() {
    stackFrames = [];
    stackZones.forEach((zone) => {
        if (!zone.classList.contains("stack-active")) return;
        const children = stackChildren(zone);
        if (!children.length) return;
        // Layout position via the offsetTop chain, NOT getBoundingClientRect:
        // sections animate the CSS `translate` property during their reveal,
        // which pollutes rect-based measurement until the transition settles.
        let zoneTop = 0;
        for (let el = zone; el; el = el.offsetParent) zoneTop += el.offsetTop;
        const scaleStep = parseFloat(zone.dataset.stackScale) || 0.015;
        const dropPx = (parseFloat(zone.dataset.stackDrop) || 1.6) * 10;
        // child.offsetTop includes the margins setupStacks() applied.
        const starts = children.map((child) => zoneTop + child.offsetTop - STACK_PIN_OFFSET);
        stackFrames.push({
            children,
            starts,
            scaleStep,
            dropPx,
            release: starts[starts.length - 1] + STACK_HOLD_VH * window.innerHeight,
        });
    });
}

function applyStackFrames() {
    if (!stackFrames.length) return;
    const y = window.scrollY;

    stackFrames.forEach((frame) => {
        let activeIndex = -1;
        for (let i = 0; i < frame.starts.length; i += 1) {
            if (y >= frame.starts[i]) activeIndex = i;
        }

        frame.children.forEach((child, i) => {
            // pinned: 0 before the pin point, then holds the card at the pin
            // line until the release point (the whole stack then scrolls away
            // as one unit). enterLag: incoming cards trail slightly below
            // their natural rise, easing to 0 exactly at the pin point.
            const pinned = Math.min(
                Math.max(y - frame.starts[i], 0),
                Math.max(frame.release - frame.starts[i], 0)
            );
            const incoming = frame.starts[i] - y;
            const enterLag = incoming > 0 ? Math.min(80, incoming * 0.09) : 0;
            // depth: how many cards are pinned on top of this one - earlier
            // cards recede with a small scale-down and downward offset.
            const depth = Math.max(activeIndex - i, 0);
            const scale = Math.max(0.84, 1 - depth * frame.scaleStep);
            const offset = pinned + enterLag + depth * frame.dropPx;
            child.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        });
    });
}

/* Content above the stacks (lazy images finishing, font swap) can shift
   the stacks' page position after the initial measurement. Watching the
   body size rebuilds the cached pin geometry whenever that happens.
   Safe: rebuilds are read-only, transforms stay a pure function of
   scrollY, and the queued rAF prevents observer thrash. */
if ("ResizeObserver" in window) {
    let stackRebuildQueued = false;
    const bodySizeObserver = new ResizeObserver(() => {
        if (stackRebuildQueued) return;
        stackRebuildQueued = true;
        window.requestAnimationFrame(() => {
            stackRebuildQueued = false;
            buildStackGeometry();
            applyStackFrames();
        });
    });
    bodySizeObserver.observe(document.body);
}

/* --- Sliding glass nav pill (adapted from the iOS Camera mode selector):
   ONE shared element slides + resizes between nav links. The Resume CTA is
   excluded by design; hover/focus preview the pill but never change the
   selected section. Geometry is re-placed on resize, font load and the
   header's sticky padding shift. */
const navPill = document.querySelector(".nav-pill");
const pillLinks = Array.from(navLinks).filter(
    (link) => link.getAttribute("href").indexOf("#") === 0 && !link.classList.contains("nav-resume-btn")
);
let pillAnchorLink = null;

function placePill(link) {
    if (!navPill || !header || !link) return;
    if (window.innerWidth <= 995) return;
    const linkRect = link.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    navPill.style.width = `${linkRect.width.toFixed(1)}px`;
    navPill.style.height = `${linkRect.height.toFixed(1)}px`;
    navPill.style.transform = `translate3d(${(linkRect.left - headerRect.left).toFixed(1)}px, ${(linkRect.top - headerRect.top).toFixed(1)}px, 0)`;
}

function pinPill(link) {
    if (!link || link === pillAnchorLink || pillLinks.indexOf(link) === -1) return;
    pillAnchorLink = link;
    placePill(link);
}

if (navPill && navbar) {
    navbar.addEventListener("pointerover", (event) => {
        const link = event.target.closest("a");
        if (!link) return;
        placePill(link.classList.contains("nav-resume-btn") ? pillAnchorLink : link);
    });
    navbar.addEventListener("pointerleave", () => placePill(pillAnchorLink));
    navbar.addEventListener("focusin", (event) => {
        const link = event.target.closest("a");
        if (link && !link.classList.contains("nav-resume-btn")) placePill(link);
    });
    navbar.addEventListener("focusout", () => placePill(pillAnchorLink));
    navbar.classList.add("nav-pill-ready");
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => placePill(pillAnchorLink));
    }
    // Webfont swap can finish AFTER both fonts.ready and load (fallback
    // metrics shift the links horizontally) - re-place on the Font Loading
    // API's loadingdone event so the pill always matches final metrics.
    if (document.fonts && document.fonts.addEventListener) {
        document.fonts.addEventListener("loadingdone", () => placePill(pillAnchorLink));
    }
    window.addEventListener("load", () => placePill(pillAnchorLink), { once: true });
}

measureLayout();

let resizeTicking = false;
window.addEventListener(
    "resize",
    () => {
        if (resizeTicking) return;
        resizeTicking = true;
        window.requestAnimationFrame(() => {
            // Stacks re-apply spacing first (it changes layout), then the
            // metric caches, then the pill and scroll-derived state.
            setupStacks();
            measureLayout();
            placePill(pillAnchorLink);
            updateScrollState();
            resizeTicking = false;
        });
    },
    { passive: true }
);

window.addEventListener(
    "scroll",
    () => {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(updateScrollState);
    },
    { passive: true }
);

updateScrollState();

const yearSpan = document.getElementById("copyright-year");
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

initializeTypewriter();
initializeSectionReveal();

/* Motion-upgrade init runs last so the reveal system has already marked
   its items; stacks then take over their visibility and spacing, and the
   layout is re-measured because stack spacing changes document height. */
setupStacks();
measureLayout();
updateScrollState();

// Certificates video: only download/play it when it scrolls into view
// (5.7 MB below the fold — keeps initial load light). Pauses when off-screen
// and stays paused entirely under reduced motion.
if (certificatesVideo) {
    if (prefersReducedMotion.matches) {
        certificatesVideo.pause();
    } else if ("IntersectionObserver" in window) {
        const videoObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        certificatesVideo.play().catch(() => { });
                    } else {
                        certificatesVideo.pause();
                    }
                });
            },
            { threshold: 0.25 }
        );
        videoObserver.observe(certificatesVideo);
    } else {
        certificatesVideo.play().catch(() => { });
    }
}

if (contactForm) {
    if (window.emailjs && isEmailJsConfigured()) {
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

    let isSubmitting = false;

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        if (!window.emailjs) {
            setContactStatus("Email service is not loaded. Please refresh and try again.", "error");
            return;
        }

        if (!isEmailJsConfigured()) {
            setContactStatus("Form is not configured yet. Add your EmailJS keys in config.js.", "error");
            return;
        }

        if (isSubmitting) return;
        isSubmitting = true;

        const formData = new FormData(contactForm);
        const senderEmail = formData.get("email");
        const originalBtnText = contactSubmitBtn ? contactSubmitBtn.textContent : "Send Message";

        if (contactSubmitBtn) {
            contactSubmitBtn.disabled = true;
            contactSubmitBtn.textContent = "Sending...";
        }

        setContactStatus("Sending your message...", "");

        const templateParams = {
            from_name: formData.get("name"),
            from_email: senderEmail,
            phone: formData.get("phone"),
            subject: formData.get("subject"),
            message: formData.get("message"),
            reply_to: senderEmail,
        };

        try {
            await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
            setContactStatus("Message sent successfully. I will get back to you soon.", "success");
            contactForm.reset();
        } catch (error) {
            console.error("Contact form email failed:", error);
            setContactStatus("Message failed to send. Please try again.", "error");
        } finally {
            isSubmitting = false;
            if (contactSubmitBtn) {
                contactSubmitBtn.disabled = false;
                contactSubmitBtn.textContent = originalBtnText;
            }
        }
    });
}
