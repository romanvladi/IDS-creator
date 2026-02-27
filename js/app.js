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

//Переменные для шаблонов html
let specCardTemplate = null;
let emptyStateTemplate = null;
let editorTabsTemplate = null;
let applicabilityRuleTemplate = null;
let requirementsRuleTemplate = null;
let valueInputSimpleTemplate = null;
let valueInputEnumTemplate = null;
let valueInputEnumItemTemplate = null;

// Данные из JSON
let ifcClasses = {};        // объект с классами IFC
let ifcDataTypes = {};      // объект с типами данных
let ifcClassesLoaded = false;
let ifcDataTypesLoaded = false;

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализируем парсер
    parser = new IDSParser();
    
    // Устанавливаем сегодняшнюю дату
    document.getElementById('infoDate').value = currentIDS.info.date;
    
    // Заполняем информацию о файле
    updateInfoFromCurrent();

    //Загружаем (ждем) шаблоны html
    await loadTemplates();

    //Загружаем (ждем) файлы JSON
    await loadJSONData();  // ← добавляем

    //отрисовываем карточки
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
    });
}

/**
 * Загрузка шаблонов html из файлов
 */
async function loadTemplates() {
    const response1 = await fetch('templates/spec-card.html');
    specCardTemplate = await response1.text();

    const response2 = await fetch('templates/empty-state.html');
    emptyStateTemplate = await response2.text();

    const response3 = await fetch('templates/editor-tabs.html');
    editorTabsTemplate = await response3.text();

    const response4 = await fetch('templates/applicability-rule.html');
    applicabilityRuleTemplate = await response4.text();

    const response5 = await fetch('templates/requirements-rule.html');
    requirementsRuleTemplate = await response5.text();

    const response6 = await fetch('templates/value-input-simple.html');
    valueInputSimpleTemplate = await response6.text();

    const response7 = await fetch('templates/value-input-enum.html');
    valueInputEnumTemplate = await response7.text();

    const response8 = await fetch('templates/value-input-enum-item.html');
    valueInputEnumItemTemplate = await response8.text();
}

/**
 * Загружает JSON-данные
 */
