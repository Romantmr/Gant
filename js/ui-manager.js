// UI Manager - Handles user interface interactions and notifications

(function() {
    'use strict';

class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.notifications = [];
        this.currentTheme = 'light';
        this.sidebarCollapsed = false;
        
        this.initialize();
        this.setupEventListeners();
    }

    initialize() {
        this.createNotificationContainer();
        this.setupTheme();
        this.updateProjectInfo();
        this.setupFileHandlers();
    }

    setupEventListeners() {
        // Project management events
        const newProjectBtn = document.getElementById('new-project');
        const openProjectBtn = document.getElementById('open-project');
        const saveProjectBtn = document.getElementById('save-project');
        const exportProjectBtn = document.getElementById('export-project');
        const renameProjectBtn = document.getElementById('rename-project');

        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => this.showNewProjectDialog());
        }

        if (openProjectBtn) {
            openProjectBtn.addEventListener('click', () => this.openProjectFile());
        }

        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', () => this.saveProject());
        }

        if (exportProjectBtn) {
            exportProjectBtn.addEventListener('click', () => this.showExportDialog());
        }

        if (renameProjectBtn) {
            renameProjectBtn.addEventListener('click', () => this.showRenameProjectDialog());
        }

        // Toolbar events
        const collapseAllBtn = document.getElementById('collapse-all');
        const expandAllBtn = document.getElementById('expand-all');

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAllTasks());
        }

        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAllTasks());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 's':
                        event.preventDefault();
                        this.saveProject();
                        break;
                    case 'o':
                        event.preventDefault();
                        this.openProjectFile();
                        break;
                    case 'n':
                        event.preventDefault();
                        this.showNewProjectDialog();
                        break;
                    case 'e':
                        event.preventDefault();
                        this.showExportDialog();
                        break;
                }
            }
        });

        // Data change events
        document.addEventListener('dataChange', (event) => {
            const { type } = event.detail;
            if (type === 'project-loaded' || type === 'project-created') {
                this.updateProjectInfo();
                this.updateProjectStats();
            } else if (['task-created', 'task-updated', 'task-deleted'].includes(type)) {
                this.updateProjectStats();
            }
        });

        // Window events
        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            }
        });

        // Resize events
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));
    }

    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = Utils.createElement('div', 'notification-container');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
    }

    setupTheme() {
        const savedTheme = Utils.loadFromStorage('gantt-theme', 'light');
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        Utils.saveToStorage('gantt-theme', theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setupFileHandlers() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.loadProjectFromFile(file);
                }
            });
        }

        // Drag and drop support
        document.addEventListener('dragover', (event) => {
            event.preventDefault();
        });

        document.addEventListener('drop', (event) => {
            event.preventDefault();
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.loadProjectFromFile(files[0]);
            }
        });
    }

    updateProjectInfo() {
        const projectNameElement = document.getElementById('project-name');
        if (projectNameElement && this.dataManager.currentProject) {
            projectNameElement.textContent = this.dataManager.currentProject.name;
        }
    }

    updateProjectStats() {
        const statsElement = document.getElementById('project-stats');
        if (statsElement) {
            const stats = this.dataManager.getProjectStatistics();
            statsElement.textContent = `Задач: ${stats.totalTasks} | Завершено: ${stats.completedTasks}`;
        }
    }

    // Project management dialogs
    showNewProjectDialog() {
        const name = prompt('Введите название нового проекта:', 'Новый проект');
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
    }

    showRenameProjectDialog() {
        const currentName = this.dataManager.currentProject?.name || '';
        const newName = prompt('Введите новое название проекта:', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            this.dataManager.currentProject.name = newName.trim();
            this.dataManager.currentProject.updatedAt = new Date();
            this.dataManager.saveToStorage();
            this.updateProjectInfo();
            this.showNotification('Проект переименован', 'success');
        }
    }

    saveProject() {
        const result = this.dataManager.saveProject();
        if (result.success) {
            this.showNotification('Проект сохранен', 'success');
        } else {
            this.showNotification('Ошибка при сохранении: ' + result.error, 'error');
        }
    }

    openProjectFile() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    loadProjectFromFile(file) {
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'json') {
            this.loadJSONProject(file);
        } else if (fileExtension === 'csv') {
            this.loadCSVProject(file);
        } else {
            this.showNotification('Неподдерживаемый формат файла', 'error');
        }
    }

    async loadJSONProject(file) {
        try {
            const text = await Utils.readFileAsText(file);
            const projectData = JSON.parse(text);
            
            if (this.hasUnsavedChanges()) {
                if (!confirm('У вас есть несохраненные изменения. Загрузить новый проект?')) {
                    return;
                }
            }

            const result = this.dataManager.loadProject(projectData);
            if (result.success) {
                this.showNotification('Проект загружен', 'success');
            } else {
                this.showNotification('Ошибка при загрузке: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка при чтении файла: ' + error.message, 'error');
        }
    }

    async loadCSVProject(file) {
        try {
            const text = await Utils.readFileAsText(file);
            // CSV parsing logic would go here
            this.showNotification('CSV импорт пока не поддерживается', 'warning');
        } catch (error) {
            this.showNotification('Ошибка при чтении CSV файла: ' + error.message, 'error');
        }
    }

    showExportDialog() {
        const modal = this.createExportModal();
        document.body.appendChild(modal);
        
        // Focus modal
        setTimeout(() => {
            modal.style.display = 'block';
            const firstButton = modal.querySelector('button');
            if (firstButton) firstButton.focus();
        }, 100);
    }

    createExportModal() {
        const modal = Utils.createElement('div', 'modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Экспорт проекта</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Выберите формат для экспорта проекта:</p>
                    <div class="export-options">
                        <button class="btn btn-primary export-json">
                            <i class="fas fa-file-code"></i> JSON
                        </button>
                        <button class="btn btn-secondary export-csv">
                            <i class="fas fa-file-csv"></i> CSV
                        </button>
                        <button class="btn btn-info export-pdf">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Отмена
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.export-json').addEventListener('click', () => {
            this.exportProject('json');
            modal.remove();
        });

        modal.querySelector('.export-csv').addEventListener('click', () => {
            this.exportProject('csv');
            modal.remove();
        });

        modal.querySelector('.export-pdf').addEventListener('click', () => {
            this.exportProject('pdf');
            modal.remove();
        });

        return modal;
    }

    exportProject(format) {
        try {
            const result = this.dataManager.exportProject(format);
            if (result.success) {
                this.showNotification(`Проект экспортирован как ${result.filename}`, 'success');
            } else {
                this.showNotification('Ошибка при экспорте: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка при экспорте: ' + error.message, 'error');
        }
    }

    // Task management UI
    collapseAllTasks() {
        this.dataManager.tasks.forEach(task => {
            if (task.expanded) {
                this.dataManager.updateTask(task.id, { expanded: false });
            }
        });
        this.showNotification('Все задачи свернуты', 'info');
    }

    expandAllTasks() {
        this.dataManager.tasks.forEach(task => {
            if (!task.expanded) {
                this.dataManager.updateTask(task.id, { expanded: true });
            }
        });
        this.showNotification('Все задачи развернуты', 'info');
    }

    // Notification system
    showNotification(message, type = 'info', duration = 5000) {
        const notification = Utils.createElement('div', `notification notification-${type}`);
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        this.notifications.push(notification);
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Loading states
    showLoading(message = 'Загрузка...') {
        const loading = Utils.createElement('div', 'loading-overlay');
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        loading.id = 'loading-overlay';
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('loading-overlay');
        if (loading) {
            loading.remove();
        }
    }

    // Utility methods
    hasUnsavedChanges() {
        // Check if there are unsaved changes
        // This could be implemented by tracking modification timestamps
        return false; // Simplified for now
    }

    handleResize() {
        // Handle window resize events
        const event = new CustomEvent('ganttResize');
        document.dispatchEvent(event);
    }

    // Context menu system
    showContextMenu(event, items) {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = Utils.createElement('div', 'context-menu');
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        items.forEach(item => {
            const menuItem = Utils.createElement('div', 'context-menu-item');
            menuItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            `;

            if (item.disabled) {
                menuItem.classList.add('disabled');
            } else {
                menuItem.addEventListener('click', () => {
                    item.action();
                    menu.remove();
                });
            }

            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // Close on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    // Tooltip system
    showTooltip(element, content, position = 'top') {
        const tooltip = Utils.createElement('div', `tooltip tooltip-${position}`);
        tooltip.textContent = content;
        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 8;

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
    }

    hideTooltip(tooltip) {
        if (tooltip && tooltip.parentNode) {
            tooltip.remove();
        }
    }

    // Modal system
    showModal(content, options = {}) {
        const modal = Utils.createElement('div', 'modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${options.title || ''}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.footer || ''}
            </div>
        `;

        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.display = 'block';
        }, 100);

        return modal;
    }

    // Keyboard shortcuts help
    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Ctrl+N', description: 'Новый проект' },
            { key: 'Ctrl+O', description: 'Открыть проект' },
            { key: 'Ctrl+S', description: 'Сохранить проект' },
            { key: 'Ctrl+E', description: 'Экспорт проекта' },
            { key: 'Delete', description: 'Удалить выбранную задачу' },
            { key: 'F2', description: 'Редактировать задачу' }
        ];

        const content = `
            <div class="shortcuts-list">
                ${shortcuts.map(shortcut => `
                    <div class="shortcut-item">
                        <kbd>${shortcut.key}</kbd>
                        <span>${shortcut.description}</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.showModal(content, { title: 'Горячие клавиши' });
    }
}

// Add notification styles if not already present
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .notification {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 16px;
            min-width: 300px;
            max-width: 400px;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .notification-success {
            border-left: 4px solid #10b981;
        }
        
        .notification-error {
            border-left: 4px solid #ef4444;
        }
        
        .notification-warning {
            border-left: 4px solid #f59e0b;
        }
        
        .notification-info {
            border-left: 4px solid #06b6d4;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            margin-left: auto;
        }
        
        .shortcuts-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .shortcut-item {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .shortcut-item kbd {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 4px 8px;
            font-family: monospace;
            font-size: 12px;
            min-width: 80px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}

// Make UIManager globally available
window.UIManager = UIManager;

})();
