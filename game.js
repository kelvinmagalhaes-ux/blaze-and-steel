// ====================================================================
// I. CONFIGURAÇÃO DE DADOS INICIAIS
// ====================================================================

// Variáveis de Estado Global
const INITIAL_STATS = {
    level: 1,
    exp: 0,
    expToNextLevel: 100,
    gold: 50,
    baseHp: 100,
    currentHp: 100,
    baseAttack: 10,
    baseDefense: 5,
    baseEnergy: 1,
    baseSoul: 0,
    baseDexterity: 1,
    critChance: 5,
    className: '',
    attributePoints: 0, // Pontos para distribuir em stats
};

let hero = { ...INITIAL_STATS };
let inventory = []; // [{id: 1, name: "Espada Curta", type: "weapon", stat: {attack: 5}, icon: '⚔️', count: 1}, ...]
let currentEnemy = null;
let currentPanel = 'stats-panel';

const EQUIPMENT_SLOTS = {
    weapon: { name: "Arma", currentItem: null, icon: '⚔️' },
    armor: { name: "Armadura", currentItem: null, icon: '🛡️' },
    accessory: { name: "Acessório", currentItem: null, icon: '💍' },
};

let inspectedItem = null; 

let heroEquipmentStats = { attack: 0, defense: 0, hp: 0, dexterity: 0, critChance: 0 };
let hasInteracted = false; // Para iniciar a música

// Variáveis de Cooldown para Missões (em segundos)
let missionCooldowns = {
    resource: 0,
    daily: 0
};
let missionTimers = {}; // Para armazenar as referências de setInterval

// Definição de Monstros
const MONSTERS_BY_LEVEL = {
    Forest: [
        { id: 1, name: "Slime Iniciante", level: 1, hp: 50, attack: 8, defense: 2, expDrop: 15, goldDrop: 5, image: './assets/enemy.png' },
        { id: 2, name: "Goblin Ladrão", level: 3, hp: 70, attack: 15, defense: 5, expDrop: 25, goldDrop: 10, image: './assets/enemy.png' }
    ]
};

// ====================================================================
// II. FUNÇÕES DE INÍCIO E NAVEGAÇÃO
// ====================================================================

// 1. Inicia um Novo Jogo
function newGame() {
    // Esconde menu inicial e mostra criação de personagem
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('character-creation-panel').classList.remove('hidden');
    
    // Inicia a interação para permitir áudio
    initAudio(); 
    hasInteracted = true;
    
    // Limpa dados (se houver)
    hero = { ...INITIAL_STATS };
    inventory = [];
    currentEnemy = null;
    for (const key in EQUIPMENT_SLOTS) {
        EQUIPMENT_SLOTS[key].currentItem = null;
    }
    missionCooldowns = { resource: 0, daily: 0 };
    updateEquipmentStats();
}

// 2. Seleciona a Classe
let selectedClass = null;
function selectClass(className) {
    // Lógica para aplicar a seleção visual
    document.querySelectorAll('.class-card').forEach(card => card.classList.remove('selected-class'));
    const card = document.querySelector(`.class-card[onclick*='${className}']`);
    if (card) {
        card.classList.add('selected-class');
        selectedClass = className;
        document.getElementById('start-adventure-button').disabled = false;
    }
}

// 3. Finaliza a Criação
function finalizeCharacter() {
    if (!selectedClass) {
        alert("Por favor, escolha uma classe.");
        return;
    }

    // Aplica stats da classe e nome
    hero.className = selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1);
    hero.name = document.getElementById('hero-name').value || 'Aventureiro';

    switch(selectedClass) {
        case 'warrior':
            hero.baseAttack += 2; hero.baseDefense += 3; hero.baseHp += 20;
            break;
        case 'archer':
            hero.baseAttack += 3; hero.baseDefense += 1; hero.baseDexterity += 2;
            break;
        case 'assassin':
            hero.baseAttack += 4; hero.critChance += 5;
            break;
    }
    
    // Configura HP inicial (Base + Bônus de classe)
    hero.currentHp = hero.baseHp; 
    
    // Adicionar equipamento inicial (exemplo simples)
    addItem({ id: 100, name: "Arma Inicial", type: "weapon", stat: { attack: 2 }, icon: '⚔️', count: 1 });
    equipItem(inventory[0], false);
    
    // Inicia o jogo principal
    document.getElementById('character-creation-panel').classList.add('hidden');
    document.getElementById('main-interface').classList.remove('hidden');
    
    renderAll();
    logMessage(`Bem-vindo, ${hero.name} (${hero.className})! Sua aventura começa agora.`, 'accent');
    startMissionTimers(); // Inicia o contador de cooldowns
    saveGame();
}