async function loadJSONData() {
    try {
        // Загружаем классы IFC
        const classesResponse = await fetch('data/ifc-classes.json');
        ifcClasses = await classesResponse.json();
        ifcClassesLoaded = true;
        console.log('✅ Загружено классов IFC:', Object.keys(ifcClasses).length);
        
        // Загружаем типы данных
        const typesResponse = await fetch('data/ifc-data-types.json');
        ifcDataTypes = await typesResponse.json();
        ifcDataTypesLoaded = true;
        console.log('✅ Загружено типов данных:', Object.keys(ifcDataTypes).length);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки JSON:', error);
    }
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
    // Проверяем, загружен ли шаблон карточки
    if (!specCardTemplate) {
        console.log('Ждем загрузку шаблона...');
        return;
    }

    //Проверяем, загружен ли шаблон пустышки
    if (!emptyStateTemplate) {
        console.warn('Шаблон не загружен');
        return;
    }    

    const specList = document.getElementById('specList');
    
    // Очищаем список
    specList.innerHTML = '';
    
    //если спецификаций нет
    if (currentIDS.specifications.length === 0) {
        // Показываем заглушку
        specList.innerHTML = emptyStateTemplate;
        return;
    }
    
    // Отрисовываем каждую спецификацию
    currentIDS.specifications.forEach(spec => {
        // Считаем количество правил
        const rulesCount = (spec.applicability?.rules?.length || 0) + 
                          (spec.requirements?.rules?.length || 0);
        
        // Ищем первое entity правило для предпросмотра
        const entityRule = spec.applicability?.rules?.find(r => r.type === 'entity');
        const entityValue = entityRule ? entityRule.value : 'Нет сущности';
        
        // Заменяем плейсхолдеры в шаблоне
        let cardHtml = specCardTemplate
            .replace('{{specId}}', spec.id)
            .replace('{{specName}}', spec.name)
            .replace('{{entityValue}}', entityValue)
            .replace('{{rulesCount}}', rulesCount)
            .replace('{{rulesWord}}', getRulesWord(rulesCount));
        
        // Создаем DOM элемент из HTML строки
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHtml;
        const card = tempDiv.firstElementChild;
        
        // Подсвечиваем, если выбрана
        if (spec.id === selectedSpecId) {
            card.classList.add('selected');
        }
        
        // Добавляем обработчики (функция остается без изменений)
        setupSpecCardHandlers(card, spec);
        
        specList.appendChild(card);
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
 * Простая замена плейсхолдеров в шаблоне
 * @param {string} template - HTML шаблон с плейсхолдерами {{key}}
 * @param {Object} data - объект с данными для замены
 * @returns {string}
 */
function replacePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp('{{' + key + '}}', 'g');
        result = result.replace(placeholder, value !== undefined ? value : '');
    }
    return result;
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
    if (!editorTabsTemplate) {
        console.warn('Шаблон редактора не загружен');
        return;
    }
    
    const editorContent = document.getElementById('editorContent');
    
    // Генерируем HTML для правил
    let applicabilityHtml = '';
    if (spec.applicability?.rules?.length > 0) {
        spec.applicability.rules.forEach((rule, index) => {
            applicabilityHtml += renderApplicabilityRule(rule, index);
        });
    } else {
        applicabilityHtml = '<p class="placeholder">Нет правил применимости</p>';
    }
    
    let requirementsHtml = '';
    if (spec.requirements?.rules?.length > 0) {
        spec.requirements.rules.forEach((rule, index) => {
            requirementsHtml += renderRequirementsRule(rule, index);
        });
    } else {
        requirementsHtml = '<p class="placeholder">Нет требований</p>';
    }
    
    // Заменяем плейсхолдеры в шаблоне
    let html = editorTabsTemplate
        .replace('{{applicabilityRules}}', applicabilityHtml)
        .replace('{{requirementsRules}}', requirementsHtml)
        .replace(new RegExp('{{specId}}', 'g'), spec.id);  // заменяем все вхождения
    
    editorContent.innerHTML = html;
    
    // Добавляем обработчики для переключения вкладок
    setupTabHandlers(spec.id);
}

/**
 * Отрисовывает одно правило applicability
 */
function renderApplicabilityRule(rule, index) {
    if (!applicabilityRuleTemplate) {
        console.error('Шаблон applicability не загружен');
        return '<div class="error">Ошибка загрузки шаблона</div>';
    }
    
    // Подготавливаем данные для шаблона
    const data = {
        index: index,
        displayType: rule.displayType || 'Правило',
        field: rule.field || '',
        valueInput: renderValueInput(rule, 'applicability', index),
        
        // Selected для типа правила
        entitySelected: rule.type === 'entity' ? 'selected' : '',
        attributeSelected: rule.type === 'attribute' ? 'selected' : '',
        propertySelected: rule.type === 'property' ? 'selected' : ''
    };
    
    // Заменяем плейсхолдеры
    return replacePlaceholders(applicabilityRuleTemplate, data);
}

/**
 * Отрисовывает одно правило requirements
 */
function renderRequirementsRule(rule, index) {
    if (!requirementsRuleTemplate) {
        console.error('Шаблон requirements не загружен');
        return '<div class="error">Ошибка загрузки шаблона</div>';
    }
    
    // Генерируем options для datalist
    let dataTypeOptions = '';
    if (ifcDataTypesLoaded) {
        for (const [typeName, typeDescription] of Object.entries(ifcDataTypes)) {
            dataTypeOptions += `<option value="${typeName}">${typeDescription}</option>`;
        }
    }

    // Подготавливаем данные для шаблона
    const data = {
        index: index,
        propertySet: rule.propertySet || '',
        field: rule.field || '',
        cardinalityClass: getCardinalityClass(rule.cardinality),
        dataType: rule.dataType || 'IFCTEXT',  // добавляем текущее значение
        dataTypeOptions: dataTypeOptions,       // добавляем options
        
        // Кардинальность - selected
        requiredSelected: (rule.cardinality === 'Обязательно' || rule.cardinality === 'required') ? 'selected' : '',
        optionalSelected: (rule.cardinality === 'Опционально' || rule.cardinality === 'optional') ? 'selected' : '',
        prohibitedSelected: (rule.cardinality === 'Запрещено' || rule.cardinality === 'prohibited') ? 'selected' : '',
        
        // Условие - selected
        equalsSelected: rule.condition === 'equals' ? 'selected' : '',
        startsWithSelected: rule.condition === 'startsWith' ? 'selected' : '',
        containsSelected: rule.condition === 'contains' ? 'selected' : '',
        endsWithSelected: rule.condition === 'endsWith' ? 'selected' : '',
        inSelected: rule.condition === 'in' ? 'selected' : '',
        
        // Поле ввода значения (пока оставляем старую функцию)
        valueInput: renderValueInput(rule, 'requirements', index)
    };
    
    // Заменяем плейсхолдеры
    return replacePlaceholders(requirementsRuleTemplate, data);
}

/**
 * Отрисовывает поле ввода значения в зависимости от типа условия
 */
function renderValueInput(rule, ruleType = 'requirements', index = 0) {
    // Для перечислений (условие 'in') показываем список
    if (rule.condition === 'in' && Array.isArray(rule.value)) {
        if (!valueInputEnumTemplate || !valueInputEnumItemTemplate) {
            console.error('Шаблоны enum не загружены');
            return '<div>Ошибка загрузки шаблона</div>';
        }
        
        let valuesListHtml = '';
        rule.value.forEach((val, idx) => {
            valuesListHtml += replacePlaceholders(valueInputEnumItemTemplate, {
                value: val,
                ruleIndex: index,
                itemIndex: idx
            });
        });
        
        return valueInputEnumTemplate
            .replace(/{{index}}/g, index.toString())
            .replace('{{valuesList}}', valuesListHtml);
    }
    
    // Обычное текстовое поле
    if (!valueInputSimpleTemplate) {
        console.error('Шаблон simple value не загружен');
        return '<input type="text" class="value-input">';
    }
    
    // Базовый HTML из шаблона
    let inputHtml = valueInputSimpleTemplate
        .replace('{{value}}', rule.value || '')
        .replace('{{ruleType}}', ruleType)
        .replace('{{index}}', index);
    
    // Если это entity в applicability - добавляем datalist с классами IFC
    if (ruleType === 'applicability' && rule.type === 'entity' && ifcClassesLoaded) {
        // Добавляем атрибут list к input
        inputHtml = inputHtml.replace(
            'class="value-input"',
            `class="value-input" list="ifcClasses-${index}"`
        );
        
        // Создаем datalist с классами IFC
        let datalistHtml = `<datalist id="ifcClasses-${index}">`;
        for (const [className, classDescription] of Object.entries(ifcClasses)) {
            datalistHtml += `<option value="${className}">${classDescription}</option>`;
        }
        datalistHtml += '</datalist>';
        
        // Добавляем datalist после input
        inputHtml += datalistHtml;
    }
    
    return inputHtml;
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
 * Изменить тип правила applicability
 * @param {HTMLSelectElement} select - выпадающий список
 * @param {string} ruleType - всегда 'applicability'
 * @param {number} index - индекс правила
 */
function changeRuleType(select, ruleType, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec) return;
    
    const newType = select.value; // 'entity', 'attribute' или 'property'
    const rules = spec.applicability.rules;
    if (!rules || !rules[index]) return;
    
    const rule = rules[index];
    const oldType = rule.type;
    
    // Если тип не изменился — ничего не делаем
    if (oldType === newType) return;
    
    // Меняем тип
    rule.type = newType;
    
    // Сбрасываем поля в зависимости от нового типа
    switch (newType) {
        case 'entity':
            rule.field = 'name';
            rule.displayType = 'Сущность IFC';
            // Для сущности значение по умолчанию
            if (!rule.value) rule.value = 'IfcWall';
            break;
            
        case 'attribute':
            rule.field = '';
            rule.displayType = 'Атрибут';
            rule.value = '';
            break;
            
        case 'property':
            rule.field = '';
            rule.displayType = 'Свойство';
            rule.value = '';
            break;
    }
    
    // Перерисовываем редактор, чтобы обновились поля
    renderSpecEditor(spec);
    
    // Для отладки
    console.log(`Правило ${index} изменено с ${oldType} на ${newType}`);
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
 * @param {HTMLInputElement} input - поле ввода
 * @param {string} ruleType - тип правила ('applicability' или 'requirements')
 * @param {number} index - индекс правила в массиве
 */
function updateRuleValue(input, ruleType, index) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec) return;
    
    // Получаем нужный массив правил
    const rules = ruleType === 'applicability' ? spec.applicability.rules : spec.requirements.rules;
    if (!rules || !rules[index]) return;
    
    // Обновляем значение
    rules[index].value = input.value;
    
    // Для отладки (можно потом убрать)
    console.log(`Обновлено правило ${ruleType}[${index}].value =`, input.value);
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
 * Обновить значение в перечислении
 */
function updateEnumValue(input, ruleIndex, valueIndex) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec || !spec.requirements?.rules[ruleIndex]) return;
    
    const rule = spec.requirements.rules[ruleIndex];
    if (Array.isArray(rule.value)) {
        rule.value[valueIndex] = input.value;
    }
}

/**
 * Удалить значение из перечисления
 */
function removeEnumValue(ruleIndex, valueIndex) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec || !spec.requirements?.rules[ruleIndex]) return;
    
    const rule = spec.requirements.rules[ruleIndex];
    if (Array.isArray(rule.value)) {
        rule.value.splice(valueIndex, 1);
        renderSpecEditor(spec);
    }
}

/**
 * Добавить значение в перечисление
 */
function addEnumValue(ruleIndex) {
    const spec = currentIDS.specifications.find(s => s.id === selectedSpecId);
    if (!spec || !spec.requirements?.rules[ruleIndex]) return;
    
    const rule = spec.requirements.rules[ruleIndex];
    if (!Array.isArray(rule.value)) {
        rule.value = [];
    }
    rule.value.push('');
    renderSpecEditor(spec);
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

