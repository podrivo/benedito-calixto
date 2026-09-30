(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const brlShort = (v) => v >= 1e6
    ? "R$ " + (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi"
    : "R$ " + Math.round(v / 1e3).toLocaleString("pt-BR") + " mil";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDate = (iso) => iso ? iso.split("-").reverse().join("/") : "s/d";
  const DO = "https://diariooficial.prefeitura.sp.gov.br/md_epubli_visualizar.php?";

  /* ---------------- Progress bar ---------------- */
  const START = new Date(2026, 8, 1), END = new Date(2026, 11, 31, 23, 59);
  const now = new Date();
  const pct = Math.min(1, Math.max(0, (now - START) / (END - START)));
  const fill = $("#progress-fill"), marker = $("#progress-today"), label = $("#progress-today-label");
  const drawProgress = (p) => {
    fill.style.width = marker.style.left = p * 100 + "%";
    label.textContent = `hoje · ${Math.round(p * 100)}%`;
    label.style.transform = `translateX(${-p * 100}%)`;
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) drawProgress(pct);
  else {
    const DELAY = 700, DUR = 1400, t0 = performance.now() + DELAY;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (t) => {
      const k = Math.min(1, Math.max(0, (t - t0) / DUR));
      drawProgress(pct * easeOut(k));
      if (k < 1) requestAnimationFrame(tick);
    };
    drawProgress(0);
    requestAnimationFrame(tick);
  }
  /* ---------------- Budget ---------------- */
  const CATS = [
    { k: "calcada", name: "Calçadas e passeios", v: 554544.14, ref: 578631.72 },
    { k: "demol", name: "Demolições e retiradas", v: 322276.14, ref: 336274.76 },
    { k: "orla", name: "Recuperação de orlas (paralelepípedos)", v: 159545.59, ref: 166475.71 },
    { k: "paisagismo", name: "Paisagismo", v: 126457.04, ref: 131949.91 },
    { k: "quadra", name: "Quadra", v: 104689.75, ref: 109237.11 },
    { k: "prelim", name: "Serviços preliminares", v: 82583.12, ref: 86170.27 },
    { k: "adm", name: "Administração local", v: 51247.64, ref: 53473.67 },
    { k: "drenagem", name: "Drenagem", v: 29530.88, ref: 30813.60 },
    { k: "projeto", name: "Projeto executivo", v: 5132.94, ref: 5333.14 },
    { k: "acess", name: "Acessibilidade", v: 3879.52, ref: 4048.04 },
  ];
  const TOTAL = CATS.reduce((a, c) => a + c.v, 0);

  // Largest-remainder rounding so the stones add up exactly to the contract / 10k.
  const STONES = Math.round(TOTAL / 1e4);
  const raw = CATS.map((c) => (c.v / TOTAL) * STONES);
  const counts = raw.map(Math.floor);
  let left = STONES - counts.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - counts[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => counts[i]++);
  CATS.forEach((c, i) => { c.stones = Math.max(1, counts[i]); });

  const wall = $("#wall");
  let idx = 0;
  wall.innerHTML = CATS.map((c) =>
    Array.from({ length: c.stones }, () => `<span class="stone" data-k="${c.k}" style="--c:var(--c-${c.k});--i:${idx++}"></span>`).join("")
  ).join("");

  const readout = document.createElement("p");
  readout.className = "legend-readout";
  readout.setAttribute("aria-live", "polite");
  $("#legend").after(readout);

  $("#legend").innerHTML = CATS.map((c) =>
    `<li><button type="button" data-k="${c.k}" aria-pressed="false"><i class="dot" style="--c:var(--c-${c.k})"></i>${esc(c.name)}</button></li>`
  ).join("");

  const tbody = $("#money-table tbody");
  tbody.innerHTML = CATS.map((c) => `
    <tr data-k="${c.k}">
      <td><i class="dot" style="--c:var(--c-${c.k})"></i>${esc(c.name)}</td>
      <td class="r num">${brl(c.v)}</td>
      <td class="r num ref">${brl(c.ref)}</td>
      <td class="r num">${(c.v / TOTAL * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td>
    </tr>`).join("");

  let focused = null;
  const setFocus = (k) => {
    focused = k;
    wall.classList.toggle("has-focus", !!k);
    wall.querySelectorAll(".stone").forEach((s) => s.classList.toggle("is-on", s.dataset.k === k));
    document.querySelectorAll("#legend button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
    tbody.querySelectorAll("tr").forEach((r) => r.classList.toggle("is-on", r.dataset.k === k));
    const c = CATS.find((x) => x.k === k);
    readout.textContent = c
      ? `${c.name}: ${brl(c.v)} · ${c.stones} pedras · ${(c.v / TOTAL * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do contrato`
      : `Cada pedra ≈ R$ 10 mil · total ${brl(TOTAL)}`;
  };
  setFocus(null);
  $("#legend").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    setFocus(focused === b.dataset.k ? null : b.dataset.k);
  });
  const hoverable = window.matchMedia("(hover: hover)").matches;
  if (hoverable) {
    wall.addEventListener("mouseover", (e) => { const s = e.target.closest(".stone"); if (s) setFocus(s.dataset.k); });
    wall.addEventListener("mouseleave", () => setFocus(null));
    tbody.addEventListener("mouseover", (e) => { const r = e.target.closest("tr"); if (r) setFocus(r.dataset.k); });
    tbody.addEventListener("mouseleave", () => setFocus(null));
  }
  wall.addEventListener("click", (e) => { const s = e.target.closest(".stone"); if (s) setFocus(focused === s.dataset.k ? null : s.dataset.k); });

  const TOP = [
    ["Passeio de concreto armado (fck 30 MPa), com lastro de brita", "323,91 m³", 395905.47, "calcada"],
    ["Demolição manual de concreto armado", "269,67 m³", 139643.21, "demol"],
    ["Fornecimento e assentamento de paralelepípedos", "206,64 m²", 71082.09, "orla"],
    ["Remoção de entulho em caçamba metálica", "", 67769.15, "demol"],
    ["Apicoamento mecânico do piso da quadra", "282 m²", 53337.48, "quadra"],
    ["Limpeza de juntas de dilatação", "1.349,66 m", 47750.97, "calcada"],
    ["Destinação final de entulho em aterro", "350,57 t", 43568.83, "demol"],
    ["Aluguel de compressor portátil", "270 h", 27045.90, "prelim"],
    ["Terra preparada para plantio", "", 22859.60, "paisagismo"],
    ["Tubo de ferro fundido para esgoto (75 mm)", "48 m", 21899.04, "drenagem"],
    ["Bombeamento de concreto", "", 20630.46, "calcada"],
    ["Banco em concreto aparente, tipo PMSP", "44 m", 15491.08, "paisagismo"],
    ["Mudas de dracena", "225 un.", 14485.50, "paisagismo"],
  ];
  $("#top-items").innerHTML = TOP.map(([n, q, v, k]) => `
    <li style="--c:var(--c-${k})">
      <span class="item-name">${esc(n)}</span>
      <span class="item-val">${brl(v)}</span>
      ${q ? `<span class="item-qty">${q}</span>` : ""}
      <span class="bar"><i style="width:${(v / TOP[0][2] * 100).toFixed(1)}%"></i></span>
    </li>`).join("");

  const DIRECT = 1250423.93;
  const bdiRows = [
    { label: "Orçamento da Prefeitura", total: 1502407.93, bdi: 251984.00, cls: "" },
    { label: "Proposta da Progredior", total: 1439886.76, bdi: 189462.83, cls: "bdi__markup--low" },
  ];
  $("#bdi").innerHTML = bdiRows.map((r) => `
    <div class="bdi__row">
      <div class="bdi__label"><span>${r.label}</span><span class="num">${brl(r.total)}</span></div>
      <div class="bdi__bar" role="img" aria-label="${r.label}: custo direto ${brl(DIRECT)} mais BDI ${brl(r.bdi)}">
        <span class="bdi__direct" style="width:${DIRECT / 1502407.93 * 100}%">custo direto ${brl(DIRECT)}</span>
        <span class="bdi__markup ${r.cls}" style="width:${r.bdi / 1502407.93 * 100}%">BDI</span>
      </div>
      <div class="bdi__sub num">BDI: ${brl(r.bdi)}</div>
    </div>`).join("");

  const MONTHS = [["Mês 1 · set", 411188.24], ["Mês 2 · out", 496199.51], ["Mês 3 · nov", 311496.92], ["Mês 4 · dez", 221002.08]];
  const maxM = Math.max(...MONTHS.map((m) => m[1]));
  $("#months").innerHTML = MONTHS.map(([l, v]) => `
    <div class="month"><span class="month__val">${brlShort(v)}</span><div class="month__bar" data-h="${(v / maxM * 100).toFixed(1)}"></div><span class="month__lbl">${l}</span></div>`).join("");

  /* ---------------- Bidding ---------------- */
  const BIDDERS = [
    ["Construtora Progredior Ltda.", "56.838.949/0001-10", "win", "Vencedora", "Habilitada. Menor preço: R$ 1.439.886,76."],
    ["Stein Incorporações", "17.861.752/0001-40", "ok", "2º lugar", "Habilitada. Lance final de R$ 1.444.264,00, R$ 4.377,24 acima da vencedora."],
    ["Dekton", "06.297.348/0001-79", "ok", "3º lugar", "Habilitada. Lance final de R$ 1.457.335,25."],
    ["DPT Engenharia", "34.730.331/0001-07", "ok", "4º lugar", "Habilitada. Proposta de R$ 1.464.895,21. Não enviou representante à sessão de lances."],
    ["S.C. Engenharia", "10.599.775/0001-89", "out", "Inabilitada", "Atestados técnicos sem as quantidades mínimas exigidas em paralelepípedo, apicoamento, juntas, dracena e arrancamento."],
    ["Amaral Engenharia", "34.223.533/0001-54", "out", "Inabilitada", "Atestados técnicos insuficientes em itens semelhantes, além de destinação de resíduo Classe II B."],
    ["THI Engenharia", "09.195.930/0001-12", "out", "Inabilitada", "Atestados técnicos insuficientes em paralelepípedo, apicoamento, transporte de terra e arrancamento."],
    ["Tobias & Figueiredo", "68.382.498/0001-38", "out", "Inabilitada", "Atestados técnicos insuficientes em paralelepípedo, Classe II B, juntas, arrancamento, demolição e acabamento bambolê."],
    ["Macor", "57.646.374/0001-04", "out", "Inabilitada", "Excluída já na 1ª sessão (12/08) por não apresentar a certidão negativa de falência."],
  ];
  $("#bidders").innerHTML = BIDDERS.map(([n, c, s, l, w]) => `
    <li class="bidder">
      <div class="bidder__head"><span class="bidder__name">${esc(n)}</span><span class="status status--${s}">${l}</span></div>
      <div class="bidder__cnpj">CNPJ ${c}</div>
      <p class="bidder__why">${esc(w)}</p>
    </li>`).join("");

  const REF = 1502407.93;
  const BIDS = [
    ["Progredior", 1439886.76, "manteve a proposta inicial", true],
    ["Stein", 1444264.00, "inicial R$ 1.494.882,58"],
    ["Dekton", 1457335.25, "inicial R$ 1.502.407,93 (= orçamento)"],
    ["DPT", 1464895.21, "sem lances"],
  ];
  // Bars show the discount against the budget; the bids themselves differ by under 2%, so absolute bars would look identical.
  const pctOff = (v) => ((REF - v) / REF) * 100;
  $("#bids").innerHTML = BIDS.map(([n, v, note, win]) => `
    <div class="bid ${win ? "bid--win" : ""}">
      <div class="bid__top"><strong>${n}</strong><span class="num">${brl(v)}</span></div>
      <div class="bid__track"><div class="bid__bar" data-w="${(pctOff(v) / 5 * 100).toFixed(2)}"></div></div>
      <span class="bid__note"><strong class="num">${pctOff(v).toFixed(2).replace(".", ",")}% abaixo</strong> · ${brl(REF - v)} a menos · ${note}</span>
    </div>`).join("") +
    `<span class="bids__legend">Barra = desconto sobre o orçamento da Prefeitura (R$ 1.502.407,93). Escala de 0 a 5%.</span>`;

  /* ---------------- Videos (click-to-load) ---------------- */
  document.querySelectorAll(".video__facade").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      f.title = btn.getAttribute("aria-label");
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      btn.replaceWith(f);
    });
  });

  /* ---------------- Timeline ---------------- */
  const TL = [
    { phase: "Origem" },
    { d: "15/10/2025", t: "Vistoria técnica na praça", x: "A Supervisão Técnica de Projetos e Obras fotografa pisos quebrados, bancos soltos, canteiros e a quadra.", docs: [["Relatório de vistoria", "relatorio-de-vistoria.pdf"], ["Solicitação", "microsoft-word-solicitacao-praca-benedito-calixto-docx.pdf"]] },
    { d: "06/11/2025", t: "Reunião do Conselho Participativo Municipal", x: "A praça entra na pauta do orçamento participativo. Participam representantes de associações de moradores, entre elas a AMJA.", docs: [["Ata", "pdf-6050-2023-0007906-9.pdf"]] },
    { d: "s/d", t: "Proposta da comunidade: Orçamento Participativo 2026", x: "Prancha com o projeto em duas fases, uma estrutural e outra de paisagismo.", docs: [["Projeto", "projeto-pc-bc-subpi-1.pdf"]] },
    { phase: "Preparação" },
    { d: "19/05/2026", t: "Comissão de licitação nomeada", x: "A Portaria 23/SUB-PI/GAB/2026 designa os agentes de contratação e a equipe de apoio.", docs: [["Portaria", "portaria-licitacao-2026.pdf"]] },
    { d: "17/06/2026", t: "Processo da obra aberto", x: "O processo 6050.2026/0010848-0 é autuado no SEI com o motivo “Revitalização Praça Benedito Calixto”.", docs: [["Portal de Processos", "portal-processo-6050-2026-0010848-0.pdf"]] },
    { d: "23/06/2026", t: "Estudo técnico, termo de referência e orçamento", x: "A área técnica fecha o pacote: orçamento de R$ 1.502.407,93 e prazo de 120 dias.", docs: [["ETP", "sei-pmsp-159491882-estudo-tecnico-preliminar-etp.pdf"], ["TR", "sei-pmsp-159492184-termo-de-referencia.pdf"], ["Planilha", "orcamento-final-praca-benedito-calixto-4-xls.pdf"]] },
    { d: "24/06/2026", t: "Dinheiro reservado", x: "Nota de reserva 47.637/2026, da verba do Orçamento Cidadão da Subprefeitura.", docs: [["Nota de reserva", "scanned-document-2.pdf"]] },
    { d: "26/06/2026", t: "Parecer jurídico favorável", x: "A Assessoria Jurídica aprova a fase preparatória.", docs: [["Parecer", "sei-pmsp-160111990-manifestacao.pdf"]] },
    { d: "27/06/2026", t: "Subprefeito autoriza a licitação", x: "O despacho de Ygor Lucas Gomes da Costa autoriza a concorrência presencial.", docs: [["Despacho (DO)", "arquip-dosp-160141757-despacho-deferido.pdf"]], key: true },
    { d: "30/06/2026", t: "Edital publicado", x: "Concorrência Presencial 90002/SUB-PI/2026, registrada também no PNCP e no Compras.gov.", docs: [["Edital", "sei-pmsp-160252510-edital.pdf"], ["Aviso (DO)", "arquip-dosp-160265181-abertura-np.pdf"], ["Estadão", "cad-b-br-8-estado-economia-paginas-b08-02-07-26.pdf"]] },
    { phase: "Licitação" },
    { d: "12/08/2026", t: "1ª sessão pública: abertura dos envelopes", x: "Nove empresas entregam documentos. A Macor é excluída. A sessão foi gravada.", docs: [["Ata", "ata-sessao-publica-12082026.pdf"], ["Vídeo", "https://youtu.be/XsBawk9-Krc"]], key: true },
    { d: "18/08/2026", t: "2ª sessão: resultado da análise técnica", x: "Quatro empresas são habilitadas e quatro inabilitadas por atestados insuficientes. Abre-se prazo de 3 dias úteis para recurso, e ninguém recorre.", docs: [["Ata", "ata-segunda-sessao.pdf"]] },
    { d: "26/08/2026", t: "3ª sessão: preços e lances", x: "A Progredior vence com R$ 1.439.886,76. A sessão foi gravada.", docs: [["Ata", "ata-terceira-sessao-sessao.pdf"], ["Vídeo", "https://www.youtube.com/watch?v=lEEdOZTc-Mc"]], key: true },
    { d: "27/08/2026", t: "Adjudicação e homologação", x: "O agente de contratação recomenda a Progredior e o Subprefeito homologa. Publicado no Diário Oficial de 28/08, p. 578.", docs: [["Homologação (DO)", "arquip-dosp-163965930-despacho.pdf"], ["DO p. 578", "edicao-217-de-28-agosto-2026-pdf-protegido.pdf"]] },
    { phase: "Contrato e obra" },
    { d: "28/08/2026", t: "Nota de empenho 91609/2026", x: "R$ 1.439.886,76 comprometidos em três parcelas: outubro, novembro e dezembro.", docs: [["Nota de empenho", "scan-2026-08-28-161236532.pdf"]] },
    { d: "31/08/2026", t: "Seguro-garantia de 5%", x: "O Ofício 022 pede a garantia à Progredior, e a Pottencial Seguradora emite a apólice de R$ 71.994,34, válida até 30/06/2027. A Secretaria da Fazenda registra o recebimento em 02/09, no processo 6050.2026/0016583-1.", docs: [["Ofício 022", "scan-2026-08-28-161909006.pdf"], ["Apólice", "cto-14-sub-pi-26-apolice.pdf"], ["Formulário de caução", "72416.pdf"]] },
    { d: "01/09/2026", t: "Contrato assinado e ordem de início", x: "Contrato 014/SUB-PI/2026 e Ordem de Início 013/SUB-PI/CPO/STPO/2026. Começam a contar os 120 dias.", docs: [["Contrato", "termo-de-contrato-014-sub-pi-2026-praca-benedito-calixto-construtora-progredior.pdf"], ["Ordem de início", "ordem-de-inicio.pdf"]], key: true },
    { d: "04/09/2026", t: "Extrato do contrato no Diário Oficial", x: "Publicado na p. 501.", docs: [["Extrato (DO)", "arquip-dosp-164428100-extrato-de-contrato-nota-de-empenho-np.pdf"]] },
    { d: "17/09/2026", t: "Bancas atrapalham a obra", x: "O fiscal relata que estruturas de permissionários ocupam as áreas de trabalho. A Assessoria Jurídica dá parecer favorável à suspensão das permissões.", docs: [["Relato", "sei-pmsp-165312590-encaminhamento.pdf"], ["Parecer", "sei-pmsp-165323457-manifestacao.pdf"]] },
    { d: "24/09/2026", t: "Portaria 30: permissões de uso suspensas", x: "Os Termos de Permissão de Uso (TPUs) nas áreas da obra ficam suspensos só durante o período da obra, sem serem cancelados.", docs: [["Portaria (DO)", "arquip-dosp-165388683-portaria.pdf"]], key: true },
    { today: true },
    { d: "31/12/2026", t: "Fim do prazo contratual", x: "Término previsto na ordem de início.", future: true },
  ];
  /* ---------------- People ---------------- */
  const D = {
    memorial: "memorial-descritivo.pdf",
    tr: "sei-pmsp-159492184-termo-de-referencia.pdf",
    etp: "sei-pmsp-159491882-estudo-tecnico-preliminar-etp.pdf",
    edital: "sei-pmsp-160252510-edital.pdf",
    planilha: "orcamento-final-praca-benedito-calixto-4-xls.pdf",
    contrato: "termo-de-contrato-014-sub-pi-2026-praca-benedito-calixto-construtora-progredior.pdf",
    ordem: "ordem-de-inicio.pdf",
    empenho: "scan-2026-08-28-161236532.pdf",
  };
  const docLinks = (ls = []) => ls.length ? `<div class="doc-links">${ls.map(([l, h]) => h.startsWith("http")
    ? `<a href="${h}" target="_blank" rel="noopener">${esc(l)} ↗</a>`
    : `<a href="docs/${h}">${esc(l)}</a>`).join("")}</div>` : "";
  const SUBPI = "https://prefeitura.sp.gov.br/web/pinheiros/w/lista-de-servidores-e-contatos";
  const CPM = "https://prefeitura.sp.gov.br/web/pinheiros/w/participacao_social/conselhos_e_orgaos_colegiados/conselho_participativo/53521";
  // [name, role, work e-mail, [[label, local doc file or URL], ...]]
  const PEOPLE = [
    ["Decisão", [
      ["Ygor Lucas Gomes da Costa", "Subprefeito de Pinheiros. Autorizou a licitação, homologou o resultado, assinou o contrato e a Portaria 30.", "pinheiros@smsub.prefeitura.sp.gov.br",
        [["Página oficial", SUBPI], ["Autorização", "arquip-dosp-160141757-despacho-deferido.pdf"], ["Homologação", "arquip-dosp-163965930-despacho.pdf"], ["Portaria 30", "arquip-dosp-165388683-portaria.pdf"]]],
      ["Gabinete do Subprefeito", "Onde está o processo das bancas (6050.2026/0017937-9). O Portal de Processos lista como contatos Norival Nunes Rodrigues Junior e lkguaglini@smsub.prefeitura.sp.gov.br.", "norivaljunior@smsub.prefeitura.sp.gov.br",
        [["Portal de Processos", "portal-de-processos-administrativos.pdf"]]],
    ]],
    ["Obra e fiscalização", [
      ["Niwton Gilberto de Jesus", "Supervisor Técnico de Projetos e Obras. Fez a vistoria, o termo de referência e o orçamento, e é o fiscal do contrato.", "niwton@smsub.prefeitura.sp.gov.br",
        [["Página oficial", SUBPI], ["Vistoria", "relatorio-de-vistoria.pdf"], ["Requisição", "sei-pmsp-159637598-requisicao-de-servicos.pdf"], ["Ordem de início", "ordem-de-inicio.pdf"]]],
      ["Rosa Maria Castro Menegali", "Coordenadora de Projetos e Obras. Gestora do contrato e fiscal suplente.", "rmenegali@smsub.prefeitura.sp.gov.br",
        [["Página oficial", SUBPI], ["Contrato", "termo-de-contrato-014-sub-pi-2026-praca-benedito-calixto-construtora-progredior.pdf"], ["Ordem de início", "ordem-de-inicio.pdf"]]],
    ]],
    ["Licitação", [
      ["Ailton Lopes Omelczuk", "Agente de contratação. Conduziu as sessões públicas e recomendou a adjudicação.", "",
        [["Portaria 23", "portaria-licitacao-2026.pdf"], ["Ata da 3ª sessão", "ata-terceira-sessao-sessao.pdf"], ["Recomendação", "sei-pmsp-163918195-manifestacao.pdf"]]],
      ["Robinson Alexandre Ferreira", "Agente de contratação (Portaria 23/2026).", "", [["Portaria 23", "portaria-licitacao-2026.pdf"]]],
      ["Equipe de apoio", "Carmen Moreira Bertuccelli, Sandy Sthephany Gomes de Oliveira, Kenedi Oliveira e Silva, Maria Aparecida Raposa da Costa e Marcia Pagotti Pimentel.", "",
        [["Portaria 23", "portaria-licitacao-2026.pdf"]]],
      ["E-mail da licitação", "Canal indicado no edital para recursos.", "licitacao-pinheiros@smsub.prefeitura.sp.gov.br", [["Edital", "sei-pmsp-160252510-edital.pdf"]]],
    ]],
    ["Administração e finanças", [
      ["Kenedi Oliveira e Silva", "Coordenador de Administração e Finanças (CAF). Pediu a reserva do dinheiro.", "ksilva@smsub.prefeitura.sp.gov.br",
        [["Página oficial", SUBPI], ["Pedido de reserva", "sei-pmsp-159995135-informacao.pdf"], ["Pedido de celeridade", "sei-pmsp-164048895-encaminhamento.pdf"]]],
      ["Sergio Martins Pinto", "Supervisor de Finanças. Assinou as notas de reserva e de empenho, como responsável pela área contábil, e o ofício que pediu o seguro-garantia.", "sergiomartins@smsub.prefeitura.sp.gov.br",
        [["Nota de reserva", "scanned-document-2.pdf"], ["Nota de empenho", "scan-2026-08-28-161236532.pdf"], ["Ofício 022", "scan-2026-08-28-161909006.pdf"]]],
      ["Marcia Pagotti Pimentel", "Supervisão de Finanças. Lançou a nota de reserva no sistema e a encaminhou à licitação.", "mpagotti@smsub.prefeitura.sp.gov.br",
        [["Nota de reserva", "scanned-document-2.pdf"], ["Encaminhamento", "sei-pmsp-160028648-encaminhamento.pdf"]]],
      ["Carmen Moreira Bertuccelli", "Chefe de Unidade na Supervisão de Finanças. Lançou a nota de empenho no sistema e enviou o seguro-garantia à Secretaria da Fazenda.", "cbertuccelli@smsub.prefeitura.sp.gov.br",
        [["Nota de empenho", "scan-2026-08-28-161236532.pdf"], ["E-mail à empresa", "e-mail-de-smsub-envio-de-nota-de-empenho-e-seguro-garantia-sei-6050-2026-0010848-0.pdf"], ["Envio da garantia", "sei-pmsp-164255120-encaminhamento.pdf"]]],
      ["E-mail de finanças", "Supervisão de Finanças: reserva, empenho, garantia e pagamentos da obra.", "sf-pinheiros@smsub.prefeitura.sp.gov.br",
        [["Portal de Processos", "portal-processo-6050-2026-0016583-1.pdf"]]],
      ["Secretaria Municipal da Fazenda", "A equipe de cauções (DIPED) recebeu e registrou o seguro-garantia em 02/09 (Yoshie Imada e Samuel Fernando Santos).", "",
        [["Formulário de caução", "72416.pdf"], ["Devolução", "sei-pmsp-164311737-encaminhamento.pdf"]]],
      ["Sandy Sthephany Gomes de Oliveira", "Administração e Suprimentos. Elaborou o contrato e o extrato.", "",
        [["Extrato do contrato", "arquip-dosp-164428100-extrato-de-contrato-nota-de-empenho-np.pdf"]]],
    ]],
    ["Jurídico", [
      ["Claudio R. Faustino", "Assessoria Jurídica. Parecer sobre o edital (26/06).", "", [["Parecer", "sei-pmsp-160111990-manifestacao.pdf"]]],
      ["Leonardo Henrique Boy de Oliveira", "Chefe da Assessoria Jurídica. Parecer e minuta da Portaria 30 (17/09).", "",
        [["Página oficial", SUBPI], ["Parecer", "sei-pmsp-165323457-manifestacao.pdf"], ["Minuta", "sei-pmsp-165331383-minuta.pdf"]]],
    ]],
    ["Empresa contratada", [
      ["Construtora Progredior Ltda.", "CNPJ 56.838.949/0001-10. Rua Michigan, 135, Brooklin Novo, São Paulo.", "",
        [["Site", "https://progredior.com.br/"], ["CNPJ na Receita", "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.aspx"], ["Proposta", "progredior-proposta-de-preco.pdf"], ["Habilitação", "ilovepdf-merged-2026-08-14t163522-597.pdf"]]],
      ["Alexandre Grava", "Procurador e representante legal. Assinou o contrato e esteve nas sessões.", "alexandre@progredior.com.br",
        [["Contrato", "termo-de-contrato-014-sub-pi-2026-praca-benedito-calixto-construtora-progredior.pdf"], ["Ata da 1ª sessão", "ata-sessao-publica-12082026.pdf"]]],
      ["Guilherme Leme Perazza", "Engenheiro civil (CREA-SP 5062442704) e sócio-administrador. A empresa o indicou como responsável técnico da obra.", "",
        [["Consulta no CREA-SP", "https://www.creasp.org.br/servico/consulta-publica-de-registrados/"], ["Indicação", "progredior-indicacao-responsavel-tecnico.pdf"], ["Habilitação", "ilovepdf-merged-2026-08-14t163522-597.pdf"], ["Atestados técnicos", "documento-consulta-externa-5-php.pdf"]]],
      ["Pottencial Seguradora S.A.", "Emitiu o seguro-garantia de R$ 71.994,34 (apólice 030692026009907751912893, corretora RVG). A apólice pode ser conferida na SUSEP ou no site da seguradora.", "",
        [["Conferir na SUSEP", "https://www.gov.br/pt-br/servicos/consultar-apolice-de-seguro-garantia"], ["Site da seguradora", "https://pottencial.com.br/consultar-apolice/"], ["Apólice", "cto-14-sub-pi-26-apolice.pdf"], ["Certidões SUSEP", "certidao-de-administradores-agosto-2026.pdf"]]],
    ]],
    ["Comunidade", [
      ["Conselho Participativo Municipal", "Indicou a obra, segundo a CAF. Reúne-se na primeira quinta-feira do mês, com reuniões abertas ao público.", "",
        [["Página oficial", CPM], ["Ata de 06/11/2025", "pdf-6050-2023-0007906-9.pdf"], ["Informação da CAF", "sei-pmsp-159995135-informacao.pdf"]]],
      ["AMJA", "Associação Amigos da Joaquim Antunes. Na reunião de 06/11/2025, Maria Emília Carvalho assinou como “AMJA – Praça Benedito Calixto”.", "",
        [["Ata de 06/11/2025", "pdf-6050-2023-0007906-9.pdf"]]],
    ]],
  ];
  $("#people").innerHTML = PEOPLE.map(([g, ps]) => `
    <div class="group"><h3>${g}</h3>${ps.map(([n, r, m, ls]) => `<div class="person"><strong>${esc(n)}</strong><span>${esc(r)}</span>${m ? `<a class="person__mail" href="mailto:${m}">${m}</a>` : ""}${docLinks(ls)}</div>`).join("")}</div>`).join("");

  const peopleEl = $("#people"), groups = [...peopleEl.children];
  const mqs = [matchMedia("(min-width: 760px)"), matchMedia("(min-width: 1040px)")];
  const layoutPeople = () => {
    const cols = Array.from({ length: 1 + mqs.filter((m) => m.matches).length }, () => Object.assign(document.createElement("div"), { className: "people__col" }));
    peopleEl.replaceChildren(...cols);
    groups.forEach((g) => cols.reduce((a, b) => (b.offsetHeight < a.offsetHeight ? b : a)).append(g));
  };
  layoutPeople();
  mqs.forEach((m) => m.addEventListener("change", layoutPeople));
  document.fonts.ready.then(layoutPeople);

  /* dev:start */
  /* ---------------- Flags (only in development; stripped by tools/build-prod.sh) ---------------- */
  const FLAGS = [
    ["Três prazos diferentes", "O memorial descritivo e o item 13.2 do termo de referência dizem 90 dias. Os itens 7.1 e 15.1 do TR, o contrato e a ordem de início dizem 120 dias. O item 1.2 do edital diz 180 dias. Vale o contrato: 01/09 a 31/12/2026. A confusão chegou às propostas: a Progredior e a Stein ofereceram 120 dias, a Dekton e a DPT, 180.",
      [["Memorial", D.memorial], ["TR", D.tr], ["Edital", D.edital], ["Contrato", D.contrato], ["Ordem de início", D.ordem], ["Proposta Dekton", "proposta-de-preco-dekton.pdf"], ["Proposta DPT", "dtp-engenharia-proposta-de-preco.pdf"]]],
    ["Itens de outro projeto no Estudo Técnico", "O ETP cita playground, cachorródromo e academia ao ar livre, com totais de R$ 476.863,04 e R$ 490.396,55. Nada disso está na planilha de R$ 1,5 milhão da praça.",
      [["ETP", D.etp], ["Planilha final", D.planilha]]],
    ["Planilhas com o nome de outra praça", "Duas versões da planilha e do cronograma trazem no cabeçalho “Praça Panamericana – Alto de Pinheiros”. Uma delas descreve o objeto como “obras de drenagem urbana”. Os valores são os mesmos da versão da Benedito Calixto. A versão completa da memória de cálculo (13 páginas) tem o mesmo cabeçalho. Já a versão de 8 páginas e a nota de reserva descrevem o objeto como “execução de projetos de revitalização”, e não de obras.",
      [["Planilha “Panamericana”", "orcamento-final-praca-benedito-calixto-xls.pdf"], ["Cronograma “Panamericana”", "copia-de-orcamento-final-praca-benedito-calixto-xls.pdf"], ["Memória “Panamericana”", "memoria-calculo-ben-calixto.pdf"], ["Memória de 8 páginas", "orcamento-final-praca-benedito-calixto-3-xls.pdf"], ["Nota de reserva", "scanned-document-2.pdf"], ["Planilha final", D.planilha]]],
    ["Outra Subprefeitura no termo de referência", "O TR menciona “Subprefeitura Vila Maria/Vila Guilherme” e “SMS/SP”, provavelmente de um modelo anterior.",
      [["TR", D.tr]]],
    ["Duas origens para o dinheiro", "A CAF e as notas de reserva e de empenho falam em Orçamento Cidadão, por indicação do Conselho Participativo Municipal. O ETP e o TR falam em “recursos obtidos por emenda parlamentar”.",
      [["Informação da CAF", "sei-pmsp-159995135-informacao.pdf"], ["Nota de reserva", "scanned-document-2.pdf"], ["Nota de empenho", D.empenho], ["ETP", D.etp], ["TR", D.tr]]],
    ["Pedidos da comunidade que não estão no orçamento", "Iluminação com braços duplos, novas lixeiras, retirada do orelhão e aumento da mureta da quadra não aparecem na planilha. O corrimão citado no memorial também não.",
      [["Projeto OP 2026", "projeto-pc-bc-subpi-1.pdf"], ["Planilha final", D.planilha], ["Memorial", D.memorial]]],
    ["A feira de sábado não aparece no planejamento", "Só a solicitação da obra e o projeto da comunidade falam da Feira de Arte, Cultura e Lazer e das bancas. O ETP, o TR, o memorial, a matriz de riscos e o edital não as mencionam. O item 4.3 do TR diz apenas, de forma genérica, que resolver interferências é responsabilidade da contratada. Em 17/09 as bancas travaram a obra e foi preciso editar a Portaria 30.",
      [["Solicitação", "microsoft-word-solicitacao-praca-benedito-calixto-docx.pdf"], ["Projeto OP 2026", "projeto-pc-bc-subpi-1.pdf"], ["TR", D.tr], ["Matriz de riscos", "documento-consulta-externa-php.pdf"], ["Relato do fiscal", "sei-pmsp-165312590-encaminhamento.pdf"]]],
    ["Dois endereços para entregar os envelopes", "O edital, o aviso no Diário Oficial e o anúncio no Estadão mandam entregar os envelopes e assistir à abertura na Rua Frederico Hermann Jr., 595, 2º andar. O cabeçalho do próprio edital e quase todos os documentos SEI usam a Av. Dra. Ruth Cardoso (antiga Nações Unidas), 7123. O preâmbulo do contrato também cita a Frederico Hermann, e o modelo de contrato anexo ao edital ainda diz “dois mil e vinte e quatro”. Nove empresas entregaram os envelopes, então na prática ninguém ficou de fora.",
      [["Edital", D.edital], ["Aviso (DO)", "arquip-dosp-160265181-abertura-np.pdf"], ["Estadão", "cad-b-br-8-estado-economia-paginas-b08-02-07-26.pdf"], ["Contrato", D.contrato]]],
    ["Cadastro desatualizado no Portal de Processos", "O portal lista João Paulo Bezzon como coordenador de Projetos e Obras, mas quem assina a ordem de início com esse cargo é Rosa Menegali. O mesmo portal dá endereços diferentes para unidades da mesma Subprefeitura: Av. Dra. Ruth Cardoso, “Avenida Nações Unidas” (nome antigo) e Viaduto do Chá, 15.",
      [["Portal: processo principal", "portal-processo-6050-2026-0010848-0.pdf"], ["Portal: garantia", "portal-processo-6050-2026-0016583-1.pdf"], ["Ordem de início", D.ordem]]],
    ["Erros no formulário da caução", "O formulário da Secretaria da Fazenda traz emissão em 01/08/2026 (o ofício e a apólice são de 31/08), contrato “14/SUB-IP/2026” e o CNPJ escrito “56.838.949-0001/10”.",
      [["Formulário de caução", "72416.pdf"], ["Ofício 022", "scan-2026-08-28-161909006.pdf"], ["Apólice", "cto-14-sub-pi-26-apolice.pdf"]]],
    ["Número de empenho e de processo no contrato", "O quadro-resumo do contrato cita a nota de empenho 91608/2026, mas a cláusula 4.3 e a nota emitida são 91609/2026. O mesmo quadro traz o processo 6050.2026/0008794-6, que vem do modelo de contrato anexo ao edital, e não o 6050.2026/0010848-0.",
      [["Contrato", D.contrato], ["Nota de empenho", D.empenho], ["Edital (modelo de contrato)", D.edital]]],
    ["Portaria 30 pula o Art. 3º", "A Portaria que suspende as permissões de uso passa do Art. 2º direto para o Art. 4º.",
      [["Portaria 30", "arquip-dosp-165388683-portaria.pdf"]]],
  ];
  $("#flags").innerHTML = FLAGS.map(([t, p, ls]) => `<article class="flag"><h3>${esc(t)}</h3><p>${esc(p)}</p><div class="src">Compare nos documentos:</div>${docLinks(ls)}</article>`).join("");
  /* dev:end */

  /* ---------------- Library ---------------- */
  const C = { p: "Planejamento", o: "Orçamento", l: "Licitação", e: "Propostas das empresas", c: "Contrato e execução", b: "Bancas (TPUs)", x: "Contexto" };
  // [sortDate, displayDate, cat, title, description, file, sei, crc, doKey, sizeNote]
  const DOCS = [
    ["2025-10-15", "15/10/2025", "p", "Relatório de vistoria técnica", "148 fotos do estado da praça antes da obra.", "relatorio-de-vistoria.pdf", "", "", "", "20 MB"],
    ["2025-10-15", "15/10/2025", "p", "Solicitação da obra", "Pedido técnico com imagens do Google Earth e do GeoSampa.", "microsoft-word-solicitacao-praca-benedito-calixto-docx.pdf"],
    ["2025-11-06", "06/11/2025", "x", "Ata do Conselho Participativo Municipal", "Reunião do CPM de Pinheiros (processo 6050.2023/0007906-9).", "pdf-6050-2023-0007906-9.pdf"],
    ["2025-11-07", "s/d", "p", "Projeto: planta de implantação 1:200", "A prancha do projeto, com a proposta do Orçamento Participativo 2026.", "projeto-pc-bc-subpi-1.pdf"],
    ["2025-11-07", "s/d", "p", "Projeto: segunda cópia", "Mesmo conteúdo da prancha acima.", "1.pdf"],
    ["2026-05-19", "19/05/2026", "l", "Portaria 23/SUB-PI/GAB/2026: comissão de licitação", "Designa agentes de contratação e equipe de apoio.", "portaria-licitacao-2026.pdf"],
    ["2026-06-23", "23/06/2026", "p", "Estudo Técnico Preliminar (ETP)", "Justificativa e alternativas para a contratação.", "sei-pmsp-159491882-estudo-tecnico-preliminar-etp.pdf", "159491882", "1A1521CA"],
    ["2026-06-23", "23/06/2026", "p", "Termo de Referência (TR)", "Regras técnicas, prazos, fiscalização e pagamento.", "sei-pmsp-159492184-termo-de-referencia.pdf", "159492184", "A2F4F2C4"],
    ["2026-06-23", "23/06/2026", "p", "Requisição de serviços", "Pedido formal da área técnica.", "sei-pmsp-159637598-requisicao-de-servicos.pdf", "159637598", "CF4F635F"],
    ["2026-06-23", "jun/2026", "p", "Memorial descritivo", "Lista dos serviços, categoria por categoria.", "memorial-descritivo.pdf"],
    ["2026-06-23", "jun/2026", "o", "Planilha orçamentária (versão final)", "Todos os itens, quantidades e preços: R$ 1.502.407,93.", "orcamento-final-praca-benedito-calixto-4-xls.pdf"],
    ["2026-06-23", "jun/2026", "o", "Memória de cálculo", "De onde saem as quantidades (áreas, volumes, horas). Versão de 8 páginas.", "orcamento-final-praca-benedito-calixto-3-xls.pdf"],
    ["2026-06-23", "jun/2026", "o", "Memória de cálculo completa (cabeçalho “Praça Panamericana”)", "13 páginas, incluindo drenagem e administração local, com o cabeçalho de outra praça.", "memoria-calculo-ben-calixto.pdf"],
    ["2026-06-23", "jun/2026", "o", "Cronograma físico-financeiro", "Distribuição do valor em 4 meses.", "orcamento-final-praca-benedito-calixto-2-xls.pdf"],
    ["2026-06-23", "jun/2026", "o", "Planilha orçamentária (cabeçalho “Praça Panamericana”)", "Mesmos valores, com o cabeçalho de outra praça.", "orcamento-final-praca-benedito-calixto-xls.pdf"],
    ["2026-06-23", "jun/2026", "o", "Cronograma (cabeçalho “Praça Panamericana”)", "Mesmos valores, com o cabeçalho de outra praça.", "copia-de-orcamento-final-praca-benedito-calixto-xls.pdf"],
    ["2026-06-24", "24/06/2026", "p", "Encaminhamento dos elementos técnicos", "Lista do pacote técnico enviado à CAF (Niwton).", "sei-pmsp-159990108-encaminhamento.pdf", "159990108", "0359B320"],
    ["2026-06-24", "24/06/2026", "o", "Informação da CAF", "Indicação do Conselho Participativo e pedido de reserva (Kenedi).", "sei-pmsp-159995135-informacao.pdf", "159995135", "2A9726CC"],
    ["2026-06-24", "24/06/2026", "o", "Nota de reserva 47.637/2026", "R$ 1.502.407,93 reservados na dotação do Orçamento Cidadão.", "scanned-document-2.pdf"],
    ["2026-06-25", "25/06/2026", "o", "Encaminhamento da nota de reserva", "Supervisão de Finanças (Marcia Pagotti Pimentel).", "sei-pmsp-160028648-encaminhamento.pdf", "160028648", "AD66D67B"],
    ["2026-06-25", "25/06/2026", "l", "Minuta do edital", "Versão preliminar do edital.", "sei-pmsp-160038043-minuta.pdf", "160038043", "3084D8B9"],
    ["2026-06-25", "25/06/2026", "l", "Encaminhamento da CPL à área técnica", "Pedido de conferência da minuta.", "sei-pmsp-160065139-encaminhamento.pdf", "160065139", "4ACEAC82"],
    ["2026-06-26", "26/06/2026", "l", "Parecer jurídico da fase preparatória", "Assessoria Jurídica (Claudio R. Faustino).", "sei-pmsp-160111990-manifestacao.pdf", "160111990", "5F11EFF1"],
    ["2026-06-27", "pub. 01/07/2026", "l", "Despacho autorizando a licitação", "Subprefeito autoriza a concorrência presencial.", "arquip-dosp-160141757-despacho-deferido.pdf", "160141757", "07099A79", "jixOvari2aO2E2HopZV3vp_h4fmSLXBtCc1mqDLgU-_KJSO5BORDNwIFyVNz4QQRwez5-xOV5wvFtuGxIs0qm9KXo-DK95CXb39zuOCzYsCBdR9C9EL0RNYRiAFvDg7q"],
    ["2026-06-30", "pub. 30/06/2026", "l", "Despacho autorizatório (seção Negócios)", "Mesma autorização, publicada na seção de Negócios.", "arquip-dosp-160203542-outras-np.pdf", "160203542", "A088031F", "wOETkvFoHyoFqoE_sOV4ExcTh-Ka32CeG9x8IX7Tn3oht0KrhUBIFXxLBZmADR83oX0Moms0PZ8VQ8tnn-NzX5ftlrfCtFUf0WRGSpjnioh55WEETAtG9_S1vKar4dlt"],
    ["2026-06-30", "30/06/2026", "l", "Página do Diário Oficial com a autorização", "Inclui uma retificação de dotação de outro processo.", "documento-consulta-externa-2-php.pdf"],
    ["2026-06-30", "30/06/2026", "l", "Edital da Concorrência 90002/SUB-PI/2026", "Regras da licitação, anexos e minuta do contrato.", "sei-pmsp-160252510-edital.pdf", "160252510", "F9D1D2E5"],
    ["2026-06-30", "30/06/2026", "l", "Matriz de riscos", "Anexo do edital: riscos da obra e quem responde por eles.", "documento-consulta-externa-php.pdf"],
    ["2026-06-30", "30/06/2026", "l", "Encaminhamento do edital", "Comissão Permanente de Licitações.", "sei-pmsp-160254728-encaminhamento.pdf", "160254728", "2B4EE6D8"],
    ["2026-06-30", "30/06/2026", "l", "“Nada obsta”: área técnica", "Niwton libera o prosseguimento.", "sei-pmsp-160256126-encaminhamento.pdf", "160256126", "EEAA5B3F"],
    ["2026-06-30", "30/06/2026", "l", "Registro no Compras.gov.br", "Contratação 928657-30/2026, PNCP 05649898000147-1-000029/2026.", "compras-gov-br-fase-interna.pdf"],
    ["2026-07-01", "pub. 01/07/2026", "l", "Aviso de abertura da licitação", "Data, local e objeto da concorrência.", "arquip-dosp-160265181-abertura-np.pdf", "160265181", "18047B7F", "k5LLP1YFSrysy_0uP9F3j75uAKECS8VQREvJ1w7vqi-L7dSs2VwE1F4E1doRdTDurY6vYHEymzY-sgMbpPgle8lURxGHrv3fdRRX8lb_Y41XXWh9XVXFPpy2B6CzkIl-"],
    ["2026-07-02", "02/07/2026", "l", "Aviso no jornal O Estado de S. Paulo", "Caderno de Economia, p. B8.", "cad-b-br-8-estado-economia-paginas-b08-02-07-26.pdf"],
    ["2026-08-11", "11/08/2026", "e", "Progredior: proposta de preço", "Planilha de preços, BDI e cronograma da vencedora.", "progredior-proposta-de-preco.pdf", "", "", "", "8 MB"],
    ["2026-08-11", "11/08/2026", "e", "Progredior: documentos de habilitação", "Contrato social, certidões e balanços.", "ilovepdf-merged-2026-08-14t163522-597.pdf", "", "", "", "21 MB"],
    ["2026-08-11", "11/08/2026", "e", "Progredior: atestados técnicos", "Obras anteriores que comprovam capacidade técnica.", "documento-consulta-externa-5-php.pdf", "", "", "", "14 MB"],
    ["2026-08-11", "11/08/2026", "e", "Progredior: indicação do responsável técnico", "Anexo VII: o engenheiro Guilherme Leme Perazza (CREA-SP 5062442704) fica vinculado à obra.", "progredior-indicacao-responsavel-tecnico.pdf"],
    ["2026-08-11", "11/08/2026", "e", "Stein: proposta de preço", "R$ 1.494.882,58, com o mesmo custo direto da Prefeitura e prazo de 120 dias.", "proposta-de-preco-stein.pdf", "", "", "", "6 MB"],
    ["2026-08-11", "11/08/2026", "e", "Dekton: proposta de preço", "R$ 1.502.407,93, igual ao orçamento da Prefeitura, com prazo de 180 dias.", "proposta-de-preco-dekton.pdf", "", "", "", "5 MB"],
    ["2026-08-11", "11/08/2026", "e", "DPT Engenharia: proposta de preço", "R$ 1.464.895,21, com o mesmo custo direto da Prefeitura, BDI de 17,11% (obras) e 30,20% (projeto) e prazo de 180 dias.", "dtp-engenharia-proposta-de-preco.pdf", "", "", "", "5 MB"],
    ["2026-08-11", "11/08/2026", "e", "S.C. Engenharia: envelope de habilitação", "Documentos de uma das inabilitadas.", "documento-consulta-externa-3-php.pdf", "", "", "", "39 MB"],
    ["2026-08-11", "11/08/2026", "e", "Amaral Engenharia: envelope de habilitação", "Documentos de uma das inabilitadas.", "documento-consulta-externa-4-php.pdf", "", "", "", "5 MB"],
    ["2026-08-12", "12/08/2026", "l", "Ata da 1ª sessão pública (assinada)", "Abertura dos envelopes. Presentes e ocorrências.", "ata-sessao-publica-12082026.pdf"],
    ["2026-08-12", "12/08/2026", "l", "Comunicado com o link do vídeo da 1ª sessão", "youtu.be/XsBawk9-Krc", "sei-pmsp-162951299-comunicado.pdf", "162951299", "BB9AC049"],
    ["2026-08-13", "pub. 13/08/2026", "l", "Ata da 1ª sessão no Diário Oficial", "", "arquip-dosp-162950558-ata-da-licitacao-np.pdf", "162950558", "A704DAE1", "LfIb-JB1VVGwguELeSdYypugLtYDkviDPxW2QbxwetROw2VXke1Gptyxt_Fta5UuRohW94HcRVgJG9nuODN17jy12TqbqzaXOKDynety4mYTLvgfKA5uSnVDWSg-Kfxu"],
    ["2026-08-18", "18/08/2026", "l", "Ata da 2ª sessão (assinada)", "Resultado da habilitação técnica.", "ata-segunda-sessao.pdf"],
    ["2026-08-18", "18/08/2026", "l", "Ata da 2ª sessão (SEI)", "Motivos de cada inabilitação.", "sei-pmsp-163315678-ata-de-reuniao.pdf", "163315678", "B4AA8730"],
    ["2026-08-18", "pub. 19/08/2026", "x", "Pedido de “Espaço Legal” na praça indeferido", "Pedido de uma danceteria para ocupar vaga na Praça Benedito Calixto, nº 167, negado com base em parecer da CET. É outro processo, sem relação com a obra.", "arquip-dosp-158234407-despacho-indeferido.pdf", "158234407", "E6D17117"],
    ["2026-08-19", "pub. 19/08/2026", "l", "Ata da 2ª sessão no Diário Oficial", "", "arquip-dosp-163316093-ata-da-licitacao-np.pdf", "163316093", "98CD9C6E", "SQPwPOef7U7HHaKjPMVUgVnEi_eATwHhxIr4cSuiXCYI8MrbidfBsMrzKH2qsVsPSbcGO7a0fOpkol5Ctz8S-zA2dq71krKSyU_c1R-qNvy65t2rIT3sAddBN-Rbnubh"],
    ["2026-08-26", "26/08/2026", "l", "Ata da 3ª sessão (assinada)", "Propostas, lances e classificação final.", "ata-terceira-sessao-sessao.pdf"],
    ["2026-08-27", "27/08/2026", "l", "Informação com o link do vídeo da 3ª sessão", "youtube.com/watch?v=lEEdOZTc-Mc", "sei-pmsp-163915791-informacao.pdf", "163915791", "A28A5531"],
    ["2026-08-27", "27/08/2026", "l", "Manifestação do agente de contratação", "Recomenda adjudicar à Progredior.", "sei-pmsp-163918195-manifestacao.pdf", "163918195", "F4468009"],
    ["2026-08-27", "27/08/2026", "l", "Minuta do despacho de homologação", "", "sei-pmsp-163924950-minuta.pdf", "163924950", "5C144B0E"],
    ["2026-08-27", "27/08/2026", "c", "Encaminhamento da CAF para a obra", "", "sei-pmsp-163932498-encaminhamento.pdf", "163932498", "64004911"],
    ["2026-08-28", "pub. 28/08/2026", "l", "Ata da 3ª sessão no Diário Oficial", "", "arquip-dosp-163887970-ata-da-licitacao-np.pdf", "163887970", "757895CD", "fvvBGA6LN3KRQtyg2UUlxZPUDDI4jh7P7OAUsKK7cYtlZkasv0mxaKdoPovsY4_ith-Rox5CJYLxmytIy4grxaTLOZhaPEhhTYrPBxf-VzaoEntH2OHDxM2PlrsybaNV"],
    ["2026-08-28", "pub. 28/08/2026", "l", "Despacho de homologação", "O Subprefeito homologa e adjudica à Progredior.", "arquip-dosp-163965930-despacho.pdf", "163965930", "63D9BE7C", "-yswG7plzqAn0Mb_a_UIBHOinBKMVxFsii7Xwz23C-QLm0ehTwryKvtqWoiwfNjMXMg6UBpUk_mbwlGTwIyjuENzYhW2-grHOXNRSJPHNfJk_xBKq2Khb3FFM44NScDP"],
    ["2026-08-28", "pub. 28/08/2026", "l", "Homologação (seção Negócios)", "", "arquip-dosp-163978276-outras-np.pdf", "163978276", "80E26879", "5V7_g4m_D8Tv0Iy8o8DqcCAg86vm_YPQzBaFBrLyyahCt4zy5vrWEsMd-Jwc3B7wGSw3W36nAncLLpnZJnONLZ3kddF0cfVnkvGHnXqq2owwXChzGn_ftlYZSp4W3cHG"],
    ["2026-08-28", "28/08/2026", "l", "Diário Oficial ed. 217, p. 578", "Página impressa com a homologação.", "edicao-217-de-28-agosto-2026-pdf-protegido.pdf"],
    ["2026-08-28", "28/08/2026", "c", "Pedido de celeridade para a ordem de início", "Kenedi Oliveira e Silva (CAF).", "sei-pmsp-164048895-encaminhamento.pdf", "164048895", "077354CD"],
    ["2026-08-28", "28/08/2026", "c", "Nota de empenho 91609/2026", "R$ 1.439.886,76 em três parcelas (out/nov/dez).", "scan-2026-08-28-161236532.pdf"],
    ["2026-08-31", "31/08/2026", "c", "E-mail à Progredior: empenho e seguro-garantia", "", "e-mail-de-smsub-envio-de-nota-de-empenho-e-seguro-garantia-sei-6050-2026-0010848-0.pdf"],
    ["2026-08-31", "31/08/2026", "c", "Encaminhamento para elaborar o contrato", "Seguro-garantia no processo 6050.2026/0016583-1.", "sei-pmsp-164096796-encaminhamento.pdf", "164096796", "E524EF14"],
    ["2026-08-31", "31/08/2026", "c", "Ofício 022/SUB-PI/CAF/2026: pedido do seguro-garantia", "A Supervisão de Finanças pede à Progredior a garantia de 5% (R$ 71.994,34).", "scan-2026-08-28-161909006.pdf"],
    ["2026-08-31", "31/08/2026", "c", "Apólice de seguro-garantia da Pottencial", "R$ 71.994,34, de 01/09/2026 a 30/06/2027. Registro SUSEP 0306920269907751912893000.", "cto-14-sub-pi-26-apolice.pdf"],
    ["2026-08-03", "03/08/2026", "c", "Certidão da SUSEP: administradores da Pottencial", "Quem dirige a seguradora que emitiu a garantia.", "certidao-de-administradores-agosto-2026.pdf"],
    ["2026-08-03", "03/08/2026", "c", "Certidão da SUSEP: licenciamento da Pottencial", "Autorização da seguradora para operar.", "certidao-de-licenciamento-agosto-2026.pdf"],
    ["2026-09-01", "01/09/2026", "c", "Envio da garantia à Secretaria da Fazenda", "Carmen Moreira Bertuccelli (Supervisão de Finanças), processo 6050.2026/0016583-1.", "sei-pmsp-164255120-encaminhamento.pdf", "164255120", "835A50F0"],
    ["2026-09-02", "02/09/2026", "c", "Formulário de caução 0072416/2026", "Recibo da Secretaria da Fazenda para o seguro-garantia.", "72416.pdf"],
    ["2026-09-02", "02/09/2026", "c", "Devolução da Secretaria da Fazenda", "Garantia registrada e documentos devolvidos à Subprefeitura.", "sei-pmsp-164311737-encaminhamento.pdf", "164311737", "1D97773E"],
    ["2026-09-01", "01/09/2026", "c", "Termo de Contrato 014/SUB-PI/2026", "Contrato assinado com a Progredior.", "termo-de-contrato-014-sub-pi-2026-praca-benedito-calixto-construtora-progredior.pdf"],
    ["2026-09-01", "01/09/2026", "c", "Ordem de Início 013/SUB-PI/CPO/STPO/2026", "Início 01/09, término 31/12/2026. Fiscal e suplente.", "ordem-de-inicio.pdf"],
    ["2026-09-01", "01/09/2026", "c", "Ordem de Início (segunda digitalização)", "", "scanned-document.pdf"],
    ["2026-09-04", "pub. 04/09/2026", "c", "Extrato do contrato", "", "arquip-dosp-164428100-extrato-de-contrato-nota-de-empenho-np.pdf", "164428100", "549BC5C1", "zg8xbNT2KFgwtNNtJ5WiMOUESEJ3LU7g7ZyAkaQ9HDNrxcQIk2OYbtVfPYBQSql47eK2jJihyMft9c9XWM3-Dv2vYPpuE6ZvUVG9JLbxkIaRJInKeKo4eEU8C7bCi1Im"],
    ["2026-09-04", "04/09/2026", "c", "Diário Oficial de 04/09/2026, p. 501", "Página impressa com o extrato.", "diario-oficial-edicao-de-04-09-2026-pag-501.pdf"],
    ["2026-09-09", "09/09/2026", "c", "Encaminhamento para ART, responsável técnico e acompanhamento", "", "sei-pmsp-164707979-encaminhamento.pdf", "164707979", "C9F1FA09"],
    ["2026-09-17", "17/09/2026", "b", "Relato do fiscal: bancas nas áreas da obra", "Processo 6050.2026/0017937-9.", "sei-pmsp-165312590-encaminhamento.pdf", "165312590", "9041344F"],
    ["2026-09-17", "17/09/2026", "b", "Parecer jurídico sobre suspensão das TPUs", "", "sei-pmsp-165323457-manifestacao.pdf", "165323457", "8823ED74"],
    ["2026-09-17", "17/09/2026", "b", "Minuta da Portaria 30", "", "sei-pmsp-165331383-minuta.pdf", "165331383", "FF1E42D7"],
    ["2026-09-24", "pub. 24/09/2026", "b", "Portaria 30/SUB-PI/G/2026", "Suspende temporariamente as permissões de uso nas áreas da obra.", "arquip-dosp-165388683-portaria.pdf", "165388683", "B9FA27CC"],
    ["2026-09-29", "29/09/2026", "b", "Portal de Processos: processo das bancas", "O processo 6050.2026/0017937-9, autuado em 17/09/2026, está no Gabinete do Subprefeito.", "portal-de-processos-administrativos.pdf"],
    ["2026-09-30", "30/09/2026", "l", "Portal de Processos: processo principal", "Autuação em 17/06/2026, unidades responsáveis, lista de documentos (dois classificados como restritos) e processos relacionados.", "portal-processo-6050-2026-0010848-0.pdf"],
    ["2026-09-30", "30/09/2026", "l", "Decisões e publicações do processo principal", "Lista do Portal de Processos com cada despacho e sua data de publicação.", "rptdecisoes.pdf"],
    ["2026-09-30", "30/09/2026", "c", "Portal de Processos: processo da garantia", "Processo 6050.2026/0016583-1, “Garantias depositadas a título de caução”, autuado em 28/08/2026.", "portal-processo-6050-2026-0016583-1.pdf"],
  ];

  const byFile = Object.fromEntries(DOCS.map((d) => [d[5], d]));

  /* ---------------- Timeline render ---------------- */
  const parseBR = (s) => { const [d, m, y] = s.split("/").map(Number); return new Date(y, m - 1, d); };
  const tlDoc = ([l, h]) => {
    if (h.startsWith("http")) return `<li class="tl__doc"><a href="${h}" target="_blank" rel="noopener">${esc(l)} ↗</a></li>`;
    const [, , , title, , , sei, , doKey, size] = byFile[h] || [];
    const meta = [`<a href="docs/${h}">PDF${size ? " · " + size : ""}</a>`, sei && `SEI ${sei}`,
      doKey && `<a href="${DO}${doKey}" target="_blank" rel="noopener">Diário Oficial ↗</a>`].filter(Boolean).join(" · ");
    return `<li class="tl__doc"><strong>${esc(title || l)}</strong><span>${meta}</span></li>`;
  };
  // Newest first: phases in reverse order, each keeping its header on top of its own reversed items.
  const phases = [];
  TL.forEach((e) => (e.phase ? phases.push([e]) : phases.at(-1).push(e)));
  const tlNewest = phases.reverse().flatMap(([head, ...items]) => [head, ...items.reverse()]);
  $("#timeline").innerHTML = tlNewest.map((e) => {
    if (e.phase) return `<li class="tl__phase">${e.phase}</li>`;
    if (e.today) return `<li class="tl tl--today"><div class="tl__date">${now.toLocaleDateString("pt-BR")}</div><div class="tl__title">Hoje</div><p class="tl__text">Os documentos públicos analisados vão até 30/09/2026.</p></li>`;
    const future = e.future && parseBR(e.d) > now;
    const docs = (e.docs || []).map(tlDoc).join("");
    return `<li class="tl ${e.key ? "tl--key" : ""} ${future ? "tl--future" : ""}">
      <div class="tl__date">${e.d}</div><div class="tl__title">${esc(e.t)}</div><p class="tl__text">${esc(e.x)}</p>${docs ? `<ul class="tl__docs">${docs}</ul>` : ""}</li>`;
  }).join("");
  const tlMore = $("#tl-more"), tlRows = [...$("#timeline").children], TL_PAGE = 10;
  const tlTotal = tlRows.filter((li) => li.matches(".tl")).length;
  let tlShown = 0;
  const showTl = () => {
    tlShown = Math.min(tlTotal, tlShown ? tlShown + TL_PAGE : 5);
    let n = 0;
    // A phase header sits right before its first item, so it shows exactly when that item does.
    tlRows.forEach((li) => { li.hidden = n >= tlShown; if (li.matches(".tl")) n++; });
    const left = tlTotal - tlShown;
    if (!left) return tlMore.remove();
    tlMore.textContent = `Ver mais ${Math.min(TL_PAGE, left)} etapas anteriores`;
  };
  tlMore.addEventListener("click", showTl);
  showTl();

  /* ---------------- Document search (⌘K) ---------------- */
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  document.querySelectorAll(".kbd-mod").forEach((k) => (k.textContent = isMac ? "⌘K" : "Ctrl K"));
  const docsLead = $("#docs-lead");
  docsLead.innerHTML = docsLead.innerHTML.replace(/Os \d+ documentos/, `Os ${DOCS.length} documentos`);
  $("#doc-cats").innerHTML = Object.entries(C).map(([k, l]) =>
    `<button type="button" data-cmdk data-c="${k}">${l} <span>${DOCS.filter((d) => d[2] === k).length}</span></button>`).join("");

  const cmdk = $("#cmdk"), cInput = $("#cmdk-input"), cList = $("#cmdk-list"), cChips = $("#cmdk-chips"), cCount = $("#cmdk-count");
  let cCat = "", cRows = [], cActive = -1;
  cChips.innerHTML = [["", "Todos"], ...Object.entries(C)].map(([k, l]) => `<button type="button" data-c="${k}">${l}</button>`).join("");
  const setActive = (i, scroll = true) => {
    cActive = Math.max(-1, Math.min(cRows.length - 1, i));
    cList.querySelectorAll(".cmdk__item").forEach((li, j) => li.setAttribute("aria-selected", String(j === cActive)));
    const li = cList.children[cActive];
    cInput.setAttribute("aria-activedescendant", li?.id || "");
    if (scroll) li?.scrollIntoView({ block: "nearest" });
  };
  const cRender = () => {
    const q = norm(cInput.value.trim());
    cChips.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === cCat)));
    cRows = DOCS
      .filter((d) => (!cCat || d[2] === cCat) && (!q || norm(d.slice(1, 9).join(" ") + " " + C[d[2]]).includes(q)))
      .sort((a, b) => b[0].localeCompare(a[0]));
    cCount.textContent = `${cRows.length} de ${DOCS.length}`;
    cList.innerHTML = cRows.map(([, dd, c, t, desc, file, sei, crc, doKey, size], i) => `
      <li class="cmdk__item" id="cmdk-${i}" role="option" aria-selected="false" data-i="${i}">
        <a class="cmdk__main" href="docs/${file}" tabindex="-1">
          <span class="cmdk__meta">${dd} · ${C[c]}</span>
          <span class="cmdk__title">${esc(t)}</span>
          ${desc ? `<span class="cmdk__desc">${esc(desc)}</span>` : ""}
          ${sei ? `<span class="cmdk__meta">SEI ${sei} · CRC ${crc}</span>` : ""}
        </a>
        <span class="cmdk__links">
          <a href="docs/${file}" tabindex="-1">PDF${size ? " · " + size : ""}</a>
          ${doKey ? `<a href="${DO}${doKey}" target="_blank" rel="noopener" tabindex="-1">Diário Oficial ↗</a>` : ""}
        </span>
      </li>`).join("") || `<li class="cmdk__empty">Nenhum documento encontrado.</li>`;
    setActive(-1, false);
    cList.scrollTop = 0;
  };
  const openCmdk = (c = "") => {
    cCat = c;
    cInput.value = "";
    cRender();
    if (!cmdk.open) cmdk.showModal();
    cInput.focus();
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-cmdk]");
    if (t) openCmdk(t.dataset.c || "");
    if (e.target.closest("[data-cmdk-close]") || e.target === cmdk) cmdk.close();
  });
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !zoom.open) {
      e.preventDefault();
      cmdk.open ? cmdk.close() : openCmdk();
    } else if (e.key === "/" && !typing && !zoom.open) {
      e.preventDefault();
      openCmdk();
    }
  });
  cInput.addEventListener("input", cRender);
  cInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive(cActive + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" && cRows.length) {
      e.preventDefault();
      cList.children[Math.max(0, cActive)].querySelector(".cmdk__main").click();
    }
  });
  cChips.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    cCat = b.dataset.c;
    cRender();
    cInput.focus();
  });
  cList.addEventListener("mouseleave", () => setActive(-1, false));
  cList.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".cmdk__item");
    if (li && +li.dataset.i !== cActive) setActive(+li.dataset.i, false);
  });

  /* ---------------- Reveal + active nav ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el === wall) wall.classList.add("is-in");
      el.querySelectorAll?.("[data-h]").forEach((b) => (b.style.height = b.dataset.h + "%"));
      el.querySelectorAll?.("[data-w]").forEach((b) => (b.style.width = b.dataset.w + "%"));
      io.unobserve(el);
    });
  }, { threshold: 0.25 });
  [wall, $("#months"), $("#bids")].forEach((el) => io.observe(el));

  const links = [...document.querySelectorAll(".toc a")];
  const tocBar = $(".toc__inner");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => {
        const on = a.getAttribute("href") === "#" + en.target.id;
        a.classList.toggle("is-active", on);
        // scrollIntoView would also scroll the page and fight the user's own scrolling.
        if (on) tocBar.scrollTo({ left: a.offsetLeft - (tocBar.clientWidth - a.offsetWidth) / 2, behavior: "smooth" });
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));

  const toTop = $(".to-top");
  new IntersectionObserver(([en]) => toTop.classList.toggle("is-on", !en.isIntersecting)).observe($(".hero"));

  /* ---------------- Abbreviations ---------------- */
  const ABBR = {
    BDI: "Benefícios e Despesas Indiretas: margem que cobre administração central, impostos e lucro da empresa",
    SEI: "Sistema Eletrônico de Informações, onde tramitam os processos da Prefeitura",
    CRC: "Código verificador impresso no rodapé de cada documento SEI, usado para autenticá-lo",
    PNCP: "Portal Nacional de Contratações Públicas",
    CAF: "Coordenadoria de Administração e Finanças da Subprefeitura",
    ETP: "Estudo Técnico Preliminar",
    TR: "Termo de Referência",
    TPU: "Termo de Permissão de Uso: autorização para bancas e barracas ocuparem o espaço público",
    CPM: "Conselho Participativo Municipal",
    AMJA: "Associação Amigos da Joaquim Antunes",
    EDIF: "Tabela de custos de edificações da Prefeitura (SIURB)",
    INFRA: "Tabela de custos de infraestrutura da Prefeitura (SIURB)",
    CREA: "Conselho Regional de Engenharia e Agronomia, onde engenheiros são registrados",
    SUSEP: "Superintendência de Seguros Privados, que autoriza e fiscaliza as seguradoras",
    DIPED: "Divisão de Pagamentos Especiais, Devoluções e Custódia de Cauções, da Secretaria da Fazenda",
  };
  const abbrRe = new RegExp(`\\b(${Object.keys(ABBR).join("|")})s?\\b`, "g");
  const texts = document.createTreeWalker($("main"), NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.parentElement.closest("a, button, abbr, [role=img]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const hits = [];
  while (texts.nextNode()) if (texts.currentNode.data.match(abbrRe)) hits.push(texts.currentNode);
  hits.forEach((n) => {
    const t = document.createElement("template");
    t.innerHTML = esc(n.data).replace(abbrRe, (m, k) => `<abbr title="${ABBR[k]}">${m}</abbr>`);
    n.replaceWith(t.content);
  });

  /* ---------------- Zoom viewer (plan + photos) ---------------- */
  const zoom = $("#zoom"), stage = $("#zoom-stage"), zImg = $("#zoom-img"), zLevel = $("#zoom-level");
  const zTitle = $("#zoom-title"), zCount = $("#zoom-count"), zHelp = $("#zoom-help");
  let ZW = 1, ZH = 1, s = 1, x = 0, y = 0, fit = 1, maxS = 1, items = [], cur = 0;

  const zApply = () => {
    const vw = stage.clientWidth, vh = stage.clientHeight, w = ZW * s, h = ZH * s;
    x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, x));
    y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, y));
    zImg.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    zLevel.textContent = Math.round((s / fit) * 100) + "%";
  };
  const zoomAt = (ns, cx = stage.clientWidth / 2, cy = stage.clientHeight / 2) => {
    ns = Math.min(maxS, Math.max(fit, ns));
    x = cx - ((cx - x) * ns) / s;
    y = cy - ((cy - y) * ns) / s;
    s = ns;
    zApply();
  };
  const animated = (fn) => {
    stage.classList.add("is-animating");
    fn();
    setTimeout(() => stage.classList.remove("is-animating"), 260);
  };
  const measure = () => {
    fit = Math.min(stage.clientWidth / ZW, stage.clientHeight / ZH);
    maxS = Math.max(1, fit * 2);
  };
  const zFit = () => {
    measure();
    s = fit;
    zApply();
  };

  const show = (i) => {
    cur = (i + items.length) % items.length;
    const a = items[cur], img = a.querySelector("img");
    ZW = +a.dataset.w || img.width;
    ZH = +a.dataset.h || img.height;
    zImg.style.width = ZW + "px";
    zImg.style.height = ZH + "px";
    zImg.alt = img.alt;
    zImg.src = img.currentSrc || img.src;
    const hiSrc = a.getAttribute("href");
    if (!zImg.src.endsWith(hiSrc)) {
      const hi = new Image();
      hi.onload = () => items[cur] === a && (zImg.src = hi.src);
      hi.src = hiSrc;
    }
    zTitle.textContent = a.dataset.title || a.closest("figure").querySelector("figcaption").textContent;
    zCount.textContent = items.length > 1 ? `${cur + 1} / ${items.length}` : "";
    zFit();
  };
  const step = (d) => items.length > 1 && show(cur + d);

  document.querySelectorAll("[data-zoom]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    items = [...document.querySelectorAll(`[data-zoom="${a.dataset.zoom}"]`)];
    const multi = items.length > 1;
    zoom.classList.toggle("is-light", "light" in a.dataset);
    zoom.classList.toggle("is-multi", multi);
    zHelp.textContent = multi
      ? "Setas ou arraste para trocar de foto · duplo clique para aproximar"
      : "Arraste para mover · roda do mouse ou pinça para zoom · duplo clique para aproximar";
    zoom.showModal();
    show(items.indexOf(a));
  }));
  addEventListener("resize", () => {
    if (!zoom.open) return;
    const wasFit = s === fit;
    measure();
    wasFit ? zFit() : zoomAt(s);
  });

  zoom.addEventListener("click", (e) => {
    const b = e.target.closest("[data-z]");
    if (!b) return;
    const k = b.dataset.z;
    if (k === "close") zoom.close();
    else if (k === "prev" || k === "next") step(k === "next" ? 1 : -1);
    else animated(() => (k === "fit" ? zFit() : zoomAt(s * (k === "in" ? 1.6 : 1 / 1.6))));
  });
  zoom.addEventListener("keydown", (e) => {
    const atFit = s === fit;
    if (e.key === "+" || e.key === "=") animated(() => zoomAt(s * 1.6));
    else if (e.key === "-") animated(() => zoomAt(s / 1.6));
    else if (e.key === "0") animated(zFit);
    else if (atFit && items.length > 1 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) step(e.key === "ArrowRight" ? 1 : -1);
    else if (e.key.startsWith("Arrow")) {
      const d = 80;
      x += e.key === "ArrowLeft" ? d : e.key === "ArrowRight" ? -d : 0;
      y += e.key === "ArrowUp" ? d : e.key === "ArrowDown" ? -d : 0;
      animated(zApply);
    } else return;
    e.preventDefault();
  });

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // Pointer events cover mouse drag, one-finger pan, two-finger pinch and double tap.
  const pts = new Map();
  let lastTap = 0, moved = 0, lastType = "mouse", startX = 0, startS = 1;
  const pinch = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    lastType = e.pointerType;
    const r = stage.getBoundingClientRect();
    pts.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    if (pts.size === 1) { moved = 0; startX = e.clientX; startS = s; }
    stage.classList.add("is-dragging");
  });
  stage.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const r = stage.getBoundingClientRect();
    const nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (pts.size === 1) {
      x += nx - p.x;
      y += ny - p.y;
      moved += Math.abs(nx - p.x) + Math.abs(ny - p.y);
      p.x = nx; p.y = ny;
      zApply();
    } else if (pts.size === 2) {
      const before = pinch();
      p.x = nx; p.y = ny;
      const after = pinch();
      x += after.cx - before.cx;
      y += after.cy - before.cy;
      zoomAt(s * (after.d / before.d), after.cx, after.cy);
      moved = Infinity;
    }
  });
  const release = (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    pts.delete(e.pointerId);
    if (!pts.size) stage.classList.remove("is-dragging");
    if (e.type !== "pointerup" || pts.size) return;
    const dx = e.clientX - startX;
    if (startS === fit && s === fit && moved !== Infinity && Math.abs(dx) > 60) return step(dx < 0 ? 1 : -1);
    if (e.pointerType === "mouse" || moved > 8) return;
    const t = performance.now();
    if (t - lastTap < 320) {
      toggleZoom(p.x, p.y);
      lastTap = 0;
    } else lastTap = t;
  };
  const toggleZoom = (cx, cy) => animated(() => (s > fit * 1.5 ? zFit() : zoomAt(s * 3, cx, cy)));
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("dblclick", (e) => {
    if (lastType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    toggleZoom(e.clientX - r.left, e.clientY - r.top);
  });
})();
