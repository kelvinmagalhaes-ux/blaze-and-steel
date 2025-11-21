let selectedClass = null;

// Estatísticas base para cada classe
const classStats = {
    guerreiro: { hp: 120, atk: 12, def: 15, spd: 8, int: 5 },
    mago: { hp: 80, atk: 18, def: 6, spd: 10, int: 20 },
    arqueiro: { hp: 90, atk: 14, def: 8, spd: 15, int: 8 },
    assassino: { hp: 85, atk: 20, def: 5, spd: 20, int: 10 }
};

// Informações completas para cada classe
const classInfo = {
    guerreiro: {
        name: 'Guerreiro',
        description: 'Um combatente corpo a corpo resistente, especializado em resistência e defesa. Excelente para iniciantes.',
        stats: classStats.guerreiro,
        abilities: '• Ataque Poderoso: Causa 20% a mais de dano com espadas\n• Armadura Pesada: Reduz o dano recebido em 15%\n• Fúria do Guerreiro: Aumenta o ataque em 25% quando a vida está abaixo de 30%'
    },
    mago: {
        name: 'Mago',
        description: 'Um poderoso conjurador de magias, com grande poder ofensivo mas pouca defesa.',
        stats: classStats.mago,
        abilities: '• Bola de Fogo: Causa dano em área\n• Escudo Arcano: Absorve dano mágico\n• Intelecto Elevado: Regenera mana 50% mais rápido'
    },
    arqueiro: {
        name: 'Arqueiro',
        description: 'Especialista em ataques à distância, com grande mobilidade e precisão.',
        stats: classStats.arqueiro,
        abilities: '• Tiro Preciso: Chance de acerto crítico aumentada\n• Flecha Veloz: Ataque básico mais rápido\n• Fuga Ágil: Chance de esquiva aumentada em 15%'
    },
    assassino: {
        name: 'Assassino',
        description: 'Mestre do combate furtivo, causando danos massivos em ataques surpresa.',
        stats: classStats.assassino,
        abilities: '• Golpe Fatal: Chance de causar dano triplo\n• Furtividade: Pode se esconder da visão dos inimigos\n• Precisão Mortal: Ataques críticos causam sangramento'
    }
};

function selectClass(cls) {
    selectedClass = cls;
    document.querySelectorAll('.class-option').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    updateClassInfo(cls);
    validateCreation();
}

function validateCreation() {
    const name = document.getElementById('hero-name').value.trim();
    document.getElementById('btn-create').disabled = !(name.length > 1 && selectedClass);
}

document.getElementById('hero-name').addEventListener('input', validateCreation);

// Função para atualizar a exibição das informações da classe
function updateClassInfo(className) {
    const info = classInfo[className];
    const stats = info.stats;
    
    // Atualiza o nome e descrição
    document.getElementById('class-name').textContent = info.name;
    document.getElementById('class-description').textContent = info.description;
    document.getElementById('class-abilities').innerHTML = info.abilities.replace(/\n/g, '<br>');
    
    // Atualiza as barras de status
    const maxStats = {
        hp: 150,
        atk: 25,
        def: 20,
        spd: 25,
        int: 25
    };
    
    // Atualiza cada barra de status
    Object.keys(stats).forEach(stat => {
        const value = stats[stat];
        const percentage = (value / maxStats[stat]) * 100;
        
        document.getElementById(`${stat}-bar`).style.width = `${percentage}%`;
        document.getElementById(`${stat}-value`).textContent = value;
    });
    
    // Mostra o painel de estatísticas
    document.querySelector('.class-stats').style.display = 'block';
    document.querySelector('#class-info h3').style.display = 'none';
}

function finalizeCreation() {
    console.log('Função finalizeCreation() chamada');
    const name = document.getElementById('hero-name').value.trim();
    console.log('Nome do personagem:', name);
    console.log('Classe selecionada:', selectedClass);
    
    if (!selectedClass || name.length < 2) {
        console.log('Erro: Nome muito curto ou classe não selecionada');
        alert('Por favor, insira um nome com pelo menos 2 caracteres e selecione uma classe.');
        return;
    }

    try {
        // Salva os dados do personagem para usar no jogo
        const characterData = {
            name: name,
            class: selectedClass,
            level: 1,
            exp: 0,
            stats: classStats[selectedClass],
            inventory: [],
            // Adicione mais atributos conforme necessário
        };
        
        console.log('Dados do personagem a serem salvos:', characterData);
        localStorage.setItem('characterData', JSON.stringify(characterData));
        console.log('Dados salvos no localStorage');
        
        // Redireciona para o mapa mundi
        console.log('Redirecionando para o mapa mundi...');
        window.location.href = '../pages/mapa-mundi.html';
    } catch (error) {
        console.error('Erro ao salvar personagem:', error);
        alert('Ocorreu um erro ao criar o personagem. Por favor, tente novamente.');
    }
}
