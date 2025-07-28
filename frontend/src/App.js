import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Calendar, Edit, TrendingUp, Heart, Brain, Target, Clock, CheckCircle, AlertCircle, 
  MessageCircle, PlusCircle, ArrowRight, BarChart3, Smile, Frown, Meh, User,
  Search, Settings, Bell, Moon, Sun, Menu, X, Filter, SortAsc, Archive,
  Share2, Download, Upload, Trash2, MoreHorizontal, Zap, Sparkles, Command,
  ChevronDown, ChevronRight, Tag, Bookmark, Link2, Image, Code, Table,
  Layout, List, Grid, MapPin, Globe, Lock, Eye, EyeOff, Copy, Check,
  RefreshCw, Play, Pause, Square, Volume2, VolumeX, Headphones, Save,
  FileText, FolderOpen, Star, Hash, Clipboard, Send, Mic, MicOff
} from 'lucide-react';

// API 설정
const API_BASE_URL = 'http://localhost:5000/api';

// API 클라이언트 클래스
class CortexAPI {
  constructor() {
    this.token = localStorage.getItem('cortex_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('cortex_token', token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('cortex_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API 요청 실패');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // 인증
  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (result.access_token) {
      this.setToken(result.access_token);
    }
    return result;
  }

  async register(email, username, password) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: { email, username, password }
    });
    if (result.access_token) {
      this.setToken(result.access_token);
    }
    return result;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // 대시보드
  async getDashboardSummary() {
    return this.request('/dashboard/summary');
  }

  // 노트
  async getNotes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notes?${queryString}`);
  }

  async createNote(noteData) {
    return this.request('/notes', {
      method: 'POST',
      body: noteData
    });
  }

  async updateNote(noteId, noteData) {
    return this.request(`/notes/${noteId}`, {
      method: 'PUT',
      body: noteData
    });
  }

  async deleteNote(noteId) {
    return this.request(`/notes/${noteId}`, {
      method: 'DELETE'
    });
  }

  // 작업
  async getTasks() {
    return this.request('/tasks');
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: taskData
    });
  }

  async updateTask(taskId, taskData) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: taskData
    });
  }

  // 이벤트
  async getEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/events?${queryString}`);
  }

  async createEvent(eventData) {
    return this.request('/events', {
      method: 'POST',
      body: eventData
    });
  }

  // AI 기능
  async getAIInsights() {
    return this.request('/ai/insights');
  }

  async chatWithAI(message) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: { message }
    });
  }

  // 포커스 세션
  async startFocusSession(sessionData) {
    return this.request('/focus/sessions', {
      method: 'POST',
      body: sessionData
    });
  }

  async completeFocusSession(sessionId, data) {
    return this.request(`/focus/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: data
    });
  }

  // 검색
  async search(query) {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  }

  // 분석
  async getProductivityAnalytics(days = 30) {
    return this.request(`/analytics/productivity?days=${days}`);
  }

  // 설정
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings) {
    return this.request('/settings', {
      method: 'PUT',
      body: settings
    });
  }

  // 템플릿
  async getTemplates() {
    return this.request('/templates');
  }

  async useTemplate(templateId, data = {}) {
    return this.request(`/templates/${templateId}/use`, {
      method: 'POST',
      body: data
    });
  }

  // 외부 통합
  async syncToNotion(noteId) {
    return this.request('/integrations/notion/sync', {
      method: 'POST',
      body: { note_id: noteId }
    });
  }

  async getGitHubRepos() {
    return this.request('/integrations/github/repos');
  }

  async createGitHubIssue(repo, title, body, labels = []) {
    return this.request('/integrations/github/issue', {
      method: 'POST',
      body: { repo, title, body, labels }
    });
  }
}

// API 인스턴스
const api = new CortexAPI();

// 메인 앱 컴포넌트
const CortexApp = () => {
  // 상태 관리
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('cortex_theme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // 데이터 상태
  const [dashboardData, setDashboardData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [aiInsights, setAIInsights] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // UI 상태
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // 포커스 세션 상태
  const [focusSession, setFocusSession] = useState(null);
  const [focusTimer, setFocusTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // AI 채팅 상태
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');

  // Refs
  const timerRef = useRef(null);

  // 초기화
  useEffect(() => {
    initializeApp();
  }, []);

  // 테마 적용
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('cortex_theme', theme);
  }, [theme]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setAiChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 포커스 타이머
  useEffect(() => {
    if (isTimerRunning && focusSession) {
      timerRef.current = setInterval(() => {
        setFocusTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, focusSession]);

  // 앱 초기화
  const initializeApp = async () => {
    try {
      if (api.token) {
        const userResult = await api.getCurrentUser();
        if (userResult.success) {
          setUser(userResult.user);
          setIsAuthenticated(true);
          await loadDashboardData();
        } else {
          api.removeToken();
        }
      }
    } catch (error) {
      console.error('초기화 실패:', error);
      api.removeToken();
    } finally {
      setLoading(false);
    }
  };

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    try {
      const [dashboardResult, aiResult] = await Promise.all([
        api.getDashboardSummary(),
        api.getAIInsights()
      ]);

      if (dashboardResult.success) {
        setDashboardData(dashboardResult.data);
        setNotes(dashboardResult.data.recent_notes || []);
        setEvents(dashboardResult.data.today_events || []);
      }

      if (aiResult.success) {
        setAIInsights(aiResult.data);
      }
    } catch (error) {
      console.error('대시보드 로드 실패:', error);
      showNotification('데이터를 불러오는데 실패했습니다.', 'error');
    }
  };

  // 알림 표시
  const showNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev].slice(0, 10));

    // 3초 후 자동 제거
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  // 로그인
  const handleLogin = async (email, password) => {
    try {
      const result = await api.login(email, password);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        await loadDashboardData();
        showNotification('로그인되었습니다!', 'success');
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      showNotification('로그인에 실패했습니다.', 'error');
    }
  };

  // 로그아웃
  const handleLogout = () => {
    api.removeToken();
    setUser(null);
    setIsAuthenticated(false);
    setNotes([]);
    setTasks([]);
    setEvents([]);
    setDashboardData(null);
    showNotification('로그아웃되었습니다.', 'info');
  };

  // 테마 토글
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // 검색
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const result = await api.search(query);
      if (result.success) {
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error('검색 실패:', error);
    }
  };

  // 노트 생성
  const createNote = async (noteData) => {
    try {
      const result = await api.createNote(noteData);
      if (result.success) {
        setNotes(prev => [result.data, ...prev]);
        showNotification('노트가 생성되었습니다!', 'success');
        return result.data;
      }
    } catch (error) {
      showNotification('노트 생성에 실패했습니다.', 'error');
    }
  };

  // 작업 생성
  const createTask = async (taskData) => {
    try {
      const result = await api.createTask(taskData);
      if (result.success) {
        setTasks(prev => [result.data, ...prev]);
        showNotification('작업이 생성되었습니다!', 'success');
        return result.data;
      }
    } catch (error) {
      showNotification('작업 생성에 실패했습니다.', 'error');
    }
  };

  // 작업 상태 업데이트
  const updateTaskStatus = async (taskId, status) => {
    try {
      const result = await api.updateTask(taskId, { status });
      if (result.success) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status, updated_at: new Date().toISOString() } : task
        ));
        showNotification(`작업이 ${status === 'completed' ? '완료' : '업데이트'}되었습니다!`, 'success');
      }
    } catch (error) {
      showNotification('작업 업데이트에 실패했습니다.', 'error');
    }
  };

  // 포커스 세션 시작
  const startFocusSession = async (type = 'pomodoro', duration = 25) => {
    try {
      const result = await api.startFocusSession({
        session_type: type,
        planned_duration: duration
      });
      
      if (result.success) {
        setFocusSession(result.data);
        setFocusTimer(0);
        setIsTimerRunning(true);
        showNotification(`${duration}분 집중 세션이 시작되었습니다!`, 'success');
      }
    } catch (error) {
      showNotification('집중 세션 시작에 실패했습니다.', 'error');
    }
  };

  // 포커스 세션 완료
  const completeFocusSession = async (rating = 5) => {
    if (!focusSession) return;

    try {
      const result = await api.completeFocusSession(focusSession.id, {
        quality_rating: rating,
        focus_score: Math.min(10, (focusTimer / 60) / focusSession.planned_duration * 10)
      });

      if (result.success) {
        setFocusSession(null);
        setFocusTimer(0);
        setIsTimerRunning(false);
        showNotification('집중 세션이 완료되었습니다!', 'success');
      }
    } catch (error) {
      showNotification('세션 완료 처리에 실패했습니다.', 'error');
    }
  };

  // AI 채팅
  const sendAIMessage = async (message) => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message, timestamp: new Date() };
    setAiChatMessages(prev => [...prev, userMessage]);
    setAiChatInput('');

    try {
      const result = await api.chatWithAI(message);
      if (result.success) {
        const aiMessage = { 
          role: 'assistant', 
          content: result.data.response, 
          timestamp: new Date() 
        };
        setAiChatMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: '죄송합니다. 현재 AI 서비스에 문제가 있습니다.',
        timestamp: new Date()
      };
      setAiChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cortex</h1>
          <p className="text-gray-600 dark:text-gray-400">생산성 앱을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 화면
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} api={api} />;
  }

  // 메인 앱 렌더링
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${theme}`}>
      {/* 사이드바 */}
      <Sidebar 
        isOpen={sidebarOpen}
        activeView={activeView}
        onViewChange={setActiveView}
        user={user}
        aiInsights={aiInsights}
        focusSession={focusSession}
        focusTimer={focusTimer}
        onStartFocus={startFocusSession}
      />

      {/* 메인 콘텐츠 */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* 헤더 */}
        <Header 
          user={user}
          theme={theme}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleTheme={toggleTheme}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenAIChat={() => setAiChatOpen(true)}
          onLogout={handleLogout}
          notifications={notifications}
        />

        {/* 콘텐츠 영역 */}
        <main className="p-6">
          {activeView === 'dashboard' && (
            <Dashboard 
              data={dashboardData}
              notes={notes}
              tasks={tasks}
              events={events}
              aiInsights={aiInsights}
              onCreateNote={createNote}
              onCreateTask={createTask}
              onUpdateTask={updateTaskStatus}
            />
          )}
          
          {activeView === 'notes' && (
            <NotesView 
              notes={notes}
              onCreateNote={createNote}
              onSyncToNotion={(noteId) => api.syncToNotion(noteId)}
            />
          )}
          
          {activeView === 'tasks' && (
            <TasksView 
              tasks={tasks}
              onCreateTask={createTask}
              onUpdateTask={updateTaskStatus}
            />
          )}
          
          {activeView === 'calendar' && (
            <CalendarView 
              events={events}
              onCreateEvent={(eventData) => api.createEvent(eventData)}
            />
          )}
          
          {activeView === 'analytics' && (
            <AnalyticsView analytics={analytics} />
          )}
        </main>
      </div>

      {/* 알림 */}
      <NotificationCenter notifications={notifications} />

      {/* 커맨드 팔레트 */}
      {commandPaletteOpen && (
        <CommandPalette 
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onSearch={handleSearch}
          searchResults={searchResults}
          onCreateNote={createNote}
          onCreateTask={createTask}
          onStartFocus={startFocusSession}
        />
      )}

      {/* AI 채팅 */}
      {aiChatOpen && (
        <AIChatPanel 
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          messages={aiChatMessages}
          onSendMessage={sendAIMessage}
          input={aiChatInput}
          onInputChange={setAiChatInput}
        />
      )}

      {/* 포커스 세션 타이머 */}
      {focusSession && (
        <FocusTimer 
          session={focusSession}
          timer={focusTimer}
          isRunning={isTimerRunning}
          onToggle={() => setIsTimerRunning(!isTimerRunning)}
          onComplete={completeFocusSession}
          formatTime={formatTime}
        />
      )}
    </div>
  );
};

