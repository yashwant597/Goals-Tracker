// DOM Elements
const goalInput = document.getElementById('goal-input');
const addGoalBtn = document.getElementById('add-goal');
const goalsList = document.getElementById('goals-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed');
const totalCountEl = document.getElementById('total-count');
const completedCountEl = document.getElementById('completed-count');
const pendingCountEl = document.getElementById('pending-count');
const loader = document.getElementById('loader');
const noResults = document.getElementById('no-results');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const notificationClose = document.getElementById('notification-close');

// App State
let goals = [];
let currentFilter = 'all';
let searchTerm = '';

// Initialize app
function init() {
    try {
        loadGoals();
        renderGoals();
        updateStats();
        
        // Event listeners
        addGoalBtn.addEventListener('click', addGoal);
        goalInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') addGoal();
        });
        
        goalInput.addEventListener('input', validateInput);
        
        searchInput.addEventListener('input', e => {
            try {
                searchTerm = e.target.value.trim().toLowerCase();
                renderGoals();
            } catch (error) {
                showNotification('Error while searching: ' + error.message, 'error');
            }
        });
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    currentFilter = btn.dataset.filter;
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderGoals();
                } catch (error) {
                    showNotification('Error applying filter: ' + error.message, 'error');
                }
            });
        });
        
        clearCompletedBtn.addEventListener('click', clearCompleted);
        
        notificationClose.addEventListener('click', hideNotification);
        
        // Check if localStorage is available
        if (!isLocalStorageAvailable()) {
            showNotification('Warning: Local storage is not available. Your goals will not be saved between sessions.', 'warning');
        }
        
    } catch (error) {
        showNotification('Failed to initialize app: ' + error.message, 'error');
        console.error('Initialization error:', error);
    }
}

