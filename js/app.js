// Main Application - Entry point and coordination of all components

class GanttApp {
    constructor() {
        this.dataManager = null;
        this.ganttChart = null;
        this.taskManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            this.showLoadingScreen();
            
            // Initialize core components
            this.dataManager = new DataManager();
            this.uiManager = new UIManager(this.dataManager);
            
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Initialize UI components
            this.initializeComponents();
            
            // Set up global event listeners
            this.setupGlobalEvents();
            
            // Initialize with sample data if no project exists
            this.initializeWithSampleData();
            
            this.isInitialized = true;
            this.hideLoadingScreen();
            
            console.log('Gantt Chart Platform initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Ошибка инициализации приложения: ' + error.message);
        }
    }

    showLoadingScreen() {
        const loadingScreen = Utils.createElement('div', 'loading-screen');
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">
                    <i class="fas fa-chart-gantt"></i>
                    <h1>Gantt Platform</h1>
                </div>
                <div class="loading-spinner"></div>
                <p>Загрузка платформы...</p>
            </div>
        `;
        loadingScreen.id = 'loading-screen';
        document.body.appendChild(loadingScreen);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.remove();
            }, 300);
        }
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    initializeComponents() {
        // Initialize Gantt Chart
        const ganttContainer = document.querySelector('.gantt-container');
        if (ganttContainer) {
            this.ganttChart = new GanttChart(ganttContainer, this.dataManager);
        }

        // Initialize Task Manager
        this.taskManager = new TaskManager(this.dataManager, this.uiManager);

        // Initialize other UI components
        this.initializeToolbar();
        this.initializeSidebar();
        this.initializeStatusBar();
    }

    initializeToolbar() {
        // Zoom controls
        const zoomSelect = document.getElementById('zoom-level');
        if (zoomSelect && this.ganttChart) {
            zoomSelect.addEventListener('change', (e) => {
                this.ganttChart.setZoom(e.target.value);
            });
        }

        // Today button
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn && this.ganttChart) {
            todayBtn.addEventListener('click', () => {
                this.ganttChart.goToToday();
            });
        }

        // Fit to screen button
        const fitBtn = document.getElementById('fit-to-screen');
        if (fitBtn && this.ganttChart) {
            fitBtn.addEventListener('click', () => {
                this.ganttChart.fitToScreen();
            });
        }
    }

    initializeSidebar() {
        // Search functionality
        const searchInput = this.createSearchInput();
        const taskList = document.getElementById('task-list');
        if (taskList && searchInput) {
            taskList.parentNode.insertBefore(searchInput, taskList);
        }

        // Filter functionality
        this.initializeFilters();
    }

    createSearchInput() {
        const searchContainer = Utils.createElement('div', 'search-container');
        searchContainer.innerHTML = `
            <div class="search-box">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="task-search" placeholder="Поиск задач..." class="search-input">
                <button class="search-clear" id="clear-search">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const searchInput = searchContainer.querySelector('#task-search');
        const clearBtn = searchContainer.querySelector('#clear-search');

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.handleSearch('');
            });
        }

        return searchContainer;
    }

    initializeFilters() {
        const filterContainer = Utils.createElement('div', 'filter-container');
        filterContainer.innerHTML = `
            <div class="filter-section">
                <label>Фильтр по типу:</label>
                <select id="type-filter" class="filter-select">
                    <option value="">Все типы</option>
                    <option value="task">Задачи</option>
                    <option value="milestone">Вехи</option>
                    <option value="summary">Сводные</option>
                </select>
            </div>
            <div class="filter-section">
                <label>Фильтр по статусу:</label>
                <select id="status-filter" class="filter-select">
                    <option value="">Все статусы</option>
                    <option value="not-started">Не начато</option>
                    <option value="in-progress">В процессе</option>
                    <option value="completed">Завершено</option>
                </select>
            </div>
            <div class="filter-section">
                <label>Фильтр по приоритету:</label>
                <select id="priority-filter" class="filter-select">
                    <option value="">Все приоритеты</option>
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критический</option>
                </select>
            </div>
        `;

        // Add filter event listeners
        const filters = filterContainer.querySelectorAll('.filter-select');
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.handleFilterChange();
            });
        });

        // Add to sidebar
        const taskList = document.getElementById('task-list');
        if (taskList) {
            taskList.parentNode.insertBefore(filterContainer, taskList);
        }
    }

    initializeStatusBar() {
        // Update status bar periodically
        setInterval(() => {
            this.updateStatusBar();
        }, 5000);

        // Initial update
        this.updateStatusBar();
    }

    updateStatusBar() {
        const stats = this.dataManager.getProjectStatistics();
        const statsElement = document.getElementById('project-stats');
        
        if (statsElement) {
            statsElement.textContent = `
                Задач: ${stats.totalTasks} | 
                Завершено: ${stats.completedTasks} | 
                Прогресс: ${Math.round(stats.progressPercentage)}%
            `;
        }

        // Update selected task info
        const selectedTaskInfo = document.getElementById('selected-task-info');
        if (selectedTaskInfo && this.taskManager.currentTask) {
            const task = this.taskManager.currentTask;
            selectedTaskInfo.innerHTML = `
                <strong>${task.name}</strong> | 
                Прогресс: ${task.progress}% | 
                ${Utils.formatDate(task.startDate)} - ${Utils.formatDate(task.endDate)}
            `;
        }
    }

    setupGlobalEvents() {
        // Handle window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleGlobalKeyDown(event);
        });

        // Handle data changes
        document.addEventListener('dataChange', (event) => {
            this.handleDataChange(event.detail);
        });

        // Handle task selection
        document.addEventListener('taskSelected', (event) => {
            this.handleTaskSelection(event.detail);
        });
    }

    handleResize() {
        if (this.ganttChart) {
            // Trigger chart resize
            setTimeout(() => {
                this.ganttChart.fitToScreen();
            }, 100);
        }
    }

    handleGlobalKeyDown(event) {
        // Global keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '/':
                    event.preventDefault();
                    this.showHelp();
                    break;
                case 'k':
                    event.preventDefault();
                    this.focusSearch();
                    break;
                case 'h':
                    event.preventDefault();
                    this.toggleSidebar();
                    break;
            }
        }

        // Escape key
        if (event.key === 'Escape') {
            this.handleEscape();
        }

        // F1 key for help
        if (event.key === 'F1') {
            event.preventDefault();
            this.showHelp();
        }
    }

    handleDataChange(detail) {
        const { type, data } = detail;
        
        switch (type) {
            case 'project-loaded':
                this.uiManager.showNotification('Проект загружен', 'success');
                break;
            case 'project-saved':
                this.uiManager.showNotification('Проект сохранен', 'success');
                break;
            case 'task-created':
                this.uiManager.showNotification('Задача создана', 'success');
                break;
            case 'task-updated':
                this.uiManager.showNotification('Задача обновлена', 'info');
                break;
            case 'task-deleted':
                this.uiManager.showNotification('Задача удалена', 'warning');
                break;
        }
    }

    handleTaskSelection(detail) {
        const { taskId, task } = detail;
        
        // Update UI to reflect selection
        this.updateTaskSelectionUI(taskId);
        
        // Update status bar
        this.updateStatusBar();
    }

    updateTaskSelectionUI(taskId) {
        // Remove previous selection
        const previousSelected = document.querySelector('.task-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Add selection to current task
        const currentSelected = document.querySelector(`[data-task-id="${taskId}"]`);
        if (currentSelected) {
            currentSelected.classList.add('selected');
        }
    }

    handleSearch(query) {
        if (this.taskManager) {
            this.taskManager.searchTasks(query);
        }
    }

    handleFilterChange() {
        const filters = {
            type: document.getElementById('type-filter')?.value || '',
            progress: document.getElementById('status-filter')?.value || '',
            priority: document.getElementById('priority-filter')?.value || ''
        };

        if (this.taskManager) {
            this.taskManager.filterTasks(filters);
        }
    }

    handleEscape() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                modal.remove();
            }
        });

        // Close context menus
        const contextMenus = document.querySelectorAll('.context-menu');
        contextMenus.forEach(menu => menu.remove());

        // Clear search
        const searchInput = document.getElementById('task-search');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            this.handleSearch('');
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.task-panel');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    showHelp() {
        const helpContent = `
            <div class="help-content">
                <h3>Горячие клавиши</h3>
                <div class="shortcuts-grid">
                    <div class="shortcut-item">
                        <kbd>Ctrl+N</kbd>
                        <span>Новый проект</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+O</kbd>
                        <span>Открыть проект</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+S</kbd>
                        <span>Сохранить проект</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+E</kbd>
                        <span>Экспорт проекта</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Delete</kbd>
                        <span>Удалить задачу</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+K</kbd>
                        <span>Поиск задач</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl+H</kbd>
                        <span>Скрыть/показать панель</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Esc</kbd>
                        <span>Закрыть модальные окна</span>
                    </div>
                </div>
                
                <h3>Основные функции</h3>
                <ul>
                    <li>Создание и редактирование задач</li>
                    <li>Управление зависимостями между задачами</li>
                    <li>Отслеживание прогресса выполнения</li>
                    <li>Экспорт проектов в различных форматах</li>
                    <li>Поиск и фильтрация задач</li>
                    <li>Управление временной шкалой</li>
                </ul>
            </div>
        `;

        this.uiManager.showModal(helpContent, { title: 'Справка по платформе' });
    }

    initializeWithSampleData() {
        // Check if we have any tasks
        if (this.dataManager.tasks.length === 0) {
            // Create sample project
            this.createSampleProject();
        }
    }

    createSampleProject() {
        const sampleTasks = [
            {
                name: 'Планирование проекта',
                description: 'Определение целей и задач проекта',
                type: 'task',
                startDate: new Date(),
                duration: 3,
                priority: 'high',
                assignee: 'Менеджер проекта'
            },
            {
                name: 'Анализ требований',
                description: 'Сбор и анализ требований заказчика',
                type: 'task',
                startDate: Utils.addDays(new Date(), 3),
                duration: 5,
                priority: 'high',
                assignee: 'Аналитик'
            },
            {
                name: 'Техническое проектирование',
                description: 'Создание технической архитектуры',
                type: 'task',
                startDate: Utils.addDays(new Date(), 8),
                duration: 7,
                priority: 'medium',
                assignee: 'Архитектор'
            },
            {
                name: 'Разработка MVP',
                description: 'Создание минимально жизнеспособного продукта',
                type: 'summary',
                startDate: Utils.addDays(new Date(), 15),
                duration: 14,
                priority: 'critical',
                assignee: 'Команда разработки'
            },
            {
                name: 'Тестирование',
                description: 'Проведение тестирования системы',
                type: 'task',
                startDate: Utils.addDays(new Date(), 29),
                duration: 5,
                priority: 'high',
                assignee: 'Тестировщик'
            },
            {
                name: 'Запуск проекта',
                description: 'Финальный запуск проекта в продакшн',
                type: 'milestone',
                startDate: Utils.addDays(new Date(), 34),
                duration: 1,
                priority: 'critical',
                assignee: 'Менеджер проекта'
            }
        ];

        // Create tasks
        const taskIds = sampleTasks.map(taskData => {
            const task = this.dataManager.createTask(taskData);
            return task.id;
        });

        // Create some dependencies
        this.dataManager.createDependency(taskIds[0], taskIds[1]); // Planning -> Analysis
        this.dataManager.createDependency(taskIds[1], taskIds[2]); // Analysis -> Design
        this.dataManager.createDependency(taskIds[2], taskIds[3]); // Design -> Development
        this.dataManager.createDependency(taskIds[3], taskIds[4]); // Development -> Testing
        this.dataManager.createDependency(taskIds[4], taskIds[5]); // Testing -> Launch

        this.uiManager.showNotification('Создан пример проекта для демонстрации', 'info');
    }

    showError(message) {
        if (this.uiManager) {
            this.uiManager.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    // Public API methods
    getDataManager() {
        return this.dataManager;
    }

    getGanttChart() {
        return this.ganttChart;
    }

    getTaskManager() {
        return this.taskManager;
    }

    getUIManager() {
        return this.uiManager;
    }

    // Method to add custom task types
    addCustomTaskType(type, config) {
        // Implementation for adding custom task types
        console.log('Adding custom task type:', type, config);
    }

    // Method to add custom views
    addCustomView(name, component) {
        // Implementation for adding custom views
        console.log('Adding custom view:', name, component);
    }
}

// Initialize the application when the page loads
let ganttApp;

document.addEventListener('DOMContentLoaded', () => {
    ganttApp = new GanttApp();
    
    // Make app globally available for debugging
    window.ganttApp = ganttApp;
    window.taskManager = null; // Will be set after initialization
    
    // Set up global references after initialization
    setTimeout(() => {
        if (ganttApp && ganttApp.isInitialized) {
            window.taskManager = ganttApp.getTaskManager();
        }
    }, 1000);
});

// Handle page unload
window.addEventListener('beforeunload', (event) => {
    if (ganttApp && ganttApp.dataManager) {
        ganttApp.dataManager.saveToStorage();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttApp;
}
