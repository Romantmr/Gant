// Data Manager - Handles all data operations for the Gantt Chart Platform (ES5 compatible)

(function() {
    'use strict';

    // ES5 compatible DataManager constructor
    function DataManager() {
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
    DataManager.prototype.initializeStorage = function() {
        var savedProject = Utils.loadFromStorage('gantt-current-project');
        if (savedProject) {
            this.loadProject(savedProject);
        } else {
            this.createNewProject();
        }
    };

    // Project management
    DataManager.prototype.createNewProject = function(name) {
        name = name || 'Новый проект';
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
            settings: Object.assign({}, this.settings)
        };
        
        this.tasks = [];
        this.dependencies = [];
        this.resources = [];
        
        this.updateProjectDates();
        this.saveToStorage();
        this.notifyChange('project-created', this.currentProject);
    };

    DataManager.prototype.loadProject = function(projectData) {
        try {
            this.currentProject = projectData.project || projectData;
            this.tasks = projectData.tasks || [];
            this.dependencies = projectData.dependencies || [];
            this.resources = projectData.resources || [];
            
            if (projectData.calendar) {
                this.calendar = Utils.mergeDeep(this.calendar, projectData.calendar);
            }
            
            if (projectData.settings) {
                this.settings = Utils.mergeDeep(this.settings, projectData.settings);
            }
            
            // Validate and fix data integrity
            this.validateDataIntegrity();
            
            this.notifyChange('project-loaded', this.currentProject);
            return { success: true, project: this.currentProject };
        } catch (error) {
            console.error('Error loading project:', error);
            return { success: false, error: error.message };
        }
    };

    DataManager.prototype.saveProject = function() {
        if (!this.currentProject) return { success: false, error: 'No project to save' };
        
        try {
            this.currentProject.updatedAt = new Date();
            this.updateProjectDates();
            
            var projectData = {
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
    };

    // Task management
    DataManager.prototype.createTask = function(taskData) {
        var task = {
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
    };

    DataManager.prototype.updateTask = function(taskId, updates) {
        var taskIndex = -1;
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].id === taskId) {
                taskIndex = i;
                break;
            }
        }
        
        if (taskIndex === -1) return null;
        
        var task = this.tasks[taskIndex];
        var updatedTask = Object.assign({}, task, updates);
        updatedTask.updatedAt = new Date();
        
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
    };

    DataManager.prototype.deleteTask = function(taskId) {
        var taskIndex = -1;
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].id === taskId) {
                taskIndex = i;
                break;
            }
        }
        
        if (taskIndex === -1) return false;
        
        var task = this.tasks[taskIndex];
        
        // Delete child tasks
        var childTasks = [];
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].parentId === taskId) {
                childTasks.push(this.tasks[i]);
            }
        }
        
        for (var i = 0; i < childTasks.length; i++) {
            this.deleteTask(childTasks[i].id);
        }
        
        // Remove dependencies
        var newDependencies = [];
        for (var i = 0; i < this.dependencies.length; i++) {
            var dep = this.dependencies[i];
            if (dep.fromTaskId !== taskId && dep.toTaskId !== taskId) {
                newDependencies.push(dep);
            }
        }
        this.dependencies = newDependencies;
        
        // Remove from task dependencies
        for (var i = 0; i < this.tasks.length; i++) {
            var taskDeps = this.tasks[i].dependencies;
            var newDeps = [];
            for (var j = 0; j < taskDeps.length; j++) {
                if (taskDeps[j] !== taskId) {
                    newDeps.push(taskDeps[j]);
                }
            }
            this.tasks[i].dependencies = newDeps;
        }
        
        this.tasks.splice(taskIndex, 1);
        this.updateTaskHierarchy();
        this.updateProjectDates();
        this.saveToStorage();
        this.notifyChange('task-deleted', task);
        
        return true;
    };

    DataManager.prototype.getTask = function(taskId) {
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].id === taskId) {
                return this.tasks[i];
            }
        }
        return null;
    };

    DataManager.prototype.getTasksByParent = function(parentId) {
        var result = [];
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].parentId === parentId) {
                result.push(this.tasks[i]);
            }
        }
        return result;
    };

    DataManager.prototype.getRootTasks = function() {
        var result = [];
        for (var i = 0; i < this.tasks.length; i++) {
            if (!this.tasks[i].parentId) {
                result.push(this.tasks[i]);
            }
        }
        return result;
    };

    // Dependency management
    DataManager.prototype.createDependency = function(fromTaskId, toTaskId, type, lag) {
        type = type || 'finish-to-start';
        lag = lag || 0;
        
        var dependency = {
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
        var toTask = this.getTask(toTaskId);
        if (toTask && toTask.dependencies.indexOf(fromTaskId) === -1) {
            toTask.dependencies.push(fromTaskId);
        }
        
        this.updateTaskDates();
        this.saveToStorage();
        this.notifyChange('dependency-created', dependency);
        
        return dependency;
    };

    DataManager.prototype.deleteDependency = function(dependencyId) {
        var depIndex = -1;
        for (var i = 0; i < this.dependencies.length; i++) {
            if (this.dependencies[i].id === dependencyId) {
                depIndex = i;
                break;
            }
        }
        
        if (depIndex === -1) return false;
        
        var dependency = this.dependencies[depIndex];
        
        // Remove from task dependencies
        var toTask = this.getTask(dependency.toTaskId);
        if (toTask) {
            var newDeps = [];
            for (var i = 0; i < toTask.dependencies.length; i++) {
                if (toTask.dependencies[i] !== dependency.fromTaskId) {
                    newDeps.push(toTask.dependencies[i]);
                }
            }
            toTask.dependencies = newDeps;
        }
        
        this.dependencies.splice(depIndex, 1);
        this.updateTaskDates();
        this.saveToStorage();
        this.notifyChange('dependency-deleted', dependency);
        
        return true;
    };

    DataManager.prototype.hasCircularDependency = function(fromTaskId, toTaskId) {
        var visited = {};
        var recursionStack = {};
        
        var hasCycle = function(taskId) {
            if (recursionStack[taskId]) return true;
            if (visited[taskId]) return false;
            
            visited[taskId] = true;
            recursionStack[taskId] = true;
            
            var task = this.getTask(taskId);
            if (task) {
                for (var i = 0; i < task.dependencies.length; i++) {
                    if (hasCycle.call(this, task.dependencies[i])) return true;
                }
            }
            
            recursionStack[taskId] = false;
            return false;
        };
        
        return hasCycle.call(this, toTaskId);
    };

    // Data validation and integrity
    DataManager.prototype.validateDataIntegrity = function() {
        // Validate tasks
        var validTasks = [];
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            if (!task.id || !task.name) {
                console.warn('Invalid task removed:', task);
                continue;
            }
            
            // Fix date issues
            if (!task.startDate) task.startDate = new Date();
            if (!task.endDate) task.endDate = Utils.addDays(task.startDate, task.duration || 1);
            if (!task.duration) task.duration = Utils.getDaysBetween(task.startDate, task.endDate) + 1;
            
            validTasks.push(task);
        }
        this.tasks = validTasks;
        
        // Validate dependencies
        var validDeps = [];
        for (var i = 0; i < this.dependencies.length; i++) {
            var dep = this.dependencies[i];
            var fromTask = this.getTask(dep.fromTaskId);
            var toTask = this.getTask(dep.toTaskId);
            
            if (!fromTask || !toTask) {
                console.warn('Invalid dependency removed:', dep);
                continue;
            }
            
            validDeps.push(dep);
        }
        this.dependencies = validDeps;
        
        // Update task hierarchy
        this.updateTaskHierarchy();
    };

    DataManager.prototype.updateTaskHierarchy = function() {
        // Ensure all tasks have valid parent references
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            if (task.parentId) {
                var parent = this.getTask(task.parentId);
                if (!parent) {
                    task.parentId = null;
                }
            }
        }
    };

    DataManager.prototype.updateProjectDates = function() {
        if (this.tasks.length === 0) return;
        
        var dates = [];
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            dates.push(task.startDate);
            dates.push(task.endDate);
        }
        
        var validDates = [];
        for (var i = 0; i < dates.length; i++) {
            var date = dates[i];
            if (date instanceof Date && !isNaN(date.getTime())) {
                validDates.push(date);
            }
        }
        
        if (validDates.length > 0) {
            this.currentProject.startDate = new Date(Math.min.apply(Math, validDates));
            this.currentProject.endDate = new Date(Math.max.apply(Math, validDates));
        }
    };

    DataManager.prototype.updateTaskDates = function() {
        // Update task dates based on dependencies
        var sortedTasks = this.getTopologicallySortedTasks();
        
        for (var i = 0; i < sortedTasks.length; i++) {
            var task = sortedTasks[i];
            if (task.dependencies.length > 0) {
                var latestEndDate = null;
                
                for (var j = 0; j < task.dependencies.length; j++) {
                    var depTask = this.getTask(task.dependencies[j]);
                    if (depTask) {
                        var depEndDate = Utils.addDays(depTask.endDate, 1);
                        if (!latestEndDate || depEndDate > latestEndDate) {
                            latestEndDate = depEndDate;
                        }
                    }
                }
                
                if (latestEndDate && latestEndDate > task.startDate) {
                    task.startDate = latestEndDate;
                    task.endDate = Utils.addDays(task.startDate, task.duration - 1);
                }
            }
        }
    };

    DataManager.prototype.getTopologicallySortedTasks = function() {
        var visited = {};
        var tempVisited = {};
        var result = [];
        
        var visit = function(taskId) {
            if (tempVisited[taskId]) {
                throw new Error('Circular dependency detected');
            }
            if (visited[taskId]) return;
            
            tempVisited[taskId] = true;
            var task = this.getTask(taskId);
            if (task) {
                for (var i = 0; i < task.dependencies.length; i++) {
                    visit.call(this, task.dependencies[i]);
                }
            }
            delete tempVisited[taskId];
            visited[taskId] = true;
            result.push(taskId);
        };
        
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            if (!visited[task.id]) {
                visit.call(this, task.id);
            }
        }
        
        var sortedTasks = [];
        for (var i = 0; i < result.length; i++) {
            var task = this.getTask(result[i]);
            if (task) {
                sortedTasks.push(task);
            }
        }
        
        return sortedTasks;
    };

    // Statistics and calculations
    DataManager.prototype.getProjectStatistics = function() {
        var totalTasks = this.tasks.length;
        var completedTasks = 0;
        var inProgressTasks = 0;
        var notStartedTasks = 0;
        
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            if (task.progress === 100) {
                completedTasks++;
            } else if (task.progress > 0) {
                inProgressTasks++;
            } else {
                notStartedTasks++;
            }
        }
        
        var totalDuration = 0;
        var completedDuration = 0;
        
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            totalDuration += task.duration;
            completedDuration += (task.duration * task.progress / 100);
        }
        
        var criticalPath = this.calculateCriticalPath();
        
        return {
            totalTasks: totalTasks,
            completedTasks: completedTasks,
            inProgressTasks: inProgressTasks,
            notStartedTasks: notStartedTasks,
            totalDuration: totalDuration,
            completedDuration: completedDuration,
            progressPercentage: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
            criticalPath: criticalPath,
            projectStart: this.currentProject ? this.currentProject.startDate : null,
            projectEnd: this.currentProject ? this.currentProject.endDate : null
        };
    };

    DataManager.prototype.calculateCriticalPath = function() {
        // Simplified critical path calculation
        var longestPath = [];
        var visited = {};
        
        var findLongestPath = function(taskId, currentPath) {
            currentPath = currentPath || [];
            if (visited[taskId]) return currentPath;
            
            var task = this.getTask(taskId);
            if (!task) return currentPath;
            
            visited[taskId] = true;
            currentPath.push(task);
            
            var longestChildPath = currentPath;
            for (var i = 0; i < task.dependencies.length; i++) {
                var childPath = findLongestPath.call(this, task.dependencies[i], currentPath.slice());
                if (childPath.length > longestChildPath.length) {
                    longestChildPath = childPath;
                }
            }
            
            return longestChildPath;
        };
        
        var rootTasks = this.getRootTasks();
        for (var i = 0; i < rootTasks.length; i++) {
            var path = findLongestPath.call(this, rootTasks[i].id);
            if (path.length > longestPath.length) {
                longestPath = path;
            }
        }
        
        return longestPath;
    };

    // Storage operations
    DataManager.prototype.saveToStorage = function() {
        if (!this.currentProject) return;
        
        var projectData = {
            project: this.currentProject,
            tasks: this.tasks,
            dependencies: this.dependencies,
            resources: this.resources,
            calendar: this.calendar,
            settings: this.settings
        };
        
        Utils.saveToStorage('gantt-current-project', projectData);
    };

    DataManager.prototype.exportProject = function(format) {
        format = format || 'json';
        var projectData = this.saveProject();
        if (!projectData.success) return projectData;
        
        var data = projectData.data;
        var timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        var filename = this.currentProject.name + '_' + timestamp;
        
        if (format === 'json') {
            var jsonData = JSON.stringify(data, null, 2);
            Utils.downloadFile(jsonData, filename + '.json', 'application/json');
        } else if (format === 'csv') {
            var csvData = this.convertToCSV();
            Utils.downloadFile(csvData, filename + '.csv', 'text/csv');
        }
        
        return { success: true, filename: filename };
    };

    DataManager.prototype.convertToCSV = function() {
        var headers = [
            'ID', 'Название', 'Описание', 'Тип', 'Дата начала', 'Дата окончания',
            'Длительность', 'Прогресс', 'Приоритет', 'Исполнитель', 'Зависимости'
        ];
        
        var rows = [];
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            rows.push([
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
        }
        
        var csvRows = [headers];
        for (var i = 0; i < rows.length; i++) {
            var csvRow = [];
            for (var j = 0; j < rows[i].length; j++) {
                csvRow.push('"' + rows[i][j] + '"');
            }
            csvRows.push(csvRow.join(','));
        }
        
        return csvRows.join('\n');
    };

    // Auto-save functionality
    DataManager.prototype.setupAutoSave = function() {
        var self = this;
        if (this.settings.autoSave) {
            setInterval(function() {
                self.saveToStorage();
            }, this.settings.autoSaveInterval);
        }
    };

    // Event system
    DataManager.prototype.notifyChange = function(eventType, data) {
        var event = new CustomEvent('dataChange', {
            detail: { type: eventType, data: data }
        });
        document.dispatchEvent(event);
    };

    // Search and filter
    DataManager.prototype.searchTasks = function(query, fields) {
        fields = fields || ['name', 'description', 'assignee'];
        if (!query) return this.tasks;
        
        var lowerQuery = query.toLowerCase();
        var result = [];
        
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            var found = false;
            
            for (var j = 0; j < fields.length; j++) {
                var field = fields[j];
                var value = task[field];
                if (value && value.toString().toLowerCase().indexOf(lowerQuery) !== -1) {
                    found = true;
                    break;
                }
            }
            
            if (found) {
                result.push(task);
            }
        }
        
        return result;
    };

    DataManager.prototype.filterTasks = function(filters) {
        var result = [];
        
        for (var i = 0; i < this.tasks.length; i++) {
            var task = this.tasks[i];
            var passesFilter = true;
            
            if (filters.type && task.type !== filters.type) {
                passesFilter = false;
            }
            
            if (filters.priority && task.priority !== filters.priority) {
                passesFilter = false;
            }
            
            if (filters.assignee && task.assignee !== filters.assignee) {
                passesFilter = false;
            }
            
            if (filters.progress !== undefined) {
                if (filters.progress === 'completed' && task.progress < 100) {
                    passesFilter = false;
                } else if (filters.progress === 'in-progress' && (task.progress <= 0 || task.progress >= 100)) {
                    passesFilter = false;
                } else if (filters.progress === 'not-started' && task.progress > 0) {
                    passesFilter = false;
                }
            }
            
            if (filters.dateRange) {
                var taskStart = new Date(task.startDate);
                var taskEnd = new Date(task.endDate);
                var rangeStart = new Date(filters.dateRange.start);
                var rangeEnd = new Date(filters.dateRange.end);
                
                if (taskStart > rangeEnd || taskEnd < rangeStart) {
                    passesFilter = false;
                }
            }
            
            if (passesFilter) {
                result.push(task);
            }
        }
        
        return result;
    };

    // Make DataManager globally available
    window.DataManager = DataManager;

})();
