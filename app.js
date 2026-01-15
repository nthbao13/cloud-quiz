// Configuration
// API key is loaded from config.js (which reads from .env)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const EXPLANATION_CACHE_KEY = 'quiz_explanations_cache';
const USER_API_KEY_STORAGE = 'user_gemini_api_key';

// Get user's API key (prioritize user's key over default)
function getUserApiKey() {
    const userKey = localStorage.getItem(USER_API_KEY_STORAGE);
    if (userKey && userKey.trim()) {
        return userKey.trim();
    }
    // Fallback to default key from config.js if available
    if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY) {
        return GEMINI_API_KEY;
    }
    return null;
}

// State
let quizData = [];
let currentQuiz = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let wrongQuestions = [];
let isRetryMode = false;
let preloadedExplanation = null; // Cache for preloaded explanation
let explanationCache = {}; // In-memory cache for explanations
let isRandomMode = false; // Random question order

// DOM Elements
const homeScreen = document.getElementById('homeScreen');
const quizScreen = document.getElementById('quizScreen');
const resultScreen = document.getElementById('resultScreen');
const quizList = document.getElementById('quizList');
const allQuizzesBtn = document.getElementById('allQuizzesBtn');
const backBtn = document.getElementById('backBtn');
const quizTitle = document.getElementById('quizTitle');
const currentQuestionEl = document.getElementById('currentQuestion');
const totalQuestionsEl = document.getElementById('totalQuestions');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const explanationCard = document.getElementById('explanationCard');
const explanationText = document.getElementById('explanationText');
const resultLabel = document.getElementById('resultLabel');
const correctCount = document.getElementById('correctCount');
const incorrectCount = document.getElementById('incorrectCount');
const scorePercentage = document.getElementById('scorePercentage');
const retryWrongBtn = document.getElementById('retryWrongBtn');
const homeBtn = document.getElementById('homeBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const apiKeyDialog = document.getElementById('apiKeyDialog');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const skipApiKeyBtn = document.getElementById('skipApiKeyBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize
async function init() {
    await loadQuizData();
    loadExplanationCache();
    renderQuizList();
    setupEventListeners();
    checkApiKey();
    initModeSelection();
}

// Initialize mode selection
function initModeSelection() {
    const singlePlayerSection = document.getElementById('singlePlayerSection');
    if (singlePlayerSection) {
        singlePlayerSection.style.display = 'block';
    }
    
    const singlePlayerBtn = document.getElementById('singlePlayerBtn');
    if (singlePlayerBtn) {
        singlePlayerBtn.classList.add('active');
    }
}

// Load quiz data from CSV
async function loadQuizData() {
    try {
        const response = await fetch('dataset/quizz_cloud.csv');
        const csvText = await response.text();
        quizData = parseCSV(csvText);
    } catch (error) {
        console.error('Error loading quiz data:', error);
        alert('Không thể tải dữ liệu quiz. Vui lòng kiểm tra lại file CSV.');
    }
}

// Load explanation cache from localStorage
function loadExplanationCache() {
    try {
        const cached = localStorage.getItem(EXPLANATION_CACHE_KEY);
        if (cached) {
            explanationCache = JSON.parse(cached);
            console.log('Loaded explanation cache:', Object.keys(explanationCache).length, 'entries');
        }
    } catch (error) {
        console.error('Error loading explanation cache:', error);
        explanationCache = {};
    }
}

// Save explanation cache to localStorage
function saveExplanationCache() {
    try {
        localStorage.setItem(EXPLANATION_CACHE_KEY, JSON.stringify(explanationCache));
    } catch (error) {
        console.error('Error saving explanation cache:', error);
    }
}

// Generate unique key for a question
function getQuestionKey(question) {
    // Use first 100 chars of question text as key
    return question.question.substring(0, 100).trim();
}

// Parse CSV to structured data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const quizzes = {};
    let currentQuizName = '';
    
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        if (!line || !line.trim()) continue;
        
        // Handle multi-line values - if line starts with quote but doesn't end with quote before comma
        // we need to continue reading
        while (line.split('"').length % 2 === 0 && i < lines.length - 1) {
            i++;
            line += '\n' + lines[i];
        }
        
        const parts = parseCSVLine(line);
        if (parts.length === 0) continue;
        
        const firstColumn = parts[0].trim();
        
        // Check if this is a quiz header
        if (firstColumn && firstColumn.startsWith('Quiz')) {
            currentQuizName = firstColumn;
            quizzes[currentQuizName] = [];
            continue;
        }
        
        // Parse question data (empty first column means it's a question row)
        if (currentQuizName && parts.length >= 3) {
            let questionText = parts[1].trim();
            let answerText = parts[2].trim();
            let explainText = parts[3] ? parts[3].trim() : '';
            
            // Clean up HTML artifacts
            questionText = cleanHTMLArtifacts(questionText);
            answerText = cleanHTMLArtifacts(answerText);
            explainText = cleanHTMLArtifacts(explainText);
            
            if (questionText) {
                const question = {
                    quiz: currentQuizName,
                    question: questionText,
                    answer: answerText || '',
                    explain: explainText
                };
                quizzes[currentQuizName].push(question);
            }
        }
    }
    
    return quizzes;
}

