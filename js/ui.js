import {
  calcularCaloriasDiarias,
  calcularPesoAlvo,
  ajustarPorcao
} from "./logic.js";
import {
  pequenoAlmoco,
  lancheManha,
  almocos,
  lancheTarde,
  jantares
} from "./recipes.js";

const STORAGE_KEY = "nonoPlannerState";
const DEFAULT_USER = { idade: 8, altura: 131, peso: 38 };

const form = document.getElementById("info-form");
const plannerSection = document.getElementById("planner-section");
const resumoEl = document.getElementById("resumo");
const caloriasInfo = document.getElementById("calorias-info");
const caloriasBar = document.getElementById("calorias-bar");
const mealsGrid = document.getElementById("meals-grid");
const btnNovoDia = document.getElementById("novo-dia");
const idadeInput = document.getElementById("idade");
const alturaInput = document.getElementById("altura");
const pesoInput = document.getElementById("peso");

const meals = [
  { id: "pequeno", label: "Pequeno-almoço", emoji: "🍞", data: pequenoAlmoco },
  { id: "lm", label: "Lanche da manhã", emoji: "🧃", data: lancheManha },
  { id: "almoco", label: "Almoço", emoji: "🥦", data: almocos },
  { id: "lt", label: "Lanche da tarde", emoji: "🍓", data: lancheTarde },
  { id: "jantar", label: "Jantar", emoji: "🌙", data: jantares }
];

const state = {
  idade: null,
  altura: null,
  peso: null,
  pesoAlvo: null,
  metaCalorias: 0,
  totalCalorias: 0,
  escolhas: {},
  indices: {}
};

const mealElements = {};

function renderMealCards() {
  mealsGrid.innerHTML = "";
  meals.forEach((meal) => {
    const card = document.createElement("article");
    card.className = "meal-card";
    card.dataset.meal = meal.id;

    const header = document.createElement("header");
    header.innerHTML = `<span>${meal.emoji} ${meal.label}</span>`;

    const shuffleBtn = document.createElement("button");
    shuffleBtn.type = "button";
    shuffleBtn.className = "shuffle-btn";
    shuffleBtn.dataset.mealShuffle = meal.id;
    shuffleBtn.textContent = "Surpreende ✨";
    header.appendChild(shuffleBtn);

    const select = document.createElement("select");
    select.dataset.mealSelect = meal.id;
    select.innerHTML = [
      `<option value="">Escolhe uma delícia</option>`,
      ...meal.data.map((item, idx) => `<option value="${idx}">${item.nome}</option>`)
    ].join("");

    const details = document.createElement("div");
    details.className = "meal-details";
    details.innerHTML = "<p>Escolhe uma refeição para ver os detalhes. 🌈</p>";

    card.append(header, select, details);
    mealsGrid.appendChild(card);

    mealElements[meal.id] = { select, details, data: meal.data };
  });
}

function preencherFormularioValores({ idade, altura, peso }) {
  if (idadeInput) idadeInput.value = idade ?? "";
  if (alturaInput) alturaInput.value = altura ?? "";
  if (pesoInput) pesoInput.value = peso ?? "";
}

function definirDadosDoUsuario({ idade, altura, peso }, { scroll = true } = {}) {
  if (!idade || !altura || !peso) {
    return false;
  }
  state.idade = idade;
  state.altura = altura;
  state.peso = peso;
  state.pesoAlvo = calcularPesoAlvo(altura);
  state.metaCalorias = calcularCaloriasDiarias(idade, altura, peso);
  atualizarResumo();
  atualizarCalorias();
  plannerSection.classList.remove("hidden");
  if (scroll) {
    plannerSection.scrollIntoView({ behavior: "smooth" });
  }
  return true;
}

function obterEstadoLocal() {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return null;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Não foi possível ler o estado local:", error);
    return null;
  }
}

function gravarEstadoLocal(payload) {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Não foi possível guardar o estado local:", error);
  }
}

function persistirEstado() {
  if (!state.idade || !state.altura || !state.peso) return;
  const payload = {
    idade: state.idade,
    altura: state.altura,
    peso: state.peso,
    selections: { ...state.indices }
  };
  gravarEstadoLocal(payload);
}

function aplicarSelecoesGuardadas(selections = {}) {
  Object.entries(selections).forEach(([mealId, index]) => {
    const meal = mealElements[mealId];
    if (!meal || Number.isNaN(Number(index))) return;
    const safeIndex = Math.min(Math.max(Number(index), 0), meal.data.length - 1);
    meal.select.value = String(safeIndex);
    state.indices[mealId] = safeIndex;
    tratarSelecao(mealId, safeIndex);
  });
}

