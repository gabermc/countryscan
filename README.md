CountryScan — QA Country Checker

Extensão para Chrome feita para QA de páginas localizadas. Verifica em segundos se os assets, CTAs e metadados da página estão corretos para o país esperado — sem abrir DevTools, sem scripts externos.


O que é
CountryScan é uma extensão para Google Chrome desenvolvida para equipes de QA que trabalham com páginas localizadas por país — como os sites da Samsung para Chile, México, Brasil, Colombia, entre outros.
Ao abrir a extensão em qualquer página, ela analisa automaticamente e exibe os dados de SEO, o idioma detectado e o país identificado na URL. As ferramentas de QA permitem cruzar essas informações com os assets de imagem e os links da página para detectar inconsistências de localização em segundos.
Funciona 100% no navegador, sem servidores externos, sem coleta de dados.

Funcionalidades
Scan automático ao abrir
Assim que a extensão é aberta, ela já executa o scan da página ativa e exibe:

Título da página
Meta Description
URL atual
Canonical (quando presente)
País detectado na URL — exibido como pill colorida (ex: /cl/ — Chile)
Idioma detectado com pontuação de confiança, fonte de detecção e composição de escrita (latino, cirílico, árabe etc.)

QA Tools
País dos assets
Varre todos os elementos <img> da página — incluindo imagens com lazy loading (data-src, data-original, currentSrc) — e detecta o código de país no caminho do arquivo (ex: /assets/cl/, /images/mx/). Compara com o país da URL atual e lista todos os assets divergentes.
Assets com país errado recebem uma borda vermelha pulsante diretamente na página. Clicar na imagem destacada abre o arquivo em nova aba para inspeção.
País dos CTAs
Escaneia todos os links <a href> visíveis na página e verifica se o destino de cada CTA aponta para o mesmo país da URL atual. Lista os botões com país divergente mostrando o texto do CTA, o país detectado no link e o caminho completo.
CTAs errados recebem destaque com borda vermelha pulsante na página, com botão para rolar até cada um.
Países suportados
Código no pathPaís/co/Colombia/cl/Chile/latin/Panamá/latin_en/Guatemala/py/Paraguay/br/Brasil/uy/Uruguay/pe/Peru/ar/Argentina/mx/México

Instalação

A extensão não está publicada na Chrome Web Store. Siga os passos abaixo para instalar localmente.

1. Clone o repositório
bashgit clone https://github.com/gabermc/countryscan.git
cd countryscan
2. Abra a página de extensões do Chrome
chrome://extensions
3. Ative o Modo do Desenvolvedor
Toggle no canto superior direito da página.
4. Carregue a extensão
Clique em "Carregar sem compactação" e selecione a pasta raiz do projeto (onde está o manifest.json).
5. Estrutura de pastas esperada
countryscan/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png

Como usar
Scan da página

Navegue até a página que deseja verificar
Clique no ícone CountryScan na barra de ferramentas
O scan acontece automaticamente — título, description, URL, canonical e país já aparecem
Selecione o idioma esperado no dropdown se quiser forçar a análise de idioma
Clique em Scan para reanalisar

Verificar país dos assets

Expanda o painel QA Tools
Na seção País dos assets, clique em Varrer
A extensão detecta o país da URL e compara com o código de país no path de cada imagem
Assets divergentes aparecem listados com o país encontrado vs. o esperado
Clique em ⬤ Destacar divergentes para visualizar na página com borda pulsante
Clique em ↗ em cada item para rolar até aquela imagem específica
Clique diretamente na imagem destacada para abrir o asset em nova aba

Verificar país dos CTAs

Na seção País dos CTAs, clique em Varrer
A extensão lista todos os links e verifica se apontam para o país correto
CTAs com país divergente aparecem com o texto do botão e o caminho completo do link
Clique em ⬤ Destacar CTAs errados para visualizar na página
Clique em ↗ para rolar até cada CTA problemático


Estrutura do projeto
ArquivoResponsabilidademanifest.jsonConfiguração da extensão, permissões e ícones (Manifest V3)popup.htmlInterface do popup — estrutura HTML e estilos CSSpopup.jsToda a lógica: scan, detecção de país, QA tools, injeção de highlights na páginacontent.jsScript injetado na aba para extração de texto e análise de idioma

Limitações conhecidas

Páginas protegidas (chrome://, extensões, PDFs nativos do Chrome) não podem ser escaneadas por restrições da plataforma.
A verificação de país nos CTAs considera apenas links com código de país explícito no path da URL — links relativos sem país no caminho não são classificados como errados.
Imagens carregadas via canvas ou WebGL não são detectadas pelo varredor de assets.
A detecção de idioma é baseada em heurísticas de script de escrita e atributos HTML — pode ter imprecisões em páginas com conteúdo misto extenso.


Contribuindo

Fork o repositório
Crie uma branch: git checkout -b feature/minha-feature
Commit: git commit -m 'feat: descrição da mudança'
Push: git push origin feature/minha-feature
Abra um Pull Request

Ideias para contribuição

Suporte a novos países e regiões
Exportar relatório de QA em JSON ou CSV
Suporte a Firefox via WebExtensions API
Detecção de país por subdomínio (ex: cl.samsung.com)


Licença
Distribuído sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

<p align="center">Feito para QA de páginas localizadas — 100% local, sem servidores, sem coleta de dados.</p>
<p align="center">Pra cima LINCAO <3</p>
