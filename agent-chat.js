/**
 * AI Agent for Rohan Pedada's Portfolio
 *
 * Architecture:
 * 1. LLM Core – Google Gemini API integration
 * 2. Retrieval Module – Portfolio data lookup (get_portfolio_data)
 * 3. Tool Module – send_email via EmailJS
 * 4. Memory Module – Session context management
 *
 * The agent follows a strict decision pipeline:
 *   Intent → Retrieve if needed → Execute tools if needed → Respond in Rohan's voice
 */

(function () {
    "use strict";

    /* =============================================
       CONFIGURATION
       ============================================= */
    // Use global CONFIG from config.js if available, otherwise use defaults
    const EXTERNAL_CONFIG = window.CONFIG || {};

    const CONFIG = {
        // IMPORTANT: Replace with your actual Gemini API key
        // Get one free at https://aistudio.google.com/app/apikey
        // WARNING: Never commit real API keys to version control
        apiKey: EXTERNAL_CONFIG.GEMINI_API_KEY || "AIzaSyChfUx7e82d7uCU3l-rkuB9VHsllNbqGL4",
        // Gemini API endpoint (key is passed as query parameter)
        apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
        model: EXTERNAL_CONFIG.GEMINI_MODEL || "gemini-2.5-flash",
        maxTokens: 600,
        temperature: 0.7,
        // EmailJS config (reuses existing portfolio config)
        emailjsPublicKey: EXTERNAL_CONFIG.EMAILJS_PUBLIC_KEY || "Y90PJL1LsJaaMprKb",
        emailjsServiceId: EXTERNAL_CONFIG.EMAILJS_SERVICE_ID || "service_4qxiy7t",
        emailjsTemplateId: EXTERNAL_CONFIG.EMAILJS_TEMPLATE_ID || "template_b8b6acj",
    };

    const OWNER_EMAIL = EXTERNAL_CONFIG.OWNER_EMAIL || "pedadarohan@gmail.com";

    /* =============================================
       MEMORY MODULE
       ============================================= */
    const Memory = {
        conversationHistory: [],
        userProfile: null, // recruiter, student, collaborator, etc.
        pendingEmail: null, // holds email draft and sender details awaiting confirmation
        pendingSender: null,

        addMessage(role, content) {
            this.conversationHistory.push({ role, content });
        },

        getHistory() {
            return this.conversationHistory.slice(-16); // keep last 16 messages for context
        },

        clear() {
            this.conversationHistory = [];
            this.pendingEmail = null;
            this.pendingSender = null;
            this.userProfile = null;
        },

        setPendingEmail(emailData, sender) {
            this.pendingEmail = emailData;
            this.pendingSender = sender;
        },

        getPendingEmail() {
            return this.pendingEmail;
        },

        clearPendingEmail() {
            this.pendingEmail = null;
            this.pendingSender = null;
        },
    };

    /* =============================================
       RETRIEVAL MODULE (RAG)
       ============================================= */
    // Self-contained portfolio snapshot: this keeps chat answers available even when the JSON file is missing.
    // Keep synchronized with portfolio-data.json when portfolio content changes.
    const LOCAL_PORTFOLIO_DATA = {
  "about": {
    "name": "Rohan Pedada",
    "title": "AI Generalist & Aspiring AI/ML Engineer",
    "roles": [
      "AI Generalist",
      "Aspiring AI/ML Engineer",
      "Python Developer",
      "AI Chatbot Builder",
      "Full-Stack Developer",
      "Prompt Engineer",
      "Generative AI Builder",
      "Problem Solver"
    ],
    "bio": "Rohan Pedada is an AI Generalist and aspiring AI/ML Engineer with strong foundations in programming, data structures, web technologies, and AI-driven systems. He builds intelligent solutions that solve real-world problems using Python, modern web stacks, and practical AI workflows.",
    "education": [
      {
        "degree": "B.Tech",
        "field": "Electrical Engineering",
        "years": "2023 - 2027",
        "institution": "NIT Mizoram",
        "cgpa": "9.23/10"
      },
      {
        "degree": "Intermediate",
        "field": "Andhra Pradesh State Board Of Intermediate Education",
        "year": "2023",
        "institution": "Narayana College, Srikakulam",
        "cgpa": "10.00/10"
      },
      {
        "degree": "High School",
        "field": "Board of Secondary Education, Andhra Pradesh",
        "institution": "Geetanjali School, Srikakulam",
        "cgpa": "10.00/10"
      },
      {
        "degree": "Internships",
        "details": "Completed internships at RINL, Visakhapatnam Steel Plant and IIT Guwahati."
      }
    ],
    "experience": [
      {
        "organization": "RINL, Visakhapatnam Steel Plant",
        "type": "Industrial internship",
        "period": "December 2024"
      },
      {
        "organization": "IIT Guwahati",
        "type": "Research and engineering internship",
        "period": "May 2025"
      },
      {
        "organization": "Satish Dhawan Space Centre (ISRO)",
        "type": "Engineering internship",
        "period": "June 2026",
        "details": "Worked on servomotor commissioning using PLC and servodrive, and developed an automatic fluid mixer control system using PLC and SCADA."
      }
    ],
    "social": {
      "linkedin": "https://www.linkedin.com/in/rohan-pedada-b6b250380",
      "github": "https://github.com/pedadarohan-dot",
      "x": "https://x.com/rockstar_0729",
      "instagram": "https://instagram.com/rohan.pedada"
    }
  },
  "skills": [
    {
      "name": "Python",
      "description": "Programming language listed in Rohan's resume."
    },
    {
      "name": "C Programming",
      "description": "Programming language listed in Rohan's resume."
    },
    {
      "name": "HTML",
      "description": "Web technology listed in Rohan's resume."
    },
    {
      "name": "CSS",
      "description": "Web technology listed in Rohan's resume."
    },
    {
      "name": "JavaScript",
      "description": "Adds interactivity and dynamic behavior across frontend applications."
    },
    {
      "name": "AI & ChatGPT",
      "description": "AI expertise and tools referenced in Rohan's resume."
    },
    {
      "name": "Data Structures & Algorithms",
      "description": "DSA is listed in Rohan's resume."
    },
    {
      "name": "AI Tools",
      "description": "AI tools and ChatGPT expertise listed in Rohan's resume."
    },
    {
      "name": "Intelligent Systems & AI Solutions",
      "description": "Building intelligent systems and AI solutions is a stated interest in Rohan's resume."
    },
    {
      "name": "Machine Learning",
      "description": "Rohan describes himself as an aspiring Machine Learning Engineer in his resume."
    },
    {
      "name": "Automation Systems",
      "description": "Automation systems are listed in Rohan's resume."
    },
    {
      "name": "Application Engineering",
      "description": "Application engineering is listed in Rohan's resume."
    }
  ],
  "certifications": [
    "Generative AI Mastermind — Outskill",
    "AI for Engineers — Outskill",
    "Python 101 for Data Science — IBM",
    "AI Tools and ChatGPT Expert — Be10X"
  ],
  "services": [
    {
      "title": "AI Engineering",
      "description": "Building intelligent systems powered by LLMs, RAG architectures, and machine learning models that deliver real business value."
    },
    {
      "title": "Python Development",
      "description": "From automation scripts to complex backends, creating clean and scalable Python applications with modern frameworks."
    },
    {
      "title": "Full-Stack Web Development",
      "description": "Modern, responsive web applications using React, Tailwind CSS, and robust backend architectures."
    },
    {
      "title": "AI Chatbots & Automation",
      "description": "Intelligent chatbots and workflow automations using ChatGPT, Gemini, and custom AI agents."
    },
    {
      "title": "Generative AI Solutions",
      "description": "Custom GenAI applications leveraging LLMs, prompt engineering, and AI APIs to generate useful outputs."
    },
    {
      "title": "System-Level Programming",
      "description": "High-performance C programming focused on optimization, memory efficiency, and algorithm design."
    }
  ],
  "projects": [
    {
      "name": "CineWatch",
      "summary": "A mood-aware movie recommender combining content similarity, collaborative filtering and emotion classification to make discovery feel more personal.",
      "role": "Machine Learning Project",
      "tech": "Python, TF-IDF, SVD, NLP, Transformers",
      "liveDemo": "https://github.com/pedadarohan-dot/emotion-based-movie-recommendation-system"
    },
    {
      "name": "Data Science AI Assistant",
      "summary": "A multi-agent workflow that takes a natural-language analysis request through planning, code generation, execution and review.",
      "role": "AI Project",
      "tech": "LangGraph, Python, Gradio, AI agents",
      "liveDemo": "https://huggingface.co/spaces/Rockstar729/data-science-ai-assistant"
    },
    {
      "name": "Monocular Metric Metrology",
      "summary": "A webcam-based measurement pipeline that estimates real-world dimensions using camera calibration, geometric estimation and pose tracking.",
      "role": "Computer Vision Project",
      "tech": "Python, OpenCV, Camera Calibration, Pose Tracking"
    },
    {
      "name": "CampusWay",
      "summary": "An indoor campus navigation experience that helps visitors find buildings and services through a clear map-based interface.",
      "role": "Web Application Project",
      "tech": "Web Development, Mapping, User Experience",
      "liveDemo": "https://github.com/pedadarohan-dot"
    },
    {
      "name": "Predictive Failure Maintenance",
      "summary": "A support vector machine based predictive maintenance project for identifying patterns associated with equipment failure.",
      "role": "Machine Learning Project",
      "tech": "Python, SVM, Predictive Maintenance"
    },
    {
      "name": "SREO",
      "summary": "An intelligent energy optimization project focused on improving how energy use is monitored and managed.",
      "role": "Engineering Project",
      "tech": "Energy Systems, Optimization, Software"
    },
    {
      "name": "RAG Chatbot",
      "summary": "A retrieval-augmented chatbot workflow that grounds responses in connected information sources.",
      "role": "AI Automation Project",
      "tech": "RAG, n8n, Chatbot Automation"
    },
    {
      "name": "Code Converter Agent",
      "summary": "An AI agent that translates code between programming languages while aiming to preserve the original logic and intent.",
      "role": "AI Project",
      "tech": "Python, LLMs, Code Translation",
      "liveDemo": "https://codeconverter007.netlify.app/"
    },
    {
      "name": "File Converter Agent",
      "summary": "A file conversion web app that brings common document and media conversion workflows together.",
      "role": "Web Application Project",
      "tech": "Python, File Conversion, Media Tools",
      "liveDemo": "https://fileconverter007.netlify.app/"
    }
  ],
  "contact": {
    "linkedin": "https://www.linkedin.com/in/rohan-pedada-b6b250380",
    "github": "https://github.com/pedadarohan-dot",
    "resumeUrl": "Rohan Pedada Resume.pdf"
  }
};

    let portfolioData = null;
    let portfolioDataPromise = null;

    async function loadPortfolioData() {
        if (portfolioData) return portfolioData;
        if (portfolioDataPromise) return portfolioDataPromise;

        portfolioDataPromise = (async () => {
            // Keep an embedded snapshot available when a static host serves the
            // page but fails to publish portfolio-data.json alongside it.
            const embeddedData = LOCAL_PORTFOLIO_DATA;
            // Make local answers available immediately while the JSON refresh runs.
            portfolioData = embeddedData;

            const pageUrl = new URL(window.location.href);
            const candidates = [];
            const configuredPath = window.CONFIG?.PORTFOLIO_DATA_URL;

            if (configuredPath) candidates.push(new URL(configuredPath, pageUrl).href);
            // Resolve beside this script so root and nested-path deployments work.
            const script = Array.from(document.scripts).find((item) => /(?:^|\/)agent-chat\.js(?:$|[?#])/.test(item.src));
            if (script?.src) candidates.push(new URL("portfolio-data.json", script.src).href);
            candidates.push(new URL("portfolio-data.json", pageUrl).href);

            const attempted = new Set();
            for (const url of candidates) {
                if (attempted.has(url)) continue;
                attempted.add(url);
                const controller = new AbortController();
                const timeout = window.setTimeout(() => controller.abort(), 2500);
                try {
                    const response = await fetch(url, { cache: "no-cache", signal: controller.signal });
                    if (!response.ok) throw new Error(`Portfolio data request failed (${response.status})`);
                    const data = await response.json();
                    if (!data?.about || !Array.isArray(data.skills) || !Array.isArray(data.projects)) {
                        throw new Error("Portfolio data has an invalid structure.");
                    }
                    portfolioData = data;
                    console.info("Agent: Portfolio data loaded", url);
                    return portfolioData;
                } catch (err) {
                    console.warn("Agent: Portfolio data path failed", url, err);
                } finally {
                    window.clearTimeout(timeout);
                }
            }

            if (embeddedData) {
                portfolioData = embeddedData;
                portfolioDataPromise = Promise.resolve(portfolioData);
                console.info("Agent: Portfolio data loaded from the embedded fallback.");
                return portfolioData;
            }

            // Permit a later retry if the network or static host was temporarily unavailable.
            portfolioDataPromise = null;
            console.error("Agent: Could not load portfolio data from any configured path.");
            return null;
        })();
        return portfolioDataPromise;
    }

    function hasIntent(q, terms) {
        return terms.some((term) => q.includes(term));
    }

    function answerFromPortfolio(query) {
        if (!portfolioData) return "I'm having trouble loading the portfolio details right now. Please try again shortly.";
        const q = query.toLowerCase();
        const data = getPortfolioData(query);
        const project = findMatchingProject(query);

        if (hasIntent(q, ["project", "built", "build", "developed", "develop", "created", "create", "work", "portfolio", "made"])) {
            if (project) {
                return `**${project.name}**\n\n${project.summary}\n\n**Role:** ${project.role}\n**Technologies:** ${project.tech}${project.liveDemo ? `\n\n[View project](${project.liveDemo})` : ""}`;
            }
            return `**Rohan's projects**\n\n${portfolioData.projects.map((item) => `- **${item.name}** — ${item.summary}`).join("\n")}`;
        }
        if (hasIntent(q, ["skill", "tech", "technology", "stack", "know", "proficient"])) {
            return `**Rohan's skills**\n\n${portfolioData.skills.map((skill) => `- **${skill.name}** — ${skill.description}`).join("\n")}`;
        }
        if (project) {
            return `**${project.name}**\n\n${project.summary}\n\n**Role:** ${project.role}\n**Technologies:** ${project.tech}${project.liveDemo ? `\n\n[View project](${project.liveDemo})` : ""}`;
        }
        if (hasIntent(q, ["education", "study", "college", "university", "degree", "school", "cgpa", "internship", "experience"])) {
            const education = portfolioData.about.education.map((item) => `- **${item.degree}** — ${item.institution || item.field}${item.years ? ` (${item.years})` : ""}${item.cgpa ? `, ${item.cgpa}` : ""}${item.details ? ` — ${item.details}` : ""}`).join("\n");
            const experience = (portfolioData.about.experience || []).map((item) => `- **${item.organization}** — ${item.type}${item.period ? ` (${item.period})` : ""}${item.details ? `: ${item.details}` : ""}`).join("\n");
            return `**Education**\n\n${education}${experience ? `\n\n**Experience**\n\n${experience}` : ""}`;
        }
        if (hasIntent(q, ["certification", "certificate", "certificates"])) {
            return `**Certifications**\n\n${(portfolioData.certifications || []).map((item) => `- ${item}`).join("\n") || "See the certificates section for Rohan's credentials."}`;
        }
        if (hasIntent(q, ["contact", "reach", "linkedin", "github", "social", "connect", "email"])) {
            return `**Contact Rohan**\n\n- [LinkedIn](${portfolioData.contact.linkedin})\n- [GitHub](${portfolioData.contact.github})\n- Email: ${OWNER_EMAIL}`;
        }
        if (hasIntent(q, ["service", "offer", "hire", "expertise"])) {
            return `**Services**\n\n${portfolioData.services.map((item) => `- **${item.title}** — ${item.description}`).join("\n")}`;
        }
        if (hasIntent(q, ["about", "who is", "tell me about", "introduce", "background"]) || q.trim() === "rohan") {
            return `**${portfolioData.about.name}** — ${portfolioData.about.title}.\n\n${portfolioData.about.bio}\n\n${portfolioData.about.education[0].degree} in ${portfolioData.about.education[0].field} at ${portfolioData.about.education[0].institution} (${portfolioData.about.education[0].years}), CGPA ${portfolioData.about.education[0].cgpa}.`;
        }
        if (hasIntent(q, ["interest", "hobby", "hobbies"])) {
            return "Rohan's resume notes interests in building intelligent systems and AI solutions, automation systems, application engineering, and machine learning.";
        }
        if (hasIntent(q, ["interest", "hobby", "hobbies"])) {
            return "Rohan's resume notes interests in building intelligent systems and AI solutions, automation systems, application engineering, and machine learning.";
        }
        return data.about ? `${portfolioData.about.name}: ${portfolioData.about.bio}` : "I can answer questions about Rohan's projects, skills, education, services, and contact details. What would you like to know?";
    }

    /**
     * TOOL: get_portfolio_data
     * Queries the portfolio knowledge base by category and keywords.
     * Returns structured data matching the query.
     */
    function getPortfolioData(query) {
        if (!portfolioData) return { error: "Portfolio data not loaded." };

        const q = query.toLowerCase();
        const results = {};

        // About / Bio
        if (
            q.includes("about") ||
            q.includes("who is rohan") ||
            q.includes("tell me about") ||
            q.includes("introduction") ||
            q.includes("bio") ||
            q.includes("background")
        ) {
            results.about = portfolioData.about;
        }

        // Skills
        if (q.includes("skill") || q.includes("tech stack") || q.includes("technolog") || q.includes("what can") || q.includes("know") || q.includes("proficien")) {
            results.skills = portfolioData.skills;
        }

        // Services
        if (
            q.includes("service") ||
            q.includes("offer") ||
            q.includes("hire") ||
            q.includes("what does rohan do") ||
            q.includes("expertise") ||
            q.includes("speciali")
        ) {
            results.services = portfolioData.services;
        }

        // Education
        if (
            q.includes("education") ||
            q.includes("study") ||
            q.includes("college") ||
            q.includes("university") ||
            q.includes("degree") ||
            q.includes("school") ||
            q.includes("academic") ||
            q.includes("cgpa") ||
            q.includes("internship") ||
            q.includes("experience")
        ) {
            results.education = portfolioData.about.education;
            results.experience = portfolioData.about.experience || [];
        }

        if (q.includes("certification") || q.includes("certificate")) {
            results.certifications = portfolioData.certifications || [];
        }

        // Projects
        if (
            q.includes("project") ||
            q.includes("built") ||
            q.includes("portfolio") ||
            q.includes("work") ||
            q.includes("developed") ||
            q.includes("develop") ||
            q.includes("created") ||
            q.includes("create") ||
            q.includes("built") ||
            q.includes("build") ||
            q.includes("made")
        ) {
            results.projects = portfolioData.projects;
        }

        // Contact
        if (
            q.includes("contact") ||
            q.includes("reach") ||
            q.includes("email") ||
            q.includes("linkedin") ||
            q.includes("github") ||
            q.includes("social") ||
            q.includes("connect")
        ) {
            results.contact = portfolioData.contact;
        }

        const matchedProject = findMatchingProject(query);
        if (matchedProject) {
            results.projects = [matchedProject];
        }

        // If nothing specific matched, return everything (broad query)
        if (Object.keys(results).length === 0) {
            // Fuzzy match: search across all text content
            const allSections = {
                about: portfolioData.about,
                skills: portfolioData.skills,
                services: portfolioData.services,
                projects: portfolioData.projects,
                education: portfolioData.about.education,
                experience: portfolioData.about.experience || [],
                certifications: portfolioData.certifications || [],
                contact: portfolioData.contact,
            };

            const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
            for (const [key, value] of Object.entries(allSections)) {
                const text = JSON.stringify(value).toLowerCase();
                if (queryWords.some((word) => text.includes(word))) {
                    results[key] = value;
                }
            }
        }

        // If still nothing, return overview
        if (Object.keys(results).length === 0) {
            results.about = portfolioData.about;
            results.skills = portfolioData.skills;
            results.services = portfolioData.services;
        }

        return results;
    }

    function findMatchingProject(query) {
        if (!portfolioData) return null;
        const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const exact = portfolioData.projects.find((project) => {
            const name = project.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
            return normalized.includes(name);
        });
        if (exact) return exact;

        if (/\b(projects?|built|developed|created|work|portfolio|technology|technologies|tech stack|skills?)\b/i.test(query)) return null;
        const queryTokens = new Set(normalized.split(/\s+/).filter(Boolean));
        let bestMatch = null;
        let bestScore = 0;
        for (const project of portfolioData.projects) {
            const tokens = project.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean);
            const genericTitleWords = new Set(["agent", "assistant", "project", "system", "systematic", "converter", "based", "predictive", "built", "work", "developed", "created"]);
            const meaningfulTokens = tokens.filter((token) => token.length > 2 && !genericTitleWords.has(token));
            const matched = meaningfulTokens.filter((token) => token.length >= 5 && queryTokens.has(token)).length;
            const score = matched / Math.max(meaningfulTokens.length, 1);
            if (matched && score > bestScore) {
                bestMatch = project;
                bestScore = score;
            }
        }
        return bestScore >= 0.5 ? bestMatch : null;
    }

    /* =============================================
       TOOL: send_email
       ============================================= */
    /**
     * Sends an email using the existing EmailJS integration.
     * Returns a promise resolving to success/failure status.
     */
    async function sendEmail(subject, body, sender) {
        if (!sender?.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email || "")) {
            return { success: false, error: "Please provide a valid name and email address." };
        }
        if (!window.emailjs || !CONFIG.emailjsPublicKey || !CONFIG.emailjsServiceId || !CONFIG.emailjsTemplateId) {
            return { success: false, error: "Email service not available." };
        }

        try {
            window.emailjs.init({ publicKey: CONFIG.emailjsPublicKey });

            const templateParams = {
                from_name: sender.name,
                from_email: sender.email,
                to_email: OWNER_EMAIL,
                subject: subject,
                message: body,
                reply_to: sender.email,
            };

            await window.emailjs.send(
                CONFIG.emailjsServiceId,
                CONFIG.emailjsTemplateId,
                templateParams
            );

            return { success: true };
        } catch (error) {
            console.error("Agent send_email error:", error);
            return { success: false, error: error.message || "Failed to send email." };
        }
    }

    /* =============================================
       LLM CORE — Google Gemini API
       ============================================= */

    const SYSTEM_PROMPT = `You are an AI Agent embedded inside the personal portfolio of Rohan Pedada.

You are not just a chatbot.
You are a SYSTEM composed of:
1. Conversation Engine (LLM reasoning)
2. Retrieval System (Portfolio knowledge)
3. Action Layer (Tools like email)
4. Memory Layer (Session awareness)

Your job is to intelligently coordinate between these layers.

PERSONALITY MODEL — You MUST reflect:
- Highly driven, execution-focused
- Structured thinker
- High standards, detail-oriented
- Builds real-world solutions (not theory)
- Cares about presentation and credibility
- Slight perfectionist → prefers polished output
- Direct, serious, intelligent tone

COMMUNICATION STYLE:
- Clear and structured
- Professional but not robotic
- No fluff, no generic responses
- Use sections when helpful
- Every response should feel "crafted"
- Keep responses concise but high-quality — this is a chat UI

RETRIEVAL RULES (VERY IMPORTANT):
WHEN USER ASKS ABOUT Rohan, Projects, Skills, Experience, Services, Education, or Contact:
→ Use the get_portfolio_data tool to fetch relevant information
→ Then extract relevant info, reframe it cleanly
→ Do NOT dump raw data
→ If no data found, say: "I don't have that exact detail from the portfolio, but here's a grounded answer based on available information."
→ NEVER hallucinate details

TOOL USAGE:
WHEN USER SAYS "Send an email..." or "Contact Rohan...":
→ Ask the visitor for their name, email address, and message
→ Draft the email with Subject and Body
→ Show the draft
→ Ask for confirmation before sending
→ The recipient is always ${OWNER_EMAIL}; use the visitor's email as reply-to
→ Always send the email only to ${OWNER_EMAIL}

EMAIL STYLE: Professional, clean, direct. No unnecessary words.

DECISION LOGIC:
IF query == informational about Rohan → Use retrieval tool + answer
IF query == action (send email) → Use tool
IF query unclear → Ask clarification

ADAPTIVE TONE:
- Recruiter → more professional
- Student → slightly explanatory
- Collaborator → practical

PRIORITIZE: CLARITY > LENGTH

STRICT RULES:
DO NOT: give generic chatbot answers, hallucinate portfolio details, be overly casual, ignore structure
DO: think before answering, use tools properly, maintain identity consistency

You have access to these tools:
- get_portfolio_data: Call with {"query": "search terms"} to retrieve portfolio information
- send_email: Call with {"subject": "subject line", "body": "email body"} to send an email to ${OWNER_EMAIL}`;

    /**
     * Converts conversation history to Gemini's contents format.
     */
    function buildGeminiContents() {
        const history = Memory.getHistory();
        const contents = [];

        for (const msg of history) {
            if (msg.role === "user") {
                contents.push({
                    role: "user",
                    parts: [{ text: msg.content }],
                });
            } else if (msg.role === "assistant") {
                contents.push({
                    role: "model",
                    parts: [{ text: msg.content }],
                });
            }
        }

        return contents;
    }

    /**
     * Gemini function declarations for tool calling.
     */
    const GEMINI_FUNCTION_DECLARATIONS = [
        {
            name: "get_portfolio_data",
            description:
                "Retrieve information about Rohan Pedada's portfolio including about, skills, projects, services, education, and contact details.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "Search terms for what portfolio information to retrieve. Examples: 'skills', 'projects', 'education', 'about', 'contact', 'services'",
                    },
                },
                required: ["query"],
            },
        },
        {
            name: "send_email",
            description: "Prepare an email draft only after the visitor provides their name, email address, and message. Sending requires explicit confirmation.",
            parameters: {
                type: "object",
                properties: {
                    subject: {
                        type: "string",
                        description: "The email subject line",
                    },
                    body: {
                        type: "string",
                        description: "The email body content",
                    },
                    senderName: { type: "string", description: "Visitor's name" },
                    senderEmail: { type: "string", description: "Visitor's email address" },
                },
                required: ["subject", "body", "senderName", "senderEmail"],
            },
        },
    ];

    /**
     * Calls the Gemini API with function calling support.
     * Handles the full agent loop:
     *   Gemini → function call → execute function → send result → Gemini final response
     */
    async function callLLM(userMessage, context) {
        Memory.addMessage("user", userMessage);

        const url = `${CONFIG.apiEndpoint}/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;
        const groundedContext = getPortfolioData(userMessage);

        const requestBody = {
            contents: buildGeminiContents(),
            systemInstruction: {
                parts: [{ text: `${SYSTEM_PROMPT}\n\nVERIFIED PORTFOLIO CONTEXT (treat as source of truth):\n${JSON.stringify(groundedContext)}` }],
            },
            tools: [
                {
                    functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
                },
            ],
            generationConfig: {
                temperature: CONFIG.temperature,
                maxOutputTokens: CONFIG.maxTokens,
            },
        };

        try {
            // First Gemini API call
            const firstResponse = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!firstResponse.ok) {
                const errData = await firstResponse.json().catch(() => ({}));
                const errMsg = errData?.error?.message || `API error ${firstResponse.status}`;
                throw new Error(errMsg);
            }

            const firstData = await firstResponse.json();
            const candidate = firstData.candidates?.[0];
            if (!candidate || !candidate.content || !candidate.content.parts) {
                throw new Error("No response from Gemini.");
            }

            const parts = candidate.content.parts;

            // Check if the model wants to call any functions
            const functionCalls = parts.filter((p) => p.functionCall);

            if (functionCalls.length > 0) {
                // Process each function call
                const functionResponses = [];

                for (const part of functionCalls) {
                    const fnName = part.functionCall.name;
                    const fnArgs = part.functionCall.args || {};

                    let result;
                    if (fnName === "get_portfolio_data") {
                        result = getPortfolioData(fnArgs.query || "");
                    } else if (fnName === "send_email") {
                        const emailData = {
                            subject: fnArgs.subject,
                            body: fnArgs.body,
                        };
                        const sender = { name: fnArgs.senderName, email: fnArgs.senderEmail };
                        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email || "");
                        if (!sender.name || !emailValid || !emailData.subject || !emailData.body) {
                            result = { status: "sender_details_required", message: "Ask for the visitor's name, valid email address, and message before preparing a sendable draft." };
                        } else {
                            Memory.setPendingEmail(emailData, sender);
                            result = { status: "email_draft_created", email: emailData };
                        }
                    } else {
                        result = { error: "Unknown function: " + fnName };
                    }

                    functionResponses.push({
                        functionResponse: {
                            name: fnName,
                            response: result,
                        },
                    });
                }

                // Build follow-up request with function responses
                const followUpContents = [
                    ...buildGeminiContents(),
                    {
                        role: "model",
                        parts: functionCalls.map((p) => ({ functionCall: p.functionCall })),
                    },
                    {
                        role: "function",
                        parts: functionResponses,
                    },
                ];

                const followUpBody = {
                    contents: followUpContents,
                    systemInstruction: {
                        parts: [{ text: `${SYSTEM_PROMPT}\n\nVERIFIED PORTFOLIO CONTEXT (treat as source of truth):\n${JSON.stringify(groundedContext)}` }],
                    },
                    tools: [
                        {
                            functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
                        },
                    ],
                    generationConfig: {
                        temperature: CONFIG.temperature,
                        maxOutputTokens: CONFIG.maxTokens,
                    },
                };

                // Second Gemini API call with function results
                const secondResponse = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(followUpBody),
                });

                if (!secondResponse.ok) {
                    const errData = await secondResponse.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `API error on follow-up: ${secondResponse.status}`);
                }

                const secondData = await secondResponse.json();
                const finalParts = secondData.candidates?.[0]?.content?.parts;

                if (!finalParts) {
                    throw new Error("No response from Gemini after function call.");
                }

                // Extract text from the response (may contain function calls again, but typically just text)
                let finalText = "";
                for (const p of finalParts) {
                    if (p.text) finalText += p.text;
                }

                if (!finalText) finalText = JSON.stringify(getPortfolioData(userMessage));
                Memory.addMessage("assistant", finalText);
                return { message: finalText, emailDraft: Memory.getPendingEmail() };
            }

            // No function calls — let Gemini compose the answer using the
            // verified portfolio context in the system instruction.
            let responseText = "";
            for (const p of parts) {
                if (p.text) responseText += p.text;
            }

            if (!responseText.trim()) responseText = JSON.stringify(getPortfolioData(userMessage));
            Memory.addMessage("assistant", responseText);
            return { message: responseText, emailDraft: null };
        } catch (error) {
            console.error("Agent Gemini error:", error);
            return {
                message: null,
                error: error.message || "Something went wrong. Please try again.",
            };
        }
    }

    /* =============================================
       FALLBACK: OFFLINE MODE
       When no API key is configured, use local
       pattern matching for common queries.
       ============================================= */
    function localFallback(userMessage) {
        const q = userMessage.toLowerCase().trim();

        // Greetings
        if (/^(hi|hello|hey|sup|yo|greetings)/.test(q) && q.length < 30) {
            return "**Hey!** I'm Rohan's AI assistant.\n\nI can tell you about his skills, projects, education, services, or help you get in touch. What are you looking for?";
        }

        // About
        if (
            q.includes("who is rohan") ||
            q.includes("tell me about rohan") ||
            q.includes("about rohan") ||
            q.trim() === "rohan" ||
            q.includes("introduce")
        ) {
            const data = portfolioData;
            if (!data) return "I'm having trouble loading portfolio data right now. Please try again.";
            const education = data.about.education[0];
            return `**${data.about.name}** — ${data.about.title}.\n\n${data.about.bio}\n\nCurrently pursuing ${education.degree} in ${education.field} at ${education.institution} (${education.years}), CGPA ${education.cgpa}.`;
        }

        const matchedProject = findMatchingProject(q);
        if (matchedProject) {
            return `**${matchedProject.name}**\n${matchedProject.summary}\nRole: ${matchedProject.role} | Tech: ${matchedProject.tech}${matchedProject.liveDemo ? `\n\n[View project](${matchedProject.liveDemo})` : ""}`;
        }

        // Skills
        if (q.includes("skill") || q.includes("tech") || q.includes("what can")) {
            const data = portfolioData;
            if (!data) return "Unable to load skills data.";
            return `**Rohan's Skills:**\n\n${data.skills.map((skill) => `- **${skill.name}** — ${skill.description}`).join("\n")}`;
        }

        // Projects
        if (q.includes("project") || q.includes("built") || q.includes("work") || findMatchingProject(q)) {
            const data = portfolioData;
            if (!data) return "Unable to load projects data.";

            let resp = "**Rohan's Projects:**\n\n";
            data.projects.forEach((p) => {
                resp += `**${p.name}**\n${p.summary}\nRole: ${p.role} | Tech: ${p.tech}\n\n`;
            });
            resp += "Want more details on any specific project?";
            return resp;
        }

        // Education
        if (q.includes("education") || q.includes("study") || q.includes("college") || q.includes("school")) {
            const data = portfolioData;
            if (!data) return "Unable to load education data.";

            let resp = "**Rohan's Education:**\n\n";
            data.about.education.forEach((e) => {
                resp += `- **${e.degree}** — ${e.institution || e.field || ""} ${e.cgpa ? "(" + e.cgpa + " CGPA)" : ""}\n`;
            });
            return resp;
        }

        if (q.includes("internship") || q.includes("experience")) {
            const items = portfolioData?.about?.experience || [];
            if (!items.length) return "I don't have internship details in the portfolio data right now.";
            return `**Experience**\n\n${items.map((item) => `- **${item.organization}** — ${item.type}${item.period ? ` (${item.period})` : ""}${item.details ? `: ${item.details}` : ""}`).join("\n")}`;
        }

        if (q.includes("certification") || q.includes("certificate")) {
            const items = portfolioData?.certifications || [];
            return items.length ? `**Certifications**\n\n${items.map((item) => `- ${item}`).join("\n")}` : "See the certificates section for Rohan's credentials.";
        }

        // Certifications
        if (q.includes("certificate") || q.includes("certification") || q.includes("certifications")) {
            return `**Certifications**\n\n${(portfolioData?.certifications || []).map((item) => `- ${item}`).join("\n") || "See the certificates section for Rohan's credentials."}`;
        }

        // Services
        if (q.includes("service") || q.includes("offer") || q.includes("hire")) {
            const data = portfolioData;
            if (!data) return "Unable to load services data.";

            let resp = "**Rohan's Services:**\n\n";
            data.services.forEach((s) => {
                resp += `- **${s.title}** — ${s.description}\n`;
            });
            resp += "\nInterested in working with Rohan? I can also help you get in touch.";
            return resp;
        }

        // Contact
        if (q.includes("contact") || q.includes("email") || q.includes("reach") || q.includes("connect")) {
            const data = portfolioData;
            if (!data) return "Unable to load contact data.";

            return `**You can connect with Rohan here:**\n\n` +
                `- **LinkedIn:** [rohan-pedada](${data.contact.linkedin})\n` +
                `- **GitHub:** [pedadarohan-dot](${data.contact.github})\n\n` +
                `You can also use the contact form on this page, or ask me to help draft a message.`;
        }

        // Thank you
        if (q.includes("thank") || q.includes("thanks") || q.includes("appreciate")) {
            return "You're welcome. Let me know if there's anything else I can help with.";
        }

        // Default
        return "I can help you learn about **Rohan's skills, projects, education, services**, or help you **get in touch**. What would you like to know?";
    }

    // Read-only portfolio lookup exposed for smoke checks and future integrations.
    window.__portfolioAgent = Object.freeze({
        answer: (query) => answerFromPortfolio(query),
        search: (query) => getPortfolioData(query),
        load: () => loadPortfolioData(),
        send: () => handleSend(),
    });

    /* =============================================
       CHAT UI CONTROLLER
       ============================================= */
    let chatOpen = false;
    let isLoading = false;

    function getElements() {
        return {
            toggle: document.getElementById("agent-chat-toggle"),
            window: document.getElementById("agent-chat-window"),
            messages: document.getElementById("agent-chat-messages"),
            input: document.getElementById("agent-chat-input"),
            sendBtn: document.getElementById("agent-chat-send"),
            closeBtn: document.getElementById("agent-chat-close"),
        };
    }

    function toggleChat() {
        chatOpen = !chatOpen;
        const el = getElements();
        if (chatOpen) {
            el.window.classList.add("open");
            el.toggle.classList.add("active");
            el.input.focus();
        } else {
            el.window.classList.remove("open");
            el.toggle.classList.remove("active");
        }
    }

    function addMessage(content, type = "bot") {
        const el = getElements();
        const msgDiv = document.createElement("div");
        msgDiv.className = `agent-chat-msg ${type}`;
        msgDiv.innerHTML = formatMessage(content);
        el.messages.appendChild(msgDiv);
        scrollToBottom();
    }

    function addEmailPreview(subject, body) {
        const el = getElements();
        const previewDiv = document.createElement("div");
        previewDiv.className = "agent-chat-msg bot";
        previewDiv.innerHTML = `
            <div class="agent-email-preview">
                <div class="email-subject">Subject: ${escapeHtml(subject)}</div>
                <div class="email-body">${escapeHtml(body)}</div>
                <div class="email-actions">
                    <button class="send-btn" onclick="window.__agentConfirmEmail(true)">Send</button>
                    <button class="cancel-btn" onclick="window.__agentConfirmEmail(false)">Cancel</button>
                </div>
            </div>
        `;
        el.messages.appendChild(previewDiv);
        scrollToBottom();
    }

    function hideEmailPreview() {
        const actions = document.querySelector(".agent-email-preview .email-actions");
        if (actions) actions.remove();
    }

    function showTyping() {
        const el = getElements();
        const typingDiv = document.createElement("div");
        typingDiv.className = "agent-typing";
        typingDiv.id = "agent-typing-indicator";
        typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        el.messages.appendChild(typingDiv);
        scrollToBottom();
    }

    function hideTyping() {
        const indicator = document.getElementById("agent-typing-indicator");
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        const el = getElements();
        requestAnimationFrame(() => {
            el.messages.scrollTop = el.messages.scrollHeight;
        });
    }

    function formatMessage(text) {
        // Convert markdown-style formatting to HTML
        let html = escapeHtml(text);
        // Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        // Links: [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        // Line breaks
        html = html.replace(/\n/g, "<br>");
        // Bullet points
        html = html.replace(/^- (.+)/gm, "&bull; $1");
        return html;
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    async function handleSend() {
        const el = getElements();
        const message = el.input.value.trim();
        if (!message || isLoading) return;

        // A user may open chat before the JSON request finishes, or retry after a transient failure.
        if (!portfolioData) await loadPortfolioData();

        // Add user message
        addMessage(message, "user");
        el.input.value = "";
        el.input.style.height = "auto";
        isLoading = true;
        el.sendBtn.disabled = true;

        showTyping();

        // An unfinished contact request should not trap the chat. If the visitor
        // asks a portfolio question instead of supplying contact details, drop
        // the draft state and answer that new question normally.
        const isContactContinuation = (text) => {
            if (/\b(cancel|never mind|nevermind)\b/i.test(text)) return true;
            if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return true;
            if (/\b(my name is|i am|i'm)\s+[^,.;\n]+/i.test(text)) return true;
            if (Memory.pendingSender?.email && !Memory.pendingEmail) return true;
            return /\b(send|write|draft|email|contact|message)\b/i.test(text) &&
                /\b(rohan|him|email|message|contact)\b/i.test(text);
        };
        if (Memory.pendingSender && isContactContinuation(message)) {
            if (/\b(cancel|never mind|nevermind)\b/i.test(message)) {
                Memory.clearPendingEmail();
                hideTyping();
                addMessage("Email cancelled. Is there anything else I can help with?", "bot");
            } else if (!Memory.pendingSender.email || !Memory.pendingSender.name) {
                const email = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
                const nameMatch = message.match(/(?:my name is|i am|i'm)\s+([^,.;\n]+)/i);
                const nameText = nameMatch?.[1] || (email ? message.replace(email, "").replace(/[,;:]/g, " ").trim() : "");
                if (email && nameText) {
                    Memory.pendingSender = { name: nameText.trim(), email, needsMessage: true };
                    hideTyping();
                    addMessage("Thanks. What would you like the message to say?", "bot");
                } else {
                    hideTyping();
                    addMessage("Please share your name and email address, for example: Jane Smith, jane@example.com. You can cancel anytime.", "bot");
                }
            } else if (!Memory.pendingEmail) {
                Memory.pendingEmail = {
                    subject: "Message from your portfolio",
                    body: `${message}\n\nFrom: ${Memory.pendingSender.name}`,
                };
                hideTyping();
                addEmailPreview(Memory.pendingEmail.subject, Memory.pendingEmail.body);
                addMessage("Please review the draft and confirm if you want it sent.", "bot");
            } else {
                hideTyping();
                addMessage("Please use the Send or Cancel button on the draft above.", "bot");
            }
            isLoading = false;
            el.sendBtn.disabled = false;
            return;
        }

        if (Memory.pendingSender) Memory.clearPendingEmail();

        if (/\b(send|write|draft|email|contact)\b/i.test(message) && /\b(rohan|him|email|message|contact)\b/i.test(message)) {
            Memory.pendingSender = { name: "", email: "" };
            hideTyping();
            addMessage("I can prepare that. First, please share your name and email address; then tell me the message you'd like Rohan to receive.", "bot");
            isLoading = false;
            el.sendBtn.disabled = false;
            return;
        }

        const groundedAnswer = answerFromPortfolio(message);
        const context = getPortfolioData(message);

        // Check if this is an email confirmation
        const pendingEmail = Memory.getPendingEmail();
        if (pendingEmail) {
            const lowerMsg = message.toLowerCase();
            if (lowerMsg.includes("yes") || lowerMsg.includes("send") || lowerMsg.includes("confirm") || lowerMsg.includes("go ahead")) {
                hideTyping();
                if (!Memory.pendingSender?.email) {
                    hideTyping();
                    addMessage("Please provide your name and email address before sending this message.", "bot error");
                    isLoading = false;
                    el.sendBtn.disabled = false;
                    return;
                }
                const result = await sendEmail(pendingEmail.subject, pendingEmail.body, Memory.pendingSender);
                Memory.clearPendingEmail();
                if (result.success) {
                    addMessage("**Email sent successfully.** Rohan will get back to you soon.", "bot");
                } else {
                    addMessage(`Email could not be sent: ${result.error || "Please try the contact form instead."}`, "bot error");
                }
            } else {
                hideTyping();
                Memory.clearPendingEmail();
                addMessage("Email cancelled. Is there anything else I can help with?", "bot");
            }
            isLoading = false;
            el.sendBtn.disabled = false;
            return;
        }

        // Try Gemini call if API key is configured
        if (CONFIG.apiKey && !CONFIG.apiKey.startsWith("YOUR_")) {
            const result = await callLLM(message, context);
            hideTyping();

            if (result.error) {
                addMessage(groundedAnswer, "bot");
                Memory.addMessage("assistant", groundedAnswer);
            } else if (result.message) {
                addMessage(result.message, "bot");
                if (result.emailDraft) {
                    if (Memory.pendingSender?.email) {
                        addEmailPreview(result.emailDraft.subject, result.emailDraft.body);
                    } else {
                        addMessage("To prepare an email, please share your name and email address, followed by the message you'd like Rohan to receive.", "bot");
                        Memory.pendingSender = { name: "", email: "" };
                    }
                }
            }
        } else {
            // Fallback to local pattern matching
            await new Promise((r) => setTimeout(r, 600 + Math.random() * 600)); // simulated delay
            hideTyping();
            const response = groundedAnswer || localFallback(message);
            addMessage(response, "bot");
            Memory.addMessage("user", message);
            Memory.addMessage("assistant", response);
        }

        isLoading = false;
        el.sendBtn.disabled = false;
        el.input.focus();
    }

    // Email confirmation handler
    window.__agentConfirmEmail = async function (confirmed) {
        const pendingEmail = Memory.getPendingEmail();
        if (!pendingEmail) return;

        if (confirmed) {
            if (!Memory.pendingSender?.email) {
                addMessage("Please provide your name and email address before sending this message.", "bot error");
                return;
            }
            const preview = document.querySelector(".agent-email-preview");
            const bodyNode = preview?.querySelector(".email-body");
            if (bodyNode) pendingEmail.body = bodyNode.textContent;
            const result = await sendEmail(pendingEmail.subject, pendingEmail.body, Memory.pendingSender);
            Memory.clearPendingEmail();
            if (result.success) {
                addMessage("**Email sent successfully.** Rohan will get back to you soon.", "bot");
            } else {
                addMessage(`Email could not be sent: ${result.error || "Please try the contact form instead."}`, "bot error");
            }
        } else {
            Memory.clearPendingEmail();
            addMessage("Email cancelled. Is there anything else I can help with?", "bot");
        }
    };

    /* =============================================
       INITIALIZATION
       ============================================= */
    async function init() {
        // Load data in the background so a slow/missing JSON file never blocks
        // the chat controls. The embedded snapshot is available synchronously.
        loadPortfolioData();

        const el = getElements();

        // Toggle chat window
        el.toggle.addEventListener("click", toggleChat);
        el.closeBtn.addEventListener("click", toggleChat);

        // Send message
        el.sendBtn.addEventListener("click", handleSend);

        // Enter to send (Shift+Enter for new line)
        el.input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Auto-resize textarea
        el.input.addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 100) + "px";
        });

        // Quick action buttons
        document.querySelectorAll(".agent-quick-action").forEach((btn) => {
            btn.addEventListener("click", function () {
                el.input.value = this.dataset.query;
                handleSend();
            });
        });

        // Welcome message
        addMessage(
            "**Hey!** I'm Rohan's AI assistant - I can tell you about his skills, projects, education, services, or help you get in touch.\n\nWhat would you like to know?",
            "bot"
        );
    }

    // Start when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
