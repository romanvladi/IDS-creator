// js/app.js

// Глобальные переменные
let currentIDS = {
    info: {
        title: 'Новая проверка',
        copyright: 'Пользователь',
        version: 'IFC4',
        author: 'user@example.com',
        date: new Date().toISOString().split('T')[0]
    },
    specifications: []
};

let selectedSpecId = null;
let parser = null;

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем парсер
    parser = new IDSParser();
    
    // Устанавливаем сегодняшнюю дату
    document.getElementById('infoDate').value = currentIDS.info.date;
    
    // Заполняем информацию о файле
    updateInfoFromCurrent();
    renderSpecifications();
    
    // Настраиваем обработчики событий
    setupEventListeners();

    // Добавляем инициализацию растягиваемой панели
    initResizablePanel();
});

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопки управления файлом
    document.getElementById('newFile').addEventListener('click', createNewFile);
    document.getElementById('openFile').addEventListener('click', openFile);
    document.getElementById('saveFile').addEventListener('click', saveFile);
    
    // Кнопка добавления спецификации
    document.getElementById('addSpec').addEventListener('click', addNewSpecification);
    
    // Поля информации о файле
    document.getElementById('infoTitle').addEventListener('input', updateInfoFromForm);
    document.getElementById('infoAuthor').addEventListener('input', updateInfoFromForm);
    document.getElementById('infoIfcVersion').addEventListener('change', updateInfoFromForm);
    document.getElementById('infoDate').addEventListener('change', updateInfoFromForm);
    document.getElementById('infoCopyright').addEventListener('input', updateInfoFromForm);
    
    // Поле имени файла в шапке
    document.querySelector('.filename').addEventListener('input', (e) => {
        currentIDS.info.title = e.target.value;
        //document.getElementById('infoTitle').value = e.target.value;//убрать
    });
}

/**
 * Создать новый файл
 */
function createNewFile() {
    if (confirm('Создать новый файл? Несохраненные изменения будут потеряны.')) {
        currentIDS = {
            info: {
                title: 'Новая проверка',
                copyright: 'Пользователь',
                version: 'IFC4',
                author: 'user@example.com',
                date: new Date().toISOString().split('T')[0]
            },
            specifications: []
        };
        
        // Обновляем интерфейс
        document.querySelector('.filename').value = 'Новый файл.ids';
        updateInfoFromCurrent();
        renderSpecifications();
        
        // Очищаем редактор
        selectedSpecId = null;
        document.getElementById('selectedSpecName').textContent = 'Не выбрано';
        document.getElementById('editorContent').innerHTML = '<p class="placeholder">Выберите спецификацию для редактирования</p>';
    }
}

/**
 * Открыть файл
 */
