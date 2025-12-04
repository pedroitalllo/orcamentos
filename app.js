/* app.js - lógica do sistema de orçamentos
   Esse arquivo implementa CRUD (Create, Read, Update, Delete) usando localStorage,
   validações básicas, busca, filtros, ordenação e exportação (JSON/CSV).
*/

/* ----- Constantes e seleção de elementos do DOM ----- */
const form = document.getElementById('orcamentoForm'); // formulário principal
const listaEl = document.getElementById('listaOrcamentos'); // lista onde cards aparecem
const semItensEl = document.getElementById('sem-itens'); // mensagem "nenhum item"
const buscaEl = document.getElementById('busca'); // campo de busca
const filtroCategoriaEl = document.getElementById('filtroCategoria'); // filtro categoria
const ordenarEl = document.getElementById('ordenar'); // seletor de ordenação
const exportJsonBtn = document.getElementById('exportJson'); // botão exportar JSON
const exportCsvBtn = document.getElementById('exportCsv'); // botão exportar CSV
const btnLimpar = document.getElementById('btnLimpar'); // limpar formulário

/* Campos do formulário (para validação e leitura) */
const tituloEl = document.getElementById('titulo');
const descricaoEl = document.getElementById('descricao');
const fornecedorEl = document.getElementById('fornecedor');
const valorEl = document.getElementById('valor');
const dataEl = document.getElementById('data');
const categoriaEl = document.getElementById('categoria');

/* Erros (pequenos elementos para exibir mensagens) */
const erroTitulo = document.getElementById('erro-titulo');
const erroFornecedor = document.getElementById('erro-fornecedor');
const erroValor = document.getElementById('erro-valor');

/* ----- Dados e utilitários ----- */
const STORAGE_KEY = 'orcamentos_v1'; // chave usada no localStorage

// Recupera lista do localStorage (ou array vazio se não existir)
function carregarOrcamentos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    console.error('Erro ao parsear localStorage', e);
    return [];
  }
}

