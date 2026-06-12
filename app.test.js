import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./firebase.js', () => ({
    cloudSave: vi.fn().mockResolvedValue(undefined),
    cloudLoad: vi.fn().mockResolvedValue(null),
    initFirebase: vi.fn(),
    isReady: vi.fn().mockReturnValue(false),
    getCurrentUser: vi.fn().mockReturnValue(null),
    onAuthChange: vi.fn(),
    signIn: vi.fn(),
    signOutUser: vi.fn(),
}));

import { cloudSave, cloudLoad } from './firebase.js';

import {
    normalizeText,
    checkMatch,
    pickNextPhrase,
    getLangCode,
    updateLanguageUI,
    updateLevelUI,
    switchLanguage,
    switchLevel,
    library,
    LANGUAGES,
    LEVELS,
    state,
    resetState,
    saveProgress,
    loadFromCloud,
    loadProgress,
    initAudio,
    playVoice,
    nextPhrase,
    handleRecognitionResult,
    startRecognition,
} from './app.js';

const DOM_TEMPLATE = `
    <div id="points">0</div>
    <div id="cat-display"></div>
    <div id="phrase-display"></div>
    <div id="translation-display"></div>
    <button class="btn-listen"></button>
    <button id="mic-btn"></button>
    <button class="btn-next"></button>
    <div id="status"></div>
    <button class="btn-lang active" data-lang="en"></button>
    <button class="btn-lang" data-lang="de"></button>
    <button class="btn-level active" data-level="A1"></button>
    <button class="btn-level" data-level="A2"></button>
    <button class="btn-level" data-level="B1"></button>
`;

beforeEach(() => {
    document.body.innerHTML = DOM_TEMPLATE;
    localStorage.clear();
    vi.stubGlobal('SpeechSynthesisUtterance', vi.fn().mockImplementation((text) => ({ text })));
    vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn() });
    resetState();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------
describe('normalizeText', () => {
    it('converte para minúsculas', () => {
        expect(normalizeText('Nice To Meet You')).toBe('nice to meet you');
    });

    it('remove pontuação ?.!,', () => {
        expect(normalizeText('Hello, world! How are you?')).toBe('hello world how are you');
    });

    it('remove espaços no início e no fim', () => {
        expect(normalizeText('  hello  ')).toBe('hello');
    });

    it('trata string vazia sem erros', () => {
        expect(normalizeText('')).toBe('');
    });
});

