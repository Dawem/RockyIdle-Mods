import type { MonsterIds } from "@game/data/MonsterData/MonsterInfoUtil";
import type { SlayerMasterIds } from "@game/data/AllTypes/SlayerTypes";
import type { SlayerCategoriesIds } from "@game/data/MonsterData/MonsterTypes";
import { getCategoryName, getMonsterForCategory, startMonsterAttack, triggerGetSlayerTask } from "../utilities/slayer";
import { getMonsterName } from "../utilities/monster";

// Global settings for auto-slayer botting
window.autoSlayerEnabled = localStorage.getItem("autoSlayerEnabled") !== "false";
window.autoSlayerDifficulty = Number(localStorage.getItem("autoSlayerDifficulty") || "1001") as SlayerMasterIds;
window.autoSlayerStrategy = localStorage.getItem("autoSlayerStrategy") || "lowest";
window.autoSlayerIgnoreCost = localStorage.getItem("autoSlayerIgnoreCost") === "true";
window.autoSlayerWeakness = localStorage.getItem("autoSlayerWeakness") === "true";

const manualSelectionRaw = localStorage.getItem("autoSlayerManualSelection");
window.autoSlayerManualSelection = manualSelectionRaw ? JSON.parse(manualSelectionRaw) : {};

// Modal UI for Selecting Manual Monsters
function openMonsterSelectorModal() {
  if (!window.AllSlayerMasters || !window.AllMonsters) {
    alert("Game data not yet loaded. Please wait a moment and try again.");
    return;
  }

  if (document.getElementById("slayer-bot-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "slayer-bot-modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.background = "rgba(0, 0, 0, 0.7)";
  overlay.style.backdropFilter = "blur(5px)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.fontFamily = '"Fredoka", sans-serif';

  const modal = document.createElement("div");
  modal.className = "slayer-modal-animate";
  modal.style.background = "#1e2a2a";
  modal.style.border = "2px solid #3d4f4f";
  modal.style.borderRadius = "12px";
  modal.style.padding = "20px";
  modal.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.8)";
  modal.style.color = "#ff9800";
  modal.style.width = "450px";
  modal.style.maxHeight = "80vh";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.gap = "16px";
  overlay.appendChild(modal);

  // Close modal when clicking outside
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.borderBottom = "1px solid #3d4f4f";
  header.style.paddingBottom = "8px";

  const title = document.createElement("span");
  title.innerText = "MONSTER SELECTOR";
  title.style.fontWeight = "bold";
  title.style.fontSize = "16px";
  title.style.letterSpacing = "1px";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#ff9800";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.outline = "none";
  closeBtn.onclick = () => document.body.removeChild(overlay);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Difficulty Tabs Row
  const tabsRow = document.createElement("div");
  tabsRow.style.display = "flex";
  tabsRow.style.gap = "6px";
  tabsRow.style.borderBottom = "1px solid #3d4f4f";
  tabsRow.style.paddingBottom = "8px";

  const difficulties = [
    { label: "Easy", id: 1001 as SlayerMasterIds },
    { label: "Medium", id: 1002 as SlayerMasterIds },
    { label: "Hard", id: 1003 as SlayerMasterIds },
    { label: "Expert", id: 1004 as SlayerMasterIds },
  ];

  let activeTabId = window.autoSlayerDifficulty; // default to current bot difficulty

  const categoriesContainer = document.createElement("div");
  categoriesContainer.style.flex = "1";
  categoriesContainer.style.overflowY = "auto";
  categoriesContainer.style.display = "flex";
  categoriesContainer.style.flexDirection = "column";
  categoriesContainer.style.gap = "12px";
  categoriesContainer.style.paddingRight = "6px";

  // Inject Styles once
  if (!document.getElementById("slayer-bot-modal-styles")) {
    const modalStyle = document.createElement("style");
    modalStyle.id = "slayer-bot-modal-styles";
    modalStyle.innerHTML = `
      @keyframes slayerModalFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .slayer-modal-animate {
        animation: slayerModalFadeIn 0.2s ease-out forwards;
      }
      #slayer-bot-modal-overlay div::-webkit-scrollbar {
        width: 6px;
      }
      #slayer-bot-modal-overlay div::-webkit-scrollbar-track {
        background: #151e1e;
        border-radius: 4px;
      }
      #slayer-bot-modal-overlay div::-webkit-scrollbar-thumb {
        background: #3d4f4f;
        border-radius: 4px;
      }
      #slayer-bot-modal-overlay div::-webkit-scrollbar-thumb:hover {
        background: #ff9800;
      }
    `;
    document.head.appendChild(modalStyle);
  }

  function renderCategories(masterId: SlayerMasterIds) {
    categoriesContainer.innerHTML = "";
    const master = window.AllSlayerMasters ? window.AllSlayerMasters[masterId] : null;
    if (!master || !master.monsters) {
      categoriesContainer.innerText = "No monster data available";
      return;
    }

    const categoryIds = Object.keys(master.monsters).map(Number) as SlayerCategoriesIds[];

    categoryIds.forEach((categoryId) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.gap = "12px";

      const label = document.createElement("span");
      label.innerText = getCategoryName(categoryId);
      label.style.fontSize = "13px";
      label.style.color = "#e0e0e0";
      row.appendChild(label);

      // Select Dropdown
      const select = document.createElement("select");
      select.style.background = "#2c3535";
      select.style.color = "#ff9800";
      select.style.border = "1px solid #3d4f4f";
      select.style.borderRadius = "4px";
      select.style.padding = "4px 8px";
      select.style.fontSize = "12px";
      select.style.outline = "none";
      select.style.cursor = "pointer";
      select.style.width = "260px";

      // Get monsters in category
      const monsters = Object.values(window.AllMonsters || {}).filter((m) => {
        return m.slayer && Array.isArray(m.slayer.category) && m.slayer.category.includes(Number(categoryId));
      });

      // Sort monsters by HP (ascending)
      monsters.sort((a, b) => {
        const hpA = a.stats?.hitpoints ?? 999999;
        const hpB = b.stats?.hitpoints ?? 999999;
        return hpA - hpB;
      });

      monsters.forEach((m) => {
        const option = document.createElement("option");
        option.value = String(m.id);
        const name = getMonsterName(m);
        const hpText = m.stats && m.stats.hitpoints !== undefined ? ` (HP: ${m.stats.hitpoints})` : "";
        const costText = m.itemCost && m.itemCost.length > 0 ? " (costly)" : "";
        option.innerText = `${name}${hpText}${costText}`;
        select.appendChild(option);
      });

      // Default/Selected
      const savedId = window.autoSlayerManualSelection[masterId]?.[categoryId];
      if (savedId !== undefined) {
        select.value = String(savedId);
      } else if (monsters.length > 0) {
        // Fallback to lowest HP by default if not set
        select.value = String(monsters[0].id);

        if (!window.autoSlayerManualSelection[masterId]) {
          window.autoSlayerManualSelection[masterId] = {};
        }
        window.autoSlayerManualSelection[masterId][categoryId] = monsters[0].id;
        localStorage.setItem("autoSlayerManualSelection", JSON.stringify(window.autoSlayerManualSelection));
      }

      select.onchange = () => {
        const val = Number(select.value);
        if (!window.autoSlayerManualSelection[masterId]) {
          window.autoSlayerManualSelection[masterId] = {};
        }
        window.autoSlayerManualSelection[masterId][categoryId] = val;
        localStorage.setItem("autoSlayerManualSelection", JSON.stringify(window.autoSlayerManualSelection));
        console.log(`[Mod] Saved manual selection: Master ${masterId}, Category ${categoryId} -> Monster ${val}`);
      };

      row.appendChild(select);
      categoriesContainer.appendChild(row);
    });
  }

  // Generate tabs
  const tabButtons: HTMLButtonElement[] = [];
  difficulties.forEach((diff) => {
    const tabBtn = document.createElement("button");
    tabBtn.innerText = diff.label;
    tabBtn.style.flex = "1";
    tabBtn.style.border = "none";
    tabBtn.style.borderRadius = "4px";
    tabBtn.style.padding = "6px";
    tabBtn.style.fontSize = "12px";
    tabBtn.style.fontWeight = "bold";
    tabBtn.style.cursor = "pointer";
    tabBtn.style.outline = "none";
    tabBtn.style.transition = "background-color 0.2s, color 0.2s";

    function updateTabStyle() {
      if (activeTabId === diff.id) {
        tabBtn.style.background = "#ff9800";
        tabBtn.style.color = "#1e2a2a";
      } else {
        tabBtn.style.background = "#2c3535";
        tabBtn.style.color = "#ff9800";
      }
    }

    tabBtn.onclick = () => {
      activeTabId = diff.id;
      tabButtons.forEach((btn) => btn.dispatchEvent(new CustomEvent("update-style")));
      renderCategories(activeTabId);
    };

    tabBtn.addEventListener("update-style", updateTabStyle);
    updateTabStyle();
    tabsRow.appendChild(tabBtn);
    tabButtons.push(tabBtn);
  });

  modal.appendChild(tabsRow);
  modal.appendChild(categoriesContainer);

  // Close button footer
  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  footer.style.borderTop = "1px solid #3d4f4f";
  footer.style.paddingTop = "8px";

  const footerCloseBtn = document.createElement("button");
  footerCloseBtn.innerText = "CLOSE";
  footerCloseBtn.style.background = "#ff9800";
  footerCloseBtn.style.color = "#1e2a2a";
  footerCloseBtn.style.border = "none";
  footerCloseBtn.style.borderRadius = "4px";
  footerCloseBtn.style.padding = "8px 16px";
  footerCloseBtn.style.fontSize = "12px";
  footerCloseBtn.style.fontWeight = "bold";
  footerCloseBtn.style.cursor = "pointer";
  footerCloseBtn.onclick = () => document.body.removeChild(overlay);
  footer.appendChild(footerCloseBtn);
  modal.appendChild(footer);

  document.body.appendChild(overlay);
  renderCategories(activeTabId);
}