// Parse a single CSV line with proper quote handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i += 2;
                continue;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
                continue;
            }
        }
        
        if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
            i++;
            continue;
        }
        
        current += char;
        i++;
    }
    
    // Add the last field
    result.push(current);
    
    // Clean up results - remove extra quotes and trim
    return result.map(field => {
        field = field.trim();
        // Remove surrounding quotes if present
        if (field.startsWith('"') && field.endsWith('"')) {
            field = field.substring(1, field.length - 1);
        }
        return field;
    });
}

// Clean HTML artifacts from text
function cleanHTMLArtifacts(text) {
    if (!text) return text;
    
    // Remove common HTML artifacts
    text = text.replace(/\/p>/gi, '');
    text = text.replace(/<p>/gi, '');
    text = text.replace(/<\/p>/gi, '');
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    
    return text.trim();
}

// Render quiz list on home screen
function renderQuizList() {
    if (!quizList) {
        console.error('quizList element not found!');
        return;
    }
    
    quizList.innerHTML = '';
    const quizNames = Object.keys(quizData);
    
    console.log('Rendering quiz list:', quizNames.length, 'quizzes');
    
    quizNames.forEach(quizName => {
        const quizItem = document.createElement('div');
        quizItem.className = 'quiz-item';
        quizItem.textContent = quizName;
        quizItem.onclick = () => {
            const randomToggle = document.getElementById('randomToggle');
            const isRandom = randomToggle ? randomToggle.checked : false;
            startQuiz(quizName, isRandom);
        };
        quizList.appendChild(quizItem);
    });
}

// Setup event listeners
function setupEventListeners() {
    allQuizzesBtn.onclick = () => {
        const randomToggle = document.getElementById('randomToggle');
        const isRandom = randomToggle ? randomToggle.checked : false;
        startQuiz('all', isRandom);
    };
    backBtn.onclick = () => showScreen('home');
    submitBtn.onclick = handleSubmit;
    nextBtn.onclick = handleNext;
    retryWrongBtn.onclick = retryWrongQuestions;
    homeBtn.onclick = () => showScreen('home');
    
    // API Key dialog handlers
    settingsBtn.onclick = showApiKeyDialog;
    saveApiKeyBtn.onclick = saveApiKey;
    skipApiKeyBtn.onclick = hideApiKeyDialog;
    
    // Close dialog when clicking outside
    apiKeyDialog.onclick = (e) => {
        if (e.target === apiKeyDialog) {
            hideApiKeyDialog();
        }
    };
}

// Check if user has API key
function checkApiKey() {
    const hasKey = getUserApiKey();
    if (!hasKey) {
        // Show dialog on first visit
        setTimeout(() => showApiKeyDialog(), 500);
    }
}

// Show API key dialog
function showApiKeyDialog() {
    const currentKey = localStorage.getItem(USER_API_KEY_STORAGE) || '';
    apiKeyInput.value = currentKey;
    apiKeyDialog.classList.remove('hidden');
    apiKeyInput.focus();
}

// Hide API key dialog
function hideApiKeyDialog() {
    apiKeyDialog.classList.add('hidden');
}

// Save API key
function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Vui lòng nhập API key!');
        return;
    }
    
    // Basic validation
    if (!apiKey.startsWith('AIza')) {
        alert('API key không hợp lệ! API key của Gemini thường bắt đầu bằng "AIza"');
        return;
    }
    
    localStorage.setItem(USER_API_KEY_STORAGE, apiKey);
    hideApiKeyDialog();
    alert('✓ Đã lưu API key thành công!');
}

