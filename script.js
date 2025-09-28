class DistributionMatcher {
    constructor() {
        this.distributions = [];
        this.plots = {
            density: [], // a, b, c
            box: [],     // 1, 2, 3  
            qq: []       // I, II, III
        };
        this.currentSelection = {
            density: null,
            box: null,
            qq: null
        };
        this.foundMatches = [];
        this.correctMatches = {};
        this.init();
    }

    init() {
        this.generateDistributions();
        this.createPlots();
        this.renderPlots();
        this.setupEventListeners();
        this.updateSelectionDisplay();
    }

    generateDistributions() {
        const generators = [
            // Бимодальное
            () => {
                const data1 = this.generateNormal(-2, 0.8, 150);
                const data2 = this.generateNormal(2, 0.8, 150);
                return data1.concat(data2);
            },
            // Нормальное
            () => this.generateNormal(0, 1, 300),
            // Асимметричное
            () => {
                const data = this.generateNormal(0, 1, 300);
                return data.map(x => Math.exp(x * 0.6) - 1);
            },
            // Узкое нормальное
            () => this.generateNormal(0, 0.4, 300),
            // Узкое с выбросами
            () => {
                const mainData = this.generateNormal(0, 0.3, 280);
                const outliers = this.generateNormal(4, 0.2, 10)
                             .concat(this.generateNormal(-4, 0.2, 10));
                return mainData.concat(outliers);
            },
            // Широкое нормальное
            () => this.generateNormal(0, 2, 300)
        ];

        // Выбираем 3 случайных распределения
        const shuffled = [...generators].sort(() => Math.random() - 0.5);
        this.distributions = shuffled.slice(0, 3).map((generator, index) => ({
            id: index,
            data: generator(),
            label: String.fromCharCode(97 + index) // a, b, c
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
        // Очищаем предыдущие графики
        this.plots = { density: [], box: [], qq: [] };
        
        // Создаем графики для каждого распределения
        this.distributions.forEach(dist => {
            // Density plot
            this.plots.density.push({
                type: 'density',
                data: this.createDensityPlot(dist.data),
                distributionId: dist.id,
                label: dist.label,
                id: `density-${dist.id}`
            });
            
            // Box plot
            this.plots.box.push({
                type: 'box',
                data: this.createBoxPlot(dist.data),
                distributionId: dist.id,
                label: (this.plots.box.length + 1).toString(),
                id: `box-${dist.id}`
            });
            
            // QQ plot
            this.plots.qq.push({
                type: 'qq',
                data: this.createQQPlot(dist.data),
                distributionId: dist.id,
                label: ['I', 'II', 'III'][this.plots.qq.length],
                id: `qq-${dist.id}`
            });
        });

        // Перемешиваем графики внутри каждой категории
        this.shuffleArray(this.plots.density);
        this.shuffleArray(this.plots.box);
        this.shuffleArray(this.plots.qq);

        // Сохраняем правильные соответствия
        this.correctMatches = {};
        this.distributions.forEach(dist => {
            this.correctMatches[dist.id] = {
                density: this.plots.density.find(p => p.distributionId === dist.id).label,
                box: this.plots.box.find(p => p.distributionId === dist.id).label,
                qq: this.plots.qq.find(p => p.distributionId === dist.id).label
            };
        });
    }

    createDensityPlot(data) {
        const kde = this.kde(data);
        return {
            x: kde.x,
            y: kde.y,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#1f77b4', width: 3 }
        };
    }

    createBoxPlot(data) {
        return {
            y: data,
            type: 'box',
            boxpoints: false,
            marker: { color: '#ff7f0e' }
        };
    }

    createQQPlot(data) {
        const sortedData = [...data].sort((a, b) => a - b);
        const theoreticalQuantiles = this.generateTheoreticalQuantiles(sortedData.length);
        
        return {
            x: theoreticalQuantiles,
            y: sortedData,
            type: 'scatter',
            mode: 'markers',
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

    renderPlots() {
        this.renderPlotCategory('density', 'density-plots');
        this.renderPlotCategory('box', 'box-plots');
        this.renderPlotCategory('qq', 'qq-plots');
    }

    renderPlotCategory(category, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        this.plots[category].forEach(plot => {
            const plotDiv = document.createElement('div');
            plotDiv.className = `plot-wrapper ${this.isPlotSelected(category, plot.label) ? 'selected' : ''} ${this.isPlotMatched(plot) ? 'matched' : ''}`;
            plotDiv.dataset.category = category;
            plotDiv.dataset.label = plot.label;
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'plot-label';
            labelDiv.textContent = plot.label;
            
            const plotContainer = document.createElement('div');
            plotContainer.className = 'plot';
            plotContainer.id = `plot-${plot.id}`;
            
            plotDiv.appendChild(labelDiv);
            plotDiv.appendChild(plotContainer);
            plotDiv.addEventListener('click', () => this.selectPlot(category, plot.label));
            
            container.appendChild(plotDiv);
            
            // Рендерим график
            this.renderSinglePlot(plot, plotContainer.id);
        });
    }

    renderSinglePlot(plot, containerId) {
        const layout = {
            margin: { t: 10, r: 10, b: 30, l: 40 },
            height: 180,
            showlegend: false,
            xaxis: { showgrid: true, zeroline: false },
            yaxis: { showgrid: true, zeroline: false }
        };

        if (plot.type === 'qq') {
            layout.xaxis.title = 'Теор. квантили';
            layout.yaxis.title = 'Выб. квантили';
        } else if (plot.type === 'density') {
            layout.xaxis.title = 'Значение';
            layout.yaxis.title = 'Плотность';
        } else {
            layout.yaxis.title = 'Значение';
            layout.xaxis = { showticklabels: false };
        }

        Plotly.newPlot(containerId, [plot.data], layout, {displayModeBar: false});
    }

    selectPlot(category, label) {
        // Если этот график уже в найденной тройке - игнорируем
        if (this.isPlotInFoundMatch(category, label)) {
            return;
        }

        this.currentSelection[category] = label;
        this.updateSelectionDisplay();
        this.renderPlots(); // Перерисовываем для обновления выделения
    }

    isPlotSelected(category, label) {
        return this.currentSelection[category] === label;
    }

    isPlotMatched(plot) {
        return this.foundMatches.some(match => 
            match.density === plot.label && plot.type === 'density' ||
            match.box === plot.label && plot.type === 'box' || 
            match.qq === plot.label && plot.type === 'qq'
        );
    }

    isPlotInFoundMatch(category, label) {
        return this.foundMatches.some(match => match[category] === label);
    }

    updateSelectionDisplay() {
        document.getElementById('density-selection').textContent = this.currentSelection.density || '-';
        document.getElementById('box-selection').textContent = this.currentSelection.box || '-';
        document.getElementById('qq-selection').textContent = this.currentSelection.qq || '-';
    }

    checkSelection() {
        const { density, box, qq } = this.currentSelection;
        
        if (!density || !box || !qq) {
            this.showResult('Выберите по одному графику из каждой категории!', 'error');
            return;
        }

        // Проверяем, является ли выбранная тройка правильной
        const distributionId = this.findDistributionForSelection();
        
        if (distributionId !== -1) {
            // Правильное сопоставление!
            this.foundMatches.push({ density, box, qq });
            this.showResult(`Верно! Вы нашли правильную тройку ${density}-${box}-${qq}`, 'success');
            this.clearSelection();
            this.updateProgress();
            
            if (this.foundMatches.length === 3) {
                this.showResult('Поздравляем! Вы нашли все три тройки! Отличное понимание графиков!', 'final-success');
            }
        } else {
            this.showResult('Неверно! Эта тройка не соответствует одному распределению', 'error');
        }
    }

    findDistributionForSelection() {
        const { density, box, qq } = this.currentSelection;
        
        for (let distId = 0; distId < 3; distId++) {
            const correct = this.correctMatches[distId];
            if (correct.density === density && correct.box === box && correct.qq === qq) {
                return distId;
            }
        }
        return -1;
    }

    showResult(message, type) {
        const resultElement = document.getElementById('result');
        resultElement.textContent = message;
        resultElement.className = `result ${type}`;
        
        if (type !== 'final-success') {
            setTimeout(() => {
                if (resultElement.textContent === message) {
                    resultElement.textContent = '';
                    resultElement.className = 'result';
                }
            }, 3000);
        }
    }

    clearSelection() {
        this.currentSelection = { density: null, box: null, qq: null };
        this.updateSelectionDisplay();
        this.renderPlots();
    }

    updateProgress() {
        const progressCount = document.getElementById('progress-count');
        const progressFill = document.getElementById('progress-fill');
        
        progressCount.textContent = this.foundMatches.length;
        progressFill.style.width = `${(this.foundMatches.length / 3) * 100}%`;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    setupEventListeners() {
        document.getElementById('check-btn').addEventListener('click', () => {
            this.checkSelection();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.newGame();
        });
    }

    newGame() {
        this.distributions = [];
        this.plots = { density: [], box: [], qq: [] };
        this.currentSelection = { density: null, box: null, qq: null };
        this.foundMatches = [];
        this.correctMatches = {};
        
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = 'result';
        
        this.init();
        this.updateProgress();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new DistributionMatcher();
});
