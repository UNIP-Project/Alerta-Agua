# Documento Técnico do Projeto: Sistema de Registro e Monitoramento de Ocorrências de Alagamento

## 1. Introdução

Este projeto consiste em uma aplicação web desenvolvida com foco na coleta, visualização e acompanhamento de registros de alagamentos, enchentes e vias inundadas em diferentes localidades. O sistema foi concebido como uma solução de apoio à comunidade urbana, permitindo que usuários reportem eventos de risco hidroambiental e validem a ocorrência por meio de confirmações colaborativas.

O principal objetivo da aplicação é possibilitar a identificação de áreas com maior vulnerabilidade à inundação, oferecendo uma base de dados georreferenciada e um mecanismo de classificação do estado da ocorrência em função do tempo e da interação da comunidade.

A solução foi implementada em formato de MVP, com suporte tanto a persistência em banco de dados relacional via Supabase quanto a operação em ambiente local para fins de demonstração e testes.

---

## 2. Objetivo do Sistema

O sistema busca atender à necessidade de registrar ocorrências geolocalizadas relacionadas a eventos de inundação, com foco em:

- localização do problema;
- classificação do tipo de evento;
- avaliação de gravidade;
- confirmação por parte da comunidade;
- acompanhamento do estado da ocorrência ao longo do tempo.

Dessa forma, o sistema não apenas coleta dados, mas também organiza informações de forma a auxiliá-la na análise de padrões e na percepção de risco em áreas específicas.

---

## 3. Justificativa e Contextualização

Em contextos urbanos, especialmente em regiões sujeitas a chuvas intensas, a ausência de informações atualizadas sobre pontos críticos pode comprometer a mobilidade, a segurança pública e a adoção de medidas preventivas. O projeto propõe uma abordagem participativa e geolocalizada para o mapeamento dessas ocorrências, permitindo a consolidação de dados em uma base compartilhada.

A solução combina aspectos de geolocalização, dados públicos e colaboração social, oferecendo uma plataforma que pode servir como base para estudos, alertas comunitários e ações de monitoramento local.

---

## 4. Tecnologias Utilizadas

A aplicação foi desenvolvida empregando uma stack moderna e modular, composta por:

- React 19;
- TypeScript;
- Vite;
- TanStack Router;
- TanStack Query;
- Tailwind CSS;
- Supabase;
- Leaflet;
- Recharts;
- Vitest;
- shadcn/ui.

Essas tecnologias foram escolhidas para garantir produtividade no desenvolvimento, modularidade da interface, suporte ao gerenciamento de estado e capacidade de integração com serviços externos de persistência e autenticação.

---

## 5. Arquitetura do Sistema

A arquitetura do projeto pode ser compreendida em quatro camadas principais:

1. Camada de apresentação: interfaces e rotas da aplicação;
2. Camada de domínio: tipos, regras de negócio e validações;
3. Camada de serviços: acesso a dados e lógica de persistência;
4. Camada de infraestrutura: banco de dados Supabase e armazenamento local alternativo.

A lógica principal está concentrada em arquivos como:

- `src/services/occurrences.ts` – acesso e manipulação dos dados de ocorrências;
- `src/lib/lifecycle.ts` – cálculo do status da ocorrência;
- `src/lib/supabase.ts` – configuração do cliente do Supabase;
- `src/types/occurrence.ts` – definição dos tipos de domínio.

---

## 6. Estrutura do Projeto

A organização do projeto é a seguinte:

```bash
src/
├── components/
│   ├── layout/
│   ├── map/
│   ├── occurrence/
│   └── ui/
├── hooks/
├── lib/
│   ├── lifecycle.ts
│   ├── supabase.ts
│   └── ...
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── cadastro.tsx
│   ├── registrar.tsx
│   ├── perfil.tsx
│   ├── seguranca.tsx
│   ├── sobre.tsx
│   └── ...
├── services/
│   └── occurrences.ts
├── test/
├── types/
│   └── occurrence.ts
├── router.tsx
├── server.ts
├── start.ts
├── styles.css
└── routeTree.gen.ts
```