// Create floating control panel for the bot
function createSlayerBotUI() {
  if (document.getElementById("slayer-bot-panel")) return;

  const panel = document.createElement("div");
  panel.id = "slayer-bot-panel";
  panel.style.position = "fixed";
  panel.style.bottom = "20px";
  panel.style.left = "20px";
  panel.style.zIndex = "9999";
  panel.style.background = "rgba(30, 42, 42, 0.9)";
  panel.style.backdropFilter = "blur(10px)";
  panel.style.border = "2px solid #3d4f4f";
  panel.style.borderRadius = "8px";
  panel.style.padding = "12px 16px";
  panel.style.fontFamily = '"Fredoka", sans-serif';
  panel.style.color = "#ff9800"; // Orange theme
  panel.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.6)";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";
  panel.style.userSelect = "none";
  panel.style.minWidth = "220px";

  // Title
  const title = document.createElement("div");
  title.innerText = "SLAYER BOT";
  title.style.fontWeight = "bold";
  title.style.fontSize = "13px";
  title.style.letterSpacing = "1.5px";
  title.style.borderBottom = "1px solid #3d4f4f";
  title.style.paddingBottom = "4px";
  title.style.textAlign = "center";
  title.style.cursor = "grab";
  panel.appendChild(title);

  // Dragging logic
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let panelWidth = 0;
  let panelHeight = 0;

  title.addEventListener("mousedown", (e) => {
    isDragging = true;
    title.style.cursor = "grabbing";

    const rect = panel.getBoundingClientRect();
    panelWidth = rect.width;
    panelHeight = rect.height;

    panel.style.bottom = "auto";
    panel.style.right = "auto";
    panel.style.left = rect.left + "px";
    panel.style.top = rect.top + "px";

    startLeft = rect.left;
    startTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    const maxLeft = window.innerWidth - panelWidth;
    const maxTop = window.innerHeight - panelHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    panel.style.left = newLeft + "px";
    panel.style.top = newTop + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      title.style.cursor = "grab";
    }
  });

  // Toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "slayer-bot-toggle";

  function updateBtnStyle() {
    if (window.autoSlayerEnabled) {
      toggleBtn.innerText = "BOT: ACTIVE";
      toggleBtn.style.background = "#2e7d32"; // Green
    } else {
      toggleBtn.innerText = "BOT: INACTIVE";
      toggleBtn.style.background = "#c62828"; // Red
    }
  }

  toggleBtn.style.border = "none";
  toggleBtn.style.borderRadius = "4px";
  toggleBtn.style.padding = "8px 16px";
  toggleBtn.style.fontSize = "12px";
  toggleBtn.style.color = "#ffffff";
  toggleBtn.style.fontWeight = "bold";
  toggleBtn.style.cursor = "pointer";
  toggleBtn.style.transition = "background-color 0.2s";
  toggleBtn.style.outline = "none";

  updateBtnStyle();

  toggleBtn.onclick = () => {
    window.autoSlayerEnabled = !window.autoSlayerEnabled;
    localStorage.setItem("autoSlayerEnabled", String(window.autoSlayerEnabled));
    updateBtnStyle();
    console.log(`[Mod] Auto Slayer set to: ${window.autoSlayerEnabled}`);
  };

  panel.appendChild(toggleBtn);

  // Difficulty row
  const diffRow = document.createElement("div");
  diffRow.style.display = "flex";
  diffRow.style.justifyContent = "space-between";
  diffRow.style.alignItems = "center";
  diffRow.style.gap = "12px";
  diffRow.style.fontSize = "12px";
  diffRow.style.color = "#e0e0e0";
  diffRow.style.marginTop = "4px";

  const diffLabel = document.createElement("span");
  diffLabel.innerText = "Difficulty";
  diffLabel.style.fontWeight = "500";
  diffRow.appendChild(diffLabel);

  const diffSelect = document.createElement("select");
  diffSelect.id = "slayer-bot-difficulty";
  diffSelect.style.background = "#2c3535";
  diffSelect.style.color = "#ff9800";
  diffSelect.style.border = "1px solid #3d4f4f";
  diffSelect.style.borderRadius = "4px";
  diffSelect.style.padding = "4px 8px";
  diffSelect.style.fontSize = "12px";
  diffSelect.style.cursor = "pointer";
  diffSelect.style.outline = "none";

  const difficulties = [
    { name: "Easy", value: "1001" },
    { name: "Medium", value: "1002" },
    { name: "Hard", value: "1003" },
    { name: "Expert", value: "1004" },
  ];
  difficulties.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.value;
    opt.innerText = d.name;
    diffSelect.appendChild(opt);
  });
  diffSelect.value = String(window.autoSlayerDifficulty);
  diffSelect.onchange = () => {
    window.autoSlayerDifficulty = Number(diffSelect.value) as SlayerMasterIds;
    localStorage.setItem("autoSlayerDifficulty", diffSelect.value);
    console.log(`[Mod] Auto Slayer Difficulty set to: ${window.autoSlayerDifficulty}`);
  };
  diffRow.appendChild(diffSelect);
  panel.appendChild(diffRow);

  // Strategy row
  const stratRow = document.createElement("div");
  stratRow.style.display = "flex";
  stratRow.style.justifyContent = "space-between";
  stratRow.style.alignItems = "center";
  stratRow.style.gap = "12px";
  stratRow.style.fontSize = "12px";
  stratRow.style.color = "#e0e0e0";
  stratRow.style.marginTop = "4px";

  const stratLabel = document.createElement("span");
  stratLabel.innerText = "Strategy";
  stratLabel.style.fontWeight = "500";
  stratRow.appendChild(stratLabel);

  const stratSelect = document.createElement("select");
  stratSelect.id = "slayer-bot-strategy";
  stratSelect.style.background = "#2c3535";
  stratSelect.style.color = "#ff9800";
  stratSelect.style.border = "1px solid #3d4f4f";
  stratSelect.style.borderRadius = "4px";
  stratSelect.style.padding = "4px 8px";
  stratSelect.style.fontSize = "12px";
  stratSelect.style.cursor = "pointer";
  stratSelect.style.outline = "none";

  const strategies = [
    { name: "Lowest Health", value: "lowest" },
    { name: "Highest Health", value: "highest" },
    { name: "Manual", value: "manual" },
  ];
  strategies.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.value;
    opt.innerText = s.name;
    stratSelect.appendChild(opt);
  });
  stratSelect.value = window.autoSlayerStrategy;

  stratRow.appendChild(stratSelect);
  panel.appendChild(stratRow);

  // Monster Selector button
  const selectorBtn = document.createElement("button");
  selectorBtn.id = "slayer-bot-monster-selector-btn";
  selectorBtn.innerText = "MONSTER SELECTOR";
  selectorBtn.style.border = "1px solid #ff9800";
  selectorBtn.style.background = "rgba(255, 152, 0, 0.1)";
  selectorBtn.style.borderRadius = "4px";
  selectorBtn.style.padding = "6px 12px";
  selectorBtn.style.fontSize = "12px";
  selectorBtn.style.color = "#ff9800";
  selectorBtn.style.fontWeight = "bold";
  selectorBtn.style.cursor = "pointer";
  selectorBtn.style.transition = "background-color 0.2s, border-color 0.2s, opacity 0.2s";
  selectorBtn.style.outline = "none";
  selectorBtn.style.marginTop = "4px";

  selectorBtn.onmouseenter = () => {
    selectorBtn.style.background = "rgba(255, 152, 0, 0.2)";
  };
  selectorBtn.onmouseleave = () => {
    selectorBtn.style.background = "rgba(255, 152, 0, 0.1)";
  };

  function updateSelectorBtnStyle() {
    if (window.autoSlayerStrategy === "manual") {
      selectorBtn.style.borderColor = "#ff9800";
      selectorBtn.style.opacity = "1";
    } else {
      selectorBtn.style.borderColor = "#3d4f4f";
      selectorBtn.style.opacity = "0.7";
    }
  }

  stratSelect.onchange = () => {
    window.autoSlayerStrategy = stratSelect.value;
    localStorage.setItem("autoSlayerStrategy", stratSelect.value);
    console.log(`[Mod] Auto Slayer Strategy set to: ${window.autoSlayerStrategy}`);
    updateSelectorBtnStyle();
  };

  selectorBtn.onclick = () => {
    openMonsterSelectorModal();
  };

  panel.appendChild(selectorBtn);
  updateSelectorBtnStyle();

  // Ignore Cost Toggle Container
  const ignoreCostContainer = document.createElement("div");
  ignoreCostContainer.style.display = "flex";
  ignoreCostContainer.style.alignItems = "center";
  ignoreCostContainer.style.justifyContent = "space-between";
  ignoreCostContainer.style.gap = "12px";
  ignoreCostContainer.style.fontSize = "12px";
  ignoreCostContainer.style.color = "#e0e0e0";
  ignoreCostContainer.style.marginTop = "4px";
  ignoreCostContainer.title = "Ignore monsters that require tokens or items to fight (e.g. Serpia)";

  const ignoreCostLabel = document.createElement("span");
  ignoreCostLabel.innerText = "Ignore Costly";
  ignoreCostLabel.style.fontWeight = "500";
  ignoreCostLabel.style.cursor = "pointer";
  ignoreCostContainer.appendChild(ignoreCostLabel);

  const ignoreCostSwitch = document.createElement("label");
  ignoreCostSwitch.style.position = "relative";
  ignoreCostSwitch.style.display = "inline-block";
  ignoreCostSwitch.style.width = "34px";
  ignoreCostSwitch.style.height = "20px";
  ignoreCostSwitch.style.cursor = "pointer";

  const ignoreCostInput = document.createElement("input");
  ignoreCostInput.type = "checkbox";
  ignoreCostInput.style.opacity = "0";
  ignoreCostInput.style.width = "0";
  ignoreCostInput.style.height = "0";
  ignoreCostInput.checked = window.autoSlayerIgnoreCost;

  const ignoreCostSlider = document.createElement("span");
  ignoreCostSlider.style.position = "absolute";
  ignoreCostSlider.style.top = "0";
  ignoreCostSlider.style.left = "0";
  ignoreCostSlider.style.right = "0";
  ignoreCostSlider.style.bottom = "0";
  ignoreCostSlider.style.backgroundColor = "#555";
  ignoreCostSlider.style.transition = "0.3s";
  ignoreCostSlider.style.borderRadius = "20px";
  ignoreCostSlider.style.border = "1px solid #3d4f4f";

  const ignoreCostKnob = document.createElement("span");
  ignoreCostKnob.style.position = "absolute";
  ignoreCostKnob.style.content = '""';
  ignoreCostKnob.style.height = "12px";
  ignoreCostKnob.style.width = "12px";
  ignoreCostKnob.style.left = "3px";
  ignoreCostKnob.style.bottom = "3px";
  ignoreCostKnob.style.backgroundColor = "#ffffff";
  ignoreCostKnob.style.transition = "0.3s";
  ignoreCostKnob.style.borderRadius = "50%";
  ignoreCostSlider.appendChild(ignoreCostKnob);

  ignoreCostSwitch.appendChild(ignoreCostInput);
  ignoreCostSwitch.appendChild(ignoreCostSlider);
  ignoreCostContainer.appendChild(ignoreCostSwitch);

  function updateIgnoreCostSwitchStyle() {
    if (ignoreCostInput.checked) {
      ignoreCostSlider.style.backgroundColor = "#ff9800"; // Theme orange
      ignoreCostKnob.style.transform = "translateX(14px)";
    } else {
      ignoreCostSlider.style.backgroundColor = "#2c3535";
      ignoreCostKnob.style.transform = "translateX(0px)";
    }
  }

  ignoreCostLabel.onclick = () => {
    ignoreCostInput.checked = !ignoreCostInput.checked;
    ignoreCostInput.dispatchEvent(new Event("change"));
  };

  ignoreCostInput.addEventListener("change", () => {
    window.autoSlayerIgnoreCost = ignoreCostInput.checked;
    localStorage.setItem("autoSlayerIgnoreCost", String(ignoreCostInput.checked));
    updateIgnoreCostSwitchStyle();
    console.log(`[Mod] Auto Slayer Ignore Cost set to: ${window.autoSlayerIgnoreCost}`);
  });

  updateIgnoreCostSwitchStyle();
  panel.appendChild(ignoreCostContainer);

  // Weakness Toggle Container
  const weaknessContainer = document.createElement("div");
  weaknessContainer.style.display = "flex";
  weaknessContainer.style.alignItems = "center";
  weaknessContainer.style.justifyContent = "space-between";
  weaknessContainer.style.gap = "12px";
  weaknessContainer.style.fontSize = "12px";
  weaknessContainer.style.color = "#e0e0e0";
  weaknessContainer.style.marginTop = "4px";
  weaknessContainer.title = "Auto switch active equipment set to match the monster's weakness style";

  const weaknessLabel = document.createElement("span");
  weaknessLabel.innerText = "Auto Weakness";
  weaknessLabel.style.fontWeight = "500";
  weaknessLabel.style.cursor = "pointer";
  weaknessContainer.appendChild(weaknessLabel);

  const weaknessSwitch = document.createElement("label");
  weaknessSwitch.style.position = "relative";
  weaknessSwitch.style.display = "inline-block";
  weaknessSwitch.style.width = "34px";
  weaknessSwitch.style.height = "20px";
  weaknessSwitch.style.cursor = "pointer";

  const weaknessInput = document.createElement("input");
  weaknessInput.type = "checkbox";
  weaknessInput.style.opacity = "0";
  weaknessInput.style.width = "0";
  weaknessInput.style.height = "0";
  weaknessInput.checked = window.autoSlayerWeakness;

  const weaknessSlider = document.createElement("span");
  weaknessSlider.style.position = "absolute";
  weaknessSlider.style.top = "0";
  weaknessSlider.style.left = "0";
  weaknessSlider.style.right = "0";
  weaknessSlider.style.bottom = "0";
  weaknessSlider.style.backgroundColor = "#555";
  weaknessSlider.style.transition = "0.3s";
  weaknessSlider.style.borderRadius = "20px";
  weaknessSlider.style.border = "1px solid #3d4f4f";

  const weaknessKnob = document.createElement("span");
  weaknessKnob.style.position = "absolute";
  weaknessKnob.style.content = '""';
  weaknessKnob.style.height = "12px";
  weaknessKnob.style.width = "12px";
  weaknessKnob.style.left = "3px";
  weaknessKnob.style.bottom = "3px";
  weaknessKnob.style.backgroundColor = "#ffffff";
  weaknessKnob.style.transition = "0.3s";
  weaknessKnob.style.borderRadius = "50%";
  weaknessSlider.appendChild(weaknessKnob);

  weaknessSwitch.appendChild(weaknessInput);
  weaknessSwitch.appendChild(weaknessSlider);
  weaknessContainer.appendChild(weaknessSwitch);

  function updateWeaknessSwitchStyle() {
    if (weaknessInput.checked) {
      weaknessSlider.style.backgroundColor = "#ff9800"; // Theme orange
      weaknessKnob.style.transform = "translateX(14px)";
    } else {
      weaknessSlider.style.backgroundColor = "#2c3535";
      weaknessKnob.style.transform = "translateX(0px)";
    }
  }

  weaknessLabel.onclick = () => {
    weaknessInput.checked = !weaknessInput.checked;
    weaknessInput.dispatchEvent(new Event("change"));
  };

  weaknessInput.addEventListener("change", () => {
    window.autoSlayerWeakness = weaknessInput.checked;
    localStorage.setItem("autoSlayerWeakness", String(weaknessInput.checked));
    updateWeaknessSwitchStyle();
    console.log(`[Mod] Auto Slayer Weakness set to: ${window.autoSlayerWeakness}`);
  });

  updateWeaknessSwitchStyle();
  panel.appendChild(weaknessContainer);

  document.body.appendChild(panel);
  console.log("[Mod] Slayer Bot UI panel injected successfully.");
}