// Check if localStorage is available
function isLocalStorageAvailable() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// Load goals from localStorage
function loadGoals() {
    try {
        const savedGoals = localStorage.getItem('tinyGoals');
        if (savedGoals) {
            goals = JSON.parse(savedGoals);
            
            // Data validation
            if (!Array.isArray(goals)) {
                throw new Error('Stored goals data is corrupted');
            }
            
            // Ensure each goal has required properties
            goals = goals.filter(goal => {
                return goal && 
                       typeof goal === 'object' && 
                       typeof goal.id === 'string' && 
                       typeof goal.text === 'string';
            });
            
            // Fix any goals with missing properties
            goals = goals.map(goal => {
                return {
                    id: goal.id,
                    text: goal.text,
                    completed: Boolean(goal.completed),
                    createdAt: goal.createdAt || new Date().toISOString()
                };
            });
            
            saveGoals(); // Save sanitized goals
        }
    } catch (error) {
        goals = []; // Reset goals to empty array if error
        showNotification('Failed to load saved goals: ' + error.message, 'error');
        console.error('Load goals error:', error);
        
        // Attempt to clear the corrupted data
        try {
            localStorage.removeItem('tinyGoals');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
    }
}

// Save goals to localStorage
function saveGoals() {
    try {
        localStorage.setItem('tinyGoals', JSON.stringify(goals));
        updateStats();
    } catch (error) {
        showNotification('Failed to save goals: ' + error.message, 'warning');
        console.error('Save goals error:', error);
    }
}

// Validate input as user types
function validateInput() {
    const value = goalInput.value.trim();
    
    if (value.length > 100) {
        goalInput.value = value.substring(0, 100);
        showNotification('Goal text cannot exceed 100 characters', 'warning');
    }
    
    // Enable/disable add button based on input
    addGoalBtn.disabled = value.length === 0;
}

// Add a new goal
function addGoal() {
    try {
        const goalText = goalInput.value.trim();
        
        // Validate input
        if (!goalText) {
            showNotification('Goal text cannot be empty', 'warning');
            return;
        }
        
        if (goalText.length > 100) {
            showNotification('Goal text cannot exceed 100 characters', 'warning');
            return;
        }
        
        // Check for duplicates
        if (goals.some(g => g.text.toLowerCase() === goalText.toLowerCase())) {
            showNotification('This goal already exists', 'warning');
            return;
        }
        
        const newGoal = {
            id: generateUniqueId(),
            text: goalText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        goals.unshift(newGoal); // Add to beginning of array
        saveGoals();
        renderGoals();
        goalInput.value = '';
        goalInput.focus();
        addGoalBtn.disabled = true;
        
        showNotification('Goal added successfully', 'success');
    } catch (error) {
        showNotification('Failed to add goal: ' + error.message, 'error');
        console.error('Add goal error:', error);
    }
}

// Generate a unique ID
function generateUniqueId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

// Toggle goal completion
function toggleGoal(id) {
    try {
        const goal = goals.find(g => g.id === id);
        if (goal) {
            goal.completed = !goal.completed;
            saveGoals();
            renderGoals();
            
            showNotification(
                goal.completed ? 'Goal marked as completed' : 'Goal marked as active', 
                'success'
            );
        }
    } catch (error) {
        showNotification('Failed to update goal: ' + error.message, 'error');
        console.error('Toggle goal error:', error);
    }
}

// Edit goal
function editGoal(id, textElement) {
    try {
        const goal = goals.find(g => g.id === id);
        if (!goal) return;
        
        const currentText = goal.text;
        
        // Create an input for editing
        textElement.contentEditable = true;
        textElement.parentNode.parentNode.classList.add('edit-mode');
        textElement.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Set up focus and blur events
        function saveEdit() {
            const newText = textElement.textContent.trim();
            
            // Validate new text
            if (!newText) {
                textElement.textContent = currentText;
                showNotification('Goal text cannot be empty', 'warning');
            } else if (newText.length > 100) {
                textElement.textContent = newText.substring(0, 100);
                showNotification('Goal text cannot exceed 100 characters', 'warning');
            } else if (newText !== currentText) {
                // Check for duplicates
                if (goals.some(g => g.id !== id && g.text.toLowerCase() === newText.toLowerCase())) {
                    textElement.textContent = currentText;
                    showNotification('This goal already exists', 'warning');
                } else {
                    // Save the edit
                    goal.text = newText;
                    saveGoals();
                    showNotification('Goal updated successfully', 'success');
                }
            }
            
            // Cleanup
            textElement.contentEditable = false;
            textElement.parentNode.parentNode.classList.remove('edit-mode');
            textElement.removeEventListener('blur', saveEdit);
            renderGoals();
        }
        
        textElement.addEventListener('blur', saveEdit);
        
        textElement.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                textElement.blur();
            }
            if (e.key === 'Escape') {
                textElement.textContent = currentText;
                textElement.blur();
            }
        });
    } catch (error) {
        showNotification('Error editing goal: ' + error.message, 'error');
        console.error('Edit goal error:', error);
        renderGoals(); // Re-render to reset any partially edited state
    }
}

// Delete goal
function deleteGoal(id) {
    try {
        if (confirm('Are you sure you want to delete this goal?')) {
            goals = goals.filter(goal => goal.id !== id);
            saveGoals();
            renderGoals();
            showNotification('Goal deleted successfully', 'success');
        }
    } catch (error) {
        showNotification('Failed to delete goal: ' + error.message, 'error');
        console.error('Delete goal error:', error);
    }
}

// Clear completed goals
function clearCompleted() {
    try {
        const completedCount = goals.filter(g => g.completed).length;
        
        if (completedCount === 0) {
            showNotification('No completed goals to clear', 'warning');
            return;
        }
        
        if (confirm(`Clear all ${completedCount} completed goals?`)) {
            goals = goals.filter(goal => !goal.completed);
            saveGoals();
            renderGoals();
            showNotification('Completed goals cleared successfully', 'success');
        }
    } catch (error) {
        showNotification('Failed to clear completed goals: ' + error.message, 'error');
        console.error('Clear completed error:', error);
    }
}

