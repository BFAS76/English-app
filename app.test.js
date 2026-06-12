import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    normalizeText,
    checkMatch,
    pickNextPhrase,
    library,
    state,
    resetState,
    saveProgress,
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
        // "nice to meet you really" NÃO está contida em "nice to meet you"
        expect(checkMatch('nice to meet you really', 'nice to meet you')).toBe(false);
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
        const single = [{ cat: "Test", en: "Hello", pt: "Olá" }];
        expect(pickNextPhrase(single, null)).toEqual(single[0]);
    });

    it('funciona na primeira chamada quando currentEn é undefined', () => {
        const phrase = pickNextPhrase(library, undefined);
        expect(phrase).toBeDefined();
        expect(phrase.en).toBeDefined();
    });

    it('devolve a única frase mesmo que seja a atual (biblioteca de 1 item)', () => {
        const single = [{ cat: "Test", en: "Hello", pt: "Olá" }];
        expect(pickNextPhrase(single, "Hello")).toEqual(single[0]);
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

    it('usa idioma en-US e velocidade 0.8', () => {
        state.current = library[0];
        const utterance = { lang: '', rate: 0 };
        vi.mocked(SpeechSynthesisUtterance).mockReturnValueOnce(utterance);
        playVoice();
        expect(utterance.lang).toBe('en-US');
        expect(utterance.rate).toBe(0.8);
    });
});

// ---------------------------------------------------------------------------
// handleRecognitionResult
// ---------------------------------------------------------------------------
describe('handleRecognitionResult', () => {
    beforeEach(() => {
        state.current = { cat: "Greetings", en: "Nice to meet you", pt: "Prazer em conhecê-lo" };
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('devolve true e atribui +10 XP numa resposta correta', () => {
        const result = handleRecognitionResult('Nice to meet you');
        expect(result).toBe(true);
        expect(state.score).toBe(10);
    });

    it('atualiza o DOM com o novo score', () => {
        handleRecognitionResult('Nice to meet you');
        expect(document.getElementById('points').innerText).toBe('10');
    });

    it('acumula pontos em respostas corretas consecutivas', () => {
        handleRecognitionResult('Nice to meet you');
        state.current = { cat: "Greetings", en: "How is it going?", pt: "Como estão as coisas?" };
        handleRecognitionResult('How is it going');
        expect(state.score).toBe(20);
    });

    it('devolve false e não altera score numa resposta errada', () => {
        const result = handleRecognitionResult('goodbye everyone');
        expect(result).toBe(false);
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

    it('define o idioma como en-US', () => {
        const mockRecognition = { lang: '', start: vi.fn(), onstart: null, onresult: null, onend: null };
        vi.stubGlobal('SpeechRecognition', vi.fn().mockReturnValue(mockRecognition));
        startRecognition();
        expect(mockRecognition.lang).toBe('en-US');
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
});

describe('integração save/load', () => {
    it('score mantém-se após simular fechar e reabrir a app', () => {
        state.current = { cat: "Greetings", en: "Nice to meet you", pt: "Prazer em conhecê-lo" };
        vi.useFakeTimers();
        handleRecognitionResult('Nice to meet you');
        vi.useRealTimers();

        // simula "fechar a app": reset do state em memória
        resetState();
        expect(state.score).toBe(0);

        // simula "reabrir a app": carrega do localStorage
        loadProgress();
        expect(state.score).toBe(10);
    });
});
