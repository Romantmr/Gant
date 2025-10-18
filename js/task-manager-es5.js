// Task Manager - Handles task operations and UI interactions (ES5 compatible)

(function() {
    'use strict';

    // ES5 compatible TaskManager constructor
    function TaskManager(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.currentTask = null;
        this.taskModal = null;
        this.taskList = null;
        
        this.initialize();
        this.setupEventListeners();
    }

    TaskManager.prototype.initialize = function() {
        this.taskModal = document.getElementById('task-modal');
        this.taskList = document.getElementById('task-list');
        this.renderTaskList();
    };

    TaskManager.prototype.setupEventListeners = function() {
        var self = this;
        
        // Task modal events
        var modal = this.taskModal;
        var closeBtn = document.getElementById('close-modal');
        var cancelBtn = document.getElementById('cancel-task');
        var saveBtn = document.getElementById('save-task');
        var taskForm = document.getElementById('task-form');

        if (closeBtn) {
            closeBtn.addEventListener('click', function() { self.closeModal(); });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() { self.closeModal(); });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function() { self.saveTask(); });
        }

        // Close modal on outside click
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    self.closeModal();
                }
            });
        }

        // Form field events
        var startDateInput = document.getElementById('start-date');
        var endDateInput = document.getElementById('end-date');
        var durationInput = document.getElementById('task-duration');
        var progressInput = document.getElementById('task-progress');
        var progressValue = document.getElementById('progress-value');

        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', function() { self.updateDuration(); });
            endDateInput.addEventListener('change', function() { self.updateDuration(); });
        }

        if (durationInput) {
            durationInput.addEventListener('change', function() { self.updateEndDate(); });
        }

        if (progressInput && progressValue) {
            progressInput.addEventListener('input', function() {
                progressValue.textContent = progressInput.value + '%';
            });
        }

        // Task list events
        var addTaskBtn = document.getElementById('add-task');
        var editTaskBtn = document.getElementById('edit-task');
        var deleteTaskBtn = document.getElementById('delete-task');

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', function() { self.showNewTaskModal(); });
        }

        if (editTaskBtn) {
            editTaskBtn.addEventListener('click', function() { self.showEditTaskModal(); });
        }

        if (deleteTaskBtn) {
            deleteTaskBtn.addEventListener('click', function() { self.deleteSelectedTasks(); });
        }

        // Data change events
        document.addEventListener('dataChange', function(event) {
            var type = event.detail.type;
            if (type === 'task-created' || type === 'task-updated' || type === 'task-deleted') {
                self.renderTaskList();
                self.updateTaskButtons();
            }
        });

        // Task selection events
        document.addEventListener('taskSelected', function(event) {
            var taskId = event.detail.taskId;
            self.currentTask = self.dataManager.getTask(taskId);
            self.updateTaskButtons();
            self.updateTaskInfo(taskId);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'n':
                        event.preventDefault();
                        self.showNewTaskModal();
                        break;
                    case 'e':
                        event.preventDefault();
                        self.showEditTaskModal();
                        break;
                    case 'Delete':
                        event.preventDefault();
                        self.deleteSelectedTasks();
                        break;
                }
            }
        });
    };

    TaskManager.prototype.renderTaskList = function() {
        if (!this.taskList) return;

        var tasks = this.dataManager.getRootTasks();
        this.taskList.innerHTML = '';

        if (tasks.length === 0) {
            this.taskList.innerHTML = 
                '<div class="empty-state">' +
                    '<i class="fas fa-tasks"></i>' +
                    '<h3>Нет задач</h3>' +
                    '<p>Создайте первую задачу для начала работы с проектом</p>' +
                    '<button class="btn btn-primary" onclick="taskManager.showNewTaskModal()">' +
                        '<i class="fas fa-plus"></i> Добавить задачу' +
                    '</button>' +
                '</div>';
            return;
        }

        for (var i = 0; i < tasks.length; i++) {
            this.renderTaskItem(tasks[i], 0);
        }
    };

    TaskManager.prototype.renderTaskItem = function(task, level) {
        var taskItem = Utils.createElement('div', 'task-item');
        taskItem.dataset.taskId = task.id;
        taskItem.style.paddingLeft = (level * 20 + 16) + 'px';

        // Add classes based on task properties
        if (task.progress === 100) {
            taskItem.classList.add('completed');
        }
        if (task.type === 'milestone') {
            taskItem.classList.add('milestone');
        }
        if (task.priority === 'critical') {
            taskItem.classList.add('critical');
        }

        // Task level indicator
        var levelIndicator = Utils.createElement('div', 'task-item-level');
        var hasChildren = this.dataManager.getTasksByParent(task.id).length > 0;

        if (hasChildren) {
            levelIndicator.classList.add(task.expanded ? 'expanded' : 'collapsed');
            var self = this;
            levelIndicator.addEventListener('click', function(e) {
                e.stopPropagation();
                self.toggleTaskExpansion(task.id);
            });
        } else {
            levelIndicator.classList.add('no-children');
        }

        // Task icon
        var taskIcon = Utils.createElement('div', 'task-item-icon ' + task.type);

        // Task content
        var taskContent = Utils.createElement('div', 'task-item-content');
        
        var taskName = Utils.createElement('div', 'task-item-name');
        taskName.textContent = task.name;
        
        var taskDetails = Utils.createElement('div', 'task-item-details');
        
        // Duration
        var duration = Utils.createElement('span', 'task-item-duration');
        duration.textContent = task.duration + ' дн.';
        
        // Assignee
        var assignee = Utils.createElement('span', 'task-item-assignee');
        assignee.textContent = task.assignee || 'Не назначен';
        
        // Dates
        var dates = Utils.createElement('span');
        dates.textContent = Utils.formatDate(task.startDate) + ' - ' + Utils.formatDate(task.endDate);

        taskDetails.appendChild(duration);
        taskDetails.appendChild(assignee);
        taskDetails.appendChild(dates);

        taskContent.appendChild(taskName);
        taskContent.appendChild(taskDetails);

        // Progress bar
        var progressContainer = Utils.createElement('div', 'task-item-progress-container');
        var progressBar = Utils.createElement('div', 'task-item-progress');
        var progressFill = Utils.createElement('div', 'task-item-progress-bar');
        progressFill.style.width = task.progress + '%';
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);

        // Priority indicator
        var priorityIndicator = Utils.createElement('div', 'task-item-priority ' + task.priority);

        // Event listeners
        var self = this;
        taskItem.addEventListener('click', function() {
            self.selectTask(task.id);
        });

        taskItem.addEventListener('dblclick', function() {
            self.showEditTaskModal(task.id);
        });

        // Context menu
        taskItem.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            self.showTaskContextMenu(e, task);
        });

        // Assemble task item
        taskItem.appendChild(levelIndicator);
        taskItem.appendChild(taskIcon);
        taskItem.appendChild(taskContent);
        taskItem.appendChild(progressContainer);
        taskItem.appendChild(priorityIndicator);

        this.taskList.appendChild(taskItem);

        // Render child tasks if expanded
        if (task.expanded) {
            var children = this.dataManager.getTasksByParent(task.id);
            for (var i = 0; i < children.length; i++) {
                this.renderTaskItem(children[i], level + 1);
            }
        }
    };

    TaskManager.prototype.showNewTaskModal = function(taskData) {
        taskData = taskData || {};
        this.currentTask = null;
        this.openModal('Новая задача');
        this.populateTaskForm(taskData);
    };

    TaskManager.prototype.showEditTaskModal = function(taskId) {
        var task = taskId ? this.dataManager.getTask(taskId) : this.currentTask;
        if (!task) return;

        this.currentTask = task;
        this.openModal('Редактировать задачу');
        this.populateTaskForm(task);
    };

    TaskManager.prototype.openModal = function(title) {
        var modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (this.taskModal) {
            this.taskModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            var firstInput = this.taskModal.querySelector('input');
            if (firstInput) {
                setTimeout(function() { firstInput.focus(); }, 100);
            }
        }
    };

    TaskManager.prototype.closeModal = function() {
        if (this.taskModal) {
            this.taskModal.style.display = 'none';
            document.body.style.overflow = '';
            this.currentTask = null;
        }
    };

    TaskManager.prototype.populateTaskForm = function(task) {
        var form = document.getElementById('task-form');
        if (!form) return;

        var fields = {
            'task-name': task.name || '',
            'task-description': task.description || '',
            'start-date': task.startDate ? Utils.formatDate(task.startDate).split('.').reverse().join('-') : '',
            'end-date': task.endDate ? Utils.formatDate(task.endDate).split('.').reverse().join('-') : '',
            'task-duration': task.duration || 1,
            'task-progress': task.progress || 0,
            'task-priority': task.priority || 'medium',
            'task-dependencies': task.dependencies ? task.dependencies.join(', ') : '',
            'task-assignee': task.assignee || ''
        };

        for (var fieldId in fields) {
            if (fields.hasOwnProperty(fieldId)) {
                var field = document.getElementById(fieldId);
                if (field) {
                    field.value = fields[fieldId];
                }
            }
        }

        // Update progress display
        var progressValue = document.getElementById('progress-value');
        if (progressValue) {
            progressValue.textContent = fields['task-progress'] + '%';
        }
    };

    TaskManager.prototype.saveTask = function() {
        var form = document.getElementById('task-form');
        if (!form) return;

        var taskData = {
            name: document.getElementById('task-name').value,
            description: document.getElementById('task-description').value,
            startDate: new Date(document.getElementById('start-date').value),
            endDate: new Date(document.getElementById('end-date').value),
            duration: parseInt(document.getElementById('task-duration').value),
            progress: parseInt(document.getElementById('task-progress').value),
            priority: document.getElementById('task-priority').value,
            dependencies: document.getElementById('task-dependencies').value.split(',').map(function(id) { return id.trim(); }).filter(function(id) { return id; }),
            assignee: document.getElementById('task-assignee').value
        };

        // Validation
        if (!taskData.name) {
            this.showError('Название задачи обязательно');
            return;
        }

        if (taskData.startDate >= taskData.endDate) {
            this.showError('Дата окончания должна быть позже даты начала');
            return;
        }

        if (taskData.duration < 1) {
            this.showError('Длительность должна быть больше 0');
            return;
        }

        if (taskData.progress < 0 || taskData.progress > 100) {
            this.showError('Прогресс должен быть от 0 до 100');
            return;
        }

        try {
            if (this.currentTask) {
                // Update existing task
                this.dataManager.updateTask(this.currentTask.id, taskData);
                this.showSuccess('Задача обновлена');
            } else {
                // Create new task
                this.dataManager.createTask(taskData);
                this.showSuccess('Задача создана');
            }

            this.closeModal();
            form.reset();
        } catch (error) {
            this.showError('Ошибка при сохранении задачи: ' + error.message);
        }
    };

    TaskManager.prototype.updateDuration = function() {
        var startDate = document.getElementById('start-date');
        var endDate = document.getElementById('end-date');
        var duration = document.getElementById('task-duration');

        if (startDate.value && endDate.value) {
            var start = new Date(startDate.value);
            var end = new Date(endDate.value);
            var days = Utils.getDaysBetween(start, end) + 1;
            duration.value = days;
        }
    };

    TaskManager.prototype.updateEndDate = function() {
        var startDate = document.getElementById('start-date');
        var endDate = document.getElementById('end-date');
        var duration = document.getElementById('task-duration');

        if (startDate.value && duration.value) {
            var start = new Date(startDate.value);
            var end = Utils.addDays(start, parseInt(duration.value) - 1);
            endDate.value = end.toISOString().split('T')[0];
        }
    };

    TaskManager.prototype.selectTask = function(taskId) {
        var taskItems = this.taskList.querySelectorAll('.task-item');
        for (var i = 0; i < taskItems.length; i++) {
            var item = taskItems[i];
            item.classList.remove('selected');
            if (item.dataset.taskId === taskId) {
                item.classList.add('selected');
            }
        }

        // Notify other components
        var event = new CustomEvent('taskSelected', {
            detail: { taskId: taskId, task: this.dataManager.getTask(taskId) }
        });
        document.dispatchEvent(event);
    };

    TaskManager.prototype.toggleTaskExpansion = function(taskId) {
        var task = this.dataManager.getTask(taskId);
        if (task) {
            this.dataManager.updateTask(taskId, { expanded: !task.expanded });
        }
    };

    TaskManager.prototype.deleteSelectedTasks = function() {
        if (!this.currentTask) {
            this.showError('Выберите задачу для удаления');
            return;
        }

        if (confirm('Удалить задачу "' + this.currentTask.name + '"? Это действие нельзя отменить.')) {
            this.dataManager.deleteTask(this.currentTask.id);
            this.currentTask = null;
            this.updateTaskButtons();
            this.showSuccess('Задача удалена');
        }
    };

    TaskManager.prototype.updateTaskButtons = function() {
        var editBtn = document.getElementById('edit-task');
        var deleteBtn = document.getElementById('delete-task');

        var hasSelection = this.currentTask !== null;

        if (editBtn) {
            editBtn.disabled = !hasSelection;
        }

        if (deleteBtn) {
            deleteBtn.disabled = !hasSelection;
        }
    };

    TaskManager.prototype.updateTaskInfo = function(taskId) {
        var task = this.dataManager.getTask(taskId);
        var infoElement = document.getElementById('selected-task-info');

        if (infoElement && task) {
            infoElement.innerHTML = 
                '<strong>' + task.name + '</strong> | ' +
                'Прогресс: ' + task.progress + '% | ' +
                'Приоритет: ' + this.getPriorityText(task.priority) + ' | ' +
                'Исполнитель: ' + (task.assignee || 'Не назначен');
        }
    };

    TaskManager.prototype.getPriorityText = function(priority) {
        var priorities = {
            'low': 'Низкий',
            'medium': 'Средний',
            'high': 'Высокий',
            'critical': 'Критический'
        };
        return priorities[priority] || priority;
    };

    TaskManager.prototype.showTaskContextMenu = function(event, task) {
        // Remove existing context menu
        var existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        var contextMenu = Utils.createElement('div', 'context-menu');
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';

        var menuItems = [
            { icon: 'fas fa-edit', text: 'Редактировать', action: function() { self.showEditTaskModal(task.id); } },
            { icon: 'fas fa-copy', text: 'Дублировать', action: function() { self.duplicateTask(task); } },
            { icon: 'fas fa-arrow-up', text: 'Переместить вверх', action: function() { self.moveTask(task.id, 'up'); } },
            { icon: 'fas fa-arrow-down', text: 'Переместить вниз', action: function() { self.moveTask(task.id, 'down'); } },
            { icon: 'fas fa-trash', text: 'Удалить', action: function() { self.deleteTask(task.id); }, danger: true }
        ];

        var self = this;
        for (var i = 0; i < menuItems.length; i++) {
            var item = menuItems[i];
            var menuItem = Utils.createElement('div', 'context-menu-item');
            if (item.danger) {
                menuItem.classList.add('danger');
            }

            menuItem.innerHTML = 
                '<i class="' + item.icon + '"></i>' +
                '<span>' + item.text + '</span>';

            menuItem.addEventListener('click', function(action) {
                return function() {
                    action();
                    contextMenu.remove();
                };
            }(item.action));

            contextMenu.appendChild(menuItem);
        }

        document.body.appendChild(contextMenu);

        // Close context menu on outside click
        var closeMenu = function(e) {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(function() {
            document.addEventListener('click', closeMenu);
        }, 100);
    };

    TaskManager.prototype.duplicateTask = function(task) {
        var duplicatedTask = {
            name: task.name + ' (копия)',
            description: task.description,
            type: task.type,
            startDate: Utils.addDays(task.startDate, 7),
            endDate: Utils.addDays(task.endDate, 7),
            duration: task.duration,
            progress: 0,
            priority: task.priority,
            assignee: task.assignee
        };

        this.dataManager.createTask(duplicatedTask);
        this.showSuccess('Задача дублирована');
    };

    TaskManager.prototype.moveTask = function(taskId, direction) {
        // Implementation for moving tasks up/down in the list
        var tasks = this.dataManager.getRootTasks();
        var currentIndex = -1;
        
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].id === taskId) {
                currentIndex = i;
                break;
            }
        }
        
        if (direction === 'up' && currentIndex > 0) {
            // Move up logic
            var temp = tasks[currentIndex];
            tasks[currentIndex] = tasks[currentIndex - 1];
            tasks[currentIndex - 1] = temp;
        } else if (direction === 'down' && currentIndex < tasks.length - 1) {
            // Move down logic
            var temp = tasks[currentIndex];
            tasks[currentIndex] = tasks[currentIndex + 1];
            tasks[currentIndex + 1] = temp;
        }

        this.dataManager.saveToStorage();
        this.renderTaskList();
    };

    TaskManager.prototype.deleteTask = function(taskId) {
        var task = this.dataManager.getTask(taskId);
        if (task && confirm('Удалить задачу "' + task.name + '"?')) {
            this.dataManager.deleteTask(taskId);
            this.showSuccess('Задача удалена');
        }
    };

    TaskManager.prototype.showError = function(message) {
        this.uiManager.showNotification(message, 'error');
    };

    TaskManager.prototype.showSuccess = function(message) {
        this.uiManager.showNotification(message, 'success');
    };

    // Search and filter functionality
    TaskManager.prototype.searchTasks = function(query) {
        var tasks = this.dataManager.searchTasks(query);
        this.renderFilteredTasks(tasks);
    };

    TaskManager.prototype.filterTasks = function(filters) {
        var tasks = this.dataManager.filterTasks(filters);
        this.renderFilteredTasks(tasks);
    };

    TaskManager.prototype.renderFilteredTasks = function(tasks) {
        // Implementation for rendering filtered tasks
        // This would involve creating a filtered view of the task list
    };

    // Make TaskManager globally available
    window.TaskManager = TaskManager;

})();
