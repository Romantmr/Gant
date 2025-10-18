// Gantt Chart Component - Main visualization component (ES5 compatible)

(function() {
    'use strict';

    // ES5 compatible GanttChart constructor
    function GanttChart(container, dataManager) {
        this.container = container;
        this.dataManager = dataManager;
        this.currentZoom = 'weeks';
        this.currentDate = new Date();
        this.scrollPosition = { x: 0, y: 0 };
        this.selectedTasks = {};
        this.taskRowHeight = 40;
        this.timelineHeight = 60;
        this.dayWidth = 30;
        this.isDragging = false;
        this.dragState = null;
        
        this.initialize();
        this.setupEventListeners();
    }

    GanttChart.prototype.initialize = function() {
        this.createStructure();
        this.render();
    };

    GanttChart.prototype.createStructure = function() {
        this.container.innerHTML = 
            '<div class="gantt-container">' +
                '<div class="gantt-header">' +
                    '<div class="gantt-timeline" id="gantt-timeline"></div>' +
                '</div>' +
                '<div class="gantt-body">' +
                    '<div class="gantt-grid" id="gantt-grid"></div>' +
                    '<div class="gantt-bars" id="gantt-bars"></div>' +
                    '<div class="gantt-dependencies" id="gantt-dependencies"></div>' +
                '</div>' +
            '</div>';
        
        this.timelineContainer = this.container.querySelector('#gantt-timeline');
        this.gridContainer = this.container.querySelector('#gantt-grid');
        this.barsContainer = this.container.querySelector('#gantt-bars');
        this.dependenciesContainer = this.container.querySelector('#gantt-dependencies');
    };

    GanttChart.prototype.setupEventListeners = function() {
        var self = this;
        
        // Data change events
        document.addEventListener('dataChange', function(event) {
            var type = event.detail.type;
            if (type === 'task-created' || type === 'task-updated' || type === 'task-deleted') {
                self.render();
            }
        });

        // Mouse events for dragging
        this.container.addEventListener('mousedown', function(e) { self.handleMouseDown(e); });
        document.addEventListener('mousemove', function(e) { self.handleMouseMove(e); });
        document.addEventListener('mouseup', function(e) { self.handleMouseUp(e); });

        // Touch events for mobile
        this.container.addEventListener('touchstart', function(e) { self.handleTouchStart(e); });
        document.addEventListener('touchmove', function(e) { self.handleTouchMove(e); });
        document.addEventListener('touchend', function(e) { self.handleTouchEnd(e); });

        // Keyboard events
        document.addEventListener('keydown', function(e) { self.handleKeyDown(e); });

        // Zoom controls
        var zoomSelect = document.getElementById('zoom-level');
        if (zoomSelect) {
            zoomSelect.addEventListener('change', function(e) {
                self.setZoom(e.target.value);
            });
        }

        // Navigation buttons
        var todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', function() { self.goToToday(); });
        }

        var fitBtn = document.getElementById('fit-to-screen');
        if (fitBtn) {
            fitBtn.addEventListener('click', function() { self.fitToScreen(); });
        }
    };

    GanttChart.prototype.render = function() {
        this.renderTimeline();
        this.renderTasks();
        this.renderDependencies();
        this.updateScrollPosition();
    };

    GanttChart.prototype.renderTimeline = function() {
        var dateRange = this.getDateRange();
        var timelineData = this.generateTimelineData(dateRange.startDate, dateRange.endDate);
        
        this.timelineContainer.innerHTML = '';
        
        // Create timeline structure
        var timelineContainer = Utils.createElement('div', 'timeline-container');
        
        // Year headers
        var years = this.getUniqueYears(timelineData);
        for (var i = 0; i < years.length; i++) {
            var yearElement = Utils.createElement('div', 'timeline-year');
            yearElement.textContent = years[i];
            yearElement.style.width = this.getYearWidth(years[i]) + 'px';
            timelineContainer.appendChild(yearElement);
        }
        
        // Month headers
        var months = this.getUniqueMonths(timelineData);
        for (var i = 0; i < months.length; i++) {
            var monthElement = Utils.createElement('div', 'timeline-month');
            monthElement.textContent = months[i].name;
            monthElement.style.width = this.getMonthWidth(months[i]) + 'px';
            timelineContainer.appendChild(monthElement);
        }
        
        // Day headers
        for (var i = 0; i < timelineData.length; i++) {
            var day = timelineData[i];
            var dayElement = Utils.createElement('div', 'timeline-day');
            dayElement.textContent = day.day;
            dayElement.style.width = this.dayWidth + 'px';
            
            if (day.isToday) dayElement.classList.add('today');
            if (day.isWeekend) dayElement.classList.add('weekend');
            if (day.isHoliday) dayElement.classList.add('holiday');
            
            timelineContainer.appendChild(dayElement);
        }
        
        this.timelineContainer.appendChild(timelineContainer);
    };

    GanttChart.prototype.renderTasks = function() {
        this.barsContainer.innerHTML = '';
        var tasks = this.dataManager.getRootTasks();
        
        for (var i = 0; i < tasks.length; i++) {
            this.renderTask(tasks[i], i);
            this.renderChildTasks(tasks[i], i + 1, 1);
        }
    };

    GanttChart.prototype.renderTask = function(task, rowIndex, level) {
        level = level || 0;
        var taskRow = Utils.createElement('div', 'task-row');
        taskRow.style.top = (rowIndex * this.taskRowHeight) + 'px';
        taskRow.style.height = this.taskRowHeight + 'px';
        taskRow.dataset.taskId = task.id;
        
        if (this.selectedTasks[task.id]) {
            taskRow.classList.add('selected');
        }
        
        if (task.type === 'milestone') {
            taskRow.classList.add('milestone');
        }
        
        // Task info section
        var taskInfo = Utils.createElement('div', 'task-info');
        taskInfo.style.paddingLeft = (level * 20) + 'px';
        
        // Level indicator
        var levelIndicator = Utils.createElement('div', 'task-level');
        var hasChildren = this.dataManager.getTasksByParent(task.id).length > 0;
        
        if (hasChildren) {
            var toggleBtn = Utils.createElement('button', 'task-level-toggle');
            toggleBtn.classList.add(task.expanded ? 'expanded' : 'collapsed');
            var self = this;
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                self.toggleTaskExpansion(task.id);
            });
            levelIndicator.appendChild(toggleBtn);
        } else {
            levelIndicator.innerHTML = '<div class="task-level-indent"></div>';
        }
        
        // Task icon
        var taskIcon = Utils.createElement('div', 'task-icon ' + task.type);
        
        // Task name
        var taskName = Utils.createElement('div', 'task-name');
        taskName.textContent = task.name;
        var self = this;
        taskName.addEventListener('click', function(e) {
            e.stopPropagation();
            self.selectTask(task.id);
        });
        
        // Task progress
        var progressContainer = Utils.createElement('div', 'task-progress-container');
        var progressBar = Utils.createElement('div', 'task-progress');
        var progressFill = Utils.createElement('div', 'task-progress-bar');
        progressFill.style.width = task.progress + '%';
        progressBar.appendChild(progressFill);
        
        var progressText = Utils.createElement('span', 'task-progress-text');
        progressText.textContent = task.progress + '%';
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        
        taskInfo.appendChild(levelIndicator);
        taskInfo.appendChild(taskIcon);
        taskInfo.appendChild(taskName);
        taskInfo.appendChild(progressContainer);
        
        taskRow.appendChild(taskInfo);
        
        // Gantt bar
        var ganttBar = this.createGanttBar(task);
        taskRow.appendChild(ganttBar);
        
        this.barsContainer.appendChild(taskRow);
    };

    GanttChart.prototype.renderChildTasks = function(parentTask, startRowIndex, level) {
        if (!parentTask.expanded) return startRowIndex;
        
        var children = this.dataManager.getTasksByParent(parentTask.id);
        var currentRowIndex = startRowIndex;
        
        for (var i = 0; i < children.length; i++) {
            this.renderTask(children[i], currentRowIndex, level);
            currentRowIndex++;
            currentRowIndex = this.renderChildTasks(children[i], currentRowIndex, level + 1);
        }
        
        return currentRowIndex;
    };

    GanttChart.prototype.createGanttBar = function(task) {
        var barContainer = Utils.createElement('div', 'gantt-bar-container');
        var bar = Utils.createElement('div', 'task-bar ' + task.type);
        
        var startX = this.getDatePosition(task.startDate);
        var width = this.getTaskWidth(task);
        
        bar.style.left = startX + 'px';
        bar.style.width = width + 'px';
        bar.style.top = '10px';
        bar.style.height = '20px';
        
        // Set bar color based on status
        if (task.progress === 100) {
            bar.classList.add('completed');
        } else if (task.progress > 0) {
            bar.classList.add('in-progress');
        }
        
        // Add progress indicator
        if (task.progress > 0 && task.progress < 100) {
            var progressBar = Utils.createElement('div', 'task-bar-progress');
            progressBar.style.width = task.progress + '%';
            bar.appendChild(progressBar);
        }
        
        // Add task text
        var barText = Utils.createElement('div', 'task-bar-text');
        barText.textContent = task.name;
        bar.appendChild(barText);
        
        // Add drag handles
        var leftHandle = Utils.createElement('div', 'drag-handle left-handle');
        var rightHandle = Utils.createElement('div', 'drag-handle right-handle');
        
        var self = this;
        leftHandle.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            self.startDrag(task, 'start', e);
        });
        
        rightHandle.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            self.startDrag(task, 'end', e);
        });
        
        bar.appendChild(leftHandle);
        bar.appendChild(rightHandle);
        
        // Click handler
        bar.addEventListener('click', function(e) {
            e.stopPropagation();
            self.selectTask(task.id);
        });
        
        barContainer.appendChild(bar);
        return barContainer;
    };

    GanttChart.prototype.renderDependencies = function() {
        this.dependenciesContainer.innerHTML = '';
        
        // Create SVG for dependencies
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        
        // Add arrow marker
        var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#64748b');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Render dependencies
        for (var i = 0; i < this.dataManager.dependencies.length; i++) {
            var dep = this.dataManager.dependencies[i];
            var fromTask = this.dataManager.getTask(dep.fromTaskId);
            var toTask = this.dataManager.getTask(dep.toTaskId);
            
            if (fromTask && toTask) {
                var line = this.createDependencyLine(fromTask, toTask, dep);
                svg.appendChild(line);
            }
        }
        
        this.dependenciesContainer.appendChild(svg);
    };

    GanttChart.prototype.createDependencyLine = function(fromTask, toTask, dependency) {
        var fromRow = this.getTaskRowIndex(fromTask);
        var toRow = this.getTaskRowIndex(toTask);
        
        var fromX = this.getDatePosition(fromTask.endDate) + this.getTaskWidth(fromTask);
        var fromY = (fromRow * this.taskRowHeight) + (this.taskRowHeight / 2);
        
        var toX = this.getDatePosition(toTask.startDate);
        var toY = (toRow * this.taskRowHeight) + (this.taskRowHeight / 2);
        
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Create curved path
        var midX = (fromX + toX) / 2;
        var pathData = 'M ' + fromX + ' ' + fromY + ' Q ' + midX + ' ' + fromY + ' ' + toX + ' ' + toY;
        line.setAttribute('d', pathData);
        line.setAttribute('stroke', '#64748b');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('fill', 'none');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        return line;
    };

    // Date and position calculations
    GanttChart.prototype.getDateRange = function() {
        var tasks = this.dataManager.tasks;
        if (tasks.length === 0) {
            var today = new Date();
            return {
                startDate: Utils.addDays(today, -30),
                endDate: Utils.addDays(today, 90)
            };
        }
        
        var dates = [];
        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
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
        
        var startDate = new Date(Math.min.apply(Math, validDates));
        var endDate = new Date(Math.max.apply(Math, validDates));
        
        // Add some padding
        return {
            startDate: Utils.addDays(startDate, -7),
            endDate: Utils.addDays(endDate, 7)
        };
    };

    GanttChart.prototype.getDatePosition = function(date) {
        var dateRange = this.getDateRange();
        var daysDiff = Utils.getDaysBetween(dateRange.startDate, date);
        return daysDiff * this.dayWidth;
    };

    GanttChart.prototype.getTaskWidth = function(task) {
        return (task.duration || 1) * this.dayWidth;
    };

    GanttChart.prototype.getTaskRowIndex = function(task) {
        var allTasks = this.getAllVisibleTasks();
        for (var i = 0; i < allTasks.length; i++) {
            if (allTasks[i].id === task.id) {
                return i;
            }
        }
        return -1;
    };

    GanttChart.prototype.getAllVisibleTasks = function() {
        var result = [];
        var self = this;
        
        var addTaskAndChildren = function(task, level) {
            level = level || 0;
            result.push({ id: task.id, level: level });
            if (task.expanded) {
                var children = self.dataManager.getTasksByParent(task.id);
                for (var i = 0; i < children.length; i++) {
                    addTaskAndChildren(children[i], level + 1);
                }
            }
        };
        
        var rootTasks = this.dataManager.getRootTasks();
        for (var i = 0; i < rootTasks.length; i++) {
            addTaskAndChildren(rootTasks[i]);
        }
        
        return result;
    };

    GanttChart.prototype.generateTimelineData = function(startDate, endDate) {
        var data = [];
        var current = new Date(startDate);
        
        while (current <= endDate) {
            data.push({
                date: new Date(current),
                day: current.getDate(),
                month: current.getMonth(),
                year: current.getFullYear(),
                isToday: Utils.isToday(current),
                isWeekend: Utils.isWeekend(current),
                isHoliday: this.dataManager.calendar.holidays.some(function(h) {
                    return new Date(h).toDateString() === current.toDateString();
                })
            });
            
            current.setDate(current.getDate() + 1);
        }
        
        return data;
    };

    GanttChart.prototype.getUniqueYears = function(timelineData) {
        var years = [];
        var yearSet = {};
        
        for (var i = 0; i < timelineData.length; i++) {
            var year = timelineData[i].year;
            if (!yearSet[year]) {
                yearSet[year] = true;
                years.push(year);
            }
        }
        
        return years.sort();
    };

    GanttChart.prototype.getUniqueMonths = function(timelineData) {
        var months = [];
        var monthMap = {};
        
        for (var i = 0; i < timelineData.length; i++) {
            var day = timelineData[i];
            var key = day.year + '-' + day.month;
            if (!monthMap[key]) {
                monthMap[key] = {
                    year: day.year,
                    month: day.month,
                    name: new Date(day.year, day.month).toLocaleDateString('ru-RU', { month: 'short' }),
                    days: 0
                };
                months.push(monthMap[key]);
            }
            monthMap[key].days++;
        }
        
        return months;
    };

    GanttChart.prototype.getYearWidth = function(year) {
        var dateRange = this.getDateRange();
        var yearStart = new Date(year, 0, 1);
        var yearEnd = new Date(year, 11, 31);
        
        var start = yearStart > dateRange.startDate ? yearStart : dateRange.startDate;
        var end = yearEnd < dateRange.endDate ? yearEnd : dateRange.endDate;
        
        return Utils.getDaysBetween(start, end) * this.dayWidth;
    };

    GanttChart.prototype.getMonthWidth = function(month) {
        return month.days * this.dayWidth;
    };

    // Interaction handlers
    GanttChart.prototype.handleMouseDown = function(event) {
        var taskRow = event.target.closest('.task-row');
        if (taskRow) {
            var taskId = taskRow.dataset.taskId;
            if (taskId) {
                if (event.ctrlKey || event.metaKey) {
                    this.toggleTaskSelection(taskId);
                } else {
                    this.selectTask(taskId);
                }
            }
        }
    };

    GanttChart.prototype.handleMouseMove = function(event) {
        if (this.isDragging && this.dragState) {
            var deltaX = event.clientX - this.dragState.startX;
            var deltaDays = Math.round(deltaX / this.dayWidth);
            
            if (this.dragState.type === 'start') {
                var newStartDate = Utils.addDays(this.dragState.task.startDate, deltaDays);
                var duration = this.dragState.task.duration;
                this.dataManager.updateTask(this.dragState.task.id, {
                    startDate: newStartDate,
                    endDate: Utils.addDays(newStartDate, duration - 1)
                });
            } else if (this.dragState.type === 'end') {
                var newEndDate = Utils.addDays(this.dragState.task.endDate, deltaDays);
                var duration = Utils.getDaysBetween(this.dragState.task.startDate, newEndDate) + 1;
                this.dataManager.updateTask(this.dragState.task.id, {
                    endDate: newEndDate,
                    duration: duration
                });
            }
        }
    };

    GanttChart.prototype.handleMouseUp = function(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragState = null;
            document.body.style.cursor = 'default';
        }
    };

    GanttChart.prototype.handleTouchStart = function(event) {
        event.preventDefault();
        var touch = event.touches[0];
        var mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    };

    GanttChart.prototype.handleTouchMove = function(event) {
        event.preventDefault();
        var touch = event.touches[0];
        var mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    };

    GanttChart.prototype.handleTouchEnd = function(event) {
        event.preventDefault();
        var mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    };

    GanttChart.prototype.handleKeyDown = function(event) {
        if (event.key === 'Delete' && Object.keys(this.selectedTasks).length > 0) {
            for (var taskId in this.selectedTasks) {
                if (this.selectedTasks.hasOwnProperty(taskId)) {
                    this.dataManager.deleteTask(taskId);
                }
            }
            this.selectedTasks = {};
        }
    };

    GanttChart.prototype.startDrag = function(task, type, event) {
        this.isDragging = true;
        this.dragState = {
            task: task,
            type: type,
            startX: event.clientX
        };
        
        document.body.style.cursor = 'ew-resize';
        event.preventDefault();
    };

    // Task selection and management
    GanttChart.prototype.selectTask = function(taskId) {
        this.selectedTasks = {};
        this.selectedTasks[taskId] = true;
        this.updateSelection();
        this.notifyTaskSelection(taskId);
    };

    GanttChart.prototype.toggleTaskSelection = function(taskId) {
        if (this.selectedTasks[taskId]) {
            delete this.selectedTasks[taskId];
        } else {
            this.selectedTasks[taskId] = true;
        }
        this.updateSelection();
    };

    GanttChart.prototype.updateSelection = function() {
        var taskRows = this.container.querySelectorAll('.task-row');
        var self = this;
        for (var i = 0; i < taskRows.length; i++) {
            var row = taskRows[i];
            var taskId = row.dataset.taskId;
            if (self.selectedTasks[taskId]) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        }
    };

    GanttChart.prototype.toggleTaskExpansion = function(taskId) {
        var task = this.dataManager.getTask(taskId);
        if (task) {
            this.dataManager.updateTask(taskId, { expanded: !task.expanded });
            this.render();
        }
    };

    GanttChart.prototype.notifyTaskSelection = function(taskId) {
        var event = new CustomEvent('taskSelected', {
            detail: { taskId: taskId, task: this.dataManager.getTask(taskId) }
        });
        document.dispatchEvent(event);
    };

    // Zoom and navigation
    GanttChart.prototype.setZoom = function(zoomLevel) {
        this.currentZoom = zoomLevel;
        
        switch (zoomLevel) {
            case 'days':
                this.dayWidth = 30;
                break;
            case 'weeks':
                this.dayWidth = 20;
                break;
            case 'months':
                this.dayWidth = 15;
                break;
            case 'quarters':
                this.dayWidth = 10;
                break;
        }
        
        this.render();
    };

    GanttChart.prototype.goToToday = function() {
        this.currentDate = new Date();
        this.scrollToDate(this.currentDate);
    };

    GanttChart.prototype.fitToScreen = function() {
        var dateRange = this.getDateRange();
        var totalDays = Utils.getDaysBetween(dateRange.startDate, dateRange.endDate);
        var containerWidth = this.container.clientWidth - 300; // Account for task panel
        this.dayWidth = Math.max(10, containerWidth / totalDays);
        this.render();
    };

    GanttChart.prototype.scrollToDate = function(date) {
        var position = this.getDatePosition(date);
        this.container.scrollLeft = position;
    };

    GanttChart.prototype.updateScrollPosition = function() {
        // Sync scroll position with container
        this.container.scrollLeft = this.scrollPosition.x;
        this.container.scrollTop = this.scrollPosition.y;
    };

    // Make GanttChart globally available
    window.GanttChart = GanttChart;

})();
