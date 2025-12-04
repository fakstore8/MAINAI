// ===== KONFIGURASI =====
// Google OAuth Client ID - Dapatkan dari: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = '926752189712-erj4stvbi8rvbf15m4pt6361friqgv0g.apps.googleusercontent.com';

// Google Gemini API Key - Dapatkan dari: https://makersuite.google.com/app/apikey
const GEMINI_API_KEY = 'AIzaSyA1MWHRnqBv-wB8x6lFi5hhe4NdcXXm1VA';
// =======================

let currentUser = null;
let chats = [];
let currentChatId = null;
let conversationHistory = [];

// ===== PARTICLE EFFECTS =====
function createParticles() {
    const container = document.querySelector('.bg-animation');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        container.appendChild(particle);
    }
}

// ===== ERROR HANDLING =====
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}

// ===== API STATUS =====
function updateApiStatus(isReady, text) {
    const dot = document.getElementById('apiStatusDot');
    const statusText = document.getElementById('apiStatusText');
    
    if (isReady) {
        dot.classList.remove('error');
        statusText.textContent = text || 'Gemini Ready';
    } else {
        dot.classList.add('error');
        statusText.textContent = text || 'API Error';
    }
}

function checkApiConfiguration() {
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        updateApiStatus(false, 'API Not Configured');
        return false;
    }
    return true;
}

// ===== GEMINI API =====
async function callGeminiAPI(userMessage) {
    if (!checkApiConfiguration()) {
        throw new Error('Gemini API belum dikonfigurasi. Silakan tambahkan API Key Anda di kode.');
    }

    conversationHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    // Gunakan model terbaru: gemini-1.5-flash atau gemini-1.5-pro
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: conversationHistory,
                generationConfig: {
                    temperature: 0.9,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        
        conversationHistory.push({
            role: "model",
            parts: [{ text: aiResponse }]
        });

        updateApiStatus(true, 'Gemini Ready');
        return aiResponse;

    } catch (error) {
        console.error('Gemini API Error:', error);
        updateApiStatus(false, 'API Error');
        throw error;
    }
}

// ===== GOOGLE SIGN-IN =====
function initGoogleSignIn() {
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com') {
        const btn = document.getElementById('googleLoginBtn');
        btn.innerHTML = `
            <button class="google-btn" onclick="showSetupInstructions()">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Masuk dengan Google
            </button>
        `;
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(
        document.getElementById('googleLoginBtn'),
        { 
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 300,
            logo_alignment: 'left'
        }
    );
}

function showSetupInstructions() {
    alert(`⚙️ KONFIGURASI DIPERLUKAN\n\n` +
          `Untuk menggunakan MAIN AI, Anda perlu:\n\n` +
          `1️⃣ GOOGLE CLIENT ID:\n` +
          `   • Buka: https://console.cloud.google.com/\n` +
          `   • Buat project baru\n` +
          `   • Enable Google Identity Services\n` +
          `   • Buat OAuth 2.0 Client ID\n` +
          `   • Copy Client ID\n\n` +
          `2️⃣ GEMINI API KEY:\n` +
          `   • Buka: https://makersuite.google.com/app/apikey\n` +
          `   • Klik "Get API Key" atau "Create API Key"\n` +
          `   • Copy API Key\n\n` +
          `3️⃣ Paste kedua key di file script.js\n\n` +
          `📚 Tutorial lengkap ada di komentar kode!`);
}

function handleCredentialResponse(response) {
    const credential = response.credential;
    const payload = parseJwt(credential);

    currentUser = {
        name: payload.name,
        email: payload.email,
        avatar: payload.given_name.charAt(0).toUpperCase(),
        picture: payload.picture
    };

    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    if (currentUser.picture) {
        const avatarEl = document.getElementById('userAvatar');
        avatarEl.style.backgroundImage = `url(${currentUser.picture})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.textContent = '';
    }

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').style.display = 'flex';

    localStorage.setItem('mainai_user', JSON.stringify(currentUser));

    loadChats();
    createNewChat();
    
    if (checkApiConfiguration()) {
        updateApiStatus(true, 'Gemini Ready');
    } else {
        updateApiStatus(false, 'Configure API');
        showError('Silakan konfigurasi Gemini API Key untuk menggunakan AI');
    }
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// ===== SESSION MANAGEMENT =====
function checkExistingSession() {
    const savedUser = localStorage.getItem('mainai_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.avatar;
        
        if (currentUser.picture) {
            const avatarEl = document.getElementById('userAvatar');
            avatarEl.style.backgroundImage = `url(${currentUser.picture})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.textContent = '';
        }

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').style.display = 'flex';

        loadChats();
        if (chats.length === 0) {
            createNewChat();
        }
        
        if (checkApiConfiguration()) {
            updateApiStatus(true, 'Gemini Ready');
        } else {
            updateApiStatus(false, 'Configure API');
        }
    }
}

// ===== CHAT MANAGEMENT =====
function createNewChat() {
    const chat = {
        id: Date.now(),
        title: 'Percakapan Baru',
        messages: [],
        timestamp: new Date()
    };
    chats.unshift(chat);
    currentChatId = chat.id;
    conversationHistory = [];
    updateChatHistory();
    clearChatContainer();
    addWelcomeMessage();
    saveChats();
}

