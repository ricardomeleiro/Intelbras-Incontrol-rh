const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const https   = require('https');

const app = express();
app.use(express.json());
app.use(cors());

const agent = new https.Agent({ rejectUnauthorized: false });
const INCONTROL_URL = process.env.INCONTROL_URL || 'https://192.168.5.99:4441';

function apiHeaders(token) {
  return {
    'Authorization': `JWT ${token}`,
    'Accept': 'application/json, text/plain, */*',
  };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  try {
    const resp = await axios.post(
      `${INCONTROL_URL}/v1/auth/`,
      { username, password },
      { httpsAgent: agent, timeout: 8000 }
    );
    const token = resp.data?.token;
    if (!token) return res.status(401).json({ error: 'Credenciais inválidas.' });
    console.log(`[login] ✓ ${username}`);
    return res.json({ token });
  } catch (err) {
    const status = err.response?.status || 502;
    if (status === 401 || status === 403)
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    return res.status(status).json({ error: `Erro ao conectar ao InControl (${status}).` });
  }
});

// ── PESSOAS (autocomplete via eventos) ───────────────────────────────────────
app.get('/api/pessoas', async (req, res) => {
  const { token, nome } = req.query;
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  if (!nome)  return res.json([]);
  try {
    const resp = await axios.get(`${INCONTROL_URL}/v1/evento`, {
      headers: apiHeaders(token),
      params: { page: 1, limit: 50, pessoa_nome: nome },
      httpsAgent: agent,
      timeout: 10000,
    });
    const lista = resp.data?.data || [];
    const map = new Map();
    for (const ev of lista) {
      if (!map.has(ev.pessoa_id)) {
        map.set(ev.pessoa_id, {
          id:           ev.pessoa_id,
          nome:         ev.pessoa_nome || ev.nome_usuario,
          departamento: ev.departamento || '',
        });
      }
    }
    return res.json(Array.from(map.values()));
  } catch (err) {
    console.error(`[pessoas] erro ${err.response?.status}`);
    return res.status(err.response?.status || 502).json({ error: 'Erro ao buscar pessoas.' });
  }
});

// ── EQUIPAMENTOS ──────────────────────────────────────────────────────────────
app.get('/api/equipamentos', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  try {
    const resp = await axios.get(`${INCONTROL_URL}/v1/ponto_acesso`, {
      headers: apiHeaders(token),
      params: { exibir_na_botoeira: true, id_operador_logado: 1 },
      httpsAgent: agent,
      timeout: 10000,
    });
    const lista = resp.data?.data || [];
    // Devolve id, nome_completo (para exibição) e ponto_acesso_nome (para filtro da API)
    const normalizado = lista.map(e => ({
      id:               e.id,
      nome:             `${e.dispositivo?.nome || ''} — ${e.nome_porta || ''}`.replace(/^—\s*/, '').trim(),
      ponto_acesso_nome: e.nome_porta || e.nome || '',   // nome exato que a API aceita no filtro
    }));
    console.log(`[equipamentos] ✓ ${normalizado.length} pontos de acesso`);
    return res.json(normalizado);
  } catch (err) {
    console.error(`[equipamentos] erro ${err.response?.status}`);
    return res.status(err.response?.status || 502).json({ error: 'Erro ao buscar equipamentos.' });
  }
});

// ── REGISTROS ─────────────────────────────────────────────────────────────────
// Filtros confirmados via HAR:
//   pessoa_nome=Ricardo
//   ponto_acesso_nome=Catraca Entrada-1          ← nome do ponto, não ID
//   data_evento__0__operation=gte
//   data_evento__0__value=<timestamp_ms_inicio>
//   data_evento__1__operation=lt
//   data_evento__1__value=<timestamp_ms_fim>
app.get('/api/registros', async (req, res) => {
  const { token, pessoaNome, dataInicio, dataFim, pontoAcessoNome } = req.query;
  if (!token) return res.status(401).json({ error: 'Token ausente.' });

  try {
    const params = { page: 1, limit: 200 };

    if (pessoaNome)     params.pessoa_nome = pessoaNome;
    if (pontoAcessoNome) params.ponto_acesso_nome = pontoAcessoNome;

    if (dataInicio) {
      params['data_evento__0__operation'] = 'gte';
      params['data_evento__0__value']     = new Date(dataInicio + 'T00:00:00').getTime();
    }
    if (dataFim) {
      params['data_evento__1__operation'] = 'lt';
      params['data_evento__1__value']     = new Date(dataFim + 'T23:59:59').getTime();
    }

    console.log(`[registros] params:`, JSON.stringify(params));

    const resp = await axios.get(`${INCONTROL_URL}/v1/evento`, {
      headers: apiHeaders(token),
      params,
      httpsAgent: agent,
      timeout: 15000,
    });

    const lista = resp.data?.data || [];
    const total = resp.data?.total_count || lista.length;
    console.log(`[registros] ✓ ${lista.length} de ${total}`);

    return res.json({
      total,
      data: lista.map(ev => ({
        id:           ev.id,
        dataHora:     ev.data_evento,
        pessoa:       ev.pessoa_nome || ev.nome_usuario,
        departamento: ev.departamento || '',
        equipamento:  ev.ponto_acesso_nome || ev.nome_ponto_de_acesso,
        sentido:      ev.sentido_acesso,
        status:       ev.status,
        detalhe:      ev.detalhe,
        credencial:   ev.tipo_credencial,
      })),
    });
  } catch (err) {
    const status = err.response?.status || 502;
    const detail = JSON.stringify(err.response?.data)?.slice(0, 300);
    console.error(`[registros] erro ${status}:`, detail);
    return res.status(status).json({ error: `Erro ao buscar registros (${status}).`, debug: detail });
  }
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT} → ${INCONTROL_URL}`));