// ---------------------------------------------------------------------------
// checkMatch
// ---------------------------------------------------------------------------
describe('checkMatch', () => {
    it('aceita correspondência exata (case-insensitive)', () => {
        expect(checkMatch('Nice to meet you', 'Nice to meet you')).toBe(true);
    });

    it('aceita frase parcial com mais de 3 caracteres', () => {
        expect(checkMatch('nice to meet', 'Nice to meet you')).toBe(true);
    });

    it('rejeita frase parcial com 3 ou menos caracteres', () => {
        expect(checkMatch('hi', 'hi there friend')).toBe(false);
    });

    it('rejeita resposta completamente errada', () => {
        expect(checkMatch('goodbye everyone', 'nice to meet you')).toBe(false);
    });

    it('ignora pontuação na comparação', () => {
        expect(checkMatch('How is it going?', 'How is it going?')).toBe(true);
    });

    it('rejeita string vazia', () => {
        expect(checkMatch('', 'nice to meet you')).toBe(false);
    });

    it('rejeita quando o dito contém a frase alvo mas não o contrário', () => {
        expect(checkMatch('nice to meet you really', 'nice to meet you')).toBe(false);
    });

    it('funciona com frases em alemão', () => {
        expect(checkMatch('Guten Morgen', 'Guten Morgen')).toBe(true);
        expect(checkMatch('guten morgen', 'Guten Morgen')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// pickNextPhrase
// ---------------------------------------------------------------------------
describe('pickNextPhrase', () => {
    it('devolve uma frase da biblioteca', () => {
        const phrase = pickNextPhrase(library, null);
        expect(library).toContain(phrase);
    });

    it('nunca devolve a mesma frase que a atual', () => {
        const current = library[0].en;
        for (let i = 0; i < 30; i++) {
            expect(pickNextPhrase(library, current).en).not.toBe(current);
        }
    });

    it('devolve null para biblioteca vazia', () => {
        expect(pickNextPhrase([], null)).toBeNull();
    });

    it('devolve o único item quando biblioteca tem 1 frase', () => {
        const single = [{ level: "A1", cat: "Test", en: "Hello", de: "Hallo", pt: "Olá" }];
        expect(pickNextPhrase(single, null)).toEqual(single[0]);
    });

    it('funciona na primeira chamada quando currentEn é undefined', () => {
        const phrase = pickNextPhrase(library, undefined);
        expect(phrase).toBeDefined();
        expect(phrase.en).toBeDefined();
    });

    it('devolve a única frase mesmo que seja a atual (biblioteca de 1 item)', () => {
        const single = [{ level: "A1", cat: "Test", en: "Hello", de: "Hallo", pt: "Olá" }];
        expect(pickNextPhrase(single, "Hello")).toEqual(single[0]);
    });

    it('filtra frases pelo nível especificado', () => {
        for (let i = 0; i < 20; i++) {
            expect(pickNextPhrase(library, null, 'B1').level).toBe('B1');
        }
    });

    it('devolve null quando nenhuma frase corresponde ao nível', () => {
        expect(pickNextPhrase(library, null, 'C2')).toBeNull();
    });

    it('sem filtro de nível devolve frases de qualquer nível', () => {
        const levels = new Set();
        for (let i = 0; i < 50; i++) {
            levels.add(pickNextPhrase(library, null).level);
        }
        expect(levels.size).toBeGreaterThan(1);
    });
});

// ---------------------------------------------------------------------------
// getLangCode
// ---------------------------------------------------------------------------
describe('getLangCode', () => {
    it('devolve en-US para inglês', () => {
        state.language = 'en';
        expect(getLangCode()).toBe('en-US');
    });

    it('devolve de-DE para alemão', () => {
        state.language = 'de';
        expect(getLangCode()).toBe('de-DE');
    });
});

// ---------------------------------------------------------------------------
// switchLanguage
// ---------------------------------------------------------------------------
describe('switchLanguage', () => {
    beforeEach(() => {
        state.current = library.find(p => p.en === 'Good morning');
    });

    it('muda o state.language', () => {
        switchLanguage('de');
        expect(state.language).toBe('de');
    });

    it('atualiza o DOM com a frase na nova língua', () => {
        switchLanguage('de');
        expect(document.getElementById('phrase-display').innerText).toBe('Guten Morgen');
    });

    it('volta para inglês corretamente', () => {
        switchLanguage('de');
        switchLanguage('en');
        expect(document.getElementById('phrase-display').innerText).toBe('Good morning');
    });

    it('marca o botão correto como active', () => {
        switchLanguage('de');
        expect(document.querySelector('[data-lang="de"]').classList.contains('active')).toBe(true);
        expect(document.querySelector('[data-lang="en"]').classList.contains('active')).toBe(false);
    });

    it('ignora língua inválida', () => {
        switchLanguage('fr');
        expect(state.language).toBe('en');
    });

    it('guarda a preferência no localStorage', () => {
        switchLanguage('de');
        expect(localStorage.getItem('englishAppLanguage')).toBe('de');
    });
});

// ---------------------------------------------------------------------------
// switchLevel
// ---------------------------------------------------------------------------
describe('switchLevel', () => {
    it('muda o state.level', () => {
        switchLevel('A2');
        expect(state.level).toBe('A2');
    });

    it('carrega uma nova frase do nível selecionado', () => {
        switchLevel('B1');
        expect(state.current.level).toBe('B1');
    });

    it('marca o botão correto como active', () => {
        switchLevel('A2');
        expect(document.querySelector('[data-level="A2"]').classList.contains('active')).toBe(true);
        expect(document.querySelector('[data-level="A1"]').classList.contains('active')).toBe(false);
    });

    it('ignora nível inválido', () => {
        switchLevel('C1');
        expect(state.level).toBe('A1');
    });

    it('guarda a preferência no localStorage', () => {
        switchLevel('B1');
        expect(localStorage.getItem('englishAppLevel')).toBe('B1');
    });
});

// ---------------------------------------------------------------------------
// initAudio
// ---------------------------------------------------------------------------
describe('initAudio', () => {
    it('chama speechSynthesis.speak na primeira chamada', () => {
        initAudio();
        expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('é idempotente — segunda chamada não faz nada', () => {
        initAudio();
        initAudio();
        expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('marca audioInitialized como true', () => {
        initAudio();
        expect(state.audioInitialized).toBe(true);
    });

    it('chama nextPhrase na primeira vez quando não há frase atual', () => {
        initAudio();
        expect(state.current.en).toBeDefined();
    });

    it('não chama nextPhrase se já existir uma frase atual', () => {
        state.current = library[0];
        state.audioInitialized = false;
        initAudio();
        expect(state.current).toEqual(library[0]);
    });
});

// ---------------------------------------------------------------------------
// playVoice
// ---------------------------------------------------------------------------
describe('playVoice', () => {
    it('não faz nada se não houver frase atual', () => {
        playVoice();
        expect(window.speechSynthesis.cancel).not.toHaveBeenCalled();
        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('cancela síntese anterior e fala a frase atual', () => {
        state.current = library[0];
        playVoice();
        expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
        expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('usa idioma en-US e velocidade 0.8 para inglês', () => {
        state.current = library[0];
        const utterance = { lang: '', rate: 0 };
        vi.mocked(SpeechSynthesisUtterance).mockReturnValueOnce(utterance);
        playVoice();
        expect(utterance.lang).toBe('en-US');
        expect(utterance.rate).toBe(0.8);
    });

    it('usa idioma de-DE para alemão', () => {
        state.current = library[0];
        state.language = 'de';
        const utterance = { lang: '', rate: 0 };
        vi.mocked(SpeechSynthesisUtterance).mockReturnValueOnce(utterance);
        playVoice();
        expect(utterance.lang).toBe('de-DE');
    });

    it('fala a frase alemã quando idioma é DE', () => {
        state.current = library.find(p => p.en === 'Good morning');
        state.language = 'de';
        playVoice();
        expect(vi.mocked(SpeechSynthesisUtterance)).toHaveBeenCalledWith('Guten Morgen');
    });
});

// ---------------------------------------------------------------------------
// handleRecognitionResult
// ---------------------------------------------------------------------------
describe('handleRecognitionResult', () => {
    beforeEach(() => {
        state.current = library.find(p => p.en === 'Nice to meet you');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('devolve true e atribui +10 XP numa resposta correta (EN)', () => {
        expect(handleRecognitionResult('Nice to meet you')).toBe(true);
        expect(state.score).toBe(10);
    });

    it('atualiza o DOM com o novo score', () => {
        handleRecognitionResult('Nice to meet you');
        expect(document.getElementById('points').innerText).toBe('10');
    });

    it('acumula pontos em respostas corretas consecutivas', () => {
        handleRecognitionResult('Nice to meet you');
        state.current = library.find(p => p.en === 'How is it going?');
        handleRecognitionResult('How is it going');
        expect(state.score).toBe(20);
    });

    it('devolve false e não altera score numa resposta errada', () => {
        expect(handleRecognitionResult('goodbye everyone')).toBe(false);
        expect(state.score).toBe(0);
    });

    it('mostra mensagem de erro com o que foi dito', () => {
        handleRecognitionResult('something wrong');
        expect(document.getElementById('status').innerText).toContain('something wrong');
    });

    it('agenda nextPhrase após 2000ms numa resposta correta', () => {
        handleRecognitionResult('Nice to meet you');
        const previousPhrase = state.current.en;
        vi.advanceTimersByTime(2000);
        expect(state.current.en).not.toBe(previousPhrase);
    });

    it('não agenda nextPhrase numa resposta errada', () => {
        handleRecognitionResult('something wrong');
        const previousPhrase = state.current.en;
        vi.advanceTimersByTime(2000);
        expect(state.current.en).toBe(previousPhrase);
    });

    it('avalia frase alemã corretamente quando idioma é DE', () => {
        state.current = library.find(p => p.en === 'Good morning');
        state.language = 'de';
        expect(handleRecognitionResult('Guten Morgen')).toBe(true);
    });

    it('rejeita frase inglesa quando idioma esperado é DE', () => {
        state.current = library.find(p => p.en === 'Good morning');
        state.language = 'de';
        expect(handleRecognitionResult('Good morning')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// startRecognition
// ---------------------------------------------------------------------------
describe('startRecognition', () => {
    it('mostra alerta se SpeechRecognition não estiver disponível', () => {
        vi.stubGlobal('alert', vi.fn());
        vi.stubGlobal('SpeechRecognition', undefined);
        vi.stubGlobal('webkitSpeechRecognition', undefined);
        startRecognition();
        expect(window.alert).toHaveBeenCalledWith("Browser error");
    });

    it('usa webkitSpeechRecognition como fallback', () => {
        const mockStart = vi.fn();
        const MockRecognition = vi.fn().mockReturnValue({
            lang: '', start: mockStart, onstart: null, onresult: null, onend: null,
        });
        vi.stubGlobal('SpeechRecognition', undefined);
        vi.stubGlobal('webkitSpeechRecognition', MockRecognition);
        startRecognition();
        expect(MockRecognition).toHaveBeenCalled();
        expect(mockStart).toHaveBeenCalled();
    });

    it('define o idioma como en-US quando língua é EN', () => {
        const mockRecognition = { lang: '', start: vi.fn(), onstart: null, onresult: null, onend: null };
        vi.stubGlobal('SpeechRecognition', vi.fn().mockReturnValue(mockRecognition));
        startRecognition();
        expect(mockRecognition.lang).toBe('en-US');
    });

    it('define o idioma como de-DE quando língua é DE', () => {
        state.language = 'de';
        const mockRecognition = { lang: '', start: vi.fn(), onstart: null, onresult: null, onend: null };
        vi.stubGlobal('SpeechRecognition', vi.fn().mockReturnValue(mockRecognition));
        startRecognition();
        expect(mockRecognition.lang).toBe('de-DE');
    });

    it('onstart atualiza o status para "Listening..."', () => {
        const mockRecognition = { lang: '', start: vi.fn(), onstart: null, onresult: null, onend: null };
        vi.stubGlobal('SpeechRecognition', vi.fn().mockReturnValue(mockRecognition));
        startRecognition();
        mockRecognition.onstart();
        expect(document.getElementById('status').innerText).toBe('Listening...');
    });

    it('onend restaura o filtro do botão do microfone', () => {
        const mockRecognition = { lang: '', start: vi.fn(), onstart: null, onresult: null, onend: null };
        vi.stubGlobal('SpeechRecognition', vi.fn().mockReturnValue(mockRecognition));
        document.getElementById('mic-btn').style.filter = 'brightness(1.5)';
        startRecognition();
        mockRecognition.onend();
        expect(document.getElementById('mic-btn').style.filter).toBe('none');
    });
});

// ---------------------------------------------------------------------------
// saveProgress / loadProgress
// ---------------------------------------------------------------------------
describe('saveProgress', () => {
    it('guarda o score atual no localStorage', () => {
        state.score = 50;
        saveProgress();
        expect(localStorage.getItem('englishAppScore')).toBe('50');
    });

    it('guarda zero quando o score é 0', () => {
        saveProgress();
        expect(localStorage.getItem('englishAppScore')).toBe('0');
    });

    it('sobrescreve valor anterior com o novo score', () => {
        state.score = 30;
        saveProgress();
        state.score = 80;
        saveProgress();
        expect(localStorage.getItem('englishAppScore')).toBe('80');
    });

    it('guarda a língua atual', () => {
        state.language = 'de';
        saveProgress();
        expect(localStorage.getItem('englishAppLanguage')).toBe('de');
    });

    it('guarda o nível atual', () => {
        state.level = 'B1';
        saveProgress();
        expect(localStorage.getItem('englishAppLevel')).toBe('B1');
    });
});

describe('loadProgress', () => {
    it('restaura o score do localStorage para o state', () => {
        localStorage.setItem('englishAppScore', '70');
        loadProgress();
        expect(state.score).toBe(70);
    });

    it('atualiza o DOM com o score carregado', () => {
        localStorage.setItem('englishAppScore', '40');
        loadProgress();
        expect(document.getElementById('points').innerText).toBe('40');
    });

    it('não altera o score se não houver nada guardado', () => {
        loadProgress();
        expect(state.score).toBe(0);
    });

    it('trata valor corrompido no localStorage — usa 0', () => {
        localStorage.setItem('englishAppScore', 'abc');
        loadProgress();
        expect(state.score).toBe(0);
    });

    it('restaura a língua do localStorage', () => {
        localStorage.setItem('englishAppLanguage', 'de');
        loadProgress();
        expect(state.language).toBe('de');
    });

    it('restaura o nível do localStorage', () => {
        localStorage.setItem('englishAppLevel', 'B1');
        loadProgress();
        expect(state.level).toBe('B1');
    });

    it('ignora língua inválida no localStorage', () => {
        localStorage.setItem('englishAppLanguage', 'fr');
        loadProgress();
        expect(state.language).toBe('en');
    });

    it('ignora nível inválido no localStorage', () => {
        localStorage.setItem('englishAppLevel', 'C2');
        loadProgress();
        expect(state.level).toBe('A1');
    });
});

describe('integração save/load', () => {
    it('score, língua e nível mantêm-se após simular fechar e reabrir a app', () => {
        state.current = library.find(p => p.en === 'Nice to meet you');
        state.language = 'de';
        state.level = 'A2';
        vi.useFakeTimers();
        handleRecognitionResult('Schön, Sie kennenzulernen');
        vi.useRealTimers();

        resetState();
        expect(state.score).toBe(0);
        expect(state.language).toBe('en');
        expect(state.level).toBe('A1');

        loadProgress();
        expect(state.score).toBe(10);
        expect(state.language).toBe('de');
        expect(state.level).toBe('A2');
    });
});

// ---------------------------------------------------------------------------
// saveProgress — Firebase
// ---------------------------------------------------------------------------
describe('saveProgress com Firebase', () => {
    beforeEach(() => {
        vi.mocked(cloudSave).mockClear();
    });

    it('chama cloudSave com score, língua e nível corretos', () => {
        state.score = 30;
        state.language = 'de';
        state.level = 'B1';
        saveProgress();
        expect(cloudSave).toHaveBeenCalledWith({ score: 30, language: 'de', level: 'B1' });
    });

    it('chama cloudSave mesmo com score zero', () => {
        saveProgress();
        expect(cloudSave).toHaveBeenCalledWith({ score: 0, language: 'en', level: 'A1' });
    });

    it('chama cloudSave sempre que o score muda', () => {
        state.current = library.find(p => p.en === 'Nice to meet you');
        vi.useFakeTimers();
        handleRecognitionResult('Nice to meet you');
        vi.useRealTimers();
        expect(cloudSave).toHaveBeenCalledWith(expect.objectContaining({ score: 10 }));
    });
});

// ---------------------------------------------------------------------------
// loadFromCloud
// ---------------------------------------------------------------------------
describe('loadFromCloud', () => {
    beforeEach(() => {
        vi.mocked(cloudLoad).mockClear();
    });

    it('atualiza o score se Firebase tem valor maior', async () => {
        state.score = 10;
        vi.mocked(cloudLoad).mockResolvedValueOnce({ score: 50, language: 'en', level: 'A1' });
        await loadFromCloud();
        expect(state.score).toBe(50);
        expect(document.getElementById('points').innerText).toBe('50');
    });

    it('não altera o score se Firebase tem valor menor', async () => {
        state.score = 80;
        vi.mocked(cloudLoad).mockResolvedValueOnce({ score: 30, language: 'en', level: 'A1' });
        await loadFromCloud();
        expect(state.score).toBe(80);
    });

    it('não faz nada se Firebase devolver null', async () => {
        state.score = 20;
        vi.mocked(cloudLoad).mockResolvedValueOnce(null);
        await loadFromCloud();
        expect(state.score).toBe(20);
    });

    it('restaura língua e nível do Firebase', async () => {
        vi.mocked(cloudLoad).mockResolvedValueOnce({ score: 0, language: 'de', level: 'B1' });
        await loadFromCloud();
        expect(state.language).toBe('de');
        expect(state.level).toBe('B1');
    });

    it('ignora língua inválida vinda do Firebase', async () => {
        vi.mocked(cloudLoad).mockResolvedValueOnce({ score: 0, language: 'fr', level: 'A1' });
        await loadFromCloud();
        expect(state.language).toBe('en');
    });

    it('sincroniza score para o localStorage após carregar do Firebase', async () => {
        state.score = 0;
        vi.mocked(cloudLoad).mockResolvedValueOnce({ score: 60, language: 'en', level: 'A1' });
        await loadFromCloud();
        expect(localStorage.getItem('englishAppScore')).toBe('60');
    });
});
