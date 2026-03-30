1. Implementação no Frontend (React) - Recomendado para você
Como o frontend moderno do Traccar (v5+) é feito em React e utiliza bibliotecas de mapas como MapLibre GL JS ou OpenLayers (dependendo da configuração), você pode criar uma "Custom Layer".

O conceito: Você precisará interceptar os dados da rota (Route Report) ou das posições e passá-los para uma camada de heatmap da biblioteca de mapas.

Se estiver usando MapLibre GL JS (Padrão moderno): O MapLibre tem suporte nativo a heatmap-layer. Você precisaria editar o código do frontend (geralmente em src/map/ no repositório traccar-web):

Adicionar uma nova source do tipo geojson contendo os pontos (lat/long) dos dispositivos.

Adicionar uma layer do tipo heatmap referenciando essa source.

Configurar as propriedades de heatmap-weight (peso baseado em frequência ou velocidade) e heatmap-intensity.

Exemplo de estrutura da layer (JSON style):

JavaScript
map.addLayer({
    'id': 'traccar-heatmap',
    'type': 'heatmap',
    'source': 'positions-source',
    'paint': {
        'heatmap-weight': 1,
        'heatmap-intensity': 1,
        'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': 30
    }
});
Se estiver usando OpenLayers (Modo Legacy/Raster): Você pode usar a classe ol/layer/Heatmap. Seria necessário instanciar essa camada passando os dados do store do Redux (onde ficam as posições) como source.