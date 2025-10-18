// Task Manager - Handles task operations and UI interactions

class TaskManager {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.currentTask = null;
        this.taskModal = null;
        this.taskList = null;
        
        this.initialize();
        this.setupEventListeners();
    }

    initialize() {
        this.taskModal = document.getElementById('task-modal');
        this.taskList = document.getElementById('task-list');
        this.renderTaskList();
    }

    setupEventListeners() {
        // Task modal events
        const modal = this.taskModal;
        const closeBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-task');
        const saveBtn = document.getElementById('save-task');
        const taskForm = document.getElementById('task-form');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTask());
        }

        // Close modal on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Form field events
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const durationInput = document.getElementById('task-duration');
        const progressInput = document.getElementById('task-progress');
        const progressValue = document.getElementById('progress-value');

        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => this.updateDuration());
            endDateInput.addEventListener('change', () => this.updateDuration());
        }

        if (durationInput) {
            durationInput.addEventListener('change', () => this.updateEndDate());
        }

        if (progressInput && progressValue) {
            progressInput.addEventListener('input', () => {
                progressValue.textContent = progressInput.value + '%';
            });
        }

        // Task list events
        const addTaskBtn = document.getElementById('add-task');
        const editTaskBtn = document.getElementById('edit-task');
        const deleteTaskBtn = document.getElementById('delete-task');

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.showNewTaskModal());
        }

        if (editTaskBtn) {
            editTaskBtn.addEventListener('click', () => this.showEditTaskModal());
        }

        if (deleteTaskBtn) {
            deleteTaskBtn.addEventListener('click', () => this.deleteSelectedTasks());
        }

        // Data change events
        document.addEventListener('dataChange', (event) => {
            const { type } = event.detail;
            if (['task-created', 'task-updated', 'task-deleted'].includes(type)) {
                this.renderTaskList();
                this.updateTaskButtons();
            }
        });

        // Task selection events
        document.addEventListener('taskSelected', (event) => {
            const { taskId } = event.detail;
            this.currentTask = this.dataManager.getTask(taskId);
            this.updateTaskButtons();
            this.updateTaskInfo(taskId);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'n':
                        event.preventDefault();
                        this.showNewTaskModal();
                        break;
                    case 'e':
                        event.preventDefault();
                        this.showEditTaskModal();
                        break;
                    case 'Delete':
                        event.preventDefault();
                        this.deleteSelectedTasks();
                        break;
                }
            }
        });
    }

    renderTaskList() {
        if (!this.taskList) return;

        const tasks = this.dataManager.getRootTasks();
        this.taskList.innerHTML = '';

        if (tasks.length === 0) {
            this.taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Нет задач</h3>
                    <p>Создайте первую задачу для начала работы с проектом</p>
                    <button class="btn btn-primary" onclick="taskManager.showNewTaskModal()">
                        <i class="fas fa-plus"></i> Добавить задачу
                    </button>
                </div>
            `;
            return;
        }

        tasks.forEach(task => {
            this.renderTaskItem(task, 0);
        });
    }

    renderTaskItem(task, level) {
        const taskItem = Utils.createElement('div', 'task-item');
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
        const levelIndicator = Utils.createElement('div', 'task-item-level');
        const hasChildren = this.dataManager.getTasksByParent(task.id).length > 0;

        if (hasChildren) {
            levelIndicator.classList.add(task.expanded ? 'expanded' : 'collapsed');
            levelIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskExpansion(task.id);
            });
        } else {
            levelIndicator.classList.add('no-children');
        }

        // Task icon
        const taskIcon = Utils.createElement('div', `task-item-icon ${task.type}`);

        // Task content
        const taskContent = Utils.createElement('div', 'task-item-content');
        
        const taskName = Utils.createElement('div', 'task-item-name');
        taskName.textContent = task.name;
        
        const taskDetails = Utils.createElement('div', 'task-item-details');
        
        // Duration
        const duration = Utils.createElement('span', 'task-item-duration');
        duration.textContent = `${task.duration} дн.`;
        
        // Assignee
        const assignee = Utils.createElement('span', 'task-item-assignee');
        assignee.textContent = task.assignee || 'Не назначен';
        
        // Dates
        const dates = Utils.createElement('span');
        dates.textContent = `${Utils.formatDate(task.startDate)} - ${Utils.formatDate(task.endDate)}`;

        taskDetails.appendChild(duration);
        taskDetails.appendChild(assignee);
        taskDetails.appendChild(dates);

        taskContent.appendChild(taskName);
        taskContent.appendChild(taskDetails);

        // Progress bar
        const progressContainer = Utils.createElement('div', 'task-item-progress-container');
        const progressBar = Utils.createElement('div', 'task-item-progress');
        const progressFill = Utils.createElement('div', 'task-item-progress-bar');
        progressFill.style.width = task.progress + '%';
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);

        // Priority indicator
        const priorityIndicator = Utils.createElement('div', `task-item-priority ${task.priority}`);

        // Event listeners
        taskItem.addEventListener('click', () => {
            this.selectTask(task.id);
        });

        taskItem.addEventListener('dblclick', () => {
            this.showEditTaskModal(task.id);
        });

        // Context menu
        taskItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showTaskContextMenu(e, task);
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
            const children = this.dataManager.getTasksByParent(task.id);
            children.forEach(child => {
                this.renderTaskItem(child, level + 1);
            });
        }
    }

    showNewTaskModal(taskData = {}) {
        this.currentTask = null;
        this.openModal('Новая задача');
        this.populateTaskForm(taskData);
    }

    showEditTaskModal(taskId = null) {
        const task = taskId ? this.dataManager.getTask(taskId) : this.currentTask;
        if (!task) return;

        this.currentTask = task;
        this.openModal('Редактировать задачу');
        this.populateTaskForm(task);
    }

    openModal(title) {
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (this.taskModal) {
            this.taskModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            const firstInput = this.taskModal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal() {
        if (this.taskModal) {
            this.taskModal.style.display = 'none';
            document.body.style.overflow = '';
            this.currentTask = null;
        }
    }

    populateTaskForm(task) {
        const form = document.getElementById('task-form');
        if (!form) return;

        const fields = {
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

        Object.keys(fields).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fields[fieldId];
            }
        });

        // Update progress display
        const progressValue = document.getElementById('progress-value');
        if (progressValue) {
            progressValue.textContent = fields['task-progress'] + '%';
        }
    }

    saveTask() {
        const form = document.getElementById('task-form');
        if (!form) return;

        const formData = new FormData(form);
        const taskData = {
            name: formData.get('task-name') || document.getElementById('task-name').value,
            description: formData.get('task-description') || document.getElementById('task-description').value,
            startDate: new Date(document.getElementById('start-date').value),
            endDate: new Date(document.getElementById('end-date').value),
            duration: parseInt(document.getElementById('task-duration').value),
            progress: parseInt(document.getElementById('task-progress').value),
            priority: document.getElementById('task-priority').value,
            dependencies: document.getElementById('task-dependencies').value.split(',').map(id => id.trim()).filter(id => id),
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
    }

    updateDuration() {
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        const duration = document.getElementById('task-duration');

        if (startDate.value && endDate.value) {
            const start = new Date(startDate.value);
            const end = new Date(endDate.value);
            const days = Utils.getDaysBetween(start, end) + 1;
            duration.value = days;
        }
    }

    updateEndDate() {
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        const duration = document.getElementById('task-duration');

        if (startDate.value && duration.value) {
            const start = new Date(startDate.value);
            const end = Utils.addDays(start, parseInt(duration.value) - 1);
            endDate.value = end.toISOString().split('T')[0];
        }
    }

    selectTask(taskId) {
        const taskItems = this.taskList.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.taskId === taskId) {
                item.classList.add('selected');
            }
        });

        // Notify other components
        const event = new CustomEvent('taskSelected', {
            detail: { taskId: taskId, task: this.dataManager.getTask(taskId) }
        });
        document.dispatchEvent(event);
    }

    toggleTaskExpansion(taskId) {
        const task = this.dataManager.getTask(taskId);
        if (task) {
            this.dataManager.updateTask(taskId, { expanded: !task.expanded });
        }
    }

    deleteSelectedTasks() {
        if (!this.currentTask) {
            this.showError('Выберите задачу для удаления');
            return;
        }

        if (confirm(`Удалить задачу "${this.currentTask.name}"? Это действие нельзя отменить.`)) {
            this.dataManager.deleteTask(this.currentTask.id);
            this.currentTask = null;
            this.updateTaskButtons();
            this.showSuccess('Задача удалена');
        }
    }

    updateTaskButtons() {
        const editBtn = document.getElementById('edit-task');
        const deleteBtn = document.getElementById('delete-task');

        const hasSelection = this.currentTask !== null;

        if (editBtn) {
            editBtn.disabled = !hasSelection;
        }

        if (deleteBtn) {
            deleteBtn.disabled = !hasSelection;
        }
    }

    updateTaskInfo(taskId) {
        const task = this.dataManager.getTask(taskId);
        const infoElement = document.getElementById('selected-task-info');

        if (infoElement && task) {
            infoElement.innerHTML = `
                <strong>${task.name}</strong> | 
                Прогресс: ${task.progress}% | 
                Приоритет: ${this.getPriorityText(task.priority)} | 
                Исполнитель: ${task.assignee || 'Не назначен'}
            `;
        }
    }

    getPriorityText(priority) {
        const priorities = {
            'low': 'Низкий',
            'medium': 'Средний',
            'high': 'Высокий',
            'critical': 'Критический'
        };
        return priorities[priority] || priority;
    }

    showTaskContextMenu(event, task) {
        // Remove existing context menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const contextMenu = Utils.createElement('div', 'context-menu');
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';

        const menuItems = [
            { icon: 'fas fa-edit', text: 'Редактировать', action: () => this.showEditTaskModal(task.id) },
            { icon: 'fas fa-copy', text: 'Дублировать', action: () => this.duplicateTask(task) },
            { icon: 'fas fa-arrow-up', text: 'Переместить вверх', action: () => this.moveTask(task.id, 'up') },
            { icon: 'fas fa-arrow-down', text: 'Переместить вниз', action: () => this.moveTask(task.id, 'down') },
            { icon: 'fas fa-trash', text: 'Удалить', action: () => this.deleteTask(task.id), danger: true }
        ];

        menuItems.forEach(item => {
            const menuItem = Utils.createElement('div', 'context-menu-item');
            if (item.danger) {
                menuItem.classList.add('danger');
            }

            menuItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            `;

            menuItem.addEventListener('click', () => {
                item.action();
                contextMenu.remove();
            });

            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);

        // Close context menu on outside click
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    duplicateTask(task) {
        const duplicatedTask = {
            ...task,
            name: task.name + ' (копия)',
            startDate: Utils.addDays(task.startDate, 7),
            endDate: Utils.addDays(task.endDate, 7),
            progress: 0
        };

        delete duplicatedTask.id;
        delete duplicatedTask.createdAt;
        delete duplicatedTask.updatedAt;

        this.dataManager.createTask(duplicatedTask);
        this.showSuccess('Задача дублирована');
    }

    moveTask(taskId, direction) {
        // Implementation for moving tasks up/down in the list
        const tasks = this.dataManager.getRootTasks();
        const currentIndex = tasks.findIndex(t => t.id === taskId);
        
        if (direction === 'up' && currentIndex > 0) {
            // Move up logic
            const temp = tasks[currentIndex];
            tasks[currentIndex] = tasks[currentIndex - 1];
            tasks[currentIndex - 1] = temp;
        } else if (direction === 'down' && currentIndex < tasks.length - 1) {
            // Move down logic
            const temp = tasks[currentIndex];
            tasks[currentIndex] = tasks[currentIndex + 1];
            tasks[currentIndex + 1] = temp;
        }

        this.dataManager.saveToStorage();
        this.renderTaskList();
    }

    deleteTask(taskId) {
        const task = this.dataManager.getTask(taskId);
        if (task && confirm(`Удалить задачу "${task.name}"?`)) {
            this.dataManager.deleteTask(taskId);
            this.showSuccess('Задача удалена');
        }
    }

    showError(message) {
        this.uiManager.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.uiManager.showNotification(message, 'success');
    }

    // Search and filter functionality
    searchTasks(query) {
        const tasks = this.dataManager.searchTasks(query);
        this.renderFilteredTasks(tasks);
    }

    filterTasks(filters) {
        const tasks = this.dataManager.filterTasks(filters);
        this.renderFilteredTasks(tasks);
    }

    renderFilteredTasks(tasks) {
        // Implementation for rendering filtered tasks
        // This would involve creating a filtered view of the task list
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