// 4. Alterna a exibição dos painéis principais
function showPanel(panelId) {
    if (currentPanel === panelId) return;

    // Esconde todos os painéis de conteúdo
    document.querySelectorAll('.game-panel').forEach(panel => panel.classList.add('hidden'));
    
    // Mostra o painel desejado
    document.getElementById(panelId).classList.remove('hidden');
    
    // Atualiza a navegação
    document.querySelectorAll('#navigation-menu button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${panelId.replace('-panel', '')}`).classList.add('active');
    
    currentPanel = panelId;
    
    // Renderiza o conteúdo específico do painel
    if (panelId === 'inventory-panel') {
        renderInventory();
        // Limpa detalhes do item ao trocar para o inventário
        inspectedItem = null;
        document.getElementById('item-details-content').innerHTML = "<p>Selecione um item.</p>";
    }
    renderStats(); // Para garantir que os stats estejam sempre atualizados
}

// ====================================================================
// III. FUNÇÕES DE CÁLCULO DE ESTATÍSTICAS
// ====================================================================

// 1. Recalcula os bônus de equipamento e armazena em heroEquipmentStats
function updateEquipmentStats() {
    heroEquipmentStats = { attack: 0, defense: 0, hp: 0, dexterity: 0, critChance: 0 };

    for (const slotKey in EQUIPMENT_SLOTS) {
        const item = EQUIPMENT_SLOTS[slotKey].currentItem;
        if (item && item.stat) {
            heroEquipmentStats.attack += item.stat.attack || 0;
            heroEquipmentStats.defense += item.stat.defense || 0;
            heroEquipmentStats.hp += item.stat.hp || 0;
            heroEquipmentStats.dexterity += item.stat.dexterity || 0;
            heroEquipmentStats.critChance += item.stat.critChance || 0;
        }
    }
    renderStats(); 
}

// 2. Retorna o valor total da estatística (base + equipamento)
function getStatValue(statKey) {
    let baseValue = hero[statKey];
    let equipmentBonus = 0;

    if (statKey.includes('Attack')) equipmentBonus = heroEquipmentStats.attack;
    else if (statKey.includes('Defense')) equipmentBonus = heroEquipmentStats.defense;
    else if (statKey.includes('Dexterity')) equipmentBonus = heroEquipmentStats.dexterity;
    else if (statKey.includes('critChance')) equipmentBonus = heroEquipmentStats.critChance;
    
    // Para HP, somamos o bônus ao baseHp para obter o HP Máximo total
    if (statKey === 'baseHp') equipmentBonus = heroEquipmentStats.hp;

    return baseValue + equipmentBonus;
}

// 3. Distribuição de Pontos de Atributo (ao subir de nível)
function increaseStat(statKey) {
    if (hero.attributePoints > 0) {
        hero.attributePoints--;
        hero[statKey]++;
        logMessage(`+1 ponto em ${statKey.replace('base', '')}.`, 'energy');
        
        // Se for HP, cura total
        if (statKey === 'baseHp') {
            hero.currentHp = getStatValue('baseHp');
        }
        
        renderStats();
        saveGame();
    }
}

// 4. Evolução com Alma (Soul)
function evolveStat(statKey) {
    if (hero.baseSoul >= 1) {
        hero.baseSoul--;
        // Se for um stat base, aumenta o stat base
        if (statKey in hero) {
            hero[statKey]++;
            logMessage(`Você usou 1 Alma e seu ${statKey.replace('base', '')} Base aumentou.`, 'soul');
        } else {
            // Se for um novo stat permanente (ex: bônus de EXP)
            // Lógica para Alma aqui (ex: hero.soulBonus += 0.01)
        }
        
        // Se for HP, cura total
        if (statKey === 'baseHp') {
            hero.currentHp = getStatValue('baseHp');
        }
        
        renderStats();
        saveGame();
    } else {
        logMessage("Você não tem Alma suficiente para Evoluir!", 'combat');
    }
}

// ====================================================================
// IV. FUNÇÕES DE RENDERIZAÇÃO
// ====================================================================

// 1. Renderiza tudo (chamada após carregar ou grandes mudanças)
function renderAll() {
    updateEquipmentStats(); // Garante que os bônus estão calculados
    renderStats();
    renderEquipment();
    // renderInventory(); // Renderizado quando o painel é mostrado
    // renderActionPanel(); // (Não há painel de ação separado aqui)
    renderSidebarStats();
    renderMissions();
}

// 2. Renderiza o painel de Estatísticas
function renderStats() {
    const maxHp = getStatValue('baseHp');
    const totalAttack = getStatValue('baseAttack');
    const totalDefense = getStatValue('baseDefense');
    const totalDex = getStatValue('baseDexterity');
    const totalCrit = getStatValue('critChance');
    
    const statsHtml = `
        <tr><td>Nome</td><td>${hero.name}</td></tr>
        <tr><td>Classe</td><td>${hero.className}</td></tr>
        <tr><td>Nível</td><td>${hero.level}</td></tr>
        <tr><td>EXP</td><td>${hero.exp} / ${hero.expToNextLevel}</td></tr>
        <tr><td>Ouro</td><td>${hero.gold}</td></tr>
        <tr><td>HP Máximo</td><td>${maxHp} (+${heroEquipmentStats.hp})</td></tr>
        <tr><td>Ataque Total</td><td>${totalAttack} (+${heroEquipmentStats.attack})</td></tr>
        <tr><td>Defesa Total</td><td>${totalDefense} (+${heroEquipmentStats.defense})</td></tr>
        <tr><td>Destreza Total</td><td>${totalDex} (+${heroEquipmentStats.dexterity})</td></tr>
        <tr><td>Chance de Crítico</td><td>${totalCrit}% (+${heroEquipmentStats.critChance}%)</td></tr>
        <tr><td>Energia (Ações)</td><td>${hero.baseEnergy}</td></tr>
        <tr><td>Alma (Evolução)</td><td>${hero.baseSoul}</td></tr>
    `;
    document.getElementById('stats-table').innerHTML = statsHtml;
    updateHpBar(hero, 'hero-hp-bar'); // Atualiza a barra de HP do herói

    // Atualiza o display de pontos de atributo
    const attrPointsDisplay = document.getElementById('attribute-points-display');
    if (hero.attributePoints > 0) {
        attrPointsDisplay.classList.remove('hidden');
        document.getElementById('attribute-points-count').textContent = hero.attributePoints;
    } else {
        attrPointsDisplay.classList.add('hidden');
    }

    // Atualiza o botão de Reencarnação
    if (hero.level >= 10) { // Exemplo: Reencarnação liberada no Lv 10
        document.getElementById('nav-rebirth').classList.remove('hidden');
        document.getElementById('soul-amount-rebirth').textContent = hero.baseSoul;
        document.getElementById('rebirth-button').disabled = false;
    }
}

// 3. Atualiza o estado da barra de vida (HP)
function updateHpBar(character, hpElementId) {
    const maxHp = getStatValue('baseHp');
    const currentHp = character.currentHp;
    const percentage = (currentHp / maxHp) * 100;
    const hpBar = document.getElementById(hpElementId);

    if (hpBar) {
        hpBar.style.width = `${percentage}%`;
        hpBar.textContent = `${currentHp}/${maxHp}`;
        
        // Mudar cor da barra de HP
        if (percentage < 30) {
            hpBar.style.backgroundColor = '#e74c3c'; // Vermelho
        } else if (percentage < 60) {
            hpBar.style.backgroundColor = '#f1c40f'; // Amarelo
        } else {
            hpBar.style.backgroundColor = 'var(--color-hp)'; // Verde padrão
        }
    }
}

// 4. Renderiza o painel de Equipamento
function renderEquipment() {
    const equipmentDiv = document.getElementById('equipment-slots');
    let html = '';

    for (const slotKey in EQUIPMENT_SLOTS) {
        const slot = EQUIPMENT_SLOTS[slotKey];
        const item = slot.currentItem;
        const icon = item ? item.icon : slot.icon;
        const className = item ? 'filled' : '';
        // Passa o item ou o slot vazio (para desequipar/inspecionar)
        const onclickAction = item ? `inspectItem(${JSON.stringify(item).replace(/"/g, '&quot;')}, 1, true)` : `logMessage('Slot vazio', 'border')`;

        html += `
            <div class="equipment-slot ${className}" onclick="${onclickAction}">
                <span class="equipment-item-icon">${icon}</span>
                <span class="equipment-slot-label">${slot.name}</span>
            </div>
        `;
    }
    equipmentDiv.innerHTML = html;
}

// 5. Renderiza o painel de Inventário
function renderInventory() {
    const inventoryGrid = document.getElementById('inventory-grid');
    let html = '';

    // Mapeia o inventário para agrupar itens por ID e contar
    const groupedInventory = inventory.reduce((acc, item) => {
        const key = item.id;
        if (!acc[key]) {
            acc[key] = { ...item, count: 0 };
        }
        acc[key].count++;
        return acc;
    }, {});

    for (const itemId in groupedInventory) {
        const item = groupedInventory[itemId];
        const selectedClass = inspectedItem && inspectedItem.id === item.id ? 'selected' : '';

        html += `
            <div class="inventory-item ${selectedClass}" onclick="inspectItem(${JSON.stringify(item).replace(/"/g, '&quot;')}, ${item.count})">
                <span class="item-icon">${item.icon}</span>
                ${item.count > 1 ? `<span class="item-stack-size">${item.count}</span>` : ''}
            </div>
        `;
    }
    inventoryGrid.innerHTML = html;
}

// 6. Inspeciona e renderiza os detalhes do item
function inspectItem(item, count = 1, isEquipped = false) {
    inspectedItem = item;
    renderInventory(); // Atualiza a seleção visual

    const detailsDiv = document.getElementById('item-details-content');
    let detailsHtml = `<h4>${item.name}</h4>`;

    if (item.type) {
        const slot = EQUIPMENT_SLOTS[item.type];
        detailsHtml += `<p><strong>Tipo:</strong> ${slot ? slot.name : item.type.charAt(0).toUpperCase() + item.type.slice(1)}</p>`;
    }
    if (count > 1 && !isEquipped) {
        detailsHtml += `<p><strong>Quantidade:</strong> ${count}</p>`;
    }

    detailsHtml += `<p><strong>Descrição:</strong> ${item.description || 'Nenhuma descrição.'}</p>`;

    if (item.stat) {
        detailsHtml += '<p><strong>Efeitos:</strong></p><ul>';
        for (const stat in item.stat) {
            detailsHtml += `<li>+${item.stat[stat]} ${stat.charAt(0).toUpperCase() + stat.slice(1)}</li>`;
        }
        detailsHtml += '</ul>';
    }

    // Ação: Equipar/Desequipar
    let actionButton = '';
    if (item.type && EQUIPMENT_SLOTS[item.type]) {
        if (isEquipped) {
            actionButton = `<button class="item-action-button" onclick="unequipItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">DESEQUIPAR</button>`;
        } else {
            actionButton = `<button class="item-action-button" onclick="equipItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">EQUIPAR</button>`;
        }
    }
    
    detailsHtml += actionButton;
    detailsDiv.innerHTML = detailsHtml;
}

// 7. Renderiza as estatísticas no Sidebar (Mini Stats)
function renderSidebarStats() {
    const miniStatsDiv = document.getElementById('hero-mini-stats');
    const maxHp = getStatValue('baseHp');
    
    miniStatsDiv.innerHTML = `
        <h3>${hero.name} (Lv ${hero.level})</h3>
        <p>HP: ${hero.currentHp}/${maxHp}</p>
        <p>Ouro: ${hero.gold}</p>
        <p>Alma: ${hero.baseSoul}</p>
    `;
    
    // Atualiza a imagem do personagem principal (apenas exemplo, ajuste o src para seus arquivos)
    const charImg = document.getElementById('hero-char-img');
    if (charImg) charImg.src = `./assets/${hero.className.toLowerCase()}.png`;
}

// 8. Renderiza os painéis de Missões/Treinamento
function renderMissions() {
    // --- Missões de Recurso ---
    const resourceMissionContainer = document.getElementById('resource-missions-container');
    const resourceMission = {
        name: "Coleta Rápida de Madeira",
        time: 30, // 30 segundos
        reward: { exp: 5, gold: 10 },
        cooldownKey: 'resource'
    };
    
    const resourceTimeRemaining = missionCooldowns[resourceMission.cooldownKey];
    const isDisabled = resourceTimeRemaining > 0;
    const buttonText = isDisabled ? `COOLDOWN (${resourceTimeRemaining}s)` : 'INICIAR';
    
    resourceMissionContainer.innerHTML = `
        <div class="mission-card">
            <div class="mission-details">
                <h4>${resourceMission.name}</h4>
                <p>Tempo: <strong>${resourceMission.time}s</strong> | Recompensa: <strong>${resourceMission.reward.exp} EXP, ${resourceMission.reward.gold} Ouro.</strong></p>
            </div>
            <button class="mission-button ${isDisabled ? 'on-cooldown' : ''}" onclick="startMission('${resourceMission.cooldownKey}', ${resourceMission.time}, ${resourceMission.reward.exp}, ${resourceMission.reward.gold})" ${isDisabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>
    `;

    // --- Missões Diárias e Únicas (Adicione mais lógica aqui se necessário) ---
    // Atualmente só tem um placeholder no HTML, mas você pode seguir o mesmo padrão de Mission Card.
}


// ====================================================================
// V. FUNÇÕES DE PERSISTÊNCIA (SALVAR/CARREGAR/RESETAR)
// ====================================================================

// 1. Salvar Jogo
function saveGame(showAlert = false) {
    try {
        const gameState = {
            hero: hero,
            equipment: EQUIPMENT_SLOTS,
            inventory: inventory,
            missionCooldowns: missionCooldowns,
            // Adicionar outras variáveis globais que precisam ser salvas
        };
        localStorage.setItem('blazeAndSteelSave', JSON.stringify(gameState));
        if (showAlert) alert("Jogo salvo com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar o jogo:", e);
        alert("Erro ao salvar o jogo. O armazenamento local está cheio ou indisponível.");
    }
}

// 2. Carregar Jogo
function loadGame(showAlert = false) {
    const savedState = localStorage.getItem('blazeAndSteelSave');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        hero = gameState.hero;
        // Restaura EQUIPMENT_SLOTS
        for (const key in EQUIPMENT_SLOTS) {
            if (gameState.equipment[key]) {
                 EQUIPMENT_SLOTS[key].currentItem = gameState.equipment[key].currentItem;
            }
        }
        inventory = gameState.inventory;
        missionCooldowns = gameState.missionCooldowns || { resource: 0, daily: 0 };
        
        // Garante que o HP atual não exceda o HP Máximo recalculado
        const maxHp = getStatValue('baseHp');
        if (hero.currentHp > maxHp) {
            hero.currentHp = maxHp;
        }

        updateEquipmentStats();
        // Esconde menu e mostra a interface principal
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('main-interface').classList.remove('hidden');
        showPanel(currentPanel); // Volta para o último painel
        
        initAudio(); // Inicia áudio se o usuário já interagiu no passado
        startMissionTimers(); // Restaura o contador de cooldowns
        renderAll();
        
        if (showAlert) alert("Jogo carregado com sucesso!");
        
        return true;
    } else if (showAlert) {
        alert("Nenhum jogo salvo encontrado.");
        return false;
    }
}