### 6.1. Componentes da estrutura

#### `components/`
Contém blocos de interface reutilizáveis, como cabeçalhos, cards, formulários, mapas e elementos visuais padronizados.

#### `routes/`
Armazena as páginas da aplicação. O roteamento é baseado em arquivos, seguindo a convenção do TanStack Router.

#### `services/`
Responsável pela interação com a camada de dados. É o módulo que decide se a aplicação fará uso do Supabase ou do armazenamento local.

#### `lib/`
Agrupa utilitários e regras de negócio, especialmente o cálculo de status, a geocodificação e a configuração do cliente de conexão com o banco.

#### `types/`
Define as estruturas de dados do domínio, padronizando os tipos usados na aplicação.

### 6.2. Módulos relevantes da funcionalidade geográfica

Dentre os módulos adicionados, destacam-se:

- `src/lib/geocode.ts`: serviço de geocodificação baseado em Nominatim;
- `src/routes/registrar.tsx`: formulário de cadastro com busca por endereço e atualização do mapa;
- `src/components/map/MapView.tsx`: renderização do mapa e do marcador geográfico.

Esses módulos permitem a integração direta entre o input textual e o posicionamento espacial do relato no mapa.

---

## 7. Modelagem de Dados

A persistência do sistema foi modelada em duas entidades principais:

1. `occurrences` – registros de ocorrência;
2. `confirmations` – registros de confirmação associada a uma ocorrência.

### 7.1. Tabela `occurrences`

A tabela `occurrences` armazena os dados do relato reportado pela comunidade. Cada linha representa uma ocorrência georreferenciada e classificada conforme tipo e severidade.

Os principais campos são:

- `id`: identificador único da ocorrência;
- `user_id`: identificador do usuário que criou o registro;
- `titulo`: título do relato;
- `descricao`: descrição detalhada da situação;
- `tipo`: categoria da ocorrência;
- `gravidade`: nível de severidade;
- `endereco`: endereço ou referência geográfica;
- `latitude`: coordenada de latitude;
- `longitude`: coordenada de longitude;
- `autor`: autor do relato;
- `photos`: lista de fotos associadas;
- `is_demo`: indicador de dado de demonstração;
- `created_at`: data de criação;
- `updated_at`: data da última atualização.

### 7.2. Tabela `confirmations`

A tabela `confirmations` registra a validação da ocorrência pela comunidade. Ela permite que cada relato seja confirmado ou normalizado com base em evidências ou observações locais.

Os principais campos são:

- `id`: identificador único da confirmação;
- `occurrence_id`: referência à ocorrência relacionada;
- `kind`: tipo de confirmação;
- `created_at`: timestamp da confirmação.

### 7.3. Tipos de domínio do sistema

No arquivo `src/types/occurrence.ts`, os tipos definidos para o sistema são:

- `OccurrenceType`: `alagamento | enchente | via_inundada | outro`;
- `Severity`: `baixo | moderado | alto`;
- `ConfirmationKind`: `ativa | normalizada`.

Esses valores demonstram uma estrutura de classificação funcional e coerente com o propósito do sistema.

---

## 8. Relacionamentos e Integridade Referencial

A modelagem estabelece uma relação entre usuários e ocorrências, além de uma relação entre ocorrências e confirmações.

A estrutura de relacionamento é a seguinte:

- `auth.users` → `occurrences` : um usuário pode criar várias ocorrências;
- `occurrences` → `confirmations` : uma ocorrência pode receber múltiplas confirmações.

As chaves estrangeiras são implementadas da seguinte forma:

- `user_id uuid references auth.users(id)`;
- `occurrence_id uuid references occurrences(id)`.

A política `on delete cascade` assegura que, ao excluir uma ocorrência, as confirmações vinculadas também sejam removidas, preservando a consistência referencial do banco.

---

## 9. Segurança e Políticas de Acesso

