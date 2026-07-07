# 📱 PatriScan

Aplicativo mobile para **escaneamento e gerenciamento de inventários patrimoniais**.
Desenvolvido com **React Native** e **Expo**, utiliza a câmera do dispositivo para leitura de códigos de barras, permitindo controle completo de bens, inclusive itens não listados.

---

## 🚀 Funcionalidades

- 📷 Leitura de códigos de barras em tempo real com a câmera (via `expo-camera`)
- ⌨️ Entrada manual de códigos para situações de baixa luminosidade ou etiquetas danificadas
- 📋 Criação de inventários por importação de arquivo **CSV** ou cadastro manual de itens
- 🔍 Registro de **itens não listados** (fora da lista original) durante o escaneamento
- 📄 Exportação de relatórios em **CSV** (com delimitador `;` e BOM UTF‑8) e **PDF**
- 📊 Linha do tempo de escaneamentos e gráfico de progresso
- ⚙️ Configuração de vibração no escaneamento
- 🗑️ Limpeza total dos dados com confirmação dupla
- 📈 Cálculo automático de progresso baseado apenas nos itens originais

---

## 🧠 Regras de Negócio

| ID   | Descrição |
|------|-----------|
| RN01 | Apenas itens com `found: false` podem ser escaneados e marcados como encontrados |
| RN02 | Códigos duplicados no mesmo inventário não são permitidos |
| RN03 | Todo inventário deve ter pelo menos uma coluna mapeada para “Código” |
| RN04 | Ao confirmar um scan, registrar data e hora do escaneamento |
| RN05 | Item não listado (*unexpected*) é armazenado separadamente dos itens originais |
| RN06 | Código pertencente à lista original não pode ser registrado como Item Não Listado |
| RN07 | Códigos já registrados como Item Não Listado são ignorados em novas tentativas |
| RN08 | Campos do schema não podem ser alterados após o primeiro escaneamento |
| RN09 | Exclusão de inventário remove todos os seus arquivos locais |
| RN10 | Ao resetar o inventário, Itens Não Listados são preservados |
| RN11 | Progresso do inventário é calculado apenas com base nos itens originais |
| RN12 | Relatórios refletem o estado atual, incluindo itens não listados |
| RN13 | A linha do tempo considera tanto itens originais quanto não listados |
| RN14 | Arquivos CSV exportados devem conter BOM UTF‑8 e delimitador `;` |
| RN15 | Apagar todos os dados é irreversível e exige confirmação explícita |
| RN16 | O schema básico é gerado automaticamente a partir dos campos dos itens importados |
| RN17 | As preferências do scanner (vibração) são aplicadas imediatamente e persistidas |

---

## 🛠 Tecnologias

- [Expo](https://expo.dev) (SDK 54)
- [React Native](https://reactnative.dev) 0.81
- [React Navigation](https://reactnavigation.org) (native stack)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) – persistência local
- [PapaParse](https://www.papaparse.com/) – parsing de CSV
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/) – leitura de códigos de barras
- [expo-print](https://docs.expo.dev/versions/latest/sdk/print/) e [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) – exportação de PDF
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) – manipulação de arquivos
- [react-native-svg](https://github.com/software-mansion/react-native-svg) – gráficos

---

## 📦 Pré-requisitos

- **Node.js** 18+
- **npm** 9+
- **Expo Go** instalado no dispositivo físico ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

---

## ⚙️ Instalação

```bash
git clone https://github.com/mariannaalmeida/patri-scan3.git
cd patri-scan3
npm install
```

---

## ▶️ Executando o app

```bash
npx expo start -c
```

O comando `-c` limpa o cache do Metro bundler, garantindo que as últimas alterações sejam carregadas.

Caso prefira iniciar com túnel (para testar em dispositivos em redes diferentes):

```bash
npx expo start --tunnel
```

---

## 🧪 Como Testar

### Importar um inventário via CSV

1. Na HomeScreen, clique em **Importar CSV**
2. Informe um nome para o inventário
3. Selecione um dos arquivos CSV disponíveis na pasta `test-data/` do repositório:

   | Arquivo | Descrição |
   |---------|-----------|
   | `801_B_COORDENADORIA_GERAL_DE_EXTENSAO.csv` | Inventário real com 22 itens |
   | `REC_2020.csv` | Inventário real com 19 itens |
   | `SALA_201ET_INVENTRIO_2023.csv` | Inventário real com 6 itens |

4. Revise o mapeamento automático das colunas e clique em **Continuar**
5. Valide os dados e clique em **Criar Inventário**

### Escanear códigos de barras

Na pasta `test-data/` há imagens de códigos de barras nos formatos **Code128** e **Code39** para testar a leitura.

1. Na HomeScreen, clique em **Escanear**
2. Aponte a câmera para a imagem do código de barras
3. O sistema classificará automaticamente o item
4. Confirme a leitura no modal

### Gerar relatórios

Após escanear alguns itens, acesse a tela de **Relatórios** e selecione um inventário para visualizar gráficos e exportar resultados em CSV/PDF.

---

## 📂 Estrutura do Projeto

```
src/
├── hooks/              # Hooks customizados (navegação)
├── navigation/         # Configuração de rotas
├── screens/            # Telas do aplicativo
├── services/           # Lógica de negócio e persistência
├── styles/             # Temas e estilos centralizados
├── types/              # Definições de tipos TypeScript
└── utils/              # Funções utilitárias

test-data/              # Dados de exemplo para teste
```


