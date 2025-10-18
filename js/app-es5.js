// Main Application - Entry point and coordination of all components (ES5 compatible)

(function() {
    'use strict';

    // ES5 compatible GanttApp constructor
    function GanttApp() {
        this.dataManager = null;
        this.ganttChart = null;
        this.taskManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    GanttApp.prototype.initialize = function() {
        var self = this;
        try {
            this.showLoadingScreen();
            
            // Initialize core components
            this.dataManager = new DataManager();
            this.uiManager = new UIManager(this.dataManager);
            
            // Wait for DOM to be ready
            this.waitForDOM().then(function() {
                // Initialize UI components
                self.initializeComponents();
                
                // Set up global event listeners
                self.setupGlobalEvents();
                
                // Initialize with sample data if no project exists
                self.initializeWithSampleData();
                
                self.isInitialized = true;
                self.hideLoadingScreen();
                
                console.log('Gantt Chart Platform initialized successfully');
            });
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Ошибка инициализации приложения: ' + error.message);
        }
    };

    GanttApp.prototype.showLoadingScreen = function() {
        var loadingScreen = Utils.createElement('div', 'loading-screen');
        loadingScreen.innerHTML = 
            '<div class="loading-content">' +
                '<div class="loading-logo">' +
                    '<i class="fas fa-chart-gantt"></i>' +
                    '<h1>Gantt Platform</h1>' +
                '</div>' +
                '<div class="loading-spinner"></div>' +
                '<p>Загрузка платформы...</p>' +
            '</div>';
        loadingScreen.id = 'loading-screen';
        document.body.appendChild(loadingScreen);
    };

    GanttApp.prototype.hideLoadingScreen = function() {
        var loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(function() {
                loadingScreen.remove();
            }, 300);
        }
    };

    GanttApp.prototype.waitForDOM = function() {
        return new Promise(function(resolve) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    };

    GanttApp.prototype.initializeComponents = function() {
        // Initialize Gantt Chart
        var ganttContainer = document.querySelector('.gantt-container');
        if (ganttContainer) {
            this.ganttChart = new GanttChart(ganttContainer, this.dataManager);
        }

        // Initialize Task Manager
        this.taskManager = new TaskManager(this.dataManager, this.uiManager);

        // Initialize other UI components
        this.initializeToolbar();
        this.initializeSidebar();
        this.initializeStatusBar();
    };

    GanttApp.prototype.initializeToolbar = function() {
        var self = this;
        
        // Zoom controls
        var zoomSelect = document.getElementById('zoom-level');
        if (zoomSelect && this.ganttChart) {
            zoomSelect.addEventListener('change', function(e) {
                self.ganttChart.setZoom(e.target.value);
            });
        }

        // Today button
        var todayBtn = document.getElementById('today-btn');
        if (todayBtn && this.ganttChart) {
            todayBtn.addEventListener('click', function() {
                self.ganttChart.goToToday();
            });
        }

        // Fit to screen button
        var fitBtn = document.getElementById('fit-to-screen');
        if (fitBtn && this.ganttChart) {
            fitBtn.addEventListener('click', function() {
                self.ganttChart.fitToScreen();
            });
        }
    };

    GanttApp.prototype.initializeSidebar = function() {
        // Search functionality
        var searchInput = this.createSearchInput();
        var taskList = document.getElementByIdTest('task-list');
        if (taskList && searchInput) {
            taskList.parentNode.insertBefore(searchInput, taskList);
        }

        // Filter functionality
        this.initializeFilters();
    };

    GanttApp.prototype.createSearchInput = function() {
        var self = this;
        var searchContainer = Utils.createElement('div', 'search-container');
        searchContainer.innerHTML = 
            '<div class="search-box">' +
                '<i class="fas fa-search search-icon"></i>' +
                '<input type="text" id="task-search" placeholder="Поиск задач..." class="search-input">' +
                '<button class="search-clear" id="clear-search">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>';

        var searchInput = searchContainer.querySelector('#task-search');
        var clearBtn = searchContainer.querySelector('#clear-search');

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(function(e) {
                self.handleSearch(e.target.value);
            }, 300));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                searchInput.value = '';
                self.handleSearch('');
            });
        }

        return searchContainer;
    };

    GanttApp.prototype.initializeFilters = function() {
        var self = this;
        var filterContainer = Utils.createElement('div', 'filter-container');
        filterContainer.innerHTML = 
            '<div class="filter-section">' +
                '<label>Фильтр по типу:</label>' +
                '<select id="type-filter" class="filter-select">' +
                    '<option value="">Все типы</option>' +
                    '<option value="task">Задачи</option>' +
                    '<option value="milestone">Вехи</option>' +
                    '<option value="summary">Сводные</option>' +
                '</select>' +
            '</div>' +
            '<div class="filter-section">' +
                '<label>Фильтр по статусу:</label>' +
                '<select id="status-filter" class="filter-select">' +
                    '<option value="">Все статусы</option>' +
                    '<option value="not-started">Не начато</option>' +
                    '<option value="in-progress">В процессе</option>' +
                    '<option value="completed">Завершено</option>' +
                '</select>' +
            '</div>' +
            '<div class="filter-section">' +
                '<label>Фильтр по приоритету:</label>' +
                '<select id="priority-filter" class="filter-select">' +
                    '<option value="">Все приоритеты</option>' +
                    '<option value="low">Низкий</option>' +
                    '<option value="medium">Средний</option>' +
                    '<option value="high">Высокий</option>' +
                    '<option value="critical">Критический</option>' +
                '</select>' +
            '</div>';

        // Add filter event listeners
        var filters = filterContainer.querySelectorAll('.filter-select');
        for (var i = 0; i < filters.length; i++) {
            filters[i].addEventListener('change', function() {
                self.handleFilterChange();
            });
        }

        // Add to sidebar
        var taskList = document.getElementById('task-list');
        if (taskList) {
            taskList.parentNode.insertBefore(filterContainer, taskList);
        }
    };

    GanttApp.prototype.initializeStatusBar = function() {
        var self = this;
        
        // Update status bar periodically
        setInterval(function() {
            self.updateStatusBar();
        }, 5000);

        // Initial update
        this.updateStatusBar();
    };

    GanttApp.prototype.updateStatusBar = function() {
        var stats = this.dataManager.getProjectStatistics();
        var statsElement = document.getElementById('project-stats');
        
        if (statsElement) {
            statsElement.textContent = 
                'Задач: ' + stats.totalTasks + ' | ' +
                'Завершено: ' + stats.completedTasks + ' | ' +
                'Прогресс: ' + Math.round(stats.progressPercentage) + '%';
        }

        // Update selected task info
        var selectedTaskInfo = document.getElementById('selected-task-info');
        if (selectedTaskInfo && this.taskManager.currentTask) {
            var task = this.taskManager.currentTask;
            selectedTaskInfo.innerHTML = 
                '<strong>' + task.name + '</strong> | ' +
                'Прогресс: ' + task.progress + '% | ' +
                Utils.formatDate(task.startDate) + ' - ' + Utils.formatDate(task.endDate);
        }
    };

    GanttApp.prototype.setupGlobalEvents = function() {
        var self = this;
        
        // Handle window resize
        window.addEventListener('resize', Utils.debounce(function() {
            self.handleResize();
        }, 250));

        // Handle keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            self.handleGlobalKeyDown(event);
        });

        // Handle data changes
        document.addEventListener('dataChange', function(event) {
            self.handleDataChange(event.detail);
        });

        // Handle task selection
        document.addEventListener('taskSelected', function(event) {
            self.handleTaskSelection(event.detail);
        });
    };

    GanttApp.prototype.handleResize = function() {
        if (this.ganttChart) {
            // Trigger chart resize
            setTimeout(function() {
                this.ganttChart.fitToScreen();
            }.bind(this), 100);
        }
    };

    GanttApp.prototype.handleGlobalKeyDown = function(event) {
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
    };

    GanttApp.prototype.handleDataChange = function(detail) {
        var type = detail.type;
        var data = detail.data;
        
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
    };

    GanttApp.prototype.handleTaskSelection = function(detail) {
        var taskId = detail.taskId;
        var task = detail.task;
        
        // Update UI to reflect selection
        this.updateTaskSelectionUI(taskId);
        
        // Update status bar
        this.updateStatusBar();
    };

    GanttApp.prototype.updateTaskSelectionUI = function(taskId) {
        // Remove previous selection
        var previousSelected = document.querySelector('.task-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Add selection to current task
        var currentSelected = document.querySelector('[data-task-id="' + taskId + '"]');
        if (currentSelected) {
            currentSelected.classList.add('selected');
        }
    };

    GanttApp.prototype.handleSearch = function(query) {
        if (this.taskManager) {
            this.taskManager.searchTasks(query);
        }
    };

    GanttApp.prototype.handleFilterChange = function() {
        var filters = {
            type: document.getElementById('type-filter') ? document.getElementById('type-filter').value : '',
            progress: document.getElementById('status-filter') ? document.getElementById('status-filter').value : '',
            priority: document.getElementById('priority-filter') ? document.getElementById('priority-filter').value : ''
        };

        if (this.taskManager) {
            this.taskManager.filterTasks(filters);
        }
    };

    GanttApp.prototype.handleEscape = function() {
        // Close any open modals
        var modals = document.querySelectorAll('.modal');
        for (var i = 0; i < modals.length; i++) {
            var modal = modals[i];
            if (modal.style.display === 'block') {
                modal.remove();
            }
        }

        // Close context menus
        var contextMenus = document.querySelectorAll('.context-menu');
        for (var i = 0; i < contextMenus.length; i++) {
            contextMenus[i].remove();
        }

        // Clear search
        var searchInput = document.getElementById('task-search');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            this.handleSearch('');
        }
    };

    GanttApp.prototype.focusSearch = function() {
        var searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    };

    GanttApp.prototype.toggleSidebar = function() {
        var sidebar = document.querySelector('.task-panel');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    };

    GanttApp.prototype.showHelp = function() {
        var shortcuts = [
            { key: 'Ctrl+N', description: 'Новый проект' },
            { key: 'Ctrl+O', description: 'Открыть проект' },
            { key: 'Ctrl+S', description: 'Сохранить проект' },
            { key: 'Ctrl+E', description: 'Экспорт проекта' },
            { key: 'Delete', description: 'Удалить выбранную задачу' },
            { key: 'F2', description: 'Редактировать задачу' }
        ];

        var content = '<div class="shortcuts-list">';
        for (var i = 0; i < shortcuts.length; i++) {
            var shortcut = shortcuts[i];
            content += 
                '<div class="shortcut-item">' +
                    '<kbd>' + shortcut.key + '</kbd>' +
                    '<span>' + shortcut.description + '</span>' +
                '</div>';
        }
        content += '</div>';

        this.uiManager.showModal(content, { title: 'Справка по платформе' });
    };

    GanttApp.prototype.initializeWithSampleData = function() {
        // Check if we have any tasks
        if (this.dataManager.tasks.length === 0) {
            // Create sample project
            this.createSampleProject();
        }
    };

    GanttApp.prototype.createSampleProject = function() {
        var sampleTasks = [
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
        var taskIds = [];
        for (var i = 0; i < sampleTasks.length; i++) {
            var task = this.dataManager.createTask(sampleTasks[i]);
            taskIds.push(task.id);
        }

        // Create some dependencies
        this.dataManager.createDependency(taskIds[0], taskIds[1]); // Planning -> Analysis
        this.dataManager.createDependency(taskIds[1], taskIds[2]); // Analysis -> Design
        this.dataManager.createDependency(taskIds[2], taskIds[3]); // Design -> Development
        this.dataManager.createDependency(taskIds[3], taskIds[4]); // Development -> Testing
        this.dataManager.createDependency(taskIds[4], taskIds[5]); // Testing -> Launch

        this.uiManager.showNotification('Создан пример проекта для демонстрации', 'info');
    };

    GanttApp.prototype.showError = function(message) {
        if (this.uiManager) {
            this.uiManager.showNotification(message, 'error');
        } else {
            alert(message);
        }
    };

    // Public API methods
    GanttApp.prototype.getDataManager = function() {
        return this.dataManager;
    };

    GanttApp.prototype.getGanttChart = function() {
        return this.ganttChart;
    };

    GanttApp.prototype.getTaskManager = function() {
        return this.taskManager;
    };

    GanttApp.prototype.getUIManager = function() {
        return this.uiManager;
    };

    // Method to add custom task types
    GanttApp.prototype.addCustomTaskType = function(type, config) {
        // Implementation for adding custom task types
        console.log('Adding custom task type:', type, config);
    };

    // Method to add custom views
    GanttApp.prototype.addCustomView = function(name, component) {
        // Implementation for adding custom views
        console.log('Adding custom view:', name, component);
    };

    // Make GanttApp globally available
    window.GanttApp = GanttApp;

})();

// Initialize the application when the page loads
var ganttApp;

document.addEventListener('DOMContentLoaded', function() {
    // Check browser support before initializing
    if (window.browserNotSupported) {
        console.error('Browser not supported, skipping app initialization');
        return;
    }
    
    ganttApp = new GanttApp();
    
    // Make app globally available for debugging
    window.ganttApp = ganttApp;
    window.taskManager = null; // Will be set after initialization
    
    // Set up global references after initialization
    setTimeout(function() {
        if (ganttApp && ganttApp.isInitialized) {
            window.taskManager = ganttApp.getTaskManager();
        }
    }, 1000);
});

// Handle page unload
window.addEventListener('beforeunload', function(event) {
    if (ganttApp && ganttApp.dataManager) {
        ganttApp.dataManager.saveToStorage();
    }
});