// Filter and search goals
function getFilteredGoals() {
    try {
        return goals.filter(goal => {
            // Apply search
            const matchesSearch = searchTerm === '' || 
                goal.text.toLowerCase().includes(searchTerm);
            
            // Apply filter
            const matchesFilter = 
                currentFilter === 'all' || 
                (currentFilter === 'active' && !goal.completed) || 
                (currentFilter === 'completed' && goal.completed);
            
            return matchesSearch && matchesFilter;
        });
    } catch (error) {
        showNotification('Error filtering goals: ' + error.message, 'error');
        console.error('Filter goals error:', error);
        return [];
    }
}

// Render goals list
function renderGoals() {
    try {
        showLoader();
        
        const filteredGoals = getFilteredGoals();
        
        // Show/hide empty state and no results
        emptyState.style.display = goals.length === 0 ? 'block' : 'none';
        noResults.style.display = goals.length > 0 && filteredGoals.length === 0 ? 'block' : 'none';
        clearCompletedBtn.style.display = goals.some(g => g.completed) ? 'block' : 'none';
        
        // Clear the list
        goalsList.innerHTML = '';
        
        // Render filtered goals
        filteredGoals.forEach(goal => {
            const li = document.createElement('li');
            li.className = `goal-item ${goal.completed ? 'completed' : ''}`;
            li.dataset.id = goal.id;
            
            li.innerHTML = `
                <div class="goal-content">
                    <div class="checkbox ${goal.completed ? 'checked' : ''}">
                        ${goal.completed ? '✓' : ''}
                    </div>
                    <div class="goal-text">${escapeHTML(goal.text)}</div>
                </div>
                <div class="goal-actions">
                    <button class="edit-btn" aria-label="Edit goal">✎</button>
                    <button class="delete-btn" aria-label="Delete goal">✕</button>
                </div>
            `;
            
            // Add event listeners
            const checkbox = li.querySelector('.checkbox');
            checkbox.addEventListener('click', () => toggleGoal(goal.id));
            
            const textElement = li.querySelector('.goal-text');
            const editBtn = li.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editGoal(goal.id, textElement));
            
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteGoal(goal.id));
            
            goalsList.appendChild(li);
        });
        
        updateStats();
    } catch (error) {
        showNotification('Failed to render goals: ' + error.message, 'error');
        console.error('Render goals error:', error);
    }
}

// Update statistics
function updateStats() {
    try {
        const total = goals.length;
        const completed = goals.filter(g => g.completed).length;
        const pending = total - completed;
        
        totalCountEl.textContent = total;
        completedCountEl.textContent = completed;
        pendingCountEl.textContent = pending;
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

// Helper to escape HTML to prevent XSS
function escapeHTML(str) {
    try {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    } catch (error) {
        console.error('Escape HTML error:', error);
        return '';
    }
}

// Show loading animation
function showLoader() {
    try {
        loader.style.display = 'block';
        goalsList.style.opacity = '0.5';
        setTimeout(() => {
            loader.style.display = 'none';
            goalsList.style.opacity = '1';
        }, 300);
    } catch (error) {
        console.error('Show loader error:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    try {
        if (!message) return;
        
        notificationMessage.textContent = message;
        
        // Remove existing classes
        notification.classList.remove('success', 'warning', 'error');
        
        // Add appropriate class
        if (type === 'success' || type === 'warning' || type === 'error') {
            notification.classList.add(type);
        }
        
        notification.classList.add('show');
        
        // Auto hide after delay
        clearTimeout(window.notificationTimeout);
        window.notificationTimeout = setTimeout(hideNotification, 3000);
    } catch (error) {
        console.error('Show notification error:', error);
    }
}

// Hide notification
function hideNotification() {
    try {
        notification.classList.remove('show');
    } catch (error) {
        console.error('Hide notification error:', error);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle unhandled errors
window.addEventListener('error', function(event) {
    showNotification('Application error: ' + (event.message || 'Unknown error'), 'error');
    console.error('Unhandled error:', event);
});
