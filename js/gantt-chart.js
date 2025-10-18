// Gantt Chart Component - Main visualization component

class GanttChart {
    constructor(container, dataManager) {
        this.container = container;
        this.dataManager = dataManager;
        this.currentZoom = 'weeks';
        this.currentDate = new Date();
        this.scrollPosition = { x: 0, y: 0 };
        this.selectedTasks = new Set();
        this.taskRowHeight = 40;
        this.timelineHeight = 60;
        this.dayWidth = 30;
        this.isDragging = false;
        this.dragState = null;
        
        this.initialize();
        this.setupEventListeners();
    }

    initialize() {
        this.createStructure();
        this.render();
    }

    createStructure() {
        this.container.innerHTML = `
            <div class="gantt-container">
                <div class="gantt-header">
                    <div class="gantt-timeline" id="gantt-timeline"></div>
                </div>
                <div class="gantt-body">
                    <div class="gantt-grid" id="gantt-grid"></div>
                    <div class="gantt-bars" id="gantt-bars"></div>
                    <div class="gantt-dependencies" id="gantt-dependencies"></div>
                </div>
            </div>
        `;
        
        this.timelineContainer = this.container.querySelector('#gantt-timeline');
        this.gridContainer = this.container.querySelector('#gantt-grid');
        this.barsContainer = this.container.querySelector('#gantt-bars');
        this.dependenciesContainer = this.container.querySelector('#gantt-dependencies');
    }

