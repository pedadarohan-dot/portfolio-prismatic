const menuIcon = document.querySelector("#menu-icon");
const navbar = document.querySelector(".navbar");
const header = document.querySelector(".header");
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll("header nav a");
const contactForm = document.getElementById("contact-form");
const contactFormStatus = document.getElementById("contact-form-status");
const contactSubmitBtn = document.getElementById("contact-submit-btn");
const typingTextTarget = document.querySelector(".typing-text span");
const externalConfig = window.CONFIG || {};

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

function initializeSectionReveal() {
    const revealSections = Array.from(sections).filter((section) => section.id !== "home");

    if (!revealSections.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        revealSections.forEach((section) => section.classList.add("is-visible"));
        return;
    }

    revealSections.forEach((section) => section.classList.add("scroll-reveal"));

    if (!("IntersectionObserver" in window)) {
        revealSections.forEach((section) => section.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.05,
            rootMargin: "0px 0px 0px 0px",
        }
    );

    revealSections.forEach((section) => observer.observe(section));
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

window.onscroll = () => {
    const top = window.scrollY;

    sections.forEach((sec) => {
        const offset = sec.offsetTop - 150;
        const height = sec.offsetHeight;
        const id = sec.getAttribute("id");

        if (top >= offset && top < offset + height) {
            navLinks.forEach((link) => {
                link.classList.remove("active");
            });
            const activeLink = document.querySelector(`header nav a[href*="${id}"]`);
            if (activeLink) {
                activeLink.classList.add("active");
            }
        }
    });

    if (header) {
        header.classList.toggle("sticky", window.scrollY > 100);
    }

};

const yearSpan = document.getElementById("copyright-year");
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

initializeTypewriter();
initializeSectionReveal();

if (contactForm) {
    if (window.emailjs && isEmailJsConfigured()) {
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

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
            if (contactSubmitBtn) {
                contactSubmitBtn.disabled = false;
                contactSubmitBtn.textContent = originalBtnText;
            }
        }
    });
}