O código define políticas de Row Level Security (RLS) para as tabelas de ocorrências e confirmações. A leitura é pública; a inserção de ocorrências continua permitida pelo esquema, enquanto confirmações exigem usuário autenticado e ficam bloqueadas após a janela de vida do relato.

As políticas incluem:

- leitura pública de ocorrências;
- inserção pública de ocorrências;
- leitura pública de confirmações;
- inserção autenticada de confirmações somente enquanto o relato estiver dentro do prazo.

As regras de expiração são impostas tanto na interface quanto na política de inserção de confirmações do banco.

---

## 10. Lógica de Negócio e Cálculo de Status

A lógica de status do sistema está encapsulada em `src/lib/lifecycle.ts`. Confirmações de “ainda existe” mantêm o relato ativo por 6 horas para gravidade baixa (atenção), 12 horas para moderada e 24 horas para alta (grave). Após esse prazo, o relato fica normalizado por 12 horas e, então, expira e deixa de aparecer no mapa. Uma confirmação explícita de normalização também permanece visível por 12 horas antes de expirar. Relatos sem confirmação expiram 12 horas após a criação.

A função `computeStatus` usa a confirmação mais recente e o horário da ocorrência para calcular `pendente`, `ativa`, `normalizada` ou `expirada`. A transição é recalculada quando chega o horário previsto e quando o usuário retorna à aba. O banco também deve bloquear novas confirmações após o encerramento: aplique `supabase/migrations/20261111010000_confirmation_lifecycle.sql` no SQL Editor do Supabase. O `schema.sql` contém a mesma política para novas instalações.

Os estados possíveis são:

- `pendente`;
- `ativa`;
- `normalizada`;
- `expirada`.

A ocorrência usa a confirmação mais recente para definir seu estado. Uma nova confirmação de “ainda existe” durante a janela normalizada reativa o relato e reinicia o prazo conforme a gravidade.

No mapa, os relatos normalizados aparecem em verde durante as 12 horas de visibilidade restantes. Os expirados são removidos do mapa, e a tela de detalhes desativa confirmações.

---

## 11. Fluxo de Operação da Aplicação

### 11.1. Cadastro de ocorrência

O usuário pode registrar uma nova ocorrência informando os dados essenciais:

- título;
- descrição;
- tipo;
- gravidade;
- endereço;
- coordenadas geográficas;
- fotos opcionais.

Esse conjunto de informações permite a criação de um registro com contexto suficiente para análise e mapeamento geográfico.

### 11.2. Confirmação comunitária

Além do relato principal, o sistema permite que terceiros validem a ocorrência por meio de confirmações. Os tipos de confirmação disponíveis são:

- `ativa` – a ocorrência ainda representa um problema real e relevante;
- `normalizada` – a ocorrência foi resolvida ou não mais configura risco.

A lógica de status foi ajustada para que a confirmação de normalização não seja automaticamente ignorada quando houver outra validação ativa. Em termos práticos, o relato é considerado normalizado somente quando a comunidade confirma a resolução em número superior ao de confirmações de que ainda existe. Isso garante que a sinalização visual do mapa reflita o consenso da comunidade e não seja alterada por uma única resposta isolada.

### 11.3. Integração endereço + mapa

A funcionalidade de cadastro foi ampliada com a integração entre campo de endereço e localização geográfica. O usuário pode digitar o nome do local ou endereço e receber sugestões de locais georreferenciados. Ao selecionar uma sugestão, o sistema preenche automaticamente:

- o campo de endereço;
- a latitude;
- a longitude;
- o marcador no mapa.

Essa integração melhora a precisão do cadastro, reduz erros de geolocalização e torna o processo de reportar ocorrências mais eficiente. A localização também pode ser ajustada manualmente no mapa, permitindo correções quando necessário.

### 11.4. Consulta e visualização

A aplicação lê os dados do banco ou do armazenamento local e os apresenta em interface amigável. Esse processo inclui a composição de cards, estatísticas e indicadores de situação, apoiando a leitura e a análise dos dados pelos usuários. O mapa utiliza diferentes cores para distinguir visualmente ocorrências ativas, normalizadas e expirada, de modo que a situação seja intuitiva para o usuário.