    setupEventListeners() {
        // Data change events
        document.addEventListener('dataChange', (event) => {
            const { type } = event.detail;
            if (['task-created', 'task-updated', 'task-deleted'].includes(type)) {
                this.render();
            }
        });

        // Mouse events for dragging
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Touch events for mobile
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Zoom controls
        const zoomSelect = document.getElementById('zoom-level');
        if (zoomSelect) {
            zoomSelect.addEventListener('change', (e) => {
                this.setZoom(e.target.value);
            });
        }

        // Navigation buttons
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.goToToday());
        }

        const fitBtn = document.getElementById('fit-to-screen');
        if (fitBtn) {
            fitBtn.addEventListener('click', () => this.fitToScreen());
        }
    }

    render() {
        this.renderTimeline();
        this.renderTasks();
        this.renderDependencies();
        this.updateScrollPosition();
    }

    renderTimeline() {
        const { startDate, endDate } = this.getDateRange();
        const timelineData = this.generateTimelineData(startDate, endDate);
        
        this.timelineContainer.innerHTML = '';
        
        // Create timeline structure
        const timelineContainer = Utils.createElement('div', 'timeline-container');
        
        // Year headers
        const years = this.getUniqueYears(timelineData);
        years.forEach(year => {
            const yearElement = Utils.createElement('div', 'timeline-year');
            yearElement.textContent = year;
            yearElement.style.width = this.getYearWidth(year) + 'px';
            timelineContainer.appendChild(yearElement);
        });
        
        // Month headers
        const months = this.getUniqueMonths(timelineData);
        months.forEach(month => {
            const monthElement = Utils.createElement('div', 'timeline-month');
            monthElement.textContent = month.name;
            monthElement.style.width = this.getMonthWidth(month) + 'px';
            timelineContainer.appendChild(monthElement);
        });
        
        // Day headers
        timelineData.forEach(day => {
            const dayElement = Utils.createElement('div', 'timeline-day');
            dayElement.textContent = day.day;
            dayElement.style.width = this.dayWidth + 'px';
            
            if (day.isToday) dayElement.classList.add('today');
            if (day.isWeekend) dayElement.classList.add('weekend');
            if (day.isHoliday) dayElement.classList.add('holiday');
            
            timelineContainer.appendChild(dayElement);
        });
        
        this.timelineContainer.appendChild(timelineContainer);
    }

    renderTasks() {
        this.barsContainer.innerHTML = '';
        const tasks = this.dataManager.getRootTasks();
        
        tasks.forEach((task, index) => {
            this.renderTask(task, index);
            this.renderChildTasks(task, index + 1, 1);
        });
    }

    renderTask(task, rowIndex, level = 0) {
        const taskRow = Utils.createElement('div', 'task-row');
        taskRow.style.top = (rowIndex * this.taskRowHeight) + 'px';
        taskRow.style.height = this.taskRowHeight + 'px';
        taskRow.dataset.taskId = task.id;
        
        if (this.selectedTasks.has(task.id)) {
            taskRow.classList.add('selected');
        }
        
        if (task.type === 'milestone') {
            taskRow.classList.add('milestone');
        }
        
        // Task info section
        const taskInfo = Utils.createElement('div', 'task-info');
        taskInfo.style.paddingLeft = (level * 20) + 'px';
        
        // Level indicator
        const levelIndicator = Utils.createElement('div', 'task-level');
        const hasChildren = this.dataManager.getTasksByParent(task.id).length > 0;
        
        if (hasChildren) {
            const toggleBtn = Utils.createElement('button', 'task-level-toggle');
            toggleBtn.classList.add(task.expanded ? 'expanded' : 'collapsed');
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskExpansion(task.id);
            });
            levelIndicator.appendChild(toggleBtn);
        } else {
            levelIndicator.innerHTML = '<div class="task-level-indent"></div>';
        }
        
        // Task icon
        const taskIcon = Utils.createElement('div', `task-icon ${task.type}`);
        
        // Task name
        const taskName = Utils.createElement('div', 'task-name');
        taskName.textContent = task.name;
        taskName.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTask(task.id);
        });
        
        // Task progress
        const progressContainer = Utils.createElement('div', 'task-progress-container');
        const progressBar = Utils.createElement('div', 'task-progress');
        const progressFill = Utils.createElement('div', 'task-progress-bar');
        progressFill.style.width = task.progress + '%';
        progressBar.appendChild(progressFill);
        
        const progressText = Utils.createElement('span', 'task-progress-text');
        progressText.textContent = task.progress + '%';
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        
        taskInfo.appendChild(levelIndicator);
        taskInfo.appendChild(taskIcon);
        taskInfo.appendChild(taskName);
        taskInfo.appendChild(progressContainer);
        
        taskRow.appendChild(taskInfo);
        
        // Gantt bar
        const ganttBar = this.createGanttBar(task);
        taskRow.appendChild(ganttBar);
        
        this.barsContainer.appendChild(taskRow);
    }

    renderChildTasks(parentTask, startRowIndex, level) {
        if (!parentTask.expanded) return startRowIndex;
        
        const children = this.dataManager.getTasksByParent(parentTask.id);
        let currentRowIndex = startRowIndex;
        
        children.forEach(child => {
            this.renderTask(child, currentRowIndex, level);
            currentRowIndex++;
            currentRowIndex = this.renderChildTasks(child, currentRowIndex, level + 1);
        });
        
        return currentRowIndex;
    }

    createGanttBar(task) {
        const barContainer = Utils.createElement('div', 'gantt-bar-container');
        const bar = Utils.createElement('div', `task-bar ${task.type}`);
        
        const startX = this.getDatePosition(task.startDate);
        const width = this.getTaskWidth(task);
        
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
            const progressBar = Utils.createElement('div', 'task-bar-progress');
            progressBar.style.width = task.progress + '%';
            bar.appendChild(progressBar);
        }
        
        // Add task text
        const barText = Utils.createElement('div', 'task-bar-text');
        barText.textContent = task.name;
        bar.appendChild(barText);
        
        // Add drag handles
        const leftHandle = Utils.createElement('div', 'drag-handle left-handle');
        const rightHandle = Utils.createElement('div', 'drag-handle right-handle');
        
        leftHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startDrag(task, 'start', e);
        });
        
        rightHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startDrag(task, 'end', e);
        });
        
        bar.appendChild(leftHandle);
        bar.appendChild(rightHandle);
        
        // Click handler
        bar.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTask(task.id);
        });
        
        barContainer.appendChild(bar);
        return barContainer;
    }

    renderDependencies() {
        this.dependenciesContainer.innerHTML = '';
        
        // Create SVG for dependencies
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        
        // Add arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#64748b');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Render dependencies
        this.dataManager.dependencies.forEach(dep => {
            const fromTask = this.dataManager.getTask(dep.fromTaskId);
            const toTask = this.dataManager.getTask(dep.toTaskId);
            
            if (fromTask && toTask) {
                const line = this.createDependencyLine(fromTask, toTask, dep);
                svg.appendChild(line);
            }
        });
        
        this.dependenciesContainer.appendChild(svg);
    }

    createDependencyLine(fromTask, toTask, dependency) {
        const fromRow = this.getTaskRowIndex(fromTask);
        const toRow = this.getTaskRowIndex(toTask);
        
        const fromX = this.getDatePosition(fromTask.endDate) + this.getTaskWidth(fromTask);
        const fromY = (fromRow * this.taskRowHeight) + (this.taskRowHeight / 2);
        
        const toX = this.getDatePosition(toTask.startDate);
        const toY = (toRow * this.taskRowHeight) + (this.taskRowHeight / 2);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Create curved path
        const midX = (fromX + toX) / 2;
        const pathData = `M ${fromX} ${fromY} Q ${midX} ${fromY} ${toX} ${toY}`;
        line.setAttribute('d', pathData);
        line.setAttribute('stroke', '#64748b');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('fill', 'none');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        return line;
    }

    // Date and position calculations
    getDateRange() {
        const tasks = this.dataManager.tasks;
        if (tasks.length === 0) {
            const today = new Date();
            return {
                startDate: Utils.addDays(today, -30),
                endDate: Utils.addDays(today, 90)
            };
        }
        
        const dates = tasks.map(t => [t.startDate, t.endDate]).flat();
        const validDates = dates.filter(d => d instanceof Date && !isNaN(d.getTime()));
        
        const startDate = new Date(Math.min(...validDates));
        const endDate = new Date(Math.max(...validDates));
        
        // Add some padding
        return {
            startDate: Utils.addDays(startDate, -7),
            endDate: Utils.addDays(endDate, 7)
        };
    }

    getDatePosition(date) {
        const { startDate } = this.getDateRange();
        const daysDiff = Utils.getDaysBetween(startDate, date);
        return daysDiff * this.dayWidth;
    }

    getTaskWidth(task) {
        return (task.duration || 1) * this.dayWidth;
    }

    getTaskRowIndex(task) {
        const allTasks = this.getAllVisibleTasks();
        return allTasks.findIndex(t => t.id === task.id);
    }

    getAllVisibleTasks() {
        const result = [];
        const addTaskAndChildren = (task, level = 0) => {
            result.push({ ...task, level });
            if (task.expanded) {
                const children = this.dataManager.getTasksByParent(task.id);
                children.forEach(child => addTaskAndChildren(child, level + 1));
            }
        };
        
        const rootTasks = this.dataManager.getRootTasks();
        rootTasks.forEach(task => addTaskAndChildren(task));
        
        return result;
    }

    generateTimelineData(startDate, endDate) {
        const data = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            data.push({
                date: new Date(current),
                day: current.getDate(),
                month: current.getMonth(),
                year: current.getFullYear(),
                isToday: Utils.isToday(current),
                isWeekend: Utils.isWeekend(current),
                isHoliday: this.dataManager.calendar.holidays.some(h => 
                    new Date(h).toDateString() === current.toDateString())
            });
            
            current.setDate(current.getDate() + 1);
        }
        
        return data;
    }

    getUniqueYears(timelineData) {
        return [...new Set(timelineData.map(d => d.year))].sort();
    }

    getUniqueMonths(timelineData) {
        const months = [];
        const monthMap = new Map();
        
        timelineData.forEach(day => {
            const key = `${day.year}-${day.month}`;
            if (!monthMap.has(key)) {
                monthMap.set(key, {
                    year: day.year,
                    month: day.month,
                    name: new Date(day.year, day.month).toLocaleDateString('ru-RU', { month: 'short' }),
                    days: 0
                });
                months.push(monthMap.get(key));
            }
            monthMap.get(key).days++;
        });
        
        return months;
    }

    getYearWidth(year) {
        const { startDate, endDate } = this.getDateRange();
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        const start = yearStart > startDate ? yearStart : startDate;
        const end = yearEnd < endDate ? yearEnd : endDate;
        
        return Utils.getDaysBetween(start, end) * this.dayWidth;
    }

    getMonthWidth(month) {
        return month.days * this.dayWidth;
    }

    // Interaction handlers
    handleMouseDown(event) {
        const taskRow = event.target.closest('.task-row');
        if (taskRow) {
            const taskId = taskRow.dataset.taskId;
            if (taskId) {
                if (event.ctrlKey || event.metaKey) {
                    this.toggleTaskSelection(taskId);
                } else {
                    this.selectTask(taskId);
                }
            }
        }
    }

    handleMouseMove(event) {
        if (this.isDragging && this.dragState) {
            const deltaX = event.clientX - this.dragState.startX;
            const deltaDays = Math.round(deltaX / this.dayWidth);
            
            if (this.dragState.type === 'start') {
                const newStartDate = Utils.addDays(this.dragState.task.startDate, deltaDays);
                const duration = this.dragState.task.duration;
                this.dataManager.updateTask(this.dragState.task.id, {
                    startDate: newStartDate,
                    endDate: Utils.addDays(newStartDate, duration - 1)
                });
            } else if (this.dragState.type === 'end') {
                const newEndDate = Utils.addDays(this.dragState.task.endDate, deltaDays);
                const duration = Utils.getDaysBetween(this.dragState.task.startDate, newEndDate) + 1;
                this.dataManager.updateTask(this.dragState.task.id, {
                    endDate: newEndDate,
                    duration: duration
                });
            }
        }
    }

    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragState = null;
            document.body.style.cursor = 'default';
        }
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    handleKeyDown(event) {
        if (event.key === 'Delete' && this.selectedTasks.size > 0) {
            this.selectedTasks.forEach(taskId => {
                this.dataManager.deleteTask(taskId);
            });
            this.selectedTasks.clear();
        }
    }

    startDrag(task, type, event) {
        this.isDragging = true;
        this.dragState = {
            task: task,
            type: type,
            startX: event.clientX
        };
        
        document.body.style.cursor = 'ew-resize';
        event.preventDefault();
    }

    // Task selection and management
    selectTask(taskId) {
        this.selectedTasks.clear();
        this.selectedTasks.add(taskId);
        this.updateSelection();
        this.notifyTaskSelection(taskId);
    }

    toggleTaskSelection(taskId) {
        if (this.selectedTasks.has(taskId)) {
            this.selectedTasks.delete(taskId);
        } else {
            this.selectedTasks.add(taskId);
        }
        this.updateSelection();
    }

    updateSelection() {
        const taskRows = this.container.querySelectorAll('.task-row');
        taskRows.forEach(row => {
            const taskId = row.dataset.taskId;
            if (this.selectedTasks.has(taskId)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    toggleTaskExpansion(taskId) {
        const task = this.dataManager.getTask(taskId);
        if (task) {
            this.dataManager.updateTask(taskId, { expanded: !task.expanded });
            this.render();
        }
    }

    notifyTaskSelection(taskId) {
        const event = new CustomEvent('taskSelected', {
            detail: { taskId: taskId, task: this.dataManager.getTask(taskId) }
        });
        document.dispatchEvent(event);
    }

    // Zoom and navigation
    setZoom(zoomLevel) {
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
    }

    goToToday() {
        this.currentDate = new Date();
        this.scrollToDate(this.currentDate);
    }

    fitToScreen() {
        const { startDate, endDate } = this.getDateRange();
        const totalDays = Utils.getDaysBetween(startDate, endDate);
        const containerWidth = this.container.clientWidth - 300; // Account for task panel
        this.dayWidth = Math.max(10, containerWidth / totalDays);
        this.render();
    }

    scrollToDate(date) {
        const position = this.getDatePosition(date);
        this.container.scrollLeft = position;
    }

    updateScrollPosition() {
        // Sync scroll position with container
        this.container.scrollLeft = this.scrollPosition.x;
        this.container.scrollTop = this.scrollPosition.y;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttChart;
}
