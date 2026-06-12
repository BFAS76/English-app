export const library = [
    { cat: "Greetings", en: "Nice to meet you", pt: "Prazer em conhecê-lo" },
    { cat: "Greetings", en: "How is it going?", pt: "Como estão as coisas?" },
    { cat: "Greetings", en: "Have a wonderful day", pt: "Tenha um dia maravilhoso" },
    { cat: "Travel", en: "Where can I find a taxi?", pt: "Onde posso encontrar um táxi?" },
    { cat: "Travel", en: "I am lost, can you help me?", pt: "Estou perdido, pode ajudar-me?" },
    { cat: "Travel", en: "A table for two, please", pt: "Uma mesa para dois, por favor" },
    { cat: "Daily", en: "I need to check my emails", pt: "Preciso de ver os meus e-mails" },
    { cat: "Daily", en: "What do you do for a living?", pt: "O que fazes da vida/profissionalmente?" },
    { cat: "Daily", en: "Let's grab a coffee later", pt: "Vamos tomar um café mais tarde" },
    { cat: "Useful", en: "Could you speak slower, please?", pt: "Poderia falar mais devagar, por favor?" },
    { cat: "Useful", en: "I don't understand what you mean", pt: "Não entendo o que quer dizer" },
    { cat: "Useful", en: "How do you say this in English?", pt: "Como se diz isto em Inglês?" },
];

export const state = {
    current: {},
    score: 0,
    audioInitialized: false,
};

export function resetState() {
    state.current = {};
    state.score = 0;
    state.audioInitialized = false;
}

export function normalizeText(text) {
    return text.toLowerCase().replace(/[?.!,]/g, "").trim();
}

export function checkMatch(spoken, target) {
    const s = normalizeText(spoken);
    const t = normalizeText(target);
    return s === t || (t.includes(s) && s.length > 3);
}

export function pickNextPhrase(lib, currentEn) {
    if (lib.length === 0) return null;
    if (lib.length === 1) return lib[0];
    let phrase;
    do {
        phrase = lib[Math.floor(Math.random() * lib.length)];
    } while (phrase.en === currentEn);
    return phrase;
}

export function nextPhrase() {
    state.current = pickNextPhrase(library, state.current.en);
    document.getElementById('cat-display').innerText = state.current.cat;
    document.getElementById('phrase-display').innerText = state.current.en;
    document.getElementById('translation-display').innerText = state.current.pt;
    const status = document.getElementById('status');
    status.innerText = "Listen and Repeat!";
    status.style.color = "#94a3b8";
}

export function saveProgress() {
    localStorage.setItem('englishAppScore', String(state.score));
}

export function loadProgress() {
    const saved = localStorage.getItem('englishAppScore');
    if (saved === null) return;
    const parsed = parseInt(saved, 10);
    state.score = isNaN(parsed) ? 0 : parsed;
    document.getElementById('points').innerText = String(state.score);
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
    const msg = new SpeechSynthesisUtterance(state.current.en);
    msg.lang = 'en-US';
    msg.rate = 0.8;
    window.speechSynthesis.speak(msg);
}

export function handleRecognitionResult(transcript) {
    const spoken = normalizeText(transcript);
    const target = normalizeText(state.current.en);
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
    recognition.lang = 'en-US';

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