// 3. Resetar Jogo
function resetGame() {
    if (confirm("Tem certeza que deseja começar um novo jogo? Todo o progresso será perdido.")) {
        localStorage.removeItem('blazeAndSteelSave');
        // Redireciona para o menu inicial
        location.reload(); 
    }
}

// 4. Reencarnação (Prestígio)
function rebirthConfirm() {
    if (confirm(`Você tem certeza que deseja Reencarnar? Você perderá todo o progresso (Nível, EXP, Ouro, Itens), mas ganhará ${hero.baseSoul} Alma para bônus permanentes!`)) {
        // Logica de Reencarnação:
        // 1. Calcula bônus de Alma
        const soulGained = Math.floor(hero.level / 10); // Exemplo
        hero.baseSoul += soulGained;

        // 2. Limpa o progresso
        localStorage.removeItem('blazeAndSteelSave');
        hero = { ...INITIAL_STATS, baseSoul: hero.baseSoul }; // Mantém apenas a alma
        hero.currentHp = hero.baseHp;
        inventory = [];
        
        // 3. Reinicia o jogo
        location.reload();
    }
}


// ====================================================================
// VI. FUNÇÕES DE INVENTÁRIO/ITEM
// ====================================================================

// 1. Adiciona um item ao inventário
function addItem(item, showAlert = false) {
    // Para simplificar, não estamos verificando se o item é empilhável, apenas adicionando à lista.
    inventory.push(item);
    renderInventory();
    saveGame();
    if (showAlert) logMessage(`${item.name} adicionado ao inventário.`, 'accent');
}

