class DistributionMatcher {
    constructor() {
        this.distributions = [];
        this.plots = {
            histogram: [], // a, b, c
            box: [],     // 1, 2, 3  
            qq: []       // I, II, III
        };
        this.currentSelection = {
            histogram: null,
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
            // Бимодальное (два пика)
            () => {
                const data1 = this.generateNormal(25, 8, 150);
                const data2 = this.generateNormal(75, 8, 150);
                return this.clampData(data1.concat(data2));
            },
            // Нормальное распределение
            () => this.clampData(this.generateNormal(50, 15, 300)),
            // Асимметричное (скошенное вправо)
            () => {
                const data = this.generateNormal(30, 10, 300);
                return this.clampData(data.map(x => x * 1.5 + 20));
            },
            // Узкое нормальное
            () => this.clampData(this.generateNormal(50, 5, 300)),
            // Узкое с выбросами
            () => {
                const mainData = this.generateNormal(50, 5, 280);
                const outliers = this.generateNormal(90, 2, 10)
                             .concat(this.generateNormal(10, 2, 10));
                return this.clampData(mainData.concat(outliers));
            },
            // Широкое нормальное
            () => this.clampData(this.generateNormal(50, 25, 300))
        ];

        // Выбираем 3 случайных распределения
        const shuffled = [...generators].sort(() => Math.random() - 0.5);
        this.distributions = shuffled.slice(0, 3).map((generator, index) => ({
            id: index,
            data: generator(),
            label: String.fromCharCode(97 + index) // a, b, c
        }));

        console.log('Generated distributions:', this.distributions);
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

    clampData(data) {
        // Ограничиваем значения от 0 до 100
        return data.map(x => Math.max(0, Math.min(100, x)));
    }

    createPlots() {
        // Очищаем предыдущие графики
        this.plots = { histogram: [], box: [], qq: [] };
        
        console.log('Creating plots for distributions...');
        
        // Создаем графики для каждого распределения
        this.distributions.forEach(dist => {
            console.log(`Distribution ${dist.id}:`, dist.data.slice(0, 5), '...');

            // Histogram plot
            const histogramData = this.createHistogramPlot(dist.data);
            this.plots.histogram.push({
                type: 'histogram',
                data: histogramData,
                distributionId: dist.id,
                label: dist.label,
                id: `histogram-${dist.id}`
            });
            
            // Box plot
            const boxData = this.createBoxPlot(dist.data);
            this.plots.box.push({
                type: 'box',
                data: boxData,
                distributionId: dist.id,
                label: (this.plots.box.length + 1).toString(),
                id: `box-${dist.id}`
            });
            
            // QQ plot
            const qqData = this.createQQPlot(dist.data);
            this.plots.qq.push({
                type: 'qq',
                data: qqData,
                distributionId: dist.id,
                label: ['I', 'II', 'III'][this.plots.qq.length],
                id: `qq-${dist.id}`
            });
        });

        // Перемешиваем графики внутри каждой категории
        this.shuffleArray(this.plots.histogram);
        this.shuffleArray(this.plots.box);
        this.shuffleArray(this.plots.qq);

        // Сохраняем правильные соответствия
        this.correctMatches = {};
        this.distributions.forEach(dist => {
            this.correctMatches[dist.id] = {
                histogram: this.plots.histogram.find(p => p.distributionId === dist.id).label,
                box: this.plots.box.find(p => p.distributionId === dist.id).label,
                qq: this.plots.qq.find(p => p.distributionId === dist.id).label
            };
        });

        console.log('Plots created:', this.plots);
        console.log('Correct matches:', this.correctMatches);
    }

    createHistogramPlot(data) {
        return {
            x: data,
            type: 'histogram',
            nbinsx: 20,
            marker: {
                color: 'rgba(31, 119, 180, 0.7)',
                line: {
                    color: '#1f77b4',
                    width: 1
                }
            },
            opacity: 0.7
        };
    }

    createBoxPlot(data) {
        return {
            y: data,
            type: 'box',
            boxpoints: false,
            marker: { color: '#ff7f0e' },
            line: { color: '#ff7f0e' }
        };
    }

    createQQPlot(data) {
        const sortedData = [...data].sort((a, b) => a - b);
        const theoreticalQuantiles = this.generateTheoreticalQuantiles(sortedData.length);
        
        return [
            // Основные точки
            {
                x: theoreticalQuantiles,
                y: sortedData,
                type: 'scatter',
                mode: 'markers',
                marker: { color: '#2ca02c', size: 5 },
                name: 'QQ Plot'
            },
            // Линия y=x для сравнения
            {
                x: [-3, 3],
                y: [-3, 3],
                type: 'scatter',
                mode: 'lines',
                line: { color: 'red', width: 1, dash: 'dash' },
                showlegend: false
            }
        ];
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
        // Простая аппроксимация квантиля нормального распределения
        if (p <= 0 || p >= 1) return 0;
        if (p < 0.5) return -this.normalQuantile(1 - p);
        
        const t = Math.sqrt(-2 * Math.log(1 - p));
        const c0 = 2.515517;
        const c1 = 0.802853;
        const c2 = 0.010328;
        const d1 = 1.432788;
        const d2 = 0.189269;
        const d3 = 0.001308;
        
        return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    }

    renderPlots() {
        this.renderPlotCategory('histogram', 'histogram-plots');
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
            margin: { t: 10, r: 10, b: 40, l: 50 },
            height: 200,
            showlegend: false,
            xaxis: { 
                showgrid: true, 
                zeroline: false,
                range: plot.type === 'qq' ? [-3, 3] : [0, 100]
            },
            yaxis: { 
                showgrid: true, 
                zeroline: false,
                range: plot.type === 'qq' ? [0, 100] : undefined
            }
        };

        if (plot.type === 'qq') {
            layout.xaxis.title = 'Теоретические квантили';
            layout.yaxis.title = 'Выборочные квантили';
        } else if (plot.type === 'histogram') {
            layout.xaxis.title = 'Значение';
            layout.yaxis.title = 'Частота';
            layout.bargap = 0.1;
        } else {
            layout.yaxis.title = 'Значение';
            layout.xaxis = { showticklabels: false, title: '' };
        }

        // Для QQ-plot передаем оба трейса
        const data = Array.isArray(plot.data) ? plot.data : [plot.data];
        
        Plotly.newPlot(containerId, data, layout, {displayModeBar: false});
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
            match.histogram === plot.label && plot.type === 'histogram' ||
            match.box === plot.label && plot.type === 'box' || 
            match.qq === plot.label && plot.type === 'qq'
        );
    }

    isPlotInFoundMatch(category, label) {
        return this.foundMatches.some(match => match[category] === label);
    }

    updateSelectionDisplay() {
        document.getElementById('histogram-selection').textContent = this.currentSelection.histogram || '-';
        document.getElementById('box-selection').textContent = this.currentSelection.box || '-';
        document.getElementById('qq-selection').textContent = this.currentSelection.qq || '-';
    }

    checkSelection() {
        const { histogram, box, qq } = this.currentSelection;
        
        if (!histogram || !box || !qq) {
            this.showResult('Выберите по одному графику из каждой категории!', 'error');
            return;
        }

        // Проверяем, является ли выбранная тройка правильной
        const distributionId = this.findDistributionForSelection();
        
        if (distributionId !== -1) {
            // Правильное сопоставление!
            this.foundMatches.push({ histogram, box, qq });
            this.showResult(`Верно! Вы нашли правильную тройку ${histogram}-${box}-${qq}`, 'success');
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
        const { histogram, box, qq } = this.currentSelection;
        
        for (let distId = 0; distId < 3; distId++) {
            const correct = this.correctMatches[distId];
            if (correct.histogram === histogram && correct.box === box && correct.qq === qq) {
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
        this.currentSelection = { histogram: null, box: null, qq: null };
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
        this.plots = { histogram: [], box: [], qq: [] };
        this.currentSelection = { histogram: null, box: null, qq: null };
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