function inicializarComDadosGuardados() {
  const stored = obterEstadoLocal();
  const baseUser = stored && stored.idade ? stored : { ...DEFAULT_USER, selections: {} };
  preencherFormularioValores(baseUser);
  const aplicou = definirDadosDoUsuario(baseUser, { scroll: false });
  if (aplicou && baseUser.selections) {
    aplicarSelecoesGuardadas(baseUser.selections);
  }
  if (!stored) {
    persistirEstado();
  }
}

function atualizarResumo() {
  if (!state.metaCalorias) return;
  resumoEl.textContent = `Idade: ${state.idade} anos | Peso alvo: ${state.pesoAlvo} kg | Meta diária: ${state.metaCalorias} kcal`;
}

function atualizarCalorias() {
  const total = Object.values(state.escolhas).reduce(
    (acc, item) => acc + (item?.calorias || 0),
    0
  );
  state.totalCalorias = total;
  caloriasInfo.textContent = `${total} / ${state.metaCalorias} kcal`;
  const percent = state.metaCalorias
    ? Math.min(100, Math.round((total / state.metaCalorias) * 100))
    : 0;
  caloriasBar.style.width = `${percent}%`;
}

function formatarIngredientes(recipe) {
  if (!recipe) {
    return "";
  }
  return recipe.ingredientes
    .map((ingrediente) => {
      const quantidade = ajustarPorcao(
        ingrediente.quantidade,
        state.peso,
        state.pesoAlvo
      );
      return `<li>${ingrediente.nome}: <strong>${quantidade} ${ingrediente.unidade}</strong></li>`;
    })
    .join("");
}

function mostrarDetalhes(mealId, recipe) {
  const meal = mealElements[mealId];
  if (!meal) return;
  if (!recipe) {
    meal.details.innerHTML = "<p>Escolhe uma refeição para ver os detalhes. 🌈</p>";
    delete state.escolhas[mealId];
    delete state.indices[mealId];
    atualizarCalorias();
    persistirEstado();
    return;
  }

  const ingredientesHtml = formatarIngredientes(recipe);
  meal.details.innerHTML = `
    <h3>${recipe.nome}</h3>
    <p><strong>Calorias:</strong> ${recipe.calorias} kcal</p>
    <p><strong>Modo de preparo:</strong> ${recipe.preparo}</p>
    <p><strong>Ingredientes:</strong></p>
    <ul class="ingredients">${ingredientesHtml}</ul>
  `;
  state.escolhas[mealId] = recipe;
  persistirEstado();
  atualizarCalorias();
}

function tratarSelecao(mealId, index) {
  const meal = mealElements[mealId];
  if (!meal) return;
  const recipe = meal.data[index];
  if (recipe !== undefined) {
    state.indices[mealId] = index;
  }
  mostrarDetalhes(mealId, recipe);
}

function shuffleMeal(mealId) {
  const meal = mealElements[mealId];
  if (!meal) return;
  const randomIndex = Math.floor(Math.random() * meal.data.length);
  meal.select.value = String(randomIndex);
  tratarSelecao(mealId, randomIndex);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const idade = Number(idadeInput.value);
  const altura = Number(alturaInput.value);
  const peso = Number(pesoInput.value);

  const atualizou = definirDadosDoUsuario({ idade, altura, peso });
  if (!atualizou) return;

  Object.entries(state.indices).forEach(([mealId, index]) => {
    tratarSelecao(mealId, index);
  });
  persistirEstado();
});

mealsGrid.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-meal-select]");
  if (!select) return;
  const mealId = select.dataset.mealSelect;
  const value = select.value;
  if (value === "") {
    mostrarDetalhes(mealId, null);
  } else {
    tratarSelecao(mealId, Number(value));
  }
});

mealsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-meal-shuffle]");
  if (!button) return;
  const mealId = button.dataset.mealShuffle;
  shuffleMeal(mealId);
});

btnNovoDia.addEventListener("click", () => {
  form.reset();
  plannerSection.classList.add("hidden");
  resumoEl.textContent = "";
  caloriasInfo.textContent = "0 / 0 kcal";
  caloriasBar.style.width = "0%";
  state.idade = null;
  state.altura = null;
  state.peso = null;
  state.pesoAlvo = null;
  state.metaCalorias = 0;
  state.totalCalorias = 0;
  state.escolhas = {};
  state.indices = {};
  Object.values(mealElements).forEach(({ select, details }) => {
    select.value = "";
    details.innerHTML = "<p>Escolhe uma refeição para ver os detalhes. 🌈</p>";
  });
  preencherFormularioValores(DEFAULT_USER);
  gravarEstadoLocal({ ...DEFAULT_USER, selections: {} });
});

renderMealCards();
inicializarComDadosGuardados();
