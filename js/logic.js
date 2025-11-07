const IMC_SAUDAVEL = 17;
const KCAL_POR_KG = 35;

export function calcularPesoAlvo(alturaCm) {
  const alturaM = alturaCm / 100;
  const peso = IMC_SAUDAVEL * Math.pow(alturaM, 2);
  return Number(peso.toFixed(1));
}

export function calcularCaloriasDiarias(idade, alturaCm, pesoAtual) {
  const pesoAlvo = calcularPesoAlvo(alturaCm);
  const base = KCAL_POR_KG * pesoAlvo;
  const fatorIdade = idade < 8 ? 1.05 : idade > 10 ? 0.95 : 1;
  const fatorPeso = pesoAtual > pesoAlvo ? 0.95 : 1.05;
  return Math.round(base * fatorIdade * fatorPeso);
}

export function ajustarPorcao(quantidadePadrao, pesoAtual, pesoAlvo) {
  if (!quantidadePadrao) return 0;
  const ratio = pesoAlvo && pesoAtual ? pesoAlvo / pesoAtual : 1;
  const seguro = Math.max(0.7, Math.min(ratio, 1.2));
  return Number((quantidadePadrao * seguro).toFixed(1));
}
