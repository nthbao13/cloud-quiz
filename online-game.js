// Online Game State
let currentRoom = null;
let currentPlayer = null;
let isHost = false;
let gameTimer = null;
let currentOnlineQuestionIndex = 0;
let onlineQuestions = [];
let answerStartTime = null;
let hasAnswered = false;
let selectedAnswers = []; // For multiple choice
let lastSelectionTime = null; // Track last click time

// DOM Elements for Online Mode
const onlineLobbyScreen = document.getElementById('onlineLobbyScreen');
const roomScreen = document.getElementById('roomScreen');
const onlineQuizScreen = document.getElementById('onlineQuizScreen');
const onlineResultScreen = document.getElementById('onlineResultScreen');

const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const onlinePlayerBtn = document.getElementById('onlinePlayerBtn');
const singlePlayerSection = document.getElementById('singlePlayerSection');
const backToHomeBtn = document.getElementById('backToHomeBtn');

const playerNameInput = document.getElementById('playerNameInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');

const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playersCount = document.getElementById('playersCount');
const playersList = document.getElementById('playersList');
const quizTopicSelect = document.getElementById('quizTopicSelect');
const startGameBtn = document.getElementById('startGameBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const roomStatus = document.getElementById('roomStatus');

const timerText = document.getElementById('timerText');
const onlineCurrentQuestion = document.getElementById('onlineCurrentQuestion');
const onlineTotalQuestions = document.getElementById('onlineTotalQuestions');
const onlineQuestionText = document.getElementById('onlineQuestionText');
const onlineAnswersContainer = document.getElementById('onlineAnswersContainer');
const liveScores = document.getElementById('liveScores');

const finalRanking = document.getElementById('finalRanking');
const playAgainBtn = document.getElementById('playAgainBtn');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');

// Initialize online mode
function initOnlineMode() {
    setupOnlineEventListeners();
    loadPlayerName();
}

// Setup event listeners for online mode
function setupOnlineEventListeners() {
    singlePlayerBtn.onclick = showSinglePlayerMode;
    onlinePlayerBtn.onclick = showOnlineMode;
    backToHomeBtn.onclick = () => showScreen('home');
    
    createRoomBtn.onclick = createRoom;
    joinRoomBtn.onclick = joinRoom;
    leaveRoomBtn.onclick = leaveRoom;
    startGameBtn.onclick = startOnlineGame;
    
    playAgainBtn.onclick = playAgain;
    backToLobbyBtn.onclick = backToOnlineLobby;
    
    // Enter key handlers
    playerNameInput.onkeypress = (e) => {
        if (e.key === 'Enter') createRoom();
    };
    roomCodeInput.onkeypress = (e) => {
        if (e.key === 'Enter') joinRoom();
    };
    
    // Save player name
    playerNameInput.onblur = savePlayerName;
}

// Show/hide sections
function showSinglePlayerMode() {
    singlePlayerBtn.classList.add('active');
    onlinePlayerBtn.classList.remove('active');
    singlePlayerSection.style.display = 'block';
}

function showOnlineMode() {
    singlePlayerBtn.classList.remove('active');
    onlinePlayerBtn.classList.add('active');
    singlePlayerSection.style.display = 'none';
    populateQuizTopics(); // Populate topics when entering online mode
    showScreen('onlineLobby');
}

function showScreen(screenName) {
    const screens = {
        'home': homeScreen,
        'quiz': quizScreen,
        'result': resultScreen,
        'onlineLobby': onlineLobbyScreen,
        'room': roomScreen,
        'onlineQuiz': onlineQuizScreen,
        'onlineResult': onlineResultScreen
    };
    
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

// Player name management
function loadPlayerName() {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        playerNameInput.value = savedName;
    }
}

function savePlayerName() {
    const name = playerNameInput.value.trim();
    if (name) {
        localStorage.setItem('playerName', name);
    }
}

function getPlayerName() {
    const name = playerNameInput.value.trim();
    return name || 'Player_' + Math.random().toString(36).substr(2, 5);
}

// Populate quiz topics
function populateQuizTopics() {
    quizTopicSelect.innerHTML = '<option value="all">Tất cả chủ đề</option>';
    Object.keys(quizData).forEach(quizName => {
        const option = document.createElement('option');
        option.value = quizName;
        option.textContent = quizName;
        quizTopicSelect.appendChild(option);
    });
}

// Generate room code
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Create room
async function createRoom() {
    const playerName = getPlayerName();
    savePlayerName();
    
    const roomCode = generateRoomCode();
    const roomData = {
        code: roomCode,
        host: playerName,
        players: {
            [generatePlayerId()]: {
                name: playerName,
                score: 0,
                isHost: true,
                joinedAt: Date.now()
            }
        },
        settings: {
            topic: 'all'
        },
        status: 'waiting', // waiting, playing, finished
        createdAt: Date.now()
    };
    
    try {
        await database.ref('rooms/' + roomCode).set(roomData);
        currentRoom = roomCode;
        currentPlayer = {
            id: Object.keys(roomData.players)[0],
            name: playerName
        };
        isHost = true;
        
        joinRoomScreen(roomCode);
        listenToRoomUpdates(roomCode);
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Không thể tạo phòng. Vui lòng thử lại.');
    }
}

// Join room
async function joinRoom() {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    const playerName = getPlayerName();
    savePlayerName();
    
    if (!roomCode) {
        alert('Vui lòng nhập mã phòng');
        return;
    }
    
    try {
        const roomSnapshot = await database.ref('rooms/' + roomCode).once('value');
        const roomData = roomSnapshot.val();
        
        if (!roomData) {
            alert('Phòng không tồn tại');
            return;
        }
        
        if (roomData.status !== 'waiting') {
            alert('Phòng đã bắt đầu chơi hoặc đã kết thúc');
            return;
        }
        
        const playerId = generatePlayerId();
        await database.ref('rooms/' + roomCode + '/players/' + playerId).set({
            name: playerName,
            score: 0,
            isHost: false,
            joinedAt: Date.now()
        });
        
        currentRoom = roomCode;
        currentPlayer = {
            id: playerId,
            name: playerName
        };
        isHost = false;
        
        joinRoomScreen(roomCode);
        listenToRoomUpdates(roomCode);
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Không thể tham gia phòng. Vui lòng thử lại.');
    }
}

// Generate player ID
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Join room screen
function joinRoomScreen(roomCode) {
    showScreen('room');
    roomCodeDisplay.textContent = roomCode;
    populateQuizTopics(); // Populate topics when entering room
    
    if (isHost) {
        startGameBtn.style.display = 'block';
        quizTopicSelect.disabled = false;
        roomStatus.style.display = 'none';
    } else {
        startGameBtn.style.display = 'none';
        quizTopicSelect.disabled = true;
        roomStatus.style.display = 'block';
    }
}

// Listen to room updates
function listenToRoomUpdates(roomCode) {
    database.ref('rooms/' + roomCode).on('value', (snapshot) => {
        const roomData = snapshot.val();
        if (!roomData) {
            alert('Phòng đã bị đóng');
            leaveRoom();
            return;
        }
        
        updatePlayersList(roomData.players);
        
        // Update settings
        if (roomData.settings) {
            quizTopicSelect.value = roomData.settings.topic;
        }
        
        // Check game status
        if (roomData.status === 'playing' && onlineQuizScreen.classList.contains('active') === false) {
            startPlayingGame(roomData);
        } else if (roomData.status === 'question_end') {
            handleQuestionEnd(roomData);
        } else if (roomData.status === 'finished') {
            showOnlineResults(roomData);
        }
        
        // Update live scores during game
        if (roomData.status === 'playing') {
            updateLiveScores(roomData.players);
        }
    });
}

// Update players list
function updatePlayersList(players) {
    playersList.innerHTML = '';
    playersCount.textContent = Object.keys(players).length;
    
    Object.entries(players).forEach(([playerId, player]) => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">${player.name} ${player.isHost ? '👑' : ''}</span>
            <span class="player-score">${player.score || 0} điểm</span>
        `;
        playersList.appendChild(playerItem);
    });
}

// Start online game
async function startOnlineGame() {
    if (!isHost) return;
    
    const topic = quizTopicSelect.value;
    
    // Prepare questions
    let questions = [];
    if (topic === 'all') {
        Object.values(quizData).forEach(quizQuestions => {
            questions = questions.concat(quizQuestions);
        });
    } else {
        questions = quizData[topic] || [];
    }
    
    // Filter out open-ended questions (questions without multiple choice answers)
    questions = questions.filter(q => {
        const hasOptions = q.question.includes('\na.') || q.question.includes('\nA.');
        return hasOptions;
    });
    
    // Shuffle and take 50 questions
    questions = shuffleArray(questions).slice(0, 50);
    
    if (questions.length === 0) {
        alert('Không có câu hỏi nào để chơi');
        return;
    }
    
    try {
        await database.ref('rooms/' + currentRoom).update({
            status: 'playing',
            questions: questions,
            currentQuestionIndex: 0,
            startTime: Date.now()
        });
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Không thể bắt đầu trò chơi');
    }
}

// Start playing game
function startPlayingGame(roomData) {
    onlineQuestions = roomData.questions || [];
    currentOnlineQuestionIndex = roomData.currentQuestionIndex || 0;
    
    if (onlineQuestions.length === 0) {
        alert('Không có câu hỏi nào');
        return;
    }
    
    showScreen('onlineQuiz');
    displayOnlineQuestion();
}

// Display online question
function displayOnlineQuestion() {
    hasAnswered = false;
    selectedAnswers = [];
    lastSelectionTime = null;
    answerStartTime = Date.now();
    
    const question = onlineQuestions[currentOnlineQuestionIndex];
    
    onlineCurrentQuestion.textContent = currentOnlineQuestionIndex + 1;
    onlineTotalQuestions.textContent = onlineQuestions.length;
    
    // Parse question and answers
    const { questionText, options } = parseQuestionText(question.question);
    onlineQuestionText.textContent = questionText;
    
    // Check if multiple answers - smart split (ignore commas inside parentheses)
    const correctAnswers = smartSplitAnswers(question.answer);
    const isMultipleChoice = correctAnswers.length > 1;
    
    // Display answers
    onlineAnswersContainer.innerHTML = '';
    
    // Add instruction for multiple choice
    if (isMultipleChoice) {
        const instruction = document.createElement('div');
        instruction.className = 'multiple-choice-instruction';
        instruction.innerHTML = '📌 <strong>Câu hỏi nhiều đáp án</strong> - Chọn tất cả đáp án đúng';
        onlineAnswersContainer.appendChild(instruction);
    }
    
    options.forEach((option, index) => {
        const answerWrapper = document.createElement('div');
        answerWrapper.className = 'answer-wrapper';
        
        const answerBtn = document.createElement('button');
        answerBtn.className = 'answer-btn';
        answerBtn.dataset.option = option;
        answerBtn.dataset.index = index;
        
        // Add letter prefix and checkbox for multiple choice
        const letter = String.fromCharCode(97 + index);
        const checkbox = isMultipleChoice ? '<span class="answer-checkbox">☐</span>' : '';
        answerBtn.innerHTML = `${checkbox}<strong class="answer-letter">${letter})</strong> <span class="answer-text">${option}</span>`;
        
        answerBtn.onclick = () => {
            if (!hasAnswered) {
                lastSelectionTime = Date.now();
                
                if (isMultipleChoice) {
                    // Toggle selection for multiple choice
                    const isSelected = answerBtn.classList.contains('selected');
                    if (isSelected) {
                        answerBtn.classList.remove('selected');
                        const checkboxEl = answerBtn.querySelector('.answer-checkbox');
                        if (checkboxEl) checkboxEl.textContent = '☐';
                        selectedAnswers = selectedAnswers.filter(ans => ans !== option);
                    } else {
                        answerBtn.classList.add('selected');
                        const checkboxEl = answerBtn.querySelector('.answer-checkbox');
                        if (checkboxEl) checkboxEl.textContent = '☑';
                        selectedAnswers.push(option);
                    }
                } else {
                    // Single choice - remove other selections
                    document.querySelectorAll('.answer-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    answerBtn.classList.add('selected');
                    selectedAnswers = [option];
                }
            }
        };
        
        answerWrapper.appendChild(answerBtn);
        onlineAnswersContainer.appendChild(answerWrapper);
    });
    
    // Start timer
    startQuestionTimer();
}

// Parse question text to extract options
function parseQuestionText(fullQuestion) {
    const lines = fullQuestion.split('\n');
    let questionText = '';
    let options = [];
    
    for (let line of lines) {
        line = line.trim();
        if (line.match(/^[a-dA-D][\.\)]/)) {
            // This is an option
            options.push(line.substring(2).trim());
        } else if (line && options.length === 0) {
            // This is part of the question
            questionText += (questionText ? ' ' : '') + line;
        }
    }
    
    return { questionText, options };
}

// Smart split answers - ignore commas inside parentheses
function smartSplitAnswers(answerString) {
    if (!answerString) return [];
    
    const answers = [];
    let current = '';
    let depth = 0; // Track parentheses depth
    
    for (let i = 0; i < answerString.length; i++) {
        const char = answerString[i];
        
        if (char === '(') {
            depth++;
            current += char;
        } else if (char === ')') {
            depth--;
            current += char;
        } else if (char === ',' && depth === 0) {
            // Only split on commas outside parentheses
            if (current.trim()) {
                answers.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last answer
    if (current.trim()) {
        answers.push(current.trim());
    }
    
    return answers;
}

// Start question timer
function startQuestionTimer() {
    let timeLeft = 10;
    timerText.textContent = timeLeft;
    
    const timerCircle = document.querySelector('.timer-circle');
    if (timerCircle) {
        timerCircle.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;
        
        // Change color when time is running out
        if (timerCircle) {
            if (timeLeft <= 3) {
                timerCircle.style.background = 'linear-gradient(135deg, #ff3b30 0%, #ff6b6b 100%)';
                timerCircle.style.animation = 'pulse 0.5s ease-in-out infinite';
            } else if (timeLeft <= 5) {
                timerCircle.style.background = 'linear-gradient(135deg, #ff9500 0%, #ffcc00 100%)';
            }
        }
        
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            // Time's up - submit current selections
            submitOnlineAnswer();
        }
    }, 1000);
}

// Submit online answer
async function submitOnlineAnswer() {
    if (hasAnswered) return;
    
    hasAnswered = true;
    clearInterval(gameTimer);
    
    // Disable all answer buttons
    const allButtons = onlineAnswersContainer.querySelectorAll('.answer-btn');
    allButtons.forEach(btn => {
        btn.style.pointerEvents = 'none';
    });
    
    // Use last selection time if available, otherwise answer start time
    const answerTime = lastSelectionTime ? (lastSelectionTime - answerStartTime) : 10000;
    const question = onlineQuestions[currentOnlineQuestionIndex];
    
    // Get correct answers using smart split
    const correctAnswers = smartSplitAnswers(question.answer);
    
    // Check if answer is correct
    let isCorrect = false;
    
    if (selectedAnswers.length === 0) {
        // No answer selected
        isCorrect = false;
    } else if (correctAnswers.length === 1) {
        // Single choice question - exact match
        isCorrect = selectedAnswers.length === 1 && 
                    selectedAnswers[0].toLowerCase().trim() === correctAnswers[0].toLowerCase().trim();
    } else {
        // Multiple choice question - must match all correct answers exactly
        if (selectedAnswers.length !== correctAnswers.length) {
            isCorrect = false;
        } else {
            // Check if all correct answers are selected (exact match)
            isCorrect = correctAnswers.every(correctAnswer => {
                return selectedAnswers.some(selected => 
                    selected.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
                );
            }) && selectedAnswers.every(selected => {
                return correctAnswers.some(correctAnswer =>
                    selected.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
                );
            });
        }
    }
    
    // Calculate score (max 1000 points per question)
    let points = 0;
    if (isCorrect) {
        const timeBonus = Math.max(0, 10000 - answerTime) / 10000;
        points = Math.round(500 + (500 * timeBonus));
    }
    
    // Show feedback with animation
    allButtons.forEach(btn => {
        const option = btn.dataset.option;
        const isSelectedByUser = selectedAnswers.includes(option);
        
        // Exact match only - no fuzzy matching to avoid false positives
        const normalizedOption = option.toLowerCase().trim();
        const isCorrectAnswer = correctAnswers.some(correctAnswer => {
            const normalizedCorrect = correctAnswer.toLowerCase().trim();
            return normalizedOption === normalizedCorrect;
        });
        
        if (isCorrectAnswer) {
            btn.classList.add('correct');
            btn.classList.remove('selected');
        } else if (isSelectedByUser) {
            btn.classList.add('incorrect');
            btn.classList.remove('selected');
        } else {
            btn.classList.add('disabled');
        }
    });
    
    // Show points earned if correct
    if (isCorrect) {
        const pointsIndicator = document.createElement('div');
        pointsIndicator.className = 'points-indicator-overlay';
        pointsIndicator.innerHTML = `
            <div class="points-popup">
                <div class="points-value">+${points}</div>
                <div class="points-label">điểm</div>
            </div>
        `;
        document.querySelector('.quiz-content').appendChild(pointsIndicator);
        
        setTimeout(() => {
            pointsIndicator.remove();
        }, 2500);
    }
    
    // Update score in database
    try {
        const currentScore = await database.ref(`rooms/${currentRoom}/players/${currentPlayer.id}/score`).once('value');
        const newScore = (currentScore.val() || 0) + points;
        await database.ref(`rooms/${currentRoom}/players/${currentPlayer.id}/score`).set(newScore);
        
        // Mark as answered
        await database.ref(`rooms/${currentRoom}/players/${currentPlayer.id}/answeredQuestion${currentOnlineQuestionIndex}`).set({
            answers: selectedAnswers,
            isCorrect: isCorrect,
            points: points,
            time: answerTime
        });
        
        // If host, wait then move to next question
        if (isHost) {
            setTimeout(() => moveToNextQuestion(), 3000);
        }
    } catch (error) {
        console.error('Error updating score:', error);
    }
}

// Handle online answer (deprecated - keeping for compatibility)
async function handleOnlineAnswer(selectedAnswer, answerBtn) {
    // This function is now handled by submitOnlineAnswer
    // Keeping it for compatibility but redirecting to new function
    if (selectedAnswer) {
        selectedAnswers = [selectedAnswer];
        lastSelectionTime = Date.now();
    }
    await submitOnlineAnswer();
}

// Move to next question
async function moveToNextQuestion() {
    if (!isHost) return;
    
    const nextIndex = currentOnlineQuestionIndex + 1;
    
    if (nextIndex >= onlineQuestions.length) {
        // Game finished
        await database.ref('rooms/' + currentRoom).update({
            status: 'finished'
        });
    } else {
        // Next question
        await database.ref('rooms/' + currentRoom).update({
            currentQuestionIndex: nextIndex,
            status: 'question_end'
        });
        
        setTimeout(async () => {
            await database.ref('rooms/' + currentRoom).update({
                status: 'playing'
            });
        }, 2000);
    }
}

// Handle question end
function handleQuestionEnd(roomData) {
    currentOnlineQuestionIndex = roomData.currentQuestionIndex;
    
    setTimeout(() => {
        displayOnlineQuestion();
    }, 2000);
}

// Update live scores
function updateLiveScores(players) {
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));
    
    liveScores.innerHTML = '';
    sortedPlayers.forEach(([playerId, player], index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.innerHTML = `
            <span class="rank">#${index + 1}</span>
            <span class="name">${player.name}</span>
            <span class="score">${player.score || 0}</span>
        `;
        liveScores.appendChild(scoreItem);
    });
}

// Show online results
function showOnlineResults(roomData) {
    clearInterval(gameTimer);
    showScreen('onlineResult');
    
    const players = roomData.players || {};
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));
    
    finalRanking.innerHTML = '';
    sortedPlayers.forEach(([playerId, player], index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        
        rankItem.innerHTML = `
            <span class="rank-number">${medal || `#${index + 1}`}</span>
            <span class="rank-name">${player.name}</span>
            <span class="rank-score">${player.score || 0} điểm</span>
        `;
        
        if (playerId === currentPlayer.id) {
            rankItem.classList.add('current-player');
        }
        
        finalRanking.appendChild(rankItem);
    });
}

// Play again
async function playAgain() {
    if (!isHost) {
        alert('Chỉ chủ phòng mới có thể bắt đầu lại');
        return;
    }
    
    try {
        // Reset room
        const roomSnapshot = await database.ref('rooms/' + currentRoom).once('value');
        const roomData = roomSnapshot.val();
        
        // Reset player scores
        const updates = {};
        Object.keys(roomData.players).forEach(playerId => {
            updates[`rooms/${currentRoom}/players/${playerId}/score`] = 0;
            // Remove answered questions (up to 50 questions)
            for (let i = 0; i < 50; i++) {
                updates[`rooms/${currentRoom}/players/${playerId}/answeredQuestion${i}`] = null;
            }
        });
        
        updates[`rooms/${currentRoom}/status`] = 'waiting';
        updates[`rooms/${currentRoom}/questions`] = null;
        updates[`rooms/${currentRoom}/currentQuestionIndex`] = null;
        
        await database.ref().update(updates);
        
        showScreen('room');
    } catch (error) {
        console.error('Error resetting game:', error);
        alert('Không thể bắt đầu lại');
    }
}

// Back to online lobby
function backToOnlineLobby() {
    leaveRoom();
    showScreen('onlineLobby');
}

// Leave room
async function leaveRoom() {
    if (currentRoom && currentPlayer) {
        try {
            // Remove player from room
            await database.ref(`rooms/${currentRoom}/players/${currentPlayer.id}`).remove();
            
            // If host is leaving, delete the room
            if (isHost) {
                await database.ref(`rooms/${currentRoom}`).remove();
            }
            
            // Stop listening to updates
            database.ref('rooms/' + currentRoom).off();
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }
    
    currentRoom = null;
    currentPlayer = null;
    isHost = false;
    clearInterval(gameTimer);
    
    showScreen('home');
}

// Shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (currentRoom && currentPlayer) {
        database.ref(`rooms/${currentRoom}/players/${currentPlayer.id}`).remove();
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnlineMode);
} else {
    initOnlineMode();
}