// 로그인 화면 컴포넌트
const LoginScreen = ({ onLogin, api }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@cortex.app');
  const [password, setPassword] = useState('demo123');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        const result = await api.register(email, username, password);
        if (result.success) {
          await onLogin(email, password);
        } else {
          setError(result.message);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cortex</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isLogin ? '로그인하여 시작하세요' : '새 계정을 만드세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                사용자명
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg py-2 px-4 font-medium hover:from-purple-600 hover:to-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            {isLogin ? '새 계정 만들기' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>

        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>데모 계정:</strong> demo@cortex.app / demo123
          </p>
        </div>
      </div>
    </div>
  );
};

// 사이드바 컴포넌트
const Sidebar = ({ isOpen, activeView, onViewChange, user, aiInsights, focusSession, focusTimer, onStartFocus }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Layout },
    { id: 'notes', label: '노트', icon: Edit },
    { id: 'tasks', label: '작업', icon: CheckCircle },
    { id: 'calendar', label: '캘린더', icon: Calendar },
    { id: 'analytics', label: '분석', icon: BarChart3 },
    { id: 'settings', label: '설정', icon: Settings }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
      isOpen ? 'w-64' : 'w-16'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Cortex</h1>
              <p className="text-xs text-gray-500">v2.0 {user?.plan || 'Free'}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              activeView === item.id
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={!isOpen ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {isOpen && (
        <div className="absolute bottom-4 left-4 right-4 space-y-4">
          {/* 포커스 세션 상태 */}
          {focusSession ? (
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">집중 세션 진행 중</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {Math.floor(focusTimer / 60)}:{(focusTimer % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                목표: {focusSession.planned_duration}분
              </div>
            </div>
          ) : (
            <button
              onClick={() => onStartFocus('pomodoro', 25)}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg p-4 hover:from-green-600 hover:to-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4" />
                <span className="font-medium">포모도로 시작</span>
              </div>
              <div className="text-sm opacity-90">25분 집중 세션</div>
            </button>
          )}

          {/* AI 인사이트 */}
          {aiInsights?.latest_insight && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-800 dark:text-purple-200">AI 코칭</span>
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                집중도: {aiInsights.latest_insight.focus_score}/10
              </div>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-md py-2 text-sm font-medium transition-colors">
                자세히 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 헤더 컴포넌트
const Header = ({ user, theme, sidebarOpen, onToggleSidebar, onToggleTheme, onOpenCommandPalette, onOpenAIChat, onLogout, notifications }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>안녕하세요, {user?.username}님! 👋</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>온라인</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm text-gray-500">빠른 검색</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘K</kbd>
          </button>

          <button
            onClick={onOpenAIChat}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
            title="AI 어시스턴트"
          >
            <Brain className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{notifications.length}</span>
              </div>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-gray-900 dark:text-white">{user?.username}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
                <button className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  프로필
                </button>
                <button className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  설정
                </button>
                <hr className="my-2 border-gray-200 dark:border-gray-700" />
                <button 
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// 대시보드 컴포넌트
const Dashboard = ({ data, notes, tasks, events, aiInsights, onCreateNote, onCreateTask, onUpdateTask }) => {
  const stats = useMemo(() => {
    if (!data?.stats) return { total_tasks: 0, completed_tasks: 0, completion_rate: 0 };
    return data.stats;
  }, [data]);

  const todayEvents = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(event => new Date(event.start_time).toDateString() === today);
  }, [events]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          대시보드
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          오늘의 생산성을 한눈에 확인하세요
        </p>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="총 작업"
          value={stats.total_tasks}
          change={12}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="완료된 작업"
          value={stats.completed_tasks}
          change={8}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="진행 중인 작업"
          value={stats.in_progress_tasks || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="완료율"
          value={`${Math.round(stats.completion_rate || 0)}%`}
          change={5}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI 인사이트 */}
        <div className="lg:col-span-1">
          <AIInsightPanel aiInsights={aiInsights} />
        </div>

        {/* 최근 활동 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                최근 활동
              </h3>
              <button className="text-purple-600 hover:text-purple-700 font-medium">
                모두 보기
              </button>
            </div>
            
            <div className="space-y-4">
              {notes.slice(0, 3).map(note => (
                <div key={note.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{note.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {note.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(note.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 오늘의 일정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            오늘의 일정
          </h3>
          <button 
            onClick={() => onCreateTask({ title: '새 작업', priority: 'medium' })}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            작업 추가
          </button>
        </div>
        
        {todayEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">오늘 예정된 일정이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents.map(event => (
              <div key={event.id} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                ></div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(event.start_time).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(event.end_time).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {event.is_online && (
                  <Globe className="w-4 h-4 text-blue-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="새 노트 작성"
          description="아이디어를 즉시 기록하세요"
          icon={Edit}
          color="blue"
          onClick={() => onCreateNote({ title: '새 노트', content: '' })}
        />
        <QuickActionCard
          title="작업 추가"
          description="새로운 할 일을 등록하세요"
          icon={PlusCircle}
          color="green"
          onClick={() => onCreateTask({ title: '새 작업', priority: 'medium' })}
        />
        <QuickActionCard
          title="집중 모드"
          description="포모도로 타이머를 시작하세요"
          icon={Target}
          color="purple"
          onClick={() => {}}
        />
      </div>
    </div>
  );
};

// 통계 카드 컴포넌트
const StatCard = ({ title, value, change, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '↗' : '↘'} {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// AI 인사이트 패널
const AIInsightPanel = ({ aiInsights }) => {
  if (!aiInsights?.latest_insight) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-600 dark:text-purple-400">AI 인사이트 생성 중...</p>
        </div>
      </div>
    );
  }

  const insight = aiInsights.latest_insight;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
          <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">AI 생산성 코치</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">개인 맞춤 인사이트</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">오늘의 요약</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{insight.daily_summary}</p>
        </div>

        {insight.suggestions && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">추천 사항</h4>
            <div className="space-y-2">
              {insight.suggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-200 dark:border-purple-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {insight.focus_score}/10
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">집중도</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {insight.productivity_trend}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">트렌드</div>
          </div>
        </div>

        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 font-medium transition-colors">
          더 자세한 분석 보기
        </button>
      </div>
    </div>
  );
};

// 빠른 액션 카드
const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-900 hover:bg-purple-100 dark:hover:bg-purple-800 text-purple-600'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:scale-105 ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </button>
  );
};

// 간단한 노트 뷰 (전체 구현을 위해서는 더 많은 컴포넌트가 필요하지만 기본 구조)
const NotesView = ({ notes, onCreateNote, onSyncToNotion }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">노트</h2>
        <button
          onClick={() => onCreateNote({ title: '새 노트', content: '' })}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          새 노트
        </button>
      </div>
      
      <div className="text-center py-16">
        <Edit className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">노트 기능 구현 중</h3>
        <p className="text-gray-600 dark:text-gray-400">곧 완전한 노트 관리 기능을 제공할 예정입니다.</p>
      </div>
    </div>
  );
};

const TasksView = ({ tasks, onCreateTask, onUpdateTask }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">작업 관리</h2>
        <button
          onClick={() => onCreateTask({ title: '새 작업', priority: 'medium' })}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          작업 추가
        </button>
      </div>
      
      <div className="text-center py-16">
        <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">작업 관리 기능 구현 중</h3>
        <p className="text-gray-600 dark:text-gray-400">곧 완전한 작업 관리 기능을 제공할 예정입니다.</p>
      </div>
    </div>
  );
};

const CalendarView = ({ events, onCreateEvent }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">캘린더</h2>
        <button
          onClick={() => onCreateEvent({ title: '새 이벤트' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          이벤트 추가
        </button>
      </div>
      
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">캘린더 기능 구현 중</h3>
        <p className="text-gray-600 dark:text-gray-400">곧 완전한 캘린더 기능을 제공할 예정입니다.</p>
      </div>
    </div>
  );
};

const AnalyticsView = ({ analytics }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">생산성 분석</h2>
      
      <div className="text-center py-16">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">분석 기능 준비 중</h3>
        <p className="text-gray-600 dark:text-gray-400">곧 더 자세한 생산성 분석을 제공할 예정입니다.</p>
      </div>
    </div>
  );
};

// 포커스 타이머 컴포넌트
const FocusTimer = ({ session, timer, isRunning, onToggle, onComplete, formatTime }) => {
  const progress = (timer / 60) / session.planned_duration * 100;
  const remainingTime = (session.planned_duration * 60) - timer;

  return (
    <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-80 z-50">
      <div className="text-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">집중 세션</h3>
        <div className="text-3xl font-bold text-purple-600">
          {formatTime(remainingTime > 0 ? remainingTime : timer)}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          목표: {session.planned_duration}분
        </p>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onToggle}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? '일시정지' : '시작'}
        </button>
        
        <button
          onClick={() => onComplete(5)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          완료
        </button>
      </div>
    </div>
  );
};

// AI 채팅 패널
const AIChatPanel = ({ isOpen, onClose, messages, onSendMessage, input, onInputChange }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">AI 어시스턴트</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              안녕하세요! 생산성 향상을 도와드릴게요. 무엇을 도와드릴까요?
            </p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white ml-auto'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              onSendMessage(input);
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

// 커맨드 팔레트
const CommandPalette = ({ isOpen, onClose, onSearch, searchResults, onCreateNote, onCreateTask, onStartFocus }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    { 
      id: 'create-note', 
      label: '새 노트 작성', 
      icon: Edit, 
      action: () => onCreateNote({ title: '새 노트', content: '' }),
      category: '생성'
    },
    { 
      id: 'create-task', 
      label: '새 작업 추가', 
      icon: PlusCircle, 
      action: () => onCreateTask({ title: '새 작업', priority: 'medium' }),
      category: '생성'
    },
    { 
      id: 'start-focus', 
      label: '집중 세션 시작', 
      icon: Target, 
      action: () => onStartFocus('pomodoro', 25),
      category: '생산성'
    }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (query) {
      onSearch(query);
    }
  }, [query, onSearch]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-96 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="무엇을 찾고 계신가요?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-lg text-gray-900 dark:text-white placeholder-gray-500"
            autoFocus
          />
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">ESC</kbd>
        </div>
        
        <div className="p-2 max-h-80 overflow-y-auto">
          {!query && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                빠른 명령
              </div>
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                    index === selectedIndex 
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <cmd.icon className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium">{cmd.label}</div>
                    <div className="text-xs text-gray-500">{cmd.category}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && searchResults && (
            <div className="space-y-4">
              {searchResults.results.notes && searchResults.results.notes.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    노트 ({searchResults.results.notes.length})
                  </div>
                  {searchResults.results.notes.slice(0, 5).map(note => (
                    <div key={note.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Edit className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{note.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{note.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.results.tasks && searchResults.results.tasks.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    작업 ({searchResults.results.tasks.length})
                  </div>
                  {searchResults.results.tasks.slice(0, 5).map(task => (
                    <div key={task.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.total_results === 0 && (
                <div className="px-3 py-8 text-center text-gray-500">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 알림 센터
const NotificationCenter = ({ notifications }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.slice(0, 5).map(notification => (
        <div
          key={notification.id}
          className={`bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 max-w-sm transition-all duration-300 ${
            notification.type === 'success' ? 'border-green-200' :
            notification.type === 'error' ? 'border-red-200' :
            notification.type === 'warning' ? 'border-yellow-200' :
            'border-blue-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-1 rounded-full ${
              notification.type === 'success' ? 'bg-green-100 text-green-600' :
              notification.type === 'error' ? 'bg-red-100 text-red-600' :
              notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
               notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
               notification.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
               <Bell className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 메인 앱 내보내기
export default CortexApp;