---

## 12. Persistência de Dados e Estratégia de Desenvolvimento

O projeto foi concebido para operar em dois modos distintos:

1. modo com Supabase configurado;
2. modo de demonstração local.

No arquivo `src/services/occurrences.ts`, a aplicação verifica automaticamente a presença das variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Caso estas estejam configuradas, o sistema usa o Supabase como camada de persistência. Se não estiverem, o sistema recorre ao `localStorage` com dados demonstrativos.

Essa abordagem é particularmente útil para desenvolvimento iterativo, testes e apresentação de prova de conceito, sem necessidade de infraestrutura completa em todas as etapas.

---

## 13. Benefícios da Solução

A solução oferece diversos benefícios:

- centralização de relatos geolocalizados;
- suporte à participação colaborativa da comunidade;
- visualização clara de risco e gravidade;
- classificação dinâmica do estado da ocorrência;
- integração com infraestruturas modernas de persistência de dados;
- possibilidade de expansão para análises mais robustas, dashboards e automações.

---

## 14. Limitações e Pontos de Melhoria

Apesar da funcionalidade implementada, a solução ainda se encontra em estágio inicial e apresenta limitações naturais de um MVP:

- políticas públicas de acesso que exigem refinamento para produção;
- ausência de autenticação forte para controle de usuários;
- necessidade de regras de validação mais rígidas para mitigar registros duplicados ou falsos;
- possibilidade de ampliar a análise espacial com mapas mais sofisticados e filtros geográficos;
- necessidade de moderação de conteúdo e padronização de relatos para garantir qualidade dos dados.

---

## 15. Perspectivas de Evolução

O projeto pode ser expandido em diversas frentes, incluindo:

- autenticação e autorização por perfil de usuário;
- painel administrativo para moderação de ocorrências;
- notificação em tempo real;
- análise estatística por bairro, região e período;
- integração com APIs de clima e alertas meteorológicos;
- suporte a geolocalização mais precisa e mapas interativos avançados;
- histórico de status e evolução do evento ao longo do tempo.

Essas evoluções tornam o sistema mais robusto e mais adequado para uso em contextos reais de gestão urbana e prevenção de riscos.

---

## 16. Considerações Finais

O projeto apresentado constitui uma solução tecnológica de monitoramento colaborativo de ocorrências relacionadas a alagamentos e enchentes. Sua estrutura combina uso de banco de dados relacional, arquitetura modular em frontend, lógica de negócio aplicada à validação comunitária, geocodificação de endereço e persistência acessível em ambiente de desenvolvimento e produção.

A proposta demonstra aplicabilidade prática em cenários urbanos, especialmente em regiões afetadas por chuvas intensas e problemas recorrentes de infraestrutura. A combinação entre coleta de dados, georreferenciamento, validação colaborativa e interpretação visual do estado do problema torna a solução relevante como ferramenta de apoio à gestão de riscos e à tomada de decisão comunitária.

A funcionalidade de geocodificação integra endereço e mapa, permitindo que o usuário registre o local com maior precisão e reduza erros de posicionamento. A lógica do status comunica de forma clara se a ocorrência ainda é um problema ou se a comunidade já a considera normalizada, reforçando a utilidade da plataforma como apoio à percepção de risco urbano.

---

## 17. Referências Internas do Projeto

- [supabase/schema.sql](supabase/schema.sql)
- [src/services/occurrences.ts](src/services/occurrences.ts)
- [src/lib/lifecycle.ts](src/lib/lifecycle.ts)
- [src/lib/geocode.ts](src/lib/geocode.ts)
- [src/lib/supabase.ts](src/lib/supabase.ts)
- [src/types/occurrence.ts](src/types/occurrence.ts)
- [src/routes/registrar.tsx](src/routes/registrar.tsx)
- [src/components/map/MapView.tsx](src/components/map/MapView.tsx)
- [README.md](README.md)