// Start a quiz
function startQuiz(quizName, random = false) {
    isRetryMode = false;
    isRandomMode = random;
    
    if (quizName === 'all') {
        currentQuiz = [];
        Object.values(quizData).forEach(questions => {
            currentQuiz = currentQuiz.concat(questions);
        });
        quizTitle.textContent = random ? '🎲 Tất cả Quiz (Random)' : 'Tất cả Quiz';
    } else {
        currentQuiz = [...quizData[quizName]];
        quizTitle.textContent = random ? `🎲 ${quizName} (Random)` : quizName;
    }
    
    // Shuffle questions if random mode
    if (random) {
        shuffleArray(currentQuiz);
    }
    
    currentQuestionIndex = 0;
    userAnswers = [];
    wrongQuestions = [];
    
    showScreen('quiz');
    renderQuestion();
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Retry wrong questions
function retryWrongQuestions() {
    if (wrongQuestions.length === 0) {
        alert('Không có câu hỏi nào sai để làm lại!');
        return;
    }
    
    isRetryMode = true;
    currentQuiz = [...wrongQuestions];
    currentQuestionIndex = 0;
    userAnswers = [];
    wrongQuestions = [];
    quizTitle.textContent = 'Làm lại câu sai';
    
    showScreen('quiz');
    renderQuestion();
}

// Show a specific screen
function showScreen(screenName) {
    homeScreen.classList.remove('active');
    quizScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    
    if (screenName === 'home') {
        homeScreen.classList.add('active');
    } else if (screenName === 'quiz') {
        quizScreen.classList.add('active');
    } else if (screenName === 'result') {
        resultScreen.classList.add('active');
    }
}

// Render current question
function renderQuestion() {
    const question = currentQuiz[currentQuestionIndex];
    
    currentQuestionEl.textContent = currentQuestionIndex + 1;
    totalQuestionsEl.textContent = currentQuiz.length;
    
    // Parse answers first to determine what to show in question text
    const answers = parseAnswers(question.question);
    
    // Extract just the question part (before the answers)
    let questionTextOnly = question.question;
    if (answers.length > 0 && answers[0].letter) {
        // Find where the first answer option starts
        const firstAnswerMatch = question.question.match(/\n[a-z]\.\s/i);
        if (firstAnswerMatch) {
            questionTextOnly = question.question.substring(0, firstAnswerMatch.index).trim();
        }
        // Also check for "Select one:" pattern for True/False questions
        const selectOneMatch = question.question.match(/Select one:/i);
        if (selectOneMatch) {
            questionTextOnly = question.question.substring(0, selectOneMatch.index + 11).trim();
        }
    }
    
    const correctAnswers = parseCorrectAnswers(question.answer);
    
    // Check if this is an essay question first (no answer options but has answer)
    const isEssayQuestion = answers.length === 0 && question.answer && question.answer.trim() !== '';
    
    const isMultipleChoice = !isEssayQuestion && correctAnswers.length > 1;
    
    // Debug logging
    console.log('Question render:', {
        hasAnswers: answers.length,
        correctAnswersCount: correctAnswers.length,
        isEssay: isEssayQuestion,
        isMultiple: isMultipleChoice
    });
    
    // Add labels
    if (isEssayQuestion) {
        questionTextOnly += '\n\n📝 Câu hỏi tự luận';
    } else if (isMultipleChoice && answers.length > 0) {
        questionTextOnly += '\n\n(Multiple Choice - Chọn nhiều đáp án)';
    }
    
    questionText.textContent = questionTextOnly;
    
    // Render answers
    answersContainer.innerHTML = '';
    
    if (answers.length === 0) {
        // Check if this is an essay question (has answer but no options)
        if (question.answer && question.answer.trim() !== '') {
            // This is an essay question
            const essayContainer = document.createElement('div');
            essayContainer.className = 'essay-container';
            
            const essayLabel = document.createElement('p');
            essayLabel.className = 'essay-label';
            essayLabel.textContent = '📝 Câu hỏi tự luận - Nhập câu trả lời của bạn:';
            
            const essayTextarea = document.createElement('textarea');
            essayTextarea.id = 'essayAnswer';
            essayTextarea.className = 'essay-textarea';
            essayTextarea.placeholder = 'Nhập câu trả lời của bạn ở đây...';
            essayTextarea.rows = 8;
            
            essayContainer.appendChild(essayLabel);
            essayContainer.appendChild(essayTextarea);
            answersContainer.appendChild(essayContainer);
        } else {
            // No answers found - show error message
            const errorEl = document.createElement('div');
            errorEl.className = 'answer-option disabled';
            errorEl.textContent = 'Không tìm thấy đáp án cho câu hỏi này. Vui lòng kiểm tra dữ liệu.';
            errorEl.style.color = 'var(--error-color)';
            answersContainer.appendChild(errorEl);
        }
    } else {
        answers.forEach((answerObj, index) => {
            const answerEl = document.createElement('div');
            answerEl.className = 'answer-option';
            answerEl.textContent = answerObj.text;
            answerEl.dataset.index = index;
            answerEl.dataset.answer = answerObj.text;
            answerEl.dataset.letter = answerObj.letter;
            answerEl.onclick = () => selectAnswer(answerEl, isMultipleChoice);
            answersContainer.appendChild(answerEl);
        });
    }
    
    // Reset UI
    explanationCard.classList.add('hidden');
    submitBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    
    // Preload explanation asynchronously if not available
    preloadedExplanation = null;
    if (!question.explain || question.explain.trim() === '') {
        preloadExplanation(question);
    }
}

// Parse answers from question text
function parseAnswers(questionText) {
    const answers = [];
    const lines = questionText.split('\n');
    
    // First try to find answers with letter format (a., b., c., d.)
    let hasLetterFormat = false;
    for (const line of lines) {
        const match = line.match(/^([a-z])\.\s*(.+)/i);
        if (match) {
            hasLetterFormat = true;
            const letter = match[1].toLowerCase();
            const text = match[2].trim();
            answers.push({
                letter: letter,
                text: text,
                fullText: `${letter}. ${text}`
            });
        }
    }
    
    // If no letter format found, check for special formats
    if (answers.length === 0) {
        const questionLower = questionText.toLowerCase();
        
        // Check for True/False format
        if (questionLower.includes('true') && questionLower.includes('false')) {
            if (questionLower.includes('select one:')) {
                answers.push({ letter: 'a', text: 'True', fullText: 'True' });
                answers.push({ letter: 'b', text: 'False', fullText: 'False' });
            }
        }
        
        // Check for Yes/No format
        if (questionLower.includes('yes') && questionLower.includes('no')) {
            answers.push({ letter: 'a', text: 'Yes', fullText: 'Yes' });
            answers.push({ letter: 'b', text: 'No', fullText: 'No' });
        }
        
        // Check for Storage tiers format (Hot -, Cold -, Archive -)
        const tierMatches = [];
        for (const line of lines) {
            const tierMatch = line.match(/^(Hot|Cold|Archive)\s*-\s*$/i);
            if (tierMatch) {
                const tier = tierMatch[1];
                tierMatches.push(tier);
            }
        }
        
        if (tierMatches.length > 0) {
            // This is a Storage tiers matching question
            // Extract the scenarios (A, B, C)
            const scenarios = [];
            for (const line of lines) {
                const scenarioMatch = line.match(/^([A-Z])\s*[–-]\s*(.+)/);
                if (scenarioMatch) {
                    scenarios.push({
                        letter: scenarioMatch[1],
                        text: scenarioMatch[2].trim()
                    });
                }
            }
            
            // Create answer options: "Hot → scenario", "Cold → scenario", "Archive → scenario"
            if (scenarios.length > 0) {
                tierMatches.forEach((tier, idx) => {
                    scenarios.forEach(scenario => {
                        answers.push({
                            letter: `${tier.toLowerCase()}-${scenario.letter.toLowerCase()}`,
                            text: `${tier} → ${scenario.letter}`,
                            fullText: `${tier} → ${scenario.letter}: ${scenario.text}`
                        });
                    });
                });
            }
        }
    }
    
    return answers;
}

// Parse correct answers - match against the text part only
function parseCorrectAnswers(answerText) {
    // Remove surrounding quotes if present
    const originalAnswer = answerText;
    answerText = answerText.replace(/^["']|["']$/g, '');
    
    // Check if this looks like an essay answer
    // Essay answers are LONG (>300 chars) with multiple complete sentences and colons/periods
    const hasMultipleSentences = (answerText.match(/\./g) || []).length > 3;
    const hasColons = answerText.includes(':');
    const isVeryLong = answerText.length > 300;
    
    if (isVeryLong || (hasMultipleSentences && hasColons)) {
        // This is likely an essay answer
        console.log('Detected as essay:', { length: answerText.length, sentences: hasMultipleSentences, colons: hasColons });
        return [answerText];
    }
    
    // For multiple choice with newlines, replace newlines with commas first
    answerText = answerText.replace(/\n/g, ',');
    
    // Split by comma
    const parts = answerText.split(',')
        .map(a => a.trim()
            .replace(/^["']|["']$/g, '')  // Remove quotes
            .replace(/^-\s*/, '')  // Remove leading dash
            .trim()
        )
        .filter(a => a);
    
    console.log('Parsed correct answers:', { original: originalAnswer.substring(0, 50), parts: parts.length, values: parts });
    
    // If we get too many parts (>6), it's likely an essay split incorrectly
    if (parts.length > 6) {
        return [answerText];
    }
    
    return parts;
}

// Check if an answer matches the correct answer
function isAnswerCorrect(answerObj, correctAnswerText) {
    const answerTextLower = answerObj.text.toLowerCase().trim();
    const correctTextLower = correctAnswerText.toLowerCase().trim();
    
    // Exact match
    if (answerTextLower === correctTextLower) return true;
    
    // Check if correct answer contains the answer text or vice versa
    if (correctTextLower.includes(answerTextLower) || answerTextLower.includes(correctTextLower)) {
        return true;
    }
    
    // For partial matching, check if the main keywords match
    // Remove common punctuation and extra spaces
    const cleanAnswer = answerTextLower.replace(/[.,;:!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanCorrect = correctTextLower.replace(/[.,;:!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (cleanAnswer === cleanCorrect) return true;
    
    return false;
}

// Select an answer
function selectAnswer(element, isMultipleChoice) {
    if (element.classList.contains('disabled')) return;
    
    if (isMultipleChoice) {
        element.classList.toggle('selected');
    } else {
        document.querySelectorAll('.answer-option').forEach(el => {
            el.classList.remove('selected');
        });
        element.classList.add('selected');
    }
}

// Handle submit button
async function handleSubmit() {
    const question = currentQuiz[currentQuestionIndex];
    
    // Check if this is an essay question
    const essayTextarea = document.getElementById('essayAnswer');
    if (essayTextarea) {
        const userAnswer = essayTextarea.value.trim();
        
        if (!userAnswer) {
            alert('Vui lòng nhập câu trả lời của bạn!');
            return;
        }
        
        // Disable textarea
        essayTextarea.disabled = true;
        
        // Evaluate essay answer with Gemini
        await evaluateEssayAnswer(question, userAnswer);
        
        submitBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
        return;
    }
    
    // Normal multiple choice handling
    const selectedAnswers = Array.from(document.querySelectorAll('.answer-option.selected'));
    
    if (selectedAnswers.length === 0) {
        alert('Vui lòng chọn ít nhất một đáp án!');
        return;
    }
    
    const correctAnswers = parseCorrectAnswers(question.answer);
    const selectedTexts = selectedAnswers.map(el => el.dataset.answer);
    
    console.log('Checking answer:', {
        selected: selectedTexts,
        correct: correctAnswers,
        selectedCount: selectedTexts.length,
        correctCount: correctAnswers.length
    });
    
    // Check if answer is correct by comparing with the correct answers
    let isCorrect = false;
    
    if (selectedTexts.length !== correctAnswers.length) {
        console.log('Wrong count!');
        isCorrect = false;
    } else {
        // Check each selected answer matches a correct answer
        let matchCount = 0;
        
        for (const selectedText of selectedTexts) {
            let foundMatch = false;
            for (const correctAns of correctAnswers) {
                if (answersMatch(selectedText, correctAns)) {
                    console.log('Match found:', selectedText, '<=>', correctAns);
                    matchCount++;
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) {
                console.log('No match for:', selectedText);
            }
        }
        
        console.log('Match count:', matchCount, '/', correctAnswers.length);
        isCorrect = (matchCount === correctAnswers.length && matchCount === selectedTexts.length);
    }
    
    console.log('Final result:', isCorrect ? 'CORRECT' : 'INCORRECT');
    
    // Mark answers
    const allAnswersOptions = Array.from(document.querySelectorAll('.answer-option'));
    allAnswersOptions.forEach(el => {
        el.classList.add('disabled');
        const answerText = el.dataset.answer;
        
        // Check if this is a correct answer
        const isCorrectAnswer = correctAnswers.some(correctAns => answersMatch(answerText, correctAns));
        
        if (isCorrectAnswer) {
            el.classList.add('correct');
        } else if (el.classList.contains('selected')) {
            el.classList.add('incorrect');
        }
    });
    
    // Store result
    userAnswers.push({
        question: question,
        selectedAnswers: selectedTexts,
        isCorrect: isCorrect
    });
    
    if (!isCorrect) {
        wrongQuestions.push(question);
    }
    
    // Show explanation
    await showExplanation(question, isCorrect);
    
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
}

// Evaluate essay answer using Gemini AI
async function evaluateEssayAnswer(question, userAnswer) {
    explanationCard.classList.remove('hidden');
    explanationText.textContent = 'Đang đánh giá câu trả lời của bạn...';
    resultLabel.textContent = '⏳ Đang chấm bài...';
    resultLabel.className = 'result-label';
    
    const apiKey = getUserApiKey();
    
    if (!apiKey) {
        resultLabel.textContent = '⚠️ Cần API key';
        resultLabel.className = 'result-label incorrect';
        explanationText.textContent = 'Vui lòng cấu hình API key để sử dụng tính năng đánh giá tự luận. Click vào ⚙️ để thiết lập.';
        return;
    }
    
    try {
        loadingOverlay.classList.remove('hidden');
        
        const prompt = `Bạn là một giáo viên đang chấm bài tự luận về Cloud Computing.

Câu hỏi: ${question.question}

Đáp án mẫu (tham khảo):
${question.answer}

Câu trả lời của học sinh:
${userAnswer}

Hãy đánh giá câu trả lời của học sinh theo các tiêu chí:
1. Độ chính xác (so với đáp án mẫu)
2. Tính đầy đủ
3. Cách diễn đạt

Trả lời theo format:
**Đánh giá: [Xuất sắc/Tốt/Khá/Cần cải thiện]**

**Nhận xét:**
- [Điểm mạnh]
- [Điểm cần cải thiện nếu có]

**Gợi ý:**
[Thông tin bổ sung hoặc góc nhìn khác]`;

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const evaluation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể đánh giá câu trả lời.';
        
        // Determine if it's a good answer based on evaluation
        const evaluationLower = evaluation.toLowerCase();
        let isGood = false;
        if (evaluationLower.includes('xuất sắc') || evaluationLower.includes('tốt')) {
            isGood = true;
        }
        
        resultLabel.textContent = isGood ? '✓ Đánh giá tích cực!' : '○ Đã đánh giá';
        resultLabel.className = 'result-label ' + (isGood ? 'correct' : 'incorrect');
        explanationText.textContent = evaluation;
        
        // Store result (mark as correct for good answers)
        userAnswers.push({
            question: question,
            selectedAnswers: [userAnswer],
            isCorrect: isGood,
            isEssay: true
        });
        
        if (!isGood) {
            wrongQuestions.push(question);
        }
        
    } catch (error) {
        console.error('Error evaluating essay:', error);
        resultLabel.textContent = '✗ Lỗi đánh giá';
        resultLabel.className = 'result-label incorrect';
        explanationText.textContent = 'Không thể đánh giá câu trả lời. Vui lòng thử lại.';
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Helper function to check if two answers match
function answersMatch(answer1, answer2) {
    const a1 = answer1.toLowerCase().trim().replace(/['"]/g, '');
    const a2 = answer2.toLowerCase().trim().replace(/['"]/g, '');
    
    // Exact match
    if (a1 === a2) return true;
    
    // Check for Storage tiers matching format: "Hot → C"
    if (a1.includes('→') || a2.includes('→')) {
        // Extract just the mapping part (e.g., "Hot → C" from answer)
        const extractMapping = (str) => {
            const match = str.match(/(hot|cold|archive)\s*→\s*([a-c])/i);
            if (match) {
                return `${match[1].toLowerCase()} → ${match[2].toLowerCase()}`;
            }
            return str;
        };
        
        const mapping1 = extractMapping(a1);
        const mapping2 = extractMapping(a2);
        
        if (mapping1 === mapping2) return true;
        
        // Also check if answer2 contains this mapping (e.g., "Hot → C, Cold → B, Archive → A")
        if (a2.includes(mapping1.replace(/\s/g, ''))) return true;
    }
    
    // One contains the other (for cases where correct answer is more detailed)
    if (a1.includes(a2) || a2.includes(a1)) {
        // But make sure it's a meaningful match (not just a short word)
        if (a2.length > 3 || a1.length > 3) {
            return true;
        }
    }
    
    return false;
}

// Show explanation
async function showExplanation(question, isCorrect) {
    explanationCard.classList.remove('hidden');
    resultLabel.textContent = isCorrect ? '✓ Chính xác!' : '✗ Không chính xác';
    resultLabel.className = 'result-label ' + (isCorrect ? 'correct' : 'incorrect');
    
    let explanation = question.explain;
    
    // If no explanation, check cache first, then preloaded, then fetch
    if (!explanation || explanation.trim() === '') {
        const questionKey = getQuestionKey(question);
        
        // Check cache first
        if (explanationCache[questionKey]) {
            explanation = explanationCache[questionKey];
            console.log('Using cached explanation for:', questionKey.substring(0, 50));
        } else if (preloadedExplanation) {
            // Use preloaded explanation (already fetched in background)
            explanation = await preloadedExplanation;
            
            // Save to cache
            if (explanation && !explanation.includes('Lỗi') && !explanation.includes('Không thể')) {
                explanationCache[questionKey] = explanation;
                saveExplanationCache();
                console.log('Saved explanation to cache:', questionKey.substring(0, 50));
            }
        } else {
            // Fallback: fetch now if preload didn't complete
            explanationText.textContent = 'Đang tải giải thích...';
            explanation = await getExplanationFromGemini(question.question, question.answer, true);
            
            // Save to cache
            if (explanation && !explanation.includes('Lỗi') && !explanation.includes('Không thể')) {
                explanationCache[questionKey] = explanation;
                saveExplanationCache();
                console.log('Saved explanation to cache:', questionKey.substring(0, 50));
            }
        }
    }
    
    explanationText.textContent = explanation || 'Không có giải thích cho câu hỏi này.';
}

// Preload explanation in background
function preloadExplanation(question) {
    const questionKey = getQuestionKey(question);
    
    // Check if already in cache
    if (explanationCache[questionKey]) {
        console.log('Explanation already cached, skipping preload');
        preloadedExplanation = Promise.resolve(explanationCache[questionKey]);
        return;
    }
    
    // Start fetching explanation asynchronously (don't await)
    preloadedExplanation = getExplanationFromGemini(question.question, question.answer);
}

// Get explanation from Gemini API
async function getExplanationFromGemini(questionText, correctAnswer, showLoading = false) {
    // Get user's API key
    const apiKey = getUserApiKey();
    
    if (!apiKey) {
        return 'Vui lòng cấu hình API key để sử dụng tính năng giải thích tự động. Click vào ⚙️ để thiết lập.';
    }
    
    try {
        // Only show loading overlay if explicitly requested (not for background preload)
        if (showLoading) {
            loadingOverlay.classList.remove('hidden');
        }
        
        const prompt = `Hãy giải thích câu trả lời cho câu hỏi sau bằng tiếng Việt. Giải thích ngắn gọn, súc tích và dễ hiểu.\n\nCâu hỏi: ${questionText}\n\nĐáp án đúng: ${correctAnswer}`;
        
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API Error:', response.status, errorData);
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('Gemini API Response:', data);
        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!explanation) {
            return 'Không nhận được giải thích từ AI. Vui lòng thử lại.';
        }
        
        return explanation;
    } catch (error) {
        console.error('Error getting explanation from Gemini:', error);
        
        // Return more specific error message
        if (error.message.includes('API request failed')) {
            return `Lỗi API: ${error.message}`;
        }
        
        return 'Không thể tải giải thích từ AI. Vui lòng kiểm tra API key hoặc kết nối mạng.';
    } finally {
        if (showLoading) {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Handle next button
function handleNext() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < currentQuiz.length) {
        renderQuestion();
    } else {
        showResults();
    }
}

// Show results screen
function showResults() {
    const correct = userAnswers.filter(a => a.isCorrect).length;
    const incorrect = userAnswers.length - correct;
    const percentage = Math.round((correct / userAnswers.length) * 100);
    
    correctCount.textContent = correct;
    incorrectCount.textContent = incorrect;
    scorePercentage.textContent = percentage + '%';
    
    // Hide retry button if no wrong answers
    if (wrongQuestions.length === 0) {
        retryWrongBtn.style.display = 'none';
    } else {
        retryWrongBtn.style.display = 'block';
    }
    
    showScreen('result');
}

// Helper function to compare arrays
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
