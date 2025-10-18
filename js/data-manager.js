// Data Manager - Handles all data operations for the Gantt Chart Platform

class DataManager {
    constructor() {
        this.currentProject = null;
        this.tasks = [];
        this.dependencies = [];
        this.resources = [];
        this.calendar = {
            workingDays: [1, 2, 3, 4, 5], // Monday to Friday
            holidays: [],
            workingHours: { start: 9, end: 17 }
        };
        this.settings = {
            defaultTaskDuration: 1,
            defaultTaskType: 'task',
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            dateFormat: 'DD.MM.YYYY',
            timeFormat: '24h'
        };
        
        this.initializeStorage();
        this.setupAutoSave();
    }

    // Initialize data storage
    initializeStorage() {
        const savedProject = Utils.loadFromStorage('gantt-current-project');
        if (savedProject) {
            this.loadProject(savedProject);
        } else {
            this.createNewProject();
        }
    }

    // Project management
    createNewProject(name = 'Новый проект') {
        this.currentProject = {
            id: Utils.generateId('project-'),
            name: name,
            description: '',
            startDate: new Date(),
            endDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0',
            author: '',
            settings: { ...this.settings }
        };
        
        this.tasks = [];
        this.dependencies = [];
        this.resources = [];
        
        this.updateProjectDates();
        this.saveToStorage();
        this.notifyChange('project-created', this.currentProject);
    }

    loadProject(projectData) {
        try {
            this.currentProject = projectData.project || projectData;
            this.tasks = projectData.tasks || [];
            this.dependencies = projectData.dependencies || [];
            this.resources = projectData.resources || [];
            
            if (projectData.calendar) {
                this.calendar = { ...this.calendar, ...projectData.calendar };
            }
            
            if (projectData.settings) {
                this.settings = { ...this.settings, ...projectData.settings };
            }
            
            // Validate and fix data integrity
            this.validateDataIntegrity();
            
            this.notifyChange('project-loaded', this.currentProject);
            return { success: true, project: this.currentProject };
        } catch (error) {
            console.error('Error loading project:', error);
            return { success: false, error: error.message };
        }
    }

    saveProject() {
        if (!this.currentProject) return { success: false, error: 'No project to save' };
        
        try {
            this.currentProject.updatedAt = new Date();
            this.updateProjectDates();
            
            const projectData = {
                project: this.currentProject,
                tasks: this.tasks,
                dependencies: this.dependencies,
                resources: this.resources,
                calendar: this.calendar,
                settings: this.settings,
                exportedAt: new Date()
            };
            
            this.saveToStorage();
            this.notifyChange('project-saved', projectData);
            
            return { success: true, data: projectData };
        } catch (error) {
            console.error('Error saving project:', error);
            return { success: false, error: error.message };
        }
    }

    // Task management
    createTask(taskData) {
        const task = {
            id: Utils.generateId('task-'),
            name: taskData.name || 'Новая задача',
            description: taskData.description || '',
            type: taskData.type || 'task', // task, milestone, summary
            startDate: taskData.startDate || new Date(),
            endDate: taskData.endDate || new Date(),
            duration: taskData.duration || 1,
            progress: taskData.progress || 0,
            priority: taskData.priority || 'medium',
            assignee: taskData.assignee || '',
            parentId: taskData.parentId || null,
            dependencies: taskData.dependencies || [],
            resources: taskData.resources || [],
            color: taskData.color || null,
            notes: taskData.notes || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            expanded: true,
            visible: true
        };
        
        // Calculate end date if not provided
        if (!taskData.endDate) {
            task.endDate = Utils.addDays(task.startDate, task.duration - 1);
        }
        
        // Calculate duration if not provided
        if (!taskData.duration) {
            task.duration = Utils.getDaysBetween(task.startDate, task.endDate) + 1;
        }
        
        this.tasks.push(task);
        this.updateTaskHierarchy();
        this.updateProjectDates();
        this.saveToStorage();
        this.notifyChange('task-created', task);
        
        return task;
    }

    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return null;
        
        const task = this.tasks[taskIndex];
        const updatedTask = { ...task, ...updates, updatedAt: new Date() };
        
