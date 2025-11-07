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

const form = document.getElementById("info-form");
const plannerSection = document.getElementById("planner-section");
const resumoEl = document.getElementById("resumo");
const caloriasInfo = document.getElementById("calorias-info");
const caloriasBar = document.getElementById("calorias-bar");
const mealsGrid = document.getElementById("meals-grid");
const btnNovoDia = document.getElementById("novo-dia");

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
  escolhas: {}
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
    atualizarCalorias();
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
  atualizarCalorias();
}

function tratarSelecao(mealId, index) {
  const meal = mealElements[mealId];
  if (!meal) return;
  const recipe = meal.data[index];
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
  const idade = Number(document.getElementById("idade").value);
  const altura = Number(document.getElementById("altura").value);
  const peso = Number(document.getElementById("peso").value);

  if (!idade || !altura || !peso) return;

  state.idade = idade;
  state.altura = altura;
  state.peso = peso;
  state.pesoAlvo = calcularPesoAlvo(altura);
  state.metaCalorias = calcularCaloriasDiarias(idade, altura, peso);

  atualizarResumo();
  atualizarCalorias();

  plannerSection.classList.remove("hidden");
  plannerSection.scrollIntoView({ behavior: "smooth" });
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
  state.escolhas = {};
  Object.values(mealElements).forEach(({ select, details }) => {
    select.value = "";
    details.innerHTML = "<p>Escolhe uma refeição para ver os detalhes. 🌈</p>";
  });
});

renderMealCards();
