// Funções de cloud injetadas pelo index.html após inicializar o Firebase
export const cloud = { save: null, load: null };

export const library = [
    // A1 — Iniciante
    { level: "A1", cat: "Greetings", en: "Good morning",               de: "Guten Morgen",                         pt: "Bom dia" },
    { level: "A1", cat: "Greetings", en: "Nice to meet you",            de: "Schön, Sie kennenzulernen",             pt: "Prazer em conhecê-lo" },
    { level: "A1", cat: "Greetings", en: "Thank you very much",         de: "Vielen Dank",                          pt: "Muito obrigado" },
    { level: "A1", cat: "Greetings", en: "Good night",                  de: "Gute Nacht",                           pt: "Boa noite" },
    { level: "A1", cat: "Useful",   en: "I don't understand",           de: "Ich verstehe nicht",                   pt: "Não entendo" },
    { level: "A1", cat: "Useful",   en: "Can you help me?",             de: "Können Sie mir helfen?",               pt: "Pode ajudar-me?" },
    { level: "A1", cat: "Useful",   en: "How much does it cost?",       de: "Wie viel kostet das?",                 pt: "Quanto custa?" },
    { level: "A1", cat: "Travel",   en: "Where is the bathroom?",       de: "Wo ist die Toilette?",                 pt: "Onde é a casa de banho?" },

    // A2 — Elementar
    { level: "A2", cat: "Greetings", en: "How is it going?",            de: "Wie läuft es?",                        pt: "Como estão as coisas?" },
    { level: "A2", cat: "Greetings", en: "Have a wonderful day",        de: "Haben Sie einen wunderschönen Tag",    pt: "Tenha um dia maravilhoso" },
    { level: "A2", cat: "Travel",   en: "Where can I find a taxi?",     de: "Wo finde ich ein Taxi?",               pt: "Onde posso encontrar um táxi?" },
    { level: "A2", cat: "Travel",   en: "I am lost, can you help me?",  de: "Ich habe mich verirrt, können Sie mir helfen?", pt: "Estou perdido, pode ajudar-me?" },
    { level: "A2", cat: "Travel",   en: "A table for two, please",      de: "Einen Tisch für zwei, bitte",          pt: "Uma mesa para dois, por favor" },
    { level: "A2", cat: "Useful",   en: "Could you speak slower, please?", de: "Könnten Sie bitte langsamer sprechen?", pt: "Poderia falar mais devagar, por favor?" },
    { level: "A2", cat: "Daily",    en: "What time does it open?",      de: "Wann öffnet es?",                      pt: "A que horas abre?" },
    { level: "A2", cat: "Daily",    en: "I would like a coffee, please", de: "Ich hätte gerne einen Kaffee, bitte", pt: "Queria um café, por favor" },

    // B1 — Intermédio
    { level: "B1", cat: "Daily",    en: "I need to check my emails",    de: "Ich muss meine E-Mails checken",       pt: "Preciso de ver os meus e-mails" },
    { level: "B1", cat: "Daily",    en: "What do you do for a living?", de: "Was machen Sie beruflich?",            pt: "O que fazes da vida?" },
    { level: "B1", cat: "Daily",    en: "Let's grab a coffee later",    de: "Lass uns später einen Kaffee trinken", pt: "Vamos tomar um café mais tarde" },
    { level: "B1", cat: "Useful",   en: "I don't understand what you mean", de: "Ich verstehe nicht, was Sie meinen", pt: "Não entendo o que quer dizer" },
    { level: "B1", cat: "Useful",   en: "How do you say this in English?", de: "Wie sagt man das auf Deutsch?",     pt: "Como se diz isto em Inglês?" },
    { level: "B1", cat: "Daily",    en: "I have been living here for two years", de: "Ich wohne hier seit zwei Jahren", pt: "Vivo aqui há dois anos" },
    { level: "B1", cat: "Travel",   en: "Could you recommend a good restaurant?", de: "Könnten Sie mir ein gutes Restaurant empfehlen?", pt: "Pode recomendar um bom restaurante?" },
    { level: "B1", cat: "Daily",    en: "I am interested in learning new languages", de: "Ich interessiere mich dafür, neue Sprachen zu lernen", pt: "Tenho interesse em aprender novas línguas" },
];

export const LANGUAGES = ['en', 'de'];
export const LEVELS = ['A1', 'A2', 'B1'];

export const state = {
    current: {},
    score: 0,
    audioInitialized: false,
    language: 'en',
    level: 'A1',
};

export function resetState() {
    state.current = {};
    state.score = 0;
    state.audioInitialized = false;
    state.language = 'en';
    state.level = 'A1';
}

export function getLangCode() {
    return state.language === 'de' ? 'de-DE' : 'en-US';
}

