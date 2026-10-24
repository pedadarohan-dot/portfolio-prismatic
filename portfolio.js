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
        header.classList.toggle("sticky", top > 60);
    }

    if (activeId) {
        navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
        });
    }

    scrollTicking = false;
}

measureLayout();

let resizeTicking = false;
window.addEventListener(
    "resize",
    () => {
        if (resizeTicking) return;
        resizeTicking = true;
        window.requestAnimationFrame(() => {
            measureLayout();
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
