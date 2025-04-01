$(document).ready(() => {
  // Check for notifications permission
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission()
    }
  }

  // Check for saved theme preference
  if (localStorage.getItem("darkTheme") === "true") {
    $("body").addClass("dark-theme")
    $("#dark-mode-toggle").prop("checked", true)
  }

  // Initialize variables
  let currentUser = null
  let tasks = []
  let currentFilter = "all"
  let editingTaskId = null
  let currentPage = "dashboard"
  let soundEnabled = true

  // Auth tabs
  $(".auth-tab").on("click", function () {
    const tab = $(this).data("tab")
    $(".auth-tab").removeClass("active")
    $(this).addClass("active")
    $(".auth-form").removeClass("active")
    $(`#${tab}-form`).addClass("active")
  })

  // Toggle password visibility
  $(".toggle-password").on("click", function () {
    const input = $(this).prev("input")
    if (input.attr("type") === "password") {
      input.attr("type", "text")
      $(this).removeClass("fa-eye").addClass("fa-eye-slash")
    } else {
      input.attr("type", "password")
      $(this).removeClass("fa-eye-slash").addClass("fa-eye")
    }
  })

  // Login form submission
  $("#login-btn").on("click", () => {
    const email = $("#login-email").val().trim()
    const password = $("#login-password").val()
    const rememberMe = $("#remember-me").is(":checked")

    // Reset error messages
    $(".error-message").text("")

    // Validate inputs
    let isValid = true

    if (!email) {
      $("#login-email-error").text("Email is required")
      isValid = false
    } else if (!isValidEmail(email)) {
      $("#login-email-error").text("Please enter a valid email")
      isValid = false
    }

    if (!password) {
      $("#login-password-error").text("Password is required")
      isValid = false
    }

    if (isValid) {
      // Check if user exists in localStorage
      const users = JSON.parse(localStorage.getItem("users")) || []
      const user = users.find((u) => u.email === email && u.password === password)

      if (user) {
        // Login successful
        currentUser = user

        // Save session
        if (rememberMe) {
          localStorage.setItem("currentUser", JSON.stringify(user))
        } else {
          sessionStorage.setItem("currentUser", JSON.stringify(user))
        }

        // Update UI with user info
        updateUserInfo(user)

        // Load tasks for this user
        loadTasks()

        // Show app container, hide auth container
        $("#auth-container").addClass("hidden")
        $("#app-container").removeClass("hidden")

        // Initialize dashboard
        updateDashboard()
        initializeCharts()

        // Show welcome notification
        showNotification("Welcome back!", `Good to see you again, ${user.name}!`)
      } else {
        // Login failed
        $("#login-password-error").text("Invalid email or password")
      }
    }
  })

  // Register form submission
  $("#register-btn").on("click", () => {
    const name = $("#register-name").val().trim()
    const email = $("#register-email").val().trim()
    const password = $("#register-password").val()
    const confirmPassword = $("#register-confirm-password").val()
    const termsAccepted = $("#terms-checkbox").is(":checked")

    // Reset error messages
    $(".error-message").text("")

    // Validate inputs
    let isValid = true

    if (!name) {
      $("#register-name-error").text("Name is required")
      isValid = false
    }

    if (!email) {
      $("#register-email-error").text("Email is required")
      isValid = false
    } else if (!isValidEmail(email)) {
      $("#register-email-error").text("Please enter a valid email")
      isValid = false
    }

    if (!password) {
      $("#register-password-error").text("Password is required")
      isValid = false
    } else if (password.length < 6) {
      $("#register-password-error").text("Password must be at least 6 characters")
      isValid = false
    }

    if (!confirmPassword) {
      $("#register-confirm-password-error").text("Please confirm your password")
      isValid = false
    } else if (password !== confirmPassword) {
      $("#register-confirm-password-error").text("Passwords do not match")
      isValid = false
    }

    if (!termsAccepted) {
      $("#terms-error").text("You must accept the terms and conditions")
      isValid = false
    }

    if (isValid) {
      // Check if email already exists
      const users = JSON.parse(localStorage.getItem("users")) || []
      const existingUser = users.find((u) => u.email === email)

      if (existingUser) {
        $("#register-email-error").text("This email is already registered")
      } else {
        // Create new user
        const newUser = {
          id: Date.now(),
          name,
          email,
          password,
          createdAt: new Date().toISOString(),
        }

        // Add to users array
        users.push(newUser)
        localStorage.setItem("users", JSON.stringify(users))

        // Set as current user
        currentUser = newUser
        sessionStorage.setItem("currentUser", JSON.stringify(newUser))

        // Update UI with user info
        updateUserInfo(newUser)

        // Initialize empty tasks array for this user
        tasks = []
        saveTasks()

        // Show app container, hide auth container
        $("#auth-container").addClass("hidden")
        $("#app-container").removeClass("hidden")

        // Initialize dashboard
        updateDashboard()
        initializeCharts()

        // Show welcome notification
        showNotification("Welcome to TaskMaster!", `Your account has been created successfully, ${name}!`)
      }
    }
  })

  // Check if user is already logged in
  const savedUser = JSON.parse(localStorage.getItem("currentUser")) || JSON.parse(sessionStorage.getItem("currentUser"))
  if (savedUser) {
    currentUser = savedUser
    updateUserInfo(savedUser)
    loadTasks()
    $("#auth-container").addClass("hidden")
    $("#app-container").removeClass("hidden")
    updateDashboard()
    initializeCharts()
  }

  // Logout
  $("#logout-btn, #user-logout").on("click", () => {
    // Clear session
    localStorage.removeItem("currentUser")
    sessionStorage.removeItem("currentUser")
    currentUser = null

    // Show auth container, hide app container
    $("#app-container").addClass("hidden")
    $("#auth-container").removeClass("hidden")

    // Reset forms
    $("#login-email, #login-password").val("")
    $("#register-name, #register-email, #register-password, #register-confirm-password").val("")
    $(".error-message").text("")
  })

  // Theme toggle
  $("#theme-toggle").on("click", () => {
    $("body").toggleClass("dark-theme")
    localStorage.setItem("darkTheme", $("body").hasClass("dark-theme"))
  })

  // Dark mode toggle in settings
  $("#dark-mode-toggle").on("change", function () {
    const isDarkMode = $(this).is(":checked")
    if (isDarkMode) {
      $("body").addClass("dark-theme")
    } else {
      $("body").removeClass("dark-theme")
    }
    localStorage.setItem("darkTheme", isDarkMode)
  })

  // Sound toggle in settings
  $("#sound-toggle").on("change", function () {
    soundEnabled = $(this).is(":checked")
    localStorage.setItem("soundEnabled", soundEnabled)
  })

  // Load sound preference
  if (localStorage.getItem("soundEnabled") === "false") {
    soundEnabled = false
    $("#sound-toggle").prop("checked", false)
  }

  // Sidebar toggle
  $("#sidebar-toggle").on("click", () => {
    $(".sidebar").toggleClass("collapsed")
  })

  // Mobile menu toggle
  $("#menu-toggle").on("click", () => {
    $(".sidebar").toggleClass("active")
  })

  // Navigation
  $(".sidebar-nav li").on("click", function () {
    const page = $(this).data("page")
    navigateToPage(page)
  })

  // View all tasks link
  $(".view-all").on("click", function () {
    const page = $(this).data("page")
    navigateToPage(page)
  })

  // Notifications dropdown
  $(".notification-btn").on("click", (e) => {
    e.stopPropagation()
    $(".notification-dropdown").toggle()
    $(".user-dropdown").hide()
  })

  // User dropdown
  $(".user-menu-btn").on("click", (e) => {
    e.stopPropagation()
    $(".user-dropdown").toggle()
    $(".notification-dropdown").hide()
  })

  // Close dropdowns when clicking outside
  $(document).on("click", () => {
    $(".notification-dropdown, .user-dropdown").hide()
  })

  // Mark all notifications as read
  $(".mark-all-read").on("click", () => {
    $(".notification-item").removeClass("unread")
    $(".notification-badge").text("0")
  })

  // Task filters
  $(".filter-btn").on("click", function () {
    $(".filter-btn").removeClass("active")
    $(this).addClass("active")
    currentFilter = $(this).data("filter")
    renderTasks()
  })

  // Add task button
  $("#add-task-btn").on("click", () => {
    // Reset form
    $("#modal-title").text("Add New Task")
    $("#task-title").val("")
    $("#task-description").val("")
    $("#task-due-date").val("")
    $("#task-due-time").val("")
    $("#task-priority").val("medium")
    editingTaskId = null

    // Show modal
    $("#task-modal").css("display", "block")
  })

  // Close modal
  $(".close-modal, #cancel-task").on("click", () => {
    $("#task-modal").css("display", "none")
  })

  // Close modal when clicking outside
  $(window).on("click", (event) => {
    if ($(event.target).is("#task-modal")) {
      $("#task-modal").css("display", "none")
    }
  })

  // Save task
  $("#save-task").on("click", () => {
    const title = $("#task-title").val().trim()
    const description = $("#task-description").val().trim()
    const dueDate = $("#task-due-date").val()
    const dueTime = $("#task-due-time").val()
    const priority = $("#task-priority").val()

    if (title) {
      let dueDateTimeString = null

      if (dueDate) {
        dueDateTimeString = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T23:59:59`
      }

      if (editingTaskId) {
        // Update existing task
        const taskIndex = tasks.findIndex((t) => t.id === editingTaskId)
        if (taskIndex !== -1) {
          tasks[taskIndex].title = title
          tasks[taskIndex].description = description
          tasks[taskIndex].dueDate = dueDateTimeString
          tasks[taskIndex].priority = priority
          tasks[taskIndex].updatedAt = new Date().toISOString()
        }
      } else {
        // Add new task
        const newTask = {
          id: Date.now(),
          title,
          description,
          completed: false,
          dueDate: dueDateTimeString,
          priority,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: currentUser.id,
        }

        tasks.push(newTask)

        // Show notification
        showNotification("Task Added", `New task "${title}" has been added.`)
      }

      saveTasks()
      renderTasks()
      updateDashboard()
      updateCalendar()

      // Close modal
      $("#task-modal").css("display", "none")
    }
  })

  // Task actions (using event delegation)
  $("#task-list").on("change", ".task-checkbox", function () {
    const taskId = Number.parseInt($(this).closest(".task-item").data("id"))
    const task = tasks.find((t) => t.id === taskId)

    if (task) {
      task.completed = $(this).prop("checked")
      task.completedAt = task.completed ? new Date().toISOString() : null
      saveTasks()
      renderTasks()
      updateDashboard()

      if (task.completed) {
        // Show notification and play sound
        showNotification("Task Completed", `Task "${task.title}" has been completed!`)
      }
    }
  })

  $("#task-list").on("click", ".task-action-btn.edit", function () {
    const taskId = Number.parseInt($(this).closest(".task-item").data("id"))
    const task = tasks.find((t) => t.id === taskId)

    if (task) {
      editingTaskId = taskId

      // Fill form with task data
      $("#modal-title").text("Edit Task")
      $("#task-title").val(task.title)
      $("#task-description").val(task.description || "")

      if (task.dueDate) {
        const dueDateTime = new Date(task.dueDate)
        const dateString = dueDateTime.toISOString().split("T")[0]
        const timeString = dueDateTime.toTimeString().slice(0, 5)

        $("#task-due-date").val(dateString)
        $("#task-due-time").val(timeString)
      } else {
        $("#task-due-date").val("")
        $("#task-due-time").val("")
      }

      $("#task-priority").val(task.priority || "medium")

      // Show modal
      $("#task-modal").css("display", "block")
    }
  })

  $("#task-list").on("click", ".task-action-btn.delete", function () {
    const taskId = Number.parseInt($(this).closest(".task-item").data("id"))

    if (confirm("Are you sure you want to delete this task?")) {
      tasks = tasks.filter((t) => t.id !== taskId)
      saveTasks()
      renderTasks()
      updateDashboard()
      updateCalendar()
    }
  })

  // Calendar navigation
  const currentDate = new Date()

  $("#prev-month").on("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1)
    updateCalendar()
  })

  $("#next-month").on("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1)
    updateCalendar()
  })

  // Update account settings
  $("#update-account").on("click", () => {
    const name = $("#settings-name").val().trim()
    const email = $("#settings-email").val().trim()

    if (name && email && isValidEmail(email)) {
      // Update current user
      currentUser.name = name
      currentUser.email = email

      // Update in storage
      const users = JSON.parse(localStorage.getItem("users")) || []
      const userIndex = users.findIndex((u) => u.id === currentUser.id)

      if (userIndex !== -1) {
        users[userIndex].name = name
        users[userIndex].email = email
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update session
      if (localStorage.getItem("currentUser")) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser))
      } else {
        sessionStorage.setItem("currentUser", JSON.stringify(currentUser))
      }

      // Update UI
      updateUserInfo(currentUser)

      // Show notification
      showNotification("Settings Updated", "Your account information has been updated successfully.")
    }
  })

  // Update password
  $("#update-password").on("click", () => {
    const currentPassword = $("#current-password").val()
    const newPassword = $("#new-password").val()
    const confirmNewPassword = $("#confirm-new-password").val()

    if (currentPassword && newPassword && confirmNewPassword) {
      if (currentPassword !== currentUser.password) {
        alert("Current password is incorrect")
        return
      }

      if (newPassword.length < 6) {
        alert("New password must be at least 6 characters")
        return
      }

      if (newPassword !== confirmNewPassword) {
        alert("New passwords do not match")
        return
      }

      // Update current user
      currentUser.password = newPassword

      // Update in storage
      const users = JSON.parse(localStorage.getItem("users")) || []
      const userIndex = users.findIndex((u) => u.id === currentUser.id)

      if (userIndex !== -1) {
        users[userIndex].password = newPassword
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Update session
      if (localStorage.getItem("currentUser")) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser))
      } else {
        sessionStorage.setItem("currentUser", JSON.stringify(currentUser))
      }

      // Clear form
      $("#current-password, #new-password, #confirm-new-password").val("")

      // Show notification
      showNotification("Password Updated", "Your password has been updated successfully.")
    }
  })

  // Save preferences
  $("#save-preferences").on("click", () => {
    const notificationsEnabled = $("#notification-toggle").is(":checked")
    soundEnabled = $("#sound-toggle").is(":checked")
    const darkMode = $("#dark-mode-toggle").is(":checked")

    // Save preferences
    localStorage.setItem("notificationsEnabled", notificationsEnabled)
    localStorage.setItem("soundEnabled", soundEnabled)
    localStorage.setItem("darkTheme", darkMode)

    // Apply dark mode
    if (darkMode) {
      $("body").addClass("dark-theme")
    } else {
      $("body").removeClass("dark-theme")
    }

    // Show notification
    showNotification("Preferences Saved", "Your preferences have been saved successfully.")
  })

  // Set current date
  const today = new Date()
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  $("#current-date").text(today.toLocaleDateString("en-US", options))

  // Functions
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  function updateUserInfo(user) {
    // Set user name and initials
    const initials = user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    $("#user-name, #header-user-name").text(user.name)
    $("#user-email").text(user.email)
    $("#user-initials, #header-user-initials").text(initials)

    // Set settings form values
    $("#settings-name").val(user.name)
    $("#settings-email").val(user.email)
  }

  function loadTasks() {
    const allTasks = JSON.parse(localStorage.getItem("tasks")) || []
    tasks = allTasks.filter((task) => task.userId === currentUser.id)
    renderTasks()
  }

  function saveTasks() {
    // Get all tasks from localStorage
    const allTasks = JSON.parse(localStorage.getItem("tasks")) || []

    // Remove current user's tasks
    const otherUsersTasks = allTasks.filter((task) => task.userId !== currentUser.id)

    // Add current user's tasks
    const updatedTasks = [...otherUsersTasks, ...tasks]

    // Save to localStorage
    localStorage.setItem("tasks", JSON.stringify(updatedTasks))
  }

  function renderTasks() {
    const taskList = $("#task-list")
    taskList.empty()

    let filteredTasks = tasks

    if (currentFilter === "completed") {
      filteredTasks = tasks.filter((task) => task.completed)
    } else if (currentFilter === "pending") {
      filteredTasks = tasks.filter((task) => !task.completed)
    } else if (currentFilter === "overdue") {
      const now = new Date()
      filteredTasks = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now)
    }

    // Sort tasks based on selected option
    const sortOption = $("#sort-select").val() || "date-desc"

    switch (sortOption) {
      case "date-desc":
        filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case "date-asc":
        filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case "due-date":
        filteredTasks.sort((a, b) => {
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate) - new Date(b.dueDate)
        })
        break
      case "name-asc":
        filteredTasks.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "name-desc":
        filteredTasks.sort((a, b) => b.title.localeCompare(a.title))
        break
    }

    if (filteredTasks.length === 0) {
      taskList.html('<div class="empty-state">No tasks found. Click "Add Task" to create a new task.</div>')
    } else {
      filteredTasks.forEach((task) => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed

        const taskElement = $(`
                    <div class="task-item ${task.completed ? "task-completed" : ""} ${isOverdue ? "task-overdue" : ""}" data-id="${task.id}">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
                        <div class="task-content">
                            <div class="task-title">${escapeHtml(task.title)}</div>
                            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ""}
                            <div class="task-meta">
                                ${
                                  task.dueDate
                                    ? `
                                    <div class="task-due ${isOverdue ? "overdue" : ""}">
                                        <i class="fas fa-clock"></i>
                                        <span>${formatDueDate(task.dueDate)}</span>
                                    </div>
                                `
                                    : ""
                                }
                                <div class="task-priority">
                                    <span class="priority-badge ${task.priority || "medium"}">${capitalizeFirstLetter(task.priority || "medium")}</span>
                                </div>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="task-action-btn edit" title="Edit Task">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="task-action-btn delete" title="Delete Task">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `)

        taskList.append(taskElement)
      })
    }

    updateProgress()
  }

  function updateProgress() {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.completed).length

    let percentage = 0
    if (totalTasks > 0) {
      percentage = Math.round((completedTasks / totalTasks) * 100)
    }

    $("#progress-percentage").text(`${percentage}%`)
    $("#progress-fill").css("width", `${percentage}%`)
  }

  function updateDashboard() {
    // Update task counts
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.completed).length
    const pendingTasks = totalTasks - completedTasks

    const now = new Date()
    const overdueTasks = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now).length

    $("#total-tasks-count").text(totalTasks)
    $("#completed-tasks-count").text(completedTasks)
    $("#pending-tasks-count").text(pendingTasks)
    $("#overdue-tasks-count").text(overdueTasks)

    // Update recent tasks
    const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)

    const recentTasksContainer = $("#recent-tasks")
    recentTasksContainer.empty()

    if (recentTasks.length === 0) {
      recentTasksContainer.html('<div class="empty-state">No tasks yet. Add your first task!</div>')
    } else {
      recentTasks.forEach((task) => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed

        const taskElement = $(`
                    <div class="task-item ${task.completed ? "task-completed" : ""} ${isOverdue ? "task-overdue" : ""}" data-id="${task.id}">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
                        <div class="task-content">
                            <div class="task-title">${escapeHtml(task.title)}</div>
                            <div class="task-meta">
                                ${
                                  task.dueDate
                                    ? `
                                    <div class="task-due ${isOverdue ? "overdue" : ""}">
                                        <i class="fas fa-clock"></i>
                                        <span>${formatDueDate(task.dueDate)}</span>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                `)

        recentTasksContainer.append(taskElement)
      })
    }

    // Update charts
    updateCharts()
  }

  function initializeCharts() {
    // Completion Chart
    const completionCtx = document.getElementById("completion-chart")
    if (completionCtx) {
      window.completionChart = new Chart(completionCtx.getContext("2d"), {
        type: "line",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [
            {
              label: "Completed Tasks",
              data: [0, 0, 0, 0, 0, 0, 0],
              borderColor: "#000000",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
            },
          },
        },
      })
    }

    // Distribution Chart
    const distributionCtx = document.getElementById("distribution-chart")
    if (distributionCtx) {
      window.distributionChart = new Chart(distributionCtx.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: ["Completed", "Pending", "Overdue"],
          datasets: [
            {
              data: [0, 0, 0],
              backgroundColor: ["#2e7d32", "#666666", "#d32f2f"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
          cutout: "70%",
        },
      })
    }

    // Update charts with actual data
    updateCharts()
  }

  function updateCharts() {
    // Update completion chart
    if (window.completionChart) {
      const completedByDay = [0, 0, 0, 0, 0, 0, 0] // Mon to Sun

      tasks.forEach((task) => {
        if (task.completed && task.completedAt) {
          const completedDate = new Date(task.completedAt)
          const dayOfWeek = completedDate.getDay() // 0 = Sun, 1 = Mon, ...
          const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to Mon-Sun format
          completedByDay[index]++
        }
      })

      window.completionChart.data.datasets[0].data = completedByDay
      window.completionChart.update()
    }

    // Update distribution chart
    if (window.distributionChart) {
      const completedTasks = tasks.filter((task) => task.completed).length

      const now = new Date()
      const overdueTasks = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now).length

      const pendingTasks = tasks.length - completedTasks - overdueTasks

      window.distributionChart.data.datasets[0].data = [completedTasks, pendingTasks, overdueTasks]
      window.distributionChart.update()
    }
  }

  function updateCalendar() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Update header
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    $("#calendar-month-year").text(`${monthNames[month]} ${year}`)

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Get days from previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const prevMonthDays = firstDay === 0 ? 6 : firstDay - 1 // Adjust for Monday start

    // Calculate total cells needed (previous month + current month + next month)
    const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7

    // Generate calendar
    const calendarDays = $("#calendar-days")
    calendarDays.empty()

    // Current date for highlighting today
    const today = new Date()
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

    // Add days from previous month
    for (let i = 0; i < prevMonthDays; i++) {
      const day = daysInPrevMonth - prevMonthDays + i + 1
      calendarDays.append(`
                <div class="calendar-day other-month" data-date="${year}-${month === 0 ? 12 : month}-${day}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-day-events"></div>
                </div>
            `)
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = isCurrentMonth && today.getDate() === i
      const dateString = `${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`

      // Check for tasks on this day
      const dayTasks = tasks.filter((task) => {
        if (!task.dueDate) return false
        const taskDate = new Date(task.dueDate)
        return taskDate.getFullYear() === year && taskDate.getMonth() === month && taskDate.getDate() === i
      })

      // Create event dots
      let eventDots = ""
      for (let j = 0; j < Math.min(dayTasks.length, 3); j++) {
        eventDots += '<div class="calendar-event-dot"></div>'
      }

      calendarDays.append(`
                <div class="calendar-day ${isToday ? "today" : ""}" data-date="${dateString}">
                    <div class="calendar-day-number">${i}</div>
                    <div class="calendar-day-events">
                        ${eventDots}
                        ${dayTasks.length > 3 ? `<div class="calendar-event-more">+${dayTasks.length - 3}</div>` : ""}
                    </div>
                </div>
            `)
    }

    // Add days from next month
    const nextMonthDays = totalCells - (prevMonthDays + daysInMonth)
    for (let i = 1; i <= nextMonthDays; i++) {
      calendarDays.append(`
                <div class="calendar-day other-month" data-date="${year}-${month === 11 ? 1 : month + 2}-${i}">
                    <div class="calendar-day-number">${i}</div>
                    <div class="calendar-day-events"></div>
                </div>
            `)
    }

    // Add click event to calendar days
    $(".calendar-day").on("click", function () {
      $(".calendar-day").removeClass("selected")
      $(this).addClass("selected")

      const dateString = $(this).data("date")
      showEventsForDate(dateString)
    })

    // Show today's events by default
    const todayFormatted = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`
    showEventsForDate(todayFormatted)
  }

  function showEventsForDate(dateString) {
    const date = new Date(dateString)
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    $("#selected-date").text(date.toLocaleDateString("en-US", options))

    // Filter tasks for this date
    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      )
    })

    // Sort by time
    dayTasks.sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate) - new Date(b.dueDate)
    })

    // Display events
    const eventList = $("#event-list")
    eventList.empty()

    if (dayTasks.length === 0) {
      eventList.html('<div class="empty-state">No tasks scheduled for this day.</div>')
    } else {
      dayTasks.forEach((task) => {
        let timeString = ""
        if (task.dueDate) {
          const taskTime = new Date(task.dueDate)
          timeString = taskTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        }

        eventList.append(`
                    <div class="event-item ${task.completed ? "completed" : ""}">
                        <div class="event-time">${timeString}</div>
                        <div class="event-content">
                            <div class="event-title">${escapeHtml(task.title)}</div>
                            ${task.description ? `<div class="event-description">${escapeHtml(task.description)}</div>` : ""}
                        </div>
                    </div>
                `)
      })
    }
  }

  function navigateToPage(page) {
    // Update navigation
    $(".sidebar-nav li").removeClass("active")
    $(`.sidebar-nav li[data-page="${page}"]`).addClass("active")

    // Hide all pages
    $(".page").removeClass("active")

    // Show selected page
    $(`#${page}-page`).addClass("active")

    // Close sidebar on mobile
    if ($(window).width() < 768) {
      $(".sidebar").removeClass("active")
    }

    // Update current page
    currentPage = page

    // Initialize page-specific content
    if (page === "dashboard") {
      updateDashboard()
    } else if (page === "tasks") {
      renderTasks()
    } else if (page === "calendar") {
      updateCalendar()
    }
  }

  function formatDueDate(dateString) {
    const dueDate = new Date(dateString)
    const now = new Date()
    const isOverdue = dueDate < now

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    let formattedDate

    if (dueDay.getTime() === today.getTime()) {
      formattedDate = `Today at ${dueDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    } else if (dueDay.getTime() === tomorrow.getTime()) {
      formattedDate = `Tomorrow at ${dueDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    } else {
      formattedDate = dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    return formattedDate
  }

  function showNotification(title, message) {
    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "https://cdn-icons-png.flaticon.com/512/1950/1950715.png",
      })
    }

    // Play sound if enabled
    if (soundEnabled) {
      $("#notification-sound")[0].play()
    }

    // Add to notification dropdown
    const notificationList = $(".notification-list")
    const notificationItem = $(`
            <div class="notification-item unread">
                <div class="notification-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="notification-content">
                    <p>${message}</p>
                    <span class="notification-time">Just now</span>
                </div>
            </div>
        `)

    notificationList.prepend(notificationItem)

    // Update badge count
    const unreadCount = $(".notification-item.unread").length
    $(".notification-badge").text(unreadCount)

    // Animate notification bell
    $(".notification-btn i").addClass("fa-shake")
    setTimeout(() => {
      $(".notification-btn i").removeClass("fa-shake")
    }, 1000)
  }

  function escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  // Check for overdue tasks and send notifications
  function checkOverdueTasks() {
    const now = new Date()

    tasks.forEach((task) => {
      if (!task.completed && task.dueDate) {
        const dueDate = new Date(task.dueDate)

        // If task is due now (within the last minute)
        if (Math.abs(dueDate - now) < 60000 && !task.notified) {
          showNotification("Task Due Now", `Task "${task.title}" is due now!`)
          task.notified = true
          saveTasks()
        }

        // If task is overdue and not already notified for being overdue
        if (dueDate < now && !task.overdueNotified) {
          showNotification("Task Overdue", `Task "${task.title}" is overdue!`)
          task.overdueNotified = true
          saveTasks()
        }
      }
    })
  }

  // Check for overdue tasks every minute
  setInterval(checkOverdueTasks, 60000)

  // Initialize the app
  if (currentUser) {
    updateDashboard()
    updateCalendar()
  }

  // Chart period buttons
  $(".period-btn").on("click", function () {
    $(".period-btn").removeClass("active")
    $(this).addClass("active")
    // In a real app, this would update the chart data based on the selected period
    updateCharts()
  })

  // Sort tasks
  $("#sort-select").on("change", () => {
    renderTasks()
  })

  // Add some sample data if this is a new user
  if (currentUser && tasks.length === 0) {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sampleTasks = [
      {
        id: Date.now(),
        title: "Welcome to TaskMaster Pro!",
        description: "This is a sample task to help you get started. You can edit or delete it.",
        completed: false,
        dueDate: null,
        priority: "medium",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        userId: currentUser.id,
      },
      {
        id: Date.now() + 1,
        title: "Create your first task",
        description: 'Click the "Add Task" button to create your first task.',
        completed: false,
        dueDate: tomorrow.toISOString(),
        priority: "high",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        userId: currentUser.id,
      },
      {
        id: Date.now() + 2,
        title: "Explore the dashboard",
        description: "Check out the dashboard to see your task statistics and progress.",
        completed: true,
        dueDate: now.toISOString(),
        priority: "low",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        completedAt: now.toISOString(),
        userId: currentUser.id,
      },
    ]

    tasks = sampleTasks
    saveTasks()
    renderTasks()
    updateDashboard()
    updateCalendar()
  }
})