export function normalizeText(text) {
    return text.toLowerCase().replace(/[?.!,]/g, "").trim();
}

export function checkMatch(spoken, target) {
    const s = normalizeText(spoken);
    const t = normalizeText(target);
    return s === t || (t.includes(s) && s.length > 3);
}

export function pickNextPhrase(lib, currentEn, level = null) {
    const pool = level ? lib.filter(p => p.level === level) : lib;
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    let phrase;
    do {
        phrase = pool[Math.floor(Math.random() * pool.length)];
    } while (phrase.en === currentEn);
    return phrase;
}

export function updateLanguageUI() {
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === state.language);
    });
}

export function updateLevelUI() {
    document.querySelectorAll('[data-level]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === state.level);
    });
}

export function nextPhrase() {
    const phrase = pickNextPhrase(library, state.current.en, state.level);
    if (!phrase) return;
    state.current = phrase;
    document.getElementById('cat-display').innerText = `${state.current.cat} · ${state.current.level}`;
    document.getElementById('phrase-display').innerText = state.current[state.language];
    document.getElementById('translation-display').innerText = state.current.pt;
    const status = document.getElementById('status');
    status.innerText = "Listen and Repeat!";
    status.style.color = "#94a3b8";
}

export function switchLanguage(lang) {
    if (!LANGUAGES.includes(lang)) return;
    state.language = lang;
    if (state.current[lang]) {
        document.getElementById('phrase-display').innerText = state.current[lang];
    }
    updateLanguageUI();
    saveProgress();
}

export function switchLevel(level) {
    if (!LEVELS.includes(level)) return;
    state.level = level;
    updateLevelUI();
    saveProgress();
    nextPhrase();
}

export function saveProgress() {
    localStorage.setItem('englishAppScore', String(state.score));
    localStorage.setItem('englishAppLanguage', state.language);
    localStorage.setItem('englishAppLevel', state.level);
    cloud.save?.({ score: state.score, language: state.language, level: state.level });
}

export async function loadFromCloud() {
    const data = await cloud.load?.();
    if (!data) return;
    if (data.score > state.score) {
        state.score = data.score;
        document.getElementById('points').innerText = String(state.score);
        localStorage.setItem('englishAppScore', String(state.score));
    }
    if (data.language && LANGUAGES.includes(data.language)) {
        state.language = data.language;
        localStorage.setItem('englishAppLanguage', state.language);
    }
    if (data.level && LEVELS.includes(data.level)) {
        state.level = data.level;
        localStorage.setItem('englishAppLevel', state.level);
    }
    updateLanguageUI();
    updateLevelUI();
}

export function loadProgress() {
    const savedScore = localStorage.getItem('englishAppScore');
    if (savedScore !== null) {
        const parsed = parseInt(savedScore, 10);
        state.score = isNaN(parsed) ? 0 : parsed;
        document.getElementById('points').innerText = String(state.score);
    }

    const savedLang = localStorage.getItem('englishAppLanguage');
    if (savedLang && LANGUAGES.includes(savedLang)) state.language = savedLang;

    const savedLevel = localStorage.getItem('englishAppLevel');
    if (savedLevel && LEVELS.includes(savedLevel)) state.level = savedLevel;

    updateLanguageUI();
    updateLevelUI();
}

export function initAudio() {
    if (state.audioInitialized) return;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
    state.audioInitialized = true;
    loadProgress();
    if (!state.current.en) nextPhrase();
}

export function playVoice() {
    if (!state.current.en) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(state.current[state.language]);
    msg.lang = getLangCode();
    msg.rate = 0.8;
    window.speechSynthesis.speak(msg);
}

export function handleRecognitionResult(transcript) {
    const spoken = normalizeText(transcript);
    const target = normalizeText(state.current[state.language]);
    const status = document.getElementById('status');

    if (checkMatch(spoken, target)) {
        status.innerText = "✅ Excellent! +10 XP";
        status.style.color = "#4ade80";
        state.score += 10;
        document.getElementById('points').innerText = String(state.score);
        saveProgress();
        setTimeout(nextPhrase, 2000);
        return true;
    } else {
        status.innerText = `You said: "${spoken}"\nTry again!`;
        status.style.color = "#fb7185";
        return false;
    }
}

export function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Browser error");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = getLangCode();

    recognition.onstart = () => {
        document.getElementById('status').innerText = "Listening...";
        document.getElementById('mic-btn').style.filter = "brightness(1.5)";
    };

    recognition.onresult = (event) => {
        handleRecognitionResult(event.results[0][0].transcript);
    };

    recognition.onend = () => {
        document.getElementById('mic-btn').style.filter = "none";
    };

    recognition.start();
}