// 2. Remove um item do inventário (por ID)
// Nota: Esta função remove apenas UMA instância do item com o ID fornecido.
function removeItem(item) {
    const index = inventory.findIndex(i => i.id === item.id);
    if (index !== -1) {
        inventory.splice(index, 1);
        renderInventory();
        saveGame();
        return true;
    }
    return false;
}

// 3. Equipa um item
function equipItem(item, showAlert = true) {
    const slotKey = item.type;
    if (!EQUIPMENT_SLOTS[slotKey]) {
        logMessage("Não é possível equipar: Tipo de item inválido.", "combat");
        return;
    }

    // 3.1. Se houver um item equipado, desequipamos e o movemos para o inventário
    const oldItem = EQUIPMENT_SLOTS[slotKey].currentItem;
    if (oldItem) {
        addItem(oldItem, false); // Adiciona o item antigo ao inventário sem alerta
    }
    
    // 3.2. Remove o item do inventário
    removeItem(item); 
    
    // 3.3. O novo item está sendo equipado, então ele substitui o item atual no slot
    EQUIPMENT_SLOTS[slotKey].currentItem = item;
    
    // Atualiza todos os painéis
    renderEquipment();
    renderInventory();
    updateEquipmentStats(); // Recalcula stats (importante)
    if (showAlert) inspectItem(item, 1, true); // Reinspeciona para mostrar "DESEQUIPAR"
    saveGame();
    if (showAlert) alert(`${item.name} equipado no slot de ${EQUIPMENT_SLOTS[slotKey].name}.`);
}