// Ensure the UI is mounted
if (document.body) {
  createSlayerBotUI();
} else {
  window.addEventListener("DOMContentLoaded", createSlayerBotUI);
}


createMod(({ playerStore }) => {
  console.log("[Mod] Player store loaded successfully!");

  let notified = false;
  playerStore.subscribe(() => {
    // Exit early if the user has disabled the bot via the UI
    if (!window.autoSlayerEnabled) return;

    const playerState = playerStore.getState().state;
    const slayerCurrentAmount = playerState.slayerInfo.currentSlayerTask
      ? playerState.slayerInfo.currentSlayerTask.currentAmount
      : 0;
    const currentAttackProcess = playerState.currentAttackProcess;

    // 1. Task Completion Notification
    if (slayerCurrentAmount <= 0 && !notified) {
      console.log("[Mod] Slayer Task Finished!");
      notified = true;
    } else if (slayerCurrentAmount > 0) {
      notified = false;
    }

    // 2. Automated Task Selection & Combat Trigger Loop
    if (slayerCurrentAmount <= 0) {
      // Roll a new task from the user's selected difficulty
      const taskResult = triggerGetSlayerTask(playerStore, window.autoSlayerDifficulty);

      // If a new task category was successfully rolled, select the matching monster and attack it
      if (taskResult && taskResult.categoryId) {
        const targetMonster = getMonsterForCategory(taskResult.categoryId, window.autoSlayerDifficulty);
        if (targetMonster) {
          console.log(
            `[Mod] Target selected for Category ${taskResult.categoryId}: ${getMonsterName(targetMonster)} (ID: ${targetMonster.id}, HP: ${targetMonster.stats?.hitpoints})`,
          );
          setTimeout(() => {
            startMonsterAttack(playerStore, targetMonster.id);
          }, 100);
        } else {
          console.warn(`[Mod] No monsters found in Category ID ${taskResult.categoryId}`);
        }
      }
    } else {
      // Auto-resume: if we have a task but are not actively in combat, start fighting the task monster!
      if (!currentAttackProcess) {
        const currentTask = playerState.slayerInfo.currentSlayerTask;
        if (currentTask) {
          const categoryId = currentTask.slayerCategoryId || (currentTask as any).monsterId;
          const slayerMasterId = currentTask.slayerMasterId;
          if (categoryId && slayerMasterId) {
            const targetMonster = getMonsterForCategory(categoryId, slayerMasterId);
            if (targetMonster) {
              console.log(
                `[Mod] Resuming combat on task monster: ${getMonsterName(targetMonster)} (ID: ${targetMonster.id})`,
              );
              startMonsterAttack(playerStore, targetMonster.id);
            }
          }
        }
      }
    }
  });
});