function openFile() {
    // Создаем скрытый input для загрузки файла
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ids,.xml';
    
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Парсим файл
                const parsed = parser.parse(e.target.result);
                
                // Обновляем текущий IDS
                currentIDS = parsed;
                
                // Обновляем имя файла в шапке
                document.querySelector('.filename').value = file.name;
                
                // Обновляем информацию о файле
                updateInfoFromCurrent();
                
                // Отрисовываем спецификации
                renderSpecifications();
                
                // Сбрасываем выделение
                selectedSpecId = null;
                document.getElementById('selectedSpecName').textContent = 'Не выбрано';
                document.getElementById('editorContent').innerHTML = '<p class="placeholder">Выберите спецификацию для редактирования</p>';
                
            } catch (error) {
                alert('Ошибка при загрузке файла: ' + error.message);
                createNewFile();
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

/**
 * Сохранить файл
 */
function saveFile() {
    try {
        // Генерируем XML
        const xmlString = parser.generateXML(currentIDS);
        
        // Создаем blob для скачивания
        const blob = new Blob([xmlString], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        // Создаем ссылку для скачивания
        const a = document.createElement('a');
        a.href = url;
        a.download = document.querySelector('.filename').value || 'specification.ids';
        a.click();
        
        // Очищаем URL
        URL.revokeObjectURL(url);
        
    } catch (error) {
        alert('Ошибка при сохранении: ' + error.message);
    }
}

/**
 * Обновить информацию о файле из currentIDS
 */
function updateInfoFromCurrent() {
    document.getElementById('infoTitle').value = currentIDS.info.title || '';
    document.getElementById('infoAuthor').value = currentIDS.info.author || '';
    document.getElementById('infoIfcVersion').value = currentIDS.info.version || 'IFC4';
    document.getElementById('infoDate').value = currentIDS.info.date || new Date().toISOString().split('T')[0];
    document.getElementById('infoCopyright').value = currentIDS.info.copyright || 'Пользователь';
}

/**
 * Обновить currentIDS из формы
 */
function updateInfoFromForm() {
    currentIDS.info.title = document.getElementById('infoTitle').value;
    currentIDS.info.author = document.getElementById('infoAuthor').value;
    currentIDS.info.version = document.getElementById('infoIfcVersion').value;
    currentIDS.info.date = document.getElementById('infoDate').value;
    currentIDS.info.copyright = document.getElementById('infoCopyright').value;
}

/**
 * Добавить новую спецификацию
 */
function addNewSpecification() {
    const newSpec = {
        id: `spec_${Date.now()}`,
        name: `Новая спецификация ${currentIDS.specifications.length + 1}`,
        ifcVersion: 'IFC4',
        applicability: {
            rules: [
                {
                    type: 'entity',
                    field: 'name',
                    condition: 'equals',
                    value: 'IfcWall',
                    displayType: 'Сущность IFC'
                }
            ]
        },
        requirements: {
            rules: []
        }
    };
    
    currentIDS.specifications.push(newSpec);
    renderSpecifications();
    
    // Выделяем новую спецификацию для редактирования
    selectSpecification(newSpec.id);
}

/**
 * Отрисовывает список спецификаций
 */
function renderSpecifications() {
    const specList = document.getElementById('specList');
    const template = document.getElementById('specTemplate');
    
    // Очищаем список
    specList.innerHTML = '';
    
    if (currentIDS.specifications.length === 0) {
        // Показываем заглушку, если нет спецификаций
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <p>Нет спецификаций</p>
            <small>Нажмите "+ Добавить спецификацию" чтобы создать первую</small>
        `;
        specList.appendChild(emptyState);
        return;
    }
    
    // Отрисовываем каждую спецификацию
    currentIDS.specifications.forEach(spec => {
        const specCard = document.importNode(template.content, true).querySelector('.spec-card');
        
        // Заполняем данные
        const nameInput = specCard.querySelector('.spec-name');
        nameInput.value = spec.name;
        
        // Считаем количество правил
        const rulesCount = (spec.applicability?.rules?.length || 0) + 
                          (spec.requirements?.rules?.length || 0);
        
        const entityValue = specCard.querySelector('.entity-value');
        // Ищем первое entity правило для предпросмотра
        const entityRule = spec.applicability?.rules?.find(r => r.type === 'entity');
        entityValue.textContent = entityRule ? entityRule.value : 'Нет сущности';
        
        const specCount = specCard.querySelector('.spec-count');
        specCount.textContent = `${rulesCount} ${getRulesWord(rulesCount)}`;
        
        // Добавляем data-id для идентификации
        specCard.dataset.specId = spec.id;
        
        // Подсвечиваем, если выбрана
        if (spec.id === selectedSpecId) {
            specCard.classList.add('selected');
        }
        
        // Обработчики событий
        setupSpecCardHandlers(specCard, spec);
        
        specList.appendChild(specCard);
    });
}

/**
 * Возвращает правильное склонение слова "правило"
 */
function getRulesWord(count) {
    if (count === 0) return 'правил';
    if (count === 1) return 'правило';
    if (count >= 2 && count <= 4) return 'правила';
    return 'правил';
}

/**
 * Настраивает обработчики для карточки спецификации
 */
function setupSpecCardHandlers(card, spec) {
    // Клик по карточке для выбора
    card.addEventListener('click', (e) => {
        // Не выделяем, если клик по инпуту или кнопкам
        if (e.target.tagName === 'INPUT' || e.target.closest('.icon-btn')) {
            return;
        }
        selectSpecification(spec.id);
    });
    
    // Редактирование имени
    const nameInput = card.querySelector('.spec-name');
    nameInput.addEventListener('change', (e) => {
        spec.name = e.target.value;
        // Обновляем имя в редакторе, если эта спецификация выбрана
        if (selectedSpecId === spec.id) {
            document.getElementById('selectedSpecName').textContent = spec.name;
        }
    });
    
    // Кнопка редактирования
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        selectSpecification(spec.id);
    });
    
    // Кнопка дублирования
    card.querySelector('.duplicate-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateSpecification(spec);
    });
    
    // Кнопка удаления
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSpecification(spec.id);
    });
}

/**
 * Выбрать спецификацию для редактирования
 */
function selectSpecification(specId) {
    selectedSpecId = specId;
    
    // Обновляем выделение в списке
    document.querySelectorAll('.spec-card').forEach(card => {
        if (card.dataset.specId === specId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Находим спецификацию
    const spec = currentIDS.specifications.find(s => s.id === specId);
    if (spec) {
        // Обновляем заголовок редактора
        document.getElementById('selectedSpecName').textContent = spec.name;
        
        // Отрисовываем редактор правил
        renderSpecEditor(spec);
    }
}

/**
 * Дублировать спецификацию
 */
function duplicateSpecification(spec) {
    // Создаем копию с новым id
    const newSpec = JSON.parse(JSON.stringify(spec));
    newSpec.id = `spec_${Date.now()}`;
    newSpec.name = `${spec.name} (копия)`;
    
    currentIDS.specifications.push(newSpec);
    renderSpecifications();
}

/**
 * Удалить спецификацию
 */
function deleteSpecification(specId) {
    if (confirm('Удалить спецификацию?')) {
        currentIDS.specifications = currentIDS.specifications.filter(s => s.id !== specId);
        
        if (selectedSpecId === specId) {
            selectedSpecId = null;
            document.getElementById('selectedSpecName').textContent = 'Не выбрано';
            document.getElementById('editorContent').innerHTML = '<p class="placeholder">Выберите спецификацию для редактирования</p>';
        }
        
        renderSpecifications();
    }
}

/**
 * Отрисовывает редактор для выбранной спецификации
 */
function renderSpecEditor(spec) {
    const editorContent = document.getElementById('editorContent');
    
    // Создаем структуру редактора
    let html = `
        <div class="editor-tabs">
            <button class="editor-tab active" data-tab="applicability">Применимость</button>
            <button class="editor-tab" data-tab="requirements">Требования</button>
        </div>
        
        <div id="applicability-tab" class="tab-content">
            <div class="editor-section">
                <div class="section-title">Условия отбора (applicability)</div>
                <div id="applicability-rules" class="rules-container">
    `;
    
    // Добавляем правила applicability
    if (spec.applicability?.rules?.length > 0) {
        spec.applicability.rules.forEach((rule, index) => {
            html += renderApplicabilityRule(rule, index);
        });
    } else {
        html += `<p class="placeholder">Нет правил применимости</p>`;
    }
    
    html += `
                </div>
                <button class="add-condition" onclick="addApplicabilityRule('${spec.id}')">
                    + Добавить условие отбора
                </button>
            </div>
        </div>
        
        <div id="requirements-tab" class="tab-content" style="display: none;">
            <div class="editor-section">
                <div class="section-title">Требования к свойствам</div>
                <div id="requirements-rules" class="rules-container">
    `;
    
    // Добавляем правила requirements
    if (spec.requirements?.rules?.length > 0) {
        spec.requirements.rules.forEach((rule, index) => {
            html += renderRequirementsRule(rule, index);
        });
    } else {
        html += `<p class="placeholder">Нет требований</p>`;
    }
    
    html += `
                </div>
                <button class="add-condition" onclick="addRequirementRule('${spec.id}')">
                    + Добавить требование
                </button>
            </div>
        </div>
        
        <div class="editor-actions">
            <button class="btn-block" onclick="testSpecification('${spec.id}')">
                🔍 Проверить на тестовой модели
            </button>
            <button class="btn-block btn-danger" onclick="clearSpecification('${spec.id}')">
                🗑️ Очистить правила
            </button>
        </div>
    `;
    
    editorContent.innerHTML = html;
    
    // Добавляем обработчики для переключения вкладок
    setupTabHandlers(spec.id);
}

/**
 * Отрисовывает одно правило applicability
 */
function renderApplicabilityRule(rule, index) {
    let conditionOptions = getConditionOptions(rule.type);
    
    return `
        <div class="rule-card" data-rule-type="applicability" data-rule-index="${index}">
            <div class="rule-card-header">
                <span class="rule-type-badge">${rule.displayType || 'Правило'}</span>
                <button class="icon-btn" onclick="removeRule('applicability', ${index})" title="Удалить">✕</button>
            </div>
            <div class="rule-fields">
                <div class="rule-field">
                    <label>Тип правила</label>
                    <select onchange="changeRuleType(this, 'applicability', ${index})">
                        <option value="entity" ${rule.type === 'entity' ? 'selected' : ''}>Сущность IFC</option>
                        <option value="attribute" ${rule.type === 'attribute' ? 'selected' : ''}>Атрибут</option>
                        <option value="property" ${rule.type === 'property' ? 'selected' : ''}>Свойство</option>
                    </select>
                </div>
                <div class="rule-field">
                    <label>Поле</label>
                    <input type="text" value="${rule.field || ''}" placeholder="Например: Name" 
                           onchange="updateRuleField(this, 'applicability', ${index})">
                </div>
                <div class="rule-field">
                    <label>Условие</label>
                    <select onchange="updateRuleCondition(this, 'applicability', ${index})">
                        ${conditionOptions}
                    </select>
                </div>
                <div class="rule-field">
                    <label>Значение</label>
                    ${renderValueInput(rule)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Отрисовывает одно правило requirements
 */
function renderRequirementsRule(rule, index) {
    let cardinalityOptions = `
        <option value="required" ${rule.cardinality === 'Обязательно' || rule.cardinality === 'required' ? 'selected' : ''}>Обязательно</option>
        <option value="optional" ${rule.cardinality === 'Опционально' || rule.cardinality === 'optional' ? 'selected' : ''}>Опционально</option>
        <option value="prohibited" ${rule.cardinality === 'Запрещено' || rule.cardinality === 'prohibited' ? 'selected' : ''}>Запрещено</option>
    `;
    
    let dataTypeOptions = '';
    // Здесь мы заполним типы данных позже, когда загрузим JSON
    
    return `
        <div class="rule-card" data-rule-type="requirements" data-rule-index="${index}">
            <div class="rule-card-header">
                <span class="rule-type-badge">Свойство</span>
                <select class="rule-cardinality ${getCardinalityClass(rule.cardinality)}" 
                        onchange="updateCardinality(this, ${index})">
                    ${cardinalityOptions}
                </select>
                <button class="icon-btn" onclick="removeRule('requirements', ${index})" title="Удалить">✕</button>
            </div>
            <div class="rule-fields">
                <div class="rule-field">
                    <label>PropertySet</label>
                    <input type="text" value="${rule.propertySet || ''}" placeholder="Например: ExpCheck_Wall"
                           onchange="updatePropertySet(this, ${index})">
                </div>
                <div class="rule-field">
                    <label>Имя свойства</label>
                    <input type="text" value="${rule.field || ''}" placeholder="Например: MGE_ElementCode"
                           onchange="updateRuleField(this, 'requirements', ${index})">
                </div>
                <div class="rule-field">
                    <label>Тип данных</label>
                    <select onchange="updateDataType(this, ${index})">
                        <option value="IFCTEXT">Текст (строка)</option>
                        <option value="IFCINTEGER">Целое число</option>
                        <option value="IFCREAL">Дробное число</option>
                        <option value="IFCBOOLEAN">Да/Нет</option>
                    </select>
                </div>
                <div class="rule-field">
                    <label>Условие</label>
                    <select onchange="updateRuleCondition(this, 'requirements', ${index})">
                        <option value="equals" ${rule.condition === 'equals' ? 'selected' : ''}>Равно</option>
                        <option value="startsWith" ${rule.condition === 'startsWith' ? 'selected' : ''}>Начинается с</option>
                        <option value="contains" ${rule.condition === 'contains' ? 'selected' : ''}>Содержит</option>
                        <option value="endsWith" ${rule.condition === 'endsWith' ? 'selected' : ''}>Заканчивается на</option>
                        <option value="in" ${rule.condition === 'in' ? 'selected' : ''}>Одно из списка</option>
                    </select>
                </div>
                <div class="rule-field">
                    <label>Значение</label>
                    ${renderValueInput(rule)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Отрисовывает поле ввода значения в зависимости от типа условия
 */
function renderValueInput(rule) {
    if (rule.condition === 'in' && Array.isArray(rule.value)) {
        // Для перечислений показываем список
        let valuesHtml = '<div class="values-list">';
        rule.value.forEach((val, idx) => {
            valuesHtml += `
                <div class="value-item">
                    <input type="text" value="${val}" 
                           onchange="updateEnumValue(this, ${idx})">
                    <button class="remove-value" onclick="removeEnumValue(${idx})">✕</button>
                </div>
            `;
        });
        valuesHtml += '</div>';
        valuesHtml += '<button class="add-value" onclick="addEnumValue()">+ Добавить значение</button>';
        return valuesHtml;
    } else {
        // Обычное текстовое поле
        return `<input type="text" class="value-input" value="${rule.value || ''}" 
                       placeholder="Значение" onchange="updateRuleValue(this)">`;
    }
}

/**
 * Возвращает опции для условия в зависимости от типа правила
 */
function getConditionOptions(ruleType) {
    if (ruleType === 'entity') {
        // Для сущностей обычно только равенство
        return `
            <option value="equals" selected>Равно</option>
        `;
    } else {
        // Для атрибутов и свойств - разные условия
        return `
            <option value="equals">Равно</option>
            <option value="startsWith">Начинается с</option>
            <option value="contains">Содержит</option>
            <option value="endsWith">Заканчивается на</option>
            <option value="in">Одно из списка</option>
        `;
    }
}

/**
 * Возвращает класс для кардинальности
 */
function getCardinalityClass(cardinality) {
    if (cardinality === 'Обязательно' || cardinality === 'required') {
        return 'cardinality-required';
    } else if (cardinality === 'Опционально' || cardinality === 'optional') {
        return 'cardinality-optional';
    }
    return '';
}

/**
 * Настраивает обработчики вкладок
 */
function setupTabHandlers(specId) {
    const tabs = document.querySelectorAll('.editor-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активный класс у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Прячем все содержимое вкладок
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Показываем выбранную вкладку
            const tabName = tab.dataset.tab;
            document.getElementById(`${tabName}-tab`).style.display = 'block';
        });
    });
}

/**
 * Добавить правило applicability
 */
function addApplicabilityRule(specId) {
    const spec = currentIDS.specifications.find(s => s.id === specId);
    if (!spec) return;
    
    if (!spec.applicability) {
        spec.applicability = { rules: [] };
    }
    
    // Добавляем новое правило по умолчанию
    spec.applicability.rules.push({
        type: 'entity',
        field: 'name',
        condition: 'equals',
        value: 'IfcWall',
        displayType: 'Сущность IFC'
    });
    
    // Перерисовываем редактор
    renderSpecEditor(spec);

    // Перерисовываем карточки(обновляем счетчики)
    renderSpecifications();
}

/**
 * Добавить правило requirements
 */
function addRequirementRule(specId) {
    const spec = currentIDS.specifications.find(s => s.id === specId);
    if (!spec) return;
    
    if (!spec.requirements) {
        spec.requirements = { rules: [] };
    }
    
    // Добавляем новое правило по умолчанию
    spec.requirements.rules.push({
        type: 'property',
        field: '',
        propertySet: '',
        dataType: 'IFCTEXT',
        cardinality: 'optional',
        condition: 'equals',
        value: '',
        displayType: 'Свойство'
    });
    
    // Перерисовываем редактор
    renderSpecEditor(spec);

    // Перерисовываем карточки(обновляем счетчики)
    renderSpecifications();
}

/**
 * Обновить поле правила
 */
function updateRuleField(input, ruleType, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec) return;
    
    const rules = ruleType === 'applicability' ? spec.applicability.rules : spec.requirements.rules;
    if (rules[index]) {
        rules[index].field = input.value;
    }
}

/**
 * Обновить условие правила
 */
function updateRuleCondition(select, ruleType, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec) return;
    
    const rules = ruleType === 'applicability' ? spec.applicability.rules : spec.requirements.rules;
    if (rules[index]) {
        const oldCondition = rules[index].condition;
        const newCondition = select.value;
        rules[index].condition = newCondition;
        
        // Если переключились на 'in' и значение не массив - преобразуем
        if (newCondition === 'in' && !Array.isArray(rules[index].value)) {
            rules[index].value = rules[index].value ? [rules[index].value] : [];
        }
        
        // Если переключились с 'in' на что-то другое - берем первый элемент
        if (oldCondition === 'in' && newCondition !== 'in' && Array.isArray(rules[index].value)) {
            rules[index].value = rules[index].value[0] || '';
        }
        
        // Перерисовываем редактор для обновления поля ввода
        renderSpecEditor(spec);
    }
}

/**
 * Обновить значение правила
 */
function updateRuleValue(input) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec) return;
    
    // Определяем, какое правило редактируется (сложно без контекста, упростим)
    // В реальном приложении нужно передавать больше контекста
    console.warn('updateRuleValue требует доработки - нужно знать индекс');
}

/**
 * Обновить кардинальность
 */
function updateCardinality(select, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec || !spec.requirements?.rules[index]) return;
    
    spec.requirements.rules[index].cardinality = select.value;
}

/**
 * Обновить PropertySet
 */
function updatePropertySet(input, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec || !spec.requirements?.rules[index]) return;
    
    spec.requirements.rules[index].propertySet = input.value;
}

/**
 * Обновить тип данных
 */
function updateDataType(select, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec || !spec.requirements?.rules[index]) return;
    
    spec.requirements.rules[index].dataType = select.value;
}

/**
 * Удалить правило
 */
function removeRule(ruleType, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec) return;
    
    if (confirm('Удалить правило?')) {
        if (ruleType === 'applicability') {
            if (spec.applicability && spec.applicability.rules) {
                spec.applicability.rules.splice(index, 1);
            }
        } else if (ruleType === 'requirements') {
            if (spec.requirements && spec.requirements.rules) {
                spec.requirements.rules.splice(index, 1);
            }
        }
        
        // Перерисовываем редактор
        renderSpecEditor(spec);
        
        // Обновляем счетчики в карточках
        renderSpecifications();
    }
}

/**
 * Тестировать спецификацию на модели
 */
function testSpecification(specId) {
    alert('Функция проверки на IFC-модели будет добавлена позже');
}

/**
 * Очистить правила спецификации
 */
function clearSpecification(specId) {
    if (confirm('Очистить все правила?')) {
        const spec = currentIDS.specifications.find(s => s.id === specId);
        if (spec) {
            spec.applicability = { rules: [] };
            spec.requirements = { rules: [] };
            renderSpecEditor(spec);
            renderSpecifications(); // Обновляем счетчики в карточках
        }
    }
}

/**
 * Загрузить пример файла (для тестирования)
 */
function loadExampleFile(filename) {
    fetch(filename)
        .then(response => response.text())
        .then(xmlString => {
            const parsed = parser.parse(xmlString);
            currentIDS = parsed;
            document.querySelector('.filename').value = filename.split('/').pop();
            updateInfoFromCurrent();
            renderSpecifications();
        })
        .catch(error => {
            console.error('Ошибка загрузки примера:', error);
        });
}

// ===== Растягиваемая правая панель =====

let isResizing = false;
let startX = 0;
let startWidth = 0;
let editorPanel = null;
let splitter = null;
let mainContainer = null;

/**
 * Инициализация растягиваемой панели
 */
function initResizablePanel() {
    editorPanel = document.getElementById('editorPanel');
    splitter = document.getElementById('splitter');
    mainContainer = document.querySelector('.main-container');
    
    if (!splitter || !editorPanel) return;
    
    // Загружаем сохраненную ширину из localStorage
    loadSavedPanelWidth();
    
    // Обработчики мыши для разделителя
    splitter.addEventListener('mousedown', startResize);
    
    // Глобальные обработчики для завершения ресайза
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
    
    // Опционально: двойной клик для сброса ширины
    splitter.addEventListener('dblclick', resetPanelWidth);
    
    // Сохраняем ширину при закрытии вкладки
    window.addEventListener('beforeunload', savePanelWidth);
}

/**
 * Начало ресайза
 */
function startResize(e) {
    e.preventDefault(); // Предотвращаем выделение текста
    
    isResizing = true;
    startX = e.clientX;
    startWidth = editorPanel.offsetWidth;
    
    // Добавляем класс для изменения курсора
    mainContainer.classList.add('resizing');
    
    // Временное отключение transition для плавности
    editorPanel.style.transition = 'none';
    
    // Опционально: показываем текущую ширину
    showResizeIndicator();
}

/**
 * Процесс ресайза
 */
function onResize(e) {
    if (!isResizing) return;
    
    e.preventDefault();
    
    // Вычисляем разницу движения мыши
    const deltaX = startX - e.clientX; // Отрицательное значение при движении вправо
    
    // Новая ширина (начальная ширина + разница)
    let newWidth = startWidth + deltaX;
    
    // Ограничиваем ширину min/max
    const minWidth = 300; // Минимальная ширина
    const maxWidth = 800; // Максимальная ширина
    
    newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    
    // Применяем новую ширину
    editorPanel.style.width = `${newWidth}px`;
    
    // Обновляем атрибут с текущей шириной
    editorPanel.setAttribute('data-width', `${Math.round(newWidth)}px`);

    // Добавить обновление индикатора прямо здесь
    updateResizeIndicator(e);
}

/**
 * Остановка ресайза
 */
function stopResize() {
    if (!isResizing) return;
    
    isResizing = false;
    
    // Убираем класс ресайза
    mainContainer.classList.remove('resizing');
    
    // Восстанавливаем transition
    editorPanel.style.transition = '';
    
    // Сохраняем ширину
    savePanelWidth();
    
    // Прячем индикатор
    hideResizeIndicator();
}

/**
 * Сброс ширины панели к значению по умолчанию
 */
function resetPanelWidth() {
    if (!editorPanel) return;
    
    const defaultWidth = 400;
    editorPanel.style.width = `${defaultWidth}px`;
    editorPanel.setAttribute('data-width', `${defaultWidth}px`);
    
    // Сохраняем новую ширину
    savePanelWidth();
}

/**
 * Сохранить ширину панели в localStorage
 */
function savePanelWidth() {
    if (!editorPanel) return;
    
    const width = editorPanel.offsetWidth;
    localStorage.setItem('editorPanelWidth', width);
}

/**
 * Загрузить сохраненную ширину панели
 */
function loadSavedPanelWidth() {
    if (!editorPanel) return;
    
    const savedWidth = localStorage.getItem('editorPanelWidth');
    if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        // Проверяем, что ширина в допустимых пределах
        const minWidth = 300;
        const maxWidth = 800;
        if (width >= minWidth && width <= maxWidth) {
            editorPanel.style.width = `${width}px`;
            editorPanel.setAttribute('data-width', `${width}px`);
        }
    }
}

/**
 * Показать индикатор ресайза
 */
function showResizeIndicator() {
    // Можно добавить всплывающую подсказку с текущей шириной
    if (!editorPanel) return;
    
    // Создаем индикатор, если его нет
    let indicator = document.querySelector('.resize-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'resize-indicator';
        document.body.appendChild(indicator);
    }
    
    // Обновляем и показываем
    indicator.textContent = `${editorPanel.offsetWidth}px`;
    indicator.style.display = 'block';
    
    // Позиционируем около курсора
    // Будет обновляться в onResize
}

/**
 * Обновить индикатор ресайза
 */
function updateResizeIndicator(e) {
    const indicator = document.querySelector('.resize-indicator');
    if (indicator && editorPanel) {
        indicator.textContent = `${editorPanel.offsetWidth}px`;
        indicator.style.left = `${e.clientX + 20}px`;
        indicator.style.top = `${e.clientY - 40}px`;
    }
}

/**
 * Спрятать индикатор ресайза
 */
function hideResizeIndicator() {
    const indicator = document.querySelector('.resize-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Добавляем стили для индикатора ресайза (можно добавить в CSS)
const resizeIndicatorStyles = `
.resize-indicator {
    position: fixed;
    background: #0969da;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 10000;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: none;
}
`;

// Добавляем стили в head
const styleSheet = document.createElement("style");
styleSheet.textContent = resizeIndicatorStyles;
document.head.appendChild(styleSheet);