// 4. Desequipa o item
function unequipItem(item) {
    const slotKey = item.type;
    
    if (EQUIPMENT_SLOTS[slotKey].currentItem && EQUIPMENT_SLOTS[slotKey].currentItem.id === item.id) {
         EQUIPMENT_SLOTS[slotKey].currentItem = null;
         addItem(item, false); // Adiciona o item desequipado de volta ao inventário
         alert(`${item.name} desequipado.`);
    }
    
    // Atualiza todos os painéis
    renderEquipment();
    renderInventory();
    updateEquipmentStats(); // Recalcula stats
    
    // Reinspeciona para atualizar o botão para "EQUIPAR" (se o item ainda existir no inventário)
    const itemInInventory = inventory.find(i => i.id === item.id);
    if (itemInInventory) {
        // Tenta inspecionar o item (agora no inventário)
        inspectItem(itemInInventory); 
    } else {
        document.getElementById('item-details-content').innerHTML = "<p>Selecione um item.</p>";
        inspectedItem = null;
    }
    
    saveGame();
}


// ====================================================================
// VII. FUNÇÕES DE TREINAMENTO/MISSÕES
// ====================================================================

// 1. Inicia o Timer para Cooldowns (chamado em loadGame/finalizeCharacter)
function startMissionTimers() {
    // Garante que não haja timers duplicados
    for (const key in missionTimers) {
        clearInterval(missionTimers[key]);
    }
    
    // Inicia o loop de 1 segundo
    missionTimers.global = setInterval(() => {
        let needsRender = false;
        
        for (const key in missionCooldowns) {
            if (missionCooldowns[key] > 0) {
                missionCooldowns[key]--;
                needsRender = true;
            }
        }
        
        if (needsRender && currentPanel === 'training-panel') {
            renderMissions();
        }
        
        saveGame(); // Salva o cooldown a cada segundo
    }, 1000);
}

