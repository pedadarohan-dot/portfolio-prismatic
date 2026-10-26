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
let currentSectionId = null;
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
        const bar = `scaleX(${progress.toFixed(4)})`;
        if (scrollProgress.__barTransform !== bar) {
            scrollProgress.__barTransform = bar;
            scrollProgress.style.transform = bar;
        }
    }

    if (header) {
        const stickyNow = top > 60;
        if (header.classList.contains("sticky") !== stickyNow) {
            header.classList.toggle("sticky", stickyNow);
            // Header padding changes with .sticky - re-measure the pill.
            placePill(pillAnchorLink);
        }
    }

    /* Only touch the nav when the active section actually changes. Writing
       classList.toggle on every link each frame is an attribute mutation
       per link per frame, and that alone keeps style recalc alive for the
       whole scroll. */
    if (activeId && activeId !== currentSectionId) {
        currentSectionId = activeId;
        let activeNavLink = null;
        navLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${activeId}`;
            link.classList.toggle("active", isActive);
            if (isActive) activeNavLink = link;
        });
        pinPill(activeNavLink);
    }

    scrollTicking = false;
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

function placePill(link, { liquid = false } = {}) {
    if (!navPill || !header || !link) return;
    if (window.innerWidth <= 995) return;
    const linkRect = link.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const nextX = linkRect.left - headerRect.left;

    /* Liquid jelly on hover/focus: measure the hop from where the pill
       currently sits, stretch it toward the target (further = more squash),
       origin on the trailing edge so it lags like a heavy blob, then let the
       keyframe animation counter-bounce and settle. Clamped so a long sweep
       across the nav stays tasteful, and skipped under reduced motion. */
    if (liquid && !prefersReducedMotion.matches) {
        const currentX =
            parseFloat((navPill.style.transform.match(/translate3d\(\s*([-\d.]+)px/) || [0, 0])[1]) || 0;
        const currentW = parseFloat(navPill.style.width) || linkRect.width;
        const travel = nextX + linkRect.width / 2 - (currentX + currentW / 2);
        if (Math.abs(travel) > 4) {
            const t = Math.min(Math.abs(travel) / 320, 1);
            const stretchX = (1.04 + 0.1 * t).toFixed(3);
            const squashY = (1 - 0.06 * t).toFixed(3);
            navPill.style.setProperty("--pill-squash-x", stretchX);
            navPill.style.setProperty("--pill-squash-y", squashY);
            // Leading edge pulls forward: origin sits on the side it leaves.
            navPill.style.transformOrigin = travel > 0 ? "left center" : "right center";
            navPill.classList.remove("is-shifting");
            void navPill.offsetWidth; // restart the keyframes
            navPill.classList.add("is-shifting");
        }
    }

    navPill.style.width = `${linkRect.width.toFixed(1)}px`;
    navPill.style.height = `${linkRect.height.toFixed(1)}px`;
    navPill.style.transform = `translate3d(${nextX.toFixed(1)}px, ${(linkRect.top - headerRect.top).toFixed(1)}px, 0)`;
}

function pinPill(link) {
    if (!link || link === pillAnchorLink || pillLinks.indexOf(link) === -1) return;
    pillAnchorLink = link;
    placePill(link, { liquid: true });
}

if (navPill && navbar) {
    /* pointerover bubbles, so sweeping a link's own text re-fires it several
       times per link. Each call used to force a reflow and restart the jelly
       keyframe, which is why the bubble looked twitchy instead of liquid.
       Place the pill once per link entered. */
    let previewLink = null;
    let previewAnchor = null;
    navbar.addEventListener("pointerover", (event) => {
        const link = event.target.closest("a");
        if (!link) return;
        const target = link.classList.contains("nav-resume-btn") ? pillAnchorLink : link;
        // The anchor can move underneath a resting pointer (scroll changes
        // the section), so re-place when that happened too.
        if (target === previewLink && previewAnchor === pillAnchorLink) return;
        previewLink = target;
        previewAnchor = pillAnchorLink;
        placePill(target, { liquid: true });
    });
    navbar.addEventListener("pointerleave", () => {
        previewLink = null;
        previewAnchor = null;
        placePill(pillAnchorLink, { liquid: true });
    });
    navbar.addEventListener("focusin", (event) => {
        const link = event.target.closest("a");
        if (link && !link.classList.contains("nav-resume-btn")) placePill(link, { liquid: true });
    });
    navbar.addEventListener("focusout", () => placePill(pillAnchorLink, { liquid: true }));
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
            // Re-measure the section caches, then re-place the pill and
            // re-apply scroll-derived state.
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

/* Motion-upgrade init runs last so the reveal system has already marked its
   items. */
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