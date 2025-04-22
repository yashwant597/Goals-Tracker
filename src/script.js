document.addEventListener("DOMContentLoaded", () => {
  const goalForm = document.getElementById("goalForm");
  const goalInput = document.getElementById("goalInput");
  const goalDate = document.getElementById("goalDate");
  const goalList = document.getElementById("goalList");
  const filterSelect = document.getElementById("filterSelect");

  let goals = JSON.parse(localStorage.getItem("goals")) || [];

  const saveGoals = () => localStorage.setItem("goals", JSON.stringify(goals));

  const renderGoals = () => {
    goalList.innerHTML = "";
    const filter = filterSelect.value;
    goals.forEach((goal, index) => {
      if (filter === "completed" && !goal.completed) return;
      if (filter === "pending" && goal.completed) return;

      const li = document.createElement("li");
      li.className = goal.completed ? "completed" : "";

      const span = document.createElement("span");
      span.textContent = `${goal.text} (Due: ${goal.date})`;

      const completeBtn = document.createElement("button");
      completeBtn.textContent = goal.completed ? "Undo" : "Done";
      completeBtn.onclick = () => {
        goals[index].completed = !goals[index].completed;
        saveGoals();
        renderGoals();
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => {
        goals.splice(index, 1);
        saveGoals();
        renderGoals();
      };

      li.append(span, completeBtn, deleteBtn);
      goalList.appendChild(li);
    });
  };

  goalForm.onsubmit = (e) => {
    e.preventDefault();
    const text = goalInput.value.trim();
    const date = goalDate.value;
    if (!text || !date) return;
    goals.push({ text, date, completed: false });
    goalInput.value = "";
    goalDate.value = "";
    saveGoals();
    renderGoals();
  };

  filterSelect.onchange = renderGoals;
  renderGoals();
});