function loadChats() {
    const saved = localStorage.getItem('mainai_chats');
    if (saved) {
        chats = JSON.parse(saved);
        if (chats.length > 0) {
            currentChatId = chats[0].id;
            loadChat(currentChatId);
        }
    }
    updateChatHistory();
}

function saveChats() {
    localStorage.setItem('mainai_chats', JSON.stringify(chats));
}

function updateChatHistory() {
    const container = document.getElementById('chatHistory');
    container.innerHTML = '';
    
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
        
        const title = document.createElement('div');
        title.className = 'chat-item-title';
        title.textContent = chat.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };
        
        item.appendChild(title);
        item.appendChild(deleteBtn);
        item.onclick = () => loadChat(chat.id);
        
        container.appendChild(item);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    conversationHistory = [];
    clearChatContainer();
    chat.messages.forEach(msg => {
        addMessage(msg.content, msg.isUser);
    });
    
    updateChatHistory();
}

function deleteChat(chatId) {
    if (confirm('Hapus percakapan ini?')) {
        chats = chats.filter(c => c.id !== chatId);
        if (currentChatId === chatId) {
            if (chats.length > 0) {
                loadChat(chats[0].id);
            } else {
                createNewChat();
            }
        }
        saveChats();
        updateChatHistory();
    }
}

function clearChatContainer() {
    document.getElementById('chatContainer').innerHTML = '';
}

function addWelcomeMessage() {
    const welcomeMsg = '👋 Halo! Saya adalah <strong>MAIN AI</strong> yang diperkuat oleh Google Gemini.<br><br>' +
        '✨ Saya dapat membantu Anda dengan:<br>' +
        '• Menjawab pertanyaan kompleks<br>' +
        '• Menulis dan menganalisis kode<br>' +
        '• Brainstorming ide kreatif<br>' +
        '• Menjelaskan konsep rumit<br>' +
        '• Dan masih banyak lagi!<br><br>' +
        'Silakan mulai percakapan dengan mengetik pesan di bawah ini! 🚀';
    addMessage(welcomeMsg, false);
}

// ===== MESSAGE HANDLING =====
function addMessage(content, isUser) {
    const chatContainer = document.getElementById('chatContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = isUser ? currentUser?.avatar || '👤' : 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isUser) {
        contentDiv.innerHTML = content.replace(/\n/g, '<br>');
    } else {
        contentDiv.innerHTML = formatAIResponse(content);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({ content, isUser });
        saveChats();
    }
}

function formatAIResponse(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
    text = text.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; overflow-x: auto; margin: 10px 0;"><code>$1</code></pre>');
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

function updateChatTitle(firstMessage) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat && chat.title === 'Percakapan Baru') {
        chat.title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
        updateChatHistory();
        saveChats();
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();

    if (!message) return;

    const chat = chats.find(c => c.id === currentChatId);
    if (chat && chat.messages.length === 0) {
        updateChatTitle(message);
    }

    addMessage(message, true);
    input.value = '';

    const loading = document.getElementById('loading');
    const sendBtn = document.getElementById('sendBtn');
    
    loading.classList.add('active');
    sendBtn.disabled = true;

    try {
        const response = await callGeminiAPI(message);
        addMessage(response, false);
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = '😔 Maaf, terjadi kesalahan. ';
        
        if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
            errorMessage += 'API Key tidak valid. Silakan periksa konfigurasi Gemini API Key Anda.';
        } else if (error.message.includes('dikonfigurasi')) {
            errorMessage += error.message;
        } else if (error.message.includes('quota')) {
            errorMessage += 'Kuota API telah habis. Silakan tunggu atau upgrade akun Anda.';
        } else {
            errorMessage += 'Silakan coba lagi. Error: ' + error.message;
        }
        
        addMessage(errorMessage, false);
        showError(errorMessage);
    } finally {
        loading.classList.remove('active');
        sendBtn.disabled = false;
        input.focus();
    }
}

// ===== EVENT LISTENERS =====
window.onload = function() {
    createParticles();
    checkExistingSession();
    initGoogleSignIn();
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        currentUser = null;
        localStorage.removeItem('mainai_user');
        if (typeof google !== 'undefined') {
            google.accounts.id.disableAutoSelect();
        }
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appContainer').style.display = 'none';
        chats = [];
        currentChatId = null;
        conversationHistory = [];
    }
});

document.getElementById('menuBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('collapsed');
    
    // Toggle overlay untuk mobile
    if (window.innerWidth <= 768) {
        overlay.classList.toggle('active');
    }
});

// Tutup sidebar saat overlay diklik (mobile)
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('sidebarOverlay').classList.remove('active');
});

document.getElementById('newChatBtn').addEventListener('click', () => {
    createNewChat();
});

document.getElementById('sendBtn').addEventListener('click', sendMessage);

document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

setTimeout(() => {
    if (currentUser) {
        document.getElementById('userInput').focus();
    }
}, 500);

