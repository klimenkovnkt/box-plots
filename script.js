class DistributionMatcher {
    constructor() {
        this.distributions = [];
        this.plots = [];
        this.selectedDistribution = null;
        this.selectedPlot = null;
        this.correctMatches = {};
        this.init();
    }

    init() {
        this.generateDistributions();
        this.createPlots();
        this.renderDistributionsList();
        this.renderPlotsGrid();
        this.setupEventListeners();
    }

    generateDistributions() {
        const types = [
            {
                name: 'Бимодальное',
                generator: () => {
                    const data1 = this.generateNormal(-2, 0.8, 200);
                    const data2 = this.generateNormal(2, 0.8, 200);
                    return data1.concat(data2);
                }
            },
            {
                name: 'Нормальное',
                generator: () => this.generateNormal(0, 1, 400)
            },
            {
                name: 'Нормальное с асимметрией',
                generator: () => {
                    const data = this.generateNormal(0, 1, 400);
                    return data.map(x => Math.exp(x * 0.7)); // Логнормальное для асимметрии
                }
            },
            {
                name: 'Узкое нормальное',
                generator: () => this.generateNormal(0, 0.3, 400)
            },
            {
                name: 'Узкое с выбросами',
                generator: () => {
                    const mainData = this.generateNormal(0, 0.4, 380);
                    const outliers = this.generateNormal(5, 0.1, 10)
                                 .concat(this.generateNormal(-5, 0.1, 10));
                    return mainData.concat(outliers);
                }
            },
            {
                name: 'Широкое нормальное',
                generator: () => this.generateNormal(0, 2, 400)
            }
        ];

        // Выбираем 3 случайных распределения
        const shuffled = [...types].sort(() => Math.random() - 0.5);
        this.distributions = shuffled.slice(0, 3).map(dist => ({
            name: dist.name,
            data: dist.generator(),
            id: this.generateId()
        }));
    }

    generateNormal(mean, std, n) {
        const data = [];
        for (let i = 0; i < n; i++) {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            data.push(mean + std * z);
        }
        return data;
    }

    createPlots() {
        this.plots = [];
        
        this.distributions.forEach(dist => {
            // Density plot
            const densityTrace = this.createDensityPlot(dist.data, dist.name);
            
            // Box plot
            const boxTrace = this.createBoxPlot(dist.data, dist.name);
            
            // QQ plot
            const qqTrace = this.createQQPlot(dist.data, dist.name);
            
            this.plots.push(
                { type: 'density', data: densityTrace, distributionId: dist.id, id: this.generateId() },
                { type: 'box', data: boxTrace, distributionId: dist.id, id: this.generateId() },
                { type: 'qq', data: qqTrace, distributionId: dist.id, id: this.generateId() }
            );
        });

        // Перемешиваем графики
        this.shuffleArray(this.plots);
    }

    createDensityPlot(data, name) {
        const kde = this.kde(data);
        return {
            x: kde.x,
            y: kde.y,
            type: 'scatter',
            mode: 'lines',
            name: name,
            line: { color: '#1f77b4', width: 2 }
        };
    }

    createBoxPlot(data, name) {
        return {
            y: data,
            type: 'box',
            name: name,
            boxpoints: false,
            marker: { color: '#ff7f0e' }
        };
    }

    createQQPlot(data, name) {
        const sortedData = [...data].sort((a, b) => a - b);
        const theoreticalQuantiles = this.generateTheoreticalQuantiles(sortedData.length);
        
        return {
            x: theoreticalQuantiles,
            y: sortedData,
            type: 'scatter',
            mode: 'markers',
            name: name,
            marker: { color: '#2ca02c', size: 4 }
        };
    }

    generateTheoreticalQuantiles(n) {
        const quantiles = [];
        for (let i = 1; i <= n; i++) {
            const p = (i - 0.5) / n;
            quantiles.push(this.normalQuantile(p));
        }
        return quantiles;
    }

    normalQuantile(p) {
        // Аппроксимация квантиля нормального распределения
        if (p < 0.5) {
            return -this.normalQuantile(1 - p);
        }
        const t = Math.sqrt(-2 * Math.log(1 - p));
        const c0 = 2.515517;
        const c1 = 0.802853;
        const c2 = 0.010328;
        const d1 = 1.432788;
        const d2 = 0.189269;
        const d3 = 0.001308;
        
        return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    }

    kde(data, bandwidth = 0.5) {
        const xMin = Math.min(...data);
        const xMax = Math.max(...data);
        const x = Array.from({length: 200}, (_, i) => xMin + (xMax - xMin) * i / 200);

        const y = x.map(xi => {
            let sum = 0;
            for (const d of data) {
                const u = (xi - d) / bandwidth;
                sum += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
            }
            return sum / (data.length * bandwidth);
        });

        return {x, y};
    }

    renderDistributionsList() {
        const container = document.getElementById('distributions-list');
        container.innerHTML = '';
        
        this.distributions.forEach(dist => {
            const div = document.createElement('div');
            div.className = 'distribution-item';
            div.dataset.id = dist.id;
            div.innerHTML = `
                <span>${dist.name}</span>
                <div class="match-indicator"></div>
            `;
            div.addEventListener('click', () => this.selectDistribution(dist.id));
            container.appendChild(div);
        });
    }

    renderPlotsGrid() {
        const container = document.getElementById('plots-grid');
        container.innerHTML = '';
        
        this.plots.forEach((plot, index) => {
            const plotDiv = document.createElement('div');
            plotDiv.className = 'plot-item';
            plotDiv.dataset.id = plot.id;
            
            const plotContainer = document.createElement('div');
            plotContainer.id = `plot-${plot.id}`;
            plotContainer.className = 'plot-container';
            
            const typeLabel = document.createElement('div');
            typeLabel.className = 'plot-type';
            typeLabel.textContent = this.getPlotTypeName(plot.type);
            
            plotDiv.appendChild(typeLabel);
            plotDiv.appendChild(plotContainer);
            plotDiv.addEventListener('click', () => this.selectPlot(plot.id));
            
            container.appendChild(plotDiv);
            
            // Рендерим график
            this.renderPlot(plot, plotContainer.id);
        });
    }

    getPlotTypeName(type) {
        const names = {
            'density': 'Плотность вероятности',
            'box': 'Box-plot',
            'qq': 'QQ-plot'
        };
        return names[type];
    }

    renderPlot(plot, containerId) {
        const layout = {
            margin: { t: 30, r: 30, b: 40, l: 50 },
            height: 200,
            showlegend: false,
            xaxis: { showgrid: true },
            yaxis: { showgrid: true }
        };

        if (plot.type === 'qq') {
            layout.xaxis.title = 'Теоретические квантили';
            layout.yaxis.title = 'Выборочные квантили';
        } else if (plot.type === 'density') {
            layout.xaxis.title = 'Значение';
            layout.yaxis.title = 'Плотность';
        } else {
            layout.yaxis.title = 'Значение';
        }

        Plotly.newPlot(containerId, [plot.data], layout, {displayModeBar: false});
    }

    selectDistribution(distId) {
        // Снимаем выделение со всех распределений
        document.querySelectorAll('.distribution-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Выделяем выбранное
        const selected = document.querySelector(`.distribution-item[data-id="${distId}"]`);
        selected.classList.add('selected');
        
        this.selectedDistribution = distId;
        this.checkForMatch();
    }

    selectPlot(plotId) {
        // Снимаем выделение со всех графиков
        document.querySelectorAll('.plot-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Выделяем выбранный
        const selected = document.querySelector(`.plot-item[data-id="${plotId}"]`);
        selected.classList.add('selected');
        
        this.selectedPlot = plotId;
        this.checkForMatch();
    }

    checkForMatch() {
        if (this.selectedDistribution && this.selectedPlot) {
            const plot = this.plots.find(p => p.id === this.selectedPlot);
            const distribution = this.distributions.find(d => d.id === this.selectedDistribution);
            
            if (plot && distribution) {
                if (plot.distributionId === distribution.id) {
                    // Правильное сопоставление
                    this.correctMatches[this.selectedPlot] = this.selectedDistribution;
                    
                    // Показываем успех
                    this.showMatchSuccess(this.selectedPlot, this.selectedDistribution);
                    
                    // Сбрасываем выбор
                    this.selectedDistribution = null;
                    this.selectedPlot = null;
                    
                    // Проверяем завершение игры
                    this.checkGameCompletion();
                } else {
                    // Неправильное сопоставление
                    this.showMatchError();
                    this.clearSelection();
                }
            }
        }
    }

    showMatchSuccess(plotId, distId) {
        const plotElement = document.querySelector(`.plot-item[data-id="${plotId}"]`);
        const distElement = document.querySelector(`.distribution-item[data-id="${distId}"]`);
        
        plotElement.classList.add('matched');
        distElement.classList.add('matched');
        
        plotElement.querySelector('.match-indicator')?.remove();
        distElement.querySelector('.match-indicator').textContent = '✓';
    }

    showMatchError() {
        const resultElement = document.getElementById('result');
        resultElement.textContent = 'Неверное сопоставление! Попробуйте еще раз.';
        resultElement.className = 'result error';
        
        setTimeout(() => {
            resultElement.textContent = '';
            resultElement.className = 'result';
        }, 2000);
    }

    checkGameCompletion() {
        const matchedPlots = Object.keys(this.correctMatches).length;
        if (matchedPlots === this.plots.length) {
            const resultElement = document.getElementById('result');
            resultElement.textContent = 'Поздравляем! Все сопоставления верны! Вы отлично понимаете распределения!';
            resultElement.className = 'result success';
        }
    }

    clearSelection() {
        this.selectedDistribution = null;
        this.selectedPlot = null;
        document.querySelectorAll('.distribution-item, .plot-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    setupEventListeners() {
        document.getElementById('check-btn').addEventListener('click', () => {
            this.checkGameCompletion();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    resetGame() {
        this.distributions = [];
        this.plots = [];
        this.selectedDistribution = null;
        this.selectedPlot = null;
        this.correctMatches = {};
        
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = 'result';
        
        this.init();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new DistributionMatcher();
});