// 2. Inicia uma Missão de Treinamento
function startMission(key, duration, exp, gold) {
    if (missionCooldowns[key] > 0) {
        logMessage(`A Missão de ${key} ainda está em cooldown.`, 'energy');
        return;
    }
    
    logMessage(`Missão de ${key} iniciada. Duração: ${duration} segundos.`, 'energy');
    
    // Coloca a missão em cooldown
    missionCooldowns[key] = duration;
    
    // Renderiza imediatamente para mostrar o cooldown
    renderMissions();
    
    // Define a recompensa no final do cooldown
    setTimeout(() => {
        hero.exp += exp;
        hero.gold += gold;
        logMessage(`Missão de ${key} completa! Ganhou ${exp} EXP e ${gold} Ouro.`, 'accent');
        checkLevelUp();
        renderAll();
        saveGame();
        renderMissions(); // Atualiza o botão para "INICIAR"
    }, duration * 1000);
}

// 3. Verifica e executa Level Up
function checkLevelUp() {
    let leveledUp = false;
    while (hero.exp >= hero.expToNextLevel) {
        hero.exp -= hero.expToNextLevel;
        hero.level++;
        hero.expToNextLevel = Math.floor(hero.expToNextLevel * 1.5);
        hero.baseHp += 10;
        hero.baseAttack += 2;
        hero.baseDefense += 1;
        hero.attributePoints += 3; // Pontos para distribuir
        
        // Cura total ao subir de nível
        hero.currentHp = getStatValue('baseHp');
        
        logMessage(`*** PARABÉNS! Você alcançou o Nível ${hero.level}! (+3 Pontos de Atributo) ***`, 'accent');
        leveledUp = true;
    }
    if (leveledUp) {
        renderStats();
    }
}


