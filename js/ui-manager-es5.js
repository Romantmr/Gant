// UI Manager - Handles user interface interactions and notifications (ES5 compatible)

(function() {
    'use strict';

    // ES5 compatible UIManager constructor
    function UIManager(dataManager) {
        this.dataManager = dataManager;
        this.notifications = [];
        this.currentTheme = 'light';
        this.sidebarCollapsed = false;
        
        this.initialize();
        this.setupEventListeners();
    }

    UIManager.prototype.initialize = function() {
        this.createNotificationContainer();
        this.setupTheme();
        this.updateProjectInfo();
        this.setupFileHandlers();
    };

    UIManager.prototype.setupEventListeners = function() {
        var self = this;
        
        // Project management events
        var newProjectBtn = document.getElementById('new-project');
        var openProjectBtn = document.getElementById('open-project');
        var saveProjectBtn = document.getElementById('save-project');
        var exportProjectBtn = document.getElementById('export-project');
        var renameProjectBtn = document.getElementById('rename-project');

        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', function() { self.showNewProjectDialog(); });
        }

        if (openProjectBtn) {
            openProjectBtn.addEventListener('click', function() { self.openProjectFile(); });
        }

        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', function() { self.saveProject(); });
        }

        if (exportProjectBtn) {
            exportProjectBtn.addEventListener('click', function() { self.showExportDialog(); });
        }

        if (renameProjectBtn) {
            renameProjectBtn.addEventListener('click', function() { self.showRenameProjectDialog(); });
        }

        // Toolbar events
        var collapseAllBtn = document.getElementById('collapse-all');
        var expandAllBtn = document.getElementById('expand-all');

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', function() { self.collapseAllTasks(); });
        }

        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', function() { self.expandAllTasks(); });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 's':
                        event.preventDefault();
                        self.saveProject();
                        break;
                    case 'o':
                        event.preventDefault();
                        self.openProjectFile();
                        break;
                    case 'n':
                        event.preventDefault();
                        self.showNewProjectDialog();
                        break;
                    case 'e':
                        event.preventDefault();
                        self.showExportDialog();
                        break;
                }
            }
        });

        // Data change events
        document.addEventListener('dataChange', function(event) {
            var type = event.detail.type;
            if (type === 'project-loaded' || type === 'project-created') {
                self.updateProjectInfo();
                self.updateProjectStats();
            } else if (type === 'task-created' || type === 'task-updated' || type === 'task-deleted') {
                self.updateProjectStats();
            }
        });

        // Window events
        window.addEventListener('beforeunload', function(event) {
            if (self.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            }
        });

        // Resize events
        window.addEventListener('resize', Utils.debounce(function() {
            self.handleResize();
        }, 250));
    };

    UIManager.prototype.createNotificationContainer = function() {
        var container = document.getElementById('notification-container');
        if (!container) {
            container = Utils.createElement('div', 'notification-container');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
    };

    UIManager.prototype.setupTheme = function() {
        var savedTheme = Utils.loadFromStorage('gantt-theme', 'light');
        this.setTheme(savedTheme);
    };

    UIManager.prototype.setTheme = function(theme) {
        this.currentTheme = theme;
        document.body.className = 'theme-' + theme;
        Utils.saveToStorage('gantt-theme', theme);
    };

    UIManager.prototype.toggleTheme = function() {
        var newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    };

    UIManager.prototype.setupFileHandlers = function() {
        var self = this;
        var fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(event) {
                var file = event.target.files[0];
                if (file) {
                    self.loadProjectFromFile(file);
                }
            });
        }

        // Drag and drop support
        document.addEventListener('dragover', function(event) {
            event.preventDefault();
        });

        document.addEventListener('drop', function(event) {
            event.preventDefault();
            var files = event.dataTransfer.files;
            if (files.length > 0) {
                self.loadProjectFromFile(files[0]);
            }
        });
    };

    UIManager.prototype.updateProjectInfo = function() {
        var projectNameElement = document.getElementById('project-name');
        if (projectNameElement && this.dataManager.currentProject) {
            projectNameElement.textContent = this.dataManager.currentProject.name;
        }
    };

    UIManager.prototype.updateProjectStats = function() {
        var statsElement = document.getElementById('project-stats');
        if (statsElement) {
            var stats = this.dataManager.getProjectStatistics();
            statsElement.textContent = 'Задач: ' + stats.totalTasks + ' | Завершено: ' + stats.completedTasks;
        }
    };

    // Project management dialogs
    UIManager.prototype.showNewProjectDialog = function() {
        var name = prompt('Введите название нового проекта:', 'Новый проект');
        if (name && name.trim()) {
            if (this.hasUnsavedChanges()) {
                if (confirm('У вас есть несохраненные изменения. Создать новый проект?')) {
                    this.dataManager.createNewProject(name.trim());
                    this.showNotification('Новый проект создан', 'success');
                }
            } else {
                this.dataManager.createNewProject(name.trim());
                this.showNotification('Новый проект создан', 'success');
            }
        }
    };

    UIManager.prototype.showRenameProjectDialog = function() {
        var currentName = this.dataManager.currentProject ? this.dataManager.currentProject.name : '';
        var newName = prompt('Введите новое название проекта:', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            this.dataManager.currentProject.name = newName.trim();
            this.dataManager.currentProject.updatedAt = new Date();
            this.dataManager.saveToStorage();
            this.updateProjectInfo();
            this.showNotification('Проект переименован', 'success');
        }
    };

    UIManager.prototype.saveProject = function() {
        var result = this.dataManager.saveProject();
        if (result.success) {
            this.showNotification('Проект сохранен', 'success');
        } else {
            this.showNotification('Ошибка при сохранении: ' + result.error, 'error');
        }
    };

    UIManager.prototype.openProjectFile = function() {
        var fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    };

    UIManager.prototype.loadProjectFromFile = function(file) {
        if (!file) return;

        var fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'json') {
            this.loadJSONProject(file);
        } else if (fileExtension === 'csv') {
            this.loadCSVProject(file);
        } else {
            this.showNotification('Неподдерживаемый формат файла', 'error');
        }
    };

    UIManager.prototype.loadJSONProject = function(file) {
        var self = this;
        Utils.readFileAsText(file).then(function(text) {
            try {
                var projectData = JSON.parse(text);
                
                if (self.hasUnsavedChanges()) {
                    if (!confirm('У вас есть несохраненные изменения. Загрузить новый проект?')) {
                        return;
                    }
                }

                var result = self.dataManager.loadProject(projectData);
                if (result.success) {
                    self.showNotification('Проект загружен', 'success');
                } else {
                    self.showNotification('Ошибка при загрузке: ' + result.error, 'error');
                }
            } catch (error) {
                self.showNotification('Ошибка при чтении файла: ' + error.message, 'error');
            }
        }).catch(function(error) {
            self.showNotification('Ошибка при чтении файла: ' + error.message, 'error');
        });
    };

    UIManager.prototype.loadCSVProject = function(file) {
        var self = this;
        Utils.readFileAsText(file).then(function(text) {
            // CSV parsing logic would go here
            self.showNotification('CSV импорт пока не поддерживается', 'warning');
        }).catch(function(error) {
            self.showNotification('Ошибка при чтении CSV файла: ' + error.message, 'error');
        });
    };

    UIManager.prototype.showExportDialog = function() {
        var modal = this.createExportModal();
        document.body.appendChild(modal);
        
        // Focus modal
        setTimeout(function() {
            modal.style.display = 'block';
            var firstButton = modal.querySelector('button');
            if (firstButton) firstButton.focus();
        }, 100);
    };

    UIManager.prototype.createExportModal = function() {
        var modal = Utils.createElement('div', 'modal');
        modal.innerHTML = 
            '<div class="modal-content">' +
                '<div class="modal-header">' +
                    '<h2>Экспорт проекта</h2>' +
                    '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">' +
                        '<i class="fas fa-times"></i>' +
                    '</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<p>Выберите формат для экспорта проекта:</p>' +
                    '<div class="export-options">' +
                        '<button class="btn btn-primary export-json">' +
                            '<i class="fas fa-file-code"></i> JSON' +
                        '</button>' +
                        '<button class="btn btn-secondary export-csv">' +
                            '<i class="fas fa-file-csv"></i> CSV' +
                        '</button>' +
                        '<button class="btn btn-info export-pdf">' +
                            '<i class="fas fa-file-pdf"></i> PDF' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<button class="btn btn-secondary" onclick="this.closest(\'.modal\').remove()">' +
                        'Отмена' +
                    '</button>' +
                '</div>' +
            '</div>';

        // Add event listeners
        var self = this;
        modal.querySelector('.export-json').addEventListener('click', function() {
            self.exportProject('json');
            modal.remove();
        });

        modal.querySelector('.export-csv').addEventListener('click', function() {
            self.exportProject('csv');
            modal.remove();
        });

        modal.querySelector('.export-pdf').addEventListener('click', function() {
            self.exportProject('pdf');
            modal.remove();
        });

        return modal;
    };

    UIManager.prototype.exportProject = function(format) {
        try {
            var result = this.dataManager.exportProject(format);
            if (result.success) {
                this.showNotification('Проект экспортирован как ' + result.filename, 'success');
            } else {
                this.showNotification('Ошибка при экспорте: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка при экспорте: ' + error.message, 'error');
        }
    };

    // Task management UI
    UIManager.prototype.collapseAllTasks = function() {
        for (var i = 0; i < this.dataManager.tasks.length; i++) {
            var task = this.dataManager.tasks[i];
            if (task.expanded) {
                this.dataManager.updateTask(task.id, { expanded: false });
            }
        }
        this.showNotification('Все задачи свернуты', 'info');
    };

    UIManager.prototype.expandAllTasks = function() {
        for (var i = 0; i < this.dataManager.tasks.length; i++) {
            var task = this.dataManager.tasks[i];
            if (!task.expanded) {
                this.dataManager.updateTask(task.id, { expanded: true });
            }
        }
        this.showNotification('Все задачи развернуты', 'info');
    };

    // Notification system
    UIManager.prototype.showNotification = function(message, type, duration) {
        type = type || 'info';
        duration = duration || 5000;
        
        var notification = Utils.createElement('div', 'notification notification-' + type);
        notification.innerHTML = 
            '<div class="notification-content">' +
                '<i class="fas fa-' + this.getNotificationIcon(type) + '"></i>' +
                '<span>' + message + '</span>' +
                '<button class="notification-close" onclick="this.parentElement.parentElement.remove()">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>';

        var container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Animate in
        setTimeout(function() {
            notification.classList.add('show');
        }, 100);

        // Auto remove
        if (duration > 0) {
            var self = this;
            setTimeout(function() {
                self.removeNotification(notification);
            }, duration);
        }

        this.notifications.push(notification);
    };

    UIManager.prototype.removeNotification = function(notification) {
        notification.classList.remove('show');
        var self = this;
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            var index = self.notifications.indexOf(notification);
            if (index > -1) {
                self.notifications.splice(index, 1);
            }
        }, 300);
    };

    UIManager.prototype.getNotificationIcon = function(type) {
        var icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    };

    // Loading states
    UIManager.prototype.showLoading = function(message) {
        message = message || 'Загрузка...';
        var loading = Utils.createElement('div', 'loading-overlay');
        loading.innerHTML = 
            '<div class="loading-spinner"></div>' +
            '<div class="loading-message">' + message + '</div>';
        loading.id = 'loading-overlay';
        document.body.appendChild(loading);
    };

    UIManager.prototype.hideLoading = function() {
        var loading = document.getElementById('loading-overlay');
        if (loading) {
            loading.remove();
        }
    };

    // Utility methods
    UIManager.prototype.hasUnsavedChanges = function() {
        // Check if there are unsaved changes
        // This could be implemented by tracking modification timestamps
        return false; // Simplified for now
    };

    UIManager.prototype.handleResize = function() {
        // Handle window resize events
        var event = new CustomEvent('ganttResize');
        document.dispatchEvent(event);
    };

    // Context menu system
    UIManager.prototype.showContextMenu = function(event, items) {
        var existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        var menu = Utils.createElement('div', 'context-menu');
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var menuItem = Utils.createElement('div', 'context-menu-item');
            menuItem.innerHTML = 
                '<i class="' + item.icon + '"></i>' +
                '<span>' + item.text + '</span>';

            if (item.disabled) {
                menuItem.classList.add('disabled');
            } else {
                menuItem.addEventListener('click', function(action) {
                    return function() {
                        action();
                        menu.remove();
                    };
                }(item.action));
            }

            menu.appendChild(menuItem);
        }

        document.body.appendChild(menu);

        // Close on outside click
        var closeMenu = function(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(function() {
            document.addEventListener('click', closeMenu);
        }, 100);
    };

    // Tooltip system
    UIManager.prototype.showTooltip = function(element, content, position) {
        position = position || 'top';
        var tooltip = Utils.createElement('div', 'tooltip tooltip-' + position);
        tooltip.textContent = content;
        document.body.appendChild(tooltip);

        var rect = element.getBoundingClientRect();
        var tooltipRect = tooltip.getBoundingClientRect();

        var left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        var top = rect.top - tooltipRect.height - 8;

        if (position === 'bottom') {
            top = rect.bottom + 8;
        }

        // Adjust if tooltip goes off screen
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('show');

        return tooltip;
    };

    UIManager.prototype.hideTooltip = function(tooltip) {
        if (tooltip && tooltip.parentNode) {
            tooltip.remove();
        }
    };

    // Modal system
    UIManager.prototype.showModal = function(content, options) {
        options = options || {};
        var modal = Utils.createElement('div', 'modal');
        modal.innerHTML = 
            '<div class="modal-content">' +
                '<div class="modal-header">' +
                    '<h2>' + (options.title || '') + '</h2>' +
                    '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">' +
                        '<i class="fas fa-times"></i>' +
                    '</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    content +
                '</div>' +
                (options.footer || '') +
            '</div>';

        document.body.appendChild(modal);
        
        setTimeout(function() {
            modal.style.display = 'block';
        }, 100);

        return modal;
    };

    // Keyboard shortcuts help
    UIManager.prototype.showKeyboardShortcuts = function() {
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

        this.showModal(content, { title: 'Горячие клавиши' });
    };

    // Make UIManager globally available
    window.UIManager = UIManager;

})();
