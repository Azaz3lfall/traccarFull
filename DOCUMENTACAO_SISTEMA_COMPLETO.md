# Documentação Completa do Sistema Traccar Custom

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Componentes Principais](#componentes-principais)
5. [Módulos e Funcionalidades](#módulos-e-funcionalidades)
6. [Configuração e Deploy](#configuração-e-deploy)
7. [Tecnologias Utilizadas](#tecnologias-utilizadas)

---

## 🎯 Visão Geral

O **Traccar Custom** é uma plataforma web completa para rastreamento GPS de veículos e dispositivos. É uma versão customizada do Traccar original, desenvolvida em React com Material-UI e MapLibre, oferecendo funcionalidades avançadas de gestão de frota, relatórios, ordens de serviço e muito mais.

### Características Principais:
- 🗺️ Visualização de mapas em tempo real
- 📊 Relatórios e análises detalhadas
- 🚗 Gestão completa de frotas
- 🔧 Sistema de Ordens de Serviço (OS)
- 👥 Gerenciamento de usuários e permissões
- 📱 Interface responsiva (mobile-first)
- 🌍 Suporte multi-idioma (60+ idiomas)
- 🔔 Sistema de notificações em tempo real

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica

```
Frontend:
├── React 19.1.1
├── Material-UI (MUI) 7.3.2
├── Redux Toolkit 2.9.0
├── React Router DOM 7.8.2
├── MapLibre GL 5.7.0
├── Vite 7.1.3
└── TailwindCSS 4.1.13

Backend/Addons:
├── Express.js 4.21.2
├── Node.js (ES Modules)
└── Servidores auxiliares (Resellers, JTT)

Build & Deploy:
├── Vite (Build Tool)
├── PM2 (Process Manager)
└── Nginx (Web Server)
```

### Fluxo de Dados

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  React App      │
│  (Frontend)     │
└──────┬──────────┘
       │
       ├──► Redux Store (Estado Global)
       │
       ├──► Socket.IO (Tempo Real)
       │
       └──► API REST (Traccar Backend)
            │
            ├──► Resellers Server
            ├──► JTT Server
            └──► Traccar Core API
```

---

## 📁 Estrutura de Pastas

```
traccar-custom/
│
├── .github/                    # Configurações do GitHub
│   ├── workflows/              # CI/CD pipelines
│   │   ├── build.yml          # Build automático
│   │   ├── deploy___.yml      # Deploy automático
│   │   ├── lint.yml           # Linting
│   │   └── translation.yml    # Traduções
│   └── dependabot.yml         # Atualizações de dependências
│
├── public/                     # Arquivos estáticos públicos
│   ├── logo.svg               # Logo da aplicação
│   ├── favicon.ico            # Ícone do navegador
│   └── *.png                  # Imagens estáticas
│
├── src/                        # Código-fonte principal
│   │
│   ├── addons/                # Módulos adicionais e servidores
│   │   ├── reseller/          # Sistema de revendedores
│   │   │   ├── resellersServer.mjs    # Servidor Node.js para revendedores
│   │   │   ├── package.json          # Dependências do servidor
│   │   │   ├── README-SETUP.md       # Documentação de setup
│   │   │   └── traccar-manager/      # App Flutter para gestão
│   │   │       ├── android/           # Código Android nativo
│   │   │       ├── ios/               # Código iOS nativo
│   │   │       └── lib/               # Código Dart/Flutter
│   │   ├── jtt-server/        # Servidor JTT (protocolo GPS)
│   │   │   └── jtt-server.mjs
│   │   └── tags/              # Sistema de tags
│   │       ├── tags.mjs
│   │       └── migrate_tags.sql
│   │
│   ├── common/                 # Código compartilhado e utilitários
│   │   ├── attributes/        # Definições de atributos
│   │   │   ├── useDeviceAttributes.js      # Atributos de dispositivos
│   │   │   ├── usePositionAttributes.js    # Atributos de posições
│   │   │   ├── useUserAttributes.js        # Atributos de usuários
│   │   │   ├── useGeofenceAttributes.js    # Atributos de geocercas
│   │   │   ├── useGroupAttributes.js        # Atributos de grupos
│   │   │   ├── useCommandAttributes.js      # Atributos de comandos
│   │   │   └── useServerAttributes.js       # Atributos do servidor
│   │   │
│   │   ├── components/        # Componentes reutilizáveis
│   │   │   ├── AddressValue.jsx       # Exibição de endereços
│   │   │   ├── BackIcon.jsx           # Ícone de voltar
│   │   │   ├── BottomMenu.jsx         # Menu inferior (mobile)
│   │   │   ├── DriverValue.js          # Exibição de motoristas
│   │   │   ├── ErrorHandler.jsx       # Tratamento de erros
│   │   │   ├── GeofencesValue.js      # Exibição de geocercas
│   │   │   ├── Loader.jsx              # Componente de loading
│   │   │   ├── LocalizationProvider.jsx  # Provedor de traduções
│   │   │   ├── NavBar.jsx              # Barra de navegação
│   │   │   ├── PageLayout.jsx         # Layout padrão de páginas
│   │   │   ├── PositionValue.jsx      # Exibição de posições
│   │   │   ├── QrCodeDialog.jsx       # Dialog de QR Code
│   │   │   ├── RemoveDialog.jsx        # Dialog de confirmação
│   │   │   ├── SelectField.jsx         # Campo de seleção
│   │   │   ├── SideNav.jsx             # Menu lateral
│   │   │   ├── StatusCard.jsx          # Card de status
│   │   │   ├── TableShimmer.jsx        # Skeleton loader para tabelas
│   │   │   └── TermsDialog.jsx         # Dialog de termos
│   │   │
│   │   ├── hooks/              # Hooks customizados compartilhados
│   │   │   ├── useFriendlyNotifications.js  # Notificações amigáveis
│   │   │   └── useResellerBranding.js       # Branding de revendedores
│   │   │
│   │   ├── theme/              # Configurações de tema
│   │   │   ├── components.js   # Componentes do tema
│   │   │   ├── dimensions.js   # Dimensões padrão
│   │   │   ├── index.js        # Exportações do tema
│   │   │   └── palette.js      # Paleta de cores
│   │   │
│   │   ├── util/               # Utilitários diversos
│   │   │   ├── colors.js               # Funções de cores
│   │   │   ├── converter.js            # Conversores de dados
│   │   │   ├── deviceCategories.js     # Categorias de dispositivos
│   │   │   ├── duration.js              # Formatação de durações
│   │   │   ├── fetchOrThrow.js         # Wrapper de fetch com erro
│   │   │   ├── formatter.js             # Formatadores diversos
│   │   │   ├── localStorageAsync.js     # LocalStorage assíncrono
│   │   │   ├── permissions.js           # Gerenciamento de permissões
│   │   │   ├── preferences.js           # Gerenciamento de preferências
│   │   │   ├── ProgressTracker.js       # Rastreador de progresso
│   │   │   ├── resellerBranding.js      # Branding de revendedores
│   │   │   ├── stringUtils.js           # Utilitários de string
│   │   │   ├── timeFilter.js             # Filtros de tempo
│   │   │   ├── useFeatures.js           # Hook de features
│   │   │   └── usePersistedState.js     # Estado persistido
│   │   │
│   │   └── utils/              # Utilitários adicionais
│   │       └── friendlyErrorMessages.js  # Mensagens de erro amigáveis
│   │
│   ├── components/             # Componentes principais da aplicação
│   │   ├── ui/                 # Componentes UI base (Shadcn)
│   │   │   ├── avatar.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   ├── select.jsx
│   │   │   ├── tabs.jsx
│   │   │   └── ShadcnComponents.jsx
│   │   │
│   │   ├── ClusterPopup.jsx            # Popup de clusters no mapa
│   │   ├── CommandDialog.jsx            # Dialog de comandos
│   │   ├── CustomNotificationStack.jsx # Stack de notificações
│   │   ├── CustomPagination.jsx        # Paginação customizada
│   │   ├── DeviceCard.jsx               # Card de dispositivo
│   │   ├── DrawerMenu.jsx               # Menu drawer (mobile)
│   │   ├── FloatingCalendarsPopover.jsx # Popover de calendários
│   │   ├── FloatingCommandsPopover.jsx  # Popover de comandos
│   │   ├── FloatingComputedAttributesPopover.jsx  # Popover de atributos calculados
│   │   ├── FloatingDeviceList.jsx       # Lista flutuante de dispositivos
│   │   ├── FloatingDevicesPopover.jsx  # Popover de dispositivos
│   │   ├── FloatingDriversPopover.jsx   # Popover de motoristas
│   │   ├── FloatingGeofencesPopover.jsx  # Popover de geocercas
│   │   ├── FloatingGestaoPopover.jsx   # Popover de gestão
│   │   ├── FloatingGroupsPopover.jsx   # Popover de grupos
│   │   ├── FloatingMaintenancePopover.jsx  # Popover de manutenções
│   │   ├── FloatingNotificationsPopover.jsx  # Popover de notificações
│   │   ├── FloatingOSPopover.jsx       # Popover de OS
│   │   ├── FloatingReportsPopover.jsx   # Popover de relatórios
│   │   ├── FloatingResellersPopover.jsx # Popover de revendedores
│   │   ├── FloatingStatusCard.jsx       # Card de status flutuante (PRINCIPAL)
│   │   ├── FloatingUsersPopover.jsx    # Popover de usuários
│   │   ├── ModernBottomMenu.jsx         # Menu inferior moderno
│   │   ├── ModernDeviceList.jsx         # Lista moderna de dispositivos
│   │   ├── ModernMainPage.jsx           # Página principal moderna
│   │   ├── ModernStatusCard.jsx         # Card de status moderno
│   │   ├── ResellersPage.jsx            # Página de revendedores
│   │   ├── ShareDialog.jsx               # Dialog de compartilhamento
│   │   └── TimeFilterDemo.jsx            # Demo de filtro de tempo
│   │
│   ├── config/                 # Arquivos de configuração
│   │   ├── api.js              # Configurações da API
│   │   └── resellersConfig.js  # Configurações de revendedores
│   │
│   ├── hooks/                  # Hooks customizados (documentação)
│   │   └── *.md                # Documentação de hooks
│   │
│   ├── lib/                     # Bibliotecas auxiliares
│   │   └── *.js                # Utilitários de biblioteca
│   │
│   ├── login/                   # Sistema de autenticação
│   │   ├── LoginPage.jsx       # Página de login
│   │   ├── RegisterPage.jsx    # Página de registro
│   │   └── *.jsx               # Outros componentes de login
│   │
│   ├── main/                    # Módulo principal (Mapa e Dispositivos)
│   │   ├── DeviceList.jsx      # Lista de dispositivos
│   │   ├── DeviceRow.jsx        # Linha de dispositivo na lista
│   │   ├── EventsDrawer.jsx    # Drawer de eventos
│   │   ├── MainMap.jsx          # Componente principal do mapa
│   │   ├── MainPage.jsx         # Página principal (ROOT)
│   │   ├── MainToolbar.jsx      # Barra de ferramentas principal
│   │   ├── UsersModal.jsx       # Modal de usuários
│   │   ├── useFilter.js         # Hook de filtros
│   │   └── styles.css           # Estilos do módulo principal
│   │
│   ├── map/                     # Módulo de mapas (MapLibre)
│   │   ├── core/                # Núcleo do mapa
│   │   │   ├── MapView.jsx      # Componente principal do mapa
│   │   │   ├── mapUtil.js       # Utilitários do mapa
│   │   │   ├── preloadImages.js # Pré-carregamento de imagens
│   │   │   └── useMapStyles.js  # Hook de estilos do mapa
│   │   │
│   │   ├── draw/                # Ferramentas de desenho
│   │   │   ├── MapGeofenceEdit.js  # Edição de geocercas
│   │   │   └── theme.js            # Tema de desenho
│   │   │
│   │   ├── geocoder/            # Geocodificação
│   │   │   ├── MapGeocoder.js   # Componente de geocodificação
│   │   │   └── geocoder.css     # Estilos do geocoder
│   │   │
│   │   ├── legend/              # Legendas do mapa
│   │   │   └── MapSpeedLegend.js  # Legenda de velocidade
│   │   │
│   │   ├── main/                # Componentes principais do mapa
│   │   │   ├── MapAccuracy.js       # Precisão do mapa
│   │   │   ├── MapDefaultCamera.js  # Câmera padrão
│   │   │   ├── MapLiveRoutes.js     # Rotas ao vivo
│   │   │   ├── MapSelectedDevice.js # Dispositivo selecionado
│   │   │   └── PoiMap.js            # Pontos de interesse
│   │   │
│   │   ├── notification/        # Notificações no mapa
│   │   │   ├── MapNotification.js   # Componente de notificação
│   │   │   └── notification.css     # Estilos de notificação
│   │   │
│   │   ├── overlay/             # Overlays do mapa
│   │   │   ├── MapOverlay.js        # Componente de overlay
│   │   │   └── useMapOverlays.js    # Hook de overlays
│   │   │
│   │   ├── switcher/            # Seletor de mapas
│   │   │   ├── switcher.js          # Lógica do seletor
│   │   │   └── switcher.css         # Estilos do seletor
│   │   │
│   │   ├── MapCamera.js         # Controle de câmera
│   │   ├── MapCurrentLocation.js # Localização atual
│   │   ├── MapDeviceRouteCircle.js  # Círculo de rota do dispositivo
│   │   ├── MapGeofence.js       # Geocercas no mapa
│   │   ├── MapMarkers.js        # Marcadores do mapa
│   │   ├── MapOcorrenciaDestination.js  # Destino de ocorrência
│   │   ├── MapPadding.js        # Padding do mapa
│   │   ├── MapPositions.js      # Posições no mapa
│   │   ├── MapReplayCamera.js   # Câmera de replay
│   │   ├── MapRouteCoordinates.js  # Coordenadas de rota
│   │   ├── MapRoutePath.js      # Caminho de rota
│   │   ├── MapRoutePlanner.jsx  # Planejador de rotas
│   │   ├── MapRoutePoints.js    # Pontos de rota
│   │   ├── MapScale.js          # Escala do mapa
│   │   └── MapStopMarkers.js    # Marcadores de parada
│   │
│   ├── other/                   # Outros módulos e páginas
│   │   ├── EmulatorPage.jsx     # Página de emulador
│   │   ├── EventPage.jsx        # Página de eventos
│   │   ├── GeofencesList.jsx    # Lista de geocercas
│   │   ├── GeofencesPage.jsx    # Página de geocercas
│   │   ├── NetworkPage.jsx      # Página de rede
│   │   ├── PositionPage.jsx    # Página de posições
│   │   ├── ReplayPage.jsx       # Página de replay
│   │   │
│   │   ├── gestao/              # Módulo de Gestão de Frota
│   │   │   ├── components/      # Componentes do módulo
│   │   │   │   ├── AssociationDashboard.jsx      # Dashboard de associações
│   │   │   │   ├── AssociationHistory.jsx        # Histórico de associações
│   │   │   │   ├── AuthDiagnostic.jsx            # Diagnóstico de autenticação
│   │   │   │   ├── AuthStatusIndicator.jsx        # Indicador de status de auth
│   │   │   │   ├── DebugTab.jsx                  # Aba de debug
│   │   │   │   ├── DriverAssociationManager.jsx  # Gerenciador de associação de motoristas
│   │   │   │   ├── DriverCompleteModal.jsx       # Modal completo de motorista
│   │   │   │   ├── DriverCreateModal.jsx         # Modal de criação de motorista
│   │   │   │   ├── DriverEditModal.jsx           # Modal de edição de motorista
│   │   │   │   ├── DriversTab.jsx                # Aba de motoristas
│   │   │   │   ├── ExtraCostsTab.jsx             # Aba de custos extras
│   │   │   │   ├── MaintenancesTab.jsx           # Aba de manutenções
│   │   │   │   ├── RefuelingReportsTab.jsx       # Aba de relatórios de abastecimento
│   │   │   │   ├── RefuelsTab.jsx                 # Aba de abastecimentos
│   │   │   │   ├── ReportsTab.jsx                 # Aba de relatórios
│   │   │   │   ├── SyncScheduleConfig.jsx        # Configuração de sincronização
│   │   │   │   ├── TripsTab.jsx                   # Aba de viagens
│   │   │   │   ├── UnifiedTripsTab.jsx            # Aba unificada de viagens
│   │   │   │   ├── VehiclesTab.jsx                # Aba de veículos
│   │   │   │   ├── common/                        # Componentes comuns
│   │   │   │   │   ├── MultiPhotoModal.jsx        # Modal de múltiplas fotos
│   │   │   │   │   ├── PhotoModal.jsx             # Modal de foto
│   │   │   │   │   ├── ReportTable.jsx            # Tabela de relatórios
│   │   │   │   │   └── SummaryCards.jsx           # Cards de resumo
│   │   │   │   └── index.js                       # Exportações
│   │   │   │
│   │   │   ├── constants/      # Constantes
│   │   │   │   └── index.js    # Constantes do módulo
│   │   │   │
│   │   │   ├── hooks/          # Hooks customizados
│   │   │   │   ├── useDraggable.js        # Hook de arrastar
│   │   │   │   ├── useDrivers.js          # Hook de motoristas
│   │   │   │   ├── useExtraCosts.js      # Hook de custos extras
│   │   │   │   ├── useGestaoData.js      # Hook de dados de gestão
│   │   │   │   ├── useMaintenances.js    # Hook de manutenções
│   │   │   │   ├── usePhotoModal.js      # Hook de modal de foto
│   │   │   │   ├── useRefuels.js         # Hook de abastecimentos
│   │   │   │   ├── useReportExport.js    # Hook de exportação de relatórios
│   │   │   │   ├── useTrips.js           # Hook de viagens
│   │   │   │   └── index.js              # Exportações
│   │   │   │
│   │   │   ├── utils/          # Utilitários
│   │   │   │   ├── apiUtils.js           # Utilitários de API
│   │   │   │   ├── authDiagnostic.js    # Diagnóstico de autenticação
│   │   │   │   ├── authManager.js       # Gerenciador de autenticação
│   │   │   │   ├── exportUtils.js       # Utilitários de exportação
│   │   │   │   ├── formatters.js        # Formatadores
│   │   │   │   ├── testApi.js           # Testes de API
│   │   │   │   ├── testAuth.js          # Testes de autenticação
│   │   │   │   ├── validators.js        # Validadores
│   │   │   │   ├── vehicleUtils.js      # Utilitários de veículos
│   │   │   │   └── index.js             # Exportações
│   │   │   │
│   │   │   ├── GestaoPageModular.jsx    # Página principal modularizada
│   │   │   ├── index.js                 # Exportações principais
│   │   │   └── README.md                # Documentação do módulo
│   │   │
│   │   └── os/                  # Módulo de Ordens de Serviço (OS)
│   │       ├── components/      # Componentes do módulo OS
│   │       │   ├── CreateOS.jsx            # Criação de OS
│   │       │   ├── OSDashboard.jsx         # Dashboard de OS
│   │       │   └── TechnicianManagement.jsx # Gerenciamento de técnicos
│   │       ├── constants/      # Constantes
│   │       │   └── index.js    # Constantes do módulo
│   │       ├── utils/          # Utilitários
│   │       │   └── api.js       # API do módulo OS
│   │       ├── index.js         # Exportações
│   │       └── OSPage.jsx       # Página principal de OS
│   │
│   ├── reports/                 # Módulo de Relatórios
│   │   ├── common/              # Código comum de relatórios
│   │   │   ├── scheduleReport.js    # Agendamento de relatórios
│   │   │   └── useReportStyles.js   # Estilos de relatórios
│   │   ├── components/          # Componentes de relatórios
│   │   │   ├── ColumnSelect.jsx     # Seleção de colunas
│   │   │   ├── ReportFilter.jsx     # Filtros de relatórios
│   │   │   └── ReportsMenu.jsx      # Menu de relatórios
│   │   ├── AuditPage.jsx            # Relatório de auditoria
│   │   ├── ChartReportPage.jsx      # Relatório com gráficos
│   │   ├── CombinedReportPage.jsx   # Relatório combinado
│   │   ├── EventReportPage.jsx      # Relatório de eventos
│   │   ├── LogsPage.jsx             # Página de logs
│   │   ├── PositionsReportPage.jsx   # Relatório de posições
│   │   ├── ScheduledPage.jsx        # Página de agendados
│   │   ├── StatisticsPage.jsx       # Página de estatísticas
│   │   ├── StopReportPage.jsx        # Relatório de paradas
│   │   ├── SummaryReportPage.jsx     # Relatório resumido
│   │   └── TripReportPage.jsx        # Relatório de viagens
│   │
│   ├── resources/               # Recursos estáticos
│   │   ├── alarm.mp3           # Som de alarme
│   │   ├── certs/               # Certificados SSL
│   │   │   ├── dev-cert.pem    # Certificado de desenvolvimento
│   │   │   └── dev-key.pem     # Chave de desenvolvimento
│   │   ├── images/              # Imagens e ícones
│   │   │   ├── *.png           # Imagens PNG
│   │   │   └── *.svg           # Ícones SVG
│   │   └── l10n/                # Arquivos de tradução (60+ idiomas)
│   │       ├── en.json         # Inglês
│   │       ├── pt_BR.json      # Português (Brasil)
│   │       ├── es.json         # Espanhol
│   │       ├── fr.json         # Francês
│   │       └── ...             # Outros idiomas
│   │
│   ├── settings/                # Módulo de Configurações
│   │   ├── common/              # Código comum de configurações
│   │   │   └── useSettingsStyles.js  # Estilos de configurações
│   │   ├── components/          # Componentes de configurações
│   │   │   ├── AddAttributeDialog.jsx      # Dialog de adicionar atributo
│   │   │   ├── BaseCommandView.jsx         # Visualização base de comandos
│   │   │   ├── CollectionActions.jsx       # Ações de coleção
│   │   │   ├── CollectionFab.jsx           # FAB de coleção
│   │   │   ├── DeviceUsersValue.jsx        # Valor de usuários do dispositivo
│   │   │   ├── EditAttributesAccordion.jsx # Accordion de edição de atributos
│   │   │   ├── EditItemView.jsx            # Visualização de edição de item
│   │   │   ├── SearchHeader.jsx            # Cabeçalho de busca
│   │   │   └── SettingsMenu.jsx            # Menu de configurações
│   │   ├── AccumulatorsPage.jsx        # Página de acumuladores
│   │   ├── AnnouncementPage.jsx        # Página de anúncios
│   │   ├── CalendarPage.jsx            # Página de calendário
│   │   ├── CalendarsPage.jsx           # Página de calendários
│   │   ├── CommandDevicePage.jsx       # Página de comandos de dispositivo
│   │   ├── CommandGroupPage.jsx        # Página de comandos de grupo
│   │   ├── CommandPage.jsx             # Página de comando
│   │   ├── CommandsPage.jsx            # Página de comandos
│   │   ├── ComputedAttributePage.jsx   # Página de atributo calculado
│   │   ├── ComputedAttributesPage.jsx  # Página de atributos calculados
│   │   ├── CustomUsersPage.jsx         # Página de usuários customizados
│   │   ├── DeviceConnectionsPage.jsx   # Página de conexões de dispositivo
│   │   ├── DevicePage.jsx              # Página de dispositivo
│   │   ├── DevicesPage.jsx             # Página de dispositivos
│   │   ├── DriverPage.jsx               # Página de motorista
│   │   ├── DriversPage.jsx              # Página de motoristas
│   │   ├── GeofencePage.jsx             # Página de geocerca
│   │   ├── GroupConnectionsPage.jsx     # Página de conexões de grupo
│   │   ├── GroupPage.jsx                 # Página de grupo
│   │   ├── GroupsPage.jsx                # Página de grupos
│   │   ├── MaintenancePage.jsx           # Página de manutenção
│   │   ├── MaintenancesPage.jsx         # Página de manutenções
│   │   ├── NotificationPage.jsx         # Página de notificação
│   │   ├── NotificationsPage.jsx        # Página de notificações
│   │   ├── PreferencesPage.jsx          # Página de preferências
│   │   ├── ServerPage.jsx                # Página do servidor
│   │   ├── SharePage.jsx                # Página de compartilhamento
│   │   ├── UserConnectionsPage.jsx      # Página de conexões de usuário
│   │   ├── UserPage.jsx                  # Página de usuário
│   │   └── UsersPage.jsx                 # Página de usuários
│   │
│   ├── store/                    # Redux Store (Estado Global)
│   │   ├── calendars.js         # Estado de calendários
│   │   ├── devices.js           # Estado de dispositivos
│   │   ├── drivers.js           # Estado de motoristas
│   │   ├── errors.js            # Estado de erros
│   │   ├── events.js            # Estado de eventos
│   │   ├── geofences.js         # Estado de geocercas
│   │   ├── groups.js            # Estado de grupos
│   │   ├── index.js             # Configuração do store
│   │   ├── maintenances.js      # Estado de manutenções
│   │   ├── resellers.js         # Estado de revendedores
│   │   ├── session.js           # Estado de sessão
│   │   └── throttleMiddleware.js # Middleware de throttle
│   │
│   ├── utils/                    # Utilitários gerais
│   │   ├── buildStatusManager.js        # Gerenciador de status de build
│   │   ├── cloudinary.example.js         # Exemplo de configuração Cloudinary
│   │   ├── cloudinary.js                 # Integração Cloudinary
│   │   ├── imageCompression.example.js  # Exemplo de compressão de imagem
│   │   ├── imageCompression.js           # Compressão de imagens
│   │   ├── initBuildStatusManager.js    # Inicialização do build status
│   │   ├── popoverManager.js             # Gerenciador de popovers
│   │   └── simpleBuildStatusManager.js  # Build status manager simples
│   │
│   ├── App.jsx                   # Componente raiz da aplicação
│   ├── AppThemeProvider.jsx      # Provedor de tema
│   ├── BriefingPage.jsx         # Página de briefing
│   ├── ErrorBoundary.jsx        # Boundary de erros
│   ├── ServerProvider.jsx       # Provedor do servidor
│   ├── SocketController.jsx     # Controlador de WebSocket
│   ├── CachingController.jsx    # Controlador de cache
│   ├── UpdateController.jsx     # Controlador de atualizações
│   ├── reactHelper.js           # Helpers do React
│   └── main.jsx                 # Ponto de entrada da aplicação
│
├── .gitignore                    # Arquivos ignorados pelo Git
├── .tx/                          # Configuração do Transifex (traduções)
├── .vscode/                      # Configurações do VS Code
├── CLOUDINARY_SETUP.md           # Documentação do Cloudinary
├── dashcam_flutter_integration.md # Documentação de integração Dashcam
├── CADASTRO_DASHCAM.md           # Guia: cadastrar dashcam no Traccar
├── DOCUMENTACAO_MOTORISTAS.md    # Documentação de motoristas
├── ecosystem.config.js           # Configuração do PM2
├── index.html                    # HTML principal
├── nginx-*.conf                  # Configurações do Nginx
├── package.json                  # Dependências e scripts
├── package-lock.json             # Lock de dependências
├── postcss.config.js             # Configuração do PostCSS
├── README.md                     # README principal
├── server.js                     # Servidor Express auxiliar
├── TRANSLATION_GUIDE.md          # Guia de tradução
└── vite.config.js                # Configuração do Vite
```

---

## 🧩 Componentes Principais

### 1. **FloatingStatusCard.jsx** ⭐
**Localização:** `src/components/FloatingStatusCard.jsx`

**Descrição:** Componente principal que exibe o card de status flutuante com informações detalhadas do dispositivo selecionado.

**Funcionalidades:**
- Exibição de informações do dispositivo em tempo real
- Status de conexão, velocidade, coordenadas
- Gráficos de histórico (velocidade, altitude, etc.)
- Atributos de posição detalhados
- Sistema de replay de posições
- Gerenciamento de status de porta (sensor GT06)
- Modais de detalhes expandidos
- Suporte a modo desktop e mobile

**Principais Hooks e Funções:**
- `getDoorStatus()` - Calcula status da porta baseado no sensor
- `isSharedUnknown()` - Verifica valores desconhecidos
- Gerenciamento de estado de porta (confirmado/pendente)
- Notificações quando porta abre/fecha

---

### 2. **MainPage.jsx**
**Localização:** `src/main/MainPage.jsx`

**Descrição:** Página principal da aplicação, contendo o mapa e todos os componentes principais.

**Funcionalidades:**
- Integração com o mapa principal
- Gerenciamento de dispositivos selecionados
- Sistema de filtros
- Popovers flutuantes (status, dispositivos, relatórios, etc.)
- Modais de usuários e eventos
- Controles de replay
- Integração com sistema de gestão e OS

---

### 3. **MainMap.jsx**
**Localização:** `src/main/MainMap.jsx`

**Descrição:** Componente que gerencia a renderização do mapa MapLibre.

**Funcionalidades:**
- Renderização do mapa base
- Camadas de dispositivos, rotas, geocercas
- Controles de zoom e navegação
- Integração com componentes de mapa

---

### 4. **MapView.jsx**
**Localização:** `src/map/core/MapView.jsx`

**Descrição:** Componente base do mapa MapLibre, inicializando e configurando o mapa.

**Funcionalidades:**
- Inicialização do mapa MapLibre
- Configuração de estilos de mapa
- Gerenciamento de camadas
- Controles de câmera
- Integração com geocodificação

---

## 📦 Módulos e Funcionalidades

### 🚗 Módulo de Gestão de Frota (`src/other/gestao/`)

**Descrição:** Sistema completo para gestão de frotas, incluindo viagens, motoristas, veículos, abastecimentos e custos.

**Componentes Principais:**
- **TripsTab**: Gerenciamento de viagens (abertas e histórico)
- **DriversTab**: CRUD de motoristas com validação
- **VehiclesTab**: Sincronização e gestão de veículos
- **RefuelsTab**: Registro e histórico de abastecimentos
- **ExtraCostsTab**: Gestão de custos extras por categoria
- **ReportsTab**: Relatórios de consumo e custos
- **RefuelingReportsTab**: Relatórios específicos de abastecimento

**Hooks Customizados:**
- `useGestaoData`: Dados principais da gestão
- `useTrips`: Operações de viagens
- `useDrivers`: Operações de motoristas
- `useRefuels`: Operações de abastecimentos
- `useExtraCosts`: Operações de custos extras
- `useMaintenances`: Operações de manutenções

**Utilitários:**
- `formatters.js`: Formatação de moeda, datas, CPF, etc.
- `exportUtils.js`: Exportação em PDF, Excel, CSV
- `apiUtils.js`: Comunicação com API
- `validators.js`: Validação de dados

---

### 🔧 Módulo de Ordens de Serviço (`src/other/os/`)

**Descrição:** Sistema para gerenciamento de ordens de serviço e técnicos.

**Componentes:**
- **OSDashboard**: Dashboard principal com lista de OS
- **CreateOS**: Criação de novas ordens de serviço
- **TechnicianManagement**: Gerenciamento de técnicos

**Funcionalidades:**
- Criação e edição de OS
- Atribuição de técnicos
- Status de OS (aberta, em andamento, concluída)
- Histórico de OS

---

### 📊 Módulo de Relatórios (`src/reports/`)

**Descrição:** Sistema completo de relatórios e análises.

**Tipos de Relatórios:**
- **AuditReport**: Relatório de auditoria
- **ChartReport**: Relatórios com gráficos
- **CombinedReport**: Relatórios combinados
- **EventReport**: Relatório de eventos
- **PositionsReport**: Relatório de posições
- **StopReport**: Relatório de paradas
- **SummaryReport**: Relatório resumido
- **TripReport**: Relatório de viagens
- **Statistics**: Estatísticas gerais

**Funcionalidades:**
- Filtros avançados (período, dispositivo, grupo)
- Exportação em múltiplos formatos
- Agendamento de relatórios
- Gráficos interativos

---

### ⚙️ Módulo de Configurações (`src/settings/`)

**Descrição:** Sistema de configuração de todos os aspectos da aplicação.

**Páginas Principais:**
- **DevicesPage**: Gerenciamento de dispositivos
- **UsersPage**: Gerenciamento de usuários
- **GroupsPage**: Gerenciamento de grupos
- **GeofencesPage**: Gerenciamento de geocercas
- **DriversPage**: Gerenciamento de motoristas
- **NotificationsPage**: Configuração de notificações
- **CommandsPage**: Gerenciamento de comandos
- **ServerPage**: Configurações do servidor
- **PreferencesPage**: Preferências do usuário

---

### 🗺️ Módulo de Mapas (`src/map/`)

**Descrição:** Sistema completo de visualização e interação com mapas.

**Componentes Principais:**
- **MapView**: Componente base do mapa
- **MapMarkers**: Marcadores de dispositivos
- **MapGeofence**: Visualização de geocercas
- **MapRoutePath**: Caminhos de rotas
- **MapPositions**: Histórico de posições
- **MapReplayCamera**: Câmera para replay
- **MapGeocoder**: Geocodificação reversa
- **MapOverlay**: Overlays customizados

**Funcionalidades:**
- Múltiplos estilos de mapa
- Clustering de marcadores
- Desenho de geocercas
- Planejamento de rotas
- Replay de trajetórias

---

## 🔌 Addons e Servidores

### Resellers Server (`src/addons/reseller/`)

**Descrição:** Servidor Node.js para gerenciamento de revendedores e construção de apps mobile.

**Funcionalidades:**
- API REST para revendedores
- Geração de apps Flutter customizados
- Build de APK/IPA com branding
- Gerenciamento de configurações de revendedores

**Arquivos Principais:**
- `resellersServer.mjs`: Servidor Express principal
- `traccar-manager/`: App Flutter para gestão
- `README-SETUP.md`: Documentação de setup

**Variáveis de Ambiente:**
- `FLUTTER_ROOT`: Caminho do Flutter SDK
- `ANDROID_HOME`: Caminho do Android SDK
- `JAVA_HOME`: Caminho do Java

---

### JTT Server (`src/addons/jtt-server/`)

**Descrição:** Servidor para protocolo GPS JTT.

**Funcionalidades:**
- Processamento de mensagens JTT
- Conversão de protocolo
- Integração com Traccar

---

## 🗄️ Estado Global (Redux Store)

**Localização:** `src/store/`

**Slices Principais:**
- **session.js**: Estado da sessão do usuário
- **devices.js**: Estado dos dispositivos
- **positions.js**: Estado das posições (implícito)
- **events.js**: Estado dos eventos
- **geofences.js**: Estado das geocercas
- **groups.js**: Estado dos grupos
- **drivers.js**: Estado dos motoristas
- **calendars.js**: Estado dos calendários
- **maintenances.js**: Estado das manutenções
- **resellers.js**: Estado dos revendedores
- **errors.js**: Estado de erros

**Middleware:**
- **throttleMiddleware.js**: Throttle de ações para performance

---

## 🌐 Internacionalização (i18n)

**Localização:** `src/resources/l10n/`

**Idiomas Suportados:** 60+ idiomas incluindo:
- Português (pt_BR, pt)
- Inglês (en)
- Espanhol (es)
- Francês (fr)
- Alemão (de)
- Italiano (it)
- Russo (ru)
- Chinês (zh, zh_TW)
- Japonês (ja)
- E muitos outros...

**Sistema:**
- Arquivos JSON por idioma
- Chaves de tradução centralizadas
- Suporte a RTL (Right-to-Left)
- Tradução dinâmica via `LocalizationProvider`

---

## 🔐 Sistema de Autenticação

**Localização:** `src/login/`

**Componentes:**
- **LoginPage.jsx**: Página de login
- **RegisterPage.jsx**: Página de registro
- Integração com API de sessão
- Gerenciamento de tokens
- Redirecionamento pós-login

---

## 📱 Responsividade

O sistema é totalmente responsivo com:
- **Mobile-First**: Design otimizado para mobile
- **Breakpoints**: Adaptação para tablet e desktop
- **BottomMenu**: Menu inferior para mobile
- **DrawerMenu**: Menu lateral para mobile
- **FloatingPopovers**: Popovers adaptativos
- **Touch Gestures**: Suporte a gestos touch

---

## 🚀 Scripts e Comandos

### Desenvolvimento
```bash
npm start              # Inicia frontend e servidor de revendedores
npm run start:frontend # Apenas frontend
npm run start:server   # Apenas servidor de revendedores
npm run dev:server     # Servidor com nodemon (hot reload)
```

### Build
```bash
npm run build          # Build de produção
```

### Linting
```bash
npm run lint           # Verifica erros
npm run lint:fix       # Corrige erros automaticamente
```

### PWA
```bash
npm run generate-pwa-assets  # Gera assets PWA
```

---

## 🔧 Configuração

### Variáveis de Ambiente

**Frontend:**
- Configuradas via `vite.config.js`
- Variáveis de build disponíveis em `import.meta.env`

**Resellers Server:**
- `FLUTTER_ROOT`: Caminho do Flutter
- `ANDROID_HOME`: Caminho do Android SDK
- `JAVA_HOME`: Caminho do Java

### Nginx

Múltiplas configurações disponíveis:
- `nginx-cors-handled-by-nginx.conf`: CORS gerenciado pelo Nginx
- `nginx-fixed-config.conf`: Configuração fixa
- `nginx-http-only.conf`: HTTP apenas
- `nginx-midia-cors-fixed.conf`: CORS para mídia
- `nginx-gestao-proxy.conf`: Proxy para backend de Gestão (porta 3666)
- `nginx-resellers-proxy.conf`: Proxy para Reseller Server (porta 3333)

---

## 📚 Documentação Adicional

- **DOCUMENTACAO_MOTORISTAS.md**: Documentação específica de motoristas
- **TRANSLATION_GUIDE.md**: Guia de tradução
- **CLOUDINARY_SETUP.md**: Setup do Cloudinary
- **dashcam_flutter_integration.md**: Integração Dashcam Flutter
- **CADASTRO_DASHCAM.md**: Guia de cadastro de dashcam no Traccar (categoria, atributo `iothub`)
- **src/other/gestao/README.md**: Documentação do módulo de gestão
- **src/addons/reseller/README-SETUP.md**: Setup do servidor de revendedores

---

## 🎨 Tecnologias Utilizadas

### Core
- **React 19.1.1**: Biblioteca UI
- **React Router DOM 7.8.2**: Roteamento
- **Redux Toolkit 2.9.0**: Gerenciamento de estado
- **Material-UI 7.3.2**: Componentes UI
- **MapLibre GL 5.7.0**: Mapas

### Build & Dev Tools
- **Vite 7.1.3**: Build tool
- **TailwindCSS 4.1.13**: Estilização
- **PostCSS**: Processamento CSS
- **ESLint**: Linting

### Utilitários
- **Axios**: HTTP client
- **Day.js**: Manipulação de datas
- **Framer Motion**: Animações
- **Recharts**: Gráficos
- **jsPDF**: Geração de PDF
- **ExcelJS**: Manipulação de Excel
- **Papa Parse**: Parsing CSV

### Backend/Addons
- **Express.js**: Servidor Node.js
- **Socket.IO**: WebSockets (via Traccar)
- **Multer**: Upload de arquivos

---

## 📝 Notas Importantes

1. **Estado da Porta (Door Status)**: Sistema implementado para sensor GT06 com detecção de fio aterrado/desaterrado e mapeamento configurável.

2. **Performance**: Sistema otimizado com:
   - Throttling de ações Redux
   - Lazy loading de componentes
   - Memoização de cálculos pesados
   - Virtualização de listas grandes

3. **Acessibilidade**: Componentes seguem padrões de acessibilidade (ARIA, keyboard navigation).

4. **PWA**: Aplicação pode ser instalada como PWA com suporte offline básico.

5. **Segurança**: 
   - Autenticação via tokens
   - Validação de permissões
   - Sanitização de inputs
   - HTTPS recomendado

---

## 🔄 Fluxo de Dados Típico

```
1. Usuário interage com UI
   ↓
2. Ação disparada (click, input, etc.)
   ↓
3. Redux Action criada
   ↓
4. Redux Reducer atualiza estado
   ↓
5. Componente re-renderiza
   ↓
6. Se necessário, API chamada
   ↓
7. Resposta atualiza Redux Store
   ↓
8. UI atualizada automaticamente
```

**Tempo Real:**
```
1. Traccar Backend envia evento via WebSocket
   ↓
2. SocketController recebe evento
   ↓
3. Redux Action disparada
   ↓
4. Estado atualizado
   ↓
5. Componentes afetados re-renderizam
```

---

## 📞 Suporte e Contribuição

Para questões, bugs ou contribuições, consulte:
- Issues do GitHub
- Documentação do Traccar: https://www.traccar.org
- Comunidade: https://www.traccar.org/forums/

---

**Última Atualização:** 2025-01-22
**Versão:** 6.9.1 (Custom)