        // Recalculate dates if duration or start date changed
        if (updates.duration || updates.startDate) {
            if (updates.duration && !updates.endDate) {
                updatedTask.endDate = Utils.addDays(updatedTask.startDate, updatedTask.duration - 1);
            } else if (updates.startDate && !updates.endDate && !updates.duration) {
                updatedTask.duration = Utils.getDaysBetween(updatedTask.startDate, updatedTask.endDate) + 1;
            }
        }
        
        this.tasks[taskIndex] = updatedTask;
        this.updateTaskHierarchy();
        this.updateProjectDates();
        this.saveToStorage();
        this.notifyChange('task-updated', updatedTask);
        
        return updatedTask;
    }

    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return false;
        
        const task = this.tasks[taskIndex];
        
        // Delete child tasks
        const childTasks = this.tasks.filter(t => t.parentId === taskId);
        childTasks.forEach(child => this.deleteTask(child.id));
        
        // Remove dependencies
        this.dependencies = this.dependencies.filter(d => 
            d.fromTaskId !== taskId && d.toTaskId !== taskId
        );
        
        // Remove from task dependencies
        this.tasks.forEach(t => {
            t.dependencies = t.dependencies.filter(depId => depId !== taskId);
        });
        
        this.tasks.splice(taskIndex, 1);
        this.updateTaskHierarchy();
        this.updateProjectDates();
        this.saveToStorage();
        this.notifyChange('task-deleted', task);
        
        return true;
    }

    getTask(taskId) {
        return this.tasks.find(t => t.id === taskId);
    }

    getTasksByParent(parentId) {
        return this.tasks.filter(t => t.parentId === parentId);
    }

    getRootTasks() {
        return this.tasks.filter(t => !t.parentId);
    }

    // Dependency management
    createDependency(fromTaskId, toTaskId, type = 'finish-to-start', lag = 0) {
        const dependency = {
            id: Utils.generateId('dep-'),
            fromTaskId: fromTaskId,
            toTaskId: toTaskId,
            type: type, // finish-to-start, start-to-start, finish-to-finish, start-to-finish
            lag: lag, // lag in days
            createdAt: new Date()
        };
        
        // Validate dependency
        if (fromTaskId === toTaskId) {
            console.error('Cannot create dependency to itself');
            return null;
        }
        
        if (this.hasCircularDependency(fromTaskId, toTaskId)) {
            console.error('Circular dependency detected');
            return null;
        }
        
        this.dependencies.push(dependency);
        
        // Update task dependencies
        const toTask = this.getTask(toTaskId);
        if (toTask && !toTask.dependencies.includes(fromTaskId)) {
            toTask.dependencies.push(fromTaskId);
        }
        
        this.updateTaskDates();
        this.saveToStorage();
        this.notifyChange('dependency-created', dependency);
        
        return dependency;
    }

    deleteDependency(dependencyId) {
        const depIndex = this.dependencies.findIndex(d => d.id === dependencyId);
        if (depIndex === -1) return false;
        
        const dependency = this.dependencies[depIndex];
        
        // Remove from task dependencies
        const toTask = this.getTask(dependency.toTaskId);
        if (toTask) {
            toTask.dependencies = toTask.dependencies.filter(depId => depId !== dependency.fromTaskId);
        }
        
        this.dependencies.splice(depIndex, 1);
        this.updateTaskDates();
        this.saveToStorage();
        this.notifyChange('dependency-deleted', dependency);
        
        return true;
    }

    hasCircularDependency(fromTaskId, toTaskId) {
        const visited = new Set();
        const recursionStack = new Set();
        
        const hasCycle = (taskId) => {
            if (recursionStack.has(taskId)) return true;
            if (visited.has(taskId)) return false;
            
            visited.add(taskId);
            recursionStack.add(taskId);
            
            const task = this.getTask(taskId);
            if (task) {
                for (const depId of task.dependencies) {
                    if (hasCycle(depId)) return true;
                }
            }
            
            recursionStack.delete(taskId);
            return false;
        };
        
        return hasCycle(toTaskId);
    }

    // Data validation and integrity
    validateDataIntegrity() {
        // Validate tasks
        this.tasks = this.tasks.filter(task => {
            if (!task.id || !task.name) {
                console.warn('Invalid task removed:', task);
                return false;
            }
            
            // Fix date issues
            if (!task.startDate) task.startDate = new Date();
            if (!task.endDate) task.endDate = Utils.addDays(task.startDate, task.duration || 1);
            if (!task.duration) task.duration = Utils.getDaysBetween(task.startDate, task.endDate) + 1;
            
            return true;
        });
        
        // Validate dependencies
        this.dependencies = this.dependencies.filter(dep => {
            const fromTask = this.getTask(dep.fromTaskId);
            const toTask = this.getTask(dep.toTaskId);
            
            if (!fromTask || !toTask) {
                console.warn('Invalid dependency removed:', dep);
                return false;
            }
            
            return true;
        });
        
        // Update task hierarchy
        this.updateTaskHierarchy();
    }

    updateTaskHierarchy() {
        // Ensure all tasks have valid parent references
        this.tasks.forEach(task => {
            if (task.parentId) {
                const parent = this.getTask(task.parentId);
                if (!parent) {
                    task.parentId = null;
                }
            }
        });
    }

    updateProjectDates() {
        if (this.tasks.length === 0) return;
        
        const dates = this.tasks.map(t => [t.startDate, t.endDate]).flat();
        const validDates = dates.filter(d => d instanceof Date && !isNaN(d.getTime()));
        
        if (validDates.length > 0) {
            this.currentProject.startDate = new Date(Math.min(...validDates));
            this.currentProject.endDate = new Date(Math.max(...validDates));
        }
    }

    updateTaskDates() {
        // Update task dates based on dependencies
        const sortedTasks = this.getTopologicallySortedTasks();
        
        sortedTasks.forEach(task => {
            if (task.dependencies.length > 0) {
                let latestEndDate = null;
                
                task.dependencies.forEach(depId => {
                    const depTask = this.getTask(depId);
                    if (depTask) {
                        const depEndDate = Utils.addDays(depTask.endDate, 1);
                        if (!latestEndDate || depEndDate > latestEndDate) {
                            latestEndDate = depEndDate;
                        }
                    }
                });
                
                if (latestEndDate && latestEndDate > task.startDate) {
                    task.startDate = latestEndDate;
                    task.endDate = Utils.addDays(task.startDate, task.duration - 1);
                }
            }
        });
    }

    getTopologicallySortedTasks() {
        const visited = new Set();
        const tempVisited = new Set();
        const result = [];
        
        const visit = (taskId) => {
            if (tempVisited.has(taskId)) {
                throw new Error('Circular dependency detected');
            }
            if (visited.has(taskId)) return;
            
            tempVisited.add(taskId);
            const task = this.getTask(taskId);
            if (task) {
                task.dependencies.forEach(depId => visit(depId));
            }
            tempVisited.delete(taskId);
            visited.add(taskId);
            result.push(taskId);
        };
        
        this.tasks.forEach(task => {
            if (!visited.has(task.id)) {
                visit(task.id);
            }
        });
        
        return result.map(id => this.getTask(id)).filter(Boolean);
    }

    // Statistics and calculations
    getProjectStatistics() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.progress === 100).length;
        const inProgressTasks = this.tasks.filter(t => t.progress > 0 && t.progress < 100).length;
        const notStartedTasks = this.tasks.filter(t => t.progress === 0).length;
        
        const totalDuration = this.tasks.reduce((sum, task) => sum + task.duration, 0);
        const completedDuration = this.tasks.reduce((sum, task) => 
            sum + (task.duration * task.progress / 100), 0);
        
        const criticalPath = this.calculateCriticalPath();
        
        return {
            totalTasks,
            completedTasks,
            inProgressTasks,
            notStartedTasks,
            totalDuration,
            completedDuration,
            progressPercentage: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
            criticalPath,
            projectStart: this.currentProject?.startDate,
            projectEnd: this.currentProject?.endDate
        };
    }

    calculateCriticalPath() {
        // Simplified critical path calculation
        const longestPath = [];
        const visited = new Set();
        
        const findLongestPath = (taskId, currentPath = []) => {
            if (visited.has(taskId)) return currentPath;
            
            const task = this.getTask(taskId);
            if (!task) return currentPath;
            
            visited.add(taskId);
            currentPath.push(task);
            
            let longestChildPath = currentPath;
            task.dependencies.forEach(depId => {
                const childPath = findLongestPath(depId, [...currentPath]);
                if (childPath.length > longestChildPath.length) {
                    longestChildPath = childPath;
                }
            });
            
            return longestChildPath;
        };
        
        const rootTasks = this.getRootTasks();
        rootTasks.forEach(rootTask => {
            const path = findLongestPath(rootTask.id);
            if (path.length > longestPath.length) {
                longestPath.length = 0;
                longestPath.push(...path);
            }
        });
        
        return longestPath;
    }

    // Storage operations
    saveToStorage() {
        if (!this.currentProject) return;
        
        const projectData = {
            project: this.currentProject,
            tasks: this.tasks,
            dependencies: this.dependencies,
            resources: this.resources,
            calendar: this.calendar,
            settings: this.settings
        };
        
        Utils.saveToStorage('gantt-current-project', projectData);
    }

    exportProject(format = 'json') {
        const projectData = this.saveProject();
        if (!projectData.success) return projectData;
        
        const data = projectData.data;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${this.currentProject.name}_${timestamp}`;
        
        if (format === 'json') {
            const jsonData = JSON.stringify(data, null, 2);
            Utils.downloadFile(jsonData, `${filename}.json`, 'application/json');
        } else if (format === 'csv') {
            const csvData = this.convertToCSV();
            Utils.downloadFile(csvData, `${filename}.csv`, 'text/csv');
        }
        
        return { success: true, filename: filename };
    }

    convertToCSV() {
        const headers = [
            'ID', 'Название', 'Описание', 'Тип', 'Дата начала', 'Дата окончания',
            'Длительность', 'Прогресс', 'Приоритет', 'Исполнитель', 'Зависимости'
        ];
        
        const rows = this.tasks.map(task => [
            task.id,
            task.name,
            task.description,
            task.type,
            Utils.formatDate(task.startDate),
            Utils.formatDate(task.endDate),
            task.duration,
            task.progress,
            task.priority,
            task.assignee,
            task.dependencies.join(';')
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    // Auto-save functionality
    setupAutoSave() {
        if (this.settings.autoSave) {
            setInterval(() => {
                this.saveToStorage();
            }, this.settings.autoSaveInterval);
        }
    }

    // Event system
    notifyChange(eventType, data) {
        const event = new CustomEvent('dataChange', {
            detail: { type: eventType, data: data }
        });
        document.dispatchEvent(event);
    }

    // Search and filter
    searchTasks(query, fields = ['name', 'description', 'assignee']) {
        if (!query) return this.tasks;
        
        const lowerQuery = query.toLowerCase();
        return this.tasks.filter(task => {
            return fields.some(field => {
                const value = task[field];
                return value && value.toString().toLowerCase().includes(lowerQuery);
            });
        });
    }

    filterTasks(filters) {
        return this.tasks.filter(task => {
            if (filters.type && task.type !== filters.type) return false;
            if (filters.priority && task.priority !== filters.priority) return false;
            if (filters.assignee && task.assignee !== filters.assignee) return false;
            if (filters.progress !== undefined) {
                if (filters.progress === 'completed' && task.progress < 100) return false;
                if (filters.progress === 'in-progress' && (task.progress <= 0 || task.progress >= 100)) return false;
                if (filters.progress === 'not-started' && task.progress > 0) return false;
            }
            if (filters.dateRange) {
                const taskStart = new Date(task.startDate);
                const taskEnd = new Date(task.endDate);
                const rangeStart = new Date(filters.dateRange.start);
                const rangeEnd = new Date(filters.dateRange.end);
                
                if (taskStart > rangeEnd || taskEnd < rangeStart) return false;
            }
            
            return true;
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