// ====================================================================
// VIII. FUNÇÕES DE COMBATE
// ====================================================================

// 1. Seleção de Área (simplesmente inicia um combate)
function selectArea(areaName) {
    logMessage(`Você está explorando a ${areaName}.`, 'combat');
    const monsterList = MONSTERS_BY_LEVEL[areaName];
    if (monsterList && monsterList.length > 0) {
        // Seleciona um monstro aleatório
        const enemyDef = monsterList[Math.floor(Math.random() * monsterList.length)];
        startCombat(enemyDef);
    } else {
        logMessage("Nenhum inimigo encontrado nesta área.", 'combat');
    }
}

// 2. Inicia o Combate
function startCombat(enemyDef) {
    if (currentEnemy) {
        logMessage(`Você já está em combate contra ${currentEnemy.name}!`, 'combat');
        return;
    }

    // Clona a definição do inimigo para criar uma instância de combate
    currentEnemy = JSON.parse(JSON.stringify(enemyDef));
    currentEnemy.currentHp = currentEnemy.hp;
    
    // Atualiza o display do inimigo
    document.querySelector('#enemy-display img').src = currentEnemy.image;
    document.querySelector('#enemy-display img').alt = currentEnemy.name;
    document.querySelector('#enemy-display .progress-bar-container').classList.remove('hidden'); // Mostra barra de HP
    
    updateHpBar(currentEnemy, 'enemy-hp-bar');
    
    logMessage(`*** Você encontrou ${currentEnemy.name} (Lv ${currentEnemy.level})! ***`, 'combat');
    
    document.getElementById('combat-actions').classList.remove('hidden');
    // startBattleLoop(); // Para o loop em tempo real (não implementado aqui)
}

// 3. Executa um ataque básico
function performAttack() {
    if (!currentEnemy) {
        logMessage("Você não está em combate.", 'combat');
        return;
    }
    
    // --- Turno do Herói ---
    let heroDamage = getStatValue('baseAttack');
    
    // Chance de Crítico (exemplo simples)
    if (Math.random() * 100 < getStatValue('critChance')) {
        heroDamage *= 2; // Dano Crítico
        logMessage(`CRÍTICO! ${hero.name} ataca ${currentEnemy.name} com força dobrada!`, 'accent');
    }
    
    // Redução por Defesa do Inimigo
    heroDamage = Math.max(1, heroDamage - currentEnemy.defense);
    
    currentEnemy.currentHp -= heroDamage;
    
    logMessage(`${hero.name} causa ${heroDamage.toFixed(0)} de dano em ${currentEnemy.name}.`, 'hp');
    updateHpBar(currentEnemy, 'enemy-hp-bar');

    // Checa Vitória
    if (currentEnemy.currentHp <= 0) {
        winCombat();
        return;
    }
    
    // --- Turno do Inimigo ---
    setTimeout(enemyTurn, 1000); // Espera 1 segundo para o turno do inimigo
}

// 4. Executa um ataque de Skill (placeholder)
function performSkill(skillName) {
    logMessage(`Você usou a habilidade: ${skillName}! (Ataque Básico simulado por enquanto)`, 'combat');
    performAttack(); // Simplesmente usa o ataque básico por enquanto
}