// Salva array de orçamentos no localStorage
function salvarOrcamentos(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* Gera um id simples baseado em timestamp (suficiente para frontend local) */
function gerarId() {
  return 'id-' + Date.now();
}

/* Formata valor para moeda BRL */
function formatarValor(v) {
  if (v === '' || v === null || isNaN(Number(v))) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ----- Renderização ----- */
function renderLista() {
  const todos = carregarOrcamentos();

  // aplica busca
  const q = buscaEl.value.trim().toLowerCase();
  let filtrados = todos.filter(item => {
    if (!q) return true;
    return item.titulo.toLowerCase().includes(q) || item.fornecedor.toLowerCase().includes(q);
  });

  // aplica categoria
  const cat = filtroCategoriaEl.value;
  if (cat) {
    filtrados = filtrados.filter(i => i.categoria === cat);
  }

  // ordenação
  const ordem = ordenarEl.value;
  filtrados.sort((a, b) => {
    if (ordem === 'data-desc') return (b.data || '')?.localeCompare(a.data || '');
    if (ordem === 'data-asc') return (a.data || '')?.localeCompare(b.data || '');
    if (ordem === 'valor-desc') return Number(b.valor) - Number(a.valor);
    if (ordem === 'valor-asc') return Number(a.valor) - Number(b.valor);
    return 0;
  });

  // limpa lista no DOM
  listaEl.innerHTML = '';

  if (filtrados.length === 0) {
    semItensEl.style.display = 'block';
    return;
  } else {
    semItensEl.style.display = 'none';
  }

  // cria cards
  filtrados.forEach(item => {
    const li = document.createElement('li');
    li.className = 'orcamento-card';
    li.setAttribute('data-id', item.id);

    // título e meta
    const top = document.createElement('div');
    top.className = 'card-top';
    const titulo = document.createElement('div');
    titulo.className = 'card-title';
    titulo.textContent = item.titulo;
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = `${item.fornecedor} · ${item.categoria || '—'} · ${formatarValor(item.valor)}`;
    top.appendChild(titulo);
    top.appendChild(meta);

    // descrição
    const desc = document.createElement('div');
    desc.textContent = item.descricao || '';
    desc.className = 'card-desc';

    // data estimada
    const dt = document.createElement('div');
    dt.className = 'card-meta';
    dt.textContent = item.data ? `Data: ${item.data}` : '';

    // ações (editar, excluir)
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => carregarParaEdicao(item.id));

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Excluir';
    btnDelete.addEventListener('click', () => excluirOrcamento(item.id));

    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    // montar card
    li.appendChild(top);
    if (item.descricao) li.appendChild(desc);
    if (item.data) li.appendChild(dt);
    li.appendChild(actions);

    listaEl.appendChild(li);
  });
}

/* ----- CRUD: criar / editar / excluir ----- */

// limpa mensagens de erro
function limparErros() {
  erroTitulo.textContent = '';
  erroFornecedor.textContent = '';
  erroValor.textContent = '';
}

// valida os campos antes de salvar; retorna objeto {ok:boolean, data: {...}}
function validarDados() {
  limparErros();
  let ok = true;

  const titulo = tituloEl.value.trim();
  const descricao = descricaoEl.value.trim();
  const fornecedor = fornecedorEl.value.trim();
  const valor = valorEl.value.trim();
  const data = dataEl.value;
  const categoria = categoriaEl.value;

  if (titulo.length < 3) {
    erroTitulo.textContent = 'Informe um título com ao menos 3 caracteres.';
    ok = false;
  }
  if (fornecedor.length < 2) {
    erroFornecedor.textContent = 'Informe o fornecedor.';
    ok = false;
  }
  if (valor === '' || Number(valor) < 0) {
    erroValor.textContent = 'Valor inválido.';
    ok = false;
  }

  return {
    ok,
    data: {
      titulo,
      descricao,
      fornecedor,
      valor: Number(parseFloat(valor).toFixed(2)),
      data,
      categoria
    }
  };
}

/* Quando o formulário é submetido (criar ou salvar edição) */
form.addEventListener('submit', function(e) {
  e.preventDefault(); // impede envio/refresh
  const check = validarDados();
  if (!check.ok) return; // se inválido, não salva

  const todos = carregarOrcamentos();

  // se existe um campo hidden de edição (usamos data-edit-id no form quando editando)
  const editId = form.getAttribute('data-edit-id');
  if (editId) {
    // editar item existente
    const idx = todos.findIndex(x => x.id === editId);
    if (idx !== -1) {
      todos[idx] = { ...todos[idx], ...check.data, atualizadoEm: new Date().toISOString() };
      salvarOrcamentos(todos);
      form.removeAttribute('data-edit-id');
      document.getElementById('btnSalvar').textContent = 'Salvar orçamento';
    }
  } else {
    // criar novo
    const novo = {
      id: gerarId(),
      criadoEm: new Date().toISOString(),
      ...check.data
    };
    todos.push(novo);
    salvarOrcamentos(todos);
  }

  form.reset(); // limpa o formulário
  limparErros();
  renderLista(); // atualiza a lista na tela
});

/* Carrega um orçamento para edição: preenche o formulário com os dados */
function carregarParaEdicao(id) {
  const todos = carregarOrcamentos();
  const item = todos.find(x => x.id === id);
  if (!item) return alert('Orçamento não encontrado');

  // preenche campos
  tituloEl.value = item.titulo;
  descricaoEl.value = item.descricao || '';
  fornecedorEl.value = item.fornecedor;
  valorEl.value = item.valor;
  dataEl.value = item.data || '';
  categoriaEl.value = item.categoria || '';

  // marca o form como modo edição guardando id
  form.setAttribute('data-edit-id', id);
  document.getElementById('btnSalvar').textContent = 'Atualizar orçamento';

  // foca no título para fluxo de edição pelo teclado
  tituloEl.focus();
}

/* Excluir após confirmação */
function excluirOrcamento(id) {
  if (!confirm('Deseja realmente excluir este orçamento?')) return;
  let todos = carregarOrcamentos();
  todos = todos.filter(i => i.id !== id);
  salvarOrcamentos(todos);
  renderLista();
}

/* ----- Exportar / Importar (extras para entrega a mais) ----- */

/* Exporta JSON com todos os orçamentos */
exportJsonBtn.addEventListener('click', () => {
  const todos = carregarOrcamentos();
  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orcamentos.json';
  a.click();
  URL.revokeObjectURL(url);
});

/* Exporta CSV (simples) */
exportCsvBtn.addEventListener('click', () => {
  const todos = carregarOrcamentos();
  if (!todos.length) return alert('Nenhum orçamento a exportar.');

  const header = ['id','titulo','descricao','fornecedor','valor','data','categoria','criadoEm','atualizadoEm'];
  const csv = [
    header.join(',')
  ].concat(
    todos.map(item => header.map(h => {
      const v = item[h] ?? '';
      // escape básico para CSV
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','))
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orcamentos.csv';
  a.click();
  URL.revokeObjectURL(url);
});

/* ----- Outros handlers: busca, filtros e limpar ----- */
buscaEl.addEventListener('input', () => renderLista());
filtroCategoriaEl.addEventListener('change', () => renderLista());
ordenarEl.addEventListener('change', () => renderLista());
btnLimpar.addEventListener('click', () => {
  form.reset();
  form.removeAttribute('data-edit-id');
  document.getElementById('btnSalvar').textContent = 'Salvar orçamento';
  limparErros();
});

/* Inicialização */
document.addEventListener('DOMContentLoaded', () => {
  renderLista(); // renderiza quando a página carrega
});
