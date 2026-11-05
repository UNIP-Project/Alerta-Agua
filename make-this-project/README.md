# Alerta Água

Aplicativo web para registrar, visualizar e acompanhar ocorrências de alagamentos e enchentes em diferentes regiões. A plataforma permite que a comunidade consulte relatos em tempo real, filtre por gravidade e status, e visualize os pontos em um mapa interativo.

## ✨ Funcionalidades

- Mapa interativo com pontos de ocorrências
- Registro de relatos com endereço, gravidade e tipo da situação
- Filtros por gravidade, status e período
- Busca por endereço ou região
- Dashboard com estatísticas gerais
- Cards informativos sobre condições climáticas
- Interface responsiva para desktop e mobile
- Estrutura preparada para evolução para backend real ou integração com banco de dados

## 🧩 Tecnologias utilizadas

- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- Leaflet
- Recharts
- Vitest
- shadcn/ui

## 🏗️ Estrutura do projeto

```bash
src/
├── components/
├── hooks/
├── lib/
├── routes/
├── services/
├── test/
├── types/
├── router.tsx
├── server.ts
├── start.ts
├── styles.css
└── routeTree.gen.ts
```

## 🚀 Como executar localmente

### Pré-requisitos

- Node.js 22+
- npm ou bun

### Instalação

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
npm install
```

### Executar em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível no endereço padrão do Vite, normalmente:

```bash
http://localhost:5173
```

### Build para produção

```bash
npm run build
```

### Gerar o APK para Android

Para compilar o aplicativo Android, instale o [Node.js 22 ou superior](https://nodejs.org/),
o [JDK 21](https://adoptium.net/) e o [Android Studio](https://developer.android.com/studio),
incluindo o Android SDK. No Windows, configure `ANDROID_HOME` para a pasta do SDK.

Na primeira compilação, a partir desta pasta:

```bash
npm install
npm run build:android
npm run android:add
npm run android:sync
```

Depois, abra a pasta `android` no Android Studio e use **Build > Build APK(s)**.
O APK de depuração também pode ser gerado no PowerShell:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

O arquivo será criado em `android/app/build/outputs/apk/debug/app-debug.apk`.
Para baixar uma versão pronta, acesse a execução **Android APK** na aba **Actions**
do GitHub e baixe o artefato `alerta-agua-apk`.

### Testes

```bash
npm run test
```

## 📌 Observação

O projeto atualmente usa armazenamento local para simular dados de ocorrências e confirmações, o que facilita a demonstração e testes iniciais. Em uma versão futura, o ideal é substituir esse armazenamento por uma API e banco de dados reais.

## 📝 Licença

Este projeto está disponível para fins acadêmicos e de desenvolvimento.

## 👤 Autor

Seu nome ou nome da equipe aqui.

---

Se quiser, pode adicionar uma seção com:
- capturas de tela
- arquitetura do sistema
- instruções para deploy
- link do protótipo ou demo
