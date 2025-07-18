      // Estado global
        let draggedElement = null;
        let dragOffset = { x: 0, y: 0 };
        let windowZ = 100;
        let currentPlanet = null;
        let animationsEnabled = true;
        let todos = [];
        let timerInterval = null;
        let timeLeft = 1500; // 25 minutos em segundos

        // Ferramentas disponíveis
        const tools = [
            { name: 'To-do List', icon: '📝', color: '#5CE1E6', tool: 'todo' },
            { name: 'Pomodoro', icon: '⏰', color: '#22C55E', tool: 'pomodoro' },
            { name: 'Notas', icon: '📒', color: '#7C3AED', tool: 'notes' },
            { name: 'Calculadora', icon: '🔢', color: '#F59E0B', tool: 'calculator' },
            { name: 'Calendário', icon: '📅', color: '#EF4444', tool: 'calendar' },
            { name: 'Sons Lo-Fi', icon: '🎵', color: '#8B5CF6', tool: 'music' }
        ];

        // Cores disponíveis
        const colors = ['#5CE1E6', '#22C55E', '#7C3AED', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            createParticles();
            initializeGalaxy();
            setupEventListeners();
        });

        // Criar partículas de fundo
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            for (let i = 0; i < 50; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 8 + 's';
                particlesContainer.appendChild(particle);
            }
        }

        // Inicializar galáxia
        function initializeGalaxy() {
            const galaxy = document.getElementById('galaxy');
            tools.forEach((tool, index) => {
                const planet = createPlanet(tool, index);
                galaxy.appendChild(planet);
            });
        }

        // Criar planeta
        function createPlanet(tool, index) {
            const planet = document.createElement('div');
            planet.className = 'planet';
            planet.style.backgroundColor = tool.color;
            planet.innerHTML = tool.icon;
            planet.dataset.tool = tool.tool;
            planet.dataset.name = tool.name;
            planet.id = `planet-${index}`;

            // Posição inicial aleatória
            const x = Math.random() * (window.innerWidth - 100) + 50;
            const y = Math.random() * (window.innerHeight - 200) + 100;
            planet.style.left = x + 'px';
            planet.style.top = y + 'px';

            return planet;
        }

        // Event listeners
        function setupEventListeners() {
            // Drag and drop
            document.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            // Menu contextual
            document.addEventListener('contextmenu', handleContextMenu);
            document.addEventListener('click', hideContextMenu);

            // Fechar janela com ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeAllWindows();
                }
            });
        }

        // Manipulação de drag
        function handleMouseDown(e) {
            if (e.target.classList.contains('planet')) {
                draggedElement = e.target;
                const rect = draggedElement.getBoundingClientRect();
                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;
                draggedElement.style.zIndex = '10';
            } else if (e.target.classList.contains('window-header')) {
                draggedElement = e.target.parentElement;
                const rect = draggedElement.getBoundingClientRect();
                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;
                draggedElement.style.zIndex = ++windowZ;
            }
        }

        function handleMouseMove(e) {
            if (draggedElement) {
                const x = e.clientX - dragOffset.x;
                const y = e.clientY - dragOffset.y;
                draggedElement.style.left = x + 'px';
                draggedElement.style.top = y + 'px';
            }
        }

        function handleMouseUp() {
            if (draggedElement && draggedElement.classList.contains('planet')) {
                draggedElement.style.zIndex = '2';
            }
            draggedElement = null;
        }

        // Menu contextual
        function handleContextMenu(e) {
            if (e.target.classList.contains('planet')) {
                e.preventDefault();
                currentPlanet = e.target;
                const menu = document.getElementById('contextMenu');
                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            }
        }

        function hideContextMenu() {
            document.getElementById('contextMenu').style.display = 'none';
        }

        // Abrir ferramenta
        function openTool() {
            if (currentPlanet) {
                const toolType = currentPlanet.dataset.tool;
                const toolName = currentPlanet.dataset.name;
                createWindow(toolName, toolType);
            }
            hideContextMenu();
        }

        // Criar janela
        function createWindow(title, toolType) {
            const window = document.createElement('div');
            window.className = 'window';
            window.style.left = '50%';
            window.style.top = '50%';
            window.style.transform = 'translate(-50%, -50%)';
            window.style.zIndex = ++windowZ;

            const header = document.createElement('div');
            header.className = 'window-header';
            header.innerHTML = `
                <div class="window-title">${title}</div>
                <button class="window-close" onclick="closeWindow(this)">×</button>
            `;

            const content = document.createElement('div');
            content.className = 'window-content';
            content.innerHTML = getToolContent(toolType);

            window.appendChild(header);
            window.appendChild(content);
            document.body.appendChild(window);

            // Inicializar ferramenta
            initializeTool(toolType, content);
        }

        // Conteúdo das ferramentas
        function getToolContent(toolType) {
            switch (toolType) {
                case 'todo':
                    return `
                        <input type="text" class="todo-input" placeholder="Nova tarefa..." onkeypress="if(event.key==='Enter') addTodo(this)">
                        <button class="add-btn" onclick="addTodo(this.previousElementSibling)">Adicionar</button>
                        <div id="todo-list"></div>
                    `;
                case 'pomodoro':
                    return `
                        <div class="timer-display" id="timer-display">25:00</div>
                        <div class="timer-controls">
                            <button class="timer-btn" onclick="startTimer()">Iniciar</button>
                            <button class="timer-btn" onclick="pauseTimer()">Pausar</button>
                            <button class="timer-btn" onclick="resetTimer()">Reset</button>
                        </div>
                    `;
                case 'notes':
                    return `
                        <textarea class="notes-textarea" placeholder="Suas anotações..." oninput="saveNotes(this)"></textarea>
                    `;
                case 'calculator':
                    return `
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 200px;">
                            <button class="timer-btn" onclick="calcInput('7')">7</button>
                            <button class="timer-btn" onclick="calcInput('8')">8</button>
                            <button class="timer-btn" onclick="calcInput('9')">9</button>
                            <button class="timer-btn" onclick="calcInput('+')">+</button>
                            <button class="timer-btn" onclick="calcInput('4')">4</button>
                            <button class="timer-btn" onclick="calcInput('5')">5</button>
                            <button class="timer-btn" onclick="calcInput('6')">6</button>
                            <button class="timer-btn" onclick="calcInput('-')">-</button>
                            <button class="timer-btn" onclick="calcInput('1')">1</button>
                            <button class="timer-btn" onclick="calcInput('2')">2</button>
                            <button class="timer-btn" onclick="calcInput('3')">3</button>
                            <button class="timer-btn" onclick="calcInput('*')">×</button>
                            <button class="timer-btn" onclick="calcInput('0')">0</button>
                            <button class="timer-btn" onclick="calcClear()">C</button>
                            <button class="timer-btn" onclick="calcEquals()">=</button>
                            <button class="timer-btn" onclick="calcInput('/')">÷</button>
                        </div>
                        <input type="text" class="todo-input" id="calc-display" readonly style="margin-top: 10px; text-align: right; font-size: 18px;">
                    `;
                default:
                    return `<p>Ferramenta em desenvolvimento...</p>`;
            }
        }

        // Inicializar ferramenta
        function initializeTool(toolType, content) {
            switch (toolType) {
                case 'todo':
                    loadTodos();
                    break;
                case 'notes':
                    loadNotes(content);
                    break;
                case 'calculator':
                    window.calcResult = '';
                    break;
            }
        }

        // Funções do To-do
        function addTodo(input) {
            const text = input.value.trim();
            if (text) {
                todos.push({ text, completed: false });
                input.value = '';
                loadTodos();
            }
        }

        function loadTodos() {
            const list = document.getElementById('todo-list');
            if (list) {
                list.innerHTML = todos.map((todo, index) => `
                    <div class="todo-item">
                        <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${index})">
                        <span style="${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${todo.text}</span>
                        <button class="window-close" style="margin-left: auto;" onclick="removeTodo(${index})">×</button>
                    </div>
                `).join('');
            }
        }

        function toggleTodo(index) {
            todos[index].completed = !todos[index].completed;
            loadTodos();
        }

        function removeTodo(index) {
            todos.splice(index, 1);
            loadTodos();
        }

        // Funções do Pomodoro
        function startTimer() {
            if (!timerInterval) {
                timerInterval = setInterval(updateTimer, 1000);
            }
        }

        function pauseTimer() {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        function resetTimer() {
            clearInterval(timerInterval);
            timerInterval = null;
            timeLeft = 1500;
            updateTimerDisplay();
        }

        function updateTimer() {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                alert('Tempo esgotado!');
                resetTimer();
            }
        }

        function updateTimerDisplay() {
            const display = document.getElementById('timer-display');
            if (display) {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        // Funções das Notas
        function saveNotes(textarea) {
            // Salvar no localStorage seria ideal, mas usando variável por limitação
            window.notesContent = textarea.value;
        }

        function loadNotes(content) {
            const textarea = content.querySelector('.notes-textarea');
            if (textarea && window.notesContent) {
                textarea.value = window.notesContent;
            }
        }

        // Funções da Calculadora
        function calcInput(value) {
            const display = document.getElementById('calc-display');
            if (display) {
                display.value += value;
            }
        }

        function calcClear() {
            const display = document.getElementById('calc-display');
            if (display) {
                display.value = '';
            }
        }

        function calcEquals() {
            const display = document.getElementById('calc-display');
            if (display) {
                try {
                    const result = eval(display.value.replace('×', '*').replace('÷', '/'));
                    display.value = result;
                } catch (e) {
                    display.value = 'Erro';
                }
            }
        }

        // Fechar janela
        function closeWindow(button) {
            button.closest('.window').remove();
        }

        function closeAllWindows() {
            document.querySelectorAll('.window').forEach(window => window.remove());
        }

        // Mudar cor do planeta
        function changeColor() {
            if (currentPlanet) {
                const colorPalette = document.createElement('div');
                colorPalette.className = 'color-palette';
                colorPalette.innerHTML = colors.map(color => 
                    `<div class="color-option" style="background-color: ${color}" onclick="setPlanetColor('${color}')"></div>`
                ).join('');
                
                const window = document.createElement('div');
                window.className = 'window';
                window.style.left = '50%';
                window.style.top = '50%';
                window.style.transform = 'translate(-50%, -50%)';
                window.style.zIndex = ++windowZ;
                window.innerHTML = `
                    <div class="window-header">
                        <div class="window-title">Escolher Cor</div>
                        <button class="window-close" onclick="closeWindow(this)">×</button>
                    </div>
                    <div class="window-content">
                        <p>Selecione uma cor para o planeta:</p>
                        ${colorPalette.outerHTML}
                    </div>
                `;
                document.body.appendChild(window);
            }
            hideContextMenu();
        }

        function setPlanetColor(color) {
            if (currentPlanet) {
                currentPlanet.style.backgroundColor = color;
                closeAllWindows();
            }
        }

        // Remover planeta
        function removePlanet() {
            if (currentPlanet) {
                currentPlanet.remove();
            }
            hideContextMenu();
        }

        // Controles da header
        function resetGalaxy() {
            document.getElementById('galaxy').innerHTML = '';
            initializeGalaxy();
        }

        function toggleAnimations() {
            animationsEnabled = !animationsEnabled;
            const particles = document.getElementById('particles');
            particles.style.display = animationsEnabled ? 'block' : 'none';
        }

        function addPlanet() {
            const randomTool = tools[Math.floor(Math.random() * tools.length)];
            const planet = createPlanet(randomTool, Date.now());
            document.getElementById('galaxy').appendChild(planet);
        }

        // Clique simples para abrir ferramenta
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('planet') && !draggedElement) {
                const toolType = e.target.dataset.tool;
                const toolName = e.target.dataset.name;
                createWindow(toolName, toolType);
            }
        });
  