// 5. Turno do Inimigo
function enemyTurn() {
    if (!currentEnemy) return;

    let enemyDamage = currentEnemy.attack;
    
    // Redução por Defesa do Herói
    enemyDamage = Math.max(1, enemyDamage - getStatValue('baseDefense'));
    
    hero.currentHp -= enemyDamage;
    
    logMessage(`${currentEnemy.name} ataca e causa ${enemyDamage.toFixed(0)} de dano em ${hero.name}.`, 'combat');
    updateHpBar(hero, 'hero-hp-bar');
    
    // Checa Derrota
    if (hero.currentHp <= 0) {
        loseCombat();
        return;
    }
    
    saveGame(); // Salva o estado após o turno
}

// 6. Vitória no Combate
function winCombat() {
    logMessage(`*** Você derrotou ${currentEnemy.name}! ***`, 'accent');
    
    hero.exp += currentEnemy.expDrop;
    hero.gold += currentEnemy.goldDrop;
    
    logMessage(`Ganhou ${currentEnemy.expDrop} EXP e ${currentEnemy.goldDrop} Ouro.`, 'accent');
    
    // Drop de Itens (exemplo)
    if (Math.random() < 0.2) { // 20% de chance de drop
        addItem({ id: 200, name: "Essência de Monstro", type: "material", description: "Pode ser usada para forjar", icon: '💎', count: 1 });
    }
    
    currentEnemy = null;
    document.getElementById('combat-actions').classList.add('hidden');
    
    checkLevelUp();
    renderAll();
    saveGame();
}

// 7. Derrota no Combate
function loseCombat() {
    logMessage(`*** Você foi derrotado por ${currentEnemy.name}! ***`, 'combat');
    logMessage(`Você perde 10% do seu ouro atual.`, 'combat');
    
    hero.gold = Math.floor(hero.gold * 0.9);
    
    // Cura o herói totalmente
    hero.currentHp = getStatValue('baseHp'); 
    
    currentEnemy = null;
    document.getElementById('combat-actions').classList.add('hidden');
    
    renderAll();
    saveGame();
}


// ====================================================================
// IX. FUNÇÕES DE ÁUDIO E UTILITÁRIOS
// ====================================================================

// Placeholder para Audio: O áudio precisa ser inicializado por uma interação do usuário
const backgroundMusic = new Audio('./assets/game_music.mp3'); // Altere o caminho para sua música

function initAudio() {
    if (hasInteracted && backgroundMusic.paused) {
        backgroundMusic.loop = true;
        backgroundMusic.volume = document.getElementById('volume-slider').value;
        // backgroundMusic.play().catch(e => console.log("Áudio não pôde iniciar sem interação recente."));
    }
}

function changeVolume(volume) {
    backgroundMusic.volume = volume;
    if (volume > 0) {
        backgroundMusic.muted = false;
        document.getElementById('mute-button').textContent = '🔊';
    } else {
        backgroundMusic.muted = true;
        document.getElementById('mute-button').textContent = '🔇';
    }
}

function toggleMute() {
    backgroundMusic.muted = !backgroundMusic.muted;
    document.getElementById('mute-button').textContent = backgroundMusic.muted ? '🔇' : '🔊';
    // Se desmutado, tenta tocar
    if (!backgroundMusic.muted) {
        backgroundMusic.play().catch(e => console.log("Áudio não pôde iniciar."));
    }
}

// Adiciona uma mensagem ao log de combate
function logMessage(message, style = 'text') {
    const logPanel = document.getElementById('combat-log');
    const colorMap = {
        'combat': '#c0392b',
        'accent': '#f39c12',
        'soul': '#9b59b6',
        'energy': '#3498db',
        'hp': '#2ecc71',
        'text': '#e0e0e0',
        'border': '#4a4a68'
    };
    const color = colorMap[style] || colorMap['text'];
    
    const time = new Date().toLocaleTimeString();
    logPanel.innerHTML += `<span style="color: ${color};">[${time}] ${message}</span><br>`;
    logPanel.scrollTop = logPanel.scrollHeight; // Rola para o fim
}

// ====================================================================
// X. INICIALIZAÇÃO AO CARREGAR A PÁGINA
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Tenta carregar o jogo ao carregar a página. 
    // Se for carregado, o menu inicial é escondido dentro de loadGame.
    const loaded = loadGame(false);
    
    // Se não houver save, o menu inicial permanece visível.
    if (!loaded) {
         document.getElementById('start-menu').classList.remove('hidden');
    }
    
    // Adicionar um listener para a primeira interação do usuário, para iniciar o áudio.
    document.body.addEventListener('click', initAudio, { once: true });
});